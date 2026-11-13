import type { ComponentChildren } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import { desenharCena } from '../../arte/comodos';
import { acoesDisponiveis } from '../../motor/acoes';
import { reais } from '../../motor/efeitos';
import { acoesDaPessoa, assuntosCom, capitalizar, papelTexto, type AcaoPessoaDef } from '../../motor/familia';
import { compatCom, nomeAssunto, rotuloCompat } from '../../motor/social';
import type { Pessoa, Vida } from '../../motor/tipos';
import { faseArte, horaDe } from '../cena/cenaDaVida';
import { lugaresDisponiveis, type IdLugar } from '../cena/lugares';
import { NOME_GRUPO, vidaPropria } from './TelaPessoas';

/** Folha que sobe de baixo, por cima da história (toca fora para fechar). */
export function Folha({ titulo, onFechar, children, classe = '' }: { titulo: ComponentChildren; onFechar: () => void; children: ComponentChildren; classe?: string }) {
  return (
    <div class="folha-fundo" onClick={(e) => { if (e.target === e.currentTarget) onFechar(); }}>
      <div class={`folha ${classe}`} role="dialog">
        <div class="folha-topo">
          <h2>{titulo}</h2>
          <button class="link" onClick={onFechar}>Fechar</button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** A pessoa em quem você tocou na cena: quem ela é para você e o que dá para fazer com ela. */
export function FolhaPessoa({ vida, pessoa: p, aviso, onAcao, onFechar }: {
  vida: Vida; pessoa: Pessoa; aviso: string;
  onAcao: (pessoaId: string, acaoId: string, opcao?: string) => void; onFechar: () => void;
}) {
  const [sub, setSub] = useState<AcaoPessoaDef | null>(null);
  const acoes = acoesDaPessoa(vida, p);
  const grupos = [...new Set(acoes.map((a) => a.grupo))];
  const opcoes = sub?.abre === 'assuntos'
    ? assuntosCom(vida, p).map((x) => ({ id: x.id, nome: x.nome, gosta: (p.conhecidos ?? []).includes(x.id) }))
    : sub?.abre === 'atividades'
      ? acoesDisponiveis(vida).filter((a) => a.comQuem).map((a) => ({ id: a.id, nome: a.nome, gosta: false }))
      : [];
  const anos = Math.floor(p.idadeMeses / 12);
  return (
    <Folha titulo={<>{p.nome} <span class="sutil">· {capitalizar(papelTexto(p))}, {anos < 1 ? 'bebê' : `${anos} anos`}</span></>} onFechar={onFechar}>
      <div class="afeto">
        <span class="sutil">Afeto</span>
        <span class="barra"><span style={{ width: `${p.afeto}%` }} class={p.afeto < 30 ? 'baixo' : ''} /></span>
        <span class="numero">{p.afeto}</span>
      </div>
      {vidaPropria(p) && <p class="sutil">{vidaPropria(p)}</p>}
      <p class="sutil">
        {capitalizar(rotuloCompat(compatCom(vida, p)))}.
        {(p.conhecidos ?? []).length ? ` Gosta de falar de ${(p.conhecidos ?? []).map(nomeAssunto).join(' e ')}.` : ''}
      </p>
      {aviso && <p class="aviso-acao" role="status">{aviso}</p>}
      {sub ? (
        <div class="pessoa-acoes">
          <p class="grupo-rotulo">{sub.abre === 'assuntos' ? 'Conversar sobre…' : 'Convidar para…'}</p>
          <div class="chips">
            {opcoes.map((o) => (
              <button key={o.id} class={o.gosta ? 'chip ativo' : 'chip'} onClick={() => { onAcao(p.id, sub.id, o.id); setSub(null); }}>
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
              <button key={a.id} class="chip" onClick={() => (a.abre ? setSub(a) : onAcao(p.id, a.id))}>
                {a.nome}{a.custo ? ` · ${reais(vida.relogio.idadeMeses < 216 && a.id === 'presente' ? 30 : a.custo)}` : ''}
              </button>
            ))}
          </div>
        </div>
      ))}
    </Folha>
  );
}

/** Miniatura do cenário de um lugar (o mesmo desenho da cena, pequeno). */
function Miniatura({ vida, arte }: { vida: Vida; arte: Parameters<typeof desenharCena>[0]['lugar'] }) {
  const fase = faseArte(vida.relogio.idadeMeses / 12);
  const hora = horaDe(vida);
  const svg = useMemo(() => desenharCena({ lugar: arte, fase, hora: hora === 'noite' ? 'tarde' : hora })
    .replace(/viewBox="0 0 (\d+) (\d+)"/, 'viewBox="0 60 $1 260"')
    .replace(/width="\d+" height="\d+"/, 'width="100%" height="100%" preserveAspectRatio="xMidYMid slice"'), [arte, fase, hora]);
  return <span class="mini" aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg }} />;
}

/** O mapa da cidade: os lugares que a idade e a vida liberam, cada um com o seu cenário. */
export function MapaCidade({ vida, onde, onIr, onFechar }: { vida: Vida; onde: IdLugar; onIr: (id: IdLugar) => void; onFechar: () => void }) {
  const lugares = lugaresDisponiveis(vida);
  return (
    <Folha titulo={`${vida.personagem.cidade} · para onde?`} onFechar={onFechar} classe="mapa">
      <div class="mapa-grade">
        {onde !== 'casa' && (
          <button class="lugar-cartao casa" onClick={() => onIr('casa')}>
            <Miniatura vida={vida} arte="sala" />
            <strong>Voltar para casa</strong>
          </button>
        )}
        {lugares.filter((l) => l.id !== onde).map((l) => (
          <button key={l.id} class="lugar-cartao" onClick={() => onIr(l.id)}>
            <Miniatura vida={vida} arte={l.arte} />
            <strong>{l.nome(vida)}</strong>
          </button>
        ))}
      </div>
      {lugares.length === 0 && <p class="dica">Ainda é cedo para sair sozinh{vida.personagem.sexo === 'feminino' ? 'a' : 'o'}.</p>}
    </Folha>
  );
}
