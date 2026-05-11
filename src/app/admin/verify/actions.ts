"use server";

import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { hmacHex, safeEqualHex } from "@/lib/hmac";
import { PDFDocument } from "pdf-lib";
import { revalidatePath } from "next/cache";

// ────────────────────────────────────────────────────────────────────────────
// Verification result shape returned to the client UI.
// ────────────────────────────────────────────────────────────────────────────

export type VerifyResult =
  | {
      kind: "CSV" | "PDF";
      result: "OK";
      message: string;
      details: {
        proposalId?: string;
        proposalTitle?: string;
        signatureCount?: number;
        issuedAt?: string; // ISO
        issuerShortHash?: string;
        hmac: string;
      };
    }
  | {
      kind: "CSV" | "PDF" | "UNKNOWN";
      result: "TAMPERED" | "UNKNOWN" | "ERROR";
      message: string;
      details?: { hmac?: string };
    };

// Two-stage detection: first see whether ANY "# HMAC-SHA256: ..." line exists
// (so a corrupted-but-recognizable footer is reported as tampering rather
// than as "format unknown"), then validate the digest is exactly 64 hex.
const HMAC_LINE_LOOSE = /^# HMAC-SHA256:\s*(\S*)\s*$/m;
const HMAC_HEX_RE = /^[0-9a-f]{64}$/;
const CSV_FOOTER_LINE_RE = /\r?\n# HMAC-SHA256:[^\r\n]*\r?\n?$/;

// ────────────────────────────────────────────────────────────────────────────
// Public entry point: classify file, dispatch to the right verifier, write a
// VerificationLog entry, return a structured result.
// ────────────────────────────────────────────────────────────────────────────

export async function verifyExportAction(formData: FormData): Promise<VerifyResult> {
  const session = await auth();
  if (!isAdmin(session)) {
    return {
      kind: "UNKNOWN",
      result: "ERROR",
      message: "この操作は自治体職員のみ実行できます。",
    };
  }
  const verifier = session.user.id;

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return {
      kind: "UNKNOWN",
      result: "ERROR",
      message: "ファイルが選択されていません。",
    };
  }
  if (file.size > 25 * 1024 * 1024) {
    return {
      kind: "UNKNOWN",
      result: "ERROR",
      message: "ファイルが大きすぎます (25MB上限)。",
    };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const fileName = file.name;
  const fileSize = file.size;
  const lower = fileName.toLowerCase();

  let outcome: VerifyResult;
  if (lower.endsWith(".csv")) {
    outcome = await verifyCsv(bytes);
  } else if (lower.endsWith(".pdf")) {
    outcome = await verifyPdf(bytes);
  } else {
    outcome = {
      kind: "UNKNOWN",
      result: "UNKNOWN",
      message: "対応形式は CSV / PDF のみです。",
    };
  }

  // Append-only verification log. We store the HMAC found in the file (if
  // any) so auditors can correlate verification attempts to specific
  // issuances later.
  await prisma.verificationLog.create({
    data: {
      verifier_user_id: verifier,
      kind: outcome.kind,
      result: outcome.result === "OK" ? "OK" : outcome.result === "TAMPERED" ? "TAMPERED" : "UNKNOWN",
      hmac: outcome.details && "hmac" in outcome.details ? outcome.details.hmac ?? null : null,
      file_name: fileName,
      file_size: fileSize,
    },
  });

  revalidatePath("/admin/verify");
  return outcome;
}

// ────────────────────────────────────────────────────────────────────────────
// CSV verifier: split the trailing "# HMAC-SHA256: <hex>\r\n" line, recompute
// HMAC over everything before it, constant-time-compare. On match, also try
// to surface the matching IssuanceRecord for nicer UI.
// ────────────────────────────────────────────────────────────────────────────

async function verifyCsv(bytes: Uint8Array): Promise<VerifyResult> {
  // CRITICAL: ignoreBOM:true keeps the U+FEFF BOM in the decoded string.
  // The exporter wrote `"﻿" + body` and HMAC'd that exact string, so we
  // must include the BOM here too — otherwise valid files are misjudged as
  // tampered because the hash input is short by 3 bytes.
  const text = new TextDecoder("utf-8", { ignoreBOM: true }).decode(bytes);

  // Stage 1: is this even a file we recognize as one of ours?
  const loose = text.match(HMAC_LINE_LOOSE);
  if (!loose) {
    return {
      kind: "CSV",
      result: "UNKNOWN",
      message:
        "HMAC 署名行が見つかりません。本システムが発行したCSVではない可能性があります。",
    };
  }

  // Stage 2: the line exists, but is the digest the right shape?
  // A malformed digest is strong evidence of tampering, not of an unknown file.
  const claimed = loose[1] ?? "";
  if (!HMAC_HEX_RE.test(claimed)) {
    return {
      kind: "CSV",
      result: "TAMPERED",
      message:
        "HMAC 署名行は存在しますが、ハッシュ値の形式が不正です（64桁の16進数ではありません）。改ざんされた可能性が高いです。",
      details: { hmac: claimed || undefined },
    };
  }

  const body = text.replace(CSV_FOOTER_LINE_RE, "\r\n");
  // We only strip the HMAC line; the body keeps its trailing CRLF, exactly
  // as it was when we hashed it at issuance time.
  const recomputed = hmacHex(body);

  if (!safeEqualHex(recomputed, claimed)) {
    return {
      kind: "CSV",
      result: "TAMPERED",
      message:
        "HMAC が一致しません。この文書は改ざんされているか、別の鍵で署名されています。",
      details: { hmac: claimed },
    };
  }

  // Cross-reference with the issuance ledger. A self-consistent HMAC is
  // strong evidence on its own (only holders of EXPORT_HMAC_SECRET could
  // produce one), but a hit in IssuanceRecord upgrades the message to
  // "verified original" and lets us show issuance metadata.
  const record = await prisma.issuanceRecord.findUnique({
    where: { hmac: claimed },
  });

  let proposalTitle: string | undefined;
  if (record) {
    const p = await prisma.proposal.findUnique({
      where: { id: record.proposal_id },
      select: { title: true },
    });
    proposalTitle = p?.title;
  }

  const payload = record ? safeParse(record.payload_json) : null;

  return {
    kind: "CSV",
    result: "OK",
    message:
      "原本性が確認されました。この文書はシステムによって発行され、改ざんされていません。",
    details: {
      hmac: claimed,
      proposalId: record?.proposal_id,
      proposalTitle,
      signatureCount:
        payload && typeof payload === "object" && payload !== null && "signatureCount" in payload
          ? Number((payload as { signatureCount: unknown }).signatureCount)
          : undefined,
      issuedAt: record?.issued_at.toISOString(),
      issuerShortHash: record?.issuer_user_id.slice(0, 8),
    },
  };
}

// ────────────────────────────────────────────────────────────────────────────
// PDF verifier: read the keywords metadata produced at issuance, parse out
// the HMAC, then look up the IssuanceRecord and re-derive the digest from
// the stored canonical payload. Two-stage check:
//   1. The HMAC in the PDF matches a record we issued.
//   2. Recomputing HMAC over that record's canonical payload reproduces the
//      same digest — proving our DB hasn't been tampered with either.
// ────────────────────────────────────────────────────────────────────────────

async function verifyPdf(bytes: Uint8Array): Promise<VerifyResult> {
  let pdf: PDFDocument;
  try {
    pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  } catch {
    return {
      kind: "PDF",
      result: "UNKNOWN",
      message: "PDF ファイルとして読み込めませんでした。",
    };
  }

  const keywords = pdf.getKeywords() ?? "";
  const hmacMatch = keywords.match(/hmac=([0-9a-f]{64})/);
  if (!hmacMatch) {
    return {
      kind: "PDF",
      result: "UNKNOWN",
      message:
        "PDF メタデータに HMAC が含まれていません。本システムが発行したPDFではない可能性があります。",
    };
  }
  const claimed = hmacMatch[1];

  const record = await prisma.issuanceRecord.findUnique({
    where: { hmac: claimed },
  });
  if (!record) {
    return {
      kind: "PDF",
      result: "TAMPERED",
      message:
        "発行台帳に該当するレコードがありません。この文書は本システムから発行されたものではないか、改ざんされています。",
      details: { hmac: claimed },
    };
  }

  // Recompute over the stored canonical payload — defends against a
  // ledger row being edited out-of-band.
  const recomputed = hmacHex(record.payload_json);
  if (!safeEqualHex(recomputed, claimed)) {
    return {
      kind: "PDF",
      result: "TAMPERED",
      message:
        "発行台帳のペイロードからHMACを再計算したところ一致しませんでした。台帳が破損しています。",
      details: { hmac: claimed },
    };
  }

  const proposal = await prisma.proposal.findUnique({
    where: { id: record.proposal_id },
    select: { title: true },
  });
  const payload = safeParse(record.payload_json) as Record<string, unknown> | null;
  const sigCount = payload && typeof payload.totalSignatures === "number"
    ? payload.totalSignatures
    : undefined;

  return {
    kind: "PDF",
    result: "OK",
    message:
      "原本性が確認されました。この文書はシステムによって発行され、改ざんされていません。",
    details: {
      hmac: claimed,
      proposalId: record.proposal_id,
      proposalTitle: proposal?.title,
      signatureCount: sigCount,
      issuedAt: record.issued_at.toISOString(),
      issuerShortHash: record.issuer_user_id.slice(0, 8),
    },
  };
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
