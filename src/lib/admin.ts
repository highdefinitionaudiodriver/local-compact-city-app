import type { Session } from "next-auth";

// Edge-safe: this file deliberately does NOT import jpki-mock or node:crypto
// so it can be loaded by middleware. The hashed ids below are precomputed
// SHA-256 values of the mock staff cert serials defined in jpki-mock.ts.
//
// If you add or rename a staff persona, recompute the hash and update this
// list. A unit-test-style assertion lives in scripts/check-admin-ids.ts.
export const ADMIN_USER_IDS: ReadonlySet<string> = new Set([
  // sha256("JPKI-MOCK-CERT-CHIYODA-STAFF-9001") — 東京都千代田区
  "e53b6cba2ac20d44613cc52300c910b5eb3d04f67cb60484427e22013ff2ff38",
  // sha256("JPKI-MOCK-CERT-MORIOKA-STAFF-9002") — 岩手県盛岡市
  "94f856959f77fa136606a08a19522f10ad3f91bac4bbb7322f38a7f64876e089",
]);

/**
 * Multi-tenant authorization gate for back-office routes.
 *
 * In a single-tenant world this also enforced "the staff member's own
 * resident_code matches the platform's home municipality". Now each
 * staff persona is *implicitly* scoped to their own municipality via
 * `session.user.resident_code`, and every admin action / query that
 * touches a Proposal additionally checks
 *   `proposal.resident_code === session.user.resident_code`
 * so a Chiyoda clerk cannot manage Morioka data even by URL guessing.
 *
 * This function therefore only answers the role question
 *   "is this user a municipality staff member at all?"
 * The municipality scoping is enforced at each call site.
 */
export function isAdmin(
  session: Session | null | undefined,
): session is Session & { user: NonNullable<Session["user"]> } {
  if (!session?.user?.id) return false;
  return ADMIN_USER_IDS.has(session.user.id);
}
