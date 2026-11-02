import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

function loadHelpers() {
  const source = fs.readFileSync(path.resolve('src/utils/authRedirect.ts'), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 },
  });
  const module = { exports: {} };
  const context = vm.createContext({});
  const execute = vm.runInContext(`(function(require, module, exports) { ${outputText}\n })`, context);
  execute(() => ({}), module, module.exports);
  return module.exports;
}

const { safeReturnPath, loginDestination } = loadHelpers();

test('known application paths are accepted as return targets', () => {
  for (const path of ['/ai-chef', '/fridge-scan', '/questions', '/questions/mine/abc-123', '/meal-plans', '/settings', '/admin/users']) {
    assert.equal(safeReturnPath(path), path);
  }
  assert.equal(safeReturnPath({ pathname: '/ai-chef' }), '/ai-chef');
});

test('external and malformed redirects are rejected (open-redirect guard)', () => {
  for (const value of [
    'https://evil.test', '//evil.test', '/\\evil.test', 'javascript:alert(1)',
    ' /ai-chef', '/ai-chef?x=1', '/unknown-page', '/admin%2F..%2Fuser', '', null, undefined, 42,
  ]) {
    assert.equal(safeReturnPath(value), null, `should reject ${String(value)}`);
  }
});

test('members go back to the page that asked them to log in', () => {
  assert.equal(loginDestination('MEMBER', '/ai-chef'), '/ai-chef');
  assert.equal(loginDestination('MEMBER', '/fridge-scan'), '/fridge-scan');
  assert.equal(loginDestination('MEMBER', undefined), '/dashboard');
});

test('members never land on admin pages from a forged return path', () => {
  assert.equal(loginDestination('MEMBER', '/admin/users'), '/dashboard');
  assert.equal(loginDestination('MEMBER', '//evil.test'), '/dashboard');
});

test('admins only return to admin pages', () => {
  assert.equal(loginDestination('ADMIN', '/admin/questions'), '/admin/questions');
  assert.equal(loginDestination('ADMIN', '/ai-chef'), '/admin');
  assert.equal(loginDestination('ADMIN', undefined), '/admin');
});
