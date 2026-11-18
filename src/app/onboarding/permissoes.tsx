import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Texto } from '@/components';
import { Aparecer, fimDoTexto, TextoAnimado } from '@/components/animacao';
import { BotaoContinuar, TelaOnboarding, useTransicao } from '@/components/onboarding';
import { IconeDownload, PontoNotificacao, SetaVoltar, SwitchLigado } from '@/components/onboarding/assets';
import { borderWidth, gap, radius, space, useCoresSvg, useTema } from '@/theme';

/**
 * F1 · Permissões — passo a passo ilustrado (caminho do Android).
 * Combinado: por enquanto é só ilustrativo; a versão do iPhone e a permissão real
 * (módulo nativo) vêm depois. O conteúdo rola e o botão fica fixo embaixo.
 * Títulos centralizados; os cartões imitam a tela do sistema, então ficam à esquerda.
 */
const TITULO = 'Precisamos de algumas permissões para seguir';
const SUB = 'Você pode editar isso depois.';
const T_SUB = fimDoTexto(TITULO, 150);
const T_PASSOS = fimDoTexto(SUB, T_SUB);

export default function F1Permissoes() {
  const { cores } = useTema();
  const transicao = useTransicao();
  const coresSvg = useCoresSvg();

  return (
    <TelaOnboarding
      transicao={transicao}
      comTextura={false}
      rolavel
      atrasoRodape={T_PASSOS + 500}
      rodape={<BotaoContinuar onPress={() => transicao.sair(() => router.push('/onboarding/compromisso'))} />}
    >
      <View style={styles.cabecalho}>
        <TextoAnimado texto={TITULO} estilo="Títulos/Grande" atraso={150} />
        <TextoAnimado texto={SUB} estilo="Texto/Pequeno" cor={cores.text.link} atraso={T_SUB} />
      </View>

      <View style={styles.passos}>
        <Passo ordem={0} titulo="1. Clique em aplicativos instalados">
          <View style={styles.linha}>
            <View style={[styles.iconeDownload, { backgroundColor: cores.action.secondary.pressed }]}>
              <IconeDownload {...coresSvg} />
            </View>
            <View style={styles.comPonto}>
              <Texto estilo="Texto/Pequeno">Aplicativos instalados</Texto>
              <View style={styles.ponto}>
                <PontoNotificacao {...coresSvg} />
              </View>
            </View>
          </View>
        </Passo>

        <Passo ordem={1} titulo="2. Busque pelo Consi e clique nele">
          <Voltar rotulo="Apps instalados" estilo="Texto/Pequeno" />
          <View style={styles.itemConsi}>
            <View style={styles.comPonto}>
              <Texto estilo="Texto/Pequeno">Consi</Texto>
              <View style={[styles.ponto, { right: -9 }]}>
                <PontoNotificacao {...coresSvg} />
              </View>
            </View>
            <Texto estilo="Legenda/Pequena" cor={cores.text.link}>
              Desativado
            </Texto>
          </View>
        </Passo>

        <Passo ordem={2} titulo="3. Ative a permissão">
          <Voltar rotulo="Consi" estilo="Texto/Médio" />
          <View style={[styles.alternar, { borderColor: cores.border.focus }]}>
            <Texto estilo="Texto/Botões e rótulos">Ativado</Texto>
            <SwitchLigado {...coresSvg} />
          </View>
        </Passo>
      </View>
    </TelaOnboarding>
  );
}

function Passo({ titulo, ordem, children }: { titulo: string; ordem: number; children: ReactNode }) {
  const { cores } = useTema();
  return (
    <Aparecer atraso={T_PASSOS + ordem * 150} deslocamento={16} style={styles.passo}>
      <Texto estilo="Títulos/Pequeno" style={styles.centro}>
        {titulo}
      </Texto>
      <View style={[styles.cartao, { borderColor: cores.icon.primary }]}>{children}</View>
    </Aparecer>
  );
}

function Voltar({ rotulo, estilo }: { rotulo: string; estilo: 'Texto/Pequeno' | 'Texto/Médio' }) {
  const coresSvg = useCoresSvg();
  return (
    <View style={styles.linha}>
      <View style={styles.seta}>
        <SetaVoltar {...coresSvg} />
      </View>
      <Texto estilo={estilo}>{rotulo}</Texto>
    </View>
  );
}

const styles = StyleSheet.create({
  cabecalho: { gap: gap.default },
  centro: { textAlign: 'center' },
  passos: { marginTop: gap.section, gap: gap.section },
  passo: { gap: space[16] },
  cartao: {
    borderWidth: borderWidth.thin,
    borderRadius: radius.sm,
    paddingHorizontal: space[12],
    paddingVertical: space[20],
    gap: space[20],
  },
  linha: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  iconeDownload: { padding: space[4], borderRadius: radius.xs },
  ponto: { position: 'absolute', right: -11, top: 2 },
  seta: { width: 6, height: 12, alignItems: 'center', justifyContent: 'center' },
  itemConsi: { paddingHorizontal: space[12] },
  comPonto: { alignSelf: 'flex-start' },
  alternar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: space[12],
    borderWidth: borderWidth.thin,
    borderRadius: radius.full,
  },
});
