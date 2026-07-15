// Safe bridge between the web pages (renderer) and the desktop side (main).
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('companion', {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (patch) => ipcRenderer.invoke('settings:save', patch),
  verifyMedDoc: (token) => ipcRenderer.invoke('auth:verify', { token }),
  authSuccess: (payload) => ipcRenderer.invoke('auth:success', payload),
  logout: () => ipcRenderer.invoke('auth:logout'),
  reminderAction: (type, action) => ipcRenderer.invoke('reminder:action', { type, action }),
  testReminder: (type) => ipcRenderer.invoke('reminder:test', type),
  onReminder: (cb) => ipcRenderer.on('reminder', (e, data) => cb(data)),
});
