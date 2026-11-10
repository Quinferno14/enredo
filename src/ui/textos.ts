import type { Atributo, Eixo } from '../motor/tipos';

export const NOME_ATRIBUTO: Record<Atributo, string> = {
  saude: 'Saúde',
  felicidade: 'Felicidade',
  inteligencia: 'Inteligência',
  aparencia: 'Aparência',
  forma: 'Forma',
  carisma: 'Carisma',
  sorte: 'Sorte',
};

/** Nome do lado negativo e do lado positivo de cada eixo. */
export const POLOS_EIXO: Record<Eixo, [string, string]> = {
  extroversao: ['Reservado', 'Extrovertido'],
  empatia: ['Frio', 'Empático'],
  disciplina: ['Desleixado', 'Disciplinado'],
  impulsividade: ['Cauteloso', 'Impulsivo'],
  ambicao: ['Acomodado', 'Ambicioso'],
  moralidade: ['Sem escrúpulos', 'Íntegro'],
  estabilidade: ['Instável', 'Estável'],
  curiosidade: ['Conservador', 'Curioso'],
};

export function novoId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function novaSeed(): string {
  let s = '';
  for (let i = 0; i < 8; i++) s += ALFABETO[Math.floor(Math.random() * ALFABETO.length)];
  return `${s.slice(0, 4)}-${s.slice(4)}`;
}

export function baixarArquivo(nome: string, conteudo: string): void {
  const blob = new Blob([conteudo], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
