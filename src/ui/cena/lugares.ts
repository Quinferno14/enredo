// Os lugares do jogo: cada ação acontece em algum lugar do mundo. Em casa, tocar
// na cena abre o que dá para fazer ali; pela porta, o mapa da cidade leva aos
// outros lugares. Um lugar só aparece quando há algo para fazer nele (a idade e
// a vida liberam). As ações continuam as mesmas do motor.

import type { Lugar } from '../../arte/comodos';
import { acoesDisponiveis, type AcaoDef } from '../../motor/acoes';
import type { Vida } from '../../motor/tipos';

export type IdLugar = 'casa' | 'escola' | 'trabalho' | 'praca' | 'academia' | 'saude' | 'clinica' | 'banco' | 'imobiliaria';

export interface LugarJogo {
  id: IdLugar;
  nome: (v: Vida) => string;
  /** Qual cenário desenhar. */
  arte: Lugar;
  /** Frase curta de quando você chega. */
  chegada: (v: Vida) => string;
  acoes: string[];
  /** Idade mínima para ir sozinho (antes disso, só se a vida já leva lá, como a escola). */
  idadeMin: number;
}

const estuda = (v: Vida) => v.personagem.estudo.etapa;

export const LUGARES_JOGO: LugarJogo[] = [
  {
    id: 'casa', nome: () => 'Casa', arte: 'quarto', idadeMin: 0,
    chegada: () => 'Em casa.',
    acoes: ['colo', 'brincar', 'descansar', 'estudar', 'estudar_sozinho', 'ler', 'meditar', 'videogame', 'desenhar', 'musica', 'comer_bem', 'postar', 'show', 'procurar_parceiro'],
  },
  {
    id: 'escola', idadeMin: 6, arte: 'escola',
    nome: (v) => (estuda(v) === 'faculdade' ? 'Faculdade' : estuda(v) === 'nenhuma' ? 'Cursos e provas' : 'Escola'),
    chegada: (v) => (estuda(v) === 'faculdade' ? 'No campus.' : estuda(v) === 'nenhuma' ? 'No centro de cursos.' : 'Na escola.'),
    acoes: ['estudar', 'matar_aula', 'prestar_enem', 'largar_estudo', 'supletivo', 'curso', 'autoescola', 'estudar_concurso', 'prestar_concurso', 'alistar'],
  },
  {
    id: 'trabalho', idadeMin: 14, arte: 'escritorio',
    nome: (v) => (v.personagem.trabalho.emprego ? 'Trabalho' : 'Agência de empregos'),
    chegada: (v) => (v.personagem.trabalho.emprego ? 'No trabalho.' : 'Na agência de empregos, com o currículo na mão.'),
    acoes: ['trabalhar_duro', 'pedir_aumento', 'tirar_folga', 'pedir_demissao', 'procurar_emprego', 'aposentar'],
  },
  {
    id: 'praca', idadeMin: 4, arte: 'parque',
    nome: () => 'Praça',
    chegada: () => 'Na praça do bairro.',
    acoes: ['brincar', 'esporte', 'amigos', 'puxar_papo', 'festa', 'bico', 'fumar', 'furtar'],
  },
  {
    id: 'academia', idadeMin: 4, arte: 'academia',
    nome: () => 'Academia e clube',
    chegada: () => 'Na academia.',
    acoes: ['natacao', 'academia', 'esporte'],
  },
  {
    id: 'saude', idadeMin: 0, arte: 'hospital',
    nome: () => 'Posto de saúde',
    chegada: () => 'No posto de saúde. A fila está andando.',
    acoes: ['medico_sus'],
  },
  {
    id: 'clinica', idadeMin: 0, arte: 'clinica',
    nome: () => 'Clínica particular',
    chegada: () => 'Na clínica. Ar-condicionado e café na recepção.',
    acoes: ['medico_particular'],
  },
  {
    id: 'banco', idadeMin: 16, arte: 'banco',
    nome: () => 'Banco e lotérica',
    chegada: () => 'No banco.',
    acoes: ['abrir_negocio', 'cuidar_negocio', 'vender_negocio', 'bet', 'bicho'],
  },
  {
    id: 'imobiliaria', idadeMin: 18, arte: 'imobiliaria',
    nome: () => 'Imobiliária',
    chegada: () => 'Na imobiliária. Fotos de casas na parede.',
    acoes: ['sair_de_casa', 'voltar_pais'],
  },
];

export const lugarPorId = (id: IdLugar) => LUGARES_JOGO.find((l) => l.id === id)!;

/** O que dá para fazer num lugar agora (na ordem do lugar). */
export function acoesDoLugar(vida: Vida, id: IdLugar): AcaoDef[] {
  const disp = new Map(acoesDisponiveis(vida).map((a) => [a.id, a]));
  return lugarPorId(id).acoes.map((x) => disp.get(x)).filter((a): a is AcaoDef => !!a);
}

/** Lugares do mapa: os que têm algo para fazer e que a idade deixa ir. Bebê não sai de casa sozinho. */
export function lugaresDisponiveis(vida: Vida): LugarJogo[] {
  const idade = vida.relogio.idadeMeses / 12;
  if (idade < 3) return [];
  return LUGARES_JOGO.filter((l) => l.id !== 'casa' && idade >= l.idadeMin && acoesDoLugar(vida, l.id).length > 0);
}
