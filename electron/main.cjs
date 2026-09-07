const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const http = require('http');

const PORT = 3210;
let mainWindow;

function waitForServer(url, timeout = 30000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      const req = http.get(url, res => { res.resume(); if (res.statusCode < 500) return resolve(); setTimeout(check, 250); });
      req.on('error', () => {
        if (Date.now() - started > timeout) reject(new Error('Next.js server did not start in time.'));
        else setTimeout(check, 250);
      });
      req.setTimeout(1000, () => req.destroy());
    };
    check();
  });
}

async function startServer() {
  const standaloneDir = path.join(process.resourcesPath, 'app');
  const serverPath = path.join(standaloneDir, 'server.js');
  process.env.NODE_ENV = 'production';
  process.env.PORT = String(PORT);
  process.env.HOSTNAME = '127.0.0.1';
  process.chdir(standaloneDir);
  require(serverPath);
  await waitForServer(`http://127.0.0.1:${PORT}`);
}

async function createWindow() {
  await startServer();
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1100,
    minHeight: 720,
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  await mainWindow.loadURL(`http://127.0.0.1:${PORT}`);
}

app.whenReady().then(createWindow).catch(err => { console.error(err); app.quit(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
