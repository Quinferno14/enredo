import { useState } from 'preact/hooks';
import { acoesDisponiveis } from '../../motor/acoes';
import { PAPEIS_DEUS, type CampoPessoa } from '../../motor/deus';
import { reais } from '../../motor/efeitos';
import { acoesDaPessoa, assuntosCom, capitalizar, papelTexto, type AcaoPessoaDef, type GrupoAcaoPessoa } from '../../motor/familia';
import { compatCom, nomeAssunto, rotuloCompat } from '../../motor/social';
import { EIXOS, type Papel, type Pessoa, type Sexo, type Vida } from '../../motor/tipos';
import { POLOS_EIXO } from '../textos';

interface Props {
  vida: Vida;
  aviso: string;
  onAcao: (pessoaId: string, acaoId: string, opcao?: string) => void;
  deus: boolean;
  onEditar: (pessoaId: string, campo: CampoPessoa, valor: number | string) => void;
  onCriar: (papel: Papel, sexo: Sexo, idade: number, nome: string) => void;
}

const GRUPOS: { titulo: string; filtro: (p: Pessoa) => boolean }[] = [
  { titulo: 'Amor', filtro: (p) => p.papel === 'parceiro' },
  { titulo: 'Filhos', filtro: (p) => p.papel === 'filho' },
  { titulo: 'Netos', filtro: (p) => p.papel === 'neto' },
  { titulo: 'Pais', filtro: (p) => p.papel === 'mae' || p.papel === 'pai' },
  { titulo: 'Irmãos', filtro: (p) => p.papel === 'irmao' },
  { titulo: 'Amigos', filtro: (p) => p.papel === 'amigo' },
  { titulo: 'Avós', filtro: (p) => p.papel === 'avo' },
  { titulo: 'Tios, primos e sobrinhos', filtro: (p) => p.papel === 'tio' || p.papel === 'primo' || p.papel === 'sobrinho' },
  { titulo: 'Colegas', filtro: (p) => p.papel === 'colega' },
  { titulo: 'Vizinhos', filtro: (p) => p.papel === 'vizinho' },
  { titulo: 'Ex', filtro: (p) => p.papel === 'ex' },
];

export const NOME_GRUPO: Record<GrupoAcaoPessoa, string> = {
  juntos: 'Juntos', conversa: 'Conversa', amor: 'Amor', conflito: 'Conflito', dinheiro: 'Dinheiro', contato: 'Contato',
};

const NOME_PAPEL_DEUS: Record<string, string> = {
  amigo: 'Amigo(a)', colega: 'Colega', vizinho: 'Vizinho(a)', irmao: 'Irmão(ã)', primo: 'Primo(a)', tio: 'Tio(a)',
  avo: 'Avô(ó)', sobrinho: 'Sobrinho(a)', neto: 'Neto(a)', filho: 'Filho(a)', mae: 'Mãe', pai: 'Pai',
};

function idadeTexto(p: Pessoa) {
  const anos = Math.floor((p.morte?.idadeMeses ?? p.idadeMeses) / 12);
  return anos < 1 ? 'bebê' : `${anos} ${anos === 1 ? 'ano' : 'anos'}`;
}

/** "Professora · casada com Carlos · 2 filhos" */
export function vidaPropria(p: Pessoa): string {
  const a = p.sexo === 'feminino' ? 'a' : 'o';
  return [
    p.ocupacao ? capitalizar(p.ocupacao) : '',
    p.parceiroNome ? `${p.casado ? `casad${a} com` : 'namora'} ${p.parceiroNome}` : '',
    p.filhos ? `${p.filhos} ${p.filhos === 1 ? 'filho' : 'filhos'}` : '',
    p.longe ? 'mora longe' : '',
  ].filter(Boolean).join(' · ');
}

export function TelaPessoas({ vida, aviso, onAcao, deus, onEditar, onCriar }: Props) {
  const [aberta, setAberta] = useState<string | null>(null);
  const [sub, setSub] = useState<{ pessoa: string; acao: AcaoPessoaDef } | null>(null);

  const vivos = vida.pessoas.filter((p) => p.vivo && !p.afastado);
  const afastados = vida.pessoas.filter((p) => p.vivo && p.afastado);
  const mortos = vida.pessoas.filter((p) => !p.vivo);

  const cartao = (p: Pessoa) => {
    const aberto = aberta === p.id;
    const acoes = acoesDaPessoa(vida, p);
    const tags = [
      p.rival ? 'rival' : '',
      vida.personagem.negocio?.socio === p.id ? 'sócio' : '',
      p.moraJunto && p.relacao !== 'casamento' ? 'moram juntos' : '',
      p.adotado ? (p.sexo === 'feminino' ? 'adotada' : 'adotado') : '',
    ].filter(Boolean);
    const grupos = [...new Set(acoes.map((a) => a.grupo))];
    const subAqui = sub?.pessoa === p.id ? sub.acao : null;
    const opcoes = subAqui?.abre === 'assuntos'
      ? assuntosCom(vida, p).map((x) => ({ id: x.id, nome: x.nome, gosta: (p.conhecidos ?? []).includes(x.id) }))
      : subAqui?.abre === 'atividades'
        ? acoesDisponiveis(vida).filter((a) => a.comQuem).map((a) => ({ id: a.id, nome: a.nome, gosta: false }))
        : [];
    const lembrancas = (p.lembrancas ?? []).slice().reverse().reduce<{ texto: string; idadeMeses: number; desculpado?: boolean; vezes: number }[]>((acc, l) => {
      const igual = acc.find((x) => x.texto === l.texto);
      if (igual) igual.vezes++; else acc.push({ ...l, vezes: 1 });
      return acc;
    }, []).slice(0, 3);
    const anoDe = (meses: number) => vida.relogio.ano - Math.floor((vida.relogio.idadeMeses - meses) / 12);

    return (
      <li key={p.id} class={p.vivo ? 'pessoa' : 'pessoa falecida'}>
        <button class="pessoa-topo" aria-expanded={aberto} onClick={() => { setAberta(aberto ? null : p.id); setSub(null); }}>
          <span class="pessoa-nome">
            <strong>{p.nome}</strong> · {capitalizar(papelTexto(p))}
            {tags.map((t) => <span key={t} class={t === 'rival' ? 'tag menos' : 'tag'}> {t}</span>)}
          </span>
          <span class="sutil">
            {p.vivo ? idadeTexto(p) : `† ${idadeTexto(p)} · ${p.morte?.ano ?? ''}`}
            {p.vivo && p.idadeMeses >= 18 * 12 && p.papel === 'parceiro' && ` · renda ${reais(p.renda)}/mês`}
          </span>
          {p.vivo && (
            <span class="afeto">
              <span class="sutil">Afeto</span>
              <span class="barra"><span style={{ width: `${p.afeto}%` }} class={p.afeto < 30 ? 'baixo' : ''} /></span>
              <span class="numero">{p.afeto}</span>
            </span>
          )}
        </button>

        {aberto && (
          <div class="pessoa-det">
            {p.vivo && vidaPropria(p) && <p class="sutil">{vidaPropria(p)}</p>}
            {p.vivo && (
              <p class="sutil">
                {capitalizar(rotuloCompat(compatCom(vida, p)))}.
                {' '}{(p.conhecidos ?? []).length
                  ? `Gosta de falar de ${(p.conhecidos ?? []).map(nomeAssunto).join(' e ')}.`
                  : 'Converse sobre vários assuntos para descobrir do que gosta.'}
              </p>
            )}
            {lembrancas.length > 0 && (
              <p class="sutil">Lembra: {lembrancas.map((l) => `${l.texto}${l.vezes > 1 ? ` (${l.vezes} vezes)` : ''} (${anoDe(l.idadeMeses)})${l.desculpado ? ', já perdoou' : ''}`).join('; ')}.</p>
            )}

            {subAqui ? (
              <div class="pessoa-acoes">
                <p class="grupo-rotulo">{subAqui.abre === 'assuntos' ? 'Conversar sobre…' : 'Convidar para…'}</p>
                <div class="chips">
                  {opcoes.map((o) => (
                    <button key={o.id} class={o.gosta ? 'chip ativo' : 'chip'} onClick={() => { onAcao(p.id, subAqui.id, o.id); setSub(null); }}>
                      {o.nome}{o.gosta ? ' ♥' : ''}
                    </button>
                  ))}
                  <button class="chip pausado" onClick={() => setSub(null)}>Voltar</button>
                </div>
              </div>
            ) : grupos.map((g) => (
              <div class="pessoa-acoes" key={g}>
                <p class="grupo-rotulo">{NOME_GRUPO[g]}</p>
                <div class="chips">
                  {acoes.filter((a) => a.grupo === g).map((a) => (
                    <button key={a.id} class="chip" onClick={() => (a.abre ? setSub({ pessoa: p.id, acao: a }) : onAcao(p.id, a.id))}>
                      {a.nome}{a.custo ? ` · ${reais(vida.relogio.idadeMeses < 216 && a.id === 'presente' ? 30 : a.custo)}` : ''}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {deus && <EditorPessoa p={p} onEditar={onEditar} />}
          </div>
        )}
      </li>
    );
  };

  return (
    <>
      <h1>Pessoas</h1>
      {aviso && <p class="aviso-pessoas" role="status">{aviso}</p>}

      {deus && (
        <section class="cartao deus">
          <h2>✦ Criar pessoa</h2>
          <FormCriarPessoa onCriar={onCriar} />
        </section>
      )}

      {GRUPOS.map((g) => {
        const lista = vivos.filter(g.filtro).sort((a, b) => b.afeto - a.afeto);
        if (!lista.length) return null;
        // Colegas e vizinhos são muitos e pesam pouco: ficam recolhidos.
        if (g.titulo === 'Colegas' || g.titulo === 'Vizinhos') {
          return (
            <details class="cartao" key={g.titulo}>
              <summary>{g.titulo} <span class="sutil">{lista.length}</span></summary>
              <ul class="lista">{lista.map(cartao)}</ul>
            </details>
          );
        }
        return (
          <section class="cartao" key={g.titulo}>
            <h2>{g.titulo} <span class="sutil">{lista.length}</span></h2>
            <ul class="lista">{lista.map(cartao)}</ul>
          </section>
        );
      })}

      {afastados.length > 0 && (
        <details class="cartao">
          <summary>Perderam o contato <span class="sutil">{afastados.length}</span></summary>
          <ul class="lista">{afastados.map(cartao)}</ul>
        </details>
      )}
      {mortos.length > 0 && (
        <details class="cartao">
          <summary>Quem já se foi <span class="sutil">{mortos.length}</span></summary>
          <ul class="lista">{mortos.map(cartao)}</ul>
        </details>
      )}
      <p class="dica">Toque numa pessoa para ver o que dá para fazer com ela. Quem convive com você (escola, trabalho) se aproxima sozinho; os outros esfriam sem contato.</p>
    </>
  );
}

export function EditorPessoa({ p, onEditar }: { p: Pessoa; onEditar: Props['onEditar'] }) {
  return (
    <div class="deus-pessoa">
      <p class="grupo-rotulo">✦ Modo Deus</p>
      <div class="deus-form">
        <label>Nome <input value={p.nome} onChange={(e) => onEditar(p.id, 'nome', e.currentTarget.value)} /></label>
        {p.vivo && (
          <>
            <label>Idade <input class="numero-edit" type="number" min={0} max={130} value={Math.floor(p.idadeMeses / 12)} onChange={(e) => onEditar(p.id, 'idade', Number(e.currentTarget.value))} /></label>
            <label>Afeto <input class="numero-edit" type="number" min={0} max={100} value={p.afeto} onChange={(e) => onEditar(p.id, 'afeto', Number(e.currentTarget.value))} /></label>
            <label>Saúde <input class="numero-edit" type="number" min={0} max={100} value={p.saude} onChange={(e) => onEditar(p.id, 'saude', Number(e.currentTarget.value))} /></label>
            {p.papel !== 'parceiro' && p.papel !== 'ex' && (
              <label>Vínculo
                <select value={p.papel} onChange={(e) => onEditar(p.id, 'papel', e.currentTarget.value)}>
                  {PAPEIS_DEUS.map((x) => <option key={x} value={x}>{NOME_PAPEL_DEUS[x]}</option>)}
                </select>
              </label>
            )}
            <label class="linha-check"><input type="checkbox" checked={!!p.rival} onChange={(e) => onEditar(p.id, 'rival', e.currentTarget.checked ? 1 : 0)} /> Rival</label>
          </>
        )}
        <button class="secundario" onClick={() => onEditar(p.id, 'vivo', p.vivo ? 0 : 1)}>{p.vivo ? 'Matar' : 'Reviver'}</button>
      </div>
      {p.vivo && EIXOS.map((e) => {
        const [neg, pos] = POLOS_EIXO[e];
        return (
          <div class="eixo" key={e}>
            <div class="eixo-polos"><span>{neg}</span><span class="numero">{Math.round(p.personalidade[e])}</span><span>{pos}</span></div>
            <input type="range" min={-100} max={100} value={Math.round(p.personalidade[e])} class="eixo-edit" aria-label={`${neg} ou ${pos}`}
              onChange={(ev) => onEditar(p.id, `eixo:${e}`, Number(ev.currentTarget.value))} />
          </div>
        );
      })}
    </div>
  );
}

export function FormCriarPessoa({ onCriar }: { onCriar: Props['onCriar'] }) {
  const [nova, setNova] = useState<{ papel: Papel; sexo: Sexo; idade: number; nome: string }>({ papel: 'amigo', sexo: 'feminino', idade: 20, nome: '' });
  return (
    <div class="deus-form">
      <label>Nome <input value={nova.nome} placeholder="sorteado" onInput={(e) => setNova({ ...nova, nome: e.currentTarget.value })} /></label>
      <label>Quem é
        <select value={nova.papel} onChange={(e) => setNova({ ...nova, papel: e.currentTarget.value as Papel })}>
          {PAPEIS_DEUS.map((x) => <option key={x} value={x}>{NOME_PAPEL_DEUS[x]}</option>)}
        </select>
      </label>
      <label>Sexo
        <select value={nova.sexo} onChange={(e) => setNova({ ...nova, sexo: e.currentTarget.value as Sexo })}>
          <option value="feminino">Feminino</option>
          <option value="masculino">Masculino</option>
        </select>
      </label>
      <label>Idade <input class="numero-edit" type="number" min={0} max={120} value={nova.idade} onInput={(e) => setNova({ ...nova, idade: Number(e.currentTarget.value) })} /></label>
      <button class="secundario" onClick={() => { onCriar(nova.papel, nova.sexo, nova.idade, nova.nome); setNova({ ...nova, nome: '' }); }}>Criar</button>
    </div>
  );
}
