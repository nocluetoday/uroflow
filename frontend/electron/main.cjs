const path = require('node:path');
const fs = require('node:fs');
const { app, BrowserWindow, dialog } = require('electron');
const { spawn } = require('node:child_process');

let mainWindow = null;
let backendProcess = null;

const BACKEND_PORT = process.env.UROFLOW_BACKEND_PORT || '8000';

function getPaths() {
  const frontendDir = path.resolve(__dirname, '..');
  const repoRoot = path.resolve(frontendDir, '..');
  return { frontendDir, repoRoot };
}

function startBackend() {
  const { repoRoot } = getPaths();
  const isPackaged = app.isPackaged;

  let cmd;
  let args;
  let cwd;

  if (isPackaged) {
    const bundledBackend = path.join(process.resourcesPath, 'backend', 'uroflow-backend');
    if (!fs.existsSync(bundledBackend)) {
      dialog.showErrorBox(
        'Backend Not Found',
        `Bundled backend binary is missing at:\n${bundledBackend}\n\nRun desktop packaging with backend build first.`
      );
      app.quit();
      return;
    }
    cmd = bundledBackend;
    args = [];
    cwd = process.resourcesPath;
  } else {
    const venvPython = path.join(repoRoot, 'venv', 'bin', 'python');
    cmd = fs.existsSync(venvPython) ? venvPython : 'python3';
    args = ['-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', String(BACKEND_PORT)];
    cwd = repoRoot;
  }

  backendProcess = spawn(cmd, args, {
    cwd,
    stdio: 'pipe',
    env: {
      ...process.env,
      PYTHONUNBUFFERED: '1',
      UROFLOW_BACKEND_PORT: String(BACKEND_PORT),
    },
  });

  backendProcess.stdout.on('data', (buf) => {
    process.stdout.write(`[backend] ${buf.toString()}`);
  });

  backendProcess.stderr.on('data', (buf) => {
    process.stderr.write(`[backend] ${buf.toString()}`);
  });

  backendProcess.on('exit', (code, signal) => {
    process.stdout.write(`[backend] exited (code=${code}, signal=${signal})\n`);
    backendProcess = null;
  });
}

function stopBackend() {
  if (!backendProcess) {
    return;
  }

  try {
    backendProcess.kill('SIGTERM');
  } catch (_) {
    // Ignore process-kill races at shutdown.
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 840,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'UroFlow',
  });

  const rendererUrl = process.env.ELECTRON_RENDERER_URL;
  if (rendererUrl) {
    mainWindow.loadURL(rendererUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  startBackend();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  stopBackend();
});
