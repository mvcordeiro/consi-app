/**
 * Nomes das emoções (Ajustes → Personalizar → Nomes das emoções). A pessoa escolhe um estilo de
 * nomes e pode trocar o nome de qualquer emoção; o nome dela vale por cima do estilo.
 * Os estilos são do app (entram na tradução); os nomes escritos pela pessoa ficam como ela escreveu.
 * Fica só neste aparelho, nas preferências.
 */

export type EstiloNomes = 'padrao' | 'leve' | 'direto' | 'poetico';

export const ESTILOS_NOMES: { id: EstiloNomes; nome: string }[] = [
  { id: 'padrao', nome: 'Padrão' },
  { id: 'leve', nome: 'Leve' },
  { id: 'direto', nome: 'Direto' },
  { id: 'poetico', nome: 'Poético' },
];

/** Limite de letras de um nome escrito pela pessoa. */
export const LIMITE_NOME_EMOCAO = 18;

/** Nomes de cada estilo, por id da emoção. O "Padrão" é o nome da própria emoção (data/emocoes.ts). */
export const NOMES_POR_ESTILO: Record<Exclude<EstiloNomes, 'padrao'>, Record<string, string>> = {
  leve: {
    satisfeito: 'Tranquilo',
    alegria: 'Contente',
    tristeza: 'Pra baixo',
    vergonha: 'Sem jeito',
    orgulho: 'Me achando',
    admiracao: 'Inspirado',
    medo: 'Receio',
    repulsa: 'Eca',
    tedio: 'Sem graça',
    fascinacao: 'Vidrado',
    raiva: 'Bravo',
    desprezo: 'Nem aí',
    esperanca: 'Confiante',
    desejo: 'Vontade',
  },
  direto: {
    satisfeito: 'Satisfeito',
    alegria: 'Feliz',
    tristeza: 'Triste',
    vergonha: 'Envergonhado',
    orgulho: 'Orgulhoso',
    admiracao: 'Admirado',
    medo: 'Com medo',
    repulsa: 'Enojado',
    tedio: 'Entediado',
    fascinacao: 'Fascinado',
    raiva: 'Com raiva',
    desprezo: 'Desdenhoso',
    esperanca: 'Esperançoso',
    desejo: 'Com vontade',
  },
  poetico: {
    satisfeito: 'Calmaria',
    alegria: 'Sol',
    tristeza: 'Chuva',
    vergonha: 'Rubor',
    orgulho: 'Peito estufado',
    admiracao: 'Brilho nos olhos',
    medo: 'Frio na barriga',
    repulsa: 'Estômago virado',
    tedio: 'Marasmo',
    fascinacao: 'Encanto',
    raiva: 'Fogo',
    desprezo: 'Nariz torcido',
    esperanca: 'Horizonte',
    desejo: 'Sede',
  },
};

export type NomesEmocoes = {
  estilo: EstiloNomes;
  /** Nomes escritos pela pessoa, por id da emoção. */
  proprios: Record<string, string>;
};

export const NOMES_PADRAO: NomesEmocoes = { estilo: 'padrao', proprios: {} };

/** Tira espaços sobrando e corta no limite. */
export const limparNome = (s: string) => s.replace(/\s+/g, ' ').trim().slice(0, LIMITE_NOME_EMOCAO);

/** Aceita o que estiver gravado, descartando valores desconhecidos. */
export function normalizarNomes(dado: unknown): NomesEmocoes {
  const d = (dado && typeof dado === 'object' ? dado : {}) as Partial<NomesEmocoes>;
  const estilo = ESTILOS_NOMES.some((e) => e.id === d.estilo) ? (d.estilo as EstiloNomes) : 'padrao';
  const proprios: Record<string, string> = {};
  if (d.proprios && typeof d.proprios === 'object') {
    for (const [id, nome] of Object.entries(d.proprios)) {
      const limpo = typeof nome === 'string' ? limparNome(nome) : '';
      if (limpo) proprios[id] = limpo;
    }
  }
  return { estilo, proprios };
}

/** O nome do estilo para a emoção (sem os nomes da pessoa). */
export function nomeNoEstilo(estilo: EstiloNomes, id: string, original: string) {
  return estilo === 'padrao' ? original : (NOMES_POR_ESTILO[estilo][id] ?? original);
}

/** O nome que aparece no app: o da pessoa, senão o do estilo, senão o original. */
export function resolverNome(n: NomesEmocoes, id: string, original: string) {
  return n.proprios[id] ?? nomeNoEstilo(n.estilo, id, original);
}

/** Os nomes da emoção nos quatro estilos, sem repetir (sugestões na folha). */
export function sugestoesDeNome(id: string, original: string) {
  return [...new Set(ESTILOS_NOMES.map((e) => nomeNoEstilo(e.id, id, original)))];
}
