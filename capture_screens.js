import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOTS_DIR = path.join(__dirname, 'manual_assets');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function captureScreenshots() {
  console.log('Iniciando captura de telas em alta resolução...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,960'],
    defaultViewport: { width: 1440, height: 960, deviceScaleFactor: 2 },
  });

  const page = await browser.newPage();

  // 1. Visão Geral
  console.log('Capturando Visão Geral...');
  await page.goto('http://localhost:3001', { waitUntil: 'networkidle0' });
  await page.waitForSelector('.page-body', { timeout: 10000 });
  await page.evaluate(() => new Promise(r => setTimeout(r, 1200)));
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01_visao_geral.png') });

  // 2. Vendas
  console.log('Capturando Vendas e Curva ABC...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('.sidebar-nav-item')).find(el => el.textContent && el.textContent.includes('Vendas'));
    if (btn) btn.click();
  });
  await page.evaluate(() => new Promise(r => setTimeout(r, 1500)));
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02_vendas_curva_abc.png') });

  // 3. Produtos / Estoque
  console.log('Capturando Produtos / Estoque (Faixas de Giro e Estoque Parado)...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('.sidebar-nav-item')).find(el => el.textContent && el.textContent.includes('Produtos / Estoque'));
    if (btn) btn.click();
  });
  await page.evaluate(() => new Promise(r => setTimeout(r, 1500)));
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03_produtos_estoque.png') });

  // 4. Modal Ficha do Produto
  console.log('Capturando Ficha do Produto (Modal)...');
  const clicked = await page.evaluate(() => {
    const firstRowBtn = document.querySelector('.data-table tbody tr button');
    if (firstRowBtn) {
      firstRowBtn.click();
      return true;
    }
    return false;
  });
  if (clicked) {
    await page.evaluate(() => new Promise(r => setTimeout(r, 800)));
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04_ficha_produto_modal.png') });
    // Fechar modal
    await page.evaluate(() => {
      const closeBtn = document.querySelector('.btn-period.active');
      if (closeBtn) closeBtn.click();
    });
    await page.evaluate(() => new Promise(r => setTimeout(r, 500)));
  }

  // 5. Clientes
  console.log('Capturando Clientes & Aniversariantes...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('.sidebar-nav-item')).find(el => el.textContent && el.textContent.includes('Clientes'));
    if (btn) btn.click();
  });
  await page.evaluate(() => new Promise(r => setTimeout(r, 1500)));
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05_clientes_aniversariantes.png') });

  // 6. Comparativo de Lojas
  console.log('Capturando Comparativo de Lojas...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('.sidebar-nav-item')).find(el => el.textContent && el.textContent.includes('Comparativo de Lojas'));
    if (btn) btn.click();
  });
  await page.evaluate(() => new Promise(r => setTimeout(r, 1500)));
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06_comparativo_lojas.png') });

  // 7. Arquivos PBI
  console.log('Capturando Arquivos PBI & Importações...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('.sidebar-nav-item')).find(el => el.textContent && el.textContent.includes('Arquivos PBI'));
    if (btn) btn.click();
  });
  await page.evaluate(() => new Promise(r => setTimeout(r, 1200)));
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07_arquivos_pbi.png') });

  // 8. Lojas & Configurações
  console.log('Capturando Lojas & Configurações...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('.sidebar-nav-item')).find(el => el.textContent && el.textContent.includes('Lojas & Configurações'));
    if (btn) btn.click();
  });
  await page.evaluate(() => new Promise(r => setTimeout(r, 1200)));
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '08_configuracoes_ftp_backup.png') });

  await browser.close();
  console.log('Todas as telas foram capturadas com sucesso!');
}

captureScreenshots().catch(console.error);
