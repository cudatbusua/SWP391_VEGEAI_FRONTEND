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
    console, setTimeout, clearTimeout, Headers, FormData, File, AbortController, AbortSignal, URL, URLSearchParams, Event,
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
    restaurants: load('src/services/restaurantService.ts').restaurantService,
    recipes: load('src/services/recipeService.ts').recipeService,
    blogs: load('src/services/blogService.ts').blogService,
    nutrition: load('src/services/nutritionService.ts').nutritionService,
    mealPlans: load('src/services/mealPlanService.ts').mealPlanService,
    community: load('src/services/communityService.ts').communityService,
    videoMedia: load('src/utils/communityVideo.ts') };
}
const profile = { userId: 'user-1', username: 'member', email: 'member@example.com', fullName: 'Thành viên', role: 'USER', status: 'ACTIVE' };
const auth = (token = 'token-1', expiresInSeconds = 900) => ({ ...profile, accessToken: token, tokenType: 'Bearer', expiresInSeconds });
const reply = (data, status = 200, message = 'OK', code = status) => ({ ok: status < 400, status,
  json: async () => ({ success: status < 400, code, message, data }) });
const hash = value => createHash('sha256').update(value).digest('hex');

test('nutrition saves contact, diet and exclusions together without modifying public calculation', async () => {
  const fixture = setup(() => reply({ targets: { dailyCaloriesTarget: 1800 } }));
  fixture.api.setSession(auth(), true);
  const input = { gender: 'FEMALE', dateOfBirth: '2000-01-01', heightCm: 160, weightKg: 55, activityLevel: 'MODERATE', goal: 'MAINTAIN', phoneNumber: '0912345678', dietaryPreferences: 'VEGAN', allergies: 'Đậu phộng', customDailyCalories: null };
  await fixture.nutrition.saveProfile(input);
  assert.equal(fixture.calls[0].url, '/api/nutrition/profile');
  assert.deepEqual(JSON.parse(fixture.calls[0].body), input);
  assert.equal(fixture.calls[0].headers.get('Authorization'), 'Bearer token-1');
  await fixture.nutrition.calculate({ gender: 'FEMALE', age: 26, heightCm: 160, weightKg: 55, activityLevel: 'MODERATE', goal: 'MAINTAIN' });
  assert.equal(fixture.calls[1].headers.has('Authorization'), false);
  assert.equal(JSON.parse(fixture.calls[1].body).phoneNumber, undefined);
});

test('meal plan preview, swaps, saving and pagination use authenticated server contracts', async () => {
  const fixture = setup(() => reply({ id: 'plan-1', status: 'DRAFT' }));
  const body = { period: 'MONTH', startDate: '2026-11-01', mealsPerDay: 3 };
  await assert.rejects(fixture.mealPlans.generate(body), /đăng nhập/);
  assert.equal(fixture.calls.length, 0);
  fixture.api.setSession(auth(), true);
  await fixture.mealPlans.generate(body); await fixture.mealPlans.get('plan-1');
  await fixture.mealPlans.options('plan-1'); await fixture.mealPlans.swap('plan-1', 2, 1, 'recipe-2');
  await fixture.mealPlans.save('plan-1'); await fixture.mealPlans.list(1);
  assert.deepEqual(fixture.calls.map(call => call.url), ['/api/meal-plans/generate', '/api/meal-plans/plan-1', '/api/meal-plans/plan-1/options', '/api/meal-plans/plan-1/days/2/meals/1', '/api/meal-plans/plan-1/save', '/api/meal-plans?page=1&size=5']);
  assert.deepEqual(JSON.parse(fixture.calls[0].body), body);
  assert.deepEqual(JSON.parse(fixture.calls[3].body), { recipeId: 'recipe-2' });
  assert.ok(fixture.calls.every(call => call.headers.get('Authorization') === 'Bearer token-1'));
});

test('meal plan conflicts and provider failures remain visible without guest retries', async () => {
  const fixture = setup(() => reply(null, 409, 'Hồ sơ đã thay đổi.'));
  fixture.api.setSession(auth(), true);
  await assert.rejects(fixture.mealPlans.save('old-plan'), /Hồ sơ đã thay đổi/);
  assert.equal(fixture.calls.length, 1);
});

test('nearby places map backend coordinates and send radius in metres', async () => {
  const fixture = setup(() => reply([
    { placeId: 'far', name: 'Far', latitude: 10.02, longitude: 106, distanceKm: 2, category: 'RESTAURANT', isOpenNow: true },
    { placeId: 'near', name: 'Near', latitude: 10.001, longitude: 106, distanceKm: 0.1, category: 'RESTAURANT' },
    { placeId: 'invalid', name: 'Invalid' },
  ]));
  const places = await fixture.restaurants.nearby({ lat: 10, lon: 106 }, 5, 'RESTAURANT');
  assert.equal(places.length, 2); assert.equal(places[0].name, 'Near'); assert.equal(places[1].openNow, true);
  const url = new URL(fixture.calls[0].url, 'http://localhost');
  assert.equal(url.pathname, '/api/places/nearby'); assert.equal(url.searchParams.get('radius'), '5000');
  assert.equal(url.searchParams.get('lng'), '106'); assert.equal(url.searchParams.get('category'), 'RESTAURANT');
});

test('place search encodes keywords and preserves backend errors', async () => {
  const fixture = setup(() => reply([]));
  assert.equal((await fixture.restaurants.search('Quận 1 & trung tâm', { lat: 10, lon: 106 }, 2)).length, 0);
  const url = new URL(fixture.calls[0].url, 'http://localhost');
  assert.equal(url.pathname, '/api/places/search');
  assert.equal(url.searchParams.get('query'), 'Quận 1 & trung tâm'); assert.equal(url.searchParams.get('radius'), '2000');
  const failure = setup(() => reply(null, 503, 'Places unavailable'));
  await assert.rejects(failure.restaurants.nearby({ lat: 10, lon: 106 }, 2), /Places unavailable/);
});

test('recipe filter sends server pagination, inclusion, exclusion and sorting', async () => {
  const page = { items: [{ recipeId: 'recipe-1', title: 'Tofu' }], page: 1, size: 12, totalElements: 14, totalPages: 2, first: false, last: true };
  const fixture = setup(() => reply(page));
  const filter = { page: 1, size: 12, keyword: 'tofu', includeTagCodes: ['VEGAN'], excludeTagCodes: ['GLUTEN'], inclusionMode: 'OR', sortBy: 'protein', sortDirection: 'desc', maxCookTime: 20 };
  const result = await fixture.recipes.filter(filter);
  assert.equal(result.totalElements, 14); assert.equal(fixture.calls[0].url, '/api/recipes/filter');
  assert.equal(fixture.calls[0].headers.has('Authorization'), false);
  assert.deepEqual(JSON.parse(fixture.calls[0].body), filter);
});

test('missing recipe reports 404 instead of substituting another recipe', async () => {
  const fixture = setup(() => reply(null, 404, 'Recipe not found'));
  await assert.rejects(fixture.recipes.detail('missing'), /Recipe not found/);
  assert.equal(fixture.calls[0].url, '/api/recipes/missing');
});

test('fridge matching requires login and uses bearer authentication', async () => {
  const fixture = setup(() => reply({ matchedRecipes: [], canCookNowCount: 0 }));
  await assert.rejects(fixture.recipes.matchFridge(), /đăng nhập/);
  assert.equal(fixture.calls.length, 0);
  fixture.api.setSession(auth(), true);
  await fixture.recipes.matchFridge();
  assert.equal(fixture.calls[0].url, '/api/recipes/fridge-match?minMatchPercentage=50&limit=20');
  assert.equal(fixture.calls[0].headers.get('Authorization'), 'Bearer token-1');
});

test('admin recipe and tag writes use the correct paths, DTOs and methods', async () => {
  const fixture = setup(() => reply({ recipeId: 'recipe-1' }));
  fixture.api.setSession(auth(), true);
  const recipe = { title: 'Tofu', description: '', imageUrl: '', difficulty: 'EASY', status: 'DRAFT', ingredients: [{ name: 'Tofu', amount: 100, unit: 'g' }], instructions: ['Cook'], tagCodes: ['VEGAN'] };
  await fixture.recipes.save(recipe);
  await fixture.recipes.save({ ...recipe, status: 'PUBLISHED' }, 'recipe-1');
  await fixture.recipes.remove('recipe-1');
  await fixture.recipes.createTag({ code: 'VEGAN', name: 'Vegan', group: 'DIETARY_TYPE', description: '' });
  await fixture.recipes.removeTag('tag-1');
  assert.deepEqual(fixture.calls.map(call => call.method), ['POST', 'PUT', 'DELETE', 'POST', 'DELETE']);
  assert.deepEqual(fixture.calls.map(call => call.url), ['/api/admin/recipes', '/api/admin/recipes/recipe-1', '/api/admin/recipes/recipe-1', '/api/admin/tags', '/api/admin/tags/tag-1']);
  assert.deepEqual(JSON.parse(fixture.calls[0].body), recipe);
  assert.ok(fixture.calls.every(call => call.headers.get('Authorization') === 'Bearer token-1'));
  const denied = setup(() => reply(null, 403, 'Admin only'));
  denied.api.setSession(auth(), true);
  await assert.rejects(denied.recipes.save(recipe), /Admin only/);
  assert.equal(denied.calls.length, 1);
});

test('admin recipe reads use private detail and video selections are preserved or cleared explicitly', async () => {
  const fixture = setup(() => reply({ recipeId: 'recipe-1', videos: [{ id: 'video-1', status: 'DRAFT' }] }));
  await assert.rejects(fixture.recipes.adminDetail('recipe-1'), /đăng nhập/);
  assert.equal(fixture.calls.length, 0);
  fixture.api.setSession(auth(), true);
  const detail = await fixture.recipes.adminDetail('recipe-1');
  assert.equal(detail.videos[0].status, 'DRAFT');
  assert.equal(fixture.calls[0].url, '/api/admin/recipes/recipe-1');
  await fixture.recipes.save({ videoIds: ['video-1'] }, 'recipe-1');
  await fixture.recipes.save({ videoIds: [] }, 'recipe-1');
  assert.deepEqual(JSON.parse(fixture.calls[1].body).videoIds, ['video-1']);
  assert.deepEqual(JSON.parse(fixture.calls[2].body).videoIds, []);
  assert.ok(fixture.calls.every(call => call.headers.get('Authorization') === 'Bearer token-1'));
});

test('public blog browsing encodes filters and never sends an authenticated token', async () => {
  const fixture = setup(() => reply({ items: [], totalElements: 0 }));
  fixture.api.setSession(auth(), true);
  await fixture.blogs.published({ keyword: 'chay & xanh', category: 'KITCHEN', page: 2 });
  const url = new URL(fixture.calls[0].url, 'http://localhost');
  assert.equal(url.pathname, '/api/blog/posts'); assert.equal(url.searchParams.get('keyword'), 'chay & xanh');
  assert.equal(url.searchParams.get('category'), 'KITCHEN'); assert.equal(url.searchParams.get('page'), '2');
  assert.equal(fixture.calls[0].headers.has('Authorization'), false);
  const unpublished = setup(() => reply(null, 404, 'Resource not found'));
  await assert.rejects(unpublished.blogs.publicPost('unpublished'), /Resource not found/);
});

test('blog drafts, edits, submission and withdrawal preserve the server revision', async () => {
  const fixture = setup(() => reply({ postId: 'post-1', version: 4, status: 'DRAFT' }));
  fixture.api.setSession(auth(), true);
  const input = { title: 'Bữa chay', category: 'KITCHEN', content: 'Nội dung', coverImage: '/images/vegan-tofu-meal.png', excerpt: '', version: 3 };
  await fixture.blogs.save(input); await fixture.blogs.save(input, 'post-1');
  await fixture.blogs.submit('post-1', 4); await fixture.blogs.withdraw('post-1', 5); await fixture.blogs.remove('post-1', 6);
  assert.deepEqual(fixture.calls.map(call => call.method), ['POST', 'PUT', 'POST', 'POST', 'DELETE']);
  assert.deepEqual(fixture.calls.map(call => call.url), ['/api/blog/my-posts', '/api/blog/my-posts/post-1', '/api/blog/my-posts/post-1/submit', '/api/blog/my-posts/post-1/withdraw', '/api/blog/my-posts/post-1?version=6']);
  assert.deepEqual(JSON.parse(fixture.calls[2].body), { version: 4 });
  assert.ok(fixture.calls.every(call => call.headers.get('Authorization') === 'Bearer token-1'));
  const guest = setup(() => reply({}));
  await assert.rejects(guest.blogs.save(input), /đăng nhập/); assert.equal(guest.calls.length, 0);
});

test('admin blog decisions include reason and exact revision; 403 is not retried', async () => {
  const fixture = setup(() => reply({ postId: 'post-1', status: 'REJECTED' }));
  fixture.api.setSession(auth(), true);
  await fixture.blogs.queue('PENDING_REVIEW', 'chay', 0); await fixture.blogs.reviewPost('post-1');
  await fixture.blogs.review('post-1', 7, 'REJECT', 'Bổ sung nội dung gốc');
  assert.equal(fixture.calls[2].url, '/api/admin/blog/posts/post-1/review');
  assert.deepEqual(JSON.parse(fixture.calls[2].body), { version: 7, decision: 'REJECT', reason: 'Bổ sung nội dung gốc' });
  const denied = setup(() => reply(null, 403, 'Admin only')); denied.api.setSession(auth(), true);
  await assert.rejects(denied.blogs.review('post-1', 7, 'APPROVE', ''), /Admin only/); assert.equal(denied.calls.length, 1);
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

test('community public lists encode filters, preserve false and never attach a member token', async () => {
  const fixture = setup(() => reply({ items: [], page: 1, size: 8, totalElements: 0, totalPages: 0, first: false, last: true }));
  fixture.api.setSession(auth(), true);
  await fixture.community.questions({ keyword: 'đậu & nấm?', answered: false, page: 1 });
  const query = new URL(fixture.calls[0].url, 'http://localhost');
  assert.equal(query.searchParams.get('keyword'), 'đậu & nấm?');
  assert.equal(query.searchParams.get('answered'), 'false');
  assert.equal(fixture.calls[0].headers.has('Authorization'), false);
  await fixture.community.videos({ keyword: 'nấu chay', category: 'MON_CHAY', page: 0 });
  assert.equal(new URL(fixture.calls[1].url, 'http://localhost').searchParams.get('category'), 'MON_CHAY');
  await fixture.community.comments('video/one', 0);
  assert.ok(fixture.calls[2].url.startsWith('/api/videos/video%2Fone/comments?'));
});

test('community private resources and mutations never fall back to unauthenticated writes', async () => {
  const fixture = setup(() => reply({}));
  for (const action of [() => fixture.community.ask('Question'), () => fixture.community.myQuestions('', 0),
    () => fixture.community.savedVideos(0), () => fixture.community.setFavorite('video', true),
    () => fixture.community.comment('video', 'My comment'), () => fixture.community.adminVideos({ page: 0 })]) {
    await assert.rejects(action(), /đăng nhập/);
  }
  assert.equal(fixture.calls.length, 0);
});

test('question moderation and answers send exact revisions and administrative paths', async () => {
  const fixture = setup(() => reply({ id: 'question', version: 4 }));
  fixture.api.setSession(auth(), true);
  await fixture.community.ask(' A real question ');
  await fixture.community.answer('question', ' A saved answer ', 1);
  await fixture.community.moderate('question', 'REJECT', 2, ' Needs changes ');
  await fixture.community.deleteQuestion('question', 3);
  assert.deepEqual(JSON.parse(fixture.calls[0].body), { content: 'A real question' });
  assert.deepEqual(JSON.parse(fixture.calls[1].body), { content: 'A saved answer', version: 1 });
  assert.deepEqual(JSON.parse(fixture.calls[2].body), { decision: 'REJECT', reason: 'Needs changes', version: 2 });
  assert.equal(fixture.calls[1].method, 'PUT');
  assert.equal(fixture.calls[2].url, '/api/admin/questions/question/moderation');
  assert.equal(fixture.calls[3].url, '/api/admin/questions/question?version=3');
});

test('video CRUD, comment ownership revisions and favorite PUT/DELETE match backend contracts', async () => {
  const fixture = setup(() => reply({ id: 'video', favorite: true }));
  fixture.api.setSession(auth(), true);
  const input = { title: 'Video', videoUrl: 'https://example.test/video.mp4', status: 'DRAFT', version: 2 };
  await fixture.community.saveVideo(input);
  await fixture.community.saveVideo(input, 'video');
  await fixture.community.comment('video', ' Update ', { id: 'comment', version: 3 });
  await fixture.community.deleteComment('video', 'comment', 4);
  await fixture.community.setFavorite('video', true);
  await fixture.community.setFavorite('video', false);
  await fixture.community.deleteVideo('video', 5);
  assert.equal(fixture.calls[0].method, 'POST');
  assert.equal(fixture.calls[1].method, 'PUT');
  assert.deepEqual(JSON.parse(fixture.calls[2].body), { content: 'Update', version: 3 });
  assert.equal(fixture.calls[3].url, '/api/videos/video/comments/comment?version=4');
  assert.equal(fixture.calls[4].method, 'PUT');
  assert.equal(fixture.calls[5].method, 'DELETE');
  assert.equal(fixture.calls[6].url, '/api/admin/videos/video?version=5');
});

test('community conflicts and permission errors remain visible without silent retries', async () => {
  const fixture = setup(() => reply(null, 409, 'Content changed', 2501));
  fixture.api.setSession(auth(), true);
  await assert.rejects(fixture.community.answer('question', 'Answer', 0), /Content changed/);
  assert.equal(fixture.calls.length, 1);
  assert.equal(fixture.api.hasSession(), true);
});

test('video embeds use exact provider allowlists and reject unsafe or credentialed URLs', () => {
  const { videoMedia } = setup(() => reply({}));
  assert.equal(videoMedia.videoSource('https://youtu.be/abcdefghijk').src, 'https://www.youtube-nocookie.com/embed/abcdefghijk?rel=0&autoplay=1');
  assert.equal(videoMedia.videoSource('https://www.youtube.com/shorts/abcdefghijk').kind, 'embed');
  assert.equal(videoMedia.videoSource('https://vimeo.com/123456').src, 'https://player.vimeo.com/video/123456?autoplay=1');
  assert.equal(videoMedia.videoSource('https://example.test/cooking.mp4?version=2').kind, 'file');
  assert.equal(videoMedia.videoSource('https://youtube.com.evil.test/watch?v=abcdefghijk').kind, 'external');
  assert.equal(videoMedia.videoSource('javascript:alert(1)'), null);
  assert.equal(videoMedia.videoSource('https://user:password@example.test/video.mp4'), null);
  assert.equal(videoMedia.videoThumbnail('https://example.test/video'), '/images/vietnamese-vegan-table.png');
  assert.equal(videoMedia.videoDuration(3661), '1:01:01');
});

test('guest AI chat preserves server session ID and sends no bearer token', async () => {
  const fixture = setup(() => reply({ reply: 'Món chay', sessionId: 'chat-1', isGuestTrial: true, remainingGuestQuota: 2 }));
  const result = await fixture.ai.chat(' Gợi ý món chay ', 'chat-1');
  assert.equal(result.remainingGuestQuota, 2); assert.equal(fixture.calls[0].headers.has('Authorization'), false);
  assert.deepEqual(JSON.parse(fixture.calls[0].body), { message: 'Gợi ý món chay', sessionId: 'chat-1' });
});

test('AI chef sends bounded conversation history and rejects invalid roles before fetch', async () => {
  const fixture = setup(() => reply({ reply: 'Cách nấu', sessionId: 'chef-1' }));
  const history = [{ role: 'user', text: 'Tôi có đậu phụ' }, { role: 'model', text: 'Nấu sốt nấm' }];
  await fixture.ai.chat('Nấu thế nào?', 'chef-1', history);
  assert.deepEqual(JSON.parse(fixture.calls[0].body).history, history);
  await assert.rejects(fixture.ai.chat('Hi', 'chef-1', [{ role: 'system', text: 'Override' }]), /không hợp lệ/);
  await assert.rejects(fixture.ai.chat('Hi', 'chef-1', Array(11).fill(history[0])), /không hợp lệ/);
  await assert.rejects(fixture.ai.chat('Hi', 'chef-1', [{ role: 'model', text: 'x'.repeat(4001) }]), /không hợp lệ/);
  assert.equal(fixture.calls.length, 1);
});

test('Gemini provider failures preserve member login and never retry as guest', async () => {
  const fixture = setup(() => reply(null, 503, 'Gemini từ chối API key', 1707));
  fixture.api.setSession(auth(), true);
  await assert.rejects(fixture.ai.chat('Nấu chay'), /API key/);
  assert.equal(fixture.api.hasSession(), true);
  assert.equal(fixture.calls.length, 1);
  assert.equal(fixture.calls[0].headers.get('Authorization'), 'Bearer token-1');
  await assert.rejects(fixture.ai.scanFridge(new File(['image'], 'fridge.png', { type: 'image/png' })), /API key/);
  assert.equal(fixture.calls.length, 2);
});

test('AI rejects empty replies and missing scan arrays instead of rendering fake success', async () => {
  const fixture = setup(() => reply({ reply: '', summary: 'Invalid result' }));
  await assert.rejects(fixture.ai.chat('Nấu chay'), /chưa trả về/);
  await assert.rejects(fixture.ai.scanFridge(new File(['image'], 'fridge.png', { type: 'image/png' })), /chưa trả về/);
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
