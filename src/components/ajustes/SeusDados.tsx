import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Updates from 'expo-updates';
import { useState } from 'react';
import { DevSettings, View } from 'react-native';

import { apagarTudo, exportarTudo } from '@/data/banco';
import { desligarTrava, destravarComAparelho, useTravaDiario } from '@/data/travaDiario';
import { chaveDia } from '@/data/momentos';
import { useTema } from '@/theme';

import { Botao } from '../Botao';
import { Folha } from '../Folha';
import { Texto } from '../Texto';
import { Ajuste } from './Cartao';

/**
 * Ajustes → Seus dados (LGPD): exportar tudo num JSON (compartilhamento do sistema) e apagar tudo
 * deste celular, com confirmação. As preferências entram no export (tabela `estado`).
 */
export function SeusDados() {
  const { cores } = useTema();
  const [confirmar, setConfirmar] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const trava = useTravaDiario();

  const exportar = async () => {
    // O arquivo leva o Diário: com ele trancado, exportar pede o bloqueio do celular (issue #12).
    if (trava.trancado && !(await destravarComAparelho(true))) return;
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
      await desligarTrava().catch(() => {});
    // Recomeça o app do zero (as telas guardam estado em memória).
    try {
      await Updates.reloadAsync();
    } catch {
      DevSettings.reload();
    }
  };

  const estado = ocupado ? 'desabilitado' : 'normal';
  return (
    <View>
      <Ajuste
        titulo="Guardados neste celular"
        descricao="Tudo o que você registra no Consi fica só aqui, criptografado. Se desinstalar o app, os dados somem: exporte antes para guardar uma cópia."
      >
        <Botao rotulo="Exportar meus dados" onPress={exportar} estado={estado} disabled={ocupado} />
        <Botao rotulo="Apagar tudo" estilo="secundario" onPress={() => setConfirmar(true)} estado={estado} disabled={ocupado} />
        {aviso ? (
          <Texto estilo="Texto/Pequeno" cor={cores.text.secondary} accessibilityLiveRegion="polite">
            {aviso}
          </Texto>
        ) : null}
      </Ajuste>

      <Folha
        visivel={confirmar}
        onFechar={() => setConfirmar(false)}
        titulo="Apagar tudo?"
        descricao="Seus momentos, áudios, fotos, grupos, hobbies e preferências saem deste celular e não dá para desfazer. Se quiser guardar uma cópia, exporte antes."
      >
        <Botao rotulo="Apagar tudo" onPress={apagar} estado={estado} disabled={ocupado} />
        <Botao rotulo="Cancelar" estilo="secundario" onPress={() => setConfirmar(false)} />
      </Folha>
    </View>
  );
}
