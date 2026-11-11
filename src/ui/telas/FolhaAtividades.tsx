import { useState } from 'preact/hooks';
import {
  acoesDisponiveis, CATEGORIAS, companhias, custoPara, FREQUENCIAS, rendimentoProximo, rotuloEfeito,
  sugereHabito, variantesPossiveis, type AcaoDef, type Categoria, type OpcoesAcao,
} from '../../motor/acoes';
import { reais } from '../../motor/efeitos';
import type { Vida } from '../../motor/tipos';

interface Props {
  vida: Vida;
  aviso: string;
  onFechar: () => void;
  onAcao: (id: string, opcoes: OpcoesAcao) => void;
  onHabito: (id: string, porSemana: number) => void;
}

const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Folha que sobe por cima da tela Vida: categorias, busca, variantes e companhia. */
export function FolhaAtividades({ vida, aviso, onFechar, onAcao, onHabito }: Props) {
  const lista = acoesDisponiveis(vida);
  const categoriasComAcao = CATEGORIAS.filter((c) => lista.some((a) => a.categoria === c.id));
  const [categoria, setCategoria] = useState<Categoria | 'todas'>('todas');
  const [busca, setBusca] = useState('');
  const [aberta, setAberta] = useState<string | null>(null);
  const [variante, setVariante] = useState<Record<string, string>>({});
  const [com, setCom] = useState<Record<string, string>>({});
  const [habito, setHabito] = useState<string | null>(null);

  const q = normalizar(busca.trim());
  const mostradas = lista.filter((a) => {
    if (q) return normalizar(a.nome).includes(q) || a.busca.some((b) => normalizar(b).includes(q));
    return categoria === 'todas' || a.categoria === categoria;
  });
  const ultima = vida.historico.at(-1)?.texto ?? '';
  const pessoas = companhias(vida);

  function fazer(a: AcaoDef) {
    const temOpcoes = (a.variantes?.length ?? 0) > 1 || a.comQuem;
    if (temOpcoes && aberta !== a.id) { setAberta(a.id); return; }
    onAcao(a.id, { variante: variante[a.id], com: com[a.id] ?? 'turma' });
  }

  return (
    <div class="folha-fundo" onClick={(e) => { if (e.target === e.currentTarget) onFechar(); }}>
      <section class="folha" role="dialog" aria-label="Atividades">
        <div class="folha-topo">
          <strong>Atividades</strong>
          <button class="link" onClick={onFechar} aria-label="Fechar">Fechar</button>
        </div>
        <p class={aviso ? 'aviso-acao' : 'folha-ultima'} role="status">{aviso || ultima}</p>
        <input class="busca" type="search" value={busca} onInput={(e) => setBusca(e.currentTarget.value)}
          placeholder="O que você quer fazer?" aria-label="Buscar atividade" />
        {!q && (
          <div class="chips categorias" role="tablist" aria-label="Categorias">
            <button class={categoria === 'todas' ? 'chip ativo' : 'chip'} onClick={() => setCategoria('todas')}>Todas</button>
            {categoriasComAcao.map((c) => (
              <button key={c.id} class={categoria === c.id ? 'chip ativo' : 'chip'} onClick={() => setCategoria(c.id)}>{c.nome}</button>
            ))}
          </div>
        )}

        <ul class="folha-lista">
          {mostradas.map((a) => {
            const vs = variantesPossiveis(vida, a);
            const vSel = vs.find((v) => v.id === variante[a.id]) ?? vs[0];
            const custo = custoPara(vida, a, vSel);
            const h = vida.habitos.find((x) => x.acao === a.id);
            const aberto = aberta === a.id;
            return (
              <li key={a.id} class={aberto ? 'folha-item aberto' : 'folha-item'}>
                <div class="acao-linha">
                  <button class="acao" onClick={() => fazer(a)}>
                    <span class="acao-nome">{a.nome}</span>
                    <span class="acao-info">
                      {rotuloEfeito(rendimentoProximo(vida, a.id))}
                      {custo > 0 ? ` · ${reais(custo)}` : vs.length > 1 ? ' · tem opção grátis' : ''}
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
                      <button key={f} class={h?.porSemana === f ? 'chip ativo' : 'chip'} onClick={() => { onHabito(a.id, f); setHabito(null); }}>{f}x/sem</button>
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
                          <button class={(com[a.id] ?? 'turma') === 'turma' ? 'chip ativo' : 'chip'} onClick={() => setCom({ ...com, [a.id]: 'turma' })}>A turma</button>
                          {pessoas.map((pe) => (
                            <button key={pe.id} class={com[a.id] === pe.id ? 'chip ativo' : 'chip'} onClick={() => setCom({ ...com, [a.id]: pe.id })}>{pe.nome}</button>
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
                                {v.nome}{c > 0 ? ` · ${reais(c)}` : v.custo ? ' · os pais pagam' : v.nome.includes('grátis') ? '' : ' · grátis'}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                    <button class="primario" onClick={() => onAcao(a.id, { variante: vSel?.id, com: com[a.id] ?? 'turma' })}>
                      Ir{custo > 0 ? ` · ${reais(custo)}` : ''}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
          {mostradas.length === 0 && <li class="dica">Nada com esse nome para a sua idade.</li>}
        </ul>
      </section>
    </div>
  );
}
