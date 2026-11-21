/**
 * Catálogo de hobbies do Consi, agrupado em categorias.
 * É a lista que o onboarding (D4), o canvas de "Novo hobby", os filtros e as abas usam.
 * Num app com servidor, vem de GET /hobbies (ver fonte.ts); os ids são estáveis.
 */
import type { Categoria, CategoriaId, HobbyId, HobbyInfo } from './tipos';

export const categorias: Categoria[] = [
  { id: 'musica', nome: 'Música e som', descricao: 'Ouvir, tocar, cantar e colecionar.' },
  { id: 'telas', nome: 'Cinema e vídeo', descricao: 'Histórias contadas em imagens.' },
  { id: 'artes', nome: 'Artes visuais', descricao: 'Desenhar, pintar, fotografar.' },
  { id: 'palavras', nome: 'Leitura, escrita e línguas', descricao: 'Ler, escrever e aprender a falar de outros jeitos.' },
  { id: 'jogos', nome: 'Jogos e desafios', descricao: 'Para jogar sozinho ou junto.' },
  { id: 'maos', nome: 'Fazer com as mãos', descricao: 'Construir, consertar, cozinhar, programar.' },
  { id: 'corpo', nome: 'Corpo e movimento', descricao: 'Mexer o corpo e respirar melhor.' },
  { id: 'pessoas', nome: 'Com outras pessoas', descricao: 'Encontros, palco e ajuda.' },
  { id: 'natureza', nome: 'Natureza e descobertas', descricao: 'Sair, observar e cuidar.' },
  { id: 'meus', nome: 'Criados por você', descricao: 'Hobbies que você adicionou.' },
];

/**
 * `iconeProvisorio`: o Design System ainda não tem um ícone para o hobby (culinária, yoga…);
 * usamos a lâmpada ou o mais próximo até o design desenhar um.
 */
export const catalogoHobbies: HobbyInfo[] = [
  // Música e som
  { id: 'musica', nome: 'Música', categoria: 'musica', icone: 'filtrar-musicas', termos: ['ouvir música', 'playlist', 'álbuns'] },
  { id: 'instrumento', nome: 'Tocar um instrumento', categoria: 'musica', icone: 'contrabaixo', termos: ['violão', 'guitarra', 'baixo', 'ukulele'] },
  { id: 'piano', nome: 'Piano e teclado', categoria: 'musica', icone: 'teclado' },
  { id: 'percussao', nome: 'Bateria e percussão', categoria: 'musica', icone: 'bateria', termos: ['batucada', 'cajón'] },
  { id: 'canto', nome: 'Canto', categoria: 'musica', icone: 'karaoke', termos: ['cantar', 'coral', 'karaokê'] },
  { id: 'discotecagem', nome: 'Discotecagem', categoria: 'musica', icone: 'dj', termos: ['DJ', 'mixar'] },
  { id: 'vinil', nome: 'Colecionar discos', categoria: 'musica', icone: 'toca-discos', termos: ['vinil', 'LP'] },
  { id: 'podcasts', nome: 'Podcasts', categoria: 'musica', icone: 'podcast', termos: ['ouvir podcast', 'gravar podcast'] },
  // Cinema e vídeo
  { id: 'cinema', nome: 'Cinema', categoria: 'telas', icone: 'rolo-filme', termos: ['filmes'] },
  { id: 'series', nome: 'Séries', categoria: 'telas', icone: 'tv-retro' },
  { id: 'videos', nome: 'Fazer vídeos', categoria: 'telas', icone: 'claquete', termos: ['vlog', 'curta-metragem', 'edição'] },
  // Artes visuais
  { id: 'desenho', nome: 'Desenho', categoria: 'artes', icone: 'pena-desenho', termos: ['rabiscar', 'sketch'] },
  { id: 'pintura', nome: 'Pintura', categoria: 'artes', icone: 'pincel', termos: ['aquarela', 'tela', 'acrílica'] },
  { id: 'grafite', nome: 'Grafite e lettering', categoria: 'artes', icone: 'spray' },
  { id: 'ilustracao', nome: 'Ilustração digital', categoria: 'artes', icone: 'mesa-digitalizadora' },
  { id: 'caligrafia', nome: 'Caligrafia', categoria: 'artes', icone: 'pena-escrita' },
  { id: 'colagem', nome: 'Colagem', categoria: 'artes', icone: 'tesoura', termos: ['scrapbook'] },
  { id: 'design', nome: 'Design gráfico', categoria: 'artes', icone: 'caneta-vetor' },
  { id: 'fotografia', nome: 'Fotografia', categoria: 'artes', icone: 'camera', termos: ['fotos'] },
  { id: 'foto-analogica', nome: 'Fotografia analógica', categoria: 'artes', icone: 'camera-instantanea', termos: ['polaroid', 'filme 35 mm'] },
  // Leitura, escrita e línguas
  { id: 'leitura', nome: 'Leitura', categoria: 'palavras', icone: 'hobby-leitura', termos: ['livros'] },
  { id: 'audiolivros', nome: 'Audiolivros', categoria: 'palavras', icone: 'audiolivro' },
  { id: 'escrita', nome: 'Escrita', categoria: 'palavras', icone: 'hobby-escrita', termos: ['contos', 'escrever'] },
  { id: 'poesia', nome: 'Poesia', categoria: 'palavras', icone: 'maquina-escrever' },
  { id: 'diario', nome: 'Diário', categoria: 'palavras', icone: 'caderno', termos: ['journaling'] },
  { id: 'idiomas', nome: 'Idiomas', categoria: 'palavras', icone: 'traducao', termos: ['inglês', 'espanhol', 'francês'] },
  { id: 'libras', nome: 'Libras', categoria: 'palavras', icone: 'lingua-sinais', termos: ['língua de sinais'] },
  // Jogos e desafios
  { id: 'jogos', nome: 'Jogos', categoria: 'jogos', icone: 'hobby-jogos', termos: ['videogame', 'games'] },
  { id: 'xadrez', nome: 'Xadrez', categoria: 'jogos', icone: 'xadrez' },
  { id: 'tabuleiro', nome: 'Jogos de tabuleiro', categoria: 'jogos', icone: 'dado-peao', termos: ['board games'] },
  { id: 'cartas', nome: 'Jogos de cartas', categoria: 'jogos', icone: 'naipes', termos: ['baralho', 'truco', 'buraco'] },
  { id: 'rpg', nome: 'RPG', categoria: 'jogos', icone: 'rpg', termos: ['D&D', 'mesa'] },
  { id: 'quebra-cabeca', nome: 'Quebra-cabeça', categoria: 'jogos', icone: 'quebra-cabeca' },
  { id: 'retro', nome: 'Jogos retrô', categoria: 'jogos', icone: 'pacman', termos: ['fliperama'] },
  { id: 'magica', nome: 'Mágica', categoria: 'jogos', icone: 'cartola', termos: ['ilusionismo'] },
  { id: 'cubo', nome: 'Cubo mágico', categoria: 'jogos', icone: 'cubo' },
  // Fazer com as mãos
  { id: 'programacao', nome: 'Programação', categoria: 'maos', icone: 'programacao', termos: ['código', 'apps'] },
  { id: 'eletronica', nome: 'Eletrônica', categoria: 'maos', icone: 'arduino', termos: ['arduino', 'robótica'] },
  { id: 'montar', nome: 'Montar e construir', categoria: 'maos', icone: 'blocos', termos: ['lego', 'maquete'] },
  { id: 'marcenaria', nome: 'Marcenaria e DIY', categoria: 'maos', icone: 'martelo', termos: ['faça você mesmo', 'consertos'] },
  { id: 'culinaria', nome: 'Culinária', categoria: 'maos', icone: 'lampada', iconeProvisorio: true, termos: ['cozinhar', 'receitas', 'confeitaria'] },
  { id: 'costura', nome: 'Costura e tricô', categoria: 'maos', icone: 'lampada', iconeProvisorio: true, termos: ['crochê', 'bordado'] },
  { id: 'ceramica', nome: 'Cerâmica', categoria: 'maos', icone: 'lampada', iconeProvisorio: true, termos: ['argila', 'modelagem'] },
  // Corpo e movimento
  { id: 'atividade', nome: 'Atividade física', categoria: 'corpo', icone: 'hobby-atividade', termos: ['exercício', 'academia'] },
  { id: 'natacao', nome: 'Natação', categoria: 'corpo', icone: 'piscina' },
  { id: 'caminhada', nome: 'Caminhada', categoria: 'corpo', icone: 'pedestre' },
  { id: 'danca', nome: 'Dança', categoria: 'corpo', icone: 'discoteca', termos: ['forró', 'samba', 'balé'] },
  { id: 'corrida', nome: 'Corrida', categoria: 'corpo', icone: 'cronometro' },
  { id: 'meditacao', nome: 'Meditação', categoria: 'corpo', icone: 'rosto-abencoado', termos: ['respiração', 'mindfulness'] },
  { id: 'yoga', nome: 'Yoga', categoria: 'corpo', icone: 'lampada', iconeProvisorio: true },
  { id: 'ciclismo', nome: 'Ciclismo', categoria: 'corpo', icone: 'lampada', iconeProvisorio: true, termos: ['bike', 'pedalar'] },
  // Com outras pessoas
  { id: 'voluntariado', nome: 'Voluntariado', categoria: 'pessoas', icone: 'mao-doacao', termos: ['ONG', 'ajudar'] },
  { id: 'teatro', nome: 'Teatro', categoria: 'pessoas', icone: 'teatro' },
  { id: 'comedia', nome: 'Comédia e improviso', categoria: 'pessoas', icone: 'palhaco', termos: ['stand-up'] },
  { id: 'encontros', nome: 'Organizar encontros', categoria: 'pessoas', icone: 'balao-festa', termos: ['festas', 'jantares'] },
  // Natureza e descobertas
  { id: 'jardinagem', nome: 'Jardinagem', categoria: 'natureza', icone: 'muda-planta', iconeProvisorio: true, termos: ['plantas', 'horta'] },
  { id: 'pets', nome: 'Pets', categoria: 'natureza', icone: 'gato', termos: ['cachorro', 'gato'] },
  { id: 'passaros', nome: 'Observar pássaros', categoria: 'natureza', icone: 'binoculos' },
  { id: 'colecionismo', nome: 'Colecionismo', categoria: 'natureza', icone: 'selo', termos: ['selos', 'moedas'] },
  { id: 'explorar-cidade', nome: 'Explorar a cidade', categoria: 'natureza', icone: 'mapa', termos: ['passeios', 'museus'] },
  { id: 'viagens', nome: 'Viagens', categoria: 'natureza', icone: 'bagagem' },
  { id: 'trilhas', nome: 'Trilhas e camping', categoria: 'natureza', icone: 'lampada', iconeProvisorio: true },
  { id: 'astronomia', nome: 'Astronomia', categoria: 'natureza', icone: 'lampada', iconeProvisorio: true, termos: ['estrelas', 'céu'] },
];

const porId = new Map(catalogoHobbies.map((h) => [h.id, h]));

/** Um hobby criado pela pessoa entra no catálogo (ver hobbiesPersonalizados.ts). */
export function registrarHobby(h: HobbyInfo) {
  if (porId.has(h.id)) return;
  catalogoHobbies.push(h);
  porId.set(h.id, h);
}

/**
 * Hobby do catálogo. Um hobby criado (`meu:Nome`) ainda não carregado mostra o nome do id;
 * um id desconhecido (removido do servidor) vira um hobby genérico.
 */
export function hobbyInfo(id: HobbyId): HobbyInfo {
  const h = porId.get(id);
  if (h) return h;
  if (id.startsWith('meu:')) return { id, nome: id.slice(4), categoria: 'meus', icone: 'lampada' };
  return { id, nome: id, categoria: 'maos', icone: 'lampada', iconeProvisorio: true };
}

export function hobbiesDaCategoria(c: CategoriaId) {
  return catalogoHobbies.filter((h) => h.categoria === c);
}

/** Os seis hobbies do Figma (tela D4), que ficam no centro do canvas no onboarding. */
export const HOBBIES_ORIGINAIS: HobbyId[] = ['leitura', 'cinema', 'musica', 'escrita', 'jogos', 'atividade'];

/** Busca por nome ou termo, sem diferenciar acentos e maiúsculas. */
export function buscarHobbies(consulta: string) {
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const q = norm(consulta.trim());
  if (!q) return catalogoHobbies;
  return catalogoHobbies.filter((h) => [h.nome, ...(h.termos ?? [])].some((t) => norm(t).includes(q)));
}
