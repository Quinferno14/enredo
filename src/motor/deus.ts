// Modo Deus: editar a vida por fora das regras, forçar eventos, pausar a idade
// e voltar um período. Toda edição fica marcada com ✦ na história.

import { empregoPorId, ESTADOS_DEF, salarioInicial, tituloEmprego } from './carreira';
import { NOME_HABILIDADE, reais } from './efeitos';
import { alvoAparencia, alvoForma, alvoInteligencia, alvoSaude, limitar } from './envelhecer';
import { disparar, eventoPorId } from './eventos';
import { capitalizar, gerarPessoa, nomesEmUso, papelTexto } from './familia';
import { SOCIAIS, ocupar } from './social';
import { quandoAgora } from './tempo';
import { Rng, estadoDaSeed } from './rng';
import type { Atributo, Eixo, Linha, Papel, Sexo, Vida } from './tipos';
import { textoIdade } from './vida';

const NOMES: Record<string, string> = {
  saude: 'Saúde', felicidade: 'Felicidade', inteligencia: 'Inteligência', aparencia: 'Aparência',
  forma: 'Forma', carisma: 'Carisma', sorte: 'Sorte', desgaste: 'Cansaço',
  extroversao: 'Extroversão', empatia: 'Empatia', disciplina: 'Disciplina', impulsividade: 'Impulsividade',
  ambicao: 'Ambição', moralidade: 'Moralidade', estabilidade: 'Estabilidade', curiosidade: 'Curiosidade',
};

function marcar(vida: Vida, texto: string) {
  vida.historico.push({ quando: quandoAgora(vida), texto: `✦ ${texto}`, fato: { tipo: 'deus' } });
}

export function editarAtributo(vida: Vida, a: Atributo | 'desgaste', valor: number): Vida {
  const prox = structuredClone(vida);
  const p = prox.personagem;
  const v = Math.round(limitar(valor));
  const antes = Math.round(a === 'desgaste' ? p.desgaste : p.atributos[a]);
  if (antes === v) return vida;
  if (a === 'desgaste') p.desgaste = v;
  else {
    p.atributos[a] = v;
    prox.atributosAnteriores[a] = v; // sem seta de tendência para edição manual
    ajustarGenetica(prox, a, v);
  }
  marcar(prox, `${NOMES[a]} ${antes} → ${v}`);
  return prox;
}

/**
 * O envelhecimento puxa cada atributo físico para o que a genética permite na idade.
 * Para a edição não "voltar" no período seguinte, a genética muda junto: o potencial
 * passa a ser o que dá esse valor nesta idade (pode passar de 100 para segurar 100 num bebê).
 */
function ajustarGenetica(vida: Vida, a: Atributo, valor: number) {
  const p = vida.personagem;
  const idade = (p.idadeBiologicaMeses ?? vida.relogio.idadeMeses) / 12;
  const fator = (alvo: (pot: number) => number) => Math.max(0.05, alvo(100) / 100);
  const pot = p.potencial;
  switch (a) {
    case 'saude': pot.saude = Math.min(250, Math.max(0, (valor - p.personalidade.disciplina / 10) / fator((x) => alvoSaude(x, idade, 0)))); break;
    case 'forma': pot.forma = Math.min(250, valor / fator((x) => alvoForma(x, idade))); break;
    case 'aparencia': pot.aparencia = Math.min(250, valor / fator((x) => alvoAparencia(x, idade))); break;
    case 'inteligencia': pot.inteligencia = Math.min(250, valor / fator((x) => alvoInteligencia(x, idade))); break;
    case 'carisma': pot.carisma = valor; break;
    default: break; // felicidade e sorte não têm genética
  }
}

export function editarEixo(vida: Vida, e: Eixo, valor: number): Vida {
  const prox = structuredClone(vida);
  const antes = Math.round(prox.personagem.personalidade[e]);
  const v = Math.round(limitar(valor, -100, 100));
  if (antes === v) return vida;
  prox.personagem.personalidade[e] = v;
  marcar(prox, `${NOMES[e]} ${antes} → ${v}`);
  return prox;
}

export function editarDinheiro(vida: Vida, valor: number): Vida {
  if (!Number.isFinite(valor)) return vida;
  const prox = structuredClone(vida);
  const antes = prox.personagem.dinheiro;
  prox.personagem.dinheiro = Math.round(Math.max(-10_000_000, Math.min(1_000_000_000, valor)));
  marcar(prox, `Dinheiro ${reais(antes)} → ${reais(prox.personagem.dinheiro)}`);
  return prox;
}

/** Muda a idade (e a biológica, se estiver pausada). A família envelhece junto. */
export function editarIdade(vida: Vida, anos: number): Vida {
  const meses = Math.round(Math.max(0, Math.min(150, anos)) * 12);
  const delta = meses - vida.relogio.idadeMeses;
  if (delta === 0) return vida;
  const prox = structuredClone(vida);
  prox.relogio.idadeMeses = meses;
  prox.relogio.ano += Math.round(delta / 12);
  if (prox.personagem.idadeBiologicaMeses !== undefined) prox.personagem.idadeBiologicaMeses = meses;
  for (const pe of prox.pessoas) if (pe.vivo) pe.idadeMeses = Math.max(0, pe.idadeMeses + delta);
  marcar(prox, `Idade ${textoIdade(vida.relogio.idadeMeses)} → ${textoIdade(meses)}`);
  return prox;
}

export function mudarLugar(vida: Vida, sigla: string, cidade: string): Vida {
  const est = ESTADOS_DEF.find((e) => e.sigla === sigla);
  if (!est || !est.cidades.includes(cidade)) return vida;
  const prox = structuredClone(vida);
  prox.personagem.estado = sigla;
  prox.personagem.cidade = cidade;
  marcar(prox, `Agora você mora em ${cidade} (${sigla})`);
  return prox;
}

export function definirEmprego(vida: Vida, id: string | null): Vida {
  const prox = structuredClone(vida);
  const t = prox.personagem.trabalho;
  if (!id) {
    if (!t.emprego) return vida;
    t.emprego = null;
    marcar(prox, 'Sem emprego');
    return prox;
  }
  const def = empregoPorId(id);
  if (!def) return vida;
  t.emprego = { id, salario: salarioInicial(prox, def), desempenho: 60, nivel: 0, desdeMeses: prox.relogio.idadeMeses };
  const titulo = tituloEmprego(prox, t.emprego);
  t.cargos.push(titulo);
  marcar(prox, `Emprego: ${titulo}`);
  return prox;
}

export type CampoPessoa = 'afeto' | 'saude' | 'idade' | 'nome' | 'papel' | 'rival' | 'vivo' | `eixo:${Eixo}`;

/** Papéis que o Modo Deus pode dar a alguém (parceiro e ex têm regras próprias). */
export const PAPEIS_DEUS: Papel[] = ['amigo', 'colega', 'vizinho', 'irmao', 'primo', 'tio', 'avo', 'sobrinho', 'neto', 'filho', 'mae', 'pai'];

/** Edita qualquer coisa de uma pessoa. Números chegam como número; nome e papel como texto. */
export function editarPessoa(vida: Vida, pessoaId: string, campo: CampoPessoa, valor: number | string): Vida {
  const prox = structuredClone(vida);
  const pe = prox.pessoas.find((x) => x.id === pessoaId);
  if (!pe) return vida;
  const rotulo = `${capitalizar(papelTexto(pe))}, ${pe.nome}`;
  const n = Number(valor);
  if (campo === 'vivo') {
    const vivo = !!n;
    if (vivo === pe.vivo) return vida;
    if (vivo) {
      pe.vivo = true;
      if (pe.morte) pe.idadeMeses = pe.morte.idadeMeses + Math.max(0, prox.relogio.ano - pe.morte.ano) * 12;
      delete pe.morte;
      pe.saude = Math.max(pe.saude, 50);
      marcar(prox, `${rotulo} voltou à vida`);
    } else {
      pe.vivo = false;
      pe.morte = { ano: prox.relogio.ano, idadeMeses: pe.idadeMeses, causa: 'por vontade divina' };
      marcar(prox, `${rotulo} morreu por vontade divina`);
    }
    return prox;
  }
  if (!pe.vivo) return vida;
  switch (campo) {
    case 'afeto': case 'saude': {
      if (!Number.isFinite(n)) return vida;
      const antes = pe[campo];
      pe[campo] = Math.round(limitar(n));
      if (antes === pe[campo]) return vida;
      marcar(prox, `${rotulo}: ${campo === 'afeto' ? 'afeto' : 'saúde'} ${antes} → ${pe[campo]}`);
      return prox;
    }
    case 'idade': {
      if (!Number.isFinite(n)) return vida;
      const meses = Math.round(Math.max(0, Math.min(130, n)) * 12);
      if (meses === pe.idadeMeses) return vida;
      marcar(prox, `${rotulo}: idade ${textoIdade(pe.idadeMeses)} → ${textoIdade(meses)}`);
      pe.idadeMeses = meses;
      return prox;
    }
    case 'nome': {
      const nome = String(valor).trim().slice(0, 40);
      if (!nome || nome === pe.nome) return vida;
      marcar(prox, `${rotulo} agora se chama ${nome}`);
      pe.nome = nome;
      return prox;
    }
    case 'papel': {
      const papel = String(valor) as Papel;
      if (!PAPEIS_DEUS.includes(papel) || papel === pe.papel) return vida;
      pe.papel = papel;
      delete pe.relacao;
      delete pe.afastado;
      marcar(prox, `${pe.nome} agora é ${papelTexto(pe)}`);
      return prox;
    }
    case 'rival': {
      if (!!n === !!pe.rival) return vida;
      if (n) pe.rival = true; else delete pe.rival;
      marcar(prox, `${rotulo}: ${n ? 'virou rival' : 'deixou de ser rival'}`);
      return prox;
    }
    default: {
      const eixo = campo.slice(5) as Eixo;
      if (!Number.isFinite(n) || !(eixo in pe.personalidade)) return vida;
      const antes = Math.round(pe.personalidade[eixo]);
      const v = Math.round(limitar(n, -100, 100));
      if (antes === v) return vida;
      pe.personalidade[eixo] = v;
      marcar(prox, `${rotulo}: ${NOMES[eixo]} ${antes} → ${v}`);
      return prox;
    }
  }
}

/** Cria uma pessoa nova do nada, com o papel, o sexo e a idade escolhidos. */
export function criarPessoaDeus(vida: Vida, papel: Papel, sexo: Sexo, idadeAnos: number, nome?: string): Vida {
  if (!PAPEIS_DEUS.includes(papel)) return vida;
  const prox = structuredClone(vida);
  const rng = new Rng(prox.rng);
  const pe = gerarPessoa(rng, {
    papel, sexo, idadeMeses: Math.round(Math.max(0, Math.min(120, idadeAnos)) * 12),
    sobrenome: ['irmao', 'filho', 'pai', 'neto'].includes(papel) ? prox.personagem.sobrenome : undefined,
    afeto: [50, 75], ano: prox.relogio.ano, usados: nomesEmUso(prox),
  });
  if (nome?.trim()) pe.nome = nome.trim().slice(0, 40);
  if (SOCIAIS.includes(papel)) pe.origem = 'bairro';
  ocupar(rng, pe);
  prox.pessoas.push(pe);
  prox.rng = rng.estado();
  marcar(prox, `${pe.nome} apareceu na sua vida: ${papelTexto(pe)}, ${textoIdade(pe.idadeMeses)}`);
  return prox;
}

/** Muda o nível de uma habilidade (0 a 100). */
export function editarHabilidade(vida: Vida, id: string, valor: number): Vida {
  if (!Number.isFinite(valor) || !(id in NOME_HABILIDADE)) return vida;
  const prox = structuredClone(vida);
  const antes = Math.round(prox.personagem.habilidades[id] ?? 0);
  const v = Math.round(limitar(valor));
  if (antes === v) return vida;
  prox.personagem.habilidades[id] = v;
  marcar(prox, `${NOME_HABILIDADE[id]} ${antes} → ${v}`);
  return prox;
}

/** Pausa ou retoma o envelhecimento do corpo. Os anos continuam passando. */
export function pausarIdade(vida: Vida, pausar: boolean): Vida {
  const prox = structuredClone(vida);
  const p = prox.personagem;
  if (pausar && p.idadeBiologicaMeses === undefined) {
    p.idadeBiologicaMeses = prox.relogio.idadeMeses;
    marcar(prox, `Seu corpo parou de envelhecer aos ${textoIdade(prox.relogio.idadeMeses)}.`);
  } else if (!pausar && p.idadeBiologicaMeses !== undefined) {
    marcar(prox, `Seu corpo voltou a envelhecer (está como alguém de ${textoIdade(p.idadeBiologicaMeses)}).`);
    delete p.idadeBiologicaMeses;
  } else return vida;
  return prox;
}

/** Força um evento pelo id, ignorando idade, peso e repetição. Só não inventa a pessoa que ele precisa. */
export function forcarEvento(vida: Vida, id: string): { vida: Vida; aviso?: string } {
  const e = eventoPorId(id);
  if (!e) return { vida, aviso: 'Evento não encontrado.' };
  if (vida.pendente) return { vida, aviso: 'Resolva a decisão pendente antes.' };
  const prox = structuredClone(vida);
  const rng = new Rng(prox.rng);
  const linhas: Linha[] = [];
  marcar(prox, `Evento forçado: ${id}`);
  const ok = disparar(prox, { ...e, quando: e.quando?.pessoa ? { pessoa: e.quando.pessoa } : undefined }, {}, rng, linhas);
  if (!ok) return { vida, aviso: 'Esse evento precisa de alguém (ou de uma lembrança) que você não tem.' };
  const quando = quandoAgora(prox);
  for (const t of linhas) prox.historico.push(typeof t === 'string' ? { quando, texto: t } : { quando, ...t });
  prox.rng = rng.estado();
  return { vida: prox };
}

/** Volta para a foto do começo do período anterior, com outro sorteio. */
export function voltarPeriodo(vida: Vida): Vida {
  if (!vida.anterior) return vida;
  const prox = structuredClone(vida.anterior);
  prox.voltas = vida.voltas + 1;
  prox.anterior = null;
  prox.rng = estadoDaSeed(`${vida.config.seed}#volta${prox.voltas}#${prox.rng.join(',')}`);
  prox.historico.push({ quando: quandoAgora(prox), texto: '↺ Você voltou um período. Desta vez pode ser diferente.' });
  return prox;
}

/** Ganchos abertos em texto legível, para o Modo Deus. */
export function ganchosLegiveis(vida: Vida): string[] {
  return vida.ganchos.map((g) => {
    const quando = textoIdade(g.idadeMeses);
    const nome = g.evento === '@nascimento' ? 'nascimento de um bebê' : g.evento === '@adocao' ? 'adoção' : g.evento;
    const quem = g.vars?.pessoa ?? g.vars?.pet ?? g.vars?.crush ?? '';
    return `${nome}${quem ? ` (${quem})` : ''} · aos ${quando}`;
  });
}

