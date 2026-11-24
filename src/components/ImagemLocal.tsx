import { Image, View, type ImageProps } from 'react-native';

import { useArquivoAberto } from '@/data/arquivos';

/**
 * `Image` para fotos que podem ser anexos cifrados (data/arquivos.ts): decifra uma cópia
 * temporária antes de mostrar. Enquanto decifra, ocupa o mesmo lugar, vazio. Outras fontes
 * (imagens do app, endereços da web) passam direto.
 */
export function ImagemLocal({ source, style, ...resto }: ImageProps) {
  const uri = source && typeof source === 'object' && !Array.isArray(source) && 'uri' in source ? source.uri : undefined;
  const aberto = useArquivoAberto(uri);
  if (uri === undefined) return <Image source={source} style={style} {...resto} />;
  if (!aberto) return <View style={style} />;
  return <Image source={{ uri: aberto }} style={style} {...resto} />;
}
