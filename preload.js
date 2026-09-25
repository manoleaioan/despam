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
  getOllamaStatus: () => ipcRenderer.invoke('get-ollama-status'),
  runAgentStep: (snapshot, jobId, navigationId) => ipcRenderer.invoke('run-agent-step', snapshot, jobId, navigationId),
  resetAgentState: (navigationId) => ipcRenderer.invoke('reset-agent-state', navigationId),
  timeoutAgent: (jobId, navigationId) => ipcRenderer.invoke('timeout-agent', jobId, navigationId),
  completeAgentAction: (result) => ipcRenderer.invoke('complete-agent-action', result)
});
