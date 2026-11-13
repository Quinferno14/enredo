import { useMemo } from 'preact/hooks';
import { desenharCena } from '../../arte/comodos';
import type { Vida } from '../../motor/tipos';
import { cenaDaVida } from '../cena/cenaDaVida';

/**
 * O palco da tela Vida: a cena desenhada a partir da vida (lugar, quem está com
 * você, humor, hora, época). Preenche a caixa cortando as bordas, com o chão
 * sempre à vista.
 */
export function CenaVida({ vida }: { vida: Vida }) {
  const svg = useMemo(() => desenharCena(cenaDaVida(vida))
    // Enquadra perto das pessoas: corta o alto da parede e o fundo do chão.
    .replace(/viewBox="0 0 (\d+) (\d+)"/, 'viewBox="0 15 $1 300"')
    .replace(/width="\d+" height="\d+"/, 'width="100%" height="100%" preserveAspectRatio="xMidYMax slice"'), [vida]);
  return <div class="palco-desenho" aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg }} />;
}
