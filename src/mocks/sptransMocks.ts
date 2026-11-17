// Dados SIMULADOS no mesmo formato da API Olho Vivo da SPTrans (documentação v2.1).
// Usados porque a SPTrans recusou todos os tokens testados. Nomes inspirados em linhas
// e locais reais de São Paulo; códigos, horários e posições são fictícios.

// Tipo de uma parada no formato bruto retornado por /Parada/Buscar
export interface ParadaMock {
  // Código identificador da parada
  cp: number;
  // Nome da parada
  np: string;
  // Endereço de localização da parada
  ed: string;
  // Latitude da parada
  py: number;
  // Longitude da parada
  px: number;
}

// Tipo de uma linha no formato bruto retornado por /Linha/Buscar, com a lista de paradas atendidas
export interface LinhaMock {
  // Código identificador da linha (um código por sentido)
  cl: number;
  // Indica se a linha é circular
  lc: boolean;
  // Primeira parte do letreiro numérico (ex: 8000)
  lt: string;
  // Segunda parte do letreiro (10 = linha base)
  tl: number;
  // Sentido: 1 = principal para secundário, 2 = secundário para principal
  sl: number;
  // Letreiro do terminal principal
  tp: string;
  // Letreiro do terminal secundário
  ts: string;
  // Códigos das paradas atendidas, na ordem do percurso
  paradas: number[];
}

// Lista de paradas simuladas, usada pela busca de paradas e para posicionar os veículos
export const PARADAS_MOCK: ParadaMock[] = [
  // Parada citada como exemplo na documentação da SPTrans
  { cp: 340015329, np: 'AFONSO BRAZ B/C1', ed: 'R ARMINDA/ R BALTHAZAR DA VEIGA', py: -23.592938, px: -46.672727 },
  // Parada próxima à Av. São João
  { cp: 700016623, np: 'ANA CINTRA B/C', ed: 'R ANA CINTRA/ AL NOTHMANN', py: -23.5355, px: -46.644 },
  // Parada citada no exemplo de previsão da documentação
  { cp: 4200953, np: 'PARADA ROBERTO SELMI DEI B/C', ed: 'AV ROBERTO SELMI DEI', py: -23.675901, px: -46.752812 },
  // Ponto inicial da linha 8000 no centro
  { cp: 260016859, np: 'PCA. RAMOS DE AZEVEDO', ed: 'PCA RAMOS DE AZEVEDO/ R XAVIER DE TOLEDO', py: -23.5455, px: -46.638 },
  // Terminal da Lapa
  { cp: 260015040, np: 'TERMINAL LAPA', ed: 'R GUAICURUS/ R CATAO', py: -23.5225, px: -46.703 },
  // Parada em frente ao MASP
  { cp: 480014870, np: 'MASP B/C', ed: 'AV PAULISTA, 1578', py: -23.5614, px: -46.6559 },
  // Parada na esquina da Consolação com a Paulista
  { cp: 480014871, np: 'CONSOLACAO B/C', ed: 'R DA CONSOLACAO/ AV PAULISTA', py: -23.556, px: -46.662 },
  // Parada no Metrô Jabaquara
  { cp: 120011234, np: 'METRO JABAQUARA', ed: 'AV ENG ARMANDO DE ARRUDA PEREIRA', py: -23.646, px: -46.641 },
  // Parada no Jardim São Jorge
  { cp: 120011500, np: 'JD. SAO JORGE', ed: 'AV CUPECE/ R JD SAO JORGE', py: -23.665, px: -46.655 },
  // Terminal João Dias
  { cp: 410013200, np: 'TERM. JOAO DIAS', ed: 'AV JOAO DIAS', py: -23.644, px: -46.727 },
  // Parada no Jardim Maracá
  { cp: 410013300, np: 'JD. MARACA', ed: "EST DO M'BOI MIRIM", py: -23.689, px: -46.765 },
  // Parada na Praça da Sé
  { cp: 600010010, np: 'PCA. DA SE', ed: 'PCA DA SE', py: -23.5503, px: -46.6339 },
  // Terminal Bandeira
  { cp: 600010030, np: 'TERM. BANDEIRA', ed: 'PCA DA BANDEIRA', py: -23.549, px: -46.639 },
  // Terminal Capelinha
  { cp: 600010040, np: 'TERM. CAPELINHA', ed: 'EST DE ITAPECERICA', py: -23.662, px: -46.772 },
  // Parada no cruzamento da Rebouças com a Av. Brasil
  { cp: 600010050, np: 'REBOUCAS B/C', ed: 'AV REBOUCAS/ AV BRASIL', py: -23.57, px: -46.671 },
  // Parada no Largo da Batata
  { cp: 600010060, np: 'LARGO DA BATATA', ed: 'AV BRIG FARIA LIMA/ R TEODORO SAMPAIO', py: -23.567, px: -46.693 },
];

// Lista de linhas simuladas (cada linha aparece uma vez por sentido, como na API real)
export const LINHAS_MOCK: LinhaMock[] = [
  // Linha 8000-10, sentido 1 (exemplo da documentação da SPTrans)
  { cl: 1273, lc: false, lt: '8000', tl: 10, sl: 1, tp: 'PCA.RAMOS DE AZEVEDO', ts: 'TERMINAL LAPA', paradas: [260016859, 700016623, 260015040] },
  // Linha 8000-10, sentido 2 (mesmo percurso invertido)
  { cl: 34041, lc: false, lt: '8000', tl: 10, sl: 2, tp: 'PCA.RAMOS DE AZEVEDO', ts: 'TERMINAL LAPA', paradas: [260015040, 700016623, 260016859] },
  // Linha 5015-10, sentido 1
  { cl: 33887, lc: false, lt: '5015', tl: 10, sl: 1, tp: 'METRO JABAQUARA', ts: 'JD. SAO JORGE', paradas: [120011234, 120011500] },
  // Linha 5015-10, sentido 2
  { cl: 33888, lc: false, lt: '5015', tl: 10, sl: 2, tp: 'METRO JABAQUARA', ts: 'JD. SAO JORGE', paradas: [120011500, 120011234] },
  // Linha 7021-10, sentido 1
  { cl: 1989, lc: false, lt: '7021', tl: 10, sl: 1, tp: 'TERM. JOAO DIAS', ts: 'JD. MARACA', paradas: [410013200, 4200953, 410013300] },
  // Linha 7021-10, sentido 2
  { cl: 34757, lc: false, lt: '7021', tl: 10, sl: 2, tp: 'TERM. JOAO DIAS', ts: 'JD. MARACA', paradas: [410013300, 4200953, 410013200] },
  // Linha 6450-10, sentido 1
  { cl: 2101, lc: false, lt: '6450', tl: 10, sl: 1, tp: 'TERM. BANDEIRA', ts: 'TERM. CAPELINHA', paradas: [600010030, 600010050, 600010060, 340015329, 600010040] },
  // Linha 6450-10, sentido 2
  { cl: 35869, lc: false, lt: '6450', tl: 10, sl: 2, tp: 'TERM. BANDEIRA', ts: 'TERM. CAPELINHA', paradas: [600010040, 340015329, 600010060, 600010050, 600010030] },
  // Linha 177H-10, sentido 1
  { cl: 1520, lc: false, lt: '177H', tl: 10, sl: 1, tp: 'PCA. DA SE', ts: 'AV. PAULISTA', paradas: [600010010, 480014871, 480014870] },
  // Linha 177H-10, sentido 2
  { cl: 34288, lc: false, lt: '177H', tl: 10, sl: 2, tp: 'PCA. DA SE', ts: 'AV. PAULISTA', paradas: [480014870, 480014871, 600010010] },
];
