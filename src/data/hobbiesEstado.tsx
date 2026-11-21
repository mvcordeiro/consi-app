import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import {
  atividadesCatalogo,
  atividadesIniciais,
  comentariosDeExemplo,
  fonte,
  type Atividade,
  type AtividadeMinha,
  type Bloco,
  type Comentario,
  type HobbyId,
  type Lembrete,
  type Permissoes,
  type ReacaoId,
  type Visibilidade,
} from './catalogo';
import { gravarEstado, lerEstado } from './banco';
import { respostasSalvas } from './onboarding';

/**
 * Estado da aba Hobbies, compartilhado com as telas secundárias e gravado no aparelho.
 * O catálogo (sugestões, conversas) vem da `fonte` (catalogo/fonte.ts); aqui ficam as
 * escolhas da pessoa: hobbies, sugestões aceitas ou ignoradas, as atividades dela,
 * o que ela publicou, comentários, reações e lembretes.
 */
type Gravado = {
  hobbies: HobbyId[] | null;
  /** Sugestões já decididas (aceitas ou ignoradas): saem da pilha. */
  decididas: Record<string, 'aceita' | 'ignorada'>;
  atividades: AtividadeMinha[];
  /** Atividades que a pessoa publicou para a comunidade. */
  publicadas: Atividade[];
  meusComentarios: Comentario[];
  /** Reação da pessoa em cada comentário. */
  minhasReacoes: Record<string, ReacaoId>;
};

/** v2: conteúdo em blocos (a v1 tinha descrição e passos). */
const CHAVE = 'consi:hobbies:v2';
const inicial: Gravado = {
  hobbies: null,
  decididas: {},
  // Começa sem atividades: elas entram quando a pessoa aceita uma sugestão ou cria a sua.
  atividades: [],
  publicadas: [],
  meusComentarios: [],
  minhasReacoes: {},
};

const exemplos = new Map(atividadesIniciais.map((a) => [a.id, a.criadaEm]));
const ehExemplo = (a: AtividadeMinha) => exemplos.has(a.id) && exemplos.get(a.id) === a.criadaEm;

const eu = { usuario: 'Você', iniciais: 'EU' };
const HOBBIES_PADRAO: HobbyId[] = ['musica', 'cinema', 'leitura', 'escrita'];

/** O que a pessoa preenche ao criar ou editar uma atividade. */
export type DadosAtividade = {
  hobby: HobbyId;
  titulo: string;
  resumo: string;
  conteudo: Bloco[];
  minutos: number;
  icone?: AtividadeMinha['icone'];
  capa?: string;
  permissoes: Permissoes;
  visibilidade: Visibilidade;
};

/** Uma atividade do catálogo ou da pessoa, para as telas que mostram as duas. */
export type Item =
  | { tipo: 'catalogo'; a: Atividade; minha?: undefined }
  | { tipo: 'minha'; a: AtividadeMinha; minha: AtividadeMinha };

type Contexto = {
  carregado: boolean;
  hobbies: HobbyId[];
  pilha: (hobby: HobbyId) => Atividade[];
  temIgnoradas: (hobby: HobbyId) => boolean;
  atividades: AtividadeMinha[];
  item: (id?: string) => Item | undefined;
  /** A pessoa pode editar esta atividade (criou ou o autor permite remix). */
  podeEditar: (a: AtividadeMinha) => boolean;
  /** Chave da conversa: atividades aceitas compartilham a conversa da original. */
  chaveConversa: (id: string) => string;
  comentarios: (id: string) => Comentario[];
  totalComentarios: (id: string) => number;
  minhaReacao: (comentarioId: string) => ReacaoId | undefined;
  aceitar: (s: Atividade) => AtividadeMinha;
  ignorar: (s: Atividade) => void;
  reverIgnoradas: (hobby: HobbyId) => void;
  criar: (d: DadosAtividade) => AtividadeMinha;
  atualizar: (id: string, d: DadosAtividade) => void;
  apagar: (id: string) => void;
  desfazerApagar: () => void;
  /** Conclui a atividade com a emoção do Diário, a nota e o momento criado no Diário (se houver). */
  finalizar: (id: string, dados: { emocao: string | null; nota: string; momentoEm?: number }) => void;
  alternarTarefa: (id: string, blocoId: string) => void;
  agendar: (id: string, lembrete: Lembrete | null) => void;
  comentar: (id: string, c: { texto?: string; imagem?: string; paiId?: string }) => void;
  reagir: (comentarioId: string, r: ReacaoId | null) => void;
  marcarLida: (id: string) => void;
  definirHobbies: (h: HobbyId[]) => void;
  adicionarHobbies: (h: HobbyId[]) => void;
  /** Relê os hobbies do onboarding (o provedor monta antes de o onboarding terminar). */
  sincronizarOnboarding: () => void;
};

const ContextoHobbies = createContext<Contexto | null>(null);

export function HobbiesProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Gravado>(inicial);
  const [catalogo, setCatalogo] = useState<Atividade[]>(atividadesCatalogo);
  const [doOnboarding, setDoOnboarding] = useState<HobbyId[]>([]);
  const [carregado, setCarregado] = useState(false);
  const pronto = useRef(false);
  const apagada = useRef<{ a: AtividadeMinha; indice: number } | null>(null);

  useEffect(() => {
    (async () => {
      const [respostas, bruto] = await Promise.all([
        respostasSalvas(),
        lerEstado(CHAVE).catch(() => null),
      ]);
      setDoOnboarding(respostas.hobbies);
      if (bruto) {
        try {
          const lido = { ...inicial, ...JSON.parse(bruto) } as Gravado;
          // Tira as atividades de exemplo gravadas pelas versões antigas (mesmo id e data de criação).
          setEstado({ ...lido, atividades: lido.atividades.filter((a) => !ehExemplo(a)) });
        } catch {
          // gravação corrompida: começa do zero
        }
      }
      pronto.current = true;
      setCarregado(true);
    })();
  }, []);

  useEffect(() => {
    if (!pronto.current) return;
    gravarEstado(CHAVE, JSON.stringify(estado)).catch(() => {});
  }, [estado]);

  const hobbies = useMemo<HobbyId[]>(() => {
    if (estado.hobbies?.length) return estado.hobbies;
    return doOnboarding.length ? doOnboarding : HOBBIES_PADRAO;
  }, [estado.hobbies, doOnboarding]);

  // Pede à fonte as sugestões dos hobbies da pessoa (com o servidor, chegam aqui).
  useEffect(() => {
    let vivo = true;
    Promise.all(hobbies.map((h) => fonte.listarAtividades(h))).then((paginas) => {
      if (!vivo) return;
      setCatalogo((atual) => {
        const ids = new Set(atual.map((x) => x.id));
        const novas = paginas.flatMap((p) => p.itens).filter((x) => !ids.has(x.id));
        return novas.length ? [...atual, ...novas] : atual;
      });
    });
    return () => {
      vivo = false;
    };
  }, [hobbies]);

  const minhasPublicadas = useMemo(() => new Set(estado.publicadas.map((p) => p.id)), [estado.publicadas]);

  const pilha = useCallback(
    (hobby: HobbyId) =>
      catalogo.filter((s) => s.hobby === hobby && !estado.decididas[s.id] && !minhasPublicadas.has(s.id)),
    [catalogo, estado.decididas, minhasPublicadas],
  );

  const temIgnoradas = useCallback(
    (hobby: HobbyId) => catalogo.some((s) => s.hobby === hobby && estado.decididas[s.id] === 'ignorada'),
    [catalogo, estado.decididas],
  );

  const item = useCallback(
    (id?: string): Item | undefined => {
      if (!id) return undefined;
      const minha = estado.atividades.find((x) => x.id === id);
      if (minha) return { tipo: 'minha', a: minha, minha };
      const c = catalogo.find((x) => x.id === id) ?? estado.publicadas.find((x) => x.id === id);
      return c ? { tipo: 'catalogo', a: c } : undefined;
    },
    [estado.atividades, estado.publicadas, catalogo],
  );

  const podeEditar = useCallback((a: AtividadeMinha) => a.criadaPorMim || a.permissoes.remix, []);

  const chaveConversa = useCallback(
    (id: string) => {
      const minha = estado.atividades.find((x) => x.id === id);
      return minha?.origemId ?? id;
    },
    [estado.atividades],
  );

  const comentarios = useCallback(
    (id: string) => {
      const chave = chaveConversa(id);
      const i = item(id);
      if (!i || !i.a.permissoes.comentarios) return [];
      // Atividades criadas do zero começam sem conversa; as do catálogo trazem a da comunidade.
      const criadaDoZero = i.tipo === 'minha' && i.a.criadaPorMim && !i.a.origemId;
      const daComunidade = criadaDoZero || minhasPublicadas.has(chave) ? [] : comentariosDeExemplo(chave, i.a.hobby);
      return [...daComunidade, ...estado.meusComentarios.filter((c) => c.itemId === chave)].map((c) => {
        const r = estado.minhasReacoes[c.id];
        return r ? { ...c, reacoes: { ...c.reacoes, [r]: (c.reacoes[r] ?? 0) + 1 } } : c;
      });
    },
    [chaveConversa, item, minhasPublicadas, estado.meusComentarios, estado.minhasReacoes],
  );

  const totalComentarios = useCallback(
    (id: string) => {
      const i = item(id);
      if (!i) return 0;
      const chave = chaveConversa(id);
      return i.a.totalComentarios + estado.meusComentarios.filter((c) => c.itemId === chave).length;
    },
    [item, chaveConversa, estado.meusComentarios],
  );

  const minhaReacao = useCallback((cid: string) => estado.minhasReacoes[cid], [estado.minhasReacoes]);

  const aceitar = useCallback((s: Atividade) => {
    const { quando: _quando, ...resto } = s;
    const nova: AtividadeMinha = {
      ...resto,
      id: `a-${s.id}`,
      origemId: s.id,
      criadaPorMim: false,
      visibilidade: 'privada',
      status: 'andamento',
      novidade: false,
      criadaEm: Date.now(),
    };
    setEstado((e) => ({
      ...e,
      decididas: { ...e.decididas, [s.id]: 'aceita' },
      atividades: [nova, ...e.atividades.filter((x) => x.id !== nova.id)],
    }));
    return nova;
  }, []);

  const ignorar = useCallback((s: Atividade) => {
    setEstado((e) => ({ ...e, decididas: { ...e.decididas, [s.id]: 'ignorada' } }));
  }, []);

  const reverIgnoradas = useCallback(
    (hobby: HobbyId) => {
      setEstado((e) => {
        const decididas = { ...e.decididas };
        for (const s of catalogo) if (s.hobby === hobby && decididas[s.id] === 'ignorada') delete decididas[s.id];
        return { ...e, decididas };
      });
    },
    [catalogo],
  );

  const criar = useCallback((d: DadosAtividade) => {
    const id = `c${Date.now().toString(36)}`;
    const publicar = d.visibilidade === 'comunidade';
    const nova: AtividadeMinha = {
      ...d,
      id: `a-${id}`,
      origemId: publicar ? id : undefined,
      autor: eu,
      totalComentarios: 0,
      criadaPorMim: true,
      status: 'andamento',
      novidade: false,
      criadaEm: Date.now(),
    };
    const publicada: Atividade | null = publicar
      ? { ...d, id, autor: eu, quando: 'agora', totalComentarios: 0 }
      : null;
    if (publicada) fonte.publicarAtividade(publicada).catch(() => {});
    setEstado((e) => ({
      ...e,
      atividades: [nova, ...e.atividades],
      publicadas: publicada ? [publicada, ...e.publicadas] : e.publicadas,
    }));
    return nova;
  }, []);

  const atualizar = useCallback((id: string, d: DadosAtividade) => {
    setEstado((e) => ({
      ...e,
      atividades: e.atividades.map((x) =>
        x.id === id
          ? {
              ...x,
              ...d,
              // Editar a atividade de outra pessoa é um remix: guarda quem fez a original.
              remixDe: x.criadaPorMim ? x.remixDe : (x.remixDe ?? x.autor),
              autor: x.criadaPorMim ? x.autor : eu,
            }
          : x,
      ),
    }));
  }, []);

  const apagar = useCallback((id: string) => {
    setEstado((e) => {
      const indice = e.atividades.findIndex((x) => x.id === id);
      if (indice < 0) return e;
      apagada.current = { a: e.atividades[indice], indice };
      return { ...e, atividades: e.atividades.filter((x) => x.id !== id) };
    });
  }, []);

  const desfazerApagar = useCallback(() => {
    const ultima = apagada.current;
    if (!ultima) return;
    apagada.current = null;
    setEstado((e) => {
      const lista = [...e.atividades];
      lista.splice(Math.min(ultima.indice, lista.length), 0, ultima.a);
      return { ...e, atividades: lista };
    });
  }, []);

  const mudar = useCallback(
    (id: string, f: (a: AtividadeMinha) => AtividadeMinha) =>
      setEstado((e) => ({ ...e, atividades: e.atividades.map((x) => (x.id === id ? f(x) : x)) })),
    [],
  );

  const finalizar = useCallback(
    (id: string, { emocao, nota, momentoEm }: { emocao: string | null; nota: string; momentoEm?: number }) =>
      mudar(id, (x) => ({
        ...x,
        status: 'concluida',
        concluidaEm: Date.now(),
        emocao: emocao ?? undefined,
        momentoEm,
        nota: nota.trim() || undefined,
        lembrete: undefined,
      })),
    [mudar],
  );

  const alternarTarefa = useCallback(
    (id: string, blocoId: string) =>
      mudar(id, (x) => ({
        ...x,
        conteudo: x.conteudo.map((bl) => (bl.id === blocoId ? { ...bl, feito: !bl.feito } : bl)),
      })),
    [mudar],
  );

  const agendar = useCallback(
    (id: string, lembrete: Lembrete | null) => mudar(id, (x) => ({ ...x, lembrete: lembrete ?? undefined })),
    [mudar],
  );

  const comentar = useCallback(
    (id: string, c: { texto?: string; imagem?: string; paiId?: string }) => {
      const novo: Comentario = {
        id: `meu-${Date.now().toString(36)}`,
        itemId: chaveConversa(id),
        paiId: c.paiId,
        autor: eu,
        quando: 'agora',
        texto: c.texto?.trim() || undefined,
        imagem: c.imagem,
        reacoes: {},
        meu: true,
      };
      fonte.comentar(novo).catch(() => {});
      setEstado((e) => ({ ...e, meusComentarios: [...e.meusComentarios, novo] }));
    },
    [chaveConversa],
  );

  const reagir = useCallback((cid: string, r: ReacaoId | null) => {
    fonte.reagir(cid, r).catch(() => {});
    setEstado((e) => {
      const minhasReacoes = { ...e.minhasReacoes };
      if (r) minhasReacoes[cid] = r;
      else delete minhasReacoes[cid];
      return { ...e, minhasReacoes };
    });
  }, []);

  const marcarLida = useCallback((id: string) => {
    setEstado((e) =>
      e.atividades.some((x) => x.id === id && x.novidade)
        ? { ...e, atividades: e.atividades.map((x) => (x.id === id ? { ...x, novidade: false } : x)) }
        : e,
    );
  }, []);

  const definirHobbies = useCallback((h: HobbyId[]) => setEstado((e) => ({ ...e, hobbies: h })), []);

  const adicionarHobbies = useCallback(
    (novos: HobbyId[]) =>
      setEstado((e) => {
        const atuais = e.hobbies?.length ? e.hobbies : hobbies;
        return { ...e, hobbies: [...atuais, ...novos.filter((n) => !atuais.includes(n))] };
      }),
    [hobbies],
  );

  const sincronizarOnboarding = useCallback(() => {
    respostasSalvas().then((r) => setDoOnboarding(r.hobbies));
  }, []);

  const valor = useMemo<Contexto>(
    () => ({
      carregado,
      hobbies,
      pilha,
      temIgnoradas,
      atividades: estado.atividades,
      item,
      podeEditar,
      chaveConversa,
      comentarios,
      totalComentarios,
      minhaReacao,
      aceitar,
      ignorar,
      reverIgnoradas,
      criar,
      atualizar,
      apagar,
      desfazerApagar,
      finalizar,
      alternarTarefa,
      agendar,
      comentar,
      reagir,
      marcarLida,
      definirHobbies,
      adicionarHobbies,
      sincronizarOnboarding,
    }),
    [
      carregado,
      hobbies,
      pilha,
      temIgnoradas,
      estado.atividades,
      item,
      podeEditar,
      chaveConversa,
      comentarios,
      totalComentarios,
      minhaReacao,
      aceitar,
      ignorar,
      reverIgnoradas,
      criar,
      atualizar,
      apagar,
      desfazerApagar,
      finalizar,
      alternarTarefa,
      agendar,
      comentar,
      reagir,
      marcarLida,
      definirHobbies,
      adicionarHobbies,
      sincronizarOnboarding,
    ],
  );

  return <ContextoHobbies.Provider value={valor}>{children}</ContextoHobbies.Provider>;
}

export function useHobbies() {
  const ctx = useContext(ContextoHobbies);
  if (!ctx) throw new Error('useHobbies precisa estar dentro de <HobbiesProvider>');
  return ctx;
}

/** "12 nov" — data curta. */
export function dataCurta(ms: number) {
  const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const d = new Date(ms);
  return `${d.getDate()} ${meses[d.getMonth()]}`;
}
