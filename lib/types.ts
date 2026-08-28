export type Nivel = "C-Level" | "Diretoria" | "Gerência Executiva" | "Gerência" | "Coordenação" | "Especialista";

export type PageKey = "directors" | "executive" | "management" | "coordenacao";
export type NavPage = PageKey | "eligibility" | "criteria" | "questionnaire";

export interface Chair {
  id: string;
  nome: string;
  cargo: string;
  nivel: string;
  diretoria: string;
  cidade: string;
  tempoCasa: number | null;
  prefixLocalidade: boolean;
  vago?: boolean;
}

export interface Person {
  id: string;
  nome: string;
  nivel: string;
  cargo: string;
  diretoria: string;
  chairId: string | null;
}

export interface HierarquiaEntry {
  nivel: string;
  elegivel: string;
}

export type Horizonte = "imediato" | "ate3" | "3a5" | "mais5" | "";
export type Mobilidade = "local" | "sede" | "raio40" | "qualquer" | "";
export type ConversaDesenvolvimento = "andamento" | "sem_formalizar" | "nao" | "";
export type Continuidade = "imediata" | "com_suporte" | "nao_identifico" | "sem_elementos" | "";
// Nome do quadrante da matriz 9Box (ex.: "Estrela", "Alto Potencial"), "" quando não avaliado.
export type NineBoxCode = string;

export interface SuccessionRecord {
  prioridade1?: string;
  horizonte1?: Horizonte;
  desenvolvimento1?: string;
  prioridade2?: string;
  horizonte2?: Horizonte;
  desenvolvimento2?: string;
  mobilidade?: Mobilidade;
  conversaDesenvolvimento?: ConversaDesenvolvimento;
  continuidade?: Continuidade;
  possivelSucessorTexto?: string;
  nineBox2025?: NineBoxCode;
  nineBox2026?: NineBoxCode;
  lideraEquipe?: boolean;
  favorabilidade2026?: number | string;
}

export type SuccessionMap = Record<string, SuccessionRecord>;

export interface ChairScore {
  nineBox: number;
  matchLider: number;
  favorabilidade: number | null;
  interesse: number;
  mobilidade: number;
  bruto: number;
  pontosAplicaveis: number;
  favAplica: boolean;
  total: number;
  which: 0 | 1 | 2;
}
