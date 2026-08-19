/**
 * BUILD-ONLY UTILITY: Compilação segura do Wrapper de 7za para empacotamento NSIS.
 * Este script é estritamente de uso interno em tempo de compilação.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const sevenZa = path.join(__dirname, 'node_modules', '7zip-bin', 'win', 'x64', '7za.exe');
const sevenZaOrig = path.join(__dirname, 'node_modules', '7zip-bin', 'win', 'x64', '7za_orig.exe');

if (!fs.existsSync(sevenZaOrig) && fs.existsSync(sevenZa)) {
  fs.renameSync(sevenZa, sevenZaOrig);
}

const csc = 'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe';
const wrapperSrc = path.join(__dirname, 'Wrapper.cs');

if (!fs.existsSync(csc)) {
  console.warn('[Build Wrapper] csc.exe não encontrado em:', csc);
  process.exit(0);
}

if (!fs.existsSync(wrapperSrc)) {
  console.warn('[Build Wrapper] Wrapper.cs não encontrado em:', wrapperSrc);
  process.exit(0);
}

// Execução segura com array de argumentos isolados sem interpolação de shell
execFileSync(csc, [`/out:${sevenZa}`, wrapperSrc], { stdio: 'inherit' });
console.log('7za wrapper compiled successfully!');
