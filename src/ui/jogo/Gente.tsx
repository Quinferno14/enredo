// A sua gente: a faixa de rostos (1 toque para qualquer pessoa próxima), a tela
// com todo mundo, a ficha do bicho e o que a ficha de alguém mostra conforme a
// intimidade (público, pessoal, íntimo) e as camadas da relação.

import { useMemo } from 'preact/hooks';
import { DEFS } from '../../arte/estilo';
import { bichoDesenho } from '../../arte/objetos';
import { retratoRosto } from '../../arte/pessoa';
import { acoesDoBicho, idadeBicho, type AcaoBicho, type Bicho } from '../../motor/bichos';
import { importancia } from '../../motor/contexto';
import { aparenciaDaPessoa } from '../../motor/corpo';
import { capitalizar, papelTexto } from '../../motor/familia';
import { magoaRecente } from '../../motor/social';
import type { Pessoa, Vida } from '../../motor/tipos';

const FAMILIA = ['parceiro', 'filho', 'mae', 'pai', 'irmao', 'avo', 'neto', 'tio', 'primo', 'sobrinho'];

/** Rosto redondo de alguém (desenho do próprio jogo). */
export function Rosto({ pe, tamanho = 44 }: { pe: Pessoa; tamanho?: number }) {
  const a = aparenciaDaPessoa(pe);
  const svg = useMemo(() => (a ? retratoRosto({ ...a, corRoupa: '#7a6a58' }, pe.rival || pe.afeto < 25 ? 'bravo' : pe.afeto >= 60 ? 'feliz' : 'neutro') : ''), [pe.id, pe.idadeMeses, pe.afeto, pe.rival]);
  return <span class="j-rosto" style={{ width: `${tamanho}px`, height: `${tamanho}px` }} aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg }} />;
}

/** Rosto do bicho. */
export function RostoBicho({ b, tamanho = 44 }: { b: Bicho; tamanho?: number }) {
  const svg = `<svg viewBox="-30 -52 60 60" width="100%" height="100%">${DEFS}${bichoDesenho(b.especie, b.cor)}</svg>`;
  return <span class="j-rosto bicho" style={{ width: `${tamanho}px`, height: `${tamanho}px` }} aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg }} />;
}

/** Cor do anel: perto, ok, tenso. */
const anel = (pe: Pessoa) => (pe.rival || pe.afeto < 25 ? 'tenso' : pe.afeto >= 65 ? 'perto' : 'ok');
const apelido = (pe: Pessoa) => (pe.papel === 'mae' ? 'Mãe' : pe.papel === 'pai' ? 'Pai' : pe.nome.split(' ')[0]);

/** Quem aparece na faixa: os mais importantes agora, vivos e por perto. */
export function suaGente(vida: Vida, max = 7): Pessoa[] {
  return vida.pessoas.filter((x) => x.vivo && !x.afastado)
    .sort((a, b) => importancia(vida, b) - importancia(vida, a))
    .slice(0, max);
}

export function FaixaGente({ vida, onPessoa, onBicho, onTodos }: { vida: Vida; onPessoa: (id: string) => void; onBicho: (id: string) => void; onTodos: () => void }) {
  // Cabem 7 rostos numa tela de celular: o bicho entra no lugar de uma pessoa e o último é o "Todos".
  const bichos = (vida.bichos ?? []).filter((b) => b.vivo).slice(0, 1);
  const gente = suaGente(vida, 6 - bichos.length);
  if (!gente.length && !bichos.length) return null;
  return (
    <nav class="j-faixa" aria-label="Sua gente">
      {gente.map((pe) => (
        <button key={pe.id} class={`j-pessoa ${anel(pe)}`} onClick={() => onPessoa(pe.id)} aria-label={`${pe.nome}, ${papelTexto(pe)}`}>
          <Rosto pe={pe} /><span>{apelido(pe)}</span>
        </button>
      ))}
      {bichos.map((b) => (
        <button key={b.id} class="j-pessoa perto" onClick={() => onBicho(b.id)} aria-label={`${b.nome}, seu ${b.especie}`}>
          <RostoBicho b={b} /><span>{b.nome}</span>
        </button>
      ))}
      <button class="j-pessoa todos" onClick={onTodos} aria-label="Todas as pessoas da sua vida">
        <span class="j-rosto mais">+{Math.max(0, vida.pessoas.length - gente.length)}</span><span>Todos</span>
      </button>
    </nav>
  );
}

/** Todo mundo, em rostos: família, amigos, quem já se foi. */
export function Todos({ vida, onPessoa, onBicho }: { vida: Vida; onPessoa: (id: string) => void; onBicho: (id: string) => void }) {
  const vivos = vida.pessoas.filter((x) => x.vivo).sort((a, b) => importancia(vida, b) - importancia(vida, a));
  const grupos: [string, Pessoa[]][] = [
    ['Família', vivos.filter((x) => FAMILIA.includes(x.papel) && !x.afastado)],
    ['Amigos e conhecidos', vivos.filter((x) => !FAMILIA.includes(x.papel) && x.papel !== 'ex' && !x.afastado)],
    ['Afastados e ex', vivos.filter((x) => x.afastado || x.papel === 'ex')],
    ['Saudade', vida.pessoas.filter((x) => !x.vivo)],
  ];
  return (
    <>
      {grupos.map(([titulo, lista]) => lista.length > 0 && (
        <div key={titulo}>
          <p class="j-secao">{titulo}</p>
          <div class="j-grade-gente">
            {lista.map((pe) => (
              <button key={pe.id} class={`j-pessoa ${pe.vivo ? anel(pe) : 'saudade'}`} onClick={() => onPessoa(pe.id)}>
                <Rosto pe={pe} tamanho={56} /><span>{apelido(pe)}</span><small>{capitalizar(papelTexto(pe))}</small>
              </button>
            ))}
            {titulo === 'Família' && (vida.bichos ?? []).filter((b) => b.vivo).map((b) => (
              <button key={b.id} class="j-pessoa perto" onClick={() => onBicho(b.id)}>
                <RostoBicho b={b} tamanho={56} /><span>{b.nome}</span><small>{b.especie === 'gato' ? 'Gato' : 'Cachorro'}</small>
              </button>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

/** A ficha do bicho: quem ele é e o que fazer com ele. */
export function FichaBicho({ vida, bicho: b, onAcao }: { vida: Vida; bicho: Bicho; onAcao: (id: string, acao: AcaoBicho) => void }) {
  const anos = Math.floor(idadeBicho(vida, b) / 12);
  return (
    <>
      <div class="j-ficha-topo">
        <RostoBicho b={b} tamanho={96} />
        <div>
          <p class="j-texto-pequeno"><b>{b.especie === 'gato' ? 'Seu gato' : 'Seu cachorro'}</b>, {anos < 1 ? 'filhote' : `${anos} ${anos === 1 ? 'ano' : 'anos'}`}{anos >= 10 ? ', já velhinho' : ''}</p>
          <p class="j-secao">Carinho {b.afeto}</p>
          <div class="j-barra-mini"><span style={{ width: `${b.afeto}%` }} /></div>
        </div>
      </div>
      <div class="j-lista-acoes">
        {acoesDoBicho(vida, b).map((a) => <button key={a.id} class="j-acao-botao" onClick={() => onAcao(b.id, a.id)}>{a.nome}</button>)}
      </div>
    </>
  );
}

// ---------- O que você sabe de alguém e as camadas da relação ----------

/** Carinho, confiança e tensão (0 a 100), a partir do afeto, das lembranças e das mágoas. */
export function camadas(vida: Vida, pe: Pessoa): { carinho: number; confianca: number; tensao: number } {
  const lemb = pe.lembrancas ?? [];
  const bons = lemb.filter((l) => l.peso > 0).reduce((s, l) => s + l.peso, 0);
  const ruins = lemb.filter((l) => l.peso < 0).reduce((s, l) => s - l.peso, 0);
  const confianca = Math.max(0, Math.min(100, Math.round(pe.afeto * 0.6 + bons * 2 - ruins * 3)));
  const magoa = magoaRecente(vida, pe);
  const tensao = Math.max(0, Math.min(100, Math.round((pe.rival ? 70 : 0) + (magoa ? 35 : 0) + Math.max(0, 40 - pe.afeto) + ruins * 2)));
  return { carinho: pe.afeto, confianca, tensao };
}

/** Como a pessoa anda e por quê (o que se vê de fora). */
export function humorDaPessoa(vida: Vida, pe: Pessoa): string | null {
  if (!pe.vivo) return null;
  if (pe.rival) return 'Não vai com a sua cara.';
  if (magoaRecente(vida, pe)) return 'Ainda chateada com você.'.replace('chateada', pe.sexo === 'feminino' ? 'chateada' : 'chateado');
  const o = pe.objetivo;
  if (o && pe.afeto >= 45) {
    const alvo: Record<string, string> = {
      vestibular: `estudando para o vestibular${o.extra ? ` de ${o.extra}` : ''}`, negocio: `animad${pe.sexo === 'feminino' ? 'a' : 'o'} com ${o.extra ?? 'um negócio'}`,
      casa: 'juntando para a casa própria', saude: 'cuidando da saúde', emprego: 'procurando emprego', viagem: `sonhando em ${o.extra ?? 'viajar'}`, concurso: 'estudando para concurso',
    };
    return `Anda ${alvo[o.tipo] ?? 'ocupada'}.`;
  }
  if (pe.afeto >= 75) return 'Gosta muito de você.';
  return null;
}

/** Nível de intimidade: o quanto ela se abre com você. */
export function intimidade(pe: Pessoa): 'publico' | 'pessoal' | 'intimo' {
  if (pe.afeto >= 70 && !pe.rival) return 'intimo';
  if (pe.afeto >= 45 && !pe.rival) return 'pessoal';
  return 'publico';
}
