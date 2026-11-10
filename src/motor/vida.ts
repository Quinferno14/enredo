// Criar uma vida e avançar o tempo. Funções puras: recebem um estado e
// devolvem outro, sem tocar em tela nem em save.

import estados from '../conteudo/estados.json';
import nomes from '../conteudo/nomes.json';
import { atributosNaIdade, envelhecer, sortearMorte } from './envelhecer';
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
    personagem: { nome, sobrenome, sexo, estado: estado.sigla, cidade, atributos, personalidade, potencial },
    atributosAnteriores: { ...atributos },
    historico: [{ quando: rotuloPeriodo(relogio, o.turno), texto: abertura }],
  };
}

/** Avança um período (1 ano ou 1 semestre): envelhece, marca fases e sorteia a morte. */
export function avancarPeriodo(vida: Vida): Vida {
  if (vida.morte) return vida;
  const prox = structuredClone(vida);
  const rng = new Rng(prox.rng);
  const r = prox.relogio;
  const mesesAntes = r.idadeMeses;
  const anos = prox.config.turno === 'ano' ? 1 : 0.5;

  if (prox.config.turno === 'ano') {
    r.ano += 1;
  } else if (r.semestre === 1) {
    r.semestre = 2;
  } else {
    r.semestre = 1;
    r.ano += 1;
  }
  r.idadeMeses += anos * 12;
  const idade = r.idadeMeses / 12;
  const quando = rotuloPeriodo(r, prox.config.turno);
  const p = prox.personagem;

  prox.atributosAnteriores = { ...p.atributos };
  envelhecer(p, idade, anos, rng);

  const novidades: EntradaHistorico[] = [];
  const nota = (texto: string) => novidades.push({ quando, texto });

  for (const m of MARCOS_IDADE) {
    if (mesesAntes < m.meses && r.idadeMeses >= m.meses) nota(m.texto(p.sexo));
  }
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
    nota(`Você morreu aos ${textoIdade(r.idadeMeses)}, ${causa}.`);
  } else if (novidades.length === 0) {
    nota(`Um período tranquilo. Você está com ${textoIdade(r.idadeMeses)}.`);
  }

  prox.historico.push(...novidades);
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
