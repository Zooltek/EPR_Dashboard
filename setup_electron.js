const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const cacheDir = 'C:\\Users\\Fabricio\\AppData\\Local\\electron\\Cache';
const targetDir = path.join(__dirname, 'node_modules\\electron\\dist');
const pathTxt = path.join(__dirname, 'node_modules\\electron\\path.txt');

if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

if (fs.existsSync(cacheDir)) {
  const zips = fs.readdirSync(cacheDir).filter(f => f.endsWith('.zip'));
  if (zips.length > 0) {
    const zipPath = path.join(cacheDir, zips[0]);
    console.log(`Extracting ${zipPath} to ${targetDir}...`);
    const sevenZa = path.join(__dirname, 'node_modules\\7zip-bin\\win\\x64\\7za_orig.exe');
    execSync(`"${sevenZa}" x -y "${zipPath}" "-o${targetDir}"`, { stdio: 'inherit' });
    fs.writeFileSync(pathTxt, 'electron.exe');
    console.log('Electron dist configured successfully!');
  }
}
