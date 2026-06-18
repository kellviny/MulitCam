import { app, BrowserWindow, dialog, ipcMain, globalShortcut } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as net from 'net';
import * as os from 'os';
import * as fs from 'fs';
import * as https from 'https';
import * as http from 'http';
import express from 'express';
import * as selfsigned from 'selfsigned';
import QRCode from 'qrcode';
import { createProxyServer } from 'http-proxy';
import { AccessToken } from 'livekit-server-sdk';
import { autoUpdater } from 'electron-updater';

// No Linux Ubuntu, desativar o sandbox previne crashes relacionados ao AppArmor.
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('no-sandbox');
}

// --- Constantes ---
const LIVEKIT_API_KEY = 'multicam_key';
const LIVEKIT_API_SECRET = 'multicam_secret_change_this_32chars';
const HTTP_PORT = 3000;
const HTTPS_PORT = 3001;

// --- Estado Global ---
let mainWindow: BrowserWindow | null = null;
let livekitProcess: ChildProcess | null = null;

// --- Resolução de Caminhos ---
const ROOT = app.isPackaged
  ? path.join(process.resourcesPath, 'app.asar.unpacked')
  : path.join(__dirname, '..');

// Detecta o SO e escolhe o binário correto do LiveKit
const isWindows = process.platform === 'win32';
const livekitExe = isWindows ? 'livekit-server.exe' : 'livekit-server';

const LIVEKIT_BIN = path.join(ROOT, 'build', livekitExe);
const LIVEKIT_CONFIG = path.join(ROOT, 'build', 'livekit.yaml');
const MONITOR_DIR = path.join(ROOT, 'dist', 'monitor');
const CAMERA_DIR = path.join(ROOT, 'dist', 'mobile-camera');

// --- Utils ---
function getLocalIP(): string {
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const iface of ifaces ?? []) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return '127.0.0.1';
}

interface NetworkInterfaceInfo {
  name: string;
  address: string;
  internal: boolean;
}

function getAllNetworkInterfaces(): NetworkInterfaceInfo[] {
  const result: NetworkInterfaceInfo[] = [];
  for (const [name, ifaces] of Object.entries(os.networkInterfaces())) {
    for (const iface of ifaces ?? []) {
      if (iface.family === 'IPv4') {
        result.push({ name, address: iface.address, internal: iface.internal });
      }
    }
  }
  // Sort: non-internal first, then loopback
  result.sort((a, b) => {
    if (a.internal !== b.internal) return a.internal ? 1 : -1;
    return a.name.localeCompare(b.name);
  });
  return result;
}

// --- Selected IP (can be changed at runtime) ---
let selectedIP: string = getLocalIP();

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const s = net.createServer();
    s.once('error', () => resolve(false));
    s.once('listening', () => { s.close(); resolve(true); });
    s.listen(port);
  });
}

function ensureSingleInstance() {
  if (!app.requestSingleInstanceLock()) {
    app.quit();
    return false;
  }
  app.on('second-instance', () => { 
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
  return true;
}

async function checkRequiredPorts(): Promise<boolean> {
  for (const port of [7880, 7881, HTTP_PORT, HTTPS_PORT]) {
    if (!(await isPortAvailable(port))) {
      dialog.showErrorBox('Porta em uso', `A porta ${port} já está em uso.\nFeche o programa conflitante e tente novamente.`);
      return false;
    }
  }
  return true;
}

async function startLiveKit(): Promise<void> {
  livekitProcess = spawn(LIVEKIT_BIN, ['--config', LIVEKIT_CONFIG], {
    windowsHide: true,
    stdio: 'ignore',
  });

  livekitProcess.on('error', (err) => {
    dialog.showErrorBox('Erro no LiveKit', `Não foi possível iniciar o servidor de vídeo:\n${err.message}`);
    app.quit();
  });

  for (let i = 0; i < 20; i++) {
    if (!(await isPortAvailable(7880))) break;
    await new Promise(r => setTimeout(r, 500));
  }
}

function getOrCreateCert(): { cert: string; key: string } {
  const certFile = path.join(app.getPath('userData'), 'multicam-cert.pem');
  const keyFile  = path.join(app.getPath('userData'), 'multicam-key.pem');

  if (fs.existsSync(certFile) && fs.existsSync(keyFile)) {
    return { cert: fs.readFileSync(certFile, 'utf8'), key: fs.readFileSync(keyFile, 'utf8') };
  }

  const pems = selfsigned.generate([{ name: 'commonName', value: 'multicam.local' }], { days: 3650 });
  fs.writeFileSync(certFile, pems.cert);
  fs.writeFileSync(keyFile, pems.private);
  return { cert: pems.cert, key: pems.private };
}

// --- Device registry for consistent camera names ---
const deviceRegistry: Record<string, string> = {};
let nextCameraId = 1;

async function startExpressServer() {
  const expressApp = express();
  expressApp.use(express.json());

  // CORS Headers
  expressApp.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
  });

  // Assign persistent camera name based on deviceId
  expressApp.get('/api/assign-name', (req, res) => {
    const deviceId = req.query.deviceId as string;
    if (!deviceId) return res.status(400).json({ error: 'deviceId is required' });
    if (!deviceRegistry[deviceId]) {
      deviceRegistry[deviceId] = `cam-${nextCameraId++}`;
    }
    res.json({ name: deviceRegistry[deviceId] });
  });

  expressApp.get('/api/token', async (req, res) => {
    const { room, name, role } = req.query as Record<string, string>;
    if (!room || !name) return res.status(400).json({ error: 'room e name são obrigatórios' });
    
    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, { identity: name });
    at.addGrant({ 
      roomJoin: true, 
      room,
      canPublish: role === 'camera',
      canSubscribe: true,
      canPublishData: true
    });
    res.json({ token: await at.toJwt() });
  });

  expressApp.get('/api/status', (_req, res) => res.json({ ok: true }));

  expressApp.use('/camera', express.static(CAMERA_DIR));
  expressApp.get('/camera/*', (_req, res) => res.sendFile(path.join(CAMERA_DIR, 'index.html')));

  expressApp.use('/', express.static(MONITOR_DIR));
  expressApp.get('*', (_req, res) => res.sendFile(path.join(MONITOR_DIR, 'index.html')));

  http.createServer(expressApp).listen(HTTP_PORT);
  const { cert, key } = getOrCreateCert();
  
  const wsProxy = createProxyServer({ target: 'ws://127.0.0.1:7880', ws: true });
  wsProxy.on('error', (err) => console.error('WS Proxy Error:', err));

  const httpsServer = https.createServer({ cert, key }, expressApp);
  httpsServer.on('upgrade', (req, socket, head) => {
    if (req.url?.startsWith('/livekit')) {
      req.url = req.url.replace(/^\/livekit/, '');
      wsProxy.ws(req, socket, head);
    }
  });
  
  httpsServer.listen(HTTPS_PORT);
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280, height: 800,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
    },
  });

  mainWindow.maximize();
  mainWindow.loadURL(`http://localhost:${HTTP_PORT}`);
  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.on('closed', () => { mainWindow = null; });
}

let splashWindow: BrowserWindow | null = null;
function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 500, height: 300,
    transparent: process.platform !== 'linux',
    frame: false,
    alwaysOnTop: true,
    webPreferences: { nodeIntegration: false }
  });
  const splashHtml = `
    <html><body style="margin:0;padding:0;background:#1e1e1e;color:white;display:flex;align-items:center;justify-content:center;font-family:sans-serif;height:100vh;border-radius:10px;overflow:hidden;">
    <div style="text-align:center;">
      <h2 style="margin-bottom:10px;">MultiCam Desktop</h2>
      <p style="color:#aaa;">Iniciando servidor de vídeo...</p>
    </div>
    </body></html>
  `;
  splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(splashHtml)}`);
}

app.whenReady().then(async () => {
  if (!ensureSingleInstance()) return;
  
  createSplashWindow();
  
  globalShortcut.register('CommandOrControl+Shift+I', () => {
    mainWindow?.webContents.toggleDevTools();
  });
  
  if (!(await checkRequiredPorts())) { app.quit(); return; }

  try {
    await startLiveKit();
    await startExpressServer();
    createMainWindow();
    
    selectedIP = getLocalIP();
    const cameraUrl = `https://${selectedIP}:${HTTPS_PORT}/camera?room=live`;
    const qrDataUrl = await QRCode.toDataURL(cameraUrl);

    ipcMain.handle('get-camera-info', () => {
      const url = `https://${selectedIP}:${HTTPS_PORT}/camera?room=live`;
      return { url, qr: qrDataUrl, ip: selectedIP };
    });

    ipcMain.handle('get-network-interfaces', () => getAllNetworkInterfaces());

    ipcMain.handle('set-selected-ip', (_event, ip: string) => {
      selectedIP = ip;
      return { ok: true, ip: selectedIP };
    });

    if (splashWindow) {
      splashWindow.close();
      splashWindow = null;
    }
    
    autoUpdater.checkForUpdatesAndNotify();

  } catch (err) {
    dialog.showErrorBox('Erro fatal', String(err));
    app.quit();
  }
});

function cleanup() {
  if (livekitProcess && !livekitProcess.killed) {
    livekitProcess.kill('SIGTERM');
    livekitProcess = null;
  }
}

app.on('window-all-closed', () => { cleanup(); app.quit(); });
app.on('before-quit', cleanup);
app.on('will-quit', cleanup);
process.on('exit', cleanup);
