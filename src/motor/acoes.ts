// Ações livres e hábitos. Não há limite de cliques: o que segura o exagero
// é o retorno que cai (curva logarítmica), o cansaço, o dinheiro, a idade e a lei.

import acoesJson from '../conteudo/acoes.json';
import {
  aplicar, atende, diferenca, foto, lembrar, mudarTraco, nivelTraco, reais, resumo, type Efeitos, type Quando,
} from './efeitos';
import { acaoCarreira, horasObrigacoes } from './carreira';
import { curva } from './curva';
import { limitar } from './envelhecer';
import { Rng } from './rng';
import type { EntradaHistorico, Vida } from './tipos';

export interface AcaoDef {
  id: string;
  nome: string;
  busca: string[];
  idade: [number, number];
  /** Horas por sessão, para a agenda da semana. */
  horas: number;
  /** Cansaço por sessão (negativo descansa). Não cai com a repetição. */
  desgaste: number;
  /** Custo em R$ por sessão. */
  custo?: number;
  /** Menores de 18 não pagam: os pais pagam. */
  paisPagam?: boolean;
  /** Efeitos da primeira sessão do período; as seguintes rendem cada vez menos. */
  efeitos: Efeitos;
  ganho?: [number, number];
  talento?: { id: string; nomes: string[] };
  vicio?: { id: string; chance: number };
  risco?: { acima: number; chance: number; texto: string; efeitos: Efeitos };
  /** Sorteio ou regra própria: bet, bicho, SUS, furto, e as de escola e trabalho (carreira.ts). */
  especial?: string;
  /** Condições além da idade (ex.: estar empregado). */
  requer?: Quando;
  semHabito?: boolean;
  textos: string[];
}

export const ACOES: readonly AcaoDef[] = acoesJson as AcaoDef[];
export const acaoPorId = (id: string) => ACOES.find((a) => a.id === id);

export const FREQUENCIAS = [1, 3, 7] as const;
const LIMIARES_TALENTO = [25, 120, 400];

export { curva };

const anosDoTurno = (vida: Vida) => (vida.config.turno === 'ano' ? 1 : 0.5);
const idadeDe = (vida: Vida) => vida.relogio.idadeMeses / 12;

export function disponivel(vida: Vida, a: AcaoDef): boolean {
  const idade = idadeDe(vida);
  return !vida.morte && idade >= a.idade[0] && idade <= a.idade[1] && atende(vida, a.requer);
}

export function acoesDisponiveis(vida: Vida): AcaoDef[] {
  return ACOES.filter((a) => disponivel(vida, a));
}

/** Quanto custa uma sessão para este personagem (os pais pagam algumas até os 18). */
export function custoPara(vida: Vida, a: AcaoDef): number {
  if (!a.custo) return 0;
  if (a.paisPagam && idadeDe(vida) < 18) return 0;
  return a.custo;
}

/** Sessões por ano que o hábito ativo desta ação já dá. */
function sessoesHabito(vida: Vida, id: string): number {
  const h = vida.habitos.find((x) => x.acao === id && !x.pausado);
  return h ? h.porSemana * 52 : 0;
}

/** Fração do efeito cheio que a próxima sessão à mão vai render (0 a 1). */
export function rendimentoProximo(vida: Vida, id: string): number {
  const anos = anosDoTurno(vida);
  const h = sessoesHabito(vida, id);
  const m = vida.periodo[id] ?? 0;
  return anos * (curva(h + (m + 1) / anos) - curva(h + m / anos));
}

export function rotuloEfeito(r: number): string {
  if (r >= 0.75) return 'efeito: grande';
  if (r >= 0.35) return 'efeito: médio';
  if (r >= 0.1) return 'efeito: pequeno';
  return 'efeito: mínimo';
}

export interface Resultado {
  vida: Vida;
  ok: boolean;
  aviso?: string;
}

/** Faz uma ação agora. Devolve a vida nova (ou a mesma, com aviso, se não deu). */
export function fazerAcao(vida: Vida, id: string): Resultado {
  const a = acaoPorId(id);
  if (!a || !disponivel(vida, a)) return { vida, ok: false, aviso: 'Essa ação não está disponível agora.' };
  const custo = custoPara(vida, a);
  if (custo > 0 && custo > vida.personagem.dinheiro) {
    return { vida, ok: false, aviso: `Sem dinheiro: precisa de ${reais(custo)}.` };
  }

  const prox = structuredClone(vida);
  const rng = new Rng(prox.rng);
  const antes = foto(prox);
  const extras: string[] = [];

  const r = rendimentoProximo(prox, id);
  aplicar(prox, a.efeitos, r);
  aplicar(prox, { desgaste: a.desgaste, dinheiro: -custo });
  if (a.ganho) {
    const mult = idadeDe(prox) >= 18 ? 1.5 : 1;
    aplicar(prox, { dinheiro: Math.round(rng.inteiro(a.ganho[0], a.ganho[1]) * mult) });
  }
  prox.periodo[id] = (prox.periodo[id] ?? 0) + 1;

  const especial = resolverEspecial(prox, a, rng);
  if (especial) extras.push(especial);
  extras.push(...sessoesFeitas(prox, a, 1, rng));
  if (a.risco && prox.personagem.desgaste >= a.risco.acima && rng.proximo() < a.risco.chance) {
    aplicar(prox, a.risco.efeitos);
    extras.push(a.risco.texto);
  }

  const delta = diferenca(antes, foto(prox));
  const quando = prox.historico.at(-1)?.quando ?? '';
  const ultima = prox.historico.at(-1);
  if (ultima && ultima.acao === id && extras.length === 0 && !a.especial) {
    // Mesma ação em seguida: junta numa linha só, somando o efeito.
    ultima.vezes = (ultima.vezes ?? 1) + 1;
    for (const [k, v] of Object.entries(delta)) ultima.delta = { ...ultima.delta, [k]: (ultima.delta?.[k] ?? 0) + v };
    ultima.texto = linhaAcao(a, ultima.vezes, ultima.delta ?? {}, a.textos[0]!);
  } else {
    const entrada: EntradaHistorico = {
      quando, acao: id, vezes: 1, delta,
      texto: linhaAcao(a, 1, delta, rng.escolher(a.textos)),
    };
    prox.historico.push(entrada);
    for (const t of extras) prox.historico.push({ quando, texto: t });
  }

  prox.rng = rng.estado();
  return { vida: prox, ok: true };
}

function linhaAcao(a: AcaoDef, vezes: number, delta: Record<string, number>, texto: string): string {
  const base = vezes > 1 ? `${a.textos[0]!.replace(/\.$/, '')} (${vezes}x).` : texto;
  const r = resumo(delta);
  return r ? `${base} ${r}` : base;
}

/** Bet, bicho, SUS e furto têm um sorteio próprio. Devolve uma linha extra ou null. */
function resolverEspecial(vida: Vida, a: AcaoDef, rng: Rng): string | null {
  const p = vida.personagem;
  const sorte = p.atributos.sorte / 100;
  switch (a.especial) {
    case 'bet': {
      // Em média a casa ganha: retorno esperado ~90%.
      const x = rng.proximo();
      if (x < 0.42 + sorte * 0.04) { aplicar(vida, { dinheiro: 95 }); return 'A aposta bateu: você recebeu R$ 95.'; }
      if (x > 0.995) { aplicar(vida, { dinheiro: 1500, 'atributos.felicidade': 6 }); return 'Zebra! Uma múltipla improvável bateu e rendeu R$ 1.500.'; }
      return null;
    }
    case 'bicho': {
      const x = rng.proximo();
      if (x < 0.04 + sorte * 0.01) { aplicar(vida, { dinheiro: 180, 'atributos.felicidade': 3 }); return 'Deu o seu bicho! R$ 180.'; }
      if (x > 0.992) {
        aplicar(vida, { 'atributos.felicidade': -6 });
        lembrar(vida, 'flagra_bicho', 'foi pego no jogo do bicho', -10);
        return 'A polícia fez uma batida no ponto do bicho. Você foi levado à delegacia, assinou um termo e saiu: jogo do bicho é contravenção.';
      }
      return null;
    }
    case 'sus': {
      if (rng.proximo() < 0.4) { aplicar(vida, { 'atributos.saude': -0.6, desgaste: 4 }); return 'A fila estava enorme; você foi atendido rápido demais para adiantar muito.'; }
      return null;
    }
    case 'furto': {
      const pego = rng.proximo() < 0.18 - p.atributos.sorte / 1000;
      if (pego) {
        aplicar(vida, { 'atributos.felicidade': -8, 'personalidade.moralidade': 2 });
        lembrar(vida, 'pego_furtando', 'foi pego furtando numa loja', -25);
        return idadeDe(vida) < 18
          ? 'O segurança te pegou na saída e chamou seus pais. Que vergonha.'
          : 'O segurança te pegou na saída. Boletim de ocorrência registrado.';
      }
      aplicar(vida, { dinheiro: rng.inteiro(20, 120) });
      if (!vida.ganchos.some((g) => g.evento === 'video_furto') && rng.proximo() < 0.25) {
        vida.ganchos.push({ evento: 'video_furto', idadeMeses: vida.relogio.idadeMeses + rng.inteiro(6, 24) });
      }
      return null;
    }
    default:
      return a.especial ? acaoCarreira(vida, a.especial, rng) : null;
  }
}

/**
 * Conta sessões feitas (à mão ou por hábito): talentos sobem com a prática acumulada,
 * vícios sobem com a chance de cada sessão. Devolve as linhas para o feed.
 */
export function sessoesFeitas(vida: Vida, a: AcaoDef, n: number, rng: Rng): string[] {
  const linhas: string[] = [];
  const total = (vida.totais[a.id] ?? 0) + n;
  vida.totais[a.id] = total;
  const p = vida.personagem;

  if (a.talento) {
    const facilidade = 1.5 - p.atributos.inteligencia / 100; // 0,5 a 1,5
    const nivel = LIMIARES_TALENTO.filter((l) => total >= l * facilidade).length;
    const atual = nivelTraco(vida, a.talento.id);
    if (nivel > atual) {
      mudarTraco(vida, a.talento.id, nivel - atual);
      linhas.push(`Talento novo: ${a.talento.nomes[nivel - 1]}.`);
    }
  }

  if (a.vicio && nivelTraco(vida, a.vicio.id) < 3) {
    const chance = a.vicio.chance * (1 + Math.max(0, p.personalidade.impulsividade) / 50)
      * (1 - Math.max(0, p.personalidade.disciplina) / 200);
    const subiu = 1 - (1 - chance) ** n;
    if (rng.proximo() < subiu) {
      mudarTraco(vida, a.vicio.id, 1);
      const nivel = nivelTraco(vida, a.vicio.id);
      linhas.push(nivel === 1
        ? `Você percebeu que ${NOME_VICIO[a.vicio.id] ?? a.vicio.id} começou a fazer falta.`
        : `${capitalizar(NOME_VICIO[a.vicio.id] ?? a.vicio.id)} está pesando mais na sua vida.`);
    }
  }
  return linhas;
}

const NOME_VICIO: Record<string, string> = { alcool: 'a bebida', cigarro: 'o cigarro', jogo: 'o jogo' };
const capitalizar = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ---- Hábitos ----

/** Cria, muda a frequência ou (porSemana 0) para um hábito. */
export function definirHabito(vida: Vida, acao: string, porSemana: number): Vida {
  const a = acaoPorId(acao);
  if (!a || a.semHabito) return vida;
  const prox = structuredClone(vida);
  const quando = prox.historico.at(-1)?.quando ?? '';
  const atual = prox.habitos.find((h) => h.acao === acao);
  if (porSemana <= 0) {
    prox.habitos = prox.habitos.filter((h) => h.acao !== acao);
    if (atual) prox.historico.push({ quando, texto: `Você parou o hábito: ${a.nome}.` });
  } else if (atual) {
    atual.porSemana = porSemana;
    delete atual.pausado;
    delete atual.imposto;
  } else {
    prox.habitos.push({ acao, porSemana });
    prox.historico.push({ quando, texto: `Hábito novo: ${a.nome}, ${porSemana}x por semana.` });
  }
  return prox;
}

/** Hábito imposto pelos pais: pedir para sair funciona metade das vezes, mais com carisma. */
export function pedirParaSair(vida: Vida, acao: string): Vida {
  const prox = structuredClone(vida);
  const rng = new Rng(prox.rng);
  const quando = prox.historico.at(-1)?.quando ?? '';
  const nome = acaoPorId(acao)?.nome ?? acao;
  if (rng.proximo() < 0.35 + prox.personagem.atributos.carisma / 250) {
    prox.habitos = prox.habitos.filter((h) => h.acao !== acao);
    prox.historico.push({ quando, texto: `Seus pais deixaram você sair da ${nome.toLowerCase()}.` });
  } else {
    prox.historico.push({ quando, texto: `Você pediu para sair da ${nome.toLowerCase()}, mas seus pais disseram que não.` });
    aplicar(prox, { 'atributos.felicidade': -2 });
  }
  prox.rng = rng.estado();
  return prox;
}

export function horasSemana(vida: Vida): number {
  return vida.habitos.reduce((s, h) => s + (h.pausado ? 0 : h.porSemana * (acaoPorId(h.acao)?.horas ?? 0)), 0);
}

/** Horas por semana de escola, trabalho e hábitos. */
export function horasAgenda(vida: Vida): number {
  return horasObrigacoes(vida) + horasSemana(vida);
}

/** Ação feita à mão 6 vezes no período e que ainda não é hábito: o jogo sugere. */
export function sugereHabito(vida: Vida, id: string): boolean {
  const a = acaoPorId(id);
  return !!a && !a.semHabito && (vida.periodo[id] ?? 0) >= 6 && !vida.habitos.some((h) => h.acao === id);
}

/**
 * Roda os hábitos do período que está fechando. Altera `vida` no lugar e
 * devolve as linhas do resumo ("Academia (3x/sem): Forma +6 · Cansaço +2").
 */
export function rodarHabitos(vida: Vida, anos: number, rng: Rng): string[] {
  const linhas: string[] = [];
  for (const h of vida.habitos) {
    const a = acaoPorId(h.acao);
    if (!a) continue;
    const idade = idadeDe(vida);
    if (idade < a.idade[0] || idade > a.idade[1]) {
      if (!h.pausado) linhas.push(`${a.nome}: pausado, não combina com a sua idade agora.`);
      h.pausado = 'idade';
      continue;
    }
    if (h.imposto && idade >= 18) {
      delete h.imposto;
      linhas.push(`Você fez 18: ${a.nome.toLowerCase()} agora é escolha sua, não dos seus pais.`);
    }
    const sessoes = Math.round(h.porSemana * 52 * anos);
    const custo = custoPara(vida, a) * sessoes;
    if (custo > 0 && custo > vida.personagem.dinheiro) {
      if (h.pausado !== 'dinheiro') linhas.push(`${a.nome}: pausado por falta de dinheiro (custa ${reais(custo)} no período).`);
      h.pausado = 'dinheiro';
      continue;
    }
    if (h.pausado) {
      linhas.push(`${a.nome}: o hábito voltou.`);
      delete h.pausado;
    }
    const antes = foto(vida);
    // As sessões à mão já foram calculadas em cima do hábito (rendimentoProximo),
    // então o hábito rende a curva cheia dele e a soma fica certa.
    const ganho = anos * curva(h.porSemana * 52);
    aplicar(vida, a.efeitos, ganho);
    aplicar(vida, { dinheiro: -custo });
    if (a.ganho) {
      const mult = idade >= 18 ? 1.5 : 1;
      aplicar(vida, { dinheiro: Math.round(((a.ganho[0] + a.ganho[1]) / 2) * sessoes * mult) });
    }
    // Cansaço dos hábitos: só o descanso conta inteiro; o resto pesa pela agenda (abaixo).
    if (a.desgaste < 0) aplicar(vida, { desgaste: a.desgaste * Math.min(sessoes, 10) });
    const extras = sessoesFeitas(vida, a, sessoes, rng);
    const r = resumo(diferenca(antes, foto(vida)));
    const rot = `${a.nome} (${h.porSemana}x/sem${h.imposto ? ', imposto pelos pais' : ''})`;
    linhas.push(r ? `${rot}: ${r}.` : `${rot}.`);
    linhas.push(...extras);
  }

  // Agenda cheia cansa: escola, trabalho e hábitos passando de 50 h por semana.
  const horas = horasAgenda(vida);
  if (horas > 50) {
    vida.personagem.desgaste = limitar(vida.personagem.desgaste + (horas - 50) * 2 * anos);
    linhas.push(`Sua agenda de ${Math.round(horas)} h por semana cansou você.`);
  }
  return linhas;
}
