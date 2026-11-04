import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

// Loads the real storage helper module in a DOM-like sandbox so the chat isolation
// contract is tested against production code, not a re-implementation.
function loadStore() {
  const source = fs.readFileSync(path.resolve('src/features/ai/chatSessionStore.ts'), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 },
  });
  const module = { exports: {} };
  const context = vm.createContext({ JSON, Error });
  const execute = vm.runInContext(`(function(require, module, exports) { ${outputText}\n })`, context);
  execute(() => { throw new Error('no imports expected'); }, module, module.exports);
  return module.exports;
}

function fakeStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem: key => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
  };
}

const store = loadStore();
const session = (id, text) => ({ id, title: text, category: 'ai-chef', messages: [{ sender: 'user', text, time: '10:00' }], updatedAt: 1 });

test('guest and every account read different conversation keys', () => {
  assert.equal(store.chatSessionsKey(null), store.GUEST_CHAT_STORAGE_KEY);
  assert.equal(store.chatSessionsKey(''), store.GUEST_CHAT_STORAGE_KEY);
  assert.equal(store.chatSessionsKey('  '), store.GUEST_CHAT_STORAGE_KEY);
  assert.notEqual(store.chatSessionsKey('user-1'), store.GUEST_CHAT_STORAGE_KEY);
  assert.notEqual(store.chatSessionsKey('user-1'), store.chatSessionsKey('user-2'));
});

test('a signed-in account history is invisible to the guest view on the same browser', () => {
  const storage = fakeStorage();
  const accountKey = store.chatSessionsKey('user-1');
  const guestKey = store.chatSessionsKey(null);
  store.writeChatSessions(storage, accountKey, [session('s1', 'Bí mật của thành viên')]);

  assert.equal(store.readChatSessions(storage, guestKey), null);
  assert.equal(store.readChatSessions(storage, store.chatSessionsKey('user-2')), null);
  assert.equal(store.readChatSessions(storage, accountKey)[0].messages[0].text, 'Bí mật của thành viên');
});

test('guest history never leaks into the next guest visit or into an account', () => {
  const storage = fakeStorage();
  const guestKey = store.chatSessionsKey(null);
  store.writeChatSessions(storage, guestKey, [session('g1', 'Câu hỏi của khách')]);
  store.clearChatSessions(storage, guestKey);

  assert.equal(store.readChatSessions(storage, guestKey), null);
  assert.equal(store.readChatSessions(storage, store.chatSessionsKey('user-1')), null);
});

test('malformed or empty payloads fall back to a clean conversation', () => {
  const storage = fakeStorage({ [store.GUEST_CHAT_STORAGE_KEY]: 'not-json', 'x': '[]' });
  assert.equal(store.readChatSessions(storage, store.GUEST_CHAT_STORAGE_KEY), null);
  assert.equal(store.readChatSessions(storage, 'x'), null);
  assert.equal(store.readChatSessions(null, 'x'), null);
});

test('the pending question survives the login round-trip exactly once', () => {
  const storage = fakeStorage();
  const pending = session('guest-session', 'Ba câu đầu');
  store.stashChatHandoff(storage, { session: pending, draft: 'Câu thứ tư đang viết dở' });

  const restored = store.takeChatHandoff(storage);
  assert.equal(restored.session.id, 'guest-session');
  assert.equal(restored.session.messages[0].text, 'Ba câu đầu');
  assert.equal(restored.draft, 'Câu thứ tư đang viết dở');
  // Consumed: a different account logging in later on the same browser must not inherit it.
  assert.equal(store.takeChatHandoff(storage), null);
});

test('clearing the handoff drops the pending guest conversation', () => {
  const storage = fakeStorage();
  store.stashChatHandoff(storage, { session: session('g', 'x'), draft: 'y' });
  store.clearChatHandoff(storage);
  assert.equal(store.takeChatHandoff(storage), null);
});
