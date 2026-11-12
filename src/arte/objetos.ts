// Motor de arte · objetos. Cada objeto é desenhado com a base em (0, 0) e o centro
// em x = 0, com sombra no chão, contorno e luz da esquerda. Objetos de parede
// (quadro, pôster, janela) têm o topo em (0, 0) e fazem sombra na parede.

import { contorno, sombra, tom, type Paleta } from './estilo';

const c = () => contorno();
const luz = (d: string) => `<path d="${d}" fill="url(#luz)"/>`;
const caixa = (x: number, y: number, w: number, h: number, cor: string, r = 3) => {
  const d = `M${x + r} ${y} H${x + w - r} Q${x + w} ${y} ${x + w} ${y + r} V${y + h - r} Q${x + w} ${y + h} ${x + w - r} ${y + h} H${x + r} Q${x} ${y + h} ${x} ${y + h - r} V${y + r} Q${x} ${y} ${x + r} ${y} Z`;
  return `<path d="${d}" fill="${cor}" ${c()}/>${luz(d)}`;
};

// ---------- Móveis de chão ----------

export const cama = (p: Paleta, lencol = '#ffffff', coberta = p.tecido) => `${sombra(0, 0, 170)}
  ${caixa(-85, -62, 18, 62, p.madeiraEscura)}
  ${caixa(-80, -34, 160, 30, p.madeira)}
  ${caixa(-74, -44, 150, 12, lencol, 6)}
  ${caixa(-70, -52, 42, 14, '#ffffff', 7)}
  ${caixa(-30, -46, 110, 22, coberta, 6)}
  <rect x="-78" y="-5" width="6" height="5" fill="${p.madeiraEscura}" ${c()}/><rect x="72" y="-5" width="6" height="5" fill="${p.madeiraEscura}" ${c()}/>`;

export const escrivaninha = (p: Paleta, sobre = '') => `${sombra(0, 0, 120)}
  ${caixa(-58, -64, 116, 9, p.madeira)}
  <rect x="-54" y="-55" width="7" height="55" fill="${p.madeiraEscura}" ${c()}/><rect x="47" y="-55" width="7" height="55" fill="${p.madeiraEscura}" ${c()}/>
  ${caixa(14, -55, 33, 26, p.madeira, 2)}<circle cx="30" cy="-42" r="2" fill="${p.madeiraEscura}"/>
  <g transform="translate(0 -64)">${sobre}</g>`;

export const cadeira = (p: Paleta) => `${sombra(0, 0, 40)}
  ${caixa(-16, -64, 32, 30, p.madeira)}${caixa(-18, -36, 36, 7, p.madeira)}
  <rect x="-16" y="-29" width="5" height="29" fill="${p.madeiraEscura}" ${c()}/><rect x="11" y="-29" width="5" height="29" fill="${p.madeiraEscura}" ${c()}/>`;

export const sofa = (cor: string) => `${sombra(0, 0, 190)}
  ${caixa(-92, -70, 184, 40, tom(cor, -0.1), 14)}
  ${caixa(-96, -46, 192, 36, cor, 12)}
  ${caixa(-100, -56, 22, 46, tom(cor, 0.08), 10)}${caixa(78, -56, 22, 46, tom(cor, -0.15), 10)}
  ${caixa(-70, -44, 66, 16, tom(cor, 0.12), 8)}${caixa(4, -44, 66, 16, tom(cor, 0.05), 8)}
  <rect x="-88" y="-10" width="6" height="10" fill="#3a2e26"/><rect x="82" y="-10" width="6" height="10" fill="#3a2e26"/>`;

export const mesa = (p: Paleta, sobre = '') => `${sombra(0, 0, 160)}
  ${caixa(-80, -58, 160, 10, p.madeira)}
  <rect x="-72" y="-48" width="7" height="48" fill="${p.madeiraEscura}" ${c()}/><rect x="65" y="-48" width="7" height="48" fill="${p.madeiraEscura}" ${c()}/>
  <g transform="translate(0 -58)">${sobre}</g>`;

export const estante = (p: Paleta) => {
  const livros = Array.from({ length: 9 }, (_, i) => `<rect x="${-34 + i * 7.5}" y="${-118 + (i % 3) * 3}" width="6" height="${22 - (i % 3) * 3}" fill="${['#c0392b', '#2f6db5', '#f2c14e', '#3aa26b', '#8e44ad'][i % 5]}" ${contorno(1)}/>`).join('');
  const livros2 = Array.from({ length: 7 }, (_, i) => `<rect x="${-34 + i * 9}" y="${-74 + (i % 2) * 4}" width="7.5" height="${20 - (i % 2) * 4}" fill="${['#e67e22', '#16a085', '#d35400', '#2c3e50'][i % 4]}" ${contorno(1)}/>`).join('');
  return `${sombra(0, 0, 90)}${caixa(-42, -140, 84, 140, p.madeiraEscura)}
    <rect x="-36" y="-130" width="72" height="40" fill="${tom(p.madeiraEscura, -0.3)}"/><rect x="-36" y="-84" width="72" height="40" fill="${tom(p.madeiraEscura, -0.3)}"/>
    ${livros}${livros2}<rect x="-36" y="-38" width="72" height="32" fill="${tom(p.madeiraEscura, -0.3)}"/><circle cx="18" cy="-24" r="8" fill="#e8553d" ${contorno(1)}/>`;
};

/** Planta em vaso: tem pé, vaso e sombra (nunca "pintada na parede"). */
export const planta = (folha = '#3e8e41', vaso = '#c0613b') => `${sombra(0, 0, 50)}
  <path d="M-16 -34 L16 -34 L12 0 L-12 0 Z" fill="${vaso}" ${c()}/>${luz('M-16 -34 L16 -34 L12 0 L-12 0 Z')}
  <rect x="-18" y="-38" width="36" height="6" rx="2" fill="${tom(vaso, -0.12)}" ${c()}/>
  ${[[-14, -70, -30], [0, -86, 0], [14, -72, 28], [-6, -60, -50], [8, -58, 50]].map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="9" ry="22" transform="rotate(${r} ${x} ${y})" fill="${folha}" ${c()}/>`).join('')}`;

/** Árvore de Natal num vaso, com enfeites e estrela. */
export const arvoreNatal = () => {
  const camada = (y: number, w: number) => `<path d="M0 ${y - 34} L${w} ${y} L${-w} ${y} Z" fill="#2f7d55" ${c()}/>${luz(`M0 ${y - 34} L${w} ${y} L${-w} ${y} Z`)}`;
  const bolas = [[-14, -40, '#e85d75'], [12, -48, '#ffd166'], [-8, -66, '#7fb7ff'], [10, -74, '#e85d75'], [-4, -90, '#ffd166'], [18, -32, '#7fb7ff']]
    .map(([x, y, cor]) => `<circle cx="${x}" cy="${y}" r="3.5" fill="${cor}" ${contorno(1)}/>`).join('');
  return `${sombra(0, 0, 70)}
    <path d="M-14 -22 L14 -22 L11 0 L-11 0 Z" fill="#8a4b2d" ${c()}/>
    ${camada(-24, 36)}${camada(-50, 29)}${camada(-74, 22)}
    ${bolas}<path d="M0 -114 l4 9 l10 1 l-8 6 l3 10 l-9 -6 l-9 6 l3 -10 l-8 -6 l10 -1 z" fill="#ffd166" ${contorno(1.2)}/>`;
};

export const tv = (p: Paleta, ligada = true) => `${sombra(0, 0, 130)}
  ${caixa(-62, -34, 124, 34, p.madeira)}
  <rect x="-8" y="-46" width="16" height="12" fill="#2b2620" ${c()}/>
  ${caixa(-56, -116, 112, 70, '#1e1e24', 4)}
  <rect x="-50" y="-110" width="100" height="58" fill="${ligada ? '#6fb7e8' : '#2a2f3a'}"/>
  ${ligada ? '<path d="M-50 -60 L-20 -84 L5 -66 L28 -90 L50 -70 V-52 H-50 Z" fill="#3aa26b"/>' : ''}`;

export const tapete = (cor: string, w = 180) => `<ellipse cx="0" cy="0" rx="${w / 2}" ry="${w * 0.11}" fill="${cor}" ${c()}/><ellipse cx="0" cy="0" rx="${w / 2 - 10}" ry="${w * 0.11 - 5}" fill="none" stroke="${tom(cor, 0.25)}" stroke-width="2"/>`;

export const bola = () => `${sombra(0, 0, 26)}<circle cx="0" cy="-12" r="12" fill="#ffffff" ${c()}/><path d="M-4 -18 l4 -3 l4 3 l-1.5 5 h-5 z" fill="#2b2620"/><path d="M-12 -12 q6 -2 8 2 M12 -12 q-6 -2 -8 2" fill="none" ${contorno(1)}/>`;

export const caderno = (cor = '#2f6db5') => `<rect x="-30" y="-6" width="30" height="6" rx="1" fill="${cor}" ${contorno(1.2)}/><rect x="-28" y="-9" width="26" height="3" fill="#fffaf0" ${contorno(1)}/>`;
export const notebook = () => `<path d="M-24 0 L24 0 L20 -3 L-20 -3 Z" fill="#9aa4b1" ${contorno(1.2)}/><rect x="-18" y="-26" width="36" height="23" rx="2" fill="#1e2a3a" ${contorno(1.2)}/><rect x="-15" y="-23" width="30" height="17" fill="#9cc2e6"/>`;
export const abajur = (cor = '#f2c14e') => `<rect x="28" y="-4" width="12" height="4" fill="#3a2e26"/><rect x="33" y="-20" width="2" height="16" fill="#3a2e26"/><path d="M24 -20 L44 -20 L40 -34 L28 -34 Z" fill="${cor}" ${contorno(1.2)}/>`;
export const celularNaMesa = () => `<rect x="-6" y="-2" width="12" height="2" fill="#111"/>`;

// ---------- Objetos de parede (topo em 0,0) ----------

/** Quadro com moldura e sombra na parede. */
export const quadro = (w: number, h: number, dentro: string, moldura = '#6b4a2f') => `
  <rect x="${-w / 2 + 3}" y="4" width="${w}" height="${h}" fill="#000" opacity="0.12"/>
  <rect x="${-w / 2}" y="0" width="${w}" height="${h}" fill="${moldura}" ${c()}/>
  <g transform="translate(${-w / 2 + 5} 5)"><svg width="${w - 10}" height="${h - 10}" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">${dentro}</svg></g>`;

/** Pôster colado (cantos com fita), levemente torto. */
export const poster = (w: number, h: number, dentro: string, angulo = -4) => `<g transform="rotate(${angulo})">
  <rect x="${-w / 2 + 3}" y="3" width="${w}" height="${h}" fill="#000" opacity="0.15"/>
  <rect x="${-w / 2}" y="0" width="${w}" height="${h}" fill="#fff" ${c()}/>
  <g transform="translate(${-w / 2 + 3} 3)"><svg width="${w - 6}" height="${h - 6}" viewBox="0 0 100 130" preserveAspectRatio="xMidYMid slice">${dentro}</svg></g>
  <rect x="${-w / 2 - 4}" y="-3" width="12" height="6" fill="#fff8" transform="rotate(-30 ${-w / 2} 0)"/><rect x="${w / 2 - 8}" y="-3" width="12" height="6" fill="#fff8" transform="rotate(30 ${w / 2} 0)"/>
</g>`;

/** Janela: o lado de fora fica recortado no vidro, nada atravessa para dentro. */
export function janela(id: string, w: number, h: number, fora: string, moldura = '#ffffff'): string {
  return `<defs><clipPath id="${id}"><rect x="6" y="6" width="${w - 12}" height="${h - 12}"/></clipPath></defs>
    <rect x="3" y="4" width="${w}" height="${h}" fill="#000" opacity="0.1"/>
    <rect x="0" y="0" width="${w}" height="${h}" rx="3" fill="${moldura}" ${c()}/>
    <g clip-path="url(#${id})">${fora}</g>
    <rect x="${w / 2 - 2}" y="0" width="4" height="${h}" fill="${moldura}" ${contorno(1.2)}/>
    <rect x="0" y="${h * 0.56}" width="${w}" height="4" fill="${moldura}" ${contorno(1.2)}/>
    <rect x="-6" y="${h}" width="${w + 12}" height="8" rx="2" fill="${tom(moldura, -0.08)}" ${c()}/>`;
}

export const porta = (cor: string) => `<rect x="3" y="4" width="70" height="150" fill="#000" opacity="0.1"/>
  <rect x="0" y="0" width="70" height="150" rx="2" fill="${cor}" ${contorno()}/><rect x="10" y="12" width="50" height="56" fill="${tom(cor, -0.08)}" ${contorno(1)}/><rect x="10" y="80" width="50" height="58" fill="${tom(cor, -0.08)}" ${contorno(1)}/><circle cx="58" cy="78" r="3.5" fill="#d4a017" ${contorno(1)}/>`;

/** Varal de luzinhas preso na parede, de ponta a ponta. */
export const luzinhas = (largura: number, y: number) => `<path d="M0 ${y} Q${largura / 2} ${y + 22} ${largura} ${y - 2}" fill="none" stroke="#4a4038" stroke-width="1.2"/>
  ${Array.from({ length: Math.floor(largura / 22) }, (_, i) => { const x = 10 + i * 22; const t = x / largura; const yy = y + 4 * 22 * t * (1 - t) * 1; return `<circle cx="${x}" cy="${yy + 4}" r="3.6" fill="${['#ffd166', '#e85d75', '#4dd0a1', '#7fb7ff'][i % 4]}" ${contorno(0.8)}/>`; }).join('')}`;

// ---------- Lado de fora (desenhado dentro do vidro da janela) ----------

export const ceu = (cores: [string, string], id: string) => `<defs><linearGradient id="${id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${cores[0]}"/><stop offset="1" stop-color="${cores[1]}"/></linearGradient></defs><rect x="0" y="0" width="400" height="300" fill="url(#${id})"/>`;
export const nuvem = (x: number, y: number) => `<g fill="#ffffff" opacity="0.9"><circle cx="${x}" cy="${y}" r="9"/><circle cx="${x + 10}" cy="${y - 4}" r="11"/><circle cx="${x + 22}" cy="${y}" r="9"/></g>`;
export const lua = (x: number, y: number) => `<circle cx="${x}" cy="${y}" r="10" fill="#f6f1d1"/><circle cx="${x + 5}" cy="${y - 3}" r="9" fill="#141a3a"/>`;
export const estrelas = (w: number, h: number) => Array.from({ length: 14 }, (_, i) => `<circle cx="${(i * 37) % w}" cy="${(i * 23) % h}" r="${i % 3 ? 0.8 : 1.4}" fill="#fff"/>`).join('');
export const arvoreFora = (x: number, y: number, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-3" y="-24" width="6" height="24" fill="#6b4a2f"/><circle cx="0" cy="-34" r="16" fill="#3e8e41"/><circle cx="-10" cy="-26" r="10" fill="#4aa24d"/></g>`;
export const predios = (w: number, base: number, noite: boolean) => Array.from({ length: Math.ceil(w / 22) }, (_, i) => {
  const h = 50 + ((i * 37) % 60);
  const janelas = Array.from({ length: Math.floor(h / 16) }, (_, j) => `<rect x="${i * 22 + 5}" y="${base - h + 8 + j * 16}" width="4" height="5" fill="${noite ? '#ffd166' : '#cfe6f5'}" opacity="${(i + j) % 3 ? 0.9 : 0.25}"/>`).join('');
  return `<rect x="${i * 22}" y="${base - h}" width="19" height="${h}" fill="${noite ? '#2b2f55' : '#8a7f99'}"/>${janelas}`;
}).join('');
export const bandeirinhas = (x0: number, x1: number, y: number) => {
  const n = Math.floor((x1 - x0) / 13);
  return `<path d="M${x0} ${y} Q${(x0 + x1) / 2} ${y + 16} ${x1} ${y}" stroke="#6b5a45" stroke-width="1" fill="none"/>`
    + Array.from({ length: n }, (_, i) => { const t = (i + 0.5) / n; const x = x0 + (x1 - x0) * t; const yy = y + 4 * 16 * t * (1 - t) * 0.5 * 2; return `<path d="M${x - 5} ${yy} h10 l-5 9 z" fill="${['#e8553d', '#2f6db5', '#f2c14e', '#3aa26b'][i % 4]}"/>`; }).join('');
};
/** Pipa inteira: armação, rabiola e linha descendo para fora do vidro. */
export const pipa = (x: number, y: number, cor: string) => `<g transform="translate(${x} ${y}) rotate(-14)">
  <path d="M0 -15 L11 0 L0 18 L-11 0 Z" fill="${cor}" ${contorno(1)}/><path d="M0 -15 V18 M-11 0 H11" stroke="#fff" stroke-width="0.9" opacity="0.8"/>
  <path d="M0 18 q-6 8 1 15 q7 7 -1 15 q-7 7 1 14" stroke="#2b2620" stroke-width="0.9" fill="none"/>
  ${[24, 35, 46, 57].map((yy, i) => `<path d="M${i % 2 ? 1 : -1} ${yy} l5 -2 l0 4 z" fill="${['#f2c14e', '#2f6db5'][i % 2]}"/>`).join('')}
  <path d="M0 0 Q-40 60 -90 120" stroke="#2b262099" stroke-width="0.7" fill="none"/></g>`;
