// Minimal, safe bridge between the desktop menu and the web book.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('webookDesktop', {
  platform: process.platform,
  onMenuAction(callback) {
    ipcRenderer.on('menu-action', (_event, action) => callback(action));
  }
});
