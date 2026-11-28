'use strict';
// Current Settings UI, fake responses and an isolated local workspace only.
// No account, Render service or personal record is contacted or changed.
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = process.cwd(), origin = 'https://lifeos-today-aplus-preview.onrender.com';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 393, height: 780 }, isMobile: true, hasTouch: true });
  const page = await context.newPage(), errors = [];
  let acknowledgedSnapshot = null, writes = 0, probes = 0;
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === origin && url.pathname === '/api/storage/status') {
      probes++;
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ backend: 'postgresql', read_only: true, storage_readable: true, revision: 3, has_state: true }) });
    }
    if (url.origin === origin && url.pathname === '/api/state') {
      if (request.method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ revision: 3, data: acknowledgedSnapshot }) });
      writes++;
      return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Synthetic interrupted upload' }) });
    }
    const file = path.resolve(root, '.' + (url.pathname === '/' ? '/index.html' : url.pathname));
    if (url.origin === origin && request.method() === 'GET' && file.startsWith(root + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile()) return route.fulfill({ path: file });
    return route.fulfill({ status: 404, body: 'offline synthetic sync fixture' });
  });
  const atomic = () => page.evaluate(() => JSON.parse(localStorage.getItem('lifeos-v4-stage21-atomic')));
  try {
    await page.goto(origin + '/'); await page.waitForFunction(() => document.body.classList.contains('lo-ca-ready'));
    await page.locator('#lifeosNavigation [data-view="tracking"]').click();
    await page.locator('#caLive [data-ca-quick-start="Work"]').click();
    const current = await page.evaluate(() => window.lifeosReadOnlyWorkspace().sessions.find(item => item.name === 'Work' && item.status === 'running'));
    const finish = page.locator('#caLive [data-ca-act="finish"][data-ca-id="' + current.id + '"]');
    await finish.click(); await finish.click();
    await page.waitForFunction(id => window.lifeosReadOnlyWorkspace().sessions.find(item => item.id === id)?.status === 'finished', current.id);
    if (await page.locator('#activityDetailsModal').isVisible()) await page.locator('#loDetailSkip').click();
    const initial = await atomic();
    assert(initial.journal.length >= 2, 'At least two synthetic queued operations are required');
    const ids = initial.journal.map(entry => entry.id);
    acknowledgedSnapshot = initial.journal[0].snapshot;
    await page.locator('#lifeosNavigation [data-view="schedule"]').click();
    await page.waitForSelector('#lifeosPlanOverview[data-ready="true"]');
    await page.locator('.pov-settings summary').click(); await page.locator('[data-pov-settings]').click();
    await page.waitForFunction(() => document.body.dataset.lifeosView === 'settings');
    const cloud = page.locator('#cloudSyncPanel');
    if (await cloud.locator('.lo-advanced-toggle').getAttribute('aria-expanded') === 'false') await cloud.locator('.lo-advanced-toggle').click();
    await page.locator('#syncToken').fill('synthetic-test-token-not-real');

    const beforeProbe = await atomic();
    await page.locator('#loVerifyStorage').click();
    await page.waitForFunction(() => document.querySelector('#loServerStorageResult')?.textContent.includes('PostgreSQL'));
    assert.equal(probes, 1); assert.deepEqual(await atomic(), beforeProbe, 'A read-only storage probe must not change local data');

    // The fake server reports the first queued snapshot as already committed.
    // A failed atomic acknowledgement must leave the complete queue intact.
    await page.evaluate(() => {
      window.__syncOriginalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, value) {
        if (key === 'lifeos-v4-stage21-atomic') throw Error('synthetic checkpoint failure');
        return window.__syncOriginalSetItem.call(this, key, value);
      };
    });
    await page.locator('#connectSync').click();
    await page.waitForFunction(() => document.querySelector('#syncStatus')?.textContent.includes('Could not connect'));
    assert.deepEqual((await atomic()).journal.map(entry => entry.id), ids, 'Failed acknowledgement retains every operation');
    assert.equal(writes, 0, 'No later operation is uploaded after a failed acknowledgement');
    await page.evaluate(() => { Storage.prototype.setItem = window.__syncOriginalSetItem; delete window.__syncOriginalSetItem; });

    await page.locator('#connectSync').click();
    await page.waitForFunction(count => JSON.parse(localStorage.getItem('lifeos-v4-stage21-atomic')).journal.length === count, ids.length - 1);
    await page.waitForFunction(() => document.querySelector('#syncStatus')?.textContent.includes('Sync interrupted'));
    const reconciled = await atomic();
    assert.deepEqual(reconciled.journal.map(entry => entry.id), ids.slice(1), 'Only the confirmed operation is acknowledged');
    assert.equal(reconciled.meta.revision, 3); assert.equal(reconciled.meta.dirty, true);
    assert(reconciled.workspace.sessions.some(item => item.id === current.id && item.status === 'finished'));
    assert(writes >= 1, 'A subsequent synthetic upload is attempted and rejected');
    await page.reload(); await page.waitForFunction(() => window.lifeosReadOnlyWorkspace);
    const reloaded = await atomic();
    assert.deepEqual(reloaded.journal.map(entry => entry.id), ids.slice(1));
    assert.equal(reloaded.meta.revision, 3); assert.equal(reloaded.meta.dirty, true);
    assert(reloaded.workspace.sessions.some(item => item.id === current.id && item.status === 'finished'));
    assert.deepEqual(errors, []);
    console.log('PASS: read-only storage probe and atomic reconciliation of an uncertain synthetic acknowledgement');
  } finally { await context.close(); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
