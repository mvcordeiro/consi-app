/* global __dirname */
// Gera src/components/icones.ts a partir dos SVGs do Design System salvos em assets/icones/
// (mais alguns ícones de telas que já existiam). Rode com: node scripts/gerar-icones.js
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const dir = path.join(raiz, 'assets/icones');

/** Ícones que já estavam em outras pastas de assets. */
const extras = [
  ['conversa', 'assets/hobbies/conversa.svg'],
  ['lixeira', 'assets/hobbies/lixeira.svg'],
  ['menu-horizontal', 'assets/hobbies/menu-horizontal.svg'],
  ['engrenagem', 'assets/hobbies/engrenagem.svg'],
  ['rosto-positivo', 'assets/hobbies/rosto-positivo.svg'],
  ['rosto-mal-humorado', 'assets/hobbies/rosto-mal-humorado.svg'],
  ['filtrar-musicas', 'assets/hobbies/filtrar-musicas.svg'],
  ['rolo-filme', 'assets/hobbies/rolo-filme-16.svg'],
  ['relogio', 'assets/home/icone-relogio.svg'],
  // ícones dos hobbies originais, desenhados para o onboarding (tela D4)
  ['hobby-leitura', 'assets/onboarding/hobby-leitura.svg'],
  ['hobby-escrita', 'assets/onboarding/hobby-escrita.svg'],
  ['hobby-jogos', 'assets/onboarding/hobby-jogos.svg'],
  ['hobby-atividade', 'assets/onboarding/hobby-atividade.svg'],
];

const itens = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith('.svg'))
  .map((f) => [f.slice(0, -4), `assets/icones/${f}`])
  .concat(extras)
  .sort((a, b) => a[0].localeCompare(b[0]));

const pascal = (s) => s.split('-').map((p) => p[0].toUpperCase() + p.slice(1)).join('');

let importacoes = '';
let registro = '';
for (const [nome, arquivo] of itens) {
  const svg = fs.readFileSync(path.join(raiz, arquivo), 'utf8');
  const m = svg.match(/width="([\d.]+)" height="([\d.]+)"/);
  if (!m) throw new Error(`Sem width/height: ${arquivo}`);
  importacoes += `import ${pascal(nome)} from '../../${arquivo}';\n`;
  registro += `  '${nome}': [${pascal(nome)}, ${+m[1]}, ${+m[2]}],\n`;
}

const saida = `// Gerado a partir dos SVGs exportados do Design System (Figma "Consi - Design System",
// página Variáveis e Ícones, frame 148:1179 — Streamline Freehand). Não edite à mão:
// para incluir um ícone, salve o SVG em assets/icones/ e rode node scripts/gerar-icones.js.
import type { IconeSvg } from './onboarding/assets';

${importacoes}
/** Nome do ícone → [componente, largura natural, altura natural]. */
export const icones = {
${registro}} satisfies Record<string, [IconeSvg, number, number]>;

export type NomeIcone = keyof typeof icones;
`;

fs.writeFileSync(path.join(raiz, 'src/components/icones.ts'), saida);
console.log(`${itens.length} ícones`);
