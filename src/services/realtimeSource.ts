// Serviço unificado de tempo real: escolhe entre a API Olho Vivo real e o mock GTFS

// Interface que toda fonte de tempo real deve implementar
// Garante que API real e mock devolvam os mesmos dados para as telas
export interface RealtimeDataSource {
  // Busca linhas por texto (número ou nome)
  buscarLinhas(texto: string): Promise<any[]>;
  // Busca paradas por texto (rua ou nome)
  buscarParadas(texto: string): Promise<any[]>;
  // Busca previsões de chegada de uma linha
  buscarPrevisoes(codigoLinha: number): Promise<any[]>;
  // Busca a posição dos veículos de uma linha
  buscarVeiculos(codigoLinha: number): Promise<any[]>;
}

// Importa o serviço de API real da SPTrans
import { SPTransAPIReal } from './sptrans';
// Importa o serviço de mock baseado no GTFS
import * as SPTransMock from './sptransMockService';

/**
 * Implementação REAL da fonte de dados.
 * Consome a API Olho Vivo via HTTP.
 */
export class OlhoVivoApiSource implements RealtimeDataSource {
  // Delegado para autenticar na API real (retorna true se bem-sucedido)
  async autenticar(): Promise<boolean> {
    // Tenta autenticar usando o SPTransAPIReal
    try {
      // Chama o login da API real
      await SPTransAPIReal.autenticar();
      // Se não lançou erro, autenticou com sucesso
      return true;
    } catch (error) {
      // Em caso de falha, loga e devolve false para ativar o mock
      console.warn('Falha ao autenticar na API real:', error);
      return false;
    }
  }

  // Busca linhas chamando a API Real
  async buscarLinhas(texto: string): Promise<any[]> {
    return SPTransAPIReal.buscarLinhas(texto);
  }
  // Busca paradas chamando a API Real
  async buscarParadas(texto: string): Promise<any[]> {
    return SPTransAPIReal.buscarParadas(texto);
  }
  // Busca previsões chamando a API Real
  async buscarPrevisoes(codigoLinha: number): Promise<any[]> {
    return SPTransAPIReal.buscarPrevisoes(codigoLinha);
  }
  // Busca posição dos veículos chamando a API Real
  async buscarVeiculos(codigoLinha: number): Promise<any[]> {
    return SPTransAPIReal.buscarVeiculos(codigoLinha);
  }
}

/**
 * Implementação MOCK da fonte de dados.
 * Simula a API Olho Vivo usando dados do GTFS local.
 */
export class OlhoVivoMockSource implements RealtimeDataSource {
  // Delegado para autenticar: no mock, sempre considera que não há sessão real
  async autenticar(): Promise<boolean> {
    // O mock não depende de autenticação; devolve false para indicar modo demo
    return false;
  }
  // Busca linhas usando o serviço de mock GTFS
  async buscarLinhas(texto: string): Promise<any[]> {
    return SPTransMock.buscarLinhas(texto);
  }
  // Busca paradas usando o serviço de mock GTFS
  async buscarParadas(texto: string): Promise<any[]> {
    return SPTransMock.buscarParadas(texto);
  }
  // Busca previsões usando o serviço de mock GTFS
  async buscarPrevisoes(codigoLinha: number): Promise<any[]> {
    return SPTransMock.buscarPrevisoes(codigoLinha);
  }
  // Busca veículos usando o serviço de mock GTFS
  async buscarVeiculos(codigoLinha: number): Promise<any[]> {
    return SPTransMock.buscarVeiculos(codigoLinha);
  }
}

// Fonte ativa no momento; inicia como mock para evitar dependência de rede na primeira leitura
let activeSource: RealtimeDataSource = new OlhoVivoMockSource();
// Indica se o app está em modo demonstração (mock ativado)
let isDemoMode = true;

/**
 * Serviço de gerenciamento de tempo real.
 * Tenta autenticar na API real; se falhar, usa o mock GTFS.
 */
export const RealtimeService = {
  /**
   * Tenta autenticar na API real. Se falhar, ativa o modo demonstração.
   * Deve ser chamado na inicialização do app.
   * @param forceDemo - Se true, pula autenticação e ativa mock direto (preferência do usuário)
   */
  async initialize(forceDemo = false): Promise<void> {
    // Se forçado a demo, pula autenticação
    if (forceDemo) {
      activeSource = new OlhoVivoMockSource();
      isDemoMode = true;
      console.log('Modo Demonstração forçado (preferência do usuário).');
      return;
    }
    try {
      // Testa a autenticação na API real
      const sucesso = await new OlhoVivoApiSource().autenticar();
      if (sucesso) {
        // Se autenticou, usa a fonte real e desliga o modo demo
        activeSource = new OlhoVivoApiSource();
        isDemoMode = false;
        console.log('Sessão SPTrans ativa: Modo Real habilitado.');
      } else {
        // Se a API recusou o token, ativa o mock
        activeSource = new OlhoVivoMockSource();
        isDemoMode = true;
      }
    } catch (error) {
      // Em caso de erro de rede ou timeout, ativa o mock para o app não travar
      console.warn('Falha na autenticação SPTrans. Ativando Modo Demonstração.');
      activeSource = new OlhoVivoMockSource();
      isDemoMode = true;
    }
  },

  /**
   * Retorna a fonte de dados ativa no momento.
   */
  getSource(): RealtimeDataSource {
    return activeSource;
  },

  /**
   * Verifica se o app está rodando em modo demonstração.
   */
  getIsDemoMode(): boolean {
    return isDemoMode;
  },

  /**
   * Força a troca para o modo demonstração (útil para apresentações).
   */
  forceDemoMode(): void {
    activeSource = new OlhoVivoMockSource();
    isDemoMode = true;
  },

  /**
   * Tenta forçar o modo real (reexecuta a autenticação).
   */
  async forceRealMode(): Promise<void> {
    await this.initialize();
  }
};
