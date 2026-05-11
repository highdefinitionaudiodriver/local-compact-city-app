import type { NextAuthConfig } from "next-auth";
import { ADMIN_USER_IDS } from "@/lib/admin";

// Edge-safe portion: no DB, no node:crypto, no providers that need them.
// The middleware imports only this file so it can run at the edge.
export const authConfig = {
  pages: {
    signIn: "/login",
    // Surface NextAuth provider/network errors back on the login page
    // (otherwise a misconfigured / unreachable OIDC issuer dumps users on
    // the framework's raw "Server error" screen, which is bad UX during
    // demos and worse in production).
    error: "/login",
  },
  session: { strategy: "jwt" as const },
  providers: [], // Real providers are attached in src/auth.ts (Node runtime)
  callbacks: {
    authorized: ({ auth, request: { nextUrl } }) => {
      const user = auth?.user;
      const isLoggedIn = !!user;
      const path = nextUrl.pathname;

      const requiresAuth =
        path === "/proposals/new" || path.startsWith("/report");
      const requiresAdmin =
        path.startsWith("/admin") && path !== "/admin/forbidden";

      if (requiresAdmin) {
        if (!isLoggedIn) return false;
        if (!user.id || !ADMIN_USER_IDS.has(user.id)) {
          // Rewrite to a clearly-signposted page rather than bouncing to login,
          // since a logged-in non-staff user being silently redirected is more
          // confusing than a 403-style screen.
          return Response.redirect(new URL("/admin/forbidden", nextUrl));
        }
        return true;
      }
      if (requiresAuth && !isLoggedIn) return false;
      return true;
    },
    jwt: ({ token }) => token,
    session: ({ session, token }) => {
      // Expose typed fields stamped by the Node-side jwt callback.
      const t = token as typeof token & {
        uid?: string;
        resident_code?: string;
        is_verified?: boolean;
      };
      if (t.uid) session.user.id = t.uid;
      if (t.resident_code) session.user.resident_code = t.resident_code;
      if (typeof t.is_verified === "boolean") session.user.is_verified = t.is_verified;
      return session;
    },
  },
} satisfies NextAuthConfig;
