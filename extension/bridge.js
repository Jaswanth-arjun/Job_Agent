function extensionAlive() {
  try { return Boolean(chrome.runtime && chrome.runtime.id); } catch { return false; }
}

function reply(type, extra) {
  window.postMessage({ source: 'hamzo-extension', type, ...extra }, '*');
}

window.addEventListener('message', (event) => {
  if (event.source !== window || event.data?.source !== 'hamzo-app') return;
  const data = event.data;

  if (data.type === 'HAMZO_PING') {
    reply('HAMZO_PONG');
    return;
  }

  if (!extensionAlive()) {
    if (data.type === 'HAMZO_START_APPLY') reply('HAMZO_APPLY_READY', { ok: false, error: 'Reload Hamzo Apply, then refresh this Resume page.' });
    return;
  }

  if (data.type === 'HAMZO_SAVE_PROFILE') {
    chrome.storage.local.set({
      profile: data.profile || {},
      answers: data.answers || {},
    }, () => reply('HAMZO_SAVED'));
    return;
  }

  if (data.type === 'HAMZO_GET_ANSWERS') {
    chrome.storage.local.get(['answers'], (stored) => {
      reply('HAMZO_ANSWERS', { answers: stored.answers || {} });
    });
    return;
  }

  if (data.type === 'HAMZO_START_APPLY') {
    chrome.runtime.sendMessage({
      type: 'HAMZO_OPEN_JOB',
      url: data.url,
      profile: data.profile || {},
      answers: data.answers || {},
      resumeBase64: data.resumeBase64 || '',
      resumeName: data.resumeName || 'hamzo-resume.pdf',
    }, (result) => {
      const error = chrome.runtime.lastError?.message || result?.error || '';
      reply('HAMZO_APPLY_READY', { ok: Boolean(result?.ok) && !error, error, url: result?.url || '' });
    });
  }
});
