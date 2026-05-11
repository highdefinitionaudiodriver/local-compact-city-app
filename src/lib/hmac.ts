import { createHmac, timingSafeEqual } from "node:crypto";

// ────────────────────────────────────────────────────────────────────────────
// HMAC-SHA256 helpers used to sign CSV / PDF exports.
//
// The signing key lives in the EXPORT_HMAC_SECRET environment variable. It
// must be present at runtime; failing fast at module load is preferable to
// silently producing unsigned exports.
// ────────────────────────────────────────────────────────────────────────────

function getSecret(): string {
  const s = process.env.EXPORT_HMAC_SECRET;
  if (!s || s.length < 16) {
    throw new Error(
      "EXPORT_HMAC_SECRET is not set or is too short. " +
        "Add a strong random value to .env to enable export signing.",
    );
  }
  return s;
}

/** HMAC-SHA256 of a string or Buffer, returned as a lowercase hex digest. */
export function hmacHex(payload: string | Buffer): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

/**
 * Build a deterministic JSON canonicalization of an object, sorting keys
 * recursively so the same logical payload always hashes the same. We use
 * this as the input to `hmacHex` for PDF signatures, where hashing the
 * binary output would be circular (the hash is printed inside the file).
 */
export function canonicalize(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object" && value.constructor === Object) {
    const obj = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const k of Object.keys(obj).sort()) sorted[k] = sortKeys(obj[k]);
    return sorted;
  }
  return value;
}

/**
 * Constant-time comparison for two hex digests. Length-aware so callers can
 * verify untrusted input without leaking timing information.
 */
export function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const ba = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}
