const FIELD_HINTS = [
  { key: 'email', test: /e-?mail/i },
  { key: 'phone', test: /phone|mobile|tel/i },
  { key: 'firstName', test: /first name|given name|firstname/i },
  { key: 'lastName', test: /last name|surname|family name|lastname/i },
  { key: 'fullName', test: /^name$|full name|your name/i },
  { key: 'location', test: /city|location|address|country/i },
  { key: 'linkedin', test: /linkedin/i },
  { key: 'github', test: /github/i },
  { key: 'portfolio', test: /portfolio|website|url/i },
  { key: 'university', test: /university|college|school|institute/i },
  { key: 'gpa', test: /cgpa|gpa|grade point/i },
  { key: 'internship', test: /internship|past intern|previous intern|intern experience/i },
  { key: 'degree', test: /degree|qualification|major|course/i },
  { key: 'graduation', test: /graduat|class of|year of/i },
];

function extensionAlive() {
  try { return Boolean(chrome.runtime && chrome.runtime.id); } catch { return false; }
}

function labelFor(input) {
  const id = input.id && document.querySelector(`label[for="${CSS.escape(input.id)}"]`);
  const wrapping = input.closest('label');
  const aria = input.getAttribute('aria-label') || '';
  const nearby = input.getAttribute('placeholder') || input.name || input.id || '';
  const heading = input.closest('div, li, fieldset')?.querySelector('label, p, span, legend, div')?.innerText || '';
  return [id?.innerText, wrapping?.innerText, aria, nearby, heading].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

function profileValue(profile, key) {
  const name = profile.fullName || '';
  const [first, ...rest] = name.split(' ').filter(Boolean);
  const education = profile.education?.[0] || {};
  const internships = profile.experience || profile.internships || [];
  const intern = internships.map((item) => [item.title, item.company, item.dates].filter(Boolean).join(' — ')).filter(Boolean).join('; ');
  const map = {
    email: profile.email,
    phone: profile.phone,
    firstName: first || '',
    lastName: rest.join(' '),
    fullName: name,
    location: profile.location || 'Naidupeta, Tirupati District, Andhra Pradesh, India',
    linkedin: profile.links?.linkedin || profile.linkedin || '',
    github: profile.links?.github || profile.github || '',
    portfolio: profile.links?.portfolio || '',
    university: education.school || education.university || 'N.B.K.R. Institute of Science and Technology, Tirupati',
    gpa: education.gpa || education.detail || education.score || '7.5',
    internship: intern || 'Java Full Stack Developer Intern; Full Stack Web Development Intern',
    degree: education.degree || 'B.Tech in Computer Science and Engineering',
    graduation: education.dates || '2027',
  };
  return String(map[key] || '').trim();
}

function setNativeValue(input, value) {
  if (input.tagName === 'SELECT') {
    const option = [...input.options].find((item) => item.value === value || item.text.toLowerCase().includes(String(value).toLowerCase()));
    if (option) input.value = option.value;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return;
  }
  const proto = input.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function resumeFile(pending) {
  if (!pending.resumeBase64) return null;
  const binary = atob(pending.resumeBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], pending.resumeName || 'hamzo-resume.pdf', { type: 'application/pdf' });
}

function attachResume(input, pending) {
  const file = resumeFile(pending);
  if (!file || !input) return false;
  const transfer = new DataTransfer();
  transfer.items.add(file);
  try { input.files = transfer.files; } catch { return false; }
  input.dispatchEvent(new Event('change', { bubbles: true }));
  input.dispatchEvent(new Event('input', { bubbles: true }));
  return Boolean(input.files && input.files.length);
}

function allFileInputs() {
  return [...document.querySelectorAll('input[type="file"]')];
}

async function attachGeneratedResume(pending) {
  const file = resumeFile(pending);
  if (!file) return false;
  const clickAttach = () => {
    const node = [...document.querySelectorAll('button, a, label, span')].find((el) => {
      const text = (el.innerText || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();
      return /^(attach file|upload( file)?|choose file|browse)$/i.test(text) || /^attach file$/i.test(text);
    });
    if (node) node.click();
  };
  const waitForInputs = async (ms) => {
    const start = Date.now();
    while (Date.now() - start < ms) {
      const found = allFileInputs();
      if (found.length) return found;
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
    return allFileInputs();
  };
  let attached = allFileInputs().some((input) => attachResume(input, pending));
  if (!attached) {
    clickAttach();
    attached = (await waitForInputs(1500)).some((input) => attachResume(input, pending));
  }
  if (!attached) {
    const zone = [...document.querySelectorAll('div, section, label')].find((el) => {
      const text = (el.innerText || '').replace(/\s+/g, ' ').trim();
      return /resume\/?cv|attach file/i.test(text) && text.length < 120;
    });
    if (zone) {
      const transfer = new DataTransfer();
      transfer.items.add(file);
      ['dragenter', 'dragover', 'drop'].forEach((type) => {
        zone.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: transfer }));
      });
      attached = allFileInputs().some((input) => attachResume(input, pending));
    }
  }
  return attached;
}

function askQuestion(question) {
  return new Promise((resolve) => {
    const box = document.createElement('div');
    box.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:2147483647;width:320px;background:#fff;border:1px solid #d9d9d2;border-radius:14px;padding:14px;box-shadow:0 12px 40px rgba(0,0,0,.18);font-family:sans-serif';
    box.innerHTML = `<strong style="display:block;margin-bottom:8px">Hamzo needs one detail</strong><p style="font-size:13px;margin:0 0 8px">${question}</p>`;
    const field = document.createElement('input');
    field.style.cssText = 'width:100%;box-sizing:border-box;padding:8px;border:1px solid #d9d9d2;border-radius:8px';
    const save = document.createElement('button');
    save.textContent = 'Save answer';
    save.style.cssText = 'margin-top:8px;background:#171817;color:#fff;border:0;border-radius:8px;padding:8px 12px;cursor:pointer';
    save.onclick = () => {
      const answer = field.value.trim();
      if (!answer) return;
      box.remove();
      resolve(answer);
    };
    box.append(field, save);
    document.body.appendChild(box);
    field.focus();
  });
}

function questionFor(el) {
  const block = el.closest('fieldset, li, .form-group, [class*="question"], [class*="field"]') || el.parentElement;
  const wider = block?.parentElement;
  const text = [block?.innerText, wider?.innerText, el.getAttribute('aria-label'), labelFor(el)].filter(Boolean).join(' ');
  return text.replace(/\s+/g, ' ').trim().slice(0, 700);
}

function isPlaceholderValue(input) {
  const type = (input.getAttribute('type') || '').toLowerCase();
  if (input.tagName === 'SELECT') {
    const selected = input.options[input.selectedIndex];
    const text = (selected?.text || input.value || '').trim();
    return !text || /please select|^select$|^-+$|choose/i.test(text);
  }
  if (type === 'radio' || type === 'checkbox') return !input.checked;
  return !String(input.value || '').trim();
}

function optionList(select) {
  return [...select.options].filter((item) => item.value !== '' && !/please select|^select$|^-+$|choose/i.test(item.text.trim()));
}

function matchOption(select, wanted) {
  const wantedText = String(wanted || '').trim().toLowerCase();
  return optionList(select).find((item) => {
    const text = item.text.trim().toLowerCase();
    const value = String(item.value).toLowerCase();
    return text === wantedText || value === wantedText || text.startsWith(wantedText) || wantedText.startsWith(text);
  });
}

function chooseYesNo(question, profile) {
  const q = String(question || '').toLowerCase();
  const company = String(profile.company || location.hostname.replace(/^www\./, '').split('.')[0] || '').toLowerCase();
  if (/employed by|worked (for|at)|contractor|previously employed|ever been employed/.test(q) && (company && q.includes(company) || /rubrik|this company|the company/.test(q))) return 'no';
  if (/currently employed|current employer/.test(q) && !/name of/.test(q)) return 'no';
  if (/convicted|felony|criminal/.test(q)) return 'no';
  if (/export control|denied|debarred/.test(q)) return 'no';
  if (/relative work|family member/.test(q)) return 'no';
  if (/require sponsorship|need sponsorship|visa sponsorship/.test(q)) return 'yes';
  if (/authorized to work/.test(q) && /without sponsorship|no sponsorship/.test(q)) return 'no';
  if (/available|onsite|on-site|start|internship|willing to relocate|able to relocate|18 years|over 18|legally eligible|acknowledge|privacy|agree|consent|terms|i understand/.test(q)) return 'yes';
  if (/gender|hispanic|race|ethnicity|veteran|disability|lgbt/.test(q)) return 'decline';
  return '';
}

function applyChoice(input, wanted) {
  if (!wanted) return false;
  if (input.tagName === 'SELECT') {
    const yesNo = wanted === 'yes' || wanted === 'no';
    let option = matchOption(input, wanted === 'yes' ? 'Yes' : wanted === 'no' ? 'No' : wanted === 'decline' ? 'Decline' : wanted);
    if (!option && wanted === 'decline') option = optionList(input).find((item) => /decline|prefer not|do not wish|don't wish/i.test(item.text));
    if (!option && yesNo) {
      option = optionList(input).find((item) => (wanted === 'yes' ? /^(yes|y)\b/i : /^(no|n)\b/i).test(item.text.trim()));
    }
    if (!option) return false;
    input.value = option.value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }
  const type = (input.getAttribute('type') || '').toLowerCase();
  if (type === 'radio') {
    const label = `${labelFor(input)} ${input.value}`.toLowerCase();
    const yes = wanted === 'yes' && /^(yes|y)\b|true|agree/.test(label);
    const no = wanted === 'no' && /^(no|n)\b|false|disagree/.test(label);
    if (yes || no || label.includes(String(wanted).toLowerCase())) {
      input.checked = true;
      input.click();
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
  }
  if (type === 'checkbox' && (wanted === 'yes' || wanted === 'agree')) {
    if (!input.checked) input.click();
    return true;
  }
  return false;
}

function fillChoices(profile, answers) {
  const controls = [...document.querySelectorAll('select, input[type="radio"], input[type="checkbox"]')];
  const radioNames = new Set();
  controls.forEach((input) => {
    const type = (input.getAttribute('type') || '').toLowerCase();
    const question = questionFor(input);
    const key = question.toLowerCase().slice(0, 180);
    const saved = answers[key];
    if (type === 'radio') {
      if (radioNames.has(input.name)) return;
      radioNames.add(input.name);
    }
    if (type === 'checkbox' && /privacy|acknowledge|agree|terms|consent/.test(question.toLowerCase())) {
      applyChoice(input, saved || 'yes');
      answers[key] = 'yes';
      return;
    }
    const wanted = saved || chooseYesNo(question, profile);
    if (!wanted) return;
    if (type === 'radio') {
      const group = [...document.querySelectorAll(`input[type="radio"][name="${CSS.escape(input.name)}"]`)];
      const hit = group.find((item) => applyChoice(item, wanted));
      if (hit) answers[key] = wanted;
      return;
    }
    if (applyChoice(input, wanted)) answers[key] = wanted;
  });
}

function collectInputs() {
  return [...document.querySelectorAll('input, textarea, select')].filter((input) => {
    const type = (input.getAttribute('type') || '').toLowerCase();
    if (['hidden', 'password', 'submit', 'button', 'checkbox', 'radio'].includes(type)) return false;
    if (input.disabled || input.getAttribute('aria-hidden') === 'true') return false;
    return true;
  });
}

async function waitForForm() {
  for (let i = 0; i < 20; i += 1) {
    const heading = [...document.querySelectorAll('h1,h2,h3,legend')].find((node) => /apply for this job|application|submit application/i.test(node.innerText || ''));
    if (heading) heading.scrollIntoView({ block: 'start' });
    else window.scrollTo({ top: document.body.scrollHeight * 0.55, behavior: 'instant' });
    const inputs = collectInputs().filter((input) => (input.getAttribute('type') || '') !== 'file');
    if (inputs.length >= 3) return inputs;
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  return collectInputs();
}

async function fillPage(profile, answers, pending) {
  if (/\/error(\/|$)|\/500(\/|$)/i.test(location.pathname)) return;
  const inputs = await waitForForm();

  inputs.forEach((input) => {
    const type = (input.getAttribute('type') || '').toLowerCase();
    if (type === 'file') return;
    if (input.tagName !== 'SELECT' && !isPlaceholderValue(input) && input.value) return;
    const label = labelFor(input);
    const hint = FIELD_HINTS.find((item) => item.test.test(label));
    if (!hint) return;
    const value = profileValue(profile, hint.key);
    if (value) setNativeValue(input, value);
  });
  await attachGeneratedResume(pending);
  fillChoices(profile, answers);

  const unknown = collectInputs().filter((input) => {
    const type = (input.getAttribute('type') || '').toLowerCase();
    if (type === 'file') return false;
    if (input.tagName === 'SELECT') return false;
    if (!isPlaceholderValue(input)) return false;
    const label = labelFor(input);
    const hint = FIELD_HINTS.find((item) => item.test.test(label));
    if (hint) {
      const value = profileValue(profile, hint.key);
      if (value) {
        setNativeValue(input, value);
        return false;
      }
    }
    if (!input.required && input.getAttribute('aria-required') !== 'true' && !/\*/.test(label)) return false;
    return Boolean(label);
  });

  for (const input of unknown.slice(0, 6)) {
    const question = labelFor(input);
    const saved = answers[question.toLowerCase()];
    const answer = saved || await askQuestion(question);
    answers[question.toLowerCase()] = answer;
    setNativeValue(input, answer);
  }

  try {
    if (extensionAlive()) await chrome.storage.local.set({ answers });
  } catch {}

  const formRoot = [...document.querySelectorAll('form, section, div')].find((node) => /apply for this job/i.test(node.innerText || '') && node.querySelector('input'));
  const submit = [...(formRoot || document).querySelectorAll('button, input[type="submit"]')].find((node) => {
    const text = (node.innerText || node.value || '').trim();
    if (!text) return false;
    if (/sign in|log in|contact sales|attach file|paste/i.test(text)) return false;
    return /submit application|^submit$|^apply$|apply now|send application/i.test(text);
  });
  const stillEmpty = [...document.querySelectorAll('input, textarea, select')].filter((input) => {
    const type = (input.getAttribute('type') || '').toLowerCase();
    if (['hidden', 'password', 'submit', 'button', 'file'].includes(type)) return false;
    if (!(input.required || input.getAttribute('aria-required') === 'true' || /\*/.test(questionFor(input)))) return false;
    if (type === 'checkbox' || type === 'radio') return false;
    return isPlaceholderValue(input);
  });
  if (submit && stillEmpty.length === 0) submit.click();
}

function sameJobPage(pendingUrl) {
  let expected;
  try { expected = new URL(pendingUrl); } catch { return false; }
  if (/\/error(\/|$)|\/500(\/|$)/i.test(location.pathname)) return false;
  if (location.hostname !== expected.hostname) return false;
  const expectedPath = expected.pathname.replace(/\/+$/, '');
  const currentPath = location.pathname.replace(/\/+$/, '');
  if (currentPath === expectedPath) return true;
  if (currentPath.startsWith(`${expectedPath}/`)) return true;
  const expectedJob = expectedPath.match(/job[./][\w.-]+/i)?.[0];
  const currentJob = currentPath.match(/job[./][\w.-]+/i)?.[0];
  return Boolean(expectedJob && expectedJob === currentJob);
}

let filling = false;

function runPending(stored) {
  const pending = stored.pendingApply;
  if (!pending?.url || filling) return;
  if (!sameJobPage(pending.url)) return;
  filling = true;
  fillPage(stored.profile || {}, stored.answers || {}, pending).finally(() => {
    filling = false;
    setTimeout(() => {
      try { chrome.storage.local.remove('pendingApply'); } catch {}
    }, 8000);
  });
}

function bootApply() {
  if (!extensionAlive()) return;
  chrome.storage.local.get(['pendingApply', 'profile', 'answers'], runPending);
}

bootApply();
if (extensionAlive()) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes.pendingApply?.newValue) return;
    chrome.storage.local.get(['pendingApply', 'profile', 'answers'], runPending);
  });
}
