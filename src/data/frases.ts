/**
 * Frases filosóficas para a pausa (opção "Frases filosóficas" na mensagem do grupo).
 * Coleção interna do Consi, organizada por período. Só entram frases com fonte conhecida
 * (`obra`: livro, carta ou fragmento), em traduções livres e curtas, escolhidas pelo tema da
 * pausa: atenção, tempo, desejo, presença, conhecer a si mesmo. Frases populares de autoria
 * duvidosa ("Não importa o quão devagar você vá…", "Somos o que fazemos repetidamente…")
 * ficam de fora. Ao acrescentar uma, cite a obra.
 */
export type PeriodoFilosofico =
  | 'pre-socratica'
  | 'classica'
  | 'helenistica'
  | 'medieval'
  | 'moderna'
  | 'contemporanea'
  | 'oriental';

export type Frase = { texto: string; autor: string; obra: string; periodo: PeriodoFilosofico };

/** Os períodos, na ordem do menu. `quando` é só uma referência curta para o menu. */
export const PERIODOS: { id: PeriodoFilosofico; nome: string; quando: string }[] = [
  { id: 'pre-socratica', nome: 'Filosofia pré-socrática', quando: 'Séc. VI a V a.C.' },
  { id: 'classica', nome: 'Filosofia clássica', quando: 'Séc. V a IV a.C.' },
  { id: 'helenistica', nome: 'Filosofia helenística', quando: 'Séc. IV a.C. a II d.C.' },
  { id: 'medieval', nome: 'Filosofia medieval', quando: 'Séc. IV a XIV' },
  { id: 'moderna', nome: 'Filosofia moderna', quando: 'Séc. XVI a XVIII' },
  { id: 'contemporanea', nome: 'Filosofia contemporânea', quando: 'Séc. XIX em diante' },
  // Já estava no acervo (Lao-Tsé); fica como um período à parte.
  { id: 'oriental', nome: 'Pensamento oriental antigo', quando: 'Séc. VI a III a.C.' },
];

type SemPeriodo = Omit<Frase, 'periodo'>;
const de = (periodo: PeriodoFilosofico, lista: SemPeriodo[]): Frase[] => lista.map((f) => ({ ...f, periodo }));

export const FRASES: Frase[] = [
  ...de('pre-socratica', [
    { texto: 'Ninguém entra duas vezes no mesmo rio.', autor: 'Heráclito', obra: 'Fragmento 91, citado por Platão no Crátilo' },
    { texto: 'O sol é novo a cada dia.', autor: 'Heráclito', obra: 'Fragmento 6' },
    { texto: 'Busquei a mim mesmo.', autor: 'Heráclito', obra: 'Fragmento 101' },
    { texto: 'O caráter de uma pessoa é o seu destino.', autor: 'Heráclito', obra: 'Fragmento 119' },
    { texto: 'Se não esperar o inesperado, você não o encontrará.', autor: 'Heráclito', obra: 'Fragmento 18' },
    { texto: 'Saber muitas coisas não ensina a ter entendimento.', autor: 'Heráclito', obra: 'Fragmento 40' },
    { texto: 'A natureza ama esconder-se.', autor: 'Heráclito', obra: 'Fragmento 123' },
    { texto: 'Quem quer viver tranquilo não deve se ocupar de muitas coisas.', autor: 'Demócrito', obra: 'Fragmento 3' },
    { texto: 'O bom ânimo vem da moderação no prazer e da medida na vida.', autor: 'Demócrito', obra: 'Fragmento 191' },
    { texto: 'A felicidade não mora nos rebanhos nem no ouro: a alma é a morada do destino.', autor: 'Demócrito', obra: 'Fragmento 171' },
    {
      texto: 'O mais difícil é conhecer a si mesmo; o mais fácil, dar conselhos a outro.',
      autor: 'Tales de Mileto',
      obra: 'Segundo Diógenes Laércio, Vidas I, 36',
    },
    {
      texto: 'Os deuses não mostraram tudo desde o início; com o tempo, buscando, descobrimos o melhor.',
      autor: 'Xenófanes',
      obra: 'Fragmento 18',
    },
    { texto: 'O mesmo é pensar e ser.', autor: 'Parmênides', obra: 'Fragmento 3' },
  ]),

  ...de('classica', [
    { texto: 'Uma vida sem exame não vale a pena ser vivida.', autor: 'Sócrates, por Platão', obra: 'Apologia de Sócrates, 38a' },
    { texto: 'Não sei, e também não penso que sei.', autor: 'Sócrates, por Platão', obra: 'Apologia de Sócrates, 21d' },
    {
      texto: 'Não precisar de nada é divino; precisar do mínimo é o que mais se aproxima do divino.',
      autor: 'Sócrates, por Xenofonte',
      obra: 'Memoráveis I, 6',
    },
    { texto: 'O espanto é o começo da filosofia.', autor: 'Platão', obra: 'Teeteto, 155d' },
    { texto: 'O começo é a parte mais importante de qualquer trabalho.', autor: 'Platão', obra: 'República II, 377a' },
    { texto: 'É melhor sofrer uma injustiça do que cometê-la.', autor: 'Platão', obra: 'Górgias, 469c' },
    { texto: 'Todos os seres humanos, por natureza, desejam saber.', autor: 'Aristóteles', obra: 'Metafísica I, 980a' },
    {
      texto: 'Uma andorinha só não faz verão, nem um só dia: um tempo curto não faz ninguém feliz.',
      autor: 'Aristóteles',
      obra: 'Ética a Nicômaco I, 7',
    },
    {
      texto: 'Tornamo-nos justos praticando atos justos, e moderados praticando atos moderados.',
      autor: 'Aristóteles',
      obra: 'Ética a Nicômaco II, 1',
    },
    { texto: 'Trabalhamos para ter tempo livre.', autor: 'Aristóteles', obra: 'Ética a Nicômaco X, 7' },
    {
      texto: 'Ninguém escolheria viver sem amigos, mesmo tendo todos os outros bens.',
      autor: 'Aristóteles',
      obra: 'Ética a Nicômaco VIII, 1',
    },
    { texto: 'A virtude é um meio-termo entre dois excessos.', autor: 'Aristóteles', obra: 'Ética a Nicômaco II, 6' },
  ]),

  ...de('helenistica', [
    { texto: 'Não é que tenhamos pouco tempo. É que perdemos muito dele.', autor: 'Sêneca', obra: 'Sobre a brevidade da vida, 1' },
    { texto: 'Enquanto adiamos, a vida passa.', autor: 'Sêneca', obra: 'Cartas a Lucílio, 1' },
    {
      texto: 'Tome posse de si mesmo e guarde o tempo que até agora lhe tiravam ou escapava.',
      autor: 'Sêneca',
      obra: 'Cartas a Lucílio, 1',
    },
    { texto: 'Quem está em todo lugar não está em lugar nenhum.', autor: 'Sêneca', obra: 'Cartas a Lucílio, 2' },
    { texto: 'Pobre não é quem tem pouco, mas quem deseja mais.', autor: 'Sêneca', obra: 'Cartas a Lucílio, 2' },
    { texto: 'Sofremos mais na imaginação do que na realidade.', autor: 'Sêneca', obra: 'Cartas a Lucílio, 13' },
    { texto: 'Nenhum vento ajuda quem não sabe para que porto vai.', autor: 'Sêneca', obra: 'Cartas a Lucílio, 71' },
    { texto: 'A alma se tinge da cor dos seus pensamentos.', autor: 'Marco Aurélio', obra: 'Meditações V, 16' },
    { texto: 'Pergunte a cada coisa: isso é necessário?', autor: 'Marco Aurélio', obra: 'Meditações IV, 24' },
    {
      texto: 'Faça cada coisa como se fosse a última da sua vida, sem pressa e sem distração.',
      autor: 'Marco Aurélio',
      obra: 'Meditações II, 5',
    },
    {
      texto: 'Em lugar nenhum se encontra um retiro mais tranquilo do que na própria alma.',
      autor: 'Marco Aurélio',
      obra: 'Meditações IV, 3',
    },
    { texto: 'Só o presente pode nos ser tirado, porque é só ele que temos.', autor: 'Marco Aurélio', obra: 'Meditações II, 14' },
    { texto: 'Pouquíssimo é preciso para viver uma vida feliz.', autor: 'Marco Aurélio', obra: 'Meditações VII, 67' },
    { texto: 'Não são as coisas que nos perturbam, mas o que pensamos delas.', autor: 'Epicteto', obra: 'Manual, 5' },
    { texto: 'Algumas coisas dependem de nós; outras, não.', autor: 'Epicteto', obra: 'Manual, 1' },
    {
      texto: 'Não queira que as coisas aconteçam como você deseja; queira que aconteçam como acontecem.',
      autor: 'Epicteto',
      obra: 'Manual, 8',
    },
    {
      texto: 'Primeiro diga a si mesmo o que você quer ser; depois faça o que precisa fazer.',
      autor: 'Epicteto',
      obra: 'Discursos III, 23',
    },
    { texto: 'Ninguém começa a aprender o que acha que já sabe.', autor: 'Epicteto', obra: 'Discursos II, 17' },
    { texto: 'Não estrague o que você tem desejando o que não tem.', autor: 'Epicuro', obra: 'Sentenças Vaticanas, 35' },
    { texto: 'Nada é suficiente para quem acha pouco o suficiente.', autor: 'Epicuro', obra: 'Fragmento 474 (Usener)' },
    { texto: 'Nunca é cedo nem tarde demais para cuidar da alma.', autor: 'Epicuro', obra: 'Carta a Meneceu' },
    {
      texto: 'De tudo o que a sabedoria oferece para uma vida feliz, o maior bem é a amizade.',
      autor: 'Epicuro',
      obra: 'Máximas Principais, 27',
    },
    { texto: 'Se você tem um jardim e uma biblioteca, não lhe falta nada.', autor: 'Cícero', obra: 'Cartas aos familiares IX, 4' },
  ]),

  ...de('medieval', [
    {
      texto: 'O que é o tempo? Se ninguém me pergunta, eu sei; se quero explicar a quem pergunta, já não sei.',
      autor: 'Agostinho de Hipona',
      obra: 'Confissões XI, 14',
    },
    {
      texto: 'As pessoas viajam para admirar montanhas, mares e rios, e passam ao largo de si mesmas.',
      autor: 'Agostinho de Hipona',
      obra: 'Confissões X, 8',
    },
    { texto: 'Nosso coração está inquieto enquanto não repousa em ti.', autor: 'Agostinho de Hipona', obra: 'Confissões I, 1' },
    {
      texto: 'Não saia de si: volte para dentro de você. No interior do ser humano mora a verdade.',
      autor: 'Agostinho de Hipona',
      obra: 'Sobre a verdadeira religião, 39',
    },
    { texto: 'Ama e faze o que quiseres.', autor: 'Agostinho de Hipona', obra: 'Comentário à Primeira Epístola de João, VII, 8' },
    {
      texto: 'Por que buscar fora a felicidade que está dentro de vocês?',
      autor: 'Boécio',
      obra: 'A consolação da filosofia II, 4',
    },
    {
      texto: 'Nada é miserável se você não o julga assim; e toda sorte é boa para quem a suporta com serenidade.',
      autor: 'Boécio',
      obra: 'A consolação da filosofia II, 4',
    },
    {
      texto: 'Duvidando chegamos à investigação; investigando, alcançamos a verdade.',
      autor: 'Pedro Abelardo',
      obra: 'Sic et Non, prólogo',
    },
    { texto: 'Creio para compreender.', autor: 'Anselmo de Cantuária', obra: 'Proslógio, 1' },
    {
      texto: 'Ninguém consegue ficar muito tempo sem algum prazer.',
      autor: 'Tomás de Aquino, citando Aristóteles',
      obra: 'Suma Teológica II-II, q. 35, a. 4',
    },
    { texto: 'A graça não destrói a natureza: ela a aperfeiçoa.', autor: 'Tomás de Aquino', obra: 'Suma Teológica I, q. 1, a. 8' },
  ]),

  ...de('moderna', [
    { texto: 'A maior coisa do mundo é saber pertencer a si mesmo.', autor: 'Michel de Montaigne', obra: 'Ensaios I, 39' },
    { texto: 'Quando danço, danço; quando durmo, durmo.', autor: 'Michel de Montaigne', obra: 'Ensaios III, 13' },
    { texto: 'Quem teme sofrer já sofre o que teme.', autor: 'Michel de Montaigne', obra: 'Ensaios III, 13' },
    { texto: 'Que sei eu?', autor: 'Michel de Montaigne', obra: 'Ensaios II, 12' },
    {
      texto: 'Toda a infelicidade vem de não saber ficar quieto num quarto.',
      autor: 'Blaise Pascal',
      obra: 'Pensamentos, 139',
    },
    {
      texto: 'Nunca nos detemos no presente. Assim, nunca vivemos: esperamos viver.',
      autor: 'Blaise Pascal',
      obra: 'Pensamentos, 172',
    },
    { texto: 'O coração tem razões que a própria razão desconhece.', autor: 'Blaise Pascal', obra: 'Pensamentos, 277' },
    { texto: 'Penso, logo existo.', autor: 'René Descartes', obra: 'Discurso do método, IV' },
    {
      texto: 'Não basta ter um bom espírito; o principal é aplicá-lo bem.',
      autor: 'René Descartes',
      obra: 'Discurso do método, I',
    },
    { texto: 'Tudo o que é excelente é tão difícil quanto raro.', autor: 'Baruch Espinosa', obra: 'Ética V, proposição 42' },
    {
      texto: 'Não rir, não lamentar, não detestar, mas compreender.',
      autor: 'Baruch Espinosa',
      obra: 'Tratado político I, 4',
    },
    { texto: 'Conhecimento é poder.', autor: 'Francis Bacon', obra: 'Meditações sacras' },
    { texto: 'É preciso cultivar o nosso jardim.', autor: 'Voltaire', obra: 'Cândido, cap. 30' },
    { texto: 'Viver não é respirar, é agir.', autor: 'Jean-Jacques Rousseau', obra: 'Emílio, livro I' },
    {
      texto: 'Tenha a coragem de servir-se do seu próprio entendimento.',
      autor: 'Immanuel Kant',
      obra: 'Resposta à pergunta: o que é esclarecimento?',
    },
  ]),

  ...de('contemporanea', [
    {
      texto: 'A vida só pode ser compreendida olhando para trás, mas precisa ser vivida olhando para a frente.',
      autor: 'Søren Kierkegaard',
      obra: 'Diários, 1843',
    },
    {
      texto: 'Raramente pensamos no que temos, mas sempre no que nos falta.',
      autor: 'Arthur Schopenhauer',
      obra: 'Aforismos para a sabedoria de vida',
    },
    { texto: 'Fui para o bosque porque queria viver deliberadamente.', autor: 'Henry David Thoreau', obra: 'Walden, cap. 2' },
    { texto: 'Nossa vida se desperdiça em detalhes. Simplifique, simplifique.', autor: 'Henry David Thoreau', obra: 'Walden, cap. 2' },
    {
      texto: 'Uma pessoa é rica na proporção das coisas que consegue deixar de lado.',
      autor: 'Henry David Thoreau',
      obra: 'Walden, cap. 2',
    },
    { texto: 'Nada pode lhe trazer paz senão você mesmo.', autor: 'Ralph Waldo Emerson', obra: 'Autoconfiança' },
    {
      texto: 'Minha experiência é aquilo a que eu concordo em prestar atenção.',
      autor: 'William James',
      obra: 'Princípios de psicologia, cap. XI',
    },
    {
      texto: 'Quem tem um porquê para viver suporta quase qualquer como.',
      autor: 'Friedrich Nietzsche',
      obra: 'Crepúsculo dos ídolos, Máximas, 12',
    },
    { texto: 'Sem a música, a vida seria um erro.', autor: 'Friedrich Nietzsche', obra: 'Crepúsculo dos ídolos, Máximas, 33' },
    {
      texto: 'Os limites da minha linguagem são os limites do meu mundo.',
      autor: 'Ludwig Wittgenstein',
      obra: 'Tractatus Logico-Philosophicus, 5.6',
    },
    {
      texto: 'O caminho para a felicidade passa por uma redução organizada do trabalho.',
      autor: 'Bertrand Russell',
      obra: 'O elogio ao ócio',
    },
    {
      texto: 'A atenção é a forma mais rara e mais pura da generosidade.',
      autor: 'Simone Weil',
      obra: 'Carta a Joë Bousquet, 1942',
    },
    {
      texto: 'A atenção, levada ao seu grau mais alto, é o mesmo que a oração.',
      autor: 'Simone Weil',
      obra: 'A gravidade e a graça',
    },
    {
      texto: 'O ser humano está condenado a ser livre.',
      autor: 'Jean-Paul Sartre',
      obra: 'O existencialismo é um humanismo',
    },
    { texto: 'É preciso imaginar Sísifo feliz.', autor: 'Albert Camus', obra: 'O mito de Sísifo' },
  ]),

  ...de('oriental', [
    { texto: 'Quem sabe que tem o bastante é rico.', autor: 'Lao-Tsé', obra: 'Tao Te Ching, 33' },
    { texto: 'Conhecer os outros é inteligência; conhecer a si mesmo é sabedoria.', autor: 'Lao-Tsé', obra: 'Tao Te Ching, 33' },
    { texto: 'Uma viagem de mil léguas começa com um passo.', autor: 'Lao-Tsé', obra: 'Tao Te Ching, 64' },
    { texto: 'Quem sabe não fala; quem fala não sabe.', autor: 'Lao-Tsé', obra: 'Tao Te Ching, 56' },
    {
      texto: 'Aprender sem pensar é inútil; pensar sem aprender é perigoso.',
      autor: 'Confúcio',
      obra: 'Analectos II, 15',
    },
    { texto: 'Não faça aos outros o que você não quer para si.', autor: 'Confúcio', obra: 'Analectos XV, 24' },
    { texto: 'A mente vem antes de todas as coisas.', autor: 'Dhammapada', obra: 'Dhammapada, 1' },
    {
      texto: 'A atenção é o caminho para o que não morre; a distração, o caminho da morte.',
      autor: 'Dhammapada',
      obra: 'Dhammapada, 21',
    },
  ]),
];

export const nomeDoPeriodo = (p?: PeriodoFilosofico | null) =>
  p ? (PERIODOS.find((x) => x.id === p)?.nome ?? 'Todos os períodos') : 'Todos os períodos';

/** As frases de um período (sem período: todas). */
export const frasesDoPeriodo = (p?: PeriodoFilosofico | null) => (p ? FRASES.filter((f) => f.periodo === p) : FRASES);

/** Até `n` autores de um período, sem repetir, para descrever o período no menu. */
export const autoresDoPeriodo = (p: PeriodoFilosofico, n = 3) =>
  [...new Set(frasesDoPeriodo(p).map((f) => f.autor.split(',')[0]))].slice(0, n);

/**
 * Sorteio sem repetição: cada período tem um "saco" com as frases ainda não mostradas; só
 * volta a repetir depois de todas aparecerem (e a primeira da nova rodada não é a última da anterior).
 */
const sacos = new Map<string, Frase[]>();
const ultimas = new Map<string, Frase>();
export function sortearFrase(periodo?: PeriodoFilosofico | null): Frase {
  const chave = periodo ?? 'todos';
  let saco = sacos.get(chave);
  if (!saco?.length) {
    const ultima = ultimas.get(chave);
    saco = frasesDoPeriodo(periodo).filter((f) => f !== ultima);
    if (!saco.length) saco = [...frasesDoPeriodo(periodo)];
    sacos.set(chave, saco);
  }
  const [frase] = saco.splice(Math.floor(Math.random() * saco.length), 1);
  ultimas.set(chave, frase);
  return frase;
}
