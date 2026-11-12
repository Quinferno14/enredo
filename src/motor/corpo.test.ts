import { describe, expect, it } from 'vitest';
import { PELES, alturaNaIdade, aparenciaDaPessoa, aparenciaDe, aparenciaDoPersonagem, definirIntimo, herdarGenes, lerIntimo, mudarVisual, pesoNaIdade, sortearGenes } from './corpo';
import { Rng } from './rng';
import { avancarPeriodo, criarVida } from './vida';
import { migrar } from '../save/save';

const nova = (seed: string) => criarVida({ id: seed, seed, criadaEm: '2026-01-01', ano: 2026, turno: 'ano', morte: 'permanente', inicio: 'bebe' } as Parameters<typeof criarVida>[0]);

describe('corpo', () => {
  it('toda a família nasce com genes, e você herda dos seus pais', () => {
    const v = nova('corpo-1');
    expect(v.personagem.genes).toBeDefined();
    for (const pe of v.pessoas) expect(pe.genes, pe.papel).toBeDefined();
    const mae = v.pessoas.find((x) => x.papel === 'mae')!;
    const pai = v.pessoas.find((x) => x.papel === 'pai')!;
    const ip = (h: string) => PELES.indexOf(h as typeof PELES[number]);
    const eu = ip(v.personagem.genes!.pele);
    expect(eu).toBeGreaterThanOrEqual(Math.min(ip(mae.genes!.pele), ip(pai.genes!.pele)) - 1);
    expect(eu).toBeLessThanOrEqual(Math.max(ip(mae.genes!.pele), ip(pai.genes!.pele)) + 1);
  });

  it('genes não gastam o sorteio do jogo (a mesma seed dá a mesma vida de antes)', () => {
    const a = nova('corpo-2'), b = nova('corpo-2');
    expect(a.rng).toEqual(b.rng);
    expect(a.personagem.genes).toEqual(b.personagem.genes);
  });

  it('a altura segue a curva de crescimento e a altura dos pais', () => {
    expect(alturaNaIdade(170, 'masculino', 0)).toBe(50);
    expect(alturaNaIdade(170, 'masculino', 10)).toBeGreaterThan(125);
    expect(alturaNaIdade(170, 'masculino', 10)).toBeLessThan(150);
    expect(alturaNaIdade(170, 'masculino', 25)).toBe(170);
    expect(alturaNaIdade(170, 'masculino', 85)).toBeLessThan(170);
    const rng = Rng.daSeed('alturas');
    const altos = Array.from({ length: 300 }, () => herdarGenes(rng, 'masculino', { ...sortearGenes(rng, 'feminino'), alturaAlvo: 178 }, { ...sortearGenes(rng, 'masculino'), alturaAlvo: 192 }).alturaAlvo);
    const baixos = Array.from({ length: 300 }, () => herdarGenes(rng, 'masculino', { ...sortearGenes(rng, 'feminino'), alturaAlvo: 150 }, { ...sortearGenes(rng, 'masculino'), alturaAlvo: 162 }).alturaAlvo);
    const media = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    expect(media(altos) - media(baixos)).toBeGreaterThan(20);
  });

  it('peso acompanha a forma física; nada de valores absurdos', () => {
    const g = sortearGenes(Rng.daSeed('peso'), 'feminino');
    const emForma = pesoNaIdade(g, 'feminino', 30, 90);
    const sedentaria = pesoNaIdade(g, 'feminino', 30, 15);
    expect(sedentaria).toBeGreaterThan(emForma + 8);
    for (const idade of [0, 1, 5, 12, 18, 40, 80]) for (const forma of [0, 50, 100]) {
      const imc = pesoNaIdade(g, 'feminino', idade, forma) / (alturaNaIdade(g.alturaAlvo, 'feminino', idade) / 100) ** 2;
      expect(imc, `${idade} anos, forma ${forma}`).toBeGreaterThan(12);
      expect(imc).toBeLessThan(42);
    }
  });

  it('cabelos brancos e calvície chegam com a idade', () => {
    const g = { ...sortearGenes(Rng.daSeed('calvo'), 'masculino'), grisalhoAos: 50, calvicieAos: 30, estilo: 'liso-curto' as const, corCabelo: '#1b1310' };
    const jovem = aparenciaDe({ sexo: 'masculino', idadeAnos: 22, forma: 50, genes: g });
    const velho = aparenciaDe({ sexo: 'masculino', idadeAnos: 70, forma: 50, genes: g });
    expect(jovem.cabelo).toBe('liso-curto');
    expect(jovem.corCabelo).toBe('#1b1310');
    expect(velho.cabelo).toBe('careca');
    expect(velho.corCabelo).not.toBe('#1b1310');
  });

  it('crianças não têm barba nem tatuagem', () => {
    const g = { ...sortearGenes(Rng.daSeed('crianca'), 'masculino'), barba: 'cheia' as const, tatuada: true };
    const a = aparenciaDe({ sexo: 'masculino', idadeAnos: 10, forma: 50, genes: g, visual: { tatuagens: ['braco-esquerdo'] } });
    expect(a.barba).toBe('nenhuma');
    expect(a.tatuagens).toEqual([]);
  });

  it('íntimo: o motor recusa gravar ou ler para menores de 18, e nunca entra no desenho', () => {
    const v = nova('corpo-3');
    const p = v.personagem;
    expect(definirIntimo(p, 15, 'detalhe', 'x')).toBe(false);
    expect(p.visual?.intimo).toBeUndefined();
    expect(definirIntimo(p, 19, 'detalhe', 'x')).toBe(true);
    expect(lerIntimo(p, 19)).toEqual({ detalhe: 'x' });
    expect(lerIntimo(p, 17)).toEqual({});
    const desenho = aparenciaDoPersonagem(v)!;
    expect(JSON.stringify(desenho)).not.toContain('detalhe');
    // Mudar o visual não apaga o que já estava gravado.
    expect(mudarVisual(p, 19, { cabelo: 'coque' })).toBe(true);
    expect(lerIntimo(p, 19)).toEqual({ detalhe: 'x' });
    expect(mudarVisual(p, 14, { tatuagens: ['perna'] })).toBe(false);
  });

  it('quem aparece depois (filhos, amigos) ganha genes na passagem do tempo', () => {
    let v = nova('corpo-4');
    for (let i = 0; i < 30; i++) v = avancarPeriodo({ ...v, pendente: null });
    for (const pe of v.pessoas) expect(aparenciaDaPessoa(pe), pe.papel).not.toBeNull();
  });

  it('save antigo (versão 8) ganha genes ao abrir', () => {
    const v = nova('corpo-5');
    const antigo = structuredClone(v) as unknown as Record<string, unknown>;
    antigo.versao = 8;
    delete (antigo.personagem as Record<string, unknown>).genes;
    for (const pe of antigo.pessoas as Record<string, unknown>[]) delete pe.genes;
    const m = migrar(antigo)!;
    expect(m.versao).toBe(9);
    expect(m.personagem.genes).toEqual(v.personagem.genes);
  });
});
