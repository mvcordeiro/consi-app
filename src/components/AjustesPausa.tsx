import { StyleSheet, View } from 'react-native';

import {
  ligarVigia,
  pedirAcessoUso,
  pedirNotificacoes,
  pedirSobrepor,
  temPausaDeVerdade,
  usePermissoes,
} from '@/data/vigia';
import { radius, space, useTema } from '@/theme';

import { Botao } from './Botao';
import { Icone } from './Icone';
import { Texto } from './Texto';

/**
 * Ajustes · "Pausa nos apps" (só no APK Android). As três permissões que a pausa de verdade
 * usa e o liga/desliga do vigia. Cada permissão diz o que deixa de funcionar sem ela.
 * PROVISÓRIO: sem tela no Figma; layout e textos aguardam o design (fase 4 do plano).
 */
export function AjustesPausa() {
  const { cores } = useTema();
  const { permissoes, reler } = usePermissoes();
  if (!temPausaDeVerdade) return null;

  const alternar = async () => {
    await ligarVigia(!permissoes.ligada);
    reler();
  };

  return (
    <View style={[styles.cartao, { backgroundColor: cores.bg.raised }]}>
      <Texto estilo="Texto/Botões e rótulos" cor={cores.text.tertiary}>
        PAUSA NOS APPS
      </Texto>
      <Texto cor={cores.text.secondary}>
        O Consi abre uma pausa antes dos apps dos seus grupos. Para isso, o Android pede algumas permissões.
      </Texto>

      <Permissao
        titulo="Acesso de uso"
        ligada={permissoes.acessoUso}
        semEla="Sem ele, o Consi não sabe que app você abriu e nada é pausado."
        rotulo="Permitir acesso de uso"
        onPedir={pedirAcessoUso}
      />
      <Permissao
        titulo="Sobrepor a outros apps"
        ligada={permissoes.sobrepor}
        semEla="Sem ela, a pausa chega como notificação em vez de abrir sozinha."
        rotulo="Permitir sobrepor"
        onPedir={pedirSobrepor}
      />
      <Permissao
        titulo="Notificações"
        ligada={permissoes.notificacoes}
        semEla="Sem elas, os lembretes do Cuidar tempo não aparecem."
        rotulo="Permitir notificações"
        onPedir={async () => {
          await pedirNotificacoes();
          reler();
        }}
      />

      <Botao
        rotulo={permissoes.ligada ? 'Desligar a pausa nos apps' : 'Ligar a pausa nos apps'}
        estilo={permissoes.ligada ? 'secundario' : 'primario'}
        onPress={alternar}
        estado={permissoes.acessoUso ? 'normal' : 'desabilitado'}
        disabled={!permissoes.acessoUso}
      />
    </View>
  );
}

function Permissao({
  titulo,
  ligada,
  semEla,
  rotulo,
  onPedir,
}: {
  titulo: string;
  ligada: boolean;
  semEla: string;
  rotulo: string;
  onPedir: () => void;
}) {
  const { cores } = useTema();
  return (
    <View style={styles.permissao}>
      <View style={styles.linha}>
        <Texto estilo="Títulos/Pequeno" style={styles.flex}>
          {titulo}
        </Texto>
        {ligada ? <Icone nome="selo" tamanho={16} cor={cores.feedback.success} /> : null}
        <Texto estilo="Legenda/Pequena" cor={ligada ? cores.text.secondary : cores.text.tertiary}>
          {ligada ? 'Ligado' : 'Desligado'}
        </Texto>
      </View>
      {ligada ? null : (
        <>
          <Texto estilo="Texto/Pequeno" cor={cores.text.secondary}>
            {semEla}
          </Texto>
          <Botao rotulo={rotulo} estilo="secundario" onPress={onPedir} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cartao: { gap: space[12], padding: space[16], borderRadius: radius.card },
  permissao: { gap: space[8] },
  linha: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  flex: { flex: 1 },
});
