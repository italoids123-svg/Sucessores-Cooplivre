"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/lib/context";
import { prioridadeSemCadeira } from "@/lib/scoring";

interface Row {
  key: string;
  nome: string;
  nivel: string;
  cargoAtual: string;
  qual: 1 | 2;
  declarado: string;
}

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
        if (prioridadeSemCadeira(succession, chairs, p.id, qual)) {
          out.push({ key: `${p.id}-${qual}`, nome: p.nome, nivel: p.nivel, cargoAtual: p.cargo, qual, declarado: raw });
        }
      });
    });
    return out.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [people, chairs, succession]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) => r.nome.toLowerCase().includes(q) || r.cargoAtual.toLowerCase().includes(q) || r.declarado.toLowerCase().includes(q)
    );
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
          placeholder="Buscar por nome, cargo atual ou posição declarada…"
          value={search}
          onChange={(ev) => setSearch(ev.target.value)}
        />
        <span className="count">{filtered.length} de {rows.length} manifestações</span>
      </div>

      <div className="table-wrap">
        <table className="elig">
          <thead>
            <tr>
              <th>Pessoa</th>
              <th>Nível atual</th>
              <th>Cargo atual</th>
              <th>Prioridade</th>
              <th>Posição declarada</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.key}>
                <td>
                  <b>{r.nome}</b>
                </td>
                <td>{r.nivel}</td>
                <td>{r.cargoAtual}</td>
                <td>{r.qual}ª</td>
                <td>{r.declarado}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
