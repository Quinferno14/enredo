// Escola, ENEM, faculdade, emprego e dinheiro. A escola e o trabalho rodam
// sozinhos a cada período; o jogador mexe neles pelas ações (estudar,
// trabalhar duro, procurar emprego...) e por decisões (curso, vaga).

import cursosJson from '../conteudo/cursos.json';
import empregosJson from '../conteudo/empregos.json';
import estadosJson from '../conteudo/estados.json';
import { curva } from './curva';
import { aplicar, atende, lembrar, preencher, reais, valor, type Quando } from './efeitos';
import { limitar } from './envelhecer';
import type { Rng } from './rng';
import type { Classe, Emprego, Estudo, Pendente, Vida } from './tipos';

export interface CursoDef { id: string; nome: string; anos: number; corte: number; mensalidade: number }
export interface EmpregoDef {
  id: string;
  titulos: string[];
  salario: number;
  horas: number;
  requer: Quando;
  fit: Record<string, number>;
  chanceBase: number;
}
export interface EstadoDef {
  sigla: string; nome: string; cidades: string[];
  custoVida: number; salario: number; universidade: string;
}

export const CURSOS: readonly CursoDef[] = cursosJson;
export const EMPREGOS: readonly EmpregoDef[] = empregosJson as EmpregoDef[];
export const ESTADOS_DEF: readonly EstadoDef[] = estadosJson;
export const SALARIO_MINIMO = 1630;

export const cursoPorId = (id: string | undefined) => CURSOS.find((c) => c.id === id);
export const empregoPorId = (id: string) => EMPREGOS.find((e) => e.id === id);
export const estadoDe = (vida: Vida) => ESTADOS_DEF.find((e) => e.sigla === vida.personagem.estado) ?? ESTADOS_DEF[0]!;

const MESADA: Record<Classe, number> = { baixa: 0, media: 30, alta: 100 };
/** Parte da mensalidade particular que os pais pagam. */
const PAIS_PAGAM_FACULDADE: Record<Classe, number> = { baixa: 0, media: 0.5, alta: 1 };
const CHANCE_PARTICULAR: Record<Classe, number> = { baixa: 0.03, media: 0.35, alta: 0.85 };
const NOME_CLASSE: Record<Classe, string> = { baixa: 'pobre', media: 'de classe média', alta: 'rica' };
export const textoClasse = (c: Classe) => NOME_CLASSE[c];

export function sortearClasse(rng: Rng): Classe {
  const x = rng.proximo();
  return x < 0.45 ? 'baixa' : x < 0.9 ? 'media' : 'alta';
}

/** Situação escolar de quem já nasce numa idade (bebê, começar adulto ou save antigo). */
export function estudoInicial(classe: Classe, rng: Rng | null, idade: number): Estudo {
  const rede = rng && rng.proximo() < CHANCE_PARTICULAR[classe] ? 'particular' : 'publica';
  const base: Estudo = { etapa: 'nenhuma', rede, serie: 0, progresso: 0, nota: 60, reprovacoes: 0, escolaridade: 'nenhuma', formacoes: [] };
  if (idade >= 18) return { ...base, escolaridade: 'medio' };
  if (idade >= 15) return { ...base, etapa: 'medio', serie: Math.floor(idade) - 14, escolaridade: 'fundamental' };
  if (idade >= 6) return { ...base, etapa: 'fundamental', serie: Math.floor(idade) - 5 };
  return base;
}

export function tituloEmprego(vida: Vida, e: Emprego): string {
  const def = empregoPorId(e.id);
  const t = def?.titulos[Math.min(e.nivel, def.titulos.length - 1)] ?? e.id;
  return preencher(t, vida, {});
}

const ordinal = (n: number) => `${n}º`;

export function textoEstudo(vida: Vida): string | null {
  const e = vida.personagem.estudo;
  const rede = e.rede === 'publica' ? 'pública' : 'particular';
  const nota = `nota ${Math.round(e.nota)}`;
  if (e.etapa === 'fundamental') return `${ordinal(e.serie)} ano do fundamental · ${rede} · ${nota}`;
  if (e.etapa === 'medio') return `${ordinal(e.serie)} ano do médio · ${rede} · ${nota}`;
  if (e.etapa === 'faculdade') {
    const c = cursoPorId(e.curso);
    const onde = e.rede === 'publica' ? estadoDe(vida).universidade : 'particular';
    return `${c?.nome ?? 'Faculdade'} (${onde}) · ${ordinal(e.serie)} ano · ${nota}`;
  }
  if (e.cursinho) return 'Cursinho para o ENEM';
  return null;
}

/** Horas por semana de escola, faculdade e trabalho. */
export function horasObrigacoes(vida: Vida): number {
  const p = vida.personagem;
  let h = 0;
  if (p.estudo.etapa === 'fundamental' || p.estudo.etapa === 'medio') h += 25;
  if (p.estudo.etapa === 'faculdade' || p.estudo.cursinho) h += 20;
  const emp = p.trabalho.emprego;
  if (emp) h += empregoPorId(emp.id)?.horas ?? 40;
  return h;
}

/** Sessões por ano (hábito + à mão) de uma ação neste período. */
function intensidade(vida: Vida, acao: string, anos: number): number {
  const h = vida.habitos.find((x) => x.acao === acao && !x.pausado);
  return (h ? h.porSemana * 52 : 0) + (vida.periodo[acao] ?? 0) / anos;
}

// ---- Escola e faculdade ----

function alvoNota(vida: Vida, anos: number): number {
  const p = vida.personagem;
  const estudo = Math.min(25, 4 * curva(intensidade(vida, 'estudar', anos)));
  const cabulou = 3 * (vida.periodo.matar_aula ?? 0);
  return limitar(
    25 + p.atributos.inteligencia * 0.5 + p.personalidade.disciplina * 0.12 + estudo
      + (p.estudo.rede === 'particular' ? 6 : 0) - Math.max(0, p.desgaste - 40) * 0.2 - cabulou,
  );
}

export function calcularEnem(vida: Vida, rng: Rng, bonus = 0): number {
  const p = vida.personagem;
  const estudo = Math.min(25, 4 * curva(intensidade(vida, 'estudar', 1)));
  const n = 300 + p.estudo.nota * 3.2 + p.atributos.inteligencia * 2.6 + estudo * 3
    + (p.estudo.rede === 'particular' ? 20 : 0) + bonus + (rng.proximo() * 2 - 1) * 50;
  return Math.round(Math.max(300, Math.min(1000, n)));
}

export function pendenteCurso(vida: Vida): Pendente {
  const e = vida.personagem.estudo;
  const enem = e.enem ?? 0;
  const univ = estadoDe(vida).universidade;
  const escolhas: Pendente['escolhas'] = [];
  const dados: string[] = [];
  for (const c of CURSOS) {
    if (enem >= c.corte) {
      escolhas.push({ texto: `${c.nome} na ${univ} (pública, corte ${c.corte})` });
      dados.push(`pub:${c.id}`);
    }
  }
  const pais = PAIS_PAGAM_FACULDADE[vida.personagem.classe];
  for (const c of CURSOS) {
    const falta = c.mensalidade * (1 - pais) - 3000;
    escolhas.push({
      texto: `${c.nome} em faculdade particular (${reais(c.mensalidade)}/mês)`,
      ...(falta > 0 && vida.personagem.dinheiro < falta * 12 ? { motivo: 'O FIES não cobre tudo e falta dinheiro' } : {}),
    });
    dados.push(`par:${c.id}`);
  }
  escolhas.push({ texto: 'Fazer cursinho e tentar de novo no ano que vem' });
  dados.push('cursinho');
  escolhas.push({ texto: 'Não fazer faculdade agora' });
  dados.push('nada');
  const passou = escolhas.length > CURSOS.length + 2;
  return {
    evento: '@curso', sistema: 'curso', dados, escolhas, vars: {},
    texto: `Resultado do ENEM: ${enem} pontos. ${passou ? `Dá para entrar em pública em ${escolhas.length - CURSOS.length - 2} curso(s).` : 'Não deu para nenhum curso público.'} O que você vai fazer?`,
  };
}

/** Roda escola, cursinho e faculdade no período. Altera `vida` e devolve linhas para o feed. */
export function rodarEscola(vida: Vida, anos: number, rng: Rng): string[] {
  const linhas: string[] = [];
  const p = vida.personagem;
  const e = p.estudo;
  const idade = vida.relogio.idadeMeses / 12;

  if (e.etapa === 'nenhuma' && e.escolaridade === 'nenhuma' && idade >= 6 && idade < 8) {
    Object.assign(e, { etapa: 'fundamental', serie: 1, progresso: 0, nota: 60 });
    linhas.push(`Você entrou no 1º ano, numa escola ${e.rede === 'publica' ? 'pública' : 'particular'} de ${p.cidade}.`);
    return linhas;
  }

  if (e.cursinho && e.etapa === 'nenhuma') {
    e.progresso += anos;
    if (e.progresso >= 1) {
      e.progresso = 0;
      e.cursinho = false;
      e.enem = calcularEnem(vida, rng, 40);
      linhas.push(`Depois de um ano de cursinho, você fez o ENEM de novo: ${e.enem} pontos.`);
      if (!vida.pendente) vida.pendente = pendenteCurso(vida);
    }
    return linhas;
  }

  if (e.etapa === 'nenhuma') return linhas;

  // Faculdade particular: pais ajudam conforme a classe; o que faltar vira FIES.
  if (e.etapa === 'faculdade' && e.rede === 'particular') {
    const c = cursoPorId(e.curso);
    const total = (c?.mensalidade ?? 0) * 12 * anos;
    const pais = idade < 26 ? total * PAIS_PAGAM_FACULDADE[p.classe] : 0;
    let resto = total - pais;
    const proprio = Math.max(0, Math.min(resto, p.dinheiro));
    p.dinheiro -= proprio;
    resto -= proprio;
    // O FIES cobre até R$ 3.000 por mês; acima disso, sem dinheiro, não dá para continuar.
    const tetoFies = 3000 * 12 * anos;
    if (resto > tetoFies) {
      Object.assign(e, { etapa: 'nenhuma', serie: 0, progresso: 0 });
      linhas.push(`Sem conseguir pagar a mensalidade, você teve que trancar ${c?.nome ?? 'a faculdade'}.`);
      lembrar(vida, 'trancou_faculdade', `trancou ${c?.nome ?? 'a faculdade'} por falta de dinheiro`, -15);
      ativarFies(vida, linhas);
      return linhas;
    }
    if (resto > 0) {
      let fies = p.dividas.find((d) => d.id === 'fies');
      if (!fies) {
        fies = { id: 'fies', nome: 'FIES', saldo: 0, parcela: 0 };
        p.dividas.push(fies);
        linhas.push('O FIES passou a cobrir a parte da mensalidade que você não consegue pagar.');
      }
      fies.saldo += Math.round(resto);
    }
  }

  e.nota = Math.round(limitar(e.nota + (alvoNota(vida, anos) - e.nota) * 0.6 * anos + (rng.proximo() * 2 - 1) * 4 * anos));
  e.progresso += anos;
  if (e.progresso < 1) return linhas;
  e.progresso = 0;

  // Fim do ano letivo.
  if (e.nota < 45 && rng.proximo() < ((45 - e.nota) / 45) * 0.8) {
    e.reprovacoes += 1;
    linhas.push(e.etapa === 'faculdade'
      ? `Você reprovou em várias matérias e vai ter que refazer o ${ordinal(e.serie)} ano da faculdade.`
      : `Você repetiu o ${ordinal(e.serie)} ano.`);
    aplicar(vida, { 'atributos.felicidade': -6 });
    if (e.reprovacoes === 1) lembrar(vida, 'repetiu_ano', `repetiu o ${ordinal(e.serie)} ano`, -12);
    return linhas;
  }
  e.serie += 1;

  if (e.etapa === 'fundamental' && e.serie > 9) {
    Object.assign(e, { etapa: 'medio', serie: 1, escolaridade: 'fundamental' });
    linhas.push('Você terminou o ensino fundamental e entrou no médio.');
  } else if (e.etapa === 'medio' && e.serie > 3) {
    Object.assign(e, { etapa: 'nenhuma', serie: 0, escolaridade: 'medio' });
    e.enem = calcularEnem(vida, rng);
    linhas.push(`Você terminou o ensino médio! No ENEM, tirou ${e.enem} pontos.`);
    lembrar(vida, 'formou_medio', 'terminou o ensino médio', 10);
    vida.ganchos.push({ evento: 'festa_formatura', idadeMeses: vida.relogio.idadeMeses + 1 });
    if (!vida.pendente) vida.pendente = pendenteCurso(vida);
  } else if (e.etapa === 'faculdade' && e.serie > (cursoPorId(e.curso)?.anos ?? 4)) {
    const c = cursoPorId(e.curso);
    e.formacoes.push(e.curso ?? '');
    Object.assign(e, { etapa: 'nenhuma', serie: 0, escolaridade: 'superior' });
    linhas.push(`Você se formou em ${c?.nome ?? 'faculdade'}!`);
    lembrar(vida, 'formou_faculdade', `se formou em ${c?.nome ?? 'faculdade'}`, 25);
    aplicar(vida, { 'atributos.felicidade': 8 });
    ativarFies(vida, linhas);
  }
  return linhas;
}

function ativarFies(vida: Vida, linhas: string[]) {
  const fies = vida.personagem.dividas.find((d) => d.id === 'fies');
  if (fies && fies.parcela === 0) {
    fies.parcela = Math.max(150, Math.round(fies.saldo / 120));
    linhas.push(`O FIES começou a cobrar: ${reais(fies.parcela)} por mês, de um total de ${reais(fies.saldo)}.`);
  }
}

// ---- Trabalho ----

export function salarioInicial(vida: Vida, def: EmpregoDef): number {
  return Math.round((def.salario * estadoDe(vida).salario) / 10) * 10;
}

export function chanceContratar(vida: Vida, def: EmpregoDef): number {
  let p = def.chanceBase;
  for (const [k, c] of Object.entries(def.fit)) p += c * (valor(vida, k) - 50);
  p += vida.memorias.some((m) => m.id === 'estagio') ? 0.1 : 0;
  p += (vida.personagem.atributos.carisma - 50) * 0.002;
  return Math.max(0.03, Math.min(0.95, p));
}

export function vagasPossiveis(vida: Vida): EmpregoDef[] {
  const atual = vida.personagem.trabalho.emprego?.id;
  return EMPREGOS.filter((e) => e.id !== atual && atende(vida, e.requer));
}

function rotuloChance(p: number) {
  return p >= 0.6 ? 'chance alta' : p >= 0.3 ? 'chance média' : 'chance baixa';
}

export function pendenteVagas(vida: Vida, rng: Rng): Pendente | null {
  const lista = [...vagasPossiveis(vida)];
  if (!lista.length) return null;
  const escolhidas: EmpregoDef[] = [];
  while (escolhidas.length < 3 && lista.length) {
    escolhidas.push(lista.splice(Math.floor(rng.proximo() * lista.length), 1)[0]!);
  }
  escolhidas.sort((a, b) => b.salario - a.salario);
  return {
    evento: '@vagas', sistema: 'vagas', vars: {},
    texto: 'Você achou estas vagas abertas. Para qual vai se candidatar?',
    dados: [...escolhidas.map((e) => e.id), 'nada'],
    escolhas: [
      ...escolhidas.map((e) => ({
        texto: `${preencher(e.titulos[0]!, vida, {})} · ${reais(salarioInicial(vida, e))}/mês · ${e.horas} h/sem · ${rotuloChance(chanceContratar(vida, e))}`,
      })),
      { texto: 'Nenhuma por enquanto' },
    ],
  };
}

export function rodarTrabalho(vida: Vida, anos: number, rng: Rng): string[] {
  const linhas: string[] = [];
  const t = vida.personagem.trabalho;
  const emp = t.emprego;
  if (!emp) return linhas;
  const def = empregoPorId(emp.id);
  const p = vida.personagem;

  let encaixe = 0;
  for (const [k, c] of Object.entries(def?.fit ?? {})) encaixe += c * 100 * (valor(vida, k) - 50);
  const duro = Math.min(25, 4 * curva(intensidade(vida, 'trabalhar_duro', anos)));
  const alvo = limitar(50 + encaixe + duro + p.personalidade.disciplina * 0.1 - Math.max(0, p.desgaste - 40) * 0.3);
  emp.desempenho = Math.round(limitar(emp.desempenho + (alvo - emp.desempenho) * 0.5 * anos + (rng.proximo() * 2 - 1) * 5 * anos));
  t.anosContribuicao += anos;

  const nTitulos = def?.titulos.length ?? 1;
  if (emp.desempenho >= 70 && rng.proximo() < 0.3 * anos) {
    if (emp.nivel < nTitulos - 1) {
      emp.nivel += 1;
      emp.salario = Math.round(emp.salario * 1.25);
      const titulo = tituloEmprego(vida, emp);
      t.cargos.push(titulo);
      linhas.push(`Promoção! Agora você é ${titulo}, ganhando ${reais(emp.salario)} por mês.`);
      lembrar(vida, 'promocao', `foi promovid${p.sexo === 'feminino' ? 'a' : 'o'} a ${titulo}`, 15);
      aplicar(vida, { 'atributos.felicidade': 6 });
    } else {
      emp.salario = Math.round(emp.salario * 1.08);
      linhas.push(`Seu bom trabalho rendeu um aumento: ${reais(emp.salario)} por mês.`);
    }
  } else if ((emp.desempenho < 30 && rng.proximo() < 0.5 * anos) || rng.proximo() < 0.03 * anos) {
    const titulo = tituloEmprego(vida, emp);
    t.emprego = null;
    linhas.push(emp.desempenho < 30
      ? `Você foi demitid${p.sexo === 'feminino' ? 'a' : 'o'} do cargo de ${titulo} por desempenho fraco.`
      : `A empresa cortou gente e você perdeu o emprego de ${titulo}.`);
    lembrar(vida, 'demitido', `perdeu o emprego de ${titulo}`, -18);
    aplicar(vida, { 'atributos.felicidade': -10 });
  }
  return linhas;
}

// ---- Dinheiro ----

/** Renda, gastos fixos, dívidas e juros do período. */
export function rodarDinheiro(vida: Vida, anos: number): string[] {
  const linhas: string[] = [];
  const p = vida.personagem;
  const idade = vida.relogio.idadeMeses / 12;
  const meses = 12 * anos;
  let entrou = 0, saiu = 0;

  const emp = p.trabalho.emprego;
  if (emp) entrou += emp.salario * (13 / 12) * meses; // com 13º
  if (p.trabalho.aposentadoria > 0) entrou += p.trabalho.aposentadoria * (13 / 12) * meses;
  if (idade >= 10 && idade < 18) entrou += MESADA[p.classe] * meses;
  if (p.estudo.etapa === 'faculdade' && idade < 26) entrou += { baixa: 0, media: 200, alta: 600 }[p.classe] * meses;

  if (idade >= 18) {
    if (p.moradia === 'aluguel') saiu += estadoDe(vida).custoVida * meses;
    else if (emp || p.trabalho.aposentadoria > 0) saiu += 400 * meses;
  }

  for (const d of p.dividas) {
    if (d.parcela <= 0) continue;
    const pago = Math.min(d.saldo, d.parcela * meses);
    d.saldo -= pago;
    saiu += pago;
    if (d.saldo <= 0) linhas.push(`Você quitou ${d.nome === 'FIES' ? 'o FIES' : d.nome}!`);
  }
  p.dividas = p.dividas.filter((d) => d.saldo > 0);

  p.dinheiro = Math.round(p.dinheiro + entrou - saiu);
  if (entrou > 0 && idade >= 18) {
    linhas.push(`Dinheiro do período: entrou ${reais(entrou)}, saiu ${reais(saiu)}.`);
  } else if (saiu > 0) {
    linhas.push(`Gastos fixos do período: ${reais(saiu)}.`);
  }

  if (p.dinheiro < 0) {
    // Juros só sobre o limite do cheque especial (R$ 15.000); o resto fica como dívida parada.
    const juros = Math.round(Math.min(-p.dinheiro, 15000) * 0.6 * anos);
    p.dinheiro -= juros;
    linhas.push(`Saldo negativo: o cheque especial cobrou ${reais(juros)} de juros.`);
  }
  return linhas;
}

/** Renda e gasto mensais de agora, para a tela. */
export function orcamentoMensal(vida: Vida) {
  const p = vida.personagem;
  const idade = vida.relogio.idadeMeses / 12;
  const renda = (p.trabalho.emprego?.salario ?? 0) + p.trabalho.aposentadoria
    + (idade >= 10 && idade < 18 ? MESADA[p.classe] : 0)
    + (p.estudo.etapa === 'faculdade' && idade < 26 ? { baixa: 0, media: 200, alta: 600 }[p.classe] : 0);
  let gastos = p.dividas.reduce((s, d) => s + d.parcela, 0);
  if (idade >= 18) {
    if (p.moradia === 'aluguel') gastos += estadoDe(vida).custoVida;
    else if (p.trabalho.emprego || p.trabalho.aposentadoria > 0) gastos += 400;
  }
  return { renda, gastos };
}

// ---- Ações e decisões ----

/** Ações com regra própria (procurar emprego, ENEM, sair de casa...). Devolve uma linha extra. */
export function acaoCarreira(vida: Vida, especial: string, rng: Rng): string | null {
  const p = vida.personagem;
  const t = p.trabalho;
  const e = p.estudo;
  const sx = (m: string, f: string) => (p.sexo === 'feminino' ? f : m);
  switch (especial) {
    case 'procurar_emprego': {
      if (vida.pendente) return 'Resolva a decisão pendente antes de procurar vagas.';
      const pend = pendenteVagas(vida, rng);
      if (!pend) return 'Não apareceu nenhuma vaga para o seu perfil agora.';
      vida.pendente = pend;
      return null;
    }
    case 'pedir_aumento': {
      const emp = t.emprego!;
      if ((vida.periodo.pedir_aumento ?? 0) > 1) {
        aplicar(vida, { 'trabalho.desempenho': -5 });
        return 'Pedir aumento de novo tão cedo pegou mal com a chefia.';
      }
      const chance = (emp.desempenho - 40) / 80 + (p.atributos.carisma - 50) / 200;
      if (rng.proximo() < chance) {
        emp.salario = Math.round(emp.salario * (1.08 + rng.proximo() * 0.1));
        return `A chefia aceitou: seu salário agora é ${reais(emp.salario)}.`;
      }
      aplicar(vida, { 'atributos.felicidade': -3 });
      return 'A resposta foi "agora não dá".';
    }
    case 'pedir_demissao': {
      const titulo = tituloEmprego(vida, t.emprego!);
      t.emprego = null;
      aplicar(vida, { 'atributos.felicidade': 2, desgaste: -10 });
      return `Você pediu demissão do cargo de ${titulo}.`;
    }
    case 'prestar_enem': {
      if ((vida.periodo.prestar_enem ?? 0) > 1) return 'O ENEM só acontece uma vez por ano.';
      if (vida.pendente) return 'Resolva a decisão pendente antes.';
      e.enem = calcularEnem(vida, rng);
      vida.pendente = pendenteCurso(vida);
      return `Você fez o ENEM e tirou ${e.enem} pontos.`;
    }
    case 'supletivo': {
      if (e.escolaridade === 'medio' || e.escolaridade === 'superior') return 'Você já tem o ensino médio.';
      const etapa = e.escolaridade === 'fundamental' ? 'medio' : 'fundamental';
      Object.assign(e, { etapa, serie: etapa === 'medio' ? 1 : 6, progresso: 0, rede: 'publica' });
      return `Você se matriculou no supletivo (EJA) para terminar o ${etapa === 'medio' ? 'ensino médio' : 'fundamental'}.`;
    }
    case 'largar_estudo': {
      const era = e.etapa === 'faculdade' ? `a faculdade de ${cursoPorId(e.curso)?.nome ?? ''}` : 'a escola';
      if (e.etapa === 'faculdade') ativarFies(vida, []);
      Object.assign(e, { etapa: 'nenhuma', serie: 0, progresso: 0 });
      lembrar(vida, 'largou_estudo', `largou ${era}`, -10);
      return `Você largou ${era}.`;
    }
    case 'sair_de_casa': {
      p.moradia = 'aluguel';
      lembrar(vida, 'saiu_de_casa', 'saiu da casa dos pais', 12);
      return `Você alugou um lugar só seu em ${p.cidade}. Custo de vida: ${reais(estadoDe(vida).custoVida)} por mês.`;
    }
    case 'voltar_pais': {
      p.moradia = 'pais';
      aplicar(vida, { 'atributos.felicidade': -3 });
      return `Você voltou a morar com seus pais.`;
    }
    case 'aposentar': {
      if (t.anosContribuicao < 15) return `Ainda faltam ${Math.ceil(15 - t.anosContribuicao)} anos de contribuição para aposentar.`;
      const base = t.emprego?.salario ?? SALARIO_MINIMO;
      t.aposentadoria = Math.max(SALARIO_MINIMO, Math.min(8157, Math.round(base * Math.min(1, 0.6 + (t.anosContribuicao - 20) * 0.02))));
      t.emprego = null;
      lembrar(vida, 'aposentou', 'se aposentou', 15);
      return `Você se aposentou${t.anosContribuicao >= 35 ? ' depois de uma vida de trabalho' : ''}. INSS: ${reais(t.aposentadoria)} por mês. ${sx('Aposentado', 'Aposentada')}, enfim.`;
    }
    default:
      return null;
  }
}

/** Resolve as decisões do próprio jogo (vaga ou curso). Altera `vida` e devolve o texto. */
export function resolverSistema(vida: Vida, pend: Pendente, indice: number, rng: Rng): string {
  const id = pend.dados?.[indice] ?? 'nada';
  const p = vida.personagem;
  if (pend.sistema === 'vagas') {
    if (id === 'nada') return 'Você deixou as vagas passarem.';
    const def = empregoPorId(id);
    if (!def) return '';
    if (rng.proximo() < chanceContratar(vida, def)) {
      const saiuDe = p.trabalho.emprego ? ` Você saiu do emprego de ${tituloEmprego(vida, p.trabalho.emprego)}.` : '';
      p.trabalho.emprego = { id, salario: salarioInicial(vida, def), desempenho: 55, nivel: 0, desdeMeses: vida.relogio.idadeMeses };
      p.trabalho.cargos.push(tituloEmprego(vida, p.trabalho.emprego));
      aplicar(vida, { 'atributos.felicidade': 5 });
      return `Contratad${p.sexo === 'feminino' ? 'a' : 'o'}! Você agora é ${tituloEmprego(vida, p.trabalho.emprego)}.${saiuDe}`;
    }
    aplicar(vida, { 'atributos.felicidade': -2 });
    return 'Você fez a entrevista, mas escolheram outra pessoa.';
  }

  // Curso
  const e = p.estudo;
  if (id === 'nada') return 'Você decidiu não fazer faculdade agora. Dá para prestar o ENEM de novo quando quiser.';
  if (id === 'cursinho') {
    e.cursinho = true;
    e.progresso = 0;
    return 'Mais um ano de estudo pesado no cursinho.';
  }
  const [rede, cursoId] = id.split(':') as ['pub' | 'par', string];
  const c = cursoPorId(cursoId);
  Object.assign(e, { etapa: 'faculdade', rede: rede === 'pub' ? 'publica' : 'particular', serie: 1, progresso: 0, curso: cursoId, nota: Math.max(50, e.nota) });
  const onde = rede === 'pub' ? `na ${estadoDe(vida).universidade}` : 'numa faculdade particular';
  lembrar(vida, 'entrou_faculdade', `entrou em ${c?.nome ?? 'faculdade'} ${onde}`, rede === 'pub' ? 25 : 12);
  aplicar(vida, { 'atributos.felicidade': rede === 'pub' ? 10 : 5 });
  return `Você começou ${c?.nome ?? 'a faculdade'} ${onde}!`;
}
