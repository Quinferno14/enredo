// Gerador de números aleatórios com seed (sfc32).
// A mesma seed sempre gera a mesma sequência, e o estado do gerador é salvo
// junto com a vida, então recarregar o jogo continua a mesma sequência.

export type EstadoRng = [number, number, number, number];

/** Transforma um texto (a seed) em 128 bits de estado inicial (cyrb128). */
export function estadoDaSeed(seed: string): EstadoRng {
  let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
  for (let i = 0; i < seed.length; i++) {
    const k = seed.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4;
  h2 ^= h1;
  h3 ^= h1;
  h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

export class Rng {
  private s: EstadoRng;

  constructor(estado: EstadoRng) {
    this.s = [...estado];
  }

  static daSeed(seed: string): Rng {
    return new Rng(estadoDaSeed(seed));
  }

  /** Número em [0, 1). */
  proximo(): number {
    let [a, b, c, d] = this.s;
    const t0 = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    const t = (t0 + d) | 0;
    c = (c + t) | 0;
    this.s = [a >>> 0, b >>> 0, c >>> 0, d >>> 0];
    return (t >>> 0) / 4294967296;
  }

  /** Inteiro entre min e max, inclusive. */
  inteiro(min: number, max: number): number {
    return min + Math.floor(this.proximo() * (max - min + 1));
  }

  /** Valor perto do centro com mais frequência (soma de 3 sorteios). */
  normalAprox(min: number, max: number): number {
    const media = (this.proximo() + this.proximo() + this.proximo()) / 3;
    return Math.round(min + media * (max - min));
  }

  escolher<T>(lista: readonly T[]): T {
    if (lista.length === 0) throw new Error('Lista vazia');
    return lista[this.inteiro(0, lista.length - 1)] as T;
  }

  estado(): EstadoRng {
    return [...this.s];
  }
}
