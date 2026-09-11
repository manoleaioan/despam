const { app, BrowserWindow, ipcMain, win } = require('electron');
const { getSpamEmails, getEmailDetails, getUserProfile, logout, getTotalSpamEmailCount, deleteEmails, getOAuth2ClientWithToken, checkToken } = require('./gmailAPI');
const path = require('path');
const fs = require('fs');
const JSON5 = require('json5');

const keywordsPath = path.join(__dirname, 'keywords.json5');

function loadKeywords() {
  const content = fs.readFileSync(keywordsPath, 'utf-8');
  return content;
  return JSON5.parse(content);
}

function saveKeywords(keywords) {
  fs.writeFileSync(keywordsPath, keywords, 'utf-8');
  // fs.writeFileSync(keywordsPath, JSON5.stringify(keywords, null, 2), 'utf-8');
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 940,
    minWidth: 1200,
    minHeight: 800,
    show: false,
    webPreferences: {
      devTools: true,
      webviewTag: true,
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets/icon.ico'),
  });

  mainWindow.setMenuBarVisibility(false);

  mainWindow.webContents.on('did-attach-webview', (event, webContents) => {
    webContents.on('did-finish-load', () => {
      const keywords = loadKeywords();
      webContents.send('set-keywords', JSON5.parse(keywords));
    });
  });


  if (app.isPackaged && 1 == 12) {
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

ipcMain.handle('get-spam-emails', (e, pageToken, maxResults) => getSpamEmails(pageToken, maxResults));
ipcMain.handle('get-email-details', (e, emailId) => getEmailDetails(emailId));
ipcMain.handle('get-spam-count', () => getTotalSpamEmailCount());
ipcMain.handle('delete-emails', (e, query) => deleteEmails(query));
ipcMain.handle('get-user-profile', () => getUserProfile());
ipcMain.handle('logout', () => logout());
ipcMain.handle('get-path', () => path.join(__dirname, 'webviewPreload.js'));
ipcMain.handle('start-auth', () => getOAuth2ClientWithToken(true));
ipcMain.handle('check-token', async () => checkToken());
ipcMain.handle('get-keywords', () => loadKeywords());
ipcMain.handle('save-keywords', (e, keywords) => saveKeywords(keywords));

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});