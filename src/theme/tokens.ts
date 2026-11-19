/**
 * Tokens do Design System do Consi — espelho das coleções de variáveis do Figma
 * (arquivo "Consi - Design System", página "Variáveis e Ícones").
 *
 *   00 Primitives      → `primitivas`       (valores brutos; não use direto nas telas)
 *   01 Color           → `coresPorModo`     (modos Dark e Light; cada variável é um alias de primitivo)
 *   02 Space & Shape   → `space`, `inset`, `gap`, `radius`, `borderWidth`, `size`
 *   03 Elevation       → `elevacaoPorModo`  (modos Dark e Light)
 *   04 Typography      → ver tipografia.ts
 *   05 Motion          → `duration`, `easing`
 *
 * Regra do produto: laranja no modo Light, azul no Dark.
 * Os nomes seguem os caminhos do Figma: `action/primary/default` → `cores.action.primary.default`.
 * Nas telas, pegue as cores com `useTema()` (ver tema.tsx), nunca direto daqui.
 */

// ─── 00 Primitives ──────────────────────────────────────────────────────────
export const primitivas = {
  neutral: {
    0: '#FFFFFF',
    50: '#F5F5F4',
    100: '#E8E8E6',
    200: '#D1D1CE',
    300: '#B0B0AC',
    400: '#8A8A86',
    500: '#666663',
    600: '#4D4D4B',
    700: '#3B3B3A',
    800: '#2F2F2F',
    900: '#222222',
    950: '#161616',
  },
  orange: {
    50: '#FFF7E8',
    100: '#FEECC6',
    200: '#FDDB94',
    300: '#FCC85F',
    400: '#FBB93F',
    500: '#FAAA27',
    600: '#D98A0F',
    700: '#AB6A0A',
    800: '#7E4D08',
    900: '#523205',
  },
  blue: {
    50: '#EEF1FD',
    100: '#DAE0FA',
    200: '#B5C1F5',
    300: '#8FA1F0',
    400: '#6A82EA',
    500: '#4362E5',
    600: '#2F4ACB',
    700: '#2339A0',
    800: '#1A2B77',
    900: '#111D4F',
    950: '#0B1438',
  },
  sage: {
    50: '#F3F8F7',
    100: '#E6F0EF',
    200: '#D8E7E5',
    300: '#C9DDDB',
    400: '#A9C5C2',
    500: '#86A8A5',
    600: '#678684',
    700: '#4D6665',
    800: '#374847',
    900: '#243030',
  },
  red: { 100: '#FDE8E9', 300: '#F2A0A3', 500: '#E5484D', 700: '#A82A2F', 900: '#4A1518' },
  green: { 100: '#E3F4EA', 300: '#8FD4AE', 500: '#3FA66B', 700: '#2A7449', 900: '#12341F' },
  overlay: { 'black-60': '#00000099', 'black-40': '#16161666' },
} as const;

const { neutral, orange, blue, sage, red, green, overlay } = primitivas;

// ─── 01 Color (modos Dark e Light) ──────────────────────────────────────────
export type Modo = 'dark' | 'light';

const dark = {
  bg: {
    base: blue[900],
    raised: blue[800],
    sunken: blue[950],
    brand: blue[900],
    'brand-raised': blue[800],
    /** Fundo de item selecionado (Filtro ativo, etiquetas de emoção, reação escolhida). */
    selected: blue[700],
    inverse: neutral[0],
    scrim: overlay['black-60'],
    disabled: neutral[700],
    'success-subtle': green[900],
    'warning-subtle': orange[900],
    'error-subtle': red[900],
    'info-subtle': blue[900],
  },
  text: {
    primary: neutral[0],
    secondary: neutral[200],
    tertiary: neutral[300],
    disabled: neutral[500],
    accent: blue[300],
    link: blue[300],
    'on-primary': neutral[0],
    'on-secondary': neutral[950],
    'on-accent': neutral[0],
    'on-neutral': neutral[950],
    'on-inverse': neutral[950],
    /** Texto sobre action/primary/pressed (dia selecionado do calendário). */
    'on-pressed': neutral[0],
  },
  icon: {
    primary: neutral[0],
    secondary: neutral[300],
  },
  action: {
    primary: { default: blue[500], hover: blue[600], pressed: blue[700] },
    secondary: { default: orange[500], hover: orange[600], pressed: orange[700] },
    neutral: { default: neutral[100], hover: neutral[200], pressed: neutral[300] },
    disabled: neutral[700],
  },
  border: {
    subtle: neutral[600],
    default: neutral[500],
    focus: blue[400],
    disabled: neutral[600],
  },
  feedback: {
    error: red[300],
    success: green[300],
    warning: orange[300],
    info: blue[300],
  },
  decor: {
    sage: sage[300],
    accent: blue[500],
  },
};

type Amplo<T> = { [K in keyof T]: T[K] extends string ? string : Amplo<T[K]> };
export type Cores = Amplo<typeof dark>;

const light: Cores = {
  bg: {
    base: orange[50],
    raised: orange[100],
    sunken: orange[200],
    brand: orange[50],
    'brand-raised': orange[100],
    // laranja suave para o text/primary ter contraste (action/primary/pressed não passa 4,5:1)
    selected: orange[200],
    inverse: neutral[900],
    scrim: overlay['black-40'],
    disabled: neutral[100],
    // Valores Light lidos nas variáveis do Figma (Home, nó 574:3865).
    'success-subtle': green[300],
    'warning-subtle': orange[200],
    'error-subtle': red[300],
    'info-subtle': blue[200],
  },
  text: {
    primary: neutral[900],
    secondary: neutral[600],
    tertiary: neutral[500],
    disabled: neutral[400],
    accent: orange[800],
    link: orange[800],
    'on-primary': neutral[950],
    'on-secondary': neutral[0],
    'on-accent': neutral[950],
    'on-neutral': neutral[0],
    'on-inverse': neutral[0],
    'on-pressed': neutral[0],
  },
  icon: {
    primary: neutral[900],
    secondary: neutral[600],
  },
  action: {
    primary: { default: orange[500], hover: orange[600], pressed: orange[700] },
    secondary: { default: blue[500], hover: blue[600], pressed: blue[700] },
    neutral: { default: neutral[900], hover: neutral[800], pressed: neutral[700] },
    disabled: neutral[200],
  },
  border: {
    subtle: neutral[200],
    default: neutral[300],
    focus: orange[700],
    disabled: neutral[200],
  },
  feedback: {
    error: red[500],
    success: green[500],
    warning: orange[700],
    info: blue[600],
  },
  decor: {
    sage: sage[700],
    accent: orange[500],
  },
};

export const coresPorModo: Record<Modo, Cores> = { dark, light };

// ─── 02 Space & Shape (modo Mobile) ─────────────────────────────────────────
export const space = {
  0: 0,
  2: 2,
  4: 4,
  8: 8,
  12: 12,
  16: 16,
  20: 20,
  24: 24,
  32: 32,
  40: 40,
  48: 48,
  64: 64,
} as const;

export const inset = {
  xs: space[8],
  sm: space[12],
  md: space[16],
  lg: space[24],
  xl: space[32],
  screen: space[20],
  'control-x': space[16],
  'control-y': space[12],
} as const;

export const gap = {
  tight: space[8],
  default: space[16],
  loose: space[24],
  section: space[40],
} as const;

const radiusBase = { none: 0, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, full: 999 } as const;
export const radius = {
  ...radiusBase,
  control: radiusBase.md,
  card: radiusBase.lg,
  sheet: radiusBase.xl,
  pill: radiusBase.full,
} as const;

export const borderWidth = { thin: 1, thick: 2 } as const;

export const size = {
  'touch-target': 44,
  'icon-sm': 16,
  'icon-md': 24,
  'icon-lg': 32,
} as const;

// ─── 03 Elevation (modos Dark e Light) ──────────────────────────────────────
const shadowColor: Record<Modo, string> = { dark: '#00000080', light: '#16161624' };
const niveis = {
  1: { y: 2, blur: 6, spread: 0 },
  2: { y: 6, blur: 16, spread: 0 },
  3: { y: 12, blur: 28, spread: -2 },
} as const;

export type Elevacao = Record<1 | 2 | 3, { boxShadow: string }>;

const elevacaoDoModo = (modo: Modo): Elevacao => {
  const s = (n: 1 | 2 | 3) => ({
    boxShadow: `0px ${niveis[n].y}px ${niveis[n].blur}px ${niveis[n].spread}px ${shadowColor[modo]}`,
  });
  return { 1: s(1), 2: s(2), 3: s(3) };
};

export const elevacaoPorModo: Record<Modo, Elevacao> = {
  dark: elevacaoDoModo('dark'),
  light: elevacaoDoModo('light'),
};

// ─── 05 Motion ──────────────────────────────────────────────────────────────
export const duration = { fast: 120, base: 200, slow: 320 } as const;
/** cubic-bezier(0.2, 0, 0, 1) — use com Easing.bezier(...easing.standard) */
export const easing = { standard: [0.2, 0, 0, 1] as const };
