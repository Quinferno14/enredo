// Pontos de toque da cena: o que cada coisa desenhada oferece. O desenho diz onde
// está cada móvel (âncora); aqui se decide o nome do ponto e as ações dele. Um
// ponto sem nada para fazer agora não aparece.

import { ancorasDaCena, type Cena } from '../../arte/comodos';
import { acoesDisponiveis, type AcaoDef } from '../../motor/acoes';
import type { Vida } from '../../motor/tipos';
import { acoesDoLugar, lugarPorId, type IdLugar } from '../cena/lugares';

export interface PontoJogo {
  id: string;
  /** Posição no palco (390 × 352). */
  x: number;
  y: number;
  rotulo: string;
  tipo: 'acoes' | 'pessoa' | 'voce';
  acoes: AcaoDef[];
  pessoaId?: string;
}

/** Cada móvel da casa e o que dá para fazer nele. */
const OBJETOS: Record<string, { rotulo: string; acoes: string[] }> = {
  berco: { rotulo: 'Berço', acoes: ['colo', 'descansar'] },
  bola: { rotulo: 'Bola', acoes: ['brincar', 'esporte'] },
  cama: { rotulo: 'Cama', acoes: ['descansar', 'meditar'] },
  escrivaninha: { rotulo: 'Escrivaninha', acoes: ['estudar', 'ler', 'desenhar', 'musica'] },
  computador: { rotulo: 'Computador', acoes: ['estudar', 'estudar_sozinho', 'videogame', 'postar', 'show'] },
  estante: { rotulo: 'Estante', acoes: ['ler', 'estudar_sozinho', 'estudar', 'desenhar', 'musica'] },
  sofa: { rotulo: 'Sofá', acoes: ['colo', 'brincar', 'descansar', 'videogame', 'musica', 'meditar'] },
  fogao: { rotulo: 'Cozinha', acoes: ['comer_bem'] },
};

const ROTULO_PAPEL: Partial<Record<string, string>> = { mae: 'Mãe', pai: 'Pai' };

export function pontosDaCena(vida: Vida, cena: Cena, onde: IdLugar): PontoJogo[] {
  const disp = new Map(acoesDisponiveis(vida).map((a) => [a.id, a]));
  const pegar = (ids: string[]) => ids.map((id) => disp.get(id)).filter((a): a is AcaoDef => !!a);
  const r: PontoJogo[] = [];
  for (const a of ancorasDaCena(cena)) {
    if (a.id === 'eu') {
      r.push({ id: 'eu', x: a.x, y: a.y, rotulo: vida.personagem.nome, tipo: 'voce', acoes: [] });
    } else if (a.id.startsWith('pessoa:')) {
      const pe = vida.pessoas.find((x) => x.id === a.id.slice(7));
      if (pe) r.push({ id: a.id, x: a.x, y: a.y, rotulo: ROTULO_PAPEL[pe.papel] ?? pe.nome, tipo: 'pessoa', acoes: [], pessoaId: pe.id });
    } else if (a.id === 'lugar') {
      const acoes = acoesDoLugar(vida, onde);
      if (acoes.length) r.push({ id: 'lugar', x: a.x, y: a.y, rotulo: lugarPorId(onde).nome(vida), tipo: 'acoes', acoes });
    } else {
      const def = OBJETOS[a.id];
      const acoes = def ? pegar(def.acoes) : [];
      if (def && acoes.length) r.push({ id: a.id, x: a.x, y: a.y, rotulo: def.rotulo, tipo: 'acoes', acoes });
    }
  }
  return r;
}
