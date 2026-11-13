// Motor de arte · pessoas em camadas. O mesmo desenho serve a todo mundo do jogo:
// corpo (altura e peso de verdade, músculo, formas de homem e de mulher a partir da
// puberdade), rosto (formato, olhos, nariz, boca, sobrancelha), cabelo, barba, roupa,
// tatuagens e acessórios. Os pés ficam em y = 0; quem posiciona é a cena.
//
// Regras para os "adereços" não ficarem soltos:
// - o cabelo da frente é uma calota que cobre o topo da cabeça até a linha do cabelo
//   (nunca uma faixa solta na testa);
// - a barba segue a linha do queixo;
// - a tatuagem é desenhada recortada na pele (clipPath do braço, do pescoço ou da
//   perna), então nunca sai do corpo.

import { CONTORNO, DEFS, contorno, sombra, tom } from './estilo';

export type TipoCabelo = 'cacheado' | 'crespo' | 'liso-curto' | 'liso-longo' | 'coque' | 'raspado' | 'careca' | 'tranças'
  | 'franja' | 'chanel' | 'rabo' | 'dreads' | 'moicano';
export const CABELOS: TipoCabelo[] = ['cacheado', 'crespo', 'liso-curto', 'liso-longo', 'coque', 'raspado', 'careca', 'tranças', 'franja', 'chanel', 'rabo', 'dreads', 'moicano'];
export type FormatoOlho = 'redondo' | 'amendoado' | 'puxado';
export type Sobrancelha = 'fina' | 'media' | 'grossa';
export type Labios = 'finos' | 'medios' | 'cheios';
export type Orelhas = 'pequenas' | 'medias' | 'grandes';
export type Acessorio = 'brinco' | 'argola' | 'piercing-nariz' | 'colar' | 'bone';
export const ACESSORIOS: Acessorio[] = ['brinco', 'argola', 'piercing-nariz', 'colar', 'bone'];
export type TipoBarba = 'nenhuma' | 'cheia' | 'cavanhaque' | 'bigode' | 'por-fazer';
export type FormatoRosto = 'oval' | 'redondo' | 'quadrado' | 'fino';
export type Nariz = 'pequeno' | 'medio' | 'largo';
export type Humor = 'feliz' | 'neutro' | 'triste' | 'cansado' | 'bravo';
export type LocalTatuagem = 'braco-esquerdo' | 'braco-direito' | 'pescoco' | 'perna';
export type ModeloTatuagem = 'flor' | 'ancora' | 'tribal' | 'coracao' | 'estrelas';
export const MODELOS_TATUAGEM: ModeloTatuagem[] = ['flor', 'ancora', 'tribal', 'coracao', 'estrelas'];
export type Roupa = 'casa' | 'escola' | 'social' | 'esporte' | 'jaleco' | 'festa' | 'pijama';

/** Tudo o que se vê de uma pessoa. O motor do jogo guarda isso; a arte só desenha. */
export interface Aparencia {
  sexo: 'feminino' | 'masculino';
  idadeAnos: number;
  alturaCm: number;
  pesoKg: number;
  /** 0 a 1 */
  musculo: number;
  pele: string;
  olhos: string;
  rosto: FormatoRosto;
  nariz: Nariz;
  cabelo: TipoCabelo;
  corCabelo: string;
  barba: TipoBarba;
  sardas: boolean;
  oculos: boolean;
  tatuagens: LocalTatuagem[];
  /** Qual desenho em cada lugar (sem isso, um modelo fixo por pessoa). */
  modelosTatuagem?: Partial<Record<LocalTatuagem, ModeloTatuagem>>;
  /** Cor da roupa (a peça vem do contexto). */
  corRoupa: string;
  // Variações do rosto (sem elas, o padrão).
  formatoOlho?: FormatoOlho;
  sobrancelha?: Sobrancelha;
  labios?: Labios;
  orelhas?: Orelhas;
  /** Pinta no rosto. */
  pinta?: boolean;
  /** Covinhas quando sorri. */
  covinhas?: boolean;
  acessorios?: Acessorio[];
}

export interface OpcoesDesenho {
  humor?: Humor;
  roupa?: Roupa;
  /** 1 olha para a direita; -1 para a esquerda (só espelha, a luz continua da esquerda). */
  virada?: 1 | -1;
  semSombra?: boolean;
}

/** Pixels por centímetro no palco (escala 1). */
const PX_CM = 0.95;
/** Contador para ids de recorte únicos no documento. */
let seq = 0;

/** Proporção da cabeça pelo tamanho do corpo. Estilizado: maior que a real, para o rosto ter expressão. */
function alturaCabeca(idade: number): number {
  if (idade < 2) return 0.34;
  if (idade < 6) return 0.27;
  if (idade < 12) return 0.23;
  if (idade < 16) return 0.2;
  return 0.18;
}

const limitar01 = (x: number) => Math.max(0, Math.min(1, x));
function misturar(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const c = [16, 8, 0].map((s) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}
function hash(s: string): number { let h = 7; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; }

const TINTA = '#24365c';
const TINTA2 = '#b23a48';
/** Desenho de tatuagem centrado em (0,0), cabendo num quadrado de lado s. */
function desenhoTatuagem(m: ModeloTatuagem, s: number): string {
  const u = s / 10;
  const tr = `stroke="${TINTA}" stroke-width="${Math.max(0.8, u * 0.9)}" fill="none" stroke-linecap="round" stroke-linejoin="round"`;
  switch (m) {
    case 'flor':
      return `${[0, 72, 144, 216, 288].map((r) => `<ellipse cx="0" cy="${-2.2 * u}" rx="${1.5 * u}" ry="${2.2 * u}" transform="rotate(${r})" fill="${TINTA2}" opacity="0.85"/>`).join('')}<circle r="${1.1 * u}" fill="${TINTA}"/>`;
    case 'ancora':
      return `<path d="M0 ${-4 * u} V${4 * u} M${-2.5 * u} ${-1.5 * u} H${2.5 * u} M${-3.5 * u} ${1.5 * u} Q${-3 * u} ${4.5 * u} 0 ${4 * u} Q${3 * u} ${4.5 * u} ${3.5 * u} ${1.5 * u}" ${tr}/><circle cy="${-4.6 * u}" r="${0.9 * u}" ${tr}/>`;
    case 'tribal':
      return `<path d="M${-4 * u} ${-4 * u} Q0 ${-2 * u} ${4 * u} ${-4 * u} M${-4 * u} 0 Q0 ${2 * u} ${4 * u} 0 M${-4 * u} ${4 * u} Q0 ${6 * u} ${4 * u} ${4 * u}" ${tr} stroke-width="${u * 1.4}"/>`;
    case 'coracao':
      return `<path d="M0 ${3.5 * u} C${-5 * u} 0 ${-3.5 * u} ${-4 * u} 0 ${-1.5 * u} C${3.5 * u} ${-4 * u} ${5 * u} 0 0 ${3.5 * u} Z" fill="${TINTA2}" stroke="${TINTA}" stroke-width="${Math.max(0.6, u * 0.6)}"/>`;
    case 'estrelas': {
      const est = (x: number, y: number, r: number) => `<path d="M${x} ${y - r} L${x + r * 0.3} ${y - r * 0.3} L${x + r} ${y} L${x + r * 0.3} ${y + r * 0.3} L${x} ${y + r} L${x - r * 0.3} ${y + r * 0.3} L${x - r} ${y} L${x - r * 0.3} ${y - r * 0.3} Z" fill="${TINTA}"/>`;
      return est(-1.5 * u, -2 * u, 2.4 * u) + est(2 * u, 2.5 * u, 1.6 * u);
    }
  }
}

export function desenharPessoa(a: Aparencia, o: OpcoesDesenho = {}): string {
  const id = `ps${seq++}`;
  const humor = o.humor ?? 'neutro';
  const roupa = o.roupa ?? 'casa';
  const idade = a.idadeAnos;
  const H = a.alturaCm * PX_CM;
  const cab = H * alturaCabeca(idade);
  const imc = a.pesoKg / ((a.alturaCm / 100) ** 2);
  const W = Math.max(0.8, Math.min(1.7, 0.4 + imc / 36));
  const crianca = idade < 12;
  const sentado = idade < 1.5;
  const escalaTronco = crianca ? 0.82 : 1;
  const mus = 1 + a.musculo * 0.35;
  const fem = a.sexo === 'feminino';
  // Puberdade: de 11 a 16 anos o corpo vai ganhando as formas de adulto.
  const pub = limitar01((idade - 11) / 5);
  const formaF = fem ? pub : 0;
  const formaM = fem ? 0 : pub;

  // ---- Medidas do corpo (de baixo para cima) ----
  const pernaReal = (H - cab) * (crianca ? 0.44 : 0.5);
  const tronco = (H - cab) - pernaReal - 4;
  const perna = sentado ? 9 * escalaTronco * (0.75 + W * 0.3) : pernaReal;
  const ombro = 18 * W * escalaTronco * (1 + formaM * 0.2 - formaF * 0.12) * (a.musculo > 0.3 ? mus * 0.95 : 1);
  const quadril = 16 * W * escalaTronco * (1 + formaF * 0.3 - formaM * 0.06);
  const fatorBarriga = Math.max(0.85, Math.min(1.5, 0.7 + (imc - 18) / 26));
  const cintura = quadril * (1 - formaF * 0.3 - formaM * 0.02) * fatorBarriga;
  const busto = formaF * (2 + W * 1.6);
  const yQuadril = -perna;
  const yOmbro = yQuadril - tronco;
  const yBusto = yOmbro + tronco * 0.34;
  const yCintura = yOmbro + tronco * 0.6;
  const yPescoco = yOmbro - 3;
  // Bebê sentado: corpo em pera, cabeça apoiada nele.
  const bw = cab * 0.62, bh = cab * 0.95;
  const yCabeca = sentado ? -bh * 0.92 - cab * 0.36 : yPescoco - cab * 0.5;
  // O rosto é desenhado numa cabeça-padrão de 28px e escalado.
  const CAB = 28;
  const k = cab / CAB;
  const rx = CAB * 0.42 * (a.rosto === 'redondo' ? 1.08 : a.rosto === 'fino' ? 0.9 : a.rosto === 'quadrado' ? 1.04 : 1);
  const ry = CAB * 0.5;
  const bracoW = 7 * escalaTronco * (0.8 + W * 0.25) * mus * (1 - formaF * 0.1);
  const pernaW = 9 * escalaTronco * (0.75 + W * 0.3);

  const pele = a.pele;
  const peleSombra = tom(pele, -0.18);
  const cor = roupa === 'jaleco' ? '#f4f6f8' : a.corRoupa;
  const corEscura = tom(cor, -0.25);
  const calca = roupa === 'social' ? '#2b2f3a' : roupa === 'jaleco' ? '#cfd8dc' : roupa === 'esporte' ? '#222831' : roupa === 'pijama' ? tom(cor, 0.35) : '#3c5a80';
  const mangaCurta = roupa !== 'social' && roupa !== 'jaleco' && roupa !== 'pijama';
  const short = (crianca && roupa === 'casa') || roupa === 'esporte';
  const vestido = fem && (roupa === 'festa' || (crianca && roupa === 'escola'));
  const c = contorno();
  const cc = a.corCabelo;
  const modelo = (l: LocalTatuagem): ModeloTatuagem =>
    a.modelosTatuagem?.[l] ?? MODELOS_TATUAGEM[hash(a.pele + a.olhos + l) % MODELOS_TATUAGEM.length] as ModeloTatuagem;
  /** Tatuagem recortada dentro de um retângulo de pele. */
  const tatuar = (l: LocalTatuagem, rx0: number, ry0: number, w: number, h: number, cx: number, cy: number, s: number) => {
    const cid = `${id}-${l}`;
    return `<clipPath id="${cid}"><rect x="${rx0}" y="${ry0}" width="${w}" height="${h}" rx="${w / 2}"/></clipPath>
      <g clip-path="url(#${cid})" opacity="0.9"><g transform="translate(${cx} ${cy})">${desenhoTatuagem(modelo(l), s)}</g></g>`;
  };

  // ---- Pernas e pés ----
  const pernaDirX = quadril * 0.55 - pernaW / 2;
  const pernas = sentado
    ? `<rect x="${-quadril - 2}" y="${-pernaW}" width="${pernaReal * 0.9}" height="${pernaW}" rx="${pernaW / 2}" fill="${calca}" ${c}/>
       <rect x="${-quadril * 0.2}" y="${-pernaW}" width="${pernaReal * 0.9}" height="${pernaW}" rx="${pernaW / 2}" fill="${tom(calca, -0.12)}" ${c}/>
       <circle cx="${-quadril - 2 + pernaReal * 0.9}" cy="${-pernaW / 2}" r="${pernaW * 0.55}" fill="${pele}" ${c}/><circle cx="${-quadril * 0.2 + pernaReal * 0.9}" cy="${-pernaW / 2}" r="${pernaW * 0.55}" fill="${peleSombra}" ${c}/>`
    : vestido || short
    ? `<rect x="${-quadril * 0.55 - pernaW / 2}" y="${-perna}" width="${pernaW}" height="${perna}" rx="${pernaW / 2}" fill="${pele}" ${c}/>
       <rect x="${pernaDirX}" y="${-perna}" width="${pernaW}" height="${perna}" rx="${pernaW / 2}" fill="${peleSombra}" ${c}/>
       ${short ? `<path d="M${-quadril} ${yQuadril - 2} L${quadril} ${yQuadril - 2} L${quadril + 2} ${-perna * 0.55} L2 ${-perna * 0.55} L0 ${-perna * 0.7} L-2 ${-perna * 0.55} L${-quadril - 2} ${-perna * 0.55} Z" fill="${calca}" ${c}/>` : ''}`
    : `<path d="M${-quadril} ${yQuadril - 2} L${-quadril + 1} -6 L-2 -6 L0 ${-perna * 0.8} L2 -6 L${quadril - 1} -6 L${quadril} ${yQuadril - 2} Z" fill="${calca}" ${c}/>
       <path d="M2 ${-perna * 0.78} L2 -6 L${quadril - 1} -6 L${quadril} ${yQuadril}" fill="#000" opacity="0.12"/>`;
  const pernaTat = a.tatuagens.includes('perna') && (short || vestido) && !sentado && idade >= 16
    ? tatuar('perna', pernaDirX, -perna * 0.5, pernaW, perna * 0.42, quadril * 0.55, -perna * 0.3, pernaW * 0.9) : '';
  const pes = sentado ? '' : `<path d="M${-quadril + 0.5} -7 h${quadril - 1} v5 q0 3 -3 3 h${-quadril + 6} q-4 0 -4 -4 Z" fill="#3a2e26" ${c}/>
    <path d="M1 -7 h${quadril - 1} v5 q0 3 -3 3 h${-quadril + 6} q-2 0 -2 -3 Z" fill="#3a2e26" ${c}/>`;

  // ---- Tronco (com a roupa): ombro → busto → cintura → quadril ----
  const lado = (s: 1 | -1, baixo: number, larguraBaixo: number) =>
    `C${s * (ombro + busto * 0.5)} ${yBusto - tronco * 0.08} ${s * (cintura + busto * 0.9)} ${yBusto + tronco * 0.06} ${s * cintura} ${yCintura} Q${s * larguraBaixo * 1.02} ${baixo - tronco * 0.18} ${s * larguraBaixo} ${baixo}`;
  const ladoVolta = (baixo: number, larguraBaixo: number) =>
    `Q${-larguraBaixo * 1.02} ${baixo - tronco * 0.18} ${-cintura} ${yCintura} C${-(cintura + busto * 0.9)} ${yBusto + tronco * 0.06} ${-(ombro + busto * 0.5)} ${yBusto - tronco * 0.08} ${-ombro} ${yOmbro + 3}`;
  const troncoForma = vestido
    ? `M${-ombro} ${yOmbro + 3} Q0 ${yOmbro - 3} ${ombro} ${yOmbro + 3} ${lado(1, yQuadril + 3, quadril)} L${quadril * 1.5} ${-perna * 0.45} L${-quadril * 1.5} ${-perna * 0.45} L${-quadril} ${yQuadril + 3} ${ladoVolta(yQuadril + 3, quadril)} Z`
    : `M${-ombro} ${yOmbro + 3} Q0 ${yOmbro - 3} ${ombro} ${yOmbro + 3} ${lado(1, yQuadril + 3, quadril)} L${-quadril} ${yQuadril + 3} ${ladoVolta(yQuadril + 3, quadril)} Z`;
  // Duas curvas discretas sob o busto (roupa), só a partir da adolescência.
  const bustoLinha = busto > 1.5
    ? `<g fill="none" stroke="${corEscura}" stroke-width="1" stroke-linecap="round" opacity="0.6"><path d="M${-ombro * 0.55} ${yBusto} Q${-ombro * 0.32} ${yBusto + busto * 0.7} ${-2} ${yBusto + 0.5}"/><path d="M${ombro * 0.55} ${yBusto} Q${ombro * 0.32} ${yBusto + busto * 0.7} ${2} ${yBusto + 0.5}"/></g>`
    : '';
  const jaleco = roupa === 'jaleco' ? `<path d="M0 ${yOmbro} L0 ${yQuadril + 2}" ${c}/><path d="M-6 ${yOmbro} l6 10 l6 -10" fill="none" ${c}/>` : '';
  const gola = roupa === 'social' ? `<path d="M-6 ${yOmbro - 1} l6 8 l6 -8" fill="#fff" ${c}/>`
    : fem && pub > 0.3 ? `<path d="M-6 ${yOmbro} q6 7 12 0" fill="none" ${contorno(1.4)}/>`
    : `<path d="M-5 ${yOmbro} q5 4 10 0" fill="none" ${contorno(1.4)}/>`;
  const tronco_ = `<path d="${troncoForma}" fill="${cor}" ${c}/><path d="${troncoForma}" fill="url(#luz)"/>${bustoLinha}${gola}${jaleco}`;

  // ---- Braços (manga e antebraço de pele, onde as tatuagens ficam) ----
  const bracoComp = tronco * 0.95;
  const braco = (s: -1 | 1) => {
    const x = s * (ombro + bracoW * 0.25);
    const manga = mangaCurta ? bracoComp * 0.38 : bracoComp * 0.92;
    const local: LocalTatuagem = s === -1 ? 'braco-esquerdo' : 'braco-direito';
    const peleBraco = s === 1 ? peleSombra : pele;
    const yTopo = yOmbro + 2;
    const tat = a.tatuagens.includes(local) && mangaCurta && idade >= 16
      ? tatuar(local, x - bracoW / 2, yOmbro + manga, bracoW, bracoComp - manga, x, yOmbro + manga + (bracoComp - manga) * 0.45, bracoW * 1.1) : '';
    return `<g transform="rotate(${s * 6} ${x} ${yTopo})">
      <rect x="${x - bracoW / 2}" y="${yTopo}" width="${bracoW}" height="${bracoComp}" rx="${bracoW / 2}" fill="${peleBraco}" ${c}/>
      ${tat}
      <rect x="${x - bracoW / 2 - 0.5}" y="${yOmbro}" width="${bracoW + 1}" height="${manga}" rx="${bracoW / 2}" fill="${s === 1 ? corEscura : cor}" ${c}/>
      <circle cx="${x}" cy="${yOmbro + bracoComp + 2}" r="${bracoW * 0.62}" fill="${peleBraco}" ${c}/>
    </g>`;
  };

  // ---- Pescoço ----
  const pescW = cab * (formaM > 0.5 ? 0.3 : 0.24);
  const pescY = yPescoco - cab * 0.14;
  const pescH = cab * 0.22;
  const pescoco = `<rect x="${-pescW / 2}" y="${pescY}" width="${pescW}" height="${pescH}" fill="${peleSombra}" ${c}/>
    ${a.tatuagens.includes('pescoco') && idade >= 16 ? tatuar('pescoco', -pescW / 2, pescY, pescW, pescH, pescW * 0.15, pescY + pescH * 0.55, pescH * 0.9) : ''}`;

  // ---- Rosto (cabeça-padrão: centro em 0, topo em -ry, queixo em +ry) ----
  const olhoY = ry * 0.04;
  const olhoDx = rx * 0.4;
  const corOlho = misturar(a.olhos, '#1a120c', 0.35);
  const rOlho = sentado ? 2.4 : crianca ? 2.1 : 1.8;
  const formatoOlho = a.formatoOlho ?? 'redondo';
  const brilho = (x: number) => `<circle cx="${x + 0.6}" cy="${olhoY - 0.7}" r="0.6" fill="#fff"/>`;
  const olho = (x: number) => {
    if (humor === 'cansado') return `<path d="M${x - 2.4} ${olhoY + 0.5} q2.4 1.2 4.8 0" fill="none" stroke="${CONTORNO}" stroke-width="1.5" stroke-linecap="round"/>`;
    const fora = x < 0 ? -1 : 1;
    if (formatoOlho === 'amendoado') return `<ellipse cx="${x}" cy="${olhoY}" rx="${rOlho * 1.3}" ry="${rOlho * (humor === 'feliz' ? 0.85 : 1)}" transform="rotate(${fora * -8} ${x} ${olhoY})" fill="${corOlho}"/>${brilho(x)}`;
    if (formatoOlho === 'puxado') {
      const w = rOlho * 1.45;
      return `<path d="M${x - w} ${olhoY + 0.4} Q${x - fora * 0.6} ${olhoY - rOlho * 1.3} ${x + w} ${olhoY - 0.3} Q${x} ${olhoY + rOlho * 0.75} ${x - w} ${olhoY + 0.4} Z" fill="${corOlho}"/>${brilho(x)}`;
    }
    return `<ellipse cx="${x}" cy="${olhoY}" rx="${rOlho}" ry="${rOlho * (humor === 'feliz' ? 1.1 : 1.3)}" fill="${corOlho}"/>${brilho(x)}`;
  };
  // Cílios discretos para mulheres adolescentes e adultas.
  const cilios = fem && pub > 0.4 && humor !== 'cansado'
    ? `<path d="M${-olhoDx - rOlho} ${olhoY - 1.3} l-1.4 -1 M${olhoDx + rOlho} ${olhoY - 1.3} l1.4 -1" stroke="${CONTORNO}" stroke-width="1" stroke-linecap="round"/>` : '';
  const olhos = olho(-olhoDx) + olho(olhoDx) + cilios;
  const sobInc = humor === 'bravo' ? 3 : humor === 'triste' ? -2 : 0;
  const corSob = tom(misturar(cc, '#3a2e26', 0.3), -0.1);
  const espSob = (fem ? 1.2 : formaM > 0.5 ? 1.8 : 1.4) * ({ fina: 0.7, media: 1, grossa: 1.5 }[a.sobrancelha ?? 'media']) * (sentado ? 0.6 : 1);
  const sobrancelhas = `<path d="M${-olhoDx - 3.5} ${olhoY - 5 + sobInc * 0.3} q3.5 ${-1.8 - sobInc * 0.3} 7 ${sobInc * 0.6}" fill="none" stroke="${corSob}" stroke-width="${espSob}" stroke-linecap="round"/>
    <path d="M${olhoDx - 3.5} ${olhoY - 5 + sobInc * 0.3} q3.5 ${-1.8 - sobInc * 0.3} 7 ${-sobInc * 0.6}" fill="none" stroke="${corSob}" stroke-width="${espSob}" stroke-linecap="round"/>`;
  const narizL = a.nariz === 'largo' ? 3.2 : a.nariz === 'pequeno' ? 1.8 : 2.5;
  // Nariz curto (termina bem acima da boca, deixando lugar para o bigode).
  const nariz = `<path d="M0.4 ${olhoY + 2} q${-narizL * 0.9} ${narizL * 0.7 + 1} 0 ${narizL * 0.7 + 1.6} q${narizL * 0.5} 0 ${narizL * 0.75} -0.6" fill="none" stroke="${peleSombra}" stroke-width="1.3" stroke-linecap="round"/>`;
  const bocaY = ry * 0.68;
  const labio = fem && pub > 0.4 ? '#b5544a' : '#9b3b31';
  const boca = humor === 'feliz' ? `<path d="M-4.5 ${bocaY - 1} q4.5 5 9 0 Z" fill="${labio}" ${contorno(1.2)}/>`
    : humor === 'triste' ? `<path d="M-4 ${bocaY + 1.5} q4 -3 8 0" fill="none" ${contorno(1.4)}/>`
    : humor === 'bravo' ? `<path d="M-4 ${bocaY + 0.5} h8" ${contorno(1.5)}/>`
    : a.labios === 'cheios' && !crianca ? `<path d="M-3.8 ${bocaY - 0.3} q3.8 -1.4 7.6 0 q-3.8 3.4 -7.6 0 Z" fill="${tom(labio, 0.15)}" ${contorno(1)}/><path d="M-3.8 ${bocaY - 0.3} q3.8 1 7.6 0" fill="none" ${contorno(1)}/>`
    : `<path d="M-3.5 ${bocaY} q3.5 1.8 7 0" fill="none" stroke="${fem && pub > 0.4 ? labio : CONTORNO}" stroke-width="${a.labios === 'finos' ? 1.1 : 1.4}" stroke-linecap="round"/>`;
  const covinhas = a.covinhas && humor === 'feliz' ? `<path d="M-5.8 ${bocaY - 1.5} q-0.6 1 0 2 M5.8 ${bocaY - 1.5} q0.6 1 0 2" stroke="${peleSombra}" stroke-width="1" fill="none" stroke-linecap="round"/>` : '';
  const pinta = a.pinta ? `<circle cx="${rx * 0.46}" cy="${bocaY - 2.4}" r="0.75" fill="#4a2f22"/>` : '';
  const bochecha = crianca || (fem && humor === 'feliz') ? `<circle cx="${-rx * 0.62}" cy="${bocaY - 3}" r="2.6" fill="#e98a7a" opacity="0.35"/><circle cx="${rx * 0.62}" cy="${bocaY - 3}" r="2.6" fill="#e98a7a" opacity="0.35"/>` : '';
  const sardas = a.sardas ? [-0.58, -0.44, -0.3, 0.3, 0.44, 0.58].map((f, i) => `<circle cx="${rx * f}" cy="${bocaY - 5.5 + (i % 2) * 1.6}" r="0.6" fill="#8a4b2d" opacity="0.55"/>`).join('') : '';
  const rugas = idade >= 55 ? `<path d="M${-rx * 0.78} ${olhoY - 0.5} l-2.5 -1 M${rx * 0.78} ${olhoY - 0.5} l2.5 -1 M${-rx * 0.42} ${bocaY - 3} q-1.5 2.5 -0.5 4.5 M${rx * 0.42} ${bocaY - 3} q1.5 2.5 0.5 4.5" stroke="${peleSombra}" stroke-width="1" fill="none" stroke-linecap="round"/>` : '';
  const oculos = a.oculos
    ? `<g fill="#ffffff26" stroke="${CONTORNO}" stroke-width="1.1" vector-effect="non-scaling-stroke"><rect x="${-olhoDx - 3.6}" y="${olhoY - 3}" width="7.2" height="5.8" rx="2.2"/><rect x="${olhoDx - 3.6}" y="${olhoY - 3}" width="7.2" height="5.8" rx="2.2"/><path d="M${-olhoDx + 3.6} ${olhoY - 0.8} Q0 ${olhoY - 2} ${olhoDx - 3.6} ${olhoY - 0.8}" fill="none"/></g>` : '';
  const queixo = a.rosto === 'quadrado'
    ? `M${-rx} 0 Q${-rx} ${ry * 0.95} 0 ${ry} Q${rx} ${ry * 0.95} ${rx} 0 Q${rx} ${-ry} 0 ${-ry} Q${-rx} ${-ry} ${-rx} 0 Z`
    : `M${-rx} 0 Q${-rx} ${ry * 0.85} 0 ${ry} Q${rx} ${ry * 0.85} ${rx} 0 Q${rx} ${-ry} 0 ${-ry} Q${-rx} ${-ry} ${-rx} 0 Z`;
  const fo = { pequenas: 0.8, medias: 1, grandes: 1.3 }[a.orelhas ?? 'medias'];
  const orelhas = `<ellipse cx="${-rx - 0.5 - (fo - 1) * 2}" cy="${olhoY + 2}" rx="${2.6 * fo}" ry="${4 * fo}" fill="${pele}" ${c}/><ellipse cx="${rx + 0.5 + (fo - 1) * 2}" cy="${olhoY + 2}" rx="${2.6 * fo}" ry="${4 * fo}" fill="${peleSombra}" ${c}/>`;
  // Acessórios do rosto: brinco no lóbulo, argola, piercing no nariz.
  const ac = a.acessorios ?? [];
  const lobY = olhoY + 2 + 4 * fo;
  const brincos = ac.includes('argola')
    ? [-1, 1].map((s) => `<circle cx="${s * (rx + 0.6)}" cy="${lobY + 1.6}" r="1.9" fill="none" stroke="#d4a017" stroke-width="1"/>`).join('')
    : ac.includes('brinco') ? [-1, 1].map((s) => `<circle cx="${s * (rx + 0.6)}" cy="${lobY - 0.3}" r="1.1" fill="#f2d16b" ${contorno(0.6)}/>`).join('') : '';
  const piercing = ac.includes('piercing-nariz') && idade >= 14 ? `<circle cx="-2" cy="${olhoY + 5.2}" r="0.55" fill="#cfd6dc" ${contorno(0.4)}/>` : '';

  // ---- Cabelo ----
  // Calota: cobre o topo da cabeça e desce pelas têmporas até `t`; a borda de baixo
  // é a linha do cabelo, com uma risca de lado (assimétrica, mais natural).
  const linha = -ry * 0.58;
  const calota = (t: number, volume = 0, franja = true) =>
    `M${-rx * 1.05} ${t} Q${-rx * 1.12} ${-ry * 1.2 - volume} 0 ${-ry * 1.14 - volume} Q${rx * 1.12} ${-ry * 1.2 - volume} ${rx * 1.05} ${t}`
    + (franja
      ? ` L${rx * 0.9} ${t} Q${rx * 0.88} ${linha + 2} ${rx * 0.3} ${linha} Q${-rx * 0.35} ${linha - 2.5} ${-rx * 0.9} ${Math.min(t, linha + 5)} L${-rx * 0.9} ${t} Z`
      : ` L${rx * 0.9} ${t} Q${rx * 0.85} ${linha} 0 ${linha - 0.5} Q${-rx * 0.85} ${linha} ${-rx * 0.9} ${t} Z`);
  const cs = `fill="${cc}" ${c}`;
  let atras = '';
  let frente = '';
  switch (sentado ? 'bebe' : a.cabelo) {
    case 'bebe': {
      // Bebê: só um tufinho (cachinhos para quem tem cabelo enrolado).
      const enrolado = a.cabelo === 'crespo' || a.cabelo === 'cacheado' || a.cabelo === 'tranças' || a.cabelo === 'dreads';
      frente = enrolado
        ? `<g ${cs}>${[-0.45, -0.15, 0.15, 0.45].map((f, i) => `<circle cx="${f * rx}" cy="${-ry * (0.92 - (i % 2) * 0.06)}" r="${rx * 0.2}"/>`).join('')}</g>`
        : `<path d="M-1 ${-ry * 0.98} q2.5 -3.5 4.5 -1 q1 2 -1.5 2.2" fill="none" stroke="${cc}" stroke-width="1.6" stroke-linecap="round"/>`;
      break;
    }
    case 'franja':
      atras = `<path d="M${-rx * 1.1} ${-ry * 0.3} Q${-rx * 1.14} ${-ry * 1.25} 0 ${-ry * 1.14} Q${rx * 1.14} ${-ry * 1.25} ${rx * 1.1} ${-ry * 0.3} L${rx * 1.18} ${ry * 0.95} L${-rx * 1.18} ${ry * 0.95} Z" ${cs}/>`;
      frente = `<path d="M${-rx * 1.06} ${ry * 0.6} Q${-rx * 1.14} ${-ry * 1.22} 0 ${-ry * 1.15} Q${rx * 1.14} ${-ry * 1.22} ${rx * 1.06} ${ry * 0.6} L${rx * 0.92} ${ry * 0.6} L${rx * 0.9} ${-ry * 0.42} L${-rx * 0.9} ${-ry * 0.42} L${-rx * 0.92} ${ry * 0.6} Z" ${cs}/>`;
      break;
    case 'chanel':
      atras = `<path d="M${-rx * 1.12} ${-ry * 0.3} Q${-rx * 1.16} ${-ry * 1.25} 0 ${-ry * 1.15} Q${rx * 1.16} ${-ry * 1.25} ${rx * 1.12} ${-ry * 0.3} Q${rx * 1.3} ${ry * 0.6} ${rx * 1.2} ${ry * 0.82} L${-rx * 1.2} ${ry * 0.82} Q${-rx * 1.3} ${ry * 0.6} ${-rx * 1.12} ${-ry * 0.3} Z" ${cs}/>`;
      frente = `<path d="${calota(ry * 0.72)}" ${cs}/>`;
      break;
    case 'rabo':
      atras = `<path d="M${rx * 0.5} ${-ry * 0.95} Q${rx * 1.9} ${-ry * 0.7} ${rx * 1.5} ${ry * 0.9} Q${rx * 1.3} ${ry * 0.2} ${rx * 0.7} ${-ry * 0.4} Z" ${cs}/>`;
      frente = `<path d="${calota(-ry * 0.08, 0, false)}" ${cs}/><circle cx="${rx * 0.92}" cy="${-ry * 0.72}" r="1.6" fill="${tom(a.corRoupa, -0.1)}" ${contorno(0.8)}/>`;
      break;
    case 'dreads':
      // Mechas com traço fino (contorno grosso em cada uma vira listra).
      atras = `<g fill="${cc}" stroke="${tom(cc, -0.35)}" stroke-width="0.7">${[-1.2, -0.88, -0.56, 0.56, 0.88, 1.2].map((f, i) => `<rect x="${f * rx - 2.3}" y="${-ry * 0.7}" width="4.6" height="${ry * (2.1 + (i % 2) * 0.25)}" rx="2.3"/>`).join('')}</g>`;
      frente = `<path d="${calota(-ry * 0.05, 1.5, false)}" ${cs}/><g ${cs}>${[-0.6, -0.2, 0.2, 0.6].map((f) => `<rect x="${f * rx - 1.6}" y="${linha - 1}" width="3.2" height="4" rx="1.6"/>`).join('')}</g>`;
      break;
    case 'moicano':
      frente = `<path d="${calota(-ry * 0.12, -1, false)}" fill="${misturar(cc, pele, 0.55)}" ${contorno(1)}/><path d="M-3.2 ${linha + 0.5} Q-3.6 ${-ry * 1.5} 0 ${-ry * 1.62} Q3.6 ${-ry * 1.5} 3.2 ${linha + 0.5} Z" ${cs}/>`;
      break;
    case 'liso-curto':
      atras = `<ellipse cx="0" cy="${-ry * 0.3}" rx="${rx * 1.08}" ry="${ry * 0.92}" ${cs}/>`;
      frente = `<path d="${calota(-ry * 0.05)}" ${cs}/>`;
      break;
    case 'liso-longo':
      atras = `<path d="M${-rx * 1.1} ${-ry * 0.2} Q${-rx * 1.12} ${-ry * 1.25} 0 ${-ry * 1.12} Q${rx * 1.12} ${-ry * 1.25} ${rx * 1.1} ${-ry * 0.2} Q${rx * 1.5} ${ry * 1.4} ${rx * 1.45} ${ry * 2.6} L${-rx * 1.45} ${ry * 2.6} Q${-rx * 1.5} ${ry * 1.4} ${-rx * 1.1} ${-ry * 0.2} Z" ${cs}/>`;
      frente = `<path d="${calota(ry * 0.45)}" ${cs}/>`;
      break;
    case 'cacheado': {
      const cachos = (pts: number[][], r: number) => pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('');
      atras = `<g ${cs}>${cachos([[-rx, -ry * 0.5], [-rx * 0.5, -ry * 0.95], [0, -ry * 1.08], [rx * 0.5, -ry * 0.95], [rx, -ry * 0.5]], rx * 0.5)}${fem || idade < 3 ? cachos([[-rx * 1.1, ry * 0.2], [rx * 1.1, ry * 0.2], [-rx * 1.0, ry * 0.85], [rx * 1.0, ry * 0.85]], rx * 0.42) : ''}</g>`;
      frente = `<path d="${calota(-ry * 0.05, 1, false)}" ${cs}/><g ${cs}>${cachos([[-rx * 0.62, linha + 0.5], [-rx * 0.2, linha - 0.8], [rx * 0.22, linha - 0.8], [rx * 0.64, linha + 0.5]], rx * 0.27)}</g>`;
      break;
    }
    case 'crespo':
      atras = `<ellipse cx="0" cy="${-ry * 0.42}" rx="${rx * 1.45}" ry="${ry * 1.02}" ${cs}/>`;
      frente = `<path d="${calota(-ry * 0.1, 2, false)}" ${cs}/>`;
      break;
    case 'coque':
      atras = `<circle cx="0" cy="${-ry * 1.22}" r="${rx * 0.42}" ${cs}/>`;
      frente = `<path d="${calota(-ry * 0.08, 0, false)}" ${cs}/>`;
      break;
    case 'tranças':
      atras = [-1, 1].map((s) => `<g ${cs}>${[0, 1, 2, 3, 4].map((i) => `<ellipse cx="${s * rx * 0.98}" cy="${ry * (0.15 + i * 0.42)}" rx="${rx * 0.2}" ry="${ry * 0.24}"/>`).join('')}</g>`).join('');
      frente = `<path d="${calota(-ry * 0.08, 0, false)}" ${cs}/>`;
      break;
    case 'raspado':
      // Cabelo bem baixo: a cor do cabelo misturada à pele, sem volume.
      frente = `<path d="${calota(-ry * 0.12, -1, false)}" fill="${misturar(cc, pele, 0.4)}" ${contorno(1)}/>`;
      break;
    case 'careca':
      frente = [-1, 1].map((s) => `<path d="M${s * rx * 1.02} ${ry * 0.12} Q${s * rx * 1.12} ${-ry * 0.2} ${s * rx * 0.86} ${-ry * 0.45} L${s * rx * 0.92} ${ry * 0.12} Z" fill="${cc}" ${contorno(1)}/>`).join('');
      break;
  }

  // Boné: cúpula sobre o cabelo e aba virada para o lado da luz.
  const bone = ac.includes('bone') && !sentado
    ? `<path d="M${-rx * 1.08} ${-ry * 0.42} Q${-rx * 1.1} ${-ry * 1.28} 0 ${-ry * 1.22} Q${rx * 1.1} ${-ry * 1.28} ${rx * 1.08} ${-ry * 0.42} Z" fill="${tom(a.corRoupa, 0.2)}" ${c}/><path d="M${-rx * 1.1} ${-ry * 0.42} Q${-rx * 1.5} ${-ry * 0.42} ${-rx * 1.75} ${-ry * 0.28} Q${-rx * 1.2} ${-ry * 0.22} ${rx * 0.2} ${-ry * 0.4} Z" fill="${tom(a.corRoupa, -0.05)}" ${c}/>`
    : '';

  // ---- Barba: segue a linha do queixo; bigode à parte ----
  // Bigode fino, entre a ponta do nariz e a boca.
  const bigode = (grosso: number) => `<path d="M-5 ${bocaY - 1} Q-2.5 ${bocaY - 3.4 - grosso} 0 ${bocaY - 2.6 - grosso * 0.6} Q2.5 ${bocaY - 3.4 - grosso} 5 ${bocaY - 1} Q0 ${bocaY - 1.8} -5 ${bocaY - 1} Z" fill="${cc}" ${contorno(0.9)}/>`;
  // Barba: da costeleta ao queixo, com a abertura da boca; recortada no rosto (nada vaza).
  const recorte = `${id}-rosto`;
  const barbaForma = `M${-rx * 1.05} ${olhoY + 2} Q${-rx * 1.08} ${ry} 0 ${ry * 1.12} Q${rx * 1.08} ${ry} ${rx * 1.05} ${olhoY + 2} L${rx * 0.72} ${olhoY + 3} Q${rx * 0.58} ${bocaY + 3} 0 ${bocaY + 2.6} Q${-rx * 0.58} ${bocaY + 3} ${-rx * 0.72} ${olhoY + 3} Z`;
  const naPele = (svg: string) => `<clipPath id="${recorte}"><path d="${queixo}"/></clipPath><g clip-path="url(#${recorte})">${svg}</g>`;
  const barba = a.barba === 'nenhuma' || idade < 17 || fem ? ''
    : a.barba === 'cheia' ? `${naPele(`<path d="${barbaForma}" fill="${cc}"/>`)}<path d="${queixo}" fill="none" ${contorno(1.1)}/>${bigode(0.6)}`
    : a.barba === 'cavanhaque' ? `${naPele(`<path d="M-3.6 ${bocaY + 2.2} Q0 ${bocaY + 1.4} 3.6 ${bocaY + 2.2} L3 ${ry * 1.1} L-3 ${ry * 1.1} Z" fill="${cc}"/>`)}${bigode(0)}`
    : a.barba === 'bigode' ? bigode(1)
    : naPele(`<path d="${barbaForma}" fill="${cc}" opacity="0.22"/>`);

  const cabeloAtras = `<g transform="translate(0 ${yCabeca}) scale(${k})">${atras}</g>`;
  const cabeca = `<g transform="translate(0 ${yCabeca}) scale(${k})">
    ${orelhas}${brincos}
    <path d="${queixo}" fill="${pele}" ${c}/>
    <path d="${queixo}" fill="url(#luz)"/>
    ${bochecha}${sardas}${pinta}${barba}${frente}${bone}${sobrancelhas}${olhos}${nariz}${piercing}${boca}${covinhas}${rugas}${oculos}
  </g>`;

  const colar = ac.includes('colar') && !sentado
    ? `<path d="M${-pescW * 0.9} ${yOmbro - 0.5} Q0 ${yOmbro + cab * 0.28} ${pescW * 0.9} ${yOmbro - 0.5}" fill="none" stroke="#d4a017" stroke-width="1.1"/><circle cx="0" cy="${yOmbro + cab * 0.15}" r="1.3" fill="#d4a017"/>` : '';

  if (sentado) {
    // Corpo de bebê: macacão em pera, perninhas para a frente, bracinhos curtos.
    const corpo = `M${-bw * 0.62} ${-bh} Q${-bw * 1.18} ${-bh * 0.45} ${-bw} ${-bh * 0.1} Q${-bw * 0.9} 0 0 0 Q${bw * 0.9} 0 ${bw} ${-bh * 0.1} Q${bw * 1.18} ${-bh * 0.45} ${bw * 0.62} ${-bh} Z`;
    const perninhas = [-1, 1].map((s) => `<ellipse cx="${s * bw * 0.62}" cy="${-bh * 0.1}" rx="${bw * 0.48}" ry="${bh * 0.17}" fill="${tom(cor, s === 1 ? -0.12 : 0)}" ${c}/><circle cx="${s * bw * 1.08}" cy="${-bh * 0.1}" r="${bh * 0.13}" fill="${s === 1 ? peleSombra : pele}" ${c}/>`).join('');
    const bracinhos = [-1, 1].map((s) => `<ellipse cx="${s * bw * 0.98}" cy="${-bh * 0.58}" rx="${bw * 0.2}" ry="${bh * 0.28}" transform="rotate(${s * -18} ${s * bw * 0.98} ${-bh * 0.58})" fill="${tom(cor, s === 1 ? -0.12 : 0)}" ${c}/><circle cx="${s * bw * 1.12}" cy="${-bh * 0.32}" r="${bh * 0.1}" fill="${s === 1 ? peleSombra : pele}" ${c}/>`).join('');
    return `<g transform="scale(${o.virada ?? 1} 1)">
      ${o.semSombra ? '' : sombra(0, 0, bw * 2.8)}
      ${cabeloAtras}
      <path d="${corpo}" fill="${cor}" ${c}/><path d="${corpo}" fill="url(#luz)"/>
      ${bracinhos}${perninhas}
      <path d="M${-bw * 0.32} ${-bh * 0.97} q${bw * 0.32} ${bh * 0.14} ${bw * 0.64} 0" fill="none" ${contorno(1.2)}/>
      ${cabeca}
    </g>`;
  }

  return `<g transform="scale(${o.virada ?? 1} 1)">
    ${o.semSombra ? '' : sombra(0, 0, quadril * 3.2)}
    ${cabeloAtras}
    ${pernas}${pernaTat}${pes}
    ${braco(-1)}
    ${tronco_}
    ${braco(1)}
    ${pescoco}${colar}
    ${cabeca}
  </g>`;
}

/** Posiciona uma pessoa na cena: x no palco, z na profundidade do chão. */
export function pessoaNaCena(a: Aparencia, x: number, base: number, escala: number, o: OpcoesDesenho = {}): string {
  return `<g transform="translate(${x} ${base}) scale(${escala})">${desenharPessoa(a, o)}</g>`;
}

/** Onde fica o rosto no desenho (para recortar retratos pequenos): centro e raio. */
export function centroDoRosto(a: Aparencia): { cy: number; r: number } {
  const H = a.alturaCm * PX_CM;
  const cab = H * alturaCabeca(a.idadeAnos);
  const cy = a.idadeAnos < 1.5 ? -cab * 1.234 : -H + cab * 0.5 + 1;
  return { cy, r: cab * 0.78 };
}

/** Retrato redondo só do rosto (SVG pronto). */
export function retratoRosto(a: Aparencia, humor: Humor = 'feliz'): string {
  const { cy, r } = centroDoRosto(a);
  return `<svg viewBox="${-r} ${cy - r * 0.92} ${2 * r} ${2 * r}" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">${DEFS}${desenharPessoa(a, { humor, semSombra: true })}</svg>`;
}
