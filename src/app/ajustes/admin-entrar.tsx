import { router, type Href } from 'expo-router';
import { useState } from 'react';

import { Botao, CampoTexto, Texto } from '@/components';
import { mensagemErro, TelaComunidade } from '@/components/comunidade';
import { entrarAdmin } from '@/data/nuvem/moderacao';
import { useTema } from '@/theme';

/** As rotas index de app/ajustes saem como "…/index" nos tipos gerados; o caminho real é este. */
const ROTA_MODERACAO = '/ajustes/moderacao' as Href;

/**
 * Entrada escondida da moderação (7 toques na versão, em Ajustes → Sobre). E-mail e senha de uma
 * conta criada no painel do Supabase e listada na tabela `admins`; o app nunca cria conta aqui.
 * Uma conta que não é admin sai na hora.
 */
export default function AdminEntrar() {
  const { cores } = useTema();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);
  const pronto = email.includes('@') && senha.length > 0 && !entrando;

  const entrar = async () => {
    if (!pronto) return;
    setEntrando(true);
    setErro(null);
    try {
      if (await entrarAdmin(email, senha)) router.replace(ROTA_MODERACAO);
      else setErro('Esta conta não tem acesso à moderação.');
    } catch (e) {
      setErro(mensagemErro(e));
    } finally {
      setEntrando(false);
    }
  };

  return (
    <TelaComunidade
      titulo="Moderação"
      rodape={
        <>
          {erro ? (
            <Texto estilo="Texto/Pequeno" cor={cores.feedback.error} accessibilityLiveRegion="assertive">
              {erro}
            </Texto>
          ) : null}
          <Botao rotulo={entrando ? 'Entrando…' : 'Entrar'} onPress={entrar} estado={pronto ? 'normal' : 'desabilitado'} disabled={!pronto} />
        </>
      }
    >
      <Texto estilo="Texto/Pequeno" cor={cores.text.secondary}>
        Acesso só para quem modera as sugestões do Consi.
      </Texto>
      <CampoTexto
        titulo="E-mail"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="username"
        acessibilidade="E-mail"
      />
      <CampoTexto
        titulo="Senha"
        value={senha}
        onChangeText={setSenha}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        onSubmitEditing={entrar}
        acessibilidade="Senha"
      />
    </TelaComunidade>
  );
}
