import { useEffect, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { buscarVersaoNova, type VersaoNativa } from '@/data/versaoNativa';
import { space } from '@/theme';

import { Botao } from './Botao';
import { Folha } from './Folha';

/**
 * "Nova versão disponível": para o APK instalado fora da loja. Ao abrir o app, confere o endereço de
 * versão (src/data/versaoNativa.ts) e, se houver um APK mais novo, mostra uma Folha com o link.
 * Mudanças só de JS/telas não passam por aqui: chegam pelo expo-updates na abertura do app.
 * Sem componente próprio no Design System: usa a Folha e o Botão Primário/Secundário.
 */
export function AvisoNovaVersao() {
  const [nova, setNova] = useState<VersaoNativa | null>(null);
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    let ativo = true;
    buscarVersaoNova().then((v) => {
      if (ativo && v) {
        setNova(v);
        setVisivel(true);
      }
    });
    return () => {
      ativo = false;
    };
  }, []);

  if (!nova) return null;

  const baixar = () => {
    setVisivel(false);
    Linking.openURL(nova.link).catch(() => {});
  };

  return (
    <Folha
      visivel={visivel}
      onFechar={() => setVisivel(false)}
      titulo="Nova versão disponível"
      descricao={`${nova.versao ? `A versão ${nova.versao}` : 'Uma versão nova'} do Consi precisa ser instalada por cima desta. Seus dados continuam no celular.`}
    >
      <View style={styles.botoes}>
        <Botao rotulo="Baixar nova versão" onPress={baixar} />
        <Botao rotulo="Agora não" estilo="secundario" onPress={() => setVisivel(false)} />
      </View>
    </Folha>
  );
}

const styles = StyleSheet.create({
  botoes: { gap: space[12] },
});
