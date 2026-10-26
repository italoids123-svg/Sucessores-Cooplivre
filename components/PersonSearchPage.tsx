"use client";

import { useMemo, useState } from "react";
import CandidateCard, { type CandidateBucket } from "./CandidateCard";
import { useApp } from "@/lib/context";
import { CRITERIA } from "@/lib/criteria";
import { cadeiraVirtual, feederPoolFor, interestMatch, normCargo, scoreForChair } from "@/lib/scoring";
import type { Chair } from "@/lib/types";

interface PriorityGroup {
  qual: 1 | 2;
  texto: string;
  matches: { chair: Chair; bucket: CandidateBucket; score: number }[];
}

// "Não tenho interesse em uma segunda posição" e variantes — não é uma posição
// declarada, não deve virar um grupo de prioridade na busca.
const SEM_INTERESSE = /^nao tenho interesse/;

export default function PersonSearchPage() {
  const { chairs, people, hierMap, succession, activePage } = useApp();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return people
      .filter((p) => p.nome.toLowerCase().includes(q))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
      .slice(0, 30);
  }, [people, search]);

  const selected = selectedId ? people.find((p) => p.id === selectedId) || null : null;

  const priorityGroups = useMemo<PriorityGroup[]>(() => {
    if (!selected) return [];
    const s = succession[selected.id] || {};
    const groups: PriorityGroup[] = [];
    ([1, 2] as const).forEach((qual) => {
      const raw = qual === 1 ? s.prioridade1 : s.prioridade2;
      if (!raw || SEM_INTERESSE.test(normCargo(raw))) return;
      const matches: PriorityGroup["matches"] = [];
      chairs.forEach((chair) => {
        if (interestMatch(succession, selected, normCargo(chair.cargo)) !== qual) return;
        const inPool = feederPoolFor(hierMap, succession, people, chairs, chair).some((p) => p.id === selected.id);
        const sc = scoreForChair(succession, people, selected.id, chair);
        const bucket: CandidateBucket = !inPool ? "fora" : sc.total >= CRITERIA.eligibilityThreshold ? "dentro" : "abaixo";
        matches.push({ chair, bucket, score: sc.total });
      });
      matches.sort((a, b) => b.score - a.score);
      groups.push({ qual, texto: raw, matches });
    });
    return groups;
  }, [selected, succession, chairs, hierMap, people]);

  return (
    <section className={`page${activePage === "buscar" ? " active" : ""}`}>
      <div className="page-head">
        <div>
          <div className="eyebrow">Mapa sucessório</div>
          <h1>Buscar pessoa</h1>
          <p>
            Encontre uma pessoa pelo nome e veja as posições de interesse que ela declarou, com a pontuação de
            aderência calculada para cada cadeira correspondente.
          </p>
        </div>
      </div>

      <div className="toolbar">
        <input
          type="search"
          placeholder="Buscar por nome…"
          value={search}
          onChange={(ev) => {
            setSearch(ev.target.value);
            setSelectedId(null);
          }}
        />
        {search ? (
          <span className="count">
            {results.length} pessoa{results.length === 1 ? "" : "s"} encontrada{results.length === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>

      {!selected ? (
        <div className="person-results">
          {results.map((p) => (
            <button key={p.id} className="person-result" onClick={() => setSelectedId(p.id)}>
              <span className="person-result-name">{p.nome}</span>
              <span className="person-result-sub">
                {p.cargo} · {p.nivel}
              </span>
            </button>
          ))}
          {search && results.length === 0 ? <div className="modal-empty">Nenhuma pessoa encontrada com esse nome.</div> : null}
          {!search ? <div className="modal-empty">Digite um nome para buscar.</div> : null}
        </div>
      ) : (
        <div>
          <button className="back-link" onClick={() => setSelectedId(null)}>
            ← Voltar à busca
          </button>
          <div className="person-profile-head">
            <h2>{selected.nome}</h2>
            <div className="cand-sub">
              {selected.cargo} · {selected.nivel}
            </div>
          </div>
          {priorityGroups.length === 0 ? (
            <div className="modal-empty">Essa pessoa não declarou nenhuma posição de interesse no questionário.</div>
          ) : (
            priorityGroups.map((g) => (
              <div key={g.qual} className="modal-section">
                <h4>
                  Prioridade {g.qual} · {g.texto}
                </h4>
                {g.matches.length ? (
                  g.matches.map((m) => (
                    <CandidateCard key={selected.id + m.chair.id} person={selected} chair={m.chair} bucket={m.bucket} />
                  ))
                ) : (
                  <CandidateCard person={selected} chair={cadeiraVirtual(g.texto)} bucket="fora" interestCargo={g.texto} />
                )}
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
}
