// Saves: até MAX_VIDAS vidas guardadas no navegador, mais exportar/importar
// arquivo .json como backup. O navegador pode recusar o armazenamento
// (janela anônima, dados bloqueados), então toda leitura e escrita é protegida.

import { estudoInicial } from '../motor/carreira';
import { familiaParaSaveAntigo } from '../motor/familia';
import { ATRIBUTOS, EIXOS, VERSAO_SAVE, type Vida } from '../motor/tipos';

export const CHAVE = 'enredo.saves';
export const MAX_VIDAS = 5;

export interface Armazem {
  vidas: Vida[]; // mais recente primeiro
  atual: string | null;
}

type StorageSimples = Pick<Storage, 'getItem' | 'setItem'>;

function storagePadrao(): StorageSimples | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function carregar(storage: StorageSimples | null = storagePadrao()): Armazem {
  const vazio: Armazem = { vidas: [], atual: null };
  if (!storage) return vazio;
  try {
    const bruto = storage.getItem(CHAVE);
    if (!bruto) return vazio;
    const dados = JSON.parse(bruto) as { vidas?: unknown[]; atual?: unknown };
    const vidas = (dados.vidas ?? []).flatMap((v) => {
      const ok = migrar(v);
      return ok ? [ok] : [];
    });
    const atual = typeof dados.atual === 'string' && vidas.some((v) => v.id === dados.atual)
      ? dados.atual
      : null;
    return { vidas, atual };
  } catch {
    return vazio;
  }
}

/** Grava a vida (substituindo a de mesmo id) e a marca como atual. */
export function salvarVida(
  armazem: Armazem,
  vida: Vida,
  storage: StorageSimples | null = storagePadrao(),
): { armazem: Armazem; gravou: boolean } {
  const vidas = [vida, ...armazem.vidas.filter((v) => v.id !== vida.id)].slice(0, MAX_VIDAS);
  const novo: Armazem = { vidas, atual: vida.id };
  return { armazem: novo, gravou: gravar(novo, storage) };
}

export function gravar(armazem: Armazem, storage: StorageSimples | null = storagePadrao()): boolean {
  if (!storage) return false;
  try {
    storage.setItem(CHAVE, JSON.stringify(armazem));
    return true;
  } catch {
    return false;
  }
}

export function exportarTexto(vida: Vida): string {
  return JSON.stringify(vida, null, 2);
}

export function importarTexto(texto: string): Vida {
  let dados: unknown;
  try {
    dados = JSON.parse(texto);
  } catch {
    throw new Error('O arquivo não é um JSON válido.');
  }
  const vida = migrar(dados);
  if (!vida) throw new Error('O arquivo não parece ser uma vida do Enredo.');
  return vida;
}

/**
 * Confere a forma de um save e converte versões antigas para a atual.
 * Versão 1 (marcos 1 e 2) ganha os campos do marco 3 vazios.
 */
export function migrar(dados: unknown): Vida | null {
  if (!dados || typeof dados !== 'object') return null;
  const v = dados as Partial<Vida>;
  const versao = v.versao as number | undefined;
  if (typeof versao !== 'number' || versao < 1 || versao > VERSAO_SAVE) return null;
  const p = v.personagem;
  const ok =
    typeof v.id === 'string' &&
    !!v.config && typeof v.config.seed === 'string' &&
    Array.isArray(v.rng) && v.rng.length === 4 &&
    !!v.relogio && typeof v.relogio.idadeMeses === 'number' &&
    !!p && typeof p.nome === 'string' &&
    ATRIBUTOS.every((a) => typeof p.atributos?.[a] === 'number') &&
    EIXOS.every((e) => typeof p.personalidade?.[e] === 'number') &&
    Array.isArray(v.historico);
  if (!ok) return null;
  const vida = v as Vida;
  if (!vida.atributosAnteriores) vida.atributosAnteriores = { ...vida.personagem.atributos };
  // Vidas do marco 1 não tinham potencial: usa os atributos atuais como genética.
  if (!vida.personagem.potencial) {
    const a = vida.personagem.atributos;
    vida.personagem.potencial = {
      saude: a.saude, forma: a.forma, aparencia: a.aparencia,
      inteligencia: a.inteligencia, carisma: a.carisma,
    };
  }
  // Versão 1 → 2: ações, hábitos, eventos, memórias e ganchos.
  const p2 = vida.personagem;
  p2.dinheiro ??= 0;
  p2.desgaste ??= 0;
  p2.tracos ??= [];
  vida.habitos ??= [];
  vida.memorias ??= [];
  vida.ganchos ??= [];
  vida.pendente ??= null;
  vida.periodo ??= {};
  vida.totais ??= {};
  vida.vistos ??= {};
  vida.ganchosCumpridos ??= 0;
  // Versão 2 → 3: escola, trabalho e dinheiro. Vidas antigas viram classe média, rede pública.
  p2.classe ??= 'media';
  p2.estudo ??= estudoInicial('media', null, vida.relogio.idadeMeses / 12);
  p2.trabalho ??= { emprego: null, anosContribuicao: 0, aposentadoria: 0, cargos: [], extras: [] };
  p2.dividas ??= [];
  p2.moradia ??= 'pais';
  // Versão 3 → 4: família.
  p2.interesse ??= 'todos';
  vida.linhagem ??= { geracao: 1, anteriores: [] };
  vida.pessoas ??= familiaParaSaveAntigo(vida);
  // Versão 4 → 5: voltar um período e histórico de cargos.
  vida.anterior ??= null;
  vida.voltas ??= 0;
  p2.trabalho.cargos ??= [];
  // Versão 5 → 6: tempo dinâmico para todas as vidas jogadas na tela.
  if (versao < 6) vida.config.turno = 'dinamico';
  vida.relogio.mes ??= 1;
  // Versão 6 → 7: trabalho livre.
  p2.trabalho.extras ??= [];
  p2.habilidades ??= {};
  p2.fama ??= 0;
  p2.seguidores ??= 0;
  p2.negocio ??= null;
  vida.versao = VERSAO_SAVE;
  return vida;
}
