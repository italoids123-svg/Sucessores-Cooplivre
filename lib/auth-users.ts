import "server-only";

interface AuthUser {
  usuario: string;
  senha: string;
  nome: string;
}

function loadUsers(): AuthUser[] {
  const raw = process.env.AUTH_USERS;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (u): u is AuthUser => typeof u?.usuario === "string" && typeof u?.senha === "string" && typeof u?.nome === "string"
    );
  } catch {
    return [];
  }
}

export function verifyCredentials(usuario: string, senha: string): { usuario: string; nome: string } | null {
  const users = loadUsers();
  const match = users.find((u) => u.usuario.toLowerCase() === usuario.trim().toLowerCase() && u.senha === senha);
  return match ? { usuario: match.usuario, nome: match.nome } : null;
}
