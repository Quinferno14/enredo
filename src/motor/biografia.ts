// Biografia curta, montada a partir do que a vida guardou.

import { cursoPorId, estadoDe, textoClasse } from './carreira';
import type { Vida } from './tipos';

const juntar = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} e ${xs.at(-1)}`);
const ano = (v: Vida, idadeMeses: number) => v.relogio.ano - Math.floor((v.relogio.idadeMeses - idadeMeses) / 12);

export function biografia(vida: Vida): string[] {
  const p = vida.personagem;
  const f = p.sexo === 'feminino';
  const o = (m: string, fe: string) => (f ? fe : m);
  const nascimento = ano(vida, 0);
  const paras: string[] = [];

  const abertura = vida.config.inicio === 'adulto' && vida.linhagem.geracao === 1
    ? `${p.nome} ${p.sobrenome} começou esta história aos 18 anos, em ${p.cidade} (${p.estado}).`
    : `${p.nome} ${p.sobrenome} nasceu em ${nascimento}, em ${p.cidade} (${p.estado}), numa família ${textoClasse(p.classe)}.`;
  const linhagem = vida.linhagem.anteriores.length
    ? ` ${o('Filho', 'Filha')} de ${vida.linhagem.anteriores.at(-1)}, ${o('foi o', 'foi a')} ${vida.linhagem.geracao}ª geração da família.`
    : '';
  paras.push(abertura + linhagem);

  // Estudo e trabalho
  const e = p.estudo;
  const estudo = e.formacoes.length
    ? `Formou-se em ${juntar(e.formacoes.map((c) => cursoPorId(c)?.nome ?? c))}.`
    : e.escolaridade === 'medio' ? 'Terminou o ensino médio.'
    : e.escolaridade === 'fundamental' ? 'Estudou até o fim do fundamental.'
    : vida.relogio.idadeMeses >= 18 * 12 ? 'Não chegou a terminar a escola.' : '';
  const cargos = [...new Set(p.trabalho.cargos)];
  const trabalho = cargos.length
    ? ` Trabalhou como ${juntar(cargos.slice(-3))}${cargos.length > 3 ? ', entre outros' : ''}.`
    : vida.relogio.idadeMeses >= 22 * 12 ? ' Nunca teve carteira assinada.' : '';
  const aposentou = p.trabalho.aposentadoria > 0 ? ` Aposentou-se pelo INSS.` : '';
  if (estudo || trabalho) paras.push(`${estudo}${trabalho}${aposentou}`.trim());

  // Amor e família
  const casou = vida.memorias.filter((m) => m.id === 'casamento').map((m) => m.vars?.pessoa ?? '').filter(Boolean);
  const filhos = vida.pessoas.filter((x) => x.papel === 'filho').map((x) => x.nome);
  const amor: string[] = [];
  if (casou.length) amor.push(`Casou com ${juntar(casou)}.`);
  else if (vida.memorias.some((m) => m.id === 'namoro')) amor.push('Teve seus amores, mas não chegou a casar.');
  if (filhos.length) amor.push(`Teve ${filhos.length === 1 ? 'um filho' : `${filhos.length} filhos`}: ${juntar(filhos)}.`);
  if (vida.memorias.some((m) => m.id === 'divorcio')) amor.push('Passou por um divórcio.');
  if (amor.length) paras.push(amor.join(' '));

  // Momentos
  const boas = [...vida.memorias].filter((m) => m.peso > 0).sort((a, b) => b.peso - a.peso).slice(0, 3).map((m) => m.texto);
  const ruins = [...vida.memorias].filter((m) => m.peso < 0).sort((a, b) => a.peso - b.peso).slice(0, 3).map((m) => m.texto);
  if (boas.length) paras.push(`Os momentos mais felizes: quando ${juntar(boas)}.`);
  if (ruins.length) paras.push(`Os mais difíceis: quando ${juntar(ruins)}.`);

  // Fim
  if (vida.morte) {
    const anos = Math.floor(vida.morte.idadeMeses / 12);
    const dinheiro = p.dinheiro >= 0 ? `deixando R$ ${Math.round(p.dinheiro).toLocaleString('pt-BR')}` : 'deixando dívidas';
    paras.push(`Morreu em ${vida.morte.ano}, aos ${anos} anos, ${vida.morte.causa}, ${dinheiro}.`);
  } else {
    paras.push(`Hoje tem ${Math.floor(vida.relogio.idadeMeses / 12)} anos e mora em ${p.cidade}, ${estadoDe(vida).nome}.`);
  }
  return paras;
}
