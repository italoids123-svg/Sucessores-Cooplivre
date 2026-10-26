"use client";

import { Fragment, useMemo, useState } from "react";
import { useApp } from "@/lib/context";
import { CRITERIA } from "@/lib/criteria";
import { aderenciaBand, fmtNum, INT_MAP, interessesCruzadosUadAgencia, motivoForaDaHierarquia } from "@/lib/scoring";
import type { CrossBucket, GrupoUnidade } from "@/lib/scoring";
import ScoreDetail from "./ScoreDetail";

const GRUPO_LABEL: Record<GrupoUnidade, string> = { uad: "UAD", agencias: "Agência" };

const STATUS_LABEL: Record<CrossBucket, string> = {
  dentro: "Dentro da aderência",
  abaixo: "Abaixo do corte",
  fora: "Fora da hierarquia",
};

const MOTIVO_FORA_LABEL: Record<string, string> = {
  nivel: "Nível não elegível",
  mobilidade: "Nível ok, mobilidade não alcança",
  nivel_e_mobilidade: "Nível e mobilidade fora do alcance",
};

type Direcao = "" | "uad->agencias" | "agencias->uad";

export default function CrossInterestsPage() {
  const { chairs, people, hierMap, succession, activePage } = useApp();
  const [search, setSearch] = useState("");
  const [direcao, setDirecao] = useState<Direcao>("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpanded = (key: string) =>
    setExpanded((cur) => {
      const next = new Set(cur);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const rows = useMemo(
    () => interessesCruzadosUadAgencia(hierMap, succession, people, chairs),
    [hierMap, succession, people, chairs]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter((r) => {
      if (direcao && `${r.grupoAtual}->${r.grupoDestino}` !== direcao) return false;
      if (q && !r.person.nome.toLowerCase().includes(q) && !r.chair.cargo.toLowerCase().includes(q) && !r.person.cargo.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [rows, search, direcao]);

  return (
    <section className={`page${activePage === "cruzados" ? " active" : ""}`}>
      <div className="page-head">
        <div>
          <div className="eyebrow">Mapa sucessório</div>
          <h1>Interesses cruzados</h1>
          <p>
            Pessoas que hoje estão na UAD e declararam interesse em uma posição de Agência, ou vice-versa — inclui
            todo mundo que declarou, mesmo abaixo do corte de aderência ou fora da hierarquia elegível para a posição.
          </p>
        </div>
      </div>

      <div className="toolbar">
        <input
          type="search"
          placeholder="Buscar por nome, cargo atual ou posição de interesse…"
          value={search}
          onChange={(ev) => setSearch(ev.target.value)}
        />
        <select value={direcao} onChange={(ev) => setDirecao(ev.target.value as Direcao)}>
          <option value="">Todas as direções</option>
          <option value="uad->agencias">UAD → Agência</option>
          <option value="agencias->uad">Agência → UAD</option>
        </select>
        <span className="count">
          {filtered.length} de {rows.length} manifestações
        </span>
      </div>

      <div className="table-wrap">
        <table className="elig">
          <thead>
            <tr>
              <th>Pessoa</th>
              <th>Cargo atual</th>
              <th>Grupo atual</th>
              <th>Posição de interesse</th>
              <th>Grupo de destino</th>
              <th>Prioridade</th>
              <th>Pontuação</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const s = succession[r.person.id] || {};
              const horizonteKey = r.score.which === 1 ? s.horizonte1 : r.score.which === 2 ? s.horizonte2 : null;
              const horizonteLabel = horizonteKey && INT_MAP[horizonteKey] ? INT_MAP[horizonteKey].label : null;
              const band = aderenciaBand(r.score.total);
              const statusCls = r.bucket === "fora" ? "fora" : band.cls;
              const motivoFora = r.bucket === "fora" ? motivoForaDaHierarquia(hierMap, succession, people, chairs, r.person, r.chair) : null;
              const isOpen = expanded.has(r.key);
              return (
                <Fragment key={r.key}>
                  <tr>
                    <td>
                      <b>{r.person.nome}</b>
                    </td>
                    <td>
                      {r.person.cargo} · {r.person.nivel}
                    </td>
                    <td>
                      <span className={`group-pill group-${r.grupoAtual}`}>{GRUPO_LABEL[r.grupoAtual]}</span>
                    </td>
                    <td>
                      {r.chair.cargo} · {r.chair.nivel}
                    </td>
                    <td>
                      <span className={`group-pill group-${r.grupoDestino}`}>{GRUPO_LABEL[r.grupoDestino]}</span>
                    </td>
                    <td>
                      {r.score.which ? (
                        <>
                          Prioridade {r.score.which}
                          {horizonteLabel ? (
                            <>
                              <br />
                              <span style={{ color: "var(--teal-dark)", fontSize: "11px" }}>{horizonteLabel}</span>
                            </>
                          ) : null}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <b>{fmtNum(r.score.total)}</b> pontos
                    </td>
                    <td>
                      <span className={`cand-status-pill status-${statusCls}`}>{STATUS_LABEL[r.bucket]}</span>
                      {r.bucket === "abaixo" ? (
                        <div className="cand-row-note">Abaixo do corte de {CRITERIA.eligibilityThreshold} pontos</div>
                      ) : null}
                      {motivoFora ? <div className="cand-row-note">{MOTIVO_FORA_LABEL[motivoFora]}</div> : null}
                    </td>
                    <td>
                      <button className="cand-toggle" onClick={() => toggleExpanded(r.key)}>
                        {isOpen ? "Ocultar detalhes –" : "Ver detalhes +"}
                      </button>
                    </td>
                  </tr>
                  {isOpen ? (
                    <tr>
                      <td colSpan={9}>
                        <div className="cand-detail open">
                          <ScoreDetail person={r.person} chair={r.chair} />
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: "center", color: "var(--muted)" }}>
                  Nenhum interesse cruzado encontrado com esse filtro.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
