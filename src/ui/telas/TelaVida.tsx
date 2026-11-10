import type { Atributo, Vida } from '../../motor/tipos';
import { avancarPeriodo, nomeCompleto, rotuloPeriodo, textoIdade } from '../../motor/vida';
import { NOME_ATRIBUTO } from '../textos';

// A sorte fica oculta; aparece no Modo Deus (marco 6).
const VISIVEIS: Atributo[] = ['saude', 'felicidade', 'inteligencia', 'aparencia', 'forma', 'carisma'];

interface Props {
  vida: Vida;
  onAvancar: () => void;
}

export function TelaVida({ vida, onAvancar }: Props) {
  const p = vida.personagem;
  const iniciais = `${p.nome[0] ?? ''}${p.sobrenome[0] ?? ''}`;
  const proximo = rotuloPeriodo(avancarPeriodo(vida).relogio, vida.config.turno);
  const feed = [...vida.historico].reverse();

  return (
    <>
      <header class="topo">
        <div class="retrato" aria-hidden="true">{iniciais}</div>
        <div>
          <h1>{nomeCompleto(vida)}</h1>
          <p class="sutil">{textoIdade(vida.relogio.idadeMeses)} · {p.cidade}, {p.estado}</p>
        </div>
      </header>

      <section class="atributos" aria-label="Atributos">
        {VISIVEIS.map((a) => {
          const v = p.atributos[a];
          const antes = vida.atributosAnteriores[a];
          const seta = v > antes ? '↑' : v < antes ? '↓' : '';
          return (
            <div class="atributo" key={a}>
              <div class="atributo-linha">
                <span>{NOME_ATRIBUTO[a]}</span>
                <span class="numero">{v}{seta && <span class={v > antes ? 'sobe' : 'desce'}> {seta}</span>}</span>
              </div>
              <div class="barra"><div style={{ width: `${v}%` }} /></div>
            </div>
          );
        })}
      </section>

      <section class="feed" aria-label="Sua história">
        {feed.map((h, i) => (
          <article class="entrada" key={vida.historico.length - i}>
            <span class="quando">{h.quando}</span>
            <p>{h.texto}</p>
          </article>
        ))}
      </section>

      <div class="rodape-acoes">
        <input class="busca" disabled placeholder="O que você quer fazer?" title="As ações chegam no marco 3" />
        <button class="primario grande" onClick={onAvancar}>Avançar para {proximo}</button>
      </div>
    </>
  );
}
