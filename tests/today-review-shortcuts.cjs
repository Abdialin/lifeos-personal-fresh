'use strict';
// These navigation tests run entirely offline with disposable synthetic data.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = process.cwd();
const origin = 'https://lifeos-today-aplus-preview.onrender.com';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 393, height: 780 }, isMobile: true, hasTouch: true, timezoneId: 'Europe/Stockholm' });
  const page = await context.newPage();
  const errors = [];
  const dialogs = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', dialog => { dialogs.push(dialog.type()); dialog.dismiss(); });
  await page.route('**/*', route => {
    const request = route.request();
    const url = new URL(request.url());
    const file = path.resolve(root, '.' + (url.pathname === '/' ? '/index.html' : url.pathname));
    if (url.origin === origin && request.method() === 'GET' && file.startsWith(root + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile()) return route.fulfill({ path: file });
    return route.fulfill({ status: 404, body: 'offline synthetic review fixture' });
  });
  const now = new Date('2026-11-26T16:00:00+01:00');
  await page.clock.install({ time: now });
  await page.clock.setFixedTime(now);
  await page.addInitScript(() => {
    const t = s => Date.parse('2026-11-26T' + s + '+01:00');
    const session = (id, name, start, end) => ({ id, name, status: end ? 'finished' : 'running', startAt: t(start), createdAt: t(start), endAt: end ? t(end) : null, segments: [{ start: t(start), end: end ? t(end) : null }], precision: 'measured' });
    const sessions = [session('study', 'Study', '10:00:00', '10:30:00'), session('unknown', 'Mystery', '11:00:00', '11:30:00'), session('live', 'Current session', '15:00:00', null)];
    localStorage.setItem('lifeos-live-v1', JSON.stringify({ version: 1, sessions, events: [], schedule: [], todos: [] }));
  });
  try {
    await page.goto(origin + '/');
    await page.waitForFunction(() => document.body.classList.contains('lo-ca-ready') && window.lifeosTodayAPlusSnapshot);
    const before = await page.evaluate(() => JSON.stringify(window.lifeosReadOnlyWorkspace()));
    const checkpoint = await page.evaluate(() => localStorage.getItem('lifeos-v4-stage21-atomic'));
    const todayReview = async () => {
      await page.locator('#lifeosNavigation [data-view="dashboard"]').click();
      await page.waitForFunction(() => document.body.dataset.lifeosView === 'dashboard');
      await page.locator('#apTab3').click();
      await page.locator('#apPage3 [data-ap-review-link="averages"]').waitFor({ state: 'visible' });
    };
    const expectTrackTab = async tab => {
      await page.waitForFunction(tab => document.body.dataset.lifeosView === 'tracking' && document.querySelector('#loTrackConceptA [data-ca-tab="' + tab + '"]')?.getAttribute('aria-selected') === 'true', tab);
    };
    for (const theme of ['dark', 'light']) {
      for (const size of [{ width: 393, height: 780 }, { width: 393, height: 460 }]) {
        await page.setViewportSize(size);
        await todayReview();
        for (const kind of ['averages', 'timer-limits', 'plan-compare', 'classification']) {
          const button = page.locator('#apPage3 [data-ap-review-link="' + kind + '"]');
          let target;
          for (let attempt = 0; attempt < 5; attempt++) {
            try {
              await button.scrollIntoViewIfNeeded();
              await button.focus();
              target = await button.evaluate(node => {
                const rect = node.getBoundingClientRect();
                const hit = document.elementFromPoint((rect.left + rect.right) / 2, (rect.top + rect.bottom) / 2);
                return { height: rect.height, focused: document.activeElement === node, hit: hit === node || node.contains(hit) };
              });
              break;
            } catch (error) {
              if (!/not attached|detached/i.test(error.message) || attempt === 4) throw error;
            }
          }
          assert(target.height >= 44 && target.focused && target.hit, 'Review shortcut is reachable: ' + JSON.stringify({ theme, size, kind, target }));
        }
        if (process.env.TODAY_REVIEW_SHORTCUT_CAPTURE && size.height === 780) {
          fs.mkdirSync('docs/design/today/current', { recursive: true });
          await page.screenshot({ path: 'docs/design/today/current/v1-review-shortcuts-' + theme + '.png' });
        }
        await page.locator('#apPage3 [data-ap-review-link="averages"]').click();
        await expectTrackTab('review');
        await page.waitForFunction(() => document.querySelector('#caReview [data-ca-review-period="week"]')?.getAttribute('aria-pressed') === 'true' && document.querySelector('#caReview [data-ca-review-group="activity"]')?.getAttribute('aria-pressed') === 'true');
        assert((await page.locator('#caReview').innerText()).includes('Average per session'));
        assert((await page.locator('#caReview').innerText()).includes('Study'));

        await todayReview();
        await page.locator('#apPage3 [data-ap-review-link="timer-limits"]').click();
        await expectTrackTab('live');
        await page.locator('#loCADialog').waitFor({ state: 'visible' });
        assert((await page.locator('#caDialogTitle').innerText()).includes('Timer settings'));
        assert(await page.locator('#caExpectedMinutes').isVisible());
        await page.locator('#loCADialog [data-ca-close]').last().click();

        await todayReview();
        await page.locator('#apPage3 [data-ap-review-link="classification"]').click();
        await expectTrackTab('review');
        await page.waitForFunction(() => document.querySelector('#caReview [data-ca-review-period="all"]')?.getAttribute('aria-pressed') === 'true' && document.querySelector('#caReview [data-ca-review-group="category"]')?.getAttribute('aria-pressed') === 'true');
        await page.locator('#caReview [data-ca-review-drill="Other / review"]').click();
        await expectTrackTab('history');
        assert.equal(await page.locator('#caHistory [data-ca-history-filter="category"]').inputValue(), 'Other / review');
        for (const selector of ['#caHistory details.ca-history-month', '#caHistory details.ca-history-week']) {
          const group = page.locator(selector).first();
          if (!(await group.evaluate(element => element.open))) await group.locator(':scope > summary').click();
        }
        const day = page.locator('#caHistory details[data-ca-day="2026-11-26"]');
        if (!(await day.evaluate(element => element.open))) await day.locator('summary').click();
        await day.locator('[data-ca-sheet="record"]').filter({ hasText: 'Mystery' }).click();
        assert((await page.locator('#caDialogBody').innerText()).includes('Mystery'));
        assert.equal(await page.locator('#caHistoryCategory').inputValue(), 'Other / review');
        await page.locator('#loCADialog [data-ca-close]').last().click();

        await todayReview();
        await page.locator('#apPage3 [data-ap-review-link="plan-compare"]').click();
        await page.waitForFunction(() => document.body.dataset.lifeosView === 'schedule' && document.querySelector('#v136Workspace [data-v136-tab="compare"]')?.getAttribute('aria-selected') === 'true');
        assert(await page.locator('#v136Workspace [data-v136-screen="compare"]').isVisible());
        assert((await page.locator('#v136Workspace [data-v136-screen="compare"]').innerText()).includes('Reality'));
        assert.equal(await page.evaluate(() => JSON.stringify(window.lifeosReadOnlyWorkspace())), before, theme + ' shortcut navigation must not alter any saved records');
        assert.equal(await page.evaluate(() => localStorage.getItem('lifeos-v4-stage21-atomic')), checkpoint, theme + ' shortcut navigation must not replace the recovery checkpoint');
      }
      if (theme === 'dark') {
        await todayReview();
        await page.locator('#todayAPlus .ap-header button').click();
      }
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(dialogs, []);
    console.log('PASS: Review shortcuts reach their matching existing tools without changing synthetic records in both themes and viewport heights');
  } finally {
    await context.close();
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
