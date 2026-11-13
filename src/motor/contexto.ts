// Contexto da vida: o que cada coisa significa para ESTA pessoa, NESTE momento.
// O Diretor, os textos, as escolhas, as pessoas e a arte leem daqui em vez de
// cada um ter a sua regra solta.
//
// - Vínculo real, não sangue: afeto, convívio, história, brigas, afastamento.
// - Dependência pela fase da vida: criança pequena depende de quem cuida dela.
// - Peso por tipo de golpe e por idade: um término aos 15 dói mais que aos 30.
// - Apoio: quem tem gente perto sente menos; quem está sozinho, mais.

import type { Pessoa, Vida } from './tipos';

export type TipoGolpe =
  | 'morte' | 'termino' | 'divorcio' | 'traicao' | 'briga' | 'afastamento'
  | 'demissao' | 'reprovacao' | 'mudanca' | 'doenca';

const limitar01 = (x: number) => Math.max(0, Math.min(1, x));
const idadeJogador = (vida: Vida) => vida.relogio.idadeMeses / 12;

/**
 * Vínculo real com alguém (0 a 1): afeto, convívio e história. Sangue não entra
 * aqui; um pai sumido e brigado tem vínculo baixo.
 */
export function vinculo(vida: Vida, pe: Pessoa): number {
  let v = pe.afeto / 100;
  const idade = idadeJogador(vida);
  const mesmaCasa = pe.moraJunto
    || (vida.personagem.moradia === 'pais' && idade < 25 && (pe.papel === 'mae' || pe.papel === 'pai' || pe.papel === 'irmao') && !pe.afastado && !pe.longe);
  if (mesmaCasa) v += 0.12;
  v += Math.min(0.1, (pe.lembrancas?.length ?? 0) * 0.02);
  if (pe.relacao === 'casamento') v += 0.15;
  else if (pe.relacao === 'namoro') v += 0.08;
  if (pe.rival) v -= 0.3;
  if (pe.afastado) v *= 0.4;
  if (pe.longe) v *= 0.85;
  return limitar01(v);
}

/** Quem cuida de você: pais vivos e presentes, ou quem mora com você enquanto é menor. */
export function cuidaDeVoce(vida: Vida, pe: Pessoa): boolean {
  if (pe.afastado) return false;
  if (pe.papel === 'mae' || pe.papel === 'pai') return true;
  // Avós (ou outro adulto) que moram com a criança, ou que ficaram no lugar dos pais.
  const paisPresentes = vida.pessoas.some((x) => (x.papel === 'mae' || x.papel === 'pai') && x.vivo && !x.afastado && x.id !== pe.id);
  return (pe.moraJunto === true || (!paisPresentes && pe.papel === 'avo')) && pe.idadeMeses >= 18 * 12;
}

/**
 * Dependência (0 a 1): quanto a sua vida depende dessa pessoa pela fase em que
 * você está. Até uns 3 anos, perder quem cuida de você é enorme mesmo sem afeto
 * formado; adulto independente, quase nada; na velhice, o parceiro de uma vida.
 */
export function dependencia(vida: Vida, pe: Pessoa): number {
  const idade = idadeJogador(vida);
  if (cuidaDeVoce(vida, pe)) {
    if (idade < 3) return 1;
    if (idade < 12) return 0.85;
    if (idade < 18) return 0.65;
    if (idade < 22 && vida.personagem.moradia === 'pais') return 0.3;
    return 0;
  }
  if (pe.papel === 'parceiro' && idade >= 60) return 0.5;
  return 0;
}

/** Empurrão pequeno do papel (nunca a base). Filho é a exceção: perder um filho pesa sempre. */
function empurraoPapel(pe: Pessoa): number {
  if (pe.papel === 'filho') return 0.25;
  if (pe.papel === 'mae' || pe.papel === 'pai' || pe.papel === 'parceiro') return 0.08;
  if (pe.papel === 'irmao' || pe.papel === 'avo' || pe.papel === 'neto') return 0.04;
  return 0;
}

/** Quanto essa pessoa importa para você agora (0 a 1). */
export function importancia(vida: Vida, pe: Pessoa): number {
  return limitar01(Math.max(vinculo(vida, pe), dependencia(vida, pe)) + empurraoPapel(pe));
}

/** Peso base de cada golpe (0 a 100), antes da pessoa e da idade. */
const BASE: Record<TipoGolpe, number> = {
  morte: 100, divorcio: 70, traicao: 60, termino: 55, doenca: 60, demissao: 50,
  reprovacao: 35, mudanca: 30, briga: 25, afastamento: 20,
};

/** Curva por idade: a mesma coisa dói diferente em cada fase. */
export function curvaIdade(tipo: TipoGolpe, idade: number): number {
  switch (tipo) {
    case 'termino':
    case 'traicao':
      return idade < 12 ? 0.4 : idade < 18 ? 1.4 : idade < 26 ? 1.1 : idade < 50 ? 0.85 : 0.75;
    case 'briga':
    case 'afastamento':
      return idade < 12 ? 0.9 : idade < 21 ? 1.25 : 0.85;
    case 'reprovacao':
      return idade < 10 ? 0.6 : idade < 19 ? 1.1 : 0.8;
    case 'demissao':
      return idade < 22 ? 0.6 : idade < 58 ? 1.15 : 0.7;
    case 'mudanca':
      return idade < 9 ? 0.8 : idade < 18 ? 1.25 : idade < 65 ? 0.6 : 1.1;
    case 'divorcio':
      return idade < 30 ? 0.9 : 1;
    default:
      return 1;
  }
}

/** Gente com vínculo forte por perto amortece; estar sozinho pesa mais. */
export function apoio(vida: Vida, excluir?: string): number {
  const fortes = vida.pessoas.filter((x) => x.vivo && x.id !== excluir && vinculo(vida, x) >= 0.6).length;
  return fortes >= 3 ? 0.88 : fortes >= 1 ? 0.94 : 1.15;
}

/** Contexto material do golpe (ex.: perder o emprego com filhos ou dívidas). */
function agravante(vida: Vida, tipo: TipoGolpe): number {
  const p = vida.personagem;
  if (tipo === 'demissao') {
    const filhos = vida.pessoas.filter((x) => x.papel === 'filho' && x.vivo && x.idadeMeses < 18 * 12).length;
    return 1 + Math.min(0.4, filhos * 0.15) + (p.dividas.length ? 0.15 : 0) + (p.dinheiro < 2000 ? 0.15 : 0);
  }
  return 1;
}

/** Quanto um golpe pesa para você agora (0 a 100). */
export function impacto(vida: Vida, tipo: TipoGolpe, pe?: Pessoa): number {
  const idade = idadeJogador(vida);
  const quem = pe ? importancia(vida, pe) : 1;
  const pts = BASE[tipo] * quem * curvaIdade(tipo, idade) * apoio(vida, pe?.id) * agravante(vida, tipo);
  return Math.round(Math.max(0, Math.min(100, pts)));
}
