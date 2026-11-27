/**
 * Painel de feedbacks (bugs, ideias, elogios) — só para rodar no seu computador.
 *
 *   npm run feedback      → abre http://localhost:4173
 *
 * Este arquivo e o painel.html ficam em tools/, fora de src/: o Metro só empacota o que o app
 * importa, então nada daqui entra no APK nem nas atualizações OTA. O servidor escuta só em
 * 127.0.0.1 (nenhum outro aparelho da rede alcança). Entra-se com o e-mail e a senha da conta
 * admin do Supabase (a mesma de Ajustes → moderação); a senha fica só na memória da aba e quem
 * decide o que ler é a RLS da tabela `feedback` (só admin).
 */
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const PORTA = Number(process.env.PORTA) || 4173;
const raiz = path.join(__dirname, '..', '..');
const { supabase } = JSON.parse(fs.readFileSync(path.join(raiz, 'app.json'), 'utf8')).expo.extra;
const pagina = fs.readFileSync(path.join(__dirname, 'painel.html'), 'utf8');

http
  .createServer((req, res) => {
    if (req.url === '/config.json') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ url: supabase.url, anonKey: supabase.anonKey }));
    } else if (req.url === '/' || req.url === '/index.html') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      res.end(pagina);
    } else {
      res.writeHead(404).end();
    }
  })
  .listen(PORTA, '127.0.0.1', () => console.log(`Painel de feedbacks: http://localhost:${PORTA}`));
