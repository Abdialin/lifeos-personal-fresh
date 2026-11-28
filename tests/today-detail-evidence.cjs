'use strict';
// Offline synthetic records only: opening details must not alter the workspace.
const { chromium } = require('playwright');
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const root = process.cwd(), origin = 'https://lifeos-today-aplus-preview.onrender.com';
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 393, height: 780 }, isMobile: true, hasTouch: true, timezoneId: 'Europe/Stockholm' });
  const page = await context.newPage(), errors = [], dialogs = [];
  page.on('pageerror', e => errors.push(e.message)); page.on('dialog', d => { dialogs.push(d.type()); d.dismiss(); });
  await page.route('**/*', route => {
    const req = route.request(), url = new URL(req.url()), file = path.resolve(root, '.' + (url.pathname === '/' ? '/index.html' : url.pathname));
    if (url.origin === origin && req.method() === 'GET' && file.startsWith(root + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile()) return route.fulfill({ path: file });
    return route.fulfill({ status: 404, body: 'offline synthetic Today detail fixture' });
  });
  const fixed = new Date('2026-11-26T16:00:00+01:00');
  await page.clock.install({ time: fixed }); await page.clock.setFixedTime(fixed);
  await page.addInitScript(() => {
    const t = s => Date.parse('2026-11-26T' + s + '+01:00');
    const segment = (a, b) => ({ start: t(a), end: b ? t(b) : null });
    const sessions = [
      { id: 'main', name: 'Ongoing study', status: 'running', startAt: t('14:00:00'), createdAt: t('14:00:00'), endAt: null, segments: [segment('14:00:00', '14:10:00'), segment('14:20:00', '15:00:00'), segment('15:20:00', null)], notes: 'Outline research\nReview findings and references', precision: 'measured' },
      { id: 'pair', name: 'Review with colleague', status: 'finished', startAt: t('14:05:00'), createdAt: t('14:05:00'), endAt: t('14:28:00'), segments: [segment('14:05:00', '14:07:00'), segment('14:25:00', '14:28:00')], notes: 'Private note <img src=x><script>unsafe()</script>', precision: 'measured' },
      { id: 'short', name: 'Brief overlap', status: 'finished', startAt: t('14:08:00'), createdAt: t('14:08:00'), endAt: t('14:08:40'), segments: [segment('14:08:00', '14:08:40')], notes: '', precision: 'measured' },
      { id: 'split', name: 'Brief check-ins', status: 'finished', startAt: t('14:00:10'), createdAt: t('14:00:10'), endAt: t('14:20:40'), segments: [segment('14:00:10', '14:00:40'), segment('14:20:10', '14:20:40')], notes: '', precision: 'measured' }
    ];
    const plan = (id, name, start, end, status, extra = {}) => ({ id, name, startAt: t(start), endAt: t(end), status, sessionId: null, reminder: false, notes: '', ...extra });
    const schedule = [plan('plan', 'Scheduled activity', '17:00:00', '18:00:00', 'planned', { category: 'fitness', notes: 'Bring equipment\nReview plan' }),
      plan('parallel', 'Concurrent plan', '17:30:00', '18:30:00', 'planned'), plan('cancelled', 'Cancelled plan', '17:15:00', '17:45:00', 'cancelled')];
    localStorage.setItem('lifeos-live-v1', JSON.stringify({ version: 1, sessions, events: [], schedule, todos: [] }));
  });
  const close = async () => { await page.locator('#loCADialog [data-ca-close]').last().click(); await page.locator('#loCADialog').waitFor({ state: 'hidden' }); };
  const revealNotes = async expected => {
    const notes = page.locator('#caDialogBody .ca-today-notes'); assert.equal(await notes.count(), 1);
    await notes.locator('summary').focus(); await page.keyboard.press('Enter');
    assert.equal(await notes.locator('p').textContent(), expected);
    assert.equal(await notes.locator('p img, p script').count(), 0, 'Saved notes must be displayed as text');
  };
  const capture = async name => {
    if (!process.env.TODAY_DETAIL_CAPTURE) return;
    fs.mkdirSync('docs/design/today/current', { recursive: true });
    await page.screenshot({ path: 'docs/design/today/current/v1-detail-evidence-' + name + '.png' });
  };
  const assertContrast = async pairs => {
    const results = await page.evaluate(pairs => {
      const lum = value => value.match(/[\d.]+/g).slice(0, 3).map(Number).map(x => { x /= 255; return x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; }).reduce((sum, value, i) => sum + value * [.2126, .7152, .0722][i], 0);
      return pairs.map(([fg, bg, pseudo]) => {
        const a = lum(getComputedStyle(document.querySelector(fg), pseudo || null).color), b = lum(bg.startsWith('literal:') ? bg.slice(8) : getComputedStyle(document.querySelector(bg)).backgroundColor);
        return { fg, ratio: (Math.max(a, b) + .05) / (Math.min(a, b) + .05) };
      });
    }, pairs);
    assert(results.every(x => x.ratio >= 4.5), 'Text and controls require readable theme contrast: ' + JSON.stringify(results));
  };
  const assertSheetSizes = async (selectors, theme) => {
    for (const size of [{ width: 360, height: 650 }, { width: 393, height: 460 }, { width: 412, height: 780 }]) {
      await page.setViewportSize(size);
      await page.waitForFunction(height => { const r = document.querySelector('#loCADialog .ca-sheet')?.getBoundingClientRect(); return window.visualViewport?.height === height && r && r.top >= -1 && r.bottom <= height + 1; }, size.height);
      for (const selector of selectors) {
        const control = page.locator(selector); await control.scrollIntoViewIfNeeded(); await control.focus();
        const geometry = await control.evaluate(node => {
          const r = node.getBoundingClientRect(), sheet = node.closest('.ca-sheet').getBoundingClientRect();
          const hit = document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2);
          return { top: r.top, bottom: r.bottom, height: r.height, sheetTop: sheet.top, sheetBottom: sheet.bottom, focused: document.activeElement === node, hit: hit === node || node.contains(hit) };
        });
        assert(geometry.height >= 44 && geometry.top >= geometry.sheetTop - 1 && geometry.bottom <= geometry.sheetBottom + 1 && geometry.focused && geometry.hit, 'Sheet control is reachable at ' + JSON.stringify({ theme, size, selector, geometry }));
      }
    }
    await page.setViewportSize({ width: 393, height: 780 }); await page.waitForFunction(() => window.visualViewport?.height === 780);
    await page.locator('#loCADialog .ca-sheet').evaluate(node => { node.scrollTop = 0; });
  };
  try {
    await page.goto(origin + '/'); await page.waitForFunction(() => document.body.classList.contains('lo-ca-ready') && window.lifeosTodayAPlusSnapshot);
    const before = await page.evaluate(() => JSON.stringify(window.lifeosReadOnlyWorkspace()));
    await page.locator('#apPage0 [data-ap-detail="active"][data-ap-key="main"]').click();
    await revealNotes('Outline research\nReview findings and references');
    let overlap = page.locator('#caDialogBody [data-ca-today-id="pair"]');
    assert.equal(await overlap.count(), 1, 'Paused segments of one concurrent session appear once');
    assert((await overlap.innerText()).includes('5m'), 'Concurrent elapsed time must sum both separate intersections');
    assert((await page.locator('#caDialogBody [data-ca-today-id="split"]').innerText()).includes('1m'), 'The one-minute warning threshold uses the complete session intersection');
    assert.equal(await page.locator('#caDialogBody [data-ca-today-id="short"]').count(), 0, 'An overlap shorter than one minute is not warned about');
    await capture('active-dark');
    await overlap.click(); assert((await page.locator('#caDialogBody').innerText()).includes('Review with colleague'));
    await revealNotes('Private note <img src=x><script>unsafe()</script>');
    const row = label => page.locator('#caDialogBody .ca-record-detail').filter({ has: page.locator('span', { hasText: label }) }).locator('strong');
    assert.equal(await row('Interval duration').innerText(), '2m'); assert.equal(await row('Full duration').innerText(), '5m');
    assert((await page.locator('#caDialogBody [data-ca-today-id="main"]').innerText()).includes('5m'), 'Concurrent elapsed time covers all segments on the selected day');
    await close();
    await page.locator('#apPage0 [data-ap-detail="active"][data-ap-key="main"]').click();
    await page.locator('#caDialogBody [data-ca-today-record="main"]').click();
    await page.waitForFunction(() => document.body.dataset.lifeosView === 'tracking');
    assert((await page.locator('#caDialogBody').innerText()).includes('Ongoing study'));
    assert(await page.locator('#caDialogBody [data-ca-act="pause"][data-ca-id="main"]').isVisible(), 'The active detail leads to its own Track controls');
    await close(); await page.locator('#lifeosNavigation [data-view="dashboard"]').click();
    await page.locator('#apTab1').click(); await page.locator('#apPage1 [data-ap-live-period="2"]').click();
    await page.locator('svg [data-ap-detail="plan"][data-ap-key="plan"]').click();
    const detail = await page.locator('#caDialogBody').innerText();
    assert(detail.includes('Fitness'), 'The saved explicit category uses the shared classifier');
    assert(detail.includes('Concurrent plan') && !detail.includes('Cancelled plan'), 'Cancelled plans are not current conflicts');
    await revealNotes('Bring equipment\nReview plan');
    assert((await page.locator('#caDialogBody [data-ca-today-id="parallel"]').innerText()).includes('30m'));
    await assertContrast([['#loCADialog .ca-sheet-head h2', 'literal:rgb(26,48,70)'], ['#caDialogBody .ca-record-detail span', 'literal:rgb(26,48,70)'], ['#caDialogBody .ca-record-detail strong', 'literal:rgb(26,48,70)'], ['#caDialogBody .ca-today-notes p', 'literal:rgb(26,48,70)'], ['#caDialogBody .ca-sheet-primary', '#caDialogBody .ca-sheet-primary'], ['#caDialogBody .ca-sheet-secondary', '#caDialogBody .ca-sheet-secondary']]);
    await assertSheetSizes(['#loCADialog .ca-x', '#caDialogBody .ca-today-notes summary', '#caDialogBody [data-ca-today-id="parallel"]', '#caDialogBody [data-ca-today-nav="schedule"]'], 'dark details');
    await capture('plan-dark'); await close();
    await page.locator('#todayAPlus .ap-header button').click();
    await page.locator('#apTab0').click(); await page.locator('#apPage0 [data-ap-detail="active"][data-ap-key="main"]').click();
    await revealNotes('Outline research\nReview findings and references'); await capture('active-light'); await close();
    await page.locator('#apTab1').click(); await page.locator('#apPage1 [data-ap-live-period="2"]').click();
    await page.locator('svg [data-ap-detail="plan"][data-ap-key="plan"]').click();
    await revealNotes('Bring equipment\nReview plan');
    await assertContrast([['#loCADialog .ca-sheet-head h2', '#loCADialog .ca-sheet'], ['#caDialogBody .ca-record-detail span', '#loCADialog .ca-sheet'], ['#caDialogBody .ca-record-detail strong', '#loCADialog .ca-sheet'], ['#caDialogBody .ca-today-notes p', '#caDialogBody .ca-today-notes'], ['#caDialogBody .ca-sheet-primary', '#caDialogBody .ca-sheet-primary'], ['#caDialogBody .ca-sheet-secondary', '#caDialogBody .ca-sheet-secondary']]);
    await assertSheetSizes(['#loCADialog .ca-x', '#caDialogBody .ca-today-notes summary', '#caDialogBody [data-ca-today-id="parallel"]', '#caDialogBody [data-ca-today-nav="schedule"]'], 'light details');
    await capture('plan-light'); await close();
    await page.locator('svg [data-ap-detail="plan"][data-ap-key="parallel"]').click();
    await page.waitForFunction(() => [...document.querySelectorAll('#caDialogBody .ca-record-detail')].some(row => row.querySelector('span')?.textContent === 'Activity' && row.querySelector('strong')?.textContent === 'Concurrent plan'));
    const ambiguousDetail = await page.locator('#caDialogBody').innerText();
    assert(ambiguousDetail.includes('Concurrent plan') && ambiguousDetail.includes('Other / review'), 'An ambiguous planned name is not guessed: ' + ambiguousDetail);
    await page.setViewportSize({ width: 393, height: 460 });
    await page.waitForFunction(() => { const sheet = document.querySelector('#loCADialog .ca-sheet'), rect = sheet?.getBoundingClientRect(); return window.visualViewport?.height === 460 && rect && rect.top >= -1 && rect.bottom <= 461; });
    const sheet = await page.locator('#loCADialog .ca-sheet').boundingBox(); assert(sheet.y >= -1 && sheet.y + sheet.height <= 461, 'Details stay within a reduced browser viewport');
    await page.locator('#caDialogBody [data-ca-today-nav="schedule"]').click();
    await page.waitForFunction(() => document.body.dataset.lifeosView === 'schedule');
    await page.setViewportSize({ width: 393, height: 780 });
    await page.locator('#lifeosNavigation [data-view="dashboard"]').click(); await page.locator('#apTab1').click();
    await page.locator('#apPage1 [data-ap-live-period="2"]').click();
    for (const theme of ['light', 'dark']) {
      await page.locator('#apPage1 svg [data-ap-detail="gap"]').first().click();
      assert((await page.locator('#caDialogBody').innerText()).includes('Unlogged / unknown'));
      await page.locator('#loCADialog [data-ca-gap]').click();
      assert((await page.locator('#caGapContext').innerText()).includes('Before:'));
      assert((await page.locator('#caDialogBody').innerText()).includes('Existing activities cannot be overlapped'));
      assert((await page.locator('#caGapSummary').innerText()).includes('Remaining unlogged'));
      assert.equal(await page.locator('#caPastCategory').inputValue(), '', 'No category is assigned before an explicit choice');
      assert(await page.locator('#caPastStart').isEditable()); assert(await page.locator('#caPastEnd').isEditable());
      await page.locator('#loCADialog .ca-x').focus(); await page.keyboard.press('Shift+Tab');
      assert.equal(await page.evaluate(() => document.activeElement?.hasAttribute('data-ca-save-past')), true, 'Shift+Tab remains inside the gap sheet');
      await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => document.activeElement?.classList.contains('ca-x')), true, 'Tab wraps to the sheet close control');
      if (theme === 'light') await assertContrast([['#loCADialog .ca-sheet-head h2', '#loCADialog .ca-sheet'], ['#caGapContext', '#caGapContext'], ['#caDialogBody .ca-form-label', '#loCADialog .ca-sheet'], ['#caPastName', '#caPastName'], ['#caPastName', '#caPastName', '::placeholder'], ['#caPastCategory', '#caPastCategory'], ['#caGapSummary', '#loCADialog .ca-sheet'], ['#caDialogBody .ca-sheet-primary', '#caDialogBody .ca-sheet-primary']]);
      else await assertContrast([['#loCADialog .ca-sheet-head h2', 'literal:rgb(26,48,70)'], ['#caGapContext', '#caGapContext'], ['#caDialogBody .ca-form-label', 'literal:rgb(26,48,70)'], ['#caPastName', '#caPastName'], ['#caPastName', '#caPastName', '::placeholder'], ['#caPastCategory', '#caPastCategory'], ['#caGapSummary', 'literal:rgb(26,48,70)'], ['#caDialogBody .ca-sheet-primary', '#caDialogBody .ca-sheet-primary']]);
      await assertSheetSizes(['#caPastName', '#caPastStart', '#caPastEnd', '#caPastCategory', '#caPastNotes', '[data-ca-save-past]'], theme + ' gap');
      await capture('gap-' + theme);
      if (theme === 'light') {
        await page.locator('#caPastName').fill('Synthetic attempt'); await page.locator('#caPastEnd').fill(await page.locator('#caPastStart').inputValue());
        await page.locator('[data-ca-save-past]').click(); assert((await page.locator('#caPastError').innerText()).includes('valid past'));
        await assertContrast([['#caPastError', '#loCADialog .ca-sheet']]);
      }
      if (theme === 'dark') { await page.keyboard.press('Escape'); await page.locator('#loCADialog').waitFor({ state: 'hidden' }); }
      else await close();
      if (theme === 'light') await page.locator('#todayAPlus .ap-header button').click();
    }
    assert.equal(await page.evaluate(() => JSON.stringify(window.lifeosReadOnlyWorkspace())), before, 'Inspection must not change records or notes');
    await page.reload(); await page.waitForFunction(() => window.lifeosReadOnlyWorkspace);
    assert.equal(await page.evaluate(() => JSON.stringify(window.lifeosReadOnlyWorkspace())), before, 'Reload preserves all source intervals and plans');
    // A separate, deliberate synthetic partial save checks the light-theme
    // confirmation and remaining-gap workflow after the read-only checks.
    await page.locator('#todayAPlus .ap-header button').click(); await page.locator('#apTab1').click();
    await page.locator('#apPage1 [data-ap-live-period="2"]').click();
    const beforeMetrics = await page.evaluate(() => window.lifeosTodayAPlusSnapshot().metrics);
    await page.locator('#apPage1 svg [data-ap-detail="gap"]').first().click(); await page.locator('#loCADialog [data-ca-gap]').click();
    await page.locator('#caPastName').fill('Synthetic partial entry');
    await page.locator('#caPastCategory').selectOption({ label: 'Fitness' });
    const startMs = await page.locator('#caPastStart').evaluate(el => new Date(el.value).getTime());
    const endLocal = await page.evaluate(ms => { const d = new Date(ms); return new Date(ms - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }, startMs + 30 * 60000);
    await page.locator('#caPastEnd').fill(endLocal);
    const checkpoint = await page.evaluate(() => localStorage.getItem('lifeos-v4-stage21-atomic'));
    await page.evaluate(() => { window.__todayOriginalSetItem = Storage.prototype.setItem; Storage.prototype.setItem = function(key, value) { if (key === 'lifeos-v4-stage21-atomic') throw new Error('synthetic checkpoint failure'); return window.__todayOriginalSetItem.call(this, key, value); }; });
    await page.locator('[data-ca-save-past]').click(); assert((await page.locator('#caPastError').innerText()).includes('not saved'));
    assert.equal(await page.evaluate(() => JSON.stringify(window.lifeosReadOnlyWorkspace())), before, 'A failed classified save preserves all prior records');
    assert.equal(await page.evaluate(() => localStorage.getItem('lifeos-v4-stage21-atomic')), checkpoint, 'A failed save must not replace the recovery checkpoint');
    assert.equal(await page.locator('#caPastCategory').inputValue(), 'Fitness', 'A failed save keeps the user’s selection for retry');
    await page.evaluate(() => { Storage.prototype.setItem = window.__todayOriginalSetItem; delete window.__todayOriginalSetItem; });
    await page.locator('[data-ca-save-past]').click();
    await page.getByText('Activity saved', { exact: true }).waitFor({ state: 'visible' });
    assert.equal(await page.locator('[data-ca-save-past]').count(), 0, 'A completed save cannot be submitted twice');
    assert((await page.locator('#caDialogBody').innerText()).includes('Remaining unlogged'));
    await assertContrast([['#caDialogBody .ca-past-success strong', '#caDialogBody .ca-past-success'], ['#caDialogBody .ca-past-success p', '#caDialogBody .ca-past-success'], ['#caDialogBody .ca-sheet-primary', '#caDialogBody .ca-sheet-primary']]);
    await capture('success-light');
    const saved = await page.evaluate(() => window.lifeosReadOnlyWorkspace()), prior = JSON.parse(before);
    assert.equal(saved.sessions.filter(s => s.name === 'Synthetic partial entry').length, 1);
    assert.equal(saved.sessions.find(s => s.name === 'Synthetic partial entry').activityDetailsV252.category, 'Fitness');
    assert.equal(await page.evaluate(() => window.lifeosTodayAPlusSnapshot().recorded.find(s => s.name === 'Synthetic partial entry').category), 'Fitness');
    assert.deepEqual(saved.sessions.filter(s => s.name !== 'Synthetic partial entry'), prior.sessions, 'Existing sessions and raw segments remain unchanged');
    const afterMetrics = await page.evaluate(() => window.lifeosTodayAPlusSnapshot().metrics);
    assert.equal(afterMetrics.unique - beforeMetrics.unique, 30 * 60000); assert.equal(beforeMetrics.unlogged - afterMetrics.unlogged, 30 * 60000);
    await page.locator('#loCADialog [data-ca-gap]').click();
    assert.equal(await page.locator('#caPastCategory').inputValue(), '', 'A remaining gap starts without inheriting a previous category');
    await page.locator('#caPastName').fill('Gym'); await page.locator('#caPastCategory').selectOption({ label: 'Other / review' });
    const nextStart = await page.locator('#caPastStart').evaluate(el => new Date(el.value).getTime());
    const nextEnd = await page.evaluate(ms => { const d = new Date(ms); return new Date(ms - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }, nextStart + 10 * 60000);
    await page.locator('#caPastEnd').fill(nextEnd); await page.locator('[data-ca-save-past]').click();
    await page.getByText('Activity saved', { exact: true }).waitFor({ state: 'visible' });
    const second = await page.evaluate(() => window.lifeosReadOnlyWorkspace().sessions.find(s => s.name === 'Gym'));
    assert.equal(second.activityDetailsV252.category, 'Other / review');
    assert.equal(await page.evaluate(() => window.lifeosTodayAPlusSnapshot().recorded.find(s => s.name === 'Gym').category), 'Other / review', 'An explicit review choice overrides a recognized activity name');
    const afterSecond = await page.evaluate(() => window.lifeosTodayAPlusSnapshot().metrics);
    assert.equal(afterSecond.unique - beforeMetrics.unique, 40 * 60000); assert.equal(beforeMetrics.unlogged - afterSecond.unlogged, 40 * 60000);
    assert.deepEqual((await page.evaluate(() => window.lifeosReadOnlyWorkspace().sessions)).filter(s => !['Synthetic partial entry', 'Gym'].includes(s.name)), prior.sessions);
    await page.locator('[data-ca-view-past]').click(); await page.waitForFunction(() => document.body.dataset.lifeosView === 'tracking');
    const day = page.locator('#caHistory details[data-ca-day="2026-11-26"]'); await day.waitFor({ state: 'attached' });
    if (!(await day.evaluate(node => node.open))) await day.locator('summary').click();
    await day.locator('[data-ca-sheet="record"]').filter({ hasText: 'Synthetic partial entry' }).click();
    assert((await page.locator('#caDialogBody').innerText()).includes('Fitness'), 'The explicit category reaches Track History'); await close();
    await page.reload(); await page.waitForFunction(() => window.lifeosReadOnlyWorkspace?.().sessions.some(s => s.name === 'Synthetic partial entry'));
    assert.equal(await page.evaluate(() => window.lifeosReadOnlyWorkspace().sessions.filter(s => s.name === 'Synthetic partial entry').length), 1, 'The partial save persists exactly once');
    assert.equal(await page.evaluate(() => window.lifeosActivityClassification(window.lifeosReadOnlyWorkspace().sessions.find(s => s.name === 'Synthetic partial entry')).group), 'Fitness', 'The explicit category persists on reload');
    assert.equal(await page.evaluate(() => window.lifeosActivityClassification(window.lifeosReadOnlyWorkspace().sessions.find(s => s.name === 'Gym')).group), 'Other / review', 'The explicit review choice persists on reload');
    assert.deepEqual(errors, []); assert.deepEqual(dialogs, []);
    console.log('PASS: Today details, grouped overlaps and light-theme partial gap save preserve existing records');
  } finally { await context.close(); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
