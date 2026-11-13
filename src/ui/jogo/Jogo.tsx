// O jogo, refeito do zero a partir do protótipo aprovado. Uma tela só, como um
// celular: a cena grande (onde você está, com pontos para tocar), a história na
// voz da fase (o que está acontecendo) e a base (objeto da fase, Avançar, cidade).
// Tocar num ponto abre um menu pequeno; a ação fecha o menu e escreve na história.

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import { desenharCena } from '../../arte/comodos';
import { companhias, custoPara, fazerAcao, previaEfeitos, variantesPossiveis, definirHabito, FREQUENCIAS, type AcaoDef, type OpcoesAcao } from '../../motor/acoes';
import { biografia } from '../../motor/biografia';
import { voltarPeriodo } from '../../motor/deus';
import { escolher } from '../../motor/eventos';
import { reais } from '../../motor/efeitos';
import { continuarComoFilho, fazerAcaoPessoa, filhosQuePodemContinuar } from '../../motor/familia';
import type { Vida } from '../../motor/tipos';
import { avancarPeriodo, nomeCompleto, quandoAgora, textoIdade } from '../../motor/vida';
import { recontar } from '../../motor/vozes';
import { cenaNoLugar, faseArte } from '../cena/cenaDaVida';
import { lugarPorId, lugaresDisponiveis, type IdLugar } from '../cena/lugares';
import { ItemFeed } from '../telas/FeedFases';
import { novoId } from '../textos';
import { Camada, type QualCamada } from './Camadas';
import { Icone } from './icones';
import { pontosDaCena, type PontoJogo } from './pontos';
import './fontes.css';
import './jogo.css';

export interface PropsJogo {
  vida: Vida;
  deus: boolean;
  semSave: boolean;
  onMudar: (v: Vida) => void;
  onDeus: () => void;
  onNovaVida: () => void;
  /** As telas antigas (pessoas, você, opções) ficam a um toque, dentro de uma folha. */
  antiga: (qual: 'pessoas' | 'eu' | 'mais') => preact.ComponentChildren;
}

/** Recorte da cena no palco: corta o alto da parede e o fundo do chão, chão sempre à vista. */
const VY = 20, VH = 312;
const recortar = (svg: string) => svg
  .replace(/viewBox="0 0 (\d+) (\d+)"/, `viewBox="0 ${VY} $1 ${VH}"`)
  .replace(/width="\d+" height="\d+"/, 'width="100%" height="100%" preserveAspectRatio="xMidYMax slice"');

/** Leva um ponto do palco (390 × 352) para a tela, no mesmo recorte do desenho. */
function naTela(x: number, y: number, w: number, h: number) {
  const s = Math.max(w / 390, h / VH);
  return { left: (w - 390 * s) / 2 + x * s, top: h - VH * s + (y - VY) * s };
}

const ROTULO_SISTEMA: Record<string, string> = { vagas: 'Vagas', curso: 'Faculdade', pretendentes: 'Amor', objetivo: 'Um pedido', habito18: 'Decisão' };

/** Separa a primeira frase (vira título) do resto (vira texto). */
function tituloETexto(t: string): [string, string] {
  const m = t.match(/^(.{12,140}?[.!?])\s+(.+)$/s);
  return m ? [m[1]!, m[2]!] : [t, ''];
}

export function Jogo({ vida, deus, semSave, onMudar, onDeus, onNovaVida, antiga }: PropsJogo) {
  const p = vida.personagem;
  const morte = vida.morte;
  const idade = (p.idadeBiologicaMeses ?? vida.relogio.idadeMeses) / 12;
  const fase = faseArte(idade);
  const [onde, setOnde] = useState<IdLugar>('casa');
  const [camada, setCamada] = useState<QualCamada | null>(null);
  const [aviso, setAviso] = useState('');
  const [verTudo, setVerTudo] = useState(false);
  const [lidas, setLidas] = useState(vida.historico.length);
  const cenaRef = useRef<HTMLDivElement>(null);
  const histRef = useRef<HTMLElement>(null);
  const [tam, setTam] = useState({ w: 390, h: 340 });

  // Mede a cena para pôr os pontos em cima dos móveis certos.
  useLayoutEffect(() => {
    const el = cenaRef.current;
    if (!el) return;
    const medir = () => setTam({ w: el.clientWidth, h: el.clientHeight });
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // A história desce sozinha até o fato mais recente.
  useEffect(() => { const el = histRef.current; if (el) el.scrollTop = el.scrollHeight; }, [vida.historico.length]);
  // Decisão nova ou fim da vida fecham o que estiver aberto.
  useEffect(() => { if (vida.pendente || morte) setCamada(null); }, [!!vida.pendente, !!morte]);
  // Aviso curto some sozinho.
  useEffect(() => { if (!aviso) return; const t = setTimeout(() => setAviso(''), 3200); return () => clearTimeout(t); }, [aviso]);
  // Outra vida: volta para casa.
  useEffect(() => { setOnde('casa'); setCamada(null); setLidas(vida.historico.length); }, [vida.id]);

  const cena = useMemo(() => cenaNoLugar(vida, onde), [vida, onde]);
  const svg = useMemo(() => recortar(desenharCena(cena)), [cena]);
  const pontos = useMemo(() => (morte ? [] : pontosDaCena(vida, cena, onde)), [vida, cena, onde, morte]);
  const blocos = useMemo(() => (vida.config.feed === 'simples' ? [] : recontar(vida)), [vida.id, vida.historico.length, vida.pessoas.length, vida.config.feed]);
  const mostrados = verTudo ? blocos : blocos.slice(-25);
  const lugar = lugarPorId(onde);
  const podeSair = lugaresDisponiveis(vida).length > 0;

  // ---- Ações ----
  const fechar = () => setCamada(null);
  function fazer(id: string, opcoes: OpcoesAcao = {}) {
    const r = fazerAcao(vida, id, opcoes);
    fechar();
    if (r.ok) onMudar(r.vida); else setAviso(r.aviso ?? 'Não deu agora.');
  }
  function acaoPessoa(pid: string, acao: string, opcao?: string) {
    const r = acao === 'convidar' && opcao
      ? fazerAcao(vida, opcao, { com: pid, variante: vida.ultimas?.[opcao]?.variante })
      : fazerAcaoPessoa(vida, pid, acao, opcao);
    fechar();
    if (r.ok) onMudar(r.vida); else setAviso(r.aviso ?? 'Não deu agora.');
  }
  function habito(id: string, n: number, variante?: string) { onMudar(definirHabito(vida, id, n, variante)); fechar(); }
  function avancar(pular: boolean) { fechar(); setOnde('casa'); onMudar(avancarPeriodo(vida, pular)); }
  function ir(id: IdLugar) {
    setOnde(id);
    setCamada(null);
  }
  const tocar = (pt: PontoJogo) => {
    if (pt.tipo === 'voce') setCamada({ tipo: 'voce' });
    else if (pt.tipo === 'pessoa') setCamada({ tipo: 'pessoa', id: pt.pessoaId! });
    else setCamada({ tipo: 'menu', ponto: pt });
  };

  // Novidades desde a última vez que você abriu o celular (ou a mochila).
  const novas = Math.min(9, Math.max(0, vida.historico.length - lidas));
  const objeto = fase === 'bebe' ? { icone: Icone.brinquedo, nome: 'brinquedos' } : fase === 'crianca' ? { icone: Icone.mochila, nome: 'mochila' } : { icone: Icone.celular, nome: 'celular' };
  const cab = blocos.at(-1)?.titulo || (fase === 'adulto' ? 'Mensagens' : fase === 'idoso' ? 'Família' : 'Sua história');

  return (
    <div class="jogo" data-fase={fase}>
      <main class="j-tela" aria-label="Enredo">
        <section class={`j-cena${morte ? ' j-falecido' : ''}`} ref={cenaRef}>
          <div class="j-cena-desenho" aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg }} />
          <header class="j-topo">
            <button class="j-topo-nome" onClick={() => setCamada({ tipo: 'jogo' })} aria-label="Menu do jogo">
              <span class="j-nome">{nomeCompleto(vida)}</span>
              <span class="j-quando">{morte ? `† ${textoIdade(morte.idadeMeses)} · ${morte.ano}` : `${textoIdade(vida.relogio.idadeMeses, p.sexo)} · ${quandoAgora(vida)}`}</span>
            </button>
            <div class="j-dir">
              {idade >= 10 && <span class={p.dinheiro < 0 ? 'j-dinheiro j-negativo' : 'j-dinheiro'}>{reais(p.dinheiro)}</span>}
              <button class={deus ? 'j-deus j-ativo' : 'j-deus'} onClick={onDeus} aria-label="Editor (Modo Deus)">✦</button>
            </div>
          </header>
          {(() => {
            // Afasta pontos que caem um em cima do outro (o rótulo de um não cobre o outro).
            const usados: { left: number; top: number }[] = [];
            return pontos.map((pt) => {
              const pos = naTela(pt.x, pt.y, tam.w, tam.h);
              for (let k = 0; k < 4 && usados.some((u) => Math.abs(u.left - pos.left) < 64 && Math.abs(u.top - pos.top) < 34); k++) pos.top += 36;
              usados.push(pos);
              return { pt, pos };
            });
          })().map(({ pt, pos }) => {
            if (pos.left < 8 || pos.left > tam.w - 8 || pos.top < 40 || pos.top > tam.h - 6) return null;
            return (
              <button key={pt.id} class="j-ponto" style={{ left: `${pos.left}px`, top: `${pos.top}px` }} onClick={() => tocar(pt)} aria-label={pt.rotulo}>
                <span>{pt.rotulo}</span>
              </button>
            );
          })}
          {!morte && <span class="j-lugar-nome">{onde === 'casa' ? 'Em casa' : lugar.nome(vida)}</span>}
        </section>

        <section class={`j-historia${blocos.at(-1)?.fase === 'crianca' && vida.config.feed !== 'simples' ? ' j-voz-diario' : ''}`} ref={histRef} aria-label="Sua história" aria-live="polite">
          {aviso && <p class="j-aviso-curto" role="status">{aviso}</p>}
          {semSave && <p class="j-aviso-curto">O navegador não deixou salvar. Exporte um backup no menu do jogo.</p>}
          <p class="j-cab">{cab}</p>
          {!verTudo && blocos.length > 25 && <button class="j-mais-antiga" onClick={() => setVerTudo(true)}>Ver a história anterior</button>}
          {vida.config.feed === 'simples'
            ? vida.historico.slice(-60).map((h, i) => <p key={i} class="j-bloco">{h.texto}</p>)
            : mostrados.map((b, i) => (
              // O estilo segue quem conta cada trecho: diário só quando é a criança escrevendo.
              <article key={`${b.quando}-${i}`} class={b.fase === 'crianca' ? 'j-bloco j-diario' : 'j-bloco'}>
                <span class="j-bloco-quando">{b.quando}</span>
                {b.itens.map((it, j) => <ItemFeed key={j} it={it} />)}
              </article>
            ))}
        </section>

        <nav class="j-base" aria-label="Ações principais">
          <button class="j-qd" onClick={() => { setLidas(vida.historico.length); setCamada({ tipo: 'objeto' }); }} aria-label={`Abrir ${objeto.nome}`} disabled={!!morte}>
            <objeto.icone />
            <small>{objeto.nome}</small>
            {fase !== 'bebe' && fase !== 'crianca' && novas > 0 && <span class="j-badge">{novas}</span>}
          </button>
          <div class="j-avancar-grupo">
            <button class="j-avancar" onClick={() => avancar(false)} disabled={!!vida.pendente || !!morte}>Avançar ▸</button>
            <button class="j-pular" onClick={() => avancar(true)} disabled={!!vida.pendente || !!morte} aria-label="Pular o ano (só para nas decisões)" title="Pular o ano">»</button>
          </div>
          <button class="j-qd" onClick={() => setCamada({ tipo: 'cidade' })} aria-label={onde === 'casa' ? 'Cidade' : 'Voltar ou ir para outro lugar'} disabled={!!morte || (!podeSair && onde === 'casa')}>
            {onde === 'casa' ? <Icone.mapa /> : <Icone.casa />}
            <small>{onde === 'casa' ? 'cidade' : 'voltar'}</small>
          </button>
        </nav>

        {/* Camadas por cima: menu de um ponto, folhas, momento */}
        {camada && !vida.pendente && !morte && (
          <Camada
            qual={camada} vida={vida} onde={onde} tam={tam} fase={fase}
            onFechar={fechar} onAbrir={setCamada} onFazer={fazer} onPessoa={acaoPessoa} onHabito={habito} onIr={ir}
            onNovaVida={onNovaVida} antiga={antiga}
          />
        )}
        {vida.pendente && !morte && (
          <div class="j-camadas">
            <section class="j-momento" role="dialog" aria-label="Acontecimento">
              <div class="j-faixa" aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg }} />
              <div class="j-texto">
                <span class="j-rotulo">{ROTULO_SISTEMA[vida.pendente.sistema ?? ''] ?? 'Aconteceu'}</span>
                {(() => { const [t, r] = tituloETexto(vida.pendente.texto); return <><h2>{t}</h2>{r && <p>{r}</p>}</>; })()}
                {vida.pendente.escolhas.map((c, i) => (/^Só (a partir|até)/.test(c.motivo ?? '') ? null : (
                  <button key={i} class="j-opcao" disabled={!!c.motivo} onClick={() => onMudar(escolher(vida, i))}>
                    {c.texto}
                    {c.motivo ? <em class="j-contra">{c.motivo}</em> : c.jeitoTexto ? <em class={c.jeito === 'contra' ? 'j-contra' : ''}>{c.jeitoTexto}</em> : null}
                  </button>
                )))}
              </div>
            </section>
          </div>
        )}
        {morte && (
          <div class="j-camadas">
            <section class="j-momento" role="dialog" aria-label="Fim da vida">
              <div class="j-faixa" aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg }} />
              <div class="j-texto">
                <span class="j-rotulo">Fim da vida</span>
                <h2>{nomeCompleto(vida)}, {Math.floor(morte.idadeMeses / 12)} anos</h2>
                {biografia(vida).map((t, i) => <p key={i}>{t}</p>)}
                {filhosQuePodemContinuar(vida).map((f) => (
                  <button key={f.id} class="j-opcao j-forte" onClick={() => onMudar(continuarComoFilho(vida, f.id, novoId(), new Date().toISOString()))}>
                    Continuar como {f.nome} ({Math.floor(f.idadeMeses / 12)} anos)
                  </button>
                ))}
                {vida.config.morte === 'voltar' && vida.anterior && <button class="j-opcao" onClick={() => onMudar(voltarPeriodo(vida))}>↺ Voltar um período</button>}
                <button class="j-opcao" onClick={onNovaVida}>Começar outra vida</button>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

/** Texto curto de uma ação no menu: o que mexe e quanto custa. */
export function resumoAcao(vida: Vida, a: AcaoDef): string {
  const v = variantesPossiveis(vida, a).find((x) => x.id === vida.ultimas?.[a.id]?.variante) ?? variantesPossiveis(vida, a)[0];
  const custo = custoPara(vida, a, v);
  const efeitos = previaEfeitos(vida, a, v).slice(0, 2);
  // O custo já pode vir nos efeitos (−R$ 50): não repete.
  return [...efeitos, custo > 0 && !efeitos.some((e) => e.includes('R$')) ? reais(custo) : ''].filter(Boolean).join(' · ');
}

export { companhias, FREQUENCIAS };
