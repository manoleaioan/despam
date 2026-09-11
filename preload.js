const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getSpamEmails: (pageToken = null, maxResults) => ipcRenderer.invoke('get-spam-emails', pageToken, maxResults),
  getSpamCount: () => ipcRenderer.invoke('get-spam-count'),
  getEmailDetails: (emailId) => ipcRenderer.invoke('get-email-details', emailId),
  deleteEmails: (emailIds) => ipcRenderer.invoke('delete-emails', emailIds),
  getUserProfile: () => ipcRenderer.invoke('get-user-profile'),
  logout: () => ipcRenderer.invoke('logout'),
  onOauthPrompt: (callback) => ipcRenderer.on('oauth-prompt', callback),
  getPreloadPath: () => ipcRenderer.invoke('get-path'),
  isUserAuthenticated: () => ipcRenderer.invoke('check-auth'),
  getOAuth2ClientWithToken: () => ipcRenderer.invoke('start-auth'),
  checkToken: () => ipcRenderer.invoke('check-token'),
  getKeywords: ()=>  ipcRenderer.invoke('get-keywords'),
  saveKeywords: (keywords)=>  ipcRenderer.invoke('save-keywords', keywords)
});