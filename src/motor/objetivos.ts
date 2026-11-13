// A Vida, primeira parte: as pessoas próximas têm objetivos próprios (passar no
// vestibular, abrir um negócio, comprar a casa, cuidar da saúde...). Cada objetivo
// anda sozinho com o tempo, pode dar certo ou errado, e no meio do caminho a
// pessoa pode pedir a sua ajuda. O resultado chega em você pelo vínculo
// (contexto.ts): a vitória da irmã vira alegria sua; o fracasso do pai, aperto.
// Ninguém pede ajuda enquanto você está no meio de um golpe (Diretor alto).

import { aplicar, lembrar, reais } from './efeitos';
import { importancia } from './contexto';
import { capitalizar, papelTexto } from './familia';
import { lembrarPessoa } from './social';
import type { Rng } from './rng';
import type { Linha, Pendente, Pessoa, Vida } from './tipos';

export type TipoObjetivo = 'vestibular' | 'negocio' | 'casa' | 'saude' | 'emprego' | 'viagem' | 'concurso';

export interface Objetivo {
  tipo: TipoObjetivo;
  inicio: number;
  /** Meses até a hora da verdade. */
  prazo: number;
  /** 0 a 1. */
  progresso: number;
  /** Detalhe: curso, tipo de negócio, destino. */
  extra?: string;
  pediu?: boolean;
  ajudou?: boolean;
  recusou?: boolean;
  /** Dinheiro que você pôs (negócio, casa). */
  investido?: number;
}

const fem = (pe: Pessoa) => pe.sexo === 'feminino';
const idadeDe = (pe: Pessoa) => pe.idadeMeses / 12;
const quem = (pe: Pessoa) => `${capitalizar(papelTexto(pe))}, ${pe.nome},`;

interface DefObjetivo {
  pode: (pe: Pessoa, vida: Vida) => boolean;
  prazo: [number, number];
  extras?: string[];
  comeco: (pe: Pessoa, x: string) => string;
  /** Chance base de dar certo (antes da ajuda). */
  chance: (pe: Pessoa) => number;
  sucesso: (pe: Pessoa, x: string) => string;
  falha: (pe: Pessoa, x: string) => string;
  /** O que a pessoa pede, se pede, e o que custa ajudar. */
  pedido?: {
    pode: (vida: Vida, pe: Pessoa) => boolean;
    texto: (pe: Pessoa, x: string, valor: number) => string;
    sim: string; nao: string;
    dinheiro?: (vida: Vida) => number;
    cansaco?: number;
  };
  /** O que muda na pessoa quando dá certo. */
  aoConseguir?: (pe: Pessoa) => void;
  aoFalhar?: (pe: Pessoa) => void;
}

const jovem = (pe: Pessoa) => ['irmao', 'filho', 'neto', 'primo', 'sobrinho', 'amigo', 'colega', 'parceiro'].includes(pe.papel);
const adulto = (pe: Pessoa, a: number, b: number) => idadeDe(pe) >= a && idadeDe(pe) <= b;
/** "uma lanchonete" → "a lanchonete"; "um salão" → "o salão". */
const definido = (x: string) => x.replace(/^uma /, 'a ').replace(/^um /, 'o ');
const valorPedido = (vida: Vida, min: number, max: number) => Math.round(Math.max(min, Math.min(max, vida.personagem.dinheiro * 0.25)) / 100) * 100;

const DEFS: Record<TipoObjetivo, DefObjetivo> = {
  vestibular: {
    pode: (pe) => jovem(pe) && adulto(pe, 16, 19),
    prazo: [10, 16],
    extras: ['Medicina', 'Direito', 'Engenharia', 'Enfermagem', 'Pedagogia', 'Design', 'Psicologia', 'Computação'],
    comeco: (pe, x) => `${quem(pe)} decidiu que vai prestar vestibular para ${x}. Tem cronograma colado na parede.`,
    chance: (pe) => 0.3 + (pe.inteligencia - 50) * 0.008 + pe.personalidade.disciplina * 0.002,
    sucesso: (pe, x) => `${quem(pe)} passou no vestibular para ${x}! Teve grito, choro e ovo na cabeça.`,
    falha: (pe, x) => `${quem(pe)} não passou em ${x} desta vez. Disse que ano que vem tenta de novo.`,
    pedido: {
      pode: (vida) => vida.relogio.idadeMeses >= 12 * 12,
      texto: (pe, x) => `${pe.nome} está apertad${fem(pe) ? 'a' : 'o'} nos estudos para ${x} e pediu para você estudar junto nas próximas semanas.`,
      sim: 'Estudar junto', nao: 'Dizer que não dá', cansaco: 8,
    },
    aoConseguir: (pe) => { pe.ocupacao = 'estudante'; },
  },
  negocio: {
    pode: (pe) => adulto(pe, 25, 60) && pe.renda >= 0,
    prazo: [12, 30],
    extras: ['uma lanchonete', 'um salão de beleza', 'uma loja de roupas', 'uma oficina', 'uma doceria', 'um food truck'],
    comeco: (pe, x) => `${quem(pe)} cismou que vai abrir ${x}. Já tem até nome e logo no celular.`,
    chance: (pe) => 0.35 + pe.personalidade.ambicao * 0.002 + pe.personalidade.disciplina * 0.002 - Math.max(0, pe.personalidade.impulsividade) * 0.002,
    sucesso: (pe, x) => `${capitalizar(definido(x))} de ${pe.nome} deu certo: fila na porta e cliente fiel.`,
    falha: (pe, x) => `${quem(pe)} fechou as portas d${definido(x)}. As contas não fecharam.`,
    pedido: {
      pode: (vida) => vida.relogio.idadeMeses >= 18 * 12 && vida.personagem.dinheiro >= 1500,
      texto: (pe, x, v) => `${pe.nome} veio com a planilha d${definido(x)} e pediu ${reais(v)} emprestado para começar.`,
      sim: 'Emprestar', nao: 'Não emprestar', dinheiro: (vida) => valorPedido(vida, 1000, 20000),
    },
    aoConseguir: (pe) => { pe.renda = Math.round(Math.max(pe.renda, 2500) * 1.6); pe.ocupacao = `dono${fem(pe) ? 'a' : ''} do próprio negócio`; },
    aoFalhar: (pe) => { pe.renda = Math.round(pe.renda * 0.5); },
  },
  casa: {
    // Parceiro que mora com você divide a casa: o objetivo seria dos dois.
    // Pais com quem você mora não "saem do aluguel" sem você.
    pode: (pe, vida) => adulto(pe, 25, 65) && pe.renda > 0 && pe.papel !== 'parceiro'
      && !((pe.papel === 'mae' || pe.papel === 'pai') && vida.personagem.moradia === 'pais'),
    prazo: [18, 40],
    comeco: (pe) => `${quem(pe)} começou a juntar dinheiro para sair do aluguel e ter a própria casa.`,
    chance: (pe) => 0.35 + Math.min(0.3, pe.renda / 20000) + pe.personalidade.disciplina * 0.002,
    sucesso: (pe) => `${quem(pe)} pegou a chave da casa própria! Churrasco de inauguração com a casa ainda sem cortina.`,
    falha: (pe) => `${quem(pe)} desistiu da casa por enquanto: o financiamento não saiu.`,
    pedido: {
      pode: (vida) => vida.relogio.idadeMeses >= 14 * 12,
      texto: (pe) => `${pe.nome} vai se mudar para a casa nova e pediu ajuda no sábado da mudança: caixa, sofá na escada e pizza no fim.`,
      sim: 'Ajudar na mudança', nao: 'Inventar uma desculpa', cansaco: 6,
    },
  },
  saude: {
    pode: (pe) => adulto(pe, 35, 80) && pe.saude < 65,
    prazo: [6, 14],
    extras: ['emagrecer', 'parar de fumar', 'controlar a pressão', 'voltar a caminhar'],
    comeco: (pe, x) => `${quem(pe)} levou um susto no médico e decidiu ${x}.`,
    chance: (pe) => 0.4 + pe.personalidade.disciplina * 0.003,
    sucesso: (pe, x) => `${quem(pe)} conseguiu ${x}. Está com outra cara, mais disposição.`,
    falha: (pe, x) => `${quem(pe)} tentou ${x}, mas largou no meio. Diz que segunda-feira recomeça.`,
    pedido: {
      pode: (vida) => vida.relogio.idadeMeses >= 8 * 12,
      texto: (pe) => `${pe.nome} pediu companhia: sozinh${fem(pe) ? 'a' : 'o'} não tem coragem de caminhar todo dia de manhã.`,
      sim: 'Caminhar junto', nao: 'Dizer que não tem tempo', cansaco: 4,
    },
    aoConseguir: (pe) => { pe.saude = Math.min(100, pe.saude + 12); pe.potencial.saude = Math.min(100, pe.potencial.saude + 5); },
  },
  emprego: {
    pode: (pe) => adulto(pe, 18, 60) && pe.renda === 0,
    prazo: [3, 10],
    comeco: (pe) => `${quem(pe)} está mandando currículo para todo lado.`,
    chance: (pe) => 0.55 + (pe.inteligencia - 50) * 0.004 + pe.personalidade.extroversao * 0.001,
    sucesso: (pe) => `${quem(pe)} arrumou emprego! Carteira assinada e marmita nova.`,
    falha: (pe) => `${quem(pe)} ainda não conseguiu emprego. O desânimo bateu.`,
    pedido: {
      pode: (vida) => !!vida.personagem.trabalho.emprego,
      texto: (pe) => `${pe.nome} perguntou se tem vaga onde você trabalha e pediu uma indicação.`,
      sim: 'Indicar', nao: 'Não arriscar a indicação',
    },
    aoConseguir: (pe) => { pe.renda = 1800 + Math.round(pe.inteligencia * 25); },
  },
  viagem: {
    pode: (pe) => adulto(pe, 20, 75) && pe.renda > 0,
    prazo: [8, 20],
    extras: ['conhecer o Nordeste', 'conhecer Portugal', 'ver a neve na Argentina', 'conhecer o Pantanal', 'fazer o caminho de Santiago'],
    comeco: (pe, x) => `${quem(pe)} decidiu que vai ${x}. Já tem um cofrinho escrito "viagem".`,
    chance: (pe) => 0.5 + Math.min(0.2, pe.renda / 30000),
    sucesso: (pe, x) => `${quem(pe)} realizou o sonho de ${x} e voltou com mil fotos e uma lembrancinha para você.`,
    falha: (pe, x) => `${quem(pe)} adiou o plano de ${x}. O dinheiro foi para outra coisa.`,
  },
  concurso: {
    pode: (pe) => adulto(pe, 20, 42),
    prazo: [12, 30],
    extras: ['a Polícia Federal', 'o INSS', 'o Banco do Brasil', 'a Receita', 'o tribunal'],
    comeco: (pe, x) => `${quem(pe)} começou a estudar para o concurso d${x.startsWith('a ') ? 'a' : 'o'} ${x.replace(/^[ao] /, '')}.`,
    chance: (pe) => 0.18 + (pe.inteligencia - 50) * 0.008 + pe.personalidade.disciplina * 0.003,
    sucesso: (pe, x) => `${quem(pe)} passou no concurso d${x.startsWith('a ') ? 'a' : 'o'} ${x.replace(/^[ao] /, '')}! Estabilidade, enfim.`,
    falha: (pe, x) => `${quem(pe)} não passou no concurso desta vez. Ficou de fora por poucas questões.`,
    pedido: {
      pode: (vida) => vida.relogio.idadeMeses >= 14 * 12,
      texto: (pe) => `${pe.nome} pediu para você segurar as pontas em casa nos meses de prova, para sobrar tempo de estudo.`,
      sim: 'Segurar as pontas', nao: 'Dizer que não dá', cansaco: 6,
    },
    aoConseguir: (pe) => { pe.renda = Math.max(pe.renda, 7000); pe.ocupacao = 'servidor' + (fem(pe) ? 'a' : '') + ' público' + (fem(pe) ? 'a' : ''); },
  },
};

const TIPOS = Object.keys(DEFS) as TipoObjetivo[];
const MAX_ATIVOS = 3;

/** Quem pode ter objetivo: viva, por perto, e que importa para você. */
const candidata = (vida: Vida, pe: Pessoa) => pe.vivo && !pe.afastado && pe.papel !== 'ex' && !pe.rival && importancia(vida, pe) >= 0.35;

/**
 * A cada passo: objetivos novos nascem, os que existem andam, e na hora da
 * verdade dão certo ou não. Pode abrir um pedido de ajuda (decisão pendente).
 */
export function rodarObjetivos(vida: Vida, anos: number, rng: Rng): Linha[] {
  const linhas: Linha[] = [];
  const meses = anos * 12;
  const ativos = vida.pessoas.filter((x) => x.objetivo);
  const idadeJ = vida.relogio.idadeMeses / 12;
  // Criança pequena não acompanha os planos dos adultos (só os de casa, a partir dos 5).
  const percebe = (pe: Pessoa) => idadeJ >= 8 || (idadeJ >= 5 && ['mae', 'pai', 'irmao'].includes(pe.papel));
  const contar = (pe: Pessoa, texto: string) => {
    if (importancia(vida, pe) >= 0.5 && percebe(pe) && linhas.length < 2) linhas.push({ texto, fato: { tipo: 'pessoa', id: 'objetivo', pessoa: pe.id } });
  };

  // 1. Nascem objetivos (no máximo três andando ao mesmo tempo).
  if (ativos.length < MAX_ATIVOS) {
    for (const pe of vida.pessoas) {
      if (pe.objetivo || !candidata(vida, pe) || rng.proximo() >= 0.08 * anos) continue;
      const feitos = pe.objetivosFeitos ?? [];
      const tipos = TIPOS.filter((t) => DEFS[t].pode(pe, vida) && !feitos.includes(t));
      if (!tipos.length) continue;
      const tipo = rng.escolher(tipos);
      const d = DEFS[tipo];
      const extra = d.extras ? rng.escolher(d.extras) : '';
      pe.objetivo = { tipo, inicio: vida.relogio.idadeMeses, prazo: rng.inteiro(d.prazo[0], d.prazo[1]), progresso: 0, ...(extra ? { extra } : {}) };
      contar(pe, d.comeco(pe, extra));
      // Um objetivo novo por vez (senão vira enxurrada de planos).
      break;
    }
  }

  // 2. Andam, pedem ajuda, e chegam na hora da verdade.
  for (const pe of vida.pessoas) {
    const o = pe.objetivo;
    if (!o) continue;
    if (!pe.vivo || pe.afastado) { delete pe.objetivo; continue; }
    const d = DEFS[o.tipo];
    o.progresso = Math.min(1, o.progresso + meses / o.prazo);
    // Pedido de ajuda no meio do caminho (nunca no meio de um golpe seu).
    if (d.pedido && !o.pediu && o.progresso >= 0.35 && o.progresso < 0.9 && !vida.pendente && percebe(pe) && (vida.diretor?.intensidade ?? 0) < 50
      && importancia(vida, pe) >= 0.4 && d.pedido.pode(vida, pe) && rng.proximo() < 0.6) {
      o.pediu = true;
      vida.pendente = pedido(vida, pe, o, d);
    }
    if (o.progresso < 1) continue;
    // Hora da verdade.
    const ajuda = o.ajudou ? 0.18 : o.recusou ? -0.05 : 0;
    const deu = rng.proximo() < Math.max(0.05, Math.min(0.92, d.chance(pe) + ajuda));
    const imp = importancia(vida, pe);
    const x = o.extra ?? '';
    pe.objetivosFeitos = [...(pe.objetivosFeitos ?? []), o.tipo];
    delete pe.objetivo;
    if (deu) {
      d.aoConseguir?.(pe);
      let texto = d.sucesso(pe, x);
      if (o.ajudou) texto += ` ${fem(pe) ? 'Ela' : 'Ele'} fez questão de dizer que você ajudou.`;
      if (o.investido) {
        const volta = Math.round(o.investido * 1.3);
        vida.personagem.dinheiro += volta;
        texto += ` Devolveu os ${reais(o.investido)} com juros: ${reais(volta)}.`;
      }
      aplicar(vida, { 'atributos.felicidade': Math.round(imp * (o.ajudou ? 10 : 6)) });
      pe.afeto = Math.min(100, pe.afeto + (o.ajudou ? 8 : 3));
      lembrarPessoa(vida, pe, `comemoraram juntos: ${texto.split(/[!.]/)[0]!.replace(/^[^,]+, [^,]+, /, '')}`, 8);
      if (imp >= 0.6) lembrar(vida, `conquista_${pe.id}_${o.tipo}`, `viu ${pe.nome} conseguir o que queria`, o.ajudou ? 14 : 8, { pessoa: pe.nome });
      contar(pe, texto);
    } else {
      d.aoFalhar?.(pe);
      let texto = d.falha(pe, x);
      if (o.investido) texto += ` O dinheiro que você emprestou foi junto: ${reais(o.investido)}.`;
      aplicar(vida, { 'atributos.felicidade': -Math.round(imp * (o.investido ? 7 : 4)) });
      // Pode tentar de novo mais adiante (vestibular e concurso, sobretudo).
      if ((o.tipo === 'vestibular' || o.tipo === 'concurso') && rng.proximo() < 0.6) pe.objetivosFeitos = pe.objetivosFeitos.filter((t) => t !== o.tipo);
      contar(pe, texto);
    }
  }
  return linhas;
}

function pedido(vida: Vida, pe: Pessoa, o: Objetivo, d: DefObjetivo): Pendente {
  const p = d.pedido!;
  const valor = p.dinheiro ? p.dinheiro(vida) : 0;
  return {
    evento: '@objetivo', sistema: 'objetivo',
    texto: p.texto(pe, o.extra ?? '', valor),
    vars: { pessoaId: pe.id, valor: String(valor) },
    dados: ['sim', 'nao'],
    escolhas: [{ texto: valor ? `${p.sim} (${reais(valor)})` : p.sim }, { texto: p.nao }],
  };
}

/** Resolve o pedido de ajuda. */
export function resolverObjetivo(vida: Vida, pend: Pendente, indice: number): string {
  const pe = vida.pessoas.find((x) => x.id === pend.vars.pessoaId);
  const o = pe?.objetivo;
  if (!pe) return '';
  if (!o) return `${pe.nome} acabou se virando sozinh${fem(pe) ? 'a' : 'o'}.`;
  const d = DEFS[o.tipo];
  const Ele = pe.nome;
  if (pend.dados?.[indice] === 'sim') {
    o.ajudou = true;
    const valor = Number(pend.vars.valor ?? 0);
    if (valor > 0) {
      vida.personagem.dinheiro -= valor;
      o.investido = valor;
    }
    if (d.pedido?.cansaco) aplicar(vida, { desgaste: d.pedido.cansaco });
    if (o.tipo === 'saude') aplicar(vida, { 'atributos.saude': 2, 'atributos.forma': 2 });
    pe.afeto = Math.min(100, pe.afeto + 8);
    lembrarPessoa(vida, pe, 'você ajudou quando precisou', 10);
    return valor > 0 ? `Você transferiu o dinheiro. ${Ele} prometeu devolver com juros.` : `${Ele} ficou muito grat${fem(pe) ? 'a' : 'o'}.`;
  }
  o.recusou = true;
  pe.afeto = Math.max(0, pe.afeto - (pe.afeto >= 60 ? 8 : 4));
  lembrarPessoa(vida, pe, 'você não ajudou quando pediu', -6);
  return `${Ele} disse que entende, mas ficou chatead${fem(pe) ? 'a' : 'o'}.`;
}
