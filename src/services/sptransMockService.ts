// Serviço SIMULADO com as mesmas funções da API Olho Vivo, alimentado pelo GTFS da SPTrans.
// Linhas e paradas são reais (assets/gtfs); posições e previsões são calculadas a partir
// dos trajetos (shapes) e das frequências oficiais, então os ônibus "andam" com o relógio.

// Importa as consultas ao GTFS e o tipo de linha do GTFS
import * as gtfs from '../data/gtfsRepository';
// Importa os tipos usados pelas telas
import { Linha, Parada, Previsao, Veiculo } from '../types/sptrans';

// Velocidade média simulada dos ônibus em metros por minuto (≈ 18 km/h)
const VELOCIDADE_M_MIN = 300;
// Intervalo padrão em minutos quando a linha não tem frequência cadastrada
const HEADWAY_PADRAO_MIN = 15;
// Base dos códigos simulados, para não confundir com números de linha digitados
const BASE_CODIGO = 100000;

// Tipo de uma linha+sentido identificada por um código numérico simulado
interface LinhaSentido {
  // Linha do GTFS
  route: gtfs.GtfsRoute;
  // Sentido do GTFS (0 ou 1)
  dir: gtfs.GtfsDirection;
}

// Índice código simulado → linha+sentido, montado na primeira consulta
let indicePorCodigo: Map<number, LinhaSentido> | null = null;

/**
 * Gera o código simulado de uma linha num sentido (equivalente ao cl da API real)
 * @param posicao - Posição da linha em routes.json
 * @param dir - Sentido GTFS (0 ou 1)
 */
function codigoSimulado(posicao: number, dir: number): number {
  // Dois códigos por linha: um para cada sentido
  return BASE_CODIGO + posicao * 2 + dir;
}

/**
 * Monta (uma vez) o índice de códigos simulados
 */
function indice(): Map<number, LinhaSentido> {
  // Reaproveita o índice já montado
  if (indicePorCodigo) return indicePorCodigo;
  // Cria o mapa vazio
  const mapa = new Map<number, LinhaSentido>();
  // Percorre todas as linhas com sua posição
  gtfs.getAllRoutes().forEach((route, posicao) => {
    // Registra cada sentido da linha com seu código
    route.directions.forEach((dir) => mapa.set(codigoSimulado(posicao, dir.dir), { route, dir }));
  });
  // Guarda o índice para as próximas chamadas
  indicePorCodigo = mapa;
  // Devolve o índice
  return mapa;
}

/**
 * Converte uma linha+sentido para o formato lido pelas telas
 * @param codigo - Código simulado
 * @param ls - Linha e sentido do GTFS
 */
function formatarLinha(codigo: number, ls: LinhaSentido): Linha {
  // Monta o objeto { cd, lt, sl, tl }
  return {
    // Código simulado (faz o papel do cl)
    cd: codigo,
    // Letreiro completo, ex: 8000-10
    lt: ls.route.id,
    // Sentido no padrão da API: 1 = ida, 2 = volta
    sl: ls.dir.dir + 1,
    // Destino exibido no letreiro do ônibus
    tl: ls.dir.headsign || ls.route.longName,
  };
}

/**
 * Espera um tempo aleatório para simular a latência de rede
 * @param minMs - Espera mínima em milissegundos
 * @param maxMs - Espera máxima em milissegundos
 */
async function atraso(minMs = 300, maxMs = 700): Promise<void> {
  // Sorteia o tempo de espera
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  // Pausa pelo tempo sorteado
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Formata um horário no padrão HH:MM, igual ao campo t da API
 * @param data - Data a formatar
 */
function horaMinuto(data: Date): string {
  // Junta horas e minutos com dois dígitos
  return `${String(data.getHours()).padStart(2, '0')}:${String(data.getMinutes()).padStart(2, '0')}`;
}

/**
 * Calcula a distância acumulada (em metros) de cada ponto do trajeto desde o início
 * @param shape - Pontos [lat, lon] do trajeto
 */
function distanciasAcumuladas(shape: [number, number][]): number[] {
  // O primeiro ponto está a 0 m do início
  const acumuladas = [0];
  // Soma a distância de cada trecho ao total anterior
  for (let i = 1; i < shape.length; i++) {
    // Distância do ponto anterior até o atual
    const trecho = gtfs.distanciaMetros(shape[i - 1][0], shape[i - 1][1], shape[i][0], shape[i][1]);
    // Guarda o total acumulado até este ponto
    acumuladas.push(acumuladas[i - 1] + trecho);
  }
  // Devolve a lista de distâncias
  return acumuladas;
}

/**
 * Encontra o ponto do trajeto que está a uma certa distância do início
 * @param shape - Pontos do trajeto
 * @param acumuladas - Distâncias acumuladas de cada ponto
 * @param metros - Distância desejada a partir do início
 */
function pontoNaDistancia(shape: [number, number][], acumuladas: number[], metros: number): [number, number] {
  // Procura o primeiro ponto que já passou da distância desejada
  for (let i = 1; i < shape.length; i++) {
    // Pula enquanto o ponto ainda não alcançou a distância
    if (acumuladas[i] < metros) continue;
    // Comprimento do trecho entre o ponto anterior e o atual
    const trecho = acumuladas[i] - acumuladas[i - 1] || 1;
    // Fração do trecho já percorrida
    const f = (metros - acumuladas[i - 1]) / trecho;
    // Interpola latitude e longitude dentro do trecho
    return [shape[i - 1][0] + (shape[i][0] - shape[i - 1][0]) * f, shape[i - 1][1] + (shape[i][1] - shape[i - 1][1]) * f];
  }
  // Se passou do fim, devolve o último ponto
  return shape[shape.length - 1];
}

/**
 * Dados de simulação de uma linha+sentido: trajeto, distâncias, comprimento e espaçamento entre ônibus
 * @param ls - Linha e sentido do GTFS
 * @param agora - Momento de referência
 */
function simulacao(ls: LinhaSentido, agora: Date) {
  // Trajeto da linha no sentido
  const shape = gtfs.getShape(ls.dir.shapeId);
  // Distâncias acumuladas ao longo do trajeto
  const acumuladas = distanciasAcumuladas(shape);
  // Comprimento total do trajeto em metros
  const comprimento = acumuladas[acumuladas.length - 1] ?? 0;
  // Intervalo entre ônibus na faixa horária atual
  const headway = gtfs.getCurrentHeadway(ls.route.id, ls.dir.dir, agora) ?? HEADWAY_PADRAO_MIN;
  // Distância entre dois ônibus consecutivos
  const espacamento = Math.max(headway * VELOCIDADE_M_MIN, 1);
  // Minutos desde a meia-noite (com fração), para os ônibus avançarem com o relógio
  const minutos = agora.getHours() * 60 + agora.getMinutes() + agora.getSeconds() / 60;
  // Posição (em metros) do primeiro ônibus dentro do primeiro espaçamento
  const deslocamento = (minutos * VELOCIDADE_M_MIN) % espacamento;
  // Devolve tudo o que as previsões e posições precisam
  return { shape, acumuladas, comprimento, espacamento, deslocamento };
}

/**
 * Busca linhas pelo letreiro, pelo nome ou pelo código simulado
 * @param texto - Termo de busca (ex: 8000, Lapa, 100123)
 */
export async function buscarLinhas(texto: string): Promise<Linha[]> {
  // Simula o tempo de resposta da API
  await atraso();
  // Converte o termo em número para testar se é um código simulado
  const codigo = Number(texto.trim());
  // Procura o código no índice
  const porCodigo = indice().get(codigo);
  // Se for um código simulado, devolve só essa linha
  if (porCodigo) return [formatarLinha(codigo, porCodigo)];
  // Lista final de resultados
  const resultados: Linha[] = [];
  // Busca as linhas no GTFS
  for (const route of gtfs.searchRoutes(texto)) {
    // Posição da linha em routes.json, usada para gerar o código
    const posicao = gtfs.getAllRoutes().indexOf(route);
    // Cada sentido vira um resultado, como na API real
    for (const dir of route.directions) {
      // Tenta usar o número da linha como CD se for numérico (ex: 8000)
      // Caso contrário, usa o código simulado (BASE_CODIGO + ...)
      const numLinha = parseInt(route.shortName);
      const cd = !isNaN(numLinha) ? numLinha : codigoSimulado(posicao, dir.dir);
      // Adiciona a linha formatada
      resultados.push(formatarLinha(cd, { route, dir }));
    }
  }
  // Devolve as linhas encontradas
  return resultados;
}

/**
 * Busca paradas pelo nome
 * @param texto - Termo de busca (ex: Paulista)
 */
export async function buscarParadas(texto: string): Promise<Parada[]> {
  // Simula o tempo de resposta da API
  await atraso();
  // Busca no GTFS e converte para { cp, np }
  return gtfs.searchStops(texto).map((s) => ({
    // Código da parada
    cp: Number(s.id),
    // Nome da parada
    np: s.name,
  }));
}

/**
 * Auxiliar para resolver códigos de linha (Real -> Simulado)
 * @param codigo - Código fornecido (pode ser o número real da linha ou o simulado)
 */
function resolverCodigoLinha(codigo: number): number | null {
  // Se já é um código simulado (BASE_CODIGO ou acima), retorna ele mesmo
  if (codigo >= BASE_CODIGO) return codigo;
  
  // Senão, tenta encontrar a linha no GTFS pelo número real
  const routes = gtfs.getAllRoutes();
  const routeIdx = routes.findIndex(r => parseInt(r.shortName) === codigo);
  
  // Se não encontrar a linha, não há como simular
  if (routeIdx === -1) return null;
  
  // Retorna o código simulado do sentido 0 (Ida) como padrão para previsões/veículos
  return codigoSimulado(routeIdx, 0);
}

/**
 * Calcula a próxima chegada de ônibus em cada parada da linha
 * @param codigoLinha - Código da linha (Simulado ou Real)
 */
export async function buscarPrevisoes(codigoLinha: number): Promise<Previsao[]> {
  // Simula o tempo de resposta da API
  await atraso(400, 800);
  
  // Resolve o código para garantir que temos um código simulado para o índice
  const codigoResolvido = resolverCodigoLinha(codigoLinha);
  // Procura a linha+sentido pelo código resolvido
  const ls = codigoResolvido ? indice().get(codigoResolvido) : null;
  
  // Se não encontrou a linha no índice, tenta o "Plano B": Previsão por Frequência (Headway)
  if (!ls) {
    // Tenta buscar a rota no GTFS pelo número real
    const routes = gtfs.getAllRoutes();
    const route = routes.find(r => parseInt(r.shortName) === codigoLinha);
    
    if (route) {
      // Retorna uma previsão sintética baseada na frequência média do GTFS
      const headway = gtfs.getCurrentHeadway(route.id, 0, new Date()) ?? HEADWAY_PADRAO_MIN;
      return [{ 
        p: 0, // Código 0 indica "estimativa geral"
        t: 'Est.', 
        s: 1, 
        // Adicionamos um campo extra para a tela saber que é estimado
        // mas a interface espera string no 't'
      }];
    }
    return [];
  }
  // Momento de referência
  const agora = new Date();
  // Dados de simulação da linha
  const sim = simulacao(ls, agora);
  // Sem trajeto, não dá para calcular previsões precisas
  if (!sim.shape.length) return [];
  // Calcula a previsão de cada parada do percurso
  const previsoes = gtfs.getStopsForRoute(ls.route.id, ls.dir.dir).map((parada) => {
    // Índice do ponto do trajeto mais próximo da parada
    let maisProximo = 0;
    // Menor distância encontrada até agora
    let menor = Infinity;
    // Percorre os pontos do trajeto
    sim.shape.forEach(([lat, lon], i) => {
      // Distância da parada até o ponto
      const d = gtfs.distanciaMetros(parada.lat, parada.lon, lat, lon);
      // Guarda o ponto se for o mais próximo
      if (d < menor) {
        // Atualiza a menor distância
        menor = d;
        // Atualiza o índice do ponto
        maisProximo = i;
      }
    });
    // Posição da parada ao longo do trajeto, em metros
    const posParada = sim.acumuladas[maisProximo];
    // Distância até o ônibus mais próximo que ainda vai passar pela parada
    const atras = (((posParada - sim.deslocamento) % sim.espacamento) + sim.espacamento) % sim.espacamento;
    // Tempo até a chegada em minutos
    const minutos = atras / VELOCIDADE_M_MIN;
    // Monta a previsão no formato da tela
    return { p: Number(parada.id), t: horaMinuto(new Date(agora.getTime() + minutos * 60000)), s: ls.dir.dir + 1, minutos };
  });
  // Ordena pela chegada mais próxima e remove o campo auxiliar
  return previsoes.sort((a, b) => a.minutos - b.minutos).map(({ p, t, s }) => ({ p, t, s }));
}

/**
 * Posiciona os ônibus em operação ao longo do trajeto da linha
 * @param codigoLinha - Código da linha (Simulado ou Real)
 */
export async function buscarVeiculos(codigoLinha: number): Promise<Veiculo[]> {
  // Simula o tempo de resposta da API
  await atraso(400, 800);
  // Resolve o código para garantir que temos um código simulado para o índice
  const codigoResolvido = resolverCodigoLinha(codigoLinha);
  // Procura a linha+sentido pelo código resolvido
  const ls = codigoResolvido ? indice().get(codigoResolvido) : null;
  // Código desconhecido não tem veículos
  if (!ls) return [];
  // Momento de referência
  const agora = new Date();
  // Dados de simulação da linha
  const sim = simulacao(ls, agora);
  // Sem trajeto, não há onde posicionar ônibus
  if (!sim.shape.length) return [];
  // Horário da captura no formato local
  const captura = agora.toLocaleTimeString('pt-BR');
  // Lista de veículos
  const veiculos: Veiculo[] = [];
  // Coloca um ônibus a cada espaçamento, do primeiro até o fim do trajeto
  for (let k = 0, pos = sim.deslocamento; pos <= sim.comprimento; k++, pos += sim.espacamento) {
    // Coordenada do ônibus nesta posição do trajeto
    const [lat, lon] = pontoNaDistancia(sim.shape, sim.acumuladas, pos);
    // Adiciona o veículo com um prefixo fictício de 5 dígitos
    veiculos.push({ id: 10000 + ((codigoLinha * 7 + k) % 90000), lat, lon, hr: captura });
  }
  // Devolve os veículos
  return veiculos;
}
