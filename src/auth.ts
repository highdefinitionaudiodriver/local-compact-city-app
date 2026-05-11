import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { readCardAsPersona, hashCertificateSerial } from "@/lib/jpki-mock";
import { authConfig } from "@/auth.config";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      resident_code: string;
      is_verified: boolean;
      name?: string | null;
    };
  }
}

// ────────────────────────────────────────────────────────────────────────────
// xID / generic OIDC provider — production wiring stub.
//
// Activation contract: when XID_ISSUER, XID_CLIENT_ID and XID_CLIENT_SECRET
// are all present in the environment, this provider is registered alongside
// the existing mock Credentials provider. The /login page checks the same
// env vars to enable its "実機で認証する (xID連携)" button.
//
// Claim mapping:
//   profile.sub               → User.id (sha256("XID:" + sub) for namespace)
//   profile.municipality_code → User.resident_code (custom claim, fallback
//                               to address.locality / address.postal_code →
//                               first 6 chars if needed)
//   profile.name              → User.display_name
//
// We deliberately rehash `sub` rather than store it raw, for two reasons:
//   1. Same SHA-256 convention as the JPKI cert serial path keeps every
//      User.id in the system uniformly opaque and the same length.
//   2. The "XID:" prefix in the hash input means the OIDC user-id namespace
//      cannot collide with the JPKI cert-serial namespace, even if a
//      hypothetical future provider happens to expose the same `sub` value.
//
// Even when the OIDC provider is enabled, we keep `session: "jwt"` strategy
// (no PrismaAdapter), so the App-side User row is upserted in the signIn
// callback below, mirroring how the Credentials provider does it.
// ────────────────────────────────────────────────────────────────────────────

interface XIDProfile {
  sub: string;
  name?: string;
  /** Custom claim issued by the JPKI bridge with the 6-digit municipality. */
  municipality_code?: string;
  address?: {
    municipality_code?: string;
    locality?: string;
    postal_code?: string;
  };
  email?: string;
}

function buildProviders() {
  const providers: NextAuthConfig["providers"] = [
    Credentials({
      id: "jpki-mock",
      name: "マイナンバーカード（モック）",
      credentials: {
        personaKey: { label: "Persona Key", type: "text" },
      },
      authorize: async (credentials) => {
        const personaKey = credentials?.personaKey;
        if (typeof personaKey !== "string") return null;

        const result = readCardAsPersona(personaKey);
        if (!result) return null;

        const user = await prisma.user.upsert({
          where: { id: result.hashed_id },
          update: {
            resident_code: result.resident_code,
            display_name: result.display_name,
            is_verified: true,
          },
          create: {
            id: result.hashed_id,
            resident_code: result.resident_code,
            display_name: result.display_name,
            is_verified: true,
          },
        });

        return {
          id: user.id,
          name: user.display_name,
          resident_code: user.resident_code,
          is_verified: user.is_verified,
        } as unknown as { id: string; name: string | null };
      },
    }),
  ];

  if (
    process.env.XID_ISSUER &&
    process.env.XID_CLIENT_ID &&
    process.env.XID_CLIENT_SECRET
  ) {
    providers.push({
      id: "xid",
      name: "xID（公的個人認証）",
      type: "oidc",
      issuer: process.env.XID_ISSUER,
      clientId: process.env.XID_CLIENT_ID,
      clientSecret: process.env.XID_CLIENT_SECRET,
      // Most JPKI bridges expose authorization, token, userinfo and jwks
      // endpoints under the standard OIDC discovery path. If a particular
      // provider deviates, override here (see NextAuth provider docs).
      authorization: {
        params: {
          scope: "openid profile address",
        },
      },
      // Map the OIDC profile to our internal User shape. The values returned
      // here are passed straight into the jwt callback as `user` on first
      // sign-in; we re-cast them in the jwt callback to add to the token.
      profile(profile: XIDProfile) {
        const id = hashCertificateSerial(`XID:${profile.sub}`);
        const muni =
          profile.municipality_code ??
          profile.address?.municipality_code ??
          "";
        return {
          id,
          name: profile.name ?? null,
          email: profile.email ?? null,
          // Custom fields surfaced via the jwt callback below.
          resident_code: muni,
          is_verified: true,
        } as unknown as { id: string; name: string | null };
      },
    });
  }

  return providers;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: buildProviders(),
  callbacks: {
    ...authConfig.callbacks,
    // Persist OIDC-authenticated users to the same User table the rest of the
    // app expects. The Credentials path already does its own upsert inside
    // `authorize`; here we handle every other provider (currently just xid).
    signIn: async ({ user, account, profile }) => {
      if (!account || account.provider === "credentials" || account.provider === "jpki-mock") {
        return true;
      }
      // OIDC flow: `user` carries the shape returned by `profile()` above,
      // possibly augmented by NextAuth (id, name, email).
      const u = user as unknown as {
        id: string;
        name?: string | null;
        resident_code?: string;
        is_verified?: boolean;
      };
      if (!u.id) return false;

      // Defensive: pull resident_code from `profile` directly too in case a
      // custom adapter strips it from `user`.
      const muniFromProfile =
        (profile as XIDProfile | null | undefined)?.municipality_code ??
        (profile as XIDProfile | null | undefined)?.address?.municipality_code ??
        "";
      const muni = u.resident_code || muniFromProfile;

      await prisma.user.upsert({
        where: { id: u.id },
        update: {
          resident_code: muni,
          display_name: u.name ?? null,
          is_verified: true,
        },
        create: {
          id: u.id,
          resident_code: muni,
          display_name: u.name ?? null,
          is_verified: true,
        },
      });
      return true;
    },
    jwt: async ({ token, user }) => {
      if (user) {
        const u = user as unknown as {
          id: string;
          resident_code: string;
          is_verified: boolean;
        };
        token.uid = u.id;
        token.resident_code = u.resident_code;
        token.is_verified = u.is_verified;
      }
      return token;
    },
  },
});

/** True iff the OIDC bridge is configured. The login page reads this. */
export function isXidEnabled(): boolean {
  return !!(
    process.env.XID_ISSUER &&
    process.env.XID_CLIENT_ID &&
    process.env.XID_CLIENT_SECRET
  );
}
