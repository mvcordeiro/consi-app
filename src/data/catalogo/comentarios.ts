/**
 * Conversas de exemplo, com respostas (threads) e reações.
 * Cada hobby tem um modelo de conversa que é usado em todas as suas atividades;
 * num app com servidor, viriam de GET /atividades/:id/comentarios.
 */
import { fotoPerfil } from '@/components/home/assets';

import type { Autor, Comentario, HobbyId, ReacaoId } from './tipos';

const joana: Autor = { id: 'u-joana', usuario: '@joanadasilva', iniciais: 'JS', foto: fotoPerfil };
const a = (usuario: string, iniciais: string): Autor => ({ id: `u-${usuario.slice(1)}`, usuario, iniciais });

type Modelo = Omit<Comentario, 'itemId' | 'reacoes'> & { reacoes?: Partial<Record<ReacaoId, number>> };

const musica: Modelo[] = [
  { id: 'm1', autor: a('@lu.martins', 'LM'), quando: '2d atrás', texto: 'Fiz com city pop japonês e virou a trilha das minhas manhãs!', reacoes: { amei: 12, curti: 4 } },
  { id: 'm1r1', paiId: 'm1', autor: joana, quando: '2d atrás', texto: 'Que demais! Manda o nome da playlist?', reacoes: { curti: 3 } },
  { id: 'm1r2', paiId: 'm1r1', autor: a('@lu.martins', 'LM'), quando: '1d atrás', texto: '"Domingo em Tóquio" 🙈', reacoes: { haha: 6 } },
  { id: 'm1r3', paiId: 'm1', autor: a('@beatrizsom', 'BS'), quando: '1d atrás', texto: 'Mariya Takeuchi é obrigatória nessa lista.' },
  { id: 'm2', autor: a('@rafa.toca', 'RT'), quando: '2d atrás', texto: 'Dica: ouçam o álbum inteiro antes de escolher as músicas. Faz diferença.', reacoes: { curti: 9, uau: 2 } },
  { id: 'm2r1', paiId: 'm2', autor: a('@caio.le', 'CL'), quando: '1d atrás', texto: 'Concordo muito. A ordem das faixas conta uma história.' },
  { id: 'm3', autor: a('@beatrizsom', 'BS'), quando: '8h atrás', texto: 'Comecei por forró pé de serra e não consigo parar.', reacoes: { parabens: 5, haha: 2 } },
];

const cinema: Modelo[] = [
  { id: 'c1', autor: a('@pedroh', 'PH'), quando: '3d atrás', texto: 'Vi um filme iraniano e fiquei dias pensando no final.', reacoes: { uau: 7 } },
  { id: 'c1r1', paiId: 'c1', autor: a('@cine.ana', 'CA'), quando: '2d atrás', texto: 'Qual? Gosto de Gosto de Cereja até hoje.', reacoes: { curti: 2 } },
  { id: 'c1r2', paiId: 'c1r1', autor: a('@pedroh', 'PH'), quando: '2d atrás', texto: 'Esse mesmo! Que final.' },
  { id: 'c2', autor: a('@marinafilma', 'MF'), quando: '1d atrás', texto: 'Assistir sem celular por perto muda tudo. Prestei atenção em cada detalhe.', reacoes: { amei: 8, curti: 3 } },
  { id: 'c3', autor: a('@cine.ana', 'CA'), quando: '5h atrás', texto: 'Alguém tem indicação de filme coreano que não seja o mais famoso?' },
  { id: 'c3r1', paiId: 'c3', autor: a('@marinafilma', 'MF'), quando: '3h atrás', texto: 'Em Chamas, do Lee Chang-dong. Lento e lindo.', reacoes: { curti: 4 } },
];

const geral: Modelo[] = [
  { id: 'g1', autor: a('@caio.le', 'CL'), quando: '2d atrás', texto: 'Fiz ontem e foi o melhor momento do meu dia.', reacoes: { amei: 6, parabens: 3 } },
  { id: 'g1r1', paiId: 'g1', autor: joana, quando: '1d atrás', texto: 'Que bom ler isso! Conta como foi?', reacoes: { curti: 2 } },
  { id: 'g1r2', paiId: 'g1r1', autor: a('@caio.le', 'CL'), quando: '1d atrás', texto: 'Fiz com calma, sem pressa nenhuma. Nem lembrei do celular.', reacoes: { emocionei: 4 } },
  { id: 'g2', autor: a('@livrosdaju', 'LJ'), quando: '1d atrás', texto: 'Adaptei um pouco: fiz em dupla com minha irmã. Recomendo!', reacoes: { curti: 5 } },
  { id: 'g3', autor: a('@tom.escreve', 'TE'), quando: '4h atrás', texto: 'Alguém já repetiu essa mais de uma vez? Fica diferente?' },
  { id: 'g3r1', paiId: 'g3', autor: a('@andarleve', 'AL'), quando: '2h atrás', texto: 'Fica! Cada vez eu reparo numa coisa nova.', reacoes: { uau: 2 } },
];

const porHobby: Record<HobbyId, Modelo[]> = { musica, cinema };

/** Conversa de exemplo de uma atividade (ids prefixados com o id dela, para serem únicos). */
export function comentariosDeExemplo(itemId: string, hobby: HobbyId): Comentario[] {
  return (porHobby[hobby] ?? geral).map((c) => ({
    ...c,
    id: `${itemId}:${c.id}`,
    paiId: c.paiId ? `${itemId}:${c.paiId}` : undefined,
    itemId,
    reacoes: c.reacoes ?? {},
  }));
}
