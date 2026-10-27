"use server";

import { redirect } from "next/navigation";
import { verifyCredentials } from "@/lib/auth-users";
import { createSession, deleteSession } from "@/lib/session";

export interface LoginState {
  error?: string;
}

export async function login(_state: LoginState | undefined, formData: FormData): Promise<LoginState> {
  const usuario = String(formData.get("usuario") || "").trim();
  const senha = String(formData.get("senha") || "");

  if (!usuario || !senha) {
    return { error: "Informe usuário e senha." };
  }

  const user = verifyCredentials(usuario, senha);
  if (!user) {
    return { error: "Usuário ou senha inválidos." };
  }

  await createSession(user);
  redirect("/");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
