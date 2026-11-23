import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Texto } from '@/components';
import { Aparecer, fimDoTexto, TextoAnimado } from '@/components/animacao';
import { CanvasHobbies } from '@/components/hobbies';
import { BuscaHobbies } from '@/components/hobbies/BuscaHobbies';
import { BotaoContinuar, TelaOnboarding, useTransicao } from '@/components/onboarding';
import { buscarHobbies, HOBBIES_ORIGINAIS } from '@/data/catalogo';
import { MAX_HOBBIES } from '@/data/hobbies';
import { useOnboarding, type Hobby } from '@/data/onboarding';
import { gap, spaceFixo as space, useTema } from '@/theme';

/** Margem lateral do conteúdo do onboarding (TelaOnboarding). */
const MARGEM_ONBOARDING = space[32];
const TITULO = 'Quais são seus hobbies?';
const SUB = 'Toque nos que combinam. Escolha até três.';
const T_SUB = fimDoTexto(TITULO, 150);
const T_BOLHAS = fimDoTexto(SUB, T_SUB);

/**
 * D4 · Hobbies (bolhas) — "Quais são seus hobbies?" Escolha até três.
 * Os seis hobbies do Figma ficam no centro ("Para começar"); o resto do catálogo fica em volta,
 * agrupado por categoria, num canvas infinito que a pessoa explora arrastando (o mesmo de
 * "Novo hobby" na aba Hobbies). Ao tocar: onda ao redor + fundo bg/raised.
 */
export default function D4Hobbies() {
  const { cores } = useTema();
  const { respostas, atualizar } = useOnboarding();
  const [escolhidos, setEscolhidos] = useState<Hobby[]>(respostas.hobbies);
  const [consulta, setConsulta] = useState('');
  const busca = consulta.trim() ? buscarHobbies(consulta).map((x) => x.id) : null;
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
            {`${escolhidos.length} de ${MAX_HOBBIES} · arraste e use dois dedos para aproximar`}
          </Texto>
        </Aparecer>
        {/* Busca + "+" para criar um hobby que não está na lista */}
        <Aparecer atraso={T_BOLHAS}>
          <BuscaHobbies
            consulta={consulta}
            onConsulta={setConsulta}
            semResultado={!!busca && !busca.length}
            onCriado={(h) =>
              setEscolhidos((atual) =>
                atual.includes(h.id) ? atual : atual.length < MAX_HOBBIES ? [...atual, h.id] : atual,
              )
            }
          />
        </Aparecer>
      </View>

      {/* O canvas usa a largura toda da tela (sangra a margem do onboarding) */}
      <Aparecer atraso={T_BOLHAS} deslocamento={0} style={styles.canvas}>
        <CanvasHobbies selecionados={escolhidos} onAlternar={alternar} destaques={HOBBIES_ORIGINAIS} busca={busca} />
      </Aparecer>
    </TelaOnboarding>
  );
}

const styles = StyleSheet.create({
  cabecalho: { gap: gap.default },
  centro: { textAlign: 'center' },
  canvas: { flex: 1, marginHorizontal: -MARGEM_ONBOARDING, marginTop: space[16] },
});
