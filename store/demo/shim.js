'use strict';

// Store-screenshot shim: mocks the chrome extension APIs so the REAL options/popup
// UI code renders on a plain http page where browser automation can screenshot it.
// Not shipped in the store zip. Stage variants via query params: ?theme=rose&pro=1
(() => {
  const params = new URLSearchParams(location.search);
  const theme = params.get('theme') || 'dark';
  const pro = params.get('pro') !== '0';
  const now = Date.now();

  const demoSnippets = [
    { trigger: 'greeting', description: 'Ticket greeting', content: 'Hi there,\n\nThanks for reaching out to IT Support! I’m taking a look at your ticket now and will have an update for you shortly.\n\nBest,\nAlex' },
    { trigger: 'ty', description: 'Quick thank-you', content: 'Thank you for your patience — let me know if there’s anything else I can help with!' },
    { trigger: 'sig', description: 'Email signature', content: 'Best regards,\n\nAlex Morgan\nIT Support' },
    { trigger: 'pwreset', description: 'Password reset steps', content: 'To reset your password:\n1. Go to the company portal and click “Forgot password”\n2. Check your inbox for the reset link (it expires in 15 minutes)\n3. Choose a new password — 12+ characters\n\nStuck on any step? Reply here and I’ll walk you through it.' },
    { trigger: 'meet', description: 'Propose meeting times', content: 'Happy to hop on a quick call — here are a few times that work on my end:\n• Tomorrow, 10:00–11:00 AM\n• Thursday, 2:00–3:00 PM\n\nIf none of those work, send me a couple that do!' },
    { trigger: 'followup', description: 'Ticket follow-up', content: 'Just following up on this ticket — is everything working as expected since the fix? If I don’t hear back by {date:dddd}, I’ll mark it resolved.' },
    { trigger: 'esc', description: 'Escalation note', content: 'Escalated to Tier 2 on {date} at {time}.\nReason: {cursor}\nCustomer has been notified.' }
  ].map((s, i) => ({ id: 'demo-' + i, enabled: true, createdAt: now + i, ...s }));

  const store = {
    snippets: demoSnippets,
    settings: { enabled: true, disabledSites: ['intranet.example.com'], theme },
    pro
  };

  window.chrome = {
    storage: {
      local: {
        get(defaults, cb) { cb(Object.assign({}, defaults, store)); },
        set(obj, cb) { Object.assign(store, obj); if (cb) cb(); }
      },
      onChanged: { addListener() {} }
    },
    permissions: {
      contains(q, cb) { cb(true); },
      request(q, cb) { cb(true); }
    },
    runtime: { openOptionsPage() {} },
    tabs: { query(q, cb) { cb([{ url: 'https://mail.google.com/mail/u/0/' }]); } }
  };

  window.ExtPay = () => ({
    getUser: async () => ({ paid: store.pro }),
    openPaymentPage() {},
    onPaid: { addListener() {} }
  });
})();
