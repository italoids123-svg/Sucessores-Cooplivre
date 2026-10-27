"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/actions/auth";

const initialState: LoginState = {};

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form className="login-card" action={formAction}>
      <div className="login-brand">
        <b>Cooplivre</b>
        <span>Mapa Sucessório</span>
      </div>
      <h1>Entrar</h1>
      <p className="login-sub">Acesso restrito. Informe seu usuário e senha para continuar.</p>

      <label className="login-field">
        Usuário ou nome
        <input name="usuario" type="text" autoComplete="username" placeholder="ex: Italo ou Italo Leal dos Santos" required autoFocus />
      </label>
      <label className="login-field">
        Senha
        <input name="senha" type="password" autoComplete="current-password" required />
      </label>

      {state?.error ? <div className="login-error">{state.error}</div> : null}

      <button className="login-submit" type="submit" disabled={pending}>
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
