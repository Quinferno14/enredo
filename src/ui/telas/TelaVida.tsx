import { useState } from 'preact/hooks';
import { acaoPorId, horasAgenda } from '../../motor/acoes';
import { textoEstudo, tituloEmprego } from '../../motor/carreira';
import { reais } from '../../motor/efeitos';
import type { Atributo, EntradaHistorico, Vida } from '../../motor/tipos';
import { nomeCompleto, proximoRelogio, rotuloPeriodo, textoIdade } from '../../motor/vida';
import { NOME_ATRIBUTO } from '../textos';
import { PainelAcoes } from './PainelAcoes';
import { filhosQuePodemContinuar } from '../../motor/familia';

// A sorte fica oculta; aparece no Modo Deus (marco 6).
const VISIVEIS: Atributo[] = ['saude', 'felicidade', 'inteligencia', 'aparencia', 'forma', 'carisma'];

interface Props {
  vida: Vida;
  aviso: string;
  onAvancar: () => void;
  onNovaVida: () => void;
  onContinuarComo: (filhoId: string) => void;
  onAcao: (id: string) => void;
  onHabito: (id: string, porSemana: number) => void;
  onSairHabito: (id: string) => void;
  onEscolha: (indice: number) => void;
}

/** Junta as linhas da história por período, do mais recente para o mais antigo. */
function agruparPorPeriodo(historico: EntradaHistorico[]) {
  const grupos: { quando: string; textos: string[] }[] = [];
  for (const h of historico) {
    const ultimo = grupos.at(-1);
    if (ultimo && ultimo.quando === h.quando) ultimo.textos.push(h.texto);
    else grupos.push({ quando: h.quando, textos: [h.texto] });
  }
  return grupos.reverse();
}

export function TelaVida(props: Props) {
  const { vida, aviso, onAvancar, onNovaVida, onContinuarComo, onAcao, onHabito, onSairHabito, onEscolha } = props;
  const herdeiros = filhosQuePodemContinuar(vida);
  const p = vida.personagem;
  const iniciais = `${p.nome[0] ?? ''}${p.sobrenome[0] ?? ''}`;
  const morte = vida.morte;
  const proximo = rotuloPeriodo(proximoRelogio(vida.relogio, vida.config.turno), vida.config.turno);
  const [habitoAberto, setHabitoAberto] = useState<string | null>(null);
  const horas = horasAgenda(vida);
  const emp = p.trabalho.emprego;
  const status = [
    textoEstudo(vida),
    emp ? `${tituloEmprego(vida, emp)} · ${reais(emp.salario)}/mês` : null,
    p.trabalho.aposentadoria > 0 ? `Aposentad${p.sexo === 'feminino' ? 'a' : 'o'} · ${reais(p.trabalho.aposentadoria)}/mês` : null,
  ].filter(Boolean).join(' · ');
  const desgaste = Math.round(p.desgaste);

  return (
    <>
      <header class="topo">
        <div class={morte ? 'retrato falecido' : 'retrato'} aria-hidden="true">{iniciais}</div>
        <div>
          <h1>{nomeCompleto(vida)}</h1>
          <p class="sutil">
            {morte ? `† ${textoIdade(morte.idadeMeses)} · ${morte.ano}` : textoIdade(vida.relogio.idadeMeses)}
            {' · '}{p.cidade}, {p.estado}
            {' · '}<span class={p.dinheiro < 0 ? 'desce' : ''}>{reais(p.dinheiro)}</span>
          </p>
          {status && !morte && <p class="sutil status">{status}</p>}
        </div>
      </header>

      {morte && (
        <section class="cartao fim" aria-label="Fim da vida">
          <h2>Fim da vida</h2>
          <p>
            {p.nome} morreu aos {textoIdade(morte.idadeMeses)}, em {morte.ano}, {morte.causa}.
          </p>
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
          {vida.config.morte === 'voltar' && <p class="dica">Voltar um período chega no marco 6.</p>}
          <button class={herdeiros.length ? 'secundario' : 'primario'} onClick={onNovaVida}>Começar outra vida</button>
        </section>
      )}

      <section class="atributos" aria-label="Atributos">
        {VISIVEIS.map((a) => {
          const v = Math.round(p.atributos[a]);
          const antes = Math.round(vida.atributosAnteriores[a]);
          const seta = v > antes ? '↑' : v < antes ? '↓' : '';
          return (
            <div class="atributo" key={a}>
              <div class="atributo-linha">
                <span>{NOME_ATRIBUTO[a]}</span>
                <span class="numero">
                  {v}
                  {seta && <span class={v > antes ? 'sobe' : 'desce'} aria-label={v > antes ? 'subiu' : 'caiu'}> {seta}</span>}
                </span>
              </div>
              <div class="barra"><div style={{ width: `${v}%` }} /></div>
            </div>
          );
        })}
        <div class="atributo">
          <div class="atributo-linha">
            <span>Cansaço</span>
            <span class={desgaste >= 60 ? 'numero desce' : 'numero'}>{desgaste}</span>
          </div>
          <div class="barra cansaco"><div class={desgaste >= 60 ? 'alto' : ''} style={{ width: `${desgaste}%` }} /></div>
        </div>
      </section>

      {!morte && (vida.habitos.length > 0 || horas > 0) && (
        <section class="habitos" aria-label="Hábitos">
          <div class="chips">
            {vida.habitos.map((h) => {
              const a = acaoPorId(h.acao);
              return (
                <button
                  key={h.acao}
                  class={h.pausado ? 'chip pausado' : 'chip'}
                  aria-expanded={habitoAberto === h.acao}
                  onClick={() => setHabitoAberto(habitoAberto === h.acao ? null : h.acao)}
                >
                  ⟳ {a?.nome ?? h.acao} {h.porSemana}x/sem{h.pausado ? ' (pausado)' : ''}
                </button>
              );
            })}
            {horas > 0 && (
              <span class={horas > 60 ? 'agenda vermelho' : horas > 50 ? 'agenda amarelo' : 'agenda'} title="Escola, trabalho e hábitos">
                Agenda: {horas.toLocaleString('pt-BR')} h/sem
              </span>
            )}
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

      {!morte && (
        <section aria-label="O que fazer">
          <PainelAcoes vida={vida} onAcao={onAcao} onHabito={onHabito} />
          {aviso && <p class="aviso-acao" role="status">{aviso}</p>}
        </section>
      )}

      <section class="feed" aria-label="Sua história">
        {agruparPorPeriodo(vida.historico).map((g, i) => (
          <article class="entrada" key={`${g.quando}-${i}`}>
            <span class="quando">{g.quando}</span>
            {g.textos.map((t, j) => <p key={j}>{t}</p>)}
          </article>
        ))}
      </section>

      {!morte && (
        <div class="rodape-acoes">
          <button class="primario grande" onClick={onAvancar} disabled={!!vida.pendente}>
            {vida.pendente ? 'Decida acima para avançar' : `Avançar para ${proximo}`}
          </button>
        </div>
      )}
    </>
  );
}
