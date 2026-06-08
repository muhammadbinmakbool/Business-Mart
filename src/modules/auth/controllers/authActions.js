"use server";

import { AuthService } from "../services/AuthService";
import { redirect } from "next/navigation";

export async function loginAction(formData) {
  const email = formData.get("email");
  const password = formData.get("password");

  try {
    await AuthService.login(email, password);
  } catch (error) {
    return { error: error.message || "Login failed" };
  }

  redirect("/dashboard");
}

export async function logoutAction() {
  try {
    await AuthService.logout();
  } catch (error) {
    return { error: error.message || "Logout failed" };
  }

  redirect("/login");
}
