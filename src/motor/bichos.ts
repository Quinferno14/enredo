// Bichos de estimação de verdade: nome, espécie, idade e afeto. Nascem das
// lembranças que os acontecimentos já gravam ("adotou o {pet}") e morrem quando
// o acontecimento de despedida acontece ("perdeu o {pet}"), então vidas antigas
// com bicho também ganham o seu. O bicho responde na hora ao carinho.

import { aplicar, diferenca, foto, resumo } from './efeitos';
import { quandoAgora } from './tempo';
import type { Vida } from './tipos';

export type Especie = 'cachorro' | 'gato';

export interface Bicho {
  id: string;
  nome: string;
  especie: Especie;
  /** Idade quando chegou (meses) e quando chegou (sua idade em meses). */
  idadeChegada: number;
  desde: number;
  afeto: number;
  vivo: boolean;
  /** Cor do pelo. */
  cor: string;
}

const PELAGENS = ['#c98d4a', '#2b2620', '#f2e6cf', '#8a5a2b', '#9a9a9a', '#e0a050'];
const hash = (s: string) => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };

/** Idade do bicho agora, em meses. */
export const idadeBicho = (vida: Vida, b: Bicho) => b.idadeChegada + Math.max(0, vida.relogio.idadeMeses - b.desde);

export const bichosVivos = (vida: Vida) => (vida.bichos ?? []).filter((b) => b.vivo);

/** Cria os bichos que as lembranças dizem que chegaram e marca os que se foram. */
export function sincronizarBichos(vida: Vida): void {
  const bichos = (vida.bichos ??= []);
  for (const m of vida.memorias) {
    const nome = m.vars?.pet;
    if (!nome) continue;
    if (m.id === 'adotou_pet' && !bichos.some((b) => b.nome === nome)) {
      const h = hash(`${vida.config.seed}/${nome}`);
      // Vira-lata da rua chega já crescido; filhote chega novinho.
      const daRua = /adotou/.test(m.texto);
      bichos.push({
        id: `bicho-${bichos.length + 1}`, nome, especie: daRua || h % 10 < 7 ? 'cachorro' : 'gato',
        idadeChegada: daRua ? 18 : 3, desde: m.idadeMeses, afeto: 70, vivo: true, cor: PELAGENS[h % PELAGENS.length]!,
      });
    }
    if (m.id === 'perdeu_pet') {
      const b = bichos.find((x) => x.nome === nome && x.vivo);
      if (b) b.vivo = false;
    }
  }
  if (!bichos.length) delete vida.bichos;
}

export type AcaoBicho = 'carinho' | 'brincar' | 'passear';

export function acoesDoBicho(vida: Vida, b: Bicho): { id: AcaoBicho; nome: string }[] {
  const idade = vida.relogio.idadeMeses / 12;
  const r: { id: AcaoBicho; nome: string }[] = [{ id: 'carinho', nome: 'Fazer carinho' }];
  if (idade >= 3) r.push({ id: 'brincar', nome: b.especie === 'gato' ? 'Brincar com a bolinha' : 'Jogar a bolinha' });
  if (b.especie === 'cachorro' && idade >= 9) r.push({ id: 'passear', nome: 'Levar para passear' });
  return r;
}

const RESPOSTA: Record<Especie, Record<AcaoBicho, string[]>> = {
  cachorro: {
    carinho: ['{n} abanou o rabo inteiro e deitou de barriga para cima.', '{n} encostou a cabeça na sua mão e fechou os olhos.'],
    brincar: ['{n} trouxe a bolinha de volta umas vinte vezes, todo babado.', '{n} correu pela casa toda atrás da bolinha.'],
    passear: ['O passeio com {n} rendeu cheiro em cada poste do bairro.', '{n} puxou a coleira até a praça e voltou cansado e feliz.'],
  },
  gato: {
    carinho: ['{n} ronronou alto e amassou pãozinho no seu colo.', '{n} aceitou o carinho por exatos dez segundos e foi embora digno.'],
    brincar: ['{n} caçou a bolinha como se fosse a presa da vida.', '{n} fingiu desinteresse e depois atacou a bolinha de surpresa.'],
    passear: ['{n} não quis saber de passeio.', '{n} não quis saber de passeio.'],
  },
};

/** Faz algo com o bicho: ele responde na hora (afeto) e você sente (humor, forma). */
export function fazerAcaoBicho(vida: Vida, id: string, acao: AcaoBicho): { vida: Vida; ok: boolean; aviso?: string } {
  const b0 = vida.bichos?.find((x) => x.id === id && x.vivo);
  if (!b0 || !acoesDoBicho(vida, b0).some((a) => a.id === acao)) return { vida, ok: false, aviso: 'Agora não dá.' };
  const prox: Vida = structuredClone(vida);
  const b = prox.bichos!.find((x) => x.id === id)!;
  const antes = foto(prox);
  if (acao === 'carinho') aplicar(prox, { 'atributos.felicidade': 2 });
  if (acao === 'brincar') aplicar(prox, { 'atributos.felicidade': 3, desgaste: 2, ...(b.especie === 'cachorro' ? { 'atributos.forma': 0.5 } : {}) });
  if (acao === 'passear') aplicar(prox, { 'atributos.felicidade': 2, 'atributos.forma': 1.5, 'atributos.saude': 0.5, desgaste: 3 });
  b.afeto = Math.min(100, b.afeto + (acao === 'carinho' ? 4 : 6));
  const opcoes = RESPOSTA[b.especie][acao];
  const texto = opcoes[(prox.historico.length + hash(b.nome)) % opcoes.length]!.replace(/\{n\}/g, b.nome);
  const r = resumo(diferenca(antes, foto(prox)));
  prox.historico.push({ quando: quandoAgora(prox), texto: [texto, r].filter(Boolean).join(' '), fato: { tipo: 'acao', id: `bicho_${acao}` } });
  return { vida: prox, ok: true };
}
