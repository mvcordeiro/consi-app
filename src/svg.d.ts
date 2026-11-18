declare module '*.svg' {
  import type { FC } from 'react';
  import type { SvgProps } from 'react-native-svg';

  /**
   * Cores dos SVGs exportados do Figma, trocáveis por variável do Design System
   * (ver .svgrrc e useCoresSvg em src/theme/tema.tsx).
   */
  export type CoresSvg = {
    /** branco (e #222222 nos ícones Engrenagem e Menu horizontal) no Figma → icon/primary */
    corTraco?: string;
    /** #6A82EA (blue/400) → border/focus */
    corLinha?: string;
    /** #FAAA27 (orange/500) → action/secondary */
    corPreenchimento?: string;
    /** #2F4ACB (blue/600) → action/primary/hover */
    corDecor?: string;
    /** #F2A0A3 (red/300) → feedback/error */
    corAlerta?: string;
    /** #4D4D4B (neutral/600) → border/subtle */
    corSuave?: string;
    /** #4362E5 (blue/500) → action/primary (balões de emoção da Home) */
    corBalao?: string;
    /** #4A1518 (red/900) → bg/error-subtle (rosto da aba "ignorar" dos Hobbies) */
    corErroSuave?: string;
    /** #12341F (green/900) → bg/success-subtle (rosto da aba "aceitar" dos Hobbies) */
    corSucessoSuave?: string;
  };

  const content: FC<SvgProps & CoresSvg>;
  export default content;
}
