'use strict';
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = process.cwd(), origin = 'https://lifeos-today-aplus-preview.onrender.com';
const serve = route => {
  const request = route.request(), url = new URL(request.url());
  const file = path.resolve(root, '.' + (url.pathname === '/' ? '/index.html' : url.pathname));
  if (url.origin === origin && request.method() === 'GET' && file.startsWith(root + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile()) return route.fulfill({ path: file });
  return route.fulfill({ status: 404, body: 'isolated synthetic agenda fixture' });
};
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 393, height: 780 }, isMobile: true, hasTouch: true, timezoneId: 'Europe/Stockholm' });
  const page = await context.newPage(), errors = [], dialogs = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', dialog => { dialogs.push(dialog.message()); dialog.dismiss(); });
  await page.route('**/*', serve);
  const fixed = new Date('2026-11-24T16:00:00+01:00');
  await page.clock.install({ time: fixed }); await page.clock.setFixedTime(fixed);
  await page.addInitScript(() => {
    if (localStorage.getItem('lifeos-agenda-coverage-fixture')) return;
    const t = value => Date.parse(value + '+01:00');
    const plan = (id, name, start, end, extra = {}) => ({ id, name, startAt: t(start), endAt: t(end), status: 'planned', sessionId: null, reminder: false, activationMode: 'manual', ...extra });
    const start = t('2026-11-24T15:45:00');
    const sessions = [{ id: 'running', name: 'Work', status: 'running', startAt: start, createdAt: start, endAt: null, segments: [{ start, end: null }], precision: 'measured' }];
    const schedule = [
      plan('earlier', 'Earlier class', '2026-11-24T13:30:00', '2026-11-24T14:00:00'),
      plan('ongoing', 'Earlier appointment', '2026-11-24T15:30:00', '2026-11-24T16:30:00'),
      plan('started', 'Work commitment', '2026-11-24T16:15:00', '2026-11-24T16:45:00', { status: 'started', sessionId: 'running' }),
      plan('adjacent', 'Review notes', '2026-11-24T16:45:00', '2026-11-24T17:00:00'),
      plan('cancelled', 'Cancelled meeting', '2026-11-24T17:15:00', '2026-11-24T17:45:00', { status: 'cancelled' }),
      plan('skipped', 'Skipped appointment', '2026-11-24T17:20:00', '2026-11-24T17:30:00', { status: 'skipped' }),
      plan('future', '<Dinner>', '2026-11-24T18:00:00', '2026-11-24T19:00:00'),
      plan('complete', 'Completed booking', '2026-11-24T19:00:00', '2026-11-24T19:30:00', { status: 'completed' }),
      plan('overnight', 'Overnight commitment', '2026-11-24T23:30:00', '2026-11-25T00:30:00'),
      plan('tomorrow-overlap', 'Overnight overlap', '2026-11-25T00:15:00', '2026-11-25T01:00:00'),
      plan('tomorrow', 'Morning meeting', '2026-11-25T10:00:00', '2026-11-25T11:00:00')
    ];
    const todos = [{ id: 'todo-1', name: 'Prepare assignment', due: '2026-11-24', priority: 'high', done: false },
      { id: 'todo-2', name: 'Review priorities', due: '2026-11-24', priority: 'normal', done: true },
      { id: 'todo-3', name: 'Review draft', due: '2026-11-23', priority: 'high', done: false },
      { id: 'todo-4', name: 'Return book', due: '2026-11-22', priority: 'normal', done: false },
      { id: 'todo-5', name: 'Plan weekend', due: '2026-11-27', priority: 'normal', done: false }];
    const habitDefinitions = [{ id: 'habit-1', title: 'Read', startDate: '2026-11-24', everyDays: 1 },
      { id: 'habit-2', title: 'Stretch', startDate: '2026-11-24', everyDays: 1 }];
    const habitChecks = [{ id: 'check-1', habitId: 'habit-1', date: '2026-11-24', done: true, createdAt: start }];
    localStorage.setItem('lifeos-live-v1', JSON.stringify({ version: 1, sessions, events: [], schedule, todos, habitDefinitions, habitChecks }));
    localStorage.setItem('lifeos-agenda-coverage-fixture', '1');
  });
  const t = value => Date.parse(value + '+01:00');
  const gaps = () => page.locator('#apPage2 [data-ap-unscheduled-start]').evaluateAll(nodes => nodes.map(node => [Number(node.dataset.apUnscheduledStart), Number(node.dataset.apUnscheduledEnd)]));
  const capture = async name => {
    if (!process.env.TODAY_AGENDA_COVERAGE_CAPTURE) return;
    fs.mkdirSync('docs/design/today/current', { recursive: true });
    await page.screenshot({ path: 'docs/design/today/current/release-agenda-coverage-' + name + '.png' });
  };
  try {
    await page.goto(origin + '/');
    await page.waitForFunction(() => document.body.classList.contains('lo-ca-ready') && window.lifeosTodayAPlusSnapshot);
    const before = await page.evaluate(() => JSON.stringify(window.lifeosReadOnlyWorkspace()));
    await page.locator('#apTab2').click();
    await page.locator('#apPage2 [data-ap-detail="plan"][data-ap-key="ongoing"]').waitFor();
    const agenda = page.locator('#apPage2');
    assert.deepEqual(await gaps(), [
      [t('2026-11-24T17:00:00'), t('2026-11-24T18:00:00')],
      [t('2026-11-24T19:30:00'), t('2026-11-24T23:30:00')]
    ], 'Scheduled, overlapping and overnight commitments must be excluded from unscheduled windows');
    const ongoing = agenda.locator('[data-ap-detail="plan"][data-ap-key="ongoing"]');
    assert((await ongoing.innerText()).includes('unverified'), 'An untracked ongoing commitment is not assumed to have been attended or missed');
    assert.equal(await ongoing.locator('xpath=..').getAttribute('data-ap-journey-overlap'), 'false', 'A commitment started before now is not automatically an overlap');
    assert.equal(await agenda.locator('[data-ap-detail="plan"][data-ap-key="started"]').locator('xpath=..').getAttribute('data-ap-journey-overlap'), 'true');
    assert.equal(await agenda.locator('[data-ap-detail="plan"][data-ap-key="adjacent"]').locator('xpath=..').getAttribute('data-ap-journey-overlap'), 'false');
    assert.equal(await agenda.locator('[data-ap-detail="plan"][data-ap-key="cancelled"]').count(), 0);
    assert.equal(await agenda.locator('[data-ap-detail="plan"][data-ap-key="skipped"]').count(), 0);
    assert((await agenda.locator('[data-ap-key="overnight"]').innerText()).includes('ends 25 Nov'));
    assert((await agenda.locator('[data-ap-key="future"]').innerText()).includes('<Dinner>'));
    assert.equal(await agenda.locator('svg dinner, dinner').count(), 0, 'Names must remain text');
    assert((await agenda.innerText()).includes('Work · Running'));
    await page.evaluate(() => window.scrollTo(0, 0)); await capture('top-dark');
    await agenda.locator('[data-ap-unscheduled-start]').first().scrollIntoViewIfNeeded(); await capture('journey-dark');
    const earlier = agenda.locator('summary', { hasText: 'earlier commitment' });
    assert.equal(await earlier.innerText(), 'Show 1 earlier commitment');
    await earlier.click();
    await page.waitForFunction(() => [...document.querySelectorAll('#apPage2 summary')].some(s => s.textContent === 'Hide 1 earlier commitment'));
    assert((await agenda.locator('[data-ap-key="earlier"]').innerText()).includes('Unverified'));
    assert.equal(await agenda.locator('summary', { hasText: 'more overdue task' }).innerText(), 'Show 1 more overdue task');
    assert.equal(await agenda.locator('summary', { hasText: 'other open task' }).innerText(), 'Show 1 other open task');
    await ongoing.click();
    assert((await page.locator('#caDialogBody').innerText()).includes('Earlier appointment'));
    await page.locator('#loCADialog [data-ca-close]').last().click();
    await agenda.locator('[data-ap-live-free]').uncheck(); assert.deepEqual(await gaps(), []);
    await agenda.locator('[data-ap-live-free]').check();
    await agenda.locator('[data-ap-live-day="1"]').click();
    assert.deepEqual(await gaps(), [
      [t('2026-11-25T01:00:00'), t('2026-11-25T10:00:00')],
      [t('2026-11-25T11:00:00'), t('2026-11-26T00:00:00')]
    ], 'Tomorrow must include the portion of an overnight commitment that began today');
    assert.equal(await agenda.locator('[data-ap-key="overnight"]').locator('xpath=..').getAttribute('data-ap-journey-overlap'), 'false');
    assert.equal(await agenda.locator('[data-ap-key="tomorrow-overlap"]').locator('xpath=..').getAttribute('data-ap-journey-overlap'), 'true');
    await agenda.locator('[data-ap-live-day="2"]').click();
    assert.equal(await agenda.locator('[data-ap-live-free]').count(), 0, 'Unbounded upcoming view must not offer an inapplicable window toggle');
    assert.equal(await agenda.locator('[data-ap-key="ongoing"]').count(), 1);
    assert.equal(await agenda.locator('summary', { hasText: 'earlier commitment' }).innerText(), 'Hide 1 earlier commitment', 'Disclosure state and label survive rerender');
    await agenda.locator('[data-ap-live-day="0"]').click();
    for (const size of [{ width: 360, height: 650 }, { width: 393, height: 460 }, { width: 412, height: 780 }]) {
      await page.setViewportSize(size);
      const item = agenda.locator('[data-ap-key="ongoing"]'); await item.scrollIntoViewIfNeeded();
      const box = await item.boundingBox(); assert(box.height >= 44, 'Commitment detail needs a usable touch target at ' + JSON.stringify(size));
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No horizontal overflow at ' + JSON.stringify(size));
    }
    await page.setViewportSize({ width: 393, height: 780 });
    await page.locator('#todayAPlus .ap-header button').click();
    await page.evaluate(() => window.scrollTo(0, 0)); await capture('top-light');
    await agenda.locator('[data-ap-unscheduled-start]').first().scrollIntoViewIfNeeded(); await capture('journey-light');
    assert.equal(await page.evaluate(() => JSON.stringify(window.lifeosReadOnlyWorkspace())), before, 'Viewing Agenda does not change records');
    await page.reload(); await page.waitForFunction(() => window.lifeosTodayAPlusSnapshot);
    assert.equal(await page.evaluate(() => JSON.stringify(window.lifeosReadOnlyWorkspace())), before, 'Agenda inspection preserves records after reload');
    await page.locator('#apTab2').click();
    const moved = await page.evaluate(({ start, end, replacement }) => {
      const detail = { id: 'future', expectedStartAt: start, expectedEndAt: end, newStartAt: replacement };
      document.dispatchEvent(new CustomEvent('lifeos-v62-move-plan', { detail })); return detail.result;
    }, { start: t('2026-11-24T18:00:00'), end: t('2026-11-24T19:00:00'), replacement: t('2026-11-24T20:00:00') });
    assert(moved.ok, moved.message);
    await page.waitForFunction(expected => [...document.querySelectorAll('#apPage2 [data-ap-unscheduled-start]')].some(node => Number(node.dataset.apUnscheduledEnd) === expected), t('2026-11-24T19:00:00'));
    assert.deepEqual(await gaps(), [
      [t('2026-11-24T17:00:00'), t('2026-11-24T19:00:00')],
      [t('2026-11-24T19:30:00'), t('2026-11-24T20:00:00')],
      [t('2026-11-24T21:00:00'), t('2026-11-24T23:30:00')]
    ], 'Unscheduled windows must update after a saved Plan edit');
    await page.reload(); await page.waitForFunction(() => window.lifeosTodayAPlusSnapshot); await page.locator('#apTab2').click();
    assert.equal(await page.evaluate(() => window.lifeosReadOnlyWorkspace().schedule.find(item => item.id === 'future').startAt), t('2026-11-24T20:00:00'));
    assert.deepEqual(await gaps(), [
      [t('2026-11-24T17:00:00'), t('2026-11-24T19:00:00')],
      [t('2026-11-24T19:30:00'), t('2026-11-24T20:00:00')],
      [t('2026-11-24T21:00:00'), t('2026-11-24T23:30:00')]
    ], 'Updated windows must survive reload');
    assert.deepEqual(dialogs, []); assert.deepEqual(errors, []);
    for (const example of [
      { at: '2026-03-28T12:00:00+01:00', start: '2026-03-29T00:00:00+01:00', end: '2026-03-30T00:00:00+02:00', hours: 23 },
      { at: '2026-10-24T12:00:00+02:00', start: '2026-10-25T00:00:00+02:00', end: '2026-10-26T00:00:00+01:00', hours: 25 }
    ]) {
      const empty = await browser.newContext({ viewport: { width: 393, height: 780 }, timezoneId: 'Europe/Stockholm' });
      try {
        const p = await empty.newPage(); await p.route('**/*', serve);
        await p.clock.install({ time: new Date(example.at) }); await p.clock.setFixedTime(new Date(example.at));
        await p.goto(origin + '/'); await p.waitForFunction(() => window.lifeosTodayAPlusSnapshot);
        await p.locator('#apTab2').click(); await p.locator('#apPage2 [data-ap-live-day="1"]').click();
        assert.equal(await p.locator('#apPage2 summary', { hasText: /Show 0 (more overdue|other open|earlier)/ }).count(), 0, 'Empty attention groups need no disclosure');
        const range = await p.locator('#apPage2 [data-ap-unscheduled-start]').evaluateAll(nodes => nodes.map(node => [Number(node.dataset.apUnscheduledStart), Number(node.dataset.apUnscheduledEnd)]));
        assert.deepEqual(range, [[Date.parse(example.start), Date.parse(example.end)]], 'An empty local day respects clock changes');
        assert.equal((range[0][1] - range[0][0]) / 3600000, example.hours);
      } finally { await empty.close(); }
    }
    console.log('PASS: Agenda windows exclude ongoing, overlapping and overnight commitments without inferring attendance');
  } finally { await context.close(); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
