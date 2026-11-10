// Simula vidas inteiras sem tela, sempre só avançando, e confere se a
// curva de vida e morte é plausível. Imprime as estatísticas no console.

import { describe, expect, it } from 'vitest';
import type { Turno, Vida } from './tipos';
import { avancarPeriodo, criarVida } from './vida';

function viverAteMorrer(seed: string, turno: Turno = 'ano'): Vida {
  let v = criarVida({
    id: seed, seed, ano: 2026, criadaEm: '2026-11-10T00:00:00.000Z',
    turno, morte: 'permanente', inicio: 'bebe',
  });
  for (let i = 0; i < 300 && !v.morte; i++) v = avancarPeriodo(v);
  return v;
}

function estatisticas(idades: number[]) {
  const o = [...idades].sort((a, b) => a - b);
  const q = (p: number) => o[Math.floor(p * (o.length - 1))]!;
  const media = o.reduce((s, x) => s + x, 0) / o.length;
  return { media, p10: q(0.1), mediana: q(0.5), p90: q(0.9), max: o.at(-1)!, antesDos18: o.filter((x) => x < 18).length / o.length };
}

describe('simulação de 1.000 vidas', () => {
  const vidas = Array.from({ length: 1000 }, (_, i) => viverAteMorrer(`sim-${i}`));
  const idades = vidas.map((v) => v.morte!.idadeMeses / 12);
  const est = estatisticas(idades);
  console.log('Modo ano:', JSON.stringify({ ...est, media: est.media.toFixed(1), antesDos18: `${(est.antesDos18 * 100).toFixed(1)}%` }));

  it('toda vida termina', () => {
    expect(vidas.every((v) => v.morte)).toBe(true);
  });

  it('a idade média de morte fica entre 65 e 85 anos', () => {
    expect(est.media).toBeGreaterThan(65);
    expect(est.media).toBeLessThan(85);
  });

  it('há espalhamento real: 10% morrem bem antes e 10% bem depois da mediana', () => {
    expect(est.mediana - est.p10).toBeGreaterThan(8);
    expect(est.p90 - est.mediana).toBeGreaterThan(5);
  });

  it('poucas mortes antes dos 18, e ninguém passa dos 115', () => {
    expect(est.antesDos18).toBeGreaterThan(0.005);
    expect(est.antesDos18).toBeLessThan(0.08);
    expect(est.max).toBeLessThan(115);
  });

  it('atributos ficam sempre entre 0 e 100 e personalidade entre -100 e 100', () => {
    for (const v of vidas.slice(0, 100)) {
      for (const n of Object.values(v.personagem.atributos)) expect(n).toBeGreaterThanOrEqual(0);
      for (const n of Object.values(v.personagem.atributos)) expect(n).toBeLessThanOrEqual(100);
      for (const n of Object.values(v.personagem.personalidade)) expect(Math.abs(n)).toBeLessThanOrEqual(100);
    }
  });

  it('as causas de morte variam', () => {
    const causas = new Set(vidas.map((v) => v.morte!.causa));
    console.log('Causas:', [...causas].join(' | '));
    expect(causas.size).toBeGreaterThanOrEqual(6);
  });

  it('o modo semestre dá uma média parecida com o modo ano', () => {
    const sem = Array.from({ length: 300 }, (_, i) => viverAteMorrer(`sem-${i}`, 'semestre'));
    const m = estatisticas(sem.map((v) => v.morte!.idadeMeses / 12)).media;
    console.log('Modo semestre, média:', m.toFixed(1));
    expect(Math.abs(m - est.media)).toBeLessThan(6);
  }, 60_000);
});
