import { useState } from 'preact/hooks';
import { EMPREGOS, ESTADOS_DEF } from '../../motor/carreira';
import {
  definirEmprego, editarDinheiro, editarIdade, forcarEvento, ganchosLegiveis, mudarLugar, pausarIdade, voltarPeriodo,
} from '../../motor/deus';
import { preencher } from '../../motor/efeitos';
import { EVENTOS } from '../../motor/eventos';
import type { Vida } from '../../motor/tipos';

interface Props {
  vida: Vida;
  onMudar: (v: Vida) => void;
}

/** Cartão do Modo Deus na aba Mais: o que não dá para editar no lugar. */
export function CartaoDeus({ vida, onMudar }: Props) {
  const p = vida.personagem;
  const [evento, setEvento] = useState(EVENTOS[0]?.id ?? '');
  const [aviso, setAviso] = useState('');
  const estado = ESTADOS_DEF.find((e) => e.sigla === p.estado) ?? ESTADOS_DEF[0]!;
  const ganchos = ganchosLegiveis(vida);
  const vivo = !vida.morte;

  return (
    <section class="cartao deus">
      <h2>✦ Modo Deus</h2>
      <p class="dica">Os números da tela Vida, da aba Eu e das pessoas ficam editáveis com o botão ✎. Aqui fica o resto. Toda edição aparece na história com ✦.</p>

      <div class="form">
        <label>Dinheiro (R$)
          <input type="number" value={p.dinheiro} disabled={!vivo}
            onChange={(e) => onMudar(editarDinheiro(vida, Number(e.currentTarget.value)))} />
        </label>
        <label>Idade (anos)
          <input type="number" min={0} max={150} value={Math.floor(vida.relogio.idadeMeses / 12)} disabled={!vivo}
            onChange={(e) => onMudar(editarIdade(vida, Number(e.currentTarget.value)))} />
        </label>
        <label>Estado
          <select value={p.estado} disabled={!vivo}
            onChange={(e) => {
              const est = ESTADOS_DEF.find((x) => x.sigla === e.currentTarget.value)!;
              onMudar(mudarLugar(vida, est.sigla, est.cidades[0]!));
            }}>
            {ESTADOS_DEF.map((e) => <option key={e.sigla} value={e.sigla}>{e.nome}</option>)}
          </select>
        </label>
        <label>Cidade
          <select value={p.cidade} disabled={!vivo} onChange={(e) => onMudar(mudarLugar(vida, p.estado, e.currentTarget.value))}>
            {estado.cidades.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label>Emprego
          <select value={p.trabalho.emprego?.id ?? ''} disabled={!vivo}
            onChange={(e) => onMudar(definirEmprego(vida, e.currentTarget.value || null))}>
            <option value="">Nenhum</option>
            {EMPREGOS.map((e) => <option key={e.id} value={e.id}>{preencher(e.titulos[0]!, vida, {})}</option>)}
          </select>
        </label>
        <label class="linha-check">
          <input type="checkbox" checked={p.idadeBiologicaMeses !== undefined} disabled={!vivo}
            onChange={(e) => onMudar(pausarIdade(vida, e.currentTarget.checked))} />
          Pausar o envelhecimento do corpo
        </label>
      </div>

      <dl class="dados">
        <dt>Sorte</dt><dd>{Math.round(p.atributos.sorte)}/100</dd>
        {p.idadeBiologicaMeses !== undefined && <><dt>Corpo de</dt><dd>{Math.floor(p.idadeBiologicaMeses / 12)} anos</dd></>}
        <dt>Ganchos abertos</dt><dd>{ganchos.length ? '' : 'nenhum'}</dd>
      </dl>
      {ganchos.length > 0 && <ul class="memorias">{ganchos.map((g, i) => <li key={i}>{g}</li>)}</ul>}

      {vivo && (
        <div class="form">
          <label>Forçar um evento
            <span class="linha">
              <select value={evento} onChange={(e) => setEvento(e.currentTarget.value)}>
                {EVENTOS.map((e) => <option key={e.id} value={e.id}>{e.id}</option>)}
              </select>
              <button class="secundario" type="button" onClick={() => {
                const r = forcarEvento(vida, evento);
                setAviso(r.aviso ?? 'Feito. Veja na aba Vida.');
                if (!r.aviso) onMudar(r.vida);
              }}>Forçar</button>
            </span>
          </label>
          {aviso && <p class="dica" role="status">{aviso}</p>}
        </div>
      )}

      {vida.config.morte === 'voltar' && (
        <button class="secundario" disabled={!vida.anterior} onClick={() => onMudar(voltarPeriodo(vida))}>
          ↺ Voltar um período{vida.anterior ? '' : ' (só depois de avançar)'}
        </button>
      )}
    </section>
  );
}
