import { useState } from 'preact/hooks';
import {
  acoesDisponiveis, custoPara, FREQUENCIAS, rendimentoProximo, rotuloEfeito, sugereHabito, type AcaoDef,
} from '../../motor/acoes';
import { reais } from '../../motor/efeitos';
import type { Vida } from '../../motor/tipos';

interface Props {
  vida: Vida;
  onAcao: (id: string) => void;
  onHabito: (id: string, porSemana: number) => void;
}

const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Sugestões sem busca: as mais usadas nesta vida, completadas pelas da idade. */
function sugestoes(vida: Vida, lista: AcaoDef[]): AcaoDef[] {
  const usadas = [...lista].sort((a, b) => (vida.totais[b.id] ?? 0) - (vida.totais[a.id] ?? 0));
  return usadas.slice(0, 6);
}

export function PainelAcoes({ vida, onAcao, onHabito }: Props) {
  const [busca, setBusca] = useState('');
  const [todas, setTodas] = useState(false);
  const [habitoAberto, setHabitoAberto] = useState<string | null>(null);

  const lista = acoesDisponiveis(vida);
  const q = normalizar(busca.trim());
  const mostradas = q
    ? lista.filter((a) => normalizar(a.nome).includes(q) || a.busca.some((b) => normalizar(b).includes(q)))
    : todas ? lista : sugestoes(vida, lista);

  return (
    <div class="painel-acoes">
      <div class="linha">
        <input
          class="busca"
          type="search"
          value={busca}
          onInput={(e) => setBusca(e.currentTarget.value)}
          placeholder="O que você quer fazer?"
          aria-label="Buscar ação"
        />
        {!q && (
          <button class="link" onClick={() => setTodas(!todas)}>{todas ? 'Menos' : `Todas (${lista.length})`}</button>
        )}
      </div>
      <ul class="acoes" aria-label="Ações">
        {mostradas.map((a) => {
          const custo = custoPara(vida, a);
          const habito = vida.habitos.find((h) => h.acao === a.id);
          const sugere = sugereHabito(vida, a.id);
          return (
            <li key={a.id} class="acao-item">
              <div class="acao-linha">
                <button class="acao" onClick={() => onAcao(a.id)}>
                  <span class="acao-nome">{a.nome}</span>
                  <span class="acao-info">
                    {rotuloEfeito(rendimentoProximo(vida, a.id))}
                    {custo > 0 && ` · ${reais(custo)}`}
                    {habito && ` · hábito ${habito.porSemana}x/sem`}
                  </span>
                </button>
                {!a.semHabito && (
                  <button
                    class={sugere ? 'habito-botao sugerido' : 'habito-botao'}
                    aria-label={`Tornar hábito: ${a.nome}`}
                    aria-expanded={habitoAberto === a.id}
                    title="Tornar hábito"
                    onClick={() => setHabitoAberto(habitoAberto === a.id ? null : a.id)}
                  >⟳</button>
                )}
              </div>
              {sugere && habitoAberto !== a.id && (
                <p class="dica">Você fez isso {vida.periodo[a.id]} vezes. Quer tornar hábito? Toque em ⟳.</p>
              )}
              {habitoAberto === a.id && (
                <div class="frequencias" role="group" aria-label={`Frequência de ${a.nome}`}>
                  {FREQUENCIAS.map((f) => (
                    <button
                      key={f}
                      class={habito?.porSemana === f ? 'chip ativo' : 'chip'}
                      onClick={() => { onHabito(a.id, f); setHabitoAberto(null); }}
                    >{f}x/sem</button>
                  ))}
                  {habito && !habito.imposto && (
                    <button class="chip" onClick={() => { onHabito(a.id, 0); setHabitoAberto(null); }}>Parar</button>
                  )}
                </div>
              )}
            </li>
          );
        })}
        {mostradas.length === 0 && <li class="dica">Nenhuma ação com esse nome para a sua idade.</li>}
      </ul>
    </div>
  );
}
