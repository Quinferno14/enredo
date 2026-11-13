import { describe, expect, it } from 'vitest';
import { impacto, importancia } from './contexto';
import { classificar, diretorDe, passoDiretor, pesoDoDiretor, registrarGolpe } from './diretor';
import { EVENTOS } from './eventos';
import { avancarPeriodo, criarVida } from './vida';
import { escolher } from './eventos';
import type { Pessoa, Vida } from './tipos';

const nova = (seed: string, idadeAnos: number): Vida => {
  const v = criarVida({ id: seed, seed, criadaEm: '2026', ano: 2026, turno: 'dinamico', morte: 'permanente', inicio: 'bebe' } as Parameters<typeof criarVida>[0]);
  v.relogio.idadeMeses = idadeAnos * 12;
  return v;
};
const papel = (v: Vida, p: Pessoa['papel']) => v.pessoas.find((x) => x.papel === p)!;
const amigo = (v: Vida, afeto: number): Pessoa => {
  const base = structuredClone(papel(v, 'mae'));
  const x: Pessoa = { ...base, id: 'amigo-x', nome: 'Duda', papel: 'amigo', afeto, idadeMeses: v.relogio.idadeMeses };
  delete x.moraJunto;
  v.pessoas.push(x);
  return x;
};

describe('contexto da vida: peso pelo vínculo e pela fase, não pelo sangue', () => {
  it('criança de 2 anos que perde a mãe: peso máximo, mesmo sem afeto formado', () => {
    const v = nova('ctx-1', 2);
    const mae = papel(v, 'mae');
    mae.afeto = 30;
    // Com o pai e a família por perto, amortece um pouco; sem ninguém, quase o máximo.
    expect(impacto(v, 'morte', mae)).toBeGreaterThanOrEqual(75);
    for (const x of v.pessoas) if (x.id !== mae.id) x.vivo = false;
    expect(impacto(v, 'morte', mae)).toBeGreaterThanOrEqual(95);
  });

  it('adulto que perde um pai com quem não fala há anos: peso baixo', () => {
    const v = nova('ctx-2', 40);
    v.personagem.moradia = 'aluguel';
    const pai = papel(v, 'pai');
    Object.assign(pai, { afeto: 8, afastado: true, rival: true });
    expect(impacto(v, 'morte', pai)).toBeLessThan(25);
  });

  it('o melhor amigo pesa mais que um tio que você nunca vê', () => {
    const v = nova('ctx-3', 35);
    v.personagem.moradia = 'aluguel';
    const melhor = amigo(v, 92);
    const tio: Pessoa = { ...structuredClone(melhor), id: 'tio-x', papel: 'tio', afeto: 15, afastado: true };
    v.pessoas.push(tio);
    expect(importancia(v, melhor)).toBeGreaterThan(importancia(v, tio) + 0.4);
    expect(impacto(v, 'morte', melhor)).toBeGreaterThanOrEqual(60);
  });

  it('o mesmo término dói mais aos 15 que aos 30', () => {
    const a = nova('ctx-4', 15), b = nova('ctx-4', 30);
    const pa = amigo(a, 75), pb = amigo(b, 75);
    pa.relacao = 'namoro'; pb.relacao = 'namoro';
    expect(impacto(a, 'termino', pa)).toBeGreaterThan(impacto(b, 'termino', pb) + 10);
  });

  it('perder o emprego pesa mais com filhos pequenos e sem dinheiro', () => {
    const a = nova('ctx-5', 35), b = nova('ctx-5', 35);
    a.personagem.dinheiro = 50000;
    b.personagem.dinheiro = 300;
    const filho: Pessoa = { ...structuredClone(papel(b, 'mae')), id: 'f1', papel: 'filho', idadeMeses: 4 * 12, afeto: 90 };
    b.pessoas.push(filho);
    expect(impacto(b, 'demissao')).toBeGreaterThan(impacto(a, 'demissao') + 10);
  });
});

describe('Diretor: golpe, tempo morno que desce aos poucos', () => {
  const pesado = EVENTOS.find((e) => { const c = classificar(e); return c.gravidade === 'pesado' && c.tom === 'ruim'; })!;
  const bom = EVENTOS.find((e) => classificar(e).tom === 'bom')!;

  it('existem eventos pesados e ruins, e eventos bons, na classificação', () => {
    expect(pesado).toBeDefined();
    expect(bom).toBeDefined();
  });

  it('logo depois de um golpe, o pesado fica raro e o bom ganha espaço; depois volta ao normal aos poucos', () => {
    const v = nova('dir-1', 9);
    registrarGolpe(v, 'morte', papel(v, 'mae'));
    const logo = pesoDoDiretor(v, pesado);
    expect(logo).toBeLessThan(0.4);
    expect(pesoDoDiretor(v, bom)).toBeGreaterThan(1.1);
    const curva: number[] = [];
    for (let m = 0; m < 30; m++) { passoDiretor(v, 1 / 12); curva.push(pesoDoDiretor(v, pesado)); }
    // Sobe devagar, sem pular: em 6 meses ainda está bem abaixo do normal.
    expect(curva[5]!).toBeLessThan(0.7);
    expect(curva[29]!).toBeGreaterThan(0.95);
    for (let i = 1; i < curva.length; i++) expect(curva[i]!).toBeGreaterThanOrEqual(curva[i - 1]! - 1e-9);
  });

  it('o luto dura meses e vai passando; o coração partido de adolescente passa mais rápido que o luto', () => {
    const v = nova('dir-2', 15);
    registrarGolpe(v, 'morte', papel(v, 'mae'));
    expect(diretorDe(v).estado?.tipo).toBe('luto');
    for (let m = 0; m < 6; m++) passoDiretor(v, 1 / 12);
    expect(diretorDe(v).estado?.tipo).toBe('luto');
    for (let m = 0; m < 60; m++) passoDiretor(v, 1 / 12);
    expect(diretorDe(v).estado).toBeUndefined();
  });

  it('nada é proibido: dois golpes seguidos somam até o teto', () => {
    const v = nova('dir-3', 6);
    registrarGolpe(v, 'morte', papel(v, 'mae'));
    registrarGolpe(v, 'morte', papel(v, 'pai'));
    expect(diretorDe(v).intensidade).toBe(100);
  });

  it('muito tempo calmo puxa algo marcante', () => {
    const v = nova('dir-4', 30);
    const antes = pesoDoDiretor(v, pesado);
    diretorDe(v);
    for (let m = 0; m < 36; m++) passoDiretor(v, 1 / 12);
    expect(pesoDoDiretor(v, pesado)).toBeGreaterThan(antes * 1.4);
  });

  it('régua: em vidas simuladas, o medidor sobe e desce (não fica plano)', () => {
    let picos = 0, vales = 0, anos = 0;
    for (let s = 0; s < 6; s++) {
      let v = criarVida({ id: 'r' + s, seed: 'regua-' + s, criadaEm: '2026', ano: 2026, turno: 'dinamico', morte: 'permanente', inicio: 'bebe' } as Parameters<typeof criarVida>[0]);
      for (let ano = 0; ano < 60 && !v.morte; ano++) {
        const fim = v.relogio.idadeMeses + 12;
        let maior = 0;
        while (v.relogio.idadeMeses < fim && !v.morte) {
          v = avancarPeriodo(v, true);
          let g = 0;
          while (v.pendente && g++ < 5) v = escolher(v, 0);
          if (v.pendente) v = { ...v, pendente: null };
          maior = Math.max(maior, v.diretor?.intensidade ?? 0);
        }
        anos++;
        if (maior >= 30) picos++;
        if (maior < 10) vales++;
      }
    }
    expect(picos).toBeGreaterThan(0);
    expect(vales / anos).toBeGreaterThan(0.2);
  }, 120000);
});
