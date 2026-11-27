'use strict';

// Exercise only the local, reviewed restore flow in a disposable browser.
// Every request is intercepted; no Render service or account is contacted.
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = process.cwd(), origin = 'https://lifeos-today-aplus-preview.onrender.com';
const serve = route => {
  const request = route.request(), url = new URL(request.url());
  const file = path.resolve(root, '.' + (url.pathname === '/' ? '/index.html' : url.pathname));
  if (url.origin === origin && request.method() === 'GET' && file.startsWith(root + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile()) return route.fulfill({ path: file });
  return route.fulfill({ status: 404, body: 'offline synthetic recovery fixture' });
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 393, height: 780 }, isMobile: true, hasTouch: true, acceptDownloads: true });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', dialog => dialog.accept());
  await page.route('**/*', serve);
  const read = () => page.evaluate(() => window.lifeosReadOnlyWorkspace());
  const checkpoint = () => page.evaluate(() => localStorage.getItem('lifeos-v4-stage21-atomic'));
  const nav = view => page.locator('#lifeosNavigation [data-view="' + view + '"]').click();
  async function finished(name) {
    await nav('tracking');
    await page.locator('#caLive [data-ca-quick-start="' + name + '"]').click();
    await page.waitForFunction(n => window.lifeosReadOnlyWorkspace().sessions.some(s => s.name === n && s.status === 'running'), name);
    const session = (await read()).sessions.find(s => s.name === name && s.status === 'running');
    const button = page.locator('#caLive [data-ca-act="finish"][data-ca-id="' + session.id + '"]');
    await button.click(); await button.click();
    await page.waitForFunction(id => window.lifeosReadOnlyWorkspace().sessions.some(s => s.id === id && s.status === 'finished'), session.id);
    if (await page.locator('#activityDetailsModal').isVisible()) await page.locator('#loDetailSkip').click();
    return (await read()).sessions.find(s => s.id === session.id);
  }
  async function recovery() {
    await nav('schedule');
    await page.waitForSelector('#lifeosPlanOverview[data-ready="true"]');
    await page.locator('.pov-settings summary').click();
    await page.locator('[data-pov-settings]').click();
    await page.waitForFunction(() => document.body.dataset.lifeosView === 'settings');
    const cloud = page.locator('#cloudSyncPanel');
    if (await cloud.locator('.lo-advanced-toggle').getAttribute('aria-expanded') === 'false') await cloud.locator('.lo-advanced-toggle').click();
    if (!(await page.locator('#recoveryTools').evaluate(el => el.open))) await page.locator('#recoveryTools > summary').click();
    await page.locator('#lifeosV150File').waitFor({ state: 'visible' });
  }
  try {
    await page.goto(origin + '/'); await page.waitForFunction(() => document.body.classList.contains('lo-ca-ready'));
    const original = await finished('Work');
    await recovery();
    await page.evaluate(() => {
      sessionStorage.setItem('lifeos-private-sync-token-tab-v1', 'synthetic-secret-not-real');
      document.querySelector('#syncToken').value = 'synthetic-secret-not-real';
    });
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#lifeosV150Backup').click();
    const download = await downloadPromise;
    const backup = JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
    assert.equal(backup.format, 'lifeos-recovery-v1');
    assert(backup.atomicCheckpoint.workspace.sessions.some(s => s.id === original.id));
    assert(!JSON.stringify(backup).includes('synthetic-secret-not-real'), 'Recovery export excludes the sync token');

    const incoming = structuredClone(backup.workspace);
    const t = original.startAt - 7200000;
    const completed = { id: 'synthetic-backup-finished', name: 'Earlier backup activity', status: 'finished', startAt: t, endAt: t + 60000, segments: [{ start: t, end: t + 60000 }] };
    const running = { id: 'synthetic-backup-running', name: 'Interrupted backup timer', status: 'running', startAt: t + 120000, endAt: null, segments: [{ start: t + 120000, end: null }] };
    incoming.sessions = [{ ...original, name: 'Older backup version' }, completed, running];
    const upload = { name: 'synthetic-recovery.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ format: 'lifeos-recovery-v1', workspace: incoming })) };
    const beforeReview = await checkpoint();
    await page.locator('#lifeosV150File').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{broken') });
    await page.waitForFunction(() => document.querySelector('#lifeosV150Preview')?.textContent.includes('Cannot prepare restoration'));
    assert.equal(await checkpoint(), beforeReview, 'An invalid file does not change local data');
    await page.locator('#lifeosV150File').setInputFiles(upload);
    await page.waitForFunction(() => /After safe merge|Cannot prepare restoration/.test(document.querySelector('#lifeosV150Preview')?.textContent || ''));
    assert((await page.locator('#lifeosV150Preview').innerText()).includes('After safe merge'), await page.locator('#lifeosV150Preview').innerText());
    assert.equal(await checkpoint(), beforeReview, 'Reviewing a file never writes the checkpoint');
    await page.locator('#lifeosV150Commit').click();
    assert((await page.locator('#lifeosV150Preview').innerText()).includes('backup first'));
    assert.equal(await checkpoint(), beforeReview, 'Restore requires a confirmed current backup');

    const later = await finished('Sleep');
    await recovery();
    const afterLocalChange = await checkpoint();
    const laterDownloadPromise = page.waitForEvent('download');
    await page.locator('#lifeosV150Backup').click();
    const laterBackup = JSON.parse(fs.readFileSync(await (await laterDownloadPromise).path(), 'utf8'));
    assert(laterBackup.atomicCheckpoint.workspace.sessions.some(s => s.id === later.id), 'Export the current browser state after it changes');
    await page.locator('#lifeosV150ConfirmBackup').check();
    await page.locator('#lifeosV150Commit').click();
    assert((await page.locator('#lifeosV150Preview').innerText()).includes('changed since preview'));
    assert.equal(await checkpoint(), afterLocalChange, 'Stale review must not overwrite newer local records');

    await page.locator('#lifeosV150File').setInputFiles(upload);
    await page.waitForFunction(() => document.querySelector('#lifeosV150Preview')?.textContent.includes('After safe merge'));
    await page.locator('#lifeosV150ConfirmBackup').check();
    await page.locator('#lifeosV150Commit').click();
    await page.waitForFunction(() => document.querySelector('#lifeosV150Preview')?.textContent.includes('RESTORED AND VERIFIED LOCALLY'));
    const restored = await read();
    assert.deepEqual(restored.sessions.find(s => s.id === original.id), original, 'The current version wins over an older backup with the same ID');
    assert.deepEqual(restored.sessions.find(s => s.id === later.id), later, 'Newer local activity survives the merge');
    assert.deepEqual(restored.sessions.find(s => s.id === completed.id), completed, 'A backup-only activity is restored');
    const interrupted = restored.sessions.find(s => s.id === running.id);
    assert.equal(interrupted.status, 'paused'); assert.equal(interrupted.segments[0].end, interrupted.segments[0].start);
    assert.equal(interrupted.needsDurationReview, true, 'Interrupted backup timers do not silently accumulate elapsed time');
    await page.reload(); await page.waitForFunction(() => window.lifeosReadOnlyWorkspace);
    assert.deepEqual((await read()).sessions, restored.sessions, 'The reviewed merge survives reload');
    assert.deepEqual(errors, []);
    console.log('PASS: accessible local recovery export, stale-review refusal, safe merge and reload');
  } finally { await context.close(); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
