import type { Mobilidade } from "./types";

// Sede administrativa da Cooplivre — referência para a opção de mobilidade "Sede".
export const SEDE_CIDADE = "Capivari";

// Latitude/longitude das localidades usadas nas cadeiras do mapa (fonte: cadastro
// de agências da análise de cobertura de rede da Cooplivre). Usado só para estimar
// distância — não é uma base de endereços completa.
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  capivari: { lat: -22.995144, lng: -47.50715 },
  "porto feliz": { lat: -23.209299, lng: -47.525101 },
  tiete: { lat: -23.1019, lng: -47.714 },
  salto: { lat: -23.2008, lng: -47.2868 },
  cerquilho: { lat: -23.166487, lng: -47.745862 },
  boituva: { lat: -23.285, lng: -47.678 },
  jumirim: { lat: -22.989, lng: -47.974 },
  "cesario lange": { lat: -23.226035, lng: -47.954453 },
  cabreuva: { lat: -23.3075, lng: -47.1325 },
  louveira: { lat: -23.0864, lng: -46.948 },
  "monte mor": { lat: -22.9467, lng: -47.3158 },
  indaiatuba: { lat: -23.0978, lng: -47.2181 },
  "elias fausto": { lat: -23.0425, lng: -47.3733 },
  valinhos: { lat: -22.9706, lng: -46.995 },
  itupeva: { lat: -23.1531, lng: -47.057 },
  vinhedo: { lat: -23.0296, lng: -46.9753 },
  porangaba: { lat: -23.1783, lng: -48.1236 },
  pereiras: { lat: -23.0808, lng: -47.85 },
  mombuca: { lat: -22.9292, lng: -47.5531 },
  rafard: { lat: -22.8589, lng: -47.5231 },
};

// Nomes de exibição das localidades com coordenada cadastrada (mesma grafia usada
// nas cadeiras do mapa) — referência para a planilha de importação/exportação.
export const CIDADES_CONHECIDAS = [
  "Capivari",
  "Porto Feliz",
  "Tietê",
  "Salto",
  "Cerquilho",
  "Boituva",
  "Jumirim",
  "Cesário Lange",
  "Cabreúva",
  "Louveira",
  "Monte Mor",
  "Indaiatuba",
  "Elias Fausto",
  "Valinhos",
  "Itupeva",
  "Vinhedo",
  "Porangaba",
  "Pereiras",
  "Mombuca",
  "Rafard",
];

export function normalizeCidade(s?: string | null): string {
  return (s || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

// Distância rodoviária estimada em km entre duas localidades: linha reta (Haversine)
// × 1,20, mesma metodologia usada na análise de cobertura de rede da Cooplivre.
// Retorna null quando alguma das cidades não está no cadastro de coordenadas —
// nesse caso quem chama deve tratar como "não é possível verificar a distância",
// não como "está fora do alcance".
export function roadDistanceKm(cidadeA?: string | null, cidadeB?: string | null): number | null {
  const a = CITY_COORDS[normalizeCidade(cidadeA)];
  const b = CITY_COORDS[normalizeCidade(cidadeB)];
  if (!a || !b) return null;
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  const straight = 2 * R * Math.asin(Math.sqrt(s));
  return Math.round(straight * 1.2 * 10) / 10;
}

// A resposta de mobilidade do questionário de interesse define até onde a pessoa
// aceita se mover a partir da sua localidade atual — cada opção é avaliada de
// forma independente, sem exceção automática para "já estou nessa cidade":
//   - "Local atual"  → só a própria cidade.
//   - "Sede"         → só a sede administrativa (Capivari), mesmo que a
//                       localidade atual da pessoa seja outra.
//   - "Raio de 40 km"→ distância rodoviária estimada até 40 km.
//   - "Qualquer unidade" → qualquer cidade.
// Quando a origem/destino não é reconhecida ou a mobilidade ainda não foi
// respondida, a checagem é permissiva (não bloqueia) — a ausência de dado geográfico
// não deve, por si só, esconder alguém que já é elegível por nível.
export function mobilidadeAlcancaCidade(cidadeOrigem: string | null, cidadeDestino: string | null, mobilidade: Mobilidade | undefined): boolean {
  if (!cidadeOrigem || !cidadeDestino) return true;
  if (!mobilidade) return true;
  if (mobilidade === "qualquer") return true;
  if (mobilidade === "local") return normalizeCidade(cidadeOrigem) === normalizeCidade(cidadeDestino);
  if (mobilidade === "sede") return normalizeCidade(cidadeDestino) === normalizeCidade(SEDE_CIDADE);
  if (mobilidade === "raio40") {
    const km = roadDistanceKm(cidadeOrigem, cidadeDestino);
    return km === null ? true : km <= 40;
  }
  return true;
}
