declare module '*.svg' {
  import type { FC } from 'react';
  import type { SvgProps } from 'react-native-svg';

  /**
   * Cores dos SVGs exportados do Figma, trocáveis por variável do Design System
   * (ver .svgrrc e useCoresSvg em src/theme/tema.tsx).
   */
  export type CoresSvg = {
    /** branco no Figma → icon/primary */
    corTraco?: string;
    /** #6A82EA (blue/400) → border/focus */
    corLinha?: string;
    /** #FAAA27 (orange/500) → action/secondary */
    corPreenchimento?: string;
    /** #2F4ACB (blue/600) → action/primary/hover */
    corDecor?: string;
    /** #F2A0A3 (red/300) → feedback/error */
    corAlerta?: string;
  };

  const content: FC<SvgProps & CoresSvg>;
  export default content;
}
