const { app, BrowserWindow, ipcMain, win } = require('electron');
const path = require('path');
const { getSpamEmails, getEmailDetails } = require('./gmailAPI');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets/icon.ico'),
  });

  if (app.isPackaged && 1==12) {
    console.log("Running in production mode, loading build folder...");
    mainWindow.loadFile(path.join(__dirname, 'frontend/build/index.html'));
  } else {
    console.log("Running in development mode, loading localhost...");
    mainWindow.loadURL('http://localhost:3010');
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
}

ipcMain.handle('get-spam-emails', (e, pageToken) => getSpamEmails(pageToken));
ipcMain.handle('get-email-details', (e, emailId) => getEmailDetails(emailId));

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});