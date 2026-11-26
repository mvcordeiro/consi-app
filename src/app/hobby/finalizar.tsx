import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Easing, KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Botao, CabecalhoVoltar, CampoTexto, Filtro, Texto } from '@/components';
import { Aparecer, TextoAnimado, fimDoTexto } from '@/components/animacao';
import { Premo } from '@/components/diario/Premo';
import { RostoPositivo } from '@/components/home/assets';
import { IconeHobby } from '@/components/hobbies';
import { AnelProgresso } from '@/components/onboarding';
import { hobbyInfo } from '@/data/catalogo';
import { emocoes } from '@/data/emocoes';
import { useHobbies } from '@/data/hobbiesEstado';
import { adicionarMomento } from '@/data/momentos';
import { inset, radius, space, useTema } from '@/theme';

const PERGUNTA = 'Como você se sentiu fazendo isso?';
const ATRASO_MENSAGEM = 500;

/**
 * Finalizar atividade (botão "Finalizar" dos cards; sem design no Figma).
 * A pessoa escolhe como se sentiu, com as emoções do Diário, e, se quiser, escreve uma nota.
 * Com a emoção, a conclusão vira um momento do Diário (origem "hobby"): a nota é o texto, a
 * atividade fica em destaque e o hobby vira marcador. Nota sem emoção pede a emoção antes,
 * como no Diário. Ao concluir aparece uma confirmação curta e a atividade sai de "em andamento".
 */
export default function Finalizar() {
  const { cores } = useTema();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const h = useHobbies();
  const atividade = h.item(id)?.minha;
  const [emocao, setEmocao] = useState<string | null>(null);
  const [pedirEmocao, setPedirEmocao] = useState(false);
  const [nota, setNota] = useState('');
  const [feito, setFeito] = useState(false);

  if (!atividade) return null;

  const concluir = async () => {
    const texto = nota.trim();
    if (texto && !emocao) {
      setPedirEmocao(true);
      return;
    }
    const momento = emocao
      ? await adicionarMomento({
          id: emocao,
          texto: texto || undefined,
          origem: 'hobby',
          pergunta: atividade.titulo,
          marcadores: [hobbyInfo(atividade.hobby).nome],
        }).catch(() => null)
      : null;
    h.finalizar(atividade.id, { emocao, nota, momentoEm: momento?.em });
    setFeito(true);
  };

  if (feito) {
    return (
      <Concluida
        mensagem={
          emocao
            ? 'Guardamos esse momento no seu Diário. Momentos assim ajudam a perceber o que faz bem para você.'
            : 'Momentos assim ajudam a perceber o que faz bem para você.'
        }
      />
    );
  }

  return (
    <SafeAreaView style={[styles.tela, { backgroundColor: cores.bg.base }]} edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView style={styles.tela} behavior="padding">
        <View style={styles.margemTopo}>
          <CabecalhoVoltar rotulo="Finalizar atividade" />
        </View>
        <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
          <Aparecer style={[styles.resumo, { backgroundColor: cores.bg.raised }]}>
            <IconeHobby hobby={atividade.hobby} icone={atividade.icone} caixa={24} />
            <Texto estilo="Títulos/Pequeno" style={styles.flex} numberOfLines={2}>
              {atividade.titulo}
            </Texto>
          </Aparecer>

          <View style={styles.bloco}>
            <TextoAnimado texto={PERGUNTA} estilo="Títulos/Grande" centralizado={false} atraso={150} />
            <Aparecer atraso={fimDoTexto(PERGUNTA, 150)} style={styles.opcoes}>
              {emocoes.map((e) => (
                <Filtro
                  key={e.id}
                  rotulo={e.nome}
                  ativo={emocao === e.id}
                  onPress={() => {
                    setEmocao(emocao === e.id ? null : e.id);
                    setPedirEmocao(false);
                  }}
                  icone={() => <Premo id={e.id} tamanho={18} />}
                />
              ))}
            </Aparecer>
            {pedirEmocao ? (
              <Texto estilo="Legenda/Pequena" cor={cores.feedback.warning} accessibilityLiveRegion="polite">
                Escolha como você se sentiu para guardar a nota no seu Diário.
              </Texto>
            ) : null}
          </View>

          <Aparecer atraso={fimDoTexto(PERGUNTA, 250)}>
            <CampoTexto
              titulo="Quer anotar algo?"
              rotulo="Opcional · vai para o seu Diário"
              placeholder="O que ficou desse momento"
              value={nota}
              onChangeText={setNota}
              multiline
              alturaMinima={96}
              maxLength={240}
            />
          </Aparecer>
        </ScrollView>
        <View style={styles.rodape}>
          <Botao rotulo="Concluir atividade" corRotulo={cores.text['on-primary']} onPress={concluir} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/**
 * "Atividade concluída": o texto aparece palavra por palavra e, embaixo, o anel de progresso
 * enche enquanto a pessoa lê. Só volta quando o anel completa (de 3 a 5 s, conforme o texto).
 */
function Concluida({ mensagem }: { mensagem: string }) {
  const { cores } = useTema();
  const [progresso] = useState(() => new Animated.Value(0));
  const fimTexto = fimDoTexto(mensagem, ATRASO_MENSAGEM);
  // tempo para terminar de aparecer e ser lido, entre 3 e 5 s
  const duracao = Math.min(5000, Math.max(3000, fimTexto + 1200));

  useEffect(() => {
    const a = Animated.timing(progresso, {
      toValue: 1,
      duration: duracao,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    a.start(({ finished }) => {
      if (finished && router.canGoBack()) router.back();
    });
    return () => a.stop();
  }, [progresso, duracao]);

  return (
    <SafeAreaView style={[styles.tela, styles.centro, { backgroundColor: cores.bg.base }]}>
      <Aparecer escalaInicial={0.85} deslocamento={0} duracao={600}>
        <View style={[styles.selo, { backgroundColor: cores.bg['success-subtle'] }]}>
          <RostoPositivo width={46.5} height={48} corTraco={cores.icon.primary} />
        </View>
      </Aparecer>
      <TextoAnimado texto="Atividade concluída" estilo="Títulos/Grande" atraso={200} />
      <TextoAnimado texto={mensagem} estilo="Texto/Médio" cor={cores.text.secondary} atraso={ATRASO_MENSAGEM} />
      <Aparecer atraso={600} style={styles.anel}>
        <View accessible accessibilityLabel="Voltando para os hobbies">
          <AnelProgresso progresso={progresso} />
        </View>
      </Aparecer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  anel: { marginTop: space[24] },
  tela: { flex: 1 },
  centro: { alignItems: 'center', justifyContent: 'center', gap: space[16], padding: inset.lg },
  flex: { flex: 1, minWidth: 0 },
  margemTopo: { paddingHorizontal: inset.md },
  conteudo: { padding: inset.lg, gap: space[32] },
  resumo: { flexDirection: 'row', alignItems: 'center', gap: space[12], padding: inset.md, borderRadius: radius.card },
  bloco: { gap: space[20] },
  opcoes: { flexDirection: 'row', flexWrap: 'wrap', gap: space[12] },
  rodape: { paddingHorizontal: inset.lg, paddingTop: space[12], paddingBottom: space[8] },
  selo: { width: 96, height: 96, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
});
