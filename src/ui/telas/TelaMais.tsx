import { useState } from 'preact/hooks';
import type { Vida } from '../../motor/tipos';
import { nomeCompleto, rotuloPeriodo, textoIdade } from '../../motor/vida';
import { exportarTexto, importarTexto } from '../../save/save';
import { baixarArquivo } from '../textos';

interface Props {
  vida: Vida;
  salvas: Vida[];
  onNovaVida: () => void;
  onMudar: (v: Vida) => void;
  onTrocar: (v: Vida) => void;
  onImportar: (v: Vida) => void;
}

export function TelaMais({ vida, salvas, onNovaVida, onMudar, onTrocar, onImportar }: Props) {
  const [erro, setErro] = useState('');

  function exportar() {
    const nome = `enredo-${vida.personagem.nome}-${vida.config.seed}.json`.toLowerCase();
    baixarArquivo(nome, exportarTexto(vida));
  }

  async function importar(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const arquivo = input.files?.[0];
    input.value = '';
    if (!arquivo) return;
    try {
      onImportar(importarTexto(await arquivo.text()));
      setErro('');
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível importar.');
    }
  }

  const outras = salvas.filter((v) => v.id !== vida.id);

  return (
    <>
      <h1>Mais</h1>

      <section class="cartao">
        <h2>Vida</h2>
        <button class="primario" onClick={onNovaVida}>Nova vida</button>
      </section>

      <section class="cartao">
        <h2>Formato da história</h2>
        <p class="dica">Por fase da vida: o grupo da família conta a infância, depois vem o diário, os posts, as mensagens e os áudios da velhice. Os fatos são os mesmos.</p>
        <div class="chips">
          <button class={vida.config.feed !== 'simples' ? 'chip ativo' : 'chip'} onClick={() => onMudar({ ...vida, config: { ...vida.config, feed: 'fases' } })}>Por fase da vida</button>
          <button class={vida.config.feed === 'simples' ? 'chip ativo' : 'chip'} onClick={() => onMudar({ ...vida, config: { ...vida.config, feed: 'simples' } })}>Simples</button>
        </div>
      </section>

      <section class="cartao">
        <h2>Backup</h2>
        <p class="dica">O jogo salva sozinho no navegador. Exporte um arquivo para guardar fora dele.</p>
        <div class="linha">
          <button class="secundario" onClick={exportar}>Exportar esta vida</button>
          <label class="secundario botao-arquivo">
            Importar arquivo
            <input type="file" accept=".json,application/json" onChange={importar} />
          </label>
        </div>
        {erro && <p class="erro" role="alert">{erro}</p>}
      </section>

      {outras.length > 0 && (
        <section class="cartao">
          <h2>Outras vidas salvas</h2>
          <ul class="lista">
            {outras.map((v) => (
              <li key={v.id}>
                <button class="item" onClick={() => onTrocar(v)}>
                  <strong>{nomeCompleto(v)}</strong>
                  <span>{v.morte ? `† ${textoIdade(v.morte.idadeMeses)}` : textoIdade(v.relogio.idadeMeses)} ·{rotuloPeriodo(v.relogio, v.config.turno)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section class="cartao">
        <h2>✦ Modo Deus</h2>
        <p class="dica">Fica no botão ✦, no canto de cima de qualquer tela: atributos, personalidade, pessoas, lugar, emprego e eventos, num painel só.</p>
      </section>
    </>
  );
}
