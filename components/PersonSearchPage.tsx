"use client";

import { useMemo, useState } from "react";
import type { CandidateBucket } from "./CandidateCard";
import { useApp } from "@/lib/context";
import { CRITERIA } from "@/lib/criteria";
import {
  INT_MAP,
  MOB_MAP,
  cadeiraVirtual,
  feederPoolFor,
  interestMatch,
  localidadeAtualDe,
  normCargo,
  scoreForChair,
} from "@/lib/scoring";
import type { Chair, Horizonte, Person, SuccessionMap } from "@/lib/types";

type Categoria =
  | "diretoria"
  | "executiva"
  | "gerencia_uad"
  | "gerencia_pa"
  | "gerencia_relacionamento"
  | "coordenacao"
  | "especialista"
  | "analista"
  | "outras"
  | "demais_interesses";

const CATEGORIAS: { key: Categoria; label: string }[] = [
  { key: "diretoria", label: "CEO/Diretoria" },
  { key: "executiva", label: "Gerência Executivas" },
  { key: "gerencia_uad", label: "Gerências UAD" },
  { key: "gerencia_pa", label: "Gerências de PA" },
  { key: "gerencia_relacionamento", label: "Gerências de Relacionamento" },
  { key: "coordenacao", label: "Coordenação" },
  { key: "especialista", label: "Especialistas" },
  { key: "analista", label: "Analistas" },
  { key: "outras", label: "Outras Opções" },
  { key: "demais_interesses", label: "Demais Interesses" },
];

const STATUS_LABEL: Record<CandidateBucket, string> = {
  dentro: "Dentro da aderência",
  abaixo: "Abaixo da aderência",
  fora: "Fora da hierarquia",
};
const STATUS_CLS: Record<CandidateBucket, string> = { dentro: "hi", abaixo: "low", fora: "fora" };

// "Não tenho interesse em uma segunda posição" e variantes — não é uma posição
// declarada, não deve virar uma linha na lista.
const SEM_INTERESSE = /^nao tenho interesse/;

interface Declaracao {
  qual: 1 | 2;
  texto: string;
  horizonte: Horizonte | undefined;
}

interface PositionMatch {
  chair: Chair;
  qual: 1 | 2;
  score: number;
  bucket: CandidateBucket;
  real: boolean;
}

interface PersonRow {
  key: string;
  person: Person;
  cidade: string | null;
  mobilidadeLabel: string | null;
  declaracoes: Declaracao[];
  matches: PositionMatch[];
  bestScore: number | null;
  bestBucket: CandidateBucket | null;
  categoria: Categoria;
}

// Classifica a cadeira pelo mesmo agrupamento usado na navegação do mapa
// sucessório, desdobrando "Gerência" em UAD/P.A./Relacionamento pelo padrão
// textual do cargo (não há campo dedicado nos dados — mesma convenção de
// lib/agency.ts).
function categoriaDaCadeira(chair: Chair): Categoria {
  const { nivel, cargo } = chair;
  if (nivel === "C-Level" || nivel === "Diretoria") return "diretoria";
  if (nivel === "Gerência Executiva") return "executiva";
  if (nivel === "Gerência") {
    if (cargo.includes("P.A.")) return "gerencia_pa";
    if (cargo.includes("Relacionamento")) return "gerencia_relacionamento";
    return "gerencia_uad";
  }
  if (nivel === "Coordenação") return "coordenacao";
  if (nivel === "Especialista") return "especialista";
  if (nivel.startsWith("Analista")) return "analista";
  return "outras";
}

function initials(nome: string): string {
  const parts = nome.trim().split(/\s+/);
  const first = parts[0]?.[0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

// Todas as posições em que a pessoa aparece como candidata, somando as duas
// prioridades declaradas. Quando uma prioridade não corresponde a nenhuma
// cadeira real, entra como um item não clicável (sem modal) para a pontuação
// e a situação continuarem visíveis.
function matchesForPerson(
  person: Person,
  declaracoes: Declaracao[],
  hierMap: Record<string, string[]>,
  succession: SuccessionMap,
  people: Person[],
  chairs: Chair[]
): PositionMatch[] {
  const out: PositionMatch[] = [];
  declaracoes.forEach((d) => {
    const reais = chairs.filter((c) => interestMatch(succession, person, normCargo(c.cargo)) === d.qual);
    if (!reais.length) {
      const virtual = cadeiraVirtual(d.texto);
      const sc = scoreForChair(succession, people, person.id, virtual);
      out.push({ chair: virtual, qual: d.qual, score: sc.total, bucket: "fora", real: false });
      return;
    }
    reais.forEach((chair) => {
      const inPool = feederPoolFor(hierMap, succession, people, chairs, chair).some((p) => p.id === person.id);
      const sc = scoreForChair(succession, people, person.id, chair);
      const bucket: CandidateBucket = !inPool ? "fora" : sc.total >= CRITERIA.eligibilityThreshold ? "dentro" : "abaixo";
      out.push({ chair, qual: d.qual, score: sc.total, bucket, real: true });
    });
  });
  out.sort((a, b) => b.score - a.score);
  return out;
}

export default function PersonSearchPage() {
  const { chairs, people, hierMap, succession, activePage, openModal } = useApp();
  const [search, setSearch] = useState("");
  const [prontidaoFilter, setProntidaoFilter] = useState("");
  const [cidadeFilter, setCidadeFilter] = useState("");
  const [qualFilter, setQualFilter] = useState<"" | "1" | "2">("");
  const [categoriaFilter, setCategoriaFilter] = useState<"" | Categoria>("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpanded = (key: string) =>
    setExpanded((cur) => {
      const next = new Set(cur);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const rows = useMemo(() => {
    const out: PersonRow[] = [];
    people.forEach((p) => {
      const s = succession[p.id] || {};
      const declaracoes: Declaracao[] = [];
      ([1, 2] as const).forEach((qual) => {
        const raw = qual === 1 ? s.prioridade1 : s.prioridade2;
        if (!raw || SEM_INTERESSE.test(normCargo(raw))) return;
        declaracoes.push({ qual, texto: raw, horizonte: qual === 1 ? s.horizonte1 : s.horizonte2 });
      });
      if (!declaracoes.length) return;

      const matches = matchesForPerson(p, declaracoes, hierMap, succession, people, chairs);
      const top = matches[0];
      out.push({
        key: p.id,
        person: p,
        cidade: localidadeAtualDe(succession, chairs, p),
        mobilidadeLabel: s.mobilidade && MOB_MAP[s.mobilidade] ? MOB_MAP[s.mobilidade].label : null,
        declaracoes,
        matches,
        bestScore: top ? top.score : null,
        bestBucket: top ? top.bucket : null,
        categoria: top && top.real ? categoriaDaCadeira(top.chair) : "demais_interesses",
      });
    });
    out.sort((a, b) => (b.bestScore ?? -1) - (a.bestScore ?? -1) || a.person.nome.localeCompare(b.person.nome, "pt-BR"));
    return out;
  }, [people, succession, chairs, hierMap]);

  const cidadeOptions = useMemo(
    () => [...new Set(rows.map((r) => r.cidade).filter((c): c is string => !!c))].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [rows]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (q && !r.person.nome.toLowerCase().includes(q)) return false;
      if (prontidaoFilter && !r.declaracoes.some((d) => d.horizonte === prontidaoFilter)) return false;
      if (cidadeFilter && r.cidade !== cidadeFilter) return false;
      if (qualFilter && !r.declaracoes.some((d) => String(d.qual) === qualFilter)) return false;
      if (categoriaFilter && r.categoria !== categoriaFilter) return false;
      return true;
    });
  }, [rows, search, prontidaoFilter, cidadeFilter, qualFilter, categoriaFilter]);

  return (
    <section className={`page${activePage === "buscar" ? " active" : ""}`}>
      <div className="page-head">
        <div>
          <div className="eyebrow">Mapa sucessório</div>
          <h1>Buscar pessoa</h1>
          <p>Todas as pessoas que declararam interesse em alguma posição, e onde cada uma aparece como candidata.</p>
        </div>
      </div>

      <div className="toolbar">
        <select value={categoriaFilter} onChange={(ev) => setCategoriaFilter(ev.target.value as "" | Categoria)}>
          <option value="">Posição de cargo</option>
          {CATEGORIAS.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
        <input type="search" placeholder="Buscar por nome…" value={search} onChange={(ev) => setSearch(ev.target.value)} />
        <select value={prontidaoFilter} onChange={(ev) => setProntidaoFilter(ev.target.value)}>
          <option value="">Prontidão declarada</option>
          {Object.values(INT_MAP).map((it) => (
            <option key={it.key} value={it.key}>
              {it.label}
            </option>
          ))}
        </select>
        <select value={cidadeFilter} onChange={(ev) => setCidadeFilter(ev.target.value)}>
          <option value="">Cidade</option>
          {cidadeOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select value={qualFilter} onChange={(ev) => setQualFilter(ev.target.value as "" | "1" | "2")}>
          <option value="">Prioridade 1 ou 2</option>
          <option value="1">Prioridade 1</option>
          <option value="2">Prioridade 2</option>
        </select>
        <span className="count">
          {filtered.length} de {rows.length} pessoas interessadas
        </span>
      </div>

      <div className="person-list">
        {filtered.map((r) => {
          const isOpen = expanded.has(r.key);
          return (
            <div key={r.key} className="person-row">
              <div className="person-row-top">
                <div className="person-avatar">{initials(r.person.nome)}</div>
                <div className="person-id">
                  <div className="name">{r.person.nome}</div>
                  <div className="sub">
                    {r.person.cargo} · {r.person.nivel}
                    {succession[r.person.id]?.lideraEquipe ? " · Líder" : ""}
                  </div>
                  <div className="sub">
                    {r.cidade || "—"}
                    {r.mobilidadeLabel ? ` · Mobilidade: ${r.mobilidadeLabel}` : ""}
                  </div>
                </div>
                <div className="person-prios">
                  {r.declaracoes.map((d) => (
                    <div key={d.qual}>
                      <b>P{d.qual}</b> {d.texto}
                      {d.horizonte && INT_MAP[d.horizonte] ? <span className="hz"> · {INT_MAP[d.horizonte].label}</span> : null}
                    </div>
                  ))}
                </div>
                <div className="person-score">
                  <b>{r.bestScore !== null ? r.bestScore.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) : "—"}</b>
                  <span>melhor pontuação</span>
                </div>
                <div className="person-status">
                  {r.bestBucket ? (
                    <span className={`cand-status-pill status-${STATUS_CLS[r.bestBucket]}`}>{STATUS_LABEL[r.bestBucket]}</span>
                  ) : null}
                </div>
                <button className="cand-toggle" onClick={() => toggleExpanded(r.key)}>
                  {isOpen ? `Ocultar posições –` : `Ver posições (${r.matches.length}) +`}
                </button>
              </div>

              {isOpen ? (
                <div className="person-positions">
                  <h5>Posições em que aparece como candidata</h5>
                  <div className="table-wrap">
                    <table className="elig">
                      <thead>
                        <tr>
                          <th>Posição</th>
                          <th>Ocupante atual</th>
                          <th>Cidade</th>
                          <th>Situação</th>
                          <th>Pontos</th>
                        </tr>
                      </thead>
                      <tbody>
                        {r.matches.map((m) => (
                          <tr key={m.chair.id + m.qual}>
                            <td>
                              {m.real ? (
                                <button className="row-link" onClick={() => openModal(m.chair.id)}>
                                  {m.chair.cargo}
                                </button>
                              ) : (
                                <span>{m.chair.cargo} (sem cadeira correspondente)</span>
                              )}
                            </td>
                            <td>{m.real ? (m.chair.vago ? "Vaga" : m.chair.nome) : "—"}</td>
                            <td>{m.real ? m.chair.cidade || "—" : "—"}</td>
                            <td>
                              <span className={`cand-status-pill status-${STATUS_CLS[m.bucket]}`}>{STATUS_LABEL[m.bucket]}</span>
                            </td>
                            <td>{m.score.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
        {filtered.length === 0 ? <div className="modal-empty">Nenhuma pessoa encontrada com esse filtro.</div> : null}
      </div>
    </section>
  );
}
