"use client";

import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap } from "leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/lib/context";
import { CITY_COORDS, coordsFor } from "@/lib/geo";
import { successorsFor } from "@/lib/scoring";
import type { Chair } from "@/lib/types";

interface CityStat {
  cidade: string;
  lat: number;
  lng: number;
  total: number;
  cobertura: number; // 0-100, % de cadeiras com 2+ sucessores mapeados
}

export default function MapPage() {
  const { activePage, chairs, hierMap, succession, people, openCity } = useApp();
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const [tilesFailed, setTilesFailed] = useState(false);

  const cityStats = useMemo<CityStat[]>(() => {
    const byCity = new Map<string, Chair[]>();
    chairs.forEach((c) => {
      if (!byCity.has(c.cidade)) byCity.set(c.cidade, []);
      byCity.get(c.cidade)!.push(c);
    });
    const stats: CityStat[] = [];
    byCity.forEach((cityChairs, cidade) => {
      const coords = coordsFor(cidade);
      if (!coords) return;
      const comSucessor = cityChairs.filter(
        (c) => successorsFor(hierMap, succession, people, chairs, c).length >= 2
      ).length;
      stats.push({
        cidade,
        lat: coords.lat,
        lng: coords.lng,
        total: cityChairs.length,
        cobertura: Math.round((comSucessor / cityChairs.length) * 100),
      });
    });
    return stats.sort((a, b) => b.total - a.total);
  }, [chairs, hierMap, succession, people]);

  useEffect(() => {
    if (activePage !== "mapa" || !mapDivRef.current || mapRef.current) return;
    let cancelled = false;

    (async () => {
      try {
        const L = (await import("leaflet")).default;
        if (cancelled || !mapDivRef.current || mapRef.current) return;

        // Visão estática: sem arrastar/pan pelo cursor ou teclado, para o mapa não
        // "andar" para fora da área enquadrada — zoom pelos botões continua ativo.
        const map = L.map(mapDivRef.current, {
          zoomControl: false,
          dragging: false,
          touchZoom: false,
          keyboard: false,
        }).setView([-23.05, -47.45], 10);
        mapRef.current = map;

        const tiles = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 18,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map);
        const failTimer = setTimeout(() => setTilesFailed(true), 4000);
        tiles.on("load", () => clearTimeout(failTimer));

        L.control.zoom({ position: "bottomright" }).addTo(map);

        cityStats.forEach((s) => {
          // Raio contido (máx. ~17px) para não engolir rótulos e estradas vizinhas
          // do próprio mapa de fundo — as cidades cadastradas ficam bem próximas
          // umas das outras nesta região.
          const radius = 6 + Math.min(s.total, 40) * 0.22;
          const color = s.cobertura >= 60 ? "#1f8a5c" : s.cobertura >= 30 ? "#c9930f" : "#c0392b";
          const marker = L.circleMarker([s.lat, s.lng], {
            radius,
            weight: 2,
            color: "#ffffff",
            fillColor: color,
            fillOpacity: 0.9,
          }).addTo(map);

          marker.bindTooltip(`<b>${s.cidade}</b><br>${s.total} posições · ${s.cobertura}% cobertas`, {
            direction: "top",
            offset: [0, -radius],
          });

          marker.on("mouseover", () => {
            marker.bringToFront();
            marker.setStyle({ weight: 3.5 }).setRadius(radius * 1.12);
          });
          marker.on("mouseout", () => marker.setStyle({ weight: 2 }).setRadius(radius));
          marker.on("click", () => openCity(s.cidade));
        });
      } catch (err) {
        console.error("Mapa Leaflet não pôde ser inicializado:", err);
        setTilesFailed(true);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- o mapa Leaflet é criado uma única vez; cityStats muda com dados carregados, mas remontar o mapa a cada mudança destruiria o estado de zoom/pan do usuário
  }, [activePage]);

  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  const totalPosicoes = chairs.length;
  const mediaCobertura = cityStats.length
    ? Math.round(cityStats.reduce((acc, s) => acc + s.cobertura * s.total, 0) / totalPosicoes)
    : 0;

  return (
    <section className={`page${activePage === "mapa" ? " active" : ""}`}>
      <div className="page-head">
        <div>
          <div className="eyebrow">Mapa sucessório · Geografia</div>
          <h1>Mapa de Cidades</h1>
          <p>
            Todas as {CITY_COORDS && Object.keys(CITY_COORDS).length} localidades com posições cadastradas. Clique em
            uma cidade para ver as cadeiras, pessoas e sucessores dessa localidade.
          </p>
        </div>
      </div>

      <div className="kpis">
        <div className="kpi">
          <div className="kpi-label">Localidades</div>
          <div className="kpi-value">{cityStats.length}</div>
          <div className="kpi-sub">com posições mapeadas</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Posições totais</div>
          <div className="kpi-value">{totalPosicoes}</div>
          <div className="kpi-sub">em todas as cidades</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Cobertura média</div>
          <div className="kpi-value">{mediaCobertura}%</div>
          <div className="kpi-sub">cadeiras com 2+ sucessores</div>
        </div>
      </div>

      <div className="city-map-wrap">
        <div ref={mapDivRef} className="city-map"></div>
        {tilesFailed ? (
          <div className="city-map-notice">
            Os marcadores das cidades estão corretos; se o mapa de fundo não carregar, verifique a conexão com
            openstreetmap.org.
          </div>
        ) : null}
      </div>
      <div className="coverage-legend city-map-legend">
        <div className="cl-item">
          <i className="seg-hi"></i>
          <span>60% ou mais de cobertura</span>
        </div>
        <div className="cl-item">
          <i className="seg-mid"></i>
          <span>30% a 59%</span>
        </div>
        <div className="cl-item">
          <i className="seg-low"></i>
          <span>Menos de 30%</span>
        </div>
      </div>
    </section>
  );
}
