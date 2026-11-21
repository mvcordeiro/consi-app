import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { HobbyInfo } from '@/data/catalogo';
import { criarHobby, hobbyComNome, ICONES_HOBBY_NOVO } from '@/data/hobbiesPersonalizados';
import { borderWidth, radius, space, useTema } from '@/theme';

import { Botao } from '../Botao';
import { CampoTexto } from '../CampoTexto';
import { Folha } from '../Folha';
import { Icone, type NomeIcone } from '../Icone';
import { Texto } from '../Texto';

/**
 * Busca de hobbies com o "+" ao lado, para criar um que não está no catálogo. Quando a busca
 * não acha nada, sugere criar o hobby com o nome buscado. Criar abre uma folha com o nome e
 * um ícone; o hobby novo entra no canvas ("Criados por você") e já vem escolhido.
 * Sem design no Figma.
 */
export function BuscaHobbies({
  consulta,
  onConsulta,
  semResultado,
  onCriado,
}: {
  consulta: string;
  onConsulta: (t: string) => void;
  /** A busca não achou nenhum hobby. */
  semResultado: boolean;
  onCriado: (h: HobbyInfo) => void;
}) {
  const { cores } = useTema();
  const [criando, setCriando] = useState<string | null>(null);
  const termo = consulta.trim();

  return (
    <View style={styles.coluna}>
      <View style={styles.linha}>
        <View style={styles.flex}>
          <CampoTexto
            acessibilidade="Buscar hobby"
            placeholder="Buscar: fotografia, xadrez, dança…"
            value={consulta}
            onChangeText={onConsulta}
            returnKeyType="search"
            autoCorrect={false}
          />
        </View>
        <Pressable
          onPress={() => setCriando(termo)}
          accessibilityRole="button"
          accessibilityLabel="Criar um hobby"
          hitSlop={6}
          style={({ pressed }) => [
            styles.mais,
            { borderColor: cores.border.focus, backgroundColor: pressed ? cores.bg.raised : 'transparent' },
          ]}
        >
          <Icone nome="adicionar" tamanho={22} cor={cores.icon.primary} />
        </Pressable>
      </View>
      {semResultado && termo ? (
        <View style={styles.vazio}>
          <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary} style={styles.centro}>
            Nenhum hobby com esse nome ainda.
          </Texto>
          <Botao
            rotulo={`Criar “${termo}”`}
            estilo="secundario"
            icone={(c) => <Icone nome="adicionar" tamanho={18} cor={c} />}
            onPress={() => setCriando(termo)}
          />
        </View>
      ) : null}

      <FolhaCriarHobby
        nomeInicial={criando}
        onFechar={() => setCriando(null)}
        onCriar={(nome, icone) => {
          const h = criarHobby(nome, icone);
          setCriando(null);
          onConsulta('');
          onCriado(h);
        }}
      />
    </View>
  );
}

function FolhaCriarHobby({
  nomeInicial,
  onFechar,
  onCriar,
}: {
  /** null = fechada. */
  nomeInicial: string | null;
  onFechar: () => void;
  onCriar: (nome: string, icone: NomeIcone) => void;
}) {
  const { cores } = useTema();
  const [nome, setNome] = useState('');
  const [icone, setIcone] = useState<NomeIcone>('lampada');
  const [aberta, setAberta] = useState<string | null>(null);
  if (nomeInicial !== aberta) {
    setAberta(nomeInicial);
    if (nomeInicial !== null) {
      setNome(nomeInicial);
      setIcone('lampada');
    }
  }
  const jaExiste = nome.trim() ? hobbyComNome(nome) : undefined;

  return (
    <Folha
      visivel={nomeInicial !== null}
      onFechar={onFechar}
      titulo="Novo hobby"
      descricao="Algo que você gosta de fazer e não está na lista."
    >
      <CampoTexto rotulo="Nome" placeholder="Ex.: Crochê, Surfe, Origami" value={nome} onChangeText={setNome} maxLength={32} />
      {jaExiste ? (
        <Texto estilo="Legenda/Pequena" cor={cores.text.secondary}>
          “{jaExiste.nome}” já existe: ele vai ser escolhido.
        </Texto>
      ) : null}
      <Texto estilo="Legenda/Pequena" cor={cores.text.secondary}>
        Ícone
      </Texto>
      <View style={styles.icones}>
        {ICONES_HOBBY_NOVO.map((i) => {
          const ativo = i === icone;
          return (
            <Pressable
              key={i}
              onPress={() => setIcone(i)}
              accessibilityRole="button"
              accessibilityState={{ selected: ativo }}
              accessibilityLabel={i.replace(/-/g, ' ')}
              style={[styles.icone, { backgroundColor: ativo ? cores.action.primary.default : cores.bg.base }]}
            >
              <Icone nome={i} tamanho={22} cor={ativo ? cores.text['on-primary'] : undefined} />
            </Pressable>
          );
        })}
      </View>
      <Botao
        rotulo={jaExiste ? `Escolher ${jaExiste.nome}` : 'Criar hobby'}
        estado={nome.trim() ? 'normal' : 'desabilitado'}
        disabled={!nome.trim()}
        onPress={() => onCriar(nome, icone)}
      />
    </Folha>
  );
}

const styles = StyleSheet.create({
  coluna: { gap: space[8] },
  linha: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  flex: { flex: 1 },
  mais: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    borderWidth: borderWidth.thin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vazio: { gap: space[8] },
  centro: { textAlign: 'center' },
  icones: { flexDirection: 'row', flexWrap: 'wrap', gap: space[8], justifyContent: 'center' },
  icone: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
