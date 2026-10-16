"use client";

import { useMemo, useState } from "react";
import CandidateCard from "./CandidateCard";
import { useApp } from "@/lib/context";
import { cadeiraVirtual } from "@/lib/scoring";

interface Row {
  key: string;
  personId: string;
  nome: string;
  declarado: string;
}

const EH_CONSELHO = /conselh/i;

export default function ConselhoPage() {
  const { people, succession, activePage } = useApp();
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    const out: Row[] = [];
    people.forEach((p) => {
      const s = succession[p.id] || {};
      ([1, 2] as const).forEach((qual) => {
        const raw = qual === 1 ? s.prioridade1 : s.prioridade2;
        if (!raw || !EH_CONSELHO.test(raw)) return;
        out.push({ key: `${p.id}-${qual}`, personId: p.id, nome: p.nome, declarado: raw });
      });
    });
    return out.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [people, succession]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.nome.toLowerCase().includes(q) || r.declarado.toLowerCase().includes(q));
  }, [rows, search]);

  return (
    <section className={`page${activePage === "conselho" ? " active" : ""}`}>
      <div className="page-head">
        <div>
          <div className="eyebrow">Mapa sucessório</div>
          <h1>Conselho</h1>
          <p>Pessoas que declararam interesse em uma posição de Conselho (Conselheiro, Conselho Vogal, Presidente do Conselho) — fora da hierarquia operacional do mapa.</p>
        </div>
      </div>

      <div className="toolbar">
        <input
          type="search"
          placeholder="Buscar por nome ou posição declarada…"
          value={search}
          onChange={(ev) => setSearch(ev.target.value)}
        />
        <span className="count">{filtered.length} de {rows.length} manifestações</span>
      </div>

      <div className="modal-sections" style={{ padding: 0, maxHeight: "none" }}>
        {filtered.map((r) => (
          <CandidateCard key={r.key} person={people.find((p) => p.id === r.personId)!} chair={cadeiraVirtual(r.declarado)} bucket="fora" />
        ))}
        {filtered.length === 0 ? <div className="modal-empty">Nenhuma manifestação encontrada.</div> : null}
      </div>
    </section>
  );
}
