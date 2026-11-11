// Peças comuns a ações e eventos: ler um valor do estado por um caminho
// ("atributos.forma"), aplicar efeitos, conferir condições, trocar
// marcadores no texto e resumir o que mudou ("Forma +3 · Cansaço +4").

import nomes from '../conteudo/nomes.json';
import { limitar } from './envelhecer';
import type { Rng } from './rng';
import { ATRIBUTOS, EIXOS, type Atributo, type Eixo, type Sexo, type Vida } from './tipos';

export type Efeitos = Record<string, number | string>;

/** Condições de um evento ou escolha. Tudo que estiver presente precisa valer. */
export interface Quando {
  idade?: [number, number];
  sexo?: Sexo;
  estado?: string[];
  min?: Record<string, number>;
  max?: Record<string, number>;
  memoria?: string | string[];
  semMemoria?: string | string[];
  traco?: Record<string, number>; // id → nível mínimo
  semTraco?: string[];
  /** Fez a ação à mão neste período ou tem o hábito ativo. */
  acao?: string;
}

const lista = (x: string | string[] | undefined) => (x === undefined ? [] : Array.isArray(x) ? x : [x]);

export function nivelTraco(vida: Vida, id: string): number {
  return vida.personagem.tracos.find((t) => t.id === id)?.nivel ?? 0;
}

export function temMemoria(vida: Vida, id: string): boolean {
  return vida.memorias.some((m) => m.id === id);
}

/** Lê um número do estado: "atributos.x", "personalidade.x", "traco.x", "dinheiro", "desgaste", "idade". */
export function valor(vida: Vida, caminho: string): number {
  const p = vida.personagem;
  const [raiz, chave] = caminho.split('.') as [string, string | undefined];
  switch (raiz) {
    case 'atributos': return p.atributos[chave as Atributo] ?? 0;
    case 'personalidade': return p.personalidade[chave as Eixo] ?? 0;
    case 'traco': return nivelTraco(vida, chave ?? '');
    case 'dinheiro': return p.dinheiro;
    case 'desgaste': return p.desgaste;
    case 'idade': return vida.relogio.idadeMeses / 12;
    default: return 0;
  }
}

export function atende(vida: Vida, q: Quando | undefined): boolean {
  if (!q) return true;
  const p = vida.personagem;
  const idade = vida.relogio.idadeMeses / 12;
  if (q.idade && (idade < q.idade[0] || idade > q.idade[1])) return false;
  if (q.sexo && p.sexo !== q.sexo) return false;
  if (q.estado && !q.estado.includes(p.estado)) return false;
  for (const [c, v] of Object.entries(q.min ?? {})) if (valor(vida, c) < v) return false;
  for (const [c, v] of Object.entries(q.max ?? {})) if (valor(vida, c) > v) return false;
  if (!lista(q.memoria).every((m) => temMemoria(vida, m))) return false;
  if (lista(q.semMemoria).some((m) => temMemoria(vida, m))) return false;
  for (const [t, n] of Object.entries(q.traco ?? {})) if (nivelTraco(vida, t) < n) return false;
  if ((q.semTraco ?? []).some((t) => nivelTraco(vida, t) > 0)) return false;
  if (q.acao) {
    const habito = vida.habitos.some((h) => h.acao === q.acao && !h.pausado);
    if (!habito && !(vida.periodo[q.acao] ?? 0)) return false;
  }
  return true;
}

/** Motivo legível de uma condição não atendida (para escolhas desabilitadas). */
export function motivo(vida: Vida, q: Quando | undefined): string | undefined {
  if (!q || atende(vida, q)) return undefined;
  const din = q.min?.dinheiro;
  if (din !== undefined && vida.personagem.dinheiro < din) return `Precisa de ${reais(din)}`;
  return 'Não dá agora';
}

/**
 * Multiplicador de peso. Chave "caminho": fator 1 + coef × valor (nunca abaixo de 0,05).
 * Chave "caminho<N" ou "caminho>N": multiplica por coef se a comparação vale.
 */
export function multiplicador(vida: Vida, x: Record<string, number> | undefined): number {
  let m = 1;
  for (const [chave, coef] of Object.entries(x ?? {})) {
    const cmp = /^(.+?)([<>])(-?[\d.]+)$/.exec(chave);
    if (cmp) {
      const v = valor(vida, cmp[1]!);
      const lim = Number(cmp[3]);
      if (cmp[2] === '<' ? v < lim : v > lim) m *= coef;
    } else {
      m *= Math.max(0.05, 1 + coef * valor(vida, chave));
    }
  }
  return m;
}

/** Aplica efeitos multiplicados por `fator`. "-20%" vale para dinheiro. */
export function aplicar(vida: Vida, efeitos: Efeitos | undefined, fator = 1): void {
  const p = vida.personagem;
  for (const [caminho, bruto] of Object.entries(efeitos ?? {})) {
    const [raiz, chave] = caminho.split('.') as [string, string | undefined];
    let d: number;
    if (typeof bruto === 'string' && bruto.endsWith('%')) {
      d = (valor(vida, caminho) * Number(bruto.slice(0, -1))) / 100;
    } else {
      d = Number(bruto) * fator;
    }
    if (raiz === 'atributos' && chave && (ATRIBUTOS as readonly string[]).includes(chave)) {
      p.atributos[chave as Atributo] = limitar(p.atributos[chave as Atributo] + d);
    } else if (raiz === 'personalidade' && chave && (EIXOS as readonly string[]).includes(chave)) {
      p.personalidade[chave as Eixo] = limitar(p.personalidade[chave as Eixo] + d, -100, 100);
    } else if (raiz === 'dinheiro') {
      p.dinheiro = Math.round(p.dinheiro + d);
    } else if (raiz === 'desgaste') {
      p.desgaste = limitar(p.desgaste + d);
    } else if (raiz === 'traco' && chave) {
      mudarTraco(vida, chave, Math.round(d));
    }
  }
}

export function mudarTraco(vida: Vida, id: string, delta: number): void {
  const tracos = vida.personagem.tracos;
  const t = tracos.find((x) => x.id === id);
  const novo = Math.max(0, Math.min(3, (t?.nivel ?? 0) + delta));
  if (t) t.nivel = novo;
  else if (novo > 0) tracos.push({ id, nivel: novo });
  vida.personagem.tracos = tracos.filter((x) => x.nivel > 0);
}

// ---- Resumo do que mudou ----

export type Foto = Record<string, number>;

/** Guarda os números visíveis para comparar depois. Atributos com casas decimais internas. */
export function foto(vida: Vida): Foto {
  const p = vida.personagem;
  const f: Foto = { dinheiro: p.dinheiro, desgaste: p.desgaste };
  for (const a of ATRIBUTOS) if (a !== 'sorte') f[a] = p.atributos[a];
  return f;
}

export function diferenca(antes: Foto, depois: Foto): Record<string, number> {
  const d: Record<string, number> = {};
  for (const k of Object.keys(depois)) {
    const x = (depois[k] ?? 0) - (antes[k] ?? 0);
    if (Math.abs(x) >= 0.05) d[k] = x;
  }
  return d;
}

const ROTULO: Record<string, string> = {
  saude: 'Saúde', felicidade: 'Felicidade', inteligencia: 'Inteligência', aparencia: 'Aparência',
  forma: 'Forma', carisma: 'Carisma', desgaste: 'Cansaço', dinheiro: 'Dinheiro',
};

/** "Forma +2 · Cansaço +4 · Dinheiro −R$ 80". Valores abaixo de 0,5 viram "+0" só se nada mais mudou. */
export function resumo(delta: Record<string, number>): string {
  const partes: string[] = [];
  for (const [k, v] of Object.entries(delta)) {
    if (k === 'dinheiro') {
      if (Math.round(v) !== 0) partes.push(`${v > 0 ? '+' : '−'}${reais(Math.abs(v))}`);
      continue;
    }
    const r = Math.round(v);
    if (r === 0) continue;
    partes.push(`${ROTULO[k] ?? k} ${r > 0 ? '+' : '−'}${Math.abs(r)}`);
  }
  return partes.join(' · ');
}

export function reais(v: number): string {
  return `R$ ${Math.round(v).toLocaleString('pt-BR')}`;
}

// ---- Texto ----

const NOMES_PET = ['Pipoca', 'Bolinha', 'Thor', 'Mel', 'Paçoca', 'Toddy', 'Pretinha', 'Caramelo'];

/** Sorteia os marcadores que um texto usa, para ficarem fixos (ex.: no evento pendente). */
export function sortearVars(rng: Rng, extras?: Record<string, string[]>): Record<string, string> {
  const v: Record<string, string> = {
    amigo: rng.escolher(nomes.masculino),
    amiga: rng.escolher(nomes.feminino),
    pet: rng.escolher(NOMES_PET),
    sobrenome2: rng.escolher(nomes.sobrenomes),
  };
  for (const [k, opcoes] of Object.entries(extras ?? {})) v[k] = rng.escolher(opcoes);
  return v;
}

/**
 * Troca marcadores: {nome}, {cidade}, {estado}, {amigo}, {amiga}, {pet}, outros de `vars`,
 * e {masculino|feminino} pelo sexo do personagem.
 */
export function preencher(texto: string, vida: Vida, vars: Record<string, string>): string {
  const p = vida.personagem;
  const base: Record<string, string> = { nome: p.nome, cidade: p.cidade, estado: p.estado, ...vars };
  return texto.replace(/\{([^{}]+)\}/g, (inteiro, dentro: string) => {
    if (dentro.includes('|')) {
      const [m, f] = dentro.split('|');
      return (p.sexo === 'feminino' ? f : m) ?? '';
    }
    return base[dentro] ?? inteiro;
  });
}
