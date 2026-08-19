const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const cacheDir = 'C:\\Users\\Fabricio\\AppData\\Local\\electron-builder\\Cache\\winCodeSign';
const sevenZa = path.join(__dirname, 'node_modules\\7zip-bin\\win\\x64\\7za.exe');

if (fs.existsSync(cacheDir)) {
  const items = fs.readdirSync(cacheDir);
  const archive = items.find(f => f.endsWith('.7z'));
  if (archive) {
    const archivePath = path.join(cacheDir, archive);
    for (const item of items) {
      const dirPath = path.join(cacheDir, item);
      if (fs.statSync(dirPath).isDirectory()) {
        try {
          console.log(`Extracting to ${dirPath}...`);
          execSync(`"${sevenZa}" x -y "-xr!*darwin*" "${archivePath}" "-o${dirPath}"`, { stdio: 'inherit' });
        } catch (err) {
          console.error(`Erro ao extrair para ${dirPath}:`, err.message);
        }
      }
    }
  }
}
console.log('winCodeSign cache fixed!');
