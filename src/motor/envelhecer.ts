// Envelhecimento, deriva da personalidade e chance de morte.
// Cada atributo físico tem um "potencial" (a genética) e um alvo que depende
// da idade. A cada período o valor anda um pouco em direção ao alvo, com ruído.
// Assim cada vida envelhece de um jeito, mas todas seguem uma curva plausível.

import type { Rng } from './rng';
import type { Eixo, Personagem, Potencial } from './tipos';
import { EIXOS } from './tipos';

export const limitar = (v: number, min = 0, max = 100) => Math.max(min, Math.min(max, v));

/** Saúde: estável até os 30, depois cai cada vez mais rápido. Disciplina ajuda. */
export function alvoSaude(potencial: number, idade: number, disciplina: number): number {
  const declinio = idade <= 30 ? 0 : Math.min(1, (idade - 30) / 65) ** 2 * 0.85;
  return limitar(potencial * (1 - declinio) + disciplina / 10);
}

/** Forma física: cresce até os 20, cai a partir dos 30. */
export function alvoForma(potencial: number, idade: number): number {
  const crescimento = 0.4 + 0.6 * Math.min(1, idade / 20);
  const queda = Math.max(0.25, 1 - Math.max(0, idade - 30) * 0.012);
  return limitar(potencial * crescimento * queda);
}

/** Aparência: pico entre 16 e 35, depois cai devagar. */
export function alvoAparencia(potencial: number, idade: number): number {
  const fator = idade < 16 ? 0.85 + (idade / 16) * 0.15
    : idade <= 35 ? 1
    : Math.max(0.35, 1 - (idade - 35) * 0.012);
  return limitar(potencial * fator);
}

/** Inteligência: amadurece até os 18, cai depois dos 70. */
export function alvoInteligencia(potencial: number, idade: number): number {
  const fator = idade < 18 ? 0.6 + (0.4 * idade) / 18
    : idade <= 70 ? 1
    : Math.max(0.5, 1 - (idade - 70) * 0.015);
  return limitar(potencial * fator);
}

/** Felicidade tende a um patamar que depende do temperamento. */
export function patamarFelicidade(p: Personagem['personalidade']): number {
  return limitar(55 + p.estabilidade * 0.15 + p.extroversao * 0.05);
}

/** Atributos de partida para uma idade, a partir do potencial. */
export function atributosNaIdade(pot: Potencial, idade: number, disciplina: number) {
  return {
    saude: Math.round(alvoSaude(pot.saude, idade, disciplina)),
    forma: Math.round(alvoForma(pot.forma, idade)),
    aparencia: Math.round(alvoAparencia(pot.aparencia, idade)),
    inteligencia: Math.round(alvoInteligencia(pot.inteligencia, idade)),
    carisma: Math.round(pot.carisma),
  };
}

/**
 * Envelhece o personagem por `anos` (1 ou 0,5), alterando-o no lugar.
 * `idade` é a idade ao fim do período.
 */
export function envelhecer(p: Personagem, idade: number, anos: number, rng: Rng): void {
  const a = p.atributos;
  const pot = p.potencial;
  const ruido = (amp: number) => (rng.proximo() * 2 - 1) * amp * anos;
  const andar = (atual: number, alvo: number, velocidade: number, amp: number) =>
    Math.round(limitar(atual + (alvo - atual) * velocidade * anos + ruido(amp)));

  a.saude = andar(a.saude, alvoSaude(pot.saude, idade, p.personalidade.disciplina), 0.25, 3);
  a.forma = andar(a.forma, alvoForma(pot.forma, idade), 0.3, 3);
  a.aparencia = andar(a.aparencia, alvoAparencia(pot.aparencia, idade), 0.3, 1.5);
  a.inteligencia = andar(a.inteligencia, alvoInteligencia(pot.inteligencia, idade), 0.3, 1.5);
  a.carisma = andar(a.carisma, pot.carisma, 0.1, 2.5);

  // Felicidade oscila mais em quem é emocionalmente instável e cai com a saúde ruim.
  const instabilidade = 1 + Math.max(0, -p.personalidade.estabilidade) / 100;
  const doenca = a.saude < 40 ? (40 - a.saude) * 0.1 * anos : 0;
  a.felicidade = Math.round(limitar(
    a.felicidade + (patamarFelicidade(p.personalidade) - a.felicidade) * 0.2 * anos
      + ruido(6 * instabilidade) - doenca,
  ));

  derivarPersonalidade(p, idade, anos, rng);
}

/** A personalidade muda devagar, e cada vez menos com a idade. */
export function derivarPersonalidade(p: Personagem, idade: number, anos: number, rng: Rng): void {
  const plasticidade = idade < 25 ? 1 : idade < 50 ? 0.6 : 0.35;
  for (const e of EIXOS as readonly Eixo[]) {
    const passo = (rng.proximo() * 2 - 1) * 2.5 * plasticidade * anos;
    p.personalidade[e] = Math.round(limitar(p.personalidade[e] + passo, -100, 100) * 10) / 10;
  }
}

/** Chance de morrer em um ano, pela idade, saúde e impulsividade. */
export function chanceMorteAnual(idade: number, saude: number, impulsividade: number) {
  const natural = idade < 1 ? 0.012 : idade < 5 ? 0.0008 : 0.00004 * Math.exp(0.088 * idade);
  const peso = Math.exp((60 - saude) / 30);
  const acidente = idade >= 15 && idade <= 45 ? 0.0008 * (1 + Math.max(0, impulsividade) / 100) : 0.0002;
  return { natural: natural * peso, acidente };
}

const CAUSAS_ACIDENTE = ['em um acidente de trânsito', 'afogado', 'em uma queda', 'em um assalto'];
const CAUSAS_ADULTO = ['de um infarto', 'de um câncer', 'de um AVC', 'de uma infecção grave'];
const CAUSAS_IDOSO = ['de causas naturais', 'de causas naturais', 'de um infarto', 'de um AVC', 'de um câncer', 'de uma pneumonia'];

/** Sorteia se o personagem morre neste período. Devolve a causa ou null. */
export function sortearMorte(p: Personagem, idade: number, anos: number, rng: Rng): string | null {
  if (p.atributos.saude <= 0) return idade < 50 ? 'de uma doença grave' : 'de causas naturais';
  const { natural, acidente } = chanceMorteAnual(idade, p.atributos.saude, p.personalidade.impulsividade);
  const anual = Math.min(1, natural + acidente);
  const chance = 1 - (1 - anual) ** anos;
  const sorteio = rng.proximo();
  if (sorteio >= chance) return null;
  if (sorteio < chance * (acidente / anual)) {
    const causa = rng.escolher(CAUSAS_ACIDENTE);
    return causa === 'afogado' ? (p.sexo === 'feminino' ? 'afogada' : 'afogado') : causa;
  }
  if (idade < 1) return 'de complicações após o nascimento';
  if (idade < 15) return 'de uma doença grave';
  if (idade < 60) return rng.escolher(CAUSAS_ADULTO);
  return rng.escolher(CAUSAS_IDOSO);
}
