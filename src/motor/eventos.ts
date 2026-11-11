// Motor de eventos. Cada período sorteia alguns eventos entre os elegíveis,
// com peso pelo estado da vida. No máximo um pede decisão; ele fica pendente
// e o Avançar espera. Escolhas deixam memórias e ganchos que voltam depois.

import eventosJson from '../conteudo/eventos.json';
import {
  aplicar, atende, diferenca, foto, lembrar, motivo, multiplicador, pessoasQueAtendem, preencher, resumo, sortearVars,
  valor, type Efeitos, type Quando,
} from './efeitos';
import { resolverSistema } from './carreira';
import { capitalizar, papelTexto, resolverPretendente, terminar } from './familia';
import { quandoAgora } from './tempo';
import { Rng } from './rng';
import type { Pendente, Vida } from './tipos';

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
  /** Datas que se repetem (Copa, Réveillon): sem a perda de peso por ter acontecido há pouco. */
  recorrente?: boolean;
  /** Só acontece quando um gancho chama. */
  soGancho?: boolean;
  /**
   * Data do calendário (Natal, almoço de domingo): fora do sorteio comum, com esta
   * chance a cada mês que bate com `quando.mes`. Não repete em menos de 10 meses.
   */
  calendario?: number;
  vars?: Record<string, string[]>;
  texto: string[];
  escolhas?: EscolhaDef[];
}

export const EVENTOS: readonly EventoDef[] = eventosJson as EventoDef[];
export const eventoPorId = (id: string) => EVENTOS.find((e) => e.id === id);

/** Anos em que um evento visto continua com peso baixo. */
const ANOS_RECENTE = 6;

export function pesoEvento(vida: Vida, e: EventoDef): number {
  if (e.soGancho || e.calendario) return 0;
  if (e.unico && vida.vistos[e.id] !== undefined) return 0;
  if (!atende(vida, e.quando)) return 0;
  let p = (e.peso?.base ?? 1) * multiplicador(vida, e.peso?.x);
  const visto = vida.vistos[e.id];
  if (visto !== undefined && !e.recorrente && vida.relogio.idadeMeses - visto < ANOS_RECENTE * 12) p *= 0.04;
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

  // Datas do calendário: no máximo uma por passo.
  const dinamico = vida.config.turno === 'dinamico';
  const datas = EVENTOS.filter((e) => {
    if (!e.calendario || (e.escolhas && vida.pendente)) return false;
    if (e.unico && vida.vistos[e.id] !== undefined) return false;
    const visto = vida.vistos[e.id];
    if (visto !== undefined && agora - visto < 10) return false;
    if (!atende(vida, e.quando)) return false;
    return rng.proximo() < Math.min(1, e.calendario * (dinamico ? 1 : anos * 2));
  });
  if (datas.length) disparar(vida, rng.escolher(datas), {}, rng, linhas);

  const idade = agora / 12;
  // Na velhice o mundo encolhe, então cada coisa que acontece pesa mais: um pouco mais de eventos.
  const chance = (idade < 2 ? 0.25 : idade >= 60 ? 0.7 : 0.6) * anos;
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
  const vars: Record<string, string> = { ...sortearVars(rng, e.vars), ...varsDaMemoria(vida, e.quando), ...varsGancho };
  // Evento com uma pessoa: a do gancho, se ainda serve, ou uma sorteada entre as que servem.
  if (e.quando?.pessoa) {
    const servem = pessoasQueAtendem(vida, e.quando.pessoa);
    const pe = servem.find((x) => x.id === varsGancho.pessoaId) ?? (varsGancho.pessoaId ? undefined : servem.length ? rng.escolher(servem) : undefined);
    if (!pe) return false;
    const f = pe.sexo === 'feminino';
    Object.assign(vars, {
      pessoaId: pe.id, pessoa: pe.nome, papel: papelTexto(pe), Papel: capitalizar(papelTexto(pe)),
      pa: f ? 'a' : 'o', pele: f ? 'ela' : 'ele', pdo: f ? 'da' : 'do', pparceiro: pe.parceiroNome ?? '',
    });
  }
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
  const deVida: Efeitos = {};
  let fim = '';
  for (const [k, v] of Object.entries(r.efeitos ?? {})) {
    if (!k.startsWith('pessoa.')) {
      // Prejuízo da casa (seca, apagão, enchente) é dos pais enquanto você é menor.
      const perda = k === 'dinheiro' && (typeof v === 'number' ? v < 0 : v.startsWith('-'));
      if (perda && vida.relogio.idadeMeses < 16 * 12) continue;
      deVida[k] = v;
      continue;
    }
    const pe = vida.pessoas.find((x) => x.id === vars.pessoaId);
    if (!pe) continue;
    const campo = k.slice(7);
    if (campo === 'terminar') { if (pe.papel === 'parceiro') fim = terminar(vida, pe); continue; }
    if (campo === 'renda') { pe.renda = Math.max(0, Math.round(typeof v === 'string' ? pe.renda * (1 + Number(v.slice(0, -1)) / 100) : pe.renda + v)); continue; }
    if (campo === 'afeto' || campo === 'saude') pe[campo] = Math.max(0, Math.min(100, Math.round(pe[campo] + Number(v))));
    if (campo === 'rival') { if (Number(v)) pe.rival = true; else delete pe.rival; }
    if (campo === 'afastado') { if (Number(v)) pe.afastado = true; else delete pe.afastado; }
    if (campo === 'socio' && vida.personagem.negocio?.socio === pe.id) delete vida.personagem.negocio.socio;
  }
  aplicar(vida, deVida);
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
  return [resp ? preencher(resp, vida, vars) : '', fim].filter(Boolean).join(' ');
}

export function chanceEscolha(vida: Vida, c: EscolhaDef): number | null {
  if (!c.chance) return null;
  let p = c.chance.base;
  for (const [k, coef] of Object.entries(c.chance.x ?? {})) p += coef * valor(vida, k);
  return Math.max(0.03, Math.min(0.97, p));
}

function resolverHabito18(vida: Vida, pend: Pendente, indice: number): string {
  const acao = pend.dados?.[0] ?? '';
  const h = vida.habitos.find((x) => x.acao === acao);
  if (!h) return '';
  if (indice === 0) {
    delete h.imposto;
    return 'Agora é escolha sua.';
  }
  vida.habitos = vida.habitos.filter((x) => x.acao !== acao);
  return 'Você largou. Seus pais torceram o nariz, mas a decisão é sua.';
}

/** Resolve o evento pendente com a escolha `indice`. */
export function escolher(vida: Vida, indice: number): Vida {
  const pend = vida.pendente;
  if (!pend) return vida;
  if (pend.sistema) {
    if (pend.escolhas[indice]?.motivo) return vida;
    const prox = structuredClone(vida);
    const rng = new Rng(prox.rng);
    const quando = quandoAgora(prox);
    const antes = foto(prox);
    const texto = pend.sistema === 'pretendentes' ? resolverPretendente(prox, pend, indice, rng)
      : pend.sistema === 'habito18' ? resolverHabito18(prox, pend, indice)
      : resolverSistema(prox, pend, indice, rng);
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
  const quando = quandoAgora(prox);
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
