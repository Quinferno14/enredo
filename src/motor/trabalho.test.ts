// R2: trabalho livre — habilidades, várias rendas, vagas sem diploma, carreiras especiais.

import { describe, expect, it } from 'vitest';
import { fazerAcao } from './acoes';
import { vagasPossiveis } from './carreira';
import type { Vida } from './tipos';
import { avancarPeriodo, criarVida } from './vida';
import { escolher } from './eventos';

const adulto = (seed: string): Vida => {
  const v = criarVida({ id: seed, seed, ano: 2026, criadaEm: 'x', turno: 'ano', morte: 'permanente', inicio: 'adulto' });
  v.personagem.dinheiro = 100000;
  return v;
};

describe('trabalho livre', () => {
  it('curso sobe a habilidade, e cada curso conta separado', () => {
    let v = adulto('t1');
    for (let i = 0; i < 5; i++) v = fazerAcao(v, 'curso', { variante: 'ingles' }).vida;
    const ingles = v.personagem.habilidades.ingles!;
    v = fazerAcao(v, 'curso', { variante: 'programacao' }).vida;
    expect(ingles).toBeGreaterThan(7);
    expect(v.personagem.habilidades.programacao!).toBeGreaterThan(2.5); // primeira aula rende cheio
  });

  it('programação alta abre vaga de programador e freela sem faculdade', () => {
    const v = adulto('t2');
    v.personagem.habilidades.programacao = 70;
    expect(vagasPossiveis(v, 'fixo').some((e) => e.id === 'programador')).toBe(true);
    expect(vagasPossiveis(v, 'extra').some((e) => e.id === 'freela_programacao')).toBe(true);
  });

  it('dá para ter emprego principal e trabalhos extras ao mesmo tempo', () => {
    let v = adulto('t3');
    v.personagem.habilidades.design = 60;
    v.personagem.habilidades.ingles = 70;
    let extras = 0;
    for (let i = 0; i < 40 && extras < 2; i++) {
      v = fazerAcao(v, 'procurar_emprego', { variante: 'extra' }).vida;
      if (v.pendente) v = escolher(v, 0);
      extras = v.personagem.trabalho.extras.length;
    }
    expect(extras).toBe(2);
    const antes = v.personagem.dinheiro;
    v = avancarPeriodo({ ...v, pendente: null });
    expect(v.personagem.dinheiro).toBeGreaterThan(antes - 5000); // a renda extra entra
  });

  it('quem estuda para concurso passa mais', () => {
    const tentar = (estudo: number) => {
      let ok = 0;
      for (let i = 0; i < 60; i++) {
        let v = adulto(`conc-${estudo}-${i}`);
        v.personagem.habilidades.concurso = estudo;
        v.personagem.estudo.escolaridade = 'medio';
        v = fazerAcao(v, 'prestar_concurso', { variante: 'medio' }).vida;
        if (v.personagem.trabalho.emprego?.id === 'servidor_medio') ok++;
      }
      return ok;
    };
    expect(tentar(90)).toBeGreaterThan(tentar(0) + 15);
  });

  it('postar dá seguidores; negócio abre com dinheiro', () => {
    let v = adulto('t5');
    for (let i = 0; i < 20; i++) v = fazerAcao(v, 'postar', { variante: 'humor' }).vida;
    expect(v.personagem.seguidores).toBeGreaterThan(20);
    v = fazerAcao(v, 'abrir_negocio', { variante: 'loja' }).vida;
    expect(v.personagem.negocio?.nome).toBe('a loja');
  });
});
