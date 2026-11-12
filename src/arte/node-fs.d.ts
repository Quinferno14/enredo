// Só o que a folha de prova usa do Node (o projeto não depende de @types/node).
declare module 'node:fs' {
  export function mkdirSync(caminho: string, opcoes?: { recursive?: boolean }): void;
  export function writeFileSync(caminho: string, dados: string): void;
}
