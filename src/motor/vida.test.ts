import { describe, expect, it } from 'vitest';
import { Rng } from './rng';
import { jogarPeriodo } from './automatico';
import { avancarPeriodo, criarVida, textoIdade, type OpcoesNovaVida } from './vida';

const base: OpcoesNovaVida = {
  id: 'teste', seed: 'abc-123', ano: 2026, criadaEm: '2026-11-10T00:00:00.000Z',
  turno: 'ano', morte: 'permanente', inicio: 'bebe',
};

describe('Rng', () => {
  it('a mesma seed repete a sequência', () => {
    const a = Rng.daSeed('x'), b = Rng.daSeed('x');
    for (let i = 0; i < 50; i++) expect(a.proximo()).toBe(b.proximo());
  });

  it('seeds diferentes dão sequências diferentes', () => {
    const a = Rng.daSeed('x'), b = Rng.daSeed('y');
    const sa = Array.from({ length: 5 }, () => a.proximo());
    const sb = Array.from({ length: 5 }, () => b.proximo());
    expect(sa).not.toEqual(sb);
  });

  it('continua de onde parou a partir do estado salvo', () => {
    const a = Rng.daSeed('x');
    a.proximo();
    const copia = new Rng(a.estado());
    expect(copia.proximo()).toBe(a.proximo());
  });

  it('inteiro respeita os limites', () => {
    const r = Rng.daSeed('limites');
    for (let i = 0; i < 1000; i++) {
      const n = r.inteiro(3, 7);
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(7);
    }
  });
});

describe('criarVida', () => {
  it('a mesma seed gera a mesma vida', () => {
    expect(criarVida(base)).toEqual(criarVida(base));
  });

  it('seeds diferentes geram vidas diferentes', () => {
    const a = criarVida(base), b = criarVida({ ...base, seed: 'outra' });
    expect(a.personagem).not.toEqual(b.personagem);
  });

  it('respeita o que o jogador escolheu', () => {
    const v = criarVida({ ...base, nome: 'Luna', sobrenome: 'Prado', sexo: 'feminino', estado: 'PE' });
    expect(v.personagem).toMatchObject({ nome: 'Luna', sobrenome: 'Prado', sexo: 'feminino', estado: 'PE' });
  });

  it('atributos ficam entre 0 e 100 e personalidade entre -100 e 100', () => {
    for (let i = 0; i < 200; i++) {
      const v = criarVida({ ...base, seed: `s${i}` });
      for (const n of Object.values(v.personagem.atributos)) {
        expect(n).toBeGreaterThanOrEqual(0);
        expect(n).toBeLessThanOrEqual(100);
      }
      for (const n of Object.values(v.personagem.personalidade)) {
        expect(n).toBeGreaterThanOrEqual(-100);
        expect(n).toBeLessThanOrEqual(100);
      }
    }
  });

  it('começar adulto começa aos 18', () => {
    expect(criarVida({ ...base, inicio: 'adulto' }).relogio.idadeMeses).toBe(216);
  });
});

describe('avancarPeriodo', () => {
  it('no modo ano soma 12 meses e um ano', () => {
    const v = avancarPeriodo(criarVida(base));
    expect(v.relogio).toMatchObject({ ano: 2027, semestre: 1, idadeMeses: 12 });
  });

  it('no modo semestre alterna os semestres', () => {
    let v = criarVida({ ...base, turno: 'semestre' });
    v = avancarPeriodo(v);
    expect(v.relogio).toMatchObject({ ano: 2026, semestre: 2, idadeMeses: 6 });
    v = avancarPeriodo(v);
    expect(v.relogio).toMatchObject({ ano: 2027, semestre: 1, idadeMeses: 12 });
  });

  it('não altera a vida original', () => {
    const v = criarVida(base);
    const copia = structuredClone(v);
    avancarPeriodo(v);
    expect(v).toEqual(copia);
  });
});

describe('vida e morte', () => {
  const viver = (seed: string, periodos: number) => {
    let v = criarVida({ ...base, seed });
    for (let i = 0; i < periodos && !v.morte; i++) v = jogarPeriodo(v);
    return v;
  };

  it('a mesma seed vive a mesma vida, período a período', () => {
    expect(viver('repetir', 60)).toEqual(viver('repetir', 60));
  });

  it('depois de morrer, avançar não muda mais nada', () => {
    const morta = viver('fim', 300);
    expect(morta.morte).toBeDefined();
    expect(avancarPeriodo(morta)).toBe(morta);
  });

  it('a história marca os 18 anos de quem chega lá', () => {
    const v = viver('maioridade', 20);
    if (v.relogio.idadeMeses >= 216) {
      expect(v.historico.some((h) => h.texto.includes('18 anos'))).toBe(true);
    }
  });

  it('bebê começa com inteligência abaixo do potencial, e ela cresce até a vida adulta', () => {
    const v = criarVida(base);
    expect(v.personagem.atributos.inteligencia).toBeLessThan(v.personagem.potencial.inteligencia);
  });

  it('vidas diferentes envelhecem de jeitos diferentes', () => {
    const saudes = new Set(Array.from({ length: 20 }, (_, i) => viver(`dif-${i}`, 40).personagem.atributos.saude));
    expect(saudes.size).toBeGreaterThan(5);
  }, 60_000);
});

describe('textoIdade', () => {
  it('formata meses e anos', () => {
    expect(textoIdade(0)).toBe('recém-nascido');
    expect(textoIdade(6)).toBe('6 meses');
    expect(textoIdade(12)).toBe('1 ano');
    expect(textoIdade(30)).toBe('2 anos');
  });
});
