import { CRITERIA } from "./criteria";
import type { Chair, ChairScore, HierarquiaEntry, Person, SuccessionMap, SuccessionRecord } from "./types";

export const NB_MAP = Object.fromEntries(CRITERIA.nineBox.scale.map((x) => [x.code, x]));
export const INT_MAP = Object.fromEntries(CRITERIA.interesse.scale.map((x) => [x.key, x]));
export const MOB_MAP = Object.fromEntries(CRITERIA.mobilidade.scale.map((x) => [x.key, x]));

export function normCargo(s?: string | null): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
export function normName(s?: string | null): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}
export function fmtNum(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(1).replace(".", ",");
}

export function buildHierMap(hierarquia: HierarquiaEntry[]): Record<string, string> {
  return Object.fromEntries(hierarquia.map((h) => [h.nivel, h.elegivel]));
}

// Favorabilidade do time: fonte é o time que a pessoa LIDERA (corte de gestão imediata, GPTW), ciclos 2025/2026.
function lookupFavorabilidade(value: unknown): number | null {
  const v = Number(value);
  if (value === "" || value === null || value === undefined || isNaN(v)) return null;
  if (v >= 85) return 10;
  if (v >= 76) return 7;
  if (v >= 68) return 4;
  return 1;
}
function scoreNineBox(s: SuccessionRecord): number {
  const p24 = s.nineBox2024 && NB_MAP[s.nineBox2024] ? NB_MAP[s.nineBox2024].points : null;
  const p25 = s.nineBox2025 && NB_MAP[s.nineBox2025] ? NB_MAP[s.nineBox2025].points : null;
  if (p24 !== null && p25 !== null) return p24 * CRITERIA.nineBox.weight2024 + p25 * CRITERIA.nineBox.weight2025;
  if (p25 !== null) return p25;
  if (p24 !== null) return p24;
  return 0;
}
// Retorna null quando o critério NÃO SE APLICA (não lidera equipe, ou lidera mas o GPTW suprimiu o corte).
// null é diferente de 0: quem não se aplica disputa em 90 pontos aplicáveis, não leva nota zero.
function scoreFavorabilidade(s: SuccessionRecord): number | null {
  if (!s.lideraEquipe) return null;
  const p25 = lookupFavorabilidade(s.favorabilidade2025);
  const p26 = lookupFavorabilidade(s.favorabilidade2026);
  if (p25 !== null && p26 !== null) return p25 * CRITERIA.favorabilidade.weight2025 + p26 * CRITERIA.favorabilidade.weight2026;
  if (p26 !== null) return p26;
  if (p25 !== null) return p25;
  return null; // lidera equipe mas sem favorabilidade coletada
}
function scoreMobilidade(s: SuccessionRecord): number {
  return s.mobilidade && MOB_MAP[s.mobilidade] ? MOB_MAP[s.mobilidade].points : 0;
}
function scorePersonBase(succession: SuccessionMap, personId: string) {
  const s = succession[personId] || {};
  return { nineBox: scoreNineBox(s), favorabilidade: scoreFavorabilidade(s), mobilidade: scoreMobilidade(s) };
}

// retorna 1 se a Prioridade de interesse 1 bate com a cadeira, 2 se for a Prioridade 2, senão 0
export function interestMatch(succession: SuccessionMap, person: Person, targetCargoNorm: string): 0 | 1 | 2 {
  const s = succession[person.id] || {};
  if (targetCargoNorm && normCargo(s.prioridade1) === targetCargoNorm) return 1;
  if (targetCargoNorm && normCargo(s.prioridade2) === targetCargoNorm) return 2;
  return 0;
}
// Match Indicação Líder: só pontua quando o líder (ocupante da cadeira) indicou nominalmente
// essa pessoa como "Possível sucessor da posição atual" — cruzando com o interesse do liderado.
function scoreMatchForChair(succession: SuccessionMap, people: Person[], person: Person, chair: Chair): number {
  const occupant = people.find((p) => p.chairId === chair.id);
  if (!occupant) return 0;
  const occS = succession[occupant.id] || {};
  const named = normName(occS.possivelSucessorTexto);
  if (!named) return 0;
  return named.includes(normName(person.nome)) ? 20 : 0;
}
// pontuação de uma pessoa como candidata a UMA cadeira específica (Match e Interesse dependem da cadeira)
// A soma bruta é normalizada: pontos obtidos ÷ pontos aplicáveis × 100.
export function scoreForChair(succession: SuccessionMap, people: Person[], personId: string, chair: Chair): ChairScore {
  const s = succession[personId] || {};
  const person = people.find((p) => p.id === personId)!;
  const targetCargo = normCargo(chair.cargo);
  const which = interestMatch(succession, person, targetCargo);
  const horizonteKey = which === 1 ? s.horizonte1 : which === 2 ? s.horizonte2 : null;
  const interesse = horizonteKey && INT_MAP[horizonteKey] ? INT_MAP[horizonteKey].points : 0;
  const matchLider = which > 0 ? scoreMatchForChair(succession, people, person, chair) : 0;
  const base = scorePersonBase(succession, personId);
  const favAplica = base.favorabilidade !== null;
  const pontosAplicaveis = favAplica ? 100 : 90;
  const bruto = base.nineBox + matchLider + (favAplica ? (base.favorabilidade as number) : 0) + interesse + base.mobilidade;
  const total = Math.round((bruto / pontosAplicaveis) * 100 * 10) / 10;
  return {
    nineBox: base.nineBox,
    matchLider,
    favorabilidade: base.favorabilidade,
    interesse,
    mobilidade: base.mobilidade,
    bruto: Math.round(bruto * 10) / 10,
    pontosAplicaveis,
    favAplica,
    total,
    which,
  };
}
export function hasAnyData(succession: SuccessionMap, personId: string): boolean {
  const s = succession[personId] || {};
  return Object.keys(s).some((k) => {
    const v = (s as Record<string, unknown>)[k];
    return v !== "" && v !== null && v !== undefined && v !== false;
  });
}
export function aderenciaBand(total: number): { label: string; cls: string } {
  if (total >= 80) return { label: "Pronto / alta aderência", cls: "hi" };
  if (total >= CRITERIA.eligibilityThreshold) return { label: "Em desenvolvimento / média", cls: "mid" };
  if (total >= 40) return { label: "Aderência inicial", cls: "init" };
  return { label: "Baixa aderência", cls: "low" };
}
export function feederPoolFor(hierMap: Record<string, string>, people: Person[], chair: Chair): Person[] {
  const feederLevel = hierMap[chair.nivel];
  if (!feederLevel) return [];
  return people.filter((p) => p.nivel === feederLevel && p.diretoria === chair.diretoria);
}
// Sucessores mapeados: elegível (nível+diretoria) + interesse declarado (1ª ou 2ª) + score >= limiar
export function successorsFor(hierMap: Record<string, string>, succession: SuccessionMap, people: Person[], chair: Chair): Person[] {
  return feederPoolFor(hierMap, people, chair).filter((p) => {
    const sc = scoreForChair(succession, people, p.id, chair);
    return sc.which > 0 && sc.total >= CRITERIA.eligibilityThreshold;
  });
}
// Ainda não mapeados: elegível + interesse declarado, mas score abaixo do limiar (em desenvolvimento)
export function aindaNaoMapeadosFor(hierMap: Record<string, string>, succession: SuccessionMap, people: Person[], chair: Chair): Person[] {
  return feederPoolFor(hierMap, people, chair).filter((p) => {
    const sc = scoreForChair(succession, people, p.id, chair);
    return sc.which > 0 && sc.total < CRITERIA.eligibilityThreshold;
  });
}
// Outros interessados: declararam interesse nessa posição mas não estão no nível/diretoria elegível
export function outrosInteressadosFor(hierMap: Record<string, string>, succession: SuccessionMap, people: Person[], chair: Chair): Person[] {
  const targetCargo = normCargo(chair.cargo);
  const feederIds = new Set(feederPoolFor(hierMap, people, chair).map((p) => p.id));
  return people.filter((p) => !feederIds.has(p.id) && interestMatch(succession, p, targetCargo) > 0);
}
export function nineBoxSubLabel(s: SuccessionRecord): string {
  if (s.nineBox2025 && NB_MAP[s.nineBox2025]) return s.nineBox2025 + " · " + NB_MAP[s.nineBox2025].label + " (2025)";
  if (s.nineBox2024 && NB_MAP[s.nineBox2024]) return s.nineBox2024 + " · " + NB_MAP[s.nineBox2024].label + " (2024)";
  return "Não avaliado";
}
export function favSubLabel(s: SuccessionRecord, sc: ChairScore): string {
  if (!sc.favAplica) return s.lideraEquipe ? "Corte GPTW suprimido" : "Não lidera equipe";
  const parts: string[] = [];
  if (s.favorabilidade2025 !== "" && s.favorabilidade2025 != null) parts.push("2025: " + s.favorabilidade2025 + "%");
  if (s.favorabilidade2026 !== "" && s.favorabilidade2026 != null) parts.push("2026: " + s.favorabilidade2026 + "%");
  return parts.join(" · ") || "GPTW gestão imediata";
}
export function occupantLabel(chair: Chair): string | null {
  if (chair.vago) return null;
  if (chair.prefixLocalidade && chair.cidade) return `${chair.nome} · ${chair.cidade}`;
  return chair.nome;
}
