import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLinhaKey, normalizarLinha, chaveInvalida } from './linhaKey';

// Chaves do AsyncStorage com prefixo e versão (conforme especificação)
const FAVORITES_KEY = '@app/favoritos';
const LEGACY_FAVORITES_KEY = '@sptrans:v1:favorites';
const HISTORY_KEY = '@sptrans:v1:history';
const HISTORY_LIMIT = 10;

export interface FavoriteItem {
  key: string;
  cd: number;
  lt: string;
  tl: string;
}

function normalizeFavoriteItem(item: any): FavoriteItem | null {
  // Idempotência: se o objeto já traz uma key válida (FavoriteItem gravado ou
  // LinhaNormalizada), mantenha-a. Não recalcule a partir de campos que podem
  // ter sido omitidos na gravação (ex: sl), senão a chave descola da Linhas.
  const key = getLinhaKey(item);
  if (chaveInvalida(key)) return null;
  return {
    key: key as string,
    cd: Number(item.cd ?? item.codigo ?? 0),
    lt: String(item.lt ?? item.letreiro ?? ''),
    tl: String(item.tl ?? item.nome ?? ''),
  };
}

let ultimoTotalRemovidoPorDuplicata = 0;

/** Quantidade de duplicatas por chave removidas na última leitura do storage */
export function getUltimoTotalRemovidoPorDuplicata(): number {
  return ultimoTotalRemovidoPorDuplicata;
}

function normalizeFavoriteList(raw: unknown): FavoriteItem[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const result: FavoriteItem[] = [];
  let removidos = 0;
  for (const entry of raw) {
    const item = entry ? normalizeFavoriteItem(entry) : null;
    if (!item) {
      removidos++; // item inválido ignorado
      continue;
    }
    if (seen.has(item.key)) {
      removidos++; // duplicata por chave ignorada
      continue;
    }
    seen.add(item.key);
    result.push(item);
  }
  ultimoTotalRemovidoPorDuplicata = removidos;
  return result;
}

async function readJson(key: string): Promise<unknown> {
  const valor = await AsyncStorage.getItem(key);
  if (!valor) return null;
  try {
    return JSON.parse(valor);
  } catch (error) {
    console.error(`JSON inválido em ${key}:`, error);
    return null;
  }
}

export async function getFavorites(): Promise<FavoriteItem[]> {
  try {
    const atual = await readJson(FAVORITES_KEY);
    if (__DEV__) {
      // Diagnóstico: mostra quantos favoritos estavam salvos ao abrir o app
      console.log('[favoritos] lidos do storage:', Array.isArray(atual) ? atual.length : atual);
    }
    if (atual !== null) return normalizeFavoriteList(atual);

    const legacy = await readJson(LEGACY_FAVORITES_KEY);
    if (legacy !== null) {
      const migrated = normalizeFavoriteList(legacy);
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(migrated));
      await AsyncStorage.removeItem(LEGACY_FAVORITES_KEY);
      return migrated;
    }
    return [];
  } catch (error) {
    console.error('Erro ao ler favoritos:', error);
    return [];
  }
}

export async function saveFavorites(lista: FavoriteItem[]): Promise<void> {
  const normalizada = normalizeFavoriteList(lista);
  if (__DEV__) console.log('[favoritos] salvando:', normalizada.length);
  await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(normalizada));
}

export async function addFavorite(
  linha: any
): Promise<void> {
  const key = getLinhaKey(linha);
  if (chaveInvalida(key)) {
    console.warn('Cannot add favorite: invalid key generated', linha);
    return;
  }
  const atual = await getFavorites();
  if (atual.some((f) => f.key === key)) return;
  const norm = normalizarLinha(linha);
  if (!norm) return;
  await saveFavorites([
    ...atual,
    { key: key as string, cd: Number(norm.codigo), lt: norm.letreiro, tl: norm.nome || '' },
  ]);
}

export async function removeFavorite(keyOrCodigo: string | number): Promise<void> {
  const key = String(keyOrCodigo);
  const atual = await getFavorites();
  await saveFavorites(atual.filter((f) => f.key !== key));
}

export async function addSearchHistory(termo: string): Promise<void> {
  try {
    const termoLimpo = termo.trim();
    if (!termoLimpo) return;
    const atual = await getSearchHistory();
    const filtrado = atual.filter((t) => t.toLowerCase() !== termoLimpo.toLowerCase());
    filtrado.unshift(termoLimpo);
    const limitado = filtrado.slice(0, HISTORY_LIMIT);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(limitado));
  } catch (error) {
    console.error('Erro ao adicionar ao histórico:', error);
  }
}

export async function getSearchHistory(): Promise<string[]> {
  try {
    const valor = await AsyncStorage.getItem(HISTORY_KEY);
    if (!valor) return [];
    return JSON.parse(valor);
  } catch (error) {
    console.error('Erro ao ler histórico:', error);
    return [];
  }
}

export async function clearSearchHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(HISTORY_KEY);
  } catch (error) {
    console.error('Erro ao limpar histórico:', error);
  }
}

const CACHE_PREFIX = '@sptrans:v1:cache:';

interface CacheEntry {
  timestamp: string;
  type: string;
  data: any;
  ttl: number;
}

export async function setCache(id: string, tipo: string, dados: any, ttlMinutes = 3): Promise<void> {
  try {
    const key = CACHE_PREFIX + tipo + ':' + id;
    const entry: CacheEntry = {
      timestamp: new Date().toISOString(),
      type: tipo,
      data: dados,
      ttl: ttlMinutes,
    };
    await AsyncStorage.setItem(key, JSON.stringify(entry));
  } catch (error) {
    console.error('Erro ao salvar cache:', error);
  }
}

export async function getCache(id: string, tipo: string, maxAgeMinutes = 5): Promise<any | null> {
  try {
    const key = CACHE_PREFIX + tipo + ':' + id;
    const valor = await AsyncStorage.getItem(key);
    if (!valor) return null;
    const entry: CacheEntry & { ttl: number } = JSON.parse(valor);
    const salvo = new Date(entry.timestamp);
    const agora = new Date();
    const diferencaMinutos = (agora.getTime() - salvo.getTime()) / 60000;
    if (diferencaMinutos > maxAgeMinutes) {
      await AsyncStorage.removeItem(key);
      return null;
    }
    return entry.data;
  } catch (error) {
    console.error('Erro ao ler cache:', error);
    return null;
  }
}

export async function clearCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
    await AsyncStorage.multiRemove(cacheKeys);
  } catch (error) {
    console.error('Erro ao limpar cache:', error);
  }
}

export function calculaDiferencaCache(data: string): string {
  const salvo = new Date(data);
  const agora = new Date();
  const diferencaMs = agora.getTime() - salvo.getTime();
  const minutos = Math.floor(diferencaMs / 60000);
  if (minutos < 1) return 'há menos de 1 minuto';
  if (minutos === 1) return 'há 1 minuto';
  return `há ${minutos} minutos`;
}

const PREFS_KEY = '@sptrans:v1:prefs';

export interface UserPreferences {
  theme: 'light' | 'dark';
  pollingInterval: 15 | 30 | 60;
  forceDemoMode: boolean;
}

const DEFAULT_PREFS: UserPreferences = {
  theme: 'light',
  pollingInterval: 30,
  forceDemoMode: false,
};

export async function getPreferences(): Promise<UserPreferences> {
  try {
    const valor = await AsyncStorage.getItem(PREFS_KEY);
    if (!valor) return DEFAULT_PREFS;
    const parsed = JSON.parse(valor);
    return { ...DEFAULT_PREFS, ...parsed };
  } catch (error) {
    console.error('Erro ao ler preferências:', error);
    return DEFAULT_PREFS;
  }
}

export async function setPreferences(prefs: Partial<UserPreferences>): Promise<void> {
  try {
    const atual = await getPreferences();
    const novo = { ...atual, ...prefs };
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(novo));
  } catch (error) {
    console.error('Erro ao salvar preferências:', error);
  }
}
