"use client";

import { useMemo, useState } from "react";
import CandidateCard, { type CandidateBucket } from "./CandidateCard";
import { useApp } from "@/lib/context";
import { CRITERIA } from "@/lib/criteria";
import {
  INT_MAP,
  cadeiraVirtual,
  feederPoolFor,
  interestMatch,
  localidadeAtualDe,
  normCargo,
  occupantLabel,
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

interface InterestRow {
  key: string;
  person: Person;
  qual: 1 | 2;
  texto: string;
  horizonte: Horizonte | undefined;
  cidade: string | null;
  categoria: Categoria;
}

// "Não tenho interesse em uma segunda posição" e variantes — não é uma posição
// declarada, não deve virar uma linha na lista.
const SEM_INTERESSE = /^nao tenho interesse/;

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

// Cadeiras reais cujo cargo corresponde ao texto declarado nessa prioridade —
// mesma checagem de matchesForRow, mas sem o custo da pontuação (usada só
// para classificar a linha num dos filtros de posição).
function cadeirasDoTexto(person: Person, qual: 1 | 2, succession: SuccessionMap, chairs: Chair[]): Chair[] {
  return chairs.filter((c) => interestMatch(succession, person, normCargo(c.cargo)) === qual);
}

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
  const [categoriaFilter, setCategoriaFilter] = useState<"" | Categoria>("");

  const rows = useMemo(() => {
    const out: InterestRow[] = [];
    people.forEach((p) => {
      const s = succession[p.id] || {};
      const cidade = localidadeAtualDe(succession, chairs, p);
      ([1, 2] as const).forEach((qual) => {
        const raw = qual === 1 ? s.prioridade1 : s.prioridade2;
        if (!raw || SEM_INTERESSE.test(normCargo(raw))) return;
        const cadeiras = cadeirasDoTexto(p, qual, succession, chairs);
        out.push({
          key: `${p.id}-${qual}`,
          person: p,
          qual,
          texto: raw,
          horizonte: qual === 1 ? s.horizonte1 : s.horizonte2,
          cidade,
          categoria: cadeiras.length ? categoriaDaCadeira(cadeiras[0]) : "demais_interesses",
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
          <p>
            Todas as pessoas que declararam interesse em alguma posição, com a prontidão e a cidade declaradas.
            Clique em &quot;Ver detalhes&quot; para ver a pontuação de aderência calculada para a cadeira correspondente.
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
        <select value={categoriaFilter} onChange={(ev) => setCategoriaFilter(ev.target.value as "" | Categoria)}>
          <option value="">Posição de cargo</option>
          {CATEGORIAS.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
        <span className="count">
          {filtered.length} de {rows.length} manifestações
        </span>
      </div>

      <div className="modal-sections" style={{ padding: 0, maxHeight: "none" }}>
        {filtered.map((r) => {
          const matches = matchesForRow(r, hierMap, succession, people, chairs);
          if (!matches.length) {
            return (
              <CandidateCard
                key={r.key}
                person={r.person}
                chair={cadeiraVirtual(r.texto)}
                bucket="fora"
                interestCargo={r.texto}
              />
            );
          }
          return matches.map((m) => (
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
          ));
        })}
        {filtered.length === 0 ? <div className="modal-empty">Nenhuma manifestação encontrada com esse filtro.</div> : null}
      </div>
    </section>
  );
}
