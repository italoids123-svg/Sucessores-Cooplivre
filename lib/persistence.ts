import { BASE_DATA_VERSION } from "./data";
import type { Chair, Person, SuccessionMap } from "./types";

const STORAGE_KEY = "cooplivre-mapa-sucessorio:v1";

interface PersistedState {
  version: 1;
  baseDataVersion: number;
  chairs: Chair[];
  people: Person[];
  succession: SuccessionMap;
  dataVersion: number;
  baseUpdatedAt: string | null;
}

export type PersistableState = Omit<PersistedState, "version" | "baseDataVersion">;

// Guarda a base (cadeiras, pessoas, sucessão) só no navegador de quem está
// usando — não existe backend. Sobrevive a recarregar a página no mesmo
// navegador, mas não sincroniza entre pessoas, dispositivos ou depois de
// limpar dados do site. Continua sendo necessário baixar a planilha para
// ter uma cópia de fato durável.
//
// baseDataVersion marca com qual versão de CHAIRS/PEOPLE (lib/data.ts) a
// base salva foi gravada. Se o código mudou os dados padrão desde então
// (nova cadeira, novo nível), a base salva fica incompatível e é descartada
// aqui — sem isso, o navegador ficaria "preso" para sempre na versão antiga,
// nunca vendo cadeiras novas do código.
export function loadPersistedState(): PersistableState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    if (parsed.version !== 1 || !Array.isArray(parsed.chairs) || !Array.isArray(parsed.people)) return null;
    if (parsed.baseDataVersion !== BASE_DATA_VERSION) return null;
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
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, baseDataVersion: BASE_DATA_VERSION, ...state }));
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
