import { useEffect, useRef, useState } from 'preact/hooks';
import { acaoPorId, horasAgenda, horasSemana, type OpcoesAcao } from '../../motor/acoes';
import { biografia } from '../../motor/biografia';
import { horasObrigacoes, textoEstudo, tituloEmprego } from '../../motor/carreira';
import { voltarPeriodo } from '../../motor/deus';
import { reais } from '../../motor/efeitos';
import { filhosQuePodemContinuar } from '../../motor/familia';
import type { Atributo, EntradaHistorico, Vida } from '../../motor/tipos';
import { nomeCompleto, quandoAgora, textoIdade } from '../../motor/vida';
import { NOME_ATRIBUTO } from '../textos';
import { FolhaAtividades } from './FolhaAtividades';

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
  onHabito: (id: string, porSemana: number) => void;
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
  const [verAtributos, setVerAtributos] = useState(false);
  const [habitoAberto, setHabitoAberto] = useState<string | null>(null);
  const [folha, setFolha] = useState(false);
  const [verTudo, setVerTudo] = useState(false);
  const fim = useRef<HTMLDivElement>(null);

  // O feed desce sozinho até o fato mais recente.
  useEffect(() => {
    fim.current?.scrollIntoView({ block: 'end' });
  }, [vida.historico.length, !!vida.pendente, !!vida.morte]);

  const emp = p.trabalho.emprego;
  const status = [
    textoEstudo(vida),
    emp ? `${tituloEmprego(vida, emp)} · ${reais(emp.salario)}/mês` : null,
    p.trabalho.aposentadoria > 0 ? `Aposentad${p.sexo === 'feminino' ? 'a' : 'o'} · ${reais(p.trabalho.aposentadoria)}/mês` : null,
  ].filter(Boolean).join(' · ');
  const desgaste = Math.round(p.desgaste);
  const horas = horasAgenda(vida);
  const rotina = rotuloRotina(horas);
  const grupos = agruparPorPeriodo(vida.historico);
  const mostrados = verTudo ? grupos : grupos.slice(-GRUPOS_VISIVEIS);
  const atributos = deus ? [...VISIVEIS, 'sorte' as Atributo] : VISIVEIS;
  const iniciais = `${p.nome[0] ?? ''}${p.sobrenome[0] ?? ''}`;

  return (
    <>
      <header class="topo">
        <div class={morte ? 'retrato falecido' : 'retrato'} aria-hidden="true">{iniciais}</div>
        <div>
          <h1>{nomeCompleto(vida)}</h1>
          <p class="sutil">
            {morte ? `† ${textoIdade(morte.idadeMeses)} · ${morte.ano}` : `${textoIdade(vida.relogio.idadeMeses)} · ${quandoAgora(vida)}`}
            {' · '}<span class={p.dinheiro < 0 ? 'desce' : ''}>{reais(p.dinheiro)}</span>
          </p>
          {status && !morte && <p class="sutil status">{status}</p>}
        </div>
        <button
          class={deus ? 'botao-deus ativo' : 'botao-deus'}
          aria-pressed={deus}
          title={deus ? 'Sair do Modo Deus' : 'Modo Deus: editar os números'}
          onClick={() => { onDeus(); setVerAtributos(true); }}
        >✎</button>
      </header>

      <button class="faixa-atributos" aria-expanded={verAtributos || deus} onClick={() => setVerAtributos(!verAtributos)}>
        {VISIVEIS.map((a) => {
          const v = Math.round(p.atributos[a]);
          const antes = Math.round(vida.atributosAnteriores[a]);
          return (
            <span key={a} class="chip-attr">
              {CURTO[a]} <strong>{v}</strong>
              {v > antes && <span class="sobe"> ↑</span>}{v < antes && <span class="desce"> ↓</span>}
            </span>
          );
        })}
        <span class="chip-attr">Cansaço <strong class={desgaste >= 60 ? 'desce' : ''}>{desgaste}</strong></span>
        <span class="sutil">{verAtributos || deus ? '▴' : '▾'}</span>
      </button>

      {(verAtributos || deus) && (
        <section class="atributos" aria-label="Atributos">
          {atributos.map((a) => {
            const v = Math.round(p.atributos[a]);
            return (
              <div class="atributo" key={a}>
                <div class="atributo-linha">
                  <span>{NOME_ATRIBUTO[a]}</span>
                  {deus ? (
                    <input class="numero-edit" type="number" min={0} max={100} value={v} aria-label={NOME_ATRIBUTO[a]}
                      onChange={(e) => onEditar(a, Number(e.currentTarget.value))} />
                  ) : <span class="numero">{v}</span>}
                </div>
                <div class="barra"><div style={{ width: `${v}%` }} /></div>
              </div>
            );
          })}
          <div class="atributo">
            <div class="atributo-linha">
              <span>Cansaço</span>
              {deus ? (
                <input class="numero-edit" type="number" min={0} max={100} value={desgaste} aria-label="Cansaço"
                  onChange={(e) => onEditar('desgaste', Number(e.currentTarget.value))} />
              ) : <span class={desgaste >= 60 ? 'numero desce' : 'numero'}>{desgaste}</span>}
            </div>
            <div class="barra cansaco"><div class={desgaste >= 60 ? 'alto' : ''} style={{ width: `${desgaste}%` }} /></div>
          </div>
        </section>
      )}

      {!morte && (vida.habitos.length > 0 || horas > 0) && (
        <section class="habitos" aria-label="Rotina e hábitos">
          <div class="chips">
            <span class={`rotina ${rotina.classe}`} title={`Escola e trabalho: ${horasObrigacoes(vida)} h · hábitos: ${horasSemana(vida)} h por semana`}>
              Rotina {rotina.texto}
            </span>
            {vida.habitos.map((h) => (
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

      <section class="feed" aria-label="Sua história" aria-live="polite">
        {!verTudo && grupos.length > GRUPOS_VISIVEIS && (
          <button class="link" onClick={() => setVerTudo(true)}>Mostrar a história anterior</button>
        )}
        {mostrados.map((g, i) => (
          <article class="entrada" key={`${g.quando}-${i}`}>
            <span class="quando">{g.quando}</span>
            {g.textos.map((t, j) => <p key={j} class={t.startsWith('✦') ? 'deus-linha' : ''}>{t}</p>)}
          </article>
        ))}

        {vida.pendente && !morte && (
          <section class="cartao decisao" aria-label="Decisão">
            <p>{vida.pendente.texto}</p>
            <div class="escolhas">
              {vida.pendente.escolhas.map((c, i) => (
                <button key={i} class="secundario" disabled={!!c.motivo} onClick={() => onEscolha(i)}>
                  {c.texto}{c.motivo && <span class="dica"> · {c.motivo}</span>}
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
        <div ref={fim} class="fim-feed" />
      </section>

      {!morte && (
        <div class="dock">
          {aviso && <p class="aviso-acao" role="status">{aviso}</p>}
          <div class="dock-botoes">
            <button class="secundario" onClick={() => setFolha(true)}>Atividades</button>
            <button class="secundario" onClick={onPessoas}>Pessoas</button>
            <button class="primario" onClick={() => onAvancar(false)} disabled={!!vida.pendente}>
              {vida.pendente ? 'Decida acima' : 'Avançar ▶'}
            </button>
            <button class="secundario pular" onClick={() => onAvancar(true)} disabled={!!vida.pendente}
              title="Pular o ano: só para nas decisões" aria-label="Pular o ano">⏭</button>
          </div>
        </div>
      )}

      {folha && !morte && (
        <FolhaAtividades
          vida={vida}
          aviso={aviso}
          onFechar={() => setFolha(false)}
          onAcao={onAcao}
          onHabito={onHabito}
        />
      )}
    </>
  );
}
