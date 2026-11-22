import { useState } from 'react';

import { Divisoria, Personalizar, SecoesInicio, TelaAjustes } from '@/components/ajustes';

/** Ajustes → Personalizar aparência: tema, texto, movimento, vibração, aba inicial e seções do Início. */
export default function PaginaPersonalizar() {
  // Enquanto uma seção do Início é arrastada, a página não rola.
  const [arrastando, setArrastando] = useState(false);
  return (
    <TelaAjustes titulo="Personalizar aparência" travarRolagem={arrastando}>
      <Personalizar />
      <Divisoria />
      <SecoesInicio onArrastando={setArrastando} />
    </TelaAjustes>
  );
}
