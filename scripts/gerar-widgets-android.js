/* global __dirname */
/**
 * Gera os balões de emoção dos widgets Android (modules/consi-widgets) a partir dos SVGs da Home.
 *
 *   node scripts/gerar-widgets-android.js
 *
 * Cada balão vira um VectorDrawable: a textura recortada no círculo da máscara (o mesmo
 * `circulo` de src/data/emocoes.ts) e, por cima, o contorno e o rosto. As cores do SVG viram
 * recursos (@color/consi_balao e @color/consi_traco), que mudam sozinhos no modo escuro
 * (values-night). Também gera Emocoes.kt com a lista (id, nome, drawable) na ordem da Home.
 * Rode de novo sempre que um SVG de emoção mudar.
 */
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const pastaSvg = path.join(raiz, 'assets/home/emocoes');
const modulo = path.join(raiz, 'modules/consi-widgets/android/src/main');
const pastaDrawable = path.join(modulo, 'res/drawable');
const RAIO_MASCARA = 42;

const CORES = {
  white: '@color/consi_traco',
  '#ffffff': '@color/consi_traco',
  '#4362e5': '@color/consi_balao',
};

// ─── Emoções: id, nome e círculo da máscara, lidos de src/data/emocoes.ts ───
const fonte = fs.readFileSync(path.join(raiz, 'src/data/emocoes.ts'), 'utf8');
const emocoes = [...fonte.matchAll(/\{ id: '([a-z]+)', nome: '([^']+)'.*?circulo: \{ cx: ([\d.]+), cy: ([\d.]+) \}/g)].map(
  (m) => ({ id: m[1], nome: m[2], cx: Number(m[3]), cy: Number(m[4]) }),
);
if (emocoes.length !== 14) throw new Error(`Esperava 14 emoções em emocoes.ts, achei ${emocoes.length}`);

// ─── SVG → elementos simples ────────────────────────────────────────────────
function atributos(tag) {
  const a = {};
  for (const m of tag.matchAll(/([a-zA-Z-]+)="([^"]*)"/g)) a[m[1]] = m[2];
  return a;
}

/** Aplica transform="matrix(...)" ou "rotate(θ x y)" a um ponto. */
function transformar(t, x, y) {
  if (!t) return [x, y];
  let m = t.match(/matrix\(([^)]+)\)/);
  if (m) {
    const [a, b, c, d, e, f] = m[1].split(/[\s,]+/).map(Number);
    return [a * x + c * y + e, b * x + d * y + f];
  }
  m = t.match(/rotate\(([^)]+)\)/);
  if (m) {
    const [g, ox = 0, oy = 0] = m[1].split(/[\s,]+/).map(Number);
    const r = (g * Math.PI) / 180;
    const dx = x - ox;
    const dy = y - oy;
    return [ox + dx * Math.cos(r) - dy * Math.sin(r), oy + dx * Math.sin(r) + dy * Math.cos(r)];
  }
  throw new Error(`transform não suportado: ${t}`);
}

const n = (v) => Number(v.toFixed(4));

const circuloPath = (cx, cy, r) => `M${n(cx - r)},${n(cy)} a${r},${r} 0 1,0 ${n(2 * r)},0 a${r},${r} 0 1,0 ${n(-2 * r)},0 Z`;

function retanguloPath(x, y, w, h, rx) {
  if (!rx) return `M${x},${y} h${w} v${h} h${-w} Z`;
  return [
    `M${n(x + rx)},${y}`,
    `h${n(w - 2 * rx)}`,
    `a${rx},${rx} 0 0,1 ${rx},${rx}`,
    `v${n(h - 2 * rx)}`,
    `a${rx},${rx} 0 0,1 ${-rx},${rx}`,
    `h${n(-(w - 2 * rx))}`,
    `a${rx},${rx} 0 0,1 ${-rx},${-rx}`,
    `v${n(-(h - 2 * rx))}`,
    `a${rx},${rx} 0 0,1 ${rx},${-rx}`,
    'Z',
  ].join(' ');
}

function cor(v) {
  if (!v || v === 'none') return null;
  const c = CORES[v.toLowerCase()];
  if (!c) throw new Error(`cor sem recurso: ${v}`);
  return c;
}

/** Os desenhos de um SVG, na ordem, como <path> do VectorDrawable. */
function caminhos(arquivo, recuo) {
  const svg = fs.readFileSync(path.join(pastaSvg, arquivo), 'utf8');
  const saida = [];
  for (const m of svg.matchAll(/<(path|circle|rect)\b([^>]*)\/?>/g)) {
    const a = atributos(m[2]);
    let d;
    if (m[1] === 'path') d = a.d;
    else if (m[1] === 'circle') {
      const [cx, cy] = transformar(a.transform, Number(a.cx), Number(a.cy));
      d = circuloPath(cx, cy, Number(a.r));
    } else {
      if (a.transform) throw new Error(`rect com transform em ${arquivo}`);
      d = retanguloPath(Number(a.x), Number(a.y), Number(a.width), Number(a.height), Number(a.rx || 0));
    }
    const linhas = [`<path android:pathData="${d}"`];
    const preenche = cor(a.fill);
    if (preenche) linhas.push(`android:fillColor="${preenche}"`);
    if (a['fill-rule'] === 'evenodd') linhas.push('android:fillType="evenOdd"');
    const traco = cor(a.stroke);
    if (traco) {
      linhas.push(`android:strokeColor="${traco}"`);
      linhas.push(`android:strokeWidth="${a['stroke-width'] || 1}"`);
      if (a['stroke-linecap']) linhas.push(`android:strokeLineCap="${a['stroke-linecap']}"`);
      if (a['stroke-linejoin']) linhas.push(`android:strokeLineJoin="${a['stroke-linejoin']}"`);
    }
    saida.push(recuo + linhas.join(`\n${recuo}  `) + ' />');
  }
  return saida;
}

function vetor(corpo) {
  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<!-- Gerado por scripts/gerar-widgets-android.js a partir de assets/home/emocoes. Não edite à mão. -->',
    '<vector xmlns:android="http://schemas.android.com/apk/res/android"',
    '  android:width="90dp"',
    '  android:height="90dp"',
    '  android:viewportWidth="90"',
    '  android:viewportHeight="90">',
    ...corpo,
    '</vector>',
    '',
  ].join('\n');
}

fs.mkdirSync(pastaDrawable, { recursive: true });

for (const e of emocoes) {
  const corpo = [
    '  <group android:name="textura">',
    `    <clip-path android:pathData="${circuloPath(e.cx, e.cy, RAIO_MASCARA)}" />`,
    ...caminhos(`emocao-${e.id}-textura.svg`, '    '),
    '  </group>',
    ...caminhos(`emocao-${e.id}.svg`, '  '),
  ];
  fs.writeFileSync(path.join(pastaDrawable, `consi_emocao_${e.id}.xml`), vetor(corpo));
}
// O balão "?" do estado inicial (sem textura).
fs.writeFileSync(path.join(pastaDrawable, 'consi_emocao_vazio.xml'), vetor(caminhos('emocao-vazio.svg', '  ')));

// ─── Ícones dos botões (DS "Ícones": Sorriso, Diário, Atividade) ────────────
// Exportados do Figma para assets/widgets. Toda a pintura vira a cor do rótulo do botão:
// text/on-primary no primário (Registrar emoção) e text/primary nos secundários.
const ICONES = [
  ['sorriso', '@color/consi_widget_botao_texto'],
  ['diario', '@color/consi_widget_texto'],
  ['atividade', '@color/consi_widget_texto'],
];
for (const [nome, corIcone] of ICONES) {
  const svg = fs.readFileSync(path.join(raiz, `assets/widgets/icone-${nome}.svg`), 'utf8');
  const corpo = [...svg.matchAll(/<path\b([^>]*)\/?>/g)].map((m) => {
    const a = atributos(m[1]);
    const linhas = [`<path android:pathData="${a.d}"`, `android:fillColor="${corIcone}"`];
    if (a['fill-rule'] === 'evenodd') linhas.push('android:fillType="evenOdd"');
    return '  ' + linhas.join('\n    ') + ' />';
  });
  fs.writeFileSync(
    path.join(pastaDrawable, `consi_widget_icone_${nome}.xml`),
    vetor(corpo).replace(/90dp/g, '24dp').replace(/"90"/g, '"24"'),
  );
}

// ─── Fontes do DS (TMT Limkin = Consi Sans / Consi Flare) ───────────────────
// Nomes próprios do módulo, para não colidir com a fonte do consi-pausa.
const pastaFonte = path.join(modulo, 'res/font');
fs.mkdirSync(pastaFonte, { recursive: true });
for (const [arquivo, destino] of [
  ['ConsiSans-Book.ttf', 'consi_widget_sans_book.ttf'],
  ['ConsiSans-Medium.ttf', 'consi_widget_sans_medium.ttf'],
  ['ConsiFlare-SemiBold.ttf', 'consi_widget_flare_semibold.ttf'],
]) {
  fs.copyFileSync(path.join(raiz, 'assets/fonts', arquivo), path.join(pastaFonte, destino));
}

// ─── Emocoes.kt ─────────────────────────────────────────────────────────────
const kt = [
  '// Gerado por scripts/gerar-widgets-android.js a partir de src/data/emocoes.ts. Não edite à mão.',
  'package expo.modules.consiwidgets',
  '',
  '/** Uma emoção da Home: o id (o mesmo do JS), o nome e o balão. */',
  'internal data class Emocao(val id: String, val nome: String, val balao: Int)',
  '',
  '/** As 14 emoções, na ordem da Home. */',
  'internal val EMOCOES = listOf(',
  ...emocoes.map((e) => `  Emocao("${e.id}", "${e.nome}", R.drawable.consi_emocao_${e.id}),`),
  ')',
  '',
  'internal fun emocaoPorId(id: String?) = EMOCOES.firstOrNull { it.id == id }',
  '',
];
const pastaKt = path.join(modulo, 'java/expo/modules/consiwidgets');
fs.mkdirSync(pastaKt, { recursive: true });
fs.writeFileSync(path.join(pastaKt, 'Emocoes.kt'), kt.join('\n'));

console.log(`${emocoes.length + 1} balões e Emocoes.kt gerados em ${path.relative(raiz, modulo)}`);
