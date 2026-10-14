"use client";

import { useMemo } from "react";
import { useApp } from "@/lib/context";
import { LEVEL_GROUPS, LEVEL_LABELS } from "@/lib/data";
import { fmtDateTime } from "@/lib/format";
import { countChairBuckets, hasQuestionnaireData } from "@/lib/scoring";
import type { PageKey } from "@/lib/types";

interface CoverageRow {
  key: string;
  label: string;
  total: number;
  bucket2: number;
  bucket1: number;
  bucket0: number;
  indice: number;
  onClick?: () => void;
}

function MiniBar({ pct2, pct1, pct0 }: { pct2: number; pct1: number; pct0: number }) {
  return (
    <div className="mini-coverage-bar">
      {pct2 > 0 ? <span className="seg-hi" style={{ width: `${pct2}%` }}></span> : null}
      {pct1 > 0 ? <span className="seg-mid" style={{ width: `${pct1}%` }}></span> : null}
      {pct0 > 0 ? <span className="seg-low" style={{ width: `${pct0}%` }}></span> : null}
    </div>
  );
}

function IndiceBadge({ pct }: { pct: number }) {
  const cls = pct >= 70 ? "idx-hi" : pct >= 40 ? "idx-mid" : "idx-low";
  return <span className={`idx-badge ${cls}`}>{pct}%</span>;
}

function CoverageTable({ rows, nomeColuna }: { rows: CoverageRow[]; nomeColuna: string }) {
  return (
    <div className="table-wrap">
      <table className="elig">
        <thead>
          <tr>
            <th>{nomeColuna}</th>
            <th>Posições</th>
            <th>Cobertura</th>
            <th>Índice de cobertura</th>
            <th>2 ou mais</th>
            <th>1</th>
            <th>0</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const total = r.total || 1;
            const pct2 = Math.round((r.bucket2 / total) * 100);
            const pct1 = Math.round((r.bucket1 / total) * 100);
            const pct0 = 100 - pct2 - pct1;
            return (
              <tr key={r.key}>
                <td>
                  {r.onClick ? (
                    <button className="row-link" onClick={r.onClick}>
                      {r.label}
                    </button>
                  ) : (
                    r.label
                  )}
                </td>
                <td>{r.total}</td>
                <td>
                  <MiniBar pct2={pct2} pct1={pct1} pct0={pct0} />
                </td>
                <td>
                  <IndiceBadge pct={r.indice} />
                </td>
                <td>
                  {r.bucket2} ({pct2}%)
                </td>
                <td>
                  {r.bucket1} ({pct1}%)
                </td>
                <td>
                  {r.bucket0} ({pct0}%)
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function OverviewPage() {
  const { chairs, people, hierMap, succession, activePage, baseUpdatedAt, setActivePage } = useApp();

  const { pct2, pct1, pct0, bucket2, bucket1, bucket0 } = useMemo(() => {
    const { b2, b1, b0 } = countChairBuckets(hierMap, succession, people, chairs, chairs);
    const total = chairs.length || 1;
    const p2 = Math.round((b2 / total) * 100);
    const p1 = Math.round((b1 / total) * 100);
    const p0 = 100 - p2 - p1;
    return { pct2: p2, pct1: p1, pct0: p0, bucket2: b2, bucket1: b1, bucket0: b0 };
  }, [chairs, hierMap, succession, people]);

  const { respondentes, totalPeople, pctRespondido } = useMemo(() => {
    const respondentesCount = people.filter((p) => hasQuestionnaireData(succession, p.id)).length;
    const total = people.length;
    return { respondentes: respondentesCount, totalPeople: total, pctRespondido: total ? Math.round((respondentesCount / total) * 100) : 0 };
  }, [people, succession]);

  const porNivel = useMemo<CoverageRow[]>(() => {
    const pageKeys = Object.keys(LEVEL_GROUPS) as PageKey[];
    return pageKeys.map((key) => {
      const niveis = LEVEL_GROUPS[key];
      const list = chairs.filter((c) => niveis.includes(c.nivel));
      const { b2, b1, b0 } = countChairBuckets(hierMap, succession, people, chairs, list);
      const total = list.length || 1;
      const indice = Math.round(((b2 * 100 + b1 * 50) / total));
      return { key, label: LEVEL_LABELS[key], total: list.length, bucket2: b2, bucket1: b1, bucket0: b0, indice, onClick: () => setActivePage(key) };
    });
  }, [chairs, hierMap, succession, people, setActivePage]);

  const porCargo = useMemo<CoverageRow[]>(() => {
    const cargos = [...new Set(chairs.map((c) => c.cargo))].sort((a, b) => a.localeCompare(b, "pt-BR"));
    return cargos.map((cargo) => {
      const list = chairs.filter((c) => c.cargo === cargo);
      const { b2, b1, b0 } = countChairBuckets(hierMap, succession, people, chairs, list);
      const total = list.length || 1;
      const indice = Math.round(((b2 * 100 + b1 * 50) / total));
      return { key: cargo, label: cargo, total: list.length, bucket2: b2, bucket1: b1, bucket0: b0, indice };
    });
  }, [chairs, hierMap, succession, people]);

  const semQuestionario = respondentes === 0;

  return (
    <section className={`page${activePage === "overview" ? " active" : ""}`}>
      <div className="page-head">
        <div>
          <div className="eyebrow">Mapa sucessório</div>
          <h1>Visão geral</h1>
          <p>Cobertura sucessória de todas as posições, por nível e por cargo.</p>
        </div>
        <div className="freshness">
          <span>Atualização da base</span>
          <b>{baseUpdatedAt ? fmtDateTime(baseUpdatedAt) : ""}</b>
        </div>
      </div>

      <div className="kpis-5">
        <div className="kpi">
          <div className="kpi-label">Posições</div>
          <div className="kpi-value">{chairs.length}</div>
          <div className="kpi-sub">{people.length} pessoas na base</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Saudáveis</div>
          <div className="kpi-value v-hi">{bucket2}</div>
          <div className="kpi-sub">2 ou mais sucessores</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Em atenção</div>
          <div className="kpi-value v-mid">{bucket1}</div>
          <div className="kpi-sub">1 sucessor</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Críticas</div>
          <div className="kpi-value v-low">{bucket0}</div>
          <div className="kpi-sub">sem sucessor</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Questionário respondido</div>
          <div className="kpi-value">{pctRespondido}%</div>
          <div className="kpi-sub">
            {respondentes} de {totalPeople} pessoas
          </div>
        </div>
      </div>

      <div className="kpi coverage-kpi coverage-kpi-full">
        <div className="kpi-label">Cobertura sucessória · Todas as posições</div>
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
              Saudável · {bucket2} ({pct2}%)
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

      {semQuestionario ? (
        <div className="toggle-restrict">
          Nenhum questionário foi importado ainda. Sem interesse declarado não existe sucessor calculado, então todas
          as posições aparecem sem sucessor. Use <b>Baixar base para coleta</b>, preencha a aba <b>Base de dados</b> e
          carregue de volta.
        </div>
      ) : null}

      <h2 className="ov-subtitle">Cobertura por nível</h2>
      <CoverageTable rows={porNivel} nomeColuna="Nível" />
      <p className="ov-footnote">
        Índice de cobertura: cada posição saudável (2 ou mais interessados no total — sucessor mapeado, ainda não
        mapeado ou fora da hierarquia elegível) conta 100%, em atenção (exatamente 1 interessado) conta 50%, e crítica
        (nenhum interessado) conta 0%.
      </p>

      <h2 className="ov-subtitle">Cobertura por cargo</h2>
      <CoverageTable rows={porCargo} nomeColuna="Cargo" />
    </section>
  );
}
