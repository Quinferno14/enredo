// Teste de variedade do marco 3: vidas jogadas sozinhas, com ações e hábitos
// sorteados, medindo se os eventos variam, se ganchos voltam e se a velhice
// tem novidade. Imprime as medidas para irem ao doc.

import { describe, expect, it } from 'vitest';
import { jogarPeriodo } from './automatico';
import { pausarIdade } from './deus';
import { fazerAcao } from './acoes';
import { EVENTOS } from './eventos';
import type { Vida } from './tipos';
import { criarVida } from './vida';

interface Medidas {
  vida: Vida;
  distintos: number;
  primeiros20: string;
  periodos60: number;
  vazios60: number;
}

function jogar(seed: string): Medidas {
  let v = criarVida({
    id: seed, seed, ano: 2026, criadaEm: '2026-11-10T00:00:00.000Z',
    turno: 'ano', morte: 'permanente', inicio: 'bebe',
  });
  const ordem: string[] = [];
  let periodos60 = 0, vazios60 = 0;
  for (let i = 0; i < 150 && !v.morte; i++) {
    // Algumas vidas pausam a idade aos 30, para o mundo reagir à anomalia.
    if (Number(seed.slice(4)) % 7 === 0 && v.relogio.idadeMeses === 30 * 12) v = pausarIdade(v, true);
    // Um quinto das vidas gosta de balada (para o conteúdo de bebida aparecer).
    if (Number(seed.slice(4)) % 5 === 0 && v.relogio.idadeMeses >= 18 * 12 && !v.morte) {
      v = fazerAcao({ ...v, personagem: { ...v.personagem, dinheiro: Math.max(v.personagem.dinheiro, 200) } }, 'amigos', { variante: 'balada' }).vida;
    }
    const antes = { ...v.vistos };
    v = jogarPeriodo(v, { acoes: 3, chanceHabito: 0.15, carreira: Number(seed.slice(4)) % 2 === 0, familia: Number(seed.slice(4)) % 3 !== 0 });
    const novos = Object.keys(v.vistos).filter((k) => v.vistos[k] !== antes[k]);
    ordem.push(...novos);
    if (v.relogio.idadeMeses >= 60 * 12) {
      periodos60++;
      if (novos.length === 0) vazios60++;
    }
  }
  return { vida: v, distintos: Object.keys(v.vistos).length, primeiros20: ordem.slice(0, 20).join(','), periodos60, vazios60 };
}

describe('variedade (metas do doc)', () => {
  const vidas = Array.from({ length: 200 }, (_, i) => jogar(`var-${i}`));
  const media = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

  const distintos = media(vidas.map((m) => m.distintos));
  const ganchos = media(vidas.map((m) => m.vida.ganchosCumpridos));
  const p60 = vidas.reduce((s, m) => s + m.periodos60, 0);
  const vazios = p60 ? vidas.reduce((s, m) => s + m.vazios60, 0) / p60 : 0;
  const seqs = new Set(vidas.map((m) => m.primeiros20));
  const repetidas = 1 - seqs.size / vidas.length;
  // Quem pausou a idade quase não morre: fica fora da média.
  const idadeMorte = media(vidas.filter((m) => m.vida.morte && m.vida.personagem.idadeBiologicaMeses === undefined).map((m) => m.vida.morte!.idadeMeses / 12));
  // Linhas de evento repetidas: o começo do texto (sem os números do resumo) já saiu antes na mesma vida.
  const repetidasPorVida = vidas.map((m) => {
    const linhas = m.vida.historico.filter((h) => h.fato?.tipo === 'evento' && !h.fato.id?.startsWith('@')).map((h) => h.texto.slice(0, 70));
    return linhas.length ? (linhas.length - new Set(linhas).size) / linhas.length : 0;
  });
  const linhasRepetidas = media(repetidasPorVida);
  // Arcos que chegaram ao fim (a última parte de cada arco).
  const FINS = ['banda_radio', 'banda_acabou', 'mochilao_foto', 'reforma_fim', 'varzea_foto', 'alzheimer_fim', 'vizinho_heranca', 'intercambio_volta'];
  const arcosPorVida = media(vidas.map((m) => FINS.filter((f) => m.vida.vistos[f] !== undefined).length));
  const arcosComecados = media(vidas.map((m) => EVENTOS.filter((e) => e.arco && !e.soGancho && m.vida.vistos[e.id] !== undefined).length));
  console.log('Variedade:', JSON.stringify({
    linhasDeEventoRepetidas: `${(linhasRepetidas * 100).toFixed(1)}%`,
    arcosComecadosPorVida: arcosComecados.toFixed(2),
    arcosTerminadosPorVida: arcosPorVida.toFixed(2),
    eventosDistintosPorVida: distintos.toFixed(1),
    ganchosQueVoltaram: ganchos.toFixed(2),
    periodosVaziosDepoisDos60: `${(vazios * 100).toFixed(0)}%`,
    sequenciasRepetidas: `${(repetidas * 100).toFixed(1)}%`,
    idadeMediaMorte: idadeMorte.toFixed(1),
  }));

  it('uma vida longa quase não repete as mesmas linhas', () => {
    // As datas do ano (Natal, festa junina) voltam por natureza; o resto quase não repete.
    expect(linhasRepetidas).toBeLessThan(0.25);
  });

  it('os arcos começam e chegam ao fim', () => {
    expect(arcosComecados).toBeGreaterThan(1);
    expect(arcosPorVida).toBeGreaterThan(0.5);
  });

  it('cada vida vê 60 ou mais eventos diferentes', () => {
    expect(distintos).toBeGreaterThanOrEqual(60);
  });

  it('nenhuma vida repete a sequência de eventos de outra', () => {
    expect(repetidas).toBeLessThan(0.01);
  });

  it('3 ou mais ganchos voltam por vida', () => {
    expect(ganchos).toBeGreaterThanOrEqual(3);
  });

  it('a velhice tem novidade na maior parte dos períodos', () => {
    expect(vazios).toBeLessThan(0.2);
  });

  it('todo evento acontece em alguma vida', () => {
    const vistos = new Set(vidas.flatMap((m) => Object.keys(m.vida.vistos)));
    const nunca = EVENTOS.filter((e) => !vistos.has(e.id)).map((e) => e.id);
    expect(nunca).toEqual([]);
  });

  it('nenhum marcador fica sem trocar no texto', () => {
    for (const m of vidas.slice(0, 100)) {
      for (const h of m.vida.historico) expect(h.texto).not.toMatch(/[{}]/);
    }
  });

  it('a idade média de morte continua plausível com ações e hábitos', () => {
    expect(idadeMorte).toBeGreaterThan(62);
    expect(idadeMorte).toBeLessThan(85);
  });

  it('atributos e cansaço ficam nos limites', () => {
    for (const m of vidas) {
      const p = m.vida.personagem;
      for (const n of [...Object.values(p.atributos), p.desgaste]) {
        expect(n).toBeGreaterThanOrEqual(0);
        expect(n).toBeLessThanOrEqual(100);
      }
    }
  });
}, 120_000);
