"use client";

import { useApp } from "@/lib/context";
import { CONT_LABELS, CONV_LABELS, CRITERIA } from "@/lib/criteria";
import { favSubLabel, fmtNum, nbResolve, scoreForChair } from "@/lib/scoring";
import type { Chair, Person } from "@/lib/types";

// Detalhamento da composição da pontuação de uma pessoa para uma cadeira —
// usado tanto no card de candidato (Elegibilidade, Outras posições etc.)
// quanto na tabela de Interesses cruzados, para não duplicar essa lógica.
export default function ScoreDetail({ person, chair }: { person: Person; chair: Chair }) {
  const { succession, people } = useApp();

  const sc = scoreForChair(succession, people, person.id, chair);
  const s = succession[person.id] || {};
  const nb2025 = nbResolve(s.nineBox2025);
  const nb2026 = nbResolve(s.nineBox2026);
  // Quando os dois ciclos estão preenchidos, cada um pesa sua fração (37,5%/62,5%);
  // com só um preenchido, ele vale 100% (mesma regra de scoreNineBox em lib/scoring.ts).
  const bothNB = !!nb2025 && !!nb2026;
  const nbWeightPct = (year: "2025" | "2026") =>
    bothNB ? (year === "2025" ? CRITERIA.nineBox.weight2025 : CRITERIA.nineBox.weight2026) * 100 : 100;
  const nineBoxLine = (resolved: typeof nb2025, year: "2025" | "2026") => {
    if (!resolved) return "Não avaliado";
    const weightPct = nbWeightPct(year);
    const contrib = (resolved.points * weightPct) / 100;
    return `${resolved.label} (${resolved.points} pts × ${fmtNum(weightPct)}% = ${fmtNum(contrib)} pts)`;
  };
  const devText = sc.which === 1 ? s.desenvolvimento1 : sc.which === 2 ? s.desenvolvimento2 : "";

  return (
    <>
      <div className="cd-label">Composição da pontuação · base de {sc.pontosAplicaveis} pontos aplicáveis</div>
      <div className="cd-boxes">
        <div className="cd-box">
          <span className="cd-box-label">Nine Box</span>
          <span className="cd-box-sub">2025: {nineBoxLine(nb2025, "2025")}</span>
          <span className="cd-box-sub">2026: {nineBoxLine(nb2026, "2026")}</span>
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
    </>
  );
}
