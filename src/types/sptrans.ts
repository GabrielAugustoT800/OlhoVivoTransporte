// Interface para a resposta de autenticação do Olho Vivo
export interface AutenticacaoResponse {
  // Código de retorno da autenticação
  codigo: number;
  // Mensagem de erro ou sucesso
  mensagem: string;
  // Token de sessão para uso nas outras chamadas
  token: string;
}

// Interface para uma linha de ônibus retornada pela API
export interface Linha {
  // Código único da linha
  cd: number;
  // Nome/número da linha (ex: "2010-10 (Pça da Sé/ V. Mariana)")
  lt: string;
  // Sentido da linha (ex: 1 ou 2)
  sl: number;
  // Descrição do sentido (ex: "IDA" ou "VOLTA")
  tl: string;
}

// Interface para um ponto de parada retornado pela API
export interface Parada {
  // Código único da parada
  cp: number;
  // Nome do local/descrição da parada
  np: string;
}

// Interface para uma previsão de chegada de ônibus
export interface Previsao {
  // Parada de chegada
  p: number;
  // Hora da previsão
  t: string;
  // Sentido da linha
  s: number;
}

// Interface para posição de um veículo
export interface Veiculo {
  // Código do veículo
  id: number;
  // Latitude da posição
  lat: number;
  // Longitude da posição (corrigido: era string, agora number)
  lon: number;
  // Hora da atualização
  hr: string;
}