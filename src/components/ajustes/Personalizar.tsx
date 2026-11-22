import { StyleSheet, View } from 'react-native';

import { temIconePorEmocao } from '@/data/iconeEmocao';
import {
  alternarSecao,
  definirPreferencias,
  moverSecao,
  NOMES_SECOES,
  usePreferencias,
  type AbaInicial,
  type Aparencia,
  type Movimento,
  type TamanhoTexto,
} from '@/data/preferencias';
import { space, useTema } from '@/theme';

import { Alternancia } from '../Alternancia';
import { Filtro } from '../Filtro';
import { Texto } from '../Texto';
import { Ajuste, Divisoria } from './Cartao';
import { ListaArrastavel } from './ListaArrastavel';

function Opcoes<T extends string>({ lista, atual, onEscolher }: { lista: [T, string][]; atual: T; onEscolher: (v: T) => void }) {
  return (
    <View style={styles.opcoes} accessibilityRole="radiogroup">
      {lista.map(([v, rotulo]) => (
        <Filtro key={v} rotulo={rotulo} ativo={atual === v} onPress={() => onEscolher(v)} />
      ))}
    </View>
  );
}

/**
 * Ajustes → Personalizar: aparência, texto maior, reduzir movimento, vibração e a aba em que o
 * app abre. Tudo fica só neste celular (src/data/preferencias.ts) e vale na hora.
 */
export function Personalizar() {
  const prefs = usePreferencias();
  return (
    <View>
      <Ajuste titulo="Aparência">
        <Opcoes<Aparencia>
          lista={[
            ['sistema', 'Do celular'],
            ['light', 'Claro'],
            ['dark', 'Escuro'],
          ]}
          atual={prefs.aparencia}
          onEscolher={(aparencia) => definirPreferencias({ aparencia })}
        />
      </Ajuste>

      <Divisoria />

      <Ajuste titulo="Tamanho do texto" descricao="Soma com o tamanho de fonte escolhido no celular.">
        <Opcoes<TamanhoTexto>
          lista={[
            ['normal', 'Padrão'],
            ['grande', 'Maior'],
          ]}
          atual={prefs.tamanhoTexto}
          onEscolher={(tamanhoTexto) => definirPreferencias({ tamanhoTexto })}
        />
      </Ajuste>

      <Divisoria />

      <Ajuste titulo="Reduzir movimento" descricao="Balões parados e transições mais curtas.">
        <Opcoes<Movimento>
          lista={[
            ['sistema', 'Do celular'],
            ['reduzido', 'Ligado'],
            ['normal', 'Desligado'],
          ]}
          atual={prefs.movimento}
          onEscolher={(movimento) => definirPreferencias({ movimento })}
        />
      </Ajuste>

      <Divisoria />

      <Ajuste
        titulo="Vibração"
        descricao="Toques leves ao arrastar, revelar drops e confirmar."
        acessorio={
          <Alternancia rotulo="Vibração" ligado={prefs.vibracao} onMudar={(vibracao) => definirPreferencias({ vibracao })} />
        }
      />

      <Divisoria />

      {temIconePorEmocao ? (
        <>
          <Ajuste
            titulo="Ícone com a sua emoção"
            descricao="O ícone do Consi muda para a última emoção que você registrar, alguns minutos depois, com o app fechado. Atenção: quem vir a tela do seu celular vai ver como você se sente."
            acessorio={
              <Alternancia
                rotulo="Ícone com a sua emoção"
                ligado={prefs.iconePorEmocao}
                onMudar={(iconePorEmocao) => definirPreferencias({ iconePorEmocao })}
              />
            }
          />

          <Divisoria />
        </>
      ) : null}

      <Ajuste titulo="Abrir o app em">
        <Opcoes<AbaInicial>
          lista={[
            ['index', 'Início'],
            ['hobbies', 'Hobbies'],
            ['diario', 'Diário'],
          ]}
          atual={prefs.abaInicial}
          onEscolher={(abaInicial) => definirPreferencias({ abaInicial })}
        />
      </Ajuste>
    </View>
  );
}

const ALTURA_LINHA = 56;

/** Ajustes → Seções do Início: mostrar/esconder e arrastar para mudar a ordem. */
export function SecoesInicio({ onArrastando }: { onArrastando: (a: boolean) => void }) {
  const { cores } = useTema();
  const { secoesHome } = usePreferencias();
  const visiveis = secoesHome.filter((s) => s.visivel).length;
  return (
    <View>
      <Ajuste
        titulo="Seções do Início"
        descricao={`Escolha o que aparece abaixo das emoções. Arraste para mudar a ordem. ${visiveis} de ${secoesHome.length} visíveis.`}
      />
      <ListaArrastavel
        itens={secoesHome}
        chave={(s) => s.id}
        altura={ALTURA_LINHA}
        rotuloAlca={(s) => `Reordenar ${NOMES_SECOES[s.id]}`}
        onMover={(s, para) => moverSecao(s.id, para)}
        onArrastando={onArrastando}
        renderizar={(s) => (
          <>
            <View style={styles.flex}>
              <Texto estilo="Texto/Botões e rótulos" cor={s.visivel ? cores.text.primary : cores.text.tertiary}>
                {NOMES_SECOES[s.id]}
              </Texto>
              {!s.visivel ? (
                <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary}>
                  Escondida
                </Texto>
              ) : null}
            </View>
            <Alternancia rotulo={`Mostrar ${NOMES_SECOES[s.id]}`} ligado={s.visivel} onMudar={() => alternarSecao(s.id)} />
          </>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  opcoes: { flexDirection: 'row', flexWrap: 'wrap', gap: space[8] },
  flex: { flex: 1 },
});
