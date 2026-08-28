export type Nivel = "C-Level" | "Diretoria" | "Gerência Executiva" | "Gerência" | "Coordenação";

export type PageKey = "directors" | "executive" | "management";
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
export type NineBoxCode = "A1" | "B1" | "C1" | "A2" | "B2" | "C2" | "A3" | "B3" | "C3" | "N/A" | "";

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
  nineBox2024?: NineBoxCode;
  nineBox2025?: NineBoxCode;
  lideraEquipe?: boolean;
  favorabilidade2025?: number | string;
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
