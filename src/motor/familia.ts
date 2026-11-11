// Família e vida amorosa: pais, irmãos, parceiro e filhos com afeto,
// envelhecimento e morte; ações com cada pessoa; romance; filhos;
// herança; e continuar a história como um dos filhos.

import nomes from '../conteudo/nomes.json';
import { EMPREGOS, estadoDe, estudoInicial, tituloEmprego } from './carreira';
import { curva } from './curva';
import { aplicar, atende, lembrar, reais } from './efeitos';
import {
  alvoAparencia, alvoForma, alvoInteligencia, alvoSaude, chanceMorteAnual, limitar, patamarFelicidade,
} from './envelhecer';
import { anosDaJanela, quandoAgora, rotuloPeriodo } from './tempo';
import { Rng } from './rng';
import {
  EIXOS, VERSAO_SAVE,
  type Atributo, type Classe, type Eixo, type Pendente, type Pessoa, type Potencial, type Sexo, type Vida,
} from './tipos';

const idadeAnos = (p: { idadeMeses: number }) => p.idadeMeses / 12;
const fem = (p: { sexo: Sexo }) => p.sexo === 'feminino';

/** "sua mãe", "seu irmão", "sua namorada"... */
export function papelTexto(p: Pessoa): string {
  switch (p.papel) {
    case 'mae': return 'sua mãe';
    case 'pai': return 'seu pai';
    case 'irmao': return fem(p) ? 'sua irmã' : 'seu irmão';
    case 'filho': return fem(p) ? 'sua filha' : 'seu filho';
    case 'ex': return fem(p) ? 'sua ex' : 'seu ex';
    case 'parceiro':
      if (p.relacao === 'casamento') return fem(p) ? 'sua esposa' : 'seu marido';
      return fem(p) ? 'sua namorada' : 'seu namorado';
  }
}
export const capitalizar = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const novoIdPessoa = (rng: Rng) => `p${Math.floor(rng.proximo() * 1e9).toString(36)}${Math.floor(rng.proximo() * 1e9).toString(36)}`;

export interface OpcoesPessoa {
  papel: Pessoa['papel'];
  idadeMeses: number;
  sexo?: Sexo;
  sobrenome?: string;
  afeto?: [number, number];
  /** Genética herdada: média dos dois genitores com variação. */
  pais?: [Potencial, Potencial?];
}

export function gerarPessoa(rng: Rng, o: OpcoesPessoa): Pessoa {
  const sexo: Sexo = o.sexo ?? (rng.proximo() < 0.5 ? 'feminino' : 'masculino');
  const herdar = (k: keyof Potencial, min: number, max: number) => {
    if (!o.pais) return rng.normalAprox(min, max);
    const [a, b] = o.pais;
    const media = b ? (a[k] + b[k]) / 2 : (a[k] + rng.normalAprox(min, max)) / 2;
    return Math.round(limitar(media + (rng.proximo() * 2 - 1) * 15));
  };
  const potencial: Potencial = {
    saude: herdar('saude', 45, 100),
    forma: herdar('forma', 25, 95),
    aparencia: herdar('aparencia', 15, 95),
    inteligencia: herdar('inteligencia', 15, 98),
    carisma: herdar('carisma', 15, 95),
  };
  const personalidade = {} as Record<Eixo, number>;
  for (const e of EIXOS) personalidade[e] = rng.normalAprox(-70, 70);
  const idade = o.idadeMeses / 12;
  const [amin, amax] = o.afeto ?? [50, 85];
  return {
    id: novoIdPessoa(rng),
    nome: rng.escolher(nomes[sexo]),
    sobrenome: o.sobrenome ?? rng.escolher(nomes.sobrenomes),
    sexo,
    papel: o.papel,
    idadeMeses: o.idadeMeses,
    vivo: true,
    afeto: rng.inteiro(amin, amax),
    saude: Math.round(alvoSaude(potencial.saude, idade, personalidade.disciplina)),
    aparencia: Math.round(alvoAparencia(potencial.aparencia, idade)),
    inteligencia: Math.round(alvoInteligencia(potencial.inteligencia, idade)),
    carisma: potencial.carisma,
    potencial,
    personalidade,
    renda: idade >= 18 ? rendaSorteada(rng) : 0,
  };
}

function rendaSorteada(rng: Rng): number {
  const x = rng.proximo();
  return Math.round((x < 0.15 ? 0 : 1630 + x * x * 9000) / 10) * 10;
}

/** Pais e irmãos de quem acabou de nascer (ou começa adulto). */
export function criarFamilia(rng: Rng, sobrenome: string, idadeJogadorMeses: number, classe: Classe): Pessoa[] {
  const pessoas: Pessoa[] = [];
  const idadeMae = rng.inteiro(18, 40);
  const mae = gerarPessoa(rng, { papel: 'mae', sexo: 'feminino', idadeMeses: (idadeMae * 12) + idadeJogadorMeses, afeto: [70, 95] });
  pessoas.push(mae);
  if (rng.proximo() < 0.85) {
    const idadePai = Math.max(18, idadeMae + rng.inteiro(-3, 8));
    pessoas.push(gerarPessoa(rng, { papel: 'pai', sexo: 'masculino', sobrenome, idadeMeses: (idadePai * 12) + idadeJogadorMeses, afeto: [60, 90] }));
  }
  const x = rng.proximo();
  const irmaos = classe === 'baixa' ? (x < 0.35 ? 0 : x < 0.65 ? 1 : x < 0.85 ? 2 : 3) : (x < 0.5 ? 0 : x < 0.85 ? 1 : 2);
  for (let i = 0; i < irmaos; i++) {
    const maxMais = Math.max(1, idadeMae - 18);
    pessoas.push(gerarPessoa(rng, {
      papel: 'irmao', sobrenome, idadeMeses: rng.inteiro(1, Math.min(12, maxMais)) * 12 + idadeJogadorMeses,
      pais: [mae.potencial], afeto: [45, 85],
    }));
  }
  return pessoas;
}

// ---- Período ----

/** Envelhece a família, sorteia mortes e nascimentos, cobra filhos. Devolve linhas. */
export function rodarPessoas(vida: Vida, anos: number, rng: Rng, resumir = true): string[] {
  const linhas: string[] = [];
  const p = vida.personagem;
  const idadeJogador = vida.relogio.idadeMeses / 12;

  // Nascimentos e adoções marcados.
  const agora = vida.relogio.idadeMeses;
  for (const g of vida.ganchos.filter((x) => x.evento.startsWith('@') && x.idadeMeses <= agora)) {
    if (g.evento === '@nascimento' || g.evento === '@adocao') linhas.push(...nascer(vida, rng, g.evento === '@adocao', g.vars?.outro));
  }
  vida.ganchos = vida.ganchos.filter((x) => !(x.evento.startsWith('@') && x.idadeMeses <= agora));

  for (const pe of vida.pessoas) {
    if (!pe.vivo) continue;
    pe.idadeMeses += anos * 12;
    const idade = idadeAnos(pe);
    pe.saude = Math.round(limitar(pe.saude + (alvoSaude(pe.potencial.saude, idade, pe.personalidade.disciplina) - pe.saude) * 0.25 * anos + (rng.proximo() * 2 - 1) * 3 * anos));
    pe.aparencia = Math.round(limitar(pe.aparencia + (alvoAparencia(pe.potencial.aparencia, idade) - pe.aparencia) * 0.3 * anos));
    pe.inteligencia = Math.round(limitar(pe.inteligencia + (alvoInteligencia(pe.potencial.inteligencia, idade) - pe.inteligencia) * 0.3 * anos));
    if (idade >= 18 && pe.renda === 0 && rng.proximo() < 0.3 * anos) pe.renda = rendaSorteada(rng);

    // O afeto esfria sem contato; criança pequena adora quem cuida.
    const alvo = pe.papel === 'filho' && idade < 12 ? 85 : pe.papel === 'parceiro' ? 35 : pe.papel === 'ex' ? 20 : 45;
    const vel = pe.papel === 'parceiro' ? 0.15 : 0.08;
    pe.afeto = Math.round(limitar(pe.afeto + (alvo - pe.afeto) * vel * anos));

    if (pe.papel === 'filho' && idade >= 18 && idade - anos < 18) linhas.push(`${capitalizar(papelTexto(pe))} ${pe.nome} fez 18 anos.`);

    const { natural, acidente } = chanceMorteAnual(idade, pe.saude, pe.personalidade.impulsividade);
    const chance = pe.saude <= 0 ? 1 : 1 - (1 - Math.min(1, natural + acidente)) ** anos;
    if (rng.proximo() < chance) {
      const causa = idade < 50 ? rng.escolher(['em um acidente', 'de uma doença grave', 'de um infarto']) : rng.escolher(['de causas naturais', 'de um AVC', 'de um câncer', 'de um infarto', 'de uma pneumonia']);
      pe.vivo = false;
      pe.morte = { ano: vida.relogio.ano, idadeMeses: pe.idadeMeses, causa };
      if (pe.papel === 'ex') continue;
      linhas.push(`${capitalizar(papelTexto(pe))}, ${pe.nome}, morreu aos ${Math.floor(idade)} anos, ${causa}.`);
      const dor = Math.round(pe.afeto / 5 + (pe.papel === 'filho' || pe.papel === 'parceiro' ? 10 : 0));
      aplicar(vida, { 'atributos.felicidade': -dor, 'personalidade.estabilidade': -2 });
      lembrar(vida, `morte_${pe.papel}`, `perdeu ${papelTexto(pe)}, ${pe.nome}`, -Math.round(10 + pe.afeto / 3), { pessoa: pe.nome });
      if (pe.papel === 'mae' || pe.papel === 'pai') linhas.push(...talvezHeranca(vida, rng));
    }
  }

  // Irmãos novos enquanto você é criança.
  const mae = vida.pessoas.find((x) => x.papel === 'mae' && x.vivo);
  const pai = vida.pessoas.find((x) => x.papel === 'pai' && x.vivo);
  if (mae && pai && idadeAnos(mae) < 42 && idadeJogador < 14 && rng.proximo() < 0.15 * anos) {
    const bebe = gerarPessoa(rng, { papel: 'irmao', idadeMeses: 0, sobrenome: p.sobrenome, pais: [mae.potencial, pai.potencial], afeto: [60, 85] });
    vida.pessoas.push(bebe);
    linhas.push(`Nasceu ${fem(bebe) ? 'sua irmã' : 'seu irmão'}, ${bebe.nome}!`);
  }

  // Filhos custam até os 18; casado, o parceiro divide as contas.
  if (idadeJogador >= 18) {
    const filhos = vida.pessoas.filter((x) => x.papel === 'filho' && x.vivo && idadeAnos(x) < 18).length;
    let custo = filhos * 600 * 12 * anos;
    const parc = vida.pessoas.find((x) => x.papel === 'parceiro' && x.vivo && x.relacao === 'casamento');
    let ajuda = 0;
    if (parc && parc.renda > 0) {
      ajuda = Math.min(parc.renda * 0.5, custo / (12 * anos) * 0.5 + (p.moradia === 'aluguel' ? estadoDe(vida).custoVida * 0.5 : 0)) * 12 * anos;
    }
    custo -= ajuda;
    if (filhos > 0 || ajuda > 0) {
      p.dinheiro = Math.round(p.dinheiro - custo);
      if (filhos > 0 && resumir) linhas.push(`Criar ${filhos === 1 ? 'seu filho' : `${filhos} filhos`} custou ${reais(filhos * 600 * 12 * anos)} no período${ajuda > 0 ? `; ${parc!.nome} ajudou com ${reais(ajuda)}` : ''}.`);
    }
  }
  return linhas;
}

function nascer(vida: Vida, rng: Rng, adotado: boolean, outroId?: string): string[] {
  const p = vida.personagem;
  const outro = vida.pessoas.find((x) => x.id === outroId);
  const idadeMeses = adotado ? rng.inteiro(0, 6) * 12 : 0;
  const filho = gerarPessoa(rng, {
    papel: 'filho', idadeMeses, sobrenome: p.sobrenome, afeto: [75, 95],
    ...(adotado ? {} : { pais: [p.potencial, outro?.potencial] as [Potencial, Potencial?] }),
  });
  if (outro) filho.outroGenitor = outro.id;
  if (adotado) filho.adotado = true;
  vida.pessoas.push(filho);
  aplicar(vida, { 'atributos.felicidade': 12 });
  const quem = fem(filho) ? 'sua filha' : 'seu filho';
  lembrar(vida, adotado ? 'adotou_filho' : 'nasceu_filho', adotado ? `adotou ${filho.nome}` : `viu ${filho.nome} nascer`, 30, { pessoa: filho.nome });
  return [adotado
    ? `A adoção saiu! ${capitalizar(quem)}, ${filho.nome}, de ${Math.floor(idadeMeses / 12)} anos, chegou em casa.`
    : `Nasceu ${quem}, ${filho.nome}!`];
}

const HERANCA: Record<Classe, number> = { baixa: 8000, media: 80000, alta: 700000 };

function talvezHeranca(vida: Vida, rng: Rng): string[] {
  const vivos = vida.pessoas.filter((x) => (x.papel === 'mae' || x.papel === 'pai') && x.vivo);
  if (vivos.length > 0 || vida.memorias.some((m) => m.id === 'heranca')) return [];
  const irmaos = vida.pessoas.filter((x) => x.papel === 'irmao' && x.vivo).length;
  const total = HERANCA[vida.personagem.classe] * (0.5 + rng.proximo());
  const parte = Math.round(total / (1 + irmaos));
  vida.personagem.dinheiro += parte;
  lembrar(vida, 'heranca', 'recebeu a herança dos pais', 0);
  return [`Inventário encerrado: sua parte da herança foi ${reais(parte)}${irmaos ? `, dividida com ${irmaos} irmão(s)` : ''}.`];
}

// ---- Ações com uma pessoa ----

export interface AcaoPessoaDef {
  id: string;
  nome: string;
  pode: (vida: Vida, pe: Pessoa) => boolean;
  custo?: number;
}

const adulto = (vida: Vida) => vida.relogio.idadeMeses >= 18 * 12;
const temParceiroVivo = (vida: Vida) => vida.pessoas.some((x) => x.papel === 'parceiro' && x.vivo);

export const ACOES_PESSOA: AcaoPessoaDef[] = [
  { id: 'tempo', nome: 'Passar tempo junto', pode: (v, pe) => pe.vivo && v.relogio.idadeMeses >= 12 },
  { id: 'conversar', nome: 'Conversar', pode: (v, pe) => pe.vivo && v.relogio.idadeMeses >= 36 && pe.idadeMeses >= 36 },
  { id: 'presente', nome: 'Dar um presente', custo: 100, pode: (v, pe) => pe.vivo && v.relogio.idadeMeses >= 10 * 12 },
  { id: 'brigar', nome: 'Brigar', pode: (v, pe) => pe.vivo && v.relogio.idadeMeses >= 4 * 12 && pe.idadeMeses >= 4 * 12 },
  { id: 'pedir_dinheiro', nome: 'Pedir dinheiro', pode: (v, pe) => pe.vivo && v.relogio.idadeMeses >= 6 * 12 && (pe.papel === 'mae' || pe.papel === 'pai' || pe.papel === 'parceiro' || (pe.papel === 'irmao' && pe.idadeMeses >= 18 * 12)) },
  { id: 'encontro', nome: 'Sair para um encontro', custo: 120, pode: (_v, pe) => pe.vivo && pe.papel === 'parceiro' },
  { id: 'casar', nome: 'Pedir em casamento', pode: (v, pe) => pe.vivo && pe.papel === 'parceiro' && pe.relacao === 'namoro' && adulto(v) },
  { id: 'filho', nome: 'Tentar ter um filho', pode: (v, pe) => pe.vivo && pe.papel === 'parceiro' && adulto(v) && podeGestar(v, pe) },
  { id: 'adotar', nome: 'Adotar uma criança', pode: (v, pe) => pe.vivo && pe.papel === 'parceiro' && v.relogio.idadeMeses >= 25 * 12 },
  { id: 'terminar', nome: 'Terminar', pode: (_v, pe) => pe.vivo && pe.papel === 'parceiro' },
  { id: 'reatar', nome: 'Tentar voltar', pode: (v, pe) => pe.vivo && pe.papel === 'ex' && !temParceiroVivo(v) && v.relogio.idadeMeses >= 15 * 12 },
  { id: 'brincar', nome: 'Brincar junto', pode: (_v, pe) => pe.vivo && pe.papel === 'filho' && pe.idadeMeses < 12 * 12 },
  { id: 'ensinar', nome: 'Ensinar algo', pode: (_v, pe) => pe.vivo && pe.papel === 'filho' && pe.idadeMeses >= 3 * 12 && pe.idadeMeses < 18 * 12 },
];

/** Um dos dois pode engravidar (simplificação: casal de sexos diferentes, idade fértil). */
function podeGestar(vida: Vida, pe: Pessoa): boolean {
  const p = vida.personagem;
  if (p.sexo === pe.sexo) return false;
  const gestante = p.sexo === 'feminino' ? vida.relogio.idadeMeses / 12 : idadeAnos(pe);
  return gestante >= 16 && gestante <= 48;
}

export function acoesDaPessoa(vida: Vida, pe: Pessoa): AcaoPessoaDef[] {
  if (vida.morte) return [];
  return ACOES_PESSOA.filter((a) => a.pode(vida, pe));
}

export interface ResultadoPessoa { vida: Vida; ok: boolean; aviso?: string }

export function fazerAcaoPessoa(vida: Vida, pessoaId: string, acaoId: string): ResultadoPessoa {
  const pe0 = vida.pessoas.find((x) => x.id === pessoaId);
  const a = ACOES_PESSOA.find((x) => x.id === acaoId);
  if (!pe0 || !a || !a.pode(vida, pe0)) return { vida, ok: false, aviso: 'Não dá para fazer isso agora.' };
  const custo = vida.relogio.idadeMeses < 18 * 12 && acaoId === 'presente' ? 30 : a.custo ?? 0;
  if (custo > 0 && vida.personagem.dinheiro < custo) return { vida, ok: false, aviso: `Sem dinheiro: precisa de ${reais(custo)}.` };

  const prox = structuredClone(vida);
  const rng = new Rng(prox.rng);
  const pe = prox.pessoas.find((x) => x.id === pessoaId)!;
  const p = prox.personagem;
  const chave = `p:${pessoaId}:${acaoId}`;
  const m = prox.periodo[chave] ?? 0;
  prox.periodo[chave] = m + 1;
  const anos = anosDaJanela(prox.config.turno);
  const rend = anos * (curva((m + 1) / anos) - curva(m / anos));
  const quem = `${papelTexto(pe)}, ${pe.nome}`;
  const afetoAntes = pe.afeto;
  const mudar = (d: number) => { pe.afeto = Math.round(limitar(pe.afeto + d)); };
  let texto = '';
  p.dinheiro -= custo;

  switch (acaoId) {
    case 'tempo':
      mudar(7 * rend); aplicar(prox, { 'atributos.felicidade': 1.5 * rend, desgaste: 1 });
      texto = rng.escolher([`Você passou a tarde com ${quem}.`, `Você e ${quem}, saíram para dar uma volta.`, `Você almoçou com ${quem}.`]);
      break;
    case 'conversar':
      mudar(4 * rend); aplicar(prox, { 'atributos.felicidade': 0.5 * rend });
      texto = `Você conversou com ${quem}.`;
      break;
    case 'presente':
      mudar(6 * rend);
      texto = `Você deu um presente para ${quem}.`;
      break;
    case 'brigar':
      mudar(-12); aplicar(prox, { 'atributos.felicidade': -2, desgaste: 3 });
      texto = rng.escolher([`Você brigou feio com ${quem}.`, `Você e ${quem}, discutiram aos gritos.`]);
      break;
    case 'encontro':
      mudar(8 * rend); aplicar(prox, { 'atributos.felicidade': 2 * rend });
      texto = rng.escolher([`Você levou ${pe.nome} para jantar.`, `Você e ${pe.nome} foram ao cinema.`, `Você e ${pe.nome} passaram o domingo juntos.`]);
      break;
    case 'brincar':
      mudar(6 * rend); aplicar(prox, { 'atributos.felicidade': 2 * rend });
      texto = `Você brincou com ${quem}.`;
      break;
    case 'ensinar':
      mudar(2 * rend);
      pe.inteligencia = Math.round(limitar(pe.inteligencia + 1.5 * rend));
      pe.potencial.inteligencia = Math.round(limitar(pe.potencial.inteligencia + 0.5 * rend));
      texto = `Você ensinou algo novo para ${quem}.`;
      break;
    case 'pedir_dinheiro': {
      const valorBase = pe.papel === 'parceiro' || pe.papel === 'irmao'
        ? Math.max(50, pe.renda * 0.15)
        : { baixa: 60, media: 300, alta: 2000 }[p.classe];
      const chance = pe.afeto / 100 - 0.2 * m;
      mudar(-(3 + 4 * m));
      if (rng.proximo() < chance) {
        const valor = Math.round((valorBase * (0.5 + rng.proximo())) / 10) * 10;
        p.dinheiro += valor;
        texto = `Você pediu dinheiro para ${quem}, e ganhou ${reais(valor)}.`;
      } else {
        texto = m >= 2
          ? `Você pediu dinheiro de novo para ${quem}. A resposta veio seca: "de novo?".`
          : `Você pediu dinheiro para ${quem}, que disse que não dá agora.`;
      }
      break;
    }
    case 'casar': {
      if (rng.proximo() < (pe.afeto - 40) / 45) {
        pe.relacao = 'casamento';
        mudar(10);
        aplicar(prox, { 'atributos.felicidade': 12 });
        lembrar(prox, 'casamento', `se casou com ${pe.nome}`, 30, { pessoa: pe.nome });
        texto = `${pe.nome} disse sim! Vocês se casaram${p.moradia === 'pais' ? ' e foram morar juntos' : ''}.`;
        p.moradia = 'aluguel';
      } else {
        mudar(-10);
        aplicar(prox, { 'atributos.felicidade': -6 });
        texto = `Você pediu ${pe.nome} em casamento. A resposta foi "ainda não".`;
      }
      break;
    }
    case 'filho': {
      if (prox.ganchos.some((g) => g.evento === '@nascimento')) {
        texto = 'Vocês já estão esperando um bebê.';
        break;
      }
      const gestante = p.sexo === 'feminino' ? prox.relogio.idadeMeses / 12 : idadeAnos(pe);
      const base = gestante <= 30 ? 0.3 : gestante <= 35 ? 0.2 : gestante <= 40 ? 0.1 : 0.02;
      if (rng.proximo() < base) {
        prox.ganchos.push({ evento: '@nascimento', idadeMeses: prox.relogio.idadeMeses + 9, vars: { outro: pe.id } });
        aplicar(prox, { 'atributos.felicidade': 6 });
        texto = `Teste positivo! Você e ${pe.nome} vão ter um bebê.`;
      } else {
        texto = `Você e ${pe.nome} estão tentando ter um filho. Ainda não foi desta vez.`;
      }
      break;
    }
    case 'adotar': {
      if (prox.ganchos.some((g) => g.evento === '@adocao')) {
        texto = 'O processo de adoção já está andando.';
        break;
      }
      prox.ganchos.push({ evento: '@adocao', idadeMeses: prox.relogio.idadeMeses + rng.inteiro(12, 30), vars: { outro: pe.id } });
      texto = `Você e ${pe.nome} entraram na fila de adoção. Pode levar um ou dois anos.`;
      break;
    }
    case 'terminar':
      texto = terminar(prox, pe);
      break;
    case 'reatar': {
      if (rng.proximo() < pe.afeto / 100) {
        pe.papel = 'parceiro';
        pe.relacao = 'namoro';
        mudar(15);
        texto = `Você e ${pe.nome} voltaram!`;
      } else {
        mudar(-5);
        texto = `${pe.nome} não quis voltar.`;
      }
      break;
    }
  }

  const d = pe.afeto - afetoAntes;
  const extra = [custo > 0 ? `−${reais(custo)}` : '', d !== 0 ? `Afeto de ${pe.nome} ${d > 0 ? '+' : '−'}${Math.abs(d)}` : ''].filter(Boolean).join(' · ');
  const quando = quandoAgora(prox);
  prox.historico.push({ quando, texto: extra ? `${texto} ${extra}` : texto });
  prox.rng = rng.estado();
  return { vida: prox, ok: true };
}

/** Termina namoro ou casamento. No divórcio, os bens se dividem. */
export function terminar(vida: Vida, pe: Pessoa): string {
  const casados = pe.relacao === 'casamento';
  pe.papel = 'ex';
  delete pe.relacao;
  pe.afeto = Math.round(limitar(pe.afeto - 25));
  aplicar(vida, { 'atributos.felicidade': -8 });
  lembrar(vida, casados ? 'divorcio' : 'termino', casados ? `se divorciou de ${pe.nome}` : `terminou com ${pe.nome}`, -15, { pessoa: pe.nome });
  if (casados && vida.personagem.dinheiro > 0) {
    const parte = Math.round(vida.personagem.dinheiro * 0.4);
    vida.personagem.dinheiro -= parte;
    return `Você e ${pe.nome} se divorciaram. A partilha levou ${reais(parte)}.`;
  }
  return `Você e ${pe.nome} terminaram.`;
}

// ---- Romance ----

export function pendentePretendentes(vida: Vida, rng: Rng): Pendente {
  const p = vida.personagem;
  const idade = vida.relogio.idadeMeses / 12;
  const sexos: Sexo[] = p.interesse === 'homens' ? ['masculino'] : p.interesse === 'mulheres' ? ['feminino'] : ['feminino', 'masculino'];
  const candidatos: Pessoa[] = [];
  for (let i = 0; i < 3; i++) {
    // Menores só conhecem gente da mesma faixa; adultos, só adultos.
    const [min, max] = idade < 18 ? [Math.max(15, idade - 2), Math.min(17.9, idade + 2)] : [Math.max(18, idade - 8), idade + 8];
    const c = gerarPessoa(rng, { papel: 'parceiro', sexo: rng.escolher(sexos), idadeMeses: Math.round((min + rng.proximo() * (max - min)) * 12), afeto: [55, 75] });
    candidatos.push(c);
  }
  const jeito = (c: Pessoa) => {
    const pp = c.personalidade;
    const traços = [
      pp.extroversao > 30 ? 'extrovertid' + (fem(c) ? 'a' : 'o') : pp.extroversao < -30 ? 'reservad' + (fem(c) ? 'a' : 'o') : '',
      pp.empatia > 30 ? 'carinhos' + (fem(c) ? 'a' : 'o') : pp.empatia < -30 ? 'fri' + (fem(c) ? 'a' : 'o') : '',
      pp.ambicao > 30 ? 'ambicios' + (fem(c) ? 'a' : 'o') : '',
      pp.impulsividade > 30 ? 'intens' + (fem(c) ? 'a' : 'o') : '',
      pp.curiosidade > 30 ? 'curios' + (fem(c) ? 'a' : 'o') : '',
    ].filter(Boolean);
    return traços.slice(0, 2).join(' e ') || 'na del' + (fem(c) ? 'a' : 'e');
  };
  return {
    evento: '@pretendentes', sistema: 'pretendentes', vars: {}, candidatos,
    texto: 'Você conheceu algumas pessoas interessantes. Com quem quer tentar?',
    dados: [...candidatos.map((c) => c.id), 'nada'],
    escolhas: [
      ...candidatos.map((c) => ({
        texto: `${c.nome}, ${Math.floor(idadeAnos(c))} anos · ${c.aparencia >= 70 ? 'muito bonit' + (fem(c) ? 'a' : 'o') : c.aparencia >= 45 ? 'bonit' + (fem(c) ? 'a' : 'o') : 'charme discreto'} · ${jeito(c)} · ${rotulo(chancePretendente(vida, c))}`,
      })),
      { texto: 'Ninguém por enquanto' },
    ],
  };
}

const rotulo = (x: number) => (x >= 0.6 ? 'chance alta' : x >= 0.3 ? 'chance média' : 'chance baixa');

export function chancePretendente(vida: Vida, c: Pessoa): number {
  const a = vida.personagem.atributos;
  return Math.max(0.05, Math.min(0.9, 0.4 + (a.aparencia - c.aparencia) * 0.006 + (a.carisma - 50) * 0.005));
}

export function resolverPretendente(vida: Vida, pend: Pendente, indice: number, rng: Rng): string {
  const id = pend.dados?.[indice];
  const c = pend.candidatos?.find((x) => x.id === id);
  if (!c) return 'Você preferiu ficar na sua por enquanto.';
  if (rng.proximo() < chancePretendente(vida, c)) {
    c.relacao = 'namoro';
    vida.pessoas.push(c);
    aplicar(vida, { 'atributos.felicidade': 8 });
    const primeiro = !vida.memorias.some((m) => m.id === 'namoro');
    lembrar(vida, 'namoro', `começou a namorar ${c.nome}`, primeiro ? 20 : 10, { pessoa: c.nome });
    return `Vocês saíram, riram muito e começaram a namorar. ${c.nome} agora é ${papelTexto(c)}.`;
  }
  aplicar(vida, { 'atributos.felicidade': -3 });
  return `${c.nome} foi simpátic${fem(c) ? 'a' : 'o'}, mas não quis nada com você.`;
}

/** Ação "Procurar alguém": abre os pretendentes. */
export function acaoFamilia(vida: Vida, especial: string, rng: Rng): string | null {
  if (especial !== 'procurar_parceiro') return null;
  if (vida.pendente) return 'Resolva a decisão pendente antes.';
  vida.pendente = pendentePretendentes(vida, rng);
  return null;
}

// ---- Continuar como filho ----

export function filhosQuePodemContinuar(vida: Vida): Pessoa[] {
  return vida.pessoas.filter((x) => x.papel === 'filho' && x.vivo);
}

/** Cria a vida do filho a partir da vida que acabou. A anterior fica como está. */
export function continuarComoFilho(morta: Vida, filhoId: string, novoId: string, criadaEm: string): Vida {
  const f = morta.pessoas.find((x) => x.id === filhoId && x.papel === 'filho' && x.vivo);
  if (!f || !morta.morte) throw new Error('Não dá para continuar com essa pessoa.');
  const geracao = morta.linhagem.geracao + 1;
  const seed = `${morta.config.seed}/${geracao}`;
  const rng = Rng.daSeed(seed);
  const pm = morta.personagem;
  const idade = idadeAnos(f);

  const filhosVivos = filhosQuePodemContinuar(morta).length;
  const heranca = Math.max(0, Math.round(pm.dinheiro / filhosVivos));
  // Filho adulto já tinha a vida dele: chega com um ano de renda guardado.
  const poupanca = idadeAnos(f) >= 18 ? f.renda * 12 : 0;
  const salario = pm.trabalho.emprego?.salario ?? pm.trabalho.aposentadoria;
  const classe: Classe = salario >= 10000 || heranca >= 300000 ? 'alta' : salario >= 3000 || heranca >= 30000 ? 'media' : 'baixa';

  // Quem morreu vira mãe/pai; o outro genitor também; os outros filhos viram irmãos.
  const pessoas: Pessoa[] = [];
  const genitorMorto: Pessoa = {
    id: `p-${morta.id}`, nome: pm.nome, sobrenome: pm.sobrenome, sexo: pm.sexo, papel: fem(pm) ? 'mae' : 'pai',
    idadeMeses: morta.morte.idadeMeses, vivo: false, afeto: f.afeto, saude: 0,
    aparencia: Math.round(pm.atributos.aparencia), inteligencia: Math.round(pm.atributos.inteligencia), carisma: Math.round(pm.atributos.carisma),
    potencial: pm.potencial, personalidade: pm.personalidade, renda: 0, morte: morta.morte,
  };
  pessoas.push(genitorMorto);
  const outro = morta.pessoas.find((x) => x.id === f.outroGenitor);
  if (outro) pessoas.push({ ...structuredClone(outro), papel: fem(outro) ? 'mae' : 'pai', afeto: Math.max(50, f.afeto), relacao: undefined });
  for (const irmao of morta.pessoas.filter((x) => x.papel === 'filho' && x.id !== f.id)) {
    pessoas.push({ ...structuredClone(irmao), papel: 'irmao', afeto: rng.inteiro(45, 85) });
  }

  const atributos: Record<Atributo, number> = {
    saude: f.saude, aparencia: f.aparencia, inteligencia: f.inteligencia, carisma: f.carisma,
    forma: Math.round(alvoForma(f.potencial.forma, idade)),
    felicidade: Math.round(limitar(patamarFelicidade(f.personalidade) - 15)),
    sorte: rng.normalAprox(0, 100),
  };
  const relogio = { ...morta.relogio, idadeMeses: f.idadeMeses };
  const quando = rotuloPeriodo(relogio, morta.config.turno);
  const nomePai = `${fem(pm) ? 'Sua mãe' : 'Seu pai'}, ${pm.nome}`;
  const anteriores = [...morta.linhagem.anteriores, `${pm.nome} ${pm.sobrenome} (${morta.morte.ano - Math.floor(morta.morte.idadeMeses / 12)}–${morta.morte.ano})`];

  const vida: Vida = {
    versao: VERSAO_SAVE,
    id: novoId,
    criadaEm,
    config: { ...morta.config, seed },
    rng: rng.estado(),
    relogio,
    personagem: {
      nome: f.nome, sobrenome: f.sobrenome, sexo: f.sexo, estado: pm.estado, cidade: pm.cidade,
      atributos, personalidade: f.personalidade, potencial: f.potencial,
      dinheiro: heranca + poupanca, desgaste: 20, tracos: [],
      classe, estudo: estudoInicial(classe, rng, idade),
      trabalho: { emprego: null, anosContribuicao: 0, aposentadoria: 0, cargos: [], extras: [] }, dividas: [],
      moradia: idade >= 18 && !outro?.vivo ? 'aluguel' : 'pais', interesse: 'todos',
      habilidades: {}, fama: 0, seguidores: 0, negocio: null,
    },
    atributosAnteriores: { ...atributos },
    historico: [{
      quando,
      texto: `${nomePai}, morreu ${morta.morte.causa}. Você, ${f.nome}, tem ${Math.floor(idade)} ${Math.floor(idade) === 1 ? 'ano' : 'anos'}${heranca > 0 ? ` e herdou ${reais(heranca)}` : ''}. A história continua com você (${geracao}ª geração).`,
    }],
    habitos: [], memorias: [], ganchos: [], pendente: null, periodo: {}, totais: {}, vistos: {}, ganchosCumpridos: 0,
    pessoas,
    linhagem: { geracao, anteriores },
    anterior: null,
    voltas: 0,
  };
  // Filho adulto com renda chega com o emprego mais parecido com o que já fazia.
  if (idade >= 18 && f.renda > 0) {
    const possiveis = EMPREGOS.filter((e) => atende(vida, e.requer));
    const perto = [...possiveis].sort((a, b) => Math.abs(a.salario - f.renda) - Math.abs(b.salario - f.renda))[0];
    if (perto) {
      vida.personagem.trabalho.emprego = { id: perto.id, salario: f.renda, desempenho: 55, nivel: 0, desdeMeses: f.idadeMeses };
      vida.personagem.trabalho.cargos.push(tituloEmprego(vida, vida.personagem.trabalho.emprego));
      vida.personagem.trabalho.anosContribuicao = Math.max(0, idade - 20);
    }
  }
  lembrar(vida, fem(pm) ? 'morte_mae' : 'morte_pai', `perdeu ${fem(pm) ? 'a mãe' : 'o pai'}, ${pm.nome}`, -25, { pessoa: pm.nome });
  return vida;
}

/** Para saves antigos: gera pais plausíveis sem mexer no sorteio da vida. */
export function familiaParaSaveAntigo(vida: Vida): Pessoa[] {
  const rng = Rng.daSeed(`${vida.config.seed}/familia`);
  const p = vida.personagem;
  const pessoas = criarFamilia(rng, p.sobrenome, vida.relogio.idadeMeses, p.classe ?? 'media');
  for (const pe of pessoas) {
    if (idadeAnos(pe) > 95) {
      pe.vivo = false;
      pe.morte = { ano: vida.relogio.ano - 1, idadeMeses: pe.idadeMeses, causa: 'de causas naturais' };
    }
  }
  return pessoas;
}
