import { describe, expect, it } from 'vitest';
import { resolverObjetivo, rodarObjetivos } from './objetivos';
import { escolher } from './eventos';
import { Rng } from './rng';
import { avancarPeriodo, criarVida } from './vida';
import type { Pessoa, Vida } from './tipos';

const nova = (idadeAnos: number, seed = 'obj'): Vida => {
  const v = criarVida({ id: seed, seed, criadaEm: '2026', ano: 2026, turno: 'dinamico', morte: 'permanente', inicio: 'bebe' } as Parameters<typeof criarVida>[0]);
  v.relogio.idadeMeses = idadeAnos * 12;
  return v;
};
const pessoa = (v: Vida, papel: Pessoa['papel'], idade: number, afeto: number, extra: Partial<Pessoa> = {}): Pessoa => {
  const base = structuredClone(v.pessoas.find((x) => x.papel === 'mae')!);
  const x: Pessoa = { ...base, id: `${papel}-${idade}-${afeto}`, nome: 'Bia', papel, idadeMeses: idade * 12, afeto, renda: 3000, ...extra };
  delete x.objetivo; delete x.objetivosFeitos; delete x.moraJunto;
  v.pessoas.push(x);
  return x;
};
/** Só ela na vida (para medir sem os outros ocuparem as vagas de objetivo). */
const so = (v: Vida, pe: Pessoa) => { v.pessoas = [pe]; };

describe('A Vida: objetivos das pessoas próximas', () => {
  it('quem importa ganha objetivos; quem quase não faz parte da vida, não', () => {
    let perto = 0, longe = 0;
    for (let i = 0; i < 60; i++) {
      const v = nova(30, `o${i}`);
      const amiga = pessoa(v, 'amigo', 30, 85);
      const conhecido = pessoa(v, 'vizinho', 30, 15, { afastado: true });
      v.pessoas = [amiga, conhecido];
      rodarObjetivos(v, 1, Rng.daSeed(`r${i}`));
      if (amiga.objetivo) perto++;
      if (conhecido.objetivo) longe++;
    }
    expect(perto).toBeGreaterThan(3);
    expect(longe).toBe(0);
  });

  it('nunca mais de 3 objetivos andando ao mesmo tempo', () => {
    const v = nova(30);
    v.pessoas = Array.from({ length: 10 }, (_, i) => pessoa(v, 'amigo', 30 + i, 90));
    for (let i = 0; i < 20; i++) rodarObjetivos(v, 1, Rng.daSeed(`m${i}`));
    expect(v.pessoas.filter((x) => x.objetivo).length).toBeLessThanOrEqual(3);
  });

  it('ninguém pede ajuda enquanto você está no meio de um golpe', () => {
    const v = nova(30);
    const irma = pessoa(v, 'irmao', 17, 90);
    so(v, irma);
    irma.objetivo = { tipo: 'vestibular', inicio: 0, prazo: 12, progresso: 0.5, extra: 'Medicina' };
    v.diretor = { intensidade: 80, mesesCalmos: 0 };
    for (let i = 0; i < 20; i++) { irma.objetivo.progresso = 0.5; rodarObjetivos(v, 1 / 12, Rng.daSeed(`g${i}`)); }
    expect(v.pendente).toBeNull();
    v.diretor.intensidade = 0;
    for (let i = 0; i < 20 && !v.pendente; i++) { irma.objetivo!.progresso = 0.5; rodarObjetivos(v, 1 / 12, Rng.daSeed(`h${i}`)); }
    expect(v.pendente?.sistema).toBe('objetivo');
  });

  it('ajudar aumenta a chance de dar certo', () => {
    const taxa = (ajudou: boolean) => {
      let ok = 0;
      for (let i = 0; i < 400; i++) {
        const v = nova(30);
        const irma = pessoa(v, 'irmao', 17, 90, { inteligencia: 50 });
        so(v, irma);
        irma.objetivo = { tipo: 'vestibular', inicio: 0, prazo: 12, progresso: 0.99, extra: 'Medicina', pediu: true, ...(ajudou ? { ajudou: true } : {}) };
        rodarObjetivos(v, 1 / 12, Rng.daSeed(`a${i}`));
        if (irma.ocupacao === 'estudante') ok++;
      }
      return ok / 400;
    };
    expect(taxa(true) - taxa(false)).toBeGreaterThan(0.1);
  });

  it('empréstimo para o negócio: volta com juros se der certo, some se der errado', () => {
    let voltou = 0, perdeu = 0;
    for (let i = 0; i < 80; i++) {
      const v = nova(35);
      v.personagem.dinheiro = 10000;
      const pai = pessoa(v, 'pai', 60, 80);
      so(v, pai);
      pai.objetivo = { tipo: 'negocio', inicio: 0, prazo: 12, progresso: 0.5, extra: 'uma lanchonete' };
      resolverObjetivo(v, { evento: '@objetivo', sistema: 'objetivo', texto: '', vars: { pessoaId: pai.id, valor: '2000' }, dados: ['sim', 'nao'], escolhas: [] }, 0);
      expect(v.personagem.dinheiro).toBe(8000);
      pai.objetivo!.progresso = 0.999;
      rodarObjetivos(v, 1 / 12, Rng.daSeed(`n${i}`));
      if (v.personagem.dinheiro === 8000 + 2600) voltou++;
      else if (v.personagem.dinheiro === 8000) perdeu++;
    }
    expect(voltou).toBeGreaterThan(0);
    expect(perdeu).toBeGreaterThan(0);
    expect(voltou + perdeu).toBe(80);
  });

  it('em vidas simuladas, as pessoas correm atrás das coisas e às vezes pedem ajuda', () => {
    let linhas = 0, pedidos = 0;
    for (let s = 0; s < 6; s++) {
      let v = criarVida({ id: 's' + s, seed: 'vida-obj-' + s, criadaEm: '2026', ano: 2026, turno: 'dinamico', morte: 'permanente', inicio: 'bebe' } as Parameters<typeof criarVida>[0]);
      let n = 0;
      while (!v.morte && n++ < 1500) {
        v = avancarPeriodo(v, true);
        let g = 0;
        while (v.pendente && g++ < 5) { if (v.pendente.sistema === 'objetivo') pedidos++; v = escolher(v, 0); }
        if (v.pendente) v = { ...v, pendente: null };
      }
      linhas += v.historico.filter((h) => h.fato?.id === 'objetivo').length;
    }
    expect(linhas / 6).toBeGreaterThan(3);
    expect(pedidos).toBeGreaterThan(0);
  }, 120000);
});
