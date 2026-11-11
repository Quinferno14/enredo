import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { acaoPorId, companhias, horasAgenda, horasSemana, previaEfeitos, sugestoes, variantesPossiveis, type OpcoesAcao } from '../../motor/acoes';
import { biografia } from '../../motor/biografia';
import { horasObrigacoes, textoEstudo, tituloEmprego } from '../../motor/carreira';
import { voltarPeriodo } from '../../motor/deus';
import { reais } from '../../motor/efeitos';
import { filhosQuePodemContinuar } from '../../motor/familia';
import type { Atributo, EntradaHistorico, Vida } from '../../motor/tipos';
import { nomeCompleto, quandoAgora, textoIdade } from '../../motor/vida';
import { NOME_ATRIBUTO, tagRuim } from '../textos';
import { PainelAtividades } from './PainelAtividades';
import { FeedFases } from './FeedFases';
import { recontar } from '../../motor/vozes';

const VISIVEIS: Atributo[] = ['saude', 'felicidade', 'inteligencia', 'aparencia', 'forma', 'carisma'];
const CURTO: Record<string, string> = {
  saude: 'Saúde', felicidade: 'Felic.', inteligencia: 'Intel.', aparencia: 'Aparên.', forma: 'Forma', carisma: 'Carisma', sorte: 'Sorte',
};
/** Quantos períodos aparecem antes de "mostrar a história anterior". */
const GRUPOS_VISIVEIS = 25;

interface Props {
  vida: Vida;
  aviso: string;
  onAvancar: (pularAno: boolean) => void;
  onNovaVida: () => void;
  onContinuarComo: (filhoId: string) => void;
  onPessoas: () => void;
  deus: boolean;
  onDeus: () => void;
  onEditar: (a: Atributo | 'desgaste', valor: number) => void;
  onMudar: (v: Vida) => void;
  onAcao: (id: string, opcoes: OpcoesAcao) => void;
  onHabito: (id: string, porSemana: number, variante?: string) => void;
  onSairHabito: (id: string) => void;
  onEscolha: (indice: number) => void;
}

/** Junta as linhas da história por período, do mais antigo para o mais recente. */
function agruparPorPeriodo(historico: EntradaHistorico[]) {
  const grupos: { quando: string; textos: string[] }[] = [];
  for (const h of historico) {
    const ultimo = grupos.at(-1);
    if (ultimo && ultimo.quando === h.quando) ultimo.textos.push(h.texto);
    else grupos.push({ quando: h.quando, textos: [h.texto] });
  }
  return grupos;
}

function rotuloRotina(horas: number) {
  if (horas <= 30) return { texto: 'leve', classe: '' };
  if (horas <= 50) return { texto: 'cheia', classe: '' };
  if (horas <= 60) return { texto: 'puxada', classe: 'amarelo' };
  return { texto: 'pesada demais', classe: 'vermelho' };
}

export function TelaVida(props: Props) {
  const {
    vida, aviso, onAvancar, onNovaVida, onContinuarComo, onPessoas, onAcao, onHabito, onSairHabito, onEscolha,
    deus, onDeus, onEditar, onMudar,
  } = props;
  const p = vida.personagem;
  const morte = vida.morte;
  const herdeiros = filhosQuePodemContinuar(vida);
  const [habitoAberto, setHabitoAberto] = useState<string | null>(null);
  const [painel, setPainel] = useState(false);
  const [verTudo, setVerTudo] = useState(false);
  const feed = useRef<HTMLElement>(null);

  // Só o feed rola, e ele desce sozinho até o fato mais recente.
  useEffect(() => {
    const el = feed.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [vida.historico.length, !!vida.pendente, !!vida.morte]);

  const emp = p.trabalho.emprego;
  const status = [
    textoEstudo(vida),
    emp ? `${tituloEmprego(vida, emp)} · ${reais(emp.salario)}/mês` : null,
    p.trabalho.aposentadoria > 0 ? `Aposentad${p.sexo === 'feminino' ? 'a' : 'o'} · ${reais(p.trabalho.aposentadoria)}/mês` : null,
    p.trabalho.extras.length ? `+${p.trabalho.extras.length} trabalho${p.trabalho.extras.length > 1 ? 's' : ''} extra` : null,
    p.negocio ? `${p.sexo === 'feminino' ? 'Dona' : 'Dono'} d${p.negocio.nome.slice(0, 1) === 'a' ? 'a' : 'o'} ${p.negocio.nome.slice(2)}` : null,
    p.seguidores >= 1000 ? `${p.seguidores.toLocaleString('pt-BR')} seguidores` : null,
    p.fama >= 10 ? `fama ${Math.round(p.fama)}` : null,
  ].filter(Boolean).join(' · ');
  const desgaste = Math.round(p.desgaste);
  const horas = horasAgenda(vida);
  const rotina = rotuloRotina(horas);
  const grupos = agruparPorPeriodo(vida.historico);
  const mostrados = verTudo ? grupos : grupos.slice(-GRUPOS_VISIVEIS);
  const simples = vida.config.feed === 'simples';
  // A história recontada por fase da vida (só refaz quando a história ou as pessoas mudam).
  const blocos = useMemo(() => (simples ? [] : recontar(vida)), [simples, vida.id, vida.historico.length, vida.pessoas.length]);
  const blocosMostrados = verTudo ? blocos : blocos.slice(-GRUPOS_VISIVEIS);
  const atributos = deus ? [...VISIVEIS, 'sorte' as Atributo] : VISIVEIS;
  const iniciais = `${p.nome[0] ?? ''}${p.sobrenome[0] ?? ''}`;

  return (
    <>
      <header class="topo">
        <div class={morte ? 'retrato falecido' : 'retrato'} aria-hidden="true">{iniciais}</div>
        <div>
          <h1>{nomeCompleto(vida)}</h1>
          <p class="sutil">
            {morte ? `† ${textoIdade(morte.idadeMeses)} · ${morte.ano}` : `${textoIdade(vida.relogio.idadeMeses, p.sexo)} · ${quandoAgora(vida)}`}
            {' · '}<span class={p.dinheiro < 0 ? 'desce' : ''}>{reais(p.dinheiro)}</span>
          </p>
          {status && !morte && <p class="sutil status">{status}</p>}
        </div>
        <button
          class={deus ? 'botao-deus ativo' : 'botao-deus'}
          aria-pressed={deus}
          title="Modo Deus"
          aria-label="Abrir o Modo Deus"
          onClick={onDeus}
        >✦</button>
      </header>

      <section class="hud" aria-label="Atributos">
        {[...atributos, 'desgaste' as const].map((a) => {
          const cansaco = a === 'desgaste';
          const v = Math.round(cansaco ? p.desgaste : p.atributos[a]);
          const antes = cansaco ? v : Math.round(vida.atributosAnteriores[a]);
          const nome = cansaco ? 'Cansaço' : CURTO[a];
          return (
            <div class="hud-item" key={a} title={cansaco ? 'Cansaço' : NOME_ATRIBUTO[a]}>
              <div class="hud-linha">
                <span>{nome}</span>
                {deus ? (
                  <input class="numero-edit" type="number" min={0} max={100} value={v} aria-label={nome}
                    onChange={(e) => onEditar(a, Number(e.currentTarget.value))} />
                ) : (
                  <strong class={cansaco && v >= 60 ? 'desce' : ''}>
                    {v}{v > antes && <span class="sobe">↑</span>}{v < antes && <span class="desce">↓</span>}
                  </strong>
                )}
              </div>
              <div class={cansaco ? 'barra cansaco' : 'barra'}><div class={cansaco && v >= 60 ? 'alto' : ''} style={{ width: `${v}%` }} /></div>
            </div>
          );
        })}
      </section>

      {!morte && (vida.habitos.length > 0 || horas > 0) && (
        <section class="habitos" aria-label="Rotina e hábitos">
          <div class="chips">
            <span class={`rotina ${rotina.classe}`} title={`Escola e trabalho: ${horasObrigacoes(vida)} h · hábitos: ${horasSemana(vida)} h por semana`}>
              Rotina {rotina.texto}
            </span>
            {vida.habitos.filter((h) => h.pausado !== 'fim' && (acaoPorId(h.acao)?.idade[1] ?? 200) >= vida.relogio.idadeMeses / 12).map((h) => (
              <button key={h.acao} class={h.pausado ? 'chip pausado' : 'chip'} aria-expanded={habitoAberto === h.acao}
                onClick={() => setHabitoAberto(habitoAberto === h.acao ? null : h.acao)}>
                ⟳ {acaoPorId(h.acao)?.nome ?? h.acao} {h.porSemana}x{h.pausado ? ' (pausado)' : ''}
              </button>
            ))}
          </div>
          {habitoAberto && (() => {
            const h = vida.habitos.find((x) => x.acao === habitoAberto);
            if (!h) return null;
            return (
              <div class="frequencias">
                {h.imposto ? (
                  <>
                    <span class="dica">Imposto pelos pais.</span>
                    <button class="chip" onClick={() => { onSairHabito(h.acao); setHabitoAberto(null); }}>Pedir para sair</button>
                  </>
                ) : (
                  <>
                    {[1, 3, 7].map((f) => (
                      <button key={f} class={h.porSemana === f ? 'chip ativo' : 'chip'} onClick={() => { onHabito(h.acao, f); setHabitoAberto(null); }}>
                        {f}x/sem
                      </button>
                    ))}
                    <button class="chip" onClick={() => { onHabito(h.acao, 0); setHabitoAberto(null); }}>Parar</button>
                  </>
                )}
              </div>
            );
          })()}
        </section>
      )}

      {painel && !morte ? (
        <PainelAtividades vida={vida} aviso={aviso} onFechar={() => setPainel(false)} onAcao={onAcao} onHabito={onHabito} />
      ) : (
        <section class="feed" ref={feed} aria-label="Sua história" aria-live="polite">
          {!verTudo && (simples ? grupos.length : blocos.length) > GRUPOS_VISIVEIS && (
            <button class="link" onClick={() => setVerTudo(true)}>Mostrar a história anterior</button>
          )}
          {simples ? mostrados.map((g, i) => (
            <article class="entrada" key={`${g.quando}-${i}`}>
              <span class="quando">{g.quando}</span>
              {g.textos.map((t, j) => <p key={j} class={t.startsWith('✦') ? 'deus-linha' : ''}>{t}</p>)}
            </article>
          )) : <FeedFases blocos={blocosMostrados} />}

        </section>
      )}

      <div class="fixos">
        {vida.pendente && !morte && (
          <section class="cartao decisao" aria-label="Decisão">
            <p>{vida.pendente.texto}</p>
            <div class="escolhas">
              {vida.pendente.escolhas.map((c, i) => (/^Só (a partir|até)/.test(c.motivo ?? '') ? null :
                <button key={i} class="secundario" disabled={!!c.motivo} onClick={() => onEscolha(i)}>
                  {c.texto}{c.motivo && <span class="dica"> · {c.motivo}</span>}{c.jeitoTexto && <>{' '}<span class={c.jeito === 'contra' ? 'tag menos jeito' : 'tag jeito'}>{c.jeitoTexto}</span></>}
                </button>
              ))}
            </div>
          </section>
        )}

        {morte && (
          <section class="cartao fim" aria-label="Fim da vida">
            <h2>Fim da vida</h2>
            {biografia(vida).map((t, i) => <p key={i}>{t}</p>)}
            {herdeiros.length > 0 ? (
              <>
                <p class="dica">A história pode continuar com {herdeiros.length === 1 ? 'seu filho' : 'um dos seus filhos'}:</p>
                {herdeiros.map((f) => (
                  <button key={f.id} class="primario" onClick={() => onContinuarComo(f.id)}>
                    Continuar como {f.nome} ({Math.floor(f.idadeMeses / 12)} anos)
                  </button>
                ))}
              </>
            ) : <p class="dica">Sem filhos vivos para continuar a história.</p>}
            {vida.config.morte === 'voltar' && vida.anterior && (
              <button class="secundario" onClick={() => onMudar(voltarPeriodo(vida))}>↺ Voltar um período</button>
            )}
            <button class={herdeiros.length ? 'secundario' : 'primario'} onClick={onNovaVida}>Começar outra vida</button>
          </section>
        )}
      </div>

      {!morte && (
        <div class="dock">
          {aviso && !painel && <p class="aviso-acao" role="status">{aviso}</p>}
          <div class="sugestoes" aria-label="Sugestões">
            {sugestoes(vida).map((a) => {
              const ult = vida.ultimas?.[a.id];
              const v = variantesPossiveis(vida, a).find((x) => x.id === ult?.variante) ?? variantesPossiveis(vida, a)[0];
              const pessoa = ult?.com && ult.com !== 'turma' ? companhias(vida).find((x) => x.id === ult.com) : undefined;
              const nome = a.id === 'amigos' && v ? `${v.nome.replace(' · grátis', '')}${pessoa ? ` com ${pessoa.nome}` : ''}` : a.nome;
              return (
                <button key={a.id} class="sugestao" onClick={() => onAcao(a.id, { variante: v?.id, com: ult?.com ?? 'turma' })}>
                  <span class="acao-nome">{nome}</span>
                  <span class="tags">{previaEfeitos(vida, a, v).slice(0, 2).map((t) => <span key={t} class={tagRuim(t) ? 'tag menos' : 'tag'}>{t}</span>)}</span>
                </button>
              );
            })}
            <button class={painel ? 'sugestao mais ativo' : 'sugestao mais'} onClick={() => setPainel(!painel)}>
              <span class="acao-nome">{painel ? 'História' : 'Mais'}</span>
              <span class="tags"><span class="tag">{painel ? '◂' : '▸'}</span></span>
            </button>
          </div>
          <div class="dock-botoes">
            <button class="secundario" onClick={onPessoas}>Pessoas</button>
            <button class="primario" onClick={() => { setPainel(false); onAvancar(false); }} disabled={!!vida.pendente}>
              {vida.pendente ? 'Decida acima' : 'Avançar ▶'}
            </button>
            <button class="secundario pular" onClick={() => { setPainel(false); onAvancar(true); }} disabled={!!vida.pendente}
              title="Pular o ano: só para nas decisões" aria-label="Pular o ano">⏭</button>
          </div>
        </div>
      )}
    </>
  );
}
