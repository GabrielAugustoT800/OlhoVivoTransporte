// Repositório de dados estáticos do GTFS da SPTrans (funções puras de consulta).
// Lê os JSONs gerados por scripts/build-gtfs.js em assets/gtfs/ e guarda tudo em memória.

// Tipo de um sentido de operação de uma linha no routes.json
export interface GtfsDirection {
  // Sentido no GTFS: 0 = ida (principal → secundário), 1 = volta
  dir: number;
  // Letreiro de destino exibido no ônibus
  headsign: string;
  // Identificador do trajeto desenhado (shapes.json)
  shapeId: string;
  // Viagem representativa usada para gerar a lista de paradas
  tripId: string;
}

// Tipo de uma linha no routes.json
export interface GtfsRoute {
  // Identificador da linha, igual ao letreiro (ex: 8000-10)
  id: string;
  // Nome curto (letreiro)
  shortName: string;
  // Nome longo no formato "Terminal A - Terminal B"
  longName: string;
  // Cor da linha em hexadecimal, ou null
  color: string | null;
  // Sentidos de operação da linha
  directions: GtfsDirection[];
}

// Tipo de uma parada no stops.json
export interface GtfsStop {
  // Código da parada (corresponde ao cp do Olho Vivo)
  id: string;
  // Nome da parada
  name: string;
  // Latitude com 5 casas decimais
  lat: number;
  // Longitude com 5 casas decimais
  lon: number;
}

// Tipo de uma faixa horária no frequencies.json
export interface GtfsHeadway {
  // Início da faixa (HH:MM)
  start: string;
  // Fim da faixa (HH:MM)
  end: string;
  // Intervalo entre ônibus em minutos
  headwayMin: number;
  // Calendário de serviço ao qual a faixa pertence (ex: USD, U__)
  service: string;
}

// Tipo de um calendário de serviço no calendar.json
interface GtfsCalendar {
  // Dias de operação, de segunda [0] a domingo [6], com 1 = opera
  days: number[];
  // Data inicial da vigência (AAAAMMDD)
  start: string;
  // Data final da vigência (AAAAMMDD)
  end: string;
}

// Tipo da estrutura com todos os dados carregados
interface GtfsData {
  // Lista de linhas
  routes: GtfsRoute[];
  // Linhas indexadas pelo id
  routesById: Map<string, GtfsRoute>;
  // Lista de paradas
  stops: GtfsStop[];
  // Paradas indexadas pelo id
  stopsById: Map<string, GtfsStop>;
  // Paradas em ordem por linha e sentido
  routeStops: Record<string, Record<string, string[]>>;
  // Linhas que atendem cada parada
  stopRoutes: Record<string, string[]>;
  // Pontos de cada trajeto
  shapes: Record<string, [number, number][]>;
  // Faixas de frequência por linha e sentido
  frequencies: Record<string, Record<string, GtfsHeadway[]>>;
  // Calendários de serviço
  calendar: Record<string, GtfsCalendar>;
}

// Guarda os dados depois da primeira leitura (memoização)
let cache: GtfsData | null = null;

/**
 * Carrega os JSONs do GTFS uma única vez e devolve os dados em memória.
 * O require dentro da função adia a leitura dos ~12 MB até o primeiro uso.
 */
function dados(): GtfsData {
  // Se já carregou antes, devolve o cache
  if (cache) return cache;
  // Lê a lista de linhas
  const routes: GtfsRoute[] = require('../../assets/gtfs/routes.json');
  // Lê a lista de paradas
  const stops: GtfsStop[] = require('../../assets/gtfs/stops.json');
  // Monta e guarda a estrutura completa
  cache = {
    // Linhas
    routes,
    // Índice de linhas por id
    routesById: new Map(routes.map((r) => [r.id, r])),
    // Paradas
    stops,
    // Índice de paradas por id
    stopsById: new Map(stops.map((s) => [s.id, s])),
    // Sequência de paradas por linha e sentido
    routeStops: require('../../assets/gtfs/routeStops.json'),
    // Índice invertido parada → linhas
    stopRoutes: require('../../assets/gtfs/stopRoutes.json'),
    // Trajetos simplificados
    shapes: require('../../assets/gtfs/shapes.json'),
    // Frequências
    frequencies: require('../../assets/gtfs/frequencies.json'),
    // Calendários de serviço
    calendar: require('../../assets/gtfs/calendar.json'),
  };
  // Devolve os dados carregados
  return cache;
}

/**
 * Remove acentos, converte para minúsculas e tira espaços das pontas
 * @param texto - Texto de entrada
 */
export function normalizar(texto: string): string {
  // Decompõe os acentos, remove-os e padroniza em minúsculas
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

/**
 * Busca linhas pelo letreiro ou pelo nome (ex: "8000", "Lapa"), sem diferenciar acentos
 * @param termo - Texto digitado
 * @param limite - Quantidade máxima de linhas devolvidas
 */
export function searchRoutes(termo: string, limite = 50): GtfsRoute[] {
  // Normaliza o termo de busca
  const t = normalizar(termo);
  // Termo vazio não devolve nada
  if (!t) return [];
  // Filtra as linhas cujo letreiro ou nome contém o termo
  const encontradas = dados().routes.filter(
    // Compara letreiro e nome longo normalizados
    (r) => normalizar(r.shortName).includes(t) || normalizar(r.longName).includes(t)
  );
  // Coloca primeiro as linhas cujo letreiro começa pelo termo
  encontradas.sort((a, b) => Number(!normalizar(a.shortName).startsWith(t)) - Number(!normalizar(b.shortName).startsWith(t)));
  // Limita o tamanho do resultado
  return encontradas.slice(0, limite);
}

/**
 * Obtém uma linha pelo id (letreiro)
 * @param id - Ex: 8000-10
 */
export function getRoute(id: string): GtfsRoute | undefined {
  // Consulta o índice de linhas
  return dados().routesById.get(id);
}

/**
 * Lista todas as linhas (usado para montar índices)
 */
export function getAllRoutes(): GtfsRoute[] {
  // Devolve a lista completa
  return dados().routes;
}

/**
 * Obtém uma parada pelo código
 * @param id - Código da parada
 */
export function getStop(id: string): GtfsStop | undefined {
  // Consulta o índice de paradas
  return dados().stopsById.get(id);
}

/**
 * Busca paradas pelo nome, sem diferenciar acentos
 * @param termo - Texto digitado
 * @param limite - Quantidade máxima de paradas devolvidas
 */
export function searchStops(termo: string, limite = 50): GtfsStop[] {
  // Normaliza o termo de busca
  const t = normalizar(termo);
  // Termo vazio não devolve nada
  if (!t) return [];
  // Lista de resultados
  const encontradas: GtfsStop[] = [];
  // Percorre as paradas até atingir o limite
  for (const s of dados().stops) {
    // Guarda a parada se o nome contém o termo
    if (normalizar(s.name).includes(t)) encontradas.push(s);
    // Para quando atingir o limite
    if (encontradas.length >= limite) break;
  }
  // Devolve as paradas encontradas
  return encontradas;
}

/**
 * Lista as paradas de uma linha num sentido, na ordem do percurso
 * @param routeId - Id da linha
 * @param dir - Sentido GTFS (0 ou 1)
 */
export function getStopsForRoute(routeId: string, dir: number): GtfsStop[] {
  // Pega os códigos das paradas da linha no sentido
  const ids = dados().routeStops[routeId]?.[String(dir)] ?? [];
  // Converte cada código na parada completa, descartando códigos sem cadastro
  return ids.map((id) => getStop(id)).filter((s): s is GtfsStop => s !== undefined);
}

/**
 * Lista os ids das linhas que atendem uma parada
 * @param stopId - Código da parada
 */
export function getRoutesForStop(stopId: string): string[] {
  // Consulta o índice invertido
  return dados().stopRoutes[stopId] ?? [];
}

/**
 * Obtém os pontos [lat, lon] de um trajeto
 * @param shapeId - Id do trajeto
 */
export function getShape(shapeId: string): [number, number][] {
  // Consulta os trajetos
  return dados().shapes[shapeId] ?? [];
}

/**
 * Distância em metros entre dois pontos (fórmula de Haversine)
 */
export function distanciaMetros(lat1: number, lon1: number, lat2: number, lon2: number): number {
  // Converte graus para radianos
  const rad = Math.PI / 180;
  // Diferença de latitude em radianos
  const dLat = (lat2 - lat1) * rad;
  // Diferença de longitude em radianos
  const dLon = (lon2 - lon1) * rad;
  // Termo intermediário da fórmula
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  // Distância em metros usando o raio médio da Terra (6.371 km)
  return 2 * 6371000 * Math.asin(Math.sqrt(a));
}

/**
 * Paradas mais próximas de uma coordenada, ordenadas pela distância
 * @param lat - Latitude de referência
 * @param lon - Longitude de referência
 * @param raioM - Raio de busca em metros
 * @param limite - Quantidade máxima de paradas
 */
export function getNearbyStops(lat: number, lon: number, raioM = 500, limite = 20): (GtfsStop & { distancia: number })[] {
  // Tamanho do raio em graus de latitude (1° ≈ 111,32 km)
  const dLat = raioM / 111320;
  // Tamanho do raio em graus de longitude, corrigido pela latitude
  const dLon = raioM / (111320 * Math.cos((lat * Math.PI) / 180));
  // Lista de paradas dentro do raio
  const proximas: (GtfsStop & { distancia: number })[] = [];
  // Percorre todas as paradas
  for (const s of dados().stops) {
    // Pré-filtro rápido: descarta o que está fora do retângulo do raio
    if (Math.abs(s.lat - lat) > dLat || Math.abs(s.lon - lon) > dLon) continue;
    // Calcula a distância exata
    const distancia = distanciaMetros(lat, lon, s.lat, s.lon);
    // Guarda se estiver dentro do círculo
    if (distancia <= raioM) proximas.push({ ...s, distancia: Math.round(distancia) });
  }
  // Ordena da mais próxima para a mais distante e aplica o limite
  return proximas.sort((a, b) => a.distancia - b.distancia).slice(0, limite);
}

/**
 * Formata uma data como AAAAMMDD, o padrão do calendar.txt
 * @param d - Data
 */
function aaaammdd(d: Date): string {
  // Junta ano, mês e dia com zeros à esquerda
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Faixas de frequência de uma linha e sentido válidas para uma data
 * @param routeId - Id da linha
 * @param dir - Sentido GTFS (0 ou 1)
 * @param data - Data de referência (padrão: agora)
 */
export function getHeadways(routeId: string, dir: number, data = new Date()): GtfsHeadway[] {
  // Todas as faixas da linha no sentido
  const faixas = dados().frequencies[routeId]?.[String(dir)] ?? [];
  // Índice do dia no calendar (segunda = 0 ... domingo = 6)
  const dia = (data.getDay() + 6) % 7;
  // Data no formato do calendário
  const hoje = aaaammdd(data);
  // Mantém só as faixas cujo serviço opera nesse dia e está vigente
  const validas = faixas.filter((f) => {
    // Calendário do serviço da faixa
    const c = dados().calendar[f.service];
    // Sem calendário cadastrado, aceita a faixa
    if (!c) return true;
    // Opera no dia da semana e dentro da vigência
    return c.days[dia] === 1 && hoje >= c.start && hoje <= c.end;
  });
  // Se nenhum serviço vale hoje, devolve todas as faixas para não ficar sem informação
  return (validas.length ? validas : faixas).slice().sort((a, b) => a.start.localeCompare(b.start));
}

/**
 * Intervalo em minutos da faixa horária atual, ou null se a linha não tiver frequência
 * @param routeId - Id da linha
 * @param dir - Sentido GTFS (0 ou 1)
 * @param data - Data de referência (padrão: agora)
 */
export function getCurrentHeadway(routeId: string, dir: number, data = new Date()): number | null {
  // Faixas válidas para a data
  const faixas = getHeadways(routeId, dir, data);
  // Sem faixas, não há frequência
  if (!faixas.length) return null;
  // Horário atual no formato HH:MM
  const agora = `${String(data.getHours()).padStart(2, '0')}:${String(data.getMinutes()).padStart(2, '0')}`;
  // Procura a faixa que contém o horário atual
  const atual = faixas.find((f) => agora >= f.start && agora <= f.end);
  // Usa a faixa atual ou, fora de operação, a primeira do dia
  return (atual ?? faixas[0]).headwayMin;
}
