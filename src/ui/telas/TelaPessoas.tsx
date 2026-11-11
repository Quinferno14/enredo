import { useState } from 'preact/hooks';
import { reais } from '../../motor/efeitos';
import { acoesDaPessoa, capitalizar, papelTexto } from '../../motor/familia';
import type { Pessoa, Vida } from '../../motor/tipos';

interface Props {
  vida: Vida;
  aviso: string;
  onAcao: (pessoaId: string, acaoId: string) => void;
}

const GRUPOS: { titulo: string; filtro: (p: Pessoa) => boolean }[] = [
  { titulo: 'Amor', filtro: (p) => p.papel === 'parceiro' },
  { titulo: 'Filhos', filtro: (p) => p.papel === 'filho' },
  { titulo: 'Pais', filtro: (p) => p.papel === 'mae' || p.papel === 'pai' },
  { titulo: 'Irmãos', filtro: (p) => p.papel === 'irmao' },
  { titulo: 'Ex', filtro: (p) => p.papel === 'ex' },
];

function idadeTexto(p: Pessoa) {
  const anos = Math.floor((p.morte?.idadeMeses ?? p.idadeMeses) / 12);
  return anos < 1 ? 'bebê' : `${anos} ${anos === 1 ? 'ano' : 'anos'}`;
}

export function TelaPessoas({ vida, aviso, onAcao }: Props) {
  const [aberta, setAberta] = useState<string | null>(null);

  return (
    <>
      <h1>Pessoas</h1>
      {aviso && <p class="aviso-acao" role="status">{aviso}</p>}
      {GRUPOS.map((g) => {
        const lista = vida.pessoas.filter(g.filtro);
        if (!lista.length) return null;
        return (
          <section class="cartao" key={g.titulo}>
            <h2>{g.titulo}</h2>
            <ul class="lista">
              {lista.map((p) => {
                const acoes = acoesDaPessoa(vida, p);
                const aberto = aberta === p.id;
                return (
                  <li key={p.id} class={p.vivo ? 'pessoa' : 'pessoa falecida'}>
                    <button
                      class="pessoa-topo"
                      aria-expanded={aberto}
                      onClick={() => setAberta(aberto ? null : p.id)}
                      disabled={!p.vivo || acoes.length === 0}
                    >
                      <span class="pessoa-nome">
                        <strong>{p.nome}</strong> · {capitalizar(papelTexto(p))}{p.adotado ? ' (adotad' + (p.sexo === 'feminino' ? 'a)' : 'o)') : ''}
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
                    {aberto && p.vivo && (
                      <div class="chips pessoa-acoes">
                        {acoes.map((a) => (
                          <button key={a.id} class="chip" onClick={() => onAcao(p.id, a.id)}>
                            {a.nome}{a.custo ? ` · ${reais(vida.relogio.idadeMeses < 216 && a.id === 'presente' ? 30 : a.custo)}` : ''}
                          </button>
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      <p class="dica">Toque numa pessoa para ver o que dá para fazer com ela. O resultado aparece também na sua história, na aba Vida.</p>
    </>
  );
}
