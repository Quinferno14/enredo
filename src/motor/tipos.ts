// Tipos do estado de uma vida. Tudo o que o jogo sabe fica num objeto Vida,
// que é o que se salva, exporta e (no Modo Deus) edita.

import type { EstadoRng } from './rng';

export const VERSAO_SAVE = 4;

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
  /** Origem da família: muda escola, mesada e ajuda dos pais. */
  classe: Classe;
  estudo: Estudo;
  trabalho: Trabalho;
  dividas: Divida[];
  moradia: 'pais' | 'aluguel';
  /** Por quem tem interesse romântico. Escolha do jogador. */
  interesse: 'homens' | 'mulheres' | 'todos';
}

export type Papel = 'mae' | 'pai' | 'irmao' | 'parceiro' | 'ex' | 'filho';

/** Alguém da família ou da vida amorosa. */
export interface Pessoa {
  id: string;
  nome: string;
  sobrenome: string;
  sexo: Sexo;
  papel: Papel;
  idadeMeses: number;
  vivo: boolean;
  /** Quanto gosta de você, 0 a 100. */
  afeto: number;
  saude: number;
  aparencia: number;
  inteligencia: number;
  carisma: number;
  potencial: Potencial;
  personalidade: Record<Eixo, number>;
  /** Renda mensal (adultos). */
  renda: number;
  relacao?: 'namoro' | 'casamento';
  /** Filhos: id da outra pessoa que é mãe/pai (o parceiro de quando nasceu). */
  outroGenitor?: string;
  adotado?: boolean;
  morte?: Morte;
}

export interface Linhagem {
  geracao: number;
  /** "Ana Souza (2026–2101)", da mais antiga para a mais recente. */
  anteriores: string[];
}

export type Classe = 'baixa' | 'media' | 'alta';
export type Escolaridade = 'nenhuma' | 'fundamental' | 'medio' | 'superior';
export const ORDEM_ESCOLARIDADE: Escolaridade[] = ['nenhuma', 'fundamental', 'medio', 'superior'];

export interface Estudo {
  /** O que está cursando agora. */
  etapa: 'nenhuma' | 'fundamental' | 'medio' | 'faculdade';
  rede: 'publica' | 'particular';
  serie: number; // 1º ano, 2º ano...
  /** Fração do ano letivo já cursada (o modo semestre anda de 0,5 em 0,5). */
  progresso: number;
  nota: number; // 0 a 100
  reprovacoes: number;
  escolaridade: Escolaridade;
  enem?: number;
  curso?: string;
  /** Cursos superiores concluídos. */
  formacoes: string[];
  /** Fez cursinho: o ENEM do fim do ano vem com bônus. */
  cursinho?: boolean;
}

export interface Emprego {
  id: string;
  salario: number; // mensal, R$
  desempenho: number; // 0 a 100
  nivel: number; // 0 = cargo de entrada
  desdeMeses: number;
}

export interface Trabalho {
  emprego: Emprego | null;
  anosContribuicao: number;
  /** Aposentadoria mensal do INSS; 0 enquanto não aposentou. */
  aposentadoria: number;
}

export interface Divida {
  id: string;
  nome: string;
  saldo: number;
  /** Parcela mensal; 0 = ainda não começou a pagar (ex.: FIES durante o curso). */
  parcela: number;
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
  /** Decisões do próprio jogo (vagas de emprego, escolha de curso), fora dos eventos. */
  sistema?: 'vagas' | 'curso' | 'pretendentes';
  /** Candidatos de "Procurar alguém". */
  candidatos?: Pessoa[];
  /** Ids alinhados com as escolhas (empregos ou cursos). */
  dados?: string[];
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
  pessoas: Pessoa[];
  linhagem: Linhagem;
}
