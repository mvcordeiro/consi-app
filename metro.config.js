// Permite importar arquivos .svg como componentes React (react-native-svg-transformer).
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer/expo'),
};
config.resolver = {
  ...config.resolver,
  // wasm: expo-sqlite na web
  assetExts: [...config.resolver.assetExts.filter((ext) => ext !== 'svg'), 'wasm'],
  sourceExts: [...config.resolver.sourceExts, 'svg'],
};

// expo-sqlite na web usa SharedArrayBuffer, que exige estes cabeçalhos no servidor de dev.
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => (req, res, next) => {
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    return middleware(req, res, next);
  },
};

module.exports = config;
