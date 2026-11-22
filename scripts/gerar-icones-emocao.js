/* global __dirname */
/**
 * Gera os ícones do app por emoção (modules/consi-widgets) a partir dos balões dos widgets.
 *
 *   node scripts/gerar-icones-emocao.js
 *
 * Para cada emoção de src/data/emocoes.ts cria um ícone adaptativo (Android 8+) e um ícone
 * simples (Android 7): fundo `consi_icone_fundo` + o balão `consi_emocao_<id>` no centro.
 * As cores vêm de recursos e mudam com o modo escuro (azul no escuro, laranja no claro, como
 * no Figma). Rode `node scripts/gerar-widgets-android.js` antes se um SVG de emoção mudou.
 * Os apelidos (activity-alias) que o launcher usa são criados por plugins/withIconeEmocao.js.
 */
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const res = path.join(raiz, 'modules/consi-widgets/android/src/main/res');
const fonte = fs.readFileSync(path.join(raiz, 'src/data/emocoes.ts'), 'utf8');
const ids = [...fonte.matchAll(/\{ id: '([a-z]+)', nome:/g)].map((m) => m[1]);
if (ids.length !== 14) throw new Error(`Esperava 14 emoções em emocoes.ts, achei ${ids.length}`);

const AVISO = '<!-- Gerado por scripts/gerar-icones-emocao.js. Não edite à mão. -->';
// Zona segura do ícone adaptativo: o balão ocupa ~44% dos 108 dp (era 58%, ficou grande demais).
const RECUO = '28%';

const adaptativo = (id) => `<?xml version="1.0" encoding="utf-8"?>
${AVISO}
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
  <background android:drawable="@color/consi_icone_fundo" />
  <foreground>
    <inset android:drawable="@drawable/consi_emocao_${id}" android:inset="${RECUO}" />
  </foreground>
</adaptive-icon>
`;

const simples = (id) => `<?xml version="1.0" encoding="utf-8"?>
${AVISO}
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
  <item>
    <shape android:shape="rectangle">
      <solid android:color="@color/consi_icone_fundo" />
      <corners android:radius="12dp" />
    </shape>
  </item>
  <item>
    <inset android:drawable="@drawable/consi_emocao_${id}" android:inset="${RECUO}" />
  </item>
</layer-list>
`;

for (const [pasta, fn] of [
  ['mipmap-anydpi-v26', adaptativo],
  ['mipmap-anydpi', simples],
]) {
  fs.mkdirSync(path.join(res, pasta), { recursive: true });
  for (const id of ids) fs.writeFileSync(path.join(res, pasta, `consi_icone_${id}.xml`), fn(id));
}
console.log(`Ícones gerados para ${ids.length} emoções.`);
