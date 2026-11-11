// Relógio e rótulos de tempo. No modo dinâmico o jogo anda mês a mês por dentro
// e para na próxima novidade; os modos ano e semestre ficam para testes e saves antigos.

import type { Relogio, Turno, Vida } from './tipos';

export const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

/** Tamanho, em anos, de um passo do relógio. */
export function anosDoPasso(turno: Turno): number {
  return turno === 'ano' ? 1 : turno === 'semestre' ? 0.5 : 1 / 12;
}

/**
 * Janela, em anos, em que as ações à mão contam para o retorno que cai.
 * No modo dinâmico é o ano do calendário.
 */
export function anosDaJanela(turno: Turno): number {
  return turno === 'semestre' ? 0.5 : 1;
}

export function rotuloPeriodo(r: Relogio, turno: Turno): string {
  if (turno === 'ano') return `${r.ano}`;
  if (turno === 'semestre') return `${r.ano} · ${r.semestre}º semestre`;
  return `${MESES[(r.mes ?? 1) - 1]} de ${r.ano}`;
}

/** Rótulo do período em que a vida está agora (para ações, decisões e Modo Deus). */
export function quandoAgora(vida: Vida): string {
  return rotuloPeriodo(vida.relogio, vida.config.turno);
}

/** Relógio depois de um passo, sem rodar nada. */
export function proximoRelogio(r: Relogio, turno: Turno): Relogio {
  const prox: Relogio = { ...r, idadeMeses: r.idadeMeses + anosDoPasso(turno) * 12 };
  if (turno === 'ano') prox.ano += 1;
  else if (turno === 'semestre') {
    if (r.semestre === 1) prox.semestre = 2;
    else { prox.semestre = 1; prox.ano += 1; }
  } else {
    const mes = (r.mes ?? 1) + 1;
    if (mes > 12) { prox.mes = 1; prox.ano += 1; } else prox.mes = mes;
  }
  return prox;
}
