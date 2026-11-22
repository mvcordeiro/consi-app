import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

type Resultado<T> = { alvo: string; dados: T | null; erro: unknown };

/**
 * Carrega dados da nuvem com os três estados que toda tela da Comunidade mostra:
 * carregando, erro (com "Tentar de novo") e dados.
 *
 * - `deps` (valores simples: textos, números, booleanos) decide quando buscar de novo.
 * - `carregando` é derivado: o resultado guardado ainda não é do pedido atual.
 * - `recarregar` (puxar para atualizar, voltar de outra tela) mantém os dados na tela enquanto
 *   busca; se falhar, fica com o que já tinha.
 * - Respostas de pedidos antigos (ou que chegam depois de a tela sair) são ignoradas.
 */
export function useCarregar<T>(buscar: () => Promise<T>, deps: unknown[]) {
  const buscarAtual = useRef(buscar);
  useLayoutEffect(() => {
    buscarAtual.current = buscar;
  });

  const [tentativa, setTentativa] = useState(0);
  const alvo = `${JSON.stringify(deps)}#${tentativa}`;
  const alvoAtual = useRef(alvo);
  useLayoutEffect(() => {
    alvoAtual.current = alvo;
  });

  const [res, setRes] = useState<Resultado<T>>({ alvo: '', dados: null, erro: null });
  const [atualizando, setAtualizando] = useState(false);

  useEffect(() => {
    let vivo = true;
    buscarAtual.current().then(
      (dados) => vivo && setRes({ alvo, dados, erro: null }),
      (erro: unknown) => vivo && setRes({ alvo, dados: null, erro }),
    );
    return () => {
      vivo = false;
    };
  }, [alvo]);

  const recarregar = useCallback(async () => {
    const meu = alvoAtual.current;
    setAtualizando(true);
    try {
      const dados = await buscarAtual.current();
      if (meu === alvoAtual.current) setRes({ alvo: meu, dados, erro: null });
    } catch {
      // Sem rede ao atualizar: mantém o que já está na tela.
    } finally {
      setAtualizando(false);
    }
  }, []);

  const setDados = useCallback((mudar: T | null | ((d: T | null) => T | null)) => {
    setRes((r) => ({ ...r, dados: typeof mudar === 'function' ? (mudar as (d: T | null) => T | null)(r.dados) : mudar }));
  }, []);

  const carregando = res.alvo !== alvo;
  return {
    dados: carregando ? null : res.dados,
    setDados,
    erro: carregando ? null : res.erro,
    carregando,
    atualizando,
    recarregar,
    tentarDeNovo: () => setTentativa((n) => n + 1),
  };
}
