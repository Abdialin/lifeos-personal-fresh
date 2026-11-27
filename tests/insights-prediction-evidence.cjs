'use strict';
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = process.cwd(), origin = 'https://lifeos-today-aplus-preview.onrender.com';
const serve = route => {
  const request = route.request(), url = new URL(request.url());
  const file = path.resolve(root, '.' + (url.pathname === '/' ? '/index.html' : url.pathname));
  if (url.origin === origin && request.method() === 'GET' && file.startsWith(root + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile()) return route.fulfill({ path: file });
  return route.fulfill({ status: 404, body: 'offline synthetic insight fixture' });
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 393, height: 780 }, timezoneId: 'Europe/Stockholm' });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message)); await page.route('**/*', serve);
  const fixed = new Date('2026-11-24T16:00:00+01:00');
  await page.clock.install({ time: fixed }); await page.clock.setFixedTime(fixed);
  await page.addInitScript(() => {
    const now = Date.parse('2026-11-24T16:00:00+01:00'), minute = 60000, day = 86400000;
    const sessions = [45, 60, 60, 75].map((duration, i) => {
      const end = now - (i + 1) * day, start = end - duration * minute;
      return { id: 'visual-' + i, name: 'Study', status: 'finished', startAt: start, endAt: end, segments: [{ start, end }], precision: 'measured' };
    });
    localStorage.setItem('lifeos-live-v1', JSON.stringify({ version: 1, sessions, events: [], schedule: [], todos: [] }));
  });
  try {
    await page.goto(origin + '/');
    await page.waitForFunction(() => window.LifeOSInsightsDigestV184 && window.lifeosReadOnlyWorkspace);
    const before = await page.evaluate(() => JSON.stringify(window.lifeosReadOnlyWorkspace()));
    const result = await page.evaluate(now => {
      const minute = 60000, at = n => now - n * minute;
      const make = (id, endAgo, duration, extra = {}) => {
        const end = at(endAgo), start = end - duration * minute;
        return { id, name: 'Study', status: 'finished', startAt: start, endAt: end, segments: [{ start, end }], ...extra };
      };
      const a = make('a', 6000, 30), b = make('b', 4500, 45), c = make('c', 3000, 60), d = make('d', 1500, 75);
      c.segments = [{ start: c.startAt, end: c.startAt + 10 * minute }, { start: c.startAt + 20 * minute, end: c.endAt + 10 * minute }];
      c.endAt += 10 * minute; // 10 + 50 recorded minutes, with a 10-minute pause.
      d.endAt = null; // A closed legacy segment may still provide completed evidence.
      const future = make('future', -120, 60);
      const fake = make('example', 500, 60, { notes: 'Synthetic Preview test record' });
      const imported = make('imported', 480, 60, { source: 'imported-example' });
      const duplicate1 = make('duplicate', 460, 60), duplicate2 = make('duplicate', 440, 60);
      const noId = make('', 420, 60);
      const open = make('open', 400, 60); open.segments[0].end = null;
      const missing = make('missing', 380, 60); missing.segments[0].start = null;
      const endMismatch = make('mismatch', 360, 60); endMismatch.endAt = endMismatch.segments[0].end - minute;
      const startMismatch = make('wrong-start', 340, 60); startMismatch.startAt += minute;
      const get = sessions => window.LifeOSInsightsDigestV184.getPersonalized({ sessions, schedule: [] }, now).predictions;
      const dayStart = Date.parse('2026-11-23T09:00:00+01:00'), daySession = {
        id: 'day', name: 'Study', status: 'finished', startAt: dayStart, endAt: dayStart + 60 * minute,
        segments: [{ start: dayStart, end: dayStart + 60 * minute }]
      };
      const dayTypes = (status, startAt = dayStart) => window.LifeOSInsightsDigestV184.getPersonalized({ sessions: [daySession], schedule: [{
        id: 'shift', name: 'Work shift', status, startAt, endAt: dayStart + 5 * 60 * minute
      }] }, now).dayTypes.map(item => item.name);
      const planReport = (status, startAt = dayStart) => {
        const workspace = { sessions: [daySession], schedule: [{ id: 'shift', name: 'Work shift', status, startAt, endAt: dayStart + 5 * 60 * minute }] };
        const report = window.LifeOSDayIntelligenceV170.dailyReport(dayStart, now, workspace);
        const comparison = window.LifeOSDayIntelligenceV170.planComparison(report, workspace);
        return { planned: report.plannedMs, compared: comparison.scheduledMs, rows: comparison.rows.length };
      };
      return {
        tooLittle: get([a, b, c, future, fake, imported, duplicate1, duplicate2, noId, open, missing, endMismatch, startMismatch]),
        enough: get([a, b, c, d, future, fake, imported, duplicate1, duplicate2, noId, open, missing, endMismatch, startMismatch]),
        skipped: dayTypes('skipped'), skippedUpper: dayTypes(' SKIPPED '), cancelled: dayTypes('cancelled'), deleted: dayTypes('deleted'), planned: dayTypes('planned'),
        missingPlanStart: dayTypes('planned', null), emptyPlanStart: dayTypes('planned', ''), booleanPlanStart: dayTypes('planned', true),
        reportMissing: planReport('planned', null), reportSkipped: planReport(' SKIPPED '), reportDeleted: planReport('deleted'), reportValid: planReport('planned')
      };
    }, fixed.getTime());
    assert.deepEqual(result.tooLittle, [], 'Invalid, future, duplicate and example sessions must not manufacture a four-session pattern');
    assert.equal(result.enough.length, 1); assert.equal(result.enough[0].name, 'Study');
    assert.equal(result.enough[0].count, 4); assert.equal(result.enough[0].medianMs, 52.5 * 60000, 'Median uses qualifying active duration and excludes pauses');
    assert.equal(result.enough[0].lowMs, 41.25 * 60000); assert.equal(result.enough[0].highMs, 63.75 * 60000, 'Quartiles use interpolation across the sorted observations');
    for (const status of ['skipped', 'skippedUpper', 'cancelled', 'deleted']) assert(!result[status].includes('Workday evidence'), status + ' plans must not create a workday prediction');
    for (const status of ['missingPlanStart', 'emptyPlanStart', 'booleanPlanStart']) assert(!result[status].includes('Workday evidence'), status + ' must not create a workday prediction');
    assert(result.planned.includes('Workday evidence'), 'A still-planned shift remains labeled as planning evidence');
    for (const status of ['reportMissing', 'reportSkipped', 'reportDeleted']) assert.deepEqual(result[status], { planned: 0, compared: 0, rows: 0 }, status + ' must not create planned time');
    assert.deepEqual(result.reportValid, { planned: 5 * 3600000, compared: 5 * 3600000, rows: 1 });
    await page.locator('#lifeosNavigation [data-view="analytics"]').click();
    const suggestion = page.locator('#lo186-recommendations .l186-card').filter({ hasText: 'Typical activity duration: Study' });
    await suggestion.waitFor({ state: 'visible' });
    assert((await suggestion.innerText()).includes('median of 4 completed sessions'));
    assert((await suggestion.innerText()).includes('Central range (25th–75th percentile): 56m–1h 4m'));
    if (process.env.INSIGHTS_PREDICTION_CAPTURE === '1') {
      fs.mkdirSync('docs/design/insights/current', { recursive: true });
      await page.evaluate(() => document.querySelector('#lo186-recommendations')?.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await page.screenshot({ path: 'docs/design/insights/current/v1-prediction-evidence-dark.png' });
      await page.evaluate(() => document.querySelector('.lifeos-theme-toggle').click());
      await page.evaluate(() => document.querySelector('#lo186-recommendations')?.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await page.screenshot({ path: 'docs/design/insights/current/v1-prediction-evidence-light.png' });
    }
    assert.equal(await page.evaluate(() => JSON.stringify(window.lifeosReadOnlyWorkspace())), before, 'Inspecting evidence does not change records');
    assert.deepEqual(errors, []);
    console.log('PASS: Insights predictions exclude future, duplicate, malformed and example activity evidence');
  } finally { await context.close(); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
