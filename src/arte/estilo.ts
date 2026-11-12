// Motor de arte · regras do estilo. Tudo o que o jogo desenha passa por aqui, para
// os desenhos conversarem entre si: uma perspectiva só (palco frontal com linha de
// chão), luz vinda da esquerda, sombra no chão de tudo o que se apoia, o mesmo
// contorno e paletas por fase da vida e por hora do dia.

/** Tamanho do palco de uma cena (a parte de cima da tela). */
export const PALCO = { largura: 390, altura: 352 } as const;
/** Onde a parede encontra o chão. Abaixo disso é chão; acima, parede ou céu. */
export const CHAO = 250;

/** Contorno único: mesma cor e espessura em tudo (não engrossa com a escala). */
export const CONTORNO = '#3a2e26';
export const TRACO = 2;
export const contorno = (largura = TRACO) =>
  `stroke="${CONTORNO}" stroke-width="${largura}" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"`;

/**
 * Profundidade no chão: z = 0 encostado na parede, z = 1 na frente da cena.
 * Devolve onde fica a base do objeto e a escala dele (o que está na frente é maior).
 */
export function profundidade(z: number): { base: number; escala: number } {
  const zz = Math.max(0, Math.min(1, z));
  return { base: CHAO + zz * 90, escala: 0.84 + zz * 0.24 };
}

/** Sombra no chão, embaixo de tudo o que está apoiado (a luz vem da esquerda, então ela escapa para a direita). */
export const sombra = (x: number, y: number, largura: number) =>
  `<ellipse cx="${x + largura * 0.08}" cy="${y + 1}" rx="${largura / 2}" ry="${Math.max(3, largura * 0.09)}" fill="#000" opacity="0.16"/>`;

/** Definições comuns: o degradê da luz (claro à esquerda, sombra à direita). */
export const DEFS = `<defs>
  <linearGradient id="luz" x1="0" x2="1" y1="0" y2="0"><stop offset="0.45" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.16"/></linearGradient>
  <linearGradient id="brilho" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.18"/><stop offset="0.5" stop-color="#fff" stop-opacity="0"/></linearGradient>
</defs>`;

/** Sombreado de luz sobre uma forma já desenhada (repete o caminho com o degradê). */
export const sombreado = (forma: string) => forma.replace(/fill="[^"]*"/, 'fill="url(#luz)"').replace(/stroke="[^"]*"[^/>]*/g, '');

export type Hora = 'manha' | 'tarde' | 'noite';
export type FaseArte = 'bebe' | 'crianca' | 'adolescente' | 'adulto' | 'idoso';

export interface Paleta {
  parede: string; rodape: string; chao: string; chaoLinha: string;
  ceu: [string, string]; madeira: string; madeiraEscura: string; tecido: string; destaque: string;
}

/** Paleta da casa por fase (o Brasil de cada idade) — a hora muda o céu e a luz. */
export const PALETAS: Record<FaseArte, Paleta> = {
  bebe: { parede: '#f3e6c4', rodape: '#d8c39a', chao: '#cfa978', chaoLinha: '#b88f5e', ceu: ['#a9dcef', '#e3f4fa'], madeira: '#c7925f', madeiraEscura: '#9c6c42', tecido: '#f2b5a7', destaque: '#e8553d' },
  crianca: { parede: '#f6dc8a', rodape: '#d9b85c', chao: '#c98b55', chaoLinha: '#a96f40', ceu: ['#8fd0ea', '#d8f1fa'], madeira: '#a86d42', madeiraEscura: '#7a4f33', tecido: '#2f6db5', destaque: '#e8553d' },
  adolescente: { parede: '#5b4f8a', rodape: '#463c70', chao: '#3f3566', chaoLinha: '#342b57', ceu: ['#8fc9e6', '#d5ecf7'], madeira: '#6b5aa0', madeiraEscura: '#4b3f7a', tecido: '#e9e0ff', destaque: '#e6457f' },
  adulto: { parede: '#e6ded1', rodape: '#cfc3b0', chao: '#a8937a', chaoLinha: '#8f7b63', ceu: ['#9fd3ea', '#e2f2f8'], madeira: '#7a5638', madeiraEscura: '#5a3e27', tecido: '#3e5c76', destaque: '#c9483b' },
  idoso: { parede: '#e9dcc5', rodape: '#cdbb9b', chao: '#b59671', chaoLinha: '#9a7c58', ceu: ['#bfe0ea', '#f1efe2'], madeira: '#8a5a3b', madeiraEscura: '#6b4429', tecido: '#8e6c8a', destaque: '#b5653f' },
};

/** Céu pela hora (sobrepõe o da fase). */
export function ceuDaHora(p: Paleta, hora: Hora): [string, string] {
  if (hora === 'noite') return ['#141a3a', '#2a3266'];
  if (hora === 'tarde') return ['#f6c178', '#e08a52'];
  return p.ceu;
}

/** Véu de luz da hora sobre a cena inteira (noite azulada, tarde dourada). */
export function veuDaHora(hora: Hora): string {
  if (hora === 'noite') return `<rect width="${PALCO.largura}" height="${PALCO.altura}" fill="#1b2350" opacity="0.28"/>`;
  if (hora === 'tarde') return `<rect width="${PALCO.largura}" height="${PALCO.altura}" fill="#ff9a3c" opacity="0.08"/>`;
  return '';
}

/** Escurece ou clareia uma cor hex (fator -1 a 1). */
export function tom(hex: string, fator: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(fator < 0 ? v * (1 + fator) : v + (255 - v) * fator));
  return `#${c.map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('')}`;
}
