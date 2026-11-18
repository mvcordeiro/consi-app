import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Aparecer, fimDoTexto, TextoAnimado } from '@/components/animacao';
import { BotaoContinuar, IconeGrande, TelaOnboarding, useTransicao } from '@/components/onboarding';
import { IconePessoa } from '@/components/onboarding/assets';
import { useOnboarding } from '@/data/onboarding';
import { borderWidth, space, tipografia, useTema } from '@/theme';

/**
 * B1 · Nome — "Como podemos te chamar?"
 * Combinado: botão Continuar como nas outras telas, ativo só com nome preenchido.
 */
// quebra de linha igual ao Figma (caixa de 262 px)
const TITULO = 'Como podemos\nte chamar?';
const T_TITULO = 150;
const T_CAMPO = fimDoTexto(TITULO, T_TITULO);

export default function B1Nome() {
  const { cores } = useTema();
  const { respostas, atualizar } = useOnboarding();
  const [nome, setNome] = useState(respostas.nome);
  const valido = nome.trim().length > 0;
  const transicao = useTransicao();

  const seguir = () => {
    if (!valido) return;
    atualizar({ nome: nome.trim() });
    transicao.sair(() => router.push('/onboarding/boas-vindas'));
  };

  return (
    <TelaOnboarding
      transicao={transicao}
      etapa={1}
      evitarTeclado
      atrasoRodape={T_CAMPO + 150}
      rodape={<BotaoContinuar disabled={!valido} onPress={seguir} />}
    >
      <Aparecer escalaInicial={0.9}>
        <IconeGrande Icone={IconePessoa} />
      </Aparecer>
      <View style={styles.bloco}>
        <TextoAnimado texto={TITULO} estilo="Títulos/Destaque" atraso={T_TITULO} />
        <Aparecer atraso={T_CAMPO} style={[styles.campo, { borderBottomColor: cores.icon.primary }]}>
          <TextInput
            value={nome}
            onChangeText={setNome}
            onSubmitEditing={seguir}
            placeholder="Digite aqui"
            placeholderTextColor={cores.text.tertiary}
            autoCapitalize="words"
            autoComplete="name"
            returnKeyType="next"
            accessibilityLabel="Seu nome"
            style={[tipografia['Texto/Médio'], styles.entrada, { color: cores.text.primary }]}
          />
        </Aparecer>
      </View>
    </TelaOnboarding>
  );
}

const styles = StyleSheet.create({
  bloco: { marginTop: space[64], gap: space[64] },
  campo: {
    borderBottomWidth: borderWidth.thin,
    paddingHorizontal: space[8],
    paddingVertical: space[16],
  },
  entrada: { padding: 0, outlineStyle: 'none' } as object,
});
