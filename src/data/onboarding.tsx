import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useState, type ReactNode } from 'react';

/**
 * Respostas do onboarding.
 * Ficam em memória durante o fluxo e são gravadas no aparelho ao final (tela de Compromisso).
 */
export type Objetivo = 'menos-tempo' | 'automatico' | 'hobbies';
export type Hobby = 'leitura' | 'cinema' | 'musica' | 'escrita' | 'jogos' | 'atividade';
export type CaixaDeApp = 'me-perco' | 'automatico' | 'nao-incomoda';

export type RespostasOnboarding = {
  nome: string;
  objetivo: Objetivo | null;
  hobbies: Hobby[];
  apps: Record<string, CaixaDeApp>;
};

const CHAVE_CONCLUIDO = 'consi:onboarding-concluido';
const CHAVE_RESPOSTAS = 'consi:onboarding-respostas';

const vazio: RespostasOnboarding = { nome: '', objetivo: null, hobbies: [], apps: {} };

type Contexto = {
  respostas: RespostasOnboarding;
  atualizar: (parcial: Partial<RespostasOnboarding>) => void;
  concluir: () => Promise<void>;
};

const ContextoOnboarding = createContext<Contexto | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [respostas, setRespostas] = useState<RespostasOnboarding>(vazio);

  const atualizar = (parcial: Partial<RespostasOnboarding>) =>
    setRespostas((atual) => ({ ...atual, ...parcial }));

  const concluir = async () => {
    await AsyncStorage.multiSet([
      [CHAVE_RESPOSTAS, JSON.stringify(respostas)],
      [CHAVE_CONCLUIDO, 'sim'],
    ]);
  };

  return (
    <ContextoOnboarding.Provider value={{ respostas, atualizar, concluir }}>
      {children}
    </ContextoOnboarding.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(ContextoOnboarding);
  if (!ctx) throw new Error('useOnboarding precisa estar dentro de <OnboardingProvider>');
  return ctx;
}

export async function onboardingConcluido() {
  try {
    return (await AsyncStorage.getItem(CHAVE_CONCLUIDO)) === 'sim';
  } catch {
    return false;
  }
}

/** Respostas gravadas ao fim do onboarding (ou as vazias, se não houver). */
export async function respostasSalvas(): Promise<RespostasOnboarding> {
  try {
    const bruto = await AsyncStorage.getItem(CHAVE_RESPOSTAS);
    return bruto ? { ...vazio, ...JSON.parse(bruto) } : vazio;
  } catch {
    return vazio;
  }
}

/** Apaga o onboarding salvo (útil para testar o fluxo de novo). */
export async function refazerOnboarding() {
  await AsyncStorage.multiRemove([CHAVE_CONCLUIDO, CHAVE_RESPOSTAS]);
}
