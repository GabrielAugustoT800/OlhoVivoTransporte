// Hook para gerenciar preferências do usuário (tema, polling, modo demo)

// Importa hooks do React
import { useState, useEffect, useCallback } from 'react';
// Importa funções de armazenamento e tipos
import { getPreferences, setPreferences, UserPreferences } from '../utils/storage';

/**
 * Hook usePreferences
 * Gerencia preferências persistidas no AsyncStorage
 * @returns { prefs, updatePrefs, loading }
 */
export function usePreferences() {
  // Estado das preferências
  const [prefs, setPrefs] = useState<UserPreferences>({
    theme: 'light',
    pollingInterval: 30,
    forceDemoMode: false,
  });
  // Estado de carregamento inicial
  const [loading, setLoading] = useState(true);

  // Carrega as preferências do AsyncStorage na montagem
  useEffect(() => {
    let ativo = true;
    getPreferences().then((p) => {
      if (ativo) {
        setPrefs(p);
        setLoading(false);
      }
    });
    return () => {
      ativo = false;
    };
  }, []);

  // Função para atualizar preferências
  const updatePrefs = useCallback(async (novas: Partial<UserPreferences>) => {
    await setPreferences(novas);
    setPrefs((prev) => ({ ...prev, ...novas }));
  }, []);

  // Retorna o estado e a ação de atualização
  return {
    prefs,
    loading,
    updatePrefs,
  };
}