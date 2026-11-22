import { router } from 'expo-router';

import { Botao } from '@/components';
import { Ajuste, TelaAjustes } from '@/components/ajustes';
import { refazerOnboarding } from '@/data/onboarding';

/** Ajustes → Para testes (só em desenvolvimento ou para o admin). */
export default function PaginaTestes() {
  return (
    <TelaAjustes titulo="Para testes">
      <Ajuste titulo="Atalhos" descricao="Só aparecem em desenvolvimento ou com sessão de admin.">
        <Botao
          rotulo="Refazer onboarding"
          onPress={async () => {
            await refazerOnboarding();
            router.replace('/onboarding');
          }}
        />
        <Botao rotulo="Abrir tela de pausa" estilo="secundario" onPress={() => router.push('/pausa')} />
      </Ajuste>
    </TelaAjustes>
  );
}
