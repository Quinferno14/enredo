// R4: a personalidade pesa nas escolhas, nas opções liberadas e nas ações, e o jogo diz quando.

import { describe, expect, it } from 'vitest';
import { fazerAcao } from './acoes';
import { chanceEscolha, disparar, escolher, eventoPorId } from './eventos';
import { Rng } from './rng';
import type { Eixo, Vida } from './tipos';
import { criarVida } from './vida';

function adulto(seed: string, pers: Partial<Record<Eixo, number>>): Vida {
  const v = criarVida({ id: seed, seed, ano: 2026, criadaEm: '2026-11-11T00:00:00.000Z', turno: 'dinamico', morte: 'permanente', inicio: 'adulto' });
  for (const k of Object.keys(v.personagem.personalidade) as Eixo[]) v.personagem.personalidade[k] = 0;
  Object.assign(v.personagem.personalidade, pers);
  v.personagem.dinheiro = 5000;
  return v;
}

/** Faz o evento acontecer agora e devolve a vida com a decisão pendente. */
function comEvento(v: Vida, id: string): Vida {
  const prox = structuredClone(v);
  const rng = new Rng(prox.rng);
  expect(disparar(prox, eventoPorId(id)!, {}, rng, [])).toBe(true);
  prox.rng = rng.estado();
  return prox;
}

describe('personalidade com peso (R4)', () => {
  it('a mesma escolha dá mais certo para quem tem o jeito dela', () => {
    const c = eventoPorId('pagode_vizinho')!.escolhas!.find((x) => x.texto.startsWith('Descer'))!;
    const extro = chanceEscolha(adulto('a', { extroversao: 80 }), c)!;
    const reserv = chanceEscolha(adulto('a', { extroversao: -5 }), c)!;
    expect(extro - reserv).toBeGreaterThan(0.25);
  });

  it('o cartão marca "seu jeito" e "contra o seu jeito", e o resultado diz que pesou', () => {
    let v = comEvento(adulto('b', { extroversao: -80 }), 'reuniao_turma');
    const marcas = v.pendente!.escolhas.map((e) => e.jeito);
    expect(marcas).toContain('a favor');
    expect(marcas).toContain('contra');
    const contra = v.pendente!.escolhas.findIndex((e) => e.jeito === 'contra');
    const desgaste = v.personagem.desgaste;
    v = escolher(v, contra);
    expect(v.historico.at(-1)!.texto).toMatch(/contra o seu jeito reservad/);
    expect(v.personagem.desgaste).toBeGreaterThan(desgaste);
  });

  it('algumas opções só abrem para quem tem o traço, com o motivo escrito', () => {
    const base = adulto('c', { impulsividade: -60 });
    const tia = base.pessoas.find((p) => p.papel === 'tio' && p.sexo === 'feminino') ?? base.pessoas.find((p) => p.papel === 'tio')!;
    tia.sexo = 'feminino';
    const v = comEvento(base, 'tia_namoradinhas');
    const devolver = v.pendente!.escolhas.find((e) => e.texto.startsWith('Devolver'))!;
    expect(devolver.motivo).toMatch(/Só quem é mais impulsiv/);
    const solto = comEvento(adulto('c', { impulsividade: 60 }), 'tia_namoradinhas');
    expect(solto.pendente!.escolhas.find((e) => e.texto.startsWith('Devolver'))!.motivo).toBeUndefined();
  });

  it('o extrovertido rende mais saindo com os amigos, e o jogo avisa', () => {
    const ganho = (ext: number) => {
      const v = adulto('d', { extroversao: ext });
      const antes = v.personagem.atributos.felicidade;
      const r = fazerAcao(v, 'amigos', { variante: 'praca', com: 'turma' }).vida;
      return { d: r.personagem.atributos.felicidade - antes, texto: r.historico.at(-1)!.texto };
    };
    const extro = ganho(80);
    const reserv = ganho(-80);
    expect(extro.d).toBeGreaterThan(reserv.d * 1.4);
    expect(extro.texto).toMatch(/rendeu mais: você é extrovertid/);
    expect(reserv.texto).toMatch(/rendeu menos: você é reservad/);
  });
});
