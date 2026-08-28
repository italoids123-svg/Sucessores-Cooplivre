"use client";

import { useApp } from "@/lib/context";
import type { ChangeEvent } from "react";

export default function TopBar() {
  const { downloadBase, uploadBase } = useApp();

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  }

  function handlePrint() {
    window.print();
  }

  async function handleFileChange(ev: ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    if (!file) return;
    await uploadBase(file);
    ev.target.value = "";
  }

  return (
    <header className="top">
      <div className="brand">
        <b>Cooplivre</b>
        <span>Mapa Sucessório · Ciclo 2027–2030</span>
      </div>
      <div className="top-actions">
        <button className="action" title="Alternar tela cheia" onClick={toggleFullscreen}>
          <svg viewBox="0 0 24 24">
            <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"></path>
          </svg>
          Tela cheia
        </button>
        <button className="action" title="Salvar/imprimir" onClick={handlePrint}>
          <svg viewBox="0 0 24 24">
            <path d="M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-2M6 14h12v7H6z"></path>
          </svg>
          Salvar dashboard
        </button>
        <button className="action" title="Baixar base para atualização" onClick={downloadBase}>
          <svg viewBox="0 0 24 24">
            <path d="M12 4v12m0 0 5-5m-5 5-5-5M4 20h16"></path>
          </svg>
          Baixar base para coleta
        </button>
        <label className="action primary" title="Carregar a base preenchida">
          <svg viewBox="0 0 24 24">
            <path d="M12 16V4m0 0L7 9m5-5 5 5M4 20h16"></path>
          </svg>
          Carregar base preenchida
          <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} />
        </label>
      </div>
    </header>
  );
}
