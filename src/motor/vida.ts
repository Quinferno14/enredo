// Criar uma vida e avançar o tempo. Funções puras: recebem um estado e
// devolvem outro, sem tocar em tela nem em save.

import estados from '../conteudo/estados.json';
import nomes from '../conteudo/nomes.json';
import { rodarHabitos } from './acoes';
import { aplicar } from './efeitos';
import { atributosNaIdade, envelhecer, limitar, sortearMorte } from './envelhecer';
import { rodarEventos } from './eventos';
import { Rng } from './rng';
import {
  EIXOS, VERSAO_SAVE,
  type Atributo, type Eixo, type EntradaHistorico, type Inicio, type ModoMorte,
  type Potencial, type Relogio, type Sexo, type Turno, type Vida,
} from './tipos';

export interface Estado {
  sigla: string;
  nome: string;
  cidades: string[];
}
export const ESTADOS: readonly Estado[] = estados;

export interface OpcoesNovaVida {
  id: string;
  seed: string;
  ano: number; // ano em que a história começa
  criadaEm: string;
  turno: Turno;
  morte: ModoMorte;
  inicio: Inicio;
  // Vazios = sorteados pela seed.
  nome?: string;
  sobrenome?: string;
  sexo?: Sexo;
  estado?: string;
}

export const IDADE_INICIO_ADULTO = 18;

export function criarVida(o: OpcoesNovaVida): Vida {
  const rng = Rng.daSeed(o.seed);

  const sexo: Sexo = o.sexo ?? (rng.proximo() < 0.5 ? 'feminino' : 'masculino');
  const nome = o.nome?.trim() || rng.escolher(nomes[sexo]);
  const sobrenome = o.sobrenome?.trim() || rng.escolher(nomes.sobrenomes);
  const estado = ESTADOS.find((e) => e.sigla === o.estado) ?? rng.escolher(ESTADOS);
  const cidade = rng.escolher(estado.cidades);

  const personalidade = {} as Record<Eixo, number>;
  for (const e of EIXOS) personalidade[e] = rng.normalAprox(-70, 70);

  const potencial: Potencial = {
    saude: rng.normalAprox(45, 100),
    forma: rng.normalAprox(25, 95),
    aparencia: rng.normalAprox(15, 95),
    inteligencia: rng.normalAprox(15, 98),
    carisma: rng.normalAprox(15, 95),
  };

  const idadeMeses = o.inicio === 'adulto' ? IDADE_INICIO_ADULTO * 12 : 0;
  const atributos: Record<Atributo, number> = {
    ...atributosNaIdade(potencial, idadeMeses / 12, personalidade.disciplina),
    felicidade: rng.normalAprox(50, 90),
    sorte: rng.normalAprox(0, 100),
  };

  const relogio: Relogio = { ano: o.ano, semestre: 1, idadeMeses };
  const abertura = o.inicio === 'adulto'
    ? `Sua história começa aos ${IDADE_INICIO_ADULTO} anos, em ${cidade} (${estado.sigla}).`
    : `Você nasceu em ${cidade} (${estado.sigla}).`;

  return {
    versao: VERSAO_SAVE,
    id: o.id,
    criadaEm: o.criadaEm,
    config: { seed: o.seed, turno: o.turno, morte: o.morte, inicio: o.inicio },
    rng: rng.estado(),
    relogio,
    personagem: {
      nome, sobrenome, sexo, estado: estado.sigla, cidade, atributos, personalidade, potencial,
      dinheiro: 0, desgaste: 0, tracos: [],
    },
    atributosAnteriores: { ...atributos },
    historico: [{ quando: rotuloPeriodo(relogio, o.turno), texto: abertura }],
    habitos: [],
    memorias: [],
    ganchos: [],
    pendente: null,
    periodo: {},
    totais: {},
    vistos: {},
    ganchosCumpridos: 0,
  };
}

/** Efeito por ano de cada nível de vício ou condição. */
const PESO_TRACO: Record<string, (n: number) => Record<string, number>> = {
  alcool: (n) => ({ 'atributos.saude': -1 * n, 'atributos.felicidade': -0.5 * n }),
  cigarro: (n) => ({ 'atributos.saude': -1.2 * n }),
  jogo: (n) => ({ 'atributos.felicidade': -1 * n, dinheiro: -150 * n }),
  diabetes: (n) => ({ 'atributos.saude': n >= 2 ? -3 : -0.5 }),
};

/** Relógio do próximo período, sem rodar nada. */
export function proximoRelogio(r: Relogio, turno: Turno): Relogio {
  const anos = turno === 'ano' ? 1 : 0.5;
  const prox = { ...r, idadeMeses: r.idadeMeses + anos * 12 };
  if (turno === 'ano') prox.ano += 1;
  else if (r.semestre === 1) prox.semestre = 2;
  else { prox.semestre = 1; prox.ano += 1; }
  return prox;
}

/**
 * Avança um período (1 ano ou 1 semestre): roda os hábitos do período que fecha,
 * envelhece, sorteia eventos e a morte. Não avança com um evento esperando decisão.
 */
export function avancarPeriodo(vida: Vida): Vida {
  if (vida.morte || vida.pendente) return vida;
  const prox = structuredClone(vida);
  const rng = new Rng(prox.rng);
  const mesesAntes = prox.relogio.idadeMeses;
  const anos = prox.config.turno === 'ano' ? 1 : 0.5;
  const p = prox.personagem;
  prox.atributosAnteriores = { ...p.atributos };

  // Os hábitos rendem no período que está fechando.
  const linhasHabitos = rodarHabitos(prox, anos, rng);

  prox.relogio = proximoRelogio(prox.relogio, prox.config.turno);
  const r = prox.relogio;
  const idade = r.idadeMeses / 12;
  const quando = rotuloPeriodo(r, prox.config.turno);

  // Vícios e condições pesam todo período; cansaço alto também.
  for (const t of p.tracos) {
    const f = PESO_TRACO[t.id];
    if (f) aplicar(prox, f(t.nivel), anos);
  }
  if (p.desgaste > 60) {
    const excesso = p.desgaste - 60;
    aplicar(prox, { 'atributos.saude': -excesso * 0.1, 'atributos.felicidade': -excesso * 0.15 }, anos);
  }

  envelhecer(p, idade, anos, rng);

  const novidades: EntradaHistorico[] = [];
  const nota = (texto: string) => novidades.push({ quando, texto });

  for (const m of MARCOS_IDADE) {
    if (mesesAntes < m.meses && r.idadeMeses >= m.meses) nota(m.texto(p.sexo));
  }
  const eventos = rodarEventos(prox, anos, rng);
  for (const t of eventos) nota(t);

  if (idade >= 2) {
    const d = (a: Atributo) => p.atributos[a] - prox.atributosAnteriores[a];
    if (d('saude') <= -6) nota('Sua saúde piorou neste período.');
    if (d('saude') >= 6) nota('Você está se sentindo mais saudável.');
    if (d('felicidade') >= 8) nota('Foi um período feliz.');
    if (d('felicidade') <= -8) nota('Foi um período difícil.');
  }

  const causa = sortearMorte(p, idade, anos, rng);
  if (causa) {
    prox.morte = { ano: r.ano, idadeMeses: r.idadeMeses, causa };
    prox.pendente = null;
    nota(`Você morreu aos ${textoIdade(r.idadeMeses)}, ${causa}.`);
  } else if (novidades.length === 0 && !prox.pendente) {
    nota(`Um período tranquilo. Você está com ${textoIdade(r.idadeMeses)}.`);
  }

  // Metade do cansaço some a cada ano.
  p.desgaste = limitar(p.desgaste * 0.5 ** anos);
  prox.periodo = {};

  prox.historico.push(...linhasHabitos.map((texto) => ({ quando, texto })), ...novidades);
  prox.rng = rng.estado();
  return prox;
}


/** Fases que viram uma linha na história quando a idade passa por elas. */
const MARCOS_IDADE: { meses: number; texto: (s: Sexo) => string }[] = [
  { meses: 12, texto: () => 'Você deu os primeiros passos.' },
  { meses: 24, texto: () => 'Você já fala as primeiras frases.' },
  { meses: 13 * 12, texto: () => 'Você virou adolescente, e o corpo começou a mudar.' },
  { meses: 18 * 12, texto: () => 'Você completou 18 anos e agora é maior de idade.' },
  { meses: 30 * 12, texto: () => 'Você chegou aos 30.' },
  { meses: 50 * 12, texto: () => 'Meio século de vida.' },
  { meses: 60 * 12, texto: (s) => `Você completou 60 anos e agora é ${s === 'feminino' ? 'idosa' : 'idoso'}.` },
  { meses: 80 * 12, texto: () => 'Oitenta anos de história.' },
  { meses: 100 * 12, texto: () => 'Você chegou aos 100 anos!' },
];

export function rotuloPeriodo(r: Relogio, turno: Turno): string {
  return turno === 'ano' ? `${r.ano}` : `${r.ano} · ${r.semestre}º semestre`;
}

export function textoIdade(meses: number): string {
  if (meses < 12) return meses === 0 ? 'recém-nascido' : `${meses} meses`;
  const anos = Math.floor(meses / 12);
  return anos === 1 ? '1 ano' : `${anos} anos`;
}

export function nomeCompleto(vida: Vida): string {
  return `${vida.personagem.nome} ${vida.personagem.sobrenome}`;
}
