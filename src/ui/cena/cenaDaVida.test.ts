import { describe, expect, it } from 'vitest';
import { registrarGolpe } from '../../motor/diretor';
import { criarVida } from '../../motor/vida';
import type { Vida } from '../../motor/tipos';
import { cenaDaVida, epocaDe, faseArte, humorDe, presentes } from './cenaDaVida';

const nova = (idadeAnos: number, mes = 3): Vida => {
  const v = criarVida({ id: 'cena', seed: 'cena-vida', criadaEm: '2026', ano: 2026, turno: 'dinamico', morte: 'permanente', inicio: 'bebe' } as Parameters<typeof criarVida>[0]);
  v.relogio.idadeMeses = idadeAnos * 12;
  v.relogio.mes = mes;
  return v;
};

describe('cena da vida', () => {
  it('fase da arte pela idade', () => {
    expect([1, 7, 15, 40, 70].map(faseArte)).toEqual(['bebe', 'crianca', 'adolescente', 'adulto', 'idoso']);
  });

  it('criança em casa aparece com quem mora com ela', () => {
    const v = nova(8);
    const quem = presentes(v).map((x) => x.papel);
    expect(quem.length).toBeGreaterThan(0);
    expect(quem.length).toBeLessThanOrEqual(4);
    // Primeiro quem mora junto; as vagas que sobram vão para quem mais importa (avós, tios).
    const primeiroDeFora = quem.findIndex((q) => !['mae', 'pai', 'irmao'].includes(q));
    if (primeiroDeFora >= 0) for (const q of quem.slice(0, primeiroDeFora)) expect(['mae', 'pai', 'irmao']).toContain(q);
    const c = cenaDaVida(v);
    expect(c.pessoas?.[0]?.aparencia.idadeAnos).toBe(8);
  });

  it('de luto, o rosto fica triste; muito cansado, cansado', () => {
    const v = nova(10);
    v.personagem.atributos.felicidade = 70;
    expect(humorDe(v)).toBe('feliz');
    registrarGolpe(v, 'morte', v.pessoas.find((x) => x.papel === 'mae')!);
    expect(humorDe(v)).toBe('triste');
    const w = nova(30);
    w.personagem.desgaste = 85;
    expect(humorDe(w)).toBe('cansado');
  });

  it('dezembro é Natal (na sala); o mês do aniversário vence', () => {
    const v = nova(30, 12);
    if (epocaDe(v) !== 'aniversario') {
      expect(epocaDe(v)).toBe('natal');
      expect(cenaDaVida(v).lugar).toBe('sala');
    }
  });

  it('quem morreu não aparece na própria cena', () => {
    const v = nova(80);
    v.morte = { ano: 2106, idadeMeses: 80 * 12, causa: 'de causas naturais' };
    const c = cenaDaVida(v);
    expect(c.pessoas?.some((x) => x.aparencia.idadeAnos === 80 && x.x === 178)).toBe(false);
  });
});
