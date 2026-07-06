'use strict';

// SlashKeys content script — watches editable fields and expands \triggers in place.
(() => {
  const E = self.SlashKeysExpander;
  const FREE_SNIPPET_LIMIT = 20;

  let snippets = [];
  let pro = false;
  let settings = { enabled: true, disabledSites: [] };
  let siteDisabled = false;
  let expanding = false; // guards against reacting to our own synthetic input events

  function applyState(data) {
    pro = !!data.pro;
    snippets = Array.isArray(data.snippets) ? data.snippets : [];
    if (!pro) snippets = snippets.slice(0, FREE_SNIPPET_LIMIT);
    settings = Object.assign({ enabled: true, disabledSites: [] }, data.settings);
    siteDisabled = (settings.disabledSites || []).includes(location.hostname);
  }

  chrome.storage.local.get({ snippets: [], settings: {}, pro: false }, applyState);
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    chrome.storage.local.get({ snippets: [], settings: {}, pro: false }, applyState);
  });

  // Password and other sensitive input types are excluded by whitelisting.
  const TEXT_INPUT_TYPES = ['text', 'search', 'url', 'tel', 'email'];

  function editableKind(el) {
    if (!el || !(el instanceof Element)) return null;
    if (el instanceof HTMLInputElement) {
      return TEXT_INPUT_TYPES.includes(el.type) ? 'value' : null;
    }
    if (el instanceof HTMLTextAreaElement) return 'value';
    if (el.isContentEditable) return 'ce';
    return null;
  }

  document.addEventListener('input', onInput, true);

  function onInput(e) {
    if (expanding) return;
    if (!settings.enabled || siteDisabled || !snippets.length) return;
    // composedPath()[0] reaches inside open shadow roots (e.target is retargeted)
    const el = e.composedPath ? e.composedPath()[0] : e.target;
    const kind = editableKind(el);
    if (kind === 'value') expandInValueField(el);
    else if (kind === 'ce') expandInContentEditable(el);
  }

  function render(snippet, done) {
    if (!pro || !E.hasPlaceholders(snippet.content)) {
      done({ text: snippet.content, cursorOffset: null });
      return;
    }
    if (E.needsClipboard(snippet.content) && navigator.clipboard && navigator.clipboard.readText) {
      navigator.clipboard.readText()
        .then(clip => done(E.renderPlaceholders(snippet.content, { clipboard: clip })))
        .catch(() => done(E.renderPlaceholders(snippet.content, { clipboard: '' })));
      return;
    }
    done(E.renderPlaceholders(snippet.content));
  }

  function expandInValueField(el) {
    const caret = el.selectionStart;
    if (caret == null || caret !== el.selectionEnd) return;
    const before = el.value.slice(Math.max(0, caret - E.MAX_LOOKBEHIND), caret);
    const m = E.findTrigger(before, snippets);
    if (!m) return;
    render(m.snippet, ({ text, cursorOffset }) => {
      // Re-check the field didn't change while (possibly) awaiting the clipboard
      if (el.selectionStart !== caret) return;
      const start = caret - m.replaceLen;
      const insert = text + m.trailing;
      const value = el.value.slice(0, start) + insert + el.value.slice(caret);
      setNativeValue(el, value);
      const pos = cursorOffset != null ? start + cursorOffset : start + insert.length;
      el.setSelectionRange(pos, pos);
      expanding = true;
      try {
        el.dispatchEvent(new Event('input', { bubbles: true }));
      } finally {
        expanding = false;
      }
    });
  }

  // React/Vue controlled inputs track the value via the native setter; setting
  // el.value directly gets reverted on the next render. Use the prototype setter
  // then dispatch a real input event so the framework sees the change.
  function setNativeValue(el, value) {
    const proto = el instanceof HTMLInputElement
      ? HTMLInputElement.prototype
      : HTMLTextAreaElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
  }

  function expandInContentEditable(el) {
    const root = el.getRootNode();
    const sel = root.getSelection ? root.getSelection() : window.getSelection();
    if (!sel || !sel.rangeCount || !sel.isCollapsed) return;
    const node = sel.anchorNode;
    if (!node || node.nodeType !== Node.TEXT_NODE) return;
    const offset = sel.anchorOffset;
    const m = E.findTrigger(node.textContent.slice(0, offset), snippets);
    if (!m || offset < m.replaceLen) return;
    render(m.snippet, ({ text, cursorOffset }) => {
      if (sel.anchorNode !== node || sel.anchorOffset !== offset) return;
      const range = document.createRange();
      range.setStart(node, offset - m.replaceLen);
      range.setEnd(node, offset);
      sel.removeAllRanges();
      sel.addRange(range);
      const insert = text + m.trailing;
      expanding = true;
      try {
        // execCommand keeps undo history and plays nicest with rich editors (Gmail etc.)
        document.execCommand('insertText', false, insert);
        if (cursorOffset != null && sel.modify) {
          for (let i = 0; i < insert.length - cursorOffset; i++) {
            sel.modify('move', 'backward', 'character');
          }
        }
      } finally {
        expanding = false;
      }
    });
  }
})();
