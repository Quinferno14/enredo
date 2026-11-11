// R3: pessoas vivas. Família extensa, amigos que surgem e somem, ações com
// compatibilidade e lembranças, vida própria das pessoas e Modo Deus das pessoas.

import { describe, expect, it } from 'vitest';
import { jogarPeriodo } from './automatico';
import { criarPessoaDeus, editarPessoa } from './deus';
import { acoesDaPessoa, continuarComoFilho, fazerAcaoPessoa } from './familia';
import { compatibilidade, magoaRecente } from './social';
import type { Vida } from './tipos';
import { criarVida } from './vida';

const nova = (seed: string, inicio: 'bebe' | 'adulto' = 'bebe', turno: 'ano' | 'dinamico' = 'ano') => criarVida({
  id: seed, seed, ano: 2026, criadaEm: '2026-11-11T00:00:00.000Z', turno, morte: 'permanente', inicio,
});

describe('pessoas vivas (R3)', () => {
  // Fotos de cada vida aos 30 e no fim.
  const aos30: Vida[] = [];
  const fins = Array.from({ length: 120 }, (_, i) => {
    let v = nova(`soc-${i}`);
    let foto = false;
    for (let k = 0; k < 300 && !v.morte; k++) {
      v = jogarPeriodo(v, { acoes: 2, carreira: true, familia: true });
      if (!foto && v.relogio.idadeMeses >= 30 * 12) { aos30.push(v); foto = true; }
    }
    return v;
  });
  const amigos30 = aos30.map((v) => v.pessoas.filter((p) => p.papel === 'amigo' && p.vivo && !p.afastado).length);
  const media = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / Math.max(1, xs.length);
  const linhasComPessoas = fins.map((v) => v.historico.filter((h) => v.pessoas.some((p) => p.papel !== 'mae' && p.papel !== 'pai' && h.texto.includes(p.nome))).length);
  const comNetos = fins.filter((v) => v.pessoas.some((p) => p.papel === 'neto')).length;
  const afastados = media(fins.map((v) => v.pessoas.filter((p) => p.afastado).length));
  console.log('Social:', JSON.stringify({
    amigosAos30: media(amigos30).toFixed(1),
    semAmigoAos30: `${((amigos30.filter((n) => n === 0).length / aos30.length) * 100).toFixed(0)}%`,
    linhasComPessoasPorVida: media(linhasComPessoas).toFixed(0),
    comNetos: `${((comNetos / fins.length) * 100).toFixed(0)}%`,
    afastadosPorVida: afastados.toFixed(1),
    pessoasNoFim: media(fins.map((v) => v.pessoas.length)).toFixed(0),
  }));

  it('quem nasce tem avós, tios ou primos, e um vizinho', () => {
    const vs = Array.from({ length: 40 }, (_, i) => nova(`fx-${i}`));
    for (const v of vs) expect(v.pessoas.some((p) => p.papel === 'vizinho')).toBe(true);
    expect(vs.filter((v) => v.pessoas.some((p) => p.papel === 'avo')).length).toBeGreaterThan(30);
    expect(vs.every((v) => v.pessoas.some((p) => p.papel === 'tio'))).toBe(true);
  });

  it('quem começa adulto já chega com amigos', () => {
    expect(nova('adulto-1', 'adulto').pessoas.filter((p) => p.papel === 'amigo').length).toBe(2);
  });

  it('aos 30, quase toda vida tem amigos de verdade', () => {
    expect(media(amigos30)).toBeGreaterThan(1.5);
    expect(amigos30.filter((n) => n === 0).length / aos30.length).toBeLessThan(0.25);
  });

  it('as pessoas aparecem na história e a lista não explode', () => {
    expect(media(linhasComPessoas)).toBeGreaterThan(40);
    expect(media(fins.map((v) => v.pessoas.filter((p) => p.vivo && !p.afastado).length))).toBeLessThan(45);
  });

  it('filhos crescem, casam e dão netos de verdade', () => {
    expect(comNetos / fins.length).toBeGreaterThan(0.15);
  });

  it('compatibilidade: iguais combinam, opostos não', () => {
    const a = { extroversao: 60, empatia: 40, disciplina: 0, impulsividade: 0, ambicao: 30, moralidade: 50, estabilidade: 0, curiosidade: 40 };
    const b = { ...a, extroversao: -60, ambicao: -50, moralidade: -60, curiosidade: -50, empatia: -40 };
    expect(compatibilidade(a, a)).toBeGreaterThan(0.6);
    expect(compatibilidade(a, b)).toBeLessThan(-0.3);
  });

  it('briga deixa mágoa até pedir desculpas, e o assunto favorito rende mais', () => {
    let v = nova('briga', 'adulto');
    const amigo = v.pessoas.find((p) => p.papel === 'amigo')!;
    v = fazerAcaoPessoa(v, amigo.id, 'brigar').vida;
    let pe = v.pessoas.find((p) => p.id === amigo.id)!;
    expect(magoaRecente(v, pe)).toBeDefined();
    expect(acoesDaPessoa(v, pe).some((a) => a.id === 'desculpas')).toBe(true);
    for (let i = 0; i < 8 && magoaRecente(v, pe); i++) {
      v = fazerAcaoPessoa(v, amigo.id, 'desculpas').vida;
      pe = v.pessoas.find((p) => p.id === amigo.id)!;
    }
    expect(magoaRecente(v, pe)).toBeUndefined();

    // Mesmo ponto de partida: o assunto favorito sobe mais que um que ela não liga.
    const base = nova('assunto', 'adulto');
    const alvo = base.pessoas.find((p) => p.papel === 'amigo')!;
    const fav = alvo.gostos![0]!;
    const outro = ['escola', 'futebol', 'fofoca', 'sonhos', 'novela', 'games', 'namoro', 'religiao'].find((x) => !alvo.gostos!.includes(x))!;
    const ganho = (assunto: string) => {
      const r = fazerAcaoPessoa(base, alvo.id, 'conversar', assunto).vida;
      return r.pessoas.find((p) => p.id === alvo.id)!.afeto - alvo.afeto;
    };
    expect(ganho(fav)).toBeGreaterThan(ganho(outro));
  });

  it('dá para chamar um amigo para sair e virar namoro', () => {
    let tentou = 0;
    let virou = 0;
    for (let i = 0; i < 40; i++) {
      let v = nova(`crush-${i}`, 'adulto');
      const amigo = v.pessoas.find((p) => p.papel === 'amigo' && acoesDaPessoa(v, p).some((a) => a.id === 'chamar_sair'));
      if (!amigo) continue;
      tentou++;
      v = fazerAcaoPessoa(v, amigo.id, 'chamar_sair').vida;
      if (v.pessoas.find((p) => p.id === amigo.id)!.papel === 'parceiro') virou++;
    }
    expect(tentou).toBeGreaterThan(10);
    expect(virou).toBeGreaterThan(0);
  });

  it('Modo Deus edita, mata, revive e cria pessoas', () => {
    let v = nova('deus-pessoas', 'adulto');
    const amigo = v.pessoas.find((p) => p.papel === 'amigo')!;
    v = editarPessoa(v, amigo.id, 'nome', 'Zé Pequeno');
    v = editarPessoa(v, amigo.id, 'eixo:empatia', 90);
    v = editarPessoa(v, amigo.id, 'idade', 50);
    let pe = v.pessoas.find((p) => p.id === amigo.id)!;
    expect(pe.nome).toBe('Zé Pequeno');
    expect(pe.personalidade.empatia).toBe(90);
    expect(pe.idadeMeses).toBe(600);
    v = editarPessoa(v, amigo.id, 'vivo', 0);
    expect(v.pessoas.find((p) => p.id === amigo.id)!.vivo).toBe(false);
    v = editarPessoa(v, amigo.id, 'vivo', 1);
    pe = v.pessoas.find((p) => p.id === amigo.id)!;
    expect(pe.vivo).toBe(true);
    const antes = v.pessoas.length;
    v = criarPessoaDeus(v, 'primo', 'feminino', 20, 'Dandara');
    expect(v.pessoas.length).toBe(antes + 1);
    expect(v.pessoas.at(-1)!.nome).toBe('Dandara');
    expect(v.historico.at(-1)!.texto.startsWith('✦')).toBe(true);
  });

  it('o herdeiro leva o parceiro e os filhos que já tinha', () => {
    const morta = fins.find((v) => v.pessoas.some((p) => p.papel === 'neto' && p.vivo && v.pessoas.some((f) => f.id === p.genitor && f.vivo && f.parceiroNome)));
    expect(morta).toBeDefined();
    const neto = morta!.pessoas.find((p) => p.papel === 'neto' && p.vivo && morta!.pessoas.some((f) => f.id === p.genitor && f.vivo && f.parceiroNome))!;
    const herdeiro = morta!.pessoas.find((p) => p.id === neto.genitor)!;
    const v = continuarComoFilho(morta!, herdeiro.id, 'herdeiro', '2026-11-11T00:00:00.000Z');
    expect(v.pessoas.some((p) => p.papel === 'parceiro' && p.nome === herdeiro.parceiroNome)).toBe(true);
    expect(v.pessoas.some((p) => p.papel === 'filho' && p.id === neto.id)).toBe(true);
  });
}, 300_000);
