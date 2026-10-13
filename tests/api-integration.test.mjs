import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createHash, webcrypto } from 'node:crypto';
import ts from 'typescript';

// Compile the actual service modules in an isolated browser-like context.
// No production mocks or new test dependencies are shipped to the browser.
function setup(handler) {
  const calls = [];
  const storage = () => { const values = new Map(); return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  }; };
  const context = vm.createContext({
    console, setTimeout, clearTimeout, Headers, FormData, File, AbortController, AbortSignal, URLSearchParams, Event,
    Error, Date, TextEncoder, Uint8Array, crypto: webcrypto,
    localStorage: storage(), sessionStorage: storage(), window: new EventTarget(),
    fetch: async (url, options) => { calls.push({ url, ...options }); return handler(url, options, calls); },
  });
  const cache = new Map();
  function load(filename) {
    filename = path.resolve(filename);
    if (cache.has(filename)) return cache.get(filename).exports;
    const source = fs.readFileSync(filename, 'utf8').replaceAll('import.meta.env.VITE_API_BASE_URL', "'/api'");
    const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 } });
    const module = { exports: {} }; cache.set(filename, module);
    const execute = vm.runInContext(`(function(require, module, exports) { ${outputText}\n })`, context, { filename });
    execute(relative => load(path.resolve(path.dirname(filename), `${relative}.ts`)), module, module.exports);
    return module.exports;
  }
  return { context, calls, api: load('src/services/apiClient.ts'), auth: load('src/services/authService.ts').authService,
    users: load('src/services/userService.ts').userService, ai: load('src/services/aiService.ts').aiService,
    restaurants: load('src/services/restaurantService.ts').restaurantService };
}
const profile = { userId: 'user-1', username: 'member', email: 'member@example.com', fullName: 'Thành viên', role: 'USER', status: 'ACTIVE' };
const auth = (token = 'token-1', expiresInSeconds = 900) => ({ ...profile, accessToken: token, tokenType: 'Bearer', expiresInSeconds });
const reply = (data, status = 200, message = 'OK', code = status) => ({ ok: status < 400, status,
  json: async () => ({ success: status < 400, code, message, data }) });
const hash = value => createHash('sha256').update(value).digest('hex');

test('nearby restaurants maps node and way coordinates, skips missing locations and sorts by distance', async () => {
  const fixture = setup(() => ({ ok: true, json: async () => ({ elements: [
    { type: 'way', id: 1, center: { lat: 10.02, lon: 106 }, tags: { name: 'Quán xa', 'diet:vegan': 'only', 'addr:street': 'Đường A' } },
    { type: 'node', id: 2, lat: 10.001, lon: 106, tags: { name: 'Quán gần' } },
    { type: 'node', id: 3, tags: { name: 'Thiếu vị trí' } },
  ] }) }));
  const places = await fixture.restaurants.nearby({ lat: 10, lon: 106 }, 5);
  assert.equal(places.length, 2);
  assert.equal(places[0].name, 'Quán gần');
  assert.equal(places[1].vegan, true);
  assert.equal(places[1].address, 'Đường A');
  assert.ok(places[0].distance < places[1].distance);
  assert.match(fixture.calls[0].body.get('data'), /around:5000,10,106/);
});

test('restaurant location lookup encodes text and reports no results or service failure', async () => {
  const success = setup(() => ({ ok: true, json: async () => [{ lat: '10.5', lon: '106.5' }] }));
  const point = await success.restaurants.locate('Quận 1 & trung tâm');
  assert.equal(point.lat, 10.5);
  assert.equal(new URL(success.calls[0].url).searchParams.get('q'), 'Quận 1 & trung tâm');
  const empty = setup(() => ({ ok: true, json: async () => [] }));
  await assert.rejects(empty.restaurants.locate('unknown'), /Không tìm thấy khu vực/);
  const failure = setup(() => ({ ok: false }));
  await assert.rejects(failure.restaurants.nearby({ lat: 10, lon: 106 }, 2), /đang bận/);
});

test('login hashes the password, maps usernameOrEmail and keeps tokens out of storage', async () => {
  const fixture = setup(() => reply(auth()));
  const result = await fixture.auth.login({ emailOrPhone: ' member ', password: 'User@123', rememberMe: false });
  assert.equal(result.success, true); assert.equal(result.data.name, profile.fullName);
  const request = fixture.calls[0];
  assert.equal(request.url, '/api/auth/login'); assert.equal(request.credentials, 'include');
  assert.deepEqual(JSON.parse(request.body), { usernameOrEmail: 'member', password: hash('User@123') });
  assert.equal(request.headers.has('Authorization'), false);
  assert.equal(fixture.context.sessionStorage.getItem('vegeai_session'), 'true');
  assert.equal(fixture.context.localStorage.getItem('vegeai_session'), null);
  assert.equal(fixture.context.localStorage.getItem('accessToken'), null);
});

test('registration requires email verification and does not create an authenticated session', async () => {
  const fixture = setup(() => reply(undefined, 201));
  const result = await fixture.auth.register({ username: ' member ', fullName: ' Thành viên ', emailOrPhone: ' member@example.com ',
    password: 'User@123', confirmPassword: 'User@123', agreeTerms: true });
  assert.equal(result.success, true); assert.equal(fixture.api.hasSession(), false);
  assert.deepEqual(JSON.parse(fixture.calls[0].body), { username: 'member', fullName: 'Thành viên', email: profile.email,
    password: hash('User@123'), confirmPassword: hash('User@123') });
});

test('OTP verification, resend, forgot/reset password use the backend DTOs', async () => {
  const fixture = setup(() => reply(undefined));
  await fixture.auth.verifyEmail(profile.email, '123456');
  await fixture.auth.resendOtp(profile.email);
  const forgot = await fixture.auth.forgotPassword({ emailOrPhone: profile.email });
  await fixture.auth.resetPassword(profile.email, '654321', 'New@1234', 'New@1234');
  assert.equal(forgot.success, true); assert.equal('otp' in forgot.data, false);
  assert.deepEqual(fixture.calls.map(call => call.url), ['/api/auth/verify-email', '/api/auth/resend-otp', '/api/auth/forgot-password', '/api/auth/reset-password']);
  assert.deepEqual(JSON.parse(fixture.calls[3].body), { email: profile.email, otp: '654321', newPassword: hash('New@1234'), confirmNewPassword: hash('New@1234') });
});

test('profile GET/PUT send bearer auth and retain the backend response', async () => {
  const fixture = setup(() => reply({ ...profile, heightCm: 175, weightKg: 68, bmi: 22.2 }));
  fixture.api.setSession(auth(), true);
  await fixture.users.getProfile();
  const result = await fixture.users.updateProfile({ heightCm: 175, weightKg: 68, dietaryPreferences: 'VEGAN' });
  assert.equal(result.bmi, 22.2); assert.equal(fixture.calls[1].method, 'PUT');
  assert.equal(fixture.calls[0].headers.get('Authorization'), 'Bearer token-1');
  assert.deepEqual(JSON.parse(fixture.calls[1].body), { heightCm: 175, weightKg: 68, dietaryPreferences: 'VEGAN' });
});

test('session restoration refreshes via cookie before loading the real user', async () => {
  const fixture = setup(url => reply(url.endsWith('/refresh') ? auth('restored') : profile));
  fixture.context.localStorage.setItem('vegeai_session', 'true');
  const user = await fixture.auth.getCurrentUser();
  assert.equal(user.id, profile.userId); assert.equal(fixture.calls[0].url, '/api/auth/refresh');
  assert.equal(fixture.calls[0].credentials, 'include');
  assert.equal(fixture.calls[1].headers.get('Authorization'), 'Bearer restored');
});

test('concurrent expired requests share one refresh then both use the new token', async () => {
  const fixture = setup(async url => {
    if (url.endsWith('/refresh')) { await new Promise(resolve => setTimeout(resolve, 10)); return reply(auth('new')); }
    return reply(profile);
  });
  fixture.api.setSession(auth('old', 0), true);
  await Promise.all([fixture.users.getProfile(), fixture.users.getProfile()]);
  assert.equal(fixture.calls.filter(call => call.url.endsWith('/refresh')).length, 1);
  assert.ok(fixture.calls.filter(call => call.url.endsWith('/me')).every(call => call.headers.get('Authorization') === 'Bearer new'));
});

test('a 401 retries once with a refreshed access token', async () => {
  const fixture = setup((url, options) => url.endsWith('/refresh') ? reply(auth('new')) :
    options.headers.get('Authorization') === 'Bearer token-1' ? reply(undefined, 401, 'Expired') : reply(profile));
  fixture.api.setSession(auth(), true);
  await fixture.users.getProfile();
  assert.equal(fixture.calls.length, 3);
  assert.equal(fixture.calls[2].headers.get('Authorization'), 'Bearer new');
});

test('rejected refresh clears auth and notifies the UI; protected calls never become guest calls', async () => {
  const fixture = setup(() => reply(undefined, 401, 'Refresh token revoked', 1208));
  let expired = 0; fixture.context.window.addEventListener(fixture.api.AUTH_EXPIRED_EVENT, () => expired++);
  fixture.api.setSession(auth('old', 0), true);
  await assert.rejects(fixture.users.getProfile(), /revoked/);
  assert.equal(fixture.api.hasSession(), false); assert.equal(expired, 1);
  await assert.rejects(fixture.users.getProfile(), /đăng nhập/);
  assert.equal(fixture.calls.length, 1);
});

test('permission, rate-limit and network failures are reported without refreshing', async () => {
  for (const status of [403, 429, 500]) {
    const fixture = setup(() => reply(undefined, status, `Error ${status}`)); fixture.api.setSession(auth(), true);
    await assert.rejects(fixture.users.getProfile(), new RegExp(`Error ${status}`));
    assert.equal(fixture.calls.length, 1); assert.equal(fixture.api.hasSession(), true);
  }
  const fixture = setup(() => { throw new Error('offline'); });
  const result = await fixture.auth.login({ emailOrPhone: 'member', password: 'User@123', rememberMe: true });
  assert.equal(result.success, false); assert.match(result.error, /kết nối/);
});

test('logout revokes the cookie even with an expired access token and removes local markers', async () => {
  const fixture = setup(() => reply(undefined)); fixture.api.setSession(auth('old', 0), true);
  assert.equal((await fixture.auth.logout()).success, true);
  assert.equal(fixture.calls.length, 1); assert.equal(fixture.calls[0].url, '/api/auth/logout');
  assert.equal(fixture.calls[0].credentials, 'include'); assert.equal(fixture.api.hasSession(), false);
});

test('failed logout preserves local auth so it can be retried', async () => {
  const fixture = setup(() => { throw new Error('offline'); }); fixture.api.setSession(auth(), true);
  assert.equal((await fixture.auth.logout()).success, false); assert.equal(fixture.api.hasSession(), true);
});

test('guest AI chat preserves server session ID and sends no bearer token', async () => {
  const fixture = setup(() => reply({ reply: 'Món chay', sessionId: 'chat-1', isGuestTrial: true, remainingGuestQuota: 2 }));
  const result = await fixture.ai.chat(' Gợi ý món chay ', 'chat-1');
  assert.equal(result.remainingGuestQuota, 2); assert.equal(fixture.calls[0].headers.has('Authorization'), false);
  assert.deepEqual(JSON.parse(fixture.calls[0].body), { message: 'Gợi ý món chay', sessionId: 'chat-1' });
});

test('fridge scan uses multipart image and validates type/size before any request', async () => {
  const fixture = setup(() => reply({ summary: 'Đậu phụ', ingredients: [] }));
  const image = new File(['image'], 'fridge.png', { type: 'image/png' });
  await fixture.ai.scanFridge(image);
  assert.equal(fixture.calls[0].url, '/api/ai/fridge-scan');
  assert.equal(fixture.calls[0].headers.has('Content-Type'), false);
  assert.equal(fixture.calls[0].body.get('image').name, 'fridge.png');
  await assert.rejects(fixture.ai.scanFridge(new File(['x'], 'x.txt', { type: 'text/plain' })), /JPG/);
  await assert.rejects(fixture.ai.scanFridge(new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' })), /5 MB/);
  assert.equal(fixture.calls.length, 1);
});

test('a late refresh cannot restore a session that has already been cleared', async () => {
  let resolve;
  const fixture = setup(() => new Promise(done => { resolve = done; }));
  fixture.api.setSession(auth('old', 0), true);
  const pending = fixture.api.refreshSession();
  fixture.api.clearSession(); resolve(reply(auth('new')));
  await assert.rejects(pending, /thay đổi/);
  assert.equal(fixture.api.hasSession(), false);
});

test('repeated 401 stops after one retry and clears the failed session', async () => {
  const fixture = setup(url => url.endsWith('/refresh') ? reply(auth('new')) : reply(undefined, 401, 'Unauthorized'));
  fixture.api.setSession(auth(), true);
  await assert.rejects(fixture.users.getProfile(), /Unauthorized/);
  assert.equal(fixture.calls.length, 3); assert.equal(fixture.api.hasSession(), false);
});

test('a late 401 from an old session cannot invalidate a newer login', async () => {
  let resolve;
  const fixture = setup(() => new Promise(done => { resolve = done; }));
  fixture.api.setSession(auth('old'), true);
  const pending = fixture.users.getProfile();
  fixture.api.setSession(auth('new-login'), true);
  resolve(reply(undefined, 401, 'Old token'));
  await assert.rejects(pending, /Old token/);
  assert.equal(fixture.api.hasSession(), true); assert.equal(fixture.calls.length, 1);
});
