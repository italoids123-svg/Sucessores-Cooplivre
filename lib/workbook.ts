import * as XLSX from "xlsx";
import { CONT_LABELS, CONV_LABELS, CRITERIA } from "./criteria";
import { INT_MAP, MOB_MAP, nbResolve, normCargo, normName } from "./scoring";
import type { Chair, Person, SuccessionMap, SuccessionRecord } from "./types";

const NB_REF_LINES = CRITERIA.nineBox.scale.map((x) => `${x.label} — ${x.sub} — ${x.points} pts`);
const INT_LABELS = CRITERIA.interesse.scale.map((x) => x.label);
const MOB_LABELS = CRITERIA.mobilidade.scale.map((x) => x.label);
const INT_LABEL_TO_KEY = Object.fromEntries(CRITERIA.interesse.scale.map((x) => [x.label.toLowerCase(), x.key]));
const MOB_LABEL_TO_KEY = Object.fromEntries(CRITERIA.mobilidade.scale.map((x) => [x.label.toLowerCase(), x.key]));
const CONV_LABEL_TO_KEY = Object.fromEntries(Object.entries(CONV_LABELS).map(([k, v]) => [v.toLowerCase(), k]));
const CONT_LABEL_TO_KEY = Object.fromEntries(Object.entries(CONT_LABELS).map(([k, v]) => [v.toLowerCase(), k]));

function cell(row: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== "") return String(row[k]);
  }
  return "";
}

const LEIAME_ROWS: (string[])[] = [
  ["Seção", "Orientação"],
  ["Fluxo de uso", "Baixe esta base, preencha ou edite linhas da aba Base de dados, e carregue o mesmo arquivo de volta no dashboard. O carregamento é um MERGE: só atualiza os dados de sucessão de quem aparece na planilha, e só acrescenta cadeiras cujo Cargo ainda não existe. Quem não aparece continua exatamente como estava — nada é apagado."],
  ["Cadeiras", "Cada linha vira uma posição no mapa. Se o Cargo já existe, a linha é ignorada — cadeiras existentes (ocupante, nível, diretoria) só mudam por pedido direto à consultoria. Se o Cargo é novo, uma cadeira é criada; preenchendo Nome, ela já entra com ocupante, senão entra como vaga. Nível precisa ser exatamente um dos já usados no mapa (C-Level, Diretoria, Gerência Executiva, Gerência, Coordenação ou Especialista) para aparecer na navegação."],
  ["Hierarquia", "Aba de referência/consulta — não é lida no carregamento. Para mudar a régua de elegibilidade, peça o ajuste na consultoria."],
  ["Base de dados", 'Cada linha é uma pessoa (ocupante de cadeira ou candidato de um nível de origem). Se o Nome completo já existir na base, os dados de sucessão dessa pessoa são atualizados. Se não existir, uma pessoa nova é criada automaticamente — não é preciso avisar antes nem "inventar" um ID; o ID do colaborador é opcional.'],
  ["Prioridade de interesse 1 / 2", 'Preencha com o Cargo exato de uma cadeira da aba Cadeiras — é assim que o dashboard casa candidato com posição. A Prioridade 2 é opcional (segunda posição de interesse). Copie o texto da aba "Valores aceitos" para evitar divergência de digitação.'],
  ["Horizonte da prioridade 1 / 2", "Use exatamente um destes textos: " + INT_LABELS.join(" / ") + ". Vale para a posição correspondente (1 ou 2)."],
  ["Desenvolvimento para a prioridade 1 / 2", "Resposta aberta — competências, conhecimentos ou experiências a fortalecer para aquela posição específica. Não gera pontos; alimenta o detalhamento da pessoa no mapa."],
  ["Nine Box 2025 / Nine Box 2026", "Use exatamente um dos quadrantes da matriz 9Box da Cooplivre (ver aba Valores aceitos). Em branco equivale a Não avaliado = 0 ponto. A nota final pondera 2025 em 37,5% e 2026 em 62,5%; se só um ciclo estiver preenchido, esse ciclo vale 100%."],
  ["Lidera equipe (Sim/Não)", "Indica se a pessoa tem equipe direta. Só quem lidera equipe é avaliado no critério Favorabilidade do time."],
  ["Favorabilidade do time 2026 (%)", "Percentual de 0 a 100 da favorabilidade do TIME QUE A PESSOA LIDERA, no corte de gestão imediata do relatório GPTW — ciclo único 2026, sem ponderação entre anos. Faixas: 85 ou mais = 10 pts / 76 a 84 = 7 pts / 68 a 75 = 4 pts / abaixo de 68 = 1 pt. Deixe EM BRANCO quando o GPTW suprimiu o corte (time com menos de 5 pessoas) — não invente nem estime valor."],
  ["Normalização da pontuação", "A soma bruta dos critérios não é o score final. O score é: pontos obtidos ÷ pontos aplicáveis × 100. Quem lidera equipe e tem favorabilidade preenchida disputa em 100 pontos aplicáveis. Quem não lidera equipe, ou lidera mas está sem favorabilidade, disputa em 90 pontos aplicáveis — não recebe zero no critério, ele simplesmente não se aplica. O corte de elegibilidade de " + CRITERIA.eligibilityThreshold + " é lido sobre esse percentual de aproveitamento."],
  ["Mobilidade", "Use exatamente um destes textos: " + MOB_LABELS.join(" / ") + "."],
  ["Conversa sobre desenvolvimento", "Use exatamente um destes textos: " + Object.values(CONV_LABELS).join(" / ") + "."],
  ["Continuidade da posição atual", "Use exatamente um destes textos: " + Object.values(CONT_LABELS).join(" / ") + "."],
  ["Possível sucessor da posição atual", "Resposta aberta — nome completo e cargo da pessoa indicada pelo ocupante atual como possível sucessor."],
  ["Match Indicação Líder", 'Não é preenchido diretamente. O dashboard calcula automaticamente quando o líder (ocupante da cadeira) indica nominalmente um liderado em "Possível sucessor da posição atual" e esse liderado declarou a mesma posição como Prioridade de interesse 1 ou 2 — só conta quando os dois responderam.'],
  ["Elegibilidade", "Para contar como sucessor no heatmap, a pessoa precisa estar no nível e na mesma diretoria elegíveis pela Hierarquia, ter indicado a posição em Prioridade de interesse 1 ou 2, e atingir " + CRITERIA.eligibilityThreshold + " ou mais no score normalizado."],
  ["Se nada mudar após carregar", 'Confirme que a aba se chama exatamente "Base de dados" e que os cabeçalhos da primeira linha não foram alterados. O aviso mostrado após o carregamento sempre diz quantas pessoas foram atualizadas e quantas são novas — se aparecer 0 em tudo, o arquivo não foi reconhecido como este modelo.'],
];

export function buildWorkbook(chairs: Chair[], people: Person[], hierarquia: { nivel: string; elegivel: string }[], succession: SuccessionMap): XLSX.WorkBook {
  const wbNew = XLSX.utils.book_new();
  const leiameWs = XLSX.utils.aoa_to_sheet(LEIAME_ROWS);
  leiameWs["!cols"] = [{ wch: 34 }, { wch: 95 }];
  XLSX.utils.book_append_sheet(wbNew, leiameWs, "Leia-me");

  const cadeirasRows = chairs.map((c) => ({ Nome: c.nome, Cargo: c.cargo, Nível: c.nivel, Diretoria: c.diretoria, Cidade: c.prefixLocalidade ? c.cidade || "" : "" }));
  const cadeirasWs = XLSX.utils.json_to_sheet(cadeirasRows);
  cadeirasWs["!cols"] = [{ wch: 30 }, { wch: 38 }, { wch: 18 }, { wch: 16 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wbNew, cadeirasWs, "Cadeiras");

  const baseRows = people.map((p) => {
    const s = succession[p.id] || {};
    return {
      "ID do colaborador": p.id,
      "Nome completo": p.nome,
      Nível: p.nivel,
      "Cargo atual": p.cargo,
      "Prioridade de interesse 1": s.prioridade1 || "",
      "Horizonte da prioridade 1": s.horizonte1 ? INT_MAP[s.horizonte1]?.label || "" : "",
      "Desenvolvimento para a prioridade 1": s.desenvolvimento1 || "",
      "Prioridade de interesse 2": s.prioridade2 || "",
      "Horizonte da prioridade 2": s.horizonte2 ? INT_MAP[s.horizonte2]?.label || "" : "",
      "Desenvolvimento para a prioridade 2": s.desenvolvimento2 || "",
      Mobilidade: s.mobilidade ? MOB_MAP[s.mobilidade]?.label || "" : "",
      "Conversa sobre desenvolvimento": s.conversaDesenvolvimento ? CONV_LABELS[s.conversaDesenvolvimento] || "" : "",
      "Continuidade da posição atual": s.continuidade ? CONT_LABELS[s.continuidade] || "" : "",
      "Possível sucessor da posição atual": s.possivelSucessorTexto || "",
      "Nine Box 2025": s.nineBox2025 || "",
      "Nine Box 2026": s.nineBox2026 || "",
      "Lidera equipe (Sim/Não)": s.lideraEquipe === true ? "Sim" : s.lideraEquipe === false ? "Não" : "",
      "Favorabilidade do time 2026 (%)": s.favorabilidade2026 === undefined ? "" : s.favorabilidade2026,
    };
  });
  const baseWs = XLSX.utils.json_to_sheet(baseRows);
  baseWs["!cols"] = [{ wch: 9 }, { wch: 28 }, { wch: 16 }, { wch: 32 }, { wch: 34 }, { wch: 18 }, { wch: 34 }, { wch: 34 }, { wch: 18 }, { wch: 34 }, { wch: 16 }, { wch: 26 }, { wch: 30 }, { wch: 32 }, { wch: 20 }, { wch: 20 }, { wch: 18 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wbNew, baseWs, "Base de dados");

  const hierRows = hierarquia.map((h) => ({ "Nível da posição": h.nivel, "Nível elegível": h.elegivel }));
  const hierWs = XLSX.utils.json_to_sheet(hierRows);
  hierWs["!cols"] = [{ wch: 20 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wbNew, hierWs, "Hierarquia");

  const refWs = XLSX.utils.aoa_to_sheet([
    ["Nine Box 2025 / Nine Box 2026 — quadrantes aceitos"], ...NB_REF_LINES.map((x) => [x]), [""],
    ["Horizonte da prioridade 1 / 2"], ...INT_LABELS.map((x) => [x]), [""],
    ["Mobilidade"], ...MOB_LABELS.map((x) => [x]), [""],
    ["Conversa sobre desenvolvimento"], ...Object.values(CONV_LABELS).map((x) => [x]), [""],
    ["Continuidade da posição atual"], ...Object.values(CONT_LABELS).map((x) => [x]), [""],
    ["Lidera equipe (Sim/Não)"], ["Sim"], ["Não"], [""],
    ["Favorabilidade do time 2026 (%) — faixas de pontuação (ciclo único, sem ponderação)"],
    ...CRITERIA.favorabilidade.scale.map((x) => [x.label + " → " + x.points + " pts"]),
    ["Em branco = não avaliado (corte GPTW suprimido). Não estimar valor."], [""],
    ["Cargos das cadeiras (copiar para Prioridade de interesse 1 ou 2)"], ...chairs.map((c) => [c.cargo]),
  ]);
  refWs["!cols"] = [{ wch: 60 }];
  XLSX.utils.book_append_sheet(wbNew, refWs, "Valores aceitos");
  return wbNew;
}

export function downloadWorkbook(chairs: Chair[], people: Person[], hierarquia: { nivel: string; elegivel: string }[], succession: SuccessionMap) {
  XLSX.writeFile(buildWorkbook(chairs, people, hierarquia, succession), "Cooplivre_Base_Mapa_Sucessorio.xlsx");
}

export interface ImportOutcome {
  chairs: Chair[];
  people: Person[];
  succession: SuccessionMap;
  noticeHtml: string;
}
export interface ImportError {
  error: string;
}

export async function parseUploadedWorkbook(file: File, chairsIn: Chair[], peopleIn: Person[], successionIn: SuccessionMap): Promise<ImportOutcome | ImportError> {
  const buf = await file.arrayBuffer();
  try {
    const data = new Uint8Array(buf);
    const wbIn = XLSX.read(data, { type: "array" });

    if (!wbIn.SheetNames.includes("Base de dados")) {
      return { error: 'Não encontrei a aba "Base de dados" neste arquivo. Confirme que é o modelo baixado deste dashboard — nada foi alterado.' };
    }

    const chairs = chairsIn.map((c) => ({ ...c }));
    const people = peopleIn.map((p) => ({ ...p }));
    const succession: SuccessionMap = { ...successionIn };

    // ---- Cadeiras: MERGE aditivo — só ACRESCENTA posições novas (cargo que ainda não existe). ----
    let cadeirasNovas = 0;
    if (wbIn.SheetNames.includes("Cadeiras")) {
      const cadeirasJson = XLSX.utils.sheet_to_json<Record<string, unknown>>(wbIn.Sheets["Cadeiras"], { defval: "" });
      const cargosExistentes = new Set(chairs.map((c) => normCargo(c.cargo)));
      let chairIdCounter = chairs.length + 1;
      const usedChairIds = new Set(chairs.map((c) => c.id));
      cadeirasJson.forEach((row) => {
        const cargo = cell(row, "Cargo").trim();
        const nivel = cell(row, "Nível", "Nivel").trim();
        if (!cargo || !nivel) return;
        if (cargosExistentes.has(normCargo(cargo))) return; // já existe, não mexe
        cargosExistentes.add(normCargo(cargo));
        let cid: string;
        do {
          cid = "c" + String(chairIdCounter).padStart(3, "0");
          chairIdCounter++;
        } while (usedChairIds.has(cid));
        usedChairIds.add(cid);
        const nome = cell(row, "Nome").trim();
        const newChair: Chair = {
          id: cid,
          nome,
          cargo,
          nivel,
          diretoria: cell(row, "Diretoria").trim(),
          cidade: cell(row, "Cidade").trim(),
          tempoCasa: null,
          prefixLocalidade: /p\.?a\.?\b/i.test(cargo),
          vago: !nome,
        };
        chairs.push(newChair);
        cadeirasNovas++;
        if (nome) {
          let pid: string;
          let pidCounter = people.length + 1 + cadeirasNovas;
          const usedPersonIds = new Set(people.map((p) => p.id));
          do {
            pid = "P" + String(pidCounter).padStart(3, "0");
            pidCounter++;
          } while (usedPersonIds.has(pid));
          people.push({ id: pid, nome, nivel, cargo, diretoria: newChair.diretoria, chairId: cid });
        }
      });
    }

    // Importação da Base de dados é um MERGE aditivo: só atualiza dados de sucessão de quem está na planilha.
    const baseJson = XLSX.utils.sheet_to_json<Record<string, unknown>>(wbIn.Sheets["Base de dados"], { defval: "" });
    const peopleByNome = Object.fromEntries(people.map((p) => [p.nome.trim().toLowerCase(), p]));
    const peopleById = Object.fromEntries(people.map((p) => [p.id, p]));
    const chairByNome = Object.fromEntries(chairs.filter((c) => c.nome).map((c) => [c.nome.trim().toLowerCase(), c]));
    const usedIds = new Set(people.map((p) => p.id));
    let autoIdCounter = people.length + 1;
    let atualizadas = 0,
      novasPessoas = 0,
      linhasIgnoradas = 0,
      conflitosId = 0;

    baseJson.forEach((row) => {
      const nome = cell(row, "Nome completo", "Nome").trim();
      if (!nome) {
        linhasIgnoradas++;
        return;
      }
      const idInformado = cell(row, "ID do colaborador", "ID").trim();

      const porNome = peopleByNome[nome.toLowerCase()];
      const porId = idInformado ? peopleById[idInformado] : null;
      if (porId && porNome && porId.id !== porNome.id) conflitosId++;
      let person: Person | null = porNome || (porId && !porNome && normName(porId.nome) === normName(nome) ? porId : null);
      if (!person && porId && !porNome) {
        conflitosId++;
        person = null;
      }
      if (!person) {
        let id = idInformado && !usedIds.has(idInformado) ? idInformado : null;
        if (!id) {
          do {
            id = "P" + String(autoIdCounter).padStart(3, "0");
            autoIdCounter++;
          } while (usedIds.has(id));
        }
        usedIds.add(id);
        const chair = chairByNome[nome.toLowerCase()];
        person = {
          id,
          nome,
          nivel: chair ? chair.nivel : cell(row, "Nível", "Nivel").trim(),
          cargo: chair ? chair.cargo : cell(row, "Cargo atual").trim(),
          diretoria: chair ? chair.diretoria : "",
          chairId: chair ? chair.id : null,
        };
        people.push(person);
        peopleByNome[nome.toLowerCase()] = person;
        peopleById[person.id] = person;
        novasPessoas++;
      } else {
        atualizadas++;
      }

      const hz1 = cell(row, "Horizonte da prioridade 1").trim().toLowerCase();
      const hz2 = cell(row, "Horizonte da prioridade 2").trim().toLowerCase();
      const mobTxt = cell(row, "Mobilidade").trim().toLowerCase();
      const convTxt = cell(row, "Conversa sobre desenvolvimento").trim().toLowerCase();
      const contTxt = cell(row, "Continuidade da posição atual").trim().toLowerCase();
      const nb25Raw = cell(row, "Nine Box 2025");
      const nb26Raw = cell(row, "Nine Box 2026");
      const r25 = nbResolve(nb25Raw);
      const r26 = nbResolve(nb26Raw);
      const record: SuccessionRecord = {
        prioridade1: cell(row, "Prioridade de interesse 1") || "",
        horizonte1: (INT_LABEL_TO_KEY[hz1] as SuccessionRecord["horizonte1"]) || "",
        desenvolvimento1: cell(row, "Desenvolvimento para a prioridade 1") || "",
        prioridade2: cell(row, "Prioridade de interesse 2") || "",
        horizonte2: (INT_LABEL_TO_KEY[hz2] as SuccessionRecord["horizonte2"]) || "",
        desenvolvimento2: cell(row, "Desenvolvimento para a prioridade 2") || "",
        mobilidade: (MOB_LABEL_TO_KEY[mobTxt] as SuccessionRecord["mobilidade"]) || "",
        conversaDesenvolvimento: (CONV_LABEL_TO_KEY[convTxt] as SuccessionRecord["conversaDesenvolvimento"]) || "",
        continuidade: (CONT_LABEL_TO_KEY[contTxt] as SuccessionRecord["continuidade"]) || "",
        possivelSucessorTexto: cell(row, "Possível sucessor da posição atual") || "",
        nineBox2025: r25 ? r25.code : "",
        nineBox2026: r26 ? r26.code : "",
        lideraEquipe: /^s/i.test(cell(row, "Lidera equipe (Sim/Não)", "Lidera equipe").trim()),
        favorabilidade2026: cell(row, "Favorabilidade do time 2026 (%)", "Favorabilidade do time 2026") || "",
      };
      succession[person.id] = record;
    });

    const noticeHtml = `Base carregada — ${
      cadeirasNovas ? `<b>${cadeirasNovas}</b> cadeira(s) nova(s) adicionada(s), ` : ""
    }<b>${atualizadas}</b> pessoa(s) atualizada(s), <b>${novasPessoas}</b> nova(s)${
      linhasIgnoradas ? `, <b>${linhasIgnoradas}</b> linha(s) sem Nome completo ignorada(s)` : ""
    }${
      conflitosId
        ? `. <b>Atenção:</b> ${conflitosId} linha(s) com ID que não corresponde ao Nome completo — o nome foi usado como referência e o ID informado, ignorado. Confira esses IDs na planilha`
        : ""
    }. Cadeiras já existentes e hierarquia não foram alteradas.`;

    return { chairs, people, succession, noticeHtml };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: 'Não foi possível ler o arquivo. Confirme se é .xlsx e se a aba "Base de dados" está presente. Detalhe técnico: ' + message };
  }
}
