'use strict';

// Run: node tests/expander.test.js
const assert = require('assert');
const E = require('../src/expander.js');

const snips = (...triggers) => triggers.map((t, i) => ({ id: String(i), trigger: t, enabled: true }));

let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log('  ok', name);
}

// ── findTrigger ───────────────────────────────────────────────────────────────

test('fires immediately on unambiguous trigger', () => {
  const m = E.findTrigger('hello \\greeting', snips('greeting', 'ty'));
  assert.equal(m.snippet.trigger, 'greeting');
  assert.equal(m.replaceLen, 9); // "\greeting"
  assert.equal(m.trailing, '');
});

test('no match without backslash', () => {
  assert.equal(E.findTrigger('hello greeting', snips('greeting')), null);
});

test('no match mid-word is still a match at end (ShortKeys behavior)', () => {
  // trigger only needs to be the last thing typed
  assert.ok(E.findTrigger('abc\\ty', snips('ty')));
});

test('picks the longest matching trigger', () => {
  const m = E.findTrigger('\\signoff', snips('sig', 'signoff'));
  assert.equal(m.snippet.trigger, 'signoff');
});

test('defers when trigger is a prefix of another trigger', () => {
  assert.equal(E.findTrigger('\\sig', snips('sig', 'sign')), null);
});

test('prefix-ambiguous trigger resolves on delimiter and keeps it', () => {
  const m = E.findTrigger('\\sig ', snips('sig', 'sign'));
  assert.equal(m.snippet.trigger, 'sig');
  assert.equal(m.replaceLen, 5); // "\sig" + space
  assert.equal(m.trailing, ' ');
});

test('longer trigger of an ambiguous pair fires immediately', () => {
  const m = E.findTrigger('\\sign', snips('sig', 'sign'));
  assert.equal(m.snippet.trigger, 'sign');
});

test('disabled snippets are ignored', () => {
  const s = [{ id: '1', trigger: 'ty', enabled: false }];
  assert.equal(E.findTrigger('\\ty', s), null);
});

test('newline works as a resolving delimiter', () => {
  const m = E.findTrigger('\\sig\n', snips('sig', 'sign'));
  assert.equal(m.snippet.trigger, 'sig');
  assert.equal(m.trailing, '\n');
});

test('case-sensitive triggers', () => {
  assert.equal(E.findTrigger('\\TY', snips('ty')), null);
});

// ── renderPlaceholders ────────────────────────────────────────────────────────

const NOW = new Date(2026, 6, 6, 14, 5, 9); // Mon Jul 6 2026, 2:05:09 pm

test('plain text passes through untouched', () => {
  const r = E.renderPlaceholders('hello world', { now: NOW });
  assert.equal(r.text, 'hello world');
  assert.equal(r.cursorOffset, null);
});

test('{date:YYYY-MM-DD} formats', () => {
  assert.equal(E.renderPlaceholders('{date:YYYY-MM-DD}', { now: NOW }).text, '2026-07-06');
});

test('date tokens: names, 12h clock, am/pm', () => {
  assert.equal(
    E.renderPlaceholders('{date:ddd MMM D, h:mm a}', { now: NOW }).text,
    'Mon Jul 6, 2:05 pm');
});

test('{clipboard} substitutes provided text', () => {
  assert.equal(E.renderPlaceholders('x {clipboard} y', { clipboard: 'CLIP' }).text, 'x CLIP y');
});

test('{clipboard} empty when unavailable', () => {
  assert.equal(E.renderPlaceholders('x{clipboard}y', {}).text, 'xy');
});

test('{cursor} is removed and reported as offset', () => {
  const r = E.renderPlaceholders('Dear {cursor},\nregards');
  assert.equal(r.text, 'Dear ,\nregards');
  assert.equal(r.cursorOffset, 5);
});

test('hasPlaceholders / needsClipboard detection', () => {
  assert.ok(E.hasPlaceholders('a {date} b'));
  assert.ok(E.hasPlaceholders('a {cursor}'));
  assert.ok(!E.hasPlaceholders('just {braces} here'));
  assert.ok(E.needsClipboard('{clipboard}'));
  assert.ok(!E.needsClipboard('{date}'));
});

console.log(`\n${passed} tests passed`);
