"use client";

import { useApp } from "@/lib/context";
import { CIDADE_RESULTADO_SEVERIDADE, isAgenciaCargo } from "@/lib/agency";
import { aindaNaoMapeadosFor, chairStatusBucket, occupantLabel, outrosInteressadosFor, successorsFor } from "@/lib/scoring";
import type { Chair } from "@/lib/types";

const SEVERIDADE_LABEL = { critico: "⚠ Crítico", atencao: "⚠ Atenção" } as const;
const SEVERIDADE_TITLE = {
  critico: "Agência com menos de 10% do orçado realizado no acumulado e sem sucessor mapeado",
  atencao: "Agência entre 10% e 50% do orçado realizado no acumulado e sem sucessor mapeado",
} as const;

export default function ChairCard({ chair }: { chair: Chair }) {
  const { chairs, hierMap, succession, people, openModal } = useApp();

  const nSucc = successorsFor(hierMap, succession, people, chairs, chair).length;
  const severidade = nSucc === 0 && isAgenciaCargo(chair.cargo) ? CIDADE_RESULTADO_SEVERIDADE[chair.cidade] : undefined;
  const naoMapeados = aindaNaoMapeadosFor(hierMap, succession, people, chairs, chair).length;
  const outros = outrosInteressadosFor(hierMap, succession, people, chairs, chair).length;
  const bucket = chairStatusBucket(nSucc, naoMapeados, outros);
  const cls = bucket === 2 ? "st-hi" : bucket === 1 ? "st-mid" : "st-low";
  const statusLabel = bucket === 2 ? `${nSucc} sucessores` : nSucc === 1 ? "1 sucessor" : bucket === 1 ? "Em atenção" : "Sem sucessor";

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
        <div className="cc-top-badges">
          {severidade ? (
            <span className={`cc-alert-badge sev-${severidade}`} title={SEVERIDADE_TITLE[severidade]}>
              {SEVERIDADE_LABEL[severidade]}
            </span>
          ) : null}
          {chair.vago ? <span className="cc-vago-badge">Vaga</span> : null}
        </div>
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
