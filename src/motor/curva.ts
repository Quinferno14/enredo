/** Rendimento acumulado de n sessões por ano: a 1ª vale 1, depois achata. */
export const curva = (n: number) => Math.log2(1 + Math.max(0, n));
