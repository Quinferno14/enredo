import { useState } from 'preact/hooks';
import type { Vida } from '../motor/tipos';
import { definirHabito, fazerAcao, pedirParaSair } from '../motor/acoes';
import { editarAtributo, editarEixo, editarPessoa } from '../motor/deus';
import { escolher } from '../motor/eventos';
import { continuarComoFilho, fazerAcaoPessoa } from '../motor/familia';
import { avancarPeriodo } from '../motor/vida';
import { carregar, salvarVida, type Armazem } from '../save/save';
import { NovaVida } from './telas/NovaVida';
import { TelaEu } from './telas/TelaEu';
import { TelaMais } from './telas/TelaMais';
import { TelaPessoas } from './telas/TelaPessoas';
import { TelaVida } from './telas/TelaVida';
import { novoId } from './textos';

type Aba = 'vida' | 'pessoas' | 'eu' | 'mais';
const ABAS: { id: Aba; nome: string }[] = [
  { id: 'vida', nome: 'Vida' },
  { id: 'pessoas', nome: 'Pessoas' },
  { id: 'eu', nome: 'Eu' },
  { id: 'mais', nome: 'Mais' },
];

export function App() {
  const [armazem, setArmazem] = useState<Armazem>(() => carregar());
  const [aba, setAba] = useState<Aba>('vida');
  const [criando, setCriando] = useState(false);
  const [semSave, setSemSave] = useState(false);
  const [aviso, setAviso] = useState('');
  const [deus, setDeus] = useState(false);

  const vida = armazem.vidas.find((v) => v.id === armazem.atual) ?? null;

  function usarVida(v: Vida) {
    const { armazem: novo, gravou } = salvarVida(armazem, v);
    setArmazem(novo);
    setSemSave(!gravou);
  }

  if (!vida || criando) {
    return (
      <NovaVida
        salvas={armazem.vidas}
        podeCancelar={!!vida}
        onCancelar={() => setCriando(false)}
        onCriar={(v) => {
          usarVida(v);
          setCriando(false);
          setAba('vida');
        }}
        onContinuar={(v) => {
          usarVida(v);
          setCriando(false);
          setAba('vida');
        }}
      />
    );
  }

  return (
    <div class="app">
      {semSave && (
        <div class="aviso" role="status">
          O navegador não deixou salvar. Exporte um backup em Mais para não perder esta vida.
        </div>
      )}
      <main class="tela">
        {aba === 'vida' && (
          <TelaVida
            vida={vida}
            aviso={aviso}
            onAvancar={(pular) => { setAviso(''); usarVida(avancarPeriodo(vida, pular)); }}
            onPessoas={() => setAba('pessoas')}
            onNovaVida={() => setCriando(true)}
            deus={deus}
            onDeus={() => setDeus(!deus)}
            onEditar={(a, valor) => usarVida(editarAtributo(vida, a, valor))}
            onMudar={usarVida}
            onContinuarComo={(filhoId) => usarVida(continuarComoFilho(vida, filhoId, novoId(), new Date().toISOString()))}
            onAcao={(id, opcoes) => {
              const r = fazerAcao(vida, id, opcoes);
              setAviso(r.aviso ?? '');
              if (r.ok) usarVida(r.vida);
            }}
            onHabito={(id, n) => usarVida(definirHabito(vida, id, n))}
            onSairHabito={(id) => usarVida(pedirParaSair(vida, id))}
            onEscolha={(i) => usarVida(escolher(vida, i))}
          />
        )}
        {aba === 'pessoas' && (
          <TelaPessoas
            vida={vida}
            aviso={aviso}
            deus={deus}
            onEditar={(pid, campo, valor) => usarVida(editarPessoa(vida, pid, campo, valor))}
            onAcao={(pid, acao) => {
              const r = fazerAcaoPessoa(vida, pid, acao);
              setAviso(r.aviso ?? '');
              if (r.ok) {
                usarVida(r.vida);
                if (r.vida.pendente && !vida.pendente) setAba('vida');
              }
            }}
          />
        )}
        {aba === 'eu' && <TelaEu vida={vida} deus={deus} onEixo={(e, valor) => usarVida(editarEixo(vida, e, valor))} onInteresse={(i) => usarVida({ ...vida, personagem: { ...vida.personagem, interesse: i } })} />}
        {aba === 'mais' && (
          <TelaMais
            vida={vida}
            salvas={armazem.vidas}
            onNovaVida={() => setCriando(true)}
            onMudar={usarVida}
            onTrocar={(v) => {
              usarVida(v);
              setAba('vida');
            }}
            onImportar={(v) => {
              usarVida(v);
              setAba('vida');
            }}
          />
        )}
      </main>
      <nav class="abas" aria-label="Abas">
        {ABAS.map((a) => (
          <button
            key={a.id}
            class={aba === a.id ? 'aba ativa' : 'aba'}
            aria-current={aba === a.id ? 'page' : undefined}
            onClick={() => setAba(a.id)}
          >
            {a.nome}
          </button>
        ))}
      </nav>
    </div>
  );
}
