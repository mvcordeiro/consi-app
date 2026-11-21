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

// O HTML da página é servido pelo Expo CLI antes do middleware do Metro, então fica sem os
// cabeçalhos acima e a página não é isolada (sem SharedArrayBuffer o banco não abre e a
// tela fica em branco). Só no servidor de dev: garante os cabeçalhos em toda resposta.
if (process.env.NODE_ENV !== 'production') {
  const http = require('http');
  const original = http.ServerResponse.prototype.writeHead;
  http.ServerResponse.prototype.writeHead = function (...args) {
    if (!this.headersSent && !this.getHeader('Cross-Origin-Opener-Policy')) {
      this.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
      this.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    }
    return original.apply(this, args);
  };
}

module.exports = config;
