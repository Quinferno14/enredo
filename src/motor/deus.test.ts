// Marco 6: Modo Deus, voltar um período e biografia.

import { describe, expect, it } from 'vitest';
import { jogarPeriodo } from './automatico';
import { biografia } from './biografia';
import {
  definirEmprego, editarAtributo, editarDinheiro, editarEixo, editarIdade, forcarEvento, pausarIdade, voltarPeriodo,
} from './deus';
import { EVENTOS } from './eventos';
import type { ModoMorte, Vida } from './tipos';
import { avancarPeriodo, criarVida } from './vida';

const nova = (seed: string, morte: ModoMorte = 'permanente') => criarVida({
  id: seed, seed, ano: 2026, criadaEm: '2026-11-10T00:00:00.000Z', turno: 'ano', morte, inicio: 'adulto',
});
const avancar = (v: Vida, n: number) => { for (let i = 0; i < n && !v.morte; i++) v = jogarPeriodo(v); return v; };

describe('Modo Deus', () => {
  it('edições ficam dentro dos limites e entram na história com ✦', () => {
    let v = nova('deus-1');
    v = editarAtributo(v, 'saude', 250);
    v = editarEixo(v, 'empatia', -400);
    expect(v.personagem.atributos.saude).toBe(100);
    expect(v.personagem.personalidade.empatia).toBe(-100);
    expect(v.historico.filter((h) => h.texto.startsWith('✦')).length).toBe(2);
    v = editarDinheiro(v, 1234.6);
    expect(v.personagem.dinheiro).toBe(1235);
  });

  it('mudar a idade envelhece a família junto', () => {
    const v = nova('deus-2');
    const mae = v.pessoas.find((p) => p.papel === 'mae')!;
    const w = editarIdade(v, 40);
    expect(w.relogio.idadeMeses).toBe(480);
    expect(w.pessoas.find((p) => p.id === mae.id)!.idadeMeses).toBe(mae.idadeMeses + (480 - v.relogio.idadeMeses));
  });

  it('dá emprego direto', () => {
    const v = definirEmprego(nova('deus-3'), 'medico');
    expect(v.personagem.trabalho.emprego?.id).toBe('medico');
    expect(v.personagem.trabalho.cargos.length).toBe(1);
  });

  it('todo evento pode ser forçado (ou explica por que não)', () => {
    let v = avancar(nova('deus-4'), 2);
    for (const e of EVENTOS) {
      if (v.pendente) v = { ...v, pendente: null };
      const r = forcarEvento(v, e.id);
      expect(r.vida !== v || !!r.aviso).toBe(true);
    }
  });

  it('com a idade pausada, o corpo não envelhece', () => {
    const base = editarIdade(nova('deus-5'), 30);
    const pausada = pausarIdade(base, true);
    let a = base, b = pausada;
    for (let i = 0; i < 40; i++) {
      a = a.morte ? a : avancarPeriodo({ ...a, pendente: null });
      b = b.morte ? b : avancarPeriodo({ ...b, pendente: null });
    }
    expect(b.relogio.idadeMeses).toBeGreaterThan(base.relogio.idadeMeses);
    expect(b.personagem.idadeBiologicaMeses).toBe(30 * 12);
    if (!a.morte && !b.morte) expect(b.personagem.atributos.forma).toBeGreaterThan(a.personagem.atributos.forma);
  });
});

describe('voltar um período', () => {
  it('só existe no modo "voltar" e dá um período diferente', () => {
    expect(avancarPeriodo(nova('volta-1')).anterior).toBeNull();
    const v0 = nova('volta-2', 'voltar');
    const v1 = avancarPeriodo(v0);
    expect(v1.anterior).not.toBeNull();
    expect(v1.anterior!.anterior).toBeNull();
    let diferentes = 0;
    for (let i = 0; i < 10; i++) {
      const outra = avancarPeriodo({ ...voltarPeriodo(i === 0 ? v1 : { ...v1, voltas: i }), pendente: null });
      if (JSON.stringify(outra.personagem.atributos) !== JSON.stringify(v1.personagem.atributos)) diferentes++;
    }
    expect(diferentes).toBeGreaterThan(5);
    expect(voltarPeriodo(voltarPeriodo(v1))).toEqual(voltarPeriodo(v1)); // só uma foto
  });
});

describe('biografia', () => {
  it('conta a vida e o fim', () => {
    const v = avancar(nova('bio-1'), 300);
    const texto = biografia(v).join(' ');
    expect(texto).toContain(v.personagem.nome);
    expect(texto).toContain('Morreu em');
    expect(texto).not.toMatch(/[{}]|undefined|NaN/);
  });
});
