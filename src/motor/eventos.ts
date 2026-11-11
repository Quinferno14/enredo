// Motor de eventos. Cada período sorteia alguns eventos entre os elegíveis,
// com peso pelo estado da vida. No máximo um pede decisão; ele fica pendente
// e o Avançar espera. Escolhas deixam memórias e ganchos que voltam depois.

import eventosJson from '../conteudo/eventos.json';
import {
  aplicar, atende, diferenca, foto, lembrar, motivo, multiplicador, preencher, resumo, sortearVars,
  valor, type Efeitos, type Quando,
} from './efeitos';
import { resolverSistema } from './carreira';
import { Rng } from './rng';
import type { Vida } from './tipos';

export interface ResultadoDef {
  resposta?: string | string[];
  efeitos?: Efeitos;
  /** [id, peso, texto que completa "lembrou de quando ..."] */
  memoria?: [string, number, string];
  gancho?: { evento: string; chance: number; em_anos: [number, number] };
  habito?: { acao: string; porSemana: number; imposto?: boolean };
}

export interface EscolhaDef extends ResultadoDef {
  texto: string;
  requer?: Quando;
  /** Chance de sucesso: base + soma de coef × valor. Sem isto, não há sorteio. */
  chance?: { base: number; x?: Record<string, number> };
  sucesso?: ResultadoDef;
  falha?: ResultadoDef;
}

export interface EventoDef extends ResultadoDef {
  id: string;
  quando?: Quando;
  peso?: { base?: number; x?: Record<string, number> };
  /** Acontece no máximo uma vez na vida. */
  unico?: boolean;
  /** Só acontece quando um gancho chama. */
  soGancho?: boolean;
  vars?: Record<string, string[]>;
  texto: string[];
  escolhas?: EscolhaDef[];
}

export const EVENTOS: readonly EventoDef[] = eventosJson as EventoDef[];
export const eventoPorId = (id: string) => EVENTOS.find((e) => e.id === id);

/** Anos em que um evento visto continua com peso baixo. */
const ANOS_RECENTE = 6;

export function pesoEvento(vida: Vida, e: EventoDef): number {
  if (e.soGancho) return 0;
  if (e.unico && vida.vistos[e.id] !== undefined) return 0;
  if (!atende(vida, e.quando)) return 0;
  let p = (e.peso?.base ?? 1) * multiplicador(vida, e.peso?.x);
  const visto = vida.vistos[e.id];
  if (visto !== undefined && vida.relogio.idadeMeses - visto < ANOS_RECENTE * 12) p *= 0.04;
  return p;
}

/**
 * Roda os eventos do período: primeiro os ganchos que venceram, depois o sorteio.
 * Altera `vida` no lugar e devolve as linhas para o feed.
 */
export function rodarEventos(vida: Vida, anos: number, rng: Rng): string[] {
  const linhas: string[] = [];
  const agora = vida.relogio.idadeMeses;

  const vencidos = vida.ganchos.filter((g) => g.idadeMeses <= agora);
  vida.ganchos = vida.ganchos.filter((g) => g.idadeMeses > agora);
  for (const g of vencidos) {
    const e = eventoPorId(g.evento);
    if (!e || !atende(vida, e.quando)) continue;
    if (e.escolhas && vida.pendente) {
      vida.ganchos.push({ ...g, idadeMeses: agora + 6 }); // espera a próxima vez
      continue;
    }
    if (disparar(vida, e, g.vars ?? {}, rng, linhas)) vida.ganchosCumpridos += 1;
  }

  const idade = agora / 12;
  const chance = (idade < 2 ? 0.25 : 0.6) * anos;
  const usados = new Set<string>();
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    if (rng.proximo() >= chance) continue;
    const candidatos = EVENTOS
      .filter((e) => !usados.has(e.id) && !(e.escolhas && vida.pendente))
      .map((e) => ({ e, p: pesoEvento(vida, e) }))
      .filter((c) => c.p > 0);
    const total = candidatos.reduce((s, c) => s + c.p, 0);
    if (total <= 0) break;
    let x = rng.proximo() * total;
    const escolhido = candidatos.find((c) => (x -= c.p) < 0)?.e ?? candidatos.at(-1)!.e;
    usados.add(escolhido.id);
    disparar(vida, escolhido, {}, rng, linhas);
  }
  return linhas;
}

/** Faz um evento acontecer. Devolve false se não deu (ex.: não há memória para lembrar). */
export function disparar(vida: Vida, e: EventoDef, varsGancho: Record<string, string>, rng: Rng, linhas: string[]): boolean {
  const vars = { ...sortearVars(rng, e.vars), ...varsDaMemoria(vida, e.quando), ...varsGancho };
  let texto = rng.escolher(e.texto);
  let efeitoExtra: Efeitos | undefined;

  if (texto.includes('{lembranca}')) {
    const antigas = vida.memorias.filter((m) => vida.relogio.idadeMeses - m.idadeMeses >= 15 * 12 && Math.abs(m.peso) >= 8);
    if (antigas.length === 0) return false;
    const m = rng.escolher(antigas);
    vars.lembranca = preencher(m.texto, vida, m.vars ?? {});
    efeitoExtra = { 'atributos.felicidade': m.peso > 0 ? 3 : -2 };
  }

  vida.vistos[e.id] = vida.relogio.idadeMeses;
  texto = preencher(texto, vida, vars);

  if (e.escolhas) {
    vida.pendente = {
      evento: e.id,
      texto,
      vars,
      escolhas: e.escolhas.map((c) => {
        const m = motivo(vida, c.requer);
        return { texto: preencher(c.texto, vida, vars), ...(m ? { motivo: m } : {}) };
      }),
    };
    return true;
  }

  const antes = foto(vida);
  aplicar(vida, efeitoExtra);
  const extra = aplicarResultado(vida, e, vars, rng);
  const r = resumo(diferenca(antes, foto(vida)));
  linhas.push([texto, extra, r].filter(Boolean).join(' '));
  return true;
}

/** Eventos que dependem de uma memória herdam os nomes guardados nela. */
function varsDaMemoria(vida: Vida, q: Quando | undefined): Record<string, string> {
  const ids = q?.memoria === undefined ? [] : Array.isArray(q.memoria) ? q.memoria : [q.memoria];
  const out: Record<string, string> = {};
  for (const id of ids) Object.assign(out, vida.memorias.find((m) => m.id === id)?.vars ?? {});
  return out;
}

/** Aplica efeitos, memória, gancho e hábito. Devolve a resposta em texto (ou ''). */
function aplicarResultado(vida: Vida, r: ResultadoDef | undefined, vars: Record<string, string>, rng: Rng): string {
  if (!r) return '';
  aplicar(vida, r.efeitos);
  if (r.memoria) {
    const [id, peso, texto] = r.memoria;
    lembrar(vida, id, preencher(texto, vida, vars), peso, vars);
  }
  if (r.gancho && rng.proximo() < r.gancho.chance) {
    const [a, b] = r.gancho.em_anos;
    vida.ganchos.push({
      evento: r.gancho.evento,
      idadeMeses: vida.relogio.idadeMeses + Math.max(1, Math.round((a + rng.proximo() * (b - a)) * 12)),
      vars,
    });
  }
  if (r.habito && !vida.habitos.some((h) => h.acao === r.habito!.acao)) {
    vida.habitos.push({
      acao: r.habito.acao, porSemana: r.habito.porSemana, ...(r.habito.imposto ? { imposto: true } : {}),
    });
  }
  const resp = Array.isArray(r.resposta) ? rng.escolher(r.resposta) : r.resposta;
  return resp ? preencher(resp, vida, vars) : '';
}

export function chanceEscolha(vida: Vida, c: EscolhaDef): number | null {
  if (!c.chance) return null;
  let p = c.chance.base;
  for (const [k, coef] of Object.entries(c.chance.x ?? {})) p += coef * valor(vida, k);
  return Math.max(0.03, Math.min(0.97, p));
}

/** Resolve o evento pendente com a escolha `indice`. */
export function escolher(vida: Vida, indice: number): Vida {
  const pend = vida.pendente;
  if (!pend) return vida;
  if (pend.sistema) {
    if (pend.escolhas[indice]?.motivo) return vida;
    const prox = structuredClone(vida);
    const rng = new Rng(prox.rng);
    const quando = prox.historico.at(-1)?.quando ?? '';
    const antes = foto(prox);
    const texto = resolverSistema(prox, pend, indice, rng);
    const r = resumo(diferenca(antes, foto(prox)));
    prox.historico.push({ quando, texto: pend.texto });
    prox.historico.push({ quando, texto: [`→ ${pend.escolhas[indice]?.texto ?? ''}.`, texto, r].filter(Boolean).join(' ') });
    prox.pendente = null;
    prox.rng = rng.estado();
    return prox;
  }
  const e = eventoPorId(pend.evento);
  const c = e?.escolhas?.[indice];
  if (!e || !c || !atende(vida, c.requer)) return vida;

  const prox = structuredClone(vida);
  const rng = new Rng(prox.rng);
  const quando = prox.historico.at(-1)?.quando ?? '';
  const antes = foto(prox);
  const partes: string[] = [];

  partes.push(aplicarResultado(prox, c, pend.vars, rng));
  const p = chanceEscolha(prox, c);
  if (p !== null) partes.push(aplicarResultado(prox, rng.proximo() < p ? c.sucesso : c.falha, pend.vars, rng));

  const r = resumo(diferenca(antes, foto(prox)));
  prox.historico.push({ quando, texto: pend.texto });
  prox.historico.push({
    quando,
    texto: [`→ ${preencher(c.texto, prox, pend.vars)}.`, ...partes, r].filter(Boolean).join(' '),
  });
  prox.pendente = null;
  prox.rng = rng.estado();
  return prox;
}
