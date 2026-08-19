import puppeteer from 'puppeteer-core';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function testHelp() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1440, height: 960, deviceScaleFactor: 2 }
  });

  const page = await browser.newPage();
  await page.goto('http://localhost:3001', { waitUntil: 'networkidle0' });
  await page.waitForSelector('.page-body', { timeout: 10000 });

  // Test pressing F1
  console.log('Pressionando tecla F1...');
  await page.keyboard.press('F1');
  await page.waitForSelector('.help-modal-container', { timeout: 5000 });
  await page.evaluate(() => new Promise(r => setTimeout(r, 1000)));

  await page.screenshot({ path: path.join(__dirname, 'manual_assets', 'modal_ajuda_f1.png') });
  console.log('Screenshot do Modal de Ajuda salvo em manual_assets/modal_ajuda_f1.png');

  await browser.close();
}

testHelp().catch(console.error);
