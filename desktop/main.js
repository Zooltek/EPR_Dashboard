const { app, BrowserWindow, Menu, shell, dialog } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

let mainWindow = null;
let serverProcess = null;
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

function getNodeExecutable() {
  const candidates = [
    path.join(process.resourcesPath, 'bin/node.exe'),
    path.join(__dirname, 'bin/node.exe'),
    path.join(app.getAppPath(), 'desktop/bin/node.exe'),
  ];
  const found = candidates.find(p => fs.existsSync(p));
  if (found) {
    log(`Runtime Node embutido encontrado: ${found}`);
    return found;
  }
  log(`Usando runtime Node do sistema.`);
  return 'node';
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

  const nodeBin = getNodeExecutable();
  log(`Iniciando servidor Node.js com: ${nodeBin} "${serverEntry}"`);

  try {
    serverProcess = spawn(nodeBin, [serverEntry], {
      env: {
        ...process.env,
        EPR_DATA_DIR: dataDir,
        PORT: String(PORT),
        CLIENT_DIST_DIR: validClientDist || '',
      },
      cwd: app.getAppPath(),
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    serverProcess.stdout.on('data', (data) => {
      const msg = data.toString().trim();
      log(`[Backend stdout] ${msg}`);
    });

    serverProcess.stderr.on('data', (data) => {
      const msg = data.toString().trim();
      log(`[Backend stderr] ${msg}`);
    });

    serverProcess.on('error', (err) => {
      log(`[Backend ERRO no spawn] ${err.stack || err.message}`);
    });

    serverProcess.on('exit', (code) => {
      log(`[Backend] Processo finalizado com código: ${code}`);
    });

    log('Processo do servidor Express iniciado com sucesso.');
  } catch (err) {
    log(`ERRO CRÍTICO ao iniciar processo do servidor: ${err.stack || err.message}`);
  }
}

function waitForServer(url, timeout = 25000) {
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
        setTimeout(check, 300);
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
        {
          label: 'Fazer Backup dos Dados (.sqlite)',
          click: async () => {
            try {
              const sqliteCandidates = [
                path.join(userDataDir, 'data', 'dashboard.sqlite'),
                path.join(userDataDir, 'dashboard.sqlite'),
                path.join(process.cwd(), 'server/data/dashboard.sqlite'),
                path.join(__dirname, '../server/data/dashboard.sqlite'),
              ];
              const sqliteSource = sqliteCandidates.find(p => fs.existsSync(p));
              if (!sqliteSource) {
                throw new Error('Arquivo do banco de dados (dashboard.sqlite) ainda não foi encontrado em: ' + path.join(userDataDir, 'data'));
              }
              const { filePath } = await dialog.showSaveDialog(mainWindow, {
                title: 'Salvar Backup do Banco de Dados',
                defaultPath: `backup-amura-dashboard-${new Date().toISOString().slice(0, 10)}.sqlite`,
                filters: [{ name: 'SQLite Database', extensions: ['sqlite', 'db'] }],
              });
              if (filePath) {
                fs.copyFileSync(sqliteSource, filePath);
                dialog.showMessageBox(mainWindow, {
                  type: 'info',
                  title: 'Backup Concluído',
                  message: 'Cópia de segurança salva com sucesso!',
                  detail: `Arquivo salvo em:\n${filePath}`,
                });
              }
            } catch (err) {
              dialog.showErrorBox('Erro no Backup', err.message);
            }
          },
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
      ],
    },
    {
      label: 'Ajuda',
      submenu: [
        {
          label: 'Manual do Usuário (PDF)',
          accelerator: 'F1',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('open-help-modal');
            }
          },
        },
        { type: 'separator' },
        {
          label: 'Sobre o Amura Dashboard',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Sobre o Amura Dashboard',
              message: 'Amura Dashboard - Gestão e Inteligência Multilojas',
              detail: `Versão: 1.0.0\nDesenvolvido por: Fabricio\nBanco de Dados: SQLite (AppData)\nPlataforma: ${process.platform}`,
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

  waitForServer(`${appUrl}/api/health`, 25000)
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

  app.on('before-quit', () => {
    if (serverProcess) {
      try {
        serverProcess.kill();
      } catch {}
    }
  });

  app.on('window-all-closed', () => {
    if (serverProcess) {
      try {
        serverProcess.kill();
      } catch {}
    }
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
