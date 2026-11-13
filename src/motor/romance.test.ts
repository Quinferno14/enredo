import { describe, expect, it } from 'vitest';
import { ACOES_PESSOA, comecarNamoro, pendentePretendentes } from './familia';
import { EVENTOS } from './eventos';
import { Rng } from './rng';
import { criarVida } from './vida';
import type { Pessoa, Vida } from './tipos';

const nova = (idadeAnos: number): Vida => {
  const v = criarVida({ id: 'rom', seed: 'romance', criadaEm: '2026', ano: 2026, turno: 'dinamico', morte: 'permanente', inicio: 'bebe' } as Parameters<typeof criarVida>[0]);
  v.relogio.idadeMeses = idadeAnos * 12;
  return v;
};
const colega = (v: Vida, idadeAnos: number): Pessoa => {
  const base = structuredClone(v.pessoas.find((x) => x.papel === 'mae')!);
  const x: Pessoa = { ...base, id: `c${idadeAnos}`, nome: 'Alex', papel: 'colega', idadeMeses: idadeAnos * 12, sexo: v.personagem.sexo === 'feminino' ? 'masculino' : 'feminino' };
  v.pessoas.push(x);
  return x;
};
const pode = (id: string, v: Vida, pe: Pessoa) => ACOES_PESSOA.find((a) => a.id === id)!.pode(v, pe);

describe('namoro a partir dos 12, só na mesma faixa', () => {
  it('aos 12 pode chamar para sair alguém de 12 a 14; não de 15 nem adulto; aos 11 não', () => {
    const v = nova(12);
    expect(pode('chamar_sair', v, colega(v, 13))).toBe(true);
    expect(pode('chamar_sair', v, colega(v, 15))).toBe(false);
    expect(pode('chamar_sair', v, colega(v, 19))).toBe(false);
    const w = nova(11);
    expect(pode('chamar_sair', w, colega(w, 11))).toBe(false);
  });

  it('adulto nunca chama menor para sair', () => {
    const v = nova(18);
    expect(pode('chamar_sair', v, colega(v, 17))).toBe(false);
    expect(pode('chamar_sair', v, colega(v, 19))).toBe(true);
  });

  it('pretendentes de quem tem 13 são todos menores, até 2 anos de diferença', () => {
    const v = nova(13);
    const pend = pendentePretendentes(v, Rng.daSeed('pret'));
    for (const c of pend.candidatos ?? []) {
      const i = c.idadeMeses / 12;
      expect(i).toBeGreaterThanOrEqual(12);
      expect(i).toBeLessThan(18);
      expect(Math.abs(i - 13)).toBeLessThanOrEqual(2);
    }
  });

  it('namorinho aos 13, namoro aos 16; o primeiro amor fica nas lembranças', () => {
    const a = nova(13);
    expect(comecarNamoro(a, colega(a, 13))).toMatch(/namoradinhos/);
    expect(a.memorias.some((m) => m.id === 'primeiro_amor')).toBe(true);
    const b = nova(16);
    expect(comecarNamoro(b, colega(b, 16))).toMatch(/primeiro amor/);
  });

  it('menor namorando não pode morar junto, casar nem ter filho', () => {
    const v = nova(16);
    const pe = colega(v, 16);
    comecarNamoro(v, pe);
    for (const id of ['morar_junto', 'casar', 'filho']) expect(pode(id, v, pe), id).toBe(false);
  });

  it('regra fixa: nenhum evento possível antes dos 18 tem conteúdo sexual', () => {
    const proibido = /\b(transa\w*|sexo|sexual\w*|camisinha|nud(ez|es)|motel)\b/i;
    for (const e of EVENTOS) {
      const min = e.quando?.idade?.[0] ?? 0;
      if (min >= 18) continue;
      const textos = [...e.texto, ...(e.textos ?? []).filter((t) => t.idade[0] < 18).flatMap((t) => t.texto),
        ...(e.escolhas ?? []).flatMap((c) => [c.texto, ...[c.resposta, c.sucesso?.resposta, c.falha?.resposta].flat()])].filter((x): x is string => typeof x === 'string');
      for (const t of textos) expect(proibido.test(t), `${e.id}: ${t}`).toBe(false);
    }
  });
});
