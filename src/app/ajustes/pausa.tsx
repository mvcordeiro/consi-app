import { AjustesBloqueio } from '@/components/AjustesBloqueio';
import { AjustesLembretesAtividades } from '@/components/AjustesLembretesAtividades';
import { AjustesLembretesTela } from '@/components/AjustesLembretesTela';
import { AjustesPausa } from '@/components/AjustesPausa';
import { Divisoria, TelaAjustes } from '@/components/ajustes';
import { temLembretesAtividades } from '@/data/lembretesAtividades';
import { temLembretesDeTela, temPausaDeVerdade } from '@/data/vigia';

/**
 * Ajustes → Pausa e lembretes (só no APK Android): permissões da pausa, o tempo que o app fica
 * fechado depois de "Dessa vez não abro" e os lembretes de tela.
 */
export default function PaginaPausa() {
  return (
    <TelaAjustes titulo="Pausa e lembretes">
      <AjustesPausa />
      {temPausaDeVerdade ? <Divisoria /> : null}
      <AjustesBloqueio />
      {temPausaDeVerdade && temLembretesDeTela ? <Divisoria /> : null}
      <AjustesLembretesTela />
      {temLembretesAtividades ? <Divisoria /> : null}
      <AjustesLembretesAtividades />
    </TelaAjustes>
  );
}
