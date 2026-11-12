// Folha de prova do motor de arte: desenha tudo lado a lado (idades × corpos ×
// cabelos × marcas, cômodos × fases × horas) e grava em prova/folha.html, para
// conferir se os desenhos conversam entre si. Também barra SVG quebrado.

import { mkdirSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEFS, type FaseArte, type Hora } from './estilo';
import { desenharPessoa, type Aparencia, type Humor, type OpcoesDesenho, type Roupa, type TipoBarba, type TipoCabelo } from './pessoa';
import { LUGARES, desenharCena, type Cena, type Lugar } from './comodos';
import { aparenciaDe, aparenciaDaPessoa } from '../motor/corpo';
import { criarVida } from '../motor/vida';

const PELES = ['#f6d5b8', '#e8b48f', '#c98d63', '#9b6a45', '#6b4630'] as const;
const pelePor = (i: number): string => PELES[i % PELES.length] as string;
const base = (m: Partial<Aparencia> = {}): Aparencia => ({
  sexo: 'feminino', idadeAnos: 28, alturaCm: 165, pesoKg: 60, musculo: 0.3, pele: PELES[2], olhos: '#5a3b22',
  rosto: 'oval', nariz: 'medio', cabelo: 'cacheado', corCabelo: '#2b1d14', barba: 'nenhuma', sardas: false, oculos: false,
  tatuagens: [], corRoupa: '#2f6db5', ...m,
});
/** Altura média por idade, para a folha ficar realista. */
const alturaPara = (idade: number, sexo: Aparencia['sexo']) => idade < 1 ? 62 : idade < 18 ? 75 + idade * 5.6 : sexo === 'feminino' ? 162 : 174;
const pesoPara = (idade: number) => idade < 1 ? 7 : idade < 18 ? 9 + idade * 2.9 : 66;

function quadroPessoa(a: Aparencia, o: OpcoesDesenho, legenda: string): string {
  return `<figure><svg viewBox="-60 -200 120 210" width="180" height="315">${DEFS}<line x1="-60" x2="60" y1="0" y2="0" stroke="#d8cbb4"/>${desenharPessoa(a, o)}</svg><figcaption>${legenda}</figcaption></figure>`;
}

function folhaPessoas() {
  const s = { 'Idades': [] as string[], 'Corpos (adulto)': [] as string[], 'Cabelos': [] as string[], 'Barbas': [] as string[], 'Marcas: tatuagem, óculos, sardas': [] as string[], 'Humor': [] as string[], 'Roupas': [] as string[], 'Peles': [] as string[] } satisfies Record<string, string[]>;
  for (const sexo of ['feminino', 'masculino'] as const) for (const idade of [0, 2, 5, 9, 13, 16, 25, 45, 62, 80]) {
    s['Idades'].push(quadroPessoa(base({ sexo, idadeAnos: idade, alturaCm: alturaPara(idade, sexo), pesoKg: pesoPara(idade), cabelo: sexo === 'masculino' ? (idade > 60 ? 'careca' : 'liso-curto') : 'liso-longo', corCabelo: idade > 60 ? '#bdbdbd' : '#2b1d14', barba: sexo === 'masculino' && idade >= 25 ? 'por-fazer' : 'nenhuma' }), { humor: 'feliz', roupa: idade >= 6 && idade < 18 ? 'escola' : 'casa' }, `${sexo === 'feminino' ? 'F' : 'M'} ${idade} anos`));
  }
  for (const [peso, musculo, alt] of [[48, 0.1, 165], [60, 0.3, 165], [78, 0.2, 165], [100, 0.15, 165], [72, 0.9, 165], [60, 0.3, 150], [60, 0.3, 185]] as const) {
    for (const sexo of ['feminino', 'masculino'] as const) s['Corpos (adulto)'].push(quadroPessoa(base({ sexo, pesoKg: peso, musculo, alturaCm: alt, cabelo: sexo === 'feminino' ? 'coque' : 'raspado' }), { roupa: 'esporte' }, `${alt}cm ${peso}kg m${musculo}`));
  }
  const cabelos: TipoCabelo[] = ['cacheado', 'crespo', 'liso-curto', 'liso-longo', 'coque', 'raspado', 'careca', 'tranças'];
  cabelos.forEach((cabelo, i) => s['Cabelos'].push(quadroPessoa(base({ cabelo, corCabelo: ['#2b1d14', '#111', '#8a5a2b', '#e0b35a', '#b0413e', '#2b1d14', '#2b1d14', '#111'][i] ?? '#111', pele: pelePor(i) }), {}, cabelo)));
  const barbas: TipoBarba[] = ['nenhuma', 'cheia', 'cavanhaque', 'bigode', 'por-fazer'];
  barbas.forEach((barba) => s['Barbas'].push(quadroPessoa(base({ sexo: 'masculino', alturaCm: 176, pesoKg: 74, cabelo: 'liso-curto', barba }), {}, barba)));
  s['Marcas: tatuagem, óculos, sardas'].push(
    quadroPessoa(base({ tatuagens: ['braco-esquerdo'] }), { roupa: 'esporte' }, 'tatuagem braço esq.'),
    quadroPessoa(base({ sexo: 'masculino', cabelo: 'raspado', tatuagens: ['braco-direito', 'pescoco'] }), { roupa: 'esporte' }, 'braço dir. + pescoço'),
    quadroPessoa(base({ tatuagens: ['perna'] }), { roupa: 'esporte' }, 'tatuagem perna'),
    quadroPessoa(base({ oculos: true, pele: PELES[0], cabelo: 'liso-longo', corCabelo: '#b0413e', sardas: true }), {}, 'óculos + sardas'),
    quadroPessoa(base({ tatuagens: ['braco-esquerdo'] }), { roupa: 'social' }, 'manga longa esconde'),
  );
  (['feliz', 'neutro', 'triste', 'cansado', 'bravo'] as Humor[]).forEach((humor) => s['Humor'].push(quadroPessoa(base(), { humor }, humor)));
  (['casa', 'escola', 'social', 'esporte', 'jaleco', 'festa', 'pijama'] as Roupa[]).forEach((roupa) => s['Roupas'].push(quadroPessoa(base({ idadeAnos: roupa === 'escola' ? 12 : 30, alturaCm: roupa === 'escola' ? 145 : 165, pesoKg: roupa === 'escola' ? 40 : 60 }), { roupa }, roupa)));
  PELES.forEach((pele, i) => s['Peles'].push(quadroPessoa(base({ pele, cabelo: (['crespo', 'cacheado', 'liso-curto', 'tranças', 'coque'] as TipoCabelo[])[i] ?? 'crespo' }), { humor: 'feliz' }, pele)));
  return s;
}

/** Famílias geradas pelo jogo: pais, você em três idades e seus irmãos (herança coerente?). */
function folhaFamilias(): string[] {
  return Array.from({ length: 6 }, (_, i) => {
    const v = criarVida({ id: `fam${i}`, seed: `familia-${i}`, criadaEm: '2026-01-01', ano: 2026, turno: 'ano', morte: 'permanente', inicio: 'bebe' } as Parameters<typeof criarVida>[0]);
    const p = v.personagem;
    const quadros: string[] = [];
    for (const pe of v.pessoas.filter((x) => x.papel === 'mae' || x.papel === 'pai')) {
      const a = aparenciaDaPessoa(pe);
      if (a) quadros.push(quadroPessoa({ ...a, corRoupa: '#7a6a58' }, {}, `${pe.papel} ${Math.floor(pe.idadeMeses / 12)}`));
    }
    for (const idade of [1, 8, 16, 30, 70]) quadros.push(quadroPessoa({ ...aparenciaDe({ sexo: p.sexo, idadeAnos: idade, forma: p.atributos.forma, genes: p.genes! }), corRoupa: '#e8553d' }, { humor: 'feliz' }, `você ${idade}`));
    for (const pe of v.pessoas.filter((x) => x.papel === 'irmao')) {
      const a = aparenciaDaPessoa(pe);
      if (a) quadros.push(quadroPessoa(a, {}, `irmão ${Math.floor(pe.idadeMeses / 12)}`));
    }
    return `<h2>Família ${i + 1}</h2><div class="grade">${quadros.join('')}</div>`;
  });
}

const FASES: FaseArte[] = ['bebe', 'crianca', 'adolescente', 'adulto', 'idoso'];
const HORAS: Hora[] = ['manha', 'tarde', 'noite'];

/** Elenco de exemplo para as cenas. */
function elenco(fase: FaseArte): Cena['pessoas'] {
  const idade = { bebe: 1, crianca: 8, adolescente: 15, adulto: 32, idoso: 72 }[fase];
  const eu = base({ idadeAnos: idade, alturaCm: alturaPara(idade, 'feminino'), pesoKg: pesoPara(idade), cabelo: fase === 'idoso' ? 'coque' : 'cacheado', corCabelo: fase === 'idoso' ? '#c9c9c9' : '#2b1d14' });
  const outro = base({ sexo: 'masculino', idadeAnos: fase === 'bebe' || fase === 'crianca' ? 36 : idade + 2, alturaCm: 176, pesoKg: 78, pele: PELES[3], cabelo: 'raspado', barba: 'cavanhaque', corRoupa: '#3aa26b' });
  return [{ aparencia: eu, x: 170, z: 0.7, humor: 'feliz' }, { aparencia: outro, x: 250, z: 0.45, humor: 'neutro', virada: -1 }];
}

function todasAsCenas(): { titulo: string; cena: Cena }[] {
  const lista: { titulo: string; cena: Cena }[] = [];
  for (const fase of FASES) for (const hora of HORAS) lista.push({ titulo: `quarto · ${fase} · ${hora}`, cena: { lugar: 'quarto', fase, hora, pessoas: elenco(fase) } });
  const lugaresAdulto: Lugar[] = LUGARES.filter((l) => l !== 'quarto');
  for (const lugar of lugaresAdulto) lista.push({ titulo: `${lugar} · adulto · tarde`, cena: { lugar, fase: lugar === 'escola' ? 'crianca' : 'adulto', hora: 'tarde', pessoas: elenco(lugar === 'escola' ? 'crianca' : 'adulto') } });
  lista.push({ titulo: 'sala · natal · noite', cena: { lugar: 'sala', fase: 'adolescente', hora: 'noite', epoca: 'natal', pessoas: elenco('adolescente') } });
  lista.push({ titulo: 'sala · aniversário · manhã', cena: { lugar: 'sala', fase: 'crianca', hora: 'manha', epoca: 'aniversario', pessoas: elenco('crianca') } });
  lista.push({ titulo: 'parque · junina · noite', cena: { lugar: 'parque', fase: 'crianca', hora: 'noite', epoca: 'junina', pessoas: elenco('crianca') } });
  lista.push({ titulo: 'cozinha · junina · tarde', cena: { lugar: 'cozinha', fase: 'idoso', hora: 'tarde', epoca: 'junina', pessoas: elenco('idoso') } });
  return lista;
}

function conferir(svg: string): string[] {
  const erros: string[] = [];
  if (/NaN|undefined|Infinity/.test(svg)) erros.push('valor inválido no SVG');
  const abre = (svg.match(/<g[\s>]/g) ?? []).length, fecha = (svg.match(/<\/g>/g) ?? []).length;
  if (abre !== fecha) erros.push(`<g> desbalanceado (${abre}/${fecha})`);
  const ids = [...svg.matchAll(/ id="([^"]+)"/g)].map((m) => m[1] ?? '');
  const repetidos = ids.filter((id, i) => ids.indexOf(id) !== i && id !== 'luz' && id !== 'brilho');
  if (repetidos.length) erros.push(`id repetido: ${[...new Set(repetidos)].join(', ')}`);
  return erros;
}

describe('motor de arte · folha de prova', () => {
  it('desenha todas as pessoas sem SVG quebrado', () => {
    for (const quadros of Object.values(folhaPessoas())) for (const q of quadros) expect(conferir(q)).toEqual([]);
  });

  it('desenha todas as cenas sem SVG quebrado', () => {
    for (const { titulo, cena } of todasAsCenas()) expect([titulo, conferir(desenharCena(cena))]).toEqual([titulo, []]);
  });

  it('grava prova/folha.html', () => {
    const pessoas = Object.entries(folhaPessoas()).map(([t, q]) => `<h2>${t}</h2><div class="grade">${q.join('')}</div>`).join('') + folhaFamilias().join('');
    const cenas = todasAsCenas().map(({ titulo, cena }) => `<figure class="cena">${desenharCena(cena)}<figcaption>${titulo}</figcaption></figure>`).join('');
    const html = `<!doctype html><meta charset="utf-8"><title>Folha de prova</title>
<style>body{font:13px system-ui;background:#f4efe6;color:#3a2e26;margin:16px}h1{font-size:20px}h2{font-size:15px;margin:22px 0 6px}
.grade{display:flex;flex-wrap:wrap;gap:6px}figure{margin:0;background:#fffaf0;border:1px solid #e3d6bf;border-radius:8px;padding:4px;text-align:center}
figcaption{font-size:11px;color:#7a6a58}.cenas{display:grid;grid-template-columns:repeat(auto-fill,minmax(390px,1fr));gap:10px}.cena svg{display:block;width:100%;height:auto;border-radius:6px}</style>
<h1>Enredo · folha de prova do motor de arte</h1>${pessoas}<h2>Cenas</h2><div class="cenas">${cenas}</div>`;
    mkdirSync('prova', { recursive: true });
    writeFileSync('prova/folha.html', html);
  });
});
