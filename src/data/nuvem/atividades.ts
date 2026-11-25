/**
 * Atividades da comunidade, na tabela `atividades` do Supabase (a mesma do catálogo: as do Consi
 * têm origem 'consi' e já vêm no app; aqui só lemos as de origem 'comunidade').
 * Quem publica com visibilidade "comunidade" manda para cá e, desde a migration 0006, ela entra
 * publicada na hora no "Para você" de quem tem o mesmo hobby. O admin pode esconder depois.
 * Ler não cria sessão (a RLS libera as publicadas); publicar usa a sessão anônima.
 * O nome de quem publicou é um apelido gerado pelo servidor ("Capivara Alegre"), nunca o @.
 * Só vão texto e blocos: imagens e capa ficam no aparelho.
 */
import type { NomeIcone } from '@/components/icones';
import type { Atividade, Bloco, HobbyId, Permissoes } from '@/data/catalogo/tipos';

import { consultar, nuvemConfigurada } from './cliente';

type Linha = {
  id: string;
  hobby: string;
  titulo: string;
  resumo: string;
  conteudo: Bloco[];
  minutos: number;
  icone: string | null;
  autor_nome: string | null;
  permissoes: Partial<Permissoes> | null;
  total_comentarios: number;
  criada_em: string;
};

const POR_PAGINA = 30;
const COLUNAS = 'id, hobby, titulo, resumo, conteudo, minutos, icone, autor_nome, permissoes, total_comentarios, criada_em';

/** "agora", "12 min atrás", "3h atrás", "5d atrás". */
export function haQuanto(iso: string, agora = Date.now()) {
  const min = Math.max(0, Math.floor((agora - new Date(iso).getTime()) / 60000));
  if (min < 1) return 'agora';
  if (min < 60) return `${min} min atrás`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h atrás`;
  return `${Math.floor(h / 24)}d atrás`;
}

function iniciais(nome: string) {
  return nome
    .split(/\s+/)
    .map((p) => p[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function paraAtividade(l: Linha): Atividade {
  const permissoes: Permissoes = {
    comentarios: l.permissoes?.comentarios ?? true,
    remix: l.permissoes?.remix ?? true,
    mostrarAutor: l.permissoes?.mostrarAutor ?? true,
  };
  const usuario = permissoes.mostrarAutor && l.autor_nome ? l.autor_nome : 'Alguém da comunidade';
  return {
    id: l.id,
    hobby: l.hobby,
    titulo: l.titulo,
    resumo: l.resumo,
    conteudo: Array.isArray(l.conteudo) ? l.conteudo : [],
    minutos: l.minutos,
    icone: (l.icone ?? undefined) as NomeIcone | undefined,
    autor: { usuario, iniciais: iniciais(usuario) || 'CO' },
    quando: haQuanto(l.criada_em),
    permissoes,
    totalComentarios: l.total_comentarios ?? 0,
  };
}

/** As atividades mais novas da comunidade para um hobby. Sem nuvem configurada, lista vazia. */
export async function listarAtividadesComunidade(hobby: HobbyId): Promise<Atividade[]> {
  if (!nuvemConfigurada()) return [];
  const linhas = await consultar<Linha[]>(
    (c) =>
      c
        .from('atividades')
        .select(COLUNAS)
        .eq('hobby', hobby)
        .eq('origem', 'comunidade')
        .eq('moderacao', 'publicada')
        .order('criada_em', { ascending: false })
        .limit(POR_PAGINA),
    { login: false },
  );
  return linhas.map(paraAtividade);
}

/** Publica para todos. Blocos de imagem saem (a foto é um arquivo do aparelho). */
export async function publicarAtividadeComunidade(a: Atividade): Promise<void> {
  if (!nuvemConfigurada()) return;
  const conteudo = a.conteudo
    .filter((b) => b.tipo !== 'imagem')
    .map(({ id, tipo, texto, feito }) => ({ id, tipo, texto, ...(tipo === 'tarefa' ? { feito: !!feito } : {}) }));
  const resumo = a.resumo.trim().length >= 3 ? a.resumo.trim().slice(0, 300) : a.titulo.slice(0, 300);
  await consultar((c) =>
    c.from('atividades').insert({
      id: a.id,
      hobby: a.hobby,
      titulo: a.titulo.slice(0, 120),
      resumo,
      conteudo,
      minutos: a.minutos,
      icone: a.icone ?? null,
      permissoes: a.permissoes,
    }),
  );
}
