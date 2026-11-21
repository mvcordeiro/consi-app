import * as Application from 'expo-application';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { useRef } from 'react';
import { Pressable } from 'react-native';

import { useTema } from '@/theme';

import { Texto } from '../Texto';
import { CartaoAjustes } from './Cartao';

const TOQUES_ADMIN = 7;

/**
 * Ajustes → Sobre: versão do app, build nativo e a atualização (EAS Update) em uso, para a pessoa
 * conseguir dizer exatamente o que tem instalado ao relatar um problema.
 * Tocar 7 vezes seguidas na versão chama `onAdmin` (entrada escondida da moderação).
 */
export function Sobre({ onAdmin }: { onAdmin?: () => void }) {
  const { cores } = useTema();
  const toques = useRef({ n: 0, ultimo: 0 });
  // No web não há versão nativa: usa a do app.json.
  const versao = Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? '';
  const build = Application.nativeBuildVersion;
  const atualizacao = Updates.isEmbeddedLaunch ? 'do APK' : (Updates.updateId?.slice(0, 8) ?? 'desenvolvimento');

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
    <CartaoAjustes rotulo="Sobre">
      <Pressable onPress={tocar} accessibilityRole="text" accessibilityLabel={`Consi versão ${versao}`}>
        <Texto estilo="Títulos/Pequeno">Consi {versao}</Texto>
        <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary}>
          {build ? `Build ${build} · ` : ''}Atualização {atualizacao}
        </Texto>
      </Pressable>
      <Texto estilo="Texto/Pequeno" cor={cores.text.secondary}>
        Seus registros ficam só neste celular. Só o que você escreve em Sugestões sai dele.
      </Texto>
    </CartaoAjustes>
  );
}
