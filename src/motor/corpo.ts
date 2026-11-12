// Rosto e corpo no motor do jogo. Cada pessoa tem genes (fixos, herdados dos pais)
// e um visual (o que ela muda: corte, tintura, tatuagem, peso a mais ou a menos).
// O corpo de cada idade é calculado: altura pela curva de crescimento, peso pela
// forma física, cabelos brancos, calvície e óculos chegando com o tempo.
//
// Características íntimas: só de maiores de 18, só como texto, nunca desenhadas.
// O motor recusa gravá-las ou lê-las para quem tem menos de 18 anos.

import { Rng } from './rng';
import type { Pessoa, Personagem, Sexo, Vida } from './tipos';
import type { Aparencia, FormatoRosto, LocalTatuagem, ModeloTatuagem, Nariz, TipoBarba, TipoCabelo } from '../arte/pessoa';

export type TipoNatural = 'liso' | 'ondulado' | 'cacheado' | 'crespo';

export interface Genes {
  pele: string;
  olhos: string;
  rosto: FormatoRosto;
  nariz: Nariz;
  cabeloNatural: TipoNatural;
  corCabelo: string;
  /** Altura adulta que o corpo busca (cm). */
  alturaAlvo: number;
  /** -1 (engorda fácil) a 1 (magro de nascença). */
  metabolismo: number;
  sardas: boolean;
  /** Idade em que os brancos dominam. */
  grisalhoAos: number;
  /** Idade em que a calvície começa (só homens; null = não). */
  calvicieAos: number | null;
  /** Idade em que passa a precisar de óculos (null = nunca). */
  oculosAos: number | null;
  /** O corte que a pessoa usa sem ninguém mandar. */
  estilo: TipoCabelo;
  barba: TipoBarba;
  /** Chance de ter tatuagem na vida adulta (pessoas que não são você). */
  tatuada: boolean;
}

/** O que a pessoa mudou por vontade própria (ou o Modo Deus mudou). */
export interface Visual {
  cabelo?: TipoCabelo;
  corCabelo?: string;
  barba?: TipoBarba;
  oculos?: boolean;
  tatuagens?: LocalTatuagem[];
  /** Qual desenho em cada lugar tatuado. */
  modelosTatuagem?: Partial<Record<LocalTatuagem, ModeloTatuagem>>;
  /** Kg a mais (+) ou a menos (−) do que a forma física daria. */
  ajustePeso?: number;
  /** Só 18+. Texto, nunca desenho. */
  intimo?: Record<string, string>;
}

// ---------- Populações ----------

/** Tons de pele do Brasil, do mais claro ao mais escuro, com o peso de cada um. */
export const PELES = ['#f6d5b8', '#ecc19c', '#d9a77f', '#c08a62', '#9b6a45', '#7a5034', '#5a3a26'] as const;
const PESO_PELE = [0.12, 0.18, 0.2, 0.2, 0.14, 0.1, 0.06];
const OLHOS = { castanhoEscuro: '#3b2416', castanho: '#5a3b22', mel: '#8a6a2b', verde: '#4f7a4a', azul: '#4f7fa8' } as const;
const CORES_CABELO = { preto: '#1b1310', castanhoEscuro: '#2b1d14', castanho: '#5a3a22', ruivo: '#a5432a', loiro: '#d8b56a' } as const;
const BRANCO = '#cfcfcf';

function sortearPeso<T>(rng: Rng, itens: readonly T[], pesos: number[]): T {
  const total = pesos.reduce((a, b) => a + b, 0);
  let r = rng.proximo() * total;
  for (let i = 0; i < itens.length; i++) { r -= pesos[i] ?? 0; if (r <= 0) return itens[i] as T; }
  return itens[itens.length - 1] as T;
}
const indicePele = (pele: string) => Math.max(0, PELES.indexOf(pele as typeof PELES[number]));

function hexMisturar(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const c = [16, 8, 0].map((s) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/** Corte de cabelo que a pessoa usaria pelo tipo natural. */
function estiloPadrao(rng: Rng, sexo: Sexo, natural: TipoNatural): TipoCabelo {
  if (sexo === 'masculino') {
    if (natural === 'crespo') return rng.escolher(['raspado', 'crespo', 'raspado', 'tranças'] as const);
    if (natural === 'cacheado') return rng.escolher(['cacheado', 'raspado', 'liso-curto'] as const);
    return rng.escolher(['liso-curto', 'liso-curto', 'raspado'] as const);
  }
  if (natural === 'crespo') return rng.escolher(['crespo', 'tranças', 'coque', 'crespo'] as const);
  if (natural === 'cacheado') return rng.escolher(['cacheado', 'cacheado', 'coque'] as const);
  if (natural === 'ondulado') return rng.escolher(['liso-longo', 'cacheado', 'coque'] as const);
  return rng.escolher(['liso-longo', 'liso-longo', 'liso-curto', 'coque'] as const);
}

/** Genes de alguém sem parentes conhecidos (ou ao redor de um tom de família). */
export function sortearGenes(rng: Rng, sexo: Sexo, tomFamilia?: number): Genes {
  const ip = tomFamilia === undefined
    ? PELES.indexOf(sortearPeso(rng, PELES, PESO_PELE))
    : Math.max(0, Math.min(PELES.length - 1, tomFamilia + rng.inteiro(-1, 1)));
  const pele = PELES[ip] as string;
  const escuro = ip / (PELES.length - 1);
  const cabeloNatural = sortearPeso<TipoNatural>(rng, ['liso', 'ondulado', 'cacheado', 'crespo'], [0.45 - escuro * 0.35, 0.25, 0.2 + escuro * 0.1, 0.05 + escuro * 0.5]);
  const corCabelo = escuro > 0.5 ? CORES_CABELO.preto
    : sortearPeso(rng, Object.values(CORES_CABELO), [0.3, 0.35, 0.2, 0.04 * (1 - escuro), 0.11 * (1 - escuro)]);
  const olhos = escuro > 0.6 ? rng.escolher([OLHOS.castanhoEscuro, OLHOS.castanho])
    : sortearPeso(rng, Object.values(OLHOS), [0.35, 0.35, 0.12, 0.09 * (1 - escuro), 0.09 * (1 - escuro)]);
  return montarGenes(rng, sexo, {
    pele, olhos, cabeloNatural, corCabelo,
    rosto: rng.escolher(['oval', 'redondo', 'quadrado', 'fino'] as const),
    nariz: sortearPeso<Nariz>(rng, ['pequeno', 'medio', 'largo'], [0.3 - escuro * 0.15, 0.45, 0.25 + escuro * 0.15]),
    alturaAlvo: (sexo === 'feminino' ? 160 : 173) + (rng.proximo() + rng.proximo() - 1) * 10,
    metabolismo: rng.proximo() * 2 - 1,
    sardas: ip <= 1 && rng.proximo() < 0.25,
  });
}

function montarGenes(rng: Rng, sexo: Sexo, base: Pick<Genes, 'pele' | 'olhos' | 'cabeloNatural' | 'corCabelo' | 'rosto' | 'nariz' | 'alturaAlvo' | 'metabolismo' | 'sardas'>): Genes {
  const masc = sexo === 'masculino';
  return {
    ...base,
    alturaAlvo: Math.round(base.alturaAlvo),
    metabolismo: Math.round(base.metabolismo * 100) / 100,
    grisalhoAos: rng.inteiro(42, 68),
    calvicieAos: masc && rng.proximo() < 0.4 ? rng.inteiro(24, 55) : null,
    oculosAos: rng.proximo() < 0.3 ? rng.inteiro(7, 30) : rng.proximo() < 0.6 ? rng.inteiro(42, 52) : null,
    estilo: estiloPadrao(rng, sexo, base.cabeloNatural),
    barba: masc ? sortearPeso<TipoBarba>(rng, ['nenhuma', 'por-fazer', 'cheia', 'cavanhaque', 'bigode'], [0.4, 0.25, 0.17, 0.12, 0.06]) : 'nenhuma',
    tatuada: rng.proximo() < 0.25,
  };
}

/** Filho de dois genes: mistura a pele, puxa um dos dois em cada traço, altura na média. */
export function herdarGenes(rng: Rng, sexo: Sexo, mae: Genes, pai?: Genes): Genes {
  const outro = pai ?? sortearGenes(rng, rng.proximo() < 0.5 ? 'feminino' : 'masculino', indicePele(mae.pele));
  const puxa = <K extends keyof Genes>(k: K): Genes[K] => (rng.proximo() < 0.5 ? mae[k] : outro[k]);
  const ip = Math.round((indicePele(mae.pele) + indicePele(outro.pele)) / 2 + rng.inteiro(-1, 1) * 0.5);
  const tipos: TipoNatural[] = ['liso', 'ondulado', 'cacheado', 'crespo'];
  // Cacho e crespo tendem a passar (escolhe o mais enrolado dos dois na maioria das vezes).
  const enrolado = Math.max(tipos.indexOf(mae.cabeloNatural), tipos.indexOf(outro.cabeloNatural));
  const cabeloNatural = rng.proximo() < 0.65 ? tipos[enrolado] as TipoNatural : puxa('cabeloNatural');
  const mediaAltura = (mae.alturaAlvo + outro.alturaAlvo) / 2 + (sexo === 'masculino' ? 6.5 : -6.5);
  return montarGenes(rng, sexo, {
    pele: PELES[Math.max(0, Math.min(PELES.length - 1, ip))] as string,
    olhos: rng.proximo() < 0.7 ? [mae.olhos, outro.olhos].sort()[0] as string : puxa('olhos'),
    cabeloNatural,
    corCabelo: rng.proximo() < 0.15 ? hexMisturar(mae.corCabelo, outro.corCabelo, 0.5) : puxa('corCabelo'),
    rosto: puxa('rosto'),
    nariz: puxa('nariz'),
    alturaAlvo: mediaAltura + (rng.proximo() + rng.proximo() - 1) * 7,
    metabolismo: (mae.metabolismo + outro.metabolismo) / 2 + (rng.proximo() - 0.5) * 0.6,
    sardas: (mae.sardas || outro.sardas) && rng.proximo() < 0.5,
  });
}

// ---------- Garantir genes para todo mundo ----------

const rngDe = (vida: Vida, chave: string) => Rng.daSeed(`${vida.config.seed}/corpo/${chave}`);
const PARENTES = new Set(['mae', 'pai', 'irmao', 'avo', 'tio', 'primo', 'sobrinho']);

/**
 * Dá genes a quem ainda não tem, respeitando a família: mãe e pai ao redor de um tom
 * da família, você e seus irmãos herdados deles, seus filhos herdados de você e do
 * outro genitor. Determinístico pela seed (não gasta o sorteio do jogo).
 */
export function garantirGenes(vida: Vida): void {
  const p = vida.personagem;
  // Roda a cada passo do tempo: sai na hora se ninguém está sem genes.
  if (p.genes && vida.pessoas.every((x) => x.genes)) return;
  const tomFamilia = rngDe(vida, 'familia').inteiro(0, PELES.length - 1);
  const porId = new Map(vida.pessoas.map((x) => [x.id, x]));
  const mae = vida.pessoas.find((x) => x.papel === 'mae');
  const pai = vida.pessoas.find((x) => x.papel === 'pai');
  for (const x of [mae, pai]) if (x && !x.genes) x.genes = sortearGenes(rngDe(vida, x.id), x.sexo, tomFamilia);
  if (!p.genes) {
    const r = rngDe(vida, 'eu');
    p.genes = mae?.genes ? herdarGenes(r, p.sexo, mae.genes, pai?.genes) : sortearGenes(r, p.sexo, tomFamilia);
  }
  // Primeiro irmãos e parentes; depois filhos (que precisam do outro genitor) e netos.
  const ordem = [...vida.pessoas].sort((a, b) => peso(a) - peso(b));
  for (const x of ordem) {
    if (x.genes) continue;
    const r = rngDe(vida, x.id);
    if (x.papel === 'irmao' && mae?.genes) x.genes = herdarGenes(r, x.sexo, mae.genes, pai?.genes);
    else if (x.papel === 'filho') x.genes = herdarGenes(r, x.sexo, p.genes, x.outroGenitor ? porId.get(x.outroGenitor)?.genes : undefined);
    else if (x.papel === 'neto') {
      const filho = vida.pessoas.find((f) => f.papel === 'filho' && f.genes);
      x.genes = filho?.genes ? herdarGenes(r, x.sexo, filho.genes) : sortearGenes(r, x.sexo, indicePele(p.genes.pele));
    } else x.genes = sortearGenes(r, x.sexo, PARENTES.has(x.papel) ? tomFamilia : undefined);
  }
}
const peso = (x: Pessoa) => (x.papel === 'filho' ? 2 : x.papel === 'neto' ? 3 : x.papel === 'parceiro' || x.papel === 'ex' ? 0 : 1);

// ---------- O corpo numa idade ----------

/** Altura pela curva de crescimento (encolhe um pouco depois dos 65). */
export function alturaNaIdade(alvo: number, sexo: Sexo, idade: number): number {
  const fim = sexo === 'feminino' ? 16 : 18;
  let h: number;
  if (idade < 2) h = 50 + 37 * (idade / 2);
  else if (idade < fim) h = 87 + (alvo - 87) * Math.pow((idade - 2) / (fim - 2), 0.95);
  else h = alvo;
  if (idade > 65) h -= (idade - 65) * 0.12;
  return Math.round(h);
}

/** Peso pela forma física (0 a 100), pelo metabolismo e pela idade. */
export function pesoNaIdade(genes: Genes, sexo: Sexo, idade: number, forma: number, ajuste = 0): number {
  const h = alturaNaIdade(genes.alturaAlvo, sexo, idade) / 100;
  let imc: number;
  if (idade < 2) imc = 16.5;
  else if (idade < 12) imc = 16 + (50 - forma) / 30 - genes.metabolismo * 0.8;
  else imc = 22.5 + (50 - forma) / 9 - genes.metabolismo * 1.8 + (idade > 30 ? Math.min(30, idade - 30) * 0.08 : 0) + (sexo === 'feminino' ? -0.6 : 0);
  return Math.max(3, Math.round(imc * h * h + ajuste));
}

/** Quanto do músculo aparece (0 a 1). */
export const musculoDe = (forma: number, idade: number, sexo: Sexo) =>
  idade < 13 ? 0.1 : Math.max(0, Math.min(1, (forma - 45) / 55 + (sexo === 'masculino' ? 0.08 : 0) - Math.max(0, idade - 60) * 0.01));

interface Sujeito { sexo: Sexo; idadeAnos: number; forma: number; genes: Genes; visual?: Visual }

/** O que se desenha de alguém agora (nunca inclui o íntimo). */
export function aparenciaDe(s: Sujeito): Aparencia {
  const { genes: g, visual: v = {}, idadeAnos: idade, sexo } = s;
  const careca = g.calvicieAos !== null && idade >= g.calvicieAos + 15;
  const ralo = g.calvicieAos !== null && idade >= g.calvicieAos;
  let cabelo: TipoCabelo = v.cabelo ?? (idade < 3 ? (g.cabeloNatural === 'crespo' ? 'crespo' : g.cabeloNatural === 'liso' ? 'liso-curto' : 'cacheado') : g.estilo);
  if (careca && !v.cabelo) cabelo = 'careca';
  else if (ralo && !v.cabelo && cabelo !== 'raspado') cabelo = 'liso-curto';
  const brancos = Math.max(0, Math.min(1, (idade - (g.grisalhoAos - 12)) / 14));
  const corBase = v.corCabelo ?? g.corCabelo;
  const corCabelo = v.corCabelo ? corBase : hexMisturar(corBase, BRANCO, brancos);
  const tatuagens = v.tatuagens ?? (s.idadeAnos >= 20 && g.tatuada ? (['braco-direito'] as LocalTatuagem[]) : []);
  return {
    sexo, idadeAnos: idade,
    alturaCm: alturaNaIdade(g.alturaAlvo, sexo, idade),
    pesoKg: pesoNaIdade(g, sexo, idade, s.forma, v.ajustePeso ?? 0),
    musculo: musculoDe(s.forma, idade, sexo),
    pele: g.pele, olhos: g.olhos, rosto: g.rosto, nariz: g.nariz,
    cabelo, corCabelo,
    barba: sexo === 'masculino' && idade >= 18 ? (v.barba ?? g.barba) : 'nenhuma',
    sardas: g.sardas,
    oculos: v.oculos ?? (g.oculosAos !== null && idade >= g.oculosAos),
    tatuagens: idade < 16 ? [] : tatuagens,
    ...(v.modelosTatuagem ? { modelosTatuagem: v.modelosTatuagem } : {}),
    corRoupa: '#2f6db5',
  };
}

const idadeDoPersonagem = (vida: Vida) => (vida.personagem.idadeBiologicaMeses ?? vida.relogio.idadeMeses) / 12;

export function aparenciaDoPersonagem(vida: Vida): Aparencia | null {
  const p = vida.personagem;
  if (!p.genes) return null;
  return aparenciaDe({ sexo: p.sexo, idadeAnos: idadeDoPersonagem(vida), forma: p.atributos.forma, genes: p.genes, visual: p.visual });
}

export function aparenciaDaPessoa(pe: Pessoa): Aparencia | null {
  if (!pe.genes) return null;
  return aparenciaDe({ sexo: pe.sexo, idadeAnos: pe.idadeMeses / 12, forma: pe.potencial.forma, genes: pe.genes, visual: pe.visual });
}

// ---------- Íntimo (18+, só texto) ----------

export const IDADE_INTIMO = 18;

/** Grava uma característica íntima. Recusa (devolve false) para menores de 18. */
export function definirIntimo(alvo: Personagem | Pessoa, idadeAnos: number, campo: string, valor: string): boolean {
  if (idadeAnos < IDADE_INTIMO) return false;
  alvo.visual ??= {};
  alvo.visual.intimo = { ...(alvo.visual.intimo ?? {}), [campo]: valor };
  return true;
}

/** Lê as características íntimas: sempre vazio para menores de 18. */
export function lerIntimo(alvo: Personagem | Pessoa, idadeAnos: number): Record<string, string> {
  if (idadeAnos < IDADE_INTIMO) return {};
  return { ...(alvo.visual?.intimo ?? {}) };
}

// ---------- Mudanças por vontade própria ----------

/** Aplica uma mudança de visual (salão, tatuagem, dieta). Tatuagem só a partir dos 16. */
export function mudarVisual(alvo: Personagem | Pessoa, idadeAnos: number, mudanca: Omit<Visual, 'intimo'>): boolean {
  if (mudanca.tatuagens && idadeAnos < 16) return false;
  const { intimo } = alvo.visual ?? {};
  alvo.visual = { ...(alvo.visual ?? {}), ...mudanca, ...(intimo ? { intimo } : {}) };
  return true;
}
