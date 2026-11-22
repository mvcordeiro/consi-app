/**
 * Ícone do app por emoção (Android). Ver docs/icone-emocao.md.
 *
 * O launcher só troca de ícone se o app tiver mais de um ponto de entrada. Este plugin:
 *  1. tira o filtro MAIN/LAUNCHER da MainActivity;
 *  2. cria um apelido (activity-alias) "IconePadrao", ligado, com o ícone normal do app;
 *  3. cria um apelido por emoção ("Icone_<id>"), desligado, com o ícone consi_icone_<id>
 *     (gerado por scripts/gerar-icones-emocao.js, dentro de modules/consi-widgets).
 * Em tempo de execução o módulo nativo (Icone.kt) liga um apelido e desliga os outros.
 */
const { withAndroidManifest } = require('@expo/config-plugins');

// Mesmos ids de src/data/emocoes.ts (o gerador de ícones confere a contagem).
const EMOCOES = [
  'satisfeito', 'alegria', 'tristeza', 'vergonha', 'orgulho', 'admiracao', 'medo',
  'repulsa', 'tedio', 'fascinacao', 'raiva', 'desprezo', 'esperanca', 'desejo',
];

const ehLauncher = (filtro) =>
  (filtro.action ?? []).some((a) => a.$['android:name'] === 'android.intent.action.MAIN') &&
  (filtro.category ?? []).some((c) => c.$['android:name'] === 'android.intent.category.LAUNCHER');

function alias(nome, icone, iconeRedondo, ligado) {
  return {
    $: {
      'android:name': `.${nome}`,
      'android:enabled': String(ligado),
      'android:exported': 'true',
      'android:targetActivity': '.MainActivity',
      'android:icon': icone,
      'android:roundIcon': iconeRedondo,
      'android:label': '@string/app_name',
    },
    'intent-filter': [
      {
        action: [{ $: { 'android:name': 'android.intent.action.MAIN' } }],
        category: [{ $: { 'android:name': 'android.intent.category.LAUNCHER' } }],
      },
    ],
  };
}

module.exports = function withIconeEmocao(config) {
  return withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application[0];
    const principal = (app.activity ?? []).find((a) => a.$['android:name'] === '.MainActivity');
    if (!principal) throw new Error('withIconeEmocao: MainActivity não encontrada no AndroidManifest.');

    principal['intent-filter'] = (principal['intent-filter'] ?? []).filter((f) => !ehLauncher(f));

    const existentes = (app['activity-alias'] ?? []).filter(
      (a) => !/^\.(IconePadrao|Icone_)/.test(a.$['android:name']),
    );
    app['activity-alias'] = [
      ...existentes,
      alias('IconePadrao', '@mipmap/ic_launcher', '@mipmap/ic_launcher_round', true),
      ...EMOCOES.map((id) => alias(`Icone_${id}`, `@mipmap/consi_icone_${id}`, `@mipmap/consi_icone_${id}`, false)),
    ];
    return cfg;
  });
};

module.exports.EMOCOES = EMOCOES;
