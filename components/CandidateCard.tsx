"use client";

import { useState } from "react";
import { useApp } from "@/lib/context";
import { CONT_BADGE, CONT_LABELS, CONV_BADGE, CONV_LABELS, CRITERIA } from "@/lib/criteria";
import { aderenciaBand, favSubLabel, fmtNum, INT_MAP, nineBoxSubLabel, scoreForChair } from "@/lib/scoring";
import type { Chair, Person } from "@/lib/types";

export type CandidateBucket = "dentro" | "abaixo" | "fora";

// Rótulo curto para o selo de status da linha — a régua completa (usada na
// página de Elegibilidade) mantém o texto composto ("Pronto / alta aderência").
const BAND_SHORT_LABEL: Record<string, string> = {
  hi: "Alta aderência",
  mid: "Média aderência",
  init: "Aderência inicial",
  low: "Baixa aderência",
};

export default function CandidateCard({ person, chair, bucket }: { person: Person; chair: Chair; bucket: CandidateBucket }) {
  const { succession, people } = useApp();
  const [open, setOpen] = useState(false);

  const sc = scoreForChair(succession, people, person.id, chair);
  const s = succession[person.id] || {};
  const band = aderenciaBand(sc.total);
  const convBadge = s.conversaDesenvolvimento ? CONV_BADGE[s.conversaDesenvolvimento] : null;
  const contBadge = s.continuidade ? CONT_BADGE[s.continuidade] : null;
  const horizonteKey = sc.which === 1 ? s.horizonte1 : sc.which === 2 ? s.horizonte2 : null;
  const devText = sc.which === 1 ? s.desenvolvimento1 : sc.which === 2 ? s.desenvolvimento2 : "";

  const statusCls = bucket === "fora" ? "fora" : band.cls;
  const statusLabel = bucket === "fora" ? "Fora da hierarquia" : BAND_SHORT_LABEL[band.cls];
  const statusNote =
    bucket === "fora"
      ? "Nível não elegível para esta posição"
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
      <div className={`cand-detail${open ? " open" : ""}`}>
        <div className="cd-label">Composição da pontuação · base de {sc.pontosAplicaveis} pontos aplicáveis</div>
        <div className="cd-boxes">
          <div className="cd-box">
            <span className="cd-box-label">Nine Box</span>
            <span className="cd-box-sub">{nineBoxSubLabel(s)}</span>
            <b>{fmtNum(sc.nineBox)}/40</b>
          </div>
          <div className="cd-box">
            <span className="cd-box-label">Match Indicação Líder</span>
            <span className="cd-box-sub">Cruzamento líder × liderado</span>
            <b>{sc.matchLider}/20</b>
          </div>
          <div className={`cd-box${sc.favAplica ? "" : " cd-box-na"}`}>
            <span className="cd-box-label">Favorabilidade do time</span>
            <span className="cd-box-sub">{favSubLabel(s, sc)}</span>
            <b>{sc.favAplica ? fmtNum(sc.favorabilidade as number) + "/10" : "n/a"}</b>
          </div>
          <div className="cd-box">
            <span className="cd-box-label">Interesse</span>
            <span className="cd-box-sub">Prontidão declarada</span>
            <b>{fmtNum(sc.interesse)}/10</b>
          </div>
          <div className="cd-box">
            <span className="cd-box-label">Mobilidade</span>
            <span className="cd-box-sub">Abrangência de movimentação</span>
            <b>{fmtNum(sc.mobilidade)}/20</b>
          </div>
        </div>
        <div className="cd-normalizacao">
          {fmtNum(sc.bruto)} pontos obtidos ÷ {sc.pontosAplicaveis} aplicáveis × 100 = <b>{fmtNum(sc.total)}</b>
        </div>
        <div className="cd-label">Contexto para a posição</div>
        <div className="cd-context">
          <div className="cd-ctx-box">
            <span className="cd-ctx-label">Pontos de desenvolvimento para essa posição</span>
            <p>{devText ? devText : "Não informado"}</p>
          </div>
          <div className="cd-ctx-box">
            <span className="cd-ctx-label">Plano de desenvolvimento formal</span>
            <p>{s.conversaDesenvolvimento ? CONV_LABELS[s.conversaDesenvolvimento] : "Não informado"}</p>
          </div>
          <div className="cd-ctx-box">
            <span className="cd-ctx-label">Sucessor indicado (posição atual desta pessoa)</span>
            <p>{s.continuidade ? CONT_LABELS[s.continuidade] : "Não informado"}</p>
            {s.possivelSucessorTexto ? (
              <>
                <span className="cd-ctx-label" style={{ marginTop: "8px" }}>
                  Pessoa indicada
                </span>
                <p>{s.possivelSucessorTexto}</p>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
