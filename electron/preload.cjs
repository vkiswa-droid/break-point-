const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('breakPointDesktopAPI', {
  bringToForeground: () => ipcRenderer.invoke('breakpoint:bringToForeground'),
  openExternal: (url) => ipcRenderer.invoke('breakpoint:openExternal', url),
  launchApp: (command) => ipcRenderer.invoke('breakpoint:launchApp', command),
  captureDesktop: () => ipcRenderer.invoke('breakpoint:captureDesktop'),
  setLoginItem: (enabled) => ipcRenderer.invoke('breakpoint:setLoginItem', enabled),
  getHardwareInfo: () => ipcRenderer.invoke('breakpoint:system:getHardware'),
  getCredentialStatus: () => ipcRenderer.invoke('breakpoint:credentials:getStatus'),
  storeCredential: (providerId, apiKey) => ipcRenderer.invoke('breakpoint:credentials:storeKey', { providerId, apiKey }),
  deleteCredential: (providerId) => ipcRenderer.invoke('breakpoint:credentials:deleteKey', providerId),
  proxyAIRequest: (payload) => ipcRenderer.invoke('breakpoint:ai:proxyRequest', payload),
  testCloudConnection: (providerId) => ipcRenderer.invoke('breakpoint:ai:testConnection', { providerId }),
  getSecurityPolicy: () => ipcRenderer.invoke('breakpoint:security:getPolicy'),
  setPaidPermission: (allowed, confirmationKey) => ipcRenderer.invoke('breakpoint:security:setPaidPermission', { allowed, confirmationKey }),
  setCloudPaused: (paused) => ipcRenderer.invoke('breakpoint:security:setCloudPaused', paused),
  setLocalOnly: (localOnly) => ipcRenderer.invoke('breakpoint:security:setLocalOnly', localOnly),
  getWakeModelStatus: () => ipcRenderer.invoke('breakpoint:models:getStatus'),
  getWakeEngineStatus: () => ipcRenderer.invoke('breakpoint:wake:getStatus'),
  feedWakeWordPcm: (pcmData) => ipcRenderer.invoke('breakpoint:wake:feedPcm', pcmData),
  resetWakeWordStream: () => ipcRenderer.invoke('breakpoint:wake:reset'),
  onWakeTriggered: (callback) => {
    ipcRenderer.on('breakpoint:trigger_wake', (event, data) => callback(data));
  }
});
