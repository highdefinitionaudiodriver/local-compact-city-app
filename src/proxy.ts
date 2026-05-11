import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Edge-safe proxy: only the Node-free authConfig is loaded here.
// (Renamed from middleware.ts per Next.js 16's new convention.)
export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
