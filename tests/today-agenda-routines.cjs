'use strict';
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = process.cwd(), origin = 'https://lifeos-today-aplus-preview.onrender.com';
const serve = route => {
  const request = route.request(), url = new URL(request.url());
  const file = path.resolve(root, '.' + (url.pathname === '/' ? '/index.html' : url.pathname));
  if (url.origin === origin && request.method() === 'GET' && file.startsWith(root + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile()) return route.fulfill({ path: file });
  return route.fulfill({ status: 404, body: 'isolated synthetic routine fixture' });
};
(async () => {
  const browser = await chromium.launch({ headless: true });
  const fixed = new Date('2026-11-26T16:00:00+01:00');
  const scrollStable = async locator => {
    for (let attempt = 0; attempt < 3; attempt++) {
      try { await locator.scrollIntoViewIfNeeded(); return; }
      catch (error) { if (attempt === 2 || !error.message.includes('not attached')) throw error; }
    }
  };
  const capture = async (page, name) => {
    if (!process.env.TODAY_ROUTINES_CAPTURE) return;
    const dir = 'docs/design/today/current'; fs.mkdirSync(dir, { recursive: true });
    await scrollStable(page.locator('#apPage2 .ap-v1-routines'));
    await page.screenshot({ path: path.join(dir, 'release-agenda-routines-' + name + '.png') });
  };
  const captureHistory = async (page, name) => {
    if (!process.env.TODAY_ROUTINES_CAPTURE) return;
    const dir = 'docs/design/my-life/current'; fs.mkdirSync(dir, { recursive: true });
    await scrollStable(page.locator('#personalLogList [data-personal-page="more"]'));
    await page.screenshot({ path: path.join(dir, 'v1-subsection-routine-history-' + name + '.png') });
  };
  async function setup(populated) {
    const context = await browser.newContext({ viewport: { width: 393, height: 780 }, isMobile: true, hasTouch: true, timezoneId: 'Europe/Stockholm' });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', serve);
    await page.clock.install({ time: fixed }); await page.clock.setFixedTime(fixed);
    await page.addInitScript(populated => {
      if (localStorage.getItem('routine-agenda-fixture')) return;
      const start = Date.parse('2026-11-26T09:00:00+01:00'), end = start + 3600000;
      const sessions = [{ id: 'study', name: 'Study', status: 'finished', createdAt: start, startAt: start, endAt: end, segments: [{ start, end }], precision: 'measured', notes: '' }];
      const personalLogs = populated ? [
        ...Array.from({ length: 26 }, (_, i) => ({ id: 'archive-' + i, date: '2026-11-24', category: 'Family', minutes: 5, quantity: null, unit: '', precision: 'measured', notes: '' })),
        { id: 'archive-0', date: '2026-11-24', category: 'Family', minutes: 7, quantity: null, unit: '', precision: 'measured', notes: 'Duplicate imported identifier' },
        { id: 'previous', date: '2026-11-25', category: 'Family', minutes: 60, quantity: null, unit: '', precision: 'measured', notes: 'Earlier day' },
        { id: 'reading', date: '2026-11-26', category: 'Quran', minutes: 20, quantity: 3, unit: 'pages', precision: 'measured', notes: 'Keep <calm>' },
        { id: 'unknown', date: '2026-11-26', category: 'Other', minutes: null, quantity: '<img src=x onerror=alert(1)>', unit: 'pages', precision: 'unknown', notes: '' },
        { id: 'example', date: '2026-11-26', category: 'Sleep', minutes: 30, quantity: null, unit: '', precision: 'estimated', notes: 'Synthetic Preview test record', source: 'assumed-demo' },
        { id: 'tomorrow', date: '2026-11-27', category: 'Prayer', minutes: '1e308', quantity: null, unit: '', precision: 'measured', notes: '' }
      ] : [];
      localStorage.setItem('lifeos-live-v1', JSON.stringify({ version: 1, sessions, events: [], schedule: [], todos: [], personalLogs, habitDefinitions: [], habitChecks: [] }));
      localStorage.setItem('routine-agenda-fixture', '1');
    }, populated);
    await page.goto(origin + '/'); await page.waitForFunction(() => document.body.classList.contains('lo-ca-ready') && window.lifeosTodayAPlusSnapshot);
    return { context, page, errors };
  }
  async function agenda(page) {
    await page.locator('#lifeosNavigation [data-view="dashboard"]').click();
    await page.waitForTimeout(200);
    await page.locator('#apTab2').click();
  }
  try {
    let { context, page, errors } = await setup(true);
    await agenda(page);
    const box = page.locator('#apPage2 .ap-v1-routines'), summary = box.locator(':scope > summary');
    assert.equal(await summary.innerText(), 'Show routine records (3)');
    const before = await page.evaluate(() => ({ records: JSON.stringify(window.lifeosReadOnlyWorkspace().personalLogs), metrics: window.lifeosTodayAPlusSnapshot().metrics }));
    await summary.click();
    await page.waitForFunction(() => document.querySelector('#apPage2 .ap-v1-routines > summary')?.textContent.startsWith('Hide '));
    const text = await box.innerText();
    for (const expected of ['Quran', '20m', '3 pages', 'measured', 'Keep <calm>', 'Other', 'Duration not recorded', 'Quantity unavailable', 'Example']) assert(text.includes(expected), expected);
    assert(!text.includes('Family') && !text.includes('Prayer'), 'Only the selected local day belongs in the list');
    assert.equal(await box.locator('calm').count(), 0, 'Notes must be rendered as text');
    assert(text.includes('separate from tracked time'));
    assert.equal(await page.evaluate(() => JSON.stringify(window.lifeosReadOnlyWorkspace().personalLogs)), before.records);
    assert.deepEqual(await page.evaluate(() => window.lifeosTodayAPlusSnapshot().metrics), before.metrics, 'Routine logs must not add occupied time');
    await capture(page, 'dark');
    await box.locator('[data-ap-live-quick="routine-history"]').click();
    await page.waitForFunction(() => document.body.dataset.lifeosView === 'life' && document.body.dataset.loLifeSection === 'routines');
    await page.locator('#personalLogList').waitFor({ state: 'visible' });
    assert((await page.locator('#personalLogList').innerText()).includes('Quran'));
    assert.equal(await page.locator('#personalLogList img').count(), 0, 'Imported routine values must not become HTML');
    const history = page.locator('#personalLogList');
    assert.equal(await history.locator('.item').count(), 12);
    assert((await history.innerText()).includes('Showing 12 of 32 records'));
    await history.locator('[data-personal-page="more"]').click();
    assert.equal(await history.locator('.item').count(), 24);
    assert((await history.innerText()).includes('Showing 24 of 32 records'));
    assert(await history.locator('[data-personal-page="more"]').evaluate(element => document.activeElement === element));
    await captureHistory(page, 'dark');
    await history.locator('[data-personal-page="more"]').click();
    assert.equal(await history.locator('.item').count(), 32);
    assert.equal(await history.locator('[data-personal-delete="archive-0"]').count(), 2, 'Both records with the imported duplicate identifier must remain reachable');
    assert.equal(await page.evaluate(() => JSON.stringify(window.lifeosReadOnlyWorkspace().personalLogs)), before.records, 'Browsing history must not change records');
    await history.locator('[data-personal-delete="archive-0"]').first().click();
    assert((await history.locator('[data-personal-error]').innerText()).includes('No record was deleted'));
    assert.equal(await page.evaluate(() => JSON.stringify(window.lifeosReadOnlyWorkspace().personalLogs)), before.records, 'A duplicate identifier must not delete either record');
    const target = history.locator('[data-personal-delete="archive-1"]');
    const renderedSnapshot = await target.getAttribute('data-personal-snapshot');
    await target.evaluate(element => { element.dataset.personalSnapshot = '{}'; });
    await target.click();
    assert.equal(await page.evaluate(() => JSON.stringify(window.lifeosReadOnlyWorkspace().personalLogs)), before.records, 'A stale displayed record must not be deleted');
    await target.evaluate((element, snapshot) => { element.dataset.personalSnapshot = snapshot; }, renderedSnapshot);
    page.once('dialog', dialog => dialog.dismiss());
    await target.click();
    assert.equal(await page.evaluate(() => JSON.stringify(window.lifeosReadOnlyWorkspace().personalLogs)), before.records, 'Cancelling deletion must preserve records');
    page.once('dialog', dialog => dialog.accept());
    await target.click();
    assert.deepEqual(await page.evaluate(() => window.lifeosReadOnlyWorkspace().personalLogs), JSON.parse(before.records).filter(x => x.id !== 'archive-1'), 'Only the explicitly confirmed synthetic record is removed');
    await history.locator('[data-personal-page="less"]').click();
    assert.equal(await history.locator('.item').count(), 12);
    await agenda(page); if (!(await box.evaluate(element => element.open))) await summary.click();
    await box.locator('[data-ap-live-quick="routine"]').click();
    await page.locator('#personalLogForm').waitFor({ state: 'visible' });
    await page.locator('#personalLogCategory').selectOption({ label: 'Reading' });
    await page.locator('#personalLogMinutes').fill('25');
    await page.locator('#personalLogQuantity').fill('10');
    await page.locator('#personalLogUnit').fill('pages');
    await page.locator('#personalLogPrecision').selectOption('measured');
    await page.locator('#personalLogForm button[type="submit"]').click();
    await page.waitForFunction(() => window.lifeosReadOnlyWorkspace().personalLogs.filter(x => x.category === 'Reading').length === 1);
    await agenda(page);
    await page.waitForFunction(() => document.querySelector('#apPage2 .ap-v1-routines > summary')?.textContent.includes('routine records (4)'));
    if (!(await box.evaluate(element => element.open))) await summary.click();
    assert((await box.innerText()).includes('25m · 10 pages · measured'));
    assert((await box.innerText()).includes('Showing 3 of 4 saved today.'));
    assert.equal(await box.locator('.ap-v1-routine-record').count(), 3, 'Today remains compact when more records exist');
    await page.reload(); await page.waitForFunction(() => document.body.classList.contains('lo-ca-ready'));
    await agenda(page); if (!(await box.evaluate(element => element.open))) await summary.click();
    assert((await box.innerText()).includes('Reading'));
    assert.equal(await page.evaluate(() => window.lifeosReadOnlyWorkspace().personalLogs.filter(x => x.category === 'Reading').length), 1);
    assert(await page.evaluate(() => window.lifeosReadOnlyWorkspace().personalLogs.every(x => x.id !== 'archive-1')), 'The confirmed synthetic deletion persists after reload');
    await page.locator('#todayAPlus .ap-header button').click(); await capture(page, 'light');
    await box.locator('[data-ap-live-quick="routine-history"]').click();
    await history.waitFor({ state: 'visible' });
    await history.locator('[data-personal-page="more"]').click();
    const lightContrast = await page.evaluate(() => {
      const box = document.querySelector('.lo189-routine-history');
      const luminance = color => {
        const channels = color.match(/[\d.]+/g).slice(0, 3).map(Number).map(x => x / 255).map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4);
        return .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2];
      };
      const ratio = (a, b) => { a = luminance(a); b = luminance(b); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05); };
      const background = getComputedStyle(box).backgroundColor;
      const text = [...box.querySelectorAll(':scope > summary, #personalProgressSummary, #personalLogList .item strong, #personalLogList .sub')];
      const buttons = [...box.querySelectorAll('#personalLogList button')];
      return { text: text.map(el => ratio(getComputedStyle(el).color, background)), buttons: buttons.map(el => ratio(getComputedStyle(el).color, getComputedStyle(el).backgroundColor)) };
    });
    assert(lightContrast.text.length && lightContrast.buttons.length && [...lightContrast.text, ...lightContrast.buttons].every(value => value >= 4.5), 'Routine history text and buttons must be readable in light mode: ' + JSON.stringify(lightContrast));
    await captureHistory(page, 'light');
    await agenda(page); if (!(await box.evaluate(element => element.open))) await summary.click();
    for (const size of [{ width: 360, height: 650 }, { width: 393, height: 460 }, { width: 412, height: 780 }]) {
      await page.setViewportSize(size);
      await box.locator('[data-ap-live-quick="routine"]').scrollIntoViewIfNeeded();
      const bounds = await page.evaluate(() => ({ button: document.querySelector('#apPage2 [data-ap-live-quick="routine"]').getBoundingClientRect().toJSON(), nav: document.getElementById('lifeosNavigation').getBoundingClientRect().toJSON() }));
      assert(bounds.button.bottom <= bounds.nav.top + 1, 'Routine action must clear the browser navigation at ' + JSON.stringify(size));
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    }
    await page.clock.setFixedTime(new Date('2026-11-27T00:05:00+01:00'));
    await page.waitForFunction(() => document.querySelector('#apPage2 .ap-v1-routines > summary')?.textContent.includes('routine records (1)'));
    if (!(await box.evaluate(element => element.open))) await summary.click();
    const nextDay = await box.innerText(); assert(nextDay.includes('Prayer') && !nextDay.includes('Quran'));
    assert(nextDay.includes('Duration unavailable') && !nextDay.includes('Infinity'), 'Overflowing imported durations must remain unavailable');
    assert.deepEqual(errors, []); await context.close();
    ({ context, page, errors } = await setup(false));
    await agenda(page); const empty = page.locator('#apPage2 .ap-v1-routines');
    assert.equal(await empty.locator('summary').innerText(), 'Show routine records (0)');
    await empty.locator('summary').click(); assert((await empty.innerText()).includes('No routine records today'));
    assert.equal(await empty.locator('[data-ap-live-quick="routine-history"]').count(), 0);
    await empty.locator('[data-ap-live-quick="routine"]').click(); await page.locator('#personalLogForm').waitFor({ state: 'visible' });
    assert.deepEqual(errors, []); await context.close();
    console.log('PASS: Today routine records, existing logging and history, dates, examples, reload and mobile viewports');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
