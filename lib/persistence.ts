import type { Chair, Person, SuccessionMap } from "./types";

const STORAGE_KEY = "cooplivre-mapa-sucessorio:v1";

interface PersistedState {
  version: 1;
  chairs: Chair[];
  people: Person[];
  succession: SuccessionMap;
  dataVersion: number;
  baseUpdatedAt: string | null;
}

export type PersistableState = Omit<PersistedState, "version">;

// Guarda a base (cadeiras, pessoas, sucessão) só no navegador de quem está
// usando — não existe backend. Sobrevive a recarregar a página no mesmo
// navegador, mas não sincroniza entre pessoas, dispositivos ou depois de
// limpar dados do site. Continua sendo necessário baixar a planilha para
// ter uma cópia de fato durável.
export function loadPersistedState(): PersistableState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    if (parsed.version !== 1 || !Array.isArray(parsed.chairs) || !Array.isArray(parsed.people)) return null;
    return {
      chairs: parsed.chairs,
      people: parsed.people,
      succession: parsed.succession ?? {},
      dataVersion: parsed.dataVersion ?? 0,
      baseUpdatedAt: parsed.baseUpdatedAt ?? null,
    };
  } catch {
    return null;
  }
}

export function savePersistedState(state: PersistableState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, ...state }));
  } catch {
    // localStorage indisponível (aba anônima, quota cheia, etc.) — ignora silenciosamente.
  }
}

export function clearPersistedState(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignora
  }
}
