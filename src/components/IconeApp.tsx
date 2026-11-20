import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { appPorId, useApps, type AppInfo } from '@/data/apps';
import { primitivas, radius } from '@/theme';

import { Texto } from './Texto';

/**
 * Ícone de um app: o ícone real do aparelho (APK Android) ou, nos apps de exemplo, a marca do
 * Font Awesome num quadrado claro. Sem nenhum dos dois, a inicial do nome.
 */
export function IconeApp({
  id,
  app: dado,
  lado = 32,
  proporcaoMarca = 0.5,
  style,
}: {
  id?: string;
  app?: AppInfo;
  lado?: number;
  /** Tamanho da marca do Font Awesome em relação ao quadrado. */
  proporcaoMarca?: number;
  style?: StyleProp<ViewStyle>;
}) {
  // Assina a lista para trocar o ícone quando os apps do aparelho terminam de carregar.
  useApps();
  const app = dado ?? (id ? appPorId(id) : undefined);
  const caixa = [styles.caixa, { width: lado, height: lado, borderRadius: Math.min(radius.md, lado / 4) }, style];

  if (app?.icone) {
    return (
      <View style={caixa}>
        <Image source={{ uri: app.icone }} style={{ width: lado, height: lado }} accessibilityIgnoresInvertColors />
      </View>
    );
  }
  return (
    <View style={[caixa, { backgroundColor: primitivas.neutral[200] }]}>
      {app?.marca ? (
        <FontAwesome6 name={app.marca as 'instagram'} brand size={lado * proporcaoMarca} color={primitivas.neutral[950]} />
      ) : (
        <Texto estilo="Texto/Botões e rótulos" cor={primitivas.neutral[950]}>
          {(app?.nome ?? id ?? '?').slice(0, 1).toUpperCase()}
        </Texto>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  caixa: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
