/**
 * Textos da Comunidade (sugestões, novidades e moderação): rótulos dos enums do banco e a
 * mensagem certa para cada erro da nuvem. Um lugar só para o mesmo nome aparecer igual em toda tela.
 */
import { ehErroNuvem } from '@/data/nuvem/cliente';
import type { CategoriaSugestao, Moderacao, StatusSugestao, TipoItemVersao } from '@/data/nuvem/tipos';

import type { TomEtiqueta } from '../Etiqueta';

export const NOME_STATUS: Record<StatusSugestao, string> = {
  aberta: 'Aberta',
  em_analise: 'Em análise',
  planejada: 'Planejada',
  em_andamento: 'Em andamento',
  lancada: 'Lançada',
  recusada: 'Recusada',
};

export const TOM_STATUS: Record<StatusSugestao, TomEtiqueta> = {
  aberta: 'neutro',
  em_analise: 'info',
  planejada: 'info',
  em_andamento: 'aviso',
  lancada: 'sucesso',
  recusada: 'erro',
};

export const NOME_CATEGORIA: Record<CategoriaSugestao, string> = {
  pausa: 'Pausa',
  diario: 'Diário',
  hobbies: 'Hobbies',
  home: 'Início',
  outro: 'Outro',
};

/** Como a moderação aparece para quem enviou e para o admin. */
export const NOME_MODERACAO: Record<Moderacao, string> = {
  pendente: 'Aguardando revisão',
  publicada: 'Publicada',
  rejeitada: 'Não publicada',
  escondida: 'Escondida',
};

export const NOME_ITEM: Record<TipoItemVersao, string> = {
  novo: 'Novo',
  melhoria: 'Melhorias',
  correcao: 'Correções',
};

/** Frase para mostrar a quem usa, a partir de qualquer erro vindo de src/data/nuvem. */
export function mensagemErro(erro: unknown): string {
  if (ehErroNuvem(erro, 'offline')) return 'Sem conexão. Confira a internet e tente de novo.';
  if (ehErroNuvem(erro, 'limite-diario')) return 'Você já enviou 3 sugestões hoje. Volte amanhã para mandar mais.';
  if (ehErroNuvem(erro, 'nao-configurada')) return 'As sugestões ainda não estão disponíveis nesta versão.';
  if (ehErroNuvem(erro, 'sem-permissao')) return erro.message || 'Você não tem permissão para isso.';
  return 'Algo deu errado do nosso lado. Tente de novo em instantes.';
}

/** "há 3 dias", "hoje", "21 de nov." — datas curtas e humanas nas listas. */
export function quando(iso: string): string {
  const d = new Date(iso);
  const dias = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (dias <= 0) return 'hoje';
  if (dias === 1) return 'ontem';
  if (dias < 7) return `há ${dias} dias`;
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
}

/** "21 de novembro de 2026" a partir de AAAA-MM-DD (sem fuso: é uma data, não um instante). */
export function dataLonga(aaaaMmDd: string): string {
  const [a, m, d] = aaaaMmDd.split('-').map(Number);
  return new Date(a, m - 1, d).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
}
