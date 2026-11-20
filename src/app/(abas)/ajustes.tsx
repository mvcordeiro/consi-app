import { File, Paths } from 'expo-file-system';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import * as Updates from 'expo-updates';
import { useState } from 'react';
import { DevSettings, StyleSheet, View } from 'react-native';

import { Botao, Folha, Tela, Texto } from '@/components';
import { apagarTudo, exportarTudo } from '@/data/banco';
import { chaveDia } from '@/data/momentos';
import { refazerOnboarding } from '@/data/onboarding';
import { radius, space, useTema } from '@/theme';

/**
 * Ajustes (provisório). "Seus dados" (exportar e apagar tudo, LGPD) e os atalhos de teste.
 * PROVISÓRIO: ainda sem tela no Figma; layout e textos aguardam o design.
 */
export default function Ajustes() {
  const { cores } = useTema();
  const [confirmar, setConfirmar] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const refazer = async () => {
    await refazerOnboarding();
    router.replace('/onboarding');
  };

  const exportar = async () => {
    setOcupado(true);
    setAviso(null);
    try {
      const dados = await exportarTudo();
      const arquivo = new File(Paths.cache, `consi-meus-dados-${chaveDia(new Date())}.json`);
      if (arquivo.exists) arquivo.delete();
      arquivo.create();
      arquivo.write(JSON.stringify(dados, null, 2));
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(arquivo.uri, { mimeType: 'application/json', dialogTitle: 'Exportar meus dados', UTI: 'public.json' });
      } else {
        setAviso('Não deu para abrir o compartilhamento neste aparelho.');
      }
    } catch {
      setAviso('Não deu para exportar agora. Tente de novo.');
    } finally {
      setOcupado(false);
    }
  };

  const apagar = async () => {
    setOcupado(true);
    await apagarTudo();
    // Recomeça o app do zero (as telas guardam estado em memória).
    try {
      await Updates.reloadAsync();
    } catch {
      DevSettings.reload();
    }
  };

  return (
    <Tela>
      <Texto estilo="Títulos/Grande">Ajustes</Texto>

      <View style={[styles.cartao, { backgroundColor: cores.bg.raised }]}>
        <Texto estilo="Texto/Botões e rótulos" cor={cores.text.tertiary}>
          SEUS DADOS
        </Texto>
        <Texto cor={cores.text.secondary}>
          Tudo o que você guarda no Consi fica só neste celular, criptografado. Se desinstalar o app, os dados somem.
        </Texto>
        <Botao rotulo="Exportar meus dados" onPress={exportar} estado={ocupado ? 'desabilitado' : 'normal'} disabled={ocupado} />
        <Botao rotulo="Apagar tudo" estilo="secundario" onPress={() => setConfirmar(true)} estado={ocupado ? 'desabilitado' : 'normal'} disabled={ocupado} />
        {aviso ? <Texto cor={cores.text.secondary}>{aviso}</Texto> : null}
      </View>

      <View style={[styles.cartao, { backgroundColor: cores.bg.raised }]}>
        <Texto estilo="Texto/Botões e rótulos" cor={cores.text.tertiary}>
          PARA TESTES
        </Texto>
        <Botao rotulo="Refazer onboarding" onPress={refazer} />
        <Botao rotulo="Abrir tela de pausa" estilo="secundario" onPress={() => router.push('/pausa')} />
      </View>

      <Folha
        visivel={confirmar}
        onFechar={() => setConfirmar(false)}
        titulo="Apagar tudo?"
        descricao="Seus momentos, áudios, fotos, grupos e hobbies saem deste celular e não dá para desfazer. Se quiser guardar uma cópia, exporte antes."
      >
        <Botao rotulo="Apagar tudo" onPress={apagar} estado={ocupado ? 'desabilitado' : 'normal'} disabled={ocupado} />
        <Botao rotulo="Cancelar" estilo="secundario" onPress={() => setConfirmar(false)} />
      </Folha>
    </Tela>
  );
}

const styles = StyleSheet.create({
  cartao: { gap: space[12], padding: space[16], borderRadius: radius.card },
});
