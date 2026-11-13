import { describe, expect, it } from 'vitest';
import { fazerAcaoBicho, idadeBicho, sincronizarBichos } from './bichos';
import { lembrar } from './efeitos';
import { criarVida } from './vida';
import type { Vida } from './tipos';

const nova = (idadeAnos: number): Vida => {
  const v = criarVida({ id: 'b', seed: 'bichos', criadaEm: '2026', ano: 2026, turno: 'dinamico', morte: 'permanente', inicio: 'bebe' } as Parameters<typeof criarVida>[0]);
  v.relogio.idadeMeses = idadeAnos * 12;
  return v;
};

describe('bichos de estimação', () => {
  it('nasce da lembrança de adoção, envelhece e se vai na lembrança de despedida', () => {
    const v = nova(9);
    lembrar(v, 'adotou_pet', 'adotou o Pipoca', 20, { pet: 'Pipoca' });
    sincronizarBichos(v);
    expect(v.bichos?.length).toBe(1);
    expect(v.bichos![0]!.vivo).toBe(true);
    v.relogio.idadeMeses += 24;
    expect(idadeBicho(v, v.bichos![0]!)).toBe(18 + 24);
    sincronizarBichos(v);
    expect(v.bichos?.length).toBe(1);
    lembrar(v, 'perdeu_pet', 'perdeu o Pipoca', -20, { pet: 'Pipoca' });
    sincronizarBichos(v);
    expect(v.bichos![0]!.vivo).toBe(false);
  });

  it('carinho deixa o bicho mais apegado e você mais feliz; passear só cachorro e a partir dos 9', () => {
    const v = nova(10);
    lembrar(v, 'adotou_pet', 'adotou o Pipoca', 20, { pet: 'Pipoca' });
    sincronizarBichos(v);
    const b = v.bichos![0]!;
    const r = fazerAcaoBicho(v, b.id, 'carinho');
    expect(r.ok).toBe(true);
    expect(r.vida.bichos![0]!.afeto).toBeGreaterThan(b.afeto);
    expect(r.vida.historico.at(-1)!.texto).toMatch(/Pipoca/);
    const pequena = nova(5);
    lembrar(pequena, 'adotou_pet', 'ganhou o Toby', 20, { pet: 'Toby' });
    sincronizarBichos(pequena);
    expect(fazerAcaoBicho(pequena, pequena.bichos![0]!.id, 'passear').ok).toBe(false);
  });

  it('vida sem bicho não ganha campo vazio (save igual ao de antes)', () => {
    const v = nova(5);
    sincronizarBichos(v);
    expect('bichos' in v).toBe(false);
  });
});
