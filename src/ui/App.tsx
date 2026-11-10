import { useState } from 'preact/hooks';
import type { Vida } from '../motor/tipos';
import { avancarPeriodo } from '../motor/vida';
import { carregar, salvarVida, type Armazem } from '../save/save';
import { NovaVida } from './telas/NovaVida';
import { TelaEu } from './telas/TelaEu';
import { TelaMais } from './telas/TelaMais';
import { TelaPessoas } from './telas/TelaPessoas';
import { TelaVida } from './telas/TelaVida';

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
            onAvancar={() => usarVida(avancarPeriodo(vida))}
            onNovaVida={() => setCriando(true)}
          />
        )}
        {aba === 'pessoas' && <TelaPessoas />}
        {aba === 'eu' && <TelaEu vida={vida} />}
        {aba === 'mais' && (
          <TelaMais
            vida={vida}
            salvas={armazem.vidas}
            onNovaVida={() => setCriando(true)}
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
