/**
 * Hobbies criados pela pessoa (o que ela faz e não está no catálogo). Entram no catálogo como
 * os outros, na categoria "Criados por você", e ficam gravados no aparelho.
 * O id é `meu:<nome>`: mesmo antes de carregar, hobbyInfo() consegue mostrar o nome.
 */
import { useSyncExternalStore } from 'react';

import type { NomeIcone } from '@/components/icones';
import { icones } from '@/components/icones';

import { gravarEstado, lerEstado } from './banco';
import { catalogoHobbies, registrarHobby } from './catalogo/hobbies';
import type { HobbyInfo } from './catalogo/tipos';
import { hobbies as paraBolha } from './hobbies';

const CHAVE = 'consi:hobbies:personalizados';
export const PREFIXO_MEU = 'meu:';

/** Ícones sugeridos ao criar um hobby. */
export const ICONES_HOBBY_NOVO: NomeIcone[] = [
  'lampada', 'hobby-atividade', 'pincel', 'filtrar-musicas', 'hobby-leitura', 'hobby-jogos', 'camera', 'muda-planta',
  'gato', 'mapa', 'martelo', 'programacao', 'teatro', 'piscina', 'xadrez', 'pena-escrita', 'toca-discos', 'cubo',
];

let lista: HobbyInfo[] = [];
let carregou = false;
const ouvintes = new Set<() => void>();

function entrarNoCatalogo(h: HobbyInfo) {
  registrarHobby(h);
  const Svg = icones[h.icone][0];
  paraBolha[h.id] = { nome: h.nome, Icone: Svg, IconeResumo: Svg };
}

/** Carrega (uma vez) os hobbies criados e põe no catálogo. */
export async function carregarHobbiesPersonalizados() {
  if (carregou) return lista;
  carregou = true;
  try {
    const bruto = await lerEstado(CHAVE);
    if (bruto) {
      lista = JSON.parse(bruto) as HobbyInfo[];
      lista.forEach(entrarNoCatalogo);
      ouvintes.forEach((f) => f());
    }
  } catch {
    // sem armazenamento: começa sem hobbies criados
  }
  return lista;
}

function assinar(f: () => void) {
  void carregarHobbiesPersonalizados();
  ouvintes.add(f);
  return () => ouvintes.delete(f);
}

/** Os hobbies criados (para re-renderizar quando um novo entra no catálogo). */
export function useHobbiesPersonalizados() {
  return useSyncExternalStore(
    assinar,
    () => lista,
    () => lista,
  );
}

const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Já existe um hobby (do catálogo ou criado) com esse nome? */
export const hobbyComNome = (nome: string) => catalogoHobbies.find((h) => normalizar(h.nome) === normalizar(nome));

/** Cria um hobby (ou devolve o que já tem esse nome) e grava no aparelho. */
export function criarHobby(nome: string, icone: NomeIcone): HobbyInfo {
  const limpo = nome.trim().replace(/\s+/g, ' ');
  const existente = hobbyComNome(limpo);
  if (existente) return existente;
  const nomeBonito = limpo.charAt(0).toUpperCase() + limpo.slice(1);
  const h: HobbyInfo = { id: `${PREFIXO_MEU}${nomeBonito}`, nome: nomeBonito, categoria: 'meus', icone };
  lista = [...lista, h];
  entrarNoCatalogo(h);
  ouvintes.forEach((f) => f());
  gravarEstado(CHAVE, JSON.stringify(lista)).catch(() => {});
  return h;
}
