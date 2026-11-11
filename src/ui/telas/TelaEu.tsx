import { EIXOS, type Eixo, type Vida } from '../../motor/tipos';
import { CURSOS, estadoDe, orcamentoMensal, textoClasse, textoEstudo, tituloEmprego } from '../../motor/carreira';
import { reais } from '../../motor/efeitos';
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
}

export function TelaEu({ vida, deus, onInteresse, onEixo }: Props) {
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
        <dl class="dados">
          {vida.personagem.trabalho.emprego ? (
            <>
              <dt>Cargo</dt><dd>{tituloEmprego(vida, vida.personagem.trabalho.emprego)}</dd>
              <dt>Salário</dt><dd>{reais(vida.personagem.trabalho.emprego.salario)}/mês</dd>
              <dt>Desempenho</dt><dd>{vida.personagem.trabalho.emprego.desempenho}/100</dd>
            </>
          ) : <><dt>Agora</dt><dd>{vida.personagem.trabalho.aposentadoria > 0 ? 'Aposentado(a)' : 'Sem emprego'}</dd></>}
          <dt>Contribuição</dt><dd>{Math.floor(vida.personagem.trabalho.anosContribuicao)} anos de INSS</dd>
        </dl>
      </section>

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
          <dt>Sorte</dt><dd>Oculta (visível no Modo Deus, marco 6)</dd>
        </dl>
      </section>

    </>
  );
}
