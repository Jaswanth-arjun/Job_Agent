import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import multer from 'multer';
import { LinkedInBotEngine } from './lib/bot-engine.js';
import { LinkedInTrackerEngine, setLiveSearchSessionDir } from './lib/tracker-engine.js';
import { LinkedInSessionManager } from './lib/session-manager.js';
import { db } from './lib/db.js';
import { handleRagChat } from './lib/rag-assistant.js';

import nodemailer from 'nodemailer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// ─── Sent Emails Data Helper ───
const sentEmailsFilePath = path.join(__dirname, 'data', 'sent_emails.json');
if (!fs.existsSync(path.dirname(sentEmailsFilePath))) fs.mkdirSync(path.dirname(sentEmailsFilePath), { recursive: true });
if (!fs.existsSync(sentEmailsFilePath)) fs.writeFileSync(sentEmailsFilePath, '[]', 'utf8');

function readSentEmails() {
  try { return JSON.parse(fs.readFileSync(sentEmailsFilePath, 'utf8')); } catch { return []; }
}
function writeSentEmails(records) {
  fs.writeFileSync(sentEmailsFilePath, JSON.stringify(records, null, 2), 'utf8');
}

// Multi-tenant LinkedIn session manager (per-user isolated Chrome profiles)
const sessionManager = new LinkedInSessionManager();

wss.on('error', () => {
  // Handle WS server error silently during port retry
});

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Multer for logo uploads ───
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `logo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});
const uploadLogo = multer({ storage: logoStorage, limits: { fileSize: 5 * 1024 * 1024 } });

// ─── Jobs JSON Data Helper ───
const jobsFilePath = path.join(__dirname, 'data', 'jobs.json');
if (!fs.existsSync(path.dirname(jobsFilePath))) fs.mkdirSync(path.dirname(jobsFilePath), { recursive: true });
if (!fs.existsSync(jobsFilePath)) fs.writeFileSync(jobsFilePath, '[]', 'utf8');

function readJobs() {
  try { return JSON.parse(fs.readFileSync(jobsFilePath, 'utf8')); } catch { return []; }
}
function writeJobs(jobs) {
  fs.writeFileSync(jobsFilePath, JSON.stringify(jobs, null, 2), 'utf8');
}

// ─── Admin Dashboard Route ───
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ─── Job Posting API ───
app.get('/api/jobs', (req, res) => {
  res.json(readJobs());
});

app.post('/api/jobs/upload-logo', uploadLogo.single('logo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No logo file uploaded.' });
  res.json({ path: `/uploads/${req.file.filename}` });
});

app.post('/api/jobs', (req, res) => {
  const { logo, role, company, filters, mustHaveSkills, goodToHaveSkills, applyLink, description } = req.body || {};
  if (!role || !company || !applyLink || !description) {
    return res.status(400).json({ error: 'role, company, applyLink, and description are required.' });
  }

  const job = {
    id: crypto.randomUUID(),
    logo: logo || '',
    role,
    company,
    filters: filters || {},
    mustHaveSkills: Array.isArray(mustHaveSkills) ? mustHaveSkills : [],
    goodToHaveSkills: Array.isArray(goodToHaveSkills) ? goodToHaveSkills : [],
    applyLink,
    description,
    postedAt: new Date().toISOString(),
  };

  const jobs = readJobs();
  jobs.push(job);
  writeJobs(jobs);

  res.json({ message: 'Job posted successfully!', job });
});

app.delete('/api/jobs/:id', (req, res) => {
  const jobs = readJobs();
  const idx = jobs.findIndex(j => j.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Job not found.' });

  // Delete logo file if exists
  const job = jobs[idx];
  if (job.logo && job.logo.startsWith('/uploads/')) {
    const logoFilePath = path.join(__dirname, job.logo);
    if (fs.existsSync(logoFilePath)) {
      try { fs.unlinkSync(logoFilePath); } catch {}
    }
  }

  jobs.splice(idx, 1);
  writeJobs(jobs);
  res.json({ message: 'Job deleted.' });
});

// ─── Google OAuth 2.0 Configuration & Storage ───
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '788869901191-d9d97on9eial7d2q8l6dbm0hngpsae8r.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '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';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/gmail/callback';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const GOOGLE_LOGIN_SCOPES = 'openid email profile';
const GOOGLE_GMAIL_SCOPES = 'https://mail.google.com/ https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile';

const gmailTokensFilePath = path.join(__dirname, 'data', 'gmail_tokens.json');
if (!fs.existsSync(path.dirname(gmailTokensFilePath))) fs.mkdirSync(path.dirname(gmailTokensFilePath), { recursive: true });
if (!fs.existsSync(gmailTokensFilePath)) fs.writeFileSync(gmailTokensFilePath, '{}', 'utf8');

function readGmailTokens() {
  try { return JSON.parse(fs.readFileSync(gmailTokensFilePath, 'utf8')); } catch { return {}; }
}
function writeGmailTokens(tokens) {
  fs.writeFileSync(gmailTokensFilePath, JSON.stringify(tokens, null, 2), 'utf8');
}

async function getValidAccessToken() {
  const tokens = readGmailTokens();
  if (!tokens.connected || !tokens.refresh_token) return null;

  if (tokens.access_token && tokens.expiry_date && (tokens.expiry_date - 60000 > Date.now())) {
    return tokens.access_token;
  }

  try {
    const refreshParams = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: tokens.refresh_token,
      grant_type: 'refresh_token'
    });

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: refreshParams.toString()
    });

    const data = await res.json();
    if (data.access_token) {
      tokens.access_token = data.access_token;
      tokens.expiry_date = Date.now() + (data.expires_in * 1000);
      writeGmailTokens(tokens);
      return data.access_token;
    }
  } catch (err) {
    console.error('Error refreshing Google access token:', err);
  }
  return tokens.access_token || null;
}

function buildGoogleAuthUrl(scopes, state, prompt) {
  const redirectUri = encodeURIComponent(GOOGLE_REDIRECT_URI);
  const scope = encodeURIComponent(scopes);
  return `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${redirectUri}&scope=${scope}&access_type=offline&include_granted_scopes=false&prompt=${prompt}&state=${encodeURIComponent(state)}`;
}

async function fetchGoogleUserInfo(accessToken) {
  const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return userRes.json();
}

// ─── Google Sign-In (identity only — does NOT connect Gmail) ───
app.get('/api/auth/google-url', (req, res) => {
  res.json({
    authUrl: buildGoogleAuthUrl(GOOGLE_LOGIN_SCOPES, 'login', 'select_account')
  });
});

// ─── Gmail Connect (mail scopes — used from Mail page only) ───
app.get('/api/gmail/auth-url', (req, res) => {
  const tokens = readGmailTokens();
  const promptParam = tokens.connected && tokens.refresh_token ? 'select_account' : 'consent';
  res.json({
    authUrl: buildGoogleAuthUrl(GOOGLE_GMAIL_SCOPES, 'gmail_connect', promptParam)
  });
});

app.get('/api/gmail/callback', async (req, res) => {
  const { code, state } = req.query;
  if (!code) {
    return res.status(400).send('Authorization code missing from Google redirect.');
  }

  const oauthState = String(state || 'gmail_connect');

  try {
    const tokenParams = new URLSearchParams({
      code: String(code),
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code'
    });

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams.toString()
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || tokenData.error) {
      console.error('OAuth Token Exchange Error:', tokenData);
      return res.status(400).send(`Google Token Exchange Failed: ${tokenData.error_description || tokenData.error}`);
    }

    let userEmail = '';
    let displayName = '';
    let avatarUrl = '';
    try {
      const userData = await fetchGoogleUserInfo(tokenData.access_token);
      if (userData.email) userEmail = userData.email;
      displayName = userData.name || '';
      avatarUrl = userData.picture || '';
    } catch (e) {
      console.warn('Could not fetch Google user info:', e.message);
    }

    if (oauthState === 'login') {
      const params = new URLSearchParams({
        login: 'true',
        email: userEmail,
        name: displayName,
        picture: avatarUrl
      });
      return res.redirect(`${FRONTEND_URL}/auth/callback?${params.toString()}`);
    }

    const currentTokens = readGmailTokens();
    const updatedTokens = {
      ...currentTokens,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || currentTokens.refresh_token,
      expiry_date: Date.now() + (tokenData.expires_in * 1000),
      email: userEmail,
      connected: true,
      connectedAt: new Date().toISOString()
    };

    writeGmailTokens(updatedTokens);
    process.env.GMAIL_USER = userEmail;

    const frontendUrl = `${FRONTEND_URL}/auth/callback?connected=true&email=${encodeURIComponent(userEmail)}`;
    res.redirect(frontendUrl);
  } catch (err) {
    console.error('Google Callback Error:', err);
    res.status(500).send(`OAuth Error: ${err.message}`);
  }
});

app.post('/api/gmail/disconnect', (req, res) => {
  const tokens = readGmailTokens();
  writeGmailTokens({
    ...tokens,
    connected: false,
    access_token: '',
    refresh_token: '',
    expiry_date: 0
  });
  res.json({ ok: true, connected: false });
});

app.get('/api/config/gmail', (req, res) => {
  const tokens = readGmailTokens();
  const configured = tokens.connected === true && Boolean(tokens.refresh_token || (process.env.GMAIL_USER && process.env.GMAIL_APP_PASS));
  res.json({
    configured,
    method: tokens.refresh_token ? 'oauth' : 'app_password',
    email: configured ? (tokens.email || process.env.GMAIL_USER || '') : ''
  });
});

app.post('/api/config/gmail', (req, res) => {
  const { email, appPassword } = req.body || {};
  if (!email || !appPassword) {
    return res.status(400).json({ error: 'Email and 16-character App Password are required.' });
  }

  const cleanPass = appPassword.replace(/\s+/g, '');
  process.env.GMAIL_USER = email.trim();
  process.env.GMAIL_APP_PASS = cleanPass;

  try {
    const envPath = path.join(__dirname, '.env');
    let content = '';
    if (fs.existsSync(envPath)) {
      content = fs.readFileSync(envPath, 'utf8');
      content = content.replace(/^GMAIL_USER=.*$/m, '').replace(/^GMAIL_APP_PASS=.*$/m, '').trim();
    }
    content += `\nGMAIL_USER=${email.trim()}\nGMAIL_APP_PASS=${cleanPass}\n`;
    fs.writeFileSync(envPath, content.trim(), 'utf8');
  } catch (e) {
    console.error('Error writing .env file:', e);
  }

  res.json({ success: true, message: 'Gmail SMTP configured successfully!', email: email.trim() });
});

app.get('/api/sent-emails', (req, res) => {
  res.json(readSentEmails());
});

app.post('/api/send-email', async (req, res) => {
  const { recipients, subject, bodyText, senderEmail, jobTitle, company, appPassword } = req.body || {};
  
  if (appPassword) {
    process.env.GMAIL_APP_PASS = appPassword.replace(/\s+/g, '');
  }

  const tokens = readGmailTokens();
  const gmailPass = process.env.GMAIL_APP_PASS;
  const targetEmail = senderEmail || tokens.email || process.env.GMAIL_USER || 'jaswanthnelluru2004@gmail.com';

  if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({ error: 'Recipients array is required.' });
  }

  try {
    let transporter;

    if (tokens && tokens.refresh_token) {
      // 1. Send via Google OAuth 2.0 Authorized Account (Full Access)
      const accessToken = await getValidAccessToken();
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: targetEmail,
          clientId: GOOGLE_CLIENT_ID,
          clientSecret: GOOGLE_CLIENT_SECRET,
          refreshToken: tokens.refresh_token,
          accessToken: accessToken,
        }
      });
    } else if (gmailPass) {
      // 2. Send via Gmail App Password
      transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          user: targetEmail,
          pass: gmailPass,
        },
      });
    } else {
      return res.status(400).json({
        requireGmailAuth: true,
        error: 'Google Mail Connection required for ' + targetEmail,
        message: 'Please connect your Google account with full permissions via Mail Automation -> Connect.'
      });
    }

    const results = [];
    const allSent = readSentEmails();

    for (const recipient of recipients) {
      const recipientName = recipient.name || 'Hiring Manager';
      const recipientEmail = recipient.email;

      const personalizedBody = (bodyText || '')
        .replace(/\{\{outreachEmployeeName\}\}/g, recipientName.split(' ')[0])
        .replace(/\{\{companyName\}\}/g, company || '')
        .replace(/\{\{jobTitle\}\}/g, jobTitle || '');

      const mailOptions = {
        from: `"${targetEmail.split('@')[0]}" <${targetEmail}>`,
        to: recipientEmail,
        subject: subject || `Application Referral Request for ${jobTitle || 'Role'} at ${company || 'Company'}`,
        text: personalizedBody,
        html: `<div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #111;">
          ${personalizedBody.replace(/\n/g, '<br/>')}
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #777;">
            📎 <em>Attached PDF Resume: ${targetEmail.split('@')[0]}-resume.pdf</em>
          </p>
        </div>`,
      };

      const info = await transporter.sendMail(mailOptions);

      const sentRecord = {
        id: info.messageId,
        recipient: recipientEmail,
        recipientName,
        sender: targetEmail,
        subject: subject || `Application Referral Request: ${jobTitle} at ${company}`,
        bodyText: personalizedBody,
        jobTitle: jobTitle || '',
        company: company || '',
        sentAt: new Date().toISOString(),
        status: 'Sent',
      };

      results.push(sentRecord);
      allSent.unshift(sentRecord);
    }

    writeSentEmails(allSent);

    res.json({
      success: true,
      message: `Successfully sent real emails to ${recipients.length} company employees!`,
      details: results,
    });
  } catch (err) {
    console.error('Error sending real Gmail email:', err);
    if (err.message && (err.message.includes('Invalid login') || err.message.includes('Username and Password not accepted') || err.code === 'EAUTH')) {
      return res.status(401).json({
        requireGmailAuth: true,
        error: 'Invalid Gmail Credentials',
        message: 'Your Google authentication session expired or password was rejected. Please click Connect to re-authenticate with Google.'
      });
    }
    res.status(500).json({ error: err.message || 'Failed to dispatch referral emails via Gmail.' });
  }
});

// Application State
let activeBotInstance = null;
let activeTrackerInstance = null;
let currentStatus = 'idle'; // 'idle', 'running', 'syncing', 'requires_login', 'completed', 'stopped'
const logBuffer = [];
let currentProgress = {
  stats: { sent: 0, skipped: 0, failed: 0, totalTarget: 0 },
  currentRole: '',
  currentRoleSent: 0,
  targetPerRole: 10,
  totalRoles: 0,
};

function broadcast(type, data) {
  const payload = JSON.stringify({ type, data });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

function pushLog(logObj) {
  logBuffer.push(logObj);
  if (logBuffer.length > 500) logBuffer.shift();
  broadcast('log', logObj);
}

// Live LinkedIn account connect/disconnect events → dashboard
sessionManager.on('account_change', ({ userId, account }) => {
  broadcast('linkedin_account', { userId, account });
  if (account.connected) {
    pushLog({
      timestamp: new Date().toLocaleTimeString('en-IN', { hour12: true }),
      message: `✅ LinkedIn account connected: ${account.memberName || 'LinkedIn Member'} (${account.method === 'li_at' ? 'li_at cookie sync' : 'login window'})`,
      level: 'success',
    });
  }
});

// WebSocket Connection handler
wss.on('connection', (ws) => {
  const allConns = db.getAllConnections();
  const analytics = db.getAnalytics();

  ws.send(
    JSON.stringify({
      type: 'init',
      data: {
        status: currentStatus,
        progress: currentProgress,
        logs: logBuffer.slice(-100),
        connections: allConns,
        analytics,
        accounts: sessionManager.listAccounts(),
      },
    })
  );
});

// REST API Endpoints
app.get('/api/status', (req, res) => {
  res.json({
    status: currentStatus,
    progress: currentProgress,
    stats: activeBotInstance ? activeBotInstance.stats : { sent: 0, skipped: 0, failed: 0, totalTarget: 0 },
    analytics: db.getAnalytics(),
  });
});

app.get('/api/connections', (req, res) => {
  const filter = {
    company: req.query.company || 'all',
    status: req.query.status || 'all',
    search: req.query.search || '',
  };
  res.json(db.getAllConnections(filter));
});

app.get('/api/analytics', (req, res) => {
  const company = req.query.company || 'all';
  res.json(db.getAnalytics(company));
});

app.post('/api/chat', async (req, res) => {
  const { message, geminiApiKey } = req.body || {};
  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message query is required' });
  }

  try {
    const existingBrowser = (activeTrackerInstance && activeTrackerInstance.browser) ? activeTrackerInstance.browser :
                            (activeBotInstance && activeBotInstance.browser) ? activeBotInstance.browser : null;
    const reply = await handleRagChat(message, geminiApiKey, existingBrowser);
    res.json({ reply });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to process RAG chat request' });
  }
});

// ─── Per-User LinkedIn Account Connect API ──────────────────
// User clicks "Connect" in the dashboard → LinkedIn login window opens →
// they log in with THEIR OWN LinkedIn account (2FA supported) → session saved
// under sessions/<userId>/.chrome-data and used by all future campaigns.

app.get('/api/linkedin-account', (req, res) => {
  const userId = req.query.userId || 'default';
  res.json(sessionManager.getAccount(userId));
});

// Method 1: one-click LinkedIn login window
app.post('/api/linkedin/connect', async (req, res) => {
  const userId = (req.body || {}).userId;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  if (activeBotInstance && activeBotInstance.isRunning) {
    return res.status(400).json({ error: 'Stop the running campaign before connecting a new LinkedIn account.' });
  }

  try {
    const result = await sessionManager.startLoginFlow(userId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Method 2: li_at cookie sync (industry-standard method used by Waalaxy/Expandi)
app.post('/api/linkedin/connect-cookie', async (req, res) => {
  const { userId, liAt } = req.body || {};
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  if (!liAt) return res.status(400).json({ error: 'li_at cookie value is required' });

  if (activeBotInstance && activeBotInstance.isRunning) {
    return res.status(400).json({ error: 'Stop the running campaign before connecting a new LinkedIn account.' });
  }

  try {
    const result = await sessionManager.connectWithCookie(userId, liAt);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/linkedin/disconnect', async (req, res) => {
  const userId = (req.body || {}).userId;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  if (activeBotInstance && activeBotInstance.isRunning) {
    return res.status(400).json({ error: 'Stop the running campaign before disconnecting LinkedIn.' });
  }

  try {
    const result = await sessionManager.disconnect(userId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/linkedin/verify', async (req, res) => {
  const userId = (req.body || {}).userId;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  if (activeBotInstance && activeBotInstance.isRunning) {
    return res.status(400).json({ error: 'Campaign is running — session lock active. Verify after it finishes.' });
  }

  try {
    const result = await sessionManager.verifySession(userId);
    res.json({ ...sessionManager.getAccount(userId), verification: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

async function triggerStatusSync(isAuto = false) {
  if (activeTrackerInstance && activeTrackerInstance.isRunning) {
    if (!isAuto) throw new Error('Background status tracker is already running!');
    return false;
  }

  const existingBrowser = (activeBotInstance && activeBotInstance.isRunning && activeBotInstance.browser) ? activeBotInstance.browser : null;

  const activeSessionDir = sessionManager.getActiveSessionDir();
  activeTrackerInstance = new LinkedInTrackerEngine({
    headless: true,
    existingBrowser,
    sessionDir: activeSessionDir || undefined,
  });

  activeTrackerInstance.on('log', (logObj) => {
    pushLog(logObj);
  });

  activeTrackerInstance.on('status_change', ({ status, error }) => {
    // Only update main status pill to syncing if campaign is not active
    if (!activeBotInstance || !activeBotInstance.isRunning) {
      currentStatus = status;
      broadcast('status_change', { status, error });
    }
    broadcast('connections_updated', { connections: db.getAllConnections(), analytics: db.getAnalytics() });
  });

  pushLog({
    timestamp: new Date().toLocaleTimeString('en-IN', { hour12: true }),
    message: isAuto ? '⏰ Periodic 24/7 Background Status Sync Triggered (2-Hour Interval)...' : '🔍 Background Status Sync Initiated...',
    level: 'info',
  });

  activeTrackerInstance.startSync().catch((err) => {
    pushLog({ timestamp: new Date().toLocaleTimeString('en-IN', { hour12: true }), message: `Tracker Sync Error: ${err.message}`, level: 'error' });
    if (!activeBotInstance || !activeBotInstance.isRunning) {
      currentStatus = 'idle';
      broadcast('status_change', { status: 'idle', error: err.message });
    }
  });

  return true;
}

app.post('/api/sync-status', async (req, res) => {
  try {
    const userId = (req.body || {}).userId || null;
    if (userId) {
      const account = sessionManager.getAccount(userId);
      if (account.connected) {
        sessionManager.setActiveUser(userId);
        setLiveSearchSessionDir(sessionManager.getSessionDir(userId));
      }
    }
    await triggerStatusSync(false);
    res.json({ message: 'Background Connection Status Sync started...' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Auto 24/7 Background Status Tracker (Runs every 15 Minutes automatically)
const AUTO_SYNC_INTERVAL_MS = 15 * 60 * 1000;
setInterval(() => {
  console.log('⏰ Triggering 24/7 periodic background status check...');
  triggerStatusSync(true).catch(() => {});
}, AUTO_SYNC_INTERVAL_MS);

// Trigger initial background sync 15s after boot
setTimeout(() => {
  console.log('🚀 Triggering initial startup background status check...');
  triggerStatusSync(true).catch(() => {});
}, 15000);

app.get('/api/logs', (req, res) => {
  res.json(logBuffer);
});

app.post('/api/start', async (req, res) => {
  if (activeBotInstance && activeBotInstance.isRunning) {
    return res.status(400).json({ error: 'Automation is already running!' });
  }

  const rawConfig = req.body || {};
  const userId = rawConfig.userId || null;

  // Per-user session resolution
  if (userId) {
    const account = sessionManager.getAccount(userId);
    if (!account.connected) {
      return res.status(400).json({ error: 'Connect your LinkedIn account first (Connected Accounts → Connect).' });
    }
    if (sessionManager.isLoginPending(userId)) {
      return res.status(400).json({ error: 'Complete or cancel the pending LinkedIn login window first.' });
    }
    sessionManager.setActiveUser(userId);
    setLiveSearchSessionDir(sessionManager.getSessionDir(userId));
    rawConfig.sessionDir = sessionManager.getSessionDir(userId);
    rawConfig.accountName = account.memberName;
  }

  // Reset buffers
  logBuffer.length = 0;
  currentProgress = {
    stats: { sent: 0, skipped: 0, failed: 0, totalTarget: 0 },
    currentRole: '',
    currentRoleSent: 0,
    targetPerRole: parseInt(rawConfig.connectionsPerFilter, 10) || 10,
    totalRoles: Array.isArray(rawConfig.roles) ? rawConfig.roles.length : 5,
  };

  activeBotInstance = new LinkedInBotEngine(rawConfig);

  if (rawConfig.accountName) {
    pushLog({
      timestamp: new Date().toLocaleTimeString('en-IN', { hour12: true }),
      message: `👤 Using connected LinkedIn account: ${rawConfig.accountName}`,
      level: 'info',
    });
  }

  activeBotInstance.on('log', (logObj) => {
    pushLog(logObj);
  });

  activeBotInstance.on('progress', (progressData) => {
    currentProgress = progressData;
    broadcast('progress', progressData);
  });

  activeBotInstance.on('sent', (sentRecord) => {
    broadcast('sent', sentRecord);
    broadcast('connections_updated', { connections: db.getAllConnections(), analytics: db.getAnalytics() });
  });

  activeBotInstance.on('status_change', ({ status, error }) => {
    currentStatus = status;
    broadcast('status_change', { status, error });
  });

  res.json({ message: 'Automation starting...', config: activeBotInstance.config });

  activeBotInstance.start().catch((err) => {
    pushLog({ timestamp: new Date().toLocaleTimeString(), message: `Fatal: ${err.message}`, level: 'error' });
    currentStatus = 'stopped';
    broadcast('status_change', { status: 'stopped', error: err.message });
  });
});

app.post('/api/stop', async (req, res) => {
  if (activeBotInstance && activeBotInstance.isRunning) {
    await activeBotInstance.stop();
  }
  if (activeTrackerInstance && activeTrackerInstance.isRunning) {
    await activeTrackerInstance.stop();
  }

  currentStatus = 'stopped';
  broadcast('status_change', { status: 'stopped' });
  res.json({ message: 'Stop signal sent successfully.' });
});

// API 404 Fallback - Always Return JSON
app.use('/api', (req, res) => {
  res.status(404).json({ error: `API endpoint ${req.originalUrl} not found` });
});

// Global Error Handler Middleware - Always Return JSON
app.use((err, req, res, next) => {
  console.error('Unhandled API Error:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

let currentPort = Number(PORT);

// Close any open LinkedIn login windows when the server shuts down
process.on('SIGINT', async () => {
  await sessionManager.shutdown();
  process.exit(0);
});
process.on('SIGTERM', async () => {
  await sessionManager.shutdown();
  process.exit(0);
});

function startServer(portToListen) {
  server.listen(portToListen);
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`⚠️  Port ${currentPort} is already in use. Retrying on port ${currentPort + 1}...`);
    currentPort++;
    setTimeout(() => {
      startServer(currentPort);
    }, 500);
  } else {
    console.error('❌ Server Listen Error:', err.message);
  }
});

server.on('listening', () => {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log(`║  🌐 LinkedIn Cloud Automation Web Dashboard Server Running!   ║`);
  console.log(`║  URL: http://localhost:${currentPort}                                 ║`);
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log('');
});

startServer(currentPort);
