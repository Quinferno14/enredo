import { useState } from 'preact/hooks';
import { EMPREGOS, ESTADOS_DEF } from '../../motor/carreira';
import {
  criarPessoaDeus, definirEmprego, editarAtributo, editarDinheiro, editarEixo, editarHabilidade, editarIdade, editarPessoa,
  forcarEvento, ganchosLegiveis, mudarLugar, pausarIdade, voltarPeriodo,
} from '../../motor/deus';
import { NOME_HABILIDADE, preencher } from '../../motor/efeitos';
import { EVENTOS } from '../../motor/eventos';
import { capitalizar, papelTexto } from '../../motor/familia';
import { ATRIBUTOS, EIXOS, type Vida } from '../../motor/tipos';
import { NOME_ATRIBUTO, POLOS_EIXO } from '../textos';
import { EditorPessoa, FormCriarPessoa } from './TelaPessoas';

type Secao = 'eu' | 'pessoas' | 'mundo' | 'eventos';
const SECOES: { id: Secao; nome: string }[] = [
  { id: 'eu', nome: 'Eu' }, { id: 'pessoas', nome: 'Pessoas' }, { id: 'mundo', nome: 'Mundo' }, { id: 'eventos', nome: 'Eventos' },
];

interface Props {
  vida: Vida;
  onMudar: (v: Vida) => void;
  /** Números editáveis direto nas telas. */
  noLugar: boolean;
  onNoLugar: (ligado: boolean) => void;
  onFechar: () => void;
}

/** O Modo Deus inteiro num lugar só, aberto de qualquer tela pelo botão ✦. */
export function PainelDeus({ vida, onMudar, noLugar, onNoLugar, onFechar }: Props) {
  const [secao, setSecao] = useState<Secao>('eu');
  const vivo = !vida.morte;

  return (
    <div class="painel-deus-fundo" onClick={onFechar}>
      <section class="painel-deus" role="dialog" aria-label="Modo Deus" onClick={(e) => e.stopPropagation()}>
        <header class="painel-deus-topo">
          <h2>✦ Modo Deus</h2>
          <button class="link" onClick={onFechar} aria-label="Fechar">Fechar</button>
        </header>
        <label class="linha-check">
          <input type="checkbox" checked={noLugar} onChange={(e) => onNoLugar(e.currentTarget.checked)} />
          Editar os números direto nas telas
        </label>
        <p class="dica">Toda edição aparece na história com ✦.</p>
        <div class="chips painel-secoes" role="tablist">
          {SECOES.map((s) => (
            <button key={s.id} role="tab" aria-selected={secao === s.id} class={secao === s.id ? 'chip ativo' : 'chip'} onClick={() => setSecao(s.id)}>{s.nome}</button>
          ))}
        </div>
        <div class="painel-deus-corpo">
          {!vivo && secao !== 'eventos' && <p class="dica">Esta vida acabou. Dá para ver, mas não editar.</p>}
          {secao === 'eu' && <SecaoEu vida={vida} onMudar={onMudar} />}
          {secao === 'pessoas' && <SecaoPessoas vida={vida} onMudar={onMudar} />}
          {secao === 'mundo' && <SecaoMundo vida={vida} onMudar={onMudar} />}
          {secao === 'eventos' && <SecaoEventos vida={vida} onMudar={onMudar} />}
        </div>
      </section>
    </div>
  );
}

type SecaoProps = { vida: Vida; onMudar: (v: Vida) => void };

function SecaoEu({ vida, onMudar }: SecaoProps) {
  const p = vida.personagem;
  const vivo = !vida.morte;
  return (
    <>
      <div class="deus-grade">
        {ATRIBUTOS.map((a) => (
          <label key={a}>{NOME_ATRIBUTO[a]}
            <input class="numero-edit" type="number" min={0} max={100} value={Math.round(p.atributos[a])} disabled={!vivo}
              onChange={(e) => onMudar(editarAtributo(vida, a, Number(e.currentTarget.value)))} />
          </label>
        ))}
        <label>Cansaço
          <input class="numero-edit" type="number" min={0} max={100} value={Math.round(p.desgaste)} disabled={!vivo}
            onChange={(e) => onMudar(editarAtributo(vida, 'desgaste', Number(e.currentTarget.value)))} />
        </label>
        <label>Dinheiro
          <input class="numero-edit largo" type="number" value={p.dinheiro} disabled={!vivo}
            onChange={(e) => onMudar(editarDinheiro(vida, Number(e.currentTarget.value)))} />
        </label>
        <label>Idade
          <input class="numero-edit" type="number" min={0} max={150} value={Math.floor(vida.relogio.idadeMeses / 12)} disabled={!vivo}
            onChange={(e) => onMudar(editarIdade(vida, Number(e.currentTarget.value)))} />
        </label>
      </div>

      <h3>Personalidade</h3>
      {EIXOS.map((e) => {
        const [neg, pos] = POLOS_EIXO[e];
        const v = Math.round(p.personalidade[e]);
        return (
          <div class="eixo" key={e}>
            <div class="eixo-polos"><span>{neg}</span><span class="numero">{v}</span><span>{pos}</span></div>
            <input type="range" min={-100} max={100} value={v} class="eixo-edit" aria-label={`${neg} ou ${pos}`} disabled={!vivo}
              onChange={(ev) => onMudar(editarEixo(vida, e, Number(ev.currentTarget.value)))} />
          </div>
        );
      })}

      <h3>Habilidades</h3>
      <div class="deus-grade">
        {Object.entries(NOME_HABILIDADE).map(([id, nome]) => (
          <label key={id}>{nome}
            <input class="numero-edit" type="number" min={0} max={100} value={Math.round(p.habilidades[id] ?? 0)} disabled={!vivo}
              onChange={(e) => onMudar(editarHabilidade(vida, id, Number(e.currentTarget.value)))} />
          </label>
        ))}
      </div>
    </>
  );
}

function SecaoPessoas({ vida, onMudar }: SecaoProps) {
  const [id, setId] = useState(vida.pessoas[0]?.id ?? '');
  const pe = vida.pessoas.find((x) => x.id === id);
  const vivo = !vida.morte;
  return (
    <>
      <label class="deus-form">Pessoa
        <select value={id} onChange={(e) => setId(e.currentTarget.value)}>
          {vida.pessoas.map((x) => (
            <option key={x.id} value={x.id}>{x.nome} · {capitalizar(papelTexto(x))}{x.vivo ? '' : ' (†)'}{x.afastado ? ' (sem contato)' : ''}</option>
          ))}
        </select>
      </label>
      {pe && vivo && <EditorPessoa p={pe} onEditar={(pid, campo, valor) => onMudar(editarPessoa(vida, pid, campo, valor))} />}
      {vivo && (
        <>
          <h3>Criar pessoa</h3>
          <FormCriarPessoa onCriar={(papel, sexo, idade, nome) => {
            const nova = criarPessoaDeus(vida, papel, sexo, idade, nome);
            onMudar(nova);
            const criada = nova.pessoas.at(-1);
            if (criada) setId(criada.id);
          }} />
        </>
      )}
    </>
  );
}

function SecaoMundo({ vida, onMudar }: SecaoProps) {
  const p = vida.personagem;
  const vivo = !vida.morte;
  const estado = ESTADOS_DEF.find((e) => e.sigla === p.estado) ?? ESTADOS_DEF[0]!;
  return (
    <div class="form">
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
        <select value={p.trabalho.emprego?.id ?? ''} disabled={!vivo} onChange={(e) => onMudar(definirEmprego(vida, e.currentTarget.value || null))}>
          <option value="">Nenhum</option>
          {EMPREGOS.map((e) => <option key={e.id} value={e.id}>{preencher(e.titulos[0]!, vida, {})}</option>)}
        </select>
      </label>
      <label class="linha-check">
        <input type="checkbox" checked={p.idadeBiologicaMeses !== undefined} disabled={!vivo}
          onChange={(e) => onMudar(pausarIdade(vida, e.currentTarget.checked))} />
        Pausar o envelhecimento do corpo{p.idadeBiologicaMeses !== undefined ? ` (corpo de ${Math.floor(p.idadeBiologicaMeses / 12)} anos)` : ''}
      </label>
      {vida.config.morte === 'voltar' && (
        <button class="secundario" disabled={!vida.anterior} onClick={() => onMudar(voltarPeriodo(vida))}>
          ↺ Voltar um período{vida.anterior ? '' : ' (só depois de avançar)'}
        </button>
      )}
    </div>
  );
}

function SecaoEventos({ vida, onMudar }: SecaoProps) {
  const [busca, setBusca] = useState('');
  const [aviso, setAviso] = useState('');
  const ganchos = ganchosLegiveis(vida);
  const termo = busca.trim().toLowerCase();
  const lista = EVENTOS
    .filter((e) => !termo || e.id.includes(termo) || e.texto.some((t) => t.toLowerCase().includes(termo)))
    .slice(0, 40);
  return (
    <>
      {!vida.morte && (
        <>
          <input class="busca" type="search" placeholder="Buscar evento (ex.: natal, banda, pipa)" value={busca}
            onInput={(e) => setBusca(e.currentTarget.value)} aria-label="Buscar evento" />
          {aviso && <p class="aviso-pessoas" role="status">{aviso}</p>}
          <ul class="lista eventos-deus">
            {lista.map((e) => (
              <li key={e.id}>
                <span>
                  <strong>{e.id.replaceAll('_', ' ')}</strong>
                  {e.arco && <span class="tag"> arco</span>}
                  <span class="sutil"> {preencher(e.texto[0]!, vida, { pessoa: 'alguém', Papel: 'Alguém', papel: 'alguém', pdo: 'de', pa: 'o', pele: 'ele' }).slice(0, 90)}…</span>
                </span>
                <button class="chip" onClick={() => {
                  const r = forcarEvento(vida, e.id);
                  setAviso(r.aviso ?? 'Feito. Veja na aba Vida.');
                  if (!r.aviso) onMudar(r.vida);
                }}>Forçar</button>
              </li>
            ))}
          </ul>
          {termo && lista.length === 0 && <p class="dica">Nenhum evento com essa palavra.</p>}
        </>
      )}
      <h3>Fios abertos</h3>
      {ganchos.length ? <ul class="memorias">{ganchos.map((g, i) => <li key={i}>{g}</li>)}</ul> : <p class="dica">Nenhum agora.</p>}
    </>
  );
}
