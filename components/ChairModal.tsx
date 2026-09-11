"use client";

import { useEffect } from "react";
import CandidateCard from "./CandidateCard";
import { useApp } from "@/lib/context";
import { aindaNaoMapeadosFor, occupantLabel, outrosInteressadosFor, successorsFor } from "@/lib/scoring";
import type { Chair, Person } from "@/lib/types";

function Section({ title, people, chairId, chair }: { title: string; people: Person[]; chairId: string; chair: Chair }) {
  return (
    <div className="modal-section">
      <h4>{title}</h4>
      {people.length ? (
        people.map((p) => <CandidateCard key={p.id + chairId} person={p} chair={chair} />)
      ) : (
        <div className="modal-empty">Nenhuma pessoa neste grupo.</div>
      )}
    </div>
  );
}

export default function ChairModal() {
  const { chairs, people, hierMap, succession, modalChairId, closeModal } = useApp();
  const chair = chairs.find((c) => c.id === modalChairId) || null;

  useEffect(() => {
    function onKeyDown(ev: KeyboardEvent) {
      if (ev.key === "Escape") closeModal();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [closeModal]);

  if (!chair) {
    return (
      <div className="modal-overlay">
        <div className="modal-box"></div>
      </div>
    );
  }

  const successors = successorsFor(hierMap, succession, people, chairs, chair);
  const naoMapeados = aindaNaoMapeadosFor(hierMap, succession, people, chairs, chair);
  const outros = outrosInteressadosFor(hierMap, succession, people, chairs, chair);
  const cls = successors.length >= 2 ? "st-hi" : successors.length === 1 ? "st-mid" : "st-low";

  return (
    <div
      className={`modal-overlay${modalChairId ? " open" : ""}`}
      onClick={(ev) => {
        if (ev.target === ev.currentTarget) closeModal();
      }}
    >
      <div className="modal-box">
        <div className="modal-head">
          <div className={`modal-head-bar ${cls}`}></div>
          <div className="modal-head-text">
            <h2>{chair.cargo}</h2>
            <div className="modal-occupant">
              {chair.vago ? (
                <span className="cc-vago">Posição vaga — sem ocupante atual</span>
              ) : (
                <>Ocupante atual · {occupantLabel(chair)}</>
              )}
            </div>
          </div>
          <button className="modal-close" aria-label="Fechar" onClick={closeModal}>
            ×
          </button>
        </div>
        <div className="modal-kpis">
          <div className="modal-kpi">
            <div className="mk-label">Interessados dentro da pontuação de aderência</div>
            <div className="mk-value">{successors.length}</div>
          </div>
          <div className="modal-kpi">
            <div className="mk-label">Interessados abaixo da pontuação de aderência</div>
            <div className="mk-value">{naoMapeados.length}</div>
          </div>
          <div className="modal-kpi">
            <div className="mk-label">Interessados fora da hierarquia elegível</div>
            <div className="mk-value">{outros.length}</div>
          </div>
        </div>
        <div className="modal-sections">
          <Section title="Interessados dentro da pontuação de aderência" people={successors} chairId={chair.id} chair={chair} />
          <Section title="Interessados abaixo da pontuação de aderência" people={naoMapeados} chairId={chair.id} chair={chair} />
          <Section title="Interessados fora da hierarquia elegível" people={outros} chairId={chair.id} chair={chair} />
        </div>
      </div>
    </div>
  );
}
