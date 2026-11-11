import { EIXOS, type Eixo, type Vida } from '../../motor/tipos';
import { CURSOS, estadoDe, orcamentoMensal, textoClasse, textoEstudo, tituloEmprego } from '../../motor/carreira';
import { NOME_HABILIDADE, reais } from '../../motor/efeitos';
import { biografia } from '../../motor/biografia';
import { POLOS_EIXO } from '../textos';


const NOME_ESCOLARIDADE = { nenhuma: 'Nenhuma ainda', fundamental: 'Fundamental completo', medio: 'Médio completo', superior: 'Superior completo' };

const NOME_TRACO: Record<string, string[]> = {
  musica: ['Arranha o violão', 'Toca violão bem', 'Músico de verdade'],
  arte: ['Desenha razoavelmente', 'Desenha bem', 'Artista de verdade'],
  esporte: ['Joga razoavelmente', 'Bom de esporte', 'Atleta de verdade'],
  alcool: ['Bebe com frequência', 'Dependente de álcool', 'Alcoolismo grave'],
  cigarro: ['Fumante', 'Fumante pesado', 'Fumante muito pesado'],
  jogo: ['Aposta demais', 'Viciado em apostas', 'Vício grave em apostas'],
  diabetes: ['Diabetes controlada', 'Diabetes sem controle', 'Diabetes grave'],
};

interface Props {
  vida: Vida;
  deus: boolean;
  onInteresse: (i: Vida['personagem']['interesse']) => void;
  onEixo: (e: Eixo, valor: number) => void;
  onSairEmprego: (id: string) => void;
}

export function TelaEu({ vida, deus, onInteresse, onEixo, onSairEmprego }: Props) {
  const c = vida.config;
  return (
    <>
      <h1>Eu</h1>

      <section class="cartao">
        <h2>Personalidade</h2>
        <p class="dica">Muda devagar, conforme o que você vive.</p>
        {EIXOS.map((e) => {
          const v = vida.personagem.personalidade[e];
          const [neg, pos] = POLOS_EIXO[e];
          const largura = Math.abs(v) / 2; // metade da barra = 100
          return (
            <div class="eixo" key={e}>
              <div class="eixo-polos"><span>{neg}</span>{deus && <span class="numero">{Math.round(v)}</span>}<span>{pos}</span></div>
              {deus && (
                <input type="range" min={-100} max={100} value={Math.round(v)} class="eixo-edit" aria-label={`${neg} ou ${pos}`}
                  onChange={(ev) => onEixo(e, Number(ev.currentTarget.value))} />
              )}
              <div class="eixo-barra" aria-label={`${neg} ou ${pos}: ${v}`}>
                <div
                  class="eixo-valor"
                  style={v >= 0 ? { left: '50%', width: `${largura}%` } : { right: '50%', width: `${largura}%` }}
                />
              </div>
            </div>
          );
        })}
      </section>

      {!vida.morte && (
        <section class="cartao">
          <h2>Sua história até aqui</h2>
          {biografia(vida).map((t, i) => <p key={i}>{t}</p>)}
        </section>
      )}

      <section class="cartao">
        <h2>Interesse romântico</h2>
        <div class="chips" role="group" aria-label="Interesse romântico">
          {([['todos', 'Todos'], ['mulheres', 'Mulheres'], ['homens', 'Homens']] as const).map(([v, t]) => (
            <button key={v} class={vida.personagem.interesse === v ? 'chip ativo' : 'chip'} onClick={() => onInteresse(v)}>{t}</button>
          ))}
        </div>
        <p class="dica">Decide quem aparece em "Procurar alguém".</p>
      </section>

      <section class="cartao">
        <h2>Estudo</h2>
        <dl class="dados">
          <dt>Agora</dt><dd>{textoEstudo(vida) ?? 'Não está estudando'}</dd>
          <dt>Escolaridade</dt><dd>{NOME_ESCOLARIDADE[vida.personagem.estudo.escolaridade]}</dd>
          {vida.personagem.estudo.formacoes.length > 0 && (
            <><dt>Formação</dt><dd>{vida.personagem.estudo.formacoes.map((f) => CURSOS.find((c) => c.id === f)?.nome ?? f).join(', ')}</dd></>
          )}
          {vida.personagem.estudo.enem !== undefined && <><dt>Último ENEM</dt><dd>{vida.personagem.estudo.enem} pontos</dd></>}
          {vida.personagem.estudo.reprovacoes > 0 && <><dt>Reprovações</dt><dd>{vida.personagem.estudo.reprovacoes}</dd></>}
        </dl>
      </section>

      <section class="cartao">
        <h2>Trabalho</h2>
        {(() => {
          const t = vida.personagem.trabalho;
          const todos = [...(t.emprego ? [{ e: t.emprego, principal: true }] : []), ...t.extras.map((e) => ({ e, principal: false }))];
          return (
            <>
              {todos.length === 0 && <p class="dica">{t.aposentadoria > 0 ? `Aposentado(a), ${reais(t.aposentadoria)} por mês.` : 'Sem trabalho agora. Procure em Atividades → Trabalho: dá para buscar emprego fixo, meio período, freela ou estágio.'}</p>}
              <ul class="lista">
                {todos.map(({ e, principal }) => (
                  <li key={e.id} class="trabalho-item">
                    <div>
                      <strong>{tituloEmprego(vida, e)}</strong>
                      <span class="sutil"> · {principal ? 'principal' : 'extra'} · {reais(e.salario)}/mês{principal ? ` · desempenho ${e.desempenho}` : ''}</span>
                    </div>
                    {!vida.morte && <button class="chip" onClick={() => onSairEmprego(e.id)}>Sair</button>}
                  </li>
                ))}
              </ul>
              <p class="dica">{Math.floor(t.anosContribuicao)} anos de contribuição ao INSS.</p>
            </>
          );
        })()}
      </section>

      <section class="cartao">
        <h2>Habilidades</h2>
        {Object.keys(vida.personagem.habilidades).filter((k) => vida.personagem.habilidades[k]! >= 1).length === 0
          ? <p class="dica">Nenhuma ainda. Cursos, estudar sozinho e prática (cozinhar, bicos) desenvolvem habilidades que abrem vagas e freelas.</p>
          : Object.entries(vida.personagem.habilidades).filter(([, v]) => v >= 1).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
            <div class="atributo" key={k}>
              <div class="atributo-linha"><span>{NOME_HABILIDADE[k] ?? k}</span><span class="numero">{Math.round(v)}</span></div>
              <div class="barra"><div style={{ width: `${v}%` }} /></div>
            </div>
          ))}
      </section>

      {(vida.personagem.seguidores > 0 || vida.personagem.fama >= 1 || vida.personagem.negocio) && (
        <section class="cartao">
          <h2>Carreira própria</h2>
          <dl class="dados">
            {vida.personagem.seguidores > 0 && <><dt>Seguidores</dt><dd>{vida.personagem.seguidores.toLocaleString('pt-BR')}{vida.personagem.seguidores >= 10000 ? ` · publis: ${reais(vida.personagem.seguidores * 0.008)}/mês` : ' · publis a partir de 10 mil'}</dd></>}
            {vida.personagem.fama >= 1 && <><dt>Fama</dt><dd>{Math.round(vida.personagem.fama)}/100</dd></>}
            {vida.personagem.negocio && (
              <>
                <dt>Negócio</dt><dd>{vida.personagem.negocio.nome.replace(/^(o|a) /, '')}</dd>
                <dt>Saúde dele</dt><dd>{Math.round(vida.personagem.negocio.saude)}/100{vida.personagem.negocio.saude < 40 ? ' · dando prejuízo' : ''}</dd>
                <dt>Faturamento</dt><dd>{reais(vida.personagem.negocio.faturamento)}/mês quando vai bem</dd>
              </>
            )}
          </dl>
        </section>
      )}

      <section class="cartao">
        <h2>Dinheiro</h2>
        {(() => {
          const pe = vida.personagem;
          const o = orcamentoMensal(vida);
          return (
            <dl class="dados">
              <dt>Saldo</dt><dd class={pe.dinheiro < 0 ? 'desce' : ''}>{reais(pe.dinheiro)}{pe.dinheiro < 0 ? ' (cheque especial, 60% ao ano)' : ''}</dd>
              <dt>Renda</dt><dd>{reais(o.renda)}/mês</dd>
              <dt>Gastos fixos</dt><dd>{reais(o.gastos)}/mês</dd>
              <dt>Moradia</dt><dd>{pe.moradia === 'pais' ? 'Com os pais' : `Aluguel em ${pe.cidade} (custo de vida ${reais(estadoDe(vida).custoVida)})`}</dd>
              <dt>Família</dt><dd>{textoClasse(pe.classe).replace(/^de /, '')}</dd>
              {pe.dividas.map((d) => (
                <><dt>{d.nome}</dt><dd>{reais(d.saldo)}{d.parcela > 0 ? ` · ${reais(d.parcela)}/mês` : ' (cobra depois de formado)'}</dd></>
              ))}
            </dl>
          );
        })()}
      </section>

      <section class="cartao">
        <h2>Talentos e condições</h2>
        {vida.personagem.tracos.length === 0
          ? <p class="dica">Nada ainda. Talentos vêm da prática; vícios, do excesso.</p>
          : (
            <ul class="memorias">
              {vida.personagem.tracos.map((t) => (
                <li key={t.id}>{NOME_TRACO[t.id]?.[t.nivel - 1] ?? `${t.id} (nível ${t.nivel})`}</li>
              ))}
            </ul>
          )}
      </section>

      <section class="cartao">
        <h2>Memórias marcantes</h2>
        {vida.memorias.length === 0
          ? <p class="dica">As escolhas que deixam marca aparecem aqui.</p>
          : (
            <ul class="memorias">
              {[...vida.memorias].sort((a, b) => Math.abs(b.peso) - Math.abs(a.peso)).slice(0, 8).map((m, i) => (
                <li key={i}>{m.ano}: {m.texto.charAt(0).toUpperCase() + m.texto.slice(1)}{m.peso > 0 ? ' 🙂' : m.peso < 0 ? ' 😞' : ''}</li>
              ))}
            </ul>
          )}
      </section>

      <section class="cartao">
        <h2>Esta vida</h2>
        <dl class="dados">
          <dt>Seed</dt><dd>{c.seed}</dd>
          <dt>Turno</dt><dd>{c.turno === 'ano' ? '1 ano' : '1 semestre'}</dd>
          <dt>Morte</dt><dd>{c.morte === 'permanente' ? 'Permanente' : 'Pode voltar um período'}</dd>
          <dt>Começo</dt><dd>{c.inicio === 'bebe' ? 'Bebê' : 'Adulto'}</dd>
          <dt>Geração</dt><dd>{vida.linhagem.geracao}ª{vida.linhagem.anteriores.length ? ` · antes: ${vida.linhagem.anteriores.join(', ')}` : ''}</dd>
          <dt>Sorte</dt><dd>{deus ? `${Math.round(vida.personagem.atributos.sorte)}/100` : 'Oculta (ligue o ✎ na tela Vida para ver)'}</dd>
        </dl>
      </section>

    </>
  );
}
