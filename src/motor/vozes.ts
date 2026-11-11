// Feed por fase da vida: os fatos são os mesmos; muda quem conta e onde.
// 0–5: grupo da família (os responsáveis contam, em terceira pessoa).
// 5–12: diário (a criança, em primeira pessoa, com erros que somem com a idade).
// 12–18: posts e stories (curtidas e comentários de gente de verdade).
// Adulto: mensagens, e-mails do trabalho, notificações do banco, posts dos marcos.
// 60+: áudios no grupo da família, correntes e cartas aos netos.
// Função pura sobre o histórico: dá para trocar de volta ao feed simples a qualquer hora.

import { MESES } from './tempo';
import type { EntradaHistorico, Pessoa, Sexo, Vida } from './tipos';

export type Fase = 'bebe' | 'crianca' | 'adolescente' | 'adulto' | 'idoso';

export type Item =
  | { tipo: 'msg'; autor?: string; meu?: boolean; texto: string; tags: string[]; foto?: boolean; audio?: string; para?: string }
  | { tipo: 'diario'; texto: string; tags: string[] }
  | { tipo: 'post'; texto: string; tags: string[]; curtidas: number; comentarios: { autor: string; texto: string }[]; privado?: boolean; apagado?: boolean; luto?: boolean }
  | { tipo: 'story'; texto: string; tags: string[] }
  | { tipo: 'email'; de: string; assunto: string; texto: string; tags: string[] }
  | { tipo: 'banco'; texto: string; tags: string[] }
  | { tipo: 'app'; texto: string; tags: string[] }
  | { tipo: 'carta'; para: string; texto: string }
  | { tipo: 'corrente'; autor: string; texto: string }
  | { tipo: 'nota'; texto: string; tags: string[] }
  | { tipo: 'deus'; texto: string };

export interface Bloco {
  quando: string;
  fase: Fase;
  /** Nome do grupo, do diário ou do perfil. */
  titulo: string;
  itens: Item[];
}

// ---- Sorteio estável (o feed não pode mudar a cada vez que a tela desenha) ----

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const sorte = (semente: string) => hash(semente) / 4294967296;
const escolher = <T>(lista: readonly T[], semente: string): T => lista[hash(semente) % lista.length]!;

// ---- Idade em cada linha ----

/** Idade (em meses) que a pessoa tinha na data da linha, a partir do rótulo ("março de 2042", "2042"). */
export function idadeNaData(vida: Vida, quando: string): number | null {
  const ano = Number(/(\d{4})/.exec(quando)?.[1]);
  if (!ano) return null;
  const nomeMes = MESES.findIndex((m) => quando.startsWith(m));
  const semestre = /2º semestre/.test(quando) ? 6 : 0;
  const mes = nomeMes >= 0 ? nomeMes : semestre;
  const r = vida.relogio;
  const nascimento = r.ano * 12 + ((r.mes ?? 1) - 1) - r.idadeMeses;
  return ano * 12 + mes - nascimento;
}

export function faseDaIdade(meses: number): Fase {
  const a = meses / 12;
  return a < 5 ? 'bebe' : a < 12 ? 'crianca' : a < 18 ? 'adolescente' : a < 60 ? 'adulto' : 'idoso';
}

// ---- Separar o texto dos números ----

const TOKEN = /(?:^|\s·\s|\s)((?:[+−-]R\$ [\d.]+)|(?:Afeto de [^·]+? [+−-]\d+)|(?:[A-ZÁÉÍÓÚÇ][a-zà-ú]+(?: \([a-zà-ú ]+\))? [+−-][\d.,]+))$/u;
const NOTA = /\s*\(([^()]+)\)\s*$/;

/** "Você nadou. Forma +1 · Cansaço +2 (rendeu mais: ...)" → corpo, etiquetas e notas. */
export function separarResumo(texto: string): { corpo: string; tags: string[]; notas: string[] } {
  let t = texto.trim();
  const tags: string[] = [];
  const notas: string[] = [];
  for (let mexeu = true; mexeu;) {
    mexeu = false;
    const n = NOTA.exec(t);
    if (n && !/^["“]/.test(n[1]!)) { notas.unshift(n[1]!.replace(/\.$/, '')); t = t.slice(0, n.index).replace(/\s·$/, '').trim(); mexeu = true; continue; }
    const m = TOKEN.exec(t);
    if (m) { tags.unshift(m[1]!); t = t.slice(0, m.index).replace(/\s·$/, '').trim(); mexeu = true; }
  }
  return { corpo: t, tags, notas };
}

/** Etiquetas para mostrar: os números e, entre parênteses, as notas (jeito, compatibilidade). */
const etiquetas = (x: { tags: string[]; notas: string[] }) => [...x.tags, ...x.notas.map((n) => `(${n})`)];

// ---- Trocar a pessoa do verbo ----

const IRREGULARES: Record<string, string> = {
  foi: 'fui', é: 'sou', está: 'estou', tem: 'tenho', teve: 'tive', fez: 'fiz', faz: 'faço', vai: 'vou', pode: 'posso',
  pôde: 'pude', quer: 'quero', deu: 'dei', dá: 'dou', viu: 'vi', vê: 'vejo', veio: 'vim', vem: 'venho', diz: 'digo',
  sabe: 'sei', pôs: 'pus', põe: 'ponho', leu: 'li', lê: 'leio', ouve: 'ouço', consegue: 'consigo', sente: 'sinto',
  dorme: 'durmo', prefere: 'prefiro', segue: 'sigo', precisa: 'preciso', acha: 'acho', gosta: 'gosto', fica: 'fico',
  trouxe: 'trouxe', disse: 'disse', quis: 'quis', soube: 'soube', esteve: 'estive', manda: 'mando', anda: 'ando',
  completou: 'completei', caiu: 'caí', saiu: 'saí', traiu: 'traí', atraiu: 'atraí', sorriu: 'sorri', mora: 'moro',
  entra: 'entro', passa: 'passo', chora: 'choro', pensa: 'penso', odeia: 'odeio', ganha: 'ganho', trabalha: 'trabalho',
  estuda: 'estudo', perde: 'perco', vive: 'vivo', come: 'como', bebe: 'bebo', escreve: 'escrevo', parece: 'pareço',
  conhece: 'conheço', merece: 'mereço', aprende: 'aprendo', sai: 'saio', cai: 'caio', some: 'sumo', sobe: 'subo',
};
/** Terminam como verbo no passado, mas não são verbo. */
const PALAVRAS_EU = new Set(['seu', 'meu', 'teu', 'eu', 'céu', 'chapéu', 'museu', 'europeu', 'judeu', 'ateu', 'pneu', 'troféu', 'véu', 'sou', 'vou', 'estou', 'dou', 'ou']);
const NAO_VERBO = new Set(['e', 'a', 'o', 'de', 'com', 'que', 'na', 'no', 'da', 'do', 'em', 'um', 'uma', 'mesmo', 'mesma', 'também', 'sozinho', 'sozinha']);

/** Primeira do plural → terceira do singular, para "a gente" ("combinamos" → "combina"). */
function singular1(v: string): string {
  const b = v.toLowerCase();
  const irr: Record<string, string> = { fomos: 'foi', somos: 'é', estamos: 'está', temos: 'tem', vamos: 'vai', fizemos: 'fez', tivemos: 'teve', demos: 'deu', rimos: 'riu', saímos: 'saiu' };
  if (irr[b]) return irr[b]!;
  if (/amos$/.test(b)) return v.slice(0, -4) + 'a';
  if (/emos$/.test(b)) return v.slice(0, -4) + 'e';
  if (/imos$/.test(b)) return v.slice(0, -4) + 'iu';
  return v;
}

/** Terceira do plural → primeira do plural ("passaram" → "passamos", "foram" → "fomos"). */
export function plural1(v: string): string {
  const b = v.toLowerCase();
  if (b === 'foram') return 'fomos';
  if (b === 'fizeram') return 'fizemos';
  if (b === 'tiveram') return 'tivemos';
  if (b === 'deram') return 'demos';
  if (/aram$/.test(b)) return v.slice(0, -4) + 'amos';
  if (/eram$/.test(b)) return v.slice(0, -4) + 'emos';
  if (/iram$/.test(b)) return v.slice(0, -4) + 'imos';
  if (/íram$/.test(b)) return v.slice(0, -4) + 'ímos';
  return v;
}

/** "o tio, Mateus, saiu" → "o tio Mateus saiu". */
const PARENTESCO = '(tio|tia|avô|avó|irmão|irmã|primo|prima|vizinho|vizinha|amigo|amiga|colega|namorado|namorada|esposa|marido|filho|filha|neto|neta|sobrinho|sobrinha|mãe|pai)';
function semVirgulas(t: string): string {
  return t.replace(new RegExp(`(?<![\\p{L}])${PARENTESCO}, ([A-ZÁÉÍÓÚ][\\p{L}]+),?`, 'gu'), '$1 $2');
}

/** Terceira do plural → terceira do singular ("combinam" → "combina", "foram" → "foi"), para "a gente". */
export function singular(v: string): string {
  const b = v.toLowerCase();
  const irr: Record<string, string> = { foram: 'foi', são: 'é', estão: 'está', têm: 'tem', vão: 'vai', eram: 'era', estavam: 'estava', fizeram: 'fez', tiveram: 'teve', deram: 'deu', vieram: 'veio', puderam: 'pôde', disseram: 'disse' };
  if (irr[b]) return irr[b]!;
  if (/aram$/.test(b)) return v.slice(0, -4) + 'ou';
  if (/eram$/.test(b)) return v.slice(0, -4) + 'eu';
  if (/iram$/.test(b)) return v.slice(0, -4) + 'iu';
  if (/am$/.test(b)) return v.slice(0, -2) + 'a';
  if (/em$/.test(b)) return v.slice(0, -2) + 'e';
  return v;
}

/** Terceira pessoa do singular → primeira ("ganhou" → "ganhei"). */
export function conjugar(v: string): string {
  const baixo = v.toLowerCase();
  if (IRREGULARES[baixo]) return IRREGULARES[baixo]!;
  if (/çou$/.test(baixo)) return v.slice(0, -3) + 'cei';
  if (/cou$/.test(baixo)) return v.slice(0, -3) + 'quei';
  if (/gou$/.test(baixo)) return v.slice(0, -3) + 'guei';
  if (/ou$/.test(baixo)) return v.slice(0, -2) + 'ei';
  if (/[aeo]iu$/.test(baixo)) return v.slice(0, -2) + 'í';
  if (/eu$/.test(baixo)) return v.slice(0, -2) + 'i';
  if (/iu$/.test(baixo)) return v.slice(0, -2) + 'i';
  if (/(ava|ia|ía)$/.test(baixo)) return v;
  if (baixo.length >= 3 && /a$/.test(baixo)) return v.slice(0, -1) + 'o';
  if (baixo.length >= 3 && /e$/.test(baixo)) return v.slice(0, -1) + 'o';
  return v;
}

/** Terceira do plural → primeira do plural, também no presente ("combinam" → "combinamos"). */
export function plural1presente(v: string): string {
  const b = v.toLowerCase();
  const irr: Record<string, string> = { são: 'somos', estão: 'estamos', têm: 'temos', vão: 'vamos', foram: 'fomos', eram: 'éramos', estavam: 'estávamos' };
  if (irr[b]) return irr[b]!;
  const p = plural1(v);
  if (p !== v) return p;
  if (/am$/.test(b)) return v.slice(0, -2) + 'amos';
  if (/em$/.test(b)) return v.slice(0, -2) + 'emos';
  return v;
}

const ADVERBIOS = '(?:não|já|nunca|ainda|também|só|quase|mal|até|sempre|logo|enfim|finalmente|agora|hoje|ontem|aqui|realmente|mesmo)';
/** Fronteiras de palavra que entendem acento (o \b do JavaScript não entende). */
const A = '(?<![\\p{L}])';
const Z = '(?![\\p{L}])';
const re = (padrao: string) => new RegExp(padrao.replaceAll('‹', A).replaceAll('›', Z), 'gu');

/** "Você ganhou uma bicicleta" → "Eu ganhei uma bicicleta"; "sua mãe" → "minha mãe". */
export function paraPrimeira(texto: string): string {
  let t = texto;
  t = t.replace(re('‹com você›'), 'comigo').replace(re('‹(para|pra) você›'), 'pra mim').replace(re('‹(de|em|por|a) você›'), '$1 mim');
  t = t.replace(re(`‹([Vv])ocês›((?:\\s+${ADVERBIOS}›)*)(\\s+se›)?\\s+([\\p{L}]+)`), (_m, v: string, adv: string, se: string | undefined, palavra: string) =>
    `${v === 'V' ? 'Nós' : 'nós'}${adv}${se ? ' nos' : ''} ${plural1presente(palavra)}`);
  t = t.replace(re('‹Vocês›'), 'Nós').replace(re('‹vocês›'), 'nós');
  t = t.replace(re('‹te›'), 'me').replace(re('‹Te›'), 'Me');
  // "chamou você" → "me chamou" (você como objeto, depois do verbo).
  t = t.replace(re('‹([\\p{L}]{3,}(?:ou|eu|iu))\\s+você›'), (m, verbo: string) => (NAO_VERBO.has(verbo.toLowerCase()) ? m : `me ${verbo}`));
  t = t.replace(re(`‹([Vv])ocê((?:\\s+${ADVERBIOS}›)*)(\\s+se›)?\\s+([\\p{L}]+)`), (_m, v: string, adv: string, se: string | undefined, palavra: string) => {
    const eu = v === 'V' ? 'Eu' : 'eu';
    if (NAO_VERBO.has(palavra.toLowerCase())) return `${eu}${adv}${se ? ' me' : ''} ${palavra}`;
    return `${eu}${adv}${se ? ' me' : ''} ${conjugar(palavra)}`;
  });
  t = t.replace(re('‹Você›'), 'Eu').replace(re('‹você›'), 'eu');
  // "eu estou se sentindo" → "eu estou me sentindo".
  t = t.replace(re('‹([Ee]u(?: [\\p{L}]+){1,2}) se›'), '$1 me');
  // "Eu e Diego passaram" → "Eu e Diego passamos".
  t = t.split(/(?<=[.;!?])\s/).map((frase) => (re('‹(?:[Ee]u e|[Nn]ós)›').test(frase)
    ? frase.replace(re('‹([\\p{L}]+(?:aram|eram|iram|íram|oram))›'), (_m, v: string) => plural1(v))
    : frase)).join(' ');
  // Na frase que já é "eu ...", o segundo verbo também vira primeira pessoa ("fui ao posto e fez" → "e fiz").
  t = t.split(/(?<=[.;!?])\s/).map((frase) => (re('‹[Ee]u›').test(frase)
    ? frase.replace(re(`‹e((?:\\s+${ADVERBIOS}›)*)\\s+([\\p{L}]{1,})›`), (m, adv: string, v: string) => (!PALAVRAS_EU.has(v.toLowerCase()) && /(ou|eu|iu)$/.test(v) && v.length >= 3 || ['fez', 'foi', 'teve', 'deu', 'viu', 'quer', 'precisa', 'acha', 'gosta', 'sabe', 'pode', 'é', 'está', 'tem', 'vai', 'fica'].includes(v) ? `e${adv} ${conjugar(v)}` : m))
    : frase)).join(' ');
  t = t.replace(re('‹Seus›'), 'Meus').replace(re('‹Suas›'), 'Minhas').replace(re('‹seus›'), 'meus').replace(re('‹suas›'), 'minhas');
  t = t.replace(re('‹Seu›(?! [A-ZÁÉÍÓÚ])'), 'Meu').replace(re('‹Sua›'), 'Minha').replace(re('‹seu›'), 'meu').replace(re('‹sua›'), 'minha');
  return semVirgulas(t);
}

/** "Você deu os primeiros passos" → "Pedro deu os primeiros passos" (quem conta é da família). */
export function paraTerceira(texto: string, nome: string, sexo: Sexo): string {
  const ele = sexo === 'feminino' ? 'ela' : 'ele';
  const o = sexo === 'feminino' ? 'a' : 'o';
  let t = texto;
  t = t.replace(re('‹Seus pais›'), 'O papai e a mamãe').replace(re('‹seus pais›'), 'o papai e a mamãe');
  t = t.replace(re('‹Sua mãe›'), 'A mamãe').replace(re('‹sua mãe›'), 'a mamãe').replace(re('‹Seu pai›'), 'O papai').replace(re('‹seu pai›'), 'o papai');
  t = t.replace(re('‹(com|para|pra|de|em|por) você›'), (_m, p: string) => `${p === 'para' ? 'pra' : p} ${ele}`);
  t = t.replace(re('‹Vocês›'), 'Eles').replace(re('‹vocês›'), 'eles');
  t = t.replace(re('‹te›'), o);
  let primeira = true;
  t = t.replace(re('‹[Vv]ocê›'), (m) => {
    if (primeira) { primeira = false; return nome; }
    return m === 'Você' ? ele.charAt(0).toUpperCase() + ele.slice(1) : ele;
  });
  t = t.replace(re('‹Seus›'), 'Os').replace(re('‹Suas›'), 'As').replace(re('‹seus›'), 'os').replace(re('‹suas›'), 'as');
  t = t.replace(re('‹Seu›(?! [A-ZÁÉÍÓÚ])'), 'O').replace(re('‹Sua›'), 'A').replace(re('‹seu›'), 'o').replace(re('‹sua›'), 'a');
  t = t.replace(re('‹([Aa] mamãe|[Oo] papai), [A-ZÁÉÍÓÚ][\\p{L}]+,?'), '$1');
  return semVirgulas(t);
}

// ---- Letra de criança ----

const ERROS: Record<string, string> = {
  muito: 'muinto', também: 'tanbem', hoje: 'oje', então: 'entaum', porque: 'purque', está: 'ta', estava: 'tava',
  depois: 'dispois', bicicleta: 'bicicreta', nós: 'nóis', mesmo: 'mermo', você: 'voce', legal: 'legau', quando: 'quano',
};
const SEM_ACENTO: Record<string, string> = { á: 'a', à: 'a', â: 'a', ã: 'a', é: 'e', ê: 'e', í: 'i', ó: 'o', ô: 'o', õ: 'o', ú: 'u', ç: 'c' };

/** Erros de português que diminuem com a idade e somem aos 11. */
export function letraDeCrianca(texto: string, idadeAnos: number, semente: string): string {
  const forca = idadeAnos < 7 ? 0.65 : idadeAnos < 9 ? 0.35 : idadeAnos < 11 ? 0.12 : 0;
  if (!forca) return texto;
  let i = 0;
  let t = texto.replace(/[\p{L}]+/gu, (p) => {
    i++;
    const s = sorte(`${semente}:${i}`);
    const baixo = p.toLowerCase();
    if (ERROS[baixo] && s < forca + 0.2) return ERROS[baixo]!;
    if (idadeAnos < 8) return p.replace(/[áàâãéêíóôõúç]/g, (c) => SEM_ACENTO[c] ?? c);
    return p;
  });
  if (idadeAnos < 8) t = minuscula(t);
  if (idadeAnos < 9 && sorte(`${semente}:!`) < 0.4) t = t.replace(/\.$/, '!!!');
  return t;
}

// ---- Quem é quem ----

const vivos = (vida: Vida, papeis: string[]) => vida.pessoas.filter((p) => papeis.includes(p.papel) && p.vivo);
const um = (vida: Vida, papeis: string[]) => vivos(vida, papeis)[0] ?? vida.pessoas.find((p) => papeis.includes(p.papel));

/** Quem cuidava da criança: mãe, pai ou avó (na falta, a família). */
function responsavel(vida: Vida): string {
  const p = um(vida, ['mae']) ?? um(vida, ['pai']) ?? um(vida, ['avo']);
  if (!p) return 'Família';
  return p.papel === 'mae' ? `Mãe (${p.nome})` : p.papel === 'pai' ? `Pai (${p.nome})` : `${p.sexo === 'feminino' ? 'Vó' : 'Vô'} ${p.nome}`;
}

/** Com quem você mais conversa: o parceiro, o melhor amigo ou a mãe. */
function confidente(vida: Vida): Pessoa | undefined {
  const parc = vida.pessoas.find((p) => p.papel === 'parceiro' && p.vivo);
  if (parc) return parc;
  const amigos = vivos(vida, ['amigo']).filter((p) => !p.afastado).sort((a, b) => b.afeto - a.afeto);
  return amigos[0] ?? um(vida, ['mae']) ?? um(vida, ['irmao']);
}

const handle = (vida: Vida) => `@${vida.personagem.nome}${vida.personagem.sobrenome}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s/g, '');

// ---- Tom ----

type Tom = 'bom' | 'ruim' | 'luto' | 'neutro';
function tomDe(corpo: string, tags: string[]): Tom {
  if (/\bmorreu\b|\bfaleceu\b|\bvelório\b/i.test(corpo)) return 'luto';
  if (/febre|doente|hospital|pronto-socorro|internad|infarto|dengue|gripe|assalt|roub|demiti|separar|brig|chorou/i.test(corpo)) return 'ruim';
  const f = tags.find((t) => t.startsWith('Felicidade'));
  if (f) return /\+/.test(f) ? 'bom' : 'ruim';
  if (tags.some((t) => /^Saúde [−-]/.test(t))) return 'ruim';
  if (/!/.test(corpo)) return 'bom';
  return 'neutro';
}
const EMOJI: Record<Tom, string[]> = {
  bom: ['❤️', '😍', '🥰', '😂', '🙌', '✨'], ruim: ['🥺', '😢', '😔', '😬'], luto: ['🕊️'], neutro: [''],
};

const MARCO = /primeiros passos|primeira palavra|primeiras frases|Nasceu|nasceu|aniversário|se casaram|formou|formatura|aposentad|Você completou|anos de casados|virou adolescente|maior de idade|ganhou um irmão|neto|neta/;
const TRABALHO = /emprego|vaga|contratad|demiti|demissão|promovid|promoção|salário|aumento|chefe|estágio|empresa|RH\b|aposentadoria|concurso|entrevista|currículo|expediente|hora extra|gerente|colegas de trabalho|freela/i;
const DINHEIRO = /^[+−-]R\$|\bsaldo\b|boleto|dívida|parcela|fatura|Pix|juros|Serasa|herança|IPTU|IPVA|aluguel/;
const RESUMO_ANO = /fechou com o saldo|hábitos seguiram firmes|Foi uma fase|Sua saúde piorou|mais saudável|Um ano tranquilo/;

// ---- Cada fase ----

function semPonto(t: string) { return t.replace(/\.$/, ''); }
/** Rótulo de escolha ("Se declarar", "Prometer que vai cuidar") na voz de quem decide. */
function escolhaEu(rotulo: string): string {
  let t = minuscula(rotulo);
  t = t.replace(/^se /, 'me ').replace(re('‹que vai›'), 'que vou').replace(re('‹você mesm([oa])›'), 'eu mesm$1').replace(re('‹seu›'), 'meu').replace(re('‹sua›'), 'minha');
  return t;
}
function minuscula(t: string) {
  // Nome próprio no começo (Ana, Davi) continua com maiúscula.
  const primeira = /^[\p{L}]+/u.exec(t)?.[0] ?? '';
  if (NOMES_PROPRIOS.has(primeira)) return t;
  return t.charAt(0).toLowerCase() + t.slice(1);
}
/** Nomes de pessoas da vida atual (preenchido no começo de recontar). */
let NOMES_PROPRIOS = new Set<string>();

/** "→ Ir à festa. Você dançou." → { escolha: "Ir à festa", resto: "Você dançou." } */
function partirEscolha(corpo: string): { escolha: string; resto: string } | null {
  if (!corpo.startsWith('→ ')) return null;
  const sem = corpo.slice(2);
  const i = sem.search(/\.\s|\.$/);
  if (i < 0) return { escolha: sem, resto: '' };
  return { escolha: sem.slice(0, i), resto: sem.slice(i + 1).trim() };
}

function linhaBebe(vida: Vida, h: EntradaHistorico, s: string, autor: string, itens: Item[]) {
  const sr = separarResumo(h.texto); const { corpo } = sr; const tags = etiquetas(sr);
  const p = vida.personagem;
  const esc = partirEscolha(corpo);
  const tom = tomDe(corpo, tags);
  const texto = esc
    ? `Decidimos: ${minuscula(esc.escolha)}.${esc.resto ? ` ${paraTerceira(esc.resto, p.nome, p.sexo)}` : ''}`
    : paraTerceira(corpo, p.nome, p.sexo);
  const emoji = escolher(EMOJI[tom], s);
  const marco = MARCO.test(corpo);
  const final = marco && tom !== 'luto' ? texto.replace(/\.$/, '!!') : texto;
  itens.push({ tipo: 'msg', autor, texto: `${final}${emoji ? ` ${emoji}` : ''}`, tags, foto: marco && tom !== 'luto' });
  // A família responde nos momentos que importam (e às vezes do nada).
  if ((marco || sorte(s + 'r') < 0.18) && tom !== 'neutro') {
    const parentes = vivos(vida, ['avo', 'tio', 'pai', 'mae']).filter((x) => !autor.includes(x.nome));
    if (parentes.length) {
      const quem = escolher(parentes, s + 'q');
      const nomeQuem = quem.papel === 'avo' ? `${quem.sexo === 'feminino' ? 'Vó' : 'Vô'} ${quem.nome}` : quem.papel === 'tio' ? `${quem.sexo === 'feminino' ? 'Tia' : 'Tio'} ${quem.nome}` : quem.nome;
      if (quem.papel === 'avo' && sorte(s + 'a') < 0.5) {
        itens.push({ tipo: 'msg', autor: nomeQuem, texto: '', tags: [], audio: `0:${String(20 + (hash(s) % 39)).padStart(2, '0')}` });
      } else {
        const respostas = tom === 'luto' ? ['Força, família 🙏', 'Meus sentimentos ❤️'] : tom === 'ruim' ? ['Coitadinh' + (p.sexo === 'feminino' ? 'a' : 'o') + ' 🥺', 'Melhoras!!', 'Vai passar 🙏'] : ['Que lindo!! 😍', `A cara ${p.sexo === 'feminino' ? 'da mãe' : 'do pai'} kkkk`, 'Deus abençoe 🙏', 'Manda mais foto!!', 'Saudade desse pacotinho ❤️'];
        itens.push({ tipo: 'msg', autor: nomeQuem, texto: escolher(respostas, s + 't'), tags: [] });
      }
    }
  }
  // Família rica: a babá também manda notícias da rotina.
  if (p.classe === 'alta' && h.fato?.tipo === 'acao' && sorte(s + 'b') < 0.3) {
    itens.push({ tipo: 'msg', autor: `Babá ${escolher(['Neide', 'Cida', 'Rosa', 'Lúcia'], vida.config.seed)}`, texto: escolher([`${p.nome} comeu tudo e dormiu às duas 😊`, `Hoje ${p.sexo === 'feminino' ? 'ela' : 'ele'} não quis saber de soneca kkk`, 'Tudo bem por aqui, pode ficar tranquila 🙏'], s + 'bb'), tags: [] });
  }
}

function linhaDiario(vida: Vida, h: EntradaHistorico, s: string, idade: number): Item {
  const sr = separarResumo(h.texto); const { corpo } = sr; const tags = etiquetas(sr);
  const esc = partirEscolha(corpo);
  let t = esc ? `Eu decidi ${escolhaEu(esc.escolha)}.${esc.resto ? ` ${paraPrimeira(esc.resto)}` : ''}` : paraPrimeira(corpo);
  // Criança escreve "a gente", não "nós".
  t = t.replace(re('‹([Nn])ós ([\\p{L}]+)›'), (_m, n: string, v: string) => `${n === 'N' ? 'A' : 'a'} gente ${singular1(v)}`);
  t = letraDeCrianca(t, idade, s);
  void vida;
  return { tipo: 'diario', texto: t, tags };
}

const COMENTA_BOM = ['kkkkkk', 'mitou 🔥', 'que isso!!', '😍😍', 'orgulho', 'chamaaa', 'brabo demais'];
const COMENTA_RUIM = ['força 🫂', 'tô aqui pro que precisar', '😢', 'vai melhorar', 'chama pra conversar'];
const COMENTA_RIVAL = ['aff', 'nossa que legal 🙄', 'ninguém perguntou', 'tá se achando hein'];

function comentarios(vida: Vida, tom: Tom, s: string, idadeMeses: number): { autor: string; texto: string }[] {
  const p = vida.personagem;
  const gente = vida.pessoas.filter((x) => x.vivo && !x.afastado && ['amigo', 'colega', 'primo', 'irmao', 'parceiro'].includes(x.papel)
    && Math.abs(x.idadeMeses - vida.relogio.idadeMeses) < 15 * 12 && (x.afeto >= 40 || x.rival));
  const out: { autor: string; texto: string }[] = [];
  const n = gente.length ? 1 + (hash(s + 'n') % Math.min(3, gente.length)) : 0;
  for (let i = 0; i < n; i++) {
    const quem = gente[hash(s + 'c' + i) % gente.length]!;
    if (out.some((c) => c.autor === quem.nome)) continue;
    const lista = tom === 'luto' ? ['meus sentimentos ❤️', 'tô contigo 🫂'] : quem.rival ? COMENTA_RIVAL : tom === 'ruim' ? COMENTA_RUIM : COMENTA_BOM;
    out.push({ autor: quem.nome, texto: escolher(lista, s + 'x' + i) });
  }
  // A mãe comenta (para o terror de quem tem 15 anos).
  const mae = vida.pessoas.find((x) => x.papel === 'mae' && x.vivo);
  if (mae && idadeMeses < 18 * 12 && tom !== 'luto' && sorte(s + 'm') < 0.3) {
    out.push({ autor: mae.nome, texto: escolher([`Lind${p.sexo === 'feminino' ? 'a' : 'o'} da mamãe ❤️❤️`, `Que orgulho meu filh${p.sexo === 'feminino' ? 'a' : 'o'}!!! Comenta aqui pra mãe`, 'Já comeu??', 'Volta antes das dez'], s + 'mm') });
  }
  return out;
}

function curtidas(vida: Vida, tom: Tom, s: string): number {
  const amigos = vida.pessoas.filter((x) => x.vivo && !x.afastado && x.papel === 'amigo').length;
  const base = 15 + vida.personagem.atributos.carisma * 0.6 + amigos * 9 + Math.min(5000, vida.personagem.seguidores * 0.03);
  const mult = (0.6 + sorte(s + 'l')) * (tom === 'bom' ? 1.4 : tom === 'ruim' ? 0.7 : 1);
  return Math.max(1, Math.round(base * mult));
}

function linhaAdolescente(vida: Vida, h: EntradaHistorico, s: string, idadeMeses: number): Item {
  const sr = separarResumo(h.texto); const { corpo } = sr; const tags = etiquetas(sr);
  const esc = partirEscolha(corpo);
  const p = vida.personagem;
  const t0 = esc ? `decidi ${escolhaEu(esc.escolha)}${esc.resto ? `. ${paraPrimeira(esc.resto)}` : ''}` : paraPrimeira(corpo);
  const tom = tomDe(corpo, tags);
  const emoji = tom === 'luto' ? '🕊️' : escolher(EMOJI[tom], s);
  const texto = `${minuscula(semPonto(t0))}${emoji ? ` ${emoji}` : ''}`;
  const acontecimento = h.fato?.tipo === 'evento' || h.fato?.tipo === 'escolha' || MARCO.test(corpo) || tom === 'luto';
  if (!acontecimento) return { tipo: 'story', texto, tags };
  if (p.personalidade.extroversao < -30 && tom !== 'luto') return { tipo: 'post', texto, tags, curtidas: 0, comentarios: [], privado: true };
  const apagado = p.personalidade.impulsividade > 40 && tom === 'ruim' && sorte(s + 'ap') < 0.6;
  return {
    tipo: 'post', texto, tags,
    curtidas: tom === 'luto' ? 0 : curtidas(vida, tom, s),
    comentarios: comentarios(vida, tom, s, idadeMeses),
    ...(apagado ? { apagado: true } : {}), ...(tom === 'luto' ? { luto: true } : {}),
  };
}

const RESPOSTAS_ACAO: Record<string, string[]> = {
  brigar: ['Não quero falar com você agora.', 'Sério que você vai mandar isso?', '...'],
  provocar: ['Engraçadinh{o}.', 'Para com isso.', 'Não teve graça.'],
  presente: ['Obrigad{a} ❤️ amei!', 'Não precisava! Mas amei.', 'Você lembrou! 🥹'],
  ajudar: ['Valeu demais, sério.', 'Te devo uma!', 'Sem você não tinha dado.'],
  elogiar: ['Ai, para 🙈', 'Você também!', 'Precisava ouvir isso hoje.'],
  tempo: ['Foi muito bom!', 'Repete logo!', 'Saudade já.'],
  conversar: ['Adorei a conversa', 'Depois a gente continua!', 'Falar com você faz bem.'],
  segredo: ['Fica entre nós 🤐', 'Pode confiar.', 'Nossa... obrigad{a} por confiar.'],
  desculpas: ['Tá tudo bem.', 'Ok. Vamos recomeçar.', 'Eu precisava ouvir isso.'],
  encontro: ['Amei a noite ❤️', 'Quando é o próximo?', 'Chegou em casa?'],
};

function respostaDe(quem: Pessoa | undefined, tom: Tom, s: string, h?: EntradaHistorico): Item | null {
  if (!quem) return null;
  const sobreEla = h?.fato?.tipo === 'pessoa' && h.fato.pessoa === quem.id;
  const daAcao = sobreEla && h?.fato?.id ? RESPOSTAS_ACAO[h.fato.id] : undefined;
  if (daAcao) {
    if (sorte(s + 'resp') > 0.7) return null;
    const a = quem.sexo === 'feminino' ? 'a' : 'o';
    return { tipo: 'msg', autor: quem.nome, texto: escolher(daAcao, s + 'ra').replace('{o}', a).replace('{a}', a), tags: [] };
  }
  if (sorte(s + 'resp') > (tom === 'neutro' ? 0.2 : 0.5)) return null;
  const lista = tom === 'luto' ? ['Tô indo aí. ❤️', 'Sinto muito, de verdade.'] : tom === 'ruim' ? ['Ah não 😔 quer conversar?', 'Força. Tô aqui.', 'Vai dar certo, confia.'] : tom === 'bom' ? ['Aaaa que demais!!', 'Mereceu ❤️', 'kkkkkkk', 'Bora comemorar!'] : ['Hmm', 'Entendi kkk', 'Depois me conta direito', '👍'];
  return { tipo: 'msg', autor: quem.nome, texto: escolher(lista, s + 'rr'), tags: [] };
}

function linhaAdulto(vida: Vida, h: EntradaHistorico, s: string, idadeMeses: number, itens: Item[]) {
  const sr = separarResumo(h.texto); const { corpo } = sr; const tags = etiquetas(sr);
  const esc = partirEscolha(corpo);
  const tom = tomDe(corpo, tags);
  const plano = esc ? `${esc.escolha}${esc.resto ? `. ${esc.resto}` : '.'}` : corpo;

  if (RESUMO_ANO.test(corpo)) { itens.push({ tipo: 'nota', texto: corpo, tags }); return; }
  if (TRABALHO.test(plano) && (h.fato?.tipo !== 'pessoa')) {
    const assunto = /concurso/i.test(plano) ? 'Concurso: atualização da sua inscrição'
      : /aposentadoria|INSS/i.test(plano) ? 'Meu INSS: aviso sobre o seu benefício'
      : /contratad|vaga|entrevista|currículo|freela/i.test(plano) ? 'Processo seletivo'
      : /promovid|promoção|aumento|salário/i.test(plano) ? 'Atualização de cargo e salário'
      : /demiti|demissão/i.test(plano) ? 'Desligamento'
      : /estágio/i.test(plano) ? 'Programa de estágio'
      : esc ? `Re: ${semPonto(esc.escolha).slice(0, 50)}` : 'Aviso interno';
    itens.push({ tipo: 'email', de: /concurso|INSS|aposentadoria/.test(plano) ? 'Governo · gov.br' : 'RH', assunto, texto: esc ? `Sua resposta: ${esc.escolha}. ${esc.resto}`.trim() : corpo, tags });
    return;
  }
  if (DINHEIRO.test(plano) && !esc) { itens.push({ tipo: 'banco', texto: corpo, tags }); return; }
  if (h.fato?.tipo === 'acao') { itens.push({ tipo: 'app', texto: paraPrimeira(corpo), tags }); return; }
  if (MARCO.test(corpo) && !esc) {
    const texto = `${semPonto(paraPrimeira(corpo))}${tom === 'luto' ? ' 🕊️' : ` ${escolher(EMOJI[tom], s)}`}`.trim();
    itens.push({ tipo: 'post', texto, tags, curtidas: tom === 'luto' ? 0 : curtidas(vida, tom, s), comentarios: comentarios(vida, tom, s, idadeMeses), ...(tom === 'luto' ? { luto: true } : {}) });
    return;
  }
  // Conversa: com a pessoa envolvida, ou com quem você mais confia.
  const envolvida = h.fato?.pessoa ? vida.pessoas.find((x) => x.id === h.fato!.pessoa) : undefined;
  const para = envolvida && h.fato?.tipo === 'pessoa' ? envolvida : confidente(vida);
  let texto = esc ? `Decidi: ${escolhaEu(esc.escolha)}.${esc.resto ? ` ${paraPrimeira(esc.resto)}` : ''}` : paraPrimeira(corpo);
  // Falando com a própria pessoa: ela vira "você" ("Eu passei a tarde com você").
  if (para && envolvida && para.id === envolvida.id) {
    texto = texto.replace(new RegExp(`(?<![\\p{L}])(?:(?:meu|minha) [\\p{L}]+ )?${para.nome}(?![\\p{L}])`, 'gu'), 'você').replace(/(^|[.!?]\s+)você/g, (_m, antes: string) => `${antes}Você`);
  }
  itens.push({ tipo: 'msg', meu: true, texto, tags, ...(para ? { para: para.nome } : {}) });
  const r = respostaDe(para, tom, s, h);
  if (r) itens.push(r);
}

const CORRENTES = [
  'Bom dia!! 🌻 Que Deus abençoe sua quinta-feira. Repasse para 10 pessoas que você ama.',
  'Boa noite 🌙 Quem tem fé não está sozinho. Amém?',
  'URGENTE: o leite vai acabar no Brasil, comprem enquanto dá (minha vizinha que falou)',
  'Feliz domingo família 🙏☕ Café com Deus é melhor que café sozinho.',
];

function linhaIdoso(vida: Vida, h: EntradaHistorico, s: string, itens: Item[]) {
  const sr = separarResumo(h.texto); const { corpo } = sr; const tags = etiquetas(sr);
  const esc = partirEscolha(corpo);
  const tom = tomDe(corpo, tags);
  const p = vida.personagem;
  const netos = vivos(vida, ['neto']);
  if (/fechou com o saldo|hábitos seguiram firmes/.test(corpo)) { itens.push({ tipo: 'nota', texto: corpo, tags }); return; }
  if (RESUMO_ANO.test(corpo) && netos.length) {
    const ult = itens.at(-1);
    const frase = paraPrimeira(corpo);
    if (ult?.tipo === 'carta') ult.texto += ` ${frase}`;
    else itens.push({ tipo: 'carta', para: netos.map((n) => n.nome).join(', '), texto: `Queridos netos, mais um ano passou por aqui. ${frase} Venham me ver.` });
    return;
  }
  if (h.fato?.tipo === 'acao') { itens.push({ tipo: 'msg', meu: true, texto: paraPrimeira(corpo), tags }); return; }
  const base = esc ? `Decidi ${escolhaEu(esc.escolha)}.${esc.resto ? ` ${paraPrimeira(esc.resto)}` : ''}` : paraPrimeira(corpo);
  const abre = escolher(['Oi, gente, bom dia! ', 'Alô? Tá gravando? Então... ', 'Família, deixa eu contar: ', 'Oi, meus amores. ', ''], s + 'o');
  const fecha = tom === 'luto' ? ' Rezem por nós.' : escolher([' Beijo, fiquem com Deus.', ' É isso. Beijo.', ' Me liguem, viu?', ' Fiquem com Deus.', ''], s + 'f');
  const dur = Math.max(20, Math.round(base.length * 1.6 + (hash(s) % 90)));
  itens.push({ tipo: 'msg', meu: true, texto: `${abre}${base}${fecha}`, tags, audio: `${Math.floor(dur / 60)}:${String(dur % 60).padStart(2, '0')}` });
  if (sorte(s + 'resp') < 0.5) {
    const quem = escolher([...netos, ...vivos(vida, ['filho'])].filter(Boolean), s + 'q');
    if (quem) {
      const vo = p.sexo === 'feminino' ? 'vó' : 'vô';
      const lista = tom === 'luto' ? ['❤️🙏', `Te amo, ${vo}`] : tom === 'ruim' ? [`Calma, ${vo}, já tô ligando`, '🙏🙏'] : [`Amém ${vo} 🙏`, `kkkkk ${vo}`, '❤️', `Áudio de 4 minutos ${vo}, tô no trabalho kkk`];
      itens.push({ tipo: 'msg', autor: quem.nome, texto: escolher(lista, s + 'rq'), tags: [] });
    }
  }
}

// ---- Montagem ----

/** Reconta o histórico por fase. Cada período vira um bloco no formato da idade de então. */
export function recontar(vida: Vida, historico: EntradaHistorico[] = vida.historico): Bloco[] {
  NOMES_PROPRIOS = new Set([vida.personagem.nome, ...vida.pessoas.map((x) => x.nome)]);
  const blocos: Bloco[] = [];
  const p = vida.personagem;
  let i = 0;
  for (const h of historico) {
    i++;
    const s = `${vida.config.seed}|${h.quando}|${i}|${h.texto.length}`;
    const idade = idadeNaData(vida, h.quando) ?? vida.relogio.idadeMeses;
    const fase = faseDaIdade(Math.max(0, idade));
    let bloco = blocos.at(-1);
    if (!bloco || bloco.quando !== h.quando || bloco.fase !== fase) {
      const titulo = fase === 'bebe' ? (p.classe === 'baixa' ? 'Família 💛 (celular da casa)' : 'Família 💛')
        : fase === 'crianca' ? 'Querido diário,'
        : fase === 'adolescente' ? handle(vida)
        : fase === 'idoso' ? 'Família 💛' : '';
      bloco = { quando: h.quando, fase, titulo, itens: [] };
      blocos.push(bloco);
    }
    if (h.texto.startsWith('✦')) { bloco.itens.push({ tipo: 'deus', texto: h.texto }); continue; }
    // A frase de abertura da vida é do narrador, não uma mensagem.
    if (i === 1 && !h.fato) { bloco.itens.push({ tipo: 'nota', texto: h.texto, tags: [] }); continue; }
    // Perguntas do próprio jogo (vagas, cursos, pretendentes) ficam neutras em qualquer fase.
    if (h.fato?.tipo === 'evento' && h.fato.id?.startsWith('@')) {
      const sr = separarResumo(h.texto);
      bloco.itens.push({ tipo: 'nota', texto: sr.corpo, tags: etiquetas(sr) });
      continue;
    }
    switch (fase) {
      case 'bebe': linhaBebe(vida, h, s, responsavel(vida), bloco.itens); break;
      case 'crianca': bloco.itens.push(linhaDiario(vida, h, s, idade / 12)); break;
      case 'adolescente': bloco.itens.push(linhaAdolescente(vida, h, s, idade)); break;
      case 'adulto': linhaAdulto(vida, h, s, idade, bloco.itens); break;
      case 'idoso': linhaIdoso(vida, h, s, bloco.itens); break;
    }
  }
  // Correntes de bom-dia na velhice, de vez em quando.
  for (const b of blocos) {
    if (b.fase === 'idoso' && sorte(`${vida.config.seed}|corrente|${b.quando}`) < 0.15) {
      b.itens.push({ tipo: 'corrente', autor: p.nome, texto: escolher(CORRENTES, `${vida.config.seed}|${b.quando}`) });
    }
  }
  return blocos;
}

/** Todo o texto que o leitor vê num item (para testes e acessibilidade). */
export function textoDoItem(it: Item): string {
  switch (it.tipo) {
    case 'email': return `${it.de}: ${it.assunto}. ${it.texto}`;
    case 'carta': return it.texto;
    case 'corrente': return it.texto;
    case 'post': return `${it.texto} ${it.comentarios.map((c) => c.texto).join(' ')}`;
    default: return it.texto;
  }
}
