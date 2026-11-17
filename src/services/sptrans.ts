// Importa o axios para fazer requisições HTTP
import axios from 'axios';
// Importa o Platform para saber se o app está rodando no navegador ou no celular
import { Platform } from 'react-native';
// Importa o serviço simulado (dados de src/mocks/sptransMocks.ts) com as mesmas funções da API real
import * as SPTransMock from './sptransMockService';

// Liga os dados simulados: true = usa mocks locais; false = chama a API real da SPTrans
const USE_MOCK = true;

// URL base real da API Olho Vivo da SPTrans (v2.1)
const BASE_URL = 'https://api.olhovivo.sptrans.com.br/v2.1';

// Proxy CORS público, usado somente no navegador (o navegador bloqueia a API por CORS)
const PROXY = 'https://corsproxy.io/?url=';

// Indica se o app está rodando no navegador web
const IS_WEB = Platform.OS === 'web';

// Obtém o token da API do ambiente (variável de ambiente Expo pública), sem espaços extras
const TOKEN = (process.env.EXPO_PUBLIC_SPTRANS_TOKEN || '').trim();

// Indica se a sessão já foi autenticada com sucesso
let autenticado = false;

/**
 * Monta a URL final da requisição
 * No navegador encapsula a URL no proxy CORS; no celular usa a URL direta
 * @param endpoint - Endpoint da API (ex: /Linha/Buscar?termosBusca=8000)
 */
function montarUrl(endpoint: string): string {
  // Monta a URL completa da API
  const urlCompleta = `${BASE_URL}${endpoint}`;
  // No navegador passa pelo proxy; no celular vai direto
  return IS_WEB ? `${PROXY}${encodeURIComponent(urlCompleta)}` : urlCompleta;
}

/**
 * Monta a descrição do sentido da linha a partir dos letreiros da API
 * @param l - Objeto de linha retornado pela API
 */
function descreverSentido(l: any): string {
  // Sentido 1: Terminal Principal -> Terminal Secundário
  if (l.sl === 1) return `${l.tp} → ${l.ts}`;
  // Sentido 2: Terminal Secundário -> Terminal Principal
  return `${l.ts} → ${l.tp}`;
}

/**
 * Serviço para integração com a API Olho Vivo da SPTrans
 * Fornece funções para autenticação e busca de linhas, paradas, previsões e veículos
 */
// Implementação real da API (mantida para voltar a usá-la quando houver token válido)
export const SPTransAPIReal = {
  /**
   * Autentica na API Olho Vivo
   * A API responde apenas true (sucesso) ou false (token recusado)
   */
  async autenticar(): Promise<void> {
    // Se não houver token configurado, avisa o usuário
    if (!TOKEN) {
      // Lança erro explicando como configurar
      throw new Error('Token não configurado: defina EXPO_PUBLIC_SPTRANS_TOKEN no arquivo .env');
    }

    try {
      // Envia o POST de autenticação com o token na query string
      const response = await axios.post(montarUrl(`/Login/Autenticar?token=${TOKEN}`), null, {
        // Permite que o celular guarde e reenvie o cookie de sessão
        withCredentials: !IS_WEB,
      });

      // Aceita true booleano ou "true" em texto
      autenticado = response.data === true || response.data === 'true';

      // Se a API respondeu false, o token foi recusado pela SPTrans
      if (!autenticado) {
        // Lança erro com a resposta exata da API
        throw new Error('A SPTrans recusou o token (resposta: false). Verifique o token no portal.');
      }
    } catch (error) {
      // Erros de rede/HTTP recebem uma mensagem mais clara
      if (axios.isAxiosError(error)) {
        // Lança erro com o detalhe do axios
        throw new Error(`Falha de conexão na autenticação: ${error.message}`);
      }
      // Repassa os demais erros (ex: token recusado)
      throw error;
    }
  },

  /**
   * Faz uma requisição GET autenticada para um endpoint da API
   * @param endpoint - Endpoint da API (sem a URL base)
   * @param tentarNovamente - Se deve reautenticar uma vez ao receber 401
   */
  async requisicao(endpoint: string, tentarNovamente = true): Promise<any> {
    // Autentica antes da primeira chamada
    if (!autenticado) {
      // Obtém a sessão
      await this.autenticar();
    }

    try {
      // Faz a requisição GET
      const response = await axios.get(montarUrl(endpoint), {
        // Envia o cookie de sessão no celular
        withCredentials: !IS_WEB,
      });
      // Retorna os dados da resposta
      return response.data;
    } catch (error) {
      // Se a sessão expirou (401), autentica de novo e repete uma única vez
      if (axios.isAxiosError(error) && error.response?.status === 401 && tentarNovamente) {
        // Marca a sessão como inválida
        autenticado = false;
        // Repete a requisição sem nova tentativa
        return this.requisicao(endpoint, false);
      }
      // Se o 401 persistir, explica a causa provável
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        // Lança erro de autorização
        throw new Error('A SPTrans negou o acesso (401). No navegador o proxy não repassa o cookie de sessão.');
      }
      // Demais erros
      throw new Error(`Erro ao acessar ${endpoint}: ${error instanceof Error ? error.message : error}`);
    }
  },

  /**
   * Busca linhas de ônibus por número ou nome
   * @param texto - Texto para buscar (ex: 8000, Lapa)
   * @returns Linhas no formato usado pelas telas (cd, lt, sl, tl)
   */
  async buscarLinhas(texto: string): Promise<any[]> {
    // Consulta o endpoint de linhas
    const resposta = await this.requisicao(`/Linha/Buscar?termosBusca=${encodeURIComponent(texto)}`);
    // Se não vier um array, não há resultados
    if (!Array.isArray(resposta)) return [];
    // Converte os campos da API para os campos usados nas telas
    return resposta.map((l: any) => ({
      // Código identificador da linha (a API chama de cl)
      cd: l.cl,
      // Letreiro completo, ex: 8000-10
      lt: `${l.lt}-${l.tl}`,
      // Sentido numérico (1 ou 2)
      sl: l.sl,
      // Descrição do sentido, ex: PCA.RAMOS DE AZEVEDO → TERMINAL LAPA
      tl: descreverSentido(l),
    }));
  },

  /**
   * Busca paradas de ônibus por nome ou endereço
   * @param texto - Texto para buscar (ex: Afonso, Paulista)
   * @returns Paradas com cp (código), np (nome) e ed (endereço)
   */
  async buscarParadas(texto: string): Promise<any[]> {
    // Consulta o endpoint de paradas
    const resposta = await this.requisicao(`/Parada/Buscar?termosBusca=${encodeURIComponent(texto)}`);
    // Retorna o array ou vazio se não houver resultados
    return Array.isArray(resposta) ? resposta : [];
  },

  /**
   * Busca previsões de chegada da linha em todas as paradas
   * @param codigoLinha - Código identificador da linha
   * @returns Lista achatada de previsões { p: código da parada, t: horário, s: sentido }
   */
  async buscarPrevisoes(codigoLinha: number): Promise<any[]> {
    // Consulta o endpoint de previsões por linha
    const resposta = await this.requisicao(`/Previsao/Linha?codigoLinha=${codigoLinha}`);
    // A resposta tem o formato { hr, ps: [ { cp, np, vs: [ { p, t, ... } ] } ] }
    if (!resposta || !Array.isArray(resposta.ps)) return [];
    // Lista final de previsões
    const previsoes: any[] = [];
    // Percorre cada parada
    for (const parada of resposta.ps) {
      // Percorre cada veículo previsto para a parada
      for (const v of parada.vs || []) {
        // Adiciona a previsão no formato usado pela tela
        previsoes.push({ p: parada.cp, t: v.t, s: 0 });
      }
    }
    // Ordena pelo horário previsto
    return previsoes.sort((a, b) => String(a.t).localeCompare(String(b.t)));
  },

  /**
   * Busca a posição dos veículos em operação na linha
   * @param codigoLinha - Código identificador da linha
   * @returns Veículos { id: prefixo, lat, lon, hr: horário da captura }
   */
  async buscarVeiculos(codigoLinha: number): Promise<any[]> {
    // Consulta o endpoint de posição por linha
    const resposta = await this.requisicao(`/Posicao/Linha?codigoLinha=${codigoLinha}`);
    // A resposta tem o formato { hr, vs: [ { p, a, ta, py, px } ] }
    if (!resposta || !Array.isArray(resposta.vs)) return [];
    // Converte os campos da API para os campos usados na tela
    return resposta.vs.map((v: any) => ({
      // Prefixo do veículo
      id: v.p,
      // Latitude (py) convertida para número
      lat: Number(v.py),
      // Longitude (px) convertida para número
      lon: Number(v.px),
      // Horário da captura em formato local (ex: 14:30:37)
      hr: v.ta ? new Date(v.ta).toLocaleTimeString('pt-BR') : '',
    }));
  },
};

// Serviço usado pelas telas: escolhe entre os dados simulados e a API real conforme USE_MOCK
export const SPTransAPI = {
  // Busca linhas no mock ou na API real
  buscarLinhas: (texto: string): Promise<any[]> =>
    // Encaminha a chamada para a implementação escolhida
    USE_MOCK ? SPTransMock.buscarLinhas(texto) : SPTransAPIReal.buscarLinhas(texto),
  // Busca paradas no mock ou na API real
  buscarParadas: (texto: string): Promise<any[]> =>
    // Encaminha a chamada para a implementação escolhida
    USE_MOCK ? SPTransMock.buscarParadas(texto) : SPTransAPIReal.buscarParadas(texto),
  // Busca previsões no mock ou na API real
  buscarPrevisoes: (codigoLinha: number): Promise<any[]> =>
    // Encaminha a chamada para a implementação escolhida
    USE_MOCK ? SPTransMock.buscarPrevisoes(codigoLinha) : SPTransAPIReal.buscarPrevisoes(codigoLinha),
  // Busca veículos no mock ou na API real
  buscarVeiculos: (codigoLinha: number): Promise<any[]> =>
    // Encaminha a chamada para a implementação escolhida
    USE_MOCK ? SPTransMock.buscarVeiculos(codigoLinha) : SPTransAPIReal.buscarVeiculos(codigoLinha),
};
