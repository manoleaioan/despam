const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getSpamEmails: (pageToken = null) => ipcRenderer.invoke('get-spam-emails', pageToken),
  getEmailDetails: (emailId) => ipcRenderer.invoke('get-email-details', emailId),
  onOauthPrompt: (callback) => ipcRenderer.on('oauth-prompt', callback),
});