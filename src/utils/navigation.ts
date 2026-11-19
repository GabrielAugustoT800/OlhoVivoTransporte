import { getLinhaKey } from './linhaKey';

/**
 * Helper centralizado para navegação para a tela de detalhes da linha.
 * Garante que a chave enviada seja a mesma usada por getLinhaKey (estável e única).
 * O expo-router já codifica o parâmetro da rota, então passamos a key crua.
 */
export function irParaLinha(router: any, linha: any) {
  const key = getLinhaKey(linha);
  if (!key) {
    console.warn('irParaLinha: Não foi possível gerar uma chave para a linha', linha);
    return;
  }
  router.push({ pathname: '/linha/[codigo]', params: { codigo: key } });
}
