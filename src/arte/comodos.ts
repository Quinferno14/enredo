// Motor de arte · cômodos e lugares. Toda cena é montada pelos mesmos planos, de
// trás para a frente: (1) parede ou céu, (2) chão, (3) coisas presas na parede,
// (4) coisas no chão e pessoas, ordenadas pela profundidade z. Nada atravessa os
// planos: o lado de fora só aparece dentro do vidro da janela.

import { CHAO, DEFS, PALCO, PALETAS, ceuDaHora, contorno, profundidade, tom, veuDaHora, type FaseArte, type Hora, type Paleta } from './estilo';
import { pessoaNaCena, type Aparencia, type OpcoesDesenho } from './pessoa';
import * as o from './objetos';

export type Lugar =
  | 'quarto' | 'sala' | 'cozinha'
  | 'escola' | 'clinica' | 'hospital' | 'imobiliaria' | 'banco' | 'academia' | 'parque' | 'escritorio';

export const LUGARES: Lugar[] = ['quarto', 'sala', 'cozinha', 'escola', 'clinica', 'hospital', 'imobiliaria', 'banco', 'academia', 'parque', 'escritorio'];

export interface PessoaEmCena extends OpcoesDesenho { aparencia: Aparencia; x: number; z: number }
export interface Cena {
  lugar: Lugar;
  fase: FaseArte;
  hora: Hora;
  pessoas?: PessoaEmCena[];
  /** Enfeites da época: natal, festa junina, aniversário. */
  epoca?: 'natal' | 'junina' | 'aniversario';
}

interface NoChao { z: number; x: number; svg: string; pessoa?: PessoaEmCena }
interface NaParede { x: number; y: number; svg: string }
interface Planta { fundo: 'parede' | 'ceu'; parede?: string; rodape?: string; chao: string; chaoLinha: string; naParede: NaParede[]; noChao: NoChao[] }

// Ids únicos no documento inteiro: várias cenas na mesma página não podem
// compartilhar degradês nem recortes de janela.
let contadorJanela = 0;

/** O que se vê pela janela: céu da hora + paisagem da fase. */
function ladoDeFora(p: Paleta, fase: FaseArte, hora: Hora, w: number, h: number, epoca?: Cena['epoca']): string {
  const id = `ceu${contadorJanela++}`;
  const noite = hora === 'noite';
  let s = o.ceu(ceuDaHora(p, hora), id);
  s += noite ? o.estrelas(w, h * 0.5) + o.lua(w * 0.75, h * 0.25) : o.nuvem(w * 0.15, h * 0.22) + o.nuvem(w * 0.6, h * 0.3);
  if (fase === 'adolescente' || fase === 'adulto') s += o.predios(w + 22, h, noite);
  else s += `<rect x="0" y="${h * 0.72}" width="${w}" height="${h}" fill="${noite ? '#23402c' : '#7cc06a'}"/>` + o.arvoreFora(w * 0.25, h * 0.8, 0.8) + o.arvoreFora(w * 0.8, h * 0.78, 0.6);
  if (fase === 'crianca' && hora !== 'noite') s += o.pipa(w * 0.62, h * 0.3, '#e8553d');
  if (epoca === 'junina') s += o.bandeirinhas(0, w, h * 0.12);
  return s;
}

function plantaDoLugar(c: Cena): Planta {
  const p = PALETAS[c.fase];
  const base = { fundo: 'parede' as const, parede: p.parede, rodape: p.rodape, chao: p.chao, chaoLinha: p.chaoLinha };
  const jan = (x: number, y: number, w: number, h: number): NaParede => ({ x, y, svg: o.janela(`jan${contadorJanela++}`, w, h, ladoDeFora(p, c.fase, c.hora, w, h, c.epoca)) });
  switch (c.lugar) {
    case 'quarto': {
      const naParede: NaParede[] = [jan(206, 52, 120, 100)];
      const noChao: NoChao[] = [];
      if (c.fase === 'bebe') {
        noChao.push({ z: 0.05, x: 90, svg: berco(p) }, { z: 0.6, x: 300, svg: o.bola() });
        naParede.push({ x: 90, y: 40, svg: o.quadro(56, 46, '<rect width="100" height="100" fill="#a9dcef"/><circle cx="50" cy="45" r="22" fill="#ffd166"/>') });
      } else if (c.fase === 'crianca') {
        noChao.push({ z: 0.02, x: 92, svg: o.cama(p, '#fffaf0', '#e8553d') }, { z: 0.1, x: 300, svg: o.escrivaninha(p, o.caderno() + o.abajur()) }, { z: 0.75, x: 200, svg: o.bola() });
        naParede.push({ x: 78, y: 46, svg: o.poster(46, 58, '<rect width="100" height="130" fill="#2f6db5"/><circle cx="50" cy="60" r="28" fill="#f2c14e"/>') });
      } else if (c.fase === 'adolescente') {
        noChao.push({ z: 0.02, x: 92, svg: o.cama(p, '#d9d0f5', '#e6457f') }, { z: 0.1, x: 300, svg: o.escrivaninha(p, o.notebook() + o.abajur('#4dd0a1')) });
        naParede.push({ x: 0, y: 58, svg: o.luzinhas(PALCO.largura, 0) }, { x: 70, y: 54, svg: o.poster(44, 60, '<rect width="100" height="130" fill="#111"/><path d="M15 100 L50 20 L85 100 Z" fill="#e6457f"/>', -6) }, { x: 130, y: 70, svg: o.poster(36, 44, '<rect width="100" height="130" fill="#4dd0a1"/><circle cx="50" cy="65" r="30" fill="#fff"/>', 5) });
      } else {
        noChao.push({ z: 0.02, x: 100, svg: o.cama(p, '#ffffff', p.tecido) }, { z: 0.05, x: 300, svg: o.estante(p) });
        naParede.push({ x: 100, y: 52, svg: o.quadro(70, 50, '<rect width="100" height="100" fill="#d9e4ef"/><path d="M0 70 Q30 40 60 65 T100 55 V100 H0Z" fill="#7a9e7e"/>') });
      }
      return { ...base, naParede, noChao };
    }
    case 'sala': {
      const naParede: NaParede[] = [jan(36, 52, 110, 96), { x: 268, y: 66, svg: o.quadro(64, 46, '<rect width="100" height="100" fill="#f2e6c9"/><circle cx="35" cy="45" r="20" fill="#c9483b"/><rect x="55" y="30" width="30" height="40" fill="#3e5c76"/>') }];
      const noChao: NoChao[] = [{ z: 0.0, x: 250, svg: o.sofa(p.tecido) }, { z: 0.55, x: 210, svg: o.tapete(tom(p.destaque, 0.35), 200) }, { z: 0.08, x: 70, svg: o.planta() }];
      if (c.epoca === 'natal') noChao.push({ z: 0.15, x: 350, svg: o.arvoreNatal() });
      if (c.epoca === 'aniversario') noChao.push({ z: 0.45, x: 120, svg: o.mesa(p, bolo()) });
      return { ...base, naParede, noChao };
    }
    case 'cozinha': {
      const naParede: NaParede[] = [jan(150, 50, 96, 80), { x: 0, y: 150, svg: azulejos(PALCO.largura, CHAO - 150) }];
      const noChao: NoChao[] = [{ z: 0.0, x: 90, svg: balcao(p, 150) }, { z: 0.0, x: 330, svg: geladeira() }, { z: 0.5, x: 200, svg: o.mesa(p, `<circle cx="-20" cy="-6" r="8" fill="#fff" ${contorno(1.2)}/><rect x="16" y="-14" width="10" height="14" fill="#c0392b" ${contorno(1.2)}/>`) }];
      if (c.epoca === 'junina') naParede.push({ x: 0, y: 60, svg: o.bandeirinhas(0, PALCO.largura, 0) });
      return { ...base, parede: '#f4efe6', naParede, noChao };
    }
    case 'escola': {
      const naParede: NaParede[] = [{ x: 70, y: 50, svg: lousa(250, 110, c.fase === 'crianca' ? 'A B C  1+1=2' : 'f(x) = 2x + 1') }, jan(330, 60, 52, 90)];
      const noChao: NoChao[] = [{ z: 0.55, x: 110, svg: carteira(p) }, { z: 0.55, x: 280, svg: carteira(p) }];
      return { ...base, parede: '#e7efe1', rodape: '#b9c7ad', chao: '#cbb08a', chaoLinha: '#b39468', naParede, noChao };
    }
    case 'clinica': {
      const naParede: NaParede[] = [{ x: 50, y: 60, svg: placa('CLÍNICA', '#d98aa5') }, { x: 230, y: 50, svg: espelho(110, 140) }];
      const noChao: NoChao[] = [{ z: 0.05, x: 120, svg: maca('#f6e3ea') }, { z: 0.1, x: 330, svg: o.planta('#5a9e6f', '#ffffff') }];
      return { ...base, parede: '#fbf1f4', rodape: '#e8cdd7', chao: '#e9e2dc', chaoLinha: '#d8cfc6', naParede, noChao };
    }
    case 'hospital': {
      const naParede: NaParede[] = [{ x: 40, y: 50, svg: cruz() }, jan(250, 50, 100, 90)];
      const noChao: NoChao[] = [{ z: 0.05, x: 160, svg: leito() }, { z: 0.1, x: 330, svg: soro() }];
      return { ...base, parede: '#e3eff0', rodape: '#b8d0d3', chao: '#d3dfdf', chaoLinha: '#bfcfcf', naParede, noChao };
    }
    case 'imobiliaria': {
      const fotos = [0, 1, 2].map((i) => ({ x: 70 + i * 90, y: 84, svg: o.quadro(70, 54, `<rect width="100" height="100" fill="#cfe6f5"/><rect x="20" y="45" width="60" height="45" fill="${['#f2c14e', '#e8553d', '#3aa26b'][i]}"/><path d="M12 48 L50 16 L88 48 Z" fill="#7a4f33"/>`, '#3a2e26') }));
      const noChao: NoChao[] = [{ z: 0.4, x: 195, svg: balcaoAtendimento('#2f6db5', o.notebook()) }, { z: 0.05, x: 350, svg: o.planta() }];
      return { ...base, parede: '#eef0f3', rodape: '#c9ced6', chao: '#b7a790', chaoLinha: '#a08f76', naParede: [{ x: 110, y: 22, svg: placa('ALUGA · VENDE', '#2f6db5') }, ...fotos], noChao };
    }
    case 'banco': {
      const naParede: NaParede[] = [{ x: 120, y: 44, svg: placa('BANCO', '#1f7a5a') }, { x: 260, y: 56, svg: relogio() }];
      const noChao: NoChao[] = [{ z: 0.35, x: 140, svg: balcaoAtendimento('#1f7a5a', '') }, { z: 0.0, x: 340, svg: caixaEletronico() }];
      return { ...base, parede: '#e9ece6', rodape: '#c4cbbd', chao: '#9fa69a', chaoLinha: '#8a9185', naParede, noChao };
    }
    case 'academia': {
      const naParede: NaParede[] = [{ x: 30, y: 50, svg: espelho(160, 150) }, { x: 230, y: 60, svg: placa('FOCO', '#e8553d') }];
      const noChao: NoChao[] = [{ z: 0.1, x: 300, svg: esteira() }, { z: 0.65, x: 80, svg: halteres() }];
      return { ...base, parede: '#d9d6d2', rodape: '#4a4744', chao: '#3f3c3a', chaoLinha: '#33302e', naParede, noChao };
    }
    case 'escritorio': {
      const naParede: NaParede[] = [jan(200, 40, 160, 110), { x: 60, y: 70, svg: o.quadro(60, 44, '<rect width="100" height="100" fill="#fff"/><path d="M10 80 L35 55 L55 65 L90 20" stroke="#2f6db5" stroke-width="6" fill="none"/>', '#3a2e26') }];
      const noChao: NoChao[] = [{ z: 0.3, x: 150, svg: o.escrivaninha(PALETAS.adulto, o.notebook()) }, { z: 0.38, x: 220, svg: o.cadeira(PALETAS.adulto) }, { z: 0.05, x: 350, svg: o.planta() }];
      return { ...base, parede: '#eceae6', rodape: '#c8c4bd', chao: '#8d8a86', chaoLinha: '#7b7874', naParede, noChao };
    }
    case 'parque': {
      const noChao: NoChao[] = [{ z: 0.0, x: 70, svg: arvoreGrande() }, { z: 0.0, x: 330, svg: arvoreGrande(0.85) }, { z: 0.25, x: 200, svg: banco() }];
      if (c.epoca === 'junina') noChao.push({ z: 0.3, x: 95, svg: fogueira() });
      return { fundo: 'ceu', chao: c.hora === 'noite' ? '#2f5a3a' : '#7cc06a', chaoLinha: c.hora === 'noite' ? '#284d31' : '#6aae59', naParede: c.epoca === 'junina' ? [{ x: 0, y: 64, svg: o.bandeirinhas(0, PALCO.largura, 0) }] : [], noChao };
    }
  }
}

/** Desenha a cena inteira (SVG pronto para o palco). */
export function desenharCena(c: Cena): string {
  const p = PALETAS[c.fase];
  const planta = plantaDoLugar(c);
  const W = PALCO.largura, H = PALCO.altura;
  let fundo: string;
  if (planta.fundo === 'ceu') {
    const [a, b] = ceuDaHora(p, c.hora);
    const idCeu = `ceuAberto${contadorJanela++}`;
    fundo = `<defs><linearGradient id="${idCeu}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
      <rect width="${W}" height="${CHAO}" fill="url(#${idCeu})"/>
      ${c.hora === 'noite' ? o.estrelas(W, 120) + o.lua(300, 50) : o.nuvem(60, 50) + o.nuvem(250, 80)}
      ${o.predios(W + 22, CHAO - 10, c.hora === 'noite').replace(/<rect /g, '<rect opacity="0.5" ')}`;
  } else {
    fundo = `<rect width="${W}" height="${CHAO}" fill="${planta.parede}"/><rect width="${W}" height="${CHAO}" fill="url(#luz)" opacity="0.5"/>
      <rect y="${CHAO - 12}" width="${W}" height="12" fill="${planta.rodape}" ${contorno(1.5)}/>`;
  }
  const linhas = Array.from({ length: 5 }, (_, i) => { const y = CHAO + 8 + i * i * 4.5; return `<line x1="0" x2="${W}" y1="${y}" y2="${y}" stroke="${planta.chaoLinha}" stroke-width="1.5"/>`; }).join('');
  const chao = `<rect y="${CHAO}" width="${W}" height="${H - CHAO}" fill="${planta.chao}"/>${linhas}`;
  const paredeSvg = planta.naParede.map((n) => `<g transform="translate(${n.x} ${n.y})">${n.svg}</g>`).join('');
  const coisas: NoChao[] = [...planta.noChao];
  for (const pe of c.pessoas ?? []) coisas.push({ z: pe.z, x: pe.x, svg: '', pessoa: pe });
  coisas.sort((a, b) => a.z - b.z);
  const chaoSvg = coisas.map((n) => {
    const { base, escala } = profundidade(n.z);
    if (n.pessoa) return pessoaNaCena(n.pessoa.aparencia, n.x, base, escala, n.pessoa);
    return `<g transform="translate(${n.x} ${base}) scale(${escala})">${n.svg}</g>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${DEFS}${fundo}${chao}${paredeSvg}${chaoSvg}${veuDaHora(c.hora)}</svg>`;
}

// ---------- Peças específicas dos lugares (mesmas regras: base no chão, sombra, contorno) ----------

const cc = () => contorno();
const sombraChao = (w: number) => `<ellipse cx="${w * 0.08}" cy="1" rx="${w / 2}" ry="${Math.max(3, w * 0.09)}" fill="#000" opacity="0.16"/>`;

function berco(p: Paleta) {
  const grades = Array.from({ length: 11 }, (_, i) => `<rect x="${-60 + i * 12}" y="-78" width="4" height="50" fill="${p.madeira}" ${contorno(1)}/>`).join('');
  return `${sombraChao(140)}<rect x="-66" y="-30" width="132" height="14" fill="${p.madeira}" ${cc()}/>${grades}<rect x="-66" y="-84" width="132" height="8" rx="3" fill="${p.madeira}" ${cc()}/>
    <rect x="-66" y="-16" width="6" height="16" fill="${p.madeiraEscura}" ${cc()}/><rect x="60" y="-16" width="6" height="16" fill="${p.madeiraEscura}" ${cc()}/>`;
}
function bolo() {
  return `<rect x="-22" y="-26" width="44" height="26" rx="4" fill="#f7c6d0" ${contorno(1.5)}/><rect x="-22" y="-26" width="44" height="7" rx="3" fill="#fff" ${contorno(1)}/>
    ${[-10, 0, 10].map((x) => `<rect x="${x - 1.5}" y="-38" width="3" height="12" fill="#7fb7ff"/><ellipse cx="${x}" cy="-41" rx="2.5" ry="4" fill="#ffd166"/>`).join('')}`;
}
function azulejos(w: number, h: number) {
  const linhas = Array.from({ length: Math.ceil(h / 16) }, (_, i) => `<line x1="0" x2="${w}" y1="${i * 16}" y2="${i * 16}" stroke="#c9d6dd" stroke-width="1"/>`).join('');
  const cols = Array.from({ length: Math.ceil(w / 16) }, (_, i) => `<line y1="0" y2="${h}" x1="${i * 16}" x2="${i * 16}" stroke="#c9d6dd" stroke-width="1"/>`).join('');
  return `<rect width="${w}" height="${h}" fill="#e8f1f5"/>${linhas}${cols}`;
}
function balcao(p: Paleta, w: number) {
  return `${sombraChao(w)}<rect x="${-w / 2}" y="-86" width="${w}" height="86" fill="${p.madeira}" ${cc()}/><rect x="${-w / 2 - 4}" y="-92" width="${w + 8}" height="8" fill="#d8d2c8" ${cc()}/>
    <rect x="${-w / 2 + 8}" y="-76" width="${w / 2 - 12}" height="68" fill="${tom(p.madeira, 0.08)}" ${contorno(1)}/><rect x="4" y="-76" width="${w / 2 - 12}" height="68" fill="${tom(p.madeira, -0.05)}" ${contorno(1)}/>
    <path d="M-20 -92 V-108 H8" fill="none" stroke="#9aa4b1" stroke-width="4"/><rect x="-30" y="-92" width="44" height="4" fill="#b8c2cc"/>`;
}
function geladeira() {
  return `${sombraChao(66)}<rect x="-32" y="-160" width="64" height="160" rx="6" fill="#f4f6f8" ${cc()}/><path d="M-32 -106 H32" ${contorno(1.5)}/><rect x="20" y="-150" width="4" height="30" rx="2" fill="#9aa4b1"/><rect x="20" y="-96" width="4" height="40" rx="2" fill="#9aa4b1"/>
    <rect x="-32" y="-160" width="64" height="160" rx="6" fill="url(#luz)"/><rect x="-18" y="-140" width="12" height="14" fill="#f2c14e" transform="rotate(-8 -12 -133)"/>`;
}
function lousa(w: number, h: number, texto: string) {
  return `<rect x="3" y="4" width="${w}" height="${h}" fill="#000" opacity="0.12"/><rect width="${w}" height="${h}" rx="3" fill="#2f5d4a" ${contorno()}/><rect x="-4" y="${h}" width="${w + 8}" height="6" fill="#a86d42" ${contorno(1.5)}/>
    <text x="${w / 2}" y="${h / 2 + 8}" text-anchor="middle" font-family="'Patrick Hand', 'Comic Sans MS', cursive" font-size="24" fill="#f4f1e8">${texto}</text>`;
}
function carteira(p: Paleta) {
  return `${sombraChao(80)}<rect x="-40" y="-58" width="80" height="8" fill="${p.madeira}" ${cc()}/><rect x="-34" y="-50" width="5" height="50" fill="#5a5f66" ${cc()}/><rect x="29" y="-50" width="5" height="50" fill="#5a5f66" ${cc()}/>
    <g transform="translate(0 -58)">${o.caderno('#e8553d')}</g>`;
}
function placa(texto: string, cor: string) {
  const w = 18 + texto.length * 11;
  return `<rect x="3" y="4" width="${w}" height="34" fill="#000" opacity="0.12"/><rect width="${w}" height="34" rx="4" fill="${cor}" ${contorno()}/><text x="${w / 2}" y="23" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="700" font-size="16" fill="#fff" letter-spacing="1">${texto}</text>`;
}
function espelho(w: number, h: number) {
  return `<rect x="3" y="4" width="${w}" height="${h}" fill="#000" opacity="0.1"/><rect width="${w}" height="${h}" rx="6" fill="#cfe3ea" ${contorno()}/><path d="M${w * 0.2} ${h * 0.15} L${w * 0.45} ${h * 0.05} M${w * 0.15} ${h * 0.35} L${w * 0.6} ${h * 0.12}" stroke="#fff" stroke-width="4" opacity="0.7"/>`;
}
function maca(cor: string) {
  return `${sombraChao(150)}<rect x="-75" y="-62" width="150" height="16" rx="6" fill="${cor}" ${cc()}/><rect x="-80" y="-74" width="40" height="14" rx="6" fill="#fff" ${cc()}/><rect x="-60" y="-46" width="6" height="46" fill="#9aa4b1" ${cc()}/><rect x="54" y="-46" width="6" height="46" fill="#9aa4b1" ${cc()}/>`;
}
function cruz() {
  return `<rect x="3" y="4" width="60" height="60" fill="#000" opacity="0.1"/><rect width="60" height="60" rx="6" fill="#fff" ${contorno()}/><path d="M24 10 H36 V24 H50 V36 H36 V50 H24 V36 H10 V24 H24 Z" fill="#d64545"/>`;
}
function leito() {
  return `${sombraChao(180)}<rect x="-90" y="-58" width="180" height="22" rx="4" fill="#e9eef2" ${cc()}/><rect x="-96" y="-96" width="10" height="96" fill="#9aa4b1" ${cc()}/><rect x="86" y="-76" width="10" height="76" fill="#9aa4b1" ${cc()}/>
    <rect x="-84" y="-70" width="44" height="14" rx="6" fill="#fff" ${cc()}/><rect x="-36" y="-64" width="120" height="12" rx="4" fill="#9fc6d9" ${cc()}/>`;
}
function soro() {
  return `${sombraChao(40)}<rect x="-2" y="-170" width="4" height="170" fill="#9aa4b1" ${contorno(1)}/><path d="M-18 0 H18" ${contorno(3)}/><rect x="-10" y="-168" width="20" height="28" rx="5" fill="#eaf6ff" ${contorno(1.2)}/><path d="M0 -140 Q10 -100 -6 -70" fill="none" stroke="#9aa4b1" stroke-width="1"/>`;
}
function balcaoAtendimento(cor: string, sobre: string) {
  return `${sombraChao(180)}<rect x="-90" y="-80" width="180" height="80" fill="${cor}" ${cc()}/><rect x="-90" y="-80" width="180" height="80" fill="url(#luz)"/><rect x="-96" y="-88" width="192" height="10" fill="#f4f1e8" ${cc()}/><g transform="translate(40 -88)">${sobre}</g>`;
}
function relogio() {
  return `<circle cx="22" cy="22" r="22" fill="#fff" ${contorno()}/><path d="M22 22 V8 M22 22 L32 28" ${contorno(2)}/>`;
}
function caixaEletronico() {
  return `${sombraChao(70)}<rect x="-34" y="-140" width="68" height="140" rx="4" fill="#2c3e50" ${cc()}/><rect x="-24" y="-126" width="48" height="34" fill="#9cc2e6" ${contorno(1)}/><rect x="-20" y="-80" width="40" height="24" fill="#3d5468" ${contorno(1)}/><rect x="-14" y="-46" width="28" height="4" fill="#111"/>`;
}
function esteira() {
  return `${sombraChao(140)}<path d="M-70 -14 L60 -14 L70 0 L-70 0 Z" fill="#2b2b2b" ${cc()}/><rect x="40" y="-110" width="6" height="96" fill="#9aa4b1" ${cc()}/><rect x="26" y="-118" width="40" height="14" rx="3" fill="#2b2b2b" ${cc()}/><rect x="32" y="-115" width="18" height="7" fill="#4dd0a1"/>`;
}
function halteres() {
  const um = (x: number) => `<rect x="${x - 14}" y="-10" width="28" height="4" fill="#666"/><rect x="${x - 18}" y="-16" width="8" height="16" rx="2" fill="#2b2b2b" ${contorno(1.2)}/><rect x="${x + 10}" y="-16" width="8" height="16" rx="2" fill="#2b2b2b" ${contorno(1.2)}/>`;
  return `${sombraChao(90)}${um(-24)}${um(24)}`;
}
function arvoreGrande(s = 1) {
  return `<g transform="scale(${s})">${sombraChao(110)}<path d="M-10 0 L-8 -90 L8 -90 L10 0 Z" fill="#7a4f33" ${cc()}/><path d="M-10 0 L-8 -90 L8 -90 L10 0 Z" fill="url(#luz)"/>
    <circle cx="-30" cy="-110" r="34" fill="#4aa24d" ${cc()}/><circle cx="28" cy="-112" r="32" fill="#3e8e41" ${cc()}/><circle cx="0" cy="-146" r="38" fill="#4aa24d" ${cc()}/><circle cx="0" cy="-120" r="30" fill="#3e8e41"/></g>`;
}
function banco() {
  return `${sombraChao(130)}<rect x="-64" y="-66" width="128" height="10" rx="2" fill="#a86d42" ${cc()}/><rect x="-64" y="-50" width="128" height="10" rx="2" fill="#a86d42" ${cc()}/><rect x="-66" y="-36" width="132" height="10" rx="2" fill="#a86d42" ${cc()}/>
    <rect x="-56" y="-26" width="6" height="26" fill="#3a2e26"/><rect x="50" y="-26" width="6" height="26" fill="#3a2e26"/>`;
}
function fogueira() {
  return `${sombraChao(80)}<path d="M-30 -4 L30 -14 M-30 -14 L30 -4" stroke="#7a4f33" stroke-width="6" stroke-linecap="round"/><path d="M0 -70 Q22 -40 14 -14 Q0 -4 -14 -14 Q-22 -40 0 -70 Z" fill="#f2994a" ${contorno(1.5)}/><path d="M0 -46 Q10 -30 6 -16 Q0 -12 -6 -16 Q-10 -30 0 -46 Z" fill="#ffd166"/>`;
}
