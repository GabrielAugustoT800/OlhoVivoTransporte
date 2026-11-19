// Hook que entrega às telas a fonte de dados ativa (API real ou mock GTFS)

// Importa os hooks de estado e efeito do React
import { useState, useEffect } from 'react';
// Importa o serviço que escolhe a fonte e o tipo da fonte
import { RealtimeService, RealtimeDataSource } from '../services/realtimeSource';
// Importa preferências para checar forceDemoMode
import { getPreferences } from '../utils/storage';

// Promessa compartilhada da inicialização, para autenticar uma única vez no app inteiro
let inicializacao: Promise<void> | null = null;

/**
 * Garante que o RealtimeService foi inicializado uma única vez
 * @param forceDemo - Se true, força modo demonstração (lido das preferências)
 */
async function inicializarUmaVez(forceDemo = false): Promise<void> {
  // Na primeira chamada dispara a autenticação e guarda a promessa
  if (!inicializacao) inicializacao = RealtimeService.initialize(forceDemo);
  // Nas chamadas seguintes devolve a mesma promessa
  return inicializacao;
}

/**
 * Hook useRealtime
 * @returns source (fonte ativa), isDemoMode (modo demonstração), ready (inicialização concluída) e funções para trocar de modo
 */
export function useRealtime() {
  // Indica se a inicialização já terminou
  const [ready, setReady] = useState(false);
  // Indica se o app está usando o mock GTFS
  const [isDemoMode, setIsDemoMode] = useState(RealtimeService.getIsDemoMode());
  // Fonte de dados ativa no momento
  const [source, setSource] = useState<RealtimeDataSource>(RealtimeService.getSource());

  // Copia para o estado do hook a fonte e o modo atuais do serviço
  const sincronizar = () => {
    // Atualiza a fonte ativa
    setSource(RealtimeService.getSource());
    // Atualiza o indicador de modo demonstração
    setIsDemoMode(RealtimeService.getIsDemoMode());
  };

  // Ao montar a tela, aguarda a inicialização compartilhada
  useEffect(() => {
    // Evita atualizar o estado se a tela for desmontada antes de terminar
    let ativo = true;
    // Lê preferência de forceDemoMode
    getPreferences().then((prefs) => {
      // Espera a autenticação (ou o fallback para o mock)
      inicializarUmaVez(prefs.forceDemoMode).then(() => {
        // Sai se a tela já foi desmontada
        if (!ativo) return;
        // Copia a fonte escolhida para o estado
        sincronizar();
        // Marca a inicialização como concluída
        setReady(true);
      });
    });
    // Na desmontagem, marca a tela como inativa
    return () => {
      // Impede atualizações de estado depois da desmontagem
      ativo = false;
    };
  }, []);

  // Devolve a fonte, o estado e as ações de troca de modo
  return {
    // Fonte de dados ativa
    source,
    // Indica se está no modo demonstração
    isDemoMode,
    // Indica se a inicialização terminou
    ready,
    // Força o modo demonstração (útil em apresentações)
    forceDemo: () => {
      // Troca a fonte no serviço para o mock
      RealtimeService.forceDemoMode();
      // Atualiza o estado do hook
      sincronizar();
    },
    // Tenta voltar para a API real
    forceReal: async () => {
      // Refaz a autenticação na API real
      await RealtimeService.forceRealMode();
      // Atualiza o estado do hook
      sincronizar();
    },
  };
}
