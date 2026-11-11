// Marco 5: família, romance, filhos, herança e continuar como filho por gerações.

import { describe, expect, it } from 'vitest';
import { jogarPeriodo } from './automatico';
import { continuarComoFilho, filhosQuePodemContinuar } from './familia';
import type { Vida } from './tipos';
import { criarVida } from './vida';

function viver(v: Vida): Vida {
  for (let i = 0; i < 300 && !v.morte; i++) v = jogarPeriodo(v, { acoes: 2, carreira: true, familia: true });
  return v;
}

describe('família (marco 5)', () => {
  const vidas = Array.from({ length: 150 }, (_, i) => viver(criarVida({
    id: `fam-${i}`, seed: `fam-${i}`, ano: 2026, criadaEm: '2026-11-10T00:00:00.000Z',
    turno: 'ano', morte: 'permanente', inicio: 'bebe',
  })));
  const pct = (n: number) => `${((n / vidas.length) * 100).toFixed(0)}%`;
  const casaram = vidas.filter((v) => v.memorias.some((m) => m.id === 'casamento')).length;
  const comFilhos = vidas.filter((v) => v.pessoas.some((p) => p.papel === 'filho')).length;
  const perderamPais = vidas.filter((v) => v.pessoas.some((p) => (p.papel === 'mae' || p.papel === 'pai') && !p.vivo)).length;
  const heranca = vidas.filter((v) => v.memorias.some((m) => m.id === 'heranca')).length;
  const irmaos = vidas.reduce((s, v) => s + v.pessoas.filter((p) => p.papel === 'irmao').length, 0) / vidas.length;
  console.log('Família:', JSON.stringify({
    casaram: pct(casaram), comFilhos: pct(comFilhos), perderamPaiOuMae: pct(perderamPais), receberamHeranca: pct(heranca), irmaosPorVida: irmaos.toFixed(1),
  }));

  it('toda vida nasce com mãe', () => {
    const v = criarVida({ id: 'x', seed: 'x', ano: 2026, criadaEm: 'x', turno: 'ano', morte: 'permanente', inicio: 'bebe' });
    expect(v.pessoas.some((p) => p.papel === 'mae' && p.vivo)).toBe(true);
  });

  it('muita gente casa e tem filhos, e quase todo mundo perde os pais', () => {
    expect(casaram / vidas.length).toBeGreaterThan(0.3);
    expect(comFilhos / vidas.length).toBeGreaterThan(0.3);
    expect(perderamPais / vidas.length).toBeGreaterThan(0.8);
  });

  it('dá para continuar como filho por três gerações', () => {
    let v = vidas.find((x) => filhosQuePodemContinuar(x).length > 0)!;
    expect(v).toBeDefined();
    for (let g = 2; g <= 3; g++) {
      const filho = filhosQuePodemContinuar(v)[0]!;
      const nova = continuarComoFilho(v, filho.id, `g${g}`, '2026-11-10T00:00:00.000Z');
      expect(nova.linhagem.geracao).toBe(g);
      expect(nova.personagem.nome).toBe(filho.nome);
      expect(nova.pessoas.some((p) => !p.vivo && (p.papel === 'mae' || p.papel === 'pai'))).toBe(true);
      v = viver(nova);
      if (!filhosQuePodemContinuar(v).length) break;
    }
    expect(v.linhagem.anteriores.length).toBeGreaterThanOrEqual(1);
  });
}, 120_000);
