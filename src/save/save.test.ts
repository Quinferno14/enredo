import { describe, expect, it } from 'vitest';
import { VERSAO_SAVE } from '../motor/tipos';
import { avancarPeriodo, criarVida } from '../motor/vida';
import {
  CHAVE, MAX_VIDAS, carregar, exportarTexto, importarTexto, salvarVida,
} from './save';

function memoria() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    mapa: m,
  };
}

const vida = (seed: string) => criarVida({
  id: seed, seed, ano: 2026, criadaEm: '2026-11-10T00:00:00.000Z',
  turno: 'ano', morte: 'permanente', inicio: 'bebe',
});

describe('save', () => {
  it('salva e carrega a mesma vida', () => {
    const s = memoria();
    const v = avancarPeriodo(vida('a'));
    salvarVida(carregar(s), v, s);
    const lido = carregar(s);
    expect(lido.atual).toBe('a');
    expect(lido.vidas[0]).toEqual(v);
  });

  it('guarda no máximo 5 vidas, a mais recente primeiro', () => {
    const s = memoria();
    let arm = carregar(s);
    for (let i = 0; i < 7; i++) arm = salvarVida(arm, vida(`v${i}`), s).armazem;
    const lido = carregar(s);
    expect(lido.vidas).toHaveLength(MAX_VIDAS);
    expect(lido.vidas[0]?.id).toBe('v6');
  });

  it('salvar a mesma vida de novo substitui, sem duplicar', () => {
    const s = memoria();
    let arm = salvarVida(carregar(s), vida('a'), s).armazem;
    arm = salvarVida(arm, avancarPeriodo(arm.vidas[0]!), s).armazem;
    expect(carregar(s).vidas).toHaveLength(1);
  });

  it('sem armazenamento disponível, não quebra', () => {
    expect(carregar(null)).toEqual({ vidas: [], atual: null });
    expect(salvarVida({ vidas: [], atual: null }, vida('a'), null).gravou).toBe(false);
  });

  it('dados corrompidos viram armazém vazio', () => {
    const s = memoria();
    s.setItem(CHAVE, '{isso não é json');
    expect(carregar(s)).toEqual({ vidas: [], atual: null });
  });

  it('exportar e importar devolve a mesma vida', () => {
    const v = avancarPeriodo(vida('b'));
    expect(importarTexto(exportarTexto(v))).toEqual(v);
  });

  it('importar recusa arquivo que não é do Enredo', () => {
    expect(() => importarTexto('{"ola": 1}')).toThrow();
    expect(() => importarTexto('nada')).toThrow();
  });

  it('converte um save antigo (versão 1) preenchendo tudo o que falta', () => {
    const v = vida('antiga') as unknown as Record<string, unknown> & { personagem: Record<string, unknown> };
    const antigo = structuredClone(v);
    antigo.versao = 1;
    for (const k of ['habitos', 'memorias', 'ganchos', 'pendente', 'periodo', 'totais', 'vistos', 'ganchosCumpridos', 'pessoas', 'linhagem', 'anterior', 'voltas']) delete antigo[k];
    for (const k of ['dinheiro', 'desgaste', 'tracos', 'classe', 'estudo', 'trabalho', 'dividas', 'moradia', 'potencial', 'interesse']) delete antigo.personagem[k];
    const lido = importarTexto(JSON.stringify(antigo));
    expect(lido.versao).toBe(VERSAO_SAVE);
    expect(lido.personagem.trabalho.extras).toEqual([]);
    expect(lido.config.turno).toBe('dinamico');
    expect(lido.anterior).toBeNull();
    expect(lido.personagem.trabalho.cargos).toEqual([]);
    expect(lido.pessoas.some((x) => x.papel === 'mae')).toBe(true);
    expect(lido.habitos).toEqual([]);
    expect(lido.personagem.estudo.etapa).toBe('nenhuma');
    expect(lido.personagem.trabalho.emprego).toBeNull();
    expect(lido.personagem.moradia).toBe('pais');
    expect(lido.personagem.dinheiro).toBe(0);
  });
});
