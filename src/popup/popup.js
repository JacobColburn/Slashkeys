'use strict';

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g,
  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let snippets = [];
let settings = { enabled: true, disabledSites: [] };
let host = null;

function persist() { chrome.storage.local.set({ settings }); }

function renderList() {
  const q = $('search').value.trim().toLowerCase();
  const rows = snippets.filter(s =>
    !q || s.trigger.toLowerCase().includes(q) ||
    (s.description || '').toLowerCase().includes(q) ||
    s.content.toLowerCase().includes(q));

  $('empty').classList.toggle('hidden', snippets.length > 0);
  $('count').textContent = `${snippets.length} snippet${snippets.length === 1 ? '' : 's'}`;
  $('list').innerHTML = rows.map(s => `
    <li data-id="${esc(s.id)}" title="Click to copy">
      <span class="trig">\\${esc(s.trigger)}</span>
      <span class="desc">${esc(s.description || s.content)}</span>
    </li>`).join('');

  $('list').querySelectorAll('li').forEach(li =>
    li.addEventListener('click', () => {
      const s = snippets.find(x => x.id === li.dataset.id);
      navigator.clipboard.writeText(s.content).then(() => {
        li.insertAdjacentHTML('beforeend', '<span class="copied">copied ✓</span>');
        setTimeout(() => li.querySelector('.copied')?.remove(), 900);
      });
    }));
}

document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get({ snippets: [], settings: {} }, data => {
    snippets = data.snippets;
    settings = Object.assign({ enabled: true, disabledSites: [] }, data.settings);
    $('global-enabled').checked = settings.enabled;
    renderList();

    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      try {
        const url = new URL(tabs[0].url);
        if (!['http:', 'https:'].includes(url.protocol)) throw new Error('not a website');
        host = url.hostname;
        $('site-host').textContent = host;
        $('site-enabled').checked = !settings.disabledSites.includes(host);
      } catch (e) {
        $('site-row').classList.add('hidden');
      }
    });
  });

  $('search').addEventListener('input', renderList);
  $('global-enabled').addEventListener('change', e => {
    settings.enabled = e.target.checked;
    persist();
  });
  $('site-enabled').addEventListener('change', e => {
    if (!host) return;
    settings.disabledSites = settings.disabledSites.filter(h => h !== host);
    if (!e.target.checked) settings.disabledSites.push(host);
    persist();
  });
  $('manage').addEventListener('click', () => chrome.runtime.openOptionsPage());
});
