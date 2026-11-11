import { useState } from 'preact/hooks';
import type { Inicio, ModoMorte, Sexo, Vida } from '../../motor/tipos';
import { ESTADOS, criarVida, nomeCompleto, rotuloPeriodo, textoIdade } from '../../motor/vida';
import { novaSeed, novoId } from '../textos';

interface Props {
  salvas: Vida[];
  podeCancelar: boolean;
  onCancelar: () => void;
  onCriar: (v: Vida) => void;
  onContinuar: (v: Vida) => void;
}

export function NovaVida({ salvas, podeCancelar, onCancelar, onCriar, onContinuar }: Props) {
  const [nome, setNome] = useState('');
  const [sobrenome, setSobrenome] = useState('');
  const [sexo, setSexo] = useState<Sexo | ''>('');
  const [estado, setEstado] = useState('');
  const [inicio, setInicio] = useState<Inicio>('bebe');
  const [morte, setMorte] = useState<ModoMorte>('permanente');
  const [seed, setSeed] = useState(novaSeed);

  function criar(aleatoria: boolean) {
    const s = aleatoria ? novaSeed() : seed.trim() || novaSeed();
    onCriar(criarVida({
      id: novoId(),
      seed: s,
      ano: new Date().getFullYear(),
      criadaEm: new Date().toISOString(),
      turno: 'dinamico',
      mes: new Date().getMonth() + 1,
      morte: aleatoria ? 'permanente' : morte,
      inicio: aleatoria ? 'bebe' : inicio,
      ...(aleatoria ? {} : {
        nome, sobrenome,
        sexo: sexo || undefined,
        estado: estado || undefined,
      }),
    }));
  }

  return (
    <main class="tela tela-cheia">
      <header class="cabecalho-simples">
        <h1>Enredo</h1>
        {podeCancelar && <button class="link" onClick={onCancelar}>Voltar</button>}
      </header>

      <button class="primario grande" onClick={() => criar(true)}>Nova vida aleatória</button>

      <details class="cartao">
        <summary>Personalizar a vida</summary>
        <div class="form">
          <label>Nome <input value={nome} onInput={(e) => setNome(e.currentTarget.value)} placeholder="sorteado" /></label>
          <label>Sobrenome <input value={sobrenome} onInput={(e) => setSobrenome(e.currentTarget.value)} placeholder="sorteado" /></label>
          <label>Sexo
            <select value={sexo} onChange={(e) => setSexo(e.currentTarget.value as Sexo | '')}>
              <option value="">Sorteado</option>
              <option value="feminino">Feminino</option>
              <option value="masculino">Masculino</option>
            </select>
          </label>
          <label>Estado
            <select value={estado} onChange={(e) => setEstado(e.currentTarget.value)}>
              <option value="">Sorteado</option>
              {ESTADOS.map((e) => <option key={e.sigla} value={e.sigla}>{e.nome}</option>)}
            </select>
          </label>
          <label>Começo
            <select value={inicio} onChange={(e) => setInicio(e.currentTarget.value as Inicio)}>
              <option value="bebe">Nascer bebê</option>
              <option value="adulto">Começar adulto (18 anos)</option>
            </select>
          </label>
          <label>Morte
            <select value={morte} onChange={(e) => setMorte(e.currentTarget.value as ModoMorte)}>
              <option value="permanente">Permanente (segue com o herdeiro)</option>
              <option value="voltar">Pode voltar um período</option>
            </select>
          </label>
          <label>Seed
            <span class="linha">
              <input value={seed} onInput={(e) => setSeed(e.currentTarget.value)} />
              <button class="secundario" type="button" onClick={() => setSeed(novaSeed())}>Sortear</button>
            </span>
          </label>
          <p class="dica">A mesma seed com as mesmas escolhas repete o mesmo começo de vida.</p>
          <button class="primario" onClick={() => criar(false)}>Começar esta vida</button>
        </div>
      </details>

      {salvas.length > 0 && (
        <section>
          <h2>Continuar</h2>
          <ul class="lista">
            {salvas.map((v) => (
              <li key={v.id}>
                <button class="item" onClick={() => onContinuar(v)}>
                  <strong>{nomeCompleto(v)}</strong>
                  <span>{v.morte ? `† ${textoIdade(v.morte.idadeMeses)}` : textoIdade(v.relogio.idadeMeses)} ·{rotuloPeriodo(v.relogio, v.config.turno)} · {v.personagem.cidade} ({v.personagem.estado})</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
