import { EIXOS, type Vida } from '../../motor/tipos';
import { POLOS_EIXO } from '../textos';

export function TelaEu({ vida }: { vida: Vida }) {
  const c = vida.config;
  return (
    <>
      <h1>Eu</h1>

      <section class="cartao">
        <h2>Personalidade</h2>
        <p class="dica">Muda devagar, conforme o que você vive.</p>
        {EIXOS.map((e) => {
          const v = vida.personagem.personalidade[e];
          const [neg, pos] = POLOS_EIXO[e];
          const largura = Math.abs(v) / 2; // metade da barra = 100
          return (
            <div class="eixo" key={e}>
              <div class="eixo-polos"><span>{neg}</span><span>{pos}</span></div>
              <div class="eixo-barra" aria-label={`${neg} ou ${pos}: ${v}`}>
                <div
                  class="eixo-valor"
                  style={v >= 0 ? { left: '50%', width: `${largura}%` } : { right: '50%', width: `${largura}%` }}
                />
              </div>
            </div>
          );
        })}
      </section>

      <section class="cartao">
        <h2>Esta vida</h2>
        <dl class="dados">
          <dt>Seed</dt><dd>{c.seed}</dd>
          <dt>Turno</dt><dd>{c.turno === 'ano' ? '1 ano' : '1 semestre'}</dd>
          <dt>Morte</dt><dd>{c.morte === 'permanente' ? 'Permanente' : 'Pode voltar um período'}</dd>
          <dt>Começo</dt><dd>{c.inicio === 'bebe' ? 'Bebê' : 'Adulto'}</dd>
          <dt>Sorte</dt><dd>Oculta (visível no Modo Deus, marco 6)</dd>
        </dl>
      </section>

      <p class="vazio">Escola, carreira e dinheiro chegam no marco 4.</p>
    </>
  );
}
