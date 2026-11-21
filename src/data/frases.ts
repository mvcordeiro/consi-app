/**
 * Frases filosóficas para a pausa (opção "Frases filosóficas" na mensagem do grupo).
 * Coleção interna do Consi: autores em domínio público, em traduções livres e curtas, escolhidas
 * pelo tema da pausa (atenção, tempo, desejo, presença). Uma frase sorteada a cada pausa.
 */
export type Frase = { texto: string; autor: string };

export const FRASES: Frase[] = [
  { texto: 'Não é que tenhamos pouco tempo. É que perdemos muito dele.', autor: 'Sêneca' },
  { texto: 'Enquanto adiamos, a vida passa.', autor: 'Sêneca' },
  { texto: 'Quem está em todo lugar não está em lugar nenhum.', autor: 'Sêneca' },
  { texto: 'Nenhum vento ajuda quem não sabe para que porto vai.', autor: 'Sêneca' },
  { texto: 'Cuide do que é seu: do seu tempo, da sua atenção, do seu juízo.', autor: 'Sêneca' },
  { texto: 'A felicidade da sua vida depende da qualidade dos seus pensamentos.', autor: 'Marco Aurélio' },
  { texto: 'Pergunte a cada coisa: isso é necessário?', autor: 'Marco Aurélio' },
  { texto: 'Você tem poder sobre a sua mente, não sobre os acontecimentos.', autor: 'Marco Aurélio' },
  { texto: 'Faça cada coisa como se fosse a última da sua vida, sem pressa e sem distração.', autor: 'Marco Aurélio' },
  { texto: 'Recolha-se em si mesmo. Ali há um lugar tranquilo.', autor: 'Marco Aurélio' },
  { texto: 'Não são as coisas que nos perturbam, mas o que pensamos delas.', autor: 'Epicteto' },
  { texto: 'Primeiro diga a si mesmo o que você quer ser; depois faça o que precisa fazer.', autor: 'Epicteto' },
  { texto: 'É livre quem governa a si mesmo.', autor: 'Epicteto' },
  { texto: 'Quem sabe que tem o bastante é rico.', autor: 'Lao-Tsé' },
  { texto: 'A natureza não tem pressa, e mesmo assim tudo se realiza.', autor: 'Lao-Tsé' },
  { texto: 'Conhecer os outros é inteligência; conhecer a si mesmo é sabedoria.', autor: 'Lao-Tsé' },
  { texto: 'Ninguém entra duas vezes no mesmo rio.', autor: 'Heráclito' },
  { texto: 'Uma vida sem exame não vale a pena ser vivida.', autor: 'Sócrates, por Platão' },
  { texto: 'Não deseje o que não tem a ponto de esquecer o que tem.', autor: 'Epicuro' },
  { texto: 'Nada é suficiente para quem acha pouco o suficiente.', autor: 'Epicuro' },
  { texto: 'Toda a infelicidade vem de não saber ficar quieto num quarto.', autor: 'Blaise Pascal' },
  { texto: 'A maior coisa do mundo é saber pertencer a si mesmo.', autor: 'Michel de Montaigne' },
  { texto: 'Quando danço, danço; quando durmo, durmo.', autor: 'Michel de Montaigne' },
  { texto: 'Não importa o quão devagar você vá, desde que não pare.', autor: 'Confúcio' },
  { texto: 'Somos o que fazemos repetidamente.', autor: 'Aristóteles, por Will Durant' },
  { texto: 'O homem é rico na proporção das coisas que consegue deixar de lado.', autor: 'Henry David Thoreau' },
  { texto: 'Nossa vida é desperdiçada em detalhes. Simplifique.', autor: 'Henry David Thoreau' },
  { texto: 'O que é feito com pressa raramente é bem feito.', autor: 'Provérbio latino' },
  { texto: 'Aquilo em que você presta atenção é aquilo em que você se transforma.', autor: 'William James, livre' },
  { texto: 'Para onde vai sua atenção, vai sua vida.', autor: 'Provérbio' },
  { texto: 'O presente é o único tempo que realmente temos.', autor: 'Marco Aurélio, livre' },
  { texto: 'Aprenda a estar presente na sua própria vida.', autor: 'Sêneca, livre' },
];

/** Uma frase sorteada (diferente da anterior, quando dá). */
let ultima = -1;
export function sortearFrase(): Frase {
  let i = Math.floor(Math.random() * FRASES.length);
  if (i === ultima) i = (i + 1) % FRASES.length;
  ultima = i;
  return FRASES[i];
}
