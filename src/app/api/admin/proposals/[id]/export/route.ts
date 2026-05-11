import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { ProposalType, VoteType } from "@/lib/constants";
import { hmacHex } from "@/lib/hmac";

// Force Node runtime (Prisma Client requires it).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// CSV-escape per RFC 4180: wrap in double-quotes and double any internal "
function csvCell(value: string | number | Date): string {
  const s =
    value instanceof Date ? value.toISOString() : String(value ?? "");
  // Always quote so embedded commas/newlines/quotes are safe.
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!isAdmin(session)) {
    return new Response("Forbidden", { status: 403 });
  }

  const { id } = await params;
  const proposal = await prisma.proposal.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      type: true,
      resident_code: true,
    },
  });
  if (!proposal) {
    return new Response("Not Found", { status: 404 });
  }
  if (proposal.resident_code !== session.user.resident_code) {
    return new Response("Forbidden (other municipality)", { status: 403 });
  }
  if (proposal.type !== ProposalType.PETITION) {
    return new Response(
      "CSV export is only available for petition (PETITION) proposals.",
      { status: 400 },
    );
  }

  // ────────────────────────────────────────────────────────────────────────
  // PRIVACY GUARANTEE — fields explicitly selected, nothing extra leaks:
  //   - created_at:    timestamp of the e-signature (legal evidence)
  //   - user_id:       SHA-256 hash of the JPKI cert serial (NOT My Number,
  //                    NOT the cert serial itself, NOT the holder's name)
  //   - resident_code: 6-digit municipality code captured at signing time
  //   - proposal_id:   the petition this signature belongs to
  // The display_name field on User is deliberately NOT joined.
  // ────────────────────────────────────────────────────────────────────────
  const signatures = await prisma.vote.findMany({
    where: { proposal_id: id, vote_type: VoteType.SIGN },
    orderBy: { created_at: "asc" },
    select: {
      created_at: true,
      user_id: true,
      resident_code: true,
      proposal_id: true,
    },
  });

  const header = [
    "created_at",
    "user_id_hashed",
    "resident_code",
    "proposal_id",
  ].map(csvCell).join(",");

  const rows = signatures.map((s) =>
    [s.created_at, s.user_id, s.resident_code, s.proposal_id]
      .map(csvCell)
      .join(","),
  );

  // Provenance preamble — these `#`-prefixed lines are part of the body
  // hashed by HMAC, which prevents two empty exports of different proposals
  // (or the same proposal at different times) from colliding on the same
  // digest. Verifiers do not need to parse them; they hash the whole body
  // minus the trailing HMAC line.
  const issuedAt = new Date().toISOString();
  const preamble =
    `# Proposal: ${proposal.id}\r\n` +
    `# Issued: ${issuedAt}\r\n`;

  // UTF-8 BOM keeps Excel from mangling Japanese text on open.
  const body = "﻿" + preamble + [header, ...rows].join("\r\n") + "\r\n";

  // ────────────────────────────────────────────────────────────────────────
  // TAMPER-EVIDENT FOOTER
  // We sign the entire body (BOM + header + rows, exactly as written above)
  // with HMAC-SHA256 and append the digest as a CSV comment line. To verify:
  //   1. Read the file
  //   2. Strip the trailing "# HMAC-SHA256: <hex>\r\n" line
  //   3. Recompute HMAC-SHA256 over the remaining bytes with EXPORT_HMAC_SECRET
  //   4. Compare with constant-time equality
  // ────────────────────────────────────────────────────────────────────────
  const digest = hmacHex(body);
  const signed = body + `# HMAC-SHA256: ${digest}\r\n`;

  // Record the issuance so /admin/verify can confirm a CSV is one we issued
  // (not just a self-consistent forgery — anyone with the secret could craft
  // a valid HMAC, but only ours land in this table).
  //
  // We `upsert` rather than `create` because identical CSV bodies (e.g. two
  // back-to-back exports of a petition with the same signatures) produce
  // the same HMAC, and `IssuanceRecord.hmac` is unique. The first export
  // wins; later identical exports become no-ops on the ledger.
  await prisma.issuanceRecord.upsert({
    where: { hmac: digest },
    update: {},
    create: {
      kind: "CSV",
      proposal_id: proposal.id,
      issuer_user_id: session.user.id,
      hmac: digest,
      payload_json: JSON.stringify({
        kind: "CSV",
        proposalId: proposal.id,
        issuedAt,
        signatureCount: signatures.length,
      }),
    },
  });

  const safeId = proposal.id.replace(/[^a-zA-Z0-9_-]/g, "_");
  // Stamp the filename with the local Japan date, not UTC.
  const datestamp = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date()); // en-CA gives YYYY-MM-DD
  const filename = `petition-signatures-${safeId}-${datestamp}.csv`;

  return new Response(signed, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
      // Don't let curious intermediaries snoop on this even at staging.
      "X-Content-Type-Options": "nosniff",
    },
  });
}
