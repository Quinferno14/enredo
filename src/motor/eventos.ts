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
import { afinidade, bonusChance, perfilEscolha, rotuloJeito, type Perfil } from './jeito';
import { chanceDoDiretor, notarEvento, pesoDoDiretor } from './diretor';
import { resolverObjetivo } from './objetivos';
import { sincronizarBichos } from './bichos';
import type { Linha, Pendente, Vida } from './tipos';

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
  /** Jeito da escolha (para que lado da personalidade puxa). Sem isto, sai dos efeitos. */
  perfil?: Perfil;
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
  /** Textos por fase da vida: o primeiro que bate com a idade substitui `texto`. */
  textos?: { idade: [number, number]; texto: string[] }[];
  /** Arco de que o evento faz parte (história em partes ao longo de anos). */
  arco?: string;
  escolhas?: EscolhaDef[];
}

export const EVENTOS: readonly EventoDef[] = eventosJson as EventoDef[];
export const eventoPorId = (id: string) => EVENTOS.find((e) => e.id === id);

/** Anos em que um evento visto continua com peso baixo. */
const ANOS_RECENTE = 10;

export function pesoEvento(vida: Vida, e: EventoDef): number {
  if (e.soGancho || e.calendario) return 0;
  if (e.unico && vida.vistos[e.id] !== undefined) return 0;
  if (!atende(vida, e.quando)) return 0;
  let p = (e.peso?.base ?? 1) * multiplicador(vida, e.peso?.x);
  const visto = vida.vistos[e.id];
  if (visto !== undefined && !e.recorrente && vida.relogio.idadeMeses - visto < ANOS_RECENTE * 12) p *= 0.04;
  // O que se repete (pelada, grupo da família) também cansa: menos peso nos dois anos seguintes.
  if (visto !== undefined && e.recorrente && vida.relogio.idadeMeses - visto < 24) p *= 0.4;
  // Tudo o que já aconteceu fica um pouco mais raro a cada vez.
  p /= 1 + 0.4 * (vida.vezes?.[e.id] ?? 0);
  // O Diretor dosa: tempo morno depois de um golpe, fome depois de muita calma.
  return p * pesoDoDiretor(vida, e);
}

/**
 * Roda os eventos do período: primeiro os ganchos que venceram, depois o sorteio.
 * Altera `vida` no lugar e devolve as linhas para o feed.
 */
export function rodarEventos(vida: Vida, anos: number, rng: Rng): Linha[] {
  const linhas: Linha[] = [];
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
    // Cada vez que a data já aconteceu, a próxima fica um pouco menos provável.
    const cansa = 1 + 0.25 * (vida.vezes?.[e.id] ?? 0);
    return rng.proximo() < Math.min(1, (e.calendario * (dinamico ? 1 : anos)) / cansa);
  });
  if (datas.length) disparar(vida, rng.escolher(datas), {}, rng, linhas);

  const idade = agora / 12;
  // Na velhice o mundo encolhe, então cada coisa que acontece pesa mais: um pouco mais de eventos.
  const chance = (idade < 2 ? 0.25 : idade >= 60 ? 0.7 : 0.6) * anos * chanceDoDiretor(vida);
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
export function disparar(vida: Vida, e: EventoDef, varsGancho: Record<string, string>, rng: Rng, linhas: Linha[]): boolean {
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
  // Texto da fase da vida, sem repetir o da última vez.
  const idadeJ = vida.relogio.idadeMeses / 12;
  const lista = e.textos?.find((t) => idadeJ >= t.idade[0] && idadeJ <= t.idade[1])?.texto ?? e.texto;
  const ultimo = vida.ultimosTextos?.[e.id];
  // "Pela primeira vez" só é verdade uma vez na vida.
  const ja = (vida.vezes?.[e.id] ?? 0) > 0;
  const semPrimeira = ja ? lista.filter((t) => !/primeira vez/i.test(t)) : lista;
  if (!semPrimeira.length) return false;
  const opcoes = semPrimeira.length > 1 ? semPrimeira.filter((t) => t !== ultimo) : semPrimeira;
  let texto = rng.escolher(opcoes);
  vida.ultimosTextos = { ...vida.ultimosTextos, [e.id]: texto };
  let efeitoExtra: Efeitos | undefined;

  if (texto.includes('{lembranca}')) {
    const antigas = vida.memorias.filter((m) => vida.relogio.idadeMeses - m.idadeMeses >= 15 * 12 && Math.abs(m.peso) >= 8);
    if (antigas.length === 0) return false;
    const m = rng.escolher(antigas);
    vars.lembranca = preencher(m.texto, vida, m.vars ?? {});
    efeitoExtra = { 'atributos.felicidade': m.peso > 0 ? 3 : -2 };
  }

  vida.vistos[e.id] = vida.relogio.idadeMeses;
  notarEvento(vida, e);
  vida.vezes = { ...vida.vezes, [e.id]: (vida.vezes?.[e.id] ?? 0) + 1 };
  texto = preencher(texto, vida, vars);

  if (e.escolhas) {
    vida.pendente = {
      evento: e.id,
      texto,
      vars,
      escolhas: e.escolhas.map((c) => {
        const m = motivo(vida, c.requer);
        const j = rotuloJeito(vida, afinidade(vida, perfilEscolha(c)));
        // Criança não paga: o preço some do botão.
        const rotulo = preencher(c.texto, vida, vars);
        return {
          texto: vida.relogio.idadeMeses < 16 * 12 ? rotulo.replace(/\s*\(R\$ [\d.]+\)/, '') : rotulo, ...(m ? { motivo: m } : {}),
          ...(j && !m ? { jeito: j.jeito, jeitoTexto: j.texto } : {}),
        };
      }),
    };
    return true;
  }

  const antes = foto(vida);
  aplicar(vida, efeitoExtra);
  const extra = aplicarResultado(vida, e, vars, rng);
  const r = resumo(diferenca(antes, foto(vida)));
  linhas.push({ texto: [texto, extra, r].filter(Boolean).join(' '), fato: { tipo: 'evento', id: e.id, ...(vars.pessoaId ? { pessoa: vars.pessoaId } : {}) } });
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
  // O jeito pesa: o que combina com você dá mais certo.
  p += bonusChance(afinidade(vida, perfilEscolha(c)));
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
  const r = escolherSemBicho(vida, indice);
  if (r !== vida) sincronizarBichos(r);
  return r;
}

function escolherSemBicho(vida: Vida, indice: number): Vida {
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
      : pend.sistema === 'objetivo' ? resolverObjetivo(prox, pend, indice)
      : resolverSistema(prox, pend, indice, rng);
    const r = resumo(diferenca(antes, foto(prox)));
    prox.historico.push({ quando, texto: pend.texto, fato: { tipo: 'evento', id: pend.evento } });
    const rotulo = (pend.escolhas[indice]?.texto ?? '').split(' · ')[0]!;
    const feito = pend.sistema === 'pretendentes' && indice < (pend.candidatos?.length ?? 0) ? `Tentar com ${rotulo.split(',')[0]}`
      : pend.sistema === 'vagas' && indice < (pend.dados?.length ?? 0) - 1 ? `Candidatar-se a ${rotulo.replace(/^./, (c) => c.toLowerCase())}`
      : rotulo;
    prox.historico.push({ quando, texto: [`→ ${feito}.`, texto, r].filter(Boolean).join(' '), fato: { tipo: 'escolha', id: pend.evento } });
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

  // O jeito é medido antes da escolha mexer na personalidade.
  const af = afinidade(vida, perfilEscolha(c));
  const jeito = rotuloJeito(vida, af);
  partes.push(aplicarResultado(prox, c, pend.vars, rng));
  const p = chanceEscolha(vida, c);
  if (p !== null) partes.push(aplicarResultado(prox, rng.proximo() < p ? c.sucesso : c.falha, pend.vars, rng));
  if (jeito) {
    if (jeito.jeito === 'contra') aplicar(prox, { desgaste: 4, 'atributos.felicidade': -1.5 });
    else if (p === null) aplicar(prox, { 'atributos.felicidade': 1 });
    partes.push(jeito.jeito === 'contra'
      ? `(Isso foi contra quem você é: ${jeito.adj}.)`
      : `(Isso combina com você, que é ${jeito.adj}${p !== null ? ', e ajudou' : ''}.)`);
  }

  const r = resumo(diferenca(antes, foto(prox)));
  const pessoa = pend.vars.pessoaId;
  prox.historico.push({ quando, texto: pend.texto, fato: { tipo: 'evento', id: e.id, ...(pessoa ? { pessoa } : {}) } });
  prox.historico.push({
    quando,
    texto: [`→ ${preencher(c.texto, prox, pend.vars)}.`, ...partes, r].filter(Boolean).join(' '),
    fato: { tipo: 'escolha', id: e.id, ...(pessoa ? { pessoa } : {}) },
  });
  prox.pendente = null;
  prox.rng = rng.estado();
  return prox;
}
