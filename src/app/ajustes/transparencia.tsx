import Constants from 'expo-constants';
import * as Linking from 'expo-linking';

import { Botao } from '@/components';
import { Ajuste, Divisoria, TelaAjustes } from '@/components/ajustes';

/** Data da última auditoria e o relatório (docs/auditoria-seguranca-2026-11.md). */
const AUDITORIA = { quando: 'novembro de 2026', arquivo: 'docs/auditoria-seguranca-2026-11.md' };

/**
 * Ajustes → Sobre → Feito com IA (issue #17): como a inteligência artificial foi usada, o que foi
 * testado e quando, com o link para o relatório no GitHub.
 */
export default function Transparencia() {
  const repositorio = (Constants.expoConfig?.extra as { sobre?: { repositorio?: string } } | undefined)?.sobre?.repositorio;
  const relatorio = repositorio ? `${repositorio}/blob/main/${AUDITORIA.arquivo}` : null;

  return (
    <TelaAjustes titulo="Feito com IA" voltar="Sobre">
      <Ajuste
        titulo="Como a IA ajudou"
        descricao="O Consi é desenhado e decidido por uma pessoa. O código foi escrito com a ajuda do Claude, uma inteligência artificial da Anthropic, sempre a partir dessas decisões e revisado antes de entrar no app."
      />
      <Divisoria />
      <Ajuste
        titulo="O que a IA não faz"
        descricao="Dentro do app não há IA: nada do que você escreve, sente ou usa é enviado para um modelo de inteligência artificial. Seus registros ficam no seu celular."
      />
      <Divisoria />
      <Ajuste
        titulo={`Testes de segurança · ${AUDITORIA.quando}`}
        descricao="Revisamos as dependências, as chaves do projeto, as regras do servidor das Sugestões, a criptografia dos dados no celular e as permissões do Android. Os problemas encontrados foram corrigidos. A revisão foi feita com ajuda de IA e conferida por gente; ainda não houve um teste de uma empresa independente."
      >
        {relatorio ? <Botao rotulo="Ler o relatório" estilo="secundario" onPress={() => Linking.openURL(relatorio)} /> : null}
      </Ajuste>
    </TelaAjustes>
  );
}
