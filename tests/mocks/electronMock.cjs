const path = require('path');
const os = require('os');

module.exports = {
  safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: (str) => Buffer.from(str, 'utf-8'),
    decryptString: (buf) => buf.toString('utf-8')
  },
  app: {
    getPath: (name) => {
      const base = path.join(os.tmpdir(), 'breakpoint-test-vault');
      return base;
    },
    getLoginItemSettings: () => ({ openAtLogin: false }),
    setLoginItemSettings: () => {},
    isPackaged: false
  },
  ipcMain: {
    handle: () => {}
  },
  BrowserWindow: class {},
  contextBridge: {
    exposeInMainWorld: () => {}
  },
  globalShortcut: {
    register: () => true,
    unregisterAll: () => {}
  },
  shell: {
    openExternal: async () => true
  },
  desktopCapturer: {
    getSources: async () => []
  }
};
