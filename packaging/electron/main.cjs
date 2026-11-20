const { app, BrowserWindow, protocol } = require('electron');
const path = require('path');
const fs = require('fs');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
};

const distDir = path.join(__dirname, 'dist');

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 600,
    title: 'Beacon of St. Joseph',
    backgroundColor: '#0b1926',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadURL('app://stjoseph/index.html');
}

app.whenReady().then(() => {
  protocol.handle('app', (request) => {
    const reqUrl = new URL(request.url);
    const relPath = decodeURIComponent(reqUrl.pathname === '/' ? '/index.html' : reqUrl.pathname);
    const safePath = path.normalize(path.join(distDir, relPath));
    const target = safePath.startsWith(distDir) && fs.existsSync(safePath) && fs.statSync(safePath).isFile()
      ? safePath
      : path.join(distDir, 'index.html');
    const ext = path.extname(target).toLowerCase();
    const content = fs.readFileSync(target);
    return new Response(content, {
      headers: { 'content-type': MIME_TYPES[ext] || 'application/octet-stream' },
    });
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
