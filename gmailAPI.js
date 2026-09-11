const fs = require('fs');
const path = require('path');
const url = require('url');
const { google } = require('googleapis');
const { shell, app } = require('electron');
const express = require('express');

const appServer = express();
let port = 3020;
const maxRetries = 20;

const CREDENTIALS_PATH = !app.isPackaged
  ? path.join(__dirname, 'credentials.json')
  : path.join(process.resourcesPath, 'credentials.json');

const TOKEN_PATH = !app.isPackaged
  ? path.join(__dirname, 'token.json')
  : path.join(process.resourcesPath, 'token.json');

// Singleton OAuth2 client
let oAuth2ClientInstance = null;

let tokenPromise = null;


const unsubscribeKeywords = [
  // English
  'unsubscribe', 'opt-out', 'preferences', 'manage subscriptions',

  // Spanish
  'suscripción', 'darse de baja', 'cancelar suscripción', 'optar por no recibir', 'gestionar suscripciones',

  // French
  'désabonner', 'se désabonner', 'annuler l’abonnement', 'désinscrire', 'gérer les abonnements',

  // German
  'abmelden', 'abonnement kündigen', 'austragen', 'abonnements verwalten', 'newsletter abmelden',

  // Portuguese
  'cancelar', 'cancelar inscrição', 'optar por não receber', 'gerenciar assinaturas', 'descadastrar',

  // Italian
  'annullare l\'iscrizione', 'cancellarsi', 'gestire le iscrizioni', 'annullare l\'abbonamento',

  // Dutch
  'afmelden', 'abonnement opzeggen', 'uitschrijven', 'abonnementen beheren',

  // Russian
  'отписаться', 'отменить подписку', 'управлять подписками', 'отказ от подписки',

  // Czech
  'zrušit',

  // Chinese
  '退订', '取消订阅', '管理订阅', '取消订阅'
];

// Helper function to save tokens
const saveToken = (token) => {
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
  console.log('Token stored to', TOKEN_PATH);
};

// Initialize OAuth2 client
const getOAuthClient = () => {
  if (oAuth2ClientInstance) {
    return oAuth2ClientInstance;
  }

  const content = fs.readFileSync(CREDENTIALS_PATH);
  const credentials = JSON.parse(content);
  const { client_id, client_secret } = credentials.web;
  oAuth2ClientInstance = new google.auth.OAuth2(client_id, client_secret, `http://localhost:${port}`);

  return oAuth2ClientInstance;
};

// Function to handle token loading and refreshing
const getOAuth2ClientWithToken = async (autoTrigger) => {
  const client = getOAuthClient();

  // if (tokenPromise) {
  //   await tokenPromise;
  //   return client;
  // }

  // Define the closure function with `autoTrigger` passed in
  const runWithToken = async (trigger) => {
    try {
      const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
      client.setCredentials(token);

      const isExpired = token.expiry_date && token.expiry_date < Date.now();
      if (isExpired) {
        console.log('Token expired, refreshing...');
        const refreshedToken = await client.refreshAccessToken();
        client.setCredentials(refreshedToken.credentials);
        saveToken(refreshedToken.credentials);
      }
    } catch (err) {
      console.log('No valid token found or token expired.');
      console.log('trigger is:', trigger); // ✅ this will now always be correct
      if (trigger) {
        await getNewToken(client);
      } else {
        throw new Error('Not authenticated');
      }
    } finally {
      tokenPromise = null;
    }
  };

  // Call it with `autoTrigger` and save the promise
  tokenPromise = runWithToken(autoTrigger);

  await tokenPromise;
  return client;
};



const checkToken = async () => {
  try {
    await getOAuth2ClientWithToken();
    return { valid: true };
  } catch (err) {
    console.log('User not authenticated:', err.message);
    return { valid: false };
  }
};

// Function to request a new token and handle OAuth callback
const getNewToken = (oAuth2Client) => {
  return new Promise((resolve, reject) => {
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/gmail.settings.basic',
        'https://mail.google.com/'
      ],
      prompt: 'consent', // Ensure refresh_token is received
    });

    shell.openExternal(authUrl);

    const handleOAuthCallback = async (req, res) => {
      const queryParams = url.parse(req.url, true).query;
      const code = queryParams.code;

      if (code) {
        try {
          const { tokens } = await oAuth2Client.getToken(code);
          oAuth2Client.setCredentials(tokens);
          saveToken(tokens);
          res.send('<h1>Authentication successful! You can close this page now.</h1>');
          resolve();
        } catch (err) {
          res.send('<h1>Error retrieving access token. Please try again.</h1>');
          reject('Error retrieving access token: ' + err);
        }
      } else {
        res.send('<h1>No code found in the URL. Please try again.</h1>');
        reject('No authorization code found.');
      }

      // Cleanup: Remove the route after handling the callback
      appServer._router.stack = appServer._router.stack.filter(
        (layer) => !(layer.route && layer.route.path === '/')
      );
    };

    appServer.get('/', handleOAuthCallback);
  });
};


async function logout() {
  try {
    // Revoke the token using Google's OAuth2 API
    const oAuth2Client = getOAuthClient(); // Ensure we have the client initialized
    if (fs.existsSync(TOKEN_PATH)) {
      const token = JSON.parse(fs.readFileSync(TOKEN_PATH));

      if (token.access_token) {
        await oAuth2Client.revokeToken(token.access_token); // Revoke the token on Google's server
        console.log('Token revoked successfully.');
      }

      // Delete the token file
      await fs.promises.unlink(TOKEN_PATH);

      console.log(`Token file deleted at ${TOKEN_PATH}. User logged out.`);
    } else {
      console.log(`No token file found at ${TOKEN_PATH}.`);
    }

    // Clear the OAuth2 client instance
    oAuth2ClientInstance = null;
    tokenPromise = null;

    return { success: true, message: 'Logout successful' };
  } catch (error) {
    console.error('Error during logout:', error);
    return { success: false, message: 'Logout failed', error };
  }
}

async function getSpamEmails(pageToken = null, maxResults = 50) {
  try {
    const oAuth2Client = await getOAuth2ClientWithToken();
    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

    // Fetch the spam emails
    const response = await gmail.users.messages.list({
      userId: 'me',
      labelIds: ['SPAM'],
      maxResults,
      pageToken: pageToken || undefined,
    });

    // Get the total number of spam emails (from the resultSizeEstimate)
    const totalSpamEmails = response.data.resultSizeEstimate || 0;

    // Return the messages with the total email count
    return {
      messages: response.data.messages || [],
      nextPageToken: response.data.nextPageToken || null,
      totalEmails: totalSpamEmails, // Include the total email count
    };
  } catch (error) {
    console.error('Error fetching spam emails:', error);

    // Handle specific errors like invalid_grant which indicate re-authentication is needed
    if (error.response && error.response.data && error.response.data.error === 'invalid_grant') {
      console.log('Refresh token is invalid or expired.');
      // Optionally, delete the token file to force re-authentication
      if (fs.existsSync(TOKEN_PATH)) {
        fs.unlinkSync(TOKEN_PATH);
        console.log('Deleted invalid token file.');
      }
    }

    throw error;
  }
}

async function getTotalSpamEmailCount() {
  try {
    const oAuth2Client = await getOAuth2ClientWithToken();
    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

    const response = await gmail.users.labels.get({
      userId: 'me',
      id: 'SPAM',
    });

    const totalSpamEmails = response.data.messagesTotal;

    return totalSpamEmails;
  } catch (error) {
    console.error('Error fetching total spam email count:', error);

    if (error.response && error.response.data && error.response.data.error === 'invalid_grant') {
      console.log('Refresh token is invalid or expired.');
      if (fs.existsSync(TOKEN_PATH)) {
        fs.unlinkSync(TOKEN_PATH);
        console.log('Deleted invalid token file.');
      }
    }

    throw error;
  }
}

async function getEmailDetails(messageId) {
  try {
    const oAuth2Client = await getOAuth2ClientWithToken();
    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

    const message = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'metadata',
      metadataHeaders: ['From', 'Subject', 'Date', 'List-Unsubscribe'],
    });

    const headers = message.data.payload.headers;

    const getHeaderValue = (name) => {
      const header = headers.find((header) => header.name.toLowerCase() === name.toLowerCase());
      return header ? header.value : null;
    };

    let fromHeader = getHeaderValue('From');
    if (!fromHeader) {
      fromHeader = getHeaderValue('Sender') || getHeaderValue('Reply-To');
    }

    const fromEmail = fromHeader ? (fromHeader.match(/[^< ]+(?=>)/g)?.[0] || fromHeader.match(/[^< >]+/g)?.[0]) : 'Unknown';

    let unsubscribeLink = (getHeaderValue('List-Unsubscribe')?.match(/<(https?:\/\/[^\s,]+)(?=\s|,|>)/)?.[1] || 'N/A');

    if (unsubscribeLink.startsWith('mailto:') || unsubscribeLink == 'N/A') {
      const bodyMessage = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      });

      const payload = bodyMessage.data.payload;
      const urlPattern = /https?:\/\/[^\s"']+/gi;
      let bodyText = '';

      // Handle both cases: multiple parts or single body
      if (payload.parts) {
        payload.parts.forEach(part => {
          if (part.mimeType === 'text/plain' || part.mimeType === 'text/html') {
            bodyText += part.body.data || ''; // Append content if available
          }
        });

        // if(getHeaderValue('Subject').includes('auf dem Greifensee')){
        //   console.log( Buffer.from(bodyText, 'base64').toString('utf-8'))
        // }

      } else if (payload.body && payload.body.data) {
        bodyText = payload.body.data;
      }

      if (bodyText) {
        const decodedText = Buffer.from(bodyText, 'base64').toString('utf-8');

        let match;
        while (match = urlPattern.exec(decodedText)) {
          const url = match[0];
          //console.log(`Found URL in ${getHeaderValue('Subject')} : ${url}\n`);

          const surroundingText = decodedText.slice(Math.max(0, match.index - 500), match.index + 700);

          const foundUnsubscribe = unsubscribeKeywords.some(keyword =>
            surroundingText.toLowerCase().includes(keyword)
          );

          if (foundUnsubscribe) {
            unsubscribeLink = url;
            break;
          }
        }
      }

      if (!unsubscribeLink) {
        unsubscribeLink = 'N/A';
      }
    }

    return {
      id: message.data.id,
      from: fromEmail,
      subject: getHeaderValue('Subject') || 'No Subject',
      date: getHeaderValue('Date') || 'No Date',
      unsubscribeLink,
    };
  } catch (error) {
    console.error(`Error fetching details for message ID ${messageId}:`, error);

    if (error.response && error.response.data && error.response.data.error === 'invalid_grant') {
      console.log('Refresh token is invalid or expired.');
      if (fs.existsSync(TOKEN_PATH)) {
        fs.unlinkSync(TOKEN_PATH);
        console.log('Deleted invalid token file.');
      }
    }

    throw error;
  }
}

async function deleteEmails(ids) {
  // throw new Error('Simulated error: Failed to delete emails');

  try {
    const oAuth2Client = await getOAuth2ClientWithToken();

    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

    await gmail.users.messages.batchDelete({
      userId: 'me',
      ids,
    });

    console.log(`Emails with IDs [${ids.join(', ')}] have been deleted.`);
    return { success: true, message: `Emails with IDs [${ids.join(', ')}] deleted.` };
  } catch (error) {
    console.error('Error deleting email:', error);
    throw error;
  }
}

async function getUserProfile() {
  try {
    // Get the OAuth2 client with the access token
    const oAuth2Client = await getOAuth2ClientWithToken();

    // Create the Google OAuth2 API client
    const oauth2 = google.oauth2({
      version: 'v2',
      auth: oAuth2Client,  // Pass the OAuth2 client with the access token
    });

    // Fetch user info
    const userInfo = await oauth2.userinfo.get();

    // You can access the user's profile data here
    const { email, name, picture } = userInfo.data;

    return {
      email, 
      name,
      picture,
    };
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
}

const startServer = (retries) => {
  appServer.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE' && retries < maxRetries) {
      console.log(`Port ${port} is in use, trying port ${port + 1}...`);
      port++;
      startServer(retries + 1);
    } else {
      console.error('Error starting server:', err);
    }
  });
};

startServer(0);

module.exports = { getSpamEmails, getEmailDetails, getTotalSpamEmailCount, getUserProfile, deleteEmails, logout, checkToken, getOAuth2ClientWithToken };