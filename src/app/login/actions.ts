"use server";

import { signIn, signOut } from "@/auth";
import { redirect } from "next/navigation";

export async function jpkiLoginAction(formData: FormData) {
  const personaKey = formData.get("personaKey");
  if (typeof personaKey !== "string" || !personaKey) {
    redirect("/login?error=missing-persona");
  }

  await signIn("jpki-mock", {
    personaKey,
    redirectTo: "/",
  });
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}
