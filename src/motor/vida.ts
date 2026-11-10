// Criar uma vida e avançar o tempo. Funções puras: recebem um estado e
// devolvem outro, sem tocar em tela nem em save.

import estados from '../conteudo/estados.json';
import nomes from '../conteudo/nomes.json';
import { Rng } from './rng';
import {
  ATRIBUTOS, EIXOS, VERSAO_SAVE,
  type Atributo, type Eixo, type Inicio, type ModoMorte, type Relogio,
  type Sexo, type Turno, type Vida,
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

  const atributos = {} as Record<Atributo, number>;
  for (const a of ATRIBUTOS) atributos[a] = rng.normalAprox(15, 95);
  // Bebês nascem com saúde e felicidade mais altas.
  if (o.inicio === 'bebe') {
    atributos.saude = rng.normalAprox(60, 100);
    atributos.felicidade = rng.normalAprox(60, 95);
  }

  const personalidade = {} as Record<Eixo, number>;
  for (const e of EIXOS) personalidade[e] = rng.normalAprox(-70, 70);

  const idadeMeses = o.inicio === 'adulto' ? IDADE_INICIO_ADULTO * 12 : 0;
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
    personagem: { nome, sobrenome, sexo, estado: estado.sigla, cidade, atributos, personalidade },
    atributosAnteriores: { ...atributos },
    historico: [{ quando: rotuloPeriodo(relogio, o.turno), texto: abertura }],
  };
}

/** Avança um período (1 ano ou 1 semestre). No marco 1 só o relógio anda. */
export function avancarPeriodo(vida: Vida): Vida {
  const prox = structuredClone(vida);
  const r = prox.relogio;
  if (prox.config.turno === 'ano') {
    r.ano += 1;
    r.idadeMeses += 12;
  } else {
    if (r.semestre === 1) {
      r.semestre = 2;
    } else {
      r.semestre = 1;
      r.ano += 1;
    }
    r.idadeMeses += 6;
  }
  prox.atributosAnteriores = { ...vida.personagem.atributos };
  prox.historico.push({
    quando: rotuloPeriodo(r, prox.config.turno),
    texto: `Um novo período começou. Você está com ${textoIdade(r.idadeMeses)}.`,
  });
  return prox;
}

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
