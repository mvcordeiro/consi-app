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
 * outros: nada de gesto de arrastar nem animação contínua, por isso a nuvem de emoções é fixa.
 */
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const pasta = path.join(raiz, 'modules/consi-widgets/android/src/main/res/layout');
fs.mkdirSync(pasta, { recursive: true });

const NS = 'xmlns:android="http://schemas.android.com/apk/res/android"';

/** Estilos de texto do DS (src/theme/tipografia.ts): fonte e tamanho. */
const ESTILOS = {
  'Títulos/Pequeno': ['consi_widget_flare_semibold', 18],
  'Texto/Pequeno': ['consi_widget_sans_book', 14],
  'Texto/Botões e rótulos': ['consi_widget_sans_medium', 14],
  'Legenda/Pequena': ['consi_widget_sans_book', 12],
};

/** `extra` pode trocar largura e gravidade: os atributos repetidos ficam de fora da base. */
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
  return `<TextView android:id="@+id/${id}" ${base} ${extra}/>`;
};

const img = (id, lado, extra = '') =>
  `<ImageView android:id="@+id/${id}" android:layout_width="${lado}dp" android:layout_height="${lado}dp" android:scaleType="fitCenter" android:src="@drawable/consi_emocao_vazio" ${extra}/>`;

/** Aglomerado do dia (como nos dias do Diário): a mais sentida no centro e até 4 em volta. */
const nuvem = () => `
      <FrameLayout android:id="@+id/nuvem" android:layout_width="112dp" android:layout_height="100dp">
        ${img('b1', 34, 'android:layout_gravity="top|start" android:layout_marginStart="2dp"')}
        ${img('b2', 30, 'android:layout_gravity="top|end" android:layout_marginTop="6dp"')}
        ${img('b3', 30, 'android:layout_gravity="bottom|start" android:layout_marginBottom="4dp"')}
        ${img('b4', 34, 'android:layout_gravity="bottom|end" android:layout_marginEnd="2dp"')}
        ${img('b0', 60, 'android:layout_gravity="center"')}
      </FrameLayout>
      ${img('vazio', 72, 'android:visibility="gone"')}`;

/** Ação / Botão do DS: pílula de 48 dp, ícone de 24 dp à esquerda e o rótulo. */
const botao = (id, rotulo, primario, icone, largura = 'match_parent', extra = '') => {
  const fundo = primario ? 'consi_widget_botao_primario' : 'consi_widget_botao_secundario';
  const corRotulo = primario ? 'consi_widget_botao_texto' : 'consi_widget_texto';
  const iconeXml = icone
    ? `
        <ImageView android:layout_width="24dp" android:layout_height="24dp" android:layout_marginEnd="8dp" android:src="@drawable/consi_widget_icone_${icone}" android:importantForAccessibility="no" />`
    : '';
  return `
      <LinearLayout android:id="@+id/${id}" android:layout_width="${largura}" android:layout_height="48dp" android:orientation="horizontal" android:gravity="center" android:paddingStart="16dp" android:paddingEnd="16dp" android:background="@drawable/${fundo}" ${extra}>${iconeXml}
        ${txt(`${id}_rotulo`, 'Texto/Botões e rótulos', corRotulo, `android:text="${rotulo}"`)}
      </LinearLayout>`;
};

/** Filtro / Etiqueta · Ativo (como na Home): balão de 16 dp e "Alegria · às 10:12". */
const etiqueta = (i, extra = '') => `
      <LinearLayout android:id="@+id/p${i}" android:layout_width="wrap_content" android:layout_height="28dp" android:orientation="horizontal" android:gravity="center_vertical" android:paddingStart="8dp" android:paddingEnd="12dp" android:background="@drawable/consi_widget_etiqueta" android:visibility="gone" ${extra}>
        ${img(`p${i}_balao`, 16, 'android:layout_marginEnd="6dp" android:importantForAccessibility="no"')}
        ${txt(`p${i}_texto`, 'Texto/Botões e rótulos', 'consi_widget_texto')}
      </LinearLayout>`;

const raizWidget = (corpo) => `<?xml version="1.0" encoding="utf-8"?>
<!-- Gerado por scripts/gerar-widgets-layouts.js (ids usados em Widgets.kt). Não edite à mão. -->
<FrameLayout ${NS}
  android:id="@android:id/background"
  android:layout_width="match_parent"
  android:layout_height="match_parent"
  android:background="@drawable/consi_widget_fundo"
  android:clipToOutline="true"
  android:padding="16dp">${corpo}
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

// ─── Médio (4×2): o dia + atalhos do DS ─────────────────────────────────────
const atalhos = [
  botao('acao_registrar', 'Registrar emoção', true, 'sorriso'),
  botao('acao_escrever', 'Escrever no Diário', false, 'diario', 'match_parent', 'android:layout_marginTop="8dp"'),
  botao('acao_atividades', 'Explorar atividades', false, 'atividade', 'match_parent', 'android:layout_marginTop="8dp"'),
].join('');
escrever(
  'medio',
  raizWidget(`
  <LinearLayout android:layout_width="match_parent" android:layout_height="match_parent" android:orientation="horizontal" android:gravity="center_vertical">
    <LinearLayout android:id="@+id/toque" android:layout_width="0dp" android:layout_height="match_parent" android:layout_weight="1" android:orientation="vertical" android:gravity="center">${nuvem()}
      ${txt('resumo', 'Texto/Pequeno', 'consi_widget_texto', 'android:layout_marginTop="8dp" android:text="Como você está?"')}
    </LinearLayout>
    <LinearLayout android:layout_width="196dp" android:layout_height="wrap_content" android:layout_marginStart="12dp" android:orientation="vertical">${atalhos}
    </LinearLayout>
  </LinearLayout>`),
);

// ─── Grande (4×4): check-in em três estados, trocados por visibilidade ──────
// Nuvem de escolha: as posições das 14 emoções na Home (src/data/emocoes.ts, frame de 436 px),
// espalhadas numa área de 300 × 250 dp, com balões de 44 dp.
const fonte = fs.readFileSync(path.join(raiz, 'src/data/emocoes.ts'), 'utf8');
const casa = [...fonte.matchAll(/\{ id: '([a-z]+)', nome: '[^']+'.*?x: (\d+), y: (\d+) \}/g)].map((m) => ({
  id: m[1],
  x: Number(m[2]),
  y: Number(m[3]),
}));
if (casa.length !== 14) throw new Error(`Esperava 14 emoções, achei ${casa.length}`);
const AREA_L = 300;
const AREA_A = 250;
const LADO = 44;
const minX = Math.min(...casa.map((e) => e.x));
const maxX = Math.max(...casa.map((e) => e.x));
const minY = Math.min(...casa.map((e) => e.y));
const maxY = Math.max(...casa.map((e) => e.y));
const sx = (AREA_L - LADO) / (maxX - minX);
const sy = (AREA_A - LADO) / (maxY - minY);
const escolha = casa
  .map((e, i) => {
    const x = Math.round((e.x - minX) * sx);
    const y = Math.round((e.y - minY) * sy);
    return `        ${img(`e${i}`, LADO, `android:layout_gravity="top|start" android:layout_marginStart="${x}dp" android:layout_marginTop="${y}dp"`)}`;
  })
  .join('\n');

const confirmar = [
  botao('confirmar_voltar', 'Escolher outra', false, null, '0dp', 'android:layout_weight="1"'),
  botao('confirmar_sim', 'Registrar', true, null, '0dp', 'android:layout_weight="1" android:layout_marginStart="8dp"'),
].join('');

escrever(
  'grande',
  raizWidget(`
  <LinearLayout android:id="@+id/inicio" android:layout_width="match_parent" android:layout_height="match_parent" android:orientation="vertical" android:gravity="center_horizontal">
    ${txt('inicio_titulo', 'Títulos/Pequeno', 'consi_widget_texto', 'android:text="Como você está?"')}
    ${txt('inicio_dica', 'Legenda/Pequena', 'consi_widget_texto_2', 'android:layout_marginTop="4dp" android:text="Toque no balão para registrar"')}
    <FrameLayout android:layout_width="match_parent" android:layout_height="0dp" android:layout_weight="1" android:layout_marginTop="12dp" android:layout_marginBottom="12dp">
      ${img('inicio_balao', 112, 'android:layout_gravity="center" android:contentDescription="Registrar uma emoção"')}
    </FrameLayout>
    <LinearLayout android:id="@+id/etiquetas_1" android:layout_width="wrap_content" android:layout_height="wrap_content" android:orientation="horizontal" android:gravity="center">${etiqueta(0)}${etiqueta(1, 'android:layout_marginStart="8dp"')}
    </LinearLayout>
    <LinearLayout android:id="@+id/etiquetas_2" android:layout_width="wrap_content" android:layout_height="wrap_content" android:layout_marginTop="8dp" android:orientation="horizontal" android:gravity="center">${etiqueta(2)}
    </LinearLayout>
  </LinearLayout>
  <LinearLayout android:id="@+id/escolha" android:layout_width="match_parent" android:layout_height="match_parent" android:orientation="vertical" android:visibility="gone">
    <LinearLayout android:layout_width="match_parent" android:layout_height="wrap_content" android:orientation="horizontal" android:gravity="center_vertical">
      ${txt('escolha_titulo', 'Títulos/Pequeno', 'consi_widget_texto', 'android:layout_width="0dp" android:layout_weight="1" android:gravity="start" android:text="Como você está agora?"')}
      <ImageView android:id="@+id/fechar" android:layout_width="40dp" android:layout_height="40dp" android:padding="8dp" android:src="@drawable/consi_widget_fechar" android:contentDescription="Voltar" />
    </LinearLayout>
    <FrameLayout android:layout_width="match_parent" android:layout_height="0dp" android:layout_weight="1" android:layout_marginTop="8dp">
      <FrameLayout android:layout_width="${AREA_L}dp" android:layout_height="${AREA_A}dp" android:layout_gravity="center">
${escolha}
      </FrameLayout>
    </FrameLayout>
  </LinearLayout>
  <LinearLayout android:id="@+id/confirmar" android:layout_width="match_parent" android:layout_height="match_parent" android:orientation="vertical" android:visibility="gone">
    <LinearLayout android:layout_width="match_parent" android:layout_height="0dp" android:layout_weight="1" android:orientation="vertical" android:gravity="center">
      ${img('confirmar_balao', 120)}
      ${txt('confirmar_nome', 'Títulos/Pequeno', 'consi_widget_texto', 'android:layout_marginTop="8dp"')}
      ${txt('confirmar_pergunta', 'Texto/Pequeno', 'consi_widget_texto_2', 'android:layout_marginTop="4dp" android:text="Registrar essa emoção agora?"')}
    </LinearLayout>
    <LinearLayout android:layout_width="match_parent" android:layout_height="wrap_content" android:layout_marginTop="16dp" android:orientation="horizontal">${confirmar}
    </LinearLayout>
  </LinearLayout>`),
);

console.log('Layouts dos widgets gerados em', path.relative(raiz, pasta));
