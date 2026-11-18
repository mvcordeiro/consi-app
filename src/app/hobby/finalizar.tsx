import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Botao, CabecalhoVoltar, CampoTexto, Filtro, Texto } from '@/components';
import { Aparecer, TextoAnimado, fimDoTexto } from '@/components/animacao';
import { RostoBocaFechada, RostoCorado, RostoPositivo, RostoTonto } from '@/components/home/assets';
import { IconeHobby } from '@/components/hobbies';
import { useHobbies } from '@/data/hobbiesEstado';
import { sentimentos, type Sentimento } from '@/data/catalogo';
import type { IconeSvg } from '@/components/onboarding/assets';
import { inset, radius, space, useTema } from '@/theme';

const PERGUNTA = 'Como você se sentiu fazendo isso?';

/** Rostos da Home (Streamline Freehand) para cada sentimento. */
const icones: Record<Sentimento, IconeSvg> = {
  leveza: RostoPositivo,
  calma: RostoBocaFechada,
  cansaco: RostoCorado,
  distracao: RostoTonto,
};

/**
 * Finalizar atividade (botão "Finalizar" dos cards; sem design no Figma).
 * A pessoa registra como se sentiu e, se quiser, uma nota; ao concluir aparece uma
 * confirmação curta e a atividade sai da lista "em andamento".
 */
export default function Finalizar() {
  const { cores } = useTema();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const h = useHobbies();
  const atividade = h.item(id)?.minha;
  const [sentimento, setSentimento] = useState<Sentimento | null>(null);
  const [nota, setNota] = useState('');
  const [feito, setFeito] = useState(false);

  if (!atividade) return null;

  const concluir = () => {
    h.finalizar(atividade.id, sentimento, nota);
    setFeito(true);
    setTimeout(() => router.back(), 1800);
  };

  if (feito) {
    return (
      <SafeAreaView style={[styles.tela, styles.centro, { backgroundColor: cores.bg.base }]}>
        <Aparecer escalaInicial={0.85} deslocamento={0} duracao={600}>
          <View style={[styles.selo, { backgroundColor: cores.bg['success-subtle'] }]}>
            <RostoPositivo width={46.5} height={48} corTraco={cores.icon.primary} />
          </View>
        </Aparecer>
        <TextoAnimado texto="Atividade concluída" estilo="Títulos/Grande" atraso={200} />
        <TextoAnimado
          texto="Momentos assim ajudam a perceber o que faz bem para você."
          estilo="Texto/Médio"
          cor={cores.text.secondary}
          atraso={500}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.tela, { backgroundColor: cores.bg.base }]} edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView style={styles.tela} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
              {(Object.keys(sentimentos) as Sentimento[]).map((s) => {
                const Icone = icones[s];
                return (
                  <Filtro
                    key={s}
                    rotulo={sentimentos[s].rotulo}
                    ativo={sentimento === s}
                    onPress={() => setSentimento(sentimento === s ? null : s)}
                    icone={(cor) => <Icone width={16} height={16} corTraco={cor} />}
                  />
                );
              })}
            </Aparecer>
          </View>

          <Aparecer atraso={fimDoTexto(PERGUNTA, 250)}>
            <CampoTexto
              titulo="Quer anotar algo?"
              rotulo="Opcional · só você vê"
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

const styles = StyleSheet.create({
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
