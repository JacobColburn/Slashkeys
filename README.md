# SlashKeys — Text Expander

Type `\shortcut` in any text field and watch it expand into full text. A free, private,
no-account text expander for Chrome — the spiritual successor to the retired
[ShortKeys](https://en.wikipedia.org/wiki/ShortKeys) Windows utility, using the same
backslash-trigger syntax.

**Local-first:** snippets live in your browser (`chrome.storage.local`). Nothing is sent
to any server. No account required.

## Features

- `\trigger` expansion in inputs, textareas, and rich editors (Gmail, Outlook web, etc.)
- Works with React/Vue controlled inputs (LinkedIn, X, most SaaS apps)
- Snippet manager with search, enable/disable per snippet, per-site disable, global kill switch
- Password fields are always ignored
- **Pro** (one-time purchase): unlimited snippets (free tier: 20), dynamic placeholders
  (`{date}`, `{date:YYYY-MM-DD}`, `{time}`, `{clipboard}`, `{cursor}`), import/export
  (JSON + tab-delimited ShortKeys-style text)

## Known limitations (v1)

- Google Docs is not supported (canvas-rendered editor)
- Browser only — for system-wide expansion see Espanso

## Development

```
# load unpacked: chrome://extensions → Developer mode → Load unpacked → this folder
node tests/expander.test.js     # unit tests for the matching/placeholder engine
python assets/icons/gen_icons.py  # regenerate placeholder icons
```

No build step — vanilla JS, Manifest V3.

## Before store submission

1. Register the extension at [extensionpay.com](https://extensionpay.com) and confirm
   `EXTPAY_ID` in `src/background.js` and `src/options/options.js`.
2. Verify the name "SlashKeys" is available on the Chrome Web Store.
3. Screenshots (1280×800) and promo tile (440×280) → `store/`.
4. Publish `docs/` via GitHub Pages and put the privacy-policy URL in the listing.

## Roadmap

- Chrome sync for snippets (optional toggle)
- Edge / Firefox ports
- Folders/tags for large snippet libraries
