// Classifica cadeiras entre "Agência" (postos de atendimento ao público — Gerente de
// P.A., Coordenador Administrativo de P.A., Gerente de Relacionamento) e "UAD"
// (Unidade Administrativa — Diretoria, Gerência Executiva, demais Gerências e
// Coordenações administrativas, Especialistas e Analistas). Não existe campo
// dedicado nos dados; classifica pelo padrão textual do cargo, mesma convenção já
// usada no filtro de sub-grupo da página de Gerência.
export function isAgenciaCargo(cargo: string): boolean {
  return cargo.includes("P.A.") || cargo.includes("Relacionamento");
}

export type ResultadoSeveridade = "critico" | "atencao";

// Severidade do resultado acumulado de cada agência (coluna %Acumulado — Realizado ÷
// Orçado — do relatório "Resultado_agencias"): abaixo de 10% do orçado = crítico
// (vermelho), de 10% até 50% do orçado = atenção (amarelo), acima de 50% não é
// sinalizado. Referência fixa, atualizada manualmente a cada novo relatório — não é
// lida de volta em nenhum upload da ferramenta.
//
// %Acumulado na fonte: Salto -113,6% · Cesário Lange -18,8% · Louveira -58,4% ·
// Elias Fausto -292,2% · Valinhos -65,9% · Itupeva -2153,4% · Pereiras -376,3%
// (críticas); Vinhedo 46,1% (atenção); demais cidades acima de 50%.
export const CIDADE_RESULTADO_SEVERIDADE: Record<string, ResultadoSeveridade> = {
  Salto: "critico",
  "Cesário Lange": "critico",
  Louveira: "critico",
  "Elias Fausto": "critico",
  Valinhos: "critico",
  Itupeva: "critico",
  Pereiras: "critico",
  Vinhedo: "atencao",
};
