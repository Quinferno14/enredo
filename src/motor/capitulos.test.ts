import { describe, expect, it } from 'vitest';
import { rodarCapitulos, rodarSonhos } from './capitulos';
import { registrarGolpe } from './diretor';
import { criarVida } from './vida';
import type { Vida } from './tipos';

const nova = (idadeAnos: number): Vida => {
  const v = criarVida({ id: 'cap', seed: 'capitulos', criadaEm: '2026', ano: 2026, turno: 'dinamico', morte: 'permanente', inicio: 'bebe' } as Parameters<typeof criarVida>[0]);
  v.relogio.idadeMeses = idadeAnos * 12;
  return v;
};

describe('capítulos', () => {
  it('abrem um por vez, pelos marcos, sem repetir', () => {
    const v = nova(14);
    v.personagem.estudo.etapa = 'fundamental';
    const t1 = rodarCapitulos(v).map((l) => typeof l === 'string' ? l : l.texto);
    const t2 = rodarCapitulos(v).map((l) => typeof l === 'string' ? l : l.texto);
    expect(t1).toEqual(['Capítulo: Os anos de escola']);
    expect(t2).toEqual(['Capítulo: Adolescência']);
    expect(rodarCapitulos(v)).toEqual([]);
  });

  it('um golpe enorme abre "Depois da mãe", mas não vira fila de lutos', () => {
    const v = nova(9);
    v.personagem.estudo.etapa = 'fundamental';
    rodarCapitulos(v);
    const mae = v.pessoas.find((x) => x.papel === 'mae')!;
    const pai = v.pessoas.find((x) => x.papel === 'pai')!;
    registrarGolpe(v, 'morte', mae);
    expect(rodarCapitulos(v).map((l) => typeof l === 'string' ? l : l.texto)).toEqual(['Capítulo: Depois da mãe']);
    v.relogio.idadeMeses += 6;
    registrarGolpe(v, 'morte', pai);
    expect(rodarCapitulos(v)).toEqual([]);
  });
});

describe('sonhos', () => {
  it('nascem aos 13 (dois), realizam quando a vida chega lá, e ficam para trás com a idade', () => {
    const v = nova(12);
    expect(rodarSonhos(v, () => 0.5)).toEqual([]);
    v.relogio.idadeMeses = 13 * 12;
    rodarSonhos(v, () => 0.5);
    expect(v.personagem.sonhos?.length).toBe(2);
    // Força um sonho conhecido para testar a realização.
    v.personagem.sonhos = [{ id: 'negocio', desde: 13 * 12, status: 'vivo' }, { id: 'fama', desde: 13 * 12, status: 'vivo' }];
    v.personagem.negocio = { nome: 'Lanchonete' } as unknown as NonNullable<Vida['personagem']['negocio']>;
    const l = rodarSonhos(v, () => 0.5);
    expect(l.map((x) => typeof x === 'string' ? x : x.texto).join(' ')).toMatch(/sonho realizado/i);
    expect(v.memorias.some((m) => m.id === 'sonho_negocio')).toBe(true);
    v.relogio.idadeMeses = 46 * 12;
    rodarSonhos(v, () => 0.5);
    expect(v.personagem.sonhos.find((s) => s.id === 'fama')?.status).toBe('deixado');
  });
});
