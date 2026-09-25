const LOCAL_TABS = ['http://localhost:5173/*', 'http://127.0.0.1:5173/*'];
const APPLY_HOSTS = /greenhouse\.io$|lever\.co$|myworkdayjobs\.com$|ashbyhq\.com$|smartrecruiters\.com$|icims\.com$|workable\.com$|jobvite\.com$|taleo\.net$|successfactors\.com$|oraclecloud\.com$|linkedin\.com$|indeed\.com$/i;

async function connectOpenHamzoTabs() {
  const tabs = await chrome.tabs.query({ url: LOCAL_TABS });
  await Promise.all(tabs.map((tab) =>
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['bridge.js'],
      injectImmediately: true,
    }).catch(() => {})
  ));
}

function hostname(raw) {
  try { return new URL(raw).hostname.replace(/^www\./, ''); } catch { return ''; }
}

function isErrorUrl(raw) {
  try {
    const url = new URL(raw);
    return /\/error(\/|$)|\/500(\/|$)/i.test(url.pathname) || /\/error\/500/i.test(url.href);
  } catch {
    return true;
  }
}

function isApplyHost(raw) {
  const host = hostname(raw);
  return APPLY_HOSTS.test(host) || APPLY_HOSTS.test(host.split('.').slice(-2).join('.')) || /\.greenhouse\.io$|\.lever\.co$|\.ashbyhq\.com$|\.myworkdayjobs\.com$/i.test(host);
}

function isCompanyMarketingHost(raw) {
  const host = hostname(raw);
  if (!host || isApplyHost(raw)) return false;
  return !/job|board|career|workday|greenhouse|lever|ashby/i.test(host);
}

function looksLikeJobUrl(raw) {
  try {
    const url = new URL(raw);
    if (isErrorUrl(raw)) return false;
    if (isApplyHost(raw)) return true;
    const path = url.pathname.toLowerCase();
    if (/\/(jobs?|careers?|apply)\b/i.test(path) && /job[./]|\/jobs\/|\/apply|reqid=|gh_jid=/i.test(`${path}${url.search}`)) return true;
    return /\/jobs\/|\/job\/|\/apply\/|\/careers\/.*job/i.test(path) && path.split('/').filter(Boolean).length >= 2;
  } catch {
    return false;
  }
}

function applyLinkFromHtml(html, baseUrl) {
  const matches = [...String(html || '').matchAll(/href=["']([^"']+)["']/gi)].map((item) => item[1]);
  for (const href of matches) {
    try {
      const next = new URL(href, baseUrl).toString();
      if (isErrorUrl(next)) continue;
      if (isApplyHost(next)) return next;
    } catch {}
  }
  return '';
}

async function resolveJobUrl(raw) {
  const start = String(raw || '').trim();
  if (!start || isErrorUrl(start)) throw new Error('That address is an error page, not the job posting.');
  if (isApplyHost(start) || looksLikeJobUrl(start)) return start;
  try {
    const response = await fetch(start, { redirect: 'follow' });
    const finalUrl = response.url || start;
    if (isErrorUrl(finalUrl)) throw new Error('That job site sent an error page instead of the posting.');
    if (isApplyHost(finalUrl) || looksLikeJobUrl(finalUrl)) return finalUrl;
    const html = await response.text();
    const applyUrl = applyLinkFromHtml(html, finalUrl);
    if (applyUrl) return applyUrl;
  } catch (err) {
    if (looksLikeJobUrl(start)) return start;
    throw err;
  }
  return start;
}

chrome.runtime.onInstalled.addListener(connectOpenHamzoTabs);
chrome.runtime.onStartup.addListener(connectOpenHamzoTabs);

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete' || !tab.url || /localhost:5173|127\.0\.0\.1:5173/.test(tab.url)) return;
  chrome.storage.local.get('pendingApply', ({ pendingApply }) => {
    if (!pendingApply?.url) return;
    try {
      const expected = new URL(pendingApply.url);
      const current = new URL(tab.url);
      if (current.hostname !== expected.hostname) return;
      const job = expected.pathname.match(/job[./][\w.-]+/i)?.[0];
      const here = current.pathname.match(/job[./][\w.-]+/i)?.[0];
      if (current.pathname.replace(/\/+$/, '') !== expected.pathname.replace(/\/+$/, '') && job !== here) return;
      chrome.scripting.executeScript({ target: { tabId }, files: ['filler.js'] }).catch(() => {});
    } catch {}
  });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'HAMZO_OPEN_JOB') return undefined;
  resolveJobUrl(message.url).then((url) => {
    if (isErrorUrl(url)) {
      sendResponse({ ok: false, error: 'That job address is an error page. Paste the Apply URL from the address bar.' });
      return;
    }
    chrome.storage.local.set({
      profile: message.profile || {},
      answers: message.answers || {},
      pendingApply: {
        url,
        resumeBase64: message.resumeBase64 || '',
        resumeName: message.resumeName || 'hamzo-resume.pdf',
        startedAt: Date.now(),
      },
    }, () => {
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
          if (!tab.id || !tab.url || /localhost:5173|127\.0\.0\.1:5173/.test(tab.url)) return;
          try {
            const expected = new URL(url);
            const current = new URL(tab.url);
            if (current.hostname !== expected.hostname) return;
            const job = expected.pathname.match(/job[./][\w.-]+/i)?.[0];
            const here = current.pathname.match(/job[./][\w.-]+/i)?.[0];
            if (current.pathname.replace(/\/+$/, '') !== expected.pathname.replace(/\/+$/, '') && job !== here) return;
            chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['filler.js'] }).catch(() => {});
          } catch {}
        });
      });
      sendResponse({ ok: true, url });
    });
  }).catch((err) => {
    sendResponse({ ok: false, error: err.message || 'Could not open that job.' });
  });
  return true;
});
