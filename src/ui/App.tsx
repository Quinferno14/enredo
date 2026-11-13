import { useState } from 'preact/hooks';
import type { Vida } from '../motor/tipos';
import { definirHabito, fazerAcao, pedirParaSair } from '../motor/acoes';
import { criarPessoaDeus, editarAtributo, editarEixo, editarPessoa } from '../motor/deus';
import { sairDoEmprego } from '../motor/carreira';
import { escolher } from '../motor/eventos';
import { continuarComoFilho, fazerAcaoPessoa } from '../motor/familia';
import { avancarPeriodo } from '../motor/vida';
import { carregar, salvarVida, type Armazem } from '../save/save';
import { NovaVida } from './telas/NovaVida';
import { TelaEu } from './telas/TelaEu';
import { TelaMais } from './telas/TelaMais';
import { TelaPessoas } from './telas/TelaPessoas';
import { Jogo } from './jogo/Jogo';
import { PainelDeus } from './telas/PainelDeus';
import { novoId } from './textos';
import { faseArte } from './cena/cenaDaVida';

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
  const [painel, setPainel] = useState(false);

  const vida = armazem.vidas.find((v) => v.id === armazem.atual) ?? null;

  /** Ação com uma pessoa (na aba Pessoas ou tocando nela na cena). */
  function acaoPessoa(pid: string, acao: string, opcao?: string) {
    if (!vida) return;
    // Convidar é fazer a atividade com essa pessoa, do jeito de sempre.
    const r = acao === 'convidar' && opcao
      ? fazerAcao(vida, opcao, { com: pid, variante: vida.ultimas?.[opcao]?.variante })
      : fazerAcaoPessoa(vida, pid, acao, opcao);
    if (r.ok) {
      // O resultado aparece ali mesmo, sem precisar trocar de tela.
      setAviso(r.vida.historico.slice(vida.historico.length).map((h) => h.texto).join(' '));
      usarVida(r.vida);
      if (r.vida.pendente && !vida.pendente) setAba('vida');
    } else setAviso(r.aviso ?? '');
  }

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

  // As telas antigas (pessoas, ficha completa, vidas e opções) abrem dentro de uma folha do jogo.
  const antiga = (qual: 'pessoas' | 'eu' | 'mais') => {
    if (qual === 'pessoas') {
      return (
        <TelaPessoas
          vida={vida}
          aviso={aviso}
          deus={deus}
          onEditar={(pid, campo, valor) => { setAviso(''); usarVida(editarPessoa(vida, pid, campo, valor)); }}
          onCriar={(papel, sexo, idade, nome) => { setAviso(''); usarVida(criarPessoaDeus(vida, papel, sexo, idade, nome)); }}
          onAcao={acaoPessoa}
        />
      );
    }
    if (qual === 'eu') {
      return <TelaEu vida={vida} deus={deus} onSairEmprego={(id) => usarVida(sairDoEmprego(vida, id))} onEixo={(e, valor) => usarVida(editarEixo(vida, e, valor))} onInteresse={(i) => usarVida({ ...vida, personagem: { ...vida.personagem, interesse: i } })} />;
    }
    return (
      <TelaMais
        vida={vida}
        salvas={armazem.vidas}
        onNovaVida={() => setCriando(true)}
        onMudar={usarVida}
        onTrocar={usarVida}
        onImportar={usarVida}
      />
    );
  };

  return (
    <>
      <Jogo
        vida={vida}
        deus={deus}
        semSave={semSave}
        onMudar={usarVida}
        onDeus={() => setPainel(true)}
        onNovaVida={() => setCriando(true)}
        antiga={antiga}
      />
      {painel && (
        <PainelDeus vida={vida} onMudar={usarVida} noLugar={deus} onNoLugar={setDeus} onFechar={() => setPainel(false)} />
      )}
    </>
  );
}
