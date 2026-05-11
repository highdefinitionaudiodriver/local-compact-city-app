import { createHash } from "crypto";

// ────────────────────────────────────────────────────────────────────────────
// JPKI (Japanese Public Key Infrastructure) MOCK
// ────────────────────────────────────────────────────────────────────────────
// In production this layer would:
//   1. Trigger an NFC read of the My Number Card.
//   2. Prompt the holder for the 6–16 digit signing PIN.
//   3. Receive a signed challenge from the card's signing certificate.
//   4. Verify the cert chain against J-LIS root, then extract:
//        - certificate serial number    (NEVER the 12-digit My Number)
//        - holder's address attribute   (mapped to the 6-digit municipal code)
//   5. Return ONLY the SHA-256 hash of the serial as the application's user id.
//
// This file mocks (1)–(4) with hand-picked fake personas so the rest of the
// app can be developed end-to-end. We deliberately do NOT generate fake
// 12-digit My Numbers anywhere — even the mock should not normalize that.
// ────────────────────────────────────────────────────────────────────────────

export type PersonaCategory = "RESIDENT" | "OUTSIDE" | "STAFF";

export type JpkiPersona = {
  /** Stable opaque key for the persona button in the mock login UI. */
  key: string;
  /** Bucket the persona shows up under in the picker. */
  category: PersonaCategory;
  /**
   * Anonymous label rendered BEFORE the card is read. Deliberately omits
   * the holder's name so the picker doesn't expose mock personal data
   * (and so the demo mirrors how a real reader works — the operator sees
   * a card silhouette, not an identity, until authentication completes).
   */
  anonymous_label: string;
  /**
   * Real-name display, only revealed AFTER successful authentication
   * (the same mechanism that gates this in production: nothing personal
   * before the cert is verified).
   */
  display_name: string;
  /** 6-digit municipality code from the address attribute. */
  resident_code: string;
  /** Fake signing-certificate serial. Only its SHA-256 leaves this module. */
  _mock_certificate_serial: string;
};

export const PERSONA_CATEGORY_LABEL: Record<PersonaCategory, string> = {
  RESIDENT: "区内住民",
  OUTSIDE: "区外住民",
  STAFF: "自治体職員",
};

// Five fake cardholders used to demo cross-municipality behavior.
// `anonymous_label` is what the picker shows; `display_name` is the
// real-name reveal that fires only after authentication succeeds.
export const JPKI_PERSONAS: JpkiPersona[] = [
  {
    key: "chiyoda-a",
    category: "RESIDENT",
    anonymous_label: "千代田区住民 A",
    display_name: "山田 太郎",
    resident_code: "131016",
    _mock_certificate_serial: "JPKI-MOCK-CERT-CHIYODA-A-0001",
  },
  {
    key: "chiyoda-b",
    category: "RESIDENT",
    anonymous_label: "千代田区住民 B",
    display_name: "佐藤 花子",
    resident_code: "131016",
    _mock_certificate_serial: "JPKI-MOCK-CERT-CHIYODA-B-0002",
  },
  {
    key: "chiyoda-c",
    category: "RESIDENT",
    anonymous_label: "千代田区住民 C",
    display_name: "鈴木 一郎",
    resident_code: "131016",
    _mock_certificate_serial: "JPKI-MOCK-CERT-CHIYODA-C-0003",
  },
  {
    key: "minato-a",
    category: "OUTSIDE",
    anonymous_label: "港区住民",
    display_name: "田中 次郎",
    resident_code: "131032",
    _mock_certificate_serial: "JPKI-MOCK-CERT-MINATO-A-0004",
  },
  {
    key: "osaka-a",
    category: "OUTSIDE",
    anonymous_label: "大阪市住民",
    display_name: "高橋 美咲",
    resident_code: "271004",
    _mock_certificate_serial: "JPKI-MOCK-CERT-OSAKA-A-0005",
  },
  {
    key: "morioka-a",
    category: "RESIDENT",
    anonymous_label: "盛岡市民 A",
    display_name: "佐々木 拓也",
    resident_code: "132012",
    _mock_certificate_serial: "JPKI-MOCK-CERT-MORIOKA-A-0006",
  },
  {
    // Mock staff account. In production, staff role would be issued by the
    // municipality's identity provider, NOT inferred from a citizen My Number
    // Card. This persona exists purely so the prototype can demonstrate the
    // back-office UX without standing up a separate auth pipeline.
    key: "chiyoda-staff",
    category: "STAFF",
    anonymous_label: "千代田区役所 担当者",
    display_name: "千代田区役所 担当者",
    resident_code: "131016",
    _mock_certificate_serial: "JPKI-MOCK-CERT-CHIYODA-STAFF-9001",
  },
  {
    key: "morioka-staff",
    category: "STAFF",
    anonymous_label: "盛岡市役所 担当者",
    display_name: "盛岡市役所 担当者",
    resident_code: "132012",
    _mock_certificate_serial: "JPKI-MOCK-CERT-MORIOKA-STAFF-9002",
  },
];

/** Persona keys whose hashed ids gain back-office access. */
export const STAFF_PERSONA_KEYS = ["chiyoda-staff", "morioka-staff"] as const;

export type JpkiAuthResult = {
  /** sha256(certificate_serial) — used as the application User.id. */
  hashed_id: string;
  resident_code: string;
  display_name: string;
};

/** Hash a JPKI signing-certificate serial into the opaque User.id. */
export function hashCertificateSerial(serial: string): string {
  return createHash("sha256").update(serial).digest("hex");
}

/**
 * Mock equivalent of "tap card + enter PIN + read certificate".
 * Returns ONLY the hashed id, resident code, and display name.
 */
export function readCardAsPersona(personaKey: string): JpkiAuthResult | null {
  const persona = JPKI_PERSONAS.find((p) => p.key === personaKey);
  if (!persona) return null;
  return {
    hashed_id: hashCertificateSerial(persona._mock_certificate_serial),
    resident_code: persona.resident_code,
    display_name: persona.display_name,
  };
}
