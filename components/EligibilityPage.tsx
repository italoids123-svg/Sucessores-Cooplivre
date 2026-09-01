"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/lib/context";
import { CRITERIA } from "@/lib/criteria";
import {
  aindaNaoMapeadosFor,
  occupantLabel,
  outrosInteressadosFor,
  scoreForChair,
  successorsFor,
} from "@/lib/scoring";

const NIVEIS = ["C-Level", "Diretoria", "Gerência Executiva", "Gerência", "Coordenação"];

export default function EligibilityPage() {
  const { chairs, people, hierarquia, hierMap, succession, activePage, showNominal, setShowNominal } = useApp();
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("");

  const rows = useMemo(() => {
    const q = search.toLowerCase();
    return chairs.filter(
      (c) =>
        (!levelFilter || c.nivel === levelFilter) &&
        (!q || c.nome.toLowerCase().includes(q) || c.cargo.toLowerCase().includes(q))
    );
  }, [chairs, levelFilter, search]);

  const threshold = CRITERIA.eligibilityThreshold;

  return (
    <section className={`page${activePage === "eligibility" ? " active" : ""}`}>
      <div className="page-head">
        <div>
          <div className="eyebrow">Regras do mapa</div>
          <h1>Elegibilidade e Aderência</h1>
          <p>O heatmap combina manifestação de interesse, elegibilidade hierárquica e pontuação mínima de aderência.</p>
        </div>
      </div>

      <div className="rules-grid">
        <div className="card rules-card">
          <h3>Como uma pessoa entra no heatmap</h3>
          <p className="rules-sub">As três condições são avaliadas em sequência para cada pessoa e posição.</p>
          <div className="rules-steps">
            <div className="rules-step">
              <span className="rs-n">1</span>
              <div>
                <b>Interesse declarado</b>
                <p>A pessoa indicou a posição como primeira ou segunda prioridade.</p>
              </div>
            </div>
            <div className="rules-step">
              <span className="rs-n">2</span>
              <div>
                <b>Elegibilidade hierárquica</b>
                <p>O nível (e a diretoria) atual está relacionado à posição na aba Hierarquia.</p>
              </div>
            </div>
            <div className="rules-step">
              <span className="rs-n">3</span>
              <div>
                <b>Aderência mínima</b>
                <p>O score total é igual ou superior a {threshold} pontos.</p>
              </div>
            </div>
          </div>
        </div>
        <div className="card rules-card">
          <h3>Régua de aderência</h3>
          <p className="rules-sub">A pontuação organiza a leitura e não substitui a validação colegiada sobre cada posição.</p>
          <div className="corte-callout">
            <b>{threshold}</b>
            <div>
              <span>Corte para o heatmap</span>
              <p>Pontuação mínima após atender à hierarquia.</p>
            </div>
          </div>
          <table className="regua-table">
            <thead>
              <tr>
                <th>Score</th>
                <th>Classificação</th>
                <th>Heatmap</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>80 ou mais</td>
                <td>Pronto / alta aderência</td>
                <td className="regua-conta">Conta</td>
              </tr>
              <tr>
                <td>
                  {threshold} a 79,9
                </td>
                <td>Em desenvolvimento / média</td>
                <td className="regua-conta">Conta</td>
              </tr>
              <tr>
                <td>40 a {threshold - 0.1}</td>
                <td>Aderência inicial</td>
                <td className="regua-nao-conta">Não conta</td>
              </tr>
              <tr>
                <td>Abaixo de 40</td>
                <td>Baixa aderência</td>
                <td className="regua-nao-conta">Não conta</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="toggle-restrict">
        <label>
          <input type="checkbox" checked={showNominal} onChange={(ev) => setShowNominal(ev.target.checked)} />
          Mostrar indicação nominal de sucessor (uso restrito — Diretoria/RH)
        </label>
      </div>

      <div className="toolbar">
        <input
          type="search"
          placeholder="Buscar cadeira ou ocupante…"
          value={search}
          onChange={(ev) => setSearch(ev.target.value)}
        />
        <select value={levelFilter} onChange={(ev) => setLevelFilter(ev.target.value)}>
          <option value="">Todos os níveis</option>
          {NIVEIS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <span className="count">{rows.length} cadeiras</span>
      </div>

      <div className="table-wrap">
        <table className="elig">
          <thead>
            <tr>
              <th>Cadeira</th>
              <th>Nível</th>
              <th>Sucessores mapeados</th>
              <th>Ainda não mapeados</th>
              <th>Outros interessados</th>
              <th>Base aplicável</th>
              <th>Sucessor indicado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const succ = successorsFor(hierMap, succession, people, c);
              const naoMap = aindaNaoMapeadosFor(hierMap, succession, people, c);
              const outros = outrosInteressadosFor(hierMap, succession, people, c);
              const avaliados = [...succ, ...naoMap];
              const em100 = avaliados.filter((p) => scoreForChair(succession, people, p.id, c).favAplica).length;
              const em90 = avaliados.length - em100;

              let baseCell: React.ReactNode;
              if (!avaliados.length) baseCell = <span className="nominal-locked">n/a</span>;
              else if (em90 === 0) baseCell = <span className="base-tag">100 pts</span>;
              else if (em100 === 0) baseCell = <span className="base-tag base-90">90 pts</span>;
              else
                baseCell = (
                  <>
                    <span className="base-tag">{em100}× 100</span> <span className="base-tag base-90">{em90}× 90</span>
                  </>
                );

              let nominal: React.ReactNode;
              if (!showNominal) nominal = <span className="nominal-locked">restrito</span>;
              else if (succ.length) nominal = <b>{succ.map((p) => p.nome).join(", ")}</b>;
              else nominal = <span style={{ color: "var(--muted)" }}>sem sucessor mapeado</span>;

              return (
                <tr key={c.id}>
                  <td>
                    <b>{c.cargo}</b>
                    <br />
                    <span style={{ color: "var(--muted)", fontSize: "11px" }}>
                      {c.vago ? "Posição vaga" : occupantLabel(c)}
                    </span>
                  </td>
                  <td>{c.nivel}</td>
                  <td>
                    <span className={`pill-score ${succ.length ? "sc-hi" : "sc-empty"}`}>{succ.length}</span>
                  </td>
                  <td>
                    <span className={`pill-score ${naoMap.length ? "sc-mid" : "sc-empty"}`}>{naoMap.length}</span>
                  </td>
                  <td>
                    <span className="pill-score sc-empty">{outros.length}</span>
                  </td>
                  <td>{baseCell}</td>
                  <td>{nominal}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ marginTop: "18px", padding: "16px 18px" }}>
        <h3 style={{ fontSize: "13.5px" }}>Régua de elegibilidade</h3>
        <p style={{ fontSize: "12px", color: "var(--muted)", margin: "6px 0 0" }}>
          O pool elegível de cada cadeira é o nível imediatamente abaixo, respeitando a estrutura estatutária da
          Cooplivre.
        </p>
        <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "6px", fontSize: "12.5px" }}>
          {hierarquia.map((h) => (
            <div
              key={h.nivel}
              style={{ display: "flex", justifyContent: "space-between", padding: "8px 10px", background: "var(--paper)", borderRadius: "8px" }}
            >
              <span>
                <b>{h.nivel}</b>
              </span>
              <span style={{ color: "var(--muted)" }}>pool elegível → {h.elegivel}</span>
            </div>
          ))}
          <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "4px" }}>
            Um candidato só conta como sucessor de uma cadeira se estiver no nível e na diretoria elegíveis, tiver
            declarado essa posição como Prioridade de interesse 1 ou 2, e atingir {threshold} pontos ou mais no
            total.
          </div>
        </div>
      </div>
    </section>
  );
}
