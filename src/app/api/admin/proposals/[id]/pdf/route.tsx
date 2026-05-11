import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { ProposalType, VoteType } from "@/lib/constants";
import { renderToBuffer } from "@react-pdf/renderer";
import {
  PetitionReport,
  buildHmacPayload,
  type PetitionReportData,
} from "@/lib/pdf/petition-report";
import { hmacHex, canonicalize } from "@/lib/hmac";

// PDF rendering uses Node-only APIs (fs to read the bundled font), so this
// route MUST run on the Node runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!isAdmin(session)) return new Response("Forbidden", { status: 403 });

  const { id } = await params;

  const proposal = await prisma.proposal.findUnique({
    where: { id },
    include: {
      votes: {
        where: { vote_type: VoteType.SIGN },
        select: { user_id: true, resident_code: true, created_at: true },
      },
    },
  });
  if (!proposal) return new Response("Not Found", { status: 404 });
  if (proposal.resident_code !== session.user.resident_code) {
    return new Response("Forbidden (other municipality)", { status: 403 });
  }
  if (proposal.type !== ProposalType.PETITION) {
    return new Response(
      "PDF report is only available for petition (PETITION) proposals.",
      { status: 400 },
    );
  }

  // Aggregate.
  const total = proposal.votes.length;
  const localSignerCount = proposal.votes.filter(
    (v) => v.resident_code === proposal.resident_code,
  ).length;

  const verifiedSet = new Set(
    (
      await prisma.user.findMany({
        where: { id: { in: proposal.votes.map((v) => v.user_id) }, is_verified: true },
        select: { id: true },
      })
    ).map((u) => u.id),
  );
  const verifiedCount = proposal.votes.filter((v) => verifiedSet.has(v.user_id)).length;

  const muniMap = new Map<string, number>();
  for (const v of proposal.votes) {
    muniMap.set(v.resident_code, (muniMap.get(v.resident_code) ?? 0) + 1);
  }
  const muniBreakdown = [...muniMap.entries()]
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count);

  const firstSignatureAt =
    proposal.votes.length > 0
      ? proposal.votes.reduce(
          (min, v) => (v.created_at < min ? v.created_at : min),
          proposal.votes[0].created_at,
        )
      : null;
  const lastSignatureAt =
    proposal.votes.length > 0
      ? proposal.votes.reduce(
          (max, v) => (v.created_at > max ? v.created_at : max),
          proposal.votes[0].created_at,
        )
      : null;

  // Pin the issuance instant up-front so the printed timestamp and the HMAC
  // payload are byte-identical (otherwise the receiver couldn't reproduce
  // the same digest from what they see in the document).
  const issuedAt = new Date();

  const baseData: Omit<PetitionReportData, "hmac"> = {
    proposalId: proposal.id,
    title: proposal.title,
    content: proposal.content,
    createdAt: proposal.created_at,
    deadline: proposal.deadline,
    residentCode: proposal.resident_code,
    status: proposal.status,
    targetSignatures: proposal.target_signatures,
    totalSignatures: total,
    verifiedCount,
    localSignerCount,
    muniBreakdown,
    firstSignatureAt,
    lastSignatureAt,
    issuedAt,
  };

  // HMAC-SHA256 over a canonical JSON projection of the substantive fields.
  // Hashing the rendered PDF binary would be circular (we want the digest
  // printed inside the document), so we hash the semantic payload instead.
  // Verifiers reproduce the same shape via `buildHmacPayload`.
  const payloadCanonical = canonicalize(
    buildHmacPayload(baseData as PetitionReportData),
  );
  const hmac = hmacHex(payloadCanonical);

  const data: PetitionReportData = { ...baseData, hmac };

  // Append-only ledger entry. The verify page looks records up by `hmac` and
  // re-derives the digest from `payload_json` to detect tampering.
  //
  // `upsert` rather than `create` is defensive: HMAC collisions across
  // distinct PDFs are infeasible thanks to the second-precision `issuedAt`
  // baked into the canonical payload, but if the same instant ever recurs
  // (e.g. two requests served within the same millisecond) we no-op
  // instead of throwing on the unique constraint.
  await prisma.issuanceRecord.upsert({
    where: { hmac },
    update: {},
    create: {
      kind: "PDF",
      proposal_id: proposal.id,
      issuer_user_id: session.user.id,
      hmac,
      payload_json: payloadCanonical,
      issued_at: issuedAt,
    },
  });

  const buffer = await renderToBuffer(<PetitionReport data={data} />);

  const datestamp = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const safeId = proposal.id.replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename = `petition-report-${safeId}-${datestamp}.pdf`;

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.length),
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
