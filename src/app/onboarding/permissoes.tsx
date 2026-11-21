import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Botao, Icone, Texto } from '@/components';
import { Aparecer, fimDoTexto, TextoAnimado } from '@/components/animacao';
import { BotaoContinuar, TelaOnboarding, useTransicao } from '@/components/onboarding';
import { PontoNotificacao, SetaVoltar, SwitchLigado } from '@/components/onboarding/assets';
import {
  abrirInfoDoApp,
  pedirAcessoUso,
  pedirNotificacoes,
  pedirSobrepor,
  temPausaDeVerdade,
  usePermissoes,
  type Permissoes,
} from '@/data/vigia';
import { borderWidth, gap, radius, space, useCoresSvg, useTema } from '@/theme';

/**
 * F1 · Permissões — o caminho real do Android, uma permissão por vez.
 * Cada cartão diz para que serve e mostra a tela do sistema que vai abrir (com o toque que a
 * pessoa precisa dar). O botão de baixo abre a tela da próxima permissão que falta; ao voltar
 * para o Consi, o cartão vira "Ligado" e o botão passa para a seguinte. "Agora não" pula a
 * permissão da vez (recusar não pode travar o onboarding; dá para ligar depois em Ajustes).
 * Com tudo resolvido, o botão vira Continuar e segue para os apps (que já usam o Acesso de uso
 * para mostrar os mais usados).
 * No navegador e no iPhone não há permissões reais: os cartões só ilustram e o botão segue.
 *
 * Configurações restritas (Android 13+, APK de fora da loja): o Android bloqueia o Acesso de uso
 * até a pessoa liberar em Informações do app → ⋮ → "Permitir configurações restritas". Quando
 * o Consi percebe o bloqueio, o primeiro passo vira esse; e sempre há o atalho "O Android
 * bloqueou?" no cartão do Acesso de uso.
 */
type Chave = 'acessoUso' | 'sobrepor' | 'notificacoes';

const PERMISSOES: {
  chave: Chave;
  titulo: string;
  paraQue: string;
  botao: string;
}[] = [
  {
    chave: 'acessoUso',
    titulo: 'Acesso de uso',
    paraQue: 'Para saber qual app você abriu e quais você mais usa.',
    botao: 'Abrir Acesso de uso',
  },
  {
    chave: 'sobrepor',
    titulo: 'Sobrepor a outros apps',
    paraQue: 'Para a pausa aparecer por cima do app, antes dele abrir.',
    botao: 'Abrir Sobrepor a outros apps',
  },
  {
    chave: 'notificacoes',
    titulo: 'Notificações',
    paraQue: 'Para os lembretes de tempo e a pausa que chega como aviso.',
    botao: 'Permitir notificações',
  },
];

const TITULO = 'O Android pede 3 permissões para o Consi pausar seus apps';
const SUB = 'Cada botão abre a tela certa do celular. Ligue a opção e volte para cá.';
const T_SUB = fimDoTexto(TITULO, 150);
const T_PASSOS = fimDoTexto(SUB, T_SUB);

export default function F1Permissoes() {
  const { cores } = useTema();
  const transicao = useTransicao();
  const { permissoes, reler } = usePermissoes();
  const [puladas, setPuladas] = useState<Chave[]>([]);

  const ligada = (c: Chave) => !temPausaDeVerdade || permissoes[c as keyof Permissoes];
  // A próxima permissão a pedir: a primeira que não está ligada nem foi pulada.
  const vez = temPausaDeVerdade ? PERMISSOES.find((p) => !ligada(p.chave) && !puladas.includes(p.chave)) : undefined;

  // Acesso de uso bloqueado pelas configurações restritas: antes, liberar em Informações do app.
  const bloqueada = vez?.chave === 'acessoUso' && permissoes.restritas;

  const seguir = () => transicao.sair(() => router.push('/onboarding/aplicativos'));
  const pedir = async (c: Chave) => {
    if (c === 'acessoUso') pedirAcessoUso();
    else if (c === 'sobrepor') pedirSobrepor();
    else {
      await pedirNotificacoes();
      reler();
    }
  };

  return (
    <TelaOnboarding
      transicao={transicao}
      comTextura={false}
      rolavel
      atrasoRodape={T_PASSOS + 500}
      rodape={
        vez ? (
          <View style={styles.rodape}>
            {bloqueada ? (
              <BotaoContinuar rotulo="Abrir informações do Consi" onPress={abrirInfoDoApp} />
            ) : (
              <BotaoContinuar rotulo={vez.botao} onPress={() => pedir(vez.chave)} />
            )}
            <Botao
              rotulo="Agora não"
              estilo="secundario"
              apagado
              onPress={() => setPuladas((p) => [...p, vez.chave])}
            />
          </View>
        ) : (
          <BotaoContinuar onPress={seguir} />
        )
      }
    >
      <View style={styles.cabecalho}>
        <TextoAnimado texto={TITULO} estilo="Títulos/Grande" atraso={150} />
        <TextoAnimado texto={SUB} estilo="Texto/Pequeno" cor={cores.text.link} atraso={T_SUB} />
      </View>

      <View style={styles.passos}>
        {PERMISSOES.map((p, i) => (
          <Cartao
            key={p.chave}
            ordem={i}
            titulo={`${i + 1}. ${p.titulo}`}
            paraQue={p.paraQue}
            estado={
              temPausaDeVerdade && ligada(p.chave)
                ? 'ligada'
                : vez?.chave === p.chave
                  ? 'vez'
                  : puladas.includes(p.chave)
                    ? 'pulada'
                    : 'espera'
            }
          >
            {p.chave === 'acessoUso' && bloqueada ? (
              <Restritas />
            ) : p.chave === 'acessoUso' ? (
              <>
                <TelaDoSistema
                  lista="Acesso de uso"
                  opcao="Permitir acesso de uso"
                  nota="Alguns celulares abrem direto na tela do Consi."
                />
                <LinkBloqueio />
              </>
            ) : p.chave === 'sobrepor' ? (
              <TelaDoSistema
                lista="Sobrepor a outros apps"
                opcao="Permitir sobreposição"
                nota="Em alguns celulares o nome é “Aparecer na parte superior”."
              />
            ) : (
              <AvisoDoSistema />
            )}
          </Cartao>
        ))}
      </View>
    </TelaOnboarding>
  );
}

type Estado = 'ligada' | 'vez' | 'pulada' | 'espera';

function Cartao({
  titulo,
  paraQue,
  ordem,
  estado,
  children,
}: {
  titulo: string;
  paraQue: string;
  ordem: number;
  estado: Estado;
  children: ReactNode;
}) {
  const { cores } = useTema();
  return (
    <Aparecer atraso={T_PASSOS + ordem * 150} deslocamento={16} style={styles.passo}>
      <View style={styles.tituloCartao}>
        <Texto estilo="Títulos/Pequeno" style={styles.flex}>
          {titulo}
        </Texto>
        {estado === 'ligada' ? (
          <View style={styles.linha}>
            <Icone nome="selo" tamanho={16} cor={cores.feedback.success} />
            <Texto estilo="Legenda/Pequena" cor={cores.text.secondary}>
              Ligado
            </Texto>
          </View>
        ) : estado === 'pulada' ? (
          <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary}>
            Depois, em Ajustes
          </Texto>
        ) : null}
      </View>
      <Texto estilo="Texto/Pequeno" cor={cores.text.link}>
        {paraQue}
      </Texto>
      {/* Só a permissão da vez mostra o caminho; as outras ficam resumidas. */}
      {estado === 'vez' || !temPausaDeVerdade ? (
        <View
          style={[
            styles.cartao,
            { borderColor: estado === 'vez' ? cores.border.focus : cores.icon.primary },
            estado === 'vez' && { borderWidth: borderWidth.thick },
          ]}
        >
          {children}
        </View>
      ) : null}
    </Aparecer>
  );
}

/** A tela de Ajustes do Android que vai abrir: a lista com o Consi e, dentro dele, a chave. */
function TelaDoSistema({ lista, opcao, nota }: { lista: string; opcao: string; nota: string }) {
  const { cores } = useTema();
  const coresSvg = useCoresSvg();
  return (
    <>
      <Voltar rotulo={lista} />
      <View style={styles.item}>
        <View style={styles.comPonto}>
          <Texto estilo="Texto/Pequeno">Consi</Texto>
          <View style={styles.ponto}>
            <PontoNotificacao {...coresSvg} />
          </View>
        </View>
        <Texto estilo="Legenda/Pequena" cor={cores.text.link}>
          Toque no Consi
        </Texto>
      </View>
      <View style={[styles.alternar, { borderColor: cores.border.focus }]}>
        <Texto estilo="Texto/Botões e rótulos" style={styles.flex}>
          {opcao}
        </Texto>
        <SwitchLigado {...coresSvg} />
      </View>
      <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary}>
        {nota} Depois, use o voltar do celular.
      </Texto>
    </>
  );
}

/**
 * Android 13+ com APK de fora da loja: o Acesso de uso aparece cinza ("configuração restrita").
 * Libera em Informações do app → ⋮ (canto de cima) → "Permitir configurações restritas".
 */
function Restritas() {
  const { cores } = useTema();
  const coresSvg = useCoresSvg();
  return (
    <>
      <Texto estilo="Texto/Pequeno">
        Antes, o Android pede para liberar as configurações restritas, porque o Consi não veio da loja.
      </Texto>
      <View style={styles.linha}>
        <View style={styles.seta}>
          <SetaVoltar {...coresSvg} />
        </View>
        <Texto estilo="Texto/Médio" style={styles.flex}>
          Informações do app
        </Texto>
        <View style={styles.comPonto}>
          <Texto estilo="Títulos/Pequeno">⋮</Texto>
          <View style={styles.ponto}>
            <PontoNotificacao {...coresSvg} />
          </View>
        </View>
      </View>
      <View style={[styles.alternar, { borderColor: cores.border.focus }]}>
        <Texto estilo="Texto/Botões e rótulos" style={styles.flex}>
          Permitir configurações restritas
        </Texto>
      </View>
      <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary}>
        Toque no ⋮ no canto de cima, depois em Permitir configurações restritas e confirme. Depois, use o voltar
        do celular e abra o Acesso de uso.
      </Texto>
    </>
  );
}

/** Atalho para quando o Android mostra o Acesso de uso bloqueado e o Consi não percebeu. */
function LinkBloqueio() {
  const { cores } = useTema();
  if (!temPausaDeVerdade) return null;
  return (
    <Pressable onPress={abrirInfoDoApp} accessibilityRole="link" hitSlop={8}>
      <Texto estilo="Legenda/Pequena" cor={cores.text.link} style={styles.sublinhado}>
        O Android disse que é uma configuração restrita? Abra as informações do Consi, toque no ⋮ e em Permitir
        configurações restritas.
      </Texto>
    </Pressable>
  );
}

/** O aviso do próprio Android (Android 13+) para notificações. */
function AvisoDoSistema() {
  const { cores } = useTema();
  return (
    <>
      <Texto estilo="Texto/Pequeno">Permitir que o Consi envie notificações?</Texto>
      <View style={[styles.alternar, { borderColor: cores.border.focus, justifyContent: 'center' }]}>
        <Texto estilo="Texto/Botões e rótulos">Permitir</Texto>
      </View>
      <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary}>
        Se o aviso não aparecer, abrimos a tela de notificações do Consi.
      </Texto>
    </>
  );
}

function Voltar({ rotulo }: { rotulo: string }) {
  const coresSvg = useCoresSvg();
  return (
    <View style={styles.linha}>
      <View style={styles.seta}>
        <SetaVoltar {...coresSvg} />
      </View>
      <Texto estilo="Texto/Médio">{rotulo}</Texto>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  sublinhado: { textDecorationLine: 'underline' },
  cabecalho: { gap: gap.default },
  passos: { marginTop: gap.section, gap: gap.section },
  passo: { gap: space[8] },
  tituloCartao: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  rodape: { gap: space[12] },
  cartao: {
    marginTop: space[8],
    borderWidth: borderWidth.thin,
    borderRadius: radius.sm,
    paddingHorizontal: space[12],
    paddingVertical: space[20],
    gap: space[16],
  },
  linha: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  ponto: { position: 'absolute', right: -9, top: 2 },
  seta: { width: 6, height: 12, alignItems: 'center', justifyContent: 'center' },
  item: { paddingHorizontal: space[12], gap: space[4] },
  comPonto: { alignSelf: 'flex-start' },
  alternar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: space[12],
    borderWidth: borderWidth.thin,
    borderRadius: radius.full,
    gap: space[8],
  },
});
