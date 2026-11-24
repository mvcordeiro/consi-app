/**
 * Modelo de dados do catálogo de hobbies e atividades.
 *
 * Pensado para virar a API do Consi: cada tipo aqui corresponde a um recurso do servidor
 * (ver fonte.ts). Hoje os dados vêm do próprio app; amanhã, de GET /hobbies, GET /atividades…
 * Campos opcionais são os que o servidor pode omitir; ids são strings estáveis (slugs).
 */
import type { ImageSourcePropType } from 'react-native';

import type { NomeIcone } from '@/components/icones';

// ─── Hobbies ────────────────────────────────────────────────────────────────
export type HobbyId = string;

export type CategoriaId =
  | 'musica'
  | 'telas'
  | 'artes'
  | 'palavras'
  | 'jogos'
  | 'maos'
  | 'corpo'
  | 'pessoas'
  | 'natureza'
  | 'meus';

export type Categoria = { id: CategoriaId; nome: string; descricao: string };

export type HobbyInfo = {
  id: HobbyId;
  nome: string;
  categoria: CategoriaId;
  /** Ícone do Design System. */
  icone: NomeIcone;
  /**
   * O ícone do DS é só uma aproximação (o DS não tem um ícone para esse hobby).
   * Fica marcado para o time de design desenhar um próprio.
   */
  iconeProvisorio?: boolean;
  /** Termos que levam a este hobby numa busca (sinônimos, variações). */
  termos?: string[];
  /** Hobbies parecidos, sugeridos perto deste no canvas. */
  relacionados?: HobbyId[];
};

// ─── Conteúdo em blocos (estilo Notion) ─────────────────────────────────────
export type TipoBloco =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'texto'
  | 'lista'
  | 'numerada'
  | 'tarefa'
  | 'citacao'
  | 'dica'
  | 'imagem'
  | 'divisor';

/**
 * Um bloco de conteúdo. Como no Notion, cada item de lista é um bloco: itens seguidos
 * do mesmo tipo formam a lista (e a numeração conta a partir do primeiro).
 */
export type Bloco = {
  id: string;
  tipo: TipoBloco;
  texto?: string;
  /** Só para "tarefa". */
  feito?: boolean;
  /** Só para "imagem": uri local/remota ou um require(). */
  imagem?: string | ImageSourcePropType;
  /** Proporção largura/altura da imagem, para reservar o espaço antes de carregar. */
  proporcao?: number;
};

// ─── Atividades ─────────────────────────────────────────────────────────────
export type Autor = { id?: string; usuario: string; iniciais: string; foto?: ImageSourcePropType };

export type Visibilidade = 'privada' | 'comunidade';

/** O que o autor permite para quem vê ou adiciona a atividade. */
export type Permissoes = {
  /** Outras pessoas podem comentar. */
  comentarios: boolean;
  /** Quem adiciona pode editar a própria cópia ("Remix"). */
  remix: boolean;
  /** Mostrar o nome do autor (senão aparece como "Alguém da comunidade"). */
  mostrarAutor: boolean;
};

/**
 * Atividade do catálogo (sugestão da comunidade ou do Consi). Quando a pessoa aceita,
 * vira uma AtividadeMinha que guarda o id de origem.
 */
export type Atividade = {
  id: string;
  hobby: HobbyId;
  titulo: string;
  /** Prévia de até duas linhas no card. */
  resumo: string;
  conteudo: Bloco[];
  minutos: number;
  /** Ícone escolhido pelo autor; sem ele, vale o do hobby. */
  icone?: NomeIcone;
  capa?: string | ImageSourcePropType;
  autor: Autor;
  /** Há quanto tempo foi publicada, já formatado ("3d atrás"). As sugestões do Consi não têm. */
  quando?: string;
  permissoes: Permissoes;
  totalComentarios: number;
};

export type Sentimento = 'leveza' | 'calma' | 'cansaco' | 'distracao';

/** `semanal`: repete no mesmo dia da semana e horário (issue #13). */
export type Lembrete = { quando: number; rotulo: string; semanal?: boolean };

export type AtividadeMinha = Omit<Atividade, 'quando'> & {
  /** Id da atividade do catálogo que originou esta (ausente se a pessoa criou do zero). */
  origemId?: string;
  /** A pessoa criou do zero (pode editar sempre). */
  criadaPorMim: boolean;
  /** Autor original, quando a pessoa editou (fez um remix de) uma atividade de outra pessoa. */
  remixDe?: Autor;
  visibilidade: Visibilidade;
  status: 'andamento' | 'concluida';
  novidade: boolean;
  criadaEm: number;
  concluidaEm?: number;
  /** Versões antigas: Leveza, Calma, Cansaço ou Distração. As novas guardam `emocao`. */
  sentimento?: Sentimento;
  /** Emoção do Diário escolhida ao finalizar (ver data/emocoes.ts). */
  emocao?: string;
  /** O momento do Diário criado ao finalizar (o instante `em`). */
  momentoEm?: number;
  nota?: string;
  lembrete?: Lembrete;
};

// ─── Conversas ──────────────────────────────────────────────────────────────
export type ReacaoId = 'curti' | 'haha' | 'amei' | 'uau' | 'emocionei' | 'parabens';

export type Comentario = {
  id: string;
  /** Atividade (do catálogo ou minha) onde o comentário está. */
  itemId: string;
  /** Comentário respondido; ausente na raiz da conversa. */
  paiId?: string;
  autor: Autor;
  quando?: string;
  texto?: string;
  imagem?: string;
  reacoes: Partial<Record<ReacaoId, number>>;
  meu?: boolean;
};
