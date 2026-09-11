"use client";

import { useMemo, useState } from "react";
import ChairCard from "./ChairCard";
import { useApp } from "@/lib/context";
import { fmtDateTime } from "@/lib/format";
import { LEVEL_GROUPS } from "@/lib/data";
import { hasAnyData, successorsFor } from "@/lib/scoring";
import type { PageKey } from "@/lib/types";

const PAGE_META: Record<PageKey, { title: string; desc: string; searchPlaceholder: string; showDiretoriaFilter?: boolean }> = {
  directors: {
    title: "Diretoria",
    desc: "C-Level (CEO) e Diretoria Executiva estatutária, conforme Regimento Interno.",
    searchPlaceholder: "Buscar por nome ou cargo…",
  },
  executive: {
    title: "Gerência Executiva",
    desc: "Um nível abaixo da Diretoria na régua de elegibilidade.",
    searchPlaceholder: "Buscar por nome, cargo ou diretoria…",
    showDiretoriaFilter: true,
  },
  management: {
    title: "Gerência",
    desc: "Gerências de agência e áreas administrativas — pool de elegibilidade para a Gerência Executiva.",
    searchPlaceholder: "Buscar por nome, cargo ou diretoria…",
    showDiretoriaFilter: true,
  },
  coordenacao: {
    title: "Coordenação",
    desc: "Posições de coordenação — pool de elegibilidade para a Gerência.",
    searchPlaceholder: "Buscar por nome, cargo ou diretoria…",
    showDiretoriaFilter: true,
  },
  especialista: {
    title: "Especialista",
    desc: "Posições de especialista — trilha técnica, sem régua de elegibilidade hierárquica definida.",
    searchPlaceholder: "Buscar por nome, cargo ou diretoria…",
    showDiretoriaFilter: true,
  },
  analista: {
    title: "Analista",
    desc: "Posições de analista — pool de elegibilidade para a Coordenação.",
    searchPlaceholder: "Buscar por nome, cargo ou diretoria…",
    showDiretoriaFilter: true,
  },
};

// Grupo de gerência inferido a partir do cargo — não existe campo dedicado nos
// dados, então classifica por padrão textual (mesma convenção usada nas
// planilhas de RH: "Gerente de P.A." = agência, "Gerente de Relacionamento" =
// carteira de clientes, o restante é gerência administrativa/UAD).
type GerenciaGrupo = "UAD" | "PA" | "Relacionamento";

function gerenciaGrupoOf(cargo: string): GerenciaGrupo {
  if (cargo.includes("P.A.")) return "PA";
  if (cargo.includes("Relacionamento")) return "Relacionamento";
  return "UAD";
}

const GERENCIA_GRUPO_LABEL: Record<GerenciaGrupo, string> = {
  UAD: "Gerentes UAD",
  PA: "Gerentes PA",
  Relacionamento: "Gerentes de Relacionamento",
};

// Senioridade inferida do sufixo do cargo (Jr/Pl/Sr), como já vem nas
// planilhas de RH para as posições de analista.
type Senioridade = "JR" | "PL" | "SR";

function senioridadeOf(cargo: string): Senioridade | null {
  if (/\bjr\.?$/i.test(cargo.trim())) return "JR";
  if (/\bpl\.?$/i.test(cargo.trim())) return "PL";
  if (/\bsr\.?$/i.test(cargo.trim())) return "SR";
  return null;
}

const SENIORIDADE_LABEL: Record<Senioridade, string> = {
  JR: "Júnior",
  PL: "Pleno",
  SR: "Sênior",
};

export default function LevelPage({ pageKey }: { pageKey: PageKey }) {
  const { chairs, people, hierMap, succession, activePage, baseUpdatedAt } = useApp();
  const [search, setSearch] = useState("");
  const [diretoriaFilter, setDiretoriaFilter] = useState("");
  const [grupoFilter, setGrupoFilter] = useState<GerenciaGrupo | "">("");
  const [senioridadeFilter, setSenioridadeFilter] = useState<Senioridade | "">("");

  const meta = PAGE_META[pageKey];
  const pageLevels = LEVEL_GROUPS[pageKey];

  const chairsInLevel = useMemo(() => chairs.filter((c) => pageLevels.includes(c.nivel)), [chairs, pageLevels]);

  const diretorias = useMemo(
    () => [...new Set(chairsInLevel.map((c) => c.diretoria))].sort(),
    [chairsInLevel]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return chairsInLevel.filter((c) => {
      if (diretoriaFilter && c.diretoria !== diretoriaFilter) return false;
      if (pageKey === "management" && grupoFilter && gerenciaGrupoOf(c.cargo) !== grupoFilter) return false;
      if (pageKey === "analista" && senioridadeFilter && senioridadeOf(c.cargo) !== senioridadeFilter) return false;
      if (q && !c.nome.toLowerCase().includes(q) && !c.cargo.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [chairsInLevel, diretoriaFilter, search, pageKey, grupoFilter, senioridadeFilter]);

  const { pct2, pct1, pct0, bucket2, bucket1, bucket0 } = useMemo(() => {
    let b2 = 0,
      b1 = 0,
      b0 = 0;
    chairsInLevel.forEach((c) => {
      const n = successorsFor(hierMap, succession, people, c).length;
      if (n >= 2) b2++;
      else if (n === 1) b1++;
      else b0++;
    });
    const total = chairsInLevel.length || 1;
    const p2 = Math.round((b2 / total) * 100);
    const p1 = Math.round((b1 / total) * 100);
    const p0 = 100 - p2 - p1;
    return { pct2: p2, pct1: p1, pct0: p0, bucket2: b2, bucket1: b1, bucket0: b0 };
  }, [chairsInLevel, hierMap, succession, people]);

  const { pdiPct, respondentesCount, scopeCount } = useMemo(() => {
    const feederLevels = [...new Set(pageLevels.map((l) => hierMap[l]).filter(Boolean))];
    const scopePeople = people.filter((p) => pageLevels.includes(p.nivel) || feederLevels.includes(p.nivel));
    const respondentes = scopePeople.filter((p) => hasAnyData(succession, p.id));
    const comPlanoAtivo = respondentes.filter((p) => (succession[p.id] || {}).conversaDesenvolvimento === "andamento");
    const pct = scopePeople.length ? Math.round((comPlanoAtivo.length / scopePeople.length) * 100) : 0;
    return { pdiPct: pct, respondentesCount: respondentes.length, scopeCount: scopePeople.length };
  }, [pageLevels, hierMap, people, succession]);

  return (
    <section className={`page${activePage === pageKey ? " active" : ""}`}>
      <div className="page-head">
        <div>
          <div className="eyebrow">Mapa sucessório</div>
          <h1>{meta.title}</h1>
          <p>{meta.desc}</p>
        </div>
        <div className="freshness">
          <span>Atualização da base</span>
          <b>{baseUpdatedAt ? fmtDateTime(baseUpdatedAt) : ""}</b>
        </div>
      </div>

      <div className="kpis">
        <div className="kpi">
          <div className="kpi-label">Posições</div>
          <div className="kpi-value">{filtered.length}</div>
          <div className="kpi-sub">posições exibidas</div>
        </div>
        <div className="kpi coverage-kpi">
          <div className="kpi-label">Cobertura sucessória</div>
          <div className="coverage-bar">
            {pct2 > 0 ? (
              <span className="seg-hi" style={{ width: `${pct2}%` }}>
                {pct2}% ({bucket2})
              </span>
            ) : null}
            {pct1 > 0 ? (
              <span className="seg-mid" style={{ width: `${pct1}%` }}>
                {pct1}% ({bucket1})
              </span>
            ) : null}
            {pct0 > 0 ? (
              <span className="seg-low" style={{ width: `${pct0}%` }}>
                {pct0}% ({bucket0})
              </span>
            ) : null}
          </div>
          <div className="coverage-legend">
            <div className="cl-item">
              <i className="seg-hi"></i>
              <span>2 ou mais sucessores</span>
            </div>
            <div className="cl-item">
              <i className="seg-mid"></i>
              <span>1 sucessor</span>
            </div>
            <div className="cl-item">
              <i className="seg-low"></i>
              <span>sem sucessor</span>
            </div>
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Plano de desenvolvimento ativo</div>
          <div className="kpi-value">{pdiPct}%</div>
          <div className="kpi-sub">
            {respondentesCount} de {scopeCount} respondentes
          </div>
        </div>
      </div>

      <div className="toolbar">
        <input
          type="search"
          placeholder={meta.searchPlaceholder}
          value={search}
          onChange={(ev) => setSearch(ev.target.value)}
        />
        {meta.showDiretoriaFilter ? (
          <select value={diretoriaFilter} onChange={(ev) => setDiretoriaFilter(ev.target.value)}>
            <option value="">Todas as diretorias</option>
            {diretorias.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        ) : null}
        {pageKey === "management" ? (
          <select value={grupoFilter} onChange={(ev) => setGrupoFilter(ev.target.value as GerenciaGrupo | "")}>
            <option value="">Todos os grupos</option>
            {(Object.keys(GERENCIA_GRUPO_LABEL) as GerenciaGrupo[]).map((g) => (
              <option key={g} value={g}>
                {GERENCIA_GRUPO_LABEL[g]}
              </option>
            ))}
          </select>
        ) : null}
        {pageKey === "analista" ? (
          <select value={senioridadeFilter} onChange={(ev) => setSenioridadeFilter(ev.target.value as Senioridade | "")}>
            <option value="">Todas as senioridades</option>
            {(Object.keys(SENIORIDADE_LABEL) as Senioridade[]).map((s) => (
              <option key={s} value={s}>
                {SENIORIDADE_LABEL[s]}
              </option>
            ))}
          </select>
        ) : null}
        <span className="count">
          {filtered.length} de {chairsInLevel.length} cadeiras
        </span>
      </div>

      <div className="chair-grid">
        {filtered.length ? (
          filtered.map((c) => <ChairCard key={c.id} chair={c} />)
        ) : (
          <p style={{ color: "var(--muted)", fontSize: "13px" }}>Nenhuma cadeira encontrada com esse filtro.</p>
        )}
      </div>
    </section>
  );
}
