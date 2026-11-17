// Serviço SIMULADO com as mesmas funções de SPTransAPI, alimentado por src/mocks/sptransMocks.ts

// Importa as listas de paradas e linhas simuladas e o tipo de linha
import { PARADAS_MOCK, LINHAS_MOCK, LinhaMock } from '../mocks/sptransMocks';

/**
 * Espera um tempo aleatório para simular a latência de uma chamada de rede
 * @param minMs - Tempo mínimo de espera em milissegundos
 * @param maxMs - Tempo máximo de espera em milissegundos
 */
async function atraso(minMs: number, maxMs: number): Promise<void> {
  // Sorteia um tempo de espera entre minMs e maxMs
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  // Pausa a execução pelo tempo sorteado
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Remove acentos e converte para minúsculas, para comparar textos sem diferenciar grafia
 * @param texto - Texto de entrada
 * @returns Texto normalizado
 */
function normalizar(texto: string): string {
  // Separa os acentos das letras, remove os acentos e deixa tudo minúsculo
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

/**
 * Formata um horário no padrão HH:MM
 * @param data - Data a formatar
 */
function horaMinuto(data: Date): string {
  // Junta horas e minutos com dois dígitos cada
  return `${String(data.getHours()).padStart(2, '0')}:${String(data.getMinutes()).padStart(2, '0')}`;
}

/**
 * Converte uma linha simulada para o formato lido pelas telas
 * @param linha - Linha no formato bruto da API
 * @returns Objeto { cd, lt, sl, tl }
 */
function formatarLinha(linha: LinhaMock) {
  // Monta o objeto com os campos esperados pelas telas Home, Favoritos e Detalhes
  return {
    // Código identificador da linha (cl na API)
    cd: linha.cl,
    // Letreiro completo, ex: 8000-10
    lt: `${linha.lt}-${linha.tl}`,
    // Sentido numérico (1 ou 2)
    sl: linha.sl,
    // Descrição do sentido conforme a direção de operação
    tl: linha.sl === 1 ? `${linha.tp} → ${linha.ts}` : `${linha.ts} → ${linha.tp}`,
  };
}

/**
 * Busca linhas pelo número, pelo nome de um terminal ou pelo código interno
 * @param texto - Termo de busca (ex: 8000, Lapa, 1273)
 * @returns Linhas encontradas no formato das telas
 */
export async function buscarLinhas(texto: string): Promise<any[]> {
  // Simula o tempo de resposta da API
  await atraso(300, 700);
  // Normaliza o termo digitado
  const termo = normalizar(texto);
  // Mantém as linhas cujo letreiro, terminais ou código combinem com o termo
  const encontradas = LINHAS_MOCK.filter(
    // Testa cada linha simulada
    (linha) =>
      // Compara com o letreiro completo (ex: 8000-10, 177h-10)
      normalizar(`${linha.lt}-${linha.tl}`).includes(termo) ||
      // Compara com o terminal principal
      normalizar(linha.tp).includes(termo) ||
      // Compara com o terminal secundário
      normalizar(linha.ts).includes(termo) ||
      // Compara com o código interno (usado pela tela de detalhes)
      String(linha.cl) === termo
  );
  // Converte as linhas encontradas para o formato das telas
  return encontradas.map(formatarLinha);
}

/**
 * Busca paradas pelo nome ou pelo endereço
 * @param texto - Termo de busca (ex: Paulista, Afonso)
 * @returns Paradas encontradas com cp, np, ed, py e px
 */
export async function buscarParadas(texto: string): Promise<any[]> {
  // Simula o tempo de resposta da API
  await atraso(300, 700);
  // Normaliza o termo digitado
  const termo = normalizar(texto);
  // Mantém as paradas cujo nome ou endereço contenham o termo
  return PARADAS_MOCK.filter(
    // Testa nome e endereço de cada parada
    (parada) => normalizar(parada.np).includes(termo) || normalizar(parada.ed).includes(termo)
  );
}

/**
 * Gera previsões de chegada da linha em cada parada do percurso
 * @param codigoLinha - Código identificador da linha
 * @returns Previsões { p: código da parada, t: horário, s: sentido }
 */
export async function buscarPrevisoes(codigoLinha: number): Promise<any[]> {
  // Simula o tempo de resposta da API
  await atraso(400, 800);
  // Procura a linha pelo código interno
  const linha = LINHAS_MOCK.find((l) => l.cl === codigoLinha);
  // Sem linha correspondente, não há previsões
  if (!linha) return [];
  // Cria uma previsão por parada, a cada 5 minutos a partir de agora
  return linha.paradas.map((cp, indice) => {
    // Calcula o horário previsto somando (indice + 1) * 5 minutos ao horário atual
    const previsto = new Date(Date.now() + (indice + 1) * 5 * 60 * 1000);
    // Devolve a previsão no formato da tela de detalhes
    return { p: cp, t: horaMinuto(previsto), s: linha.sl };
  });
}

/**
 * Gera veículos em operação posicionados perto das paradas da linha
 * @param codigoLinha - Código identificador da linha
 * @returns Veículos { id: prefixo, lat, lon, hr: horário da captura }
 */
export async function buscarVeiculos(codigoLinha: number): Promise<any[]> {
  // Simula o tempo de resposta da API
  await atraso(400, 800);
  // Procura a linha pelo código interno
  const linha = LINHAS_MOCK.find((l) => l.cl === codigoLinha);
  // Sem linha correspondente, não há veículos
  if (!linha) return [];
  // Guarda o horário atual como horário de captura das posições
  const captura = new Date().toLocaleTimeString('pt-BR');
  // Cria um veículo para cada parada que existir na lista de paradas
  return linha.paradas
    // Converte cada código de parada no objeto da parada
    .map((cp) => PARADAS_MOCK.find((p) => p.cp === cp))
    // Descarta códigos sem parada cadastrada
    .filter((parada) => parada !== undefined)
    // Monta o veículo com um pequeno deslocamento em relação à parada
    .map((parada, indice) => ({
      // Prefixo fictício derivado do código da linha
      id: codigoLinha * 10 + indice + 1,
      // Latitude ligeiramente deslocada da parada
      lat: parada!.py + 0.0008 * (indice + 1),
      // Longitude ligeiramente deslocada da parada
      lon: parada!.px - 0.0008 * (indice + 1),
      // Horário da captura
      hr: captura,
    }));
}
