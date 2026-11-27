'use strict';
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = process.cwd(), origin = 'https://lifeos-today-aplus-preview.onrender.com';
const serve = route => {
  const req = route.request(), url = new URL(req.url());
  const file = path.resolve(root, '.' + (url.pathname === '/' ? '/index.html' : url.pathname));
  if (url.origin === origin && req.method() === 'GET' && file.startsWith(root + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile()) return route.fulfill({ path: file });
  return route.fulfill({ status: 404, body: 'isolated synthetic timer fixture' });
};
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 393, height: 780 }, isMobile: true, hasTouch: true, timezoneId: 'Europe/Stockholm' });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', serve);
  const fixed = new Date('2026-11-26T16:00:00+01:00');
  await page.clock.install({ time: fixed });
  await page.clock.setFixedTime(fixed);
  await page.addInitScript(() => {
    const active = (id, name, start) => ({ id, name, status: 'running', startAt: start, createdAt: start, endAt: null,
      segments: [{ start, end: null }], precision: 'measured', notes: '' });
    localStorage.setItem('lifeos-live-v1', JSON.stringify({ version: 1, events: [], schedule: [], todos: [],
      sessions: [active('study', 'Study', Date.parse('2026-11-26T15:00:00+01:00')),
        active('work', 'Work project', Date.parse('2026-11-26T15:15:00+01:00'))] }));
  });
  const visible = () => page.locator('#lo86-timer').isVisible();
  const waitVisibility = value => page.waitForFunction(expected => {
    const box = document.querySelector('#lo86-timer');
    return !!box && (getComputedStyle(box).visibility !== 'hidden' && getComputedStyle(box).display !== 'none') === expected;
  }, value);
  const capture = async name => {
    if (!process.env.TRACK_INLINE_CAPTURE) return;
    const dir = 'docs/design/track/current'; fs.mkdirSync(dir, { recursive: true });
    await page.screenshot({ path: path.join(dir, 'v1-inline-timer-' + name + '.png') });
  };
  try {
    await page.goto(origin + '/');
    await page.waitForFunction(() => document.body.classList.contains('lo-ca-ready'));
    const before = await page.evaluate(() => JSON.stringify(window.lifeosReadOnlyWorkspace().sessions));
    const todayPrimary = await page.locator('#apPage0 .ap-v1-live-row [data-ap-live-clock]').getAttribute('data-ap-live-clock');
    if (await page.locator('#lo86-select').inputValue() !== todayPrimary) {
      await page.locator('#lo86-toggle').click();
      await page.locator('#lo86-select').selectOption(todayPrimary);
      await page.locator('#lo86-toggle').click();
    }
    await waitVisibility(false);
    await page.locator('#apTab1').click();
    await waitVisibility(true);
    await page.locator('#apTab0').click();
    await waitVisibility(false);
    await page.locator('#lifeosNavigation [data-view="tracking"]').click();
    await page.waitForSelector('#caMainClock', { state: 'visible' });
    const primary = await page.locator('#caLive .ca-primary [data-ca-id]').first().getAttribute('data-ca-id');
    const other = primary === 'study' ? 'work' : 'study';
    if (await page.locator('#lo86-select').inputValue() !== primary) {
      await page.locator('#lo86-toggle').click();
      await page.locator('#lo86-select').selectOption(primary);
      await page.locator('#lo86-toggle').click();
    }
    await waitVisibility(false);
    assert(!(await visible()), 'Do not cover Track controls with the duplicate of the visible in-page timer');
    assert.equal(await page.locator('#lo32ActiveTimer').evaluate(el => getComputedStyle(el).display), 'none', 'The legacy floating timer must not appear as a second overlay');
    await capture('live');
    await page.locator('#caLive .ca-live-quick-grid [data-ca-sheet="start"]').click();
    assert(await page.locator('#loCADialog').isVisible(), 'The More quick-start control remains reachable');
    await page.locator('#loCADialog [data-ca-close]').last().click();
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await waitVisibility(true);
    await capture('scrolled');
    await page.locator('#lo86-toggle').click();
    await page.locator('#lo86-select').selectOption(other);
    await page.evaluate(() => window.scrollTo(0, 0));
    await waitVisibility(true);
    await page.locator('#lo86-toggle').click();
    await waitVisibility(true);
    assert.equal(await page.locator('#lo86-select').inputValue(), other, 'A different selected session remains visible even when the first is on the page');
    await page.locator('#lo86-toggle').click();
    await page.locator('#lo86-select').selectOption(primary);
    assert(await visible(), 'Expanded controls remain visible until the user closes them');
    await page.locator('#lo86-toggle').click();
    await waitVisibility(false);
    await page.locator('[data-ca-tab="history"]').click();
    await waitVisibility(true);
    await page.locator('[data-ca-tab="live"]').click();
    await page.evaluate(() => window.scrollTo(0, 0));
    await waitVisibility(false);
    await page.evaluate(() => document.querySelector('.lifeos-theme-toggle').click());
    await capture('live-light');
    for (const size of [{ width: 360, height: 650 }, { width: 393, height: 460 }, { width: 412, height: 780 }]) {
      await page.setViewportSize(size);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(250);
      const inlineVisible = await page.evaluate(() => {
        const row = document.querySelector('#caLive .ca-live-primary-row').getBoundingClientRect();
        const nav = document.querySelector('#lifeosNavigation'), viewport = window.visualViewport;
        const top = viewport?.offsetTop || 0, viewportBottom = top + (viewport?.height || innerHeight);
        const bottom = getComputedStyle(nav).position === 'fixed' ? Math.min(viewportBottom, nav.getBoundingClientRect().top) : viewportBottom;
        return row.top >= top && row.bottom <= bottom;
      });
      await waitVisibility(!inlineVisible);
      assert.equal(await visible(), !inlineVisible, 'Timer visibility follows the actual inline clock at ' + JSON.stringify(size));
    }
    assert.equal(await page.evaluate(() => JSON.stringify(window.lifeosReadOnlyWorkspace().sessions)), before, 'Visibility changes must not edit timers');
    const overnight = await browser.newContext({ viewport: { width: 393, height: 780 }, isMobile: true, hasTouch: true, timezoneId: 'Europe/Stockholm' });
    const nightPage = await overnight.newPage();
    await nightPage.route('**/*', serve);
    await nightPage.clock.install({ time: fixed }); await nightPage.clock.setFixedTime(fixed);
    await nightPage.addInitScript(() => {
      const start = Date.parse('2026-11-25T23:30:00+01:00');
      localStorage.setItem('lifeos-live-v1', JSON.stringify({ version: 1, events: [], schedule: [], todos: [],
        sessions: [{ id: 'overnight', name: 'Overnight work', status: 'running', createdAt: start, startAt: start,
          endAt: null, segments: [{ start, end: null }], precision: 'measured', notes: '' }] }));
    });
    await nightPage.goto(origin + '/'); await nightPage.waitForFunction(() => document.body.classList.contains('lo-ca-ready'));
    assert(await nightPage.locator('#lo86-timer').isVisible(), 'Keep today\'s elapsed portion visible for an overnight activity');
    await nightPage.locator('#lifeosNavigation [data-view="tracking"]').click();
    await nightPage.locator('#caMainClock').waitFor({ state: 'visible' });
    assert(await nightPage.locator('#lo86-timer').isVisible(), 'Track must also retain the distinct overnight day-portion clock');
    assert.notEqual(await nightPage.locator('#caMainClock').innerText(), await nightPage.locator('#lo86-clock').innerText());
    await overnight.close();
    assert.deepEqual(errors, []);
    console.log('PASS: Today and Track inline timers, floating fallback, concurrent and overnight sessions, reduced viewports');
  } finally { await context.close(); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
