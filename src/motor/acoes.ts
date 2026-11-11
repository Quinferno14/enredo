// Ações livres e hábitos. Não há limite de cliques: o que segura o exagero
// é o retorno que cai (curva logarítmica), o cansaço, o dinheiro, a idade e a lei.

import acoesJson from '../conteudo/acoes.json';
import {
  aplicar, atende, diferenca, foto, lembrar, NOME_HABILIDADE, mudarTraco, nivelTraco, reais, resumo, type Efeitos, type Quando,
} from './efeitos';
import { acaoCarreira, horasObrigacoes } from './carreira';
import { acaoFamilia } from './familia';
import { talvezConhecer } from './social';
import { pesoDoJeito } from './jeito';
import { curva } from './curva';
import { limitar } from './envelhecer';
import { anosDaJanela, quandoAgora } from './tempo';
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
  /** Grupo na folha de atividades. */
  categoria: Categoria;
  /** Não aparece mais na lista (ex.: virou variante de outra ação). */
  oculta?: boolean;
  /** Pode escolher com quem fazer (alguém da aba Pessoas ou "a turma"). */
  comQuem?: boolean;
  /** Jeitos diferentes de fazer a mesma coisa (onde, como, quanto custa). */
  variantes?: VarianteDef[];
}

export type Categoria = 'social' | 'corpo' | 'mente' | 'lazer' | 'saude' | 'estudo' | 'trabalho' | 'carreira' | 'dinheiro' | 'casa' | 'risco';

export const CATEGORIAS: { id: Categoria; nome: string }[] = [
  { id: 'social', nome: 'Social' },
  { id: 'lazer', nome: 'Lazer' },
  { id: 'corpo', nome: 'Corpo' },
  { id: 'mente', nome: 'Mente' },
  { id: 'saude', nome: 'Saúde' },
  { id: 'estudo', nome: 'Estudo' },
  { id: 'trabalho', nome: 'Trabalho' },
  { id: 'carreira', nome: 'Carreira' },
  { id: 'dinheiro', nome: 'Dinheiro' },
  { id: 'casa', nome: 'Casa' },
  { id: 'risco', nome: 'Risco' },
];

export interface VarianteDef {
  id: string;
  nome: string;
  custo?: number;
  paisPagam?: boolean;
  idadeMin?: number;
  /** Multiplica os efeitos da ação. */
  mult?: number;
  /** Efeitos a mais (também caem com a repetição). */
  extra?: Efeitos;
  desgaste?: number;
  /** Também conta como outra ação (ex.: barzinho conta como festa, para vícios e eventos). */
  contaComo?: string;
  vicio?: { id: string; chance: number };
  /** {com} vira o nome de quem foi junto. */
  textos?: string[];
  /** O retorno que cai conta separado (ex.: cada curso é um curso). */
  separado?: boolean;
}

export interface OpcoesAcao {
  variante?: string;
  /** Id de alguém da aba Pessoas, ou 'turma'. */
  com?: string;
}

export const ACOES: readonly AcaoDef[] = acoesJson as AcaoDef[];
export const acaoPorId = (id: string) => ACOES.find((a) => a.id === id);

export const FREQUENCIAS = [1, 3, 7] as const;
const LIMIARES_TALENTO = [25, 120, 400];

export { curva };

const anosDoTurno = (vida: Vida) => anosDaJanela(vida.config.turno);
const idadeDe = (vida: Vida) => vida.relogio.idadeMeses / 12;

export function disponivel(vida: Vida, a: AcaoDef): boolean {
  const idade = idadeDe(vida);
  return !vida.morte && !a.oculta && idade >= a.idade[0] && idade <= a.idade[1] && atende(vida, a.requer);
}

export function acoesDisponiveis(vida: Vida): AcaoDef[] {
  return ACOES.filter((a) => disponivel(vida, a));
}

/** Quanto custa uma sessão para este personagem (os pais pagam algumas até os 18). */
export function custoPara(vida: Vida, a: AcaoDef, v?: VarianteDef): number {
  const custo = v?.custo ?? a.custo;
  const paisPagam = v ? v.paisPagam : a.paisPagam;
  if (!custo) return 0;
  if (paisPagam && idadeDe(vida) < 18) return 0;
  return custo;
}

/** Variantes que a idade permite. */
export function variantesPossiveis(vida: Vida, a: AcaoDef): VarianteDef[] {
  return (a.variantes ?? []).filter((v) => idadeDe(vida) >= (v.idadeMin ?? 0));
}

/** Quem pode ir junto: pessoas vivas da aba Pessoas com idade para isso. */
export function companhias(vida: Vida): { id: string; nome: string }[] {
  const idade = idadeDe(vida);
  const ordem = ['parceiro', 'amigo', 'irmao', 'primo', 'colega', 'filho', 'neto', 'vizinho', 'mae', 'pai', 'avo', 'tio', 'sobrinho'];
  return vida.pessoas
    .filter((p) => p.vivo && !p.afastado && p.papel !== 'ex' && !p.rival && p.idadeMeses >= 4 * 12 && (idade >= 14 || p.papel !== 'parceiro'))
    .sort((a, b) => ordem.indexOf(a.papel) - ordem.indexOf(b.papel) || b.afeto - a.afeto)
    .map((p) => ({ id: p.id, nome: p.nome }));
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
export function fazerAcao(vida: Vida, id: string, opcoes: OpcoesAcao = {}): Resultado {
  const a0 = acaoPorId(id);
  if (!a0 || !disponivel(vida, a0)) return { vida, ok: false, aviso: 'Essa ação não está disponível agora.' };
  const possiveis = variantesPossiveis(vida, a0);
  const v = possiveis.find((x) => x.id === opcoes.variante) ?? possiveis[0];
  // A variante vira a própria ação para o resto da conta.
  const a: AcaoDef = v ? {
    ...a0,
    custo: v.custo ?? a0.custo,
    paisPagam: v.paisPagam ?? a0.paisPagam,
    desgaste: v.desgaste ?? a0.desgaste,
    vicio: v.vicio ?? a0.vicio,
    textos: v.textos ?? a0.textos,
  } : a0;
  const custo = custoPara(vida, a0, v);
  if (custo > 0 && custo > vida.personagem.dinheiro) {
    return { vida, ok: false, aviso: `Sem dinheiro: precisa de ${reais(custo)}.` };
  }

  const prox = structuredClone(vida);
  const rng = new Rng(prox.rng);
  const antes = foto(prox);
  const extras: string[] = [];
  const extrasAfeto: string[] = [];

  const chaveR = v?.separado ? `${id}:${v.id}` : id;
  // O jeito de quem faz muda quanto rende (o extrovertido rende mais com gente...).
  const jeito = pesoDoJeito(prox, a, !!opcoes.com);
  const r = rendimentoProximo(prox, chaveR) * jeito.mult;
  aplicar(prox, a.efeitos, r * (v?.mult ?? 1));
  aplicar(prox, v?.extra, r);
  aplicar(prox, { desgaste: a.desgaste, dinheiro: -custo });
  if (v?.contaComo) prox.periodo[v.contaComo] = (prox.periodo[v.contaComo] ?? 0) + 1;

  // Companhia: quem vai junto gosta mais de você.
  let com = 'a turma';
  const pessoa = opcoes.com && opcoes.com !== 'turma' ? prox.pessoas.find((x) => x.id === opcoes.com && x.vivo) : undefined;
  if (pessoa) {
    com = pessoa.nome;
    const antesAfeto = pessoa.afeto;
    pessoa.afeto = Math.round(limitar(pessoa.afeto + 6 * r));
    if (pessoa.afeto !== antesAfeto) extrasAfeto.push(`Afeto de ${pessoa.nome} +${pessoa.afeto - antesAfeto}`);
  } else if (a.comQuem) {
    // "A turma" são os seus amigos de verdade: cada um ganha um pouco.
    const turma = prox.pessoas
      .filter((x) => x.vivo && !x.afastado && x.papel === 'amigo' && Math.abs(x.idadeMeses - prox.relogio.idadeMeses) <= 20 * 12)
      .sort((x, y) => y.afeto - x.afeto).slice(0, 4);
    const subiram: string[] = [];
    for (const x of turma) {
      const antesAfeto = x.afeto;
      x.afeto = Math.round(limitar(x.afeto + 2.5 * r));
      if (x.afeto > antesAfeto) subiram.push(x.nome);
    }
    if (subiram.length) extrasAfeto.push(`Afeto de ${subiram.join(', ')} +${Math.max(1, Math.round(2.5 * r))}`);
  }
  if (a.ganho) {
    const mult = idadeDe(prox) >= 18 ? 1.5 : 1;
    aplicar(prox, { dinheiro: Math.round(rng.inteiro(a.ganho[0], a.ganho[1]) * mult) });
  }
  prox.periodo[id] = (prox.periodo[id] ?? 0) + 1;
  if (chaveR !== id) prox.periodo[chaveR] = (prox.periodo[chaveR] ?? 0) + 1;
  prox.ultimas = { ...prox.ultimas, [id]: { ...(v ? { variante: v.id } : {}), ...(opcoes.com ? { com: opcoes.com } : {}) } };

  const especial = resolverEspecial(prox, a, rng, v?.id);
  if (especial) extras.push(especial);
  // Esporte, curso, sair: às vezes aparece gente nova.
  if (a.comQuem || a.categoria === 'corpo' || id === 'curso') {
    const nova = talvezConhecer(prox, rng, 0.05, (v?.nome ?? a.nome).split(' (')[0]!);
    if (nova) extras.push(nova);
  }
  extras.push(...sessoesFeitas(prox, a, 1, rng));
  if (a.risco && prox.personagem.desgaste >= a.risco.acima && rng.proximo() < a.risco.chance) {
    aplicar(prox, a.risco.efeitos);
    extras.push(a.risco.texto);
  }

  const delta = diferenca(antes, foto(prox));
  const quando = quandoAgora(prox);
  const ultima = prox.historico.at(-1);
  const chave = [id, v?.id ?? '', opcoes.com ?? ''].join('|');
  const trocar = (t: string) => t.replaceAll('{com}', com);
  if (ultima && ultima.acao === chave && ultima.quando === quando && extras.length === 0 && extrasAfeto.length === 0 && !a.especial) {
    // Mesma ação em seguida: junta numa linha só, somando o efeito.
    ultima.vezes = (ultima.vezes ?? 1) + 1;
    for (const [k, v] of Object.entries(delta)) ultima.delta = { ...ultima.delta, [k]: (ultima.delta?.[k] ?? 0) + v };
    ultima.texto = trocar(linhaAcao(a, ultima.vezes, ultima.delta ?? {}, a.textos[0]!));
  } else {
    const base0 = trocar(linhaAcao(a, 1, delta, rng.escolher(a.textos)));
    const base = jeito.nota && Object.keys(delta).length ? `${base0} (${jeito.nota})` : base0;
    const entrada: EntradaHistorico = {
      quando, acao: chave, vezes: 1, delta, fato: { tipo: 'acao', id, ...(pessoa ? { pessoa: pessoa.id } : {}) },
      texto: extrasAfeto.length ? `${base}${/[0-9]$/.test(base) ? ' · ' : ' '}${extrasAfeto.join(' · ')}` : base,
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
function resolverEspecial(vida: Vida, a: AcaoDef, rng: Rng, variante?: string): string | null {
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
      if (!a.especial) return null;
      return a.especial === 'procurar_parceiro' || a.especial === 'conhecer' ? acaoFamilia(vida, a.especial, rng) : acaoCarreira(vida, a.especial, rng, variante);
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
export function definirHabito(vida: Vida, acao: string, porSemana: number, variante?: string): Vida {
  const a = acaoPorId(acao);
  if (!a || a.semHabito) return vida;
  const prox = structuredClone(vida);
  const quando = quandoAgora(prox);
  const atual = prox.habitos.find((h) => h.acao === acao);
  if (porSemana <= 0) {
    prox.habitos = prox.habitos.filter((h) => h.acao !== acao);
    if (atual) prox.historico.push({ quando, texto: `Você parou o hábito: ${a.nome}.` });
  } else if (atual) {
    atual.porSemana = porSemana;
    if (variante) atual.variante = variante;
    delete atual.pausado;
    delete atual.imposto;
  } else {
    prox.habitos.push({ acao, porSemana, ...(variante ? { variante } : {}) });
    prox.historico.push({ quando, texto: `Hábito novo: ${a.nome}, ${porSemana}x por semana.` });
  }
  return prox;
}

/** Hábito imposto pelos pais: pedir para sair funciona metade das vezes, mais com carisma. */
export function pedirParaSair(vida: Vida, acao: string): Vida {
  const prox = structuredClone(vida);
  const rng = new Rng(prox.rng);
  const quando = quandoAgora(prox);
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

const ROTULO_EFEITO: Record<string, string> = {
  'atributos.saude': 'Saúde', 'atributos.felicidade': 'Felic.', 'atributos.inteligencia': 'Intel.',
  'atributos.aparencia': 'Aparên.', 'atributos.forma': 'Forma', 'atributos.carisma': 'Carisma',
  'trabalho.desempenho': 'Desempenho', 'estudo.nota': 'Nota',
};

/** O que a ação mexe, em etiquetas curtas: "↑Forma", "↓Saúde", "−R$ 8", "+R$", "↓Cansaço". */
export function previaEfeitos(vida: Vida, a: AcaoDef, v?: VarianteDef): string[] {
  const tags: { t: string; peso: number }[] = [];
  const efeitos = { ...a.efeitos } as Record<string, number | string>;
  for (const [k, x] of Object.entries(v?.extra ?? {})) efeitos[k] = Number(efeitos[k] ?? 0) + Number(x);
  for (const [k, x] of Object.entries(efeitos)) {
    const n = Number(x) * (v?.mult ?? 1);
    const nome = ROTULO_EFEITO[k] ?? (k.startsWith('habilidade.') ? NOME_HABILIDADE[k.slice(11)] : undefined);
    if (nome && Math.abs(n) >= 0.3) tags.push({ t: `${n > 0 ? '↑' : '↓'}${nome}`, peso: Math.abs(n) });
  }
  tags.sort((x, y) => y.peso - x.peso);
  const out = tags.slice(0, 2).map((x) => x.t);
  const custo = custoPara(vida, a, v);
  if (custo > 0) out.push(`−${reais(custo)}`);
  if (a.ganho) out.push('+R$');
  const desg = v?.desgaste ?? a.desgaste;
  if (desg <= -5) out.push('↓Cansaço');
  return out;
}

/**
 * Até 4 sugestões do momento: primeiro o que a situação pede (nota baixa, sem
 * emprego, cansaço alto, tristeza, sem ninguém), depois o que você mais faz.
 */
export function sugestoes(vida: Vida): AcaoDef[] {
  const p = vida.personagem;
  const idade = idadeDe(vida);
  const lista = acoesDisponiveis(vida);
  const tem = (id: string) => lista.find((a) => a.id === id);
  const contexto: (AcaoDef | undefined)[] = [];
  if ((p.estudo.etapa !== 'nenhuma' && p.estudo.nota < 60) || (p.estudo.etapa === 'medio' && p.estudo.serie === 3)) contexto.push(tem('estudar'));
  if (idade >= 18 && !p.trabalho.emprego && p.trabalho.aposentadoria === 0) contexto.push(tem('procurar_emprego'));
  if (p.desgaste >= 60) contexto.push(tem('tirar_folga') ?? tem('meditar'));
  if (p.atributos.felicidade < 45) contexto.push(tem('amigos'));
  if (p.atributos.saude < 45) contexto.push(tem('medico_sus'));
  if (idade >= 16 && !vida.pessoas.some((x) => x.papel === 'parceiro' && x.vivo) && p.atributos.felicidade < 60) contexto.push(tem('procurar_parceiro'));
  const usadas = [...lista]
    .filter((a) => !a.semHabito)
    .sort((x, y) => (vida.totais[y.id] ?? 0) - (vida.totais[x.id] ?? 0));
  const padrao = ['estudar', 'amigos', 'esporte', 'ler', 'brincar', 'bico', 'trabalhar_duro', 'academia'].map(tem);
  const out: AcaoDef[] = [];
  for (const a of [...contexto, ...usadas.filter((x) => (vida.totais[x.id] ?? 0) > 0), ...padrao, ...lista]) {
    if (a && !out.includes(a)) out.push(a);
    if (out.length >= 4) break;
  }
  return out;
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
export function rodarHabitos(vida: Vida, anos: number, rng: Rng, resumir = true): string[] {
  const linhas: string[] = [];
  const resumos: string[] = [];
  for (const h of vida.habitos) {
    const a = acaoPorId(h.acao);
    if (!a) continue;
    const idade = idadeDe(vida);
    if (idade < a.idade[0] || idade > a.idade[1]) {
      if (!h.pausado) linhas.push(`${a.nome}: pausado, não combina com a sua idade agora.`);
      h.pausado = 'idade';
      continue;
    }
    if (h.imposto && idade >= 18 && !vida.pendente) {
      // Aos 18, o hábito imposto pelos pais vira pergunta.
      vida.pendente = {
        evento: '@habito18', sistema: 'habito18', vars: {}, dados: [h.acao, h.acao],
        texto: `Você fez 18 e seus pais não decidem mais por você: quer continuar com ${a.nome.toLowerCase()}?`,
        escolhas: [{ texto: `Continuar (${h.porSemana}x por semana)` }, { texto: 'Parar' }],
      };
    }
    const sessoes = Math.round(h.porSemana * 52 * anos);
    const vh = a.variantes?.find((x) => x.id === h.variante) ?? a.variantes?.[0];
    const custo = custoPara(vida, a, vh) * sessoes;
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
    aplicar(vida, a.efeitos, ganho * (vh?.mult ?? 1));
    aplicar(vida, vh?.extra, ganho);
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
    resumos.push(r ? `${rot} ${r}` : rot);
    linhas.push(...extras);
  }

  // Um resumo só para todos os hábitos, para o feed não repetir uma linha por hábito.
  if (resumir && resumos.length) linhas.unshift(`Seus hábitos no período: ${resumos.join('; ')}.`);

  // Agenda cheia cansa: escola, trabalho e hábitos passando de 50 h por semana.
  const horas = horasAgenda(vida);
  if (horas > 50) {
    vida.personagem.desgaste = limitar(vida.personagem.desgaste + (horas - 50) * 2 * anos);
    if (resumir) linhas.push(`Sua agenda de ${Math.round(horas)} h por semana cansou você.`);
  }
  return linhas;
}
