// Marco 4: vidas jogadas por alguém que cuida da carreira, medindo
// escolaridade, emprego, renda, dívida e aposentadoria.

import { describe, expect, it } from 'vitest';
import { jogarPeriodo } from './automatico';
import type { Vida } from './tipos';
import { criarVida } from './vida';

interface Foto { aos40?: { renda: number; dinheiro: number; empregado: boolean } }

function jogar(seed: string): { v: Vida; f: Foto } {
  let v = criarVida({
    id: seed, seed, ano: 2026, criadaEm: '2026-11-10T00:00:00.000Z',
    turno: 'ano', morte: 'permanente', inicio: 'bebe',
  });
  const f: Foto = {};
  for (let i = 0; i < 300 && !v.morte; i++) {
    v = jogarPeriodo(v, { acoes: 2, carreira: true });
    if (!f.aos40 && v.relogio.idadeMeses >= 40 * 12) {
      const e = v.personagem.trabalho.emprego;
      f.aos40 = { renda: e?.salario ?? 0, dinheiro: v.personagem.dinheiro, empregado: !!e };
    }
  }
  return { v, f };
}

describe('economia (marco 4)', () => {
  const vidas = Array.from({ length: 200 }, (_, i) => jogar(`eco-${i}`));
  const adultas = vidas.filter((x) => x.f.aos40);
  const pct = (n: number, d: number) => `${((n / Math.max(1, d)) * 100).toFixed(0)}%`;
  const medio = vidas.filter((x) => ['medio', 'superior'].includes(x.v.personagem.estudo.escolaridade)).length;
  const superior = vidas.filter((x) => x.v.personagem.estudo.escolaridade === 'superior').length;
  const empregados40 = adultas.filter((x) => x.f.aos40!.empregado).length;
  const rendas = adultas.filter((x) => x.f.aos40!.empregado).map((x) => x.f.aos40!.renda).sort((a, b) => a - b);
  const mediana = rendas[Math.floor(rendas.length / 2)] ?? 0;
  const endividados = adultas.filter((x) => x.f.aos40!.dinheiro < 0).length;
  const aposentados = vidas.filter((x) => x.v.personagem.trabalho.aposentadoria > 0).length;
  const classes = { baixa: 0, media: 0, alta: 0 };
  for (const x of vidas) classes[x.v.personagem.classe]++;
  console.log('Economia:', JSON.stringify({
    comEnsinoMedio: pct(medio, vidas.length), comSuperior: pct(superior, vidas.length),
    empregadosAos40: pct(empregados40, adultas.length), rendaMedianaAos40: mediana,
    noVermelhoAos40: pct(endividados, adultas.length), aposentados: pct(aposentados, vidas.length), classes,
  }));

  it('a maioria termina o ensino médio, e uma parte faz faculdade', () => {
    expect(medio / vidas.length).toBeGreaterThan(0.6);
    expect(superior / vidas.length).toBeGreaterThan(0.1);
    expect(superior / vidas.length).toBeLessThan(0.9); // o jogador automático tenta faculdade com frequência
  });

  it('quem procura emprego costuma estar empregado aos 40', () => {
    expect(empregados40 / adultas.length).toBeGreaterThan(0.6);
  });

  it('renda mediana aos 40 é plausível', () => {
    expect(mediana).toBeGreaterThan(1600);
    expect(mediana).toBeLessThan(20000);
  });

  it('existem aposentados', () => {
    expect(aposentados).toBeGreaterThan(0);
  });
}, 120_000);
