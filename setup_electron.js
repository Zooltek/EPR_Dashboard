/**
 * BUILD-ONLY UTILITY: Extração de cache do Electron para empacotamento offline.
 * Este script é estritamente de uso interno em tempo de compilação.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const cacheDir = path.join(process.env.USERPROFILE || 'C:\\Users\\Fabricio', 'AppData', 'Local', 'electron', 'Cache');
const targetDir = path.join(__dirname, 'node_modules', 'electron', 'dist');
const pathTxt = path.join(__dirname, 'node_modules', 'electron', 'path.txt');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

if (fs.existsSync(cacheDir)) {
  const zips = fs.readdirSync(cacheDir).filter(f => f.endsWith('.zip'));
  if (zips.length > 0) {
    const zipPath = path.join(cacheDir, zips[0]);
    console.log(`Extracting ${zipPath} to ${targetDir}...`);
    const sevenZa = path.join(__dirname, 'node_modules', '7zip-bin', 'win', 'x64', '7za_orig.exe');
    if (fs.existsSync(sevenZa) && fs.existsSync(zipPath)) {
      execFileSync(sevenZa, ['x', '-y', zipPath, `-o${targetDir}`], { stdio: 'inherit' });
      fs.writeFileSync(pathTxt, 'electron.exe');
      console.log('Electron dist configured successfully!');
    }
  }
}
