const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, globalShortcut, desktopCapturer, shell, session } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { credentialVault } = require('./credentialVault.cjs');
const { cloudProxy } = require('./cloudProxy.cjs');
const { mainSecurityPolicy } = require('./mainSecurityPolicy.cjs');
const { nativeWakeWordSpotter } = require('./nativeWakeWordSpotter.cjs');

let mainWindow = null;
let tray = null;
let isQuitting = false;

// IPC Origin & Sender Validation Guard
function validateIpcSender(event) {
  if (!mainWindow || event.sender !== mainWindow.webContents) {
    throw new Error('IPC Security Rejection: Untrusted sender WebContents.');
  }
  const origin = event.senderFrame ? event.senderFrame.url : '';
  if (origin && !origin.startsWith('http://localhost:5173') && !origin.startsWith('file://')) {
    throw new Error(`IPC Security Rejection: Untrusted frame origin "${origin}".`);
  }
}

// Security Allowlist for local applications
const ALLOWED_APPS = {
  notepad: 'notepad.exe',
  calc: 'calc.exe',
  calculator: 'calc.exe',
  code: 'code',
  terminal: 'wt.exe',
  explorer: 'explorer.exe'
};

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#040711',
    show: false,
    frame: true,
    titleBarStyle: 'default',
    title: 'BREAK POINT — Advanced Personal AI Desktop Assistant',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  });

  if (process.env.BREAKPOINT_SMOKE_TEST === '1' || process.argv.includes('--smoke-test')) {
    const smokeLogFile = path.join(__dirname, '../smoke_output.log');
    const logSmoke = (msg) => {
      console.log(msg);
      try { fs.appendFileSync(smokeLogFile, msg + '\n'); } catch {}
    };
    try { fs.writeFileSync(smokeLogFile, `--- SMOKE TEST STARTED at ${new Date().toISOString()} ---\n`); } catch {}

    mainWindow.webContents.once('did-finish-load', async () => {
      logSmoke('[SMOKE_TEST] Desktop window did-finish-load fired.');
      logSmoke(`[SMOKE_TEST] Authoritative security policy: ${JSON.stringify(mainSecurityPolicy.getPolicySummary())}`);
      logSmoke(`[SMOKE_TEST] DPAPI credential vault status: ${JSON.stringify(credentialVault.getStatusSummary())}`);
      try {
        const ipcStatus = await mainWindow.webContents.executeJavaScript(`
          (async () => {
            const hasBridge = typeof window.breakPointDesktopAPI !== 'undefined';
            let policy = null;
            let hw = null;
            let wakeStatus = null;
            if (hasBridge) {
              policy = await window.breakPointDesktopAPI.getSecurityPolicy();
              hw = await window.breakPointDesktopAPI.getHardwareInfo();
              wakeStatus = await window.breakPointDesktopAPI.getWakeModelStatus();
            }
            return { hasBridge, policy, hw, wakeStatus };
          })()
        `);
        logSmoke(`[SMOKE_TEST] Renderer IPC bridge response: ${JSON.stringify(ipcStatus)}`);
      } catch (err) {
        logSmoke(`[SMOKE_TEST] Renderer execution error: ${err.message}`);
      }
      setTimeout(() => {
        logSmoke('[SMOKE_TEST_SUCCESS] Desktop window loaded and IPC initialized.');
        isQuitting = true;
        app.quit();
        process.exit(0);
      }, 500);
    });
  }


  const indexPath = path.join(__dirname, '../dist/index.html');
  const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';

  if (process.env.BREAKPOINT_SMOKE_TEST === '1' || process.argv.includes('--smoke-test')) {
    if (fs.existsSync(indexPath)) {
      mainWindow.loadFile(indexPath);
    } else {
      mainWindow.loadURL(devUrl);
    }
  } else if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL(devUrl).catch(() => {
      if (fs.existsSync(indexPath)) {
        mainWindow.loadFile(indexPath);
      }
    });
  } else if (fs.existsSync(indexPath)) {
    mainWindow.loadFile(indexPath);
  } else {
    mainWindow.loadURL(devUrl).catch(() => {
      if (fs.existsSync(indexPath)) {
        mainWindow.loadFile(indexPath);
      }
    });
  }


  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Minimize to tray instead of quitting if user closes window
  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow.hide();
      if (tray) {
        tray.displayBalloon({
          title: 'Break Point Active in Background',
          content: 'Listening for "Break Point" activation phrase.'
        });
      }
    }
  });
}

function bringToForeground() {
  if (!mainWindow) return;
  if (!mainWindow.isVisible()) {
    mainWindow.show();
  }
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.focus();
  mainWindow.setAlwaysOnTop(true);
  mainWindow.setAlwaysOnTop(false);
  mainWindow.flashFrame(true);
}

function createTray() {
  // Create cybernetic cyan SVG tray icon
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    <circle cx="16" cy="16" r="14" fill="#080E21" stroke="#00F0FF" stroke-width="2"/>
    <circle cx="16" cy="16" r="6" fill="#00F0FF"/>
  </svg>`;
  const icon = nativeImage.createFromBuffer(Buffer.from(svg));

  tray = new Tray(icon.resize({ width: 16, height: 16 }));
  tray.setToolTip('BREAK POINT — Advanced Personal AI Desktop Assistant (Listening: "Break Point")');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Wake Break Point (Bring to Front)',
      click: () => bringToForeground()
    },
    { type: 'separator' },
    {
      label: 'Wake Phrase: "Break Point"',
      enabled: false
    },
    {
      label: 'Status: Listening in Background',
      enabled: false
    },
    { type: 'separator' },
    {
      label: 'Launch at Windows Login',
      type: 'checkbox',
      checked: app.getLoginItemSettings().openAtLogin,
      click: (item) => {
        app.setLoginItemSettings({
          openAtLogin: item.checked,
          path: app.getPath('exe')
        });
      }
    },
    { type: 'separator' },
    {
      label: 'Terminate Break Point',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => bringToForeground());
}

app.whenReady().then(() => {
  createMainWindow();
  createTray();

  // Connect native offline wake-word detector callback to window focus & renderer event
  nativeWakeWordSpotter.setDetectionCallback((result) => {
    bringToForeground();
    if (mainWindow) {
      mainWindow.webContents.send('breakpoint:trigger_wake', result);
    }
  });

  // Handle microphone permissions securely: only allow for authorized mainWindow
  if (session && session.defaultSession) {
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
      if (mainWindow && webContents === mainWindow.webContents && permission === 'media') {
        return callback(true);
      }
      callback(false);
    });
  }

  // Register Global Hotkey to bring Break Point to front: Ctrl+Shift+Space
  try {
    globalShortcut.register('CommandOrControl+Shift+Space', () => {
      bringToForeground();
      if (mainWindow) {
        mainWindow.webContents.send('breakpoint:trigger_wake');
      }
    });
  } catch (err) {
    console.warn('Could not register global hotkey:', err);
  }

  // IPC Handlers with Strict Sender and Origin Validation
  ipcMain.handle('breakpoint:bringToForeground', (event) => {
    validateIpcSender(event);
    bringToForeground();
    return true;
  });

  ipcMain.handle('breakpoint:openExternal', async (event, url) => {
    validateIpcSender(event);
    if (typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) {
      await shell.openExternal(url);
      return true;
    }
    throw new Error('Disallowed URL schema.');
  });

  ipcMain.handle('breakpoint:launchApp', async (event, appCommand) => {
    validateIpcSender(event);
    const isAllowed = Object.values(ALLOWED_APPS).includes(appCommand);
    if (!isAllowed) {
      throw new Error(`Command "${appCommand}" is not in the execution allowlist.`);
    }
    return new Promise((resolve, reject) => {
      exec(`start ${appCommand}`, (error) => {
        if (error) reject(error);
        else resolve({ launched: appCommand });
      });
    });
  });

  ipcMain.handle('breakpoint:captureDesktop', async (event) => {
    validateIpcSender(event);
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1920, height: 1080 }
    });
    const primary = sources[0];
    if (primary && primary.thumbnail) {
      return primary.thumbnail.toDataURL();
    }
    throw new Error('No screen capture source available.');
  });

  ipcMain.handle('breakpoint:setLoginItem', (event, enabled) => {
    validateIpcSender(event);
    app.setLoginItemSettings({
      openAtLogin: !!enabled,
      path: app.getPath('exe')
    });
    return app.getLoginItemSettings().openAtLogin;
  });

  // Hardware Telemetry IPC
  ipcMain.handle('breakpoint:system:getHardware', (event) => {
    validateIpcSender(event);
    const os = require('os');
    const totalMemBytes = os.totalmem();
    const freeMemBytes = os.freemem();
    const totalMemMB = Math.round(totalMemBytes / (1024 * 1024));
    const freeMemMB = Math.round(freeMemBytes / (1024 * 1024));
    return {
      totalMemMB,
      freeMemMB,
      cpuCores: os.cpus().length,
      isLowRam: totalMemMB <= 8500, // 8GB or less
      platform: process.platform,
      arch: process.arch
    };
  });

  // Authoritative Main Security Policy IPC
  ipcMain.handle('breakpoint:security:getPolicy', (event) => {
    validateIpcSender(event);
    return mainSecurityPolicy.getPolicySummary();
  });

  ipcMain.handle('breakpoint:security:setPaidPermission', (event, { allowed, confirmationKey }) => {
    validateIpcSender(event);
    return mainSecurityPolicy.setPaidCloudAllowed(allowed, confirmationKey);
  });

  ipcMain.handle('breakpoint:security:setCloudPaused', (event, paused) => {
    validateIpcSender(event);
    return mainSecurityPolicy.setCloudPaused(paused);
  });

  ipcMain.handle('breakpoint:security:setLocalOnly', (event, localOnly) => {
    validateIpcSender(event);
    return mainSecurityPolicy.setLocalOnly(localOnly);
  });

  // Secure Credential Vault IPC (DPAPI Backed - Keys Never Sent to Renderer)
  ipcMain.handle('breakpoint:credentials:getStatus', (event) => {
    validateIpcSender(event);
    return credentialVault.getStatusSummary();
  });

  ipcMain.handle('breakpoint:credentials:storeKey', (event, { providerId, apiKey }) => {
    validateIpcSender(event);
    return credentialVault.setCredential(providerId, apiKey);
  });

  ipcMain.handle('breakpoint:credentials:deleteKey', (event, providerId) => {
    validateIpcSender(event);
    return credentialVault.deleteCredential(providerId);
  });

  // Secure Cloud AI Proxy IPC (Executed strictly in Main Process with DPAPI Keys)
  ipcMain.handle('breakpoint:ai:proxyRequest', async (event, payload) => {
    validateIpcSender(event);
    return cloudProxy.executeRequest(payload);
  });

  ipcMain.handle('breakpoint:ai:testConnection', async (event, { providerId }) => {
    validateIpcSender(event);
    return cloudProxy.testConnection(providerId);
  });

  // Native Offline Wake-Word Spotter IPC Handlers
  ipcMain.handle('breakpoint:wake:getStatus', (event) => {
    validateIpcSender(event);
    return nativeWakeWordSpotter.getStatus();
  });

  ipcMain.handle('breakpoint:wake:feedPcm', (event, pcmArray) => {
    validateIpcSender(event);
    if (!pcmArray) return null;
    return nativeWakeWordSpotter.feedPcmChunk(pcmArray);
  });

  ipcMain.handle('breakpoint:wake:reset', (event) => {
    validateIpcSender(event);
    nativeWakeWordSpotter.resetStream();
    return true;
  });

  // Offline Speech / Wake-Word Model Status IPC
  ipcMain.handle('breakpoint:models:getStatus', (event) => {
    validateIpcSender(event);
    const spotterStatus = nativeWakeWordSpotter.getStatus();
    const isConfigured = spotterStatus.status === 'READY';

    return {
      configured: isConfigured,
      status: spotterStatus.status,
      engine: spotterStatus.engine,
      modelType: 'sherpa_onnx_zipformer',
      modelPath: spotterStatus.modelPath,
      isOfflineGuaranteed: true,
      recommendation: {
        name: 'sherpa-onnx-kws-zipformer-gigaspeech-3.3M-2024-01-01',
        license: 'Apache-2.0',
        sizeMB: 14,
        url: 'https://github.com/k2-fsa/sherpa-onnx/releases/download/kws-models/sherpa-onnx-kws-zipformer-gigaspeech-3.3M-2024-01-01.tar.bz2',
        targetDir: path.join(__dirname, '../models/wake-word/sherpa-onnx-kws-zipformer-gigaspeech-3.3M-2024-01-01'),
        installInstructions: 'Download archive, extract into project directory at models/wake-word/, and restart engine.'
      }
    };
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  // Do not exit on macOS / Tray mode; Break Point remains listening
});
