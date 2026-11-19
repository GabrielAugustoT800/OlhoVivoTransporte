// Utilitário para gerar chaves únicas e estáveis de linhas de ônibus.
// Uma chave deve identificar unicamente uma LINHA + SENTIDO, para que favoritar
// o sentido IDA não marque também o sentido VOLTA (e vice-versa).
//
// Fonte de dados     | campo id único (sentido) | campo id linha | campos usados na chave
// ------------------ | ------------------------ | -------------- | ------------------------
// API SPTrans real   | cl (mapeado para cd)     | cd             | lt + sl
// Mock GTFS          | sl (dir + 1)             | cd (simulado)  | lt + sl
// GTFS (routes.json) | direction.dir            | route.id       | route.id + direction.dir

export interface LinhaNormalizada {
  // Chave única e estável (string). Nunca usa índice de array.
  key: string;
  // Código da linha (cd / cl / id), quando disponível
  codigo: string | number;
  // Letreiro / nome da linha (ex: "8000-10")
  letreiro: string;
  // Sentido (ex: "1", "2", "IDA", "VOLTA")
  sentido: string;
  // Nome descritivo opcional (ex: destino do letreiro)
  nome?: string;
}

function ehLinhaJaNormalizada(raw: any): raw is LinhaNormalizada {
  return (
    raw != null &&
    typeof raw.key === 'string' &&
    raw.key !== '' &&
    typeof raw.codigo !== 'undefined' &&
    typeof raw.letreiro === 'string' &&
    typeof raw.sentido === 'string'
  );
}

/**
 * Normaliza um objeto de linha bruto de qualquer fonte (API real, mock, GTFS)
 * num formato único antes de gerar a chave.
 * Retorna null se não houver campos suficientes para identificar a linha.
 * É idempotente: se já receber um LinhaNormalizada, devolve-o igual.
 */
export function normalizarLinha(raw: any): LinhaNormalizada | null {
  if (ehLinhaJaNormalizada(raw)) return raw;

  const codigo = raw.cl ?? raw.cd ?? raw.codigo;
  const lt = raw.lt ?? raw.letreiro ?? raw.shortName ?? raw.route?.id;
  // sl (código numérico do sentido) tem prioridade sobre tl (texto descritivo),
  // pois é mais estável para compor chaves.
  const sl = raw.sl ?? raw.sentido ?? raw.dir?.dir ?? raw.tl;
  const tl = raw.tl ?? raw.headsign ?? raw.route?.longName ?? raw.nome;

  if (codigo == null && lt == null) {
    console.warn('linhaKey: linha sem identificador (cd/cl ou lt/route.id):', raw);
    return null;
  }

  const sentidoStr = sl != null ? String(sl) : String(tl ?? '');
  // Chave composta: letreiro + sentido. Única por linha + sentido.
  const key = `linha_${String(lt ?? codigo)}_${sentidoStr}`;

  return {
    key,
    codigo: codigo ?? lt ?? '',
    letreiro: String(lt ?? ''),
    sentido: sentidoStr,
    nome: tl ?? undefined,
  };
}

/**
 * Retorna a chave única de uma linha.
 * Idempotente: se `linha.key` já é uma string válida, retorna essa key direta
 * (garante que o FavoriteItem já gravado no storage gere a mesma chave que a
 * linha bruta, sem depender de campos que podem ter sido omitidos).
 * Prioridade: `cl` (código único por linha e sentido na API real SPTrans).
 * Senão: chave composta `linha_<letreiro>_<sentido>`.
 * Retorna null quando não é possível gerar uma chave válida.
 */
export function getLinhaKey(linha: any): string | null {
  // Idempotência: objeto já traz key válida (ex: FavoriteItem do storage)
  if (linha != null && typeof linha.key === 'string' && !chaveInvalida(linha.key)) {
    return linha.key;
  }
  if (linha?.cl != null) return `cl:${linha.cl}`;
  const norm = normalizarLinha(linha);
  if (!norm) return null;
  return norm.key;
}

/**
 * Verdadeiro quando a chave é inválida para ser usada como identificador de
 * favorito (undefined, null, string vazia ou literais de erro).
 */
export function chaveInvalida(key: string | null | undefined): boolean {
  return key == null || key === '' || key === 'undefined' || key === 'null' || key === 'NaN';
}
