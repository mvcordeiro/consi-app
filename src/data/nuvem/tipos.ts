/**
 * Tipos da nuvem (espelham supabase/migrations/0001_sugestoes.sql) e conversão snake_case → camelCase.
 */

export type Moderacao = 'pendente' | 'publicada' | 'rejeitada' | 'escondida';
export type StatusSugestao = 'aberta' | 'em_analise' | 'planejada' | 'em_andamento' | 'lancada' | 'recusada';
export type CategoriaSugestao = 'pausa' | 'diario' | 'hobbies' | 'home' | 'outro';
export type ValorVoto = -1 | 0 | 1;

export const MODERACOES: readonly Moderacao[] = ['pendente', 'publicada', 'rejeitada', 'escondida'];
export const STATUS_SUGESTAO: readonly StatusSugestao[] = [
  'aberta',
  'em_analise',
  'planejada',
  'em_andamento',
  'lancada',
  'recusada',
];
export const CATEGORIAS_SUGESTAO: readonly CategoriaSugestao[] = ['pausa', 'diario', 'hobbies', 'home', 'outro'];

/** Limites iguais aos `check` do banco, para validar antes de enviar. */
export const LIMITES = { tituloMin: 5, tituloMax: 80, descricaoMax: 1000, respostaMax: 1000, motivoMax: 500 } as const;

export type Placar = { pontos: number; votosPos: number; votosNeg: number };

export type Sugestao = Placar & {
  id: string;
  titulo: string;
  descricao: string | null;
  categoria: CategoriaSugestao | null;
  moderacao: Moderacao;
  status: StatusSugestao;
  /** Resposta oficial (ou o motivo, quando rejeitada). */
  resposta: string | null;
  duplicadaDe: string | null;
  versaoLancada: string | null;
  criadaEm: string;
  atualizadaEm: string;
  /** Foi a pessoa deste aparelho que enviou. */
  minha: boolean;
  /** Voto desta pessoa: 1, -1 ou 0 (sem voto). */
  meuVoto: ValorVoto;
};

/** Sugestão vista pelo admin: inclui o número de denúncias. */
export type SugestaoModeracao = Sugestao & { denuncias: number };

export type TipoItemVersao = 'novo' | 'melhoria' | 'correcao';
export type ItemVersao = { tipo: TipoItemVersao; texto: string };

export type Versao = {
  id: string;
  versao: string;
  titulo: string | null;
  /** AAAA-MM-DD */
  data: string;
  itens: ItemVersao[];
  publicada: boolean;
  /** Sugestões da comunidade lançadas nesta versão ("Ideia da comunidade"). */
  sugestoes: { id: string; titulo: string }[];
};

// ---------------------------------------------------------------------------
// Linhas do banco
// ---------------------------------------------------------------------------

export type LinhaSugestao = {
  id: string;
  autor: string;
  titulo: string;
  descricao: string | null;
  categoria: CategoriaSugestao | null;
  moderacao: Moderacao;
  status: StatusSugestao;
  resposta: string | null;
  duplicada_de: string | null;
  versao_lancada: string | null;
  pontos: number;
  votos_pos: number;
  votos_neg: number;
  criada_em: string;
  atualizada_em: string;
};

export type LinhaVersao = {
  id: string;
  versao: string;
  titulo: string | null;
  data: string;
  itens: unknown;
  publicada: boolean;
};

export const COLUNAS_SUGESTAO =
  'id, autor, titulo, descricao, categoria, moderacao, status, resposta, duplicada_de, versao_lancada, pontos, votos_pos, votos_neg, criada_em, atualizada_em';

export function paraSugestao(l: LinhaSugestao, eu: string | null, meuVoto: ValorVoto = 0): Sugestao {
  return {
    id: l.id,
    titulo: l.titulo,
    descricao: l.descricao,
    categoria: l.categoria,
    moderacao: l.moderacao,
    status: l.status,
    resposta: l.resposta,
    duplicadaDe: l.duplicada_de,
    versaoLancada: l.versao_lancada,
    pontos: l.pontos,
    votosPos: l.votos_pos,
    votosNeg: l.votos_neg,
    criadaEm: l.criada_em,
    atualizadaEm: l.atualizada_em,
    minha: eu !== null && l.autor === eu,
    meuVoto,
  };
}

function itensValidos(itens: unknown): ItemVersao[] {
  if (!Array.isArray(itens)) return [];
  return itens.flatMap((i) => {
    const { tipo, texto } = (i ?? {}) as Record<string, unknown>;
    if ((tipo !== 'novo' && tipo !== 'melhoria' && tipo !== 'correcao') || typeof texto !== 'string') return [];
    return [{ tipo, texto }];
  });
}

export function paraVersao(l: LinhaVersao, sugestoes: Versao['sugestoes'] = []): Versao {
  return {
    id: l.id,
    versao: l.versao,
    titulo: l.titulo,
    data: l.data,
    itens: itensValidos(l.itens),
    publicada: l.publicada,
    sugestoes,
  };
}
