"use client";

import { useApp } from "@/lib/context";
import type { ChangeEvent } from "react";

export default function TopBar() {
  const { downloadBase, uploadBase, resetBase } = useApp();

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

  function handleReset() {
    if (window.confirm("Isso apaga a base salva neste navegador e volta ao ponto de partida (sem sucessores preenchidos). Baixe a base atual antes, se quiser manter uma cópia. Continuar?")) {
      resetBase();
    }
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
        <span>Mapa Sucessório</span>
      </div>
      <div className="top-actions">
        <button className="action" title="Alternar tela cheia" onClick={toggleFullscreen}>
          <svg viewBox="0 0 24 24">
            <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"></path>
          </svg>
          Tela cheia
        </button>
        <button className="action" title="Imprimir ou salvar como PDF a visão atual do dashboard" onClick={handlePrint}>
          <svg viewBox="0 0 24 24">
            <path d="M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-2M6 14h12v7H6z"></path>
          </svg>
          Imprimir / Salvar PDF
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
        <button className="action" title="Apagar a base salva neste navegador e voltar ao ponto de partida" onClick={handleReset}>
          <svg viewBox="0 0 24 24">
            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
          </svg>
          Limpar dados salvos
        </button>
      </div>
    </header>
  );
}
