import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { TelaAjustes } from '@/components/ajustes';
import { useAviso } from '@/components/Aviso';
import { Botao } from '@/components/Botao';
import { CampoTexto } from '@/components/CampoTexto';
import { Folha } from '@/components/Folha';
import { BalaoEmocao } from '@/components/home/BalaoEmocao';
import { Texto } from '@/components/Texto';
import { emocoes, useNomesEmocoes, type Emocao } from '@/data/emocoes';
import { vibrarSucesso } from '@/data/haptica';
import {
  LIMITE_NOME_EMOCAO,
  limparNome,
  NOMES_PADRAO,
  nomeNoEstilo,
  type NomesEmocoes,
} from '@/data/nomesEmocoes';
import { definirPreferencias } from '@/data/preferencias';
import { space, useTema } from '@/theme';

const gravar = (nomesEmocoes: NomesEmocoes) => definirPreferencias({ nomesEmocoes });

/**
 * Ajustes → Personalizar → Nomes das emoções (Figma: "Nomes das emoções · grade").
 * Tocar numa emoção abre a folha para escrever o nome dela. O nome novo aparece em todo o app e
 * nos widgets. No fim da página, um link volta todos aos nomes padrão.
 */
export default function PaginaNomesEmocoes() {
  const { cores } = useTema();
  const nomes = useNomesEmocoes();
  const [aviso, mostrarAviso] = useAviso({ comBarra: false });
  // A emoção da folha continua montada enquanto a folha desce.
  const [folha, setFolha] = useState<{ emocao: Emocao; visivel: boolean } | null>(null);
  const mudou = nomes.estilo !== 'padrao' || Object.keys(nomes.proprios).length > 0;

  const restaurar = () => {
    const antes = nomes;
    gravar(NOMES_PADRAO);
    mostrarAviso('Nomes padrão de volta', { rotulo: 'Desfazer', onPress: () => gravar(antes) });
  };

  return (
    <TelaAjustes titulo="Nomes das emoções" voltar="Personalizar" aviso={aviso}>
      <View style={styles.conteudo}>
        <Texto estilo="Texto/Pequeno" cor={cores.text.secondary}>
          Toque numa emoção para dar outro nome. O nome novo aparece em todo o app.
        </Texto>

        <View style={styles.grade}>
          {emocoes.map((e) => {
            const trocado = e.nome !== e.nomeOriginal;
            return (
              <Pressable
                key={e.id}
                onPress={() => setFolha({ emocao: e, visivel: true })}
                accessibilityRole="button"
                accessibilityLabel={trocado ? `${e.nome}, era ${e.nomeOriginal}` : e.nome}
                accessibilityHint="Trocar o nome"
                style={({ pressed }) => [styles.celula, pressed && { opacity: 0.7 }]}
              >
                <BalaoEmocao Svg={e.Svg} Textura={e.Textura} circulo={e.circulo} tamanho={64} flutuar={false} />
                <Texto
                  estilo="Texto/Botões e rótulos"
                  cor={trocado ? cores.text.primary : cores.text.secondary}
                  style={styles.centro}
                  numberOfLines={2}
                >
                  {e.nome}
                </Texto>
                {trocado ? (
                  <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary} style={styles.centro} numberOfLines={1}>
                    era {e.nomeOriginal}
                  </Texto>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        {mudou ? (
          <Pressable onPress={restaurar} accessibilityRole="button" hitSlop={8} style={styles.restaurar}>
            <Texto estilo="Texto/Botões e rótulos" cor={cores.text.link} style={styles.centro}>
              Voltar todos aos nomes padrão
            </Texto>
          </Pressable>
        ) : null}
      </View>

      {folha ? (
        <FolhaNome
          key={folha.emocao.id}
          emocao={folha.emocao}
          visivel={folha.visivel}
          nomes={nomes}
          onFechar={() => setFolha({ ...folha, visivel: false })}
          onSalvo={(nome) => {
            setFolha({ ...folha, visivel: false });
            mostrarAviso(`Agora é ${nome}`);
          }}
        />
      ) : null}
    </TelaAjustes>
  );
}

/** Folha de uma emoção: o nome escrito pela pessoa, as sugestões dos estilos e voltar ao nome do estilo. */
function FolhaNome({
  emocao: e,
  visivel,
  nomes,
  onFechar,
  onSalvo,
}: {
  emocao: Emocao;
  visivel: boolean;
  nomes: NomesEmocoes;
  onFechar: () => void;
  onSalvo: (nome: string) => void;
}) {
  const { cores } = useTema();
  const [valor, setValor] = useState(e.nome);
  const doEstilo = nomeNoEstilo(nomes.estilo, e.id, e.nomeOriginal);
  const limpo = limparNome(valor);

  const salvar = () => {
    if (!limpo) return;
    const proprios = { ...nomes.proprios };
    if (limpo === doEstilo) delete proprios[e.id];
    else proprios[e.id] = limpo;
    gravar({ ...nomes, proprios });
    vibrarSucesso();
    onSalvo(limpo);
  };

  const voltar = () => {
    const proprios = { ...nomes.proprios };
    delete proprios[e.id];
    gravar({ ...nomes, proprios });
    onSalvo(doEstilo);
  };

  return (
    <Folha visivel={visivel} onFechar={onFechar}>
      <View style={styles.topoFolha}>
        <BalaoEmocao Svg={e.Svg} Textura={e.Textura} circulo={e.circulo} tamanho={56} flutuar={false} />
        <Texto estilo="Títulos/Médio" style={styles.flex} numberOfLines={2}>
          {e.nome}
        </Texto>
      </View>

      <View style={styles.campo}>
        <CampoTexto
          rotulo="Nome desta emoção"
          value={valor}
          onChangeText={setValor}
          maxLength={LIMITE_NOME_EMOCAO}
          autoCapitalize="sentences"
          autoFocus
          selectTextOnFocus
          returnKeyType="done"
          onSubmitEditing={salvar}
        />
        <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary}>
          {`${valor.length} de ${LIMITE_NOME_EMOCAO} letras`}
        </Texto>
      </View>

      <View style={styles.botoes}>
        <Botao rotulo="Salvar" estado={limpo ? 'normal' : 'desabilitado'} disabled={!limpo} onPress={salvar} />
        {nomes.proprios[e.id] ? <Botao estilo="secundario" rotulo={`Voltar para ${doEstilo}`} onPress={voltar} /> : null}
      </View>
    </Folha>
  );
}

const styles = StyleSheet.create({
  conteudo: { gap: space[24] },
  restaurar: { paddingVertical: space[8] },
  grade: { flexDirection: 'row', flexWrap: 'wrap', rowGap: space[20] },
  celula: { width: '25%', paddingHorizontal: space[2], alignItems: 'center', gap: space[4] },
  centro: { textAlign: 'center' },
  topoFolha: { flexDirection: 'row', alignItems: 'center', gap: space[16] },
  flex: { flex: 1 },
  campo: { gap: space[8] },
  botoes: { gap: space[12] },
});
