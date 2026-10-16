"use client";

import { useMemo, useState } from "react";
import ChairCard from "./ChairCard";
import { useApp } from "@/lib/context";
import { isAgenciaCargo } from "@/lib/agency";
import { fmtDateTime } from "@/lib/format";
import { countChairBuckets, hasQuestionnaireData } from "@/lib/scoring";
import type { NavPage } from "@/lib/types";

interface GroupMeta {
  pageKey: Extract<NavPage, "uad" | "agencias">;
  title: string;
  desc: string;
  searchPlaceholder: string;
}

const META: Record<"uad" | "agencias", GroupMeta> = {
  uad: {
    pageKey: "uad",
    title: "UAD",
    desc: "Posições de Unidade Administrativa — Diretoria, Gerência Executiva, Gerências e Coordenações administrativas, Especialistas e Analistas. Não inclui agências.",
    searchPlaceholder: "Buscar por nome, cargo ou nível…",
  },
  agencias: {
    pageKey: "agencias",
    title: "Agências",
    desc: "Posições de agência — Gerentes de P.A., Gerentes e Agentes de Relacionamento e Coordenadores Administrativos de P.A., nas unidades de atendimento ao cooperado.",
    searchPlaceholder: "Buscar por nome, cargo ou cidade…",
  },
};

export default function AgencyGroupPage({ group }: { group: "uad" | "agencias" }) {
  const { chairs, people, hierMap, succession, activePage, baseUpdatedAt } = useApp();
  const [search, setSearch] = useState("");
  const [nivelFilter, setNivelFilter] = useState("");
  const [cidadeFilter, setCidadeFilter] = useState("");

  const meta = META[group];

  const chairsInGroup = useMemo(
    () => chairs.filter((c) => isAgenciaCargo(c.cargo) === (group === "agencias")),
    [chairs, group]
  );

  const niveis = useMemo(() => [...new Set(chairsInGroup.map((c) => c.nivel))], [chairsInGroup]);
  const cidades = useMemo(() => [...new Set(chairsInGroup.map((c) => c.cidade))].sort((a, b) => a.localeCompare(b, "pt-BR")), [chairsInGroup]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return chairsInGroup.filter((c) => {
      if (nivelFilter && c.nivel !== nivelFilter) return false;
      if (cidadeFilter && c.cidade !== cidadeFilter) return false;
      if (q && !c.nome.toLowerCase().includes(q) && !c.cargo.toLowerCase().includes(q) && !c.cidade.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [chairsInGroup, nivelFilter, cidadeFilter, search]);

  const { pct2, pct1, pct0, bucket2, bucket1, bucket0 } = useMemo(() => {
    const { b2, b1, b0 } = countChairBuckets(hierMap, succession, people, chairs, chairsInGroup);
    const total = chairsInGroup.length || 1;
    const p2 = Math.round((b2 / total) * 100);
    const p1 = Math.round((b1 / total) * 100);
    const p0 = 100 - p2 - p1;
    return { pct2: p2, pct1: p1, pct0: p0, bucket2: b2, bucket1: b1, bucket0: b0 };
  }, [chairsInGroup, hierMap, succession, people, chairs]);

  const { pdiPct, respondentesCount, scopeCount } = useMemo(() => {
    const feederLevels = [...new Set(niveis.flatMap((l) => hierMap[l] || []))];
    const scopePeople = people.filter((p) => niveis.includes(p.nivel) || feederLevels.includes(p.nivel));
    const respondentes = scopePeople.filter((p) => hasQuestionnaireData(succession, p.id));
    const comPlanoAtivo = respondentes.filter((p) => (succession[p.id] || {}).conversaDesenvolvimento === "andamento");
    const pct = scopePeople.length ? Math.round((comPlanoAtivo.length / scopePeople.length) * 100) : 0;
    return { pdiPct: pct, respondentesCount: respondentes.length, scopeCount: scopePeople.length };
  }, [niveis, hierMap, people, succession]);

  return (
    <section className={`page${activePage === meta.pageKey ? " active" : ""}`}>
      <div className="page-head">
        <div>
          <div className="eyebrow">Mapa sucessório · Por unidade</div>
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
                {pct2 >= 15 ? `${pct2}% (${bucket2})` : ""}
              </span>
            ) : null}
            {pct1 > 0 ? (
              <span className="seg-mid" style={{ width: `${pct1}%` }}>
                {pct1 >= 15 ? `${pct1}% (${bucket1})` : ""}
              </span>
            ) : null}
            {pct0 > 0 ? (
              <span className="seg-low" style={{ width: `${pct0}%` }}>
                {pct0 >= 15 ? `${pct0}% (${bucket0})` : ""}
              </span>
            ) : null}
          </div>
          <div className="coverage-legend">
            <div className="cl-item">
              <i className="seg-hi"></i>
              <span>
                Estável · {bucket2} ({pct2}%)
              </span>
            </div>
            <div className="cl-item">
              <i className="seg-mid"></i>
              <span>
                Em atenção · {bucket1} ({pct1}%)
              </span>
            </div>
            <div className="cl-item">
              <i className="seg-low"></i>
              <span>
                Crítica · {bucket0} ({pct0}%)
              </span>
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
        <select value={nivelFilter} onChange={(ev) => setNivelFilter(ev.target.value)}>
          <option value="">Todos os níveis</option>
          {niveis.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        {group === "agencias" ? (
          <select value={cidadeFilter} onChange={(ev) => setCidadeFilter(ev.target.value)}>
            <option value="">Todas as cidades</option>
            {cidades.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        ) : null}
        <span className="count">
          {filtered.length} de {chairsInGroup.length} cadeiras
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
