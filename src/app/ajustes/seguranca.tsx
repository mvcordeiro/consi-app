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
      'O que você escreve e sente no Consi fica no seu celular, trancado. Não existe conta, não existe senha nossa, não existe anúncio e ninguém lê o seu diário: nem nós.',
      'Abaixo explicamos como o app foi feito, o que fica onde, o que sai do celular (e só quando você usa algo que precisa de internet) e como você mesmo pode conferir tudo isso.',
    ],
  },
  {
    titulo: 'Como o Consi foi feito',
    paragrafos: [
      'O Consi é pensado, desenhado e decidido por uma pessoa. Para escrever o código, ela trabalha com a ajuda do Claude, uma inteligência artificial da Anthropic. Funciona como uma dupla: a pessoa diz o que o app deve fazer e por quê, a IA escreve, e cada mudança é revisada e testada antes de chegar até você.',
      'Usar IA para programar não quer dizer que existe IA dentro do app. O Consi não manda nada do que você escreve, sente ou usa para nenhuma inteligência artificial.',
      'Todo o código é aberto. Qualquer pessoa pode ler, linha por linha, o que o app faz. É como uma cozinha com parede de vidro: você não precisa confiar na nossa palavra, dá para olhar.',
    ],
  },
  {
    titulo: 'Onde ficam os seus registros',
    paragrafos: [
      'Diário, check-ins de emoção, hobbies, atividades, grupos de apps e preferências ficam guardados dentro do seu celular, num banco de dados criptografado. Criptografado quer dizer embaralhado: sem a chave, o arquivo é só um monte de letras sem sentido.',
      'A chave fica no cofre do próprio Android, o mesmo lugar onde o sistema guarda as chaves de banco e de senhas. Outro app instalado no celular não consegue pegar essa chave.',
      'Se você ligar a trava do Diário, o PIN também não fica guardado como você digitou: guardamos só uma "impressão digital" dele, que serve para conferir se o PIN está certo, mas não deixa descobrir qual é.',
      'Fotos, áudios e vídeos que você anexa ficam na pasta do próprio Consi, que outros apps não acessam.',
    ],
  },
  {
    titulo: 'O que sai do celular, e só se você usar',
    paragrafos: [
      'Algumas partes do Consi precisam de internet. Elas falam com um servidor nosso, sem o seu nome e sem login: o app cria uma identidade anônima, só um código aleatório.',
      'Sugestões e votos: o texto da ideia que você envia e os seus votos. Outras pessoas veem a sugestão sem saber que foi você.',
      'Feedback: o que você escreve, o print se você anexar, a versão do app e o modelo do celular. Só a equipe lê.',
      'Seu @: só o @ que você escolher, para ninguém mais usar o mesmo. A sua foto não sai do celular.',
      'Dados de uso do piloto: durante o teste, avisos como "fez uma pausa" ou "abriu o Diário", ligados a um código aleatório. Nunca o que você escreve, nunca o nome dos seus apps ou hobbies. Dá para desligar aqui mesmo, em Privacidade e dados.',
      'O servidor tem regras que valem para cada linha guardada: cada pessoa só mexe no que é dela, e o que é privado (feedback, prints) só a equipe consegue ler.',
    ],
  },
  {
    titulo: 'O que o Consi nunca faz',
    paragrafos: [
      'Não mostra anúncios. Não vende nem compartilha dados com ninguém. Não tem rastreadores de empresas de publicidade. Não lê o conteúdo dos outros apps. Não manda o seu diário para servidor nenhum, nem para uma IA.',
    ],
  },
  {
    titulo: 'Por que o app pede algumas permissões',
    paragrafos: [
      'Acesso de uso: para saber qual app você está abrindo e mostrar a pausa antes dele. O Consi vê só o nome do app, nunca o que tem dentro.',
      'Sobrepor a outros apps: para a pausa aparecer por cima do app que você abriu.',
      'Notificações: para os lembretes que você escolher (pausa, Diário, atividades).',
      'Microfone e câmera: só quando você toca para gravar um áudio, tirar uma selfie ou uma foto.',
      'Iniciar com o celular: para os seus lembretes continuarem marcados depois que o celular reinicia.',
      'Digital ou rosto: só se você ligar essa opção na trava do Diário. Quem confere é o próprio Android; o Consi recebe apenas um "é você" ou "não é".',
    ],
  },
  {
    titulo: 'O que testamos',
    paragrafos: [
      'Em novembro de 2026 revisamos o app inteiro procurando falhas: as bibliotecas que o app usa, se havia alguma chave secreta esquecida no código, as regras do servidor, a criptografia no celular e cada permissão do Android.',
      'Encontramos três pontos ligados à trava do Diário e corrigimos todos: exportar os dados com o Diário trancado, apagar tudo sem apagar o PIN e trocar a trava sem provar que era você. Hoje, com o Diário trancado, essas três coisas pedem o bloqueio do celular.',
      'Essa revisão foi feita com ajuda de IA e conferida por gente. Ainda não houve uma auditoria de uma empresa independente; quando houver, ela aparece aqui.',
    ],
  },
  {
    titulo: 'O que ainda pode melhorar',
    paragrafos: [
      'Preferimos contar: os widgets da tela inicial mostram as emoções da semana mesmo com o Diário trancado (nunca o que você escreveu). Um PIN de 4 números protege bem no dia a dia, mas é mais fraco que o bloqueio do próprio celular, então mantenha o seu celular com senha. E, se o celular não tiver nenhum bloqueio e você esquecer o PIN, não há como abrir o Diário pelo app.',
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
