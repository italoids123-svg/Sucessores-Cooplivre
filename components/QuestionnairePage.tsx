"use client";

import { useApp } from "@/lib/context";
import { NAT_BADGE, NAT_CLASS, QSTEPS, QUESTIONS } from "@/lib/criteria";

export default function QuestionnairePage() {
  const { activePage } = useApp();

  return (
    <section className={`page${activePage === "questionnaire" ? " active" : ""}`}>
      <div className="page-head">
        <div>
          <div className="eyebrow">Instrumento de captura</div>
          <h1>Questionário</h1>
        </div>
      </div>
      <div className="qsteps">
        {QSTEPS.map((s) => (
          <div className="qstep" key={s.n}>
            <div className="qstep-num">{s.n}</div>
            <h4>{s.title}</h4>
            <p>{s.desc}</p>
            <div className="qstep-tag">{s.tag}</div>
          </div>
        ))}
      </div>
      <div className="table-wrap">
        <table className="qtable">
          <thead>
            <tr>
              <th>#</th>
              <th>Pergunta e orientação</th>
              <th>Natureza</th>
              <th>Pontuação</th>
              <th>Resposta esperada</th>
            </tr>
          </thead>
          <tbody>
            {QUESTIONS.map((q) => (
              <tr className={`nat-${NAT_CLASS[q.natureza]}`} key={q.n}>
                <td>{String(q.n).padStart(2, "0")}</td>
                <td>
                  <div className="q-title">{q.title}</div>
                  <div className="q-desc">{q.desc}</div>
                </td>
                <td>
                  <span className={`q-badge ${NAT_BADGE[q.natureza]}`}>{q.natureza}</span>
                </td>
                <td>
                  <span className={`q-badge ${q.pontos ? "pts-sim" : "pts-nao"}`}>
                    {q.pontos ? "Gera pontos" : "Não gera pontos"}
                  </span>
                </td>
                <td>
                  <div className="q-format-label">Formato de resposta</div>
                  <div className="q-format-value">{q.resposta}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
