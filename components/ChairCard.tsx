"use client";

import { useApp } from "@/lib/context";
import { aindaNaoMapeadosFor, occupantLabel, outrosInteressadosFor, successorsFor } from "@/lib/scoring";
import type { Chair } from "@/lib/types";

export default function ChairCard({ chair }: { chair: Chair }) {
  const { hierMap, succession, people, openModal } = useApp();

  const nSucc = successorsFor(hierMap, succession, people, chair).length;
  const cls = nSucc >= 2 ? "st-hi" : nSucc === 1 ? "st-mid" : "st-low";
  const statusLabel = nSucc >= 2 ? `${nSucc} sucessores` : nSucc === 1 ? "1 sucessor" : "Sem sucessor";
  const naoMapeados = aindaNaoMapeadosFor(hierMap, succession, people, chair).length;
  const outros = outrosInteressadosFor(hierMap, succession, people, chair).length;

  let secondary: string;
  if (naoMapeados > 0) secondary = `${naoMapeados} ainda não mapeado${naoMapeados === 1 ? "" : "s"}`;
  else if (outros > 0) secondary = `${outros} outro${outros === 1 ? "" : "s"} interesse${outros === 1 ? "" : "s"}`;
  else secondary = "Nenhum outro interesse";

  return (
    <div
      className={`chair-card ${cls}`}
      tabIndex={0}
      role="button"
      onClick={() => openModal(chair.id)}
      onKeyDown={(ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          openModal(chair.id);
        }
      }}
    >
      <div className="cc-top-row">
        <h4>{chair.cargo}</h4>
        {chair.vago ? <span className="cc-vago-badge">Vaga</span> : null}
      </div>
      <div className="cc-occupant">
        {chair.vago ? (
          <span className="cc-vago">Posição vaga — sem ocupante atual</span>
        ) : (
          <>
            Ocupante atual · <b>{occupantLabel(chair)}</b>
          </>
        )}
      </div>
      <div className="cc-divider"></div>
      <div className="cc-footer">
        <span className={`cc-status ${cls}`}>{statusLabel}</span>
        <span className="cc-secondary">{secondary}</span>
      </div>
    </div>
  );
}
