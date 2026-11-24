import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import { Botao, CampoTexto, Texto } from '@/components';
import { TelaAjustes } from '@/components/ajustes';
import { ehErroNuvem, nuvemConfigurada } from '@/data/nuvem/cliente';
import { HANDLE_REGEX, handleDisponivel, liberarHandle, limparHandle, reservarHandle } from '@/data/nuvem/perfis';
import { gravarHandleLocal, removerFotoPerfil, trocarFotoPerfil, useFotoPerfil, useHandle } from '@/data/perfil';
import { borderWidth, radius, space, useTema } from '@/theme';

const ESPERA_BUSCA = 500;

/**
 * Seu perfil (issue #3), aberto pelo toque na foto do topo: a foto (selfie, galeria ou remover)
 * e o @handle, único entre todos (reservado no Supabase). Handle + foto aparecem nas superfícies
 * sociais: conversas, cards e o "Compartilhar atividade".
 */
export default function Perfil() {
  const { cores } = useTema();
  const foto = useFotoPerfil();
  const salvo = useHandle();
  // null: ainda não mexeu (mostra o @ salvo).
  const [editado, setTexto] = useState<string | null>(null);
  const texto = editado ?? salvo ?? '';
  const [livre, setLivre] = useState<boolean | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const nuvem = nuvemConfigurada();


  const h = limparHandle(texto);
  const valido = HANDLE_REGEX.test(h);
  const mudou = h !== (salvo ?? '');

  useEffect(() => {
    if (!valido || !mudou || !nuvem) return;
    let vivo = true;
    const t = setTimeout(() => {
      handleDisponivel(h)
        .then((d) => vivo && setLivre(d))
        .catch(() => vivo && setLivre(null));
    }, ESPERA_BUSCA);
    return () => {
      vivo = false;
      clearTimeout(t);
    };
  }, [h, valido, mudou, nuvem]);

  const salvar = async () => {
    setSalvando(true);
    setErro(null);
    try {
      if (h) {
        await reservarHandle(h);
        await gravarHandleLocal(h);
      } else if (salvo) {
        await liberarHandle();
        await gravarHandleLocal(null);
      }
      router.back();
    } catch (e) {
      setErro(
        ehErroNuvem(e, 'offline')
          ? 'Sem conexão. O @ precisa da internet para ser reservado.'
          : (e as Error).message === 'em-uso'
            ? 'Esse @ já é de outra pessoa.'
            : 'Não deu para salvar agora. Tente de novo.',
      );
    } finally {
      setSalvando(false);
    }
  };

  const aviso = !texto
    ? 'De 3 a 20 letras minúsculas, números, ponto ou _.'
    : !valido
      ? 'Use de 3 a 20 letras minúsculas, números, ponto ou _.'
      : !mudou
        ? 'Esse é o seu @.'
        : livre === false
          ? 'Esse @ já é de outra pessoa.'
          : livre
            ? 'Disponível.'
            : 'Conferindo…';

  const podeSalvar = nuvem && !salvando && mudou && (h === '' || (valido && livre !== false));

  return (
    <TelaAjustes
      titulo="Seu perfil"
      voltar="Voltar"
      rodape={
        <>
          {erro ? (
            <Texto estilo="Texto/Pequeno" cor={cores.feedback.error} accessibilityLiveRegion="assertive">
              {erro}
            </Texto>
          ) : null}
          <Botao rotulo={salvando ? 'Salvando…' : 'Salvar'} onPress={() => void salvar()} estado={podeSalvar ? 'normal' : 'desabilitado'} disabled={!podeSalvar} />
        </>
      }
    >
      <View style={styles.foto}>
        <View style={[styles.circulo, { backgroundColor: cores.bg.raised, borderColor: cores.border.subtle }]}>
          {foto ? <Image source={{ uri: foto }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityLabel="Sua foto" /> : null}
        </View>
        <View style={styles.acoes}>
          <Botao rotulo="Tirar uma selfie" estilo="secundario" onPress={() => void trocarFotoPerfil('selfie')} />
          <Botao rotulo="Escolher da galeria" estilo="secundario" onPress={() => void trocarFotoPerfil('galeria')} />
          {foto ? (
            <Pressable onPress={() => void removerFotoPerfil()} accessibilityRole="button" style={styles.remover}>
              <Texto estilo="Texto/Botões e rótulos" cor={cores.feedback.error}>
                Remover foto
              </Texto>
            </Pressable>
          ) : null}
        </View>
      </View>

      {nuvem ? (
        <CampoTexto
          titulo="Seu @"
          rotulo={`${h.length}/20`}
          placeholder="ex.: ana.luz"
          value={texto}
          onChangeText={(t) => {
            setTexto(t.replace(/^@+/, ''));
            setLivre(null);
          }}
          maxLength={21}
          autoCapitalize="none"
          autoCorrect={false}
          acessibilidade="Seu @ no Consi"
          erro={(texto && !valido) || livre === false ? aviso : undefined}
        />
      ) : null}
      {nuvem && !((texto && !valido) || livre === false) ? (
        <Texto estilo="Texto/Pequeno" cor={cores.text.secondary}>
          {aviso}
        </Texto>
      ) : null}
      <Texto estilo="Texto/Pequeno" cor={cores.text.tertiary}>
        O @ e a foto aparecem quando você conversa nas atividades e no card de compartilhar. A foto fica só neste celular.
      </Texto>
    </TelaAjustes>
  );
}

const styles = StyleSheet.create({
  foto: { alignItems: 'center', gap: space[16] },
  circulo: { width: 112, height: 112, borderRadius: radius.full, borderWidth: borderWidth.thin, overflow: 'hidden' },
  acoes: { alignSelf: 'stretch', gap: space[8] },
  remover: { alignSelf: 'center', paddingVertical: space[8] },
});
