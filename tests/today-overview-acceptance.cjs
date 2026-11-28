'use strict';
// Populated and empty synthetic workspaces only; all network requests are intercepted.
const { chromium } = require('playwright');
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const root = process.cwd(), origin = 'https://lifeos-today-aplus-preview.onrender.com';
const serve = route => {
  const request = route.request(), url = new URL(request.url());
  const file = path.resolve(root, '.' + (url.pathname === '/' ? '/index.html' : url.pathname));
  if (url.origin === origin && request.method() === 'GET' && file.startsWith(root + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile()) return route.fulfill({ path: file });
  return route.fulfill({ status: 404, body: 'offline synthetic Today fixture' });
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  async function setup(populated) {
    const context = await browser.newContext({ viewport: { width: 393, height: 780 }, isMobile: true, hasTouch: true, timezoneId: 'Europe/Stockholm' });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message)); await page.route('**/*', serve);
    const now = new Date('2026-11-26T16:00:00+01:00');
    await page.clock.install({ time: now }); await page.clock.setFixedTime(now);
    await page.addInitScript(({ populated }) => {
      const t = text => Date.parse(text + '+01:00');
      const finished = (id, name, segments) => ({ id, name, status: 'finished', createdAt: segments[0].start, startAt: segments[0].start, endAt: segments[segments.length - 1].end, segments, precision: 'measured' });
      const segment = (a, b) => ({ start: t('2026-11-26T' + a + ':00'), end: b ? t('2026-11-26T' + b + ':00') : null });
      const sessions = populated ? [
        finished('study', 'Research <phase>', [segment('08:00', '09:00'), segment('10:00', '10:30')]),
        finished('crossing', 'University workshop', [segment('11:30', '13:00')]),
        { id: 'running', name: 'Very long ongoing research activity for testing full details', status: 'running', createdAt: t('2026-11-26T15:00:00'), startAt: t('2026-11-26T15:00:00'), endAt: null, segments: [segment('15:00', null)], precision: 'measured' },
        { id: 'paused', name: 'Parallel paused activity', status: 'paused', createdAt: t('2026-11-26T14:00:00'), startAt: t('2026-11-26T14:00:00'), endAt: null, segments: [segment('14:00', '14:20')], precision: 'measured' }
      ] : [];
      const schedule = populated ? [
        { id: 'next', name: 'Dinner <plan>', status: 'planned', startAt: t('2026-11-26T16:30:00'), endAt: t('2026-11-26T17:30:00'), sessionId: null },
        { id: 'tomorrow', name: 'Tomorrow workshop', status: 'planned', startAt: t('2026-11-27T09:00:00'), endAt: t('2026-11-27T10:00:00'), sessionId: null },
        { id: 'cancelled', name: 'Cancelled appointment', status: 'cancelled', startAt: t('2026-11-26T16:05:00'), endAt: t('2026-11-26T16:20:00'), sessionId: null }
      ] : [];
      localStorage.setItem('lifeos-live-v1', JSON.stringify({ version: 1, sessions, events: [], schedule, todos: populated ? [{ id: 'task', name: 'Prepare notes', due: '2026-11-26', priority: 'high', done: false }] : [] }));
    }, { populated });
    await page.goto(origin + '/'); await page.waitForFunction(() => document.body.classList.contains('lo-ca-ready') && window.lifeosTodayAPlusSnapshot);
    return { context, page, errors };
  }
  async function settleViewport(page, size) {
    await page.setViewportSize(size);
    // The app positions navigation after a visualViewport resize. Capture only
    // after that frame, so a prior viewport cannot contaminate the evidence.
    await page.waitForFunction(() => {
      const nav = document.querySelector('#lifeosNavigation'), viewport = window.visualViewport;
      return nav && Math.abs(nav.getBoundingClientRect().bottom - ((viewport?.offsetTop || 0) + (viewport?.height || innerHeight))) < 2;
    });
  }
  async function capture(page, name) {
    if (!process.env.TODAY_OVERVIEW_ACCEPTANCE_CAPTURE && !process.env.TODAY_SECTION_ACCEPTANCE_CAPTURE) return;
    fs.mkdirSync('docs/design/today/current', { recursive: true });
    for (const [suffix, size] of [['360', { width: 360, height: 650 }], ['393', { width: 393, height: 780 }], ['412', { width: 412, height: 780 }], ['short', { width: 393, height: 460 }]]) {
      await settleViewport(page, size); await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: 'docs/design/today/current/v1-overview-acceptance-' + name + '-' + suffix + '.png' });
      if (suffix === '393') {
        await page.screenshot({ path: 'docs/design/today/current/v1-overview-acceptance-' + name + '-full.png', fullPage: true });
      }
    }
    await page.setViewportSize({ width: 393, height: 780 });
  }
  async function captureOtherTabs(page, theme) {
    if (!process.env.TODAY_SECTION_ACCEPTANCE_CAPTURE) return;
    for (const [index, section] of [[1, 'timeline'], [2, 'agenda'], [3, 'review']]) {
      await page.locator('#apTab' + index).click();
      if (index === 1) {
        await page.locator('#apPage1 [data-ap-live-period="1"]').click();
        if (await page.locator('#apTimelineLiveDetails').evaluate(node => node.open)) await page.locator('#apTimelineLiveDetails > summary').click();
      }
      for (const [suffix, size] of [['360', { width: 360, height: 650 }], ['393', { width: 393, height: 780 }], ['412', { width: 412, height: 780 }], ['short', { width: 393, height: 460 }]]) {
        await settleViewport(page, size); await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({ path: 'docs/design/today/current/v1-section-acceptance-' + section + '-' + theme + '-' + suffix + '.png' });
        if (suffix === '393') {
          await page.screenshot({ path: 'docs/design/today/current/v1-section-acceptance-' + section + '-' + theme + '-full.png', fullPage: true });
          if (index === 1) {
            await page.locator('#apTimelineLiveDetails > summary').click();
            await page.screenshot({ path: 'docs/design/today/current/v1-section-acceptance-timeline-' + theme + '-expanded.png' });
            await page.locator('#apTimelineLiveDetails > summary').click();
          }
        }
      }
    }
    await page.setViewportSize({ width: 393, height: 780 }); await page.locator('#apTab0').click();
  }
  async function closeDetails(page) {
    await page.locator('#loCADialog [data-ca-close]').last().click();
    await page.locator('#loCADialog').waitFor({ state: 'hidden' });
  }
  async function goToday(page) {
    await page.locator('#lifeosNavigation [data-view="dashboard"]').click();
    await page.waitForFunction(() => document.body.dataset.lifeosView === 'dashboard');
    await page.locator('#apTab0').click();
  }
  async function verifyContrast(page) {
    const ratios = await page.evaluate(() => {
      const lum = value => value.match(/[\d.]+/g).slice(0, 3).map(Number).map(x => { x /= 255; return x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; }).reduce((sum, value, i) => sum + value * [0.2126, 0.7152, 0.0722][i], 0);
      const ratio = (foreground, background) => { const a = lum(foreground), b = lum(background); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05); };
      return [...document.querySelectorAll('#apPage0 .ap-v1-live-action,#apPage0 .ap-v1-distribution > div > div span')].map(node => {
        const background = node.matches('button') ? node : node.closest('.ap-card');
        return ratio(getComputedStyle(node).color, getComputedStyle(background).backgroundColor);
      });
    });
    assert(ratios.length >= 5 && ratios.every(ratio => ratio >= 4.5), 'Overview controls and category labels need readable contrast: ' + JSON.stringify(ratios));
  }
  async function verifyTimelineContrast(page) {
    const ratios = await page.locator('#apTimelineLiveDetails').evaluate(panel => {
      const lum = value => value.match(/[\d.]+/g).slice(0, 3).map(Number).map(x => { x /= 255; return x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; }).reduce((sum, value, i) => sum + value * [0.2126, 0.7152, 0.0722][i], 0);
      const background = lum(getComputedStyle(panel).backgroundColor);
      return [...panel.querySelectorAll('summary .ap-v1-timeline-live-kicker,summary .ap-v1-timeline-live-name,summary .ap-v1-timeline-live-clock')].map(node => { const foreground = lum(getComputedStyle(node).color); return (Math.max(background, foreground) + .05) / (Math.min(background, foreground) + .05); });
    });
    assert(ratios.length === 3 && ratios.every(ratio => ratio >= 4.5), 'Timeline live summary needs readable contrast: ' + JSON.stringify(ratios));
  }
  try {
    {
      const { context, page, errors } = await setup(true);
      try {
        const before = await page.evaluate(() => JSON.stringify(window.lifeosReadOnlyWorkspace()));
        const checkpoint = await page.evaluate(() => localStorage.getItem('lifeos-v4-stage21-atomic'));
        await capture(page, 'dark');
        await captureOtherTabs(page, 'dark');
        await verifyContrast(page);
        const primary = page.locator('#apPage0 .ap-v1-live-detail');
        assert.equal(await primary.count(), 1);
        assert((await primary.getAttribute('aria-label')).includes('Very long ongoing research activity for testing full details'));
        assert.equal(await primary.getAttribute('aria-describedby'), 'ap-v1-primary-clock');
        assert.equal(await page.locator('#ap-v1-primary-clock').getAttribute('role'), 'timer');
        assert((await page.locator('#apPage0 .ap-v1-category-ring').getAttribute('aria-label')).includes('4h 20m'));
        assert((await page.locator('#apPage0 [data-ap-live-action="pause"]').getAttribute('aria-label')).startsWith('Pause '));
        assert.equal(await page.locator('#apPage0 [data-ap-live-action="focus"]').getAttribute('aria-label'), 'Focus');
        await primary.click();
        assert((await page.locator('#caDialogBody').innerText()).includes('Very long ongoing research activity for testing full details'));
        await closeDetails(page);
        const secondary = page.locator('#apPage0 .ap-v1-active-detail[data-ap-key="paused"]');
        assert((await secondary.innerText()).includes('Paused'));
        await secondary.click(); assert((await page.locator('#caDialogBody').innerText()).includes('Parallel paused activity'));
        await closeDetails(page);

        const morning = page.locator('#apPage0 [data-ap-live-part="0"]'); await morning.click();
        assert.equal(await morning.getAttribute('aria-pressed'), 'true');
        assert.equal(await morning.getAttribute('aria-label'), 'Morning · 2 recorded activities');
        const parts = page.locator('#apPage0 [data-ap-live-part="0"]').locator('xpath=ancestor::section[1]');
        const study = parts.locator('[data-ap-detail="record"][data-ap-key="study"]');
        assert.equal(await study.count(), 1, 'A paused session is one activity, not one per segment');
        assert((await study.innerText()).includes('Research <phase>'));
        assert((await study.innerText()).includes('1h 30m active · 2 intervals'));
        assert((await parts.locator('[data-ap-key="crossing"]').innerText()).includes('30m active'), 'Only the portion within morning is counted');
        await study.click(); assert((await page.locator('#caDialogBody').innerText()).includes('Research <phase>')); await closeDetails(page);
        await page.locator('#apPage0 [data-ap-live-part="1"]').click();
        assert((await parts.locator('[data-ap-key="crossing"]').innerText()).includes('1h active'), 'The remaining portion belongs to the afternoon');

        const next = page.locator('#apPage0 .ap-v1-overview-next');
        assert.equal(await next.locator('[data-ap-detail="plan"]').count(), 2);
        assert((await next.innerText()).includes('Dinner <plan>'));
        assert((await next.innerText()).includes('27 Nov'));
        assert(!(await next.innerText()).includes('Cancelled appointment'));
        for (const [id, name] of [['next', 'Dinner <plan>'], ['tomorrow', 'Tomorrow workshop']]) {
          await next.locator('[data-ap-key="' + id + '"]').click();
          assert((await page.locator('#caDialogBody').innerText()).includes(name)); await closeDetails(page);
        }
        await next.locator('[data-ap-tab="2"]').click();
        assert.equal(await page.locator('#apTab2').getAttribute('aria-selected'), 'true');
        await page.locator('#apTab0').click();
        await page.locator('#apPage0 .ap-v1-live-header [data-ap-live-nav="tracking"]').click();
        await page.waitForFunction(() => document.body.dataset.lifeosView === 'tracking');
        assert((await page.locator('#caLive').innerText()).includes('Parallel paused activity'));
        await goToday(page);
        await page.locator('#apPage0 .ap-v1-distribution').locator('xpath=ancestor::section[1]').locator('[data-ap-tab="1"]').click();
        assert.equal(await page.locator('#apTab1').getAttribute('aria-selected'), 'true');
        const timelineLive = page.locator('#apTimelineLiveDetails');
        await verifyTimelineContrast(page);
        assert(!(await timelineLive.evaluate(node => node.open)), 'Timeline live information starts compact');
        assert((await timelineLive.locator('summary').innerText()).includes('Very long ongoing research'));
        const dateBox = await page.locator('#apPage1 .ap-v1-date').boundingBox(), liveBox = await timelineLive.boundingBox();
        assert(dateBox.y < liveBox.y && liveBox.height >= 44 && liveBox.height <= 60, 'The date and compact live row precede the map');
        await timelineLive.locator('summary').click();
        assert.equal(await timelineLive.locator('[data-ap-detail="active"]').count(), 2);
        await page.locator('#apPage1 [data-ap-live-period="2"]').click();
        assert(await timelineLive.evaluate(node => node.open), 'The expanded live list survives a timeline update');
        await timelineLive.locator('[data-ap-detail="active"][data-ap-key="paused"]').click();
        assert((await page.locator('#caDialogBody').innerText()).includes('Parallel paused activity')); await closeDetails(page);
        await timelineLive.locator('[data-ap-detail="plan"][data-ap-key="next"]').click();
        assert((await page.locator('#caDialogBody').innerText()).includes('Dinner <plan>')); await closeDetails(page);
        await page.locator('#apTab0').click();
        await page.locator('#apPage0 [data-ap-live-action="gap"]').click();
        assert(await page.locator('#caGapContext').isVisible()); await closeDetails(page);
        await page.locator('#apPage0 .ap-v1-takeaway').locator('xpath=ancestor::section[1]').locator('[data-ap-tab="3"]').click();
        assert.equal(await page.locator('#apTab3').getAttribute('aria-selected'), 'true');
        assert.equal(await page.locator('#apPage3 h2').innerText(), 'Review your day', 'The compact Review retains its accessible heading');
        assert((await page.locator('#apPage3 .ap-v1-review-date').boundingBox()).height >= 44);
        await page.locator('#apTab0').click();
        const priorities = page.locator('#apPage0 [data-ap-live-task="task"]');
        await priorities.click(); await page.waitForFunction(() => document.body.dataset.lifeosView === 'schedule');
        await page.locator('#paTaskSheet').waitFor({ state: 'visible' });
        assert.equal(await page.locator('#paTaskSheet [name="name"]').inputValue(), 'Prepare notes');
        await page.locator('#paTaskSheet [data-task-close]').click(); await goToday(page);
        for (const [selector, view] of [['.ap-v1-progress ~ [data-ap-live-nav="schedule"]', 'schedule'], ['.ap-v1-progress ~ [data-ap-live-nav="goals"]', 'goals'], ['[data-ap-live-nav="life"]', 'life'], ['.ap-v1-quick [data-ap-live-nav="tracking"]', 'tracking'], ['.ap-v1-quick [data-ap-live-nav="analytics"]', 'analytics']]) {
          await page.locator('#apPage0 ' + selector).click();
          await page.waitForFunction(expected => document.body.dataset.lifeosView === expected, view); await goToday(page);
        }
        await page.evaluate(() => document.querySelector('#todayAPlus .ap-header button').click());
        assert.equal(await page.locator('html').getAttribute('data-lifeos-theme'), 'light');
        await capture(page, 'light');
        await captureOtherTabs(page, 'light');
        await verifyContrast(page);
        await page.locator('#apTab1').click(); await verifyTimelineContrast(page); await page.locator('#apTab0').click();
        for (const size of [{ width: 360, height: 650 }, { width: 393, height: 460 }, { width: 412, height: 780 }]) {
          await page.setViewportSize(size);
          assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), 'No horizontal overflow at ' + JSON.stringify(size));
          const labels = await page.locator('#apPage0 .ap-v1-distribution > div > div span').evaluateAll(nodes => nodes.map(node => { const range = document.createRange(); range.selectNodeContents(node); return { text: node.textContent, clipped: node.scrollWidth > node.clientWidth + 1, lines: range.getClientRects().length }; }));
          assert(labels.length >= 2 && labels.every(label => !label.clipped && (label.text !== 'University' || label.lines === 1)), 'Category names must remain readable without splitting words: ' + JSON.stringify(labels));
          for (const selector of ['#apPage0 .ap-v1-live-detail', '#apPage0 .ap-v1-live-action[data-ap-live-action="pause"]', '#apPage0 .ap-v1-live-action[data-ap-live-action="finish"]', '#apPage0 .ap-v1-live-action[data-ap-live-action="focus"]', '#apPage0 .ap-v1-active-detail', '#apPage0 .ap-v1-overview-next [data-ap-key="next"]']) {
            const rect = await page.locator(selector).boundingBox();
            assert(rect && rect.height >= 44 && rect.width >= 44, 'Usable touch target: ' + selector + ' at ' + JSON.stringify(size));
          }
        }
        assert.equal(await page.evaluate(() => JSON.stringify(window.lifeosReadOnlyWorkspace())), before, 'Read-only inspection must not change records');
        assert.equal(await page.evaluate(() => localStorage.getItem('lifeos-v4-stage21-atomic')), checkpoint, 'Read-only inspection must not create a checkpoint');
        assert.deepEqual(errors, []);
      } finally { await context.close(); }
    }
    {
      const { context, page, errors } = await setup(true);
      try {
        await page.locator('#apPage0 [data-ap-live-action="focus"]').click();
        await page.waitForFunction(() => document.body.dataset.lifeosView === 'tracking');
        await page.locator('#loCADialog').waitFor({ state: 'visible' });
        await closeDetails(page); await page.locator('#lifeosNavigation [data-view="dashboard"]').click();
        await page.locator('#apTab0').waitFor({ state: 'visible' });
        const beforeFailure = await page.evaluate(() => JSON.stringify(window.lifeosReadOnlyWorkspace()));
        await page.evaluate(() => {
          window.__overviewSetItem = Storage.prototype.setItem;
          Storage.prototype.setItem = function(key, value) {
            if (key === 'lifeos-v4-stage21-atomic') throw Error('synthetic checkpoint failure');
            return window.__overviewSetItem.call(this, key, value);
          };
        });
        let message = '';
        page.once('dialog', async dialog => { message = dialog.message(); await dialog.accept(); });
        await page.locator('#apPage0 [data-ap-live-action="pause"]').click();
        assert(message.includes('Action not saved'), 'A failed pause must be reported');
        assert.equal(await page.evaluate(() => JSON.stringify(window.lifeosReadOnlyWorkspace())), beforeFailure, 'A failed checkpoint retains all original records');
        await page.evaluate(() => { Storage.prototype.setItem = window.__overviewSetItem; delete window.__overviewSetItem; });
        await page.locator('#apPage0 [data-ap-live-action="pause"]').click();
        assert.equal((await page.evaluate(() => window.lifeosReadOnlyWorkspace().sessions.find(s => s.id === 'running'))).status, 'paused');
        assert((await page.locator('#apPage0 [data-ap-live-action="resume"]').getAttribute('aria-label')).startsWith('Resume '));
        await page.locator('#apPage0 [data-ap-live-action="resume"]').click();
        assert.equal((await page.evaluate(() => window.lifeosReadOnlyWorkspace().sessions.find(s => s.id === 'running'))).status, 'running');
        await page.clock.setFixedTime(new Date('2026-11-26T16:00:05+01:00'));
        page.once('dialog', dialog => dialog.accept());
        await page.locator('#apPage0 [data-ap-live-action="finish"]').click();
        const saved = await page.evaluate(() => window.lifeosReadOnlyWorkspace().sessions);
        assert.equal(saved.find(s => s.id === 'running').status, 'finished');
        assert.equal(saved.find(s => s.id === 'paused').status, 'paused', 'The concurrent activity remains untouched');
        if (await page.locator('#activityDetailsModal').isVisible()) await page.locator('#loDetailSkip').click();
        await page.reload(); await page.waitForFunction(() => window.lifeosReadOnlyWorkspace);
        const reloaded = await page.evaluate(() => window.lifeosReadOnlyWorkspace().sessions);
        assert.deepEqual(reloaded, saved, 'Confirmed timer actions persist after reload');
        assert.deepEqual(errors, []);
      } finally { await context.close(); }
    }
    {
      const { context, page, errors } = await setup(false);
      try {
        assert((await page.locator('#apPage0').innerText()).includes('No timer is running'));
        assert((await page.locator('#apPage0 .ap-v1-overview-next').innerText()).includes('No upcoming commitments'));
        assert.equal(await page.locator('#apPage0 [data-ap-live-part="0"]').getAttribute('aria-label'), 'Morning · 0 recorded activities');
        await page.locator('#apPage0 .ap-v1-overview-next [data-ap-tab="2"]').click();
        assert.equal(await page.locator('#apTab2').getAttribute('aria-selected'), 'true');
        assert.deepEqual(errors, []);
      } finally { await context.close(); }
    }
    console.log('PASS: Today Overview activity details, day-part accounting, commitments, empty state, themes and mobile widths');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
