import { useEffect, useState } from 'react';
import { AppState, Linking, StyleSheet, View } from 'react-native';

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

  // Confere ao abrir e sempre que o app volta para a frente (antes só no início a frio: com o
  // Consi aberto nas recentes, o aviso nunca vinha). Um aviso já mostrado não volta na mesma sessão.
  useEffect(() => {
    let ativo = true;
    let mostrado = false;
    const conferir = () => {
      if (mostrado) return;
      buscarVersaoNova().then((v) => {
        if (ativo && v && !mostrado) {
          mostrado = true;
          setNova(v);
          setVisivel(true);
        }
      });
    };
    conferir();
    const assinatura = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') conferir();
    });
    return () => {
      ativo = false;
      assinatura.remove();
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
