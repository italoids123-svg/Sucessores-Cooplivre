"use client";

import LevelPage from "./LevelPage";
import { useApp } from "@/lib/context";

// A key baseada em dataVersion força a remontagem das três páginas de nível
// quando uma base é recarregada, zerando busca/filtro — equivalente ao
// resetAndDraw() do dashboard original.
export default function LevelPages() {
  const { dataVersion } = useApp();
  return (
    <>
      <LevelPage key={`directors-${dataVersion}`} pageKey="directors" />
      <LevelPage key={`executive-${dataVersion}`} pageKey="executive" />
      <LevelPage key={`management-${dataVersion}`} pageKey="management" />
      <LevelPage key={`coordenacao-${dataVersion}`} pageKey="coordenacao" />
    </>
  );
}
