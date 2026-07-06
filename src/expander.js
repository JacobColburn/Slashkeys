'use strict';

// Pure trigger-matching + placeholder logic. No DOM, no chrome APIs — shared by
// the content script, the options-page preview, and node unit tests.
const SlashKeysExpander = (() => {
  // Characters that resolve an ambiguous trigger (one that is a prefix of a longer trigger)
  const DELIMS = ' \t\n.,;:!?)]}>"\'';
  const MAX_LOOKBEHIND = 64; // longest supported "\trigger" sequence

  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];
  const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  function pad(n) { return String(n).padStart(2, '0'); }

  function formatDate(d, fmt) {
    const h24 = d.getHours();
    const h12 = h24 % 12 || 12;
    const tokens = {
      YYYY: String(d.getFullYear()),
      YY: String(d.getFullYear()).slice(-2),
      MMMM: MONTHS[d.getMonth()],
      MMM: MONTHS[d.getMonth()].slice(0, 3),
      MM: pad(d.getMonth() + 1),
      M: String(d.getMonth() + 1),
      dddd: WEEKDAYS[d.getDay()],
      ddd: WEEKDAYS[d.getDay()].slice(0, 3),
      DD: pad(d.getDate()),
      D: String(d.getDate()),
      HH: pad(h24),
      H: String(h24),
      hh: pad(h12),
      h: String(h12),
      mm: pad(d.getMinutes()),
      m: String(d.getMinutes()),
      ss: pad(d.getSeconds()),
      s: String(d.getSeconds()),
      A: h24 < 12 ? 'AM' : 'PM',
      a: h24 < 12 ? 'am' : 'pm'
    };
    return fmt.replace(/YYYY|YY|MMMM|MMM|MM|M|dddd|ddd|DD|D|HH|H|hh|h|mm|m|ss|s|A|a/g,
      t => tokens[t]);
  }

  // Expand {date}, {time}, {date:FMT}, {time:FMT}, {clipboard}, {cursor} in snippet content.
  // opts: { now?: Date|number, clipboard?: string }
  // Returns { text, cursorOffset } — cursorOffset is where the caret should land, or null.
  function renderPlaceholders(content, opts = {}) {
    const now = opts.now ? new Date(opts.now) : new Date();
    let text = content.replace(/\{(date|time)(?::([^}]+))?\}/gi, (m, kind, fmt) => {
      if (fmt) return formatDate(now, fmt);
      return kind.toLowerCase() === 'date'
        ? now.toLocaleDateString()
        : now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    });
    text = text.replace(/\{clipboard\}/gi, opts.clipboard != null ? opts.clipboard : '');
    let cursorOffset = null;
    const ci = text.search(/\{cursor\}/i);
    if (ci !== -1) {
      cursorOffset = ci;
      text = text.replace(/\{cursor\}/gi, '');
    }
    return { text, cursorOffset };
  }

  function hasPlaceholders(content) {
    return /\{(date|time)(:[^}]+)?\}|\{clipboard\}|\{cursor\}/i.test(content);
  }

  function needsClipboard(content) {
    return /\{clipboard\}/i.test(content);
  }

  // Find a trigger at the end of the text before the caret.
  // A trigger fires the moment "\trigger" is fully typed — unless it is a prefix of
  // another enabled trigger (e.g. \sig vs \sign), in which case it fires when the
  // next character is a delimiter (the delimiter is kept after the expansion).
  // Returns { snippet, replaceLen, trailing } or null.
  function findTrigger(textBeforeCaret, snippets) {
    const text = textBeforeCaret.slice(-MAX_LOOKBEHIND);
    const enabled = snippets.filter(s => s.enabled !== false && s.trigger);
    if (!enabled.length || text.indexOf('\\') === -1) return null;

    let best = null;
    for (const s of enabled) {
      if (text.endsWith('\\' + s.trigger) &&
          (!best || s.trigger.length > best.trigger.length)) best = s;
    }
    if (best) {
      const ambiguous = enabled.some(o =>
        o.trigger.length > best.trigger.length && o.trigger.startsWith(best.trigger));
      if (!ambiguous) return { snippet: best, replaceLen: best.trigger.length + 1, trailing: '' };
    }

    const last = text.charAt(text.length - 1);
    if (DELIMS.includes(last)) {
      const body = text.slice(0, -1);
      let bestD = null;
      for (const s of enabled) {
        if (body.endsWith('\\' + s.trigger) &&
            (!bestD || s.trigger.length > bestD.trigger.length)) bestD = s;
      }
      if (bestD) return { snippet: bestD, replaceLen: bestD.trigger.length + 2, trailing: last };
    }
    return null;
  }

  return { findTrigger, renderPlaceholders, formatDate, hasPlaceholders, needsClipboard, MAX_LOOKBEHIND };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = SlashKeysExpander;
