// Hook para gerenciar o histórico de buscas recentes

// Importa hooks do React
import { useState, useEffect, useCallback } from 'react';
// Importa funções de armazenamento
import { getSearchHistory, addSearchHistory, clearSearchHistory } from '../utils/storage';

/**
 * Hook useSearchHistory
 * Gerencia o histórico de termos buscados (últimos 10, sem duplicados)
 * @returns { history, addHistory, clearHistory, loading }
 */
export function useSearchHistory() {
  // Estado do histórico (array de strings)
  const [history, setHistory] = useState<string[]>([]);
  // Estado de carregamento inicial
  const [loading, setLoading] = useState(true);

  // Carrega o histórico do AsyncStorage na montagem
  useEffect(() => {
    let ativo = true;
    getSearchHistory().then((h) => {
      if (ativo) {
        setHistory(h);
        setLoading(false);
      }
    });
    return () => {
      ativo = false;
    };
  }, []);

  // Função para adicionar termo ao histórico
  const addHistory = useCallback(async (termo: string) => {
    await addSearchHistory(termo);
    // Recarrega o histórico após adicionar
    const novo = await getSearchHistory();
    setHistory(novo);
  }, []);

  // Função para limpar o histórico
  const clearHistory = useCallback(async () => {
    await clearSearchHistory();
    setHistory([]);
  }, []);

  // Retorna o estado e as ações
  return {
    history,
    loading,
    addHistory,
    clearHistory,
  };
}