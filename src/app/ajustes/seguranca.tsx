import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Botao, Icone, Texto, type NomeIcone } from '@/components';
import { TelaAjustes } from '@/components/ajustes';
import { borderWidth, radius, space, tipografia, useTema } from '@/theme';

const REPOSITORIO =
  (Constants.expoConfig?.extra as { sobre?: { repositorio?: string } } | undefined)?.sobre?.repositorio ??
  'https://github.com/mvcordeiro/consi-app';

/** As perguntas do pedido, com a palavra-chave em destaque na tela. */
const PERGUNTAS: { chave: string; resto: string }[] = [
  { chave: 'O que sai do celular:', resto: 'quais dados são enviados, para onde vão e quem consegue ler.' },
  { chave: 'O que fica no aparelho:', resto: 'se o diário, as emoções, os hobbies e os anexos ficam só no celular e criptografados.' },
  { chave: 'Permissões:', resto: 'para que serve cada permissão do Android que o app pede.' },
  { chave: 'Anúncios e rastreamento:', resto: 'se há anúncios, rastreadores ou envio escondido de dados.' },
  { chave: 'Servidor:', resto: 'se as regras do servidor (pasta supabase/migrations) impedem que outras pessoas leiam o que eu mando.' },
];

/** O mesmo pedido, em texto puro, para colar na IA. */
const PEDIDO_PARA_IA = [
  `Analise o código do app Consi, que está aberto em ${REPOSITORIO}.`,
  'Quero entender, em linguagem simples, sem jargão:',
  ...PERGUNTAS.map((p, i) => `${i + 1}. ${p.chave} ${p.resto}`),
  'Para cada resposta, mostre o trecho do código que comprova.',
].join('\n');

/**
 * Ajustes → Privacidade e dados → Como o Consi cuida de você (issue #17). Linguagem simples,
 * voz neutra e pequenos componentes visuais: resumo em três cartões, o mapa do que fica no
 * celular e do que sai, a lista de permissões, o que o app nunca faz, a revisão de segurança, o
 * que ainda pode melhorar e, no fim, o pedido pronto para a pessoa colar na IA dela.
 */
export default function Seguranca() {
  const { cores } = useTema();
  const [copiado, setCopiado] = useState(false);

  return (
    <TelaAjustes titulo="Como o Consi cuida de você" voltar="Privacidade">
      {/* Em poucas palavras */}
      <View style={styles.resumo}>
        <CartaoResumo icone="cadeado" titulo="No seu celular" texto="Diário e emoções ficam aqui, criptografados." />
        <CartaoResumo icone="olho" titulo="Só você lê" texto="Sem conta, sem senha, sem anúncio." />
        <CartaoResumo icone="programacao" titulo="Código aberto" texto="Qualquer pessoa pode conferir." />
      </View>

      <Secao icone="lampada" titulo="Como o Consi foi feito">
        <Paragrafo>
          O Consi é pensado, desenhado e decidido por uma pessoa. O código é escrito com a ajuda do{' '}
          <Forte>Claude, uma inteligência artificial da Anthropic</Forte>, e cada mudança é revisada e testada antes de chegar
          até você.
        </Paragrafo>
        <Paragrafo>
          Usar IA para programar não quer dizer que existe IA dentro do app.{' '}
          <Forte>O Consi não manda nada do que você escreve, sente ou usa para nenhuma inteligência artificial.</Forte>
        </Paragrafo>
      </Secao>

      <Secao icone="caderno" titulo="O que fica e o que sai">
        <Paragrafo>Quase tudo fica no celular. Só algumas partes usam a internet, e nenhuma pede o seu nome ou e-mail: o app usa um código aleatório no lugar de uma conta.</Paragrafo>
        <Caixa tom="sucesso" icone="cadeado" titulo="Fica no seu celular, criptografado">
          <Item>Diário, check-ins de emoção e momentos</Item>
          <Item>Fotos, áudios e vídeos anexados</Item>
          <Item>Hobbies, atividades e suas atualizações</Item>
          <Item>Grupos de apps, pausas e preferências</Item>
          <Item>A sua foto de perfil</Item>
        </Caixa>
        <Caixa tom="info" icone="rede-mundial" titulo="Sai do celular, só se você usar">
          <Item rotulo="Sugestões e votos">o texto da ideia e os votos. Depois de aprovada, a sugestão fica visível para quem usa o Consi, sem mostrar quem enviou.</Item>
          <Item rotulo="Feedback">o texto, o print se você anexar, a versão do app e o modelo do celular. Só quem administra o Consi lê.</Item>
          <Item rotulo="Seu @">só o @, para ninguém usar o mesmo.</Item>
          <Item rotulo="Dados de uso do piloto">avisos como “abriu o app” ou “registrou um momento”, com um código aleatório deste celular. Nunca o texto, nem os nomes dos seus apps ou hobbies. Dá para desligar em Privacidade e dados.</Item>
          <Item rotulo="Atualizações">ao abrir, o app confere se há versão nova; no piloto, também a hora do servidor.</Item>
        </Caixa>
        <Paragrafo>
          Criptografado quer dizer embaralhado: sem a chave, os arquivos não podem ser lidos. As chaves ficam no armazenamento
          seguro do próprio Android, onde outros apps não chegam. No servidor, cada pessoa só mexe no que é dela, e o que é
          privado só quem administra o Consi consegue ler.
        </Paragrafo>
      </Secao>

      <Secao icone="excluir" titulo="O que o Consi nunca faz">
        <View style={styles.chips}>
          {['Mostrar anúncios', 'Vender dados', 'Rastrear você', 'Ler outros apps', 'Mandar o diário para uma IA'].map((c) => (
            <View key={c} style={[styles.chip, { backgroundColor: cores.bg['error-subtle'] }]}>
              <Icone nome="excluir" tamanho={14} cor={cores.text.primary} />
              <Texto estilo="Texto/Botões e rótulos">{c}</Texto>
            </View>
          ))}
        </View>
      </Secao>

      <Secao icone="engrenagem" titulo="Por que o app pede permissões">
        <Permissao icone="relogio" nome="Acesso de uso" porque="Para saber qual app você está abrindo e mostrar a pausa antes dele. O Consi sabe quais apps você abre e quando, mas não o que tem dentro deles. Isso fica no celular." />
        <Permissao icone="texto-quadrado" nome="Sobrepor a outros apps" porque="Para a pausa aparecer por cima do app que você abriu." />
        <Permissao icone="calendario" nome="Notificações" porque="Para os lembretes que você escolher e o aviso de que a pausa está ativa." />
        <Permissao icone="microfone" nome="Microfone e câmera" porque="Só quando você toca para gravar um áudio ou tirar uma foto." />
        <Permissao icone="sincronizar-setas" nome="Iniciar com o celular" porque="Para os lembretes continuarem marcados depois de reiniciar." />
        <Permissao icone="cadeado" nome="Digital ou rosto" porque="Só se você ligar na trava do Diário. Quem confere é o Android; o Consi só recebe se é você ou não." />
      </Secao>

      <Secao icone="selo" titulo="Revisão de segurança">
        <View style={[styles.selo, { backgroundColor: cores.bg['success-subtle'] }]}>
          <Icone nome="selo" cor={cores.text.primary} />
          <Texto estilo="Texto/Botões e rótulos" style={styles.flex}>
            Nenhum problema encontrado
          </Texto>
        </View>
        <Paragrafo>
          Ainda essa semana revisamos o app inteiro em busca de falhas: as bibliotecas que ele usa, o código, as regras do
          servidor, a criptografia no celular e as permissões do Android.
        </Paragrafo>
      </Secao>

      <Secao icone="lampada" titulo="O que ainda pode melhorar">
        <View style={[styles.nota, { borderColor: cores.border.subtle }]}>
          <Item>Os widgets da tela inicial mostram as emoções da semana mesmo com o Diário trancado, nunca o que você escreveu.</Item>
          <Item>Um PIN curto é mais fraco que o bloqueio do celular: mantenha o celular com senha.</Item>
          <Item>Sem nenhum bloqueio no celular, um PIN esquecido não tem como ser recuperado pelo app.</Item>
        </View>
      </Secao>

      {/* Confira você mesmo */}
      <Secao icone="area-transferencia" titulo="Confira você mesmo">
        <Paragrafo>
          Não precisa entender de programação. Copie o pedido abaixo e cole na inteligência artificial que você usa (ChatGPT,
          Claude, Gemini ou outra). Ela lê o código aberto do Consi e responde, em palavras simples, se tudo o que está aqui é
          verdade.
        </Paragrafo>
        <View style={[styles.pedido, { backgroundColor: cores.bg.raised, borderColor: cores.border.subtle }]}>
          <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary}>
            PEDIDO PARA A SUA IA
          </Texto>
          <Texto estilo="Texto/Médio">
            Analise o código do app Consi, que está aberto em <Forte>{REPOSITORIO.replace('https://', '')}</Forte>.
          </Texto>
          <Texto estilo="Texto/Médio">Quero entender, em linguagem simples, sem jargão:</Texto>
          <View style={styles.perguntas}>
            {PERGUNTAS.map((p, i) => (
              <View key={p.chave} style={styles.pergunta}>
                <View style={[styles.numero, { backgroundColor: cores.bg.base }]}>
                  <Texto estilo="Legenda/Pequena">{String(i + 1)}</Texto>
                </View>
                <Texto estilo="Texto/Médio" style={styles.flex}>
                  <Forte>{p.chave}</Forte> {p.resto}
                </Texto>
              </View>
            ))}
          </View>
          <Texto estilo="Texto/Médio">Para cada resposta, mostre o trecho do código que comprova.</Texto>
        </View>
        <Botao
          rotulo={copiado ? 'Pedido copiado' : 'Copiar pedido para a sua IA'}
          estado={copiado ? 'sucesso' : 'normal'}
          onPress={async () => {
            await Clipboard.setStringAsync(PEDIDO_PARA_IA);
            setCopiado(true);
          }}
        />
        <Botao rotulo="Ver o código do Consi" estilo="secundario" onPress={() => void Linking.openURL(REPOSITORIO)} />
      </Secao>
    </TelaAjustes>
  );
}

function Secao({ icone, titulo, children }: { icone: NomeIcone; titulo: string; children: ReactNode }) {
  const { cores } = useTema();
  return (
    <View style={styles.secao}>
      <View style={styles.cabecalho}>
        <View style={[styles.iconeSecao, { backgroundColor: cores.bg.raised }]}>
          <Icone nome={icone} tamanho={18} cor={cores.text.primary} />
        </View>
        <Texto estilo="Títulos/Pequeno" accessibilityRole="header" style={styles.flex}>
          {titulo}
        </Texto>
      </View>
      {children}
    </View>
  );
}

function CartaoResumo({ icone, titulo, texto }: { icone: NomeIcone; titulo: string; texto: string }) {
  const { cores } = useTema();
  return (
    <View style={[styles.cartaoResumo, { backgroundColor: cores.bg.raised }]}>
      <View style={[styles.iconeSecao, { backgroundColor: cores.bg.base }]}>
        <Icone nome={icone} tamanho={18} cor={cores.text.primary} />
      </View>
      <View style={styles.flex}>
        <Texto estilo="Texto/Botões e rótulos">{titulo}</Texto>
        <Texto estilo="Texto/Pequeno" cor={cores.text.secondary}>
          {texto}
        </Texto>
      </View>
    </View>
  );
}

function Caixa({ tom, icone, titulo, children }: { tom: 'sucesso' | 'info'; icone: NomeIcone; titulo: string; children: ReactNode }) {
  const { cores } = useTema();
  return (
    <View style={[styles.caixa, { backgroundColor: tom === 'sucesso' ? cores.bg['success-subtle'] : cores.bg['info-subtle'] }]}>
      <View style={styles.cabecalho}>
        <Icone nome={icone} tamanho={18} cor={cores.text.primary} />
        <Texto estilo="Texto/Botões e rótulos" style={styles.flex}>
          {titulo}
        </Texto>
      </View>
      <View style={styles.itens}>{children}</View>
    </View>
  );
}

function Item({ rotulo, children }: { rotulo?: string; children: ReactNode }) {
  const { cores } = useTema();
  return (
    <View style={styles.item}>
      <View style={[styles.marcador, { backgroundColor: cores.text.secondary }]} />
      <Texto estilo="Texto/Pequeno" style={styles.flex}>
        {rotulo ? <Forte>{`${rotulo}: `}</Forte> : null}
        {children}
      </Texto>
    </View>
  );
}

function Permissao({ icone, nome, porque }: { icone: NomeIcone; nome: string; porque: string }) {
  const { cores } = useTema();
  return (
    <View style={[styles.permissao, { borderColor: cores.border.subtle }]}>
      <Icone nome={icone} tamanho={20} cor={cores.text.primary} />
      <View style={styles.flex}>
        <Texto estilo="Texto/Botões e rótulos">{nome}</Texto>
        <Texto estilo="Texto/Pequeno" cor={cores.text.secondary}>
          {porque}
        </Texto>
      </View>
    </View>
  );
}

function Paragrafo({ children }: { children: ReactNode }) {
  const { cores } = useTema();
  return (
    <Texto estilo="Texto/Médio" cor={cores.text.secondary}>
      {children}
    </Texto>
  );
}

function Forte({ children }: { children: ReactNode }) {
  const { cores } = useTema();
  // Herda o tamanho do texto em volta; só troca para a fonte de peso médio dos rótulos.
  return <Text style={[styles.forte, { color: cores.text.primary }]}>{children}</Text>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  resumo: { gap: space[8] },
  cartaoResumo: { flexDirection: 'row', alignItems: 'center', gap: space[12], padding: space[12], borderRadius: radius.md },
  forte: { fontFamily: tipografia['Texto/Botões e rótulos'].fontFamily },
  secao: { gap: space[12], paddingTop: space[16] },
  cabecalho: { flexDirection: 'row', alignItems: 'center', gap: space[12] },
  iconeSecao: { width: 32, height: 32, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  caixa: { gap: space[12], padding: space[16], borderRadius: radius.md },
  itens: { gap: space[8] },
  item: { flexDirection: 'row', gap: space[8], alignItems: 'flex-start' },
  marcador: { width: 5, height: 5, borderRadius: radius.full, marginTop: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[8] },
  chip: { flexDirection: 'row', alignItems: 'center', gap: space[4], paddingHorizontal: space[12], paddingVertical: space[8], borderRadius: radius.full },
  permissao: { flexDirection: 'row', gap: space[12], paddingVertical: space[12], borderBottomWidth: borderWidth.thin },
  selo: { flexDirection: 'row', alignItems: 'center', gap: space[12], padding: space[12], borderRadius: radius.md },
  nota: { gap: space[8], padding: space[16], borderRadius: radius.md, borderWidth: borderWidth.thin, borderStyle: 'dashed' },
  pedido: { gap: space[12], padding: space[16], borderRadius: radius.md, borderWidth: borderWidth.thin },
  perguntas: { gap: space[12] },
  pergunta: { flexDirection: 'row', gap: space[12], alignItems: 'flex-start' },
  numero: { width: 22, height: 22, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
});
