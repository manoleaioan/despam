const { app, BrowserWindow, ipcMain } = require('electron');
const { randomUUID } = require('crypto');
const { getSpamEmails, getEmailDetails, getUserProfile, logout, getTotalSpamEmailCount, deleteEmails, getOAuth2ClientWithToken, checkToken } = require('./gmailAPI');
const path = require('path');

const { AgentOutputError, runAgentStep } = require('./agent/agentLoop');
const { validateAgentAction } = require('./agent/agentActions');

const AGENT_STATUS = {
  SUCCESS: 'success',
  FAILED: 'failed'
};

const AGENT_JOB_STATUS = {
  RUNNING: 'running',
  SUCCESS: 'success',
  FAILED: 'failed',
  TIMEOUT: 'timeout'
};


const MAX_AGENT_STEPS = 30;
const MAX_REPEATED_AGENT_ACTIONS = 13;

let currentAgentJob = null;

const OLLAMA_MODEL = 'qwen3.5:27b';
const getOllamaStatus = async () => {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    if (!response.ok) return { ready: false, reason: 'server_error' };
    const data = await response.json();
    return data.models?.some((model) => model.name === OLLAMA_MODEL)
      ? { ready: true }
      : { ready: false, reason: 'model_missing' };
  } catch (error) {
    return { ready: false, reason: 'not_running' };
  }
};

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

const snapshotsAreEqual = (snapshotA, snapshotB) => {
  return JSON.stringify(snapshotA) === JSON.stringify(snapshotB);
};

const createAgentJob = (navigationId) => {
  return {
    id: randomUUID(),
    navigationId,
    status: AGENT_JOB_STATUS.RUNNING,

    previousAction: null,
    previousSnapshot: null,

    pendingSnapshot: null,
    pendingAction: null,

    stepCount: 0,
    repeatedActionCount: 0,

    agentStepRunning: false
  };
};

const resetAgentState = (navigationId) => {
  currentAgentJob = createAgentJob(navigationId);

  console.log(
    'AGENT JOB CREATED:',
    currentAgentJob.id
  );

  return { jobId: currentAgentJob.id, navigationId };
};

const isCurrentJob = (jobId, navigationId) => currentAgentJob &&
  currentAgentJob.id === jobId && currentAgentJob.navigationId === navigationId;

const commandFor = (job, action) => ({ ...action, jobId: job.id, navigationId: job.navigationId });

const finishAgentJob = (status, reason = null) => {
  if (!currentAgentJob) {
    return null;
  }

  currentAgentJob.status = status;
  currentAgentJob.pendingSnapshot = null;

  currentAgentJob.pendingAction = null;

  const result = {
    action: 'done',
    status:
      status === AGENT_JOB_STATUS.SUCCESS
        ? AGENT_STATUS.SUCCESS
        : AGENT_STATUS.FAILED
  };

  if (reason) {
    result.reason = reason;
  }

  console.log(
    'AGENT JOB FINISHED:',
    currentAgentJob.id,
    result
  );

  currentAgentJob.terminalResult = result;
  return result;
};

ipcMain.handle('get-spam-emails', (e, pageToken, maxResults) => getSpamEmails(pageToken, maxResults));
ipcMain.handle('get-email-details', (e, emailId) => getEmailDetails(emailId));
ipcMain.handle('get-spam-count', () => getTotalSpamEmailCount());
ipcMain.handle('delete-emails', (e, query) => deleteEmails(query));
ipcMain.handle('get-user-profile', () => getUserProfile());
ipcMain.handle('logout', () => logout());
ipcMain.handle('get-path', () => path.join(__dirname, 'webviewPreload.js'));
ipcMain.handle('start-auth', () => getOAuth2ClientWithToken(true));
ipcMain.handle('check-token', async () => checkToken());
ipcMain.handle('get-ollama-status', () => getOllamaStatus());
ipcMain.handle('reset-agent-state', (event, navigationId) => resetAgentState(navigationId));
ipcMain.handle(
  'run-agent-step',
  async (event, snapshot, jobId, navigationId) => {
    if (!isCurrentJob(jobId, navigationId)) return null;
    const job = currentAgentJob;
    if (job.status !== AGENT_JOB_STATUS.RUNNING) return commandFor(job, job.terminalResult);
    if (job.agentStepRunning || job.pendingAction) {
      job.pendingSnapshot = snapshot;
      return null;
    }
    if (job.stepCount >= MAX_AGENT_STEPS) return commandFor(job, finishAgentJob(AGENT_JOB_STATUS.FAILED, 'max_steps_reached'));
    job.agentStepRunning = true;
    job.stepCount += 1;
    try {
      const candidate = await runAgentStep(snapshot, job.previousAction, job.previousSnapshot);
      if (!isCurrentJob(jobId, navigationId) || job.status !== AGENT_JOB_STATUS.RUNNING) return null;
      const validation = validateAgentAction(candidate, snapshot);
      if (!validation.valid) return commandFor(job, finishAgentJob(AGENT_JOB_STATUS.FAILED, `invalid_agent_action:${validation.reason}`));
      const action = validation.action;
      job.repeatedActionCount = snapshotsAreEqual(snapshot, job.previousSnapshot) && JSON.stringify(action) === JSON.stringify(job.previousAction) ? job.repeatedActionCount + 1 : 0;
      if (job.repeatedActionCount >= MAX_REPEATED_AGENT_ACTIONS) return commandFor(job, finishAgentJob(AGENT_JOB_STATUS.FAILED, 'no_progress'));
      job.pendingAction = { action, snapshot };
      return commandFor(job, action);
    } catch (error) {
      if (!isCurrentJob(jobId, navigationId) || job.status !== AGENT_JOB_STATUS.RUNNING) return null;
      const reason = error instanceof AgentOutputError ? error.reason : 'ollama_request_failed';
      console.error('AGENT STEP FAILED:', reason, error.rawOutput || error.message);
      return commandFor(job, finishAgentJob(AGENT_JOB_STATUS.FAILED, reason));
    } finally {
      if (isCurrentJob(jobId, navigationId)) job.agentStepRunning = false;
    }
  }
);

ipcMain.handle('complete-agent-action', (event, result) => {
  const { jobId, navigationId, action, success } = result || {};
  if (!isCurrentJob(jobId, navigationId)) return null;
  const job = currentAgentJob;
  if (job.status !== AGENT_JOB_STATUS.RUNNING) return commandFor(job, job.terminalResult);
  if (!job.pendingAction || JSON.stringify(job.pendingAction.action) !== JSON.stringify(action)) return null;
  const pending = job.pendingAction;
  job.pendingAction = null;
  if (!success) return commandFor(job, finishAgentJob(AGENT_JOB_STATUS.FAILED, 'browser_action_failed'));
  if (pending.action.action === 'done') return commandFor(job, finishAgentJob(pending.action.status === AGENT_STATUS.FAILED ? AGENT_JOB_STATUS.FAILED : AGENT_JOB_STATUS.SUCCESS, pending.action.reason || null));
  job.previousAction = pending.action;
  job.previousSnapshot = pending.snapshot;
  if (!job.pendingSnapshot) return null;
  const nextSnapshot = job.pendingSnapshot;
  job.pendingSnapshot = null;
  return { jobId, navigationId, nextSnapshot };
});
ipcMain.handle(
  'timeout-agent',
  (event, jobId, navigationId) => {
    if (!isCurrentJob(jobId, navigationId) || currentAgentJob.status !== AGENT_JOB_STATUS.RUNNING) return null;
    return commandFor(currentAgentJob, finishAgentJob(AGENT_JOB_STATUS.TIMEOUT, 'timeout'));
  }
);

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
