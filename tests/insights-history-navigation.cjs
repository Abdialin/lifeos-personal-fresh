'use strict';
// Current visible Insights shortcut and Track History, using offline synthetic data.
const { chromium } = require('playwright');
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const root = process.cwd(), origin = 'https://lifeos-preview.local';
const serve = route => {
  const request = route.request(), url = new URL(request.url());
  const file = path.resolve(root, '.' + (url.pathname === '/' ? '/index.html' : url.pathname));
  if (url.origin === origin && request.method() === 'GET' && file.startsWith(root + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile()) return route.fulfill({ path: file });
  return route.abort();
};
async function openHistory(page) {
  await page.locator('#lifeosNavigation [data-view="analytics"]').click();
  const shortcut = page.locator('#v4Insights [data-v4-track-history]');
  await shortcut.waitFor({ state: 'visible' }); await shortcut.click();
  await page.waitForFunction(() => document.body.dataset.lifeosView === 'tracking' && document.querySelector('#loTrackConceptA [data-ca-tab="history"]')?.getAttribute('aria-selected') === 'true', null, { timeout: 8000 });
  assert(await page.locator('#caHistory').isVisible(), 'The shortcut opens the current Track History, not only the Track tab');
  assert.equal(await page.locator('#lifeosNavigation [data-view="tracking"]').getAttribute('aria-current'), 'page');
}
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 393, height: 780 }, isMobile: true, hasTouch: true });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', serve);
  await page.addInitScript(() => {
    const end = Date.now() - 60000, start = end - 600000;
    localStorage.setItem('lifeos-live-v1', JSON.stringify({ version: 1, events: [], schedule: [], todos: [], sessions: [{ id: 'synthetic-history-link', name: 'Synthetic history activity', status: 'finished', createdAt: start, startAt: start, endAt: end, segments: [{ start, end }], precision: 'measured' }] }));
  });
  try {
    await page.goto(origin + '/'); await page.waitForFunction(() => document.body.classList.contains('lo-ca-ready'));
    const before = await page.evaluate(() => JSON.stringify(window.lifeosReadOnlyWorkspace()));
    const atomic = await page.evaluate(() => localStorage.getItem('lifeos-v4-stage21-atomic'));
    await openHistory(page);
    assert((await page.locator('#caHistory').innerText()).includes('Synthetic history activity'), 'The existing recorded activity is available in History');
    await page.locator('#loTrackConceptA [data-ca-tab="live"]').click();
    await page.setViewportSize({ width: 393, height: 460 });
    await page.evaluate(() => document.querySelector('.lifeos-theme-toggle').click());
    assert.equal(await page.locator('html').getAttribute('data-lifeos-theme'), 'light');
    await openHistory(page);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), 'History must not overflow the reduced mobile viewport horizontally');
    assert.equal(await page.evaluate(() => JSON.stringify(window.lifeosReadOnlyWorkspace())), before, 'Navigation must not change any records');
    assert.equal(await page.evaluate(() => localStorage.getItem('lifeos-v4-stage21-atomic')), atomic, 'Navigation must not create a checkpoint');
    const emptyContext = await browser.newContext({ viewport: { width: 360, height: 650 }, isMobile: true, hasTouch: true });
    try {
      const empty = await emptyContext.newPage(); await empty.route('**/*', serve);
      await empty.goto(origin + '/'); await empty.waitForFunction(() => document.body.classList.contains('lo-ca-ready'));
      const emptyBefore = await empty.evaluate(() => JSON.stringify(window.lifeosReadOnlyWorkspace()));
      await openHistory(empty);
      assert.equal(await empty.evaluate(() => JSON.stringify(window.lifeosReadOnlyWorkspace())), emptyBefore, 'Empty-state navigation must not add records');
    } finally { await emptyContext.close(); }
    assert.deepEqual(errors, []);
    console.log('PASS: Insights history shortcut opens current Track History without changing records');
  } finally { await context.close(); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
