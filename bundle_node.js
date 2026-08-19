const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'desktop\\bin');
if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

const nodeExe = process.execPath;
const targetExe = path.join(targetDir, 'node.exe');

fs.copyFileSync(nodeExe, targetExe);
console.log(`Node.exe copiado com sucesso para: ${targetExe} (${fs.statSync(targetExe).size} bytes)`);
