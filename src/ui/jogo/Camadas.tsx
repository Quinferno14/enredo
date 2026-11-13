// O que abre por cima da tela do jogo: o menu pequeno de um ponto da cena, as
// folhas (mochila, celular e apps, cidade, pessoa, você, menu do jogo) e a busca.
// Toda ação fecha a camada e escreve na história.

import type { ComponentChildren } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import { desenharCena } from '../../arte/comodos';
import { desenharPessoa } from '../../arte/pessoa';
import { DEFS } from '../../arte/estilo';
import { acoesDisponiveis, acaoPorId, companhias, FREQUENCIAS, variantesPossiveis, custoPara, type AcaoDef, type OpcoesAcao } from '../../motor/acoes';
import { textoEstudo, tituloEmprego } from '../../motor/carreira';
import { importancia } from '../../motor/contexto';
import { aparenciaDaPessoa, aparenciaDoPersonagem } from '../../motor/corpo';
import { reais } from '../../motor/efeitos';
import { acoesDaPessoa, assuntosCom, capitalizar, papelTexto, type AcaoPessoaDef } from '../../motor/familia';
import { textoSonho } from '../../motor/capitulos';
import { compatCom, nomeAssunto, rotuloCompat } from '../../motor/social';
import type { Atributo, Pessoa, Vida } from '../../motor/tipos';
import { nomeCompleto } from '../../motor/vida';
import type { FaseArte } from '../../arte/estilo';
import { horaDe } from '../cena/cenaDaVida';
import { lugaresDisponiveis, type IdLugar } from '../cena/lugares';
import { NOME_GRUPO, vidaPropria } from '../telas/TelaPessoas';
import { NOME_ATRIBUTO } from '../textos';
import { Icone } from './icones';
import type { PontoJogo } from './pontos';
import { resumoAcao } from './Jogo';

export type QualCamada =
  | { tipo: 'menu'; ponto: PontoJogo; sub?: string }
  | { tipo: 'objeto' } | { tipo: 'app'; id: IdApp } | { tipo: 'cidade' } | { tipo: 'busca' }
  | { tipo: 'pessoa'; id: string } | { tipo: 'voce' } | { tipo: 'jogo' } | { tipo: 'antiga'; qual: 'pessoas' | 'eu' | 'mais' };

type IdApp = 'mensagens' | 'rede' | 'amor' | 'estudos' | 'vagas' | 'banco' | 'imoveis' | 'saude' | 'tudo';

interface Props {
  qual: QualCamada; vida: Vida; onde: IdLugar; tam: { w: number; h: number }; fase: FaseArte;
  onFechar: () => void; onAbrir: (c: QualCamada) => void;
  onFazer: (id: string, opcoes?: OpcoesAcao) => void;
  onPessoa: (pid: string, acao: string, opcao?: string) => void;
  onHabito: (id: string, n: number, variante?: string) => void;
  onIr: (id: IdLugar) => void;
  onNovaVida: () => void;
  antiga: (qual: 'pessoas' | 'eu' | 'mais') => ComponentChildren;
}

/** Folha de papel que sobe de baixo; toque fora ou no ✕ para fechar. */
function Folha({ titulo, sub, onFechar, children }: { titulo: ComponentChildren; sub?: ComponentChildren; onFechar: () => void; children?: ComponentChildren }) {
  return (
    <div class="j-camadas">
      <div class="j-veu" onClick={onFechar} />
      <section class="j-folha" role="dialog">
        <h2>{titulo}</h2>
        {sub && <p class="j-sub">{sub}</p>}
        <button class="j-fechar" onClick={onFechar} aria-label="Fechar">✕</button>
        {children}
      </section>
    </div>
  );
}

/** Lista de ações: cada botão faz na hora (com o jeito de sempre: última variante e companhia). */
function ListaAcoes({ vida, acoes, onFazer, vazio }: { vida: Vida; acoes: AcaoDef[]; onFazer: Props['onFazer']; vazio?: string }) {
  if (!acoes.length) return vazio ? <p class="j-texto-pequeno">{vazio}</p> : null;
  return (
    <div class="j-lista-acoes">
      {acoes.map((a) => (
        <button key={a.id} class="j-acao-botao" onClick={() => onFazer(a.id, { variante: vida.ultimas?.[a.id]?.variante, com: vida.ultimas?.[a.id]?.com ?? 'turma' })}>
          {a.nome}<small>{resumoAcao(vida, a)}</small>
        </button>
      ))}
    </div>
  );
}

const disponiveis = (vida: Vida, ids: string[]) => {
  const m = new Map(acoesDisponiveis(vida).map((a) => [a.id, a]));
  return ids.map((id) => m.get(id)).filter((a): a is AcaoDef => !!a);
};

/** Retrato de corpo inteiro (para a ficha). */
function Retrato({ a }: { a: ReturnType<typeof aparenciaDoPersonagem> }) {
  if (!a) return <div class="j-retrato" />;
  const topo = a.alturaCm * 0.95;
  return <div class="j-retrato" aria-hidden="true" dangerouslySetInnerHTML={{ __html: `<svg viewBox="-55 ${-topo - 8} 110 ${topo * 0.62 + 8}" preserveAspectRatio="xMidYMin slice">${DEFS}${desenharPessoa({ ...a, corRoupa: '#2f6db5' }, { humor: 'feliz' })}</svg>` }} />;
}

export function Camada(props: Props) {
  const { qual, vida, tam, fase, onFechar, onAbrir, onFazer, onPessoa, onHabito, onIr } = props;
  switch (qual.tipo) {
    case 'menu': return <MenuPonto {...props} ponto={qual.ponto} sub={qual.sub} />;
    case 'objeto': return fase === 'bebe' || fase === 'crianca' ? <Mochila {...props} /> : <Celular {...props} />;
    case 'app': return <App {...props} id={qual.id} />;
    case 'cidade': return <Cidade vida={vida} onde={props.onde} onIr={onIr} onFechar={onFechar} />;
    case 'busca': return <Busca vida={vida} onFazer={onFazer} onFechar={onFechar} />;
    case 'pessoa': {
      const pe = vida.pessoas.find((x) => x.id === qual.id);
      return pe ? <FichaPessoa vida={vida} pessoa={pe} onPessoa={onPessoa} onFechar={onFechar} /> : null;
    }
    case 'voce': return <Voce vida={vida} onHabito={onHabito} onFechar={onFechar} onAbrir={onAbrir} />;
    case 'jogo': return (
      <Folha titulo={nomeCompleto(vida)} sub="Menu do jogo" onFechar={onFechar}>
        <div class="j-lista-acoes">
          <button class="j-acao-botao" onClick={() => onAbrir({ tipo: 'voce' })}>Você<small>números, hábitos e sonhos</small></button>
          <button class="j-acao-botao" onClick={() => onAbrir({ tipo: 'antiga', qual: 'pessoas' })}>Todas as pessoas da sua vida<small>família, amigos, quem já se foi</small></button>
          <button class="j-acao-botao" onClick={() => onAbrir({ tipo: 'antiga', qual: 'eu' })}>Ficha completa<small>estudo, trabalho, personalidade, memórias</small></button>
          <button class="j-acao-botao" onClick={() => onAbrir({ tipo: 'antiga', qual: 'mais' })}>Vidas salvas e opções<small>trocar de vida, backup, jeito de contar a história</small></button>
          <button class="j-acao-botao" onClick={props.onNovaVida}>Começar outra vida</button>
        </div>
      </Folha>
    );
    case 'antiga': return (
      <Folha titulo={qual.qual === 'pessoas' ? 'Pessoas' : qual.qual === 'eu' ? 'Você, por inteiro' : 'Vidas e opções'} onFechar={onFechar}>
        <div class="j-antiga">{props.antiga(qual.qual)}</div>
      </Folha>
    );
  }
  void tam;
}

// ---------- Menu pequeno de um ponto da cena ----------

function MenuPonto({ vida, tam, ponto, sub, onFechar, onAbrir, onFazer, onHabito }: Props & { ponto: PontoJogo; sub?: string }) {
  const [variante, setVariante] = useState<string | undefined>(undefined);
  const [com, setCom] = useState<string | undefined>(undefined);
  const s = Math.max(tam.w / 390, tam.h / 312);
  const x = (tam.w - 390 * s) / 2 + ponto.x * s;
  const y = tam.h - 312 * s + (ponto.y - 20) * s;
  const left = Math.min(Math.max(x - 115, 8), tam.w - 238);
  const top = Math.min(y + 22, tam.h * 0.62);
  const a = sub ? acaoPorId(sub) : undefined;
  const vs = a ? variantesPossiveis(vida, a) : [];
  const vSel = vs.find((v) => v.id === (variante ?? vida.ultimas?.[a!.id]?.variante)) ?? vs[0];
  const comSel = com ?? (a ? vida.ultimas?.[a.id]?.com : undefined) ?? 'turma';
  const h = a ? vida.habitos.find((x2) => x2.acao === a.id) : undefined;
  return (
    <div class="j-camadas">
      <div class="j-veu j-leve" onClick={onFechar} />
      <div class="j-menu" style={{ left: `${left}px`, top: `${top}px` }} role="menu">
        {!a ? (
          <>
            <h3>{ponto.rotulo}</h3>
            {ponto.acoes.map((ac) => {
              const temOpcoes = variantesPossiveis(vida, ac).length > 1 || !!ac.comQuem || !ac.semHabito;
              return (
                <div key={ac.id} class="j-acao-linha">
                  <button class="j-acao-botao" role="menuitem"
                    onClick={() => onFazer(ac.id, { variante: vida.ultimas?.[ac.id]?.variante, com: vida.ultimas?.[ac.id]?.com ?? 'turma' })}>
                    {ac.nome}<small>{resumoAcao(vida, ac)}</small>
                  </button>
                  {temOpcoes && (
                    <button class="j-mais-opcoes" aria-label={`Outro jeito ou virar hábito: ${ac.nome}`} title="Outro jeito ou virar hábito"
                      onClick={() => onAbrir({ tipo: 'menu', ponto, sub: ac.id })}>⋯</button>
                  )}
                </div>
              );
            })}
          </>
        ) : (
          <>
            <button class="j-voltar" onClick={() => onAbrir({ tipo: 'menu', ponto })}>← {ponto.rotulo}</button>
            <h3>{a.nome}</h3>
            {vs.length > 1 && (
              <>
                <p class="j-rotulo-mini">{a.id === 'amigos' ? 'Onde' : 'Como'}</p>
                <div class="j-escolha">
                  {vs.map((v) => {
                    const c = custoPara(vida, a, v);
                    return <button key={v.id} aria-pressed={vSel?.id === v.id} onClick={() => setVariante(v.id)}>{v.nome.replace(' · grátis', '')}{c > 0 ? ` · ${reais(c)}` : ''}</button>;
                  })}
                </div>
              </>
            )}
            {a.comQuem && (
              <>
                <p class="j-rotulo-mini">Com quem</p>
                <div class="j-escolha">
                  <button aria-pressed={comSel === 'turma'} onClick={() => setCom('turma')}>A turma</button>
                  {companhias(vida).slice(0, 8).map((pe) => <button key={pe.id} aria-pressed={comSel === pe.id} onClick={() => setCom(pe.id)}>{pe.nome}</button>)}
                </div>
              </>
            )}
            <button class="j-acao-botao" onClick={() => onFazer(a.id, { variante: vSel?.id, com: comSel })}>Fazer agora<small>{resumoAcao(vida, a)}</small></button>
            {!a.semHabito && (
              <>
                <p class="j-rotulo-mini">Virar hábito {h ? `(hoje ${h.porSemana}x por semana)` : ''}</p>
                <div class="j-escolha">
                  {FREQUENCIAS.map((f) => <button key={f} aria-pressed={h?.porSemana === f} onClick={() => onHabito(a.id, f, vSel?.id)}>{f}x/sem</button>)}
                  {h && !h.imposto && <button onClick={() => onHabito(a.id, 0)}>Parar</button>}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ---------- Objeto da fase ----------

function Mochila({ vida, fase, onFechar, onFazer, onAbrir }: Props) {
  if (fase === 'bebe') {
    return (
      <Folha titulo="Brinquedos" sub="Coisas de bebê." onFechar={onFechar}>
        <ListaAcoes vida={vida} acoes={disponiveis(vida, ['colo', 'brincar', 'descansar'])} onFazer={onFazer} />
      </Folha>
    );
  }
  const e = vida.personagem.estudo;
  return (
    <Folha titulo="Mochila" onFechar={onFechar}>
      <p class="j-secao">Escola</p>
      <p class="j-texto-pequeno">{textoEstudo(vida) || 'Ainda não está na escola.'}</p>
      {e.etapa !== 'nenhuma' && (
        <>
          <p class="j-secao">Boletim</p>
          <div class="j-barra-mini" title={`Nota ${Math.round(e.nota)}`}><span style={{ width: `${Math.round(e.nota)}%` }} /></div>
          <p class="j-texto-pequeno">Nota {Math.round(e.nota)} de 100{e.reprovacoes ? ` · repetiu ${e.reprovacoes} ${e.reprovacoes === 1 ? 'vez' : 'vezes'}` : ''}.</p>
        </>
      )}
      <ListaAcoes vida={vida} acoes={disponiveis(vida, ['estudar', 'matar_aula'])} onFazer={onFazer} />
      <p class="j-secao">Brinquedos e coisas</p>
      <ListaAcoes vida={vida} acoes={disponiveis(vida, ['brincar', 'videogame', 'desenhar', 'musica', 'ler', 'esporte'])} onFazer={onFazer} />
      <button class="j-btn j-claro" onClick={() => onAbrir({ tipo: 'busca' })}>Procurar outra coisa para fazer</button>
    </Folha>
  );
}

const APPS: { id: IdApp; nome: (idade: number) => string; cor: string; icone: () => preact.JSX.Element; idade: number }[] = [
  { id: 'mensagens', nome: () => 'Mensagens', cor: '#2e7d5b', icone: Icone.mensagens, idade: 0 },
  { id: 'rede', nome: () => 'Rede', cor: '#9b59b6', icone: Icone.rede, idade: 13 },
  { id: 'amor', nome: (i) => (i < 18 ? 'Crush' : 'Amor'), cor: '#e6457f', icone: Icone.amor, idade: 12 },
  { id: 'estudos', nome: () => 'Estudos', cor: '#2f6db5', icone: Icone.estudos, idade: 0 },
  { id: 'vagas', nome: () => 'Vagas', cor: '#e67e22', icone: Icone.vagas, idade: 14 },
  { id: 'banco', nome: () => 'Banco', cor: '#1e2a3a', icone: Icone.banco, idade: 16 },
  { id: 'imoveis', nome: () => 'Imóveis', cor: '#a86d42', icone: Icone.imoveis, idade: 18 },
  { id: 'saude', nome: () => 'Saúde', cor: '#c0392b', icone: Icone.saude, idade: 0 },
  { id: 'tudo', nome: () => 'Tudo', cor: '#5d6d7e', icone: Icone.tudo, idade: 0 },
];

function Celular({ vida, onFechar, onAbrir }: Props) {
  const idade = vida.relogio.idadeMeses / 12;
  return (
    <Folha titulo="Celular" onFechar={onFechar}>
      <div class="j-apps">
        {APPS.filter((a) => idade >= a.idade).map((a) => (
          <button key={a.id} class="j-app" onClick={() => onAbrir({ tipo: 'app', id: a.id })}>
            <span style={{ background: a.cor }}><a.icone /></span>{a.nome(idade)}
          </button>
        ))}
      </div>
    </Folha>
  );
}

function App({ vida, id, onFechar, onFazer, onAbrir }: Props & { id: IdApp }) {
  const p = vida.personagem;
  const idade = vida.relogio.idadeMeses / 12;
  const linha = (t: ComponentChildren, s: ComponentChildren, botao?: ComponentChildren) => (
    <div class="j-linha-app"><div><b>{t}</b><small>{s}</small></div>{botao}</div>
  );
  const voltar = () => onAbrir({ tipo: 'objeto' });
  const nome = APPS.find((a) => a.id === id)!.nome(idade);
  switch (id) {
    case 'mensagens': {
      const gente = vida.pessoas.filter((x) => x.vivo && !x.afastado).sort((a, b) => importancia(vida, b) - importancia(vida, a)).slice(0, 14);
      return (
        <Folha titulo={nome} sub="Toque em alguém para conversar." onFechar={voltar}>
          {gente.map((pe) => (
            <div key={pe.id} class="j-linha-app">
              <div><b>{pe.nome}</b><small>{capitalizar(papelTexto(pe))} · afeto {pe.afeto}</small></div>
              <button class="j-btn j-claro" onClick={() => onAbrir({ tipo: 'pessoa', id: pe.id })}>Abrir</button>
            </div>
          ))}
        </Folha>
      );
    }
    case 'rede': return (
      <Folha titulo={nome} sub={`@${(p.nome + p.sobrenome).toLowerCase().normalize('NFD').replace(/[^a-z]/g, '')} · ${p.seguidores.toLocaleString('pt-BR')} seguidores`} onFechar={voltar}>
        <ListaAcoes vida={vida} acoes={disponiveis(vida, ['postar', 'show'])} onFazer={onFazer} vazio="Nada para postar agora." />
      </Folha>
    );
    case 'amor': {
      const par = vida.pessoas.find((x) => x.papel === 'parceiro' && x.vivo);
      return (
        <Folha titulo={nome} onFechar={voltar}>
          {par && linha(par.nome, `${par.relacao === 'casamento' ? 'casad' : 'namorando'}${par.relacao === 'casamento' ? (p.sexo === 'feminino' ? 'a' : 'o') : ''} · afeto ${par.afeto}`, <button class="j-btn j-claro" onClick={() => onAbrir({ tipo: 'pessoa', id: par.id })}>Abrir</button>)}
          {idade < 18 && <p class="j-texto-pequeno">Só gente da sua idade, e nada além de sair, conversar e, quem sabe, o primeiro beijo.</p>}
          <ListaAcoes vida={vida} acoes={disponiveis(vida, ['procurar_parceiro'])} onFazer={onFazer} vazio={par ? 'Você já tem alguém.' : 'Ainda não.'} />
        </Folha>
      );
    }
    case 'estudos': return (
      <Folha titulo={nome} sub={textoEstudo(vida) || 'Fora da escola.'} onFechar={voltar}>
        <ListaAcoes vida={vida} acoes={disponiveis(vida, ['estudar_sozinho', 'curso', 'prestar_enem', 'supletivo', 'estudar_concurso', 'prestar_concurso', 'autoescola', 'alistar', 'largar_estudo'])} onFazer={onFazer} vazio="Nada por aqui agora." />
      </Folha>
    );
    case 'vagas': return (
      <Folha titulo={nome} sub={p.trabalho.emprego ? `Hoje: ${tituloEmprego(vida, p.trabalho.emprego)} · ${reais(p.trabalho.emprego.salario)}/mês` : 'Sem emprego fixo.'} onFechar={voltar}>
        <ListaAcoes vida={vida} acoes={disponiveis(vida, ['procurar_emprego', 'bico', 'pedir_aumento', 'pedir_demissao', 'aposentar'])} onFazer={onFazer} />
      </Folha>
    );
    case 'banco': return (
      <Folha titulo={nome} onFechar={voltar}>
        <p class="j-grande">{reais(p.dinheiro)}</p>
        <p class="j-texto-pequeno">conta corrente</p>
        {p.trabalho.emprego && linha('Salário', `${reais(p.trabalho.emprego.salario)} por mês`)}
        {p.trabalho.aposentadoria > 0 && linha('Aposentadoria', `${reais(p.trabalho.aposentadoria)} por mês`)}
        {p.dividas.map((d, i) => linha(`Dívida: ${d.nome ?? 'empréstimo'}`, `${reais(d.saldo ?? 0)} em aberto`))}
        {p.negocio && linha(p.negocio.nome, 'seu negócio')}
        <ListaAcoes vida={vida} acoes={disponiveis(vida, ['abrir_negocio', 'cuidar_negocio', 'vender_negocio', 'bet', 'bicho'])} onFazer={onFazer} />
      </Folha>
    );
    case 'imoveis': return (
      <Folha titulo={nome} sub={p.moradia === 'pais' ? 'Você mora com a família.' : 'Você mora de aluguel.'} onFechar={voltar}>
        <ListaAcoes vida={vida} acoes={disponiveis(vida, ['sair_de_casa', 'voltar_pais'])} onFazer={onFazer} vazio="Comprar e alugar imóveis chega na próxima rodada." />
      </Folha>
    );
    case 'saude': return (
      <Folha titulo={nome} sub={`Saúde ${Math.round(p.atributos.saude)} de 100`} onFechar={voltar}>
        <ListaAcoes vida={vida} acoes={disponiveis(vida, ['medico_sus', 'medico_particular', 'comer_bem', 'descansar', 'meditar'])} onFazer={onFazer} />
      </Folha>
    );
    case 'tudo': return <Busca vida={vida} onFazer={onFazer} onFechar={voltar} />;
  }
}

function Busca({ vida, onFazer, onFechar }: { vida: Vida; onFazer: Props['onFazer']; onFechar: () => void }) {
  const [q, setQ] = useState('');
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const todas = acoesDisponiveis(vida);
  const lista = q.trim() ? todas.filter((a) => norm(a.nome).includes(norm(q)) || a.busca.some((b) => norm(b).includes(norm(q)))) : todas;
  return (
    <Folha titulo="O que você quer fazer?" onFechar={onFechar}>
      <input class="j-busca" type="search" value={q} onInput={(e) => setQ(e.currentTarget.value)} placeholder="estudar, academia, festa…" aria-label="Buscar" />
      <ListaAcoes vida={vida} acoes={lista} onFazer={onFazer} vazio="Nada com esse nome para a sua idade." />
    </Folha>
  );
}

// ---------- Cidade ----------

function Miniatura({ vida, arte }: { vida: Vida; arte: Parameters<typeof desenharCena>[0]['lugar'] }) {
  const idade = vida.relogio.idadeMeses / 12;
  const fase: FaseArte = idade < 3 ? 'bebe' : idade < 12 ? 'crianca' : idade < 18 ? 'adolescente' : idade < 60 ? 'adulto' : 'idoso';
  const hora = horaDe(vida);
  const svg = useMemo(() => desenharCena({ lugar: arte, fase, hora: hora === 'noite' ? 'tarde' : hora })
    .replace(/viewBox="0 0 (\d+) (\d+)"/, 'viewBox="0 60 $1 260"')
    .replace(/width="\d+" height="\d+"/, 'width="100%" height="100%" preserveAspectRatio="xMidYMid slice"'), [arte, fase, hora]);
  return <span class="j-mini" aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg }} />;
}

function Cidade({ vida, onde, onIr, onFechar }: { vida: Vida; onde: IdLugar; onIr: (id: IdLugar) => void; onFechar: () => void }) {
  const lugares = lugaresDisponiveis(vida);
  return (
    <Folha titulo={vida.personagem.cidade} sub="Para onde?" onFechar={onFechar}>
      <div class="j-mapa-grade">
        {onde !== 'casa' && (
          <button class="j-lugar-cartao j-casa" onClick={() => onIr('casa')}><Miniatura vida={vida} arte="sala" /><strong>Voltar para casa</strong></button>
        )}
        {lugares.filter((l) => l.id !== onde).map((l) => (
          <button key={l.id} class="j-lugar-cartao" onClick={() => onIr(l.id)}><Miniatura vida={vida} arte={l.arte} /><strong>{l.nome(vida)}</strong></button>
        ))}
      </div>
    </Folha>
  );
}

// ---------- Pessoa ----------

function FichaPessoa({ vida, pessoa: pe, onPessoa, onFechar }: { vida: Vida; pessoa: Pessoa; onPessoa: Props['onPessoa']; onFechar: () => void }) {
  const [sub, setSub] = useState<AcaoPessoaDef | null>(null);
  const acoes = acoesDaPessoa(vida, pe);
  const grupos = [...new Set(acoes.map((a) => a.grupo))];
  const opcoes = sub?.abre === 'assuntos'
    ? assuntosCom(vida, pe).map((x) => ({ id: x.id, nome: x.nome, gosta: (pe.conhecidos ?? []).includes(x.id) }))
    : sub?.abre === 'atividades' ? acoesDisponiveis(vida).filter((a) => a.comQuem).map((a) => ({ id: a.id, nome: a.nome, gosta: false })) : [];
  const anos = Math.floor(pe.idadeMeses / 12);
  return (
    <Folha titulo={pe.nome} onFechar={onFechar}>
      <div class="j-ficha-topo">
        <Retrato a={aparenciaDaPessoa(pe)} />
        <div>
          <p class="j-texto-pequeno"><b>{capitalizar(papelTexto(pe))}</b>, {anos < 1 ? 'bebê' : `${anos} anos`}</p>
          {vidaPropria(pe) && <p class="j-texto-pequeno">{vidaPropria(pe)}</p>}
          <p class="j-texto-pequeno">{capitalizar(rotuloCompat(compatCom(vida, pe)))}.{(pe.conhecidos ?? []).length ? ` Gosta de falar de ${(pe.conhecidos ?? []).map(nomeAssunto).join(' e ')}.` : ''}</p>
          <p class="j-secao">Afeto {pe.afeto}</p>
          <div class="j-barra-mini"><span style={{ width: `${pe.afeto}%` }} /></div>
        </div>
      </div>
      {sub ? (
        <>
          <p class="j-secao">{sub.abre === 'assuntos' ? 'Conversar sobre…' : 'Convidar para…'}</p>
          <div class="j-chips">
            {opcoes.map((o) => <button key={o.id} class="j-chip" aria-pressed={o.gosta} onClick={() => onPessoa(pe.id, sub.id, o.id)}>{o.nome}{o.gosta ? ' ♥' : ''}</button>)}
            <button class="j-chip" onClick={() => setSub(null)}>← Voltar</button>
          </div>
        </>
      ) : grupos.map((g) => (
        <div key={g}>
          <p class="j-secao">{NOME_GRUPO[g]}</p>
          <div class="j-chips">
            {acoes.filter((a) => a.grupo === g).map((a) => (
              <button key={a.id} class="j-chip" onClick={() => (a.abre ? setSub(a) : onPessoa(pe.id, a.id))}>
                {a.nome}{a.custo ? ` · ${reais(vida.relogio.idadeMeses < 216 && a.id === 'presente' ? 30 : a.custo)}` : ''}
              </button>
            ))}
          </div>
        </div>
      ))}
    </Folha>
  );
}

// ---------- Você ----------

const NUMEROS: Atributo[] = ['saude', 'felicidade', 'inteligencia', 'aparencia', 'forma', 'carisma'];

function Voce({ vida, onHabito, onFechar, onAbrir }: { vida: Vida; onHabito: Props['onHabito']; onFechar: () => void; onAbrir: Props['onAbrir'] }) {
  const p = vida.personagem;
  const emp = p.trabalho.emprego;
  const sonhos = (p.sonhos ?? []).filter((s) => s.status === 'vivo');
  return (
    <Folha titulo={nomeCompleto(vida)} onFechar={onFechar}>
      <div class="j-ficha-topo">
        <Retrato a={aparenciaDoPersonagem(vida)} />
        <div>
          {textoEstudo(vida) && <p class="j-texto-pequeno">{textoEstudo(vida)}</p>}
          {emp && <p class="j-texto-pequeno">{capitalizar(tituloEmprego(vida, emp))} · {reais(emp.salario)}/mês</p>}
          {sonhos.length > 0 && <p class="j-texto-pequeno">Sonha em {sonhos.map((s) => textoSonho(vida, s.id)).join(' e em ')}.</p>}
          {vida.diretor?.capitulos?.length ? <p class="j-texto-pequeno">Capítulo: <b>{vida.diretor.capitulos.at(-1)!.titulo}</b></p> : null}
        </div>
      </div>
      <p class="j-secao">Como você está</p>
      <div class="j-numeros">
        {NUMEROS.map((a) => (
          <label key={a}><b><span>{NOME_ATRIBUTO[a]}</span><span>{Math.round(p.atributos[a])}</span></b><span class="j-barra-mini"><span style={{ width: `${p.atributos[a]}%` }} /></span></label>
        ))}
        <label><b><span>Cansaço</span><span>{Math.round(p.desgaste)}</span></b><span class="j-barra-mini"><span style={{ width: `${p.desgaste}%`, background: '#b0413e' }} /></span></label>
      </div>
      {vida.habitos.filter((h) => h.pausado !== 'fim').length > 0 && (
        <>
          <p class="j-secao">Hábitos</p>
          {vida.habitos.filter((h) => h.pausado !== 'fim').map((h) => (
            <div key={h.acao} class="j-linha-app">
              <div><b>{acaoPorId(h.acao)?.nome ?? h.acao}</b><small>{h.porSemana}x por semana{h.imposto ? ' · imposto pelos pais' : ''}{h.pausado ? ' · pausado' : ''}</small></div>
              {!h.imposto && <button class="j-btn j-claro" onClick={() => onHabito(h.acao, 0)}>Parar</button>}
            </div>
          ))}
        </>
      )}
      <button class="j-btn j-claro" onClick={() => onAbrir({ tipo: 'antiga', qual: 'eu' })}>Ver a ficha completa</button>
    </Folha>
  );
}

export { companhias };
