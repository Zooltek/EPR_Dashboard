const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const sevenZa = path.join(__dirname, 'node_modules\\7zip-bin\\win\\x64\\7za.exe');
const sevenZaOrig = path.join(__dirname, 'node_modules\\7zip-bin\\win\\x64\\7za_orig.exe');

if (!fs.existsSync(sevenZaOrig) && fs.existsSync(sevenZa)) {
  fs.renameSync(sevenZa, sevenZaOrig);
}

const csc = 'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe';
const wrapperSrc = path.join(__dirname, 'Wrapper.cs');

execSync(`"${csc}" /out:"${sevenZa}" "${wrapperSrc}"`, { stdio: 'inherit' });
console.log('7za wrapper compiled successfully!');
