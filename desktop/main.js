const { app, BrowserWindow, Menu, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');

let mainWindow = null;
let serverInstance = null;
const PORT = process.env.PORT || 3001;

// Define Persistent AppData directory for SQLite and Downloads
const userDataDir = app.getPath('userData');
const dataDir = path.join(userDataDir, 'data');
const downloadsDir = path.join(userDataDir, 'downloads');

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(downloadsDir)) fs.mkdirSync(downloadsDir, { recursive: true });

process.env.EPR_DATA_DIR = dataDir;
process.env.PORT = String(PORT);

function startBackendServer() {
  try {
    // Require backend bundled dist
    const serverEntry = path.join(__dirname, '../server/dist/index.js');
    if (fs.existsSync(serverEntry)) {
      require(serverEntry);
      console.log('[Desktop] Backend Express iniciado via dist/index.js');
    } else {
      console.error('[Desktop] Arquivo server/dist/index.js não encontrado!');
    }
  } catch (err) {
    console.error('[Desktop] Erro ao inicializar o servidor backend:', err);
  }
}

function waitForServer(url, timeout = 15000) {
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
        reject(new Error(`Servidor não respondeu dentro de ${timeout}ms`));
      } else {
        setTimeout(check, 300);
      }
    }

    check();
  });
}

function createMainWindow() {
  const iconPath = path.join(__dirname, '../Logo Amura.png');

  mainWindow = new BrowserWindow({
    title: 'EPR Dashboard - Gestão Multilojas',
    width: 1366,
    height: 850,
    minWidth: 1024,
    minHeight: 650,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
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
          label: 'Sobre o EPR Dashboard',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Sobre o EPR Dashboard',
              message: 'EPR Dashboard - Gestão e Inteligência Multilojas',
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

  waitForServer(`${appUrl}/api/health`, 15000)
    .then(() => {
      mainWindow.loadURL(appUrl);
    })
    .catch((err) => {
      console.error(err);
      mainWindow.loadURL(`data:text/html,<h2>Erro ao inicializar backend</h2><p>${err.message}</p>`);
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
