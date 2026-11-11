// Pessoas vivas (R3): família extensa, amigos, colegas e vizinhos que surgem,
// se aproximam e se afastam; compatibilidade de personalidade; lembranças do
// que você fez com cada um; e a vida própria de cada pessoa (namoro, casamento,
// filhos, mudança, desemprego), que chega até você quando ela é próxima.

import nomes from '../conteudo/nomes.json';
import { aplicar, lembrar } from './efeitos';
import { limitar } from './envelhecer';
import { capitalizar, gerarPessoa, nomesEmUso, papelTexto, sortearNome } from './familia';
import type { Rng } from './rng';
import type { Eixo, Origem, Papel, Pessoa, Sexo, Vida } from './tipos';

const idadeAnos = (p: { idadeMeses: number }) => p.idadeMeses / 12;
const fem = (p: { sexo: Sexo }) => p.sexo === 'feminino';
const ao = (p: { sexo: Sexo }) => (fem(p) ? 'a' : 'o');

/** Papéis de fora da família: aparecem e somem com a vida. */
export const SOCIAIS: Papel[] = ['amigo', 'colega', 'vizinho'];
export const PARENTES: Papel[] = ['mae', 'pai', 'irmao', 'filho', 'avo', 'tio', 'primo', 'sobrinho', 'neto'];

// ---- Assuntos e compatibilidade ----

export const ASSUNTOS: { id: string; nome: string; idadeMin: number }[] = [
  { id: 'dia', nome: 'Como foi o dia', idadeMin: 3 },
  { id: 'escola', nome: 'Escola ou trabalho', idadeMin: 6 },
  { id: 'futebol', nome: 'Futebol', idadeMin: 5 },
  { id: 'fofoca', nome: 'Fofoca', idadeMin: 8 },
  { id: 'sonhos', nome: 'Sonhos e planos', idadeMin: 8 },
  { id: 'novela', nome: 'Novela e séries', idadeMin: 8 },
  { id: 'games', nome: 'Games', idadeMin: 6 },
  { id: 'namoro', nome: 'Namoro', idadeMin: 12 },
  { id: 'religiao', nome: 'Religião', idadeMin: 10 },
  { id: 'politica', nome: 'Política', idadeMin: 14 },
];
/** Assuntos que podem ser o favorito de alguém ("como foi o dia" serve para todos). */
const GOSTAVEIS = ASSUNTOS.filter((a) => a.id !== 'dia').map((a) => a.id);
export const nomeAssunto = (id: string) => ASSUNTOS.find((a) => a.id === id)?.nome.toLowerCase() ?? id;

export function sortearGostos(rng: Rng): string[] {
  const a = rng.escolher(GOSTAVEIS);
  let b = rng.escolher(GOSTAVEIS);
  while (b === a) b = rng.escolher(GOSTAVEIS);
  return [a, b];
}

/**
 * Quanto duas personalidades combinam, de −1 a 1. Pesa parecer-se no jeito
 * (extroversão, curiosidade, moral, ambição), ter empatia, e dois esquentados juntos.
 */
export function compatibilidade(a: Record<Eixo, number>, b: Record<Eixo, number>): number {
  const eixos: Eixo[] = ['extroversao', 'curiosidade', 'moralidade', 'ambicao'];
  const dif = eixos.reduce((s, e) => s + Math.abs(a[e] - b[e]), 0) / eixos.length;
  let c = 1 - (2 * dif) / 110;
  c += (a.empatia + b.empatia) / 400;
  if (a.impulsividade > 30 && b.impulsividade > 30) c -= 0.25;
  return Math.max(-1, Math.min(1, c));
}

export function compatCom(vida: Vida, pe: Pessoa): number {
  return compatibilidade(vida.personagem.personalidade, pe.personalidade);
}

export function rotuloCompat(c: number): string {
  return c >= 0.45 ? 'vocês combinam muito' : c >= 0.15 ? 'vocês combinam' : c >= -0.15 ? 'nada demais' : c >= -0.45 ? 'vocês combinam pouco' : 'vocês não combinam';
}

// ---- Lembranças ----

export function lembrarPessoa(vida: Vida, pe: Pessoa, texto: string, peso: number) {
  pe.lembrancas = [...(pe.lembrancas ?? []), { texto, idadeMeses: vida.relogio.idadeMeses, peso }].slice(-6);
}

/** Briga ou provocação dos últimos dois anos que ainda não foi perdoada. */
export function magoaRecente(vida: Vida, pe: Pessoa) {
  return (pe.lembrancas ?? []).find((l) => l.peso < 0 && !l.desculpado && vida.relogio.idadeMeses - l.idadeMeses <= 24);
}

/** Família próxima ou afeto alto: o que acontece com ela chega até você. */
export function proximo(pe: Pessoa): boolean {
  return ['mae', 'pai', 'irmao', 'filho', 'parceiro', 'neto'].includes(pe.papel) || pe.afeto >= 60;
}

// ---- Ocupação ----

const OCUPACOES: [number, [string, string][]][] = [
  [2600, [['vendedor', 'vendedora'], ['atendente', 'atendente'], ['motorista de app', 'motorista de app'], ['caixa de mercado', 'caixa de mercado'],
    ['pedreiro', 'diarista'], ['cabeleireiro', 'cabeleireira'], ['porteiro', 'recepcionista'], ['cozinheiro', 'cozinheira'], ['entregador', 'manicure']]],
  [6500, [['professor', 'professora'], ['técnico de enfermagem', 'técnica de enfermagem'], ['auxiliar administrativo', 'auxiliar administrativa'],
    ['policial', 'policial'], ['eletricista', 'contadora'], ['analista', 'analista'], ['corretor de imóveis', 'corretora de imóveis'], ['bancário', 'bancária']]],
  [Infinity, [['médico', 'médica'], ['engenheiro', 'engenheira'], ['advogado', 'advogada'], ['gerente', 'gerente'],
    ['empresário', 'empresária'], ['programador', 'programadora'], ['dentista', 'dentista']]],
];

/** Define a ocupação (ou apaga, para quem ainda é pequeno demais). */
export function ocupar(rng: Rng, pe: Pessoa) {
  const o = ocupacaoPara(rng, pe);
  if (o) pe.ocupacao = o; else delete pe.ocupacao;
}

export function ocupacaoPara(rng: Rng, pe: Pessoa): string | undefined {
  const idade = idadeAnos(pe);
  if (idade < 6) return undefined;
  if (idade < 18) return 'estudante';
  if (idade >= 65 && pe.renda > 0) return `aposentad${ao(pe)}`;
  if (pe.renda <= 0) return idade >= 60 ? `aposentad${ao(pe)}` : rng.proximo() < 0.4 ? 'do lar' : `desempregad${ao(pe)}`;
  const faixa = OCUPACOES.find(([teto]) => pe.renda < teto)![1];
  const par = rng.escolher(faixa);
  return fem(pe) ? par[1] : par[0];
}

// ---- Gente nova ----

/** De onde vem a gente nova agora: escola, faculdade, trabalho ou o bairro. */
export function origemAtual(vida: Vida): Origem | null {
  const p = vida.personagem;
  const idade = vida.relogio.idadeMeses / 12;
  if (idade < 4) return null;
  if (p.estudo.etapa === 'fundamental' || p.estudo.etapa === 'medio') return 'escola';
  if (p.estudo.etapa === 'faculdade') return 'faculdade';
  if (p.trabalho.emprego || p.trabalho.extras.length) return 'trabalho';
  return 'bairro';
}

const ONDE: Record<Origem, string> = {
  escola: 'Na escola', faculdade: 'Na faculdade', trabalho: 'No trabalho', bairro: 'No bairro', atividade: 'Numa atividade', internet: 'Na internet',
};

function idadeParaOrigem(vida: Vida, rng: Rng, o: Origem): number {
  const idade = vida.relogio.idadeMeses / 12;
  switch (o) {
    case 'escola': return Math.max(4, idade + rng.inteiro(-1, 1) + rng.proximo());
    case 'faculdade': return Math.max(17, idade + rng.inteiro(-2, 6) + rng.proximo());
    case 'trabalho': return Math.max(16, idade + rng.inteiro(-12, 15) + rng.proximo());
    case 'bairro': return idade < 14 ? Math.max(4, idade + rng.inteiro(-2, 2)) : Math.max(14, idade + rng.inteiro(-20, 25));
    default: return idade < 14 ? Math.max(4, idade + rng.inteiro(-2, 2)) : Math.max(14, idade + rng.inteiro(-8, 10));
  }
}

/** Cria alguém que você acabou de conhecer e põe na lista. */
export function conhecer(vida: Vida, rng: Rng, origem: Origem, papel: Papel = origem === 'bairro' ? 'vizinho' : 'colega'): Pessoa {
  const anos = idadeParaOrigem(vida, rng, origem);
  const carisma = vida.personagem.atributos.carisma;
  const pe = gerarPessoa(rng, { papel, idadeMeses: Math.round(anos * 12), afeto: [25 + Math.round(carisma / 8), 45 + Math.round(carisma / 6)], ano: vida.relogio.ano, usados: nomesEmUso(vida) });
  pe.origem = origem;
  ocupar(rng, pe);
  vida.pessoas.push(pe);
  return pe;
}

/** Quantos amigos, colegas e vizinhos ativos existem (o limite segura a lista). */
export function circuloSocial(vida: Vida): Pessoa[] {
  return vida.pessoas.filter((x) => x.vivo && !x.afastado && SOCIAIS.includes(x.papel));
}

const LIMITE_CIRCULO = 12;

/** Talvez conhecer alguém numa atividade (esporte, curso, sair). Devolve a linha ou null. */
export function talvezConhecer(vida: Vida, rng: Rng, chance: number, onde: string): string | null {
  if (vida.relogio.idadeMeses < 4 * 12 || circuloSocial(vida).length >= LIMITE_CIRCULO) return null;
  if (rng.proximo() >= chance) return null;
  const pe = conhecer(vida, rng, 'atividade');
  return `${onde}: você conheceu ${pe.nome}, ${Math.floor(idadeAnos(pe))} anos. ${capitalizar(rotuloCompat(compatCom(vida, pe)))}.`;
}

// ---- Família extensa ----

function chanceVivo(idade: number): number {
  return idade < 65 ? 0.97 : idade < 75 ? 0.85 : idade < 85 ? 0.6 : idade < 95 ? 0.3 : 0;
}

/** Avós, tios, primos e um vizinho, montados em volta de mãe e pai. */
export function familiaEstendida(rng: Rng, sobrenome: string, idadeJogadorMeses: number, mae?: Pessoa, pai?: Pessoa, ano = 2026, usados = new Set<string>()): Pessoa[] {
  const out: Pessoa[] = [];
  const idadeJ = idadeJogadorMeses / 12;
  const idadeMae = mae ? idadeAnos(mae) : idadeJ + 26;
  const idadePai = pai ? idadeAnos(pai) : idadeMae + 2;

  // Avós: dois de cada lado, se ainda estão vivos.
  for (const [base, lado] of [[idadeMae, 'mae'], [idadePai, 'pai']] as const) {
    const sob = lado === 'pai' ? sobrenome : rng.escolher(nomes.sobrenomes);
    for (const sexo of ['feminino', 'masculino'] as Sexo[]) {
      const idade = base + rng.inteiro(18, 34) + (sexo === 'masculino' ? rng.inteiro(0, 4) : 0);
      if (rng.proximo() >= chanceVivo(idade)) continue;
      const avo = gerarPessoa(rng, { papel: 'avo', sexo, sobrenome: sob, idadeMeses: Math.round(idade * 12), afeto: [55, 90], ano, usados });
      ocupar(rng, avo);
      out.push(avo);
    }
  }

  // Tios e primos.
  const nTios = rng.inteiro(1, 3);
  let primos = 0;
  for (let i = 0; i < nTios; i++) {
    const ladoPai = rng.proximo() < 0.5;
    const base = ladoPai ? idadePai : idadeMae;
    const idadeTio = Math.max(idadeJ + 14, base + rng.inteiro(-9, 9));
    const tio = gerarPessoa(rng, { papel: 'tio', sobrenome: ladoPai ? sobrenome : rng.escolher(nomes.sobrenomes), idadeMeses: Math.round(idadeTio * 12), afeto: [40, 75], ano, usados });
    ocupar(rng, tio);
    if (idadeTio >= 22 && rng.proximo() < 0.7) {
      tio.casado = true;
      tio.parceiroNome = sortearNome(rng, fem(tio) ? 'masculino' : 'feminino', ano - Math.floor(idadeTio), usados);
    }
    out.push(tio);
    const nPrimos = tio.casado ? rng.inteiro(0, 2) : 0;
    for (let k = 0; k < nPrimos && primos < 4; k++) {
      const idade = Math.max(0, Math.min(idadeTio - 18, idadeJ + rng.inteiro(-8, 8)));
      const primo = gerarPessoa(rng, { papel: 'primo', sobrenome: tio.sobrenome, idadeMeses: Math.round(idade * 12), afeto: [35, 70], ano, usados });
      primo.genitor = tio.id;
      ocupar(rng, primo);
      out.push(primo);
      primos++;
    }
    tio.filhos = nPrimos;
  }

  // Um vizinho de anos.
  const viz = gerarPessoa(rng, { papel: 'vizinho', idadeMeses: Math.round((idadeJ + rng.inteiro(28, 60)) * 12), afeto: [40, 60], ano, usados });
  viz.origem = 'bairro';
  ocupar(rng, viz);
  out.push(viz);
  return out;
}

/** Quem começa adulto chega com dois amigos dos tempos de escola. */
export function amigosDeInicio(rng: Rng, idadeJogadorMeses: number, ano = 2026, usados = new Set<string>()): Pessoa[] {
  const out: Pessoa[] = [];
  for (let i = 0; i < 2; i++) {
    const pe = gerarPessoa(rng, { papel: 'amigo', idadeMeses: idadeJogadorMeses + rng.inteiro(-14, 14), afeto: [58, 78], ano, usados });
    pe.origem = 'escola';
    ocupar(rng, pe);
    out.push(pe);
  }
  return out;
}

// ---- Período ----

/** Alvo do afeto sem contato e velocidade com que ele vai até lá, por papel. */
export function alvoAfeto(pe: Pessoa, vida: Vida): [number, number] {
  const idade = idadeAnos(pe);
  // Quem convive com você todo dia (mesma escola, faculdade ou trabalho) se aproxima sozinho, conforme combina.
  const convive = !pe.longe && !!pe.origem && pe.origem === origemAtual(vida);
  const c = convive ? compatCom(vida, pe) : 0;
  if (pe.rival) return [15, 0.1];
  switch (pe.papel) {
    case 'filho': return idade < 12 ? [85, 0.08] : [45, 0.08];
    case 'neto': return idade < 12 ? [70, 0.08] : [45, 0.08];
    case 'parceiro': return [35, 0.15];
    case 'ex': return [20, 0.08];
    case 'avo': return [55, 0.06];
    case 'tio': case 'primo': case 'sobrinho': return [35, 0.08];
    case 'amigo': return pe.longe ? [10, 0.2] : convive ? [42 + 20 * c, 0.12] : [20, 0.12];
    case 'colega': return pe.longe ? [5, 0.3] : convive ? [30 + 40 * c, 0.15] : [25, 0.15];
    case 'vizinho': return pe.longe ? [10, 0.2] : [35, 0.08];
    default: return [45, 0.08];
  }
}

const NAMORADEIROS: Papel[] = ['amigo', 'colega', 'vizinho', 'irmao', 'filho', 'primo', 'sobrinho', 'neto', 'ex', 'tio'];

/**
 * Gente nova, amizades que crescem ou acabam, e a vida própria de cada um.
 * Roda depois de rodarPessoas (que já envelheceu todo mundo). Altera `vida` no lugar.
 */
export function rodarSocial(vida: Vida, anos: number, rng: Rng): string[] {
  const linhas: string[] = [];
  const p = vida.personagem;
  const idadeJ = vida.relogio.idadeMeses / 12;
  const origem = origemAtual(vida);

  // 1. Gente nova do lugar onde você está na vida.
  if (origem && circuloSocial(vida).length < LIMITE_CIRCULO) {
    const taxa = { escola: 0.6, faculdade: 0.5, trabalho: 0.35, bairro: 0.1, atividade: 0, internet: 0 }[origem];
    const t = taxa * (1 + p.personalidade.extroversao / 200);
    if (rng.proximo() < t * anos) {
      const pe = conhecer(vida, rng, origem);
      linhas.push(`${ONDE[origem]}, você conheceu ${pe.nome}${idadeJ >= 14 ? `, ${Math.floor(idadeAnos(pe))} anos` : ''}. ${capitalizar(rotuloCompat(compatCom(vida, pe)))}.`);
    }
  }

  // 2. Amizades que crescem, esfriam ou acabam.
  for (const pe of vida.pessoas) {
    if (!pe.vivo || pe.afastado || !SOCIAIS.includes(pe.papel)) continue;
    // Colega de uma escola ou emprego que ficou para trás esfria rápido.
    if (pe.papel === 'colega' && pe.origem && pe.origem !== 'atividade' && pe.origem !== origem) pe.longe = true;
    if (pe.papel !== 'amigo' && pe.afeto >= 60 && !pe.rival && Math.abs(idadeAnos(pe) - idadeJ) <= 25) {
      pe.papel = 'amigo';
      linhas.push(`${pe.nome} virou ${fem(pe) ? 'sua amiga' : 'seu amigo'} de verdade.`);
    } else if (pe.papel === 'amigo' && pe.afeto < 25) {
      pe.afastado = true;
      linhas.push(`Você e ${pe.nome} perderam o contato.`);
    } else if (pe.papel !== 'amigo' && pe.afeto < 12) {
      pe.afastado = true;
    }
  }
  // Colega ou vizinho que nunca importou some de vez, em vez de lotar a lista.
  vida.pessoas = vida.pessoas.filter((x) => !(x.afastado && x.papel !== 'amigo' && SOCIAIS.includes(x.papel) && !(x.lembrancas?.length) && !x.rival));

  // 3. Vida própria.
  let contadas = 0;
  const contar = (texto: string, pe: Pessoa) => {
    if (proximo(pe) && contadas < 3) { linhas.push(texto); contadas++; }
  };
  for (const pe of [...vida.pessoas]) {
    if (!pe.vivo || pe.afastado) continue;
    const idade = idadeAnos(pe);
    const Quem = `${capitalizar(papelTexto(pe))}, ${pe.nome},`;

    if (idade >= 18 && (!pe.ocupacao || pe.ocupacao === 'estudante' || (pe.renda > 0 && /desempregad|do lar/.test(pe.ocupacao)))) ocupar(rng, pe);
    if (idade >= 65 && pe.renda > 0 && pe.ocupacao && !pe.ocupacao.startsWith('aposentad') && rng.proximo() < 0.3 * anos) {
      pe.ocupacao = `aposentad${ao(pe)}`;
    }

    if (NAMORADEIROS.includes(pe.papel)) {
      if (!pe.parceiroNome && idade >= 18 && idade <= 55 && rng.proximo() < 0.12 * anos) {
        const sexo: Sexo = rng.proximo() < 0.9 ? (fem(pe) ? 'masculino' : 'feminino') : pe.sexo;
        pe.parceiroNome = sortearNome(rng, sexo, vida.relogio.ano - Math.floor(idade), nomesEmUso(vida));
        contar(`${Quem} começou a namorar ${pe.parceiroNome}.`, pe);
      } else if (pe.parceiroNome && !pe.casado && idade >= 21 && idade <= 60 && rng.proximo() < 0.1 * anos) {
        pe.casado = true;
        if (proximo(pe) && idadeJ >= 6 && !vida.ganchos.some((g) => g.evento === 'convite_casamento')) {
          vida.ganchos.push({ evento: 'convite_casamento', idadeMeses: vida.relogio.idadeMeses + rng.inteiro(2, 6), vars: { pessoaId: pe.id } });
        }
      } else if (pe.casado && idade >= 22 && idade <= 42 && (pe.filhos ?? 0) < 3 && rng.proximo() < 0.12 * anos) {
        pe.filhos = (pe.filhos ?? 0) + 1;
        if (pe.papel === 'filho' || pe.papel === 'irmao') {
          const papel: Papel = pe.papel === 'filho' ? 'neto' : 'sobrinho';
          const bebe = gerarPessoa(rng, { papel, idadeMeses: 0, sobrenome: pe.sobrenome, pais: [pe.potencial], afeto: papel === 'neto' ? [70, 90] : [50, 75], ano: vida.relogio.ano, usados: nomesEmUso(vida) });
          bebe.genitor = pe.id;
          vida.pessoas.push(bebe);
          if (papel === 'neto' && !vida.memorias.some((x) => x.id === 'virou_avo')) {
            lembrar(vida, 'virou_avo', `viu nascer ${fem(bebe) ? 'a primeira neta' : 'o primeiro neto'}, ${bebe.nome}`, 30, { pessoa: bebe.nome });
            aplicar(vida, { 'atributos.felicidade': 10 });
          }
          linhas.push(papel === 'neto'
            ? `Nasceu ${fem(bebe) ? 'sua neta' : 'seu neto'}, ${bebe.nome}, ${fem(pe) ? 'filha' : 'filho'} de ${pe.nome}!`
            : `${Quem} teve ${fem(bebe) ? 'uma menina' : 'um menino'}: ${bebe.nome}. Você virou ${fem(p) ? 'tia' : 'tio'}.`);
        } else {
          contar(`${Quem} teve ${rng.proximo() < 0.5 ? 'uma menina' : 'um menino'}.`, pe);
        }
      } else if (pe.casado && rng.proximo() < 0.012 * anos) {
        pe.casado = false;
        contar(`${Quem} se separou de ${pe.parceiroNome}.`, pe);
        delete pe.parceiroNome;
      }
    }

    if (SOCIAIS.includes(pe.papel) && !pe.longe && idade >= 18 && rng.proximo() < 0.02 * anos) {
      if (pe.papel === 'vizinho') {
        pe.afastado = true;
        if (pe.afeto >= 45) linhas.push(`${capitalizar(papelTexto(pe))}, ${pe.nome}, se mudou. A casa ao lado ficou vazia por um tempo.`);
        if (circuloSocial(vida).length < LIMITE_CIRCULO) conhecer(vida, rng, 'bairro');
      } else {
        pe.longe = true;
        contar(`${pe.nome} se mudou para outra cidade. Vocês prometeram manter contato.`, pe);
      }
    }

    if (pe.renda > 0 && idade >= 20 && idade < 63 && pe.papel !== 'parceiro' && rng.proximo() < 0.03 * anos) {
      pe.renda = 0;
      pe.ocupacao = `desempregad${ao(pe)}`;
      if (proximo(pe) && idadeJ >= 16 && ['amigo', 'irmao', 'filho', 'primo'].includes(pe.papel)
        && !vida.ganchos.some((g) => g.evento === 'pessoa_desempregada')) {
        vida.ganchos.push({ evento: 'pessoa_desempregada', idadeMeses: vida.relogio.idadeMeses + rng.inteiro(1, 3), vars: { pessoaId: pe.id } });
      }
    }
  }
  return linhas;
}

/** Afeto a mais ou a menos para o resultado de um gesto, pela compatibilidade e pela mágoa. */
export function multiplicadorGesto(vida: Vida, pe: Pessoa): { mult: number; nota: string } {
  const c = compatCom(vida, pe);
  let mult = 1 + 0.5 * c;
  const notas: string[] = [];
  if (c >= 0.45) notas.push('vocês combinam');
  else if (c <= -0.45) notas.push('vocês não combinam muito');
  if (magoaRecente(vida, pe)) {
    mult *= 0.5;
    notas.push(`${pe.nome} ainda está magoad${ao(pe)}`);
  }
  return { mult: limitar(mult, 0.2, 2), nota: notas.join('; ') };
}
