// Motor de arte · pessoas em camadas. O mesmo desenho serve a todo mundo do jogo:
// corpo (altura e peso de verdade, músculo), rosto (formato, olhos, nariz, boca,
// sobrancelha), cabelo, barba, roupa, tatuagens e acessórios, todos encaixados em
// pontos do corpo. Os pés ficam em y = 0; quem posiciona é a cena.

import { CONTORNO, contorno, sombra, tom } from './estilo';

export type TipoCabelo = 'cacheado' | 'crespo' | 'liso-curto' | 'liso-longo' | 'coque' | 'raspado' | 'careca' | 'tranças';
export type TipoBarba = 'nenhuma' | 'cheia' | 'cavanhaque' | 'bigode' | 'por-fazer';
export type FormatoRosto = 'oval' | 'redondo' | 'quadrado' | 'fino';
export type Nariz = 'pequeno' | 'medio' | 'largo';
export type Humor = 'feliz' | 'neutro' | 'triste' | 'cansado' | 'bravo';
export type LocalTatuagem = 'braco-esquerdo' | 'braco-direito' | 'pescoco' | 'perna';
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
  /** Cor da roupa (a peça vem do contexto). */
  corRoupa: string;
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

/** Proporção da cabeça pelo tamanho do corpo: bebê é quase só cabeça. */
function alturaCabeca(idade: number): number {
  // Estilizado: cabeça maior que a real, para o rosto ter expressão no celular.
  if (idade < 2) return 0.34;
  if (idade < 6) return 0.27;
  if (idade < 12) return 0.23;
  if (idade < 16) return 0.2;
  return 0.18;
}

export function desenharPessoa(a: Aparencia, o: OpcoesDesenho = {}): string {
  const humor = o.humor ?? 'neutro';
  const roupa = o.roupa ?? 'casa';
  const H = a.alturaCm * PX_CM;                                   // altura total em pixels
  const cab = H * alturaCabeca(a.idadeAnos);                      // altura da cabeça
  const imc = a.pesoKg / ((a.alturaCm / 100) ** 2);
  const W = Math.max(0.8, Math.min(1.7, 0.4 + imc / 36));        // largura pelo peso
  const crianca = a.idadeAnos < 12;
  const sentado = a.idadeAnos < 1.5;
  const escalaTronco = crianca ? 0.82 : 1;
  const mus = 1 + a.musculo * 0.35;
  const fem = a.sexo === 'feminino';

  // Medidas do corpo (de baixo para cima)
  const pernaReal = (H - cab) * (crianca ? 0.44 : 0.5);
  const tronco = (H - cab) - pernaReal - 4;
  // Bebê pequeno fica sentado: as pernas vão para a frente, no chão.
  const perna = sentado ? 9 * escalaTronco * (0.75 + W * 0.3) : pernaReal;
  const ombro = 18 * W * escalaTronco * (fem ? 0.95 : 1.08) * (a.musculo > 0.3 ? mus * 0.95 : 1);
  const quadril = 16 * W * escalaTronco * (fem ? 1.12 : 0.98);
  const yQuadril = -perna;
  const yOmbro = yQuadril - tronco;
  const yPescoco = yOmbro - 3;
  const yCabeca = yPescoco - cab * 0.5;
  // O rosto é desenhado numa cabeça-padrão de 28px e escalado (traços proporcionais).
  const CAB = 28;
  const k = cab / CAB;
  const rx = CAB * 0.42 * (a.rosto === 'redondo' ? 1.08 : a.rosto === 'fino' ? 0.9 : a.rosto === 'quadrado' ? 1.04 : 1);
  const ry = CAB * 0.5;
  const bracoW = 7 * escalaTronco * (0.8 + W * 0.25) * mus;
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
  const cabeloCor = a.corCabelo;

  // ---- Pernas e pés ----
  const pernas = sentado
    ? `<rect x="${-quadril - 2}" y="${-pernaW}" width="${pernaReal * 0.9}" height="${pernaW}" rx="${pernaW / 2}" fill="${calca}" ${c}/>
       <rect x="${-quadril * 0.2}" y="${-pernaW}" width="${pernaReal * 0.9}" height="${pernaW}" rx="${pernaW / 2}" fill="${tom(calca, -0.12)}" ${c}/>
       <circle cx="${-quadril - 2 + pernaReal * 0.9}" cy="${-pernaW / 2}" r="${pernaW * 0.55}" fill="${pele}" ${c}/><circle cx="${-quadril * 0.2 + pernaReal * 0.9}" cy="${-pernaW / 2}" r="${pernaW * 0.55}" fill="${peleSombra}" ${c}/>`
    : vestido || short
    ? `<rect x="${-quadril * 0.55 - pernaW / 2}" y="${-perna}" width="${pernaW}" height="${perna}" rx="${pernaW / 2}" fill="${pele}" ${c}/>
       <rect x="${quadril * 0.55 - pernaW / 2}" y="${-perna}" width="${pernaW}" height="${perna}" rx="${pernaW / 2}" fill="${peleSombra}" ${c}/>
       ${short ? `<path d="M${-quadril} ${yQuadril - 2} L${quadril} ${yQuadril - 2} L${quadril + 2} ${-perna * 0.55} L2 ${-perna * 0.55} L0 ${-perna * 0.7} L-2 ${-perna * 0.55} L${-quadril - 2} ${-perna * 0.55} Z" fill="${calca}" ${c}/>` : ''}`
    : `<path d="M${-quadril} ${yQuadril - 2} L${-quadril + 1} -6 L-2 -6 L0 ${-perna * 0.8} L2 -6 L${quadril - 1} -6 L${quadril} ${yQuadril - 2} Z" fill="${calca}" ${c}/>
       <path d="M2 ${-perna * 0.78} L2 -6 L${quadril - 1} -6 L${quadril} ${yQuadril}" fill="#000" opacity="0.12"/>`;
  const pes = sentado ? '' : `<path d="M${-quadril + 0.5} -7 h${quadril - 1} v5 q0 3 -3 3 h${-quadril + 6} q-4 0 -4 -4 Z" fill="#3a2e26" ${c}/>
    <path d="M1 -7 h${quadril - 1} v5 q0 3 -3 3 h${-quadril + 6} q-2 0 -2 -3 Z" fill="#3a2e26" ${c}/>`;

  // ---- Tronco (com a roupa) ----
  // A cintura é o que mais muda com o peso (barriga); o músculo alarga os ombros.
  const cintura = quadril * (fem ? 0.82 : 0.95) * Math.max(0.85, Math.min(1.5, 0.7 + (imc - 18) / 26));
  const troncoForma = vestido
    ? `M${-ombro} ${yOmbro + 3} Q0 ${yOmbro - 3} ${ombro} ${yOmbro + 3} L${cintura} ${yOmbro + tronco * 0.55} L${quadril * 1.5} ${-perna * 0.45} L${-quadril * 1.5} ${-perna * 0.45} L${-cintura} ${yOmbro + tronco * 0.55} Z`
    : `M${-ombro} ${yOmbro + 3} Q0 ${yOmbro - 3} ${ombro} ${yOmbro + 3} L${cintura} ${yOmbro + tronco * 0.6} L${quadril} ${yQuadril + 3} L${-quadril} ${yQuadril + 3} L${-cintura} ${yOmbro + tronco * 0.6} Z`;
  const jaleco = roupa === 'jaleco' ? `<path d="M0 ${yOmbro} L0 ${yQuadril + 2}" ${c}/><path d="M-6 ${yOmbro} l6 10 l6 -10" fill="none" ${c}/>` : '';
  const gola = roupa === 'social' ? `<path d="M-6 ${yOmbro - 1} l6 8 l6 -8" fill="#fff" ${c}/>` : `<path d="M-5 ${yOmbro} q5 5 10 0" fill="none" ${contorno(1.4)}/>`;
  const tronco_ = `<path d="${troncoForma}" fill="${cor}" ${c}/><path d="${troncoForma}" fill="url(#luz)"/>${gola}${jaleco}`;

  // ---- Braços (manga e antebraço de pele, onde as tatuagens aparecem) ----
  const bracoComp = tronco * 0.95;
  const braco = (lado: -1 | 1) => {
    const x = lado * (ombro + bracoW * 0.25);
    const manga = mangaCurta ? bracoComp * 0.38 : bracoComp * 0.92;
    const tat = a.tatuagens.includes(lado === -1 ? 'braco-esquerdo' : 'braco-direito') && mangaCurta
        ? `<path d="M${x - bracoW * 0.3} ${yOmbro + manga + 4} q${bracoW * 0.45} 5 0 10 q${-bracoW * 0.45} 5 0 10" fill="none" stroke="#1d3557" stroke-width="2"/><circle cx="${x + bracoW * 0.15}" cy="${yOmbro + manga + 13}" r="2.2" fill="#b23a48" stroke="#1d3557" stroke-width="0.8"/>` : '';
    const peleBraco = lado === 1 ? peleSombra : pele;
    return `<g transform="rotate(${lado * 6} ${x} ${yOmbro + 2})">
      <rect x="${x - bracoW / 2}" y="${yOmbro + 2}" width="${bracoW}" height="${bracoComp}" rx="${bracoW / 2}" fill="${peleBraco}" ${c}/>
      <rect x="${x - bracoW / 2 - 0.5}" y="${yOmbro}" width="${bracoW + 1}" height="${manga}" rx="${bracoW / 2}" fill="${lado === 1 ? corEscura : cor}" ${c}/>
      ${tat}
      <circle cx="${x}" cy="${yOmbro + bracoComp + 2}" r="${bracoW * 0.62}" fill="${peleBraco}" ${c}/>
    </g>`;
  };

  // ---- Pescoço e cabeça ----
  const pescoco = `<rect x="${-cab * 0.12}" y="${yPescoco - cab * 0.12}" width="${cab * 0.24}" height="${cab * 0.2}" fill="${peleSombra}" ${c}/>
    ${a.tatuagens.includes('pescoco') ? `<path d="M${cab * 0.04} ${yPescoco - cab * 0.06} l3 3 l-3 3" stroke="#1d3557" stroke-width="1.4" fill="none"/>` : ''}`;
  const olhoY = ry * 0.02;
  const olhoDx = rx * 0.4;
  const olhos = humor === 'cansado'
    ? `<path d="M${-olhoDx - 3} ${olhoY} h6 M${olhoDx - 3} ${olhoY} h6" ${contorno(1.8)}/>`
    : `<ellipse cx="${-olhoDx}" cy="${olhoY}" rx="2.4" ry="${humor === 'feliz' ? 2.6 : 3}" fill="${a.olhos}" stroke="${CONTORNO}" stroke-width="0.8"/>
       <ellipse cx="${olhoDx}" cy="${olhoY}" rx="2.4" ry="${humor === 'feliz' ? 2.6 : 3}" fill="${a.olhos}" stroke="${CONTORNO}" stroke-width="0.8"/>
       <circle cx="${-olhoDx + 0.8}" cy="${olhoY - 1}" r="0.8" fill="#fff"/><circle cx="${olhoDx + 0.8}" cy="${olhoY - 1}" r="0.8" fill="#fff"/>`;
  const sobInc = humor === 'bravo' ? 3 : humor === 'triste' ? -2 : 0;
  const sobrancelhas = `<path d="M${-olhoDx - 4} ${olhoY - 6 + sobInc * 0.3} q4 ${-2 - sobInc * 0.3} 8 ${sobInc * 0.6}" ${contorno(fem ? 1.4 : 2)} stroke="${tom(cabeloCor, -0.2)}"/>
    <path d="M${olhoDx - 4} ${olhoY - 6 + sobInc * 0.3} q4 ${-2 - sobInc * 0.3} 8 ${-sobInc * 0.6}" ${contorno(fem ? 1.4 : 2)} stroke="${tom(cabeloCor, -0.2)}"/>`;
  const narizL = a.nariz === 'largo' ? 4 : a.nariz === 'pequeno' ? 2 : 3;
  const nariz = `<path d="M0 ${olhoY + 3} q${-narizL} ${narizL + 2} 0 ${narizL + 3} q${narizL * 0.6} 0 ${narizL} -1" fill="none" stroke="${peleSombra}" stroke-width="1.4" stroke-linecap="round"/>`;
  const bocaY = ry * 0.5;
  const boca = humor === 'feliz' ? `<path d="M-5 ${bocaY - 1} q5 6 10 0" fill="#9b3b31" ${contorno(1.4)}/>`
    : humor === 'triste' ? `<path d="M-5 ${bocaY + 2} q5 -4 10 0" fill="none" ${contorno(1.6)}/>`
    : humor === 'bravo' ? `<path d="M-5 ${bocaY + 1} h10" ${contorno(1.8)}/>`
    : `<path d="M-4 ${bocaY} q4 2 8 0" fill="none" ${contorno(1.5)}/>`;
  const bochecha = crianca ? `<circle cx="${-rx * 0.6}" cy="${bocaY - 3}" r="3" fill="#e98a7a" opacity="0.4"/><circle cx="${rx * 0.6}" cy="${bocaY - 3}" r="3" fill="#e98a7a" opacity="0.4"/>` : '';
  const sardas = a.sardas ? [-0.55, -0.4, 0.4, 0.55].map((f, i) => `<circle cx="${rx * f}" cy="${bocaY - 6 + (i % 2) * 2}" r="0.8" fill="#8a4b2d" opacity="0.6"/>`).join('') : '';
  const rugas = a.idadeAnos >= 55 ? `<path d="M${-rx * 0.8} ${olhoY} l-3 -1 M${rx * 0.8} ${olhoY} l3 -1 M${-rx * 0.35} ${bocaY + 5} q${rx * 0.35} 2 ${rx * 0.7} 0" stroke="${peleSombra}" stroke-width="1" fill="none"/>` : '';
  const oculos = a.oculos ? `<g fill="#ffffff22" ${contorno(1.4)}><circle cx="${-olhoDx}" cy="${olhoY}" r="${rx * 0.3}"/><circle cx="${olhoDx}" cy="${olhoY}" r="${rx * 0.3}"/><path d="M${-olhoDx + rx * 0.3} ${olhoY} h${2 * olhoDx - rx * 0.6}" fill="none"/></g>` : '';
  const queixo = a.rosto === 'quadrado' ? `M${-rx} 0 Q${-rx} ${ry * 0.95} 0 ${ry} Q${rx} ${ry * 0.95} ${rx} 0 Q${rx} ${-ry} 0 ${-ry} Q${-rx} ${-ry} ${-rx} 0 Z`
    : `M${-rx} 0 Q${-rx} ${ry * 0.85} 0 ${ry} Q${rx} ${ry * 0.85} ${rx} 0 Q${rx} ${-ry} 0 ${-ry} Q${-rx} ${-ry} ${-rx} 0 Z`;
  const orelhas = `<ellipse cx="${-rx - 1}" cy="${olhoY + 2}" rx="3" ry="4.5" fill="${pele}" ${c}/><ellipse cx="${rx + 1}" cy="${olhoY + 2}" rx="3" ry="4.5" fill="${peleSombra}" ${c}/>`;

  // ---- Cabelo (atrás da cabeça e franja na frente) ----
  let atras = ''; let frente = '';
  const cc = cabeloCor;
  const cs = `fill="${cc}" ${c}`;
  switch (a.cabelo) {
    case 'cacheado':
      atras = `<g ${cs}>${[-1, -0.5, 0, 0.5, 1].map((f, i) => `<circle cx="${f * rx}" cy="${-ry * 0.45 + (i % 2) * 3}" r="${rx * 0.5}"/>`).join('')}${fem ? `<circle cx="${-rx * 1.05}" cy="${ry * 0.35}" r="${rx * 0.45}"/><circle cx="${rx * 1.05}" cy="${ry * 0.35}" r="${rx * 0.45}"/><circle cx="${-rx * 0.9}" cy="${ry * 0.9}" r="${rx * 0.4}"/><circle cx="${rx * 0.9}" cy="${ry * 0.9}" r="${rx * 0.4}"/>` : ''}</g>`;
      frente = `<g ${cs}>${[-0.65, -0.2, 0.25, 0.65].map((f) => `<circle cx="${f * rx}" cy="${-ry * 0.8}" r="${rx * 0.36}"/>`).join('')}</g>`;
      break;
    case 'crespo':
      atras = `<ellipse cx="0" cy="${-ry * 0.45}" rx="${rx * 1.45}" ry="${ry * 1.05}" ${cs}/>`;
      break;
    case 'liso-curto':
      atras = `<path d="M${-rx * 1.05} ${ry * 0.1} Q${-rx * 1.1} ${-ry * 1.25} 0 ${-ry * 1.12} Q${rx * 1.1} ${-ry * 1.25} ${rx * 1.05} ${ry * 0.1} Z" ${cs}/>`;
      frente = `<path d="M${-rx * 0.95} ${-ry * 0.25} Q${-rx * 0.3} ${-ry * 1.1} ${rx * 0.95} ${-ry * 0.45} Q${rx * 0.2} ${-ry * 0.65} ${-rx * 0.95} ${-ry * 0.05} Z" ${cs}/>`;
      break;
    case 'liso-longo':
      // Cai por trás dos ombros e aparece dos dois lados do pescoço até o peito.
      atras = `<path d="M${-rx * 1.1} ${-ry * 0.2} Q${-rx * 1.12} ${-ry * 1.25} 0 ${-ry * 1.12} Q${rx * 1.12} ${-ry * 1.25} ${rx * 1.1} ${-ry * 0.2} Q${rx * 1.5} ${ry * 1.4} ${rx * 1.45} ${ry * 2.6} L${-rx * 1.45} ${ry * 2.6} Q${-rx * 1.5} ${ry * 1.4} ${-rx * 1.1} ${-ry * 0.2} Z" ${cs}/>`;
      frente = `<path d="M${-rx * 0.95} ${-ry * 0.1} Q${-rx * 0.2} ${-ry * 1.15} ${rx * 0.95} ${-ry * 0.3} Q${rx * 0.1} ${-ry * 0.6} ${-rx * 0.95} ${ry * 0.15} Z" ${cs}/>`;
      break;
    case 'coque':
      atras = `<circle cx="0" cy="${-ry * 1.25}" r="${rx * 0.45}" ${cs}/><path d="M${-rx * 1.03} ${ry * 0.05} Q${-rx * 1.05} ${-ry * 1.2} 0 ${-ry * 1.08} Q${rx * 1.05} ${-ry * 1.2} ${rx * 1.03} ${ry * 0.05} Z" ${cs}/>`;
      break;
    case 'tranças':
      atras = `<path d="M${-rx * 1.03} ${ry * 0.05} Q${-rx * 1.05} ${-ry * 1.2} 0 ${-ry * 1.08} Q${rx * 1.05} ${-ry * 1.2} ${rx * 1.03} ${ry * 0.05} Z" ${cs}/>
        ${[-1, 1].map((l) => `<path d="M${l * rx * 0.95} ${ry * 0.2} q${l * 4} ${ry * 0.6} 0 ${ry * 1.6}" stroke="${cc}" stroke-width="${rx * 0.32}" stroke-linecap="round" fill="none"/>`).join('')}`;
      break;
    case 'raspado':
      frente = `<path d="M${-rx * 0.98} ${-ry * 0.2} Q0 ${-ry * 1.18} ${rx * 0.98} ${-ry * 0.2} Q0 ${-ry * 0.82} ${-rx * 0.98} ${-ry * 0.2} Z" fill="${cc}" opacity="0.75"/>`;
      break;
    case 'careca':
      frente = `<path d="M${-rx * 1.02} ${ry * 0.05} q-2 ${-ry * 0.4} 2 ${-ry * 0.55}" stroke="${cc}" stroke-width="3" fill="none"/><path d="M${rx * 1.02} ${ry * 0.05} q2 ${-ry * 0.4} -2 ${-ry * 0.55}" stroke="${cc}" stroke-width="3" fill="none"/>`;
      break;
  }
  const barba = a.barba === 'nenhuma' || crianca ? ''
    : a.barba === 'cheia' ? `<path d="M${-rx * 0.95} ${olhoY + 4} Q${-rx} ${ry * 1.25} 0 ${ry * 1.2} Q${rx} ${ry * 1.25} ${rx * 0.95} ${olhoY + 4} Q${rx * 0.5} ${bocaY + 2} 0 ${bocaY + 1} Q${-rx * 0.5} ${bocaY + 2} ${-rx * 0.95} ${olhoY + 4} Z" fill="${cc}" ${c}/>`
    : a.barba === 'cavanhaque' ? `<path d="M-5 ${bocaY + 3} q5 ${ry * 0.55} 10 0 Z" fill="${cc}" ${c}/><path d="M-6 ${bocaY - 3} q6 -3 12 0" stroke="${cc}" stroke-width="2.5" fill="none"/>`
    : a.barba === 'bigode' ? `<path d="M-7 ${bocaY - 2} q7 -5 14 0 q-7 2 -14 0 Z" fill="${cc}" ${c}/>`
    : `<path d="${queixo}" fill="${cc}" opacity="0.18" transform="translate(0 ${ry * 0.12}) scale(0.95 0.9)"/>`;

  const cabeloAtras = `<g transform="translate(0 ${yCabeca}) scale(${k})">${atras}</g>`;
  const cabeca = `<g transform="translate(0 ${yCabeca}) scale(${k})">
    ${orelhas}
    <path d="${queixo}" fill="${pele}" ${c}/>
    <path d="${queixo}" fill="url(#luz)"/>
    ${bochecha}${sardas}${barba}${frente}${sobrancelhas}${olhos}${nariz}${boca}${rugas}${oculos}
  </g>`;

  const pernaTat = a.tatuagens.includes('perna') && (short || vestido)
    ? `<path d="M${quadril * 0.55 - 4} ${-perna * 0.32} l4 -6 l4 6 l-4 6 z" fill="none" stroke="#1d3557" stroke-width="1.8"/><circle cx="${quadril * 0.55}" cy="${-perna * 0.32}" r="1.6" fill="#b23a48"/>` : '';

  return `<g transform="scale(${o.virada ?? 1} 1)">
    ${o.semSombra ? '' : sombra(0, 0, quadril * 3.2)}
    ${cabeloAtras}
    ${pernas}${pernaTat}${pes}
    ${braco(-1)}
    ${tronco_}
    ${braco(1)}
    ${pescoco}
    ${cabeca}
  </g>`;
}

/** Posiciona uma pessoa na cena: x no palco, z na profundidade do chão. */
export function pessoaNaCena(a: Aparencia, x: number, base: number, escala: number, o: OpcoesDesenho = {}): string {
  return `<g transform="translate(${x} ${base}) scale(${escala})">${desenharPessoa(a, o)}</g>`;
}
