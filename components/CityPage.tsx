"use client";

import { useMemo, useState } from "react";
import ChairCard from "./ChairCard";
import { useApp } from "@/lib/context";
import { LEVEL_GROUPS, LEVEL_LABELS } from "@/lib/data";
import { fmtDateTime } from "@/lib/format";
import { successorsFor } from "@/lib/scoring";

export default function CityPage() {
  const { activePage, activeCity, closeCity, cityLevelFilter, toggleCityLevelFilter, chairs, hierMap, succession, people, baseUpdatedAt } =
    useApp();
  const [search, setSearch] = useState("");

  const cityChairs = useMemo(
    () => chairs.filter((c) => c.cidade === activeCity),
    [chairs, activeCity]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const allowedLevels = cityLevelFilter ? LEVEL_GROUPS[cityLevelFilter] : null;
    return cityChairs.filter((c) => {
      if (allowedLevels && !allowedLevels.includes(c.nivel)) return false;
      if (q && !c.nome.toLowerCase().includes(q) && !c.cargo.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [cityChairs, cityLevelFilter, search]);

  const { pct2, pct1, pct0, bucket2, bucket1, bucket0 } = useMemo(() => {
    let b2 = 0,
      b1 = 0,
      b0 = 0;
    cityChairs.forEach((c) => {
      const n = successorsFor(hierMap, succession, people, chairs, c).length;
      if (n >= 2) b2++;
      else if (n === 1) b1++;
      else b0++;
    });
    const total = cityChairs.length || 1;
    const p2 = Math.round((b2 / total) * 100);
    const p1 = Math.round((b1 / total) * 100);
    const p0 = 100 - p2 - p1;
    return { pct2: p2, pct1: p1, pct0: p0, bucket2: b2, bucket1: b1, bucket0: b0 };
  }, [cityChairs, hierMap, succession, people, chairs]);

  if (!activeCity) {
    return <section className={`page${activePage === "cidade" ? " active" : ""}`}></section>;
  }

  return (
    <section className={`page${activePage === "cidade" ? " active" : ""}`}>
      <button className="city-back-link" onClick={closeCity}>
        ← Voltar ao mapa
      </button>
      <div className="page-head">
        <div>
          <div className="eyebrow">Mapa sucessório · Por cidade</div>
          <h1>{activeCity}</h1>
          <p>Todas as posições cadastradas nesta cidade.</p>
        </div>
        <div className="freshness">
          <span>Atualização da base</span>
          <b>{baseUpdatedAt ? fmtDateTime(baseUpdatedAt) : ""}</b>
        </div>
      </div>

      <div className="kpis">
        <div className="kpi">
          <div className="kpi-label">Posições</div>
          <div className="kpi-value">{filtered.length}</div>
          <div className="kpi-sub">posições exibidas</div>
        </div>
        <div className="kpi coverage-kpi">
          <div className="kpi-label">Cobertura sucessória</div>
          <div className="coverage-bar">
            {pct2 > 0 ? (
              <span className="seg-hi" style={{ width: `${pct2}%` }}>
                {pct2}% ({bucket2})
              </span>
            ) : null}
            {pct1 > 0 ? (
              <span className="seg-mid" style={{ width: `${pct1}%` }}>
                {pct1}% ({bucket1})
              </span>
            ) : null}
            {pct0 > 0 ? (
              <span className="seg-low" style={{ width: `${pct0}%` }}>
                {pct0}% ({bucket0})
              </span>
            ) : null}
          </div>
          <div className="coverage-legend">
            <div className="cl-item">
              <i className="seg-hi"></i>
              <span>2 ou mais sucessores</span>
            </div>
            <div className="cl-item">
              <i className="seg-mid"></i>
              <span>1 sucessor</span>
            </div>
            <div className="cl-item">
              <i className="seg-low"></i>
              <span>sem sucessor</span>
            </div>
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Total de posições</div>
          <div className="kpi-value">{cityChairs.length}</div>
          <div className="kpi-sub">cadastradas nesta cidade</div>
        </div>
      </div>

      <div className="toolbar">
        <input
          type="search"
          placeholder="Buscar por nome ou cargo…"
          value={search}
          onChange={(ev) => setSearch(ev.target.value)}
        />
        {cityLevelFilter ? (
          <button className="level-chip" onClick={() => toggleCityLevelFilter(cityLevelFilter)}>
            {LEVEL_LABELS[cityLevelFilter]}
          </button>
        ) : null}
        <span className="count">
          {filtered.length} de {cityChairs.length} cadeiras
        </span>
      </div>

      <div className="chair-grid">
        {filtered.length ? (
          filtered.map((c) => <ChairCard key={c.id} chair={c} />)
        ) : (
          <p style={{ color: "var(--muted)", fontSize: "13px" }}>Nenhuma cadeira encontrada com esse filtro.</p>
        )}
      </div>
    </section>
  );
}
