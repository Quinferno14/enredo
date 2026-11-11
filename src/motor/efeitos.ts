// Peças comuns a ações e eventos: ler um valor do estado por um caminho
// ("atributos.forma"), aplicar efeitos, conferir condições, trocar
// marcadores no texto e resumir o que mudou ("Forma +3 · Cansaço +4").

import nomes from '../conteudo/nomes.json';
import { limitar } from './envelhecer';
import type { Rng } from './rng';
import {
  ATRIBUTOS, EIXOS, ORDEM_ESCOLARIDADE,
  type Atributo, type Classe, type Eixo, type Escolaridade, type Estudo, type Papel, type Pessoa, type Sexo, type Vida,
} from './tipos';

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
  etapa?: Estudo['etapa'][];
  rede?: Estudo['rede'];
  escolaridadeMin?: Escolaridade;
  /** Tem pelo menos um destes cursos superiores. */
  formacao?: string[];
  empregado?: boolean;
  aposentado?: boolean;
  moradia?: 'pais' | 'aluguel';
  classe?: Classe[];
  /** Precisa existir alguém assim; o evento usa essa pessoa como personagem. */
  pessoa?: QuandoPessoa;
  semParceiro?: boolean;
  /** Basta uma destas valer (ex.: faculdade OU habilidade). */
  ou?: Quando[];
  /** Anos de diferença, no mínimo, entre a idade real e a do corpo (idade pausada). */
  anomalia?: number;
  /** Calendário: o ano precisa deixar este resto na divisão (ex.: Copa = [4, 2]). */
  ano?: [number, number];
  /** Meses do ano em que pode acontecer (só vale no tempo dinâmico). */
  mes?: number[];
}

export interface QuandoPessoa {
  papel: Papel[];
  vivo?: boolean; // padrão: true
  afeto?: [number, number];
  idade?: [number, number];
  relacao?: 'namoro' | 'casamento';
  rival?: boolean;
  /** Pessoas com quem você perdeu o contato (padrão: só as que estão por perto). */
  afastado?: boolean;
  /** Sexo da pessoa (para o texto combinar). */
  sexo?: Sexo;
  /** Tem namorado(a) ou é casado(a), na vida própria dela. */
  comParceiro?: boolean;
}

export function pessoasQueAtendem(vida: Vida, q: QuandoPessoa): Pessoa[] {
  return vida.pessoas.filter((pe) => {
    if (!q.papel.includes(pe.papel)) return false;
    if (pe.vivo !== (q.vivo ?? true)) return false;
    if (q.afeto && (pe.afeto < q.afeto[0] || pe.afeto > q.afeto[1])) return false;
    const idade = pe.idadeMeses / 12;
    if (q.idade && (idade < q.idade[0] || idade > q.idade[1])) return false;
    if (q.relacao && pe.relacao !== q.relacao) return false;
    if (q.rival !== undefined && !!pe.rival !== q.rival) return false;
    if (!!pe.afastado !== (q.afastado ?? false)) return false;
    if (q.sexo && pe.sexo !== q.sexo) return false;
    if (q.comParceiro !== undefined && !!pe.parceiroNome !== q.comParceiro) return false;
    return true;
  });
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
    case 'estudo': return chave === 'enem' ? p.estudo.enem ?? 0 : p.estudo.nota;
    case 'habilidade': return p.habilidades?.[chave ?? ''] ?? 0;
    case 'fama': return p.fama ?? 0;
    case 'seguidores': return p.seguidores ?? 0;
    case 'negocio': return p.negocio?.saude ?? 0;
    case 'trabalho':
      if (!p.trabalho.emprego) return 0;
      return chave === 'salario' ? p.trabalho.emprego.salario : p.trabalho.emprego.desempenho;
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
  const est = p.estudo;
  if (q.etapa && !q.etapa.includes(est.etapa)) return false;
  if (q.rede && est.rede !== q.rede) return false;
  if (q.escolaridadeMin && ORDEM_ESCOLARIDADE.indexOf(est.escolaridade) < ORDEM_ESCOLARIDADE.indexOf(q.escolaridadeMin)) return false;
  if (q.formacao && !q.formacao.some((f) => est.formacoes.includes(f))) return false;
  if (q.empregado !== undefined && !!p.trabalho.emprego !== q.empregado) return false;
  if (q.aposentado !== undefined && p.trabalho.aposentadoria > 0 !== q.aposentado) return false;
  if (q.moradia && p.moradia !== q.moradia) return false;
  if (q.classe && !q.classe.includes(p.classe)) return false;
  if (q.pessoa && pessoasQueAtendem(vida, q.pessoa).length === 0) return false;
  if (q.semParceiro && vida.pessoas.some((x) => x.papel === 'parceiro' && x.vivo)) return false;
  if (q.anomalia !== undefined) {
    const bio = p.idadeBiologicaMeses;
    if (bio === undefined || (vida.relogio.idadeMeses - bio) / 12 < q.anomalia) return false;
  }
  if (q.ano && vida.relogio.ano % q.ano[0] !== q.ano[1]) return false;
  if (q.mes && vida.config.turno === 'dinamico' && !q.mes.includes(vida.relogio.mes ?? 1)) return false;
  if (q.ou && !q.ou.some((x) => atende(vida, x))) return false;
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
    } else if (raiz === 'habilidade' && chave) {
      p.habilidades[chave] = limitar((p.habilidades[chave] ?? 0) + d);
    } else if (raiz === 'fama') {
      p.fama = limitar(p.fama + d);
    } else if (raiz === 'negocio' && p.negocio) {
      p.negocio.saude = limitar(p.negocio.saude + d);
    } else if (raiz === 'estudo') {
      p.estudo.nota = limitar(p.estudo.nota + d);
    } else if (raiz === 'trabalho' && p.trabalho.emprego) {
      const e = p.trabalho.emprego;
      if (chave === 'salario') e.salario = Math.round(e.salario + d);
      else if (chave === 'demitir') { if (d > 0) p.trabalho.emprego = null; }
      else e.desempenho = limitar(e.desempenho + d);
    }
  }
}

export function lembrar(vida: Vida, id: string, texto: string, peso: number, vars?: Record<string, string>) {
  vida.memorias.push({
    id, texto, peso, ano: vida.relogio.ano, idadeMeses: vida.relogio.idadeMeses, ...(vars ? { vars } : {}),
  });
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
  for (const [k, v] of Object.entries(p.habilidades ?? {})) f[`hab.${k}`] = v;
  if (p.negocio) f['negocio'] = p.negocio.saude;
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
  forma: 'Forma', carisma: 'Carisma', desgaste: 'Cansaço', dinheiro: 'Dinheiro', negocio: 'Saúde do negócio',
};

export const NOME_HABILIDADE: Record<string, string> = {
  ingles: 'Inglês', informatica: 'Informática', programacao: 'Programação', design: 'Design', escrita: 'Escrita',
  vendas: 'Vendas', culinaria: 'Culinária', mecanica: 'Mecânica', enfermagem: 'Enfermagem (técnico)', concurso: 'Preparo para concurso',
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
    const nome = k.startsWith('hab.') ? NOME_HABILIDADE[k.slice(4)] ?? k.slice(4) : ROTULO[k] ?? k;
    partes.push(`${nome} ${r > 0 ? '+' : '−'}${Math.abs(r)}`);
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
/** Palavras que mudam de estado para estado. */
function REGIONAL(uf: string): Record<string, string> {
  return {
    gelinho: uf === 'RJ' ? 'sacolé' : uf === 'PE' || uf === 'BA' ? 'dindin' : 'geladinho',
    biscoito: uf === 'SP' || uf === 'RS' ? 'bolacha' : 'biscoito',
    mexerica: uf === 'RS' ? 'bergamota' : uf === 'SP' || uf === 'MG' ? 'mexerica' : 'tangerina',
  };
}

export function preencher(texto: string, vida: Vida, vars: Record<string, string>): string {
  const p = vida.personagem;
  const base: Record<string, string> = { nome: p.nome, cidade: p.cidade, estado: p.estado, ...REGIONAL(p.estado), ...vars };
  return texto.replace(/\{([^{}]+)\}/g, (inteiro, dentro: string) => {
    if (dentro.includes('|')) {
      const [m, f] = dentro.split('|');
      return (p.sexo === 'feminino' ? f : m) ?? '';
    }
    return base[dentro] ?? inteiro;
  });
}
