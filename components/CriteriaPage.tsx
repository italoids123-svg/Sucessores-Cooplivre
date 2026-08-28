"use client";

import { useApp } from "@/lib/context";
import { CRITERIA } from "@/lib/criteria";

export default function CriteriaPage() {
  const { activePage } = useApp();

  return (
    <section className={`page${activePage === "criteria" ? " active" : ""}`}>
      <div className="page-head">
        <div>
          <div className="eyebrow">Metodologia</div>
          <h1>Critérios</h1>
          <p>Modelo de pontuação validado — 100 pontos distribuídos em 5 critérios de aderência à sucessão.</p>
        </div>
      </div>
      <div className="criteria-grid">
        <article className="criterion card">
          <h3>Nine Box (2024–2025)</h3>
          <div className="weight">Peso: 40 pontos no modelo</div>
          <table>
            <tbody>
              {CRITERIA.nineBox.scale.map((x) => (
                <tr key={x.code}>
                  <td>
                    {x.code} · {x.label}
                  </td>
                  <td>{x.points} pts</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="note">
            Nota final = 2024 × 37,5% + 2025 × 62,5%. Se só um dos dois anos estiver preenchido, esse ano vale 100%
            até o segundo ser coletado.
          </div>
        </article>

        <article className="criterion card">
          <h3>Match Indicação Líder</h3>
          <div className="weight">Peso: 20 pontos no modelo</div>
          <table>
            <tbody>
              <tr>
                <td>
                  Líder indica nominalmente o liderado como sucessor da própria posição, e o liderado declarou essa
                  posição como prioridade
                </td>
                <td>20 pts</td>
              </tr>
              <tr>
                <td>Sem indicação nominal do líder, ou sem interesse declarado do liderado</td>
                <td>0 pt</td>
              </tr>
            </tbody>
          </table>
          <div className="note">
            Só é calculado quando gestor imediato e liderado responderem: cruza o interesse declarado pelo liderado
            (Prioridade de interesse) com o nome indicado pelo líder em &quot;Possível sucessor da posição
            atual&quot;.
          </div>
        </article>

        <article className="criterion card">
          <h3>Favorabilidade do time</h3>
          <div className="weight">Peso: 10 pontos no modelo</div>
          <table>
            <tbody>
              {CRITERIA.favorabilidade.scale.map((x) => (
                <tr key={x.label}>
                  <td>{x.label}</td>
                  <td>{x.points} pts</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="note">
            Fonte: favorabilidade do time que a pessoa lidera, no corte de gestão imediata do relatório GPTW —
            ciclos 2025 e 2026. Nota final = 2025 × 37,5% + 2026 × 62,5%; se só um ciclo estiver preenchido, esse
            ciclo vale 100%.
            <br />
            <br />
            Quem não lidera equipe, ou lidera mas teve o corte suprimido pelo GPTW (time com menos de 5 pessoas), não
            é avaliado neste critério: disputa em <b>90 pontos aplicáveis</b> em vez de 100, sem receber nota zero.
          </div>
        </article>

        <article className="criterion card">
          <h3>Interesse Declarado</h3>
          <div className="weight">Peso: 10 pontos no modelo</div>
          <table>
            <tbody>
              {CRITERIA.interesse.scale.map((x) => (
                <tr key={x.key}>
                  <td>{x.label}</td>
                  <td>{x.points} pts</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="note">
            Horizonte de prontidão declarado para a posição específica (prioridade 1 ou 2, conforme qual bate com a
            cadeira avaliada).
          </div>
        </article>

        <article className="criterion card">
          <h3>Mobilidade</h3>
          <div className="weight">Peso: 20 pontos no modelo</div>
          <table>
            <tbody>
              {CRITERIA.mobilidade.scale.map((x) => (
                <tr key={x.key}>
                  <td>{x.label}</td>
                  <td>{x.points} pts</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="note">
            Amplitude geográfica que o candidato aceita para o desafio.
            <br />
            <br />
            <b>Normalização:</b> a soma bruta dos critérios é convertida em percentual de aproveitamento — pontos
            obtidos ÷ pontos aplicáveis × 100. O corte de elegibilidade de {CRITERIA.eligibilityThreshold} é lido
            sobre esse valor normalizado, então quem disputa em 90 pontos não é penalizado por não ser avaliado em
            Favorabilidade.
          </div>
        </article>
      </div>
    </section>
  );
}
