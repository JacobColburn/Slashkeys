'use strict';

const FREE_SNIPPET_LIMIT = 20;
const EXTPAY_ID = 'slashkeys';

// Swatch color = that theme's --bg-raised / --accent pair (keep in sync with themes.css)
const THEMES = [
  { id: 'dark', name: 'Dark', pro: false, bg: '#1f2023', fg: '#4fb8a5' },
  { id: 'light', name: 'Light', pro: false, bg: '#ffffff', fg: '#3b76f0' },
  { id: 'midnight', name: 'Midnight', pro: true, bg: '#0a0e1a', fg: '#7c8cff' },
  { id: 'forest', name: 'Forest', pro: true, bg: '#17221b', fg: '#5fbf8a' },
  { id: 'rose', name: 'Rosé', pro: true, bg: '#fdf9f7', fg: '#c96a75' },
  { id: 'amoled', name: 'AMOLED', pro: true, bg: '#000000', fg: '#ececec' }
];

let snippets = [];
let settings = { enabled: true, disabledSites: [] };
let pro = false;
let editId = null;

let extpay = null;
try { extpay = ExtPay(EXTPAY_ID); } catch (e) { /* not registered yet */ }

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g,
  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ── Load & render ─────────────────────────────────────────────────────────────

function load() {
  chrome.storage.local.get({ snippets: [], settings: {}, pro: false }, data => {
    snippets = data.snippets;
    settings = Object.assign({ enabled: true, disabledSites: [], theme: 'dark' }, data.settings);
    pro = !!data.pro;
    renderAll();
  });
}

function persist() {
  chrome.storage.local.set({ snippets, settings });
}

function renderAll() {
  $('global-enabled').checked = settings.enabled;
  $('pro-badge').classList.toggle('hidden', !pro);
  $('upgrade-btn').classList.toggle('hidden', pro);
  $('ph-pro-tag').classList.toggle('hidden', pro);
  $('limit-banner').classList.toggle('hidden', pro || snippets.length < FREE_SNIPPET_LIMIT);
  renderTable();
  renderDisabledSites();
  renderThemePicker();
}

// ── Themes ────────────────────────────────────────────────────────────────────

function applyTheme() {
  const theme = THEMES.find(t => t.id === settings.theme && (pro || !t.pro));
  document.documentElement.dataset.theme = theme ? theme.id : 'dark';
}

function renderThemePicker() {
  applyTheme();
  const el = $('theme-picker');
  el.innerHTML = THEMES.map(t => `
    <button class="theme-swatch ${settings.theme === t.id ? 'active' : ''}"
            data-theme-id="${t.id}" title="${t.name}${t.pro && !pro ? ' (Pro)' : ''}">
      ${t.pro && !pro ? '<span class="lock">🔒</span>' : ''}
      <span class="dot" style="background:linear-gradient(135deg, ${t.bg} 55%, ${t.fg} 55%)"></span>
      ${t.name}
    </button>`).join('');
  el.querySelectorAll('.theme-swatch').forEach(btn =>
    btn.addEventListener('click', () => {
      const t = THEMES.find(x => x.id === btn.dataset.themeId);
      if (t.pro && !pro) {
        requireProFor(`The ${t.name} theme`);
        return;
      }
      settings.theme = t.id;
      persist(); renderThemePicker();
    }));
}

function renderTable() {
  const q = $('search').value.trim().toLowerCase();
  const rows = snippets.filter(s =>
    !q || s.trigger.toLowerCase().includes(q) ||
    (s.description || '').toLowerCase().includes(q) ||
    s.content.toLowerCase().includes(q));

  $('count').textContent = pro
    ? `${snippets.length} snippet${snippets.length === 1 ? '' : 's'}`
    : `${snippets.length} / ${FREE_SNIPPET_LIMIT} snippets`;
  $('empty').classList.toggle('hidden', snippets.length > 0);
  $('snippet-table').classList.toggle('hidden', snippets.length === 0);

  $('tbody').innerHTML = rows.map(s => `
    <tr class="${s.enabled === false ? 'row-disabled' : ''}" data-id="${esc(s.id)}">
      <td><span class="trigger-code">\\${esc(s.trigger)}</span></td>
      <td>${esc(s.description || '')}</td>
      <td><span class="content-preview">${esc(s.content)}</span></td>
      <td>
        <div class="row-actions">
          <button class="btn-icon act-toggle" title="${s.enabled === false ? 'Enable' : 'Disable'}">${s.enabled === false ? '▶' : '⏸'}</button>
          <button class="btn-icon act-edit" title="Edit">✏️</button>
          <button class="btn-icon act-del" title="Delete">🗑</button>
        </div>
      </td>
    </tr>`).join('');

  $('tbody').querySelectorAll('tr').forEach(tr => {
    const id = tr.dataset.id;
    tr.querySelector('.act-edit').addEventListener('click', () => openModal(id));
    tr.querySelector('.act-del').addEventListener('click', () => {
      const s = snippets.find(x => x.id === id);
      if (confirm(`Delete \\${s.trigger}?`)) {
        snippets = snippets.filter(x => x.id !== id);
        persist(); renderAll();
      }
    });
    tr.querySelector('.act-toggle').addEventListener('click', () => {
      const s = snippets.find(x => x.id === id);
      s.enabled = s.enabled === false;
      persist(); renderAll();
    });
  });
}

function renderDisabledSites() {
  const el = $('disabled-sites');
  const sites = settings.disabledSites || [];
  el.innerHTML = sites.length
    ? sites.map(h => `<span class="chip">${esc(h)} <button data-h="${esc(h)}" title="Re-enable">✕</button></span>`).join('')
    : '<span class="hint">None</span>';
  el.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
    settings.disabledSites = sites.filter(x => x !== b.dataset.h);
    persist(); renderAll();
  }));
}

// ── Add / edit modal ──────────────────────────────────────────────────────────

function openModal(id = null) {
  if (!id && !pro && snippets.length >= FREE_SNIPPET_LIMIT) {
    $('limit-banner').classList.remove('hidden');
    $('limit-banner').scrollIntoView({ behavior: 'smooth' });
    return;
  }
  editId = id;
  const s = id ? snippets.find(x => x.id === id) : null;
  $('modal-title').textContent = s ? 'Edit snippet' : 'Add snippet';
  $('f-trigger').value = s ? s.trigger : '';
  $('f-description').value = s ? (s.description || '') : '';
  $('f-content').value = s ? s.content : '';
  $('f-error').classList.add('hidden');
  updatePreview();
  $('modal').classList.remove('hidden');
  $('f-trigger').focus();
}

function closeModal() { $('modal').classList.add('hidden'); }

function saveSnippet() {
  const trigger = $('f-trigger').value.trim().replace(/^\\+/, '');
  const description = $('f-description').value.trim();
  const content = $('f-content').value;
  const err = msg => {
    $('f-error').textContent = msg;
    $('f-error').classList.remove('hidden');
  };

  if (!trigger) return err('Trigger is required.');
  if (/[\s\\]/.test(trigger)) return err('Trigger can\'t contain spaces or backslashes.');
  if (trigger.length > 50) return err('Trigger is too long (max 50 characters).');
  if (!content) return err('Expansion text is required.');
  const dupe = snippets.find(s => s.trigger === trigger && s.id !== editId);
  if (dupe) return err(`\\${trigger} already exists — edit that snippet instead.`);
  if (!pro && SlashKeysExpander.hasPlaceholders(content)) {
    return err('Placeholders like {date} and {cursor} are a Pro feature.');
  }

  if (editId) {
    Object.assign(snippets.find(s => s.id === editId), { trigger, description, content });
  } else {
    snippets.push({
      id: crypto.randomUUID(),
      trigger, description, content,
      enabled: true,
      createdAt: Date.now()
    });
  }
  persist(); renderAll(); closeModal();
}

function updatePreview() {
  const content = $('f-content').value;
  const box = $('f-preview');
  if (!content || !SlashKeysExpander.hasPlaceholders(content)) {
    box.classList.add('hidden');
    return;
  }
  const { text, cursorOffset } = SlashKeysExpander.renderPlaceholders(content, { clipboard: '‹clipboard›' });
  box.textContent = cursorOffset != null
    ? text.slice(0, cursorOffset) + '‸' + text.slice(cursorOffset)
    : text;
  box.classList.remove('hidden');
}

// ── Import / export ───────────────────────────────────────────────────────────

function requireProFor(feature) {
  if (pro) return true;
  if (confirm(`${feature} is a Pro feature. Open the upgrade page?`)) openUpgrade();
  return false;
}

function exportSnippets() {
  if (!requireProFor('Export')) return;
  const blob = new Blob(
    [JSON.stringify({ app: 'slashkeys', version: 1, snippets }, null, 2)],
    { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'slashkeys-snippets.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

function importFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    let incoming = [];
    const raw = String(reader.result);
    try {
      const data = JSON.parse(raw);
      const arr = Array.isArray(data) ? data : data.snippets;
      if (!Array.isArray(arr)) throw new Error('bad shape');
      incoming = arr
        .filter(s => s && s.trigger && s.content)
        .map(s => ({
          id: crypto.randomUUID(),
          trigger: String(s.trigger).replace(/^\\+/, '').trim(),
          description: String(s.description || ''),
          content: String(s.content),
          enabled: s.enabled !== false,
          createdAt: Date.now()
        }));
    } catch (e) {
      // Not JSON — treat as tab-delimited text (ShortKeys-style: trigger<TAB>replacement)
      incoming = raw.split(/\r?\n/)
        .map(line => line.split('\t'))
        .filter(parts => parts.length >= 2 && parts[0].trim() && parts[1])
        .map(parts => ({
          id: crypto.randomUUID(),
          trigger: parts[0].replace(/^\\+/, '').trim(),
          description: '',
          content: parts.slice(1).join('\t').replace(/\\n/g, '\n'),
          enabled: true,
          createdAt: Date.now()
        }));
    }
    if (!incoming.length) {
      alert('No snippets found in that file. Expected SlashKeys JSON or tab-delimited text (trigger, then expansion, separated by a tab).');
      return;
    }
    const existing = new Set(snippets.map(s => s.trigger));
    const added = incoming.filter(s => !existing.has(s.trigger));
    snippets = snippets.concat(added);
    persist(); renderAll();
    alert(`Imported ${added.length} snippet${added.length === 1 ? '' : 's'}` +
      (incoming.length - added.length ? ` (${incoming.length - added.length} skipped as duplicates)` : '') + '.');
  };
  reader.readAsText(file);
}

// ── Pro / upgrade ─────────────────────────────────────────────────────────────

function openUpgrade() {
  if (extpay) extpay.openPaymentPage();
  else alert('Payments aren\'t wired up in this development build yet.');
}

function refreshPro() {
  if (!extpay) return;
  extpay.getUser()
    .then(u => chrome.storage.local.set({ pro: !!u.paid }))
    .catch(() => {});
}

// ── Wire-up ───────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  load();
  refreshPro();

  $('search').addEventListener('input', renderTable);
  $('add-btn').addEventListener('click', () => openModal());
  $('global-enabled').addEventListener('change', e => {
    settings.enabled = e.target.checked;
    persist();
  });

  $('f-save').addEventListener('click', saveSnippet);
  $('f-cancel').addEventListener('click', closeModal);
  $('modal').addEventListener('click', e => { if (e.target === $('modal')) closeModal(); });
  $('f-content').addEventListener('input', updatePreview);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });

  document.querySelectorAll('.chip-btn').forEach(btn =>
    btn.addEventListener('click', () => {
      const ta = $('f-content');
      const ph = btn.dataset.ph;
      const at = ta.selectionStart ?? ta.value.length;
      ta.value = ta.value.slice(0, at) + ph + ta.value.slice(ta.selectionEnd ?? at);
      ta.setSelectionRange(at + ph.length, at + ph.length);
      ta.focus();
      updatePreview();
    }));

  $('export-btn').addEventListener('click', exportSnippets);
  $('import-btn').addEventListener('click', () => {
    if (!requireProFor('Import')) return;
    $('import-file').click();
  });
  $('import-file').addEventListener('change', e => {
    if (e.target.files[0]) importFile(e.target.files[0]);
    e.target.value = '';
  });

  $('upgrade-btn').addEventListener('click', openUpgrade);
  $('limit-upgrade').addEventListener('click', openUpgrade);

  $('clipboard-perm').addEventListener('click', () => {
    if (!requireProFor('The {clipboard} placeholder')) return;
    chrome.permissions.request({ permissions: ['clipboardRead'] }, granted => {
      $('clipboard-perm').textContent = granted ? '✓ Clipboard access granted' : 'Grant clipboard access';
    });
  });
  chrome.permissions.contains({ permissions: ['clipboardRead'] }, has => {
    if (has) $('clipboard-perm').textContent = '✓ Clipboard access granted';
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && (changes.pro || changes.snippets || changes.settings)) load();
  });
});
