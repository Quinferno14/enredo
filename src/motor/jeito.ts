// R4: a personalidade com peso. Cada escolha de evento tem um "jeito" (para que
// lado da personalidade ela puxa); quando combina com você, dá mais certo, e quando
// vai contra, dá menos e ainda cansa. Nas ações, o jeito muda quanto cada uma rende.
// O jogo sempre diz quando a personalidade pesou.

import { preencher } from './efeitos';
import { EIXOS, type Eixo, type Vida } from './tipos';

/** Adjetivo de cada lado do eixo, com {o|a} para o gênero de quem joga. */
export const POLOS: Record<Eixo, [string, string]> = {
  extroversao: ['reservad{o|a}', 'extrovertid{o|a}'],
  empatia: ['fri{o|a}', 'empátic{o|a}'],
  disciplina: ['desleixad{o|a}', 'disciplinad{o|a}'],
  impulsividade: ['cautelos{o|a}', 'impulsiv{o|a}'],
  ambicao: ['acomodad{o|a}', 'ambicios{o|a}'],
  moralidade: ['sem escrúpulos', 'íntegr{o|a}'],
  estabilidade: ['ansios{o|a}', 'tranquil{o|a}'],
  curiosidade: ['conservador{|a}', 'curios{o|a}'],
};

export const adjetivo = (vida: Vida, e: Eixo, positivo: boolean) => preencher(POLOS[e][positivo ? 1 : 0], vida, {});

export type Perfil = Partial<Record<Eixo, number>>;

interface ComEfeitos { efeitos?: Record<string, number | string>; perfil?: Perfil; sucesso?: { efeitos?: Record<string, number | string> } }

/**
 * O jeito de uma escolha. Vem de `perfil`, se o conteúdo disser; senão, do que
 * a escolha mexe na personalidade (quem provoca fica mais impulsivo, logo provocar
 * é coisa de impulsivo).
 */
export function perfilEscolha(c: ComEfeitos): Perfil {
  if (c.perfil) return c.perfil;
  const out: Perfil = {};
  for (const efeitos of [c.efeitos, c.sucesso?.efeitos]) {
    for (const [k, v] of Object.entries(efeitos ?? {})) {
      if (!k.startsWith('personalidade.') || typeof v !== 'number' || v === 0) continue;
      const e = k.slice(14) as Eixo;
      if (!EIXOS.includes(e)) continue;
      out[e] = Math.sign((out[e] ?? 0) + Math.sign(v));
    }
  }
  return out;
}

export interface Afinidade {
  /** −100 (contra tudo o que você é) a 100 (a sua cara). */
  valor: number;
  /** Eixo que mais pesou, e se você está do lado positivo dele. */
  eixo?: Eixo;
  positivo?: boolean;
}

export function afinidade(vida: Vida, perfil: Perfil): Afinidade {
  const eixos = Object.entries(perfil).filter(([, s]) => s) as [Eixo, number][];
  if (!eixos.length) return { valor: 0 };
  const pers = vida.personagem.personalidade;
  const parcelas = eixos.map(([e, s]) => ({ e, v: s * pers[e] }));
  const valor = parcelas.reduce((t, x) => t + x.v, 0) / parcelas.length;
  // O eixo que explica: o que mais puxou para o lado do resultado.
  const chave = valor >= 0 ? parcelas.reduce((a, b) => (b.v > a.v ? b : a)) : parcelas.reduce((a, b) => (b.v < a.v ? b : a));
  return { valor, eixo: chave.e, positivo: pers[chave.e] >= 0 };
}

/** A partir daqui a escolha é "seu jeito" ou "contra o seu jeito". */
export const LIMIAR_JEITO = 30;

export function rotuloJeito(vida: Vida, a: Afinidade): { jeito: 'a favor' | 'contra'; texto: string; adj: string } | null {
  if (!a.eixo || Math.abs(a.valor) < LIMIAR_JEITO) return null;
  const adj = adjetivo(vida, a.eixo, a.positivo!);
  return a.valor > 0
    ? { jeito: 'a favor', texto: `combina com você: ${adj}`, adj }
    : { jeito: 'contra', texto: `vai contra você: ${adj}`, adj };
}

/** Pontos a mais (ou a menos) na chance de dar certo: até 25. */
export const bonusChance = (a: Afinidade) => a.valor * 0.0025;

// ---- Ações ----

const SOZINHO = new Set(['ler', 'desenhar', 'videogame', 'meditar', 'musica']);

/** Quanto uma ação rende a mais pelo jeito de quem faz, e a nota para o resultado. */
export function pesoDoJeito(vida: Vida, a: { id: string; categoria: string; comQuem?: boolean }, acompanhado: boolean): { mult: number; nota: string } {
  const p = vida.personagem.personalidade;
  let eixo: Eixo | null = null;
  let d = 0;
  if (a.categoria === 'social' || (a.comQuem && acompanhado)) { eixo = 'extroversao'; d = p.extroversao / 250; }
  else if (SOZINHO.has(a.id)) { eixo = 'extroversao'; d = -p.extroversao / 350; }
  else if (a.categoria === 'corpo') { eixo = 'disciplina'; d = p.disciplina / 300; }
  else if (a.id === 'curso' || a.id === 'estudar_sozinho') { eixo = 'curiosidade'; d = p.curiosidade / 300; }
  else if (a.categoria === 'estudo' || a.id === 'estudar_concurso') { eixo = 'disciplina'; d = (p.disciplina + p.curiosidade / 2) / 400; }
  if (!eixo || Math.abs(d) < 0.12) return { mult: 1 + d, nota: '' };
  const adj = adjetivo(vida, eixo, p[eixo] >= 0);
  return { mult: 1 + d, nota: d > 0 ? `rendeu mais: você é ${adj}` : `rendeu menos: você é ${adj}` };
}
