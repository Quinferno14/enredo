import { describe, expect, it } from 'vitest';
import { ACOES } from '../../motor/acoes';
import { criarVida } from '../../motor/vida';
import type { Vida } from '../../motor/tipos';
import { LUGARES_JOGO, acoesDoLugar, lugaresDisponiveis } from './lugares';

const nova = (idadeAnos: number): Vida => {
  const v = criarVida({ id: 'lug', seed: 'lugares', criadaEm: '2026', ano: 2026, turno: 'dinamico', morte: 'permanente', inicio: 'bebe' } as Parameters<typeof criarVida>[0]);
  v.relogio.idadeMeses = idadeAnos * 12;
  return v;
};

describe('lugares do jogo', () => {
  it('toda ação acontece em algum lugar (nada some da tela)', () => {
    const noMundo = new Set(LUGARES_JOGO.flatMap((l) => l.acoes));
    const sem = ACOES.filter((a) => !noMundo.has(a.id) && !a.oculta).map((a) => a.id);
    expect(sem).toEqual([]);
  });

  it('bebê não sai de casa; em casa há o que fazer', () => {
    const v = nova(1);
    expect(lugaresDisponiveis(v)).toEqual([]);
    expect(acoesDoLugar(v, 'casa').length).toBeGreaterThan(0);
  });

  it('criança vai à escola e à praça, mas não ao banco nem à imobiliária', () => {
    const v = nova(9);
    v.personagem.estudo.etapa = 'fundamental';
    const ids = lugaresDisponiveis(v).map((l) => l.id);
    expect(ids).toContain('escola');
    expect(ids).toContain('praca');
    expect(ids).not.toContain('banco');
    expect(ids).not.toContain('imobiliaria');
  });

  it('adulto tem trabalho (ou agência) e imobiliária', () => {
    const v = nova(30);
    const ids = lugaresDisponiveis(v).map((l) => l.id);
    expect(ids).toContain('trabalho');
    expect(ids).toContain('imobiliaria');
  });
});
