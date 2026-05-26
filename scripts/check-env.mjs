import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

function loadDotEnv(filePath) {
  if (!existsSync(filePath)) return;
  const text = readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, raw] = match;
    if (process.env[key]) continue;
    process.env[key] = raw.trim().replace(/^['"]|['"]$/g, "");
  }
}

loadDotEnv(path.join(process.cwd(), ".env"));

const required = [
  {
    name: "DATABASE_URL",
    hint: "Prisma needs DATABASE_URL, e.g. file:./dev.db for local demos.",
  },
  {
    name: "AUTH_SECRET",
    minLength: 16,
    hint: "Auth.js needs a stable secret. Generate one with: openssl rand -base64 32",
  },
  {
    name: "EXPORT_HMAC_SECRET",
    minLength: 16,
    hint: "CSV/PDF export verification needs a strong HMAC secret.",
  },
];

const optionalGroups = [
  {
    label: "xID/OIDC production bridge",
    vars: ["XID_ISSUER", "XID_CLIENT_ID", "XID_CLIENT_SECRET"],
  },
];

const failures = [];
const warnings = [];

for (const item of required) {
  const value = process.env[item.name];
  if (!value) {
    failures.push(`${item.name} is missing. ${item.hint}`);
    continue;
  }
  if (item.minLength && value.length < item.minLength) {
    failures.push(`${item.name} is too short (${value.length}). ${item.hint}`);
  }
}

const jpkiMode = (process.env.JPKI_MODE || "mock").toLowerCase();
if (!["mock", "real"].includes(jpkiMode)) {
  failures.push("JPKI_MODE must be either mock or real.");
}
if (jpkiMode === "real" && !process.env.JPKI_WEB_ENDPOINT) {
  failures.push("JPKI_WEB_ENDPOINT is required when JPKI_MODE=real.");
}

for (const group of optionalGroups) {
  const present = group.vars.filter((name) => Boolean(process.env[name]));
  if (present.length > 0 && present.length < group.vars.length) {
    warnings.push(`${group.label} is partially configured: ${present.join(", ")}. Set all of ${group.vars.join(", ")} or leave all blank.`);
  }
}

if (warnings.length) {
  console.warn("Environment warnings:");
  for (const warning of warnings) console.warn(`- ${warning}`);
}

if (failures.length) {
  console.error("Environment check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Environment check OK.");
