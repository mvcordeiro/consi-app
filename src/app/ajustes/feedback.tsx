import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { Botao, CampoTexto, Filtro, Texto } from '@/components';
import { TelaAjustes } from '@/components/comunidade';
import { ehErroNuvem } from '@/data/nuvem/cliente';
import {
  enviarFeedback,
  infoDoAparelho,
  LIMITES_FEEDBACK,
  NOME_TIPO_FEEDBACK,
  TIPOS_FEEDBACK,
  type TipoFeedback,
} from '@/data/nuvem/feedback';
import { radius, space, useTema } from '@/theme';

function mensagem(e: unknown) {
  if (ehErroNuvem(e, 'offline')) return 'Sem conexão. Confira a internet e tente de novo.';
  if (ehErroNuvem(e, 'limite-diario')) return 'Você já mandou 5 feedbacks hoje. Volte amanhã para mandar mais.';
  if (ehErroNuvem(e, 'nao-configurada')) return 'O feedback ainda não está disponível nesta versão.';
  return 'Algo deu errado do nosso lado. Tente de novo em instantes.';
}

/**
 * Ajustes → Mandar feedback (issue #16). Privado: só a equipe lê, ao contrário das Sugestões.
 * Tipo (algo deu errado, ideia, elogio, outro), texto, print opcional da galeria e, à vista, a
 * versão do app e o aparelho que vão junto.
 */
export default function Feedback() {
  const { cores } = useTema();
  const [tipo, setTipo] = useState<TipoFeedback>('bug');
  const [texto, setTexto] = useState('');
  const [print, setPrint] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const info = infoDoAparelho();

  const t = texto.trim();
  const valido = t.length >= LIMITES_FEEDBACK.textoMin;

  const escolherPrint = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!r.canceled && r.assets[0]) setPrint(r.assets[0].uri);
  };

  const enviar = async () => {
    if (!valido || enviando) return;
    setEnviando(true);
    setErro(null);
    try {
      await enviarFeedback({ tipo, texto: t, print });
      setEnviado(true);
    } catch (e) {
      setErro(mensagem(e));
    } finally {
      setEnviando(false);
    }
  };

  if (enviado) {
    return (
      <TelaAjustes titulo="Recebemos seu feedback" voltar="Ajustes" rodape={<Botao rotulo="Voltar" onPress={() => router.back()} />}>
        <Texto cor={cores.text.secondary}>Obrigado por contar. A equipe do Consi lê cada um, com calma.</Texto>
      </TelaAjustes>
    );
  }

  return (
    <TelaAjustes
      titulo="Mandar feedback"
      voltar="Ajustes"
      rodape={
        <>
          {erro ? (
            <Texto estilo="Texto/Pequeno" cor={cores.feedback.error} accessibilityLiveRegion="assertive">
              {erro}
            </Texto>
          ) : null}
          <Botao
            rotulo={enviando ? 'Enviando…' : 'Enviar feedback'}
            onPress={enviar}
            estado={valido && !enviando ? 'normal' : 'desabilitado'}
            disabled={!valido || enviando}
          />
        </>
      }
    >
      <Texto estilo="Texto/Pequeno" cor={cores.text.secondary}>
        Só a equipe do Consi lê. Para ideias que outras pessoas podem votar, use Comunidade → Sugestões.
      </Texto>

      <View style={styles.bloco}>
        <Texto estilo="Títulos/Pequeno">Sobre o quê?</Texto>
        <View style={styles.opcoes} accessibilityRole="radiogroup">
          {TIPOS_FEEDBACK.map((x) => (
            <Filtro key={x} rotulo={NOME_TIPO_FEEDBACK[x]} ativo={tipo === x} onPress={() => setTipo(x)} />
          ))}
        </View>
      </View>

      <CampoTexto
        titulo="Conte pra gente"
        rotulo={`${texto.length}/${LIMITES_FEEDBACK.textoMax}`}
        placeholder={tipo === 'bug' ? 'O que aconteceu? O que você estava fazendo?' : 'Escreva do seu jeito.'}
        value={texto}
        onChangeText={setTexto}
        maxLength={LIMITES_FEEDBACK.textoMax}
        multiline
        alturaMinima={140}
        acessibilidade="Texto do feedback"
      />

      <View style={styles.bloco}>
        <Texto estilo="Títulos/Pequeno">Print (opcional)</Texto>
        {print ? (
          <View style={styles.bloco}>
            <Image
              source={{ uri: print }}
              style={[styles.print, { backgroundColor: cores.bg.raised }]}
              resizeMode="contain"
              accessibilityLabel="Print anexado"
            />
            <Botao rotulo="Tirar o print" estilo="secundario" onPress={() => setPrint(null)} />
          </View>
        ) : (
          <Botao rotulo="Escolher da galeria" estilo="secundario" onPress={escolherPrint} />
        )}
      </View>

      <Texto estilo="Texto/Pequeno" cor={cores.text.tertiary}>
        Vai junto: Consi {info.versao ?? ''} · {info.sistema}
        {info.aparelho ? ` · ${info.aparelho}` : ''}. Nada do seu diário, hobbies ou pausas.
      </Texto>
    </TelaAjustes>
  );
}

const styles = StyleSheet.create({
  bloco: { gap: space[8] },
  opcoes: { flexDirection: 'row', flexWrap: 'wrap', gap: space[8] },
  print: { width: '100%', height: 220, borderRadius: radius.md },
});
