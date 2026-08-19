const { app, BrowserWindow, Menu, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');

let mainWindow = null;
const PORT = process.env.PORT || 3001;

// Define Persistent AppData directory for SQLite, Downloads, and Logs
const userDataDir = app.getPath('userData');
const dataDir = path.join(userDataDir, 'data');
const downloadsDir = path.join(userDataDir, 'downloads');
const logFile = path.join(userDataDir, 'app_debug.log');

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(downloadsDir)) fs.mkdirSync(downloadsDir, { recursive: true });

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try {
    fs.appendFileSync(logFile, line);
  } catch {}
  console.log(msg);
}

log(`=== Iniciando Amura Dashboard (v1.0.0) ===`);
log(`UserData: ${userDataDir}`);
log(`AppPath: ${app.getAppPath()}`);

process.env.EPR_DATA_DIR = dataDir;
process.env.PORT = String(PORT);

// Set Client Dist path for express static file serving
const clientDistCandidates = [
  path.join(app.getAppPath(), 'client/dist'),
  path.join(__dirname, '../client/dist'),
  path.join(process.resourcesPath, 'app/client/dist'),
  path.join(process.resourcesPath, 'client/dist'),
];
const validClientDist = clientDistCandidates.find(p => fs.existsSync(p));
if (validClientDist) {
  process.env.CLIENT_DIST_DIR = validClientDist;
  log(`Client Dist encontrado em: ${validClientDist}`);
} else {
  log(`AVISO: Nenhum client/dist encontrado nas rotas candidatas.`);
}

function startBackendServer() {
  const serverCandidates = [
    path.join(app.getAppPath(), 'server/dist/index.js'),
    path.join(__dirname, '../server/dist/index.js'),
    path.join(process.resourcesPath, 'app/server/dist/index.js'),
    path.join(process.resourcesPath, 'server/dist/index.js'),
  ];

  const serverEntry = serverCandidates.find(p => fs.existsSync(p));

  if (!serverEntry) {
    const err = `Arquivo do servidor (index.js) não foi encontrado! Buscado em: ${serverCandidates.join(', ')}`;
    log(err);
    return;
  }

  log(`Iniciando backend a partir de: ${serverEntry}`);
  try {
    require(serverEntry);
    log('Backend Express carregado com sucesso.');
  } catch (err) {
    log(`ERRO CRÍTICO ao carregar backend: ${err.stack || err.message}`);
  }
}

function waitForServer(url, timeout = 20000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    function check() {
      http.get(url, (res) => {
        if (res.statusCode === 200) {
          resolve(true);
        } else {
          retry();
        }
      }).on('error', () => {
        retry();
      });
    }

    function retry() {
      if (Date.now() - start > timeout) {
        reject(new Error(`Servidor backend não respondeu na porta ${PORT} após ${timeout}ms`));
      } else {
        setTimeout(check, 400);
      }
    }

    check();
  });
}

function createMainWindow() {
  const iconCandidates = [
    path.join(app.getAppPath(), 'desktop/icon.png'),
    path.join(__dirname, 'icon.png'),
    path.join(app.getAppPath(), 'Logo Amura.png'),
    path.join(__dirname, '../Logo Amura.png'),
  ];
  const iconPath = iconCandidates.find(p => fs.existsSync(p));

  mainWindow = new BrowserWindow({
    title: 'Amura Dashboard - Inteligência e Gestão Multilojas',
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 650,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    backgroundColor: '#0f172a',
    show: false,
  });

  const appMenu = Menu.buildFromTemplate([
    {
      label: 'Arquivo',
      submenu: [
        {
          label: 'Abrir no Navegador Padrão',
          click: () => shell.openExternal(`http://localhost:${PORT}`),
        },
        {
          label: 'Abrir Pasta de Dados (AppData)',
          click: () => shell.openPath(userDataDir),
        },
        {
          label: 'Ver Arquivo de Log',
          click: () => shell.openPath(logFile),
        },
        { type: 'separator' },
        { label: 'Sair', role: 'quit' },
      ],
    },
    {
      label: 'Exibir',
      submenu: [
        { label: 'Recarregar', role: 'reload', accelerator: 'CmdOrCtrl+R' },
        { label: 'Forçar Recarregamento', role: 'forceReload', accelerator: 'CmdOrCtrl+Shift+R' },
        { type: 'separator' },
        { label: 'Alternar Tela Cheia', role: 'togglefullscreen' },
        { label: 'Ferramentas do Desenvolvedor (DevTools)', role: 'toggleDevTools', accelerator: 'F12' },
      ],
    },
    {
      label: 'Ajuda',
      submenu: [
        {
          label: 'Sobre o Amura Dashboard',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Sobre o Amura Dashboard',
              message: 'Amura Dashboard - Gestão e Inteligência Multilojas',
              detail: `Versão: 1.0.0\nDesenvolvido por Zooltek\nBanco de Dados: SQLite (AppData)\nPlataforma: ${process.platform}`,
            });
          },
        },
      ],
    },
  ]);

  Menu.setApplicationMenu(appMenu);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  const appUrl = `http://localhost:${PORT}`;

  waitForServer(`${appUrl}/api/health`, 20000)
    .then(() => {
      log(`Conectado ao backend com sucesso! Carregando: ${appUrl}`);
      mainWindow.loadURL(appUrl);
    })
    .catch((err) => {
      log(`Falha ao aguardar o servidor: ${err.message}`);
      let logContent = '';
      try {
        logContent = fs.readFileSync(logFile, 'utf8');
      } catch {}

      const errorHtml = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <style>
            body { background-color: #0f172a; color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; }
            h2 { color: #38bdf8; }
            .box { background: #1e293b; border-radius: 8px; padding: 20px; border: 1px solid #334155; margin-top: 15px; }
            pre { background: #090d16; color: #fbbf24; padding: 12px; border-radius: 6px; overflow: auto; max-height: 250px; font-size: 13px; }
            button { background: #0284c7; color: #fff; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600; margin-top: 15px; }
            button:hover { background: #0369a1; }
          </style>
        </head>
        <body>
          <h2>Amura Dashboard - Inicialização do Servidor</h2>
          <div class="box">
            <p><strong>Aviso:</strong> ${err.message}</p>
            <p>Logs do sistema (${logFile}):</p>
            <pre>${logContent || 'Nenhum log gravado ainda.'}</pre>
            <button onclick="window.location.reload()">Tentar Novamente</button>
          </div>
        </body>
        </html>
      `;
      mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHtml)}`);
      mainWindow.show();
    });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    startBackendServer();
    createMainWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
