import type { Atributo, EntradaHistorico, Vida } from '../../motor/tipos';
import { avancarPeriodo, nomeCompleto, rotuloPeriodo, textoIdade } from '../../motor/vida';
import { NOME_ATRIBUTO } from '../textos';

// A sorte fica oculta; aparece no Modo Deus (marco 6).
const VISIVEIS: Atributo[] = ['saude', 'felicidade', 'inteligencia', 'aparencia', 'forma', 'carisma'];

interface Props {
  vida: Vida;
  onAvancar: () => void;
  onNovaVida: () => void;
}

/** Junta as linhas da história por período, do mais recente para o mais antigo. */
function agruparPorPeriodo(historico: EntradaHistorico[]) {
  const grupos: { quando: string; textos: string[] }[] = [];
  for (const h of historico) {
    const ultimo = grupos.at(-1);
    if (ultimo && ultimo.quando === h.quando) ultimo.textos.push(h.texto);
    else grupos.push({ quando: h.quando, textos: [h.texto] });
  }
  return grupos.reverse();
}

export function TelaVida({ vida, onAvancar, onNovaVida }: Props) {
  const p = vida.personagem;
  const iniciais = `${p.nome[0] ?? ''}${p.sobrenome[0] ?? ''}`;
  const morte = vida.morte;
  const proximo = morte ? '' : rotuloPeriodo(avancarPeriodo(vida).relogio, vida.config.turno);

  return (
    <>
      <header class="topo">
        <div class={morte ? 'retrato falecido' : 'retrato'} aria-hidden="true">{iniciais}</div>
        <div>
          <h1>{nomeCompleto(vida)}</h1>
          <p class="sutil">
            {morte ? `† ${textoIdade(morte.idadeMeses)} · ${morte.ano}` : textoIdade(vida.relogio.idadeMeses)}
            {' · '}{p.cidade}, {p.estado}
          </p>
        </div>
      </header>

      {morte && (
        <section class="cartao fim" aria-label="Fim da vida">
          <h2>Fim da vida</h2>
          <p>
            {p.nome} morreu aos {textoIdade(morte.idadeMeses)}, em {morte.ano}, {morte.causa}.
          </p>
          <p class="dica">
            {vida.config.morte === 'voltar'
              ? 'Voltar um período chega no marco 6. Continuar como filho chega no marco 5.'
              : 'Continuar como filho ou neto chega no marco 5 (Família).'}
          </p>
          <button class="primario" onClick={onNovaVida}>Começar outra vida</button>
        </section>
      )}

      <section class="atributos" aria-label="Atributos">
        {VISIVEIS.map((a) => {
          const v = p.atributos[a];
          const antes = vida.atributosAnteriores[a];
          const seta = v > antes ? '↑' : v < antes ? '↓' : '';
          return (
            <div class="atributo" key={a}>
              <div class="atributo-linha">
                <span>{NOME_ATRIBUTO[a]}</span>
                <span class="numero">
                  {v}
                  {seta && <span class={v > antes ? 'sobe' : 'desce'} aria-label={v > antes ? 'subiu' : 'caiu'}> {seta}</span>}
                </span>
              </div>
              <div class="barra"><div style={{ width: `${v}%` }} /></div>
            </div>
          );
        })}
      </section>

      <section class="feed" aria-label="Sua história">
        {agruparPorPeriodo(vida.historico).map((g, i) => (
          <article class="entrada" key={`${g.quando}-${i}`}>
            <span class="quando">{g.quando}</span>
            {g.textos.map((t, j) => <p key={j}>{t}</p>)}
          </article>
        ))}
      </section>

      {!morte && (
        <div class="rodape-acoes">
          <input class="busca" disabled placeholder="O que você quer fazer?" title="As ações chegam no marco 3" />
          <button class="primario grande" onClick={onAvancar}>Avançar para {proximo}</button>
        </div>
      )}
    </>
  );
}
