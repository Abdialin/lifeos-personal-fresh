'use strict';
// Actual UI + HTTP sync against a new temporary SQLite server and two isolated
// browser contexts. Never connects to Render or any existing account.
const { chromium } = require('playwright');
const assert = require('node:assert/strict'), crypto = require('node:crypto');
const fs = require('node:fs'), net = require('node:net'), os = require('node:os'), path = require('node:path');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  return port;
}

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lifeos-two-ui-'));
  const port = await freePort(), origin = 'http://127.0.0.1:' + port;
  const username = 'isolated-' + crypto.randomBytes(8).toString('hex');
  const password = crypto.randomBytes(24).toString('base64url'), token = crypto.randomBytes(32).toString('base64url');
  const env = { PATH: process.env.PATH, LANG: process.env.LANG || 'C.UTF-8', PYTHONUNBUFFERED: '1', PYTHONDONTWRITEBYTECODE: '1',
    PORT: String(port), LIFEOS_DB: path.join(dir, 'disposable.sqlite3'), LIFEOS_DATABASE_URL: '',
    LIFEOS_ACCOUNT_API_ENABLED: '0', LIFEOS_USERNAME: username, LIFEOS_PASSWORD: password, LIFEOS_TOKEN: token };
  const server = spawn('python3', [path.join(root, 'server.py')], { cwd: root, env, stdio: 'ignore' });
  const contexts = [], errors = [];
  let browser;
  const fixture = { version: 1, sessions: [{ id: 'synthetic-baseline', name: 'Baseline reading', status: 'finished',
    startAt: 1795600000000, endAt: 1795600060000, segments: [{ start: 1795600000000, end: 1795600060000 }],
    precision: 'measured' }], events: [], schedule: [], todos: [], goals: [], personalLogs: [] };
  const headers = { 'X-LifeOS-Token': token };
  async function login(context) {
    const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
    page.on('dialog', dialog => dialog.accept());
    await page.goto(origin + '/login');
    await page.locator('#username').fill(username); await page.locator('#password').fill(password);
    await page.getByRole('button', { name: 'Sign in securely' }).click();
    await page.waitForFunction(() => document.body?.classList.contains('lo-ca-ready'));
    return page;
  }
  async function settings(page) {
    await page.locator('#lifeosNavigation [data-view="schedule"]').click();
    await page.waitForSelector('#lifeosPlanOverview[data-ready="true"]');
    const menu = page.locator('.pov-settings');
    if (!(await menu.evaluate(node => node.open))) await menu.locator('summary').click();
    await page.locator('[data-pov-settings]').click();
    await page.waitForFunction(() => document.body.dataset.lifeosView === 'settings');
    const cloud = page.locator('#cloudSyncPanel');
    if (await cloud.locator('.lo-advanced-toggle').getAttribute('aria-expanded') === 'false') await cloud.locator('.lo-advanced-toggle').click();
    await page.locator('#syncToken').fill(token);
  }
  async function adopt(page) {
    const downloads = []; page.on('download', download => downloads.push(download));
    await settings(page); await page.locator('#connectSync').click();
    await page.waitForFunction(() => /queue has no trusted base revision|server has saved data/.test(document.querySelector('#syncStatus')?.textContent || ''));
    if ((await page.locator('#syncStatus').innerText()).includes('queue has no trusted base revision')) {
      await page.locator('#lo234-review').click();
      await page.waitForFunction(() => !document.querySelector('#lo234-adopt-button')?.disabled);
      assert.equal(downloads.length, 2, 'Both synthetic recovery copies are requested before adoption');
      await page.locator('#lo234-adopt-button').click(); await page.locator('#lo239-backups').check();
      await page.locator('#lo239-phrase').fill('RESTORE SERVER'); await page.locator('#lo239-approve').click();
      await page.waitForFunction(() => document.querySelector('#syncStatus')?.textContent.includes('Server history restored locally'));
      await page.locator('#connectSync').click();
      await page.waitForFunction(() => document.querySelector('#syncStatus')?.textContent.includes('server has saved data'));
    } else {
      const local = await page.evaluate(() => JSON.parse(localStorage.getItem('lifeos-v4-stage21-atomic')));
      assert.equal((await page.evaluate(() => window.lifeosReadOnlyWorkspace())).sessions.length, 0, 'Only a fresh synthetic device can load directly');
      if (local) { assert.equal(local.journal.length, 0); assert.equal(local.meta.dirty, false); }
    }
    await page.locator('#pullSync').click();
    await page.waitForFunction(() => document.querySelector('#syncStatus')?.textContent.includes('Loaded from server'));
    await page.waitForFunction(() => window.lifeosReadOnlyWorkspace().sessions.some(item => item.id === 'synthetic-baseline'));
  }
  async function record(page, name) {
    await page.locator('#lifeosNavigation [data-view="tracking"]').click();
    await page.locator('#caLive [data-ca-sheet="start"]').first().click();
    await page.locator('#caCustomName').fill(name); await page.locator('#loCADialog [data-ca-custom-start]').click();
    await page.waitForFunction(value => window.lifeosReadOnlyWorkspace().sessions.some(item => item.name === value && item.status === 'running'), name);
    const session = await page.evaluate(value => window.lifeosReadOnlyWorkspace().sessions.find(item => item.name === value && item.status === 'running'), name);
    const finish = page.locator('#caLive [data-ca-act="finish"][data-ca-id="' + session.id + '"]');
    await finish.click(); await finish.click();
    await page.waitForFunction(id => window.lifeosReadOnlyWorkspace().sessions.find(item => item.id === id)?.status === 'finished', session.id);
    if (await page.locator('#activityDetailsModal').isVisible()) await page.locator('#loDetailSkip').click();
    return session.id;
  }
  try {
    for (let attempt = 0; attempt < 80; attempt++) {
      if (server.exitCode !== null) throw Error('Disposable server exited before becoming ready');
      try { if ((await fetch(origin + '/healthz')).ok) break; } catch (_) {}
      if (attempt === 79) throw Error('Disposable server did not become ready');
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    browser = await chromium.launch({ headless: true });
    for (let i = 0; i < 2; i++) {
      const context = await browser.newContext({ viewport: { width: 393, height: 780 }, isMobile: true, hasTouch: true, acceptDownloads: true });
      await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
      contexts.push(context);
    }
    const a = await login(contexts[0]), b = await login(contexts[1]);
    const seeded = await contexts[0].request.put(origin + '/api/state', { headers, data: { revision: 0, data: fixture } });
    assert.equal(seeded.status(), 200); assert.equal((await seeded.json()).revision, 1);
    await adopt(a); await adopt(b);

    // Device B records offline, while A independently updates the real local server.
    let offline = true;
    await contexts[1].route(origin + '/api/state', route => offline ? route.abort('failed') : route.continue());
    const idB = await record(b, 'Synthetic device B activity');
    await b.waitForFunction(() => JSON.parse(localStorage.getItem('lifeos-v4-stage21-atomic')).journal.length > 0);
    const idA = await record(a, 'Synthetic device A activity');
    await a.waitForFunction(() => {
      const record = JSON.parse(localStorage.getItem('lifeos-v4-stage21-atomic'));
      return record.meta.revision > 1 && !record.meta.dirty && record.journal.length === 0;
    }, null, { timeout: 20000 });
    const remote = await (await contexts[0].request.get(origin + '/api/state', { headers })).json();
    assert(remote.data.sessions.some(item => item.id === idA && item.status === 'finished'));
    assert(!remote.data.sessions.some(item => item.id === idB), 'Offline device data cannot silently reach the server');

    offline = false; await settings(b); await b.locator('#connectSync').click();
    await b.waitForFunction(() => document.querySelector('#syncStatus')?.textContent.includes('SYNC CONFLICT'), null, { timeout: 10000 });
    const before = await b.evaluate(() => JSON.parse(localStorage.getItem('lifeos-v4-stage21-atomic')));
    assert(before.journal.length > 0 && before.meta.dirty, 'The stale device retains its unsent operations');
    assert(before.workspace.sessions.some(item => item.id === idB && item.status === 'finished'));
    const after = await (await contexts[0].request.get(origin + '/api/state', { headers })).json();
    assert.equal(after.revision, remote.revision); assert.deepEqual(after.data, remote.data, 'A stale UI must not overwrite the server');
    await b.reload(); await b.waitForFunction(() => window.lifeosReadOnlyWorkspace);
    const reloaded = await b.evaluate(() => JSON.parse(localStorage.getItem('lifeos-v4-stage21-atomic')));
    assert.deepEqual(reloaded.journal.map(item => item.id), before.journal.map(item => item.id));
    assert(reloaded.workspace.sessions.some(item => item.id === idB && item.status === 'finished'));
    assert.deepEqual(errors, []);
    console.log('PASS: two current browser UIs reject a stale sync and preserve both synthetic device records');
  } finally {
    for (const context of contexts) await context.close();
    if (browser) await browser.close();
    server.kill('SIGTERM'); await new Promise(resolve => server.exitCode !== null ? resolve() : server.once('exit', resolve));
    fs.rmSync(dir, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
