import { useMemo } from 'preact/hooks';
import { desenharCena } from '../../arte/comodos';
import type { Vida } from '../../motor/tipos';
import { cenaNoLugar } from '../cena/cenaDaVida';
import type { IdLugar } from '../cena/lugares';

/**
 * O palco da tela Vida: a cena desenhada a partir da vida (lugar, quem está com
 * você, humor, hora, época). Preenche a caixa cortando as bordas, com o chão
 * sempre à vista.
 */
export function CenaVida({ vida, onde = 'casa', onToque }: { vida: Vida; onde?: IdLugar; onToque?: (alvo: string) => void }) {
  const svg = useMemo(() => desenharCena(cenaNoLugar(vida, onde))
    // Enquadra perto das pessoas: corta o alto da parede e o fundo do chão.
    .replace(/viewBox="0 0 (\d+) (\d+)"/, 'viewBox="0 15 $1 300"')
    .replace(/width="\d+" height="\d+"/, 'width="100%" height="100%" preserveAspectRatio="xMidYMax slice"'), [vida, onde]);
  // Toque numa pessoa abre a pessoa; no resto da cena, o que dá para fazer ali.
  const clique = (e: MouseEvent) => {
    const alvo = (e.target as Element).closest?.('[data-alvo]')?.getAttribute('data-alvo');
    onToque?.(alvo && alvo !== 'eu' ? alvo : 'cena');
  };
  return <div class="palco-desenho" aria-hidden="true" onClick={clique} dangerouslySetInnerHTML={{ __html: svg }} />;
}
