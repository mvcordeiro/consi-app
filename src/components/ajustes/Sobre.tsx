import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { router, type Href } from 'expo-router';
import { useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { nuvemConfigurada } from '@/data/nuvem/cliente';
import { space, useTema } from '@/theme';

import { Botao } from '../Botao';
import { Texto } from '../Texto';
import { Ajuste, Divisoria } from './Cartao';

const TOQUES_ADMIN = 7;

type InfoSobre = { repositorio?: string; licenca?: string };

/** A versão que a pessoa reconhece (app.json → expo.version), igual no APK, no web e no Expo Go. */
export function versaoDoApp() {
  return Constants.expoConfig?.version ?? '';
}

/**
 * Ajustes → Sobre. Linguagem simples, sem detalhes de build: a versão, por que dá para confiar
 * no app mesmo fora da Play Store (dados no aparelho, criptografia, código aberto) e com o que ele
 * é feito. O endereço do código e a licença vêm de app.json → expo.extra.sobre (dá para trocar
 * por EAS Update). Tocar 7 vezes seguidas na versão chama `onAdmin` (entrada da moderação).
 */
export function Sobre({ onAdmin }: { onAdmin?: () => void }) {
  const { cores } = useTema();
  const toques = useRef({ n: 0, ultimo: 0 });
  const info = ((Constants.expoConfig?.extra as { sobre?: InfoSobre } | undefined)?.sobre ?? {}) as InfoSobre;
  const licenca = info.licenca ?? 'MIT';

  const tocar = () => {
    if (!onAdmin) return;
    const agora = Date.now();
    const t = toques.current;
    t.n = agora - t.ultimo < 600 ? t.n + 1 : 1;
    t.ultimo = agora;
    if (t.n >= TOQUES_ADMIN) {
      t.n = 0;
      onAdmin();
    }
  };

  return (
    <View>
      <Pressable onPress={tocar} accessibilityRole="text" accessibilityLabel={`Consi, versão ${versaoDoApp()}`} style={styles.versao}>
        <Texto estilo="Títulos/Médio">Consi</Texto>
        <Texto cor={cores.text.secondary}>Versão {versaoDoApp()}</Texto>
      </Pressable>

      <Divisoria />
      <Ajuste
        titulo="Seus registros ficam com você"
        descricao="Diário, emoções, hobbies e grupos ficam só neste celular. Não existe conta nem login, e nada disso vai para servidores."
      />

      <Divisoria />
      <Ajuste
        titulo="Protegido no aparelho"
        descricao="Os dados ficam num banco criptografado. A chave que abre esse banco fica no cofre de segurança do Android, que outros apps não conseguem ler."
      />

      <Divisoria />
      <Ajuste
        titulo="O que sai do celular"
        descricao="O que você escreve em Sugestões e os seus votos, sem seu nome nem e-mail. No piloto, também quais telas e recursos você usa (nunca o que você escreve), ligado a um código aleatório. Dá para desligar em Privacidade e dados."
      />

      <Divisoria />
      <Ajuste
        titulo="Por que não está na Play Store?"
        descricao="O Consi está em teste com poucas pessoas. O instalador é gerado a partir deste mesmo código pelo EAS, o serviço de compilação da Expo, e as atualizações chegam pelo próprio app."
      />

      <Divisoria />
      <Ajuste titulo="Feito com" descricao="Expo e React Native no app, SQLite criptografado para os seus dados e Supabase só para Sugestões, Novidades e Feedback." />

      {nuvemConfigurada() ? (
        <>
          <Divisoria />
          <Ajuste titulo="Achou um problema?" descricao="Conte direto para a equipe. Só a gente lê.">
            <Botao rotulo="Mandar feedback" estilo="secundario" onPress={() => router.push('/ajustes/feedback' as Href)} />
          </Ajuste>
        </>
      ) : null}

      <Divisoria />
      <Ajuste titulo="Feito com IA, testado por gente" descricao="Como a inteligência artificial ajudou a fazer o Consi e o que testamos.">
        <Botao rotulo="Saber mais" estilo="secundario" onPress={() => router.push('/ajustes/transparencia' as Href)} />
      </Ajuste>

      {/* Por último (pedido do produto). O piloto saiu daqui: fica no rodapé da aba Ajustes. */}
      <Divisoria />
      <Ajuste
        titulo="Código aberto"
        descricao={`O Consi é código aberto, sob a licença ${licenca}. Qualquer pessoa pode ler o código e conferir o que o app faz com os seus dados.`}
      >
        {info.repositorio ? (
          <Botao rotulo="Ver o código no GitHub" estilo="secundario" onPress={() => Linking.openURL(info.repositorio!)} />
        ) : null}
      </Ajuste>
    </View>
  );
}

const styles = StyleSheet.create({
  versao: { gap: space[4], paddingBottom: space[16] },
});
