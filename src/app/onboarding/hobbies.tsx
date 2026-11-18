import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { Texto } from '@/components';
import { Aparecer, fimDoTexto, TextoAnimado } from '@/components/animacao';
import { Bolha, BotaoContinuar, TelaOnboarding, useTransicao } from '@/components/onboarding';
import { hobbies, MAX_HOBBIES } from '@/data/hobbies';
import { useOnboarding, type Hobby } from '@/data/onboarding';
import { gap, space, useTema } from '@/theme';

/**
 * D4 · Hobbies (bolhas) — "Quais são seus hobbies?" Escolha até três.
 * Posições e tamanhos das bolhas iguais ao Figma (frame de 412), escalados pela largura.
 * Ao tocar: onda ao redor + fundo bg/raised. As bolhas flutuam devagar, como na água.
 */
const bolhas: { id: Hobby; x: number; y: number; tamanho: number }[] = [
  { id: 'leitura', x: 37, y: 40, tamanho: 112 },
  { id: 'cinema', x: 216, y: 10, tamanho: 92 },
  { id: 'musica', x: 246, y: 117, tamanho: 108 },
  { id: 'escrita', x: 109, y: 176, tamanho: 108 },
  { id: 'jogos', x: 238, y: 254, tamanho: 84 },
  { id: 'atividade', x: 13, y: 279, tamanho: 84 },
];
const ALTURA_AREA = 363;
const TITULO = 'Quais são seus hobbies?';
const SUB = 'Toque nos que combinam. Escolha até três.';
const T_SUB = fimDoTexto(TITULO, 150);
const T_BOLHAS = fimDoTexto(SUB, T_SUB);

export default function D4Hobbies() {
  const { cores } = useTema();
  const { width } = useWindowDimensions();
  const s = Math.min(width / 412, 1.15);
  const { respostas, atualizar } = useOnboarding();
  const [escolhidos, setEscolhidos] = useState<Hobby[]>(respostas.hobbies);
  const transicao = useTransicao();

  const alternar = (id: Hobby) =>
    setEscolhidos((atual) =>
      atual.includes(id) ? atual.filter((h) => h !== id) : atual.length < MAX_HOBBIES ? [...atual, id] : atual,
    );

  const seguir = () => {
    atualizar({ hobbies: escolhidos });
    transicao.sair(() => router.push('/onboarding/hobbies-resumo'));
  };

  return (
    <TelaOnboarding
      transicao={transicao}
      atrasoRodape={T_BOLHAS + 500}
      rodape={<BotaoContinuar disabled={escolhidos.length === 0} onPress={seguir} />}
    >
      <View style={styles.cabecalho}>
        <TextoAnimado texto={TITULO} estilo="Títulos/Grande" atraso={150} />
        <TextoAnimado texto={SUB} estilo="Texto/Pequeno" cor={cores.text.secondary} atraso={T_SUB} />
        {/* o contador ficava ao lado do progresso; sem ele, vira uma legenda */}
        <Aparecer atraso={T_BOLHAS}>
          <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary} style={styles.centro}>
            {`${escolhidos.length} de ${MAX_HOBBIES}`}
          </Texto>
        </Aparecer>
      </View>

      <View style={styles.flex}>
        <View style={[styles.area, { width: 412 * s, height: ALTURA_AREA * s }]}>
          {bolhas.map((b, i) => {
            const h = hobbies[b.id];
            return (
              <Aparecer
                key={b.id}
                atraso={T_BOLHAS + i * 80}
                escalaInicial={0.6}
                deslocamento={0}
                style={{ position: 'absolute', left: b.x * s, top: b.y * s }}
              >
                <Bolha
                  Icone={h.Icone}
                  rotulo={h.nome}
                  tamanho={b.tamanho * s}
                  larguraRotulo={b.tamanho * s - 20}
                  selecionada={escolhidos.includes(b.id)}
                  onPress={() => alternar(b.id)}
                  flutuar={i + 1}
                />
              </Aparecer>
            );
          })}
        </View>
      </View>
    </TelaOnboarding>
  );
}

const styles = StyleSheet.create({
  cabecalho: { gap: gap.default },
  centro: { textAlign: 'center' },
  flex: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: space[16] },
  area: {},
});
