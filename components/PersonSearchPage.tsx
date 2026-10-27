"use client";

import { Fragment, useMemo, useState } from "react";
import CandidateCard, { type CandidateBucket } from "./CandidateCard";
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
  occupantLabel,
  scoreForChair,
} from "@/lib/scoring";
import type { Chair, Horizonte, Mobilidade, Person, SuccessionMap } from "@/lib/types";

interface InterestRow {
  key: string;
  person: Person;
  qual: 1 | 2;
  texto: string;
  horizonte: Horizonte | undefined;
  mobilidade: Mobilidade | undefined;
  cidade: string | null;
}

// "Não tenho interesse em uma segunda posição" e variantes — não é uma posição
// declarada, não deve virar uma linha na lista.
const SEM_INTERESSE = /^nao tenho interesse/;

function matchesForRow(
  row: InterestRow,
  hierMap: Record<string, string[]>,
  succession: SuccessionMap,
  people: Person[],
  chairs: Chair[]
): { chair: Chair; bucket: CandidateBucket; score: number }[] {
  const out: { chair: Chair; bucket: CandidateBucket; score: number }[] = [];
  chairs.forEach((chair) => {
    if (interestMatch(succession, row.person, normCargo(chair.cargo)) !== row.qual) return;
    const inPool = feederPoolFor(hierMap, succession, people, chairs, chair).some((p) => p.id === row.person.id);
    const sc = scoreForChair(succession, people, row.person.id, chair);
    const bucket: CandidateBucket = !inPool ? "fora" : sc.total >= CRITERIA.eligibilityThreshold ? "dentro" : "abaixo";
    out.push({ chair, bucket, score: sc.total });
  });
  out.sort((a, b) => b.score - a.score);
  return out;
}

export default function PersonSearchPage() {
  const { chairs, people, hierMap, succession, activePage } = useApp();
  const [search, setSearch] = useState("");
  const [prontidaoFilter, setProntidaoFilter] = useState("");
  const [cidadeFilter, setCidadeFilter] = useState("");
  const [qualFilter, setQualFilter] = useState<"" | "1" | "2">("");
  const [mobilidadeFilter, setMobilidadeFilter] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpanded = (key: string) =>
    setExpanded((cur) => {
      const next = new Set(cur);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const rows = useMemo(() => {
    const out: InterestRow[] = [];
    people.forEach((p) => {
      const s = succession[p.id] || {};
      const cidade = localidadeAtualDe(succession, chairs, p);
      ([1, 2] as const).forEach((qual) => {
        const raw = qual === 1 ? s.prioridade1 : s.prioridade2;
        if (!raw || SEM_INTERESSE.test(normCargo(raw))) return;
        out.push({
          key: `${p.id}-${qual}`,
          person: p,
          qual,
          texto: raw,
          horizonte: qual === 1 ? s.horizonte1 : s.horizonte2,
          mobilidade: s.mobilidade,
          cidade,
        });
      });
    });
    return out.sort((a, b) => a.person.nome.localeCompare(b.person.nome, "pt-BR") || a.qual - b.qual);
  }, [people, succession, chairs]);

  const cidadeOptions = useMemo(
    () => [...new Set(rows.map((r) => r.cidade).filter((c): c is string => !!c))].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [rows]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (q && !r.person.nome.toLowerCase().includes(q)) return false;
      if (prontidaoFilter && r.horizonte !== prontidaoFilter) return false;
      if (cidadeFilter && r.cidade !== cidadeFilter) return false;
      if (qualFilter && String(r.qual) !== qualFilter) return false;
      if (mobilidadeFilter && r.mobilidade !== mobilidadeFilter) return false;
      return true;
    });
  }, [rows, search, prontidaoFilter, cidadeFilter, qualFilter, mobilidadeFilter]);

  return (
    <section className={`page${activePage === "buscar" ? " active" : ""}`}>
      <div className="page-head">
        <div>
          <div className="eyebrow">Mapa sucessório</div>
          <h1>Buscar pessoa</h1>
          <p>
            Todas as pessoas que declararam interesse em alguma posição, com a prontidão, a mobilidade e a cidade
            declaradas. Clique em uma linha para ver a pontuação de aderência calculada para a cadeira correspondente.
          </p>
        </div>
      </div>

      <div className="toolbar">
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
        <select value={mobilidadeFilter} onChange={(ev) => setMobilidadeFilter(ev.target.value)}>
          <option value="">Mobilidade</option>
          {Object.values(MOB_MAP).map((it) => (
            <option key={it.key} value={it.key}>
              {it.label}
            </option>
          ))}
        </select>
        <span className="count">
          {filtered.length} de {rows.length} manifestações
        </span>
      </div>

      <div className="table-wrap">
        <table className="elig">
          <thead>
            <tr>
              <th>Pessoa</th>
              <th>Cargo atual</th>
              <th>Cidade</th>
              <th>Prioridade</th>
              <th>Posição de interesse</th>
              <th>Prontidão declarada</th>
              <th>Mobilidade</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const isOpen = expanded.has(r.key);
              const matches = isOpen ? matchesForRow(r, hierMap, succession, people, chairs) : [];
              return (
                <Fragment key={r.key}>
                  <tr>
                    <td>
                      <b>{r.person.nome}</b>
                    </td>
                    <td>{r.person.cargo}</td>
                    <td>{r.cidade || "—"}</td>
                    <td>Prioridade {r.qual}</td>
                    <td>{r.texto}</td>
                    <td>{r.horizonte && INT_MAP[r.horizonte] ? INT_MAP[r.horizonte].label : "—"}</td>
                    <td>{r.mobilidade && MOB_MAP[r.mobilidade] ? MOB_MAP[r.mobilidade].label : "—"}</td>
                    <td>
                      <button className="cand-toggle" onClick={() => toggleExpanded(r.key)}>
                        {isOpen ? "Ocultar detalhes –" : "Ver detalhes +"}
                      </button>
                    </td>
                  </tr>
                  {isOpen ? (
                    <tr>
                      <td colSpan={8}>
                        {matches.length ? (
                          matches.map((m) => (
                            <div key={r.key + m.chair.id}>
                              {matches.length > 1 ? (
                                <div className="person-match-chair">
                                  Cadeira: {m.chair.cargo}
                                  {m.chair.cidade ? ` · ${m.chair.cidade}` : ""} ·{" "}
                                  {occupantLabel(m.chair) ? `ocupante: ${occupantLabel(m.chair)}` : "vaga"}
                                </div>
                              ) : null}
                              <CandidateCard person={r.person} chair={m.chair} bucket={m.bucket} />
                            </div>
                          ))
                        ) : (
                          <CandidateCard person={r.person} chair={cadeiraVirtual(r.texto)} bucket="fora" interestCargo={r.texto} />
                        )}
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", color: "var(--muted)" }}>
                  Nenhuma manifestação encontrada com esse filtro.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
