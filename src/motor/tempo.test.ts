// R1: tempo dinâmico, rótulo do período pelo relógio e Modo Deus que não "volta".

import { describe, expect, it } from 'vitest';
import { decidirAoAcaso } from './automatico';
import { editarAtributo } from './deus';
import { fazerAcao } from './acoes';
import type { Vida } from './tipos';
import { avancarPeriodo, criarVida, quandoAgora } from './vida';

const nova = (seed: string, inicio: 'bebe' | 'adulto' = 'bebe'): Vida => criarVida({
  id: seed, seed, ano: 2026, mes: 3, criadaEm: '2026-11-10T00:00:00.000Z', turno: 'dinamico', morte: 'permanente', inicio,
});

describe('tempo dinâmico', () => {
  it('anda no máximo 12 meses e para na primeira novidade', () => {
    let v = nova('din-1');
    const passos: number[] = [];
    for (let i = 0; i < 60 && !v.morte; i++) {
      const antes = v.relogio.idadeMeses;
      v = decidirAoAcaso(avancarPeriodo(v));
      passos.push(v.relogio.idadeMeses - antes);
    }
    expect(Math.max(...passos)).toBeLessThanOrEqual(12);
    expect(Math.min(...passos)).toBeGreaterThanOrEqual(1);
    expect(new Set(passos).size).toBeGreaterThan(2); // às vezes um mês, às vezes o ano
  });

  it('o mês e o ano andam juntos', () => {
    let v = nova('din-2');
    for (let i = 0; i < 30 && !v.morte; i++) v = decidirAoAcaso(avancarPeriodo(v));
    const mesesDesdeInicio = (v.relogio.ano - 2026) * 12 + (v.relogio.mes! - 3);
    expect(mesesDesdeInicio).toBe(v.relogio.idadeMeses);
  });

  it('pular o ano anda 12 meses quando não há decisão', () => {
    let v = nova('din-3', 'adulto');
    let ok = 0;
    for (let i = 0; i < 20 && !v.morte; i++) {
      const antes = v.relogio.idadeMeses;
      v = avancarPeriodo(v, true);
      if (!v.pendente && !v.morte && v.relogio.idadeMeses - antes === 12) ok++;
      v = decidirAoAcaso(v);
    }
    expect(ok).toBeGreaterThan(2); // adultos têm decisões quase todo ano
  });

  it('ações e decisões ficam no período do relógio, não na última linha do feed', () => {
    let v = nova('din-4', 'adulto');
    v = avancarPeriodo(v);
    v = decidirAoAcaso(v);
    v = fazerAcao(v, 'ler').vida;
    expect(v.historico.at(-1)!.quando).toBe(quandoAgora(v));
  });

  it('uma vida inteira no modo dinâmico tem idade de morte plausível', () => {
    const idades: number[] = [];
    for (let i = 0; i < 60; i++) {
      let v = nova(`din-vida-${i}`);
      for (let k = 0; k < 2000 && !v.morte; k++) v = decidirAoAcaso(avancarPeriodo(v, true));
      idades.push(v.morte!.idadeMeses / 12);
    }
    const media = idades.reduce((s, x) => s + x, 0) / idades.length;
    console.log('Dinâmico, idade média de morte:', media.toFixed(1));
    expect(media).toBeGreaterThan(62);
    expect(media).toBeLessThan(88);
  }, 120_000);
});

describe('Modo Deus segura o valor', () => {
  it('inteligência 100 num bebê continua alta depois de um ano', () => {
    let v = nova('deus-bebe');
    v = editarAtributo(v, 'inteligencia', 100);
    for (let i = 0; i < 12 && !v.morte; i++) v = decidirAoAcaso(avancarPeriodo(v, true));
    expect(v.personagem.atributos.inteligencia).toBeGreaterThanOrEqual(92);
  });
});
