// Modo Deus: editar a vida por fora das regras, forçar eventos, pausar a idade
// e voltar um período. Toda edição fica marcada com ✦ na história.

import { empregoPorId, ESTADOS_DEF, salarioInicial, tituloEmprego } from './carreira';
import { reais } from './efeitos';
import { limitar } from './envelhecer';
import { disparar, eventoPorId } from './eventos';
import { capitalizar, papelTexto } from './familia';
import { Rng, estadoDaSeed } from './rng';
import type { Atributo, Eixo, Vida } from './tipos';
import { textoIdade } from './vida';

const NOMES: Record<string, string> = {
  saude: 'Saúde', felicidade: 'Felicidade', inteligencia: 'Inteligência', aparencia: 'Aparência',
  forma: 'Forma', carisma: 'Carisma', sorte: 'Sorte', desgaste: 'Cansaço',
  extroversao: 'Extroversão', empatia: 'Empatia', disciplina: 'Disciplina', impulsividade: 'Impulsividade',
  ambicao: 'Ambição', moralidade: 'Moralidade', estabilidade: 'Estabilidade', curiosidade: 'Curiosidade',
};

function marcar(vida: Vida, texto: string) {
  vida.historico.push({ quando: vida.historico.at(-1)?.quando ?? '', texto: `✦ ${texto}` });
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
  }
  marcar(prox, `${NOMES[a]} ${antes} → ${v}`);
  return prox;
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

export function editarPessoa(vida: Vida, pessoaId: string, campo: 'afeto' | 'saude', valor: number): Vida {
  const prox = structuredClone(vida);
  const pe = prox.pessoas.find((x) => x.id === pessoaId);
  if (!pe || !pe.vivo) return vida;
  const antes = pe[campo];
  pe[campo] = Math.round(limitar(valor));
  if (antes === pe[campo]) return vida;
  marcar(prox, `${capitalizar(papelTexto(pe))}, ${pe.nome}: ${campo === 'afeto' ? 'afeto' : 'saúde'} ${antes} → ${pe[campo]}`);
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
  const linhas: string[] = [];
  marcar(prox, `Evento forçado: ${id}`);
  const ok = disparar(prox, { ...e, quando: e.quando?.pessoa ? { pessoa: e.quando.pessoa } : undefined }, {}, rng, linhas);
  if (!ok) return { vida, aviso: 'Esse evento precisa de alguém (ou de uma lembrança) que você não tem.' };
  const quando = prox.historico.at(-1)?.quando ?? '';
  for (const t of linhas) prox.historico.push({ quando, texto: t });
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
  prox.historico.push({ quando: prox.historico.at(-1)?.quando ?? '', texto: '↺ Você voltou um período. Desta vez pode ser diferente.' });
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

