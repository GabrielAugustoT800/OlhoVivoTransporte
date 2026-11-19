// Serviço de rota a pé (da localização do usuário até uma parada).
// Usa o servidor público do OSRM com perfil de caminhada (sem chave de API).
// Se o serviço falhar, devolve uma linha reta com distância e tempo estimados,
// para o mapa nunca ficar sem caminho.

import axios from 'axios';
import { distanciaMetros } from '../data/gtfsRepository';

export interface Coordenada {
  latitude: number;
  longitude: number;
}

export interface RotaAPe {
  coordenadas: Coordenada[];
  distanciaMetros: number;
  duracaoSegundos: number;
  // true quando é só a linha reta (o serviço de rotas não respondeu)
  aproximada: boolean;
}

const OSRM_URL = 'https://routing.openstreetmap.de/routed-foot/route/v1/foot';
// Velocidade média a pé: 5 km/h ≈ 83 m/min
const VELOCIDADE_A_PE_M_S = 5000 / 3600;

function linhaReta(origem: Coordenada, destino: Coordenada): RotaAPe {
  const dist = distanciaMetros(origem.latitude, origem.longitude, destino.latitude, destino.longitude);
  return {
    coordenadas: [origem, destino],
    distanciaMetros: dist,
    duracaoSegundos: dist / VELOCIDADE_A_PE_M_S,
    aproximada: true,
  };
}

/**
 * Calcula o caminho a pé entre dois pontos.
 * @param origem - Localização atual do usuário
 * @param destino - Coordenada da parada
 * @param signal - Permite cancelar a requisição ao fechar o mapa
 */
export async function buscarRotaAPe(origem: Coordenada, destino: Coordenada, signal?: AbortSignal): Promise<RotaAPe> {
  // Atenção: o OSRM recebe LONGITUDE,LATITUDE (nessa ordem)
  const url =
    `${OSRM_URL}/${origem.longitude},${origem.latitude};${destino.longitude},${destino.latitude}` +
    '?overview=full&geometries=geojson';

  try {
    const { data } = await axios.get(url, { timeout: 8000, signal });
    const rota = data?.routes?.[0];
    const pontos: [number, number][] = rota?.geometry?.coordinates ?? [];
    if (data?.code !== 'Ok' || pontos.length < 2) return linhaReta(origem, destino);

    return {
      // GeoJSON vem como [lon, lat]; o mapa usa { latitude, longitude }
      coordenadas: pontos.map(([lon, lat]) => ({ latitude: lat, longitude: lon })),
      distanciaMetros: Number(rota.distance) || 0,
      duracaoSegundos: Number(rota.duration) || 0,
      aproximada: false,
    };
  } catch (error) {
    if (axios.isCancel(error)) throw error;
    if (__DEV__) console.warn('[rota a pé] serviço indisponível, usando linha reta:', error);
    return linhaReta(origem, destino);
  }
}

/** Formata distância: "350 m" ou "1,2 km" */
export function formatarDistancia(metros: number): string {
  return metros < 1000 ? `${Math.round(metros)} m` : `${(metros / 1000).toFixed(1).replace('.', ',')} km`;
}

/** Formata duração em minutos: "menos de 1 min" ou "7 min" */
export function formatarDuracao(segundos: number): string {
  const min = Math.round(segundos / 60);
  return min < 1 ? 'menos de 1 min' : `${min} min`;
}
