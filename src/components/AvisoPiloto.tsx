import { useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import {
  adiarConvite,
  conviteDevido,
  enderecoDoFormulario,
  marcarRespondeu,
  pilotoCarregado,
  registrar,
} from '@/data/piloto';
import { space } from '@/theme';

import { Botao } from './Botao';
import { Folha } from './Folha';

/**
 * Convite do piloto: depois de 3 dias de uso, uma Folha chama para o formulário final (NPS e
 * sugestões). Só aparece nas abas (nunca por cima da pausa ou do onboarding), uma vez por dia no
 * máximo, e some de vez com "Já respondi". Sem formulário em app.json → expo.extra.piloto, não aparece.
 */
export function AvisoPiloto() {
  const segmentos = useSegments();
  const nasAbas = (segmentos[0] as string | undefined) === '(abas)';
  const [endereco, setEndereco] = useState<string | null>(null);
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    if (!nasAbas || endereco) return;
    let vivo = true;
    pilotoCarregado()
      .then((d) => {
        const url = conviteDevido(d) ? enderecoDoFormulario(d) : null;
        if (vivo && url) {
          setEndereco(url);
          setVisivel(true);
          registrar('convite_visto');
        }
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [nasAbas, endereco]);

  if (!endereco) return null;

  const responder = () => {
    setVisivel(false);
    registrar('convite_aberto');
    // Ao voltar do formulário o convite não reaparece na hora: adia um dia.
    void adiarConvite(1);
    Linking.openURL(endereco).catch(() => {});
  };
  const depois = () => {
    setVisivel(false);
    void adiarConvite(1);
  };
  const jaRespondi = () => {
    setVisivel(false);
    void marcarRespondeu();
  };

  return (
    <Folha
      visivel={visivel && nasAbas}
      onFechar={depois}
      titulo="Como foi seu teste com o Consi?"
      descricao="Faz 3 dias que você está testando. São uns 6 minutos e ajudam muito o piloto. As respostas são anônimas."
    >
      <View style={styles.botoes}>
        <Botao rotulo="Responder agora" onPress={responder} />
        <Botao rotulo="Lembrar amanhã" estilo="secundario" onPress={depois} />
        <Botao rotulo="Já respondi" estilo="secundario" onPress={jaRespondi} />
      </View>
    </Folha>
  );
}

const styles = StyleSheet.create({
  botoes: { gap: space[12] },
});
