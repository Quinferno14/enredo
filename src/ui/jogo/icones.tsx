// Ícones desenhados (em vez de emoji, que muda de aparelho para aparelho e às
// vezes nem aparece). Traço único, cantos arredondados, como o resto do jogo.

const base = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' } as const;

export const Icone = {
  mochila: () => <svg {...base} stroke="#2b2620"><path d="M7 8a5 5 0 0 1 10 0v11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2Z" fill="#e8553d" /><path d="M10 6V4.5a2 2 0 0 1 4 0V6" /><rect x="9" y="12" width="6" height="4" rx="1" fill="#f2c14e" /></svg>,
  celular: () => <svg {...base} stroke="#2b2620"><rect x="6.5" y="2.5" width="11" height="19" rx="2.5" fill="#3e5c76" /><rect x="8.5" y="5" width="7" height="12" rx="1" fill="#9cc2e6" stroke="none" /><path d="M11 19.2h2" stroke="#fff" /></svg>,
  brinquedo: () => <svg {...base} stroke="#2b2620"><circle cx="12" cy="13" r="6" fill="#f2b5a7" /><circle cx="7.5" cy="7.5" r="2.5" fill="#f2b5a7" /><circle cx="16.5" cy="7.5" r="2.5" fill="#f2b5a7" /><circle cx="10" cy="12" r="0.6" fill="#2b2620" /><circle cx="14" cy="12" r="0.6" fill="#2b2620" /><path d="M10.5 15c1 .8 2 .8 3 0" /></svg>,
  mapa: () => <svg {...base} stroke="#2b2620"><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2Z" fill="#cfe6c4" /><path d="M9 4v14M15 6v14" /><circle cx="15" cy="10" r="1.6" fill="#e8553d" stroke="none" /></svg>,
  casa: () => <svg {...base} stroke="#2b2620"><path d="M4 11l8-7 8 7v9H4Z" fill="#f2c14e" /><path d="M10 20v-6h4v6" fill="#a86d42" /></svg>,
  mensagens: () => <svg {...base}><path d="M4 5h16v11H9l-5 4Z" fill="#fff3" /></svg>,
  banco: () => <svg {...base}><path d="M3 9l9-5 9 5" /><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18" /></svg>,
  amor: () => <svg {...base}><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" fill="#fff3" /></svg>,
  imoveis: () => <svg {...base}><path d="M4 11l8-7 8 7v9H4Z" /><path d="M10 20v-5h4v5" /></svg>,
  estudos: () => <svg {...base}><path d="M4 5h6a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H4Z" /><path d="M20 5h-6a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h6Z" /></svg>,
  vagas: () => <svg {...base}><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 13h18" /></svg>,
  rede: () => <svg {...base}><rect x="3" y="6" width="18" height="14" rx="3" /><circle cx="12" cy="13" r="3.5" /><path d="M8 6l1.5-2h5L16 6" /></svg>,
  saude: () => <svg {...base}><path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6Z" /></svg>,
  tudo: () => <svg {...base}><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></svg>,
  contatos: () => <svg {...base}><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></svg>,
};
