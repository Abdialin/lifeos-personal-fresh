'use strict';
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = process.cwd(), origin = 'https://lifeos-today-aplus-preview.onrender.com';
const serve = route => {
  const request = route.request(), url = new URL(request.url());
  const file = path.resolve(root, '.' + (url.pathname === '/' ? '/index.html' : url.pathname));
  if (url.origin === origin && request.method() === 'GET' && file.startsWith(root + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile()) return route.fulfill({ path: file });
  return route.fulfill({ status: 404, body: 'offline synthetic timer fixture' });
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 393, height: 780 }, isMobile: true, hasTouch: true, timezoneId: 'Europe/Stockholm' });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message)); await page.route('**/*', serve);
  const fixed = new Date('2026-11-24T16:00:00+01:00'), at = offset => new Date(fixed.getTime() + offset);
  await page.clock.install({ time: fixed }); await page.clock.setFixedTime(fixed);
  const session = id => page.evaluate(id => window.lifeosReadOnlyWorkspace().sessions.find(item => item.id === id), id);
  const elapsed = id => page.evaluate(id => window.lifeosTodayAPlusSnapshot().active.find(item => item.id === id)?.elapsedMs, id);
  try {
    await page.goto(origin + '/'); await page.waitForFunction(() => document.body.classList.contains('lo-ca-ready'));
    await page.locator('#lifeosNavigation [data-view="tracking"]').click();
    await page.locator('#caLive [data-ca-quick-start="Work"]').click();
    await page.waitForFunction(() => window.lifeosReadOnlyWorkspace().sessions.some(item => item.name === 'Work' && item.status === 'running'));
    const initial = await page.evaluate(() => window.lifeosReadOnlyWorkspace().sessions.find(item => item.name === 'Work'));
    assert.equal(initial.startAt, fixed.getTime()); assert.equal(initial.segments.length, 1);

    // Move the browser clock forward without running interval callbacks, then
    // dispatch the same focus signal used when the page returns to the foreground.
    await page.clock.setFixedTime(at(125000));
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await page.waitForFunction(() => document.querySelector('#caMainClock')?.textContent.includes('00:02:05'));
    assert.equal(await elapsed(initial.id), 125000, 'Elapsed time follows the wall clock after a simulated suspended interval');
    await page.reload(); await page.waitForFunction(() => document.body.classList.contains('lo-ca-ready'));
    await page.locator('#lifeosNavigation [data-view="tracking"]').click();
    await page.waitForFunction(() => document.querySelector('#caMainClock')?.textContent.includes('00:02:05'));
    assert.equal((await session(initial.id)).startAt, initial.startAt);
    assert.equal(await elapsed(initial.id), 125000, 'Reload preserves the original running interval');

    await page.locator('#caLive [data-ca-act="pause"][data-ca-id="' + initial.id + '"]').click();
    await page.waitForFunction(id => window.lifeosReadOnlyWorkspace().sessions.find(item => item.id === id)?.status === 'paused', initial.id);
    await page.clock.setFixedTime(at(725000)); await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    assert.equal(await elapsed(initial.id), 125000, 'A simulated ten-minute pause does not count as active time');
    await page.locator('#caLive [data-ca-act="resume"][data-ca-id="' + initial.id + '"]').click();
    await page.waitForFunction(id => window.lifeosReadOnlyWorkspace().sessions.find(item => item.id === id)?.status === 'running', initial.id);
    await page.clock.setFixedTime(at(790000)); await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    assert.equal(await elapsed(initial.id), 190000, 'Only resumed active time is added');
    const finish = page.locator('#caLive [data-ca-act="finish"][data-ca-id="' + initial.id + '"]');
    await finish.click(); await finish.click();
    await page.waitForFunction(id => window.lifeosReadOnlyWorkspace().sessions.find(item => item.id === id)?.status === 'finished', initial.id);
    const saved = await session(initial.id);
    assert.equal(saved.segments.length, 2);
    assert.equal(saved.segments.reduce((sum, item) => sum + item.end - item.start, 0), 190000);
    if (await page.locator('#activityDetailsModal').isVisible()) await page.locator('#loDetailSkip').click();
    await page.reload(); await page.waitForFunction(() => window.lifeosReadOnlyWorkspace);
    assert.deepEqual(await session(initial.id), saved, 'Completed activity and exact segments survive reload');
    await page.locator('#lifeosNavigation [data-view="tracking"]').click();
    await page.locator('#loTrackConceptA [data-ca-tab="history"]').click();
    assert((await page.locator('#caHistory').innerText()).includes('Work'), 'The completed activity remains in Track History');
    assert.deepEqual(errors, []);
    console.log('PASS: browser wall-clock resume, pause accounting, saved segments and History after reload');
  } finally { await context.close(); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
