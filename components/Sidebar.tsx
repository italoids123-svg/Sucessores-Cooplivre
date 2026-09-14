"use client";

import { useApp } from "@/lib/context";
import { LEVEL_LABELS } from "@/lib/data";
import type { NavPage, PageKey } from "@/lib/types";

const MAP_ITEMS: { key: PageKey; label: string }[] = [
  { key: "directors", label: LEVEL_LABELS.directors },
  { key: "executive", label: LEVEL_LABELS.executive },
  { key: "management", label: LEVEL_LABELS.management },
  { key: "coordenacao", label: LEVEL_LABELS.coordenacao },
  { key: "especialista", label: LEVEL_LABELS.especialista },
  { key: "analista", label: LEVEL_LABELS.analista },
];

const METHOD_ITEMS: { key: NavPage; label: string }[] = [
  { key: "eligibility", label: "Elegibilidade e Aderência" },
  { key: "questionnaire", label: "Questionário" },
  { key: "criteria", label: "Critérios" },
];

export default function Sidebar() {
  const { activePage, setActivePage, cityLevelFilter, toggleCityLevelFilter } = useApp();

  return (
    <aside className="sidebar">
      <div className="side-kicker">Navegação</div>
      <div className="nav-group">
        <div className="nav-group-title">Mapa Sucessório</div>
        {MAP_ITEMS.map((item) => {
          const onCity = activePage === "cidade";
          const active = onCity ? cityLevelFilter === item.key : activePage === item.key;
          return (
            <button
              key={item.key}
              className={`nav-btn${active ? " active" : ""}`}
              onClick={() => (onCity ? toggleCityLevelFilter(item.key) : setActivePage(item.key))}
            >
              <i></i>
              {item.label}
            </button>
          );
        })}
      </div>
      <div className="nav-group">
        <div className="nav-group-title">Geografia</div>
        <button
          className={`nav-btn${activePage === "mapa" ? " active" : ""}`}
          onClick={() => setActivePage("mapa")}
        >
          <i></i>
          Mapa de Cidades
        </button>
      </div>
      <div className="nav-group">
        <div className="nav-group-title">Metodologia</div>
        {METHOD_ITEMS.map((item) => (
          <button
            key={item.key}
            className={`nav-btn${activePage === item.key ? " active" : ""}`}
            onClick={() => setActivePage(item.key)}
          >
            <i></i>
            {item.label}
          </button>
        ))}
      </div>
      <div className="side-note">
        <b>Visibilidade híbrida</b>
        Cobertura e pontuação agregada por cadeira ficam abertas. A indicação nominal de sucessor é de uso restrito a
        diretoria e RH.
      </div>
    </aside>
  );
}
