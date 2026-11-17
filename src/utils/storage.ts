// Importa o AsyncStorage do React Native para persistência local
import AsyncStorage from '@react-native-async-storage/async-storage';

// Chave usada para armazenar as linhas favoritas no AsyncStorage
const FAVORITES_KEY = '@living_eye_favoritas';

/**
 * Salva uma linha de ônibus na lista de favoritos (sobrescreve se já existir)
 * @param linha - Objeto da linha a ser adicionada aos favoritos
 */
export async function addFavorite(linha: any): Promise<void> {
  try {
    // Obtém os favoritos atuais do AsyncStorage
    const atual = await getFavorites();
    // Verifica se a linha já está na lista (compara pelo código)
    const jaExiste = atual.find((f) => f.cd === linha.cd);
    // Se já existe, não adiciona novamente
    if (jaExiste) return;
    // Adiciona a linha ao final da lista
    atual.push(linha);
    // Salva a lista atualizada de volta no AsyncStorage como JSON
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(atual));
  } catch (error) {
    // Se houver erro, imprime no console
    console.error('Erro ao adicionar favorito:', error);
  }
}

/**
 * Obtém a lista de linhas favoritas armazenadas localmente
 * @returns Array de linhas favoritas (array vazio se não houver nenhuma)
 */
export async function getFavorites(): Promise<any[]> {
  try {
    // Lê o item do AsyncStorage pela chave definida
    const valor = await AsyncStorage.getItem(FAVORITES_KEY);
    // Se não houver valor armazenado, retorna array vazio
    if (!valor) return [];
    // Converte a string JSON de volta para array de objetos
    return JSON.parse(valor);
  } catch (error) {
    // Se houver erro na leitura, imprime no console e retorna array vazio
    console.error('Erro ao ler favoritos:', error);
    return [];
  }
}

/**
 * Remove uma linha de ônibus da lista de favoritos pelo código
 * @param codigo - Código da linha a ser removida
 */
export async function removeFavorite(codigo: number): Promise<void> {
  try {
    // Obtém os favoritos atuais
    const atual = await getFavorites();
    // Filtra a lista removendo o item com o código especificado
    const filtrado = atual.filter((f) => f.cd !== codigo);
    // Salva a lista filtrada de volta no AsyncStorage como JSON
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(filtrado));
  } catch (error) {
    // Se houver erro, imprime no console
    console.error('Erro ao remover favorito:', error);
  }
}
