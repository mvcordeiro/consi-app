import { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import { removerFotoPerfil, trocarFotoPerfil, useFotoPerfil } from '@/data/perfil';
import { borderWidth, radius, space, useTema } from '@/theme';

import { Folha } from './Folha';
import { Icone, type NomeIcone } from './Icone';
import { Texto } from './Texto';

/**
 * Círculo de perfil do topo das abas. Sem foto, fica vazio (bg/raised); tocar abre a folha
 * "Sua foto" com duas opções lado a lado: tirar uma selfie ou escolher da galeria
 * (e "Remover foto" quando já existe uma).
 */
export function FotoPerfil({ tamanho = 40 }: { tamanho?: number }) {
  const { cores } = useTema();
  const foto = useFotoPerfil();
  const [aberta, setAberta] = useState(false);

  const escolher = (deOnde: 'selfie' | 'galeria') => {
    setAberta(false);
    // espera a folha descer antes de abrir a câmera ou a galeria
    setTimeout(() => void trocarFotoPerfil(deOnde), 250);
  };

  return (
    <>
      <Pressable
        onPress={() => setAberta(true)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={foto ? 'Trocar sua foto de perfil' : 'Adicionar uma foto de perfil'}
        style={({ pressed }) => [
          styles.circulo,
          {
            width: tamanho,
            height: tamanho,
            backgroundColor: cores.bg.raised,
            borderColor: cores.border.subtle,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        {foto ? <Image source={{ uri: foto }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
      </Pressable>
      <Folha visivel={aberta} onFechar={() => setAberta(false)} titulo="Sua foto">
        <View style={styles.opcoes}>
          <Opcao icone="camera" rotulo="Tirar uma selfie" onPress={() => escolher('selfie')} />
          <Opcao icone="inserir-imagem" rotulo="Escolher da galeria" onPress={() => escolher('galeria')} />
        </View>
        {foto ? (
          <Pressable
            onPress={() => {
              setAberta(false);
              void removerFotoPerfil();
            }}
            accessibilityRole="button"
            style={styles.remover}
          >
            <Texto estilo="Texto/Botões e rótulos" cor={cores.feedback.error}>
              Remover foto
            </Texto>
          </Pressable>
        ) : null}
      </Folha>
    </>
  );
}

function Opcao({ icone, rotulo, onPress }: { icone: NomeIcone; rotulo: string; onPress: () => void }) {
  const { cores } = useTema();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.opcao,
        { backgroundColor: pressed ? cores.bg.sunken : cores.bg.base, borderColor: cores.border.subtle },
      ]}
    >
      <View style={[styles.iconeOpcao, { backgroundColor: cores.bg.sunken }]}>
        <Icone nome={icone} tamanho={28} />
      </View>
      <Texto estilo="Texto/Botões e rótulos" style={styles.centro}>
        {rotulo}
      </Texto>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  circulo: { borderRadius: radius.full, borderWidth: borderWidth.thin, overflow: 'hidden' },
  opcoes: { flexDirection: 'row', gap: space[12] },
  opcao: {
    flex: 1,
    alignItems: 'center',
    gap: space[12],
    paddingVertical: space[20],
    paddingHorizontal: space[12],
    borderRadius: radius.lg,
    borderWidth: borderWidth.thin,
  },
  iconeOpcao: { width: 64, height: 64, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  centro: { textAlign: 'center' },
  remover: { alignSelf: 'center', paddingVertical: space[8] },
});
