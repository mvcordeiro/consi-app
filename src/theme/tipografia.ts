import type { TextStyle } from 'react-native';

/**
 * 04 Typography — espelho da coleção de tipografia do Figma (modo Mobile).
 *
 * A fonte é a TMT Limkin variável (assets/fonts/TMT-LimkinVF.ttf, licença SIL OFL).
 * Ela tem dois eixos: `wght` (peso, 100–900) e `SRFF` (serifa, 0–100).
 * Os "estilos" do Figma são combinações desses eixos:
 *   Book Sans       → wght 400, SRFF 0
 *   Medium Sans     → wght 500, SRFF 0
 *   Semi Bold Flare → wght 600, SRFF 50
 *
 * Precisa de Expo SDK 58+ / React Native 0.88+ (fontVariationSettings).
 */

export const FONTE_LIMKIN = 'TMTLimkin';

export const arquivosDeFonte = {
  [FONTE_LIMKIN]: require('../../assets/fonts/TMT-LimkinVF.ttf'),
};

type EstiloDaFonte = { wght: number; SRFF: number };

/** font/style/* — estilos nomeados da Limkin usados no Design System. */
export const fontStyle = {
  'Book Sans': { wght: 400, SRFF: 0 },
  'Medium Sans': { wght: 500, SRFF: 0 },
  'Semi Bold Flare': { wght: 600, SRFF: 50 },
} as const satisfies Record<string, EstiloDaFonte>;

/** font/family/* e font/style/* (variáveis). */
export const font = {
  family: { display: FONTE_LIMKIN, body: FONTE_LIMKIN },
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
export function estiloDaFonte(familia: string, estilo: keyof typeof fontStyle): TextStyle {
  const { wght, SRFF } = fontStyle[estilo];
  return {
    fontFamily: familia,
    fontWeight: String(wght) as TextStyle['fontWeight'],
    fontVariationSettings: `'wght' ${wght}, 'SRFF' ${SRFF}`,
  } as TextStyle;
}

const display = estiloDaFonte(font.family.display, font.style.display);
const body = estiloDaFonte(font.family.body, font.style.body);
const rotulo = estiloDaFonte(font.family.body, 'Medium Sans');

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
