import { tagRuim } from '../textos';
import { useState } from 'preact/hooks';
import {
  acoesDisponiveis, CATEGORIAS, companhias, custoPara, FREQUENCIAS, previaEfeitos, rendimentoProximo, rotuloEfeito,
  sugereHabito, variantesPossiveis, type AcaoDef, type Categoria, type OpcoesAcao,
} from '../../motor/acoes';
import { reais } from '../../motor/efeitos';
import type { Vida } from '../../motor/tipos';

interface Props {
  vida: Vida;
  aviso: string;
  onFechar: () => void;
  onAcao: (id: string, opcoes: OpcoesAcao) => void;
  onHabito: (id: string, porSemana: number, variante?: string) => void;
}

const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Painel de atividades que ocupa o lugar do feed: o status continua visível em cima
 * e muda na hora. Categorias em blocos, busca, e cada ação mostra o que mexe.
 */
export function PainelAtividades({ vida, aviso, onFechar, onAcao, onHabito }: Props) {
  const lista = acoesDisponiveis(vida);
  const categorias = CATEGORIAS
    .map((c) => ({ ...c, n: lista.filter((a) => a.categoria === c.id).length }))
    .filter((c) => c.n > 0);
  const [categoria, setCategoria] = useState<Categoria | null>(null);
  const [busca, setBusca] = useState('');
  const [aberta, setAberta] = useState<string | null>(null);
  const [variante, setVariante] = useState<Record<string, string>>({});
  const [com, setCom] = useState<Record<string, string>>({});
  const [habito, setHabito] = useState<string | null>(null);

  const q = normalizar(busca.trim());
  const mostradas = q
    ? lista.filter((a) => normalizar(a.nome).includes(q) || a.busca.some((b) => normalizar(b).includes(q)))
    : categoria ? lista.filter((a) => a.categoria === categoria) : [];
  const ultima = vida.historico.at(-1)?.texto ?? '';
  const pessoas = companhias(vida);
  const opcoesDe = (a: AcaoDef): OpcoesAcao => ({
    variante: variante[a.id] ?? vida.ultimas?.[a.id]?.variante,
    com: com[a.id] ?? vida.ultimas?.[a.id]?.com ?? 'turma',
  });

  return (
    <section class="painel" aria-label="Atividades">
      <div class="painel-topo">
        <button class="link" onClick={() => (categoria && !q ? setCategoria(null) : onFechar())}>
          ← {categoria && !q ? 'Categorias' : 'Voltar à história'}
        </button>
      </div>
      <p class={aviso ? 'aviso-acao' : 'folha-ultima'} role="status">{aviso || ultima}</p>
      <input class="busca" type="search" value={busca} onInput={(e) => setBusca(e.currentTarget.value)}
        placeholder="O que você quer fazer?" aria-label="Buscar atividade" />

      {!q && !categoria && (
        <div class="blocos">
          {categorias.map((c) => (
            <button key={c.id} class="bloco" onClick={() => setCategoria(c.id)}>
              <strong>{c.nome}</strong>
              <span class="sutil">{c.n} {c.n === 1 ? 'opção' : 'opções'}</span>
            </button>
          ))}
        </div>
      )}

      <ul class="folha-lista">
        {mostradas.map((a) => {
          const vs = variantesPossiveis(vida, a);
          const vSel = vs.find((v) => v.id === opcoesDe(a).variante) ?? vs[0];
          const custo = custoPara(vida, a, vSel);
          const h = vida.habitos.find((x) => x.acao === a.id);
          const aberto = aberta === a.id;
          const temOpcoes = vs.length > 1 || a.comQuem;
          return (
            <li key={a.id} class={aberto ? 'folha-item aberto' : 'folha-item'}>
              <div class="acao-linha">
                <button class="acao" onClick={() => (temOpcoes && !aberto ? setAberta(a.id) : onAcao(a.id, opcoesDe(a)))}>
                  <span class="acao-nome">{a.nome}</span>
                  <span class="acao-info">
                    <span class="tags">{previaEfeitos(vida, a, vSel).map((t) => <span key={t} class={tagRuim(t) ? 'tag menos' : 'tag'}>{t}</span>)}</span>
                    {' '}{rotuloEfeito(rendimentoProximo(vida, a.id)).replace('efeito: ', 'efeito ')}
                    {h && ` · hábito ${h.porSemana}x`}
                  </span>
                </button>
                {!a.semHabito && (
                  <button class={sugereHabito(vida, a.id) ? 'habito-botao sugerido' : 'habito-botao'} title="Tornar hábito"
                    aria-label={`Tornar hábito: ${a.nome}`} onClick={() => setHabito(habito === a.id ? null : a.id)}>⟳</button>
                )}
              </div>

              {habito === a.id && (
                <div class="frequencias">
                  {FREQUENCIAS.map((f) => (
                    <button key={f} class={h?.porSemana === f ? 'chip ativo' : 'chip'} onClick={() => { onHabito(a.id, f, vSel?.id); setHabito(null); }}>{f}x/sem{vSel && vs.length > 1 ? ` · ${vSel.nome.split(' (')[0]}` : ''}</button>
                  ))}
                  {h && !h.imposto && <button class="chip" onClick={() => { onHabito(a.id, 0); setHabito(null); }}>Parar</button>}
                </div>
              )}

              {aberto && (
                <div class="opcoes">
                  {a.comQuem && (
                    <>
                      <span class="dica">Com quem</span>
                      <div class="chips">
                        <button class={opcoesDe(a).com === 'turma' ? 'chip ativo' : 'chip'} onClick={() => setCom({ ...com, [a.id]: 'turma' })}>A turma</button>
                        {pessoas.map((pe) => (
                          <button key={pe.id} class={opcoesDe(a).com === pe.id ? 'chip ativo' : 'chip'} onClick={() => setCom({ ...com, [a.id]: pe.id })}>{pe.nome}</button>
                        ))}
                      </div>
                    </>
                  )}
                  {vs.length > 1 && (
                    <>
                      <span class="dica">{a.id === 'amigos' ? 'Onde' : 'Como'}</span>
                      <div class="chips">
                        {vs.map((v) => {
                          const c = custoPara(vida, a, v);
                          return (
                            <button key={v.id} class={vSel?.id === v.id ? 'chip ativo' : 'chip'} onClick={() => setVariante({ ...variante, [a.id]: v.id })}>
                              {v.nome}{c > 0 ? ` · ${reais(c)}` : v.custo ? ' · os pais pagam' : v.nome.includes('grátis') || v.nome.includes('R$') ? '' : ' · grátis'}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                  <button class="primario" onClick={() => onAcao(a.id, opcoesDe(a))}>Fazer{custo > 0 ? ` · ${reais(custo)}` : ''}</button>
                </div>
              )}
            </li>
          );
        })}
        {q && mostradas.length === 0 && <li class="dica">Nada com esse nome para a sua idade.</li>}
      </ul>
    </section>
  );
}
