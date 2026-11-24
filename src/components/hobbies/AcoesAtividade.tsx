import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import type { AtividadeMinha } from '@/data/catalogo';
import { useHobbies } from '@/data/hobbiesEstado';
import { pedirNotificacoes } from '@/data/vigia';
import { borderWidth, radius, space, useTema } from '@/theme';

import { Alternancia } from '../Alternancia';
import { Botao } from '../Botao';
import { Filtro } from '../Filtro';
import { Folha, ItemFolha } from '../Folha';
import { Icone } from '../Icone';
import { Texto } from '../Texto';

/** Rotas das telas secundárias dos Hobbies. */
export const irPara = {
  detalhe: (id: string) => router.push({ pathname: '/hobby/detalhe', params: { id } }),
  conversa: (id: string) => router.push({ pathname: '/hobby/conversa', params: { id } }),
  finalizar: (id: string) => router.push({ pathname: '/hobby/finalizar', params: { id } }),
  compartilhar: (id: string) => router.push({ pathname: '/hobby/compartilhar', params: { id } }),
  editar: () => router.push('/hobby/editar'),
  atividades: (hobby: string) => router.push({ pathname: '/hobby/atividades', params: { hobby } }),
  novoHobby: () => router.push('/hobby/novo'),
  /** Criar do zero: "privada" (+ de Suas atividades) ou "comunidade" (Sugerir atividade). */
  criar: (visibilidade: 'privada' | 'comunidade', hobby?: string) =>
    router.push({ pathname: '/hobby/criar', params: { visibilidade, ...(hobby ? { hobby } : {}) } }),
  editarAtividade: (id: string) => router.push({ pathname: '/hobby/criar', params: { id } }),
};

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const HORARIOS = ['08:00', '12:30', '18:00', '20:00', '21:30'];
/** "Toda segunda", "Todo sábado": o rótulo do lembrete semanal. */
const NOMES_DIAS_ROTULO = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const todo = (dia: number) => `${dia === 0 || dia === 6 ? 'Todo' : 'Toda'} ${NOMES_DIAS_ROTULO[dia]}`;

/** Próximos 7 dias: "Hoje", "Amanhã" e depois "Sáb 22". */
function proximosDias() {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(hoje);
    d.setDate(hoje.getDate() + i);
    const rotulo = i === 0 ? 'Hoje' : i === 1 ? 'Amanhã' : `${DIAS_SEMANA[d.getDay()]} ${d.getDate()}`;
    return { rotulo, data: d };
  });
}

/**
 * Menu "•••", confirmação de "Apagar" e "Adicionar à agenda" das atividades — reaproveitados
 * na aba Hobbies, em "Ver tudo" e no detalhe. Devolve as folhas (para renderizar) e as funções.
 */
export function useAcoesAtividade(opcoes?: {
  aoApagar?: (a: AtividadeMinha) => void;
  aoAgendar?: (rotulo: string | null) => void;
}): {
  folhas: ReactNode;
  abrirMenu: (a: AtividadeMinha) => void;
  confirmarApagar: (a: AtividadeMinha) => void;
  abrirAgenda: (a: AtividadeMinha) => void;
} {
  const { cores } = useTema();
  const h = useHobbies();
  const [menu, setMenu] = useState<AtividadeMinha | null>(null);
  const [apagando, setApagando] = useState<AtividadeMinha | null>(null);
  const [agendando, setAgendando] = useState<AtividadeMinha | null>(null);
  // Mantém o conteúdo enquanto a folha anima a saída.
  const [ultimo, setUltimo] = useState<AtividadeMinha | null>(null);
  const [dia, setDia] = useState(1);
  const [hora, setHora] = useState('20:00');
  const [dias] = useState(proximosDias);
  const [semanal, setSemanal] = useState(false);

  const abrirMenu = (a: AtividadeMinha) => {
    setUltimo(a);
    setMenu(a);
  };
  const abrirAgenda = (a: AtividadeMinha) => {
    setUltimo(a);
    setSemanal(!!a.lembrete?.semanal);
    setAgendando(a);
  };
  const depoisDoMenu = (fn: () => void) => {
    setMenu(null);
    // espera a folha descer antes de abrir a próxima tela ou folha
    setTimeout(fn, 220);
  };

  const confirmar = () => {
    if (!apagando) return;
    const a = apagando;
    setApagando(null);
    h.apagar(a.id);
    opcoes?.aoApagar?.(a);
  };

  const agendar = () => {
    if (!agendando) return;
    const [hh, mm] = hora.split(':').map(Number);
    const d = new Date(dias[dia].data);
    d.setHours(hh, mm);
    const rotulo = semanal ? `${todo(d.getDay())} · ${hora}` : `${dias[dia].rotulo} · ${hora}`;
    h.agendar(agendando.id, { quando: d.getTime(), rotulo, semanal });
    void pedirNotificacoes();
    setAgendando(null);
    opcoes?.aoAgendar?.(rotulo);
  };

  const ativo = ultimo?.status === 'andamento';

  const folhas = (
    <>
      <Folha visivel={!!menu} onFechar={() => setMenu(null)} titulo={ultimo?.titulo}>
        <View>
          <ItemFolha
            rotulo="Ver detalhes"
            icone={(cor) => <Icone nome="olho" cor={cor} />}
            onPress={() => ultimo && depoisDoMenu(() => irPara.detalhe(ultimo.id))}
          />
          {ultimo?.permissoes.comentarios ? (
            <ItemFolha
              rotulo="Abrir conversa"
              icone={(cor) => <Icone nome="conversa" cor={cor} />}
              onPress={() => ultimo && depoisDoMenu(() => irPara.conversa(ultimo.id))}
            />
          ) : null}
          {ultimo && h.podeEditar(ultimo) ? (
            <ItemFolha
              rotulo={ultimo.criadaPorMim ? 'Editar' : 'Editar (remix)'}
              icone={(cor) => <Icone nome="lapis" cor={cor} />}
              onPress={() => depoisDoMenu(() => irPara.editarAtividade(ultimo.id))}
            />
          ) : null}
          <ItemFolha
            rotulo="Compartilhar"
            icone={(cor) => <Icone nome="compartilhar" cor={cor} />}
            onPress={() => ultimo && depoisDoMenu(() => irPara.compartilhar(ultimo.id))}
          />
          {ativo ? (
            <ItemFolha
              rotulo={ultimo?.lembrete ? `Na agenda · ${ultimo.lembrete.rotulo}` : 'Adicionar à agenda'}
              icone={(cor) => <Icone nome="calendario" cor={cor} />}
              onPress={() => ultimo && depoisDoMenu(() => abrirAgenda(ultimo))}
            />
          ) : null}
          {ativo ? (
            <ItemFolha
              rotulo="Apagar atividade"
              destrutivo
              icone={(cor) => <Icone nome="lixeira" cor={cor} />}
              onPress={() => ultimo && depoisDoMenu(() => setApagando(ultimo))}
            />
          ) : null}
        </View>
      </Folha>

      <Folha
        visivel={!!apagando}
        onFechar={() => setApagando(null)}
        titulo="Apagar esta atividade?"
        descricao="Ela sai da sua lista, junto com a conversa. Essa ação não pode ser desfeita."
      >
        <View style={styles.botoes}>
          <Botao rotulo="Apagar" estado="erro" onPress={confirmar} />
          <Botao rotulo="Cancelar" estilo="secundario" onPress={() => setApagando(null)} />
        </View>
      </Folha>

      <Folha visivel={!!agendando} onFechar={() => setAgendando(null)} titulo="Adicionar à agenda" descricao={ultimo?.titulo}>
        <View style={styles.agenda}>
          <View style={styles.grupo}>
            <Texto estilo="Legenda/Pequena" cor={cores.text.secondary}>
              DIA
            </Texto>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {dias.map((d, i) => (
                <Filtro key={d.rotulo} rotulo={d.rotulo} ativo={i === dia} onPress={() => setDia(i)} />
              ))}
            </ScrollView>
          </View>
          <View style={styles.grupo}>
            <Texto estilo="Legenda/Pequena" cor={cores.text.secondary}>
              HORÁRIO
            </Texto>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {HORARIOS.map((t) => (
                <Filtro
                  key={t}
                  rotulo={t}
                  ativo={t === hora}
                  onPress={() => setHora(t)}
                  icone={(cor) => <Icone nome="relogio" tamanho={16} cor={cor} />}
                />
              ))}
            </ScrollView>
          </View>
          <View style={styles.linhaRepetir}>
            <View style={styles.flex}>
              <Texto estilo="Texto/Botões e rótulos">Repetir toda semana</Texto>
              <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary}>
                {`${todo(dias[dia].data.getDay())}, no mesmo horário.`}
              </Texto>
            </View>
            <Alternancia ligado={semanal} onMudar={setSemanal} rotulo="Repetir toda semana" />
          </View>
          {/* Sincronização: ainda não configurada (pedido de 18/11/2026, Google Agenda depois). */}
          <View style={[styles.sincronizar, { borderColor: cores.border.subtle }]}>
            <Icone nome="calendario" />
            <View style={styles.flex}>
              <Texto estilo="Texto/Botões e rótulos">Google Agenda</Texto>
              <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary}>
                Em breve: o lembrete vai direto para a sua agenda.
              </Texto>
            </View>
            <View style={styles.desligado} pointerEvents="none">
              <Alternancia ligado={false} onMudar={() => {}} rotulo="Sincronizar com o Google Agenda (em breve)" />
            </View>
          </View>
          <View style={styles.botoes}>
            <Botao rotulo="Adicionar lembrete" corRotulo={cores.text['on-primary']} onPress={agendar} />
            {agendando?.lembrete ? (
              <Botao
                rotulo="Tirar da agenda"
                estilo="secundario"
                onPress={() => {
                  h.agendar(agendando.id, null);
                  setAgendando(null);
                  opcoes?.aoAgendar?.(null);
                }}
              />
            ) : null}
          </View>
        </View>
      </Folha>
    </>
  );

  return { folhas, abrirMenu, confirmarApagar: setApagando, abrirAgenda };
}

const styles = StyleSheet.create({
  botoes: { gap: space[12] },
  agenda: { gap: space[24] },
  grupo: { gap: space[8] },
  chips: { gap: space[8] },
  flex: { flex: 1, minWidth: 0 },
  linhaRepetir: { flexDirection: 'row', alignItems: 'center', gap: space[12] },
  sincronizar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[12],
    padding: space[16],
    borderRadius: radius.card,
    borderWidth: borderWidth.thin,
    borderStyle: 'dashed',
  },
  desligado: { opacity: 0.5 },
});
