// A cena da tela Vida, decidida a partir da vida de verdade: o lugar pela fase
// (e pela época), quem está com você, o humor de cada um (pelo Diretor e pelo
// cansaço), a hora e a época do ano. Puro: só lê a vida e devolve a Cena que o
// motor de arte desenha.

import type { Cena, Lugar, PessoaEmCena } from '../../arte/comodos';
import type { FaseArte, Hora } from '../../arte/estilo';
import type { Humor, Roupa } from '../../arte/pessoa';
import { importancia } from '../../motor/contexto';
import { aparenciaDaPessoa, aparenciaDoPersonagem } from '../../motor/corpo';
import { mesDeNascimento } from '../../motor/efeitos';
import type { Pessoa, Vida } from '../../motor/tipos';
import { lugarPorId, type IdLugar } from './lugares';
import { bichosVivos, idadeBicho } from '../../motor/bichos';

const CORES = ['#2f6db5', '#e8553d', '#3aa26b', '#8e44ad', '#f2a93b', '#16a085', '#c0392b', '#5d6d7e', '#d35400', '#7d3c98'];
const corDe = (id: string) => { let h = 7; for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0; return CORES[h % CORES.length]!; };

export function faseArte(idadeAnos: number): FaseArte {
  if (idadeAnos < 3) return 'bebe';
  if (idadeAnos < 12) return 'crianca';
  if (idadeAnos < 18) return 'adolescente';
  if (idadeAnos < 60) return 'adulto';
  return 'idoso';
}

/** A hora vem do calendário (muda quando o tempo anda, não a cada ação). */
export function horaDe(vida: Vida): Hora {
  return (['manha', 'tarde', 'noite'] as const)[((vida.relogio.mes ?? 1) * 7 + vida.relogio.ano) % 3]!;
}

export function epocaDe(vida: Vida): Cena['epoca'] {
  const mes = vida.relogio.mes ?? 1;
  if (mes === mesDeNascimento(vida)) return 'aniversario';
  if (mes === 12) return 'natal';
  if (mes === 6 || mes === 7) return 'junina';
  return undefined;
}

/** O seu rosto agora: o estado do Diretor manda (luto, coração partido), depois o cansaço e a felicidade. */
export function humorDe(vida: Vida): Humor {
  const p = vida.personagem;
  const estado = vida.diretor?.estado;
  if (estado && estado.forca >= 20 && (estado.tipo === 'luto' || estado.tipo === 'coracao-partido')) return 'triste';
  if (p.desgaste >= 70) return 'cansado';
  if (p.atributos.felicidade < 30) return 'triste';
  if (p.atributos.felicidade >= 60) return 'feliz';
  return 'neutro';
}

const humorPessoa = (pe: Pessoa): Humor => (pe.rival || pe.afeto < 25 ? 'bravo' : pe.afeto >= 60 ? 'feliz' : 'neutro');

/**
 * Quem está com você: quem mora junto (por importância). Visita só quando faz
 * sentido: no aniversário e no Natal a família vem; e quem você acabou de ver.
 */
export function presentes(vida: Vida, max = 4): Pessoa[] {
  const p = vida.personagem;
  const idade = vida.relogio.idadeMeses / 12;
  const emCasa = vida.pessoas.filter((x) => x.vivo && !x.afastado && (
    x.moraJunto
    || (p.moradia === 'pais' && (x.papel === 'mae' || x.papel === 'pai' || x.papel === 'irmao') && !x.longe)
    || (x.papel === 'filho' && x.idadeMeses < 18 * 12)
    || (x.papel === 'parceiro' && x.relacao === 'casamento')
  ));
  const lista = emCasa.sort((a, b) => importancia(vida, b) - importancia(vida, a));
  const epoca = epocaDe(vida);
  // Data de família reunida: avós e tios vêm (os mais próximos).
  if ((epoca === 'aniversario' || epoca === 'natal') && lista.length < max) {
    const familia = vida.pessoas
      .filter((x) => x.vivo && !x.afastado && !x.rival && !x.longe && !lista.includes(x) && ['avo', 'tio', 'primo', 'irmao', 'filho', 'neto'].includes(x.papel))
      .sort((a, b) => importancia(vida, b) - importancia(vida, a));
    lista.push(...familia.slice(0, max - lista.length));
  }
  // Quem você acabou de ver (a última coisa da história foi com essa pessoa) está por perto.
  const ultima = vida.historico.at(-1);
  const recente = ultima?.fato?.pessoa ? vida.pessoas.find((x) => x.id === ultima.fato!.pessoa && x.vivo) : undefined;
  if (recente && !lista.includes(recente) && (idade >= 3 || recente.papel === 'avo')) {
    if (lista.length >= max) lista.pop();
    lista.push(recente);
  }
  return lista.slice(0, max);
}

function lugarDe(fase: FaseArte, hora: Hora, epoca: Cena['epoca']): Lugar {
  if (epoca === 'natal' || epoca === 'aniversario') return 'sala';
  // Na infância a festa junina aparece pela janela do quarto (lá estão as coisas da criança).
  if (epoca === 'junina' && fase === 'idoso') return hora === 'noite' ? 'parque' : 'cozinha';
  if (fase === 'adulto' || fase === 'idoso') return hora === 'manha' ? 'cozinha' : 'sala';
  return 'quarto';
}

function roupaDe(idade: number, hora: Hora, mes: number): Roupa {
  const ferias = mes === 1 || mes === 7 || mes === 12;
  if (idade >= 6 && idade < 18 && hora === 'manha' && !ferias) return 'escola';
  if (idade < 12 && hora === 'noite') return 'pijama';
  return 'casa';
}

/** Lugares no palco: você no meio, um pouco à frente; os outros em volta, olhando para você. */
const POSICOES = [{ x: 268, z: 0.4 }, { x: 98, z: 0.46 }, { x: 322, z: 0.6 }, { x: 52, z: 0.64 }];

export function cenaDaVida(vida: Vida): Cena {
  const idade = (vida.personagem.idadeBiologicaMeses ?? vida.relogio.idadeMeses) / 12;
  const fase = faseArte(idade);
  const hora = horaDe(vida);
  const epoca = epocaDe(vida);
  const lugar = lugarDe(fase, hora, epoca);
  const mes = vida.relogio.mes ?? 1;
  const pessoas: PessoaEmCena[] = [];
  const eu = vida.morte ? null : aparenciaDoPersonagem(vida);
  if (eu) pessoas.push({ aparencia: { ...eu, corRoupa: corDe(vida.id) }, x: 178, z: 0.64, humor: humorDe(vida), roupa: roupaDe(idade, hora, mes), alvo: 'eu' });
  presentes(vida).forEach((pe, i) => {
    const a = aparenciaDaPessoa(pe);
    const pos = POSICOES[i]!;
    if (a) pessoas.push({ aparencia: { ...a, corRoupa: corDe(pe.id) }, x: pos.x, z: pos.z, humor: humorPessoa(pe), roupa: roupaDe(pe.idadeMeses / 12, hora, mes), virada: pos.x > 178 ? -1 : 1, alvo: `pessoa:${pe.id}` });
  });
  // O bicho fica no chão, na frente, do lado com mais espaço.
  const bichos = bichosVivos(vida).slice(0, 1).map((b, i) => ({
    especie: b.especie, cor: b.cor, x: i ? 300 : 238, z: 0.86, velho: idadeBicho(vida, b) >= 10 * 12, alvo: `bicho:${b.id}`, virado: true,
  }));
  return { lugar, fase, hora, ...(epoca ? { epoca } : {}), pessoas, ...(bichos.length ? { bichos } : {}) };
}

/** Onde você fica em cada lugar: longe do objeto principal (o ponto dele não cobre o seu rosto). */
const X_NO_LUGAR: Partial<Record<IdLugar, number>> = { escola: 312, trabalho: 290, praca: 292, academia: 130, saude: 305, clinica: 280, banco: 290, imobiliaria: 318 };

/** Roupa de cada lugar (trabalho social, academia de esporte, escola de uniforme). */
const ROUPA_DO_LUGAR: Partial<Record<IdLugar, Roupa>> = { trabalho: 'social', academia: 'esporte', escola: 'escola' };

/** A cena de um lugar fora de casa: o cenário do lugar, com você nele. Em casa, a cena da vida. */
export function cenaNoLugar(vida: Vida, id: IdLugar): Cena {
  if (id === 'casa') return cenaDaVida(vida);
  const idade = (vida.personagem.idadeBiologicaMeses ?? vida.relogio.idadeMeses) / 12;
  const l = lugarPorId(id);
  const hora = horaDe(vida);
  const eu = aparenciaDoPersonagem(vida);
  const roupa = ROUPA_DO_LUGAR[id] === 'escola' && idade >= 18 ? 'casa' : ROUPA_DO_LUGAR[id] ?? 'casa';
  const epoca = epocaDe(vida);
  return {
    lugar: l.arte, fase: faseArte(idade), hora: hora === 'noite' && id !== 'praca' ? 'tarde' : hora,
    ...(epoca === 'junina' && id === 'praca' ? { epoca } : {}),
    pessoas: eu ? [{ aparencia: { ...eu, corRoupa: corDe(vida.id) }, x: X_NO_LUGAR[id] ?? 196, z: 0.68, humor: humorDe(vida), roupa, alvo: 'eu' }] : [],
  };
}
