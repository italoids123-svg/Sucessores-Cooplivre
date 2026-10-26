"use client";

import { useState } from "react";
import { useApp } from "@/lib/context";
import { CONT_BADGE, CONV_BADGE, CRITERIA } from "@/lib/criteria";
import { aderenciaBand, fmtNum, INT_MAP, motivoForaDaHierarquia, scoreForChair } from "@/lib/scoring";
import type { Chair, Person } from "@/lib/types";
import ScoreDetail from "./ScoreDetail";

export type CandidateBucket = "dentro" | "abaixo" | "fora";

// Rótulo curto para o selo de status da linha — a régua completa (usada na
// página de Elegibilidade) mantém o texto composto ("Pronto / alta aderência").
const BAND_SHORT_LABEL: Record<string, string> = {
  hi: "Alta aderência",
  mid: "Média aderência",
  init: "Aderência inicial",
  low: "Baixa aderência",
};

// Por que a pessoa está "fora da hierarquia" — nível errado, mobilidade que não
// alcança a cidade da cadeira, ou os dois (ver motivoForaDaHierarquia).
const MOTIVO_FORA_LABEL: Record<string, string> = {
  nivel: "Nível não elegível para esta posição",
  mobilidade: "Nível elegível, mas fora do alcance da mobilidade declarada",
  nivel_e_mobilidade: "Nível não elegível e fora do alcance da mobilidade declarada",
};

export default function CandidateCard({
  person,
  chair,
  bucket,
  interestCargo,
}: {
  person: Person;
  chair: Chair;
  bucket: CandidateBucket;
  interestCargo?: string;
}) {
  const { succession, people, chairs, hierMap } = useApp();
  const [open, setOpen] = useState(false);

  const sc = scoreForChair(succession, people, person.id, chair);
  const s = succession[person.id] || {};
  const band = aderenciaBand(sc.total);
  const convBadge = s.conversaDesenvolvimento ? CONV_BADGE[s.conversaDesenvolvimento] : null;
  const contBadge = s.continuidade ? CONT_BADGE[s.continuidade] : null;
  const horizonteKey = sc.which === 1 ? s.horizonte1 : sc.which === 2 ? s.horizonte2 : null;

  const statusCls = bucket === "fora" ? "fora" : band.cls;
  const statusLabel = bucket === "fora" ? "Fora da hierarquia" : BAND_SHORT_LABEL[band.cls];
  const motivoFora = bucket === "fora" ? motivoForaDaHierarquia(hierMap, succession, people, chairs, person, chair) : null;
  const statusNote =
    bucket === "fora"
      ? MOTIVO_FORA_LABEL[motivoFora!]
      : bucket === "abaixo"
        ? `Abaixo do corte de ${CRITERIA.eligibilityThreshold} pontos`
        : null;

  return (
    <div className="cand-card">
      <div className="cand-row">
        <div className="cand-row-avatar">
          {sc.matchLider > 0 ? (
            <span className="cand-match-badge" title="Match Indicação Líder">
              ★
            </span>
          ) : null}
        </div>
        <div className="cand-row-id">
          <div className="cand-name">{person.nome}</div>
          <div className="cand-sub">
            {person.cargo} · {person.nivel}
          </div>
          {interestCargo ? <div className="cand-interest">Interesse: {interestCargo}</div> : null}
        </div>
        <div className="cand-row-prio">
          {sc.which ? (
            <>
              <b>Prioridade {sc.which}</b>
              {horizonteKey && INT_MAP[horizonteKey] ? <span>{INT_MAP[horizonteKey].label}</span> : null}
            </>
          ) : null}
        </div>
        <div className="cand-row-badges">
          {convBadge ? <span className={`cand-badge ${convBadge.cls}`}>{convBadge.label}</span> : null}
          {contBadge ? <span className={`cand-badge ${contBadge.cls}`}>{contBadge.label}</span> : null}
        </div>
        <div className="cand-row-score">
          <b>{fmtNum(sc.total)}</b>
          <span>pontos</span>
        </div>
        <div className="cand-row-status">
          <span className={`cand-status-pill status-${statusCls}`}>{statusLabel}</span>
          {statusNote ? <span className="cand-row-note">{statusNote}</span> : null}
        </div>
        <button className="cand-toggle" onClick={() => setOpen((v) => !v)}>
          {open ? "Ocultar detalhes –" : "Ver detalhes +"}
        </button>
      </div>
      <div className={`cand-detail${open ? " open" : ""}`}>{open ? <ScoreDetail person={person} chair={chair} /> : null}</div>
    </div>
  );
}
