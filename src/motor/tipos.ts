// Tipos do estado de uma vida. Tudo o que o jogo sabe fica num objeto Vida,
// que é o que se salva, exporta e (no Modo Deus) edita.

import type { EstadoRng } from './rng';

export const VERSAO_SAVE = 1;

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
}

export interface EntradaHistorico {
  quando: string; // ex.: "2026 · 1º semestre"
  texto: string;
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
}
