// Jogar sem tela: resolve decisões e (opcionalmente) faz ações sorteadas.
// Usado pelos testes de variedade; depois serve ao Modo Deus ("pular 10 anos").

import { acoesDisponiveis, definirHabito, fazerAcao, FREQUENCIAS } from './acoes';
import { atende } from './efeitos';
import { escolher, eventoPorId } from './eventos';
import { Rng } from './rng';
import type { Vida } from './tipos';
import { avancarPeriodo } from './vida';

/** Escolhe ao acaso, entre as escolhas possíveis, usando o sorteio da própria vida. */
export function decidirAoAcaso(vida: Vida): Vida {
  const pend = vida.pendente;
  if (!pend) return vida;
  const e = eventoPorId(pend.evento);
  const possiveis = (e?.escolhas ?? []).map((c, i) => ({ c, i })).filter(({ c }) => atende(vida, c.requer));
  const rng = new Rng(vida.rng);
  const alvo = possiveis.length ? rng.escolher(possiveis).i : 0;
  return escolher({ ...vida, rng: rng.estado() }, alvo);
}

export interface OpcoesAuto {
  /** Ações à mão por período (sorteadas entre as disponíveis). */
  acoes?: number;
  /** Chance, por período, de criar ou trocar um hábito sorteado. */
  chanceHabito?: number;
}

/** Joga um período inteiro: ações, hábito talvez, decisão pendente e Avançar. */
export function jogarPeriodo(vida: Vida, o: OpcoesAuto = {}): Vida {
  let v = decidirAoAcaso(vida);
  const sorteio = () => {
    const r = new Rng(v.rng);
    const x = r.proximo();
    v = { ...v, rng: r.estado() };
    return x;
  };
  const sortear = <T>(lista: readonly T[]): T => lista[Math.floor(sorteio() * lista.length)]!;

  for (let i = 0; i < (o.acoes ?? 0); i++) {
    const lista = acoesDisponiveis(v);
    if (!lista.length) break;
    v = fazerAcao(v, sortear(lista).id).vida;
  }
  if (o.chanceHabito && sorteio() < o.chanceHabito) {
    const lista = acoesDisponiveis(v).filter((a) => !a.semHabito);
    if (lista.length) v = definirHabito(v, sortear(lista).id, sortear([0, ...FREQUENCIAS]));
  }
  return decidirAoAcaso(avancarPeriodo(v));
}
