// Capítulos e sonhos: a vida em fases com nome (abertas por marcos), e o que a
// personagem quer da vida. Dão começo, meio e fim à história; o feed mostra o
// capítulo como uma nota do narrador.

import { aplicar, lembrar } from './efeitos';
import type { Linha, Vida } from './tipos';

export interface Capitulo { id: string; titulo: string; inicioMeses: number }

export type IdSonho = 'casa_propria' | 'faculdade' | 'filhos' | 'casar' | 'negocio' | 'fama' | 'ficar_rico';
export interface Sonho { id: IdSonho; desde: number; status: 'vivo' | 'realizado' | 'deixado'; quando?: number }

const fem = (v: Vida) => v.personagem.sexo === 'feminino';
const idadeDe = (v: Vida) => v.relogio.idadeMeses / 12;

interface Marco { id: string; titulo: (v: Vida) => string; ok: (v: Vida) => boolean }

/** Marcos que abrem um capítulo, na ordem em que costumam vir. */
const MARCOS: Marco[] = [
  { id: 'escola', titulo: () => 'Os anos de escola', ok: (v) => idadeDe(v) >= 6 && v.personagem.estudo.etapa === 'fundamental' },
  { id: 'adolescencia', titulo: () => 'Adolescência', ok: (v) => idadeDe(v) >= 13 },
  { id: 'maioridade', titulo: () => 'Gente grande', ok: (v) => idadeDe(v) >= 18 },
  { id: 'faculdade', titulo: () => 'A faculdade', ok: (v) => v.personagem.estudo.etapa === 'faculdade' },
  { id: 'emprego', titulo: () => 'O primeiro emprego', ok: (v) => idadeDe(v) >= 16 && !!v.personagem.trabalho.emprego },
  { id: 'saiu_de_casa', titulo: () => 'Casa nova, vida nova', ok: (v) => idadeDe(v) >= 16 && v.personagem.moradia !== 'pais' },
  { id: 'casamento', titulo: () => 'A vida a dois', ok: (v) => v.pessoas.some((x) => x.papel === 'parceiro' && x.relacao === 'casamento' && x.vivo) },
  { id: 'filhos', titulo: () => 'Casa cheia', ok: (v) => v.pessoas.some((x) => x.papel === 'filho') },
  { id: 'prata', titulo: () => 'Os anos de prata', ok: (v) => idadeDe(v) >= 60 },
  { id: 'aposentadoria', titulo: (v) => `Aposentad${fem(v) ? 'a' : 'o'}`, ok: (v) => v.personagem.trabalho.aposentadoria > 0 },
];

/** Abre no máximo um capítulo novo por passo: um marco, ou o depois de um golpe enorme. */
export function rodarCapitulos(vida: Vida): Linha[] {
  const d = (vida.diretor ??= { intensidade: 0, mesesCalmos: 0 });
  const feitos = new Set((d.capitulos ?? []).map((c) => c.id));
  const abrir = (id: string, titulo: string): Linha[] => {
    d.capitulos = [...(d.capitulos ?? []), { id, titulo, inicioMeses: vida.relogio.idadeMeses }];
    return [{ texto: `Capítulo: ${titulo}`, fato: { tipo: 'capitulo', id } }];
  };
  // Um golpe enorme abre um capítulo próprio ("Depois da mãe").
  const g = d.golpes?.at(-1);
  // No máximo um desses a cada 3 anos, para a vida não virar uma fila de lutos.
  const ultimoLuto = (d.capitulos ?? []).filter((c) => c.id.startsWith('depois_')).at(-1);
  const espacou = !ultimoLuto || vida.relogio.idadeMeses - ultimoLuto.inicioMeses >= 36;
  if (g && g.pts >= 80 && espacou && g.tipo === 'morte' && vida.relogio.idadeMeses - g.idadeMeses <= 1) {
    const id = `depois_${g.pessoa ?? g.idadeMeses}`;
    const pe = vida.pessoas.find((x) => x.id === g.pessoa);
    if (pe && !feitos.has(id)) {
      const quem = pe.papel === 'mae' ? 'da mãe' : pe.papel === 'pai' ? 'do pai' : `de ${pe.nome}`;
      return abrir(id, `Depois ${quem}`);
    }
  }
  for (const m of MARCOS) if (!feitos.has(m.id) && m.ok(vida)) return abrir(m.id, m.titulo(vida));
  return [];
}

export const capituloAtual = (vida: Vida): Capitulo | undefined => vida.diretor?.capitulos?.at(-1);

// ---------- Sonhos ----------

const TEXTO_SONHO: Record<IdSonho, string> = {
  casa_propria: 'ter a própria casa', faculdade: 'fazer faculdade', filhos: 'ter filhos', casar: 'casar',
  negocio: 'ter o próprio negócio', fama: 'ficar famos{o|a}', ficar_rico: 'ficar ric{o|a}',
};
const flex = (v: Vida, t: string) => t.replace(/\{o\|a\}/g, fem(v) ? 'a' : 'o');
export const textoSonho = (v: Vida, id: IdSonho) => flex(v, TEXTO_SONHO[id]);

/** Quanto cada sonho combina com a personalidade e a inteligência. */
function afinidadeSonho(v: Vida, id: IdSonho): number {
  const p = v.personagem.personalidade;
  const a = v.personagem.atributos;
  switch (id) {
    case 'faculdade': return 40 + p.curiosidade * 0.3 + (a.inteligencia - 50) * 0.6 + p.disciplina * 0.2;
    case 'filhos': return 40 + p.empatia * 0.4;
    case 'casar': return 35 + p.empatia * 0.3 + p.estabilidade * 0.1;
    case 'negocio': return 25 + p.ambicao * 0.4 + p.impulsividade * 0.2;
    case 'fama': return 15 + p.extroversao * 0.4 + p.ambicao * 0.3;
    case 'ficar_rico': return 25 + p.ambicao * 0.5;
    case 'casa_propria': return 45 + p.disciplina * 0.2 + p.estabilidade * 0.2;
  }
}

/** Já realizado? */
function realizado(v: Vida, id: IdSonho): boolean {
  const p = v.personagem;
  switch (id) {
    case 'faculdade': return p.estudo.escolaridade === 'superior' || p.estudo.etapa === 'faculdade';
    case 'filhos': return v.pessoas.some((x) => x.papel === 'filho');
    case 'casar': return v.pessoas.some((x) => x.relacao === 'casamento') || v.memorias.some((m) => m.id === 'casamento');
    case 'negocio': return !!p.negocio;
    case 'fama': return p.fama >= 50;
    case 'ficar_rico': return p.dinheiro >= 1_000_000;
    case 'casa_propria': return v.memorias.some((m) => m.id === 'casa_propria');
  }
}

/** Idade em que a pessoa faz as pazes com não ter realizado. */
const DEIXA_AOS: Partial<Record<IdSonho, number>> = { faculdade: 45, filhos: 50, fama: 45, casar: 60 };

/**
 * Aos 13 nascem os sonhos (dois, pelo jeito da pessoa, com um pouco de acaso).
 * Depois, cada passo confere se algum se realizou ou ficou para trás.
 */
export function rodarSonhos(vida: Vida, sorteio: () => number): Linha[] {
  const p = vida.personagem;
  const idade = idadeDe(vida);
  const linhas: Linha[] = [];
  if (!p.sonhos && idade >= 13) {
    const ids = (Object.keys(TEXTO_SONHO) as IdSonho[])
      .filter((id) => !realizado(vida, id))
      .map((id) => ({ id, nota: afinidadeSonho(vida, id) + sorteio() * 40 }))
      .sort((a, b) => b.nota - a.nota)
      .slice(0, 2)
      .map((x) => x.id);
    p.sonhos = ids.map((id) => ({ id, desde: vida.relogio.idadeMeses, status: 'vivo' }));
    if (ids.length) linhas.push({ texto: `Você começou a sonhar em ${ids.map((id) => textoSonho(vida, id)).join(' e em ')}.`, fato: { tipo: 'sonho', id: ids.join(',') } });
    return linhas;
  }
  for (const s of p.sonhos ?? []) {
    if (s.status !== 'vivo') continue;
    if (realizado(vida, s.id)) {
      s.status = 'realizado';
      s.quando = vida.relogio.idadeMeses;
      aplicar(vida, { 'atributos.felicidade': 12 });
      lembrar(vida, `sonho_${s.id}`, `realizou o sonho de ${textoSonho(vida, s.id)}`, 25);
      linhas.push({ texto: `Um sonho realizado: ${textoSonho(vida, s.id)}. Você sonhava com isso desde os ${Math.floor(s.desde / 12)} anos.`, fato: { tipo: 'sonho', id: s.id } });
    } else if ((DEIXA_AOS[s.id] ?? 999) <= idade) {
      s.status = 'deixado';
      s.quando = vida.relogio.idadeMeses;
      lembrar(vida, `sonho_deixado_${s.id}`, `deixou para trás o sonho de ${textoSonho(vida, s.id)}`, -6);
      linhas.push({ texto: `Você fez as pazes com a ideia de que não vai ${textoSonho(vida, s.id)}. A vida foi por outro caminho.`, fato: { tipo: 'sonho', id: s.id } });
    }
  }
  return linhas;
}
