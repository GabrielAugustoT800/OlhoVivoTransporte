// Plano C de previsões: quando a SPTrans não envia previsões (resposta "ps": []),
// estima a chegada nas paradas a partir da POSIÇÃO REAL dos ônibus e do trajeto da
// linha no GTFS local (assets/gtfs).
//
// Como funciona:
// 1. Pega o trajeto (shape) e as paradas da linha naquele sentido no GTFS.
// 2. "Projeta" cada parada e cada ônibus no trajeto: descobre a quantos metros do
//    início da linha cada um está.
// 3. Para cada parada, procura o ônibus mais próximo que ainda NÃO passou por ela
//    (está atrás dela no trajeto).
// 4. Converte a distância em minutos usando uma velocidade média.

import * as gtfs from '../data/gtfsRepository';

// Velocidade média de ônibus em SP, em metros por minuto (≈ 15 km/h)
const VELOCIDADE_M_MIN = 250;
// Ônibus a mais de 300 m do trajeto são ignorados (GPS ruim ou fora de rota)
const DISTANCIA_MAX_TRAJETO_M = 300;
// Tolerância: ônibus até 30 m depois da parada ainda conta como "chegando"
const TOLERANCIA_M = 30;

export interface PrevisaoEstimada {
  p: number; // código da parada
  np: string; // nome da parada
  t: string; // horário estimado HH:MM
  s: number; // sentido (1 ou 2)
  minutos: number; // minutos até a chegada
  estimada: true;
}

interface VeiculoPos {
  lat: number;
  lon: number;
}

/** Distâncias acumuladas (m) de cada ponto do trajeto desde o início */
function acumular(shape: [number, number][]): number[] {
  const acc = [0];
  for (let i = 1; i < shape.length; i++) {
    acc.push(acc[i - 1] + gtfs.distanciaMetros(shape[i - 1][0], shape[i - 1][1], shape[i][0], shape[i][1]));
  }
  return acc;
}

/** Posição (m desde o início) do ponto do trajeto mais próximo, e a distância até ele */
function projetar(shape: [number, number][], acc: number[], lat: number, lon: number) {
  let melhor = 0;
  let menor = Infinity;
  for (let i = 0; i < shape.length; i++) {
    const d = gtfs.distanciaMetros(lat, lon, shape[i][0], shape[i][1]);
    if (d < menor) {
      menor = d;
      melhor = i;
    }
  }
  return { posicao: acc[melhor], distancia: menor };
}

function horaMinuto(data: Date): string {
  return `${String(data.getHours()).padStart(2, '0')}:${String(data.getMinutes()).padStart(2, '0')}`;
}

/**
 * Estima previsões de chegada a partir dos veículos em operação.
 * @param letreiro - Letreiro completo da linha (ex: "746K-10"), igual ao id no GTFS
 * @param sentido - Sentido no padrão da API (1 = ida, 2 = volta)
 * @param veiculos - Veículos com lat/lon (vindos da API real)
 */
export function estimarPrevisoes(letreiro: string, sentido: number, veiculos: VeiculoPos[]): PrevisaoEstimada[] {
  if (!letreiro || veiculos.length === 0) return [];

  const route = gtfs.getRoute(letreiro);
  if (!route) return [];
  const direction = route.directions.find((d) => d.dir === sentido - 1) ?? route.directions[0];
  if (!direction) return [];

  const shape = gtfs.getShape(direction.shapeId);
  const paradas = gtfs.getStopsForRoute(route.id, direction.dir);
  if (shape.length < 2 || paradas.length === 0) return [];

  const acc = acumular(shape);

  // Posição de cada ônibus ao longo do trajeto (ignora os muito longe da rota)
  const posOnibus = veiculos
    .filter((v) => Number.isFinite(v.lat) && Number.isFinite(v.lon))
    .map((v) => projetar(shape, acc, v.lat, v.lon))
    .filter((p) => p.distancia <= DISTANCIA_MAX_TRAJETO_M)
    .map((p) => p.posicao);
  if (posOnibus.length === 0) return [];

  const agora = new Date();
  const previsoes: PrevisaoEstimada[] = [];

  for (const parada of paradas) {
    const posParada = projetar(shape, acc, parada.lat, parada.lon).posicao;
    // Menor distância de um ônibus que ainda vai chegar nesta parada
    let menorDist = Infinity;
    for (const posBus of posOnibus) {
      const dist = posParada - posBus;
      if (dist >= -TOLERANCIA_M && dist < menorDist) menorDist = Math.max(0, dist);
    }
    if (menorDist === Infinity) continue; // nenhum ônibus antes desta parada

    const minutos = Math.round(menorDist / VELOCIDADE_M_MIN);
    previsoes.push({
      p: Number(parada.id),
      np: parada.name,
      t: horaMinuto(new Date(agora.getTime() + minutos * 60000)),
      s: sentido,
      minutos,
      estimada: true,
    });
  }

  return previsoes.sort((a, b) => a.minutos - b.minutos);
}
