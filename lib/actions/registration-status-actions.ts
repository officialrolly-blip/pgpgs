"use server";

import { redirect } from "next/navigation";
import {
  authenticateRegistration,
  clearRegistrationSession,
  setRegistrationSession,
} from "@/lib/neophyte-auth";

export type RegistrationLoginState = { error?: string };

export async function registrationLoginAction(
  _previousState: RegistrationLoginState,
  formData: FormData,
): Promise<RegistrationLoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!email.trim() || !password) return { error: "Enter the email and password used during registration." };

  const result = await authenticateRegistration(email, password);
  if (!result.ok) return { error: result.error };
  await setRegistrationSession(result.token);
  redirect("/join/status");
}

export async function registrationLogoutAction() {
  await clearRegistrationSession();
  redirect("/join/status");
}