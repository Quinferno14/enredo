// Revisão 2, etapa 1: base coerente. Idade, calendário, repetição, limites e família.

import { describe, expect, it } from 'vitest';
import { definirHabito, fazerAcao } from './acoes';
import { jogarPeriodo } from './automatico';
import { mesDeNascimento } from './efeitos';
import { disparar, eventoPorId } from './eventos';
import { Rng } from './rng';
import { MESES } from './tempo';
import type { Vida } from './tipos';
import { avancarPeriodo, criarVida } from './vida';

const nova = (seed: string, inicio: 'bebe' | 'adulto' = 'bebe', mes = 3): Vida => criarVida({
  id: seed, seed, ano: 2026, mes, criadaEm: '2026-11-11T00:00:00.000Z', turno: 'dinamico', morte: 'permanente', inicio,
});

describe('base coerente (Revisão 2, etapa 1)', () => {
  it('o aniversário cai no mês em que a pessoa nasceu', () => {
    let v = nova('aniv', 'bebe', 8);
    expect(mesDeNascimento(v)).toBe(8);
    for (let i = 0; i < 400 && v.relogio.idadeMeses < 10 * 12; i++) v = jogarPeriodo(v, { acoes: 1 });
    const linhas = v.historico.filter((h) => h.fato?.id === 'aniversario_crianca');
    expect(linhas.length).toBeGreaterThan(2);
    for (const h of linhas) expect(h.quando.startsWith(MESES[7]!)).toBe(true);
  });

  it('texto de "primeira vez" só sai uma vez', () => {
    const v = nova('primeira');
    v.relogio.idadeMeses = 8 * 12;
    const e = eventoPorId('reveillon_branco')!;
    const rng = new Rng(v.rng);
    expect(disparar(v, e, {}, rng, [])).toBe(true);
    v.pendente = null;
    // Aos 8 anos o único texto é o da primeira vez acordado até meia-noite: não repete.
    expect(disparar(v, e, {}, rng, [])).toBe(false);
  });

  it('hábito de criança acaba quando a pessoa cresce', () => {
    let v = nova('habito-cresce');
    v.relogio.idadeMeses = 11 * 12 + 11;
    v = definirHabito(v, 'brincar', 3);
    expect(v.habitos.some((h) => h.acao === 'brincar')).toBe(true);
    for (let i = 0; i < 4; i++) v = avancarPeriodo(v, true);
    expect(v.habitos.some((h) => h.acao === 'brincar')).toBe(false);
    expect(v.historico.some((h) => /deixou para trás o hábito de brincar/.test(h.texto))).toBe(true);
  });

  it('o bico rende cada vez menos no mesmo ano', () => {
    let v = nova('bico', 'adulto');
    const ganhos: number[] = [];
    for (let i = 0; i < 12; i++) {
      v.personagem.desgaste = 0;
      const antes = v.personagem.dinheiro;
      v = fazerAcao(v, 'bico').vida;
      ganhos.push(v.personagem.dinheiro - antes);
    }
    expect(ganhos.slice(-3).reduce((s, x) => s + x, 0)).toBeLessThan(ganhos.slice(0, 3).reduce((s, x) => s + x, 0) * 0.6);
  });

  it('exausto, só dá para descansar', () => {
    const v = nova('exausto', 'adulto');
    v.personagem.desgaste = 97;
    v.personagem.dinheiro = 1000;
    const r = fazerAcao(v, 'academia');
    expect(r.ok).toBe(false);
    expect(r.aviso).toMatch(/exaust/);
  });

  it('família pobre não paga consulta particular', () => {
    const v = nova('pobre');
    v.personagem.classe = 'baixa';
    v.relogio.idadeMeses = 6 * 12;
    const r = fazerAcao(v, 'medico_particular');
    expect(r.ok).toBe(false);
    expect(r.aviso).toMatch(/pais não têm como pagar/);
  });

  it('irmãos não nascem com menos de um ano de diferença, e a renda dos pais bate com a classe', () => {
    for (let k = 0; k < 40; k++) {
      let v = nova(`irmaos-${k}`);
      for (let i = 0; i < 200 && v.relogio.idadeMeses < 14 * 12; i++) v = jogarPeriodo(v, { acoes: 0 });
      const idades = [v.relogio.idadeMeses, ...v.pessoas.filter((p) => p.papel === 'irmao').map((p) => p.idadeMeses)].sort((a, b) => a - b);
      // Gêmeos (mesma idade) acontecem; o que não pode é nascer com poucos meses de diferença.
      for (let i = 1; i < idades.length; i++) { const d = idades[i]! - idades[i - 1]!; expect(d === 0 || d >= 12).toBe(true); }
      const v0 = nova(`classe-${k}`);
      const teto = v0.personagem.classe === 'baixa' ? 2600 : v0.personagem.classe === 'media' ? 7500 : 35000;
      for (const p of v0.pessoas.filter((x) => x.papel === 'mae' || x.papel === 'pai')) expect(p.renda).toBeLessThanOrEqual(teto);
    }
  });
}, 300_000);
