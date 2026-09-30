// WeBook desktop shell: wraps the web book (src/) in a native window
// for Windows and Ubuntu/Linux.
const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

const isMac = process.platform === 'darwin';
let win;

function send(action) {
  if (win && !win.isDestroyed()) win.webContents.send('menu-action', action);
}

function buildMenu() {
  const template = [
    ...(isMac ? [{ role: 'appMenu' }] : []),
    {
      label: '&File',
      submenu: [
        { label: 'New Page', accelerator: 'CmdOrCtrl+N', click: () => send('new-page') },
        { label: 'Book Settings…', accelerator: 'CmdOrCtrl+,', click: () => send('settings') },
        { type: 'separator' },
        { label: 'Export Book…', accelerator: 'CmdOrCtrl+S', click: () => send('export') },
        { label: 'Import Book…', accelerator: 'CmdOrCtrl+O', click: () => send('import') },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    {
      label: '&Go',
      submenu: [
        { label: 'Previous Page', accelerator: 'Left', registerAccelerator: false, click: () => send('prev') },
        { label: 'Next Page', accelerator: 'Right', registerAccelerator: false, click: () => send('next') },
        { label: 'Front Cover', accelerator: 'Home', registerAccelerator: false, click: () => send('first') },
        { label: 'Back Cover', accelerator: 'End', registerAccelerator: false, click: () => send('last') },
        { label: 'Contents', accelerator: 'CmdOrCtrl+T', click: () => send('toc') }
      ]
    },
    {
      label: '&View',
      submenu: [
        { label: 'Toggle Night Mode', accelerator: 'CmdOrCtrl+D', click: () => send('theme') },
        { label: 'Toggle Page Sound', accelerator: 'CmdOrCtrl+M', click: () => send('sound') },
        { type: 'separator' },
        { label: 'Read Aloud on Hover', accelerator: 'CmdOrCtrl+R', click: () => send('read') },
        { label: 'Read This Page Aloud', accelerator: 'CmdOrCtrl+L', click: () => send('read-page') },
        { label: 'Stop Reading', accelerator: 'CmdOrCtrl+.', click: () => send('stop-reading') },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        { role: 'toggleDevTools' }
      ]
    },
    {
      label: '&Help',
      submenu: [
        {
          label: 'Project on GitHub',
          click: () => shell.openExternal('https://github.com/jaisudhakar/own-webook')
        }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 720,
    minHeight: 520,
    backgroundColor: '#2b1d14',
    title: 'WeBook',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  win.once('ready-to-show', () => win.show());
  win.loadFile(path.join(__dirname, '..', 'src', 'index.html'));

  // Open external links in the user's browser, never inside the app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file://')) {
      e.preventDefault();
      if (/^https?:/i.test(url)) shell.openExternal(url);
    }
  });
}

// Some Linux setups (VMs, older GPUs) render 3D transforms badly with GPU
// compositing; allow opting out with WEBOOK_DISABLE_GPU=1.
if (process.env.WEBOOK_DISABLE_GPU === '1') app.disableHardwareAcceleration();

// Read aloud: on Linux, Chromium only talks to the system voices
// (speech-dispatcher / espeak-ng) when this switch is set.
if (process.platform === 'linux') app.commandLine.appendSwitch('enable-speech-dispatcher');

app.whenReady().then(() => {
  buildMenu();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (!isMac) app.quit();
});
