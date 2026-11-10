// Renomeia o build para enredo.html, o arquivo que se abre para jogar.
import { renameSync } from 'node:fs';
renameSync('dist/index.html', 'dist/enredo.html');
console.log('Pronto: dist/enredo.html');
