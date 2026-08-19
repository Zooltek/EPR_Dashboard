import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ASSETS_DIR = path.join(__dirname, 'manual_assets');
const OUTPUT_PDF = path.join(__dirname, 'Manual_do_Usuario_Amura_Dashboard.pdf');

if (!fs.existsSync(ASSETS_DIR)) {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

function getBase64(filePath) {
  if (!fs.existsSync(filePath)) return '';
  const bitmap = fs.readFileSync(filePath);
  const ext = path.extname(filePath).replace('.', '');
  return `data:image/${ext === 'jpg' ? 'jpeg' : ext};base64,${bitmap.toString('base64')}`;
}

async function captureScreenshots(browser) {
  console.log('Iniciando captura de telas...');
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 960, deviceScaleFactor: 2 });

  // 1. Visão Geral
  console.log('Capturando Visão Geral...');
  await page.goto('http://localhost:3001', { waitUntil: 'networkidle0' });
  await page.waitForSelector('.page-body', { timeout: 10000 });
  await page.evaluate(() => new Promise(r => setTimeout(r, 1200)));
  await page.screenshot({ path: path.join(ASSETS_DIR, '01_visao_geral.png') });

  // 2. Vendas
  console.log('Capturando Vendas e Curva ABC...');
  await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('.menu-item'));
    const btn = items.find(el => el.textContent && el.textContent.includes('Vendas'));
    if (btn) btn.click();
  });
  await page.evaluate(() => new Promise(r => setTimeout(r, 1600)));
  await page.screenshot({ path: path.join(ASSETS_DIR, '02_vendas_curva_abc.png') });

  // 3. Produtos / Estoque
  console.log('Capturando Produtos / Estoque (Faixas de Giro e Estoque Parado)...');
  await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('.menu-item'));
    const btn = items.find(el => el.textContent && el.textContent.includes('Produtos / Estoque'));
    if (btn) btn.click();
  });
  await page.evaluate(() => new Promise(r => setTimeout(r, 1600)));
  await page.screenshot({ path: path.join(ASSETS_DIR, '03_produtos_estoque.png') });

  // 4. Modal Ficha do Produto
  console.log('Capturando Ficha do Produto (Modal)...');
  const clicked = await page.evaluate(() => {
    const firstRow = document.querySelector('.data-table tbody tr');
    if (firstRow) {
      firstRow.click();
      return true;
    }
    return false;
  });
  if (clicked) {
    await page.evaluate(() => new Promise(r => setTimeout(r, 900)));
    await page.screenshot({ path: path.join(ASSETS_DIR, '04_ficha_produto_modal.png') });
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
    const items = Array.from(document.querySelectorAll('.menu-item'));
    const btn = items.find(el => el.textContent && el.textContent.includes('Clientes'));
    if (btn) btn.click();
  });
  await page.evaluate(() => new Promise(r => setTimeout(r, 1500)));
  await page.screenshot({ path: path.join(ASSETS_DIR, '05_clientes_aniversariantes.png') });

  // 6. Comparativo de Lojas
  console.log('Capturando Comparativo de Lojas...');
  await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('.menu-item'));
    const btn = items.find(el => el.textContent && el.textContent.includes('Comparativo de Lojas'));
    if (btn) btn.click();
  });
  await page.evaluate(() => new Promise(r => setTimeout(r, 1500)));
  await page.screenshot({ path: path.join(ASSETS_DIR, '06_comparativo_lojas.png') });

  // 7. Arquivos PBI
  console.log('Capturando Arquivos PBI & Importações...');
  await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('.menu-item'));
    const btn = items.find(el => el.textContent && el.textContent.includes('Arquivos PBI'));
    if (btn) btn.click();
  });
  await page.evaluate(() => new Promise(r => setTimeout(r, 1200)));
  await page.screenshot({ path: path.join(ASSETS_DIR, '07_arquivos_pbi.png') });

  // 8. Lojas & Configurações
  console.log('Capturando Lojas & Configurações...');
  await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('.menu-item'));
    const btn = items.find(el => el.textContent && el.textContent.includes('Lojas & Configura'));
    if (btn) btn.click();
  });
  await page.evaluate(() => new Promise(r => setTimeout(r, 1400)));
  await page.screenshot({ path: path.join(ASSETS_DIR, '08_configuracoes_ftp_backup.png') });

  await page.close();
  console.log('Capturas concluídas com sucesso!');
}

async function buildPDF() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  await captureScreenshots(browser);

  const imgVisaoGeral = getBase64(path.join(ASSETS_DIR, '01_visao_geral.png'));
  const imgVendas = getBase64(path.join(ASSETS_DIR, '02_vendas_curva_abc.png'));
  const imgProdutos = getBase64(path.join(ASSETS_DIR, '03_produtos_estoque.png'));
  const imgModal = getBase64(path.join(ASSETS_DIR, '04_ficha_produto_modal.png'));
  const imgClientes = getBase64(path.join(ASSETS_DIR, '05_clientes_aniversariantes.png'));
  const imgLojas = getBase64(path.join(ASSETS_DIR, '06_comparativo_lojas.png'));
  const imgPbi = getBase64(path.join(ASSETS_DIR, '07_arquivos_pbi.png'));
  const imgConfig = getBase64(path.join(ASSETS_DIR, '08_configuracoes_ftp_backup.png'));

  const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Manual do Usuário — Amura Dashboard</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap');

    @page {
      size: A4 portrait;
      margin: 0;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #1e293b;
      background: #ffffff;
      line-height: 1.5;
      font-size: 10pt;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* CAPA OFICIAL */
    .cover-page {
      width: 100%;
      height: 297mm;
      background: linear-gradient(180deg, #18103c 0%, #110a2c 100%);
      color: #ffffff;
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      page-break-after: always;
      overflow: hidden;
    }

    .cover-stripe-top {
      height: 20px;
      background: #f97316;
      width: 100%;
    }

    .cover-stripe-bottom {
      height: 20px;
      background: #f97316;
      width: 100%;
    }

    .cover-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      padding: 20px 50px;
    }

    .logo-container {
      background: #ffffff;
      border-radius: 20px;
      padding: 24px 48px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      box-shadow: 0 15px 35px rgba(0, 0, 0, 0.4);
      margin-bottom: 60px;
    }

    .logo-symbol {
      width: 44px;
      height: 44px;
      background: linear-gradient(135deg, #f97316 0%, #dc2626 50%, #7c3aed 100%);
      clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
      border-radius: 4px;
    }

    .logo-text-group {
      text-align: left;
    }

    .logo-brand-title {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 26pt;
      font-weight: 800;
      color: #0f172a;
      line-height: 1;
      letter-spacing: -1px;
    }

    .logo-brand-sub {
      font-size: 9pt;
      font-weight: 600;
      color: #f97316;
      letter-spacing: 2px;
      text-transform: uppercase;
    }

    .cover-subtitle-tag {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 10pt;
      letter-spacing: 5px;
      color: #f97316;
      text-transform: uppercase;
      font-weight: 700;
      margin-bottom: 16px;
    }

    .cover-title {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 34pt;
      font-weight: 800;
      line-height: 1.15;
      color: #ffffff;
      margin-bottom: 22px;
      max-width: 650px;
    }

    .cover-title span.highlight {
      color: #f97316;
    }

    .cover-description {
      font-size: 12pt;
      color: #cbd5e1;
      max-width: 540px;
      line-height: 1.5;
      font-weight: 400;
      margin-bottom: 30px;
    }

    .cover-footer {
      display: flex;
      justify-content: space-around;
      width: 100%;
      padding: 24px 60px 32px 60px;
      text-align: center;
    }

    .cover-footer-col {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .cover-footer-label {
      font-size: 7.5pt;
      letter-spacing: 2px;
      color: #f97316;
      text-transform: uppercase;
      font-weight: 700;
    }

    .cover-footer-value {
      font-size: 10pt;
      color: #ffffff;
      font-weight: 700;
    }

    /* PÁGINAS DE CONTEÚDO */
    .content-page {
      height: 297mm;
      max-height: 297mm;
      padding: 30px 40px;
      page-break-after: always;
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
    }

    .page-main-flow {
      flex: 1;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 8px;
      margin-bottom: 16px;
      font-size: 8pt;
      color: #64748b;
      font-weight: 600;
    }

    .page-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid #e2e8f0;
      padding-top: 8px;
      font-size: 8pt;
      color: #94a3b8;
      font-weight: 500;
    }

    h1.chapter-title {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 16pt;
      font-weight: 800;
      color: #0f172a;
      border-left: 4px solid #f97316;
      padding-left: 10px;
      margin-bottom: 12px;
      line-height: 1.2;
    }

    h2.section-title {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 11.5pt;
      font-weight: 700;
      color: #1e293b;
      margin-top: 12px;
      margin-bottom: 8px;
    }

    p {
      margin-bottom: 8px;
      color: #334155;
      font-size: 9.5pt;
      text-align: justify;
    }

    /* SCREENSHOT CARD */
    .screenshot-card {
      margin: 10px 0 12px 0;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 6px;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
    }

    .screenshot-card img {
      width: 100%;
      height: auto;
      max-height: 220px;
      object-fit: contain;
      border-radius: 6px;
      display: block;
      border: 1px solid #cbd5e1;
    }

    .screenshot-caption {
      font-size: 7.5pt;
      color: #64748b;
      text-align: center;
      margin-top: 4px;
      font-style: italic;
    }

    /* TABELAS */
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0;
      font-size: 8.5pt;
    }

    table.data-table th {
      background: #0f172a;
      color: #ffffff;
      text-align: left;
      padding: 6px 8px;
      font-weight: 600;
      border: 1px solid #0f172a;
    }

    table.data-table td {
      padding: 5px 8px;
      border: 1px solid #e2e8f0;
      color: #334155;
      vertical-align: middle;
    }

    table.data-table tr:nth-child(even) td {
      background: #f8fafc;
    }

    table.data-table td strong {
      color: #0f172a;
    }

    /* ALERT BOXES */
    .alert-box {
      border-radius: 6px;
      padding: 8px 12px;
      margin: 8px 0;
      font-size: 8.5pt;
      line-height: 1.4;
    }

    .alert-box.info {
      background: #eff6ff;
      border-left: 3px solid #3b82f6;
      color: #1e40af;
    }

    .alert-box.tip {
      background: #f0fdf4;
      border-left: 3px solid #10b981;
      color: #065f46;
    }

    .alert-box.warning {
      background: #fffbeb;
      border-left: 3px solid #f59e0b;
      color: #92400e;
    }

    /* BADGES */
    .badge {
      display: inline-block;
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 7.5pt;
      font-weight: 700;
      text-transform: uppercase;
    }

    .badge.success { background: #dcfce7; color: #166534; }
    .badge.warning { background: #fef3c7; color: #92400e; }
    .badge.danger { background: #fee2e2; color: #991b1b; }
    .badge.info { background: #e0e7ff; color: #3730a3; }

    /* SUMÁRIO */
    .toc-list {
      list-style: none;
      margin: 16px 0;
    }

    .toc-item {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      padding: 8px 0;
      border-bottom: 1px dashed #cbd5e1;
      font-size: 9.5pt;
      font-weight: 500;
    }

    .toc-item strong {
      color: #0f172a;
    }

    .toc-dots {
      flex: 1;
      margin: 0 8px;
      border-bottom: 1px dotted #94a3b8;
    }

    .toc-page {
      font-weight: 700;
      color: #f97316;
    }
  </style>
</head>
<body>

  <!-- ==================== CAPA ==================== -->
  <div class="cover-page">
    <div class="cover-stripe-top"></div>
    
    <div class="cover-content">
      <div class="logo-container">
        <div class="logo-symbol"></div>
        <div class="logo-text-group">
          <div class="logo-brand-title">amura</div>
          <div class="logo-brand-sub">sistemas</div>
        </div>
      </div>

      <div class="cover-subtitle-tag">MANUAL DO USUÁRIO</div>
      
      <h1 class="cover-title">
        Amura <span class="highlight">Dashboard</span>
      </h1>

      <p class="cover-description">
        Guia completo para acompanhamento de vendas em tempo real, gestão inteligente de estoque, análise de curva ABC, clientes e comparativo de lojas.
      </p>
    </div>

    <div>
      <div class="cover-footer">
        <div class="cover-footer-col">
          <span class="cover-footer-label">VERSÃO</span>
          <span class="cover-footer-value">1.0</span>
        </div>
        <div class="cover-footer-col">
          <span class="cover-footer-label">EDIÇÃO</span>
          <span class="cover-footer-value">Agosto • 2026</span>
        </div>
        <div class="cover-footer-col">
          <span class="cover-footer-label">PUBLICADO POR</span>
          <span class="cover-footer-value">Amura Sistemas</span>
        </div>
      </div>
      <div class="cover-stripe-bottom"></div>
    </div>
  </div>

  <!-- ==================== PÁGINA 1: SUMÁRIO & INTRO ==================== -->
  <div class="content-page">
    <div>
      <div class="page-header">
        <span>Amura Dashboard • Manual do Usuário</span>
        <span>Sumário Executivo</span>
      </div>

      <div class="page-main-flow">
        <h1 class="chapter-title">📑 Sumário Executivo</h1>
        <p>Este documento é o guia definitivo para capacitação de gestores, diretores e operadores no uso inteligente do <strong>Amura Dashboard</strong>. A ferramenta traduz movimentações fiscais e gerenciais em painéis dinâmicos de alta assertividade.</p>

        <ul class="toc-list">
          <li class="toc-item">
            <strong>1. Navegação, Filtros & Status das Lojas</strong>
            <span class="toc-dots"></span>
            <span class="toc-page">Página 2</span>
          </li>
          <li class="toc-item">
            <strong>2. Módulo: Visão Geral (Dashboard Executivo)</strong>
            <span class="toc-dots"></span>
            <span class="toc-page">Página 3</span>
          </li>
          <li class="toc-item">
            <strong>3. Módulo: Vendas, Horários & Curva ABC (20% / 30% / 50%)</strong>
            <span class="toc-dots"></span>
            <span class="toc-page">Página 4</span>
          </li>
          <li class="toc-item">
            <strong>4. Módulo: Produtos / Estoque & Faixas de Giro</strong>
            <span class="toc-dots"></span>
            <span class="toc-page">Página 5</span>
          </li>
          <li class="toc-item">
            <strong>5. Módulo: Estoque Parado & Ficha do Produto</strong>
            <span class="toc-dots"></span>
            <span class="toc-page">Página 6</span>
          </li>
          <li class="toc-item">
            <strong>6. Módulo: Clientes, Aniversariantes & Comparativo de Lojas</strong>
            <span class="toc-dots"></span>
            <span class="toc-page">Página 7</span>
          </li>
          <li class="toc-item">
            <strong>7. Auditoria PBI, Configurações de FTP & Backup</strong>
            <span class="toc-dots"></span>
            <span class="toc-page">Página 8</span>
          </li>
        </ul>

        <div class="alert-box tip">
          <strong>💡 Acesso Rápido:</strong> O sistema opera tanto em navegadores quanto em aplicativo Desktop Windows integrado, atualizando automaticamente após o consumo de cada arquivo PBI.
        </div>
      </div>
    </div>

    <div class="page-footer">
      <span>Amura Sistemas • Inteligência Comercial</span>
      <span>Página 1</span>
    </div>
  </div>

  <!-- ==================== PÁGINA 2: NAVEGAÇÃO & FILTROS ==================== -->
  <div class="content-page">
    <div>
      <div class="page-header">
        <span>Amura Dashboard • Manual do Usuário</span>
        <span>Capítulo 1 • Navegação e Filtros</span>
      </div>

      <div class="page-main-flow">
        <h1 class="chapter-title">1. Navegação & Filtros em Tempo Real</h1>
        <p>A barra superior de controle permite segmentar informações em segundos sem recarregar a página.</p>

        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 25%;">Dimensão</th>
              <th style="width: 40%;">Opções Disponíveis</th>
              <th style="width: 35%;">Finalidade Gerencial</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Período</strong></td>
              <td>Hoje, 3 dias, 7 dias, 15 dias, Este Mês, Mês Anterior, Customizado</td>
              <td>Permite comparar o dia a dia, semanas e fechar resultados mensais consolidados.</td>
            </tr>
            <tr>
              <td><strong>Lojas</strong></td>
              <td>Todas as Lojas ou Filtro por Filial</td>
              <td>Isola o desempenho de uma filial ou consolida toda a rede da empresa.</td>
            </tr>
            <tr>
              <td><strong>Vendedores</strong></td>
              <td>Lista dinâmica de colaboradores</td>
              <td>Mede o rendimento individual do vendedor na loja selecionada.</td>
            </tr>
            <tr>
              <td><strong>Categorias</strong></td>
              <td>Marca, Grupo, Família, Coleção</td>
              <td>Permite auditar linhas de produtos específicas e marcas parceiras.</td>
            </tr>
          </tbody>
        </table>

        <h2 class="section-title">Status de Lojas & Sincronização</h2>
        <p>A pílula de status no canto superior direito indica a pontualidade dos dados:</p>
        <ul>
          <li><span class="badge success">X de Y lojas atualizadas</span>: Indica quantas lojas da rede já enviaram a carga de hoje com sucesso.</li>
          <li><span class="badge info">Aguardando primeiro PBI</span>: Indica que a aplicação aguarda a primeira sincronização de dados.</li>
        </ul>

        <div class="alert-box info" style="margin-top: 15px;">
          <strong>🌓 Tema Visual Claro / Escuro:</strong> Alterne entre Modo Escuro e Modo Claro com um clique para melhor conforto visual em qualquer luminosidade.
        </div>
      </div>
    </div>

    <div class="page-footer">
      <span>Amura Sistemas • Inteligência Comercial</span>
      <span>Página 2</span>
    </div>
  </div>

  <!-- ==================== PÁGINA 3: VISÃO GERAL ==================== -->
  <div class="content-page">
    <div>
      <div class="page-header">
        <span>Amura Dashboard • Manual do Usuário</span>
        <span>Capítulo 2 • Visão Geral</span>
      </div>

      <div class="page-main-flow">
        <h1 class="chapter-title">2. Módulo: Visão Geral Executiva</h1>
        <p>Consolida os macroindicadores de vendas, lucratividade bruta e evolução diária.</p>

        <div class="screenshot-card">
          <img src="${imgVisaoGeral}" alt="Tela Visão Geral">
          <div class="screenshot-caption">Figura 1: Painel Executivo com KPIs, série diária e ranking de lojas.</div>
        </div>

        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 25%;">KPI</th>
              <th style="width: 40%;">Fórmula de Cálculo</th>
              <th style="width: 35%;">Pergunta de Negócio</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Faturamento Líquido</strong></td>
              <td><code>Soma(Itens Líquidos) - Cancelamentos</code></td>
              <td><em>Qual é a receita real gerada no período?</em></td>
            </tr>
            <tr>
              <td><strong>Ticket Médio</strong></td>
              <td><code>Faturamento Líquido / Quantidade de Vendas</code></td>
              <td><em>Quanto cada cliente gasta por compra em média?</em></td>
            </tr>
            <tr>
              <td><strong>Itens por Venda (PA)</strong></td>
              <td><code>Total Peças Vendidas / Quantidade de Vendas</code></td>
              <td><em>A equipe está executando venda cruzada?</em></td>
            </tr>
            <tr>
              <td><strong>Margem Bruta (%)</strong></td>
              <td><code>((Faturamento - Custo) / Faturamento) × 100</code></td>
              <td><em>Qual a eficiência de lucro bruto obtida nas vendas?</em></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="page-footer">
      <span>Amura Sistemas • Inteligência Comercial</span>
      <span>Página 3</span>
    </div>
  </div>

  <!-- ==================== PÁGINA 4: VENDAS & CURVA ABC ==================== -->
  <div class="content-page">
    <div>
      <div class="page-header">
        <span>Amura Dashboard • Manual do Usuário</span>
        <span>Capítulo 3 • Vendas e Curva ABC</span>
      </div>

      <div class="page-main-flow">
        <h1 class="chapter-title">3. Módulo: Vendas, Horários & Curva ABC</h1>
        <p>Aprofunda o comportamento comercial por horário de pico e relevância de sortimento.</p>

        <div class="screenshot-card">
          <img src="${imgVendas}" alt="Módulo Vendas">
          <div class="screenshot-caption">Figura 2: Vendas por horário com zoom e Curva ABC (20% A / 30% B / 50% C).</div>
        </div>

        <h2 class="section-title">Análise de Curva ABC de Produtos</h2>
        <table class="data-table">
          <thead>
            <tr>
              <th>Classe</th>
              <th>Proporção</th>
              <th>Diretriz Estratégica</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><span class="badge success">Classe A</span></td>
              <td><strong>Top 20%</strong> dos itens</td>
              <td><strong>Alta Relevância</strong>: Geram a maior parte da receita/volume. Prioridade máxima em reposição.</td>
            </tr>
            <tr>
              <td><span class="badge warning">Classe B</span></td>
              <td><strong>Próximos 30%</strong></td>
              <td><strong>Média Relevância</strong>: Giro regular e estável.</td>
            </tr>
            <tr>
              <td><span class="badge danger">Classe C</span></td>
              <td><strong>50% restantes</strong></td>
              <td><strong>Cauda Longa</strong>: Menor saída unitária; compras devem ser comedidas.</td>
            </tr>
          </tbody>
        </table>

        <div class="alert-box info">
          <strong>💵 Filtro Duplo:</strong> Alterne entre <strong>Valor (R$)</strong> e <strong>Quantidade (un)</strong> para descobrir tanto os produtos mais lucrativos quanto os mais movimentados fisicamente.
        </div>
      </div>
    </div>

    <div class="page-footer">
      <span>Amura Sistemas • Inteligência Comercial</span>
      <span>Página 4</span>
    </div>
  </div>

  <!-- ==================== PÁGINA 5: ESTOQUE & FAIXAS DE GIRO ==================== -->
  <div class="content-page">
    <div>
      <div class="page-header">
        <span>Amura Dashboard • Manual do Usuário</span>
        <span>Capítulo 4 • Produtos e Estoque</span>
      </div>

      <div class="page-main-flow">
        <h1 class="chapter-title">4. Módulo: Produtos & Faixas de Giro</h1>
        <p>Mapeia o capital investido e a velocidade de circulação das mercadorias.</p>

        <div class="screenshot-card">
          <img src="${imgProdutos}" alt="Módulo Produtos e Estoque">
          <div class="screenshot-caption">Figura 3: Faixas de Giro de Estoque e Top 10 Estoque Parado.</div>
        </div>

        <table class="data-table">
          <thead>
            <tr>
              <th>Faixa de Giro</th>
              <th>Classificação</th>
              <th>Ação Recomendada</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>🟢 <strong>Até 30 dias</strong></td>
              <td><span class="badge success">Giro Saudável</span></td>
              <td>Capital circulando normalmente com alta liquidez.</td>
            </tr>
            <tr>
              <td>🟡 <strong>31 a 60 dias</strong></td>
              <td><span class="badge warning">Giro Moderado</span></td>
              <td>Acompanhar ritmo de saída e planejar reposição.</td>
            </tr>
            <tr>
              <td>🟠 <strong>61 a 90 dias</strong></td>
              <td><span class="badge warning">Alerta de Desaceleração</span></td>
              <td>Reposicionar na loja e dar destaque aos consultores.</td>
            </tr>
            <tr>
              <td>🔴 <strong>+90 dias</strong></td>
              <td><span class="badge danger">Estoque Parado</span></td>
              <td>Capital imobilizado. Realizar promoções ou liquidação.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="page-footer">
      <span>Amura Sistemas • Inteligência Comercial</span>
      <span>Página 5</span>
    </div>
  </div>

  <!-- ==================== PÁGINA 6: ESTOQUE PARADO & FICHA ==================== -->
  <div class="content-page">
    <div>
      <div class="page-header">
        <span>Amura Dashboard • Manual do Usuário</span>
        <span>Capítulo 5 • Estoque Parado e Ficha</span>
      </div>

      <div class="page-main-flow">
        <h1 class="chapter-title">5. Estoque Parado & Ficha do Produto</h1>
        <p>Identificação cirúrgica de onde o dinheiro da empresa está retido sem movimentação.</p>

        <div class="screenshot-card">
          <img src="${imgModal}" alt="Ficha do Produto">
          <div class="screenshot-caption">Figura 4: Ficha detalhada do produto com estoque, custo unitário e inatividade.</div>
        </div>

        <h2 class="section-title">Seletor de Inatividade [ 30d | 60d | 90d | 180d ]</h2>
        <p>Ao selecionar a quantidade de dias sem venda, o painel recalcula instantaneamente o <strong>Capital Total Parado</strong> e exibe o gráfico dos 10 produtos que mais concentram valor retido.</p>

        <h2 class="section-title">Ficha Completa do Produto (Modal)</h2>
        <p>Ao clicar em qualquer produto da lista ou do gráfico, a ficha exibe:</p>
        <ul>
          <li><strong>Estoque Físico</strong> e <strong>Custo Unitário de Compra</strong>.</li>
          <li><strong>Valor Total Investido Parado</strong> em Reais.</li>
          <li><strong>Preço de Tabela</strong> e projeção de faturamento.</li>
          <li><strong>Data exata da última venda</strong> e total de dias sem movimentação.</li>
        </ul>
      </div>
    </div>

    <div class="page-footer">
      <span>Amura Sistemas • Inteligência Comercial</span>
      <span>Página 6</span>
    </div>
  </div>

  <!-- ==================== PÁGINA 7: CLIENTES & COMPARATIVO ==================== -->
  <div class="content-page">
    <div>
      <div class="page-header">
        <span>Amura Dashboard • Manual do Usuário</span>
        <span>Capítulo 6 • Clientes e Comparativo</span>
      </div>

      <div class="page-main-flow">
        <h1 class="chapter-title">6. Clientes & Comparativo de Lojas</h1>

        <h2 class="section-title">Módulo: Clientes & Aniversariantes</h2>
        <div class="screenshot-card">
          <img src="${imgClientes}" alt="Módulo Clientes">
          <div class="screenshot-caption">Figura 5: Aniversariantes do período e ranking de melhores clientes.</div>
        </div>

        <p>Permite ações ativas de CRM: envio de cupons de aniversário e identificação de clientes VIPs com maior volume de compras.</p>

        <h2 class="section-title">Módulo: Comparativo de Lojas</h2>
        <div class="screenshot-card">
          <img src="${imgLojas}" alt="Comparativo de Lojas">
          <div class="screenshot-caption">Figura 6: Ranking e matriz comparativa de desempenho entre lojas.</div>
        </div>
      </div>
    </div>

    <div class="page-footer">
      <span>Amura Sistemas • Inteligência Comercial</span>
      <span>Página 7</span>
    </div>
  </div>

  <!-- ==================== PÁGINA 8: CARGAS, CONFIGURAÇÕES & BACKUP ==================== -->
  <div class="content-page">
    <div>
      <div class="page-header">
        <span>Amura Dashboard • Manual do Usuário</span>
        <span>Capítulo 7 • Cargas e Configurações</span>
      </div>

      <div class="page-main-flow">
        <h1 class="chapter-title">7. Auditoria PBI, Configurações & Backup</h1>

        <h2 class="section-title">Arquivos PBI & Sincronização em Tempo Real</h2>
        <div class="screenshot-card">
          <img src="${imgPbi}" alt="Arquivos PBI">
          <div class="screenshot-caption">Figura 7: Auditoria de importações e histórico de cargas PBI.</div>
        </div>

        <h2 class="section-title">Configurações de FTP & Backup de Dados Locais</h2>
        <div class="screenshot-card">
          <img src="${imgConfig}" alt="Configurações e Backup">
          <div class="screenshot-caption">Figura 8: Presets FTP (VixHost / UOLHost) e rotina de backup.</div>
        </div>

        <div class="alert-box tip">
          <strong>💾 Backup Seguro:</strong> Realize backups periódicos diretamente pela interface para salvar cópias carimbadas com data e hora do banco de dados local.
        </div>
      </div>
    </div>

    <div class="page-footer">
      <span>Amura Sistemas • Inteligência Comercial</span>
      <span>Página 8</span>
    </div>
  </div>

</body>
</html>
  `;

  const htmlPath = path.join(__dirname, 'manual_pdf.html');
  fs.writeFileSync(htmlPath, htmlContent, 'utf-8');
  console.log('HTML compilado com sucesso em manual_pdf.html!');

  console.log('Renderizando PDF com Chrome headless...');
  const page = await browser.newPage();
  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });
  await page.evaluate(() => new Promise(r => setTimeout(r, 1500)));

  await page.pdf({
    path: OUTPUT_PDF,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '0mm',
      bottom: '0mm',
      left: '0mm',
      right: '0mm',
    },
  });

  await browser.close();
  console.log(`PDF gerado com sucesso em: ${OUTPUT_PDF}`);
}

buildPDF().catch(console.error);
