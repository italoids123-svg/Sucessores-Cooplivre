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

  const successors = successorsFor(hierMap, succession, people, chair);
  const naoMapeados = aindaNaoMapeadosFor(hierMap, succession, people, chair);
  const outros = outrosInteressadosFor(hierMap, succession, people, chair);
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
            <div className="mk-label">Sucessores mapeados</div>
            <div className="mk-value">{successors.length}</div>
          </div>
          <div className="modal-kpi">
            <div className="mk-label">Ainda não mapeados</div>
            <div className="mk-value">{naoMapeados.length}</div>
          </div>
          <div className="modal-kpi">
            <div className="mk-label">Outros interessados</div>
            <div className="mk-value">{outros.length}</div>
          </div>
        </div>
        <div className="modal-sections">
          <Section title="Sucessores mapeados" people={successors} chairId={chair.id} chair={chair} />
          <Section title="Ainda não mapeados" people={naoMapeados} chairId={chair.id} chair={chair} />
          <Section title="Outros interessados" people={outros} chairId={chair.id} chair={chair} />
        </div>
      </div>
    </div>
  );
}
