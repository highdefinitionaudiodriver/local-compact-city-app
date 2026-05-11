import {
  JPKI_PERSONAS,
  STAFF_PERSONA_KEYS,
  hashCertificateSerial,
} from "../src/lib/jpki-mock";
import { ADMIN_USER_IDS } from "../src/lib/admin";

// Cross-check: the precomputed admin ids embedded in src/lib/admin.ts must
// equal the actual SHA-256 hashes of the staff personas in jpki-mock.ts.
const expected = new Set(
  JPKI_PERSONAS.filter((p) =>
    (STAFF_PERSONA_KEYS as readonly string[]).includes(p.key),
  ).map((p) => hashCertificateSerial(p._mock_certificate_serial)),
);

const actual = ADMIN_USER_IDS;

const missing = [...expected].filter((id) => !actual.has(id));
const extra = [...actual].filter((id) => !expected.has(id));

if (missing.length || extra.length) {
  console.error("ADMIN_USER_IDS drift detected!");
  if (missing.length) console.error("  missing in admin.ts:", missing);
  if (extra.length) console.error("  extra in admin.ts:", extra);
  process.exit(1);
}
console.log("ADMIN_USER_IDS in sync with staff personas.");
