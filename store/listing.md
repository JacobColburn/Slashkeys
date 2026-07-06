# Chrome Web Store listing — SlashKeys

## Name
SlashKeys — Text Expander

## Summary (132 chars max)
Type \shortcut, get full text. Free, private text expansion — no account, snippets never leave your device. ShortKeys replacement.

## Description

Stop retyping the same greetings, sign-offs, and canned replies. Type a short trigger
like \greeting anywhere on the web and SlashKeys instantly expands it into your full
text.

If you used the retired ShortKeys Windows app, you already know how this works — same
backslash triggers, now living in your browser. Import your old tab-delimited ShortKeys
export and keep every macro you've built (Pro).

WHY SLASHKEYS

✔ Private by design — snippets are stored in your browser, never on our servers
✔ No account, no sign-up, no cloud
✔ Works everywhere: Gmail, Outlook web, LinkedIn, X, helpdesk tools, CRMs, forums
✔ Password fields are always ignored
✔ Free tier includes 20 snippets with full expansion features

PRO (one-time purchase — not a subscription)

★ Unlimited snippets
★ Dynamic placeholders: {date}, {date:YYYY-MM-DD}, {time}, {clipboard}, {cursor}
★ Import & export (JSON and ShortKeys-style tab-delimited text)

HOW IT WORKS

1. Click the SlashKeys icon → Manage snippets → add a trigger like "greeting" and the
   text it should expand to.
2. In any text field, type \greeting — it expands instantly, right where you typed it.
3. That's it. Toggle it off per-site or globally from the popup.

Known limitation: Google Docs uses a canvas editor and is not yet supported.

## Category
Productivity › Workflow & Planning

## Permission justifications (for the review form)

- Single purpose: expand user-defined text shortcuts typed into web-page text fields.
- Host access <all_urls>: the content script must run on any site where the user types,
  to detect and expand their triggers in that page's text fields.
- storage: save the user's snippets and settings locally.
- activeTab: read the current tab's hostname so the popup can offer a per-site
  on/off toggle.
- Optional clipboardRead: powers the {clipboard} placeholder; requested only when the
  user enables that feature.
- Remote code: none. ExtensionPay's client library is bundled with the extension.

## Assets checklist
- [ ] Icon 128×128 (assets/icons/icon128.png — consider a polished replacement)
- [ ] Screenshot 1280×800 ×3 (options page, expansion in Gmail, popup)
- [ ] Small promo tile 440×280
- [ ] Privacy policy URL (GitHub Pages → docs/privacy.md)
