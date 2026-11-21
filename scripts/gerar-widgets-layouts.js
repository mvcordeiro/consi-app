/* global __dirname */
/**
 * Gera os layouts dos widgets Android (modules/consi-widgets/android/src/main/res/layout).
 *
 *   node scripts/gerar-widgets-layouts.js
 *
 * Espelha os frames da seção "12 · WIDGETS E NOTIFICAÇÕES" do Figma (Consi - Design de Interação):
 * fontes e tamanhos dos estilos de texto do DS, botões "Ação / Botão" com ícone à esquerda,
 * etiquetas "Filtro / Etiqueta · Ativo" e espaçamentos space/4, 8, 12, 16. Os ids batem com
 * Widgets.kt. RemoteViews só aceita FrameLayout, LinearLayout, TextView, ImageView e poucos
 * outros: nada de gesto de arrastar nem animação contínua.
 *
 * Widgets que mudam com o tamanho têm um layout por variação (ex.: consi_widget_medio_icones);
 * Widgets.kt escolhe qual usar para cada tamanho em que o launcher mostra o widget.
 */
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const pasta = path.join(raiz, 'modules/consi-widgets/android/src/main/res/layout');
fs.mkdirSync(pasta, { recursive: true });
for (const f of fs.readdirSync(pasta)) if (f.startsWith('consi_widget_')) fs.unlinkSync(path.join(pasta, f));

const NS = 'xmlns:android="http://schemas.android.com/apk/res/android"';

/** Estilos de texto do DS (src/theme/tipografia.ts): fonte e tamanho. */
const ESTILOS = {
  'Títulos/Pequeno': ['consi_widget_flare_semibold', 18],
  'Texto/Médio': ['consi_widget_sans_book', 16],
  'Texto/Pequeno': ['consi_widget_sans_book', 14],
  'Texto/Botões e rótulos': ['consi_widget_sans_medium', 14],
  'Legenda/Pequena': ['consi_widget_sans_book', 12],
};

/** `extra` pode trocar largura, linhas e gravidade: os atributos repetidos ficam de fora da base. */
const txt = (id, estilo, cor, extra = '') => {
  const [fonte, tam] = ESTILOS[estilo];
  const base = [
    ['android:layout_width', 'wrap_content'],
    ['android:layout_height', 'wrap_content'],
    ['android:fontFamily', `@font/${fonte}`],
    ['android:textSize', `${tam}sp`],
    ['android:textColor', `@color/${cor}`],
    ['android:includeFontPadding', 'false'],
    ['android:maxLines', '1'],
    ['android:ellipsize', 'end'],
    ['android:gravity', 'center'],
  ]
    .filter(([nome]) => !extra.includes(`${nome}=`))
    .map(([nome, valor]) => `${nome}="${valor}"`)
    .join(' ');
  return `<TextView${id ? ` android:id="@+id/${id}"` : ''} ${base} ${extra}/>`;
};

const img = (id, lado, extra = '') =>
  `<ImageView android:id="@+id/${id}" android:layout_width="${lado}dp" android:layout_height="${lado}dp" android:scaleType="fitCenter" android:src="@drawable/consi_emocao_vazio" ${extra}/>`;

/** Aglomerado do dia (como nos dias do Diário): a mais sentida no centro e até 4 em volta. */
const nuvem = (k = 1) => {
  const d = (v) => Math.round(v * k);
  return `
      <FrameLayout android:id="@+id/nuvem" android:layout_width="${d(112)}dp" android:layout_height="${d(100)}dp">
        ${img('b1', d(34), `android:layout_gravity="top|start" android:layout_marginStart="${d(2)}dp"`)}
        ${img('b2', d(30), `android:layout_gravity="top|end" android:layout_marginTop="${d(6)}dp"`)}
        ${img('b3', d(30), `android:layout_gravity="bottom|start" android:layout_marginBottom="${d(4)}dp"`)}
        ${img('b4', d(34), `android:layout_gravity="bottom|end" android:layout_marginEnd="${d(2)}dp"`)}
        ${img('b0', d(60), 'android:layout_gravity="center"')}
      </FrameLayout>
      ${img('vazio', d(72), 'android:visibility="gone"')}`;
};

const fundoBotao = (primario) => (primario ? 'consi_widget_botao_primario' : 'consi_widget_botao_secundario');

/** Ação / Botão do DS: pílula, ícone de 24 dp à esquerda e o rótulo. */
const botao = (id, rotulo, primario, icone, { largura = 'match_parent', altura = 44, extra = '' } = {}) => {
  const corRotulo = primario ? 'consi_widget_botao_texto' : 'consi_widget_texto';
  const iconeXml = icone
    ? `
        <ImageView android:layout_width="24dp" android:layout_height="24dp" android:layout_marginEnd="8dp" android:src="@drawable/consi_widget_icone_${icone}" android:importantForAccessibility="no" />`
    : '';
  return `
      <LinearLayout android:id="@+id/${id}" android:layout_width="${largura}" android:layout_height="${altura}dp" android:orientation="horizontal" android:gravity="center" android:paddingStart="16dp" android:paddingEnd="16dp" android:background="@drawable/${fundoBotao(primario)}" ${extra}>${iconeXml}
        ${txt(`${id}_rotulo`, 'Texto/Botões e rótulos', corRotulo, `android:text="${rotulo}"`)}
      </LinearLayout>`;
};

/** O mesmo botão só com o ícone (versões pequenas do widget de atalhos). */
const botaoIcone = (id, descricao, primario, icone, { lado = 44, extra = '' } = {}) => `
      <FrameLayout android:id="@+id/${id}" android:layout_width="${lado}dp" android:layout_height="${lado}dp" android:background="@drawable/${fundoBotao(primario)}" android:contentDescription="${descricao}" ${extra}>
        <ImageView android:layout_width="24dp" android:layout_height="24dp" android:layout_gravity="center" android:src="@drawable/consi_widget_icone_${icone}" android:importantForAccessibility="no" />
      </FrameLayout>`;

/** Filtro / Etiqueta · Ativo (como na Home): balão de 16 dp e "Alegria · às 10:12". */
const etiqueta = (i, extra = '') => `
      <LinearLayout android:id="@+id/p${i}" android:layout_width="wrap_content" android:layout_height="28dp" android:orientation="horizontal" android:gravity="center_vertical" android:paddingStart="8dp" android:paddingEnd="12dp" android:background="@drawable/consi_widget_etiqueta" android:visibility="gone" ${extra}>
        ${img(`p${i}_balao`, 16, 'android:layout_marginEnd="6dp" android:importantForAccessibility="no"')}
        ${txt(`p${i}_texto`, 'Texto/Botões e rótulos', 'consi_widget_texto')}
      </LinearLayout>`;

const raizWidget = (corpo, padding = 16) => `<?xml version="1.0" encoding="utf-8"?>
<!-- Gerado por scripts/gerar-widgets-layouts.js (ids usados em Widgets.kt). Não edite à mão. -->
<FrameLayout ${NS}
  android:id="@android:id/background"
  android:layout_width="match_parent"
  android:layout_height="match_parent"
  android:background="@drawable/consi_widget_fundo"
  android:clipToOutline="true"
  android:padding="${padding}dp">${corpo}
</FrameLayout>
`;

const escrever = (nome, xml) => fs.writeFileSync(path.join(pasta, `consi_widget_${nome}.xml`), xml);

// ─── Pequeno (2×2) ──────────────────────────────────────────────────────────
escrever(
  'pequeno',
  raizWidget(`
  <LinearLayout android:id="@+id/toque" android:layout_width="match_parent" android:layout_height="match_parent" android:orientation="vertical" android:gravity="center">${nuvem()}
      ${txt('resumo', 'Texto/Pequeno', 'consi_widget_texto', 'android:layout_marginTop="8dp" android:text="Como você está?"')}
      ${txt('dica', 'Legenda/Pequena', 'consi_widget_texto_2', 'android:layout_marginTop="4dp" android:text="Toque para escrever" android:visibility="gone"')}
  </LinearLayout>`),
);

// ─── Atalhos: quatro variações, do maior para o menor ───────────────────────
const ATALHOS = [
  ['acao_registrar', 'Registrar emoção', true, 'sorriso'],
  ['acao_escrever', 'Escrever no Diário', false, 'diario'],
  ['acao_atividades', 'Explorar atividades', false, 'atividade'],
];
const atalhosTexto = ATALHOS.map(([id, r, p, i], n) => botao(id, r, p, i, { extra: n ? 'android:layout_marginTop="6dp"' : '' })).join('');
const atalhosIcone = (vertical) =>
  ATALHOS.map(([id, r, p, i], n) =>
    botaoIcone(id, r, p, i, { extra: n ? (vertical ? 'android:layout_marginTop="6dp"' : 'android:layout_marginStart="8dp"') : '' }),
  ).join('');

// Completo: o dia à esquerda e os três botões com texto.
escrever(
  'medio',
  raizWidget(`
  <LinearLayout android:layout_width="match_parent" android:layout_height="match_parent" android:orientation="horizontal" android:gravity="center_vertical">
    <LinearLayout android:id="@+id/toque" android:layout_width="0dp" android:layout_height="match_parent" android:layout_weight="1" android:orientation="vertical" android:gravity="center">${nuvem()}
      ${txt('resumo', 'Texto/Pequeno', 'consi_widget_texto', 'android:layout_marginTop="8dp" android:text="Como você está?"')}
    </LinearLayout>
    <LinearLayout android:layout_width="188dp" android:layout_height="wrap_content" android:layout_marginStart="12dp" android:orientation="vertical">${atalhosTexto}
    </LinearLayout>
  </LinearLayout>`),
);
// Estreito e alto: só os três botões com texto.
escrever(
  'medio_texto',
  raizWidget(`
  <LinearLayout android:layout_width="match_parent" android:layout_height="match_parent" android:orientation="vertical" android:gravity="center">${atalhosTexto}
  </LinearLayout>`),
);
// Largo e baixo: o dia menor e os botões só com ícone, numa fileira.
escrever(
  'medio_dia_icones',
  raizWidget(
    `
  <LinearLayout android:layout_width="match_parent" android:layout_height="match_parent" android:orientation="horizontal" android:gravity="center_vertical">
    <LinearLayout android:id="@+id/toque" android:layout_width="0dp" android:layout_height="match_parent" android:layout_weight="1" android:orientation="horizontal" android:gravity="center_vertical">${nuvem(0.7)}
      ${txt('resumo', 'Texto/Pequeno', 'consi_widget_texto', 'android:layout_marginStart="8dp" android:maxLines="2" android:gravity="start" android:text="Como você está?"')}
    </LinearLayout>
    <LinearLayout android:layout_width="wrap_content" android:layout_height="wrap_content" android:layout_marginStart="12dp" android:orientation="horizontal">${atalhosIcone(false)}
    </LinearLayout>
  </LinearLayout>`,
    12,
  ),
);
// O menor: só os três ícones.
escrever(
  'medio_icones',
  raizWidget(
    `
  <LinearLayout android:layout_width="match_parent" android:layout_height="match_parent" android:orientation="horizontal" android:gravity="center">${atalhosIcone(false)}
  </LinearLayout>`,
    12,
  ),
);

// ─── Grande (4×4): check-in em três estados, trocados por visibilidade ──────
// A nuvem de escolha usa as posições das emoções na Home. Estas margens valem para Android 11 e
// anteriores (área pequena, para caber em qualquer 4×4); do Android 12 em diante Widgets.kt
// recalcula tamanho e posição de cada balão para o tamanho real do widget.
const fonte = fs.readFileSync(path.join(raiz, 'src/data/emocoes.ts'), 'utf8');
const casa = [...fonte.matchAll(/\{ id: '([a-z]+)', nome: '[^']+'.*?x: (\d+), y: (\d+) \}/g)].map((m) => ({
  x: Number(m[2]),
  y: Number(m[3]),
}));
if (casa.length !== 14) throw new Error(`Esperava 14 emoções, achei ${casa.length}`);
const AREA_L = 240;
const AREA_A = 180;
const LADO = 36;
const minX = Math.min(...casa.map((e) => e.x));
const maxX = Math.max(...casa.map((e) => e.x));
const minY = Math.min(...casa.map((e) => e.y));
const maxY = Math.max(...casa.map((e) => e.y));
const escolha = casa
  .map((e, i) => {
    const x = Math.round(((e.x - minX) / (maxX - minX)) * (AREA_L - LADO));
    const y = Math.round(((e.y - minY) / (maxY - minY)) * (AREA_A - LADO));
    return `        ${img(`e${i}`, LADO, `android:layout_gravity="top|start" android:layout_marginStart="${x}dp" android:layout_marginTop="${y}dp"`)}`;
  })
  .join('\n');

const confirmar = [
  botao('confirmar_voltar', 'Escolher outra', false, null, { largura: '0dp', extra: 'android:layout_weight="1"' }),
  botao('confirmar_sim', 'Registrar', true, null, { largura: '0dp', extra: 'android:layout_weight="1" android:layout_marginStart="8dp"' }),
].join('');

escrever(
  'grande',
  raizWidget(`
  <LinearLayout android:id="@+id/inicio" android:layout_width="match_parent" android:layout_height="match_parent" android:orientation="vertical" android:gravity="center_horizontal">
    ${txt('inicio_titulo', 'Títulos/Pequeno', 'consi_widget_texto', 'android:text="Como você está?"')}
    ${txt('inicio_dica', 'Legenda/Pequena', 'consi_widget_texto_2', 'android:layout_marginTop="4dp" android:text="Toque no balão para registrar"')}
    <FrameLayout android:layout_width="match_parent" android:layout_height="0dp" android:layout_weight="1" android:layout_marginTop="12dp" android:layout_marginBottom="12dp">
      ${img('inicio_balao', 96, 'android:layout_gravity="center" android:contentDescription="Registrar uma emoção"')}
    </FrameLayout>
    <LinearLayout android:id="@+id/etiquetas_1" android:layout_width="wrap_content" android:layout_height="wrap_content" android:orientation="horizontal" android:gravity="center">${etiqueta(0)}${etiqueta(1, 'android:layout_marginStart="8dp"')}
    </LinearLayout>
    <LinearLayout android:id="@+id/etiquetas_2" android:layout_width="wrap_content" android:layout_height="wrap_content" android:layout_marginTop="8dp" android:orientation="horizontal" android:gravity="center">${etiqueta(2)}
    </LinearLayout>
  </LinearLayout>
  <LinearLayout android:id="@+id/escolha" android:layout_width="match_parent" android:layout_height="match_parent" android:orientation="vertical" android:visibility="gone">
    <LinearLayout android:layout_width="match_parent" android:layout_height="40dp" android:orientation="horizontal" android:gravity="center_vertical">
      ${txt('escolha_titulo', 'Títulos/Pequeno', 'consi_widget_texto', 'android:layout_width="0dp" android:layout_weight="1" android:gravity="start" android:text="Como você está agora?"')}
      <ImageView android:id="@+id/fechar" android:layout_width="40dp" android:layout_height="40dp" android:padding="8dp" android:src="@drawable/consi_widget_fechar" android:contentDescription="Voltar" />
    </LinearLayout>
    <FrameLayout android:id="@+id/escolha_area" android:layout_width="match_parent" android:layout_height="0dp" android:layout_weight="1" android:layout_marginTop="8dp">
      <FrameLayout android:id="@+id/escolha_nuvem" android:layout_width="${AREA_L}dp" android:layout_height="${AREA_A}dp" android:layout_gravity="center">
${escolha}
      </FrameLayout>
    </FrameLayout>
  </LinearLayout>
  <LinearLayout android:id="@+id/confirmar" android:layout_width="match_parent" android:layout_height="match_parent" android:orientation="vertical" android:visibility="gone">
    <LinearLayout android:layout_width="match_parent" android:layout_height="0dp" android:layout_weight="1" android:orientation="vertical" android:gravity="center">
      ${img('confirmar_balao', 104)}
      ${txt('confirmar_nome', 'Títulos/Pequeno', 'consi_widget_texto', 'android:layout_marginTop="8dp"')}
      ${txt('confirmar_pergunta', 'Texto/Pequeno', 'consi_widget_texto_2', 'android:layout_marginTop="4dp" android:text="Registrar essa emoção agora?"')}
    </LinearLayout>
    <LinearLayout android:layout_width="match_parent" android:layout_height="wrap_content" android:layout_marginTop="16dp" android:orientation="horizontal">${confirmar}
    </LinearLayout>
  </LinearLayout>`),
);

// ─── Suas atividades: as atividades em andamento ────────────────────────────
const linhaAtividade = (i) => `
    <LinearLayout android:id="@+id/a${i}" android:layout_width="match_parent" android:layout_height="56dp" android:layout_marginTop="8dp" android:orientation="vertical" android:gravity="center_vertical" android:paddingStart="16dp" android:paddingEnd="16dp" android:background="@drawable/consi_widget_cartao" android:visibility="gone">
      ${txt(`a${i}_titulo`, 'Texto/Botões e rótulos', 'consi_widget_texto', 'android:layout_width="match_parent" android:gravity="start"')}
      ${txt(`a${i}_detalhe`, 'Legenda/Pequena', 'consi_widget_texto_2', 'android:layout_width="match_parent" android:layout_marginTop="4dp" android:gravity="start"')}
    </LinearLayout>`;
escrever(
  'atividades',
  raizWidget(`
  <LinearLayout android:layout_width="match_parent" android:layout_height="match_parent" android:orientation="vertical">
    <LinearLayout android:id="@+id/atividades_topo" android:layout_width="match_parent" android:layout_height="wrap_content" android:orientation="horizontal" android:gravity="center_vertical">
      ${txt(null, 'Títulos/Pequeno', 'consi_widget_texto', 'android:layout_width="0dp" android:layout_weight="1" android:gravity="start" android:text="Suas atividades"')}
      ${txt('atividades_total', 'Legenda/Pequena', 'consi_widget_texto_2')}
    </LinearLayout>${[0, 1, 2].map(linhaAtividade).join('')}
    <LinearLayout android:id="@+id/atividades_vazio" android:layout_width="match_parent" android:layout_height="0dp" android:layout_weight="1" android:orientation="vertical" android:gravity="center" android:visibility="gone">
      ${txt(null, 'Texto/Pequeno', 'consi_widget_texto_2', 'android:maxLines="2" android:text="Nenhuma atividade em andamento"')}
      ${botao('atividades_explorar', 'Explorar atividades', false, 'atividade', { largura: 'wrap_content', extra: 'android:layout_marginTop="12dp"' })}
    </LinearLayout>
  </LinearLayout>`),
);

// ─── Uma frase: as frases filosóficas da pausa ──────────────────────────────
escrever(
  'frase',
  raizWidget(`
  <LinearLayout android:layout_width="match_parent" android:layout_height="match_parent" android:orientation="vertical">
    ${txt('frase_rotulo', 'Legenda/Pequena', 'consi_widget_texto_2', 'android:text="Para pensar um pouco"')}
    <LinearLayout android:layout_width="match_parent" android:layout_height="0dp" android:layout_weight="1" android:orientation="vertical" android:gravity="center_vertical">
      ${txt('frase_texto', 'Texto/Médio', 'consi_widget_texto', 'android:layout_width="match_parent" android:gravity="start" android:maxLines="6" android:lineSpacingExtra="4dp"')}
      ${txt('frase_autor', 'Legenda/Pequena', 'consi_widget_texto_2', 'android:layout_width="match_parent" android:layout_marginTop="8dp" android:gravity="start"')}
    </LinearLayout>
    <LinearLayout android:layout_width="match_parent" android:layout_height="wrap_content" android:orientation="horizontal" android:gravity="end">${botao(
      'frase_outra',
      'Outra frase',
      false,
      null,
      { largura: 'wrap_content', altura: 36 },
    )}
    </LinearLayout>
  </LinearLayout>`),
);

// ─── Para você: uma atividade sugerida, como o card da aba Hobbies ──────────
escrever(
  'sugestao',
  raizWidget(`
  <LinearLayout android:layout_width="match_parent" android:layout_height="match_parent" android:orientation="vertical">
    <LinearLayout android:layout_width="match_parent" android:layout_height="wrap_content" android:orientation="horizontal" android:gravity="center_vertical">
      ${txt(null, 'Legenda/Pequena', 'consi_widget_texto_2', 'android:layout_width="0dp" android:layout_weight="1" android:gravity="start" android:text="Para você"')}
      <LinearLayout android:id="@+id/sugestao_etiqueta" android:layout_width="wrap_content" android:layout_height="28dp" android:orientation="horizontal" android:gravity="center_vertical" android:paddingStart="12dp" android:paddingEnd="12dp" android:background="@drawable/consi_widget_etiqueta">
        ${txt('sugestao_hobby', 'Texto/Botões e rótulos', 'consi_widget_texto')}
      </LinearLayout>
    </LinearLayout>
    <LinearLayout android:layout_width="match_parent" android:layout_height="0dp" android:layout_weight="1" android:orientation="vertical" android:gravity="center_vertical">
      ${txt('sugestao_titulo', 'Títulos/Pequeno', 'consi_widget_texto', 'android:layout_width="match_parent" android:gravity="start" android:maxLines="2"')}
      ${txt('sugestao_resumo', 'Texto/Pequeno', 'consi_widget_texto_2', 'android:layout_width="match_parent" android:layout_marginTop="4dp" android:gravity="start" android:maxLines="2"')}
      ${txt('sugestao_minutos', 'Legenda/Pequena', 'consi_widget_texto_2', 'android:layout_width="match_parent" android:layout_marginTop="8dp" android:gravity="start"')}
    </LinearLayout>
    <LinearLayout android:layout_width="match_parent" android:layout_height="wrap_content" android:layout_marginTop="12dp" android:orientation="horizontal">${botao(
      'sugestao_nao',
      'Não agora',
      false,
      null,
      { largura: '0dp', extra: 'android:layout_weight="1"' },
    )}${botao('sugestao_sim', 'Explorar', true, null, { largura: '0dp', extra: 'android:layout_weight="1" android:layout_marginStart="8dp"' })}
    </LinearLayout>
  </LinearLayout>`),
);

console.log('Layouts dos widgets gerados em', path.relative(raiz, pasta));
