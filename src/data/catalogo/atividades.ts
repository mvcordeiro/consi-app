/**
 * Atividades do catálogo (sugestões de "Para você") e as atividades iniciais da pessoa.
 * O conteúdo é uma lista de blocos (estilo Notion): cada atividade tem a estrutura que faz
 * sentido para ela — umas têm passo a passo, outras só um texto, uma citação ou uma lista.
 * Só "Explore um novo gênero musical…" está no Figma; o resto é conteúdo provisório.
 */
import { fotoPerfil } from '@/components/home/assets';

import type { Atividade, AtividadeMinha, Autor, Bloco, Permissoes, TipoBloco } from './tipos';

// ─── Ajudantes para escrever blocos ─────────────────────────────────────────
let seq = 0;
const bloco = (tipo: TipoBloco, texto?: string, extra?: Partial<Bloco>): Bloco => ({
  id: `b${++seq}`,
  tipo,
  texto,
  ...extra,
});
const b = {
  h1: (t: string) => bloco('h1', t),
  h2: (t: string) => bloco('h2', t),
  h3: (t: string) => bloco('h3', t),
  texto: (t: string) => bloco('texto', t),
  citacao: (t: string) => bloco('citacao', t),
  dica: (t: string) => bloco('dica', t),
  divisor: () => bloco('divisor'),
  lista: (...itens: string[]) => itens.map((t) => bloco('lista', t)),
  numerada: (...itens: string[]) => itens.map((t) => bloco('numerada', t)),
  tarefas: (...itens: string[]) => itens.map((t) => bloco('tarefa', t, { feito: false })),
};
/** Achata listas de blocos (b.lista devolve vários). */
const conteudo = (...partes: (Bloco | Bloco[])[]): Bloco[] => partes.flat();

/** Gera um id novo de bloco (usado pelo editor). */
export function novoIdBloco() {
  return `b${Date.now().toString(36)}${(++seq).toString(36)}`;
}

const joana: Autor = { id: 'u-joana', usuario: '@joanadasilva', iniciais: 'JS', foto: fotoPerfil };
const a = (usuario: string, iniciais: string): Autor => ({ id: `u-${usuario.slice(1)}`, usuario, iniciais });
const aberta: Permissoes = { comentarios: true, remix: true, mostrarAutor: true };
const semRemix: Permissoes = { comentarios: true, remix: false, mostrarAutor: true };

// ─── Para você ──────────────────────────────────────────────────────────────
export const atividadesCatalogo: Atividade[] = [
  // Música
  {
    id: 's-genero-musical',
    hobby: 'musica',
    autor: joana,
    quando: '3d atrás',
    titulo: 'Explore um novo gênero musical e monte uma playlist',
    resumo: 'Que tal explorar o que nunca ouviu e transformar isso em playlist?',
    conteudo: conteudo(
      b.texto(
        'Que tal explorar o que nunca ouviu e transformar isso em playlist? Escolher um gênero diferente de propósito tira você do piloto automático e transforma o tempo de tela em descoberta.',
      ),
      b.h2('Como fazer'),
      b.numerada(
        'Escolha um gênero que você nunca ouviu de propósito: jazz etíope, city pop, forró pé de serra…',
        'Ouça um álbum inteiro do começo ao fim, sem pular faixas.',
        'Separe as cinco músicas que mais chamaram sua atenção.',
        'Monte a playlist e dê a ela um nome que lembre esse momento.',
      ),
      b.dica('Peça uma indicação para alguém mais velho da família. Costuma render ótimas surpresas.'),
    ),
    minutos: 40,
    permissoes: aberta,
    totalComentarios: 51,
  },
  {
    id: 's-tocar-de-ouvido',
    hobby: 'musica',
    autor: a('@rafa.toca', 'RT'),
    quando: '1d atrás',
    titulo: 'Tente tocar uma música de ouvido, nem que seja só o refrão',
    resumo: 'Com um instrumento ou só a voz, procure as notas.',
    conteudo: conteudo(
      b.texto('Pegue um instrumento, ou só a voz, e procure as notas sem cifra.'),
      b.citacao('Errar faz parte: o objetivo é prestar atenção no som, não acertar de primeira.'),
      b.texto('Quando achar o refrão, grave um áudio. Daqui a um mês, ouça de novo e repare no quanto você evoluiu.'),
    ),
    minutos: 25,
    permissoes: aberta,
    totalComentarios: 18,
  },
  {
    id: 's-disco-inteiro',
    hobby: 'musica',
    autor: a('@lu.martins', 'LM'),
    quando: '5h atrás',
    titulo: 'Ouça um disco inteiro sem fazer mais nada ao mesmo tempo',
    resumo: 'Feche os olhos e deixe o álbum tocar na ordem certa.',
    conteudo: conteudo(
      b.texto(
        'Deite, feche os olhos e deixe o álbum tocar na ordem que o artista pensou. Sem celular na mão, sem tarefas em paralelo: só você e a música.',
      ),
      b.h3('Antes de dar o play'),
      b.tarefas('Escolher o álbum', 'Deixar o celular em outro cômodo', 'Achar um lugar confortável'),
      b.h3('Depois'),
      b.texto('Anote numa frase como você se sentiu.'),
    ),
    minutos: 45,
    permissoes: semRemix,
    totalComentarios: 33,
  },
  // Cinema
  {
    id: 's-filme-outro-pais',
    hobby: 'cinema',
    autor: a('@cine.ana', 'CA'),
    quando: '2d atrás',
    titulo: 'Assista a um filme de um país que você nunca visitou',
    resumo: 'Escolha um lugar no mapa e veja como se conta histórias lá.',
    conteudo: conteudo(
      b.texto(
        'Um filme de outro país muda o ritmo, as cores e até o jeito de olhar o seu dia. Sorteie um lugar no mapa e procure um filme premiado de lá.',
      ),
      b.h2('Algumas ideias para começar'),
      b.lista('Irã: Abbas Kiarostami', 'Coreia do Sul: Lee Chang-dong', 'Senegal: Ousmane Sembène', 'Argentina: Lucrecia Martel'),
      b.dica('Assista com legenda e sem o celular por perto. Depois, anote uma cena que você quer lembrar.'),
    ),
    minutos: 120,
    permissoes: aberta,
    totalComentarios: 27,
  },
  {
    id: 's-filme-infancia',
    hobby: 'cinema',
    autor: a('@pedroh', 'PH'),
    quando: '4d atrás',
    titulo: 'Reveja um filme da sua infância e repare no que mudou',
    resumo: 'O filme é o mesmo, mas quem assiste mudou.',
    conteudo: conteudo(
      b.citacao('O filme é o mesmo, mas quem assiste não é mais.'),
      b.texto(
        'Rever uma história antiga é um jeito gostoso de perceber o quanto você mudou. De preferência, assista com alguém que também via esse filme com você.',
      ),
    ),
    minutos: 100,
    permissoes: aberta,
    totalComentarios: 40,
  },
  {
    id: 's-sessao-curtas',
    hobby: 'cinema',
    autor: a('@marinafilma', 'MF'),
    quando: '6h atrás',
    titulo: 'Faça uma sessão de curtas-metragens com alguém',
    resumo: 'Três curtas, pipoca e uma conversa no fim.',
    conteudo: conteudo(
      b.texto('Curtas cabem numa noite de semana e rendem boas conversas.'),
      b.h2('Como fazer'),
      b.numerada('Convide alguém para a sessão.', 'Escolham juntos três curtas de até 20 minutos.', 'Depois de cada um, digam em uma palavra o que sentiram.'),
    ),
    minutos: 60,
    permissoes: aberta,
    totalComentarios: 9,
  },
  // Leitura
  {
    id: 's-ler-fora',
    hobby: 'leitura',
    autor: a('@livrosdaju', 'LJ'),
    quando: '1d atrás',
    titulo: 'Leia 20 páginas num lugar diferente da sua casa',
    resumo: 'Uma praça, um café ou o ônibus: mude o cenário.',
    conteudo: conteudo(
      b.texto('Lugares novos ajudam a manter a atenção na página. Uma praça, um café, o banco do ônibus: vale tudo, menos o sofá de sempre.'),
      b.dica('Coloque o celular no modo silencioso antes de abrir o livro.'),
    ),
    minutos: 30,
    permissoes: aberta,
    totalComentarios: 22,
  },
  {
    id: 's-livro-abandonado',
    hobby: 'leitura',
    autor: a('@caio.le', 'CL'),
    quando: '3d atrás',
    titulo: 'Volte para um livro que você abandonou na metade',
    resumo: 'Às vezes o problema não era o livro, era o momento.',
    conteudo: conteudo(
      b.texto('Às vezes o livro não era o problema, era o momento. Dê uma nova chance e, se ainda não fizer sentido, tudo bem deixá-lo de lado de vez.'),
      b.h3('Combinado com você'),
      b.lista('Releia o último capítulo que terminou.', 'Leia 15 minutos antes de decidir.', 'Se continuar, um capítulo por dia.'),
    ),
    minutos: 15,
    permissoes: aberta,
    totalComentarios: 15,
  },
  {
    id: 's-troca-livro',
    hobby: 'leitura',
    autor: joana,
    quando: '5d atrás',
    titulo: 'Troque um livro com um amigo e conversem sobre ele',
    resumo: 'Empreste o seu preferido e receba o de alguém.',
    conteudo: conteudo(
      b.texto('Ler o livro de quem a gente gosta é outra forma de se aproximar. Você empresta o seu preferido, recebe o preferido de alguém e combinam um café para conversar.'),
    ),
    minutos: 30,
    permissoes: aberta,
    totalComentarios: 31,
  },
  // Escrita
  {
    id: 's-carta-futuro',
    hobby: 'escrita',
    autor: a('@diariodalu', 'DL'),
    quando: '2d atrás',
    titulo: 'Escreva uma carta para quem você vai ser daqui a um ano',
    resumo: 'Conte como está agora e o que espera. Depois, guarde.',
    conteudo: conteudo(
      b.texto('Conte como está agora, o que espera e do que tem medo. Escreva sem se corrigir.'),
      b.h3('Perguntas para puxar o fio'),
      b.lista('O que ocupa sua cabeça hoje?', 'O que você gostaria de ter aprendido até lá?', 'O que você não quer esquecer?'),
      b.dica('Feche a carta e marque no calendário o dia de abrir.'),
    ),
    minutos: 20,
    permissoes: semRemix,
    totalComentarios: 44,
  },
  {
    id: 's-caminho-diario',
    hobby: 'escrita',
    autor: a('@tom.escreve', 'TE'),
    quando: '1d atrás',
    titulo: 'Descreva em dez linhas o caminho que você faz todo dia',
    resumo: 'Cheiros, sons, pessoas: o trajeto esconde detalhes.',
    conteudo: conteudo(
      b.texto('Escrever sobre o trajeto de sempre treina o olhar para o que costuma passar no automático.'),
      b.numerada('No próximo trajeto, repare em três detalhes novos.', 'Ao chegar, escreva dez linhas sobre o caminho.', 'Releia e sublinhe a frase de que mais gostou.'),
    ),
    minutos: 15,
    permissoes: aberta,
    totalComentarios: 8,
  },
  // Jogos
  {
    id: 's-tabuleiro',
    hobby: 'jogos',
    autor: a('@mesadejogo', 'MJ'),
    quando: '2d atrás',
    titulo: 'Jogue um jogo de tabuleiro novo com quem mora com você',
    resumo: 'Aprender as regras juntos já é metade da diversão.',
    conteudo: conteudo(
      b.texto('Vale qualquer jogo, do mais simples ao mais estratégico. Leiam as regras em voz alta e façam uma partida de teste antes da valendo.'),
    ),
    minutos: 60,
    permissoes: aberta,
    totalComentarios: 13,
  },
  {
    id: 's-quebra-cabeca',
    hobby: 'jogos',
    autor: a('@cris.pecas', 'CP'),
    quando: '4d atrás',
    titulo: 'Monte um quebra-cabeça de 500 peças ao longo da semana',
    resumo: 'Troque alguns minutos de tela por algumas peças por dia.',
    conteudo: conteudo(
      b.texto('Deixe a mesa montada e encaixe algumas peças sempre que bater a vontade de rolar a tela. É uma pausa com começo, meio e fim.'),
      b.dica('Comece pelas bordas.'),
    ),
    minutos: 20,
    permissoes: aberta,
    totalComentarios: 6,
  },
  // Atividade física
  {
    id: 's-caminhada-sem-fone',
    hobby: 'atividade',
    autor: a('@andarleve', 'AL'),
    quando: '1d atrás',
    titulo: 'Faça uma caminhada de 20 minutos sem fones de ouvido',
    resumo: 'Só você, o ritmo dos passos e os sons da rua.',
    conteudo: conteudo(
      b.texto('Caminhar sem fone ajuda a desacelerar e a perceber o próprio corpo. Ao voltar, anote um som que você notou no caminho.'),
    ),
    minutos: 20,
    permissoes: aberta,
    totalComentarios: 37,
  },
  {
    id: 's-aula-danca',
    hobby: 'atividade',
    autor: a('@dancacomigo', 'DC'),
    quando: '3d atrás',
    titulo: 'Experimente uma aula de dança, mesmo que seja online',
    resumo: 'Não precisa saber dançar: só escolher um ritmo.',
    conteudo: conteudo(
      b.texto('O importante é se divertir, não acertar os passos. Afaste os móveis e dance até o fim, sem se julgar.'),
    ),
    minutos: 30,
    permissoes: aberta,
    totalComentarios: 21,
  },
  // Hobbies novos do catálogo
  {
    id: 's-desenho-cego',
    hobby: 'desenho',
    autor: a('@traco.solto', 'TS'),
    quando: '2d atrás',
    titulo: 'Desenhe um objeto sem olhar para o papel',
    resumo: 'Olhos no objeto, mão no papel. O resultado é o de menos.',
    conteudo: conteudo(
      b.texto('O desenho cego (blind contour) treina a observação: você só olha para o objeto, nunca para a folha.'),
      b.numerada('Escolha um objeto simples, como uma caneca ou a sua mão.', 'Coloque o lápis no papel e não tire até terminar.', 'Desenhe devagar, seguindo o contorno com os olhos.'),
      b.citacao('Vai ficar torto. É exatamente esse o charme.'),
    ),
    minutos: 10,
    permissoes: aberta,
    totalComentarios: 12,
  },
  {
    id: 's-foto-uma-cor',
    hobby: 'fotografia',
    autor: a('@luz.de.tarde', 'LT'),
    quando: '1d atrás',
    titulo: 'Fotografe dez coisas da mesma cor pelo bairro',
    resumo: 'Escolha uma cor e saia caçando. Só vale foto pensada.',
    conteudo: conteudo(
      b.texto('Uma regra simples muda o jeito de olhar a rua: escolha uma cor e fotografe só o que for dela.'),
      b.tarefas('Escolher a cor', 'Dez fotos, sem apagar nenhuma', 'Montar um mosaico com as dez'),
    ),
    minutos: 40,
    permissoes: aberta,
    totalComentarios: 19,
  },
  {
    id: 's-receita-familia',
    hobby: 'culinaria',
    autor: a('@vovo.cozinha', 'VC'),
    quando: '3d atrás',
    titulo: 'Cozinhe uma receita de família e pergunte a história dela',
    resumo: 'Toda receita de família tem uma história. Descubra a sua.',
    conteudo: conteudo(
      b.texto('Ligue para alguém da família, peça a receita e, antes de anotar os ingredientes, pergunte de onde ela veio.'),
      b.h2('Ingredientes da conversa'),
      b.lista('Quem ensinou essa receita?', 'Em que ocasiões ela aparecia?', 'Tem algum segredo que não está escrito?'),
      b.dica('Tire uma foto do prato pronto e mande para quem ensinou.'),
    ),
    minutos: 90,
    permissoes: aberta,
    totalComentarios: 58,
  },
  {
    id: 's-muda-cozinha',
    hobby: 'jardinagem',
    autor: a('@hortinha', 'HT'),
    quando: '5d atrás',
    titulo: 'Plante temperos numa garrafa na janela da cozinha',
    resumo: 'Manjericão, salsinha ou cebolinha: comece por um.',
    conteudo: conteudo(
      b.texto('Uma garrafa PET, um pouco de terra e luz da janela bastam para começar uma horta.'),
      b.numerada('Corte a garrafa ao meio e faça furos no fundo.', 'Encha com terra e plante a muda.', 'Regue um pouco todo dia de manhã.'),
    ),
    minutos: 30,
    permissoes: aberta,
    totalComentarios: 24,
  },
  {
    id: 's-xadrez-final',
    hobby: 'xadrez',
    autor: a('@peao.rei', 'PR'),
    quando: '2d atrás',
    titulo: 'Resolva três problemas de xadrez antes de jogar uma partida',
    resumo: 'Aquecer o raciocínio antes muda o jeito de jogar.',
    conteudo: conteudo(
      b.texto('Problemas de "mate em dois" são ótimos para treinar a visão do tabuleiro. Faça três, com calma, e só depois jogue uma partida.'),
    ),
    minutos: 30,
    permissoes: aberta,
    totalComentarios: 7,
  },
  {
    id: 's-meditacao-som',
    hobby: 'meditacao',
    autor: a('@respira.fundo', 'RF'),
    quando: '8h atrás',
    titulo: 'Medite por cinco minutos prestando atenção só nos sons',
    resumo: 'Feche os olhos e conte quantos sons diferentes você ouve.',
    conteudo: conteudo(
      b.texto('Em vez de esvaziar a mente, dê uma tarefa a ela: perceber cada som ao redor, do mais alto ao mais baixinho.'),
      b.citacao('Não precisa nomear os sons. Só perceber que eles estão ali.'),
    ),
    minutos: 5,
    permissoes: aberta,
    totalComentarios: 29,
  },
  {
    id: 's-idioma-musica',
    hobby: 'idiomas',
    autor: a('@poliglota.lenta', 'PL'),
    quando: '1d atrás',
    titulo: 'Aprenda a letra de uma música no idioma que você estuda',
    resumo: 'Cantar é o jeito mais divertido de pegar sotaque.',
    conteudo: conteudo(
      b.numerada('Escolha uma música lenta.', 'Leia a letra com a tradução ao lado.', 'Cante junto até conseguir sem olhar.'),
    ),
    minutos: 30,
    permissoes: aberta,
    totalComentarios: 16,
  },
  {
    id: 's-voluntariado-hora',
    hobby: 'voluntariado',
    autor: a('@maos.dadas', 'MD'),
    quando: '4d atrás',
    titulo: 'Doe uma hora da semana para uma causa perto de casa',
    resumo: 'Bibliotecas, abrigos e hortas comunitárias precisam de gente.',
    conteudo: conteudo(
      b.texto('Uma hora por semana já faz diferença. Procure projetos no seu bairro: bibliotecas comunitárias, abrigos de animais, hortas, cursinhos populares.'),
    ),
    minutos: 60,
    permissoes: aberta,
    totalComentarios: 11,
  },
  {
    id: 's-podcast-caminhando',
    hobby: 'podcasts',
    autor: a('@ouvidos.atentos', 'OA'),
    quando: '6h atrás',
    titulo: 'Troque um rolar de feed por um episódio de podcast',
    resumo: 'Da próxima vez que pegar o celular sem motivo, dê play.',
    conteudo: conteudo(b.texto('Deixe três episódios baixados. Quando pegar o celular no automático, troque o feed por um deles.')),
    minutos: 30,
    permissoes: aberta,
    totalComentarios: 5,
  },
];

// ─── Suas atividades (estado inicial) ───────────────────────────────────────
type Base = Pick<AtividadeMinha, 'id' | 'hobby' | 'titulo' | 'resumo' | 'conteudo' | 'minutos'> &
  Partial<AtividadeMinha>;

const minha = (x: Base): AtividadeMinha => ({
  autor: { usuario: 'Você', iniciais: 'EU' },
  permissoes: aberta,
  totalComentarios: 0,
  criadaPorMim: false,
  visibilidade: 'privada',
  status: 'andamento',
  novidade: false,
  criadaEm: 0,
  ...x,
});

export const atividadesIniciais: AtividadeMinha[] = [
  minha({
    id: 'a-playlist-domingo',
    hobby: 'musica',
    titulo: 'Monte uma playlist para as manhãs de domingo',
    resumo: 'Escolha músicas calmas para acompanhar o café sem pressa.',
    conteudo: conteudo(
      b.texto('A ideia é ter uma trilha pronta para começar o domingo longe do feed.'),
      b.tarefas('Separar dez músicas tranquilas', 'Ordenar da mais calma para a mais animada', 'Ouvir no próximo domingo'),
    ),
    minutos: 30,
    autor: a('@lu.martins', 'LM'),
    novidade: true,
    totalComentarios: 4,
  }),
  minha({
    id: 'a-acordes',
    hobby: 'musica',
    titulo: 'Aprenda os acordes de uma música que você ama',
    resumo: 'Violão, teclado ou ukulele: comece pelo refrão.',
    conteudo: conteudo(
      b.texto('Comece pelos três acordes do refrão e vá aumentando aos poucos.'),
      b.dica('Toque junto com a gravação original: ajuda a pegar o ritmo.'),
    ),
    minutos: 30,
    autor: a('@rafa.toca', 'RT'),
    totalComentarios: 2,
  }),
  minha({
    id: 'a-album-nascimento',
    hobby: 'musica',
    titulo: 'Ouça um álbum lançado no ano em que você nasceu',
    resumo: 'Descubra o que tocava quando você chegou ao mundo.',
    conteudo: conteudo(b.texto('Pesquise os álbuns lançados no seu ano, escolha um, ouça inteiro e guarde a faixa favorita.')),
    minutos: 45,
    criadaPorMim: true,
  }),
  minha({
    id: 'a-classico-brasileiro',
    hobby: 'cinema',
    titulo: 'Assista a um clássico do cinema brasileiro',
    resumo: 'Escolha aquele filme que todo mundo cita.',
    conteudo: conteudo(
      b.h2('Na lista'),
      b.lista('Central do Brasil', 'Cidade de Deus', 'O Pagador de Promessas', 'Bacurau'),
      b.texto('Assista sem o celular por perto e leia uma crítica depois.'),
    ),
    minutos: 110,
    autor: a('@cine.ana', 'CA'),
    totalComentarios: 6,
  }),
  minha({
    id: 'a-tres-cenas',
    hobby: 'cinema',
    titulo: 'Anote três cenas que ficaram na sua cabeça',
    resumo: 'Depois do próximo filme, escreva o que marcou você.',
    conteudo: conteudo(b.texto('A fala, a música, a luz: escreva por que cada cena marcou.')),
    minutos: 15,
    criadaPorMim: true,
  }),
  minha({
    id: 'a-livro-cabeceira',
    hobby: 'leitura',
    titulo: 'Termine o livro que está na cabeceira',
    resumo: 'Faltam poucos capítulos. Dez páginas antes de dormir?',
    conteudo: conteudo(b.texto('Deixe o livro ao lado da cama e leia dez páginas por noite, no lugar do celular.')),
    minutos: 15,
    criadaPorMim: true,
    totalComentarios: 3,
  }),
  minha({
    id: 'a-tres-linhas',
    hobby: 'escrita',
    titulo: 'Escreva três linhas antes de dormir',
    resumo: 'Uma coisa boa, uma difícil e uma para lembrar.',
    conteudo: conteudo(b.lista('Uma coisa boa do dia', 'Uma coisa difícil', 'Uma coisa para lembrar amanhã')),
    minutos: 5,
    criadaPorMim: true,
  }),
  minha({
    id: 'a-jogo-metade',
    hobby: 'jogos',
    titulo: 'Termine aquele jogo que ficou pela metade',
    resumo: 'Retome de onde parou e reserve um horário fixo para jogar.',
    conteudo: conteudo(b.texto('Encontre seu save, reserve meia hora e jogue até o próximo chefe, sem culpa.')),
    minutos: 30,
    criadaPorMim: true,
  }),
  minha({
    id: 'a-alongamento',
    hobby: 'atividade',
    titulo: 'Alongue-se por dez minutos ao acordar',
    resumo: 'Antes de olhar o celular, desperte o corpo devagar.',
    conteudo: conteudo(
      b.tarefas('Deixar o celular longe da cama', 'Alongar pescoço, ombros e costas', 'Respirar fundo três vezes'),
    ),
    minutos: 10,
    criadaPorMim: true,
  }),
];
