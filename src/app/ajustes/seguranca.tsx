import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Botao, Texto } from '@/components';
import { Divisoria, TelaAjustes } from '@/components/ajustes';
import { radius, space, useTema } from '@/theme';

const REPOSITORIO =
  (Constants.expoConfig?.extra as { sobre?: { repositorio?: string } } | undefined)?.sobre?.repositorio ??
  'https://github.com/mvcordeiro/consi-app';

/** O pedido que a pessoa cola na IA dela para conferir o Consi. */
const PEDIDO_PARA_IA = `Analise o código do app Consi, que está aberto em ${REPOSITORIO}.
Quero entender, em linguagem simples, sem jargão:
1. Quais dados saem do meu celular, para onde vão e quem consegue ler.
2. Se o diário, as emoções e os hobbies ficam mesmo só no aparelho e criptografados.
3. Para que serve cada permissão do Android que o app pede.
4. Se há anúncios, rastreadores ou envio escondido de dados.
5. Se as regras do servidor (pasta supabase/migrations) impedem que outras pessoas leiam o que eu mando.
Para cada resposta, mostre o trecho do código que comprova.`;

type Secao = { titulo: string; paragrafos: string[] };

const SECOES: Secao[] = [
  {
    titulo: 'Em poucas palavras',
    paragrafos: [
      'O que você escreve e sente no Consi fica no seu celular. Não existe conta nem senha, não existe anúncio, e ninguém além de você lê o seu diário.',
      'Abaixo está explicado como o app foi feito, o que fica guardado onde, o que sai do celular e como você mesmo pode conferir tudo isso.',
    ],
  },
  {
    titulo: 'Como o Consi foi feito',
    paragrafos: [
      'O Consi é pensado, desenhado e decidido por uma pessoa. O código é escrito com a ajuda do Claude, uma inteligência artificial da Anthropic, e cada mudança é revisada e testada antes de chegar até você.',
      'Usar IA para programar não quer dizer que existe IA dentro do app. O Consi não manda nada do que você escreve, sente ou usa para nenhuma inteligência artificial.',
      'Todo o código é aberto: qualquer pessoa pode ler o que o app faz.',
    ],
  },
  {
    titulo: 'Onde ficam os seus registros',
    paragrafos: [
      'Diário, check-ins de emoção, hobbies, atividades, grupos de apps e preferências ficam guardados dentro do seu celular, num banco de dados criptografado. Criptografado quer dizer embaralhado: sem a chave, o arquivo não pode ser lido.',
      'A chave fica no armazenamento seguro do próprio Android. Outros apps instalados no celular não têm acesso a ela.',
      'Fotos, áudios e vídeos que você anexa ficam na pasta privada do Consi, que o Android isola dos outros apps. Eles não passam pela mesma criptografia do banco de dados.',
      'Se você ligar a trava do Diário, o PIN não fica guardado como foi digitado: fica só uma versão embaralhada, que serve para conferir se o PIN está certo, mas não permite descobrir qual é.',
    ],
  },
  {
    titulo: 'O que sai do celular',
    paragrafos: [
      'Algumas partes do Consi usam a internet. Nenhuma delas pede o seu nome ou e-mail: o app usa um código aleatório no lugar de uma conta.',
      'Sugestões e votos: o texto da ideia e os seus votos. Depois de aprovada, a sugestão fica visível para quem usa o Consi, sem mostrar quem enviou. Não coloque informações pessoais numa sugestão.',
      'Feedback: o que você escreve, o print se você anexar, a versão do app e o modelo do celular. Fica visível só para quem administra o Consi.',
      'Seu @: só o @ que você escolher, para que ninguém mais use o mesmo. A sua foto não sai do celular.',
      'Dados de uso do piloto: durante o teste, o app envia avisos como "abriu o app", "visitou a tela do Diário" ou "registrou um momento", junto com um código aleatório deste celular, a versão do app e o dia. Sobre os momentos, vai só a informação de que havia texto ou não; o texto em si nunca é enviado, nem os nomes dos seus apps ou hobbies. Dá para desligar em Privacidade e dados, e os avisos que ainda não tinham sido enviados são apagados.',
      'Atualizações e relógio: ao abrir, o app verifica se há uma versão nova para baixar. Durante o piloto, também confere a hora no servidor, para contar os dias do teste certo. Nenhuma dessas verificações leva os seus registros.',
      'O servidor tem regras para cada registro guardado: cada pessoa só mexe no que é dela, e o que é privado, como feedback e prints, só quem administra o Consi consegue ler.',
    ],
  },
  {
    titulo: 'O que o Consi nunca faz',
    paragrafos: [
      'Não mostra anúncios. Não vende nem compartilha dados. Não usa serviços de rastreamento de empresas de publicidade ou de análise. Não lê o conteúdo dos outros apps. Não manda o seu diário, as suas emoções, fotos ou áudios para servidor nenhum, nem para uma IA.',
    ],
  },
  {
    titulo: 'Por que o app pede algumas permissões',
    paragrafos: [
      'Acesso de uso: para saber qual app você está abrindo e mostrar a pausa antes dele. Com essa permissão, o Consi sabe quais apps você abre e quando, mas não vê o que tem dentro deles. Essa informação fica no celular.',
      'Sobrepor a outros apps: para a pausa aparecer por cima do app que você abriu.',
      'Notificações: para os lembretes que você escolher e para o aviso de que a pausa está ativa.',
      'Microfone e câmera: só quando você toca para gravar um áudio, tirar uma selfie ou uma foto.',
      'Iniciar com o celular: para os lembretes continuarem marcados depois que o celular reinicia.',
      'Digital ou rosto: só se você ligar essa opção na trava do Diário. Quem confere é o próprio Android; o Consi recebe apenas a resposta de que é você ou não.',
    ],
  },
  {
    titulo: 'Revisão de segurança',
    paragrafos: [
      'Ainda essa semana revisamos o app inteiro em busca de falhas: as bibliotecas que ele usa, o código, as regras do servidor, a criptografia no celular e as permissões do Android. Nenhum problema foi encontrado.',
    ],
  },
  {
    titulo: 'O que ainda pode melhorar',
    paragrafos: [
      'Os widgets da tela inicial mostram as emoções da semana mesmo com o Diário trancado, nunca o que você escreveu. Um PIN curto é mais fraco que o bloqueio do próprio celular, então mantenha o celular com senha. E, se o celular não tiver nenhum bloqueio e você esquecer o PIN, não há como abrir o Diário pelo app.',
    ],
  },
];

/**
 * Ajustes → Privacidade e dados → Como o Consi cuida de você (issue #17). Um relato longo, em
 * linguagem simples, para quem programa ou não: como o app foi feito (com IA), onde ficam os
 * dados, o que sai do celular, as permissões, o que foi testado e o que ainda pode melhorar. Termina
 * convidando a pessoa a pedir para a IA dela conferir o código aberto.
 */
export default function Seguranca() {
  const { cores } = useTema();
  const [copiado, setCopiado] = useState(false);

  return (
    <TelaAjustes titulo="Como o Consi cuida de você" voltar="Privacidade">
      {SECOES.map((s, i) => (
        <View key={s.titulo} style={styles.secao}>
          {i > 0 ? <Divisoria /> : null}
          <Texto estilo="Títulos/Pequeno" accessibilityRole="header">
            {s.titulo}
          </Texto>
          {s.paragrafos.map((p) => (
            <Texto key={p.slice(0, 24)} estilo="Texto/Médio" cor={cores.text.secondary}>
              {p}
            </Texto>
          ))}
        </View>
      ))}

      <Divisoria />
      <View style={styles.secao}>
        <Texto estilo="Títulos/Pequeno" accessibilityRole="header">
          Confira você mesmo
        </Texto>
        <Texto estilo="Texto/Médio" cor={cores.text.secondary}>
          Você não precisa entender de programação para conferir. Copie o pedido abaixo e cole na inteligência artificial que você
          usa (ChatGPT, Claude, Gemini ou outra). Ela lê o código aberto do Consi e responde, em palavras simples, se tudo o que
          está escrito aqui é verdade.
        </Texto>
        <View style={[styles.pedido, { backgroundColor: cores.bg.raised }]}>
          <Texto estilo="Texto/Pequeno" selectable>
            {PEDIDO_PARA_IA}
          </Texto>
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
      </View>
    </TelaAjustes>
  );
}

const styles = StyleSheet.create({
  secao: { gap: space[12] },
  pedido: { padding: space[16], borderRadius: radius.md },
});
