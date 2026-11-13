// Criar uma vida e avançar o tempo. Funções puras: recebem um estado e
// devolvem outro, sem tocar em tela nem em save.

import estados from '../conteudo/estados.json';
import nomes from '../conteudo/nomes.json';
import { acaoPorId, rodarHabitos } from './acoes';
import { estudoInicial, rodarDinheiro, rodarEscola, rodarTrabalho, sortearClasse, textoClasse } from './carreira';
import { aplicar, reais } from './efeitos';
import { atributosNaIdade, envelhecer, limitar, sortearMorte } from './envelhecer';
import { garantirGenes } from './corpo';
import { passoDiretor } from './diretor';
import { rodarCapitulos, rodarSonhos } from './capitulos';
import { rodarEventos } from './eventos';
import { criarFamilia, rodarPessoas } from './familia';
import { amigosDeInicio } from './social';
import { Rng } from './rng';
import { anosDoPasso, proximoRelogio, quandoAgora, rotuloPeriodo } from './tempo';
import {
  EIXOS, VERSAO_SAVE,
  type Atributo, type Eixo, type EntradaHistorico, type Linha, type Inicio, type ModoMorte,
  type Potencial, type Relogio, type Sexo, type Turno, type Vida,
} from './tipos';

export interface Estado {
  sigla: string;
  nome: string;
  cidades: string[];
}
export const ESTADOS: readonly Estado[] = estados;

export interface OpcoesNovaVida {
  id: string;
  seed: string;
  ano: number; // ano em que a história começa
  criadaEm: string;
  turno: Turno;
  morte: ModoMorte;
  inicio: Inicio;
  /** Mês em que a história começa (modo dinâmico). */
  mes?: number;
  // Vazios = sorteados pela seed.
  nome?: string;
  sobrenome?: string;
  sexo?: Sexo;
  estado?: string;
}

export const IDADE_INICIO_ADULTO = 18;

export function criarVida(o: OpcoesNovaVida): Vida {
  const rng = Rng.daSeed(o.seed);

  const sexo: Sexo = o.sexo ?? (rng.proximo() < 0.5 ? 'feminino' : 'masculino');
  const nome = o.nome?.trim() || rng.escolher(nomes[sexo]);
  const sobrenome = o.sobrenome?.trim() || rng.escolher(nomes.sobrenomes);
  const estado = ESTADOS.find((e) => e.sigla === o.estado) ?? rng.escolher(ESTADOS);
  const cidade = rng.escolher(estado.cidades);

  const personalidade = {} as Record<Eixo, number>;
  for (const e of EIXOS) personalidade[e] = rng.normalAprox(-70, 70) + 0;

  const potencial: Potencial = {
    saude: rng.normalAprox(45, 100),
    forma: rng.normalAprox(25, 95),
    aparencia: rng.normalAprox(15, 95),
    inteligencia: rng.normalAprox(15, 98),
    carisma: rng.normalAprox(15, 95),
  };

  const idadeMeses = o.inicio === 'adulto' ? IDADE_INICIO_ADULTO * 12 : 0;
  const atributos: Record<Atributo, number> = {
    ...atributosNaIdade(potencial, idadeMeses / 12, personalidade.disciplina),
    felicidade: rng.normalAprox(50, 90),
    sorte: rng.normalAprox(0, 100),
  };

  const classe = sortearClasse(rng);
  const estudo = estudoInicial(classe, rng, idadeMeses / 12);
  const relogio: Relogio = { ano: o.ano, semestre: 1, mes: o.mes ?? 1, idadeMeses };
  const abertura = o.inicio === 'adulto'
    ? `Sua história começa aos ${IDADE_INICIO_ADULTO} anos, em ${cidade} (${estado.sigla}).`
    : `Você nasceu em ${cidade} (${estado.sigla}), numa família ${textoClasse(classe)}.`;

  const vida: Vida = {
    versao: VERSAO_SAVE,
    id: o.id,
    criadaEm: o.criadaEm,
    config: { seed: o.seed, turno: o.turno, morte: o.morte, inicio: o.inicio },
    rng: rng.estado(),
    relogio,
    personagem: {
      nome, sobrenome, sexo, estado: estado.sigla, cidade, atributos, personalidade, potencial,
      dinheiro: 0, desgaste: 0, tracos: [],
      classe, estudo, trabalho: { emprego: null, anosContribuicao: 0, aposentadoria: 0, cargos: [], extras: [] }, dividas: [], moradia: 'pais',
      interesse: 'todos',
      habilidades: {}, fama: 0, seguidores: 0, negocio: null,
    },
    atributosAnteriores: { ...atributos },
    historico: [{ quando: rotuloPeriodo(relogio, o.turno), texto: abertura }],
    habitos: [],
    memorias: [],
    ganchos: [],
    pendente: null,
    periodo: {},
    totais: {},
    vistos: {},
    ganchosCumpridos: 0,
    pessoas: (() => {
      const usados = new Set([nome]);
      const familia = criarFamilia(rng, sobrenome, idadeMeses, classe, o.ano, nome);
      for (const x of familia) usados.add(x.nome);
      return [...familia, ...(idadeMeses >= 18 * 12 ? amigosDeInicio(rng, idadeMeses, o.ano, usados) : [])];
    })(),
    linhagem: { geracao: 1, anteriores: [] },
    anterior: null,
    voltas: 0,
  };
  garantirGenes(vida);
  return vida;
}

/** Efeito por ano de cada nível de vício ou condição. */
const PESO_TRACO: Record<string, (n: number) => Record<string, number>> = {
  alcool: (n) => ({ 'atributos.saude': -1 * n, 'atributos.felicidade': -0.5 * n }),
  cigarro: (n) => ({ 'atributos.saude': -1.2 * n }),
  jogo: (n) => ({ 'atributos.felicidade': -1 * n, dinheiro: -150 * n }),
  diabetes: (n) => ({ 'atributos.saude': n >= 2 ? -3 : -0.5 }),
};

export { proximoRelogio, quandoAgora, rotuloPeriodo } from './tempo';

interface ResultadoPasso {
  /** Coisas que valem parar o tempo: eventos, marcos, mudanças de escola e emprego, mortes. */
  importantes: Linha[];
  /** Resumos de rotina (hábitos, dinheiro), que não param o tempo. */
  rotina: string[];
}

/**
 * Um passo do relógio (1 ano, 1 semestre ou 1 mês), alterando `prox` no lugar.
 * `resumir` controla se hábitos e dinheiro geram linha a cada passo (no modo
 * dinâmico o resumo sai uma vez por ano).
 */
function passo(prox: Vida, anos: number, rng: Rng, resumir: boolean): ResultadoPasso {
  const p = prox.personagem;
  const mesesAntes = prox.relogio.idadeMeses;
  const anoAntes = prox.relogio.ano;
  const rotina = rodarHabitos(prox, anos, rng, resumir);
  const importantesPrevios: Linha[] = [];

  prox.relogio = proximoRelogio(prox.relogio, prox.config.turno);
  passoDiretor(prox, anos);
  const r = prox.relogio;
  const idade = r.idadeMeses / 12;

  for (const t of p.tracos) {
    const f = PESO_TRACO[t.id];
    if (f) aplicar(prox, f(t.nivel), anos);
  }
  if (p.desgaste >= 90 && rng.proximo() < Math.min(1, 0.3 * anos * 12)) {
    aplicar(prox, { 'atributos.saude': -4, 'atributos.felicidade': -4 });
    p.desgaste = Math.max(0, p.desgaste - 35);
    importantesPrevios.push('Você desmaiou de cansaço e passou o dia no pronto-socorro. O médico mandou parar.');
  }
  if (p.desgaste > 60) {
    const excesso = p.desgaste - 60;
    aplicar(prox, { 'atributos.saude': -excesso * 0.1, 'atributos.felicidade': -excesso * 0.15 }, anos);
  }

  // Com a idade pausada (Modo Deus), o corpo envelhece pela idade biológica, que não anda.
  const idadeCorpo = p.idadeBiologicaMeses !== undefined ? p.idadeBiologicaMeses / 12 : idade;
  envelhecer(p, idadeCorpo, anos, rng);

  const importantes: Linha[] = [...importantesPrevios];
  for (const m of MARCOS_IDADE) {
    if (mesesAntes < m.meses && r.idadeMeses >= m.meses) importantes.push(m.texto(p.sexo));
  }
  importantes.push(...rodarPessoas(prox, anos, rng, resumir));
  importantes.push(...rodarEscola(prox, anos, rng));
  importantes.push(...rodarTrabalho(prox, anos, rng));
  rotina.push(...rodarDinheiro(prox, anos, resumir));
  importantes.push(...rodarEventos(prox, anos, rng));
  // Sonhos e capítulos usam um sorteio à parte (não mudam o resto da vida).
  const rngSonho = Rng.daSeed(`${prox.config.seed}/sonhos/${prox.relogio.idadeMeses}`);
  importantes.push(...rodarSonhos(prox, () => rngSonho.proximo()), ...rodarCapitulos(prox));

  const causa = sortearMorte(p, idadeCorpo, anos, rng);
  if (causa) {
    prox.morte = { ano: r.ano, idadeMeses: r.idadeMeses, causa };
    prox.pendente = null;
    importantes.push(`Você morreu aos ${textoIdade(r.idadeMeses)}, ${causa}.`);
  }

  // Metade do cansaço some a cada ano.
  p.desgaste = limitar(p.desgaste * 0.5 ** anos);
  // A janela do "retorno que cai" fecha no fim do período (no dinâmico, no fim do ano).
  if (prox.config.turno !== 'dinamico' || r.ano !== anoAntes) prox.periodo = {};
  return { importantes, rotina };
}

/** Notas de saúde e felicidade comparando com como a vida estava antes. */
function notasDeTendencia(vida: Vida, antes: Record<Atributo, number>): string[] {
  if (vida.relogio.idadeMeses < 24) return [];
  const a = vida.personagem.atributos;
  const d = (k: Atributo) => a[k] - antes[k];
  const n: string[] = [];
  if (d('saude') <= -6) n.push('Sua saúde piorou.');
  if (d('saude') >= 6) n.push('Você está se sentindo mais saudável.');
  if (d('felicidade') >= 8) n.push('Foi uma fase feliz.');
  if (d('felicidade') <= -8) n.push('Foi uma fase difícil.');
  return n;
}

/** Resumo do ano que fechou (modo dinâmico): dinheiro, hábitos e tendência. */
function resumoDoAno(vida: Vida, anoQueFechou: number): string[] {
  const linhas: string[] = [];
  const ini = vida.inicioAno;
  const p = vida.personagem;
  if (ini && vida.relogio.idadeMeses >= 18 * 12 && Math.round(ini.dinheiro) !== Math.round(p.dinheiro)) {
    linhas.push(`${anoQueFechou} fechou com o saldo indo de ${reais(ini.dinheiro)} para ${reais(p.dinheiro)}.`);
  }
  const ativos = vida.habitos.filter((h) => !h.pausado).map((h) => `${acaoPorId(h.acao)?.nome ?? h.acao} ${h.porSemana}x/sem`);
  if (ativos.length) linhas.push(`Seus hábitos seguiram firmes: ${ativos.slice(0, 3).join(', ')}${ativos.length > 3 ? ` e mais ${ativos.length - 3}` : ''}.`);
  if (ini) linhas.push(...notasDeTendencia(vida, ini.atributos));
  vida.inicioAno = { atributos: { ...p.atributos }, dinheiro: p.dinheiro };
  return linhas;
}

/**
 * Avança o tempo. Nos modos ano e semestre, um passo. No modo dinâmico, mês a mês
 * até a próxima novidade (ou até fechar 12 meses); com `pularAno`, só para em
 * decisões e na morte. Não avança com um evento esperando decisão.
 */
export function avancarPeriodo(vida: Vida, pularAno = false): Vida {
  if (vida.morte || vida.pendente) return vida;
  // No modo "voltar um período", guarda a foto de agora (sem a foto anterior dela).
  const foto: Vida | null = vida.config.morte === 'voltar' ? structuredClone({ ...vida, anterior: null }) : null;
  const prox: Vida = structuredClone({ ...vida, anterior: null });
  prox.anterior = foto;
  const rng = new Rng(prox.rng);
  const anos = anosDoPasso(prox.config.turno);
  prox.atributosAnteriores = { ...prox.personagem.atributos };
  prox.inicioAno ??= { atributos: { ...prox.personagem.atributos }, dinheiro: prox.personagem.dinheiro };
  const dinamico = prox.config.turno === 'dinamico';

  let meses = 0;
  let houveNovidade = false;
  while (true) {
    const anoAntes = prox.relogio.ano;
    const { importantes, rotina } = passo(prox, anos, rng, !dinamico);
    meses += anos * 12;
    const quando = quandoAgora(prox);
    const extras = dinamico && prox.relogio.ano !== anoAntes ? resumoDoAno(prox, anoAntes) : [];
    if (!dinamico) extras.push(...notasDeTendencia(prox, prox.atributosAnteriores));
    for (const l of [...rotina, ...importantes, ...extras]) prox.historico.push(typeof l === 'string' ? { quando, texto: l } : { quando, ...l });
    if (importantes.length) houveNovidade = true;

    if (prox.morte || prox.pendente || !dinamico) break;
    if (!pularAno && importantes.length) break;
    if (meses >= 12) break;
  }

  if (!houveNovidade && !prox.pendente && !prox.morte) {
    const texto = dinamico
      ? `Um ano tranquilo. Você está com ${textoIdade(prox.relogio.idadeMeses)}.`
      : `Um período tranquilo. Você está com ${textoIdade(prox.relogio.idadeMeses)}.`;
    prox.historico.push({ quando: quandoAgora(prox), texto });
  }
  garantirGenes(prox);
  prox.rng = rng.estado();
  return prox;
}

/** Fases que viram uma linha na história quando a idade passa por elas. */
const MARCOS_IDADE: { meses: number; texto: (s: Sexo) => string }[] = [
  { meses: 12, texto: () => 'Você deu os primeiros passos.' },
  { meses: 24, texto: () => 'Você já fala as primeiras frases.' },
  { meses: 13 * 12, texto: () => 'Você virou adolescente, e o corpo começou a mudar.' },
  { meses: 18 * 12, texto: () => 'Você completou 18 anos e agora é maior de idade.' },
  { meses: 30 * 12, texto: () => 'Você chegou aos 30.' },
  { meses: 50 * 12, texto: () => 'Meio século de vida.' },
  { meses: 60 * 12, texto: (s) => `Você completou 60 anos e agora é ${s === 'feminino' ? 'idosa' : 'idoso'}.` },
  { meses: 80 * 12, texto: () => 'Oitenta anos de história.' },
  { meses: 100 * 12, texto: () => 'Você chegou aos 100 anos!' },
];

export function textoIdade(meses: number, sexo?: Sexo): string {
  if (meses < 12) return meses === 0 ? (sexo === 'feminino' ? 'recém-nascida' : 'recém-nascido') : meses === 1 ? '1 mês' : `${meses} meses`;
  const anos = Math.floor(meses / 12);
  return anos === 1 ? '1 ano' : `${anos} anos`;
}

export function nomeCompleto(vida: Vida): string {
  return `${vida.personagem.nome} ${vida.personagem.sobrenome}`;
}
