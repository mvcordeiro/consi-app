import type { TextStyle } from 'react-native';

/**
 * 04 Typography — espelho da coleção de tipografia do Figma (modo Mobile).
 *
 * No Figma a família é a TMT Limkin (variável, eixos wght e SRFF). No app usamos
 * três versões estáticas geradas dela (ver assets/fonts/LEIA-ME.txt):
 *   Book Sans       → ConsiSans-Book       (wght 400, SRFF 0)
 *   Medium Sans     → ConsiSans-Medium     (wght 500, SRFF 0)
 *   Semi Bold Flare → ConsiFlare-SemiBold  (wght 600, SRFF 50)
 *
 * Motivo: com a fonte variável, o celular media o texto com o estilo padrão
 * e desenhava com outro — letras cortadas e espaços sobrando.
 */
export const arquivosDeFonte = {
  'ConsiSans-Book': require('../../assets/fonts/ConsiSans-Book.ttf'),
  'ConsiSans-Medium': require('../../assets/fonts/ConsiSans-Medium.ttf'),
  'ConsiFlare-SemiBold': require('../../assets/fonts/ConsiFlare-SemiBold.ttf'),
};

/** font/style/* — estilos nomeados do Design System e o arquivo de cada um. */
export const fontStyle = {
  'Book Sans': 'ConsiSans-Book',
  'Medium Sans': 'ConsiSans-Medium',
  'Semi Bold Flare': 'ConsiFlare-SemiBold',
} as const satisfies Record<string, keyof typeof arquivosDeFonte>;

/** font/family/* e font/style/* (variáveis). */
export const font = {
  family: { display: 'TMT Limkin', body: 'TMT Limkin' },
  style: { display: 'Semi Bold Flare', body: 'Book Sans' },
} as const;

export const fontSize = {
  'title-xl': 36,
  'title-lg': 28,
  'title-md': 22,
  'title-sm': 18,
  'body-lg': 18,
  'body-md': 16,
  'body-sm': 14,
  caption: 12,
} as const;

export const lineHeight = {
  'title-xl': 40,
  'title-lg': 32,
  'title-md': 26,
  'title-sm': 22,
  'body-lg': 26,
  'body-md': 24,
  'body-sm': 20,
  caption: 16,
} as const;

export const tracking = { title: -1, body: 0, caption: 0 } as const;

/** Converte um estilo nomeado ("Book Sans") em estilo de texto do React Native. */
export function estiloDaFonte(estilo: keyof typeof fontStyle): TextStyle {
  // o peso já está no arquivo; "normal" evita negrito sintético por cima
  return { fontFamily: fontStyle[estilo], fontWeight: 'normal' };
}

const display = estiloDaFonte(font.style.display);
const body = estiloDaFonte(font.style.body);
const rotulo = estiloDaFonte('Medium Sans');

const papel = (
  base: TextStyle,
  chave: keyof typeof fontSize,
  letterSpacing: number,
): TextStyle => ({
  ...base,
  fontSize: fontSize[chave],
  lineHeight: lineHeight[chave],
  letterSpacing,
});

/**
 * Estilos de texto do Figma. A chave é o nome do estilo no Figma.
 * Ex.: "Títulos/Grande" → tipografia['Títulos/Grande']
 */
export const tipografia = {
  'Títulos/Destaque': papel(display, 'title-xl', tracking.title),
  'Títulos/Grande': papel(display, 'title-lg', tracking.title),
  'Títulos/Médio': papel(display, 'title-md', tracking.title),
  // No Figma, "Títulos/Pequeno" usa tracking/body (0), não tracking/title.
  'Títulos/Pequeno': papel(display, 'title-sm', tracking.body),
  'Texto/Grande': papel(body, 'body-lg', tracking.body),
  'Texto/Médio': papel(body, 'body-md', tracking.body),
  'Texto/Pequeno': papel(body, 'body-sm', tracking.body),
  'Texto/Botões e rótulos': papel(rotulo, 'body-sm', tracking.body),
  'Legenda/Pequena': papel(body, 'caption', tracking.caption),
} satisfies Record<string, TextStyle>;

export type EstiloDeTexto = keyof typeof tipografia;
