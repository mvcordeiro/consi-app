// Ícones dos Hobbies, exportados do Figma (arquivo "Consi - Design de Interação", frame 671:5292
// e seção de interação 671:5840). Os de uma cor só vêm em branco: a cor vem do tema por `corTraco`.
import Conversa from '../../../assets/hobbies/conversa.svg';
import Engrenagem from '../../../assets/hobbies/engrenagem.svg';
import FiltrarMusicas16 from '../../../assets/hobbies/filtrar-musicas-16.svg';
import FiltrarMusicas from '../../../assets/hobbies/filtrar-musicas.svg';
import Lixeira from '../../../assets/hobbies/lixeira.svg';
import LogoConsi from '../../../assets/hobbies/logo-consi.svg';
import MenuHorizontal from '../../../assets/hobbies/menu-horizontal.svg';
import Ponto from '../../../assets/hobbies/ponto.svg';
import RoloFilme16 from '../../../assets/hobbies/rolo-filme-16.svg';
import RostoMalHumorado44 from '../../../assets/hobbies/rosto-mal-humorado-44.svg';
import RostoMalHumorado from '../../../assets/hobbies/rosto-mal-humorado.svg';
import RostoPositivo44 from '../../../assets/hobbies/rosto-positivo-44.svg';
import RostoPositivo from '../../../assets/hobbies/rosto-positivo.svg';

/**
 * Tamanho natural (largura × altura) de cada ícone, para desenhá-lo numa caixa sem distorcer:
 * os SVGs do Figma usam preserveAspectRatio="none".
 */
export const tamanhos = {
  conversa: [24.0434, 23.5753],
  engrenagem: [24.0068, 23.7341],
  filtrarMusicas: [23.4039, 24.0246],
  filtrarMusicas16: [15.6026, 16.0164],
  lixeira: [20.907, 23.9766],
  menuHorizontal: [24.0754, 6.46086],
  roloFilme16: [16.0217, 14.9432],
  rostoMalHumorado: [24.0196, 23.6348],
  rostoMalHumorado44: [44.036, 43.3306],
  rostoPositivo: [23.2485, 23.9997],
  rostoPositivo44: [42.6222, 43.9995],
} as const;

/** Largura e altura que cabem numa caixa quadrada `caixa`, mantendo a proporção. */
export function naCaixa([w, h]: readonly [number, number], caixa: number) {
  const escala = caixa / Math.max(w, h);
  return { width: w * escala, height: h * escala };
}

export {
  Conversa,
  Engrenagem,
  FiltrarMusicas,
  FiltrarMusicas16,
  Lixeira,
  LogoConsi,
  MenuHorizontal,
  Ponto,
  RoloFilme16,
  RostoMalHumorado,
  RostoMalHumorado44,
  RostoPositivo,
  RostoPositivo44,
};
