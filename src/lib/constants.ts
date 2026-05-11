// SQLite has no native enums. These constants and type guards are the source
// of truth for enum-like Prisma String columns.

export const ProposalType = {
  IDEA: "IDEA",
  PETITION: "PETITION",
} as const;
export type ProposalType = (typeof ProposalType)[keyof typeof ProposalType];

export const ProposalStatus = {
  OPEN: "OPEN",
  CLOSED: "CLOSED",
  SUBMITTED: "SUBMITTED",
} as const;
export type ProposalStatus = (typeof ProposalStatus)[keyof typeof ProposalStatus];

export const VoteType = {
  FOR: "FOR",
  AGAINST: "AGAINST",
  SIGN: "SIGN",
} as const;
export type VoteType = (typeof VoteType)[keyof typeof VoteType];

// ────────────────────────────────────────────────────────────────────────────
// Multi-tenant municipality registry.
//
// In production this would come from the JPKI certificate's address attribute
// mapped to the official 6-digit local-government code (JIS X 0402). For the
// prototype we keep a small in-memory map: the value is the full prefecture +
// city label so we can render "東京都千代田区" without a separate prefecture
// lookup.
//
// Note: code "132012" = 岩手県盛岡市 is a *demo placeholder* — the real
// 6-digit code for Morioka City is 032018. We keep the demo code to stay
// consistent with prior seed data and presentation scripts.
// ────────────────────────────────────────────────────────────────────────────
export const MUNICIPALITIES: Record<string, string> = {
  "011002": "北海道札幌市",
  "131016": "東京都千代田区",
  "131024": "東京都中央区",
  "131032": "東京都港区",
  "132012": "岩手県盛岡市",
  "271004": "大阪府大阪市",
  "401307": "福岡県福岡市",
};

/**
 * Render a municipality label, falling back to the raw code if unknown.
 * Centralizes the "what does this code display as" question so callers
 * never have to remember to handle missing entries.
 */
export function getMunicipalityLabel(code: string | null | undefined): string {
  if (!code) return "—";
  return MUNICIPALITIES[code] ?? code;
}

/**
 * The product's brand name shown when no user is logged in. Multi-tenant
 * deployments use the user's own `resident_code` once they authenticate —
 * see `<SiteHeader />` for the runtime resolution.
 */
export const PRODUCT_NAME = "ローカル・コンパクトシティ 住民ポータル";

/**
 * @deprecated Multi-tenant: there is no global "home" municipality anymore.
 * Use the authenticated user's `resident_code` from the session.
 * This export is retained only as a build-time fallback for legacy callers
 * and will be removed once all references are migrated.
 */
export const HOME_MUNICIPALITY_CODE = "131016";
