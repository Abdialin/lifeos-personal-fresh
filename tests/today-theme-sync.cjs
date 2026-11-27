'use strict';
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = process.cwd(), origin = 'https://lifeos-today-aplus-preview.onrender.com';
const serve = route => {
  const req = route.request(), url = new URL(req.url());
  const file = path.resolve(root, '.' + (url.pathname === '/' ? '/index.html' : url.pathname));
  if (url.origin === origin && req.method() === 'GET' && file.startsWith(root + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile()) return route.fulfill({ path: file });
  return route.fulfill({ status: 404, body: 'isolated synthetic theme fixture' });
};
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 393, height: 780 }, isMobile: true, hasTouch: true, timezoneId: 'Europe/Stockholm' });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', serve);
  const fixed = new Date('2026-11-26T16:00:00+01:00');
  await page.clock.install({ time: fixed }); await page.clock.setFixedTime(fixed);
  await page.addInitScript(() => {
    if (localStorage.getItem('lifeos-live-v1')) return;
    const start = Date.parse('2026-11-26T09:00:00+01:00'), end = start + 3600000;
    localStorage.setItem('lifeos-live-v1', JSON.stringify({ version: 1, events: [], schedule: [], todos: [],
      sessions: [{ id: 'study', name: 'University study', status: 'finished', startAt: start, endAt: end,
        createdAt: start, segments: [{ start, end }], precision: 'measured', notes: '' }] }));
  });
  const nav = async view => {
    await page.locator('#lifeosNavigation [data-view="' + view + '"]').click();
    await page.waitForFunction(value => document.body.dataset.lifeosView === value, view);
  };
  const expectTheme = async value => {
    await page.waitForFunction(theme => document.documentElement.dataset.lifeosTheme === theme &&
      document.getElementById('todayAPlus').classList.contains('ap-light') === (theme === 'light'), value);
    assert.equal(await page.evaluate(() => localStorage.getItem('lifeos.personal.theme.v5')), value);
    const label = await page.locator('#todayAPlus .ap-header button').getAttribute('aria-label');
    assert.equal(label, value === 'light' ? 'Switch to dark mode' : 'Switch to light mode');
  };
  const capture = async name => {
    if (!process.env.TODAY_THEME_CAPTURE) return;
    const dir = 'docs/design/today/current'; fs.mkdirSync(dir, { recursive: true });
    await page.screenshot({ path: path.join(dir, 'release-shared-theme-' + name + '.png') });
  };
  try {
    await page.goto(origin + '/'); await page.waitForFunction(() => document.body.classList.contains('lo-ca-ready'));
    const before = await page.evaluate(() => JSON.stringify(window.lifeosReadOnlyWorkspace().sessions));
    await page.locator('#todayAPlus .ap-header button').click();
    await expectTheme('light');
    await capture('light');
    for (const view of ['tracking', 'schedule', 'goals', 'analytics', 'life', 'dashboard']) {
      await nav(view); await expectTheme('light');
    }
    await page.reload(); await page.waitForFunction(() => document.body.classList.contains('lo-ca-ready'));
    await expectTheme('light');
    await nav('schedule');
    await page.waitForSelector('#lifeosPlanOverview[data-ready="true"]');
    await page.locator('.pov-settings summary').click();
    await page.locator('[data-pov-theme]').click();
    await expectTheme('dark');
    await nav('dashboard');
    await capture('dark');
    await page.reload(); await page.waitForFunction(() => document.body.classList.contains('lo-ca-ready'));
    await expectTheme('dark');
    assert.equal(await page.evaluate(() => JSON.stringify(window.lifeosReadOnlyWorkspace().sessions)), before);
    assert.deepEqual(errors, []);
    console.log('PASS: shared Today theme, six-section navigation, Plan control and reload');
  } finally { await context.close(); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
