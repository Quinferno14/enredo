import { EIXOS, type Vida } from '../../motor/tipos';
import { POLOS_EIXO } from '../textos';

const NOME_TRACO: Record<string, string[]> = {
  musica: ['Arranha o violão', 'Toca violão bem', 'Músico de verdade'],
  arte: ['Desenha razoavelmente', 'Desenha bem', 'Artista de verdade'],
  esporte: ['Joga razoavelmente', 'Bom de esporte', 'Atleta de verdade'],
  alcool: ['Bebe com frequência', 'Dependente de álcool', 'Alcoolismo grave'],
  cigarro: ['Fumante', 'Fumante pesado', 'Fumante muito pesado'],
  jogo: ['Aposta demais', 'Viciado em apostas', 'Vício grave em apostas'],
  diabetes: ['Diabetes controlada', 'Diabetes sem controle', 'Diabetes grave'],
};

export function TelaEu({ vida }: { vida: Vida }) {
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
              <div class="eixo-polos"><span>{neg}</span><span>{pos}</span></div>
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
          <dt>Sorte</dt><dd>Oculta (visível no Modo Deus, marco 6)</dd>
        </dl>
      </section>

      <p class="vazio">Escola, carreira e dinheiro chegam no marco 4.</p>
    </>
  );
}
