// Jogar sem tela: resolve decisões e (opcionalmente) faz ações sorteadas.
// Usado pelos testes de variedade; depois serve ao Modo Deus ("pular 10 anos").

import { acoesDisponiveis, definirHabito, fazerAcao, FREQUENCIAS, variantesPossiveis } from './acoes';
import { chanceContratar, empregoPorId, salarioInicial } from './carreira';
import { atende } from './efeitos';
import { fazerAcaoPessoa } from './familia';
import { escolher, eventoPorId } from './eventos';
import { Rng } from './rng';
import type { Vida } from './tipos';
import { avancarPeriodo } from './vida';

/** Escolhe ao acaso, entre as escolhas possíveis, usando o sorteio da própria vida. */
export function decidirAoAcaso(vida: Vida): Vida {
  const pend = vida.pendente;
  if (!pend) return vida;
  const e = eventoPorId(pend.evento);
  const possiveis = pend.sistema
    ? pend.escolhas.map((c, i) => ({ c, i })).filter(({ c }) => !c.motivo)
    : (e?.escolhas ?? []).map((c, i) => ({ c, i })).filter(({ c }) => atende(vida, c.requer));
  const rng = new Rng(vida.rng);
  let alvo = possiveis.length ? rng.escolher(possiveis).i : 0;
  // Na escolha de curso, metade das pessoas não vai para a faculdade agora.
  if (pend.sistema === 'curso' && rng.proximo() < 0.5) alvo = pend.escolhas.length - 1;
  return escolher({ ...vida, rng: rng.estado() }, alvo);
}

export interface OpcoesAuto {
  /** Ações à mão por período (sorteadas entre as disponíveis). */
  acoes?: number;
  /** Chance, por período, de criar ou trocar um hábito sorteado. */
  chanceHabito?: number;
  /** Joga como alguém que cuida da carreira: procura emprego, trabalha duro, estuda. */
  carreira?: boolean;
  /** Cuida da família e da vida amorosa: namora, casa, tem filhos, visita os pais. */
  familia?: boolean;
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
    const a = sortear(lista);
    const vs = variantesPossiveis(v, a);
    v = fazerAcao(v, a.id, vs.length ? { variante: sortear(vs).id } : {}).vida;
  }
  if (o.carreira && !v.morte) {
    const p = v.personagem;
    const idade = v.relogio.idadeMeses / 12;
    if (p.estudo.etapa !== 'nenhuma' && sorteio() < 0.6) v = fazerAcao(v, 'estudar').vida;
    if (p.trabalho.emprego) {
      if (sorteio() < 0.5) v = fazerAcao(v, 'trabalhar_duro').vida;
      if (idade >= 65 && sorteio() < 0.5) v = fazerAcao(v, 'aposentar').vida;
    } else if (idade >= 18 && idade < 65 && !v.pendente && p.trabalho.aposentadoria === 0) {
      v = fazerAcao(v, 'procurar_emprego').vida;
      const pend = v.pendente;
      if (pend?.sistema === 'vagas') {
        // A vaga com melhor salário × chance.
        const vida = v;
        const valorVaga = (id: string) => {
          const def = empregoPorId(id);
          return def ? salarioInicial(vida, def) * chanceContratar(vida, def) : 0;
        };
        const ids = pend.dados ?? [];
        const melhor = ids.reduce((b, id, i) => (valorVaga(id) > valorVaga(ids[b] ?? '') ? i : b), ids.length - 1);
        v = escolher(v, melhor);
      }
    }
    if (idade >= 65 && p.trabalho.aposentadoria === 0 && !p.trabalho.emprego) v = fazerAcao(v, 'aposentar').vida;
  }
  if (o.familia && !v.morte) {
    const idade = v.relogio.idadeMeses / 12;
    const parc = v.pessoas.find((x) => x.papel === 'parceiro' && x.vivo);
    if (!parc && idade >= 16 && !v.pendente && sorteio() < 0.5) {
      v = fazerAcao(v, 'procurar_parceiro').vida;
      if (v.pendente?.sistema === 'pretendentes') v = escolher(v, Math.floor(sorteio() * 3));
    } else if (parc) {
      if (sorteio() < 0.7) v = fazerAcaoPessoa(v, parc.id, 'encontro').vida;
      if (parc.relacao === 'namoro' && parc.afeto > 60 && idade >= 22 && sorteio() < 0.4) v = fazerAcaoPessoa(v, parc.id, 'casar').vida;
      const filhos = v.pessoas.filter((x) => x.papel === 'filho').length;
      if (parc.relacao === 'casamento' && filhos < 3 && sorteio() < 0.5) {
        const r = fazerAcaoPessoa(v, parc.id, 'filho');
        v = r.ok ? r.vida : fazerAcaoPessoa(v, parc.id, 'adotar').vida;
      }
    }
    for (const pe of v.pessoas.filter((x) => x.vivo && x.papel !== 'ex')) {
      if (sorteio() < 0.3) v = fazerAcaoPessoa(v, pe.id, pe.papel === 'filho' && pe.idadeMeses < 144 ? 'brincar' : 'tempo').vida;
    }
  }
  if (o.chanceHabito && sorteio() < o.chanceHabito) {
    const lista = acoesDisponiveis(v).filter((a) => !a.semHabito);
    if (lista.length) v = definirHabito(v, sortear(lista).id, sortear([0, ...FREQUENCIAS]));
  }
  return decidirAoAcaso(avancarPeriodo(v));
}
