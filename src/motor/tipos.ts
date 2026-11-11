// Tipos do estado de uma vida. Tudo o que o jogo sabe fica num objeto Vida,
// que é o que se salva, exporta e (no Modo Deus) edita.

import type { EstadoRng } from './rng';

export const VERSAO_SAVE = 2;

export const ATRIBUTOS = [
  'saude', 'felicidade', 'inteligencia', 'aparencia', 'forma', 'carisma', 'sorte',
] as const;
export type Atributo = (typeof ATRIBUTOS)[number];

export const EIXOS = [
  'extroversao', 'empatia', 'disciplina', 'impulsividade',
  'ambicao', 'moralidade', 'estabilidade', 'curiosidade',
] as const;
export type Eixo = (typeof EIXOS)[number];

export type Sexo = 'feminino' | 'masculino';
export type Turno = 'ano' | 'semestre';
export type ModoMorte = 'permanente' | 'voltar';
export type Inicio = 'bebe' | 'adulto';

export interface Config {
  seed: string;
  turno: Turno;
  morte: ModoMorte;
  inicio: Inicio;
}

export interface Relogio {
  ano: number;
  semestre: 1 | 2;
  idadeMeses: number;
}

/** Genética: até onde cada atributo físico pode chegar. A idade puxa para baixo. */
export type Potencial = Record<'saude' | 'forma' | 'aparencia' | 'inteligencia' | 'carisma', number>;

export interface Morte {
  ano: number;
  idadeMeses: number;
  causa: string; // ex.: "de causas naturais"
}

export interface Personagem {
  nome: string;
  sobrenome: string;
  sexo: Sexo;
  estado: string; // sigla, ex.: "RS"
  cidade: string;
  /** 0 a 100 */
  atributos: Record<Atributo, number>;
  /** -100 a +100 */
  personalidade: Record<Eixo, number>;
  potencial: Potencial;
  /** Saldo em reais. Salário e gastos fixos chegam no marco 4. */
  dinheiro: number;
  /** Cansaço e estresse, 0 a 100. Metade some a cada período. */
  desgaste: number;
  /** Talentos, vícios e condições, com nível. */
  tracos: Traco[];
}

export interface Traco {
  id: string;
  nivel: number;
}

/** Ação que se repete sozinha. Só o jogador cria (ou os pais, na infância). */
export interface Habito {
  acao: string;
  porSemana: number;
  imposto?: boolean;
  /** Motivo, quando o hábito ficou impossível (ex.: sem dinheiro). */
  pausado?: string;
}

/** Marco da vida que eventos futuros podem lembrar. */
export interface Memoria {
  id: string;
  texto: string; // completa "lembrou de quando ...", ex.: "adotou o Pipoca"
  peso: number; // -100 a +100
  ano: number;
  idadeMeses: number;
  vars?: Record<string, string>;
}

/** Fio aberto: um evento marcado para voltar numa idade. */
export interface Gancho {
  evento: string;
  idadeMeses: number;
  vars?: Record<string, string>;
}

/** Evento que espera uma decisão antes do próximo Avançar. */
export interface Pendente {
  evento: string;
  texto: string;
  vars: Record<string, string>;
  escolhas: { texto: string; motivo?: string }[];
}

export interface EntradaHistorico {
  quando: string; // ex.: "2026 · 1º semestre"
  texto: string;
  /** Linhas de ação repetida se juntam: "Você foi à academia (3x)". */
  acao?: string;
  vezes?: number;
  delta?: Record<string, number>;
}

export interface Vida {
  versao: typeof VERSAO_SAVE;
  id: string;
  criadaEm: string; // ISO
  config: Config;
  rng: EstadoRng;
  relogio: Relogio;
  personagem: Personagem;
  /** Atributos no começo do período atual, para mostrar a tendência (↑↓). */
  atributosAnteriores: Record<Atributo, number>;
  historico: EntradaHistorico[];
  /** Preenchido quando o personagem morre. */
  morte?: Morte;
  habitos: Habito[];
  memorias: Memoria[];
  ganchos: Gancho[];
  pendente: Pendente | null;
  /** Vezes que cada ação foi feita à mão no período atual. */
  periodo: Record<string, number>;
  /** Sessões acumuladas na vida (à mão e por hábito), para talentos. */
  totais: Record<string, number>;
  /** Idade (em meses) em que cada evento aconteceu pela última vez. */
  vistos: Record<string, number>;
  /** Ganchos que voltaram de fato (para o teste de variedade). */
  ganchosCumpridos: number;
}
