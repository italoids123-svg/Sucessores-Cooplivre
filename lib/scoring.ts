import { isAgenciaCargo } from "./agency";
import { CRITERIA } from "./criteria";
import { mobilidadeAlcancaCidade } from "./geo";
import type { Chair, ChairScore, HierarquiaEntry, Person, SuccessionMap, SuccessionRecord } from "./types";

export const INT_MAP = Object.fromEntries(CRITERIA.interesse.scale.map((x) => [x.key, x]));
export const MOB_MAP = Object.fromEntries(CRITERIA.mobilidade.scale.map((x) => [x.key, x]));

// Casamento tolerante a variações de grafia dos quadrantes da matriz 9Box
// (a base de origem escreve o mesmo quadrante de formas diferentes, ex.:
// "Empregado sólido/ Responsável" e "Empregado Sólido / Responsável").
export function nbKey(s?: string | null): string {
  return (s || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
const NB_BY_KEY = Object.fromEntries(CRITERIA.nineBox.scale.map((x) => [nbKey(x.code), x]));
export function nbResolve(v?: string | null) {
  const k = nbKey(v);
  if (!k || k === "-") return null; // "-" e vazio = não avaliado
  return NB_BY_KEY[k] || null;
}

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

// Um nível pode ter mais de um nível elegível (ex.: Gerência recebe de Coordenação
// e de Especialista) — por isso o mapa agrupa em lista, na ordem em que aparecem
// na Hierarquia.
export function buildHierMap(hierarquia: HierarquiaEntry[]): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  hierarquia.forEach((h) => {
    (map[h.nivel] ||= []).push(h.elegivel);
  });
  return map;
}

// Favorabilidade do time: fonte é o time que a pessoa LIDERA (corte de gestão imediata, GPTW), ciclo único 2026.
function lookupFavorabilidade(value: unknown): number | null {
  const v = Number(value);
  if (value === "" || value === null || value === undefined || isNaN(v)) return null;
  if (v >= 85) return 10;
  if (v >= 76) return 7;
  if (v >= 68) return 4;
  return 1;
}
function scoreNineBox(s: SuccessionRecord): number {
  const r25 = nbResolve(s.nineBox2025);
  const r26 = nbResolve(s.nineBox2026);
  const p25 = r25 ? r25.points : null;
  const p26 = r26 ? r26.points : null;
  if (p25 !== null && p26 !== null) return p25 * CRITERIA.nineBox.weight2025 + p26 * CRITERIA.nineBox.weight2026;
  if (p26 !== null) return p26; // só um ciclo preenchido: vale 100%
  if (p25 !== null) return p25;
  return 0;
}
// Retorna null quando o critério NÃO SE APLICA (não lidera equipe, ou lidera mas o GPTW suprimiu o corte).
// null é diferente de 0: quem não se aplica disputa em 90 pontos aplicáveis, não leva nota zero.
function scoreFavorabilidade(s: SuccessionRecord): number | null {
  if (!s.lideraEquipe) return null; // não lidera: critério não se aplica
  return lookupFavorabilidade(s.favorabilidade2026); // null quando lidera mas o corte foi suprimido
}
function scoreMobilidade(s: SuccessionRecord): number {
  return s.mobilidade && MOB_MAP[s.mobilidade] ? MOB_MAP[s.mobilidade].points : 0;
}
function scorePersonBase(succession: SuccessionMap, personId: string) {
  const s = succession[personId] || {};
  return { nineBox: scoreNineBox(s), favorabilidade: scoreFavorabilidade(s), mobilidade: scoreMobilidade(s) };
}

// A cadeira bate com o texto quando a sequência de PALAVRAS do cargo aparece completa
// em algum trecho do texto (ex.: "Diretor Executivo CEO" cobre a cadeira "CEO") — não
// precisa ser uma transcrição exata. Comparação por palavra inteira, não por
// caractere: "Gerente de Relacionamento I" não deve casar dentro de "Gerente de
// Relacionamento II" só porque "I" é um substring de "II". Ignora um ponto final em
// cada palavra (pontuação de fim de frase na resposta, ex.: "Agente de
// Relacionamento.") — aplicado aos dois lados, então não afeta abreviações como
// "P.A." (o ponto do meio continua fazendo parte da palavra).
export function cargoMencionado(textoNorm: string, cargoNorm: string): boolean {
  if (!textoNorm || !cargoNorm) return false;
  const semPontoFinal = (p: string) => p.replace(/\.$/, "");
  const texto = textoNorm.split(" ").map(semPontoFinal);
  const cargo = cargoNorm.split(" ").map(semPontoFinal);
  for (let i = 0; i + cargo.length <= texto.length; i++) {
    if (cargo.every((palavra, j) => texto[i + j] === palavra)) return true;
  }
  return false;
}
// Cada cadeira pode ter variantes de texto adicionais que também contam como manifestação de
// interesse nela, indexadas pelo cargo (normalizado) da cadeira de destino: readequações de
// nomenclatura ainda não efetivadas (a cadeira continua com o cargo/nível atuais), sinônimos ou
// erros de digitação que o RH confirmou se referirem à mesma posição, ou uma cadeira que cobre
// mais de uma vaga quase idêntica (ex.: as duas Regionais de Gerente Executivo Comercial).
const CARGO_VARIANTES_EXTRA: Record<string, string[]> = {
  "gerente executivo comercial regional 1": ["gerente executivo comercial", "superintendente regional"],
  "gerente executivo comercial regional 2": ["gerente executivo comercial", "superintendente regional"],
  "gerente financeiro": ["coordenador financeiro"],
  "gerente de operacoes": ["especialista de operacoes"],
  "gerente de performance corporativa": ["coordenador de performance corporativa", "coordenador de bi"],
  "coordenador de tecnologia da informacao": ["gerente de t.i."],
  "diretor administrativo/financeiro": ["diretor administrativo", "diretor financeiro"],
  advogado: ["advogada"],
  "agente de relacionamento": ["assistente de gerente"],
  "especialista de produtos e servicos": ["assessor de investimento", "especialista de investimentos"],
  "especialista em supervisao e monitoramento": ["especialista/coordenador de auditoria interna"],
  "coordenador de comunicacao e marketing": ["gerente de marketing"],
  "gerente executivo de negocios": ["gerente executivo de agronegocios"],
  "coordenador de produtos e servicos": ["gerente dos produtos consignados, cambio etc."],
};
export function cargoVariantes(cargoNorm: string): string[] {
  const extra = CARGO_VARIANTES_EXTRA[cargoNorm];
  return extra ? [cargoNorm, ...extra] : [cargoNorm];
}
// retorna 1 se a Prioridade de interesse 1 bate com a cadeira, 2 se for a Prioridade 2, senão 0
export function interestMatch(succession: SuccessionMap, person: Person, targetCargoNorm: string): 0 | 1 | 2 {
  const s = succession[person.id] || {};
  if (!targetCargoNorm) return 0;
  const variantes = cargoVariantes(targetCargoNorm);
  const p1 = normCargo(s.prioridade1);
  const p2 = normCargo(s.prioridade2);
  if (variantes.some((v) => cargoMencionado(p1, v))) return 1;
  if (variantes.some((v) => cargoMencionado(p2, v))) return 2;
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
// Campos preenchidos pelo questionário de interesse — exclui Nine Box, Favorabilidade
// e "Lidera equipe", que vêm de uma fonte separada (avaliação de desempenho/GPTW) e
// podem existir sem a pessoa nunca ter respondido o questionário de interesse.
const QUESTIONNAIRE_FIELDS: (keyof SuccessionMap[string])[] = [
  "prioridade1",
  "horizonte1",
  "desenvolvimento1",
  "prioridade2",
  "horizonte2",
  "desenvolvimento2",
  "localidadeAtual",
  "mobilidade",
  "conversaDesenvolvimento",
  "continuidade",
  "possivelSucessorTexto",
];
export function hasQuestionnaireData(succession: SuccessionMap, personId: string): boolean {
  const s = succession[personId] || {};
  return QUESTIONNAIRE_FIELDS.some((k) => {
    const v = s[k];
    return v !== "" && v !== null && v !== undefined && v !== false;
  });
}
export function aderenciaBand(total: number): { label: string; cls: string } {
  if (total >= 80) return { label: "Pronto / alta aderência", cls: "hi" };
  if (total >= CRITERIA.eligibilityThreshold) return { label: "Em desenvolvimento / média", cls: "mid" };
  if (total >= 40) return { label: "Aderência inicial", cls: "init" };
  return { label: "Baixa aderência", cls: "low" };
}
// Localidade atual da pessoa para fins de mobilidade: a resposta explícita do
// questionário de interesse, ou — na ausência dela — a cidade da cadeira que ela
// ocupa hoje.
function localidadeAtualDe(succession: SuccessionMap, chairs: Chair[], person: Person): string | null {
  const explicita = (succession[person.id] || {}).localidadeAtual;
  if (explicita) return explicita;
  const chairAtual = chairs.find((c) => c.id === person.chairId);
  return chairAtual ? chairAtual.cidade : null;
}
// Gerente de Relacionamento (I, II, Digital) é uma trilha à parte dentro do nível
// Gerência — aberta a QUALQUER posição do mapa (ver feederPoolFor), então nunca conta
// como "Gerência" genérica para fins de elegibilidade normal por tier.
export function ehGerenteDeRelacionamento(cargo: string): boolean {
  return normCargo(cargo).startsWith("gerente de relacionamento");
}
// O campo "nivel" bruto dos dados é grosso demais para a régua de elegibilidade:
// Analista se divide em Jr/Pl/Sr pelo sufixo do cargo (sobe só um degrau por vez), e
// Gerente de Relacionamento vira seu próprio tier (ver acima). Para todo o resto, o
// tier é o próprio nível.
export function tierDeElegibilidade(nivel: string, cargo: string): string {
  if (nivel === "Analista") {
    const c = normCargo(cargo);
    if (/\bsr$/.test(c)) return "Analista Sr";
    if (/\bpl$/.test(c)) return "Analista Pl";
    if (/\bjr$/.test(c)) return "Analista Jr";
    return nivel;
  }
  if (nivel === "Gerência" && ehGerenteDeRelacionamento(cargo)) return "Gerente de Relacionamento";
  return nivel;
}
// Para certos cargos, o pool elegível inclui também um nível lateral (mesmo tier da
// própria cadeira), além do pool normal que a Hierarquia define vindo de baixo — ex.:
// Gerente de P.A. aceita qualquer Gerência (de outras agências ou de áreas
// administrativas) como candidato lateral, não só quem vem de Coordenação/Especialista.
// Chave: cargo da cadeira normalizado.
const FEEDER_NIVEL_EXTRA: Record<string, string[]> = {
  "gerente de p.a.": ["Gerência"],
};
export function feederPoolFor(hierMap: Record<string, string[]>, succession: SuccessionMap, people: Person[], chairs: Chair[], chair: Chair): Person[] {
  const chairTier = tierDeElegibilidade(chair.nivel, chair.cargo);
  const feederLevels = [...(hierMap[chairTier] || []), ...(FEEDER_NIVEL_EXTRA[normCargo(chair.cargo)] || [])];
  return people.filter((p) => {
    if (!mobilidadeAlcancaCidade(localidadeAtualDe(succession, chairs, p), chair.cidade, (succession[p.id] || {}).mobilidade)) return false;
    // Gerente de Relacionamento é aberto a qualquer posição do mapa, sem restrição de tier.
    if (ehGerenteDeRelacionamento(p.cargo)) return true;
    return feederLevels.length > 0 && feederLevels.includes(tierDeElegibilidade(p.nivel, p.cargo));
  });
}
// Ordena por aderência (score total para a cadeira), da maior para a menor.
function sortByScoreDesc(succession: SuccessionMap, people: Person[], chair: Chair, candidates: Person[]): Person[] {
  return [...candidates].sort(
    (a, b) => scoreForChair(succession, people, b.id, chair).total - scoreForChair(succession, people, a.id, chair).total
  );
}
// Sucessores mapeados: elegível por nível + interesse declarado (1ª ou 2ª) + score >= limiar
export function successorsFor(hierMap: Record<string, string[]>, succession: SuccessionMap, people: Person[], chairs: Chair[], chair: Chair): Person[] {
  const list = feederPoolFor(hierMap, succession, people, chairs, chair).filter((p) => {
    const sc = scoreForChair(succession, people, p.id, chair);
    return sc.which > 0 && sc.total >= CRITERIA.eligibilityThreshold;
  });
  return sortByScoreDesc(succession, people, chair, list);
}
// Ainda não mapeados: elegível + interesse declarado, mas score abaixo do limiar (em desenvolvimento)
export function aindaNaoMapeadosFor(hierMap: Record<string, string[]>, succession: SuccessionMap, people: Person[], chairs: Chair[], chair: Chair): Person[] {
  const list = feederPoolFor(hierMap, succession, people, chairs, chair).filter((p) => {
    const sc = scoreForChair(succession, people, p.id, chair);
    return sc.which > 0 && sc.total < CRITERIA.eligibilityThreshold;
  });
  return sortByScoreDesc(succession, people, chair, list);
}
// Outros interessados: declararam interesse nessa posição, mas não estão no nível elegível —
// mesmo que a mobilidade declarada não alcance a cidade da cadeira — a mobilidade segue
// contando pontos no score e aparecendo no card da pessoa, mas não esconde quem declarou
// uma posição real: sem isso, a pessoa some de qualquer grupo da cadeira E de "Outros
// interesses" (que só lista prioridade sem cadeira correspondente), ficando invisível em
// qualquer lugar do app mesmo tendo declarado interesse validamente.
export function outrosInteressadosFor(hierMap: Record<string, string[]>, succession: SuccessionMap, people: Person[], chairs: Chair[], chair: Chair): Person[] {
  const targetCargo = normCargo(chair.cargo);
  const feederIds = new Set(feederPoolFor(hierMap, succession, people, chairs, chair).map((p) => p.id));
  const list = people.filter((p) => !feederIds.has(p.id) && interestMatch(succession, p, targetCargo) > 0);
  return sortByScoreDesc(succession, people, chair, list);
}
// Prioridade declarada (1 ou 2) que não corresponde a NENHUMA cadeira do mapa — a
// pessoa quer uma posição que não existe (ou existe só sob outro nome/nível). Casa
// direto com o texto dessa prioridade específica (mesmas variantes de interestMatch,
// ex.: GE Comercial genérico) — não passa pelo interestMatch, que resolve qual
// prioridade "vence" quando as duas apontam para a mesma cadeira e daria falso
// negativo aqui quando prioridade1 e prioridade2 forem a mesma cadeira real.
export function prioridadeSemCadeira(succession: SuccessionMap, chairs: Chair[], personId: string, qual: 1 | 2): boolean {
  const s = succession[personId] || {};
  const raw = qual === 1 ? s.prioridade1 : s.prioridade2;
  if (!raw) return false;
  const textoNorm = normCargo(raw);
  if (/^nao tenho interesse/.test(textoNorm)) return false; // opção "sem segunda posição", não é uma posição declarada
  return !chairs.some((c) => cargoVariantes(normCargo(c.cargo)).some((v) => cargoMencionado(textoNorm, v)));
}
// Cadeira "virtual": uma posição declarada no questionário que não corresponde a
// nenhuma cadeira real do mapa (Outros interesses, Conselho). Usada só para calcular
// a pontuação/card da pessoa com scoreForChair/CandidateCard — sem ocupante, nível ou
// diretoria reais, então matchLider sempre dá 0 e a pessoa é sempre "fora da hierarquia".
export function cadeiraVirtual(cargo: string): Chair {
  return { id: `virtual:${cargo}`, nome: "", cargo, nivel: "", diretoria: "", cidade: "", tempoCasa: null, prefixLocalidade: false, vago: true };
}
// Classificação visual da cadeira: estável (2) = 1 ou mais sucessores de fato
// elegíveis (dentro da hierarquia E do corte de aderência); em atenção (1) = nenhum
// sucessor elegível, mas existe ao menos um interessado fora da hierarquia elegível
// cuja pontuação (mesma fórmula de score, calculada normalmente) já atinge o corte de
// aderência — a pessoa pontua bem, só não está no nível/mobilidade que a Hierarquia
// exige; crítica (0) = nenhum sucessor e nenhum interessado fora da hierarquia pontua
// o suficiente — "ainda não mapeados" (dentro da hierarquia, mas abaixo do corte)
// nunca tiram uma cadeira de crítica, só contam como detalhamento à parte.
export function chairStatusBucket(
  succession: SuccessionMap,
  people: Person[],
  chair: Chair,
  successors: Person[],
  outrosInteressados: Person[]
): 0 | 1 | 2 {
  if (successors.length >= 1) return 2;
  const temForaAcimaDoCorte = outrosInteressados.some(
    (p) => scoreForChair(succession, people, p.id, chair).total >= CRITERIA.eligibilityThreshold
  );
  return temForaAcimaDoCorte ? 1 : 0;
}
export function countChairBuckets(
  hierMap: Record<string, string[]>,
  succession: SuccessionMap,
  people: Person[],
  chairs: Chair[],
  list: Chair[]
): { b2: number; b1: number; b0: number } {
  let b2 = 0,
    b1 = 0,
    b0 = 0;
  list.forEach((c) => {
    const successors = successorsFor(hierMap, succession, people, chairs, c);
    const outros = outrosInteressadosFor(hierMap, succession, people, chairs, c);
    const bucket = chairStatusBucket(succession, people, c, successors, outros);
    if (bucket === 2) b2++;
    else if (bucket === 1) b1++;
    else b0++;
  });
  return { b2, b1, b0 };
}
export function favSubLabel(s: SuccessionRecord, sc: ChairScore): string {
  if (!sc.favAplica) return s.lideraEquipe ? "Corte GPTW suprimido" : "Não lidera equipe";
  if (s.favorabilidade2026 !== "" && s.favorabilidade2026 != null) return "GPTW 2026: " + s.favorabilidade2026 + "%";
  return "GPTW gestão imediata";
}
export function occupantLabel(chair: Chair): string | null {
  if (chair.vago) return null;
  if (chair.prefixLocalidade && chair.cidade) return `${chair.nome} · ${chair.cidade}`;
  return chair.nome;
}

export type GrupoUnidade = "uad" | "agencias";
export type CrossBucket = "dentro" | "abaixo" | "fora";
export interface CrossInterestRow {
  key: string;
  person: Person;
  chair: Chair;
  score: ChairScore;
  bucket: CrossBucket;
  grupoAtual: GrupoUnidade;
  grupoDestino: GrupoUnidade;
}
// Interesses cruzados entre UAD e Agências: pessoas cujo cargo atual está num grupo
// (UAD ou Agência, mesma regra de isAgenciaCargo usada nas páginas de unidade) mas
// que declararam interesse (Prioridade 1 ou 2) numa cadeira real do OUTRO grupo.
// Reaproveita successorsFor/aindaNaoMapeadosFor/outrosInteressadosFor — os mesmos
// buckets e regras de elegibilidade já usados em cada cadeira — percorrendo cadeira
// por cadeira (não o texto declarado direto) para lidar corretamente com mobilidade.
// Um mesmo cargo pode existir em dezenas de cidades (ex.: "Gerente de P.A."), e quem
// declarou o cargo sem citar uma cidade bate com todas elas igualmente — por isso o
// resultado é deduplicado por pessoa + cargo de destino, mantendo só a ocorrência mais
// favorável (melhor bucket e, dentro dele, maior pontuação) em vez de uma linha por cidade.
const BUCKET_RANK: Record<CrossBucket, number> = { dentro: 2, abaixo: 1, fora: 0 };
export function interessesCruzadosUadAgencia(
  hierMap: Record<string, string[]>,
  succession: SuccessionMap,
  people: Person[],
  chairs: Chair[]
): CrossInterestRow[] {
  const porPessoaECargo = new Map<string, CrossInterestRow>();
  const consider = (row: CrossInterestRow) => {
    const dedupeKey = `${row.person.id}:${normCargo(row.chair.cargo)}`;
    const atual = porPessoaECargo.get(dedupeKey);
    if (
      !atual ||
      BUCKET_RANK[row.bucket] > BUCKET_RANK[atual.bucket] ||
      (BUCKET_RANK[row.bucket] === BUCKET_RANK[atual.bucket] && row.score.total > atual.score.total)
    ) {
      porPessoaECargo.set(dedupeKey, row);
    }
  };
  chairs.forEach((chair) => {
    const grupoDestino: GrupoUnidade = isAgenciaCargo(chair.cargo) ? "agencias" : "uad";
    const add = (list: Person[], bucket: CrossBucket) => {
      list.forEach((p) => {
        const grupoAtual: GrupoUnidade = isAgenciaCargo(p.cargo) ? "agencias" : "uad";
        if (grupoAtual === grupoDestino) return;
        consider({
          key: `${p.id}:${chair.id}`,
          person: p,
          chair,
          score: scoreForChair(succession, people, p.id, chair),
          bucket,
          grupoAtual,
          grupoDestino,
        });
      });
    };
    add(successorsFor(hierMap, succession, people, chairs, chair), "dentro");
    add(aindaNaoMapeadosFor(hierMap, succession, people, chairs, chair), "abaixo");
    add(outrosInteressadosFor(hierMap, succession, people, chairs, chair), "fora");
  });
  return [...porPessoaECargo.values()].sort((a, b) => b.score.total - a.score.total);
}
