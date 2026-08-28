export interface NineBoxScaleItem {
  code: string;
  label: string;
  points: number;
}
export interface FavorabilidadeScaleItem {
  min: number;
  label: string;
  points: number;
}
export interface KeyedScaleItem {
  key: string;
  label: string;
  points: number;
}

export const CRITERIA = {
  nineBox: {
    weight: 40,
    label: "Nine Box (média ponderada 2024–2025)",
    weight2024: 0.375,
    weight2025: 0.625,
    scale: [
      { code: "A1", label: "Estrela", points: 40 },
      { code: "B1", label: "Futura Estrela", points: 35 },
      { code: "C1", label: "Diamante Bruto", points: 30 },
      { code: "A2", label: "Colaborador de Alto Impacto", points: 25 },
      { code: "B2", label: "Colaborador Chave", points: 20 },
      { code: "C2", label: "Dilema", points: 15 },
      { code: "A3", label: "Colaborador Especialista", points: 10 },
      { code: "B3", label: "Colaborador Efetivo", points: 5 },
      { code: "C3", label: "Baixo Desempenho", points: 0 },
      { code: "N/A", label: "Não avaliado", points: 0 },
    ] as NineBoxScaleItem[],
  },
  matchLider: { weight: 20, label: "Match Indicação Líder" },
  favorabilidade: {
    weight: 10,
    label: "Favorabilidade do time",
    weight2025: 0.375,
    weight2026: 0.625,
    scale: [
      { min: 85, label: "85 ou mais", points: 10 },
      { min: 76, label: "76 a 84", points: 7 },
      { min: 68, label: "68 a 75", points: 4 },
      { min: 0, label: "Abaixo de 68", points: 1 },
    ] as FavorabilidadeScaleItem[],
  },
  interesse: {
    weight: 10,
    label: "Interesse Declarado",
    scale: [
      { key: "imediato", label: "Imediato", points: 10 },
      { key: "ate3", label: "Até 3 anos", points: 6 },
      { key: "3a5", label: "Mais de 3 até 5 anos", points: 3 },
      { key: "mais5", label: "Mais de 5 anos", points: 1.5 },
    ] as KeyedScaleItem[],
  },
  mobilidade: {
    weight: 20,
    label: "Mobilidade",
    scale: [
      { key: "local", label: "Local atual", points: 0 },
      { key: "sede", label: "Sede", points: 8 },
      { key: "raio40", label: "Raio de 40 km", points: 14 },
      { key: "qualquer", label: "Qualquer unidade", points: 20 },
    ] as KeyedScaleItem[],
  },
  eligibilityThreshold: 60,
};

export const QSTEPS = [
  { n: "01", title: "Levantamento dos indicadores", desc: "Nine Box e favorabilidade vêm das bases organizacionais. Interesse e mobilidade vêm do questionário.", tag: "Score por pessoa e posição" },
  { n: "02", title: "Manifestação de interesse", desc: "Cada pessoa indica até duas posições e declara horizonte, mobilidade e lacunas percebidas.", tag: "Interessados por posição" },
  { n: "03", title: "Consolidação e elegibilidade", desc: `O dashboard cruza as fontes e aplica nível elegível e corte mínimo de ${CRITERIA.eligibilityThreshold} pontos.`, tag: "Cobertura real das posições" },
  { n: "04", title: "Revisão e desenvolvimento", desc: "As evidências são discutidas e orientam a validação das pessoas e a agenda de desenvolvimento.", tag: "Decisão colegiada e PDIs" },
];

export type Natureza = "Identificação" | "Qualitativo" | "Pontuação" | "Condicional";

export const NAT_CLASS: Record<Natureza, string> = {
  Identificação: "blue",
  Qualitativo: "blue",
  Pontuação: "green",
  Condicional: "amber",
};
export const NAT_BADGE: Record<Natureza, string> = {
  Identificação: "nat-identificacao",
  Qualitativo: "nat-qualitativo",
  Pontuação: "nat-pontuacao",
  Condicional: "nat-condicional",
};

export interface Question {
  n: number;
  title: string;
  desc: string;
  natureza: Natureza;
  pontos: boolean;
  resposta: string;
}

export const QUESTIONS: Question[] = [
  { n: 1, title: "Nome completo", desc: "Informe seu nome completo exatamente como consta no cadastro corporativo.", natureza: "Identificação", pontos: false, resposta: "Resposta curta" },
  { n: 2, title: "Cargo atual", desc: "Informe seu cargo atual. A base de colaboradores será a referência final para nível e estrutura.", natureza: "Identificação", pontos: false, resposta: "Resposta curta" },
  { n: 3, title: "Prioridade de interesse 1", desc: "Selecione sua principal posição de interesse.", natureza: "Qualitativo", pontos: false, resposta: "Lista das posições cadastradas" },
  { n: 4, title: "Horizonte da prioridade 1", desc: "Em quanto tempo acredita que estará pronto(a) para assumir a posição, considerando suas competências atuais e lacunas de desenvolvimento?", natureza: "Pontuação", pontos: true, resposta: "Imediato (10) · Até 3 anos (6) · Mais de 3 até 5 anos (3) · Mais de 5 anos (1,5)" },
  { n: 5, title: "Desenvolvimento para a prioridade 1", desc: "Indique até três competências, conhecimentos ou experiências que considera necessário fortalecer ou adquirir. Explique brevemente a relevância.", natureza: "Qualitativo", pontos: false, resposta: "Resposta aberta" },
  { n: 6, title: "Prioridade de interesse 2", desc: "Selecione, opcionalmente, uma segunda posição de interesse.", natureza: "Condicional", pontos: false, resposta: "Lista das posições cadastradas" },
  { n: 7, title: "Horizonte da prioridade 2", desc: "Em quanto tempo acredita que estará pronto(a) para assumir a segunda posição?", natureza: "Pontuação", pontos: true, resposta: "Imediato (10) · Até 3 anos (6) · Mais de 3 até 5 anos (3) · Mais de 5 anos (1,5)" },
  { n: 8, title: "Desenvolvimento para a prioridade 2", desc: "Indique até três competências, conhecimentos ou experiências que considera necessário fortalecer ou adquirir para a segunda posição.", natureza: "Condicional", pontos: false, resposta: "Resposta aberta" },
  { n: 9, title: "Mobilidade", desc: "Qual abrangência geográfica você aceita considerar para uma movimentação?", natureza: "Pontuação", pontos: true, resposta: "Local atual (0) · Sede (8) · Raio de 40 km (14) · Qualquer unidade (20)" },
  { n: 10, title: "Conversa sobre desenvolvimento", desc: "Você já teve uma conversa explícita com sua liderança sobre seu desenvolvimento ou possível preparação para alguma das posições?", natureza: "Qualitativo", pontos: false, resposta: "Sim, com ações em andamento · Sim, sem ações formalizadas · Não houve essa conversa" },
  { n: 11, title: "Continuidade da posição atual", desc: "Existe hoje algum colaborador que poderia assegurar a continuidade das principais responsabilidades de sua posição em caso de ausência ou movimentação?", natureza: "Qualitativo", pontos: false, resposta: "Sim, imediatamente · Sim, com desenvolvimento ou suporte · Não identifico alguém · Não tenho elementos para avaliar" },
  { n: 12, title: "Possível sucessor da posição atual", desc: "Caso tenha respondido sim, informe o nome completo e o cargo atual da pessoa identificada.", natureza: "Condicional", pontos: false, resposta: "Resposta curta" },
];

export const CONV_LABELS: Record<string, string> = {
  andamento: "Sim, com ações em andamento",
  sem_formalizar: "Sim, sem ações formalizadas",
  nao: "Não houve essa conversa",
};
export const CONV_BADGE: Record<string, { label: string; cls: string }> = {
  andamento: { label: "Desenvolvimento: plano em andamento", cls: "b-dev" },
  sem_formalizar: { label: "Desenvolvimento: sem ações formalizadas", cls: "b-dev-mid" },
  nao: { label: "Desenvolvimento: conversa não realizada", cls: "b-dev-low" },
};
export const CONT_LABELS: Record<string, string> = {
  imediata: "Sim, imediatamente",
  com_suporte: "Sim, com desenvolvimento ou suporte",
  nao_identifico: "Não identifico alguém",
  sem_elementos: "Não tenho elementos para avaliar",
};
export const CONT_BADGE: Record<string, { label: string; cls: string }> = {
  imediata: { label: "Com sucessor indicado e pronto", cls: "b-dev" },
  com_suporte: { label: "Sucessor em desenvolvimento", cls: "b-dev-mid" },
  nao_identifico: { label: "Sem sucessor identificado", cls: "b-dev-low" },
};
