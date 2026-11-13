// O Diretor: dosa o ritmo da vida por trás, sem proibir nada. Inspirado no
// "diretor" de jogos que medem a tensão do jogador e alternam pico e respiro.
//
// - Cada golpe (morte, término, demissão...) sobe o medidor pelo peso que tem
//   PARA ESTA PESSOA (ver contexto.ts), até o teto.
// - Enquanto o medidor está alto, o mundo fica morno: o pesado fica raro e o leve
//   e bom ganha espaço. Ele desce aos poucos (meia-vida de meses).
// - Muito tempo calmo aumenta a chance de algo marcante.
// - O estado (luto, coração partido, abalado) dura meses, vai passando e não zera
//   na virada do ano. Os textos e a arte podem ler daqui.
// Nada disso aparece na tela nem limita o que o jogador faz no ano.

import { aplicar, lembrar } from './efeitos';
import { impacto, type TipoGolpe } from './contexto';
import type { EventoDef } from './eventos';
import type { Capitulo } from './capitulos';
import type { Pessoa, Vida } from './tipos';

export type Estado = 'luto' | 'coracao-partido' | 'abalado';

export interface EstadoDiretor {
  /** Medidor de intensidade, 0 a 100. */
  intensidade: number;
  /** Meses seguidos sem nenhum acontecimento médio ou pesado (vida morna demais). */
  mesesCalmos: number;
  estado?: { tipo: Estado; forca: number; desde: number; pessoa?: string };
  /** Golpes recentes (para textos e testes). */
  golpes?: { tipo: TipoGolpe; pts: number; idadeMeses: number; pessoa?: string }[];
  /** Capítulos já abertos (o último é o atual). */
  capitulos?: Capitulo[];
}

export const diretorDe = (vida: Vida): EstadoDiretor => (vida.diretor ??= { intensidade: 0, mesesCalmos: 0 });

const ESTADO_DO_GOLPE: Record<TipoGolpe, Estado> = {
  morte: 'luto', termino: 'coracao-partido', divorcio: 'coracao-partido', traicao: 'coracao-partido',
  briga: 'abalado', afastamento: 'abalado', demissao: 'abalado', reprovacao: 'abalado', mudanca: 'abalado', doenca: 'abalado',
};

/** Meia-vida do estado em meses: luto demora; coração partido de adolescente demora mais que de adulto. */
function meiaVida(tipo: Estado, idade: number): number {
  if (tipo === 'luto') return idade < 6 ? 8 : 12;
  if (tipo === 'coracao-partido') return idade < 18 ? 6 : idade < 30 ? 4 : 3;
  return 4;
}

/**
 * Registra um golpe: calcula o peso pelo contexto, sobe o medidor, define o estado
 * e mexe na felicidade na medida do peso. Devolve os pontos (0 a 100).
 */
export function registrarGolpe(vida: Vida, tipo: TipoGolpe, pe?: Pessoa): number {
  const d = diretorDe(vida);
  const pts = impacto(vida, tipo, pe);
  if (pts <= 0) return 0;
  d.intensidade = Math.min(100, d.intensidade + pts);
  d.mesesCalmos = 0;
  const novo = ESTADO_DO_GOLPE[tipo];
  if (!d.estado || pts >= d.estado.forca * 0.8) d.estado = { tipo: novo, forca: pts, desde: vida.relogio.idadeMeses, ...(pe ? { pessoa: pe.nome } : {}) };
  d.golpes = [...(d.golpes ?? []), { tipo, pts, idadeMeses: vida.relogio.idadeMeses, ...(pe ? { pessoa: pe.id } : {}) }].slice(-12);
  aplicar(vida, { 'atributos.felicidade': -Math.round(pts * 0.3), ...(pts >= 60 ? { 'personalidade.estabilidade': -2 } : {}) });
  return pts;
}

/** Lembrança com o peso certo (o que mais doeu é o que mais se lembra). */
export function lembrarGolpe(vida: Vida, id: string, texto: string, pts: number, vars?: Record<string, string>): void {
  lembrar(vida, id, texto, -Math.max(3, Math.round(pts / 3)), vars);
}

/** A cada passo do tempo: o medidor desce, o estado vai passando e pesa um pouco no humor. */
export function passoDiretor(vida: Vida, anos: number): void {
  const d = diretorDe(vida);
  const meses = anos * 12;
  const idade = vida.relogio.idadeMeses / 12;
  d.intensidade = Math.round(d.intensidade * 0.5 ** (meses / 6) * 10) / 10;
  d.mesesCalmos += meses;
  if (d.estado) {
    // Enquanto dói, a felicidade não sobe de volta tão fácil.
    aplicar(vida, { 'atributos.felicidade': -(d.estado.forca / 100) * 1.2 * meses });
    d.estado.forca = Math.round(d.estado.forca * 0.5 ** (meses / meiaVida(d.estado.tipo, idade)) * 10) / 10;
    if (d.estado.forca < 8) delete d.estado;
  }
}

// ---------- Como o Diretor pesa os eventos ----------

export type Gravidade = 'leve' | 'medio' | 'pesado';
export type Tom = 'bom' | 'ruim' | 'neutro';

function somaHumor(ef?: Record<string, number | string>): number {
  if (!ef) return 0;
  const n = (k: string) => { const v = ef[k]; return typeof v === 'number' ? v : 0; };
  return n('atributos.felicidade') + n('atributos.saude') * 1.2 + n('dinheiro') / 1000;
}

const cacheClasse = new Map<string, { gravidade: Gravidade; tom: Tom }>();

/** Classifica um evento pelo que ele faz (efeitos, memória, escolhas). */
export function classificar(e: EventoDef): { gravidade: Gravidade; tom: Tom } {
  const c = cacheClasse.get(e.id);
  if (c) return c;
  const partes = [e, ...(e.escolhas ?? []).flatMap((x) => [x, x.sucesso, x.falha])].filter(Boolean) as { efeitos?: Record<string, number | string>; memoria?: [string, number, string] }[];
  const valores = partes.map((x) => somaHumor(x.efeitos));
  const maior = Math.max(0, ...valores.map(Math.abs), ...partes.map((x) => Math.abs(x.memoria?.[1] ?? 0) * 0.7));
  const proprio = somaHumor(e.efeitos) + (e.memoria?.[1] ?? 0) * 0.3;
  const gravidade: Gravidade = maior >= 10 ? 'pesado' : maior >= 5 || e.escolhas ? 'medio' : 'leve';
  const tom: Tom = e.escolhas && !e.efeitos ? 'neutro' : proprio > 1 ? 'bom' : proprio < -1 ? 'ruim' : 'neutro';
  const r = { gravidade, tom };
  cacheClasse.set(e.id, r);
  return r;
}

/** Um evento aconteceu: se não foi leve, a vida não está morna (zera a fome). */
export function notarEvento(vida: Vida, e: EventoDef): void {
  if (classificar(e).gravidade !== 'leve') diretorDe(vida).mesesCalmos = 0;
}

/** O quanto calmo demais a vida está (0 a 1): sobe depois de um ano sem nada que importe. */
export function fome(vida: Vida): number {
  const d = vida.diretor;
  if (!d) return 0;
  return Math.max(0, Math.min(1, (d.mesesCalmos - 12) / 24));
}

/** Multiplicador do Diretor sobre o peso de um evento no sorteio. */
export function pesoDoDiretor(vida: Vida, e: EventoDef): number {
  const d = vida.diretor;
  if (!d) return 1;
  const { gravidade, tom } = classificar(e);
  const t = d.intensidade / 100;
  let m = 1;
  // Tempo morno: depois de um golpe, o pesado e ruim fica raro; o leve e bom ganha espaço.
  if (tom === 'ruim') m *= gravidade === 'pesado' ? 1 - 0.9 * t : gravidade === 'medio' ? 1 - 0.6 * t : 1 - 0.15 * t;
  // Empurrão pequeno no leve e bom (grande demais concentra o sorteio e repete linhas).
  else if (tom === 'bom' || gravidade === 'leve') m *= 1 + 0.2 * t;
  // Fome: vida calma demais puxa o que é marcante.
  const f = fome(vida);
  if (gravidade !== 'leve') m *= 1 + 1.0 * f;
  return m;
}

/** Multiplicador da chance de acontecer algo no período. */
export function chanceDoDiretor(vida: Vida): number {
  return 1 + 0.4 * fome(vida);
}
