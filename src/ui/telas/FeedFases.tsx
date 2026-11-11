import type { Bloco, Item } from '../../motor/vozes';

/** Etiquetas pequenas dos efeitos (e as notas entre parênteses). */
function Tags({ tags }: { tags: string[] }) {
  if (!tags.length) return null;
  return (
    <span class="tags">
      {tags.map((t) => (
        <span key={t} class={t.startsWith('(') ? 'tag nota' : /[−-]\d|−R\$/.test(t) ? 'tag menos' : 'tag'}>{t.replace(/^\(|\)$/g, '')}</span>
      ))}
    </span>
  );
}

function ItemFeed({ it }: { it: Item }) {
  switch (it.tipo) {
    case 'msg':
      return (
        <div class={it.meu ? 'bolha minha' : 'bolha'}>
          {it.autor && <span class="autor">{it.autor}</span>}
          {it.para && <span class="autor">para {it.para}</span>}
          {it.audio && <span class="audio" aria-label={`Áudio de ${it.audio}`}>▶ ▂▅▃▆▂▇▃▅▂▆▃ {it.audio}</span>}
          {it.foto && <span class="foto" aria-label="Foto">📷 foto</span>}
          {it.texto && <p>{it.audio && <span class="transcricao">Transcrição: </span>}{it.texto}</p>}
          <Tags tags={it.tags} />
        </div>
      );
    case 'diario':
      return <p class="diario-linha">{it.texto} <Tags tags={it.tags} /></p>;
    case 'post':
      return (
        <div class={it.luto ? 'post luto' : 'post'}>
          {it.privado && <span class="post-rotulo">🔒 notas, só para você</span>}
          {it.apagado && <span class="post-rotulo">apagado 10 minutos depois</span>}
          <p class={it.apagado ? 'riscado' : ''}>{it.texto}</p>
          <Tags tags={it.tags} />
          {!it.privado && !it.luto && <span class="curtidas">♥ {it.curtidas.toLocaleString('pt-BR')}</span>}
          {it.comentarios.length > 0 && (
            <ul class="comentarios">
              {it.comentarios.map((c, i) => <li key={i}><strong>{c.autor}</strong> {c.texto}</li>)}
            </ul>
          )}
        </div>
      );
    case 'story':
      return <div class="story"><span class="story-bolinha" aria-hidden="true" />{it.texto} <Tags tags={it.tags} /></div>;
    case 'email':
      return (
        <div class="email">
          <span class="email-de">✉ De: {it.de}</span>
          <strong>{it.assunto}</strong>
          <p>{it.texto}</p>
          <Tags tags={it.tags} />
        </div>
      );
    case 'banco':
      return <div class="banco"><strong>🏦 Banco</strong> {it.texto} <Tags tags={it.tags} /></div>;
    case 'app':
      return <div class="app-linha">📱 {it.texto} <Tags tags={it.tags} /></div>;
    case 'carta':
      return <div class="carta"><span class="email-de">✉ Para {it.para}</span><p>{it.texto}</p></div>;
    case 'corrente':
      return <div class="bolha minha corrente"><span class="autor">↪ Encaminhada</span><p>{it.texto}</p></div>;
    case 'nota':
      return <p class="nota-linha">{it.texto} <Tags tags={it.tags} /></p>;
    case 'deus':
      return <p class="deus-linha">{it.texto}</p>;
  }
}

/** O feed recontado por fase: grupo da família, diário, posts, mensagens, áudios. */
export function FeedFases({ blocos }: { blocos: Bloco[] }) {
  return (
    <>
      {blocos.map((b, i) => (
        <article class={`entrada fase-${b.fase}`} key={`${b.quando}-${i}`}>
          <span class="quando">{b.quando}{b.titulo && <span class="fase-titulo"> · {b.titulo}</span>}</span>
          <div class="fase-corpo">
            {b.itens.map((it, j) => <ItemFeed key={j} it={it} />)}
          </div>
        </article>
      ))}
    </>
  );
}
