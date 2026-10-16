"use client";

import { useMemo, useState } from "react";
import CandidateCard from "./CandidateCard";
import { useApp } from "@/lib/context";
import { cadeiraVirtual, prioridadeSemCadeira } from "@/lib/scoring";

interface Row {
  key: string;
  personId: string;
  nome: string;
  declarado: string;
}

const EH_CONSELHO = /conselh/i;

export default function OtherInterestsPage() {
  const { chairs, people, succession, activePage } = useApp();
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    const out: Row[] = [];
    people.forEach((p) => {
      const s = succession[p.id] || {};
      ([1, 2] as const).forEach((qual) => {
        const raw = qual === 1 ? s.prioridade1 : s.prioridade2;
        if (!raw) return;
        if (EH_CONSELHO.test(raw)) return; // vai para a aba Conselho
        if (prioridadeSemCadeira(succession, chairs, p.id, qual)) {
          out.push({ key: `${p.id}-${qual}`, personId: p.id, nome: p.nome, declarado: raw });
        }
      });
    });
    return out.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [people, chairs, succession]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.nome.toLowerCase().includes(q) || r.declarado.toLowerCase().includes(q));
  }, [rows, search]);

  return (
    <section className={`page${activePage === "outros" ? " active" : ""}`}>
      <div className="page-head">
        <div>
          <div className="eyebrow">Mapa sucessório</div>
          <h1>Outros interesses</h1>
          <p>
            Prioridades de interesse declaradas no questionário que não correspondem a nenhuma cadeira do mapa —
            cargo com nome diferente, nível inexistente para aquele cargo, ou uma posição realmente nova.
          </p>
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
