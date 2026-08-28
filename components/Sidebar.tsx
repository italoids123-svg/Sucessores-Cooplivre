"use client";

import { useApp } from "@/lib/context";
import type { NavPage } from "@/lib/types";

const MAP_ITEMS: { key: NavPage; label: string }[] = [
  { key: "directors", label: "Diretoria" },
  { key: "executive", label: "Gerência Executiva" },
  { key: "management", label: "Gerência" },
];

const METHOD_ITEMS: { key: NavPage; label: string }[] = [
  { key: "eligibility", label: "Elegibilidade e Aderência" },
  { key: "questionnaire", label: "Questionário" },
  { key: "criteria", label: "Critérios" },
];

export default function Sidebar() {
  const { activePage, setActivePage } = useApp();

  return (
    <aside className="sidebar">
      <div className="side-kicker">Navegação</div>
      <div className="nav-group">
        <div className="nav-group-title">Mapa Sucessório</div>
        {MAP_ITEMS.map((item) => (
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
