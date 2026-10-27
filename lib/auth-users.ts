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

// Remove acentos, baixa a caixa e normaliza espaços, para aceitar login
// digitado de formas diferentes ("João", "joao", "JOAO ANGELO"...).
function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

// Formas aceitas de digitar o nome: só o primeiro nome, o nome completo,
// qualquer prefixo de palavras entre os dois, e primeiro + último nome
// (cobre "nome e sobrenome" quando há nomes do meio, ex: Italo Leal dos Santos).
function nameVariants(nome: string): string[] {
  const words = normalize(nome).split(" ").filter(Boolean);
  const variants = new Set<string>();
  for (let i = 1; i <= words.length; i++) {
    variants.add(words.slice(0, i).join(" "));
  }
  if (words.length > 2) {
    variants.add(`${words[0]} ${words[words.length - 1]}`);
  }
  return [...variants];
}

export function verifyCredentials(usuario: string, senha: string): { usuario: string; nome: string } | null {
  const users = loadUsers();
  const input = normalize(usuario);
  const match = users.find((u) => {
    if (u.senha !== senha) return false;
    if (normalize(u.usuario) === input) return true;
    return nameVariants(u.nome).includes(input);
  });
  return match ? { usuario: match.usuario, nome: match.nome } : null;
}
