'use strict';
// Exercise the existing opt-in UI with intercepted files and synthetic records.
const { chromium } = require('playwright');
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const root = process.cwd(), origin = 'https://lifeos-preview.local';
const serve = route => {
  const req = route.request(), url = new URL(req.url());
  const file = path.resolve(root, '.' + (url.pathname === '/' ? '/index.html' : url.pathname));
  if (url.origin === origin && req.method() === 'GET' && file.startsWith(root + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile()) return route.fulfill({ path: file });
  return route.abort();
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  async function setup(linked) {
    const context = await browser.newContext({ viewport: { width: 393, height: 780 }, isMobile: true, hasTouch: true, acceptDownloads: true });
    const page = await context.newPage(), dialogs = [], downloads = [], errors = [];
    page.setDefaultTimeout(30000); page.on('pageerror', error => errors.push(error.message));
    page.on('dialog', async dialog => { dialogs.push({ type: dialog.type(), message: dialog.message() }); await dialog.accept(); });
    page.on('download', download => downloads.push(download.suggestedFilename()));
    await page.route('**/*', serve);
    await page.addInitScript(({ linked }) => {
      if (localStorage.getItem('lifeos-live-v1')) return;
      const start = Date.now() - 4 * 86400000, end = start + 600000, batch = 'lifeos-development-seed-v1';
      const user = { id: 'synthetic-user-session', name: 'Existing test session', status: 'finished', startAt: start - 1200000, endAt: start - 600000, segments: [{ start: start - 1200000, end: start - 600000 }], precision: 'measured' };
      const sample = { id: 'synthetic-sample-session', name: 'Sleep', status: 'finished', startAt: start, endAt: end, segments: [{ start, end }], seedBatch: batch, source: 'development-starter' };
      const workspace = { version: 1, sessions: linked ? [user, sample] : [user],
        events: [{ id: 'synthetic-user-event', sessionId: linked ? sample.id : user.id, type: 'START', time: start }],
        schedule: [], todos: [], goals: [], workouts: [], meals: [], personalLogs: [], idealRoutines: [] };
      localStorage.setItem('lifeos-live-v1', JSON.stringify(workspace));
    }, { linked });
    await page.goto(origin + '/'); await page.waitForFunction(() => window.lifeosReadOnlyWorkspace && document.body.classList.contains('lo-ca-ready'));
    return { context, page, dialogs, downloads, errors };
  }
  async function openTools(page) {
    await page.locator('#lifeosNavigation [data-view="schedule"]').click();
    await page.waitForSelector('#lifeosPlanOverview[data-ready="true"]');
    await page.locator('.pov-settings summary').click();
    await page.locator('.pov-settings [data-v136-tab="more"]').click();
    await page.locator('[data-v136-screen="more"] > details > summary').click();
    await page.locator('#lo12DevDetails > summary').click();
    await page.locator('#lo12StarterDetails > summary').click();
  }
  try {
    {
      const { context, page, dialogs, downloads, errors } = await setup(false);
      try {
        const before = await page.evaluate(() => window.lifeosReadOnlyWorkspace());
        await openTools(page); await page.locator('#lifeosStarterApply').click();
        await page.waitForFunction(() => document.querySelector('#lifeosStarterStatus')?.textContent.includes('Starter imported'));
        const saved = await page.evaluate(() => window.lifeosReadOnlyWorkspace());
        assert(saved.sessions.some(row => row.seedBatch === 'lifeos-development-seed-v1'));
        assert.deepEqual(saved.sessions.find(row => row.id === 'synthetic-user-session'), before.sessions[0]);
        assert(downloads.length >= 1, 'Adding samples requests a backup');
        await page.reload(); await page.waitForFunction(() => window.lifeosReadOnlyWorkspace && document.body.classList.contains('lo-ca-ready'));
        assert((await page.evaluate(() => window.lifeosReadOnlyWorkspace())).sessions.some(row => row.seedBatch === 'lifeos-development-seed-v1'), 'Sample records persist after reload');
        await openTools(page); await page.locator('#lifeosStarterRemove').click();
        await page.waitForFunction(() => document.querySelector('#lifeosStarterStatus')?.textContent.includes('starter records removed'));
        const after = await page.evaluate(() => window.lifeosReadOnlyWorkspace());
        for (const key of ['sessions', 'events', 'schedule', 'todos', 'goals', 'workouts', 'meals', 'personalLogs', 'idealRoutines']) assert.deepEqual(after[key], before[key], 'Sample removal must retain existing ' + key);
        assert(downloads.length >= 2, 'Removing samples requests a backup');
        assert(dialogs.filter(dialog => dialog.type === 'confirm').length >= 4);
        assert.deepEqual(errors, []);
      } finally { await context.close(); }
    }
    {
      const { context, page, dialogs, downloads, errors } = await setup(false);
      try {
        const before = await page.evaluate(() => window.lifeosReadOnlyWorkspace());
        await page.evaluate(() => {
          const prior = { version: 1, ...window.lifeosReadOnlyWorkspace() };
          const seed = window.LifeOSDevelopmentStarter.generate(new Date());
          localStorage.setItem('lifeos-live-v1', JSON.stringify(window.LifeOSDevelopmentStarter.merge(prior, seed)));
        });
        await page.reload(); await page.waitForFunction(() => window.lifeosReadOnlyWorkspace && document.body.classList.contains('lo-ca-ready'));
        await openTools(page); await page.locator('#lifeosStarterRepair').click();
        await page.waitForFunction(() => document.querySelector('#lifeosStarterStatus')?.textContent.includes('Updated safely'));
        const repaired = await page.evaluate(() => window.lifeosReadOnlyWorkspace());
        assert.deepEqual(repaired.sessions.find(row => row.id === 'synthetic-user-session'), before.sessions[0]);
        assert.deepEqual(repaired.events.find(row => row.id === 'synthetic-user-event'), before.events[0]);
        assert(repaired.idealRoutines.filter(row => row.seedBatch === 'lifeos-development-seed-v1').length >= 14);
        assert(downloads.length >= 1, 'Repair requests a backup');
        assert(dialogs.filter(dialog => dialog.type === 'confirm').length >= 2);
        await page.reload(); await page.waitForFunction(() => window.lifeosReadOnlyWorkspace && document.body.classList.contains('lo-ca-ready'));
        const reloaded = await page.evaluate(() => window.lifeosReadOnlyWorkspace());
        assert.deepEqual(reloaded.sessions.find(row => row.id === 'synthetic-user-session'), before.sessions[0]);
        assert(reloaded.idealRoutines.filter(row => row.seedBatch === 'lifeos-development-seed-v1').length >= 14);
        assert.deepEqual(errors, []);
      } finally { await context.close(); }
    }
    {
      const { context, page, dialogs, downloads, errors } = await setup(true);
      try {
        const before = await page.evaluate(() => window.lifeosReadOnlyWorkspace());
        const atomic = await page.evaluate(() => localStorage.getItem('lifeos-v4-stage21-atomic'));
        await openTools(page); await page.locator('#lifeosStarterRepair').click();
        assert(dialogs.some(dialog => dialog.type === 'alert' && dialog.message.includes('linked to generated samples')), 'Repair explains why linked records are protected');
        assert.equal(downloads.length, 0); assert.deepEqual(await page.evaluate(() => window.lifeosReadOnlyWorkspace()), before);
        await page.locator('#lifeosStarterRemove').click();
        assert(dialogs.filter(dialog => dialog.type === 'alert' && dialog.message.includes('linked to generated samples')).length === 2, 'Removal also refuses linked records');
        assert.deepEqual(await page.evaluate(() => window.lifeosReadOnlyWorkspace()), before);
        assert.equal(await page.evaluate(() => localStorage.getItem('lifeos-v4-stage21-atomic')), atomic, 'Refused actions create no checkpoint');
        await page.reload(); await page.waitForFunction(() => window.lifeosReadOnlyWorkspace && document.body.classList.contains('lo-ca-ready'));
        assert.deepEqual(await page.evaluate(() => window.lifeosReadOnlyWorkspace()), before, 'Linked records survive reload');
        assert.deepEqual(errors, []);
      } finally { await context.close(); }
    }
    console.log('PASS: opt-in sample add/remove and linked-record refusal through current Plan tools');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
