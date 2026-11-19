import { chaveInvalida } from './linhaKey';
import * as gtfs from '../data/gtfsRepository';

export interface LinhaResolvida {
  key: string;
  cl: number; // Código numérico esperado pelos serviços (cl real ou simulado)
  lt: string;
  tl: string;
  sl: number;
}

// Base dos códigos simulados do mock (igual a BASE_CODIGO em sptransMockService.ts)
const BASE_CODIGO_SIMULADO = 100000;

/**
 * Monta a linha resolvida para o modo demo a partir do letreiro completo do GTFS (ex: "8000-10")
 * e do sentido no padrão da API (1 = ida, 2 = volta).
 */
function resolverNoGtfs(key: string, lt: string, sl: number): LinhaResolvida | null {
  const route = gtfs.getRoute(lt);
  if (!route || route.directions.length === 0) return null;

  // Procura o sentido pelo campo dir (0 ou 1), e não pela posição no array:
  // algumas linhas têm só um sentido, ou os sentidos fora de ordem.
  const direction = route.directions.find((d) => d.dir === sl - 1) ?? route.directions[0];

  const posicao = gtfs.getAllRoutes().indexOf(route);
  if (posicao < 0) return null;

  return {
    key,
    cl: BASE_CODIGO_SIMULADO + posicao * 2 + direction.dir,
    lt: route.id,
    tl: direction.headsign || route.longName,
    sl: direction.dir + 1,
  };
}

/**
 * Resolve uma key de linha (estável) para os identificadores reais que a API/Mock esperam.
 * @param key A chave única da linha (resultado de getLinhaKey).
 * @param source Fonte de dados ativa (API real ou mock GTFS).
 * @param isDemoMode Se true, usa GTFS para gerar o código simulado; se false, usa a API real.
 */
export async function resolverLinha(key: string, source: any, isDemoMode: boolean): Promise<LinhaResolvida | null> {
  if (chaveInvalida(key)) return null;

  // 1. Chave de API real (cl:12345)
  if (key.startsWith('cl:')) {
    const cl = parseInt(key.slice(3), 10);
    if (isNaN(cl)) return null;

    if (isDemoMode) {
      // Código simulado já é entendido diretamente pelo mock
      if (cl >= BASE_CODIGO_SIMULADO) return { key, cl, lt: '', tl: '', sl: 1 };
      // Um cl real não existe no GTFS: tenta ao menos achar a linha pelo número
      const route = gtfs.getAllRoutes().find((r) => parseInt(r.shortName, 10) === cl);
      return route ? resolverNoGtfs(key, route.id, 1) : null;
    }

    // Modo real: `cl` é exatamente o código esperado pela API SPTrans
    return { key, cl, lt: '', tl: '', sl: 1 };
  }

  // 2. Chave composta: linha_<letreiro>_<sentido>  (ex: linha_8000-10_1)
  const match = /^linha_(.+)_(\d+)$/.exec(key);
  if (!match) return null;
  const lt = match[1];
  const sl = parseInt(match[2], 10);

  if (isDemoMode) {
    return resolverNoGtfs(key, lt, sl);
  }

  // 3. Modo real: busca a linha na API para descobrir o `cl` daquele sentido.
  // ATENÇÃO: SPTransAPIReal.buscarLinhas já devolve `lt` no formato COMPLETO
  // ("8000-10" = número + tipo), então a comparação deve ser com o letreiro completo.
  // (Antes comparava com só "8000" e nunca encontrava → "Linha não encontrada".)
  const ltNumero = lt.split('-')[0];
  const linhasApi: any[] = await source.buscarLinhas(ltNumero);

  const mesmoSentido = (item: any) => Number(item.sl) === sl;
  const lApi =
    linhasApi.find((item) => item.lt === lt && mesmoSentido(item)) ??
    linhasApi.find((item) => String(item.lt).split('-')[0] === ltNumero && mesmoSentido(item)) ??
    linhasApi.find((item) => item.lt === lt);

  if (lApi && lApi.cd != null) {
    return {
      key,
      cl: Number(lApi.cd),
      lt: lApi.lt,
      tl: lApi.tl,
      sl: Number(lApi.sl),
    };
  }

  if (__DEV__) {
    console.warn('resolverLinha: linha não encontrada na API real', { key, lt, sl, resultados: linhasApi.length });
  }
  return null;
}
