// Classifica cadeiras entre "Agência" (postos de atendimento ao público — Gerente de
// P.A., Coordenador Administrativo de P.A., Gerente de Relacionamento) e "UAD"
// (Unidade Administrativa — Diretoria, Gerência Executiva, demais Gerências e
// Coordenações administrativas, Especialistas e Analistas). Não existe campo
// dedicado nos dados; classifica pelo padrão textual do cargo, mesma convenção já
// usada no filtro de sub-grupo da página de Gerência.
export function isAgenciaCargo(cargo: string): boolean {
  return cargo.includes("P.A.") || cargo.includes("Relacionamento");
}

// Cidades cujo resultado acumulado (Realizado − Orçado) ficou negativo no relatório
// de resultado das agências (planilha "Resultado_agencias", coluna Delta Acumulado).
// Referência fixa, atualizada manualmente a cada novo relatório — não é lida de
// volta em nenhum upload da ferramenta.
export const CIDADES_RESULTADO_NEGATIVO = [
  "Porto Feliz",
  "Salto",
  "Boituva",
  "Jumirim",
  "Cesário Lange",
  "Louveira",
  "Indaiatuba",
  "Elias Fausto",
  "Valinhos",
  "Itupeva",
  "Vinhedo",
  "Porangaba",
  "Pereiras",
  "Rafard",
];
