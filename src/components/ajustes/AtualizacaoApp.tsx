import * as Updates from 'expo-updates';
import { useState } from 'react';
import { Platform } from 'react-native';

import { Botao } from '../Botao';
import { Ajuste } from './Cartao';

const dataCurta = (d?: Date | null) =>
  d ? `${d.getDate()}/${d.getMonth() + 1} às ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : '';

/**
 * Ajustes → Sobre: qual atualização do app está rodando e um botão para procurar uma nova na
 * hora. Mostra o erro em texto se a atualização não baixar ou não abrir, para dar para saber
 * por que ela não chegou sem precisar ligar o celular no computador.
 */
export function AtualizacaoApp() {
  const [status, setStatus] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  if (Platform.OS === 'web' || !Updates.isEnabled) return null;

  const codigo = Updates.updateId ? Updates.updateId.slice(-8) : null;
  const rodando = Updates.isEmbeddedLaunch || !codigo
    ? 'Rodando a versão que veio no instalador.'
    : `Rodando a atualização ${codigo}, de ${dataCurta(Updates.createdAt)}.`;
  const emergencia = Updates.isEmergencyLaunch
    ? ` A última atualização não abriu e o app voltou para a do instalador: ${Updates.emergencyLaunchReason ?? 'sem motivo informado'}.`
    : '';

  const procurar = async () => {
    setOcupado(true);
    setStatus('Procurando…');
    try {
      const r = await Updates.checkForUpdateAsync();
      if (!r.isAvailable) {
        setStatus('Você já está com a atualização mais nova.');
        return;
      }
      setStatus('Baixando…');
      await Updates.fetchUpdateAsync();
      setStatus('Pronto. Abrindo de novo…');
      await Updates.reloadAsync();
    } catch (e) {
      setStatus(`Não deu certo: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setOcupado(false);
    }
  };

  return (
    <Ajuste titulo="Atualização do app" descricao={`${rodando}${emergencia}${status ? `\n${status}` : ''}`}>
      <Botao rotulo="Procurar atualização" estilo="secundario" onPress={() => void procurar()} disabled={ocupado} />
    </Ajuste>
  );
}
