import { AjustesLembretesTela } from '@/components/AjustesLembretesTela';
import { AjustesPausa } from '@/components/AjustesPausa';
import { Divisoria, TelaAjustes } from '@/components/ajustes';
import { temLembretesDeTela, temPausaDeVerdade } from '@/data/vigia';

/** Ajustes → Pausa e lembretes (só no APK Android): permissões da pausa e lembretes de tela. */
export default function PaginaPausa() {
  return (
    <TelaAjustes titulo="Pausa e lembretes">
      <AjustesPausa />
      {temPausaDeVerdade && temLembretesDeTela ? <Divisoria /> : null}
      <AjustesLembretesTela />
    </TelaAjustes>
  );
}
