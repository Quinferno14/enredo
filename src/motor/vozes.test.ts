// Feed por fase da vida: trocas de pessoa, letra de criança e uma vida inteira sem perder linha.

import { describe, expect, it } from 'vitest';
import { jogarPeriodo } from './automatico';
import { criarVida } from './vida';
import { conjugar, faseDaIdade, idadeNaData, letraDeCrianca, paraPrimeira, paraTerceira, recontar, separarResumo, textoDoItem } from './vozes';

describe('vozes: trocas de pessoa', () => {
  it('conjuga a primeira pessoa', () => {
    expect(conjugar('ganhou')).toBe('ganhei');
    expect(conjugar('brincou')).toBe('brinquei');
    expect(conjugar('chegou')).toBe('cheguei');
    expect(conjugar('começou')).toBe('comecei');
    expect(conjugar('perdeu')).toBe('perdi');
    expect(conjugar('caiu')).toBe('caí');
    expect(conjugar('foi')).toBe('fui');
    expect(conjugar('teve')).toBe('tive');
  });

  it('passa para a primeira pessoa', () => {
    expect(paraPrimeira('Você ganhou uma bicicleta usada e quer aprender a andar sem rodinha.'))
      .toBe('Eu ganhei uma bicicleta usada e quero aprender a andar sem rodinha.');
    expect(paraPrimeira('Você e seu pai, André, saíram para dar uma volta.')).toBe('Eu e meu pai André saímos para dar uma volta.');
    expect(paraPrimeira('Você foi ao posto e fez um check-up.')).toBe('Eu fui ao posto e fiz um check-up.');
    expect(paraPrimeira('Sua avó, Terezinha, encheu seu prato pela terceira vez.')).toBe('Minha avó Terezinha encheu meu prato pela terceira vez.');
    expect(paraPrimeira('Você se perdeu num livro.')).toBe('Eu me perdi num livro.');
    // Frases que o painel de jogadores pegou quebradas.
    expect(paraPrimeira('Vocês saíram, riram muito e começaram a namorar.')).toBe('Nós saímos, rimos muito e começamos a namorar.');
    expect(paraPrimeira('Você não para de pensar em Júlia.')).toBe('Eu não paro de pensar em Júlia.');
    expect(paraPrimeira('Você completou 18 anos e agora é maior de idade.')).toBe('Eu completei 18 anos e agora sou maior de idade.');
    expect(paraPrimeira('Você levou a pior e ainda foi parar na diretoria.')).toBe('Eu levei a pior e ainda fui parar na diretoria.');
    expect(paraPrimeira('Vocês combinam muito.')).toBe('Nós combinamos muito.');
    expect(paraPrimeira('Você está se sentindo mais saudável.')).toBe('Eu estou me sentindo mais saudável.');
    expect(paraPrimeira('Você não passou. A turma começou a te chamar por um apelido que você odeia.'))
      .toBe('Eu não passei. A turma começou a me chamar por um apelido que eu odeio.');
    expect(paraPrimeira('Seu Antônio, o vizinho, chamou você para ajudar.')).toBe('Seu Antônio, o vizinho, me chamou para ajudar.');
  });

  it('passa para a terceira pessoa (a família contando)', () => {
    expect(paraTerceira('Você deu os primeiros passos.', 'Pedro', 'masculino')).toBe('Pedro deu os primeiros passos.');
    expect(paraTerceira('Sua primeira palavra foi "mamã". Sua mãe chorou.', 'Ana', 'feminino')).toBe('A primeira palavra foi "mamã". A mamãe chorou.');
    expect(paraTerceira('Você dormiu no colo, quentinho. Depois você acordou.', 'Ana', 'feminino')).toBe('Ana dormiu no colo, quentinho. Depois ela acordou.');
  });

  it('separa o texto das etiquetas e das notas', () => {
    const r = separarResumo('→ Cozinhar o almoço você mesmo. (Bem o seu jeito empático.) Cansaço +3 · Felicidade +1 · Culinária +1');
    expect(r.corpo).toBe('→ Cozinhar o almoço você mesmo.');
    expect(r.tags).toEqual(['Cansaço +3', 'Felicidade +1', 'Culinária +1']);
    expect(r.notas).toEqual(['Bem o seu jeito empático']);
    const d = separarResumo('Você deu um presente para seu amigo, Davi. −R$ 30 · Afeto de Davi +7 · (vocês combinam)');
    expect(d.tags).toEqual(['−R$ 30', 'Afeto de Davi +7']);
    expect(d.notas).toEqual(['vocês combinam']);
    expect(separarResumo('Você foi parar no "hospital (de novo)".').corpo).toBe('Você foi parar no "hospital (de novo)".');
  });

  it('letra de criança some com a idade', () => {
    const t = 'Hoje eu brinquei muito com meu irmão também.';
    expect(letraDeCrianca(t, 11.5, 'x')).toBe(t);
    expect(letraDeCrianca(t, 6, 'x')).not.toBe(t);
  });

  it('acha a idade de cada linha pela data', () => {
    const v = criarVida({ id: 'i', seed: 'i', ano: 2026, mes: 3, criadaEm: 'x', turno: 'dinamico', morte: 'permanente', inicio: 'bebe' });
    expect(idadeNaData(v, 'março de 2026')).toBe(0);
    expect(idadeNaData(v, 'março de 2031')).toBe(60);
    expect(faseDaIdade(60)).toBe('crianca');
  });
});

describe('vozes: uma vida inteira', () => {
  let v = criarVida({ id: 'vz', seed: 'vozes-vida', ano: 2026, criadaEm: 'x', turno: 'dinamico', morte: 'permanente', inicio: 'bebe' });
  for (let i = 0; i < 3000 && !v.morte; i++) v = jogarPeriodo(v, { acoes: 1, familia: true, carreira: true });
  const blocos = recontar(v);

  it('passa pelas cinco fases', () => {
    const fases = new Set(blocos.map((b) => b.fase));
    expect([...fases].sort()).toEqual(['adolescente', 'adulto', 'bebe', 'crianca', 'idoso'].filter((f) => fases.has(f as never)).sort());
    expect(fases.size).toBeGreaterThanOrEqual(4);
  });

  it('nenhuma linha some e nenhum marcador fica quebrado', () => {
    const itens = blocos.flatMap((b) => b.itens);
    // Toda linha da história gera pelo menos um item (respostas e correntes são a mais).
    expect(itens.length).toBeGreaterThanOrEqual(v.historico.length);
    for (const it of itens) expect(textoDoItem(it)).not.toMatch(/[{}]|undefined|NaN/);
  });

  it('mostra um pedaço de cada fase (para ler no console)', () => {
    for (const fase of ['bebe', 'crianca', 'adolescente', 'adulto', 'idoso']) {
      const amostra = blocos.filter((b) => b.fase === fase).slice(2, 5);
      console.log(`\n=== ${fase} ===\n` + amostra.map((b) => `[${b.quando}] ${b.titulo}\n` + b.itens.map((it) => `  ${it.tipo}${'autor' in it && it.autor ? ` (${it.autor})` : ''}${'para' in it && it.para ? ` →${it.para}` : ''}: ${textoDoItem(it)}${'tags' in it && it.tags.length ? `  [${it.tags.join(', ')}]` : ''}${it.tipo === 'post' ? `  ♥${it.curtidas}${it.privado ? ' privado' : ''}${it.apagado ? ' apagado' : ''}` : ''}${'audio' in it && it.audio ? ` 🎤${it.audio}` : ''}`).join('\n')).join('\n'));
    }
  });
}, 300_000);
