/**
 * Fonte do catálogo: o contrato entre o app e o servidor.
 *
 * Hoje `fonteLocal` responde com os dados que vêm no app. Para ligar o servidor, basta
 * escrever outra implementação de `FonteCatalogo` (com fetch) e trocar `fonte` abaixo —
 * as telas e o estado (hobbiesEstado.tsx) só conversam com esta interface.
 *
 * Endpoints previstos:
 *   GET  /hobbies                             → listarHobbies, listarCategorias
 *   GET  /atividades?hobby=&cursor=           → listarAtividades (paginado)
 *   GET  /atividades/:id                      → buscarAtividade
 *   POST /atividades                          → publicarAtividade (visibilidade "comunidade")
 *   GET  /atividades/:id/comentarios          → listarComentarios
 *   POST /atividades/:id/comentarios          → comentar (com paiId para responder, imagem opcional)
 *   PUT  /comentarios/:id/reacao              → reagir (null remove)
 */
import { listarAtividadesComunidade, publicarAtividadeComunidade } from '@/data/nuvem/atividades';

import { atividadesCatalogo } from './atividades';
import { catalogoHobbies, categorias } from './hobbies';
import type { Atividade, Categoria, Comentario, HobbyId, HobbyInfo, ReacaoId } from './tipos';

export type Pagina<T> = { itens: T[]; proximo?: string };

export interface FonteCatalogo {
  listarCategorias(): Promise<Categoria[]>;
  listarHobbies(): Promise<HobbyInfo[]>;
  listarAtividades(hobby: HobbyId, cursor?: string): Promise<Pagina<Atividade>>;
  buscarAtividade(id: string): Promise<Atividade | undefined>;
  publicarAtividade(a: Atividade): Promise<Atividade>;
  listarComentarios(itemId: string, hobby: HobbyId): Promise<Comentario[]>;
  comentar(c: Comentario): Promise<Comentario>;
  reagir(comentarioId: string, reacao: ReacaoId | null): Promise<void>;
}

const TAMANHO_PAGINA = 20;

/** Implementação local: lê o catálogo que vem no app e aceita as escritas sem enviar nada. */
export const fonteLocal: FonteCatalogo = {
  async listarCategorias() {
    return categorias;
  },
  async listarHobbies() {
    return catalogoHobbies;
  },
  async listarAtividades(hobby, cursor) {
    const todas = atividadesCatalogo.filter((x) => x.hobby === hobby);
    const inicio = cursor ? Number(cursor) : 0;
    const fim = inicio + TAMANHO_PAGINA;
    return { itens: todas.slice(inicio, fim), proximo: fim < todas.length ? String(fim) : undefined };
  },
  async buscarAtividade(id) {
    return atividadesCatalogo.find((x) => x.id === id);
  },
  async publicarAtividade(a) {
    return a;
  },
  async listarComentarios() {
    return [];
  },
  async comentar(c) {
    return c;
  },
  async reagir() {},
};

/**
 * Catálogo do app + atividades que a comunidade publicou (Supabase, migration 0006). As da
 * comunidade vêm na primeira página, mais novas antes; sem rede, fica só o catálogo local.
 */
export const fonteComComunidade: FonteCatalogo = {
  ...fonteLocal,
  async listarAtividades(hobby, cursor) {
    const local = await fonteLocal.listarAtividades(hobby, cursor);
    if (cursor) return local;
    const daComunidade = await listarAtividadesComunidade(hobby).catch(() => []);
    return { ...local, itens: [...daComunidade, ...local.itens] };
  },
  async publicarAtividade(a) {
    await publicarAtividadeComunidade(a);
    return a;
  },
};

export const fonte: FonteCatalogo = fonteComComunidade;

