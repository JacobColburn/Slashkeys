'use strict';

importScripts('lib/extpay.js');

// TODO before store submission: register "slashkeys" at https://extensionpay.com
// and confirm the id below matches the registered extension id.
const EXTPAY_ID = 'slashkeys';

let extpay = null;
try {
  extpay = ExtPay(EXTPAY_ID);
  extpay.startBackground();
} catch (e) {
  // Not registered yet — extension runs in free mode.
}

function refreshProStatus() {
  if (!extpay) return;
  extpay.getUser()
    .then(user => chrome.storage.local.set({ pro: !!user.paid }))
    .catch(() => {});
}

chrome.runtime.onStartup.addListener(refreshProStatus);
if (extpay) {
  extpay.onPaid.addListener(() => chrome.storage.local.set({ pro: true }));
}

const STARTER_SNIPPETS = [
  {
    id: 'starter-greeting',
    trigger: 'greeting',
    description: 'Example: a longer greeting',
    content: 'Hi there,\n\nThanks for reaching out! I\'d be happy to help you with this.\n\nBest regards,',
    enabled: true
  },
  {
    id: 'starter-ty',
    trigger: 'ty',
    description: 'Example: quick thank-you',
    content: 'Thank you for your patience — let me know if there\'s anything else I can help with!',
    enabled: true
  }
];

chrome.runtime.onInstalled.addListener(details => {
  refreshProStatus();
  if (details.reason !== 'install') return;
  chrome.storage.local.get({ snippets: null }, data => {
    if (!data.snippets) {
      const now = Date.now();
      chrome.storage.local.set({
        snippets: STARTER_SNIPPETS.map((s, i) => ({ ...s, createdAt: now + i })),
        settings: { enabled: true, disabledSites: [] }
      });
    }
    chrome.runtime.openOptionsPage();
  });
});
