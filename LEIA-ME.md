# Enredo

Simulador de vida pessoal, para jogar localmente. Não tem relação com trabalho nem com faculdade.

- **Escopo e plano técnico (decisões):** Claude Docs pessoal, em https://claude.ai/artifact/NQGgC6wwV9NTjpp7gWEJJ8
  Toda decisão fica lá, não aqui, para sobreviver a uma troca de PC.
- **Código:** esta pasta e o repositório privado https://github.com/Quinferno14/enredo
- **Regra:** nada é construído antes de a parte correspondente do escopo estar fechada.
- **Fase atual:** núcleo jogável completo (marcos 1 a 7) e Revisão 1 em andamento: R1 (tela Vida e tempo dinâmico), R2 (trabalho livre) e R3 (pessoas vivas e pacote vida brasileira) prontas. Próximo: R4 (personalidade com peso, arcos contra repetição, painel ✦ único).

## Como jogar

1. Gere o jogo (só na primeira vez e depois de cada mudança):
   ```
   npm install
   npm run build
   ```
2. Abra `dist/enredo.html` com dois cliques. Funciona offline.

O jogo salva sozinho no navegador (até 5 vidas). Em **Mais → Exportar esta vida** você guarda um backup `.json`.

## Para desenvolver

- `npm run dev`: abre o jogo com recarga automática em http://localhost:5173
- `npm test`: roda os testes do motor e do save, incluindo a simulação de 1.000 vidas

## Estrutura

- `src/motor/`: regras do jogo (seed, vida, relógio, envelhecimento, morte). Não depende das telas.
- `src/save/`: salvar, carregar, exportar e importar.
- `src/conteudo/`: dados (estados, nomes). Cresce sem mexer no motor.
- `src/ui/`: telas (Preact).
