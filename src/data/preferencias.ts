/**
 * Preferências de personalização (Ajustes → Personalizar). Ficam só neste aparelho, numa chave do
 * banco, e valem para o app todo: aparência, reduzir movimento, vibração e as seções da Home.
 */
import { useEffect, useState, useSyncExternalStore } from 'react';
import { AccessibilityInfo } from 'react-native';

import type { Modo } from '@/theme/tokens';

import { apagarEstado, gravarEstado, lerEstado } from './banco';

export type Aparencia = 'sistema' | Modo;
export type Movimento = 'sistema' | 'reduzido' | 'normal';
export type SecaoHome = 'drops' | 'grupos' | 'semana';
/** Cinco marcas no controle deslizante de Ajustes → Personalizar ("grande" é o antigo "Maior"). */
export type TamanhoTexto = 'menor' | 'normal' | 'medio' | 'grande' | 'maior';
export const TAMANHOS_TEXTO: TamanhoTexto[] = ['menor', 'normal', 'medio', 'grande', 'maior'];
/** Aba em que o app abre (nomes das rotas de src/app/(abas)). */
export type AbaInicial = 'index' | 'hobbies' | 'diario';

/** Quanto o texto cresce (soma com o tamanho de fonte do celular). */
export const FATOR_TEXTO: Record<TamanhoTexto, number> = { menor: 0.92, normal: 1, medio: 1.08, grande: 1.15, maior: 1.25 };

/** Abas da barra, na ordem do <Tabs> (a Início no meio). */
export const ABAS = ['hobbies', 'diario', 'index', 'social', 'ajustes'] as const;
export type Aba = (typeof ABAS)[number];

/**
 * Ordem das abas na barra: a aba em que o app abre fica no meio, trocando de lugar com a Início
 * (pedido do produto: o ícone escolhido fica centralizado). O gesto de deslizar segue a mesma ordem.
 */
export function ordemDasAbas(abaInicial: AbaInicial): Aba[] {
  const o: Aba[] = [...ABAS];
  const i = o.indexOf(abaInicial);
  const meio = o.indexOf('index');
  [o[i], o[meio]] = [o[meio], o[i]];
  return o;
}

export type Preferencias = {
  aparencia: Aparencia;
  movimento: Movimento;
  vibracao: boolean;
  tamanhoTexto: TamanhoTexto;
  abaInicial: AbaInicial;
  /** Android: o ícone do app mostra a última emoção registrada (ligado por padrão). */
  iconePorEmocao: boolean;
  /** Ordem = posição na Home, abaixo da hero (topo e hero ficam sempre). */
  secoesHome: { id: SecaoHome; visivel: boolean }[];
};

export const NOMES_SECOES: Record<SecaoHome, string> = {
  drops: 'Drops',
  grupos: 'Aplicativos e hobbies',
  semana: 'Sua semana',
};

const SECOES: SecaoHome[] = ['drops', 'grupos', 'semana'];

const PADRAO: Preferencias = {
  aparencia: 'sistema',
  movimento: 'sistema',
  vibracao: true,
  tamanhoTexto: 'normal',
  abaInicial: 'index',
  iconePorEmocao: true,
  secoesHome: SECOES.map((id) => ({ id, visivel: true })),
};

const CHAVE = 'consi:preferencias';
/** Chave antiga, de quando só a aparência era guardada. */
const CHAVE_APARENCIA = 'consi:aparencia';

let atual: Preferencias = PADRAO;
let carregou = false;
const ouvintes = new Set<() => void>();

const avisar = () => ouvintes.forEach((o) => o());

/** Aceita o que estiver gravado, descartando valores desconhecidos e completando seções novas. */
function normalizar(dado: unknown): Preferencias {
  const d = (dado && typeof dado === 'object' ? dado : {}) as Partial<Preferencias>;
  const aparencia = d.aparencia === 'light' || d.aparencia === 'dark' ? d.aparencia : 'sistema';
  const movimento = d.movimento === 'reduzido' || d.movimento === 'normal' ? d.movimento : 'sistema';
  const vibracao = typeof d.vibracao === 'boolean' ? d.vibracao : true;
  const tamanhoTexto = TAMANHOS_TEXTO.includes(d.tamanhoTexto as TamanhoTexto) ? (d.tamanhoTexto as TamanhoTexto) : 'normal';
  const abaInicial = d.abaInicial === 'hobbies' || d.abaInicial === 'diario' ? d.abaInicial : 'index';
  const iconePorEmocao = d.iconePorEmocao !== false;
  const vistas = new Set<SecaoHome>();
  const secoesHome: Preferencias['secoesHome'] = [];
  for (const s of Array.isArray(d.secoesHome) ? d.secoesHome : []) {
    if (s && SECOES.includes(s.id) && !vistas.has(s.id)) {
      vistas.add(s.id);
      secoesHome.push({ id: s.id, visivel: s.visivel !== false });
    }
  }
  for (const id of SECOES) if (!vistas.has(id)) secoesHome.push({ id, visivel: true });
  return { aparencia, movimento, vibracao, tamanhoTexto, abaInicial, iconePorEmocao, secoesHome };
}

async function carregar() {
  const gravado = await lerEstado(CHAVE);
  if (gravado) {
    try {
      atual = normalizar(JSON.parse(gravado));
    } catch {
      atual = PADRAO;
    }
  } else {
    // Migra a aparência escolhida antes das preferências existirem.
    const antiga = await lerEstado(CHAVE_APARENCIA);
    atual = normalizar({ aparencia: antiga });
    if (antiga) {
      await gravarEstado(CHAVE, JSON.stringify(atual));
      await apagarEstado(CHAVE_APARENCIA);
    }
  }
  avisar();
}

let carregando: Promise<Preferencias> | null = null;

/** Lê as preferências gravadas (uma vez por abertura do app). Nunca falha: cai no padrão. */
export function preferenciasCarregadas(): Promise<Preferencias> {
  if (!carregando) {
    carregou = true;
    carregando = carregar()
      .catch(() => {})
      .then(() => atual);
  }
  return carregando;
}

function assinar(f: () => void) {
  if (!carregou) void preferenciasCarregadas();
  ouvintes.add(f);
  return () => ouvintes.delete(f);
}

export function usePreferencias(): Preferencias {
  return useSyncExternalStore(
    assinar,
    () => atual,
    () => atual,
  );
}

/** Lê fora de componentes (ex.: vibração), sem assinar. */
export function preferenciasAtuais(): Preferencias {
  if (!carregou) assinar(() => {})();
  return atual;
}

export function definirPreferencias(mudanca: Partial<Preferencias>) {
  atual = normalizar({ ...atual, ...mudanca });
  avisar();
  gravarEstado(CHAVE, JSON.stringify(atual)).catch(() => {});
}

export function alternarSecao(id: SecaoHome) {
  definirPreferencias({
    secoesHome: atual.secoesHome.map((s) => (s.id === id ? { ...s, visivel: !s.visivel } : s)),
  });
}

/** Leva a seção para a posição `para` (depois de arrastar na lista de Ajustes). */
export function moverSecao(id: SecaoHome, para: number) {
  const lista = [...atual.secoesHome];
  const de = lista.findIndex((s) => s.id === id);
  if (de < 0) return;
  const alvo = Math.max(0, Math.min(lista.length - 1, para));
  if (alvo === de) return;
  const [s] = lista.splice(de, 1);
  lista.splice(alvo, 0, s);
  definirPreferencias({ secoesHome: lista });
}

/**
 * "Reduzir movimento": a escolha em Ajustes ou, em "Do celular", a do sistema
 * (no web vem do prefers-reduced-motion).
 */
export function useMovimentoReduzido() {
  const { movimento } = usePreferencias();
  const [sistema, setSistema] = useState(false);
  useEffect(() => {
    let vivo = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((r) => vivo && setSistema(r))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setSistema);
    return () => {
      vivo = false;
      sub.remove();
    };
  }, []);
  return movimento === 'sistema' ? sistema : movimento === 'reduzido';
}
