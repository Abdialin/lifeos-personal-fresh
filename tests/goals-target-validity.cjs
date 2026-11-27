'use strict';
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = process.cwd(), origin = 'https://lifeos-today-aplus-preview.onrender.com';
const serve = route => {
  const request = route.request(), url = new URL(request.url());
  const file = path.resolve(root, '.' + (url.pathname === '/' ? '/index.html' : url.pathname));
  if (url.origin === origin && request.method() === 'GET' && file.startsWith(root + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile()) return route.fulfill({ path: file });
  return route.fulfill({ status: 404, body: 'isolated synthetic goal fixture' });
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
    if (localStorage.getItem('lifeos-goal-target-fixture')) return;
    const labels = ['Missing', 'Empty', 'Zero', 'Negative', 'Invalid', 'Regular', 'Decimal', 'Exceeded'];
    const targets = [undefined, '  ', 0, -2, 'Infinity', 2, '2.5', 0.5];
    const goals = labels.map((name, index) => ({ id: 'goal-' + index, name: name + ' goal', category: 'sessions', match: name + ' activity', unit: 'hours', target: targets[index] }));
    const session = (name, start, id) => {
      const from = Date.parse(start), end = from + 3600000;
      return { id, name: name + ' activity', status: 'finished', startAt: from, endAt: end, createdAt: from, segments: [{ start: from, end }], precision: 'measured' };
    };
    const sessions = labels.flatMap((name, index) => [session(name, '2026-11-24T09:00:00+01:00', 'this-' + index), session(name, '2026-11-17T09:00:00+01:00', 'last-' + index)]);
    sessions.push(session('Regular', '2026-11-24T09:30:00+01:00', 'this-overlap'));
    localStorage.setItem('lifeos-live-v1', JSON.stringify({ version: 1, sessions, events: [], schedule: [], todos: [], goals, personalLogs: [] }));
    localStorage.setItem('lifeos-goal-target-fixture', '1');
  });
  const card = name => page.locator('#gv161-app .gv161-card').filter({ has: page.getByRole('heading', { name: name + ' goal', exact: true }) });
  try {
    await page.goto(origin + '/');
    await page.waitForFunction(() => window.lifeosReadOnlyWorkspace && document.querySelector('#lifeosNavigation [data-view="goals"]'));
    const before = await page.evaluate(() => JSON.stringify(window.lifeosReadOnlyWorkspace()));
    await page.locator('#lifeosNavigation [data-view="goals"]').click();
    await card('Missing').waitFor({ state: 'visible' });
    await page.locator('#lo253-activity-analytics').waitFor({ state: 'attached' });
    assert(await page.locator('#lo253-activity-analytics').isHidden(), 'My Life analytics must not leak into Goals');
    for (const name of ['Missing', 'Empty', 'Zero', 'Negative', 'Invalid']) {
      const goal = card(name), ring = goal.locator('.gv161-ring');
      assert.equal(await ring.innerText(), '—', name + ' must not invent a completion percentage');
      assert.equal(await ring.getAttribute('aria-label'), 'Target not set');
      assert((await goal.locator('.gv161-metrics').innerText()).includes('1 / —'), 'Recorded time stays visible with an unavailable target');
      assert.equal(await goal.locator('.gv161-target-unset').innerText(), 'Target not set');
      assert.equal(await goal.locator('.gv161-bar i').count(), 0, 'An unset target must not show a calculated bar');
    }
    assert.equal(await card('Regular').locator('.gv161-ring').innerText(), '75%', 'Overlapping timers use unique elapsed time for progress');
    assert.equal(await card('Decimal').locator('.gv161-ring').innerText(), '40%');
    assert.equal(await card('Exceeded').locator('.gv161-ring').innerText(), '200%', 'An exceeded target reports the actual ratio');
    assert.equal(await card('Exceeded').locator('.gv161-ring').evaluate(el => el.style.getPropertyValue('--progress')), '100', 'The ring geometry remains bounded');
    assert((await page.locator('#gv161-overview .gv165-kpis').innerText()).includes('Targets reached'));
    const firstRow = await card('Missing').boundingBox(), secondRow = await card('Empty').boundingBox();
    assert(secondRow.y >= firstRow.y + firstRow.height - 1 && Math.abs(firstRow.x - secondRow.x) < 1, 'Mobile goal cards use full-width rows');
    const detail = card('Missing').locator('[data-v161-detail]');
    assert((await detail.boundingBox()).height >= 44, 'The detail action needs a usable touch target');
    assert.equal(await detail.getAttribute('aria-label'), 'Show details for Missing goal');
    await detail.click();
    assert.equal(await card('Missing').locator('[data-v161-detail]').getAttribute('aria-label'), 'Hide details for Missing goal');
    assert.equal(await card('Missing').locator('.gv168-days').count(), 1, 'The existing evidence detail remains available');
    await card('Missing').locator('[data-v161-detail]').click();
    await card('Regular').locator('[data-v161-detail]').click();
    const regularDetail = await card('Regular').locator('.gv161-expand').innerText();
    assert(regularDetail.includes('Average duration') && regularDetail.includes('60 min'), 'Per-record averages retain raw durations');
    assert(regularDetail.includes('overlap unknown'), 'Untimed manual evidence limits are disclosed');
    await card('Regular').locator('[data-v161-detail]').click();
    if (process.env.GOALS_TARGET_CAPTURE === '1') {
      fs.mkdirSync('docs/design/goals/current', { recursive: true });
      await card('Missing').scrollIntoViewIfNeeded();
      await page.screenshot({ path: 'docs/design/goals/current/release-target-validity-dark.png' });
    }
    await page.locator('#gv161-app nav [data-v161-tab="improve"]').click();
    assert.equal(await page.locator('#gv161-improve .gv161-target-unset').count(), 10);
    await page.locator('#gv161-app nav [data-v161-tab="history"]').click();
    await page.locator('#gv161-select').selectOption('goal-0');
    assert((await page.locator('#gv161-history .gv161-chart').innerText()).includes('no target set'));
    assert((await page.locator('#gv161-history .gv162-reviewcard').first().innerText()).includes('/ —'));
    await page.locator('#gv161-select').selectOption('goal-5');
    assert((await page.locator('#gv161-history .gv161-chart').innerText()).includes('target 2 hours/week'));
    await page.locator('#gv161-app nav [data-v161-tab="overview"]').click();
    await page.locator('.lifeos-theme-toggle').click();
    assert.equal(await card('Missing').locator('.gv161-ring').innerText(), '—');
    const light = await card('Missing').evaluate(el => {
      const lum = css => css.match(/[\d.]+/g).slice(0, 3).map(Number).map(x => x / 255).map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4).reduce((sum, x, i) => sum + x * [0.2126, 0.7152, 0.0722][i], 0);
      const ratio = (a, b) => { a = lum(a); b = lum(b); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05); };
      const background = getComputedStyle(el).backgroundColor;
      return { background, contrast: [...el.querySelectorAll('.gv161-top h3,.gv161-top small,.gv161-metrics b,.gv161-metrics small,.gv161-target-unset,.gv161-foot span,.gv161-foot button')].map(node => ratio(getComputedStyle(node).color, background)) };
    });
    assert.equal(light.background, 'rgb(255, 255, 255)', 'Overview cards follow the light theme');
    assert(light.contrast.length >= 7 && light.contrast.every(value => value >= 4.5), 'Overview text and actions need readable light-mode contrast: ' + JSON.stringify(light));
    const accents = await card('Missing').evaluate(el => {
      const lum = css => css.match(/[\d.]+/g).slice(0, 3).map(Number).map(x => x / 255).map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4).reduce((sum, x, i) => sum + x * [0.2126, 0.7152, 0.0722][i], 0);
      const ratio = (a, b) => { a = lum(a); b = lum(b); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05); };
      const variants = ['gv161-gym', 'gv161-personal', 'gv161-nutrition'];
      return variants.map(variant => {
        el.classList.add(variant);
        const result = ['.gv161-top small', '.gv161-foot button'].map(selector => ratio(getComputedStyle(el.querySelector(selector)).color, getComputedStyle(el).backgroundColor));
        el.classList.remove(variant); return result;
      });
    });
    assert(accents.flat().every(value => value >= 4.5), 'Goal category accents need readable light-mode contrast: ' + JSON.stringify(accents));
    for (const tab of ['improve', 'history']) {
      await page.locator('#gv161-app nav [data-v161-tab="' + tab + '"]').click();
      const contrast = await page.locator('#gv161-' + tab).evaluate(el => {
        const lum = css => css.match(/[\d.]+/g).slice(0, 3).map(Number).map(x => x / 255).map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4).reduce((sum, x, i) => sum + x * [0.2126, 0.7152, 0.0722][i], 0);
        const ratio = (a, b) => { a = lum(a); b = lum(b); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05); };
        const background = 'rgb(241, 245, 249)';
        const heading = [...el.querySelectorAll('.gv165-title h2,.gv165-title p,.gv165-title small')].map(node => ratio(getComputedStyle(node).color, background));
        const card = el.querySelector('.gv162-reviewcard');
        const backgroundColor = getComputedStyle(card).backgroundColor;
        const cardText = [...card.querySelectorAll('.gv162-reviewhead b,.gv162-reviewhead span,.gv162-compare small,.gv162-compare strong,.gv162-reviewbottom span,.gv162-reviewbottom button')].map(node => ratio(getComputedStyle(node).color, backgroundColor));
        return { heading, backgroundColor, cardText };
      });
      assert(contrast.heading.length === 3 && contrast.heading.every(value => value >= 4.5) && contrast.backgroundColor === 'rgb(255, 255, 255)' && contrast.cardText.length >= 7 && contrast.cardText.every(value => value >= 4.5), tab + ' must retain legible light-mode headings and cards: ' + JSON.stringify(contrast));
      const reviewCards = page.locator('#gv161-' + tab + ' .gv162-reviewcard');
      const rows = await page.locator('#gv161-' + tab).evaluate(el => [...el.querySelectorAll('.gv162-reviewcard')].slice(0, 2).map(node => node.getBoundingClientRect().toJSON()));
      assert(rows[1].y >= rows[0].y + rows[0].height - 1 && Math.abs(rows[0].x - rows[1].x) < 1, tab + ' cards need full-width readable phone rows');
      assert((await reviewCards.first().locator('button').boundingBox()).height >= 44, tab + ' details need a usable touch target');
    }
    await page.locator('#gv161-app nav [data-v161-tab="overview"]').click();
    if (process.env.GOALS_TARGET_CAPTURE === '1') {
      await card('Missing').scrollIntoViewIfNeeded();
      await page.screenshot({ path: 'docs/design/goals/current/release-target-validity-light.png' });
    }
    for (const size of [{ width: 360, height: 650 }, { width: 393, height: 460 }, { width: 412, height: 780 }]) {
      await page.setViewportSize(size);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No horizontal overflow at ' + JSON.stringify(size));
      const layout = await card('Missing').evaluate(el => {
        const box = n => el.querySelector(n).getBoundingClientRect().toJSON();
        return { card: el.getBoundingClientRect().toJSON(), metrics: box('.gv161-metrics'), actions: box('.gv161-foot') };
      });
      assert(layout.metrics.right <= layout.actions.left + 1 && layout.actions.right <= layout.card.right + 1, 'Recorded values and details must remain distinct and inside the card at ' + JSON.stringify(size));
      for (const tab of ['improve', 'history']) {
        await page.locator('#gv161-app nav [data-v161-tab="' + tab + '"]').click();
        const cards = page.locator('#gv161-' + tab + ' .gv162-reviewcard');
        const rows = await page.locator('#gv161-' + tab).evaluate(el => [...el.querySelectorAll('.gv162-reviewcard')].slice(0, 2).map(node => node.getBoundingClientRect().toJSON()));
        assert(rows[1].y >= rows[0].y + rows[0].height - 1 && Math.abs(rows[0].x - rows[1].x) < 1, tab + ' stays in readable rows at ' + JSON.stringify(size));
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), tab + ' must not overflow at ' + JSON.stringify(size));
        await cards.last().locator('button').click({ timeout: 7000 });
        assert.equal(await page.locator('#gv161-app nav [data-v161-tab="overview"]').getAttribute('aria-selected'), 'true', tab + ' details remain usable above bottom navigation at ' + JSON.stringify(size));
      }
      await page.locator('#gv161-app nav [data-v161-tab="overview"]').click();
    }
    assert.equal(await page.evaluate(() => JSON.stringify(window.lifeosReadOnlyWorkspace())), before, 'Reading targets must not change saved records');
    await page.reload(); await page.waitForFunction(() => window.lifeosReadOnlyWorkspace);
    assert.equal(await page.evaluate(() => JSON.stringify(window.lifeosReadOnlyWorkspace())), before, 'Records survive reload unchanged');
    const empty = await browser.newContext({ viewport: { width: 360, height: 650 }, isMobile: true, hasTouch: true });
    try {
      const p = await empty.newPage(); await p.route('**/*', serve);
      await p.goto(origin + '/'); await p.waitForFunction(() => window.lifeosReadOnlyWorkspace);
      await p.locator('#lifeosNavigation [data-view="goals"]').click();
      await p.locator('#gv161-overview .gv165-empty').waitFor({ state: 'visible' });
      await p.locator('.lifeos-theme-toggle').click();
      assert((await p.locator('#gv161-overview .gv165-empty').innerText()).includes('No goals yet'));
      assert.equal(await p.evaluate(() => (window.lifeosReadOnlyWorkspace().goals || []).length), 0);
    } finally { await empty.close(); }
    {
      const visual = await browser.newContext({ viewport: { width: 393, height: 780 }, isMobile: true, hasTouch: true, timezoneId: 'Europe/Stockholm' });
      try {
        const p = await visual.newPage(); await p.route('**/*', serve);
        await p.clock.install({ time: fixed }); await p.clock.setFixedTime(fixed);
        await p.addInitScript(() => {
          const make = (id, name, start, end) => ({ id, name, status: 'finished', startAt: Date.parse(start), endAt: Date.parse(end), createdAt: Date.parse(start), segments: [{ start: Date.parse(start), end: Date.parse(end) }], precision: 'measured' });
          const sessions = [
            make('gym', 'Gym workout', '2026-11-26T07:00:00+01:00', '2026-11-26T08:00:00+01:00'),
            make('gym-last-week', 'Gym workout', '2026-11-19T07:00:00+01:00', '2026-11-19T08:00:00+01:00'),
            make('study', 'University study', '2026-11-26T09:00:00+01:00', '2026-11-26T10:30:00+01:00'),
            make('prayer', 'Prayer', '2026-11-26T12:00:00+01:00', '2026-11-26T12:15:00+01:00'),
            make('reading', 'Quran reading', '2026-11-26T13:00:00+01:00', '2026-11-26T13:30:00+01:00')
          ];
          const goals = [
            { id: 'gym', name: 'Fitness', category: 'fitness', unit: 'sessions', target: 3 },
            { id: 'study', name: 'Study', category: 'sessions', match: 'University study', unit: 'hours', target: 8 },
            { id: 'prayer', name: 'Prayer', category: 'sessions', match: 'Prayer', unit: 'sessions', target: 7 },
            { id: 'reading', name: 'Quran reading', category: 'sessions', match: 'Quran reading', unit: 'hours', target: 3 }
          ];
          localStorage.setItem('lifeos-live-v1', JSON.stringify({ version: 1, sessions, events: [], schedule: [], todos: [], goals, personalLogs: [] }));
        });
        await p.goto(origin + '/'); await p.waitForFunction(() => window.lifeosReadOnlyWorkspace);
        const visualBefore = await p.evaluate(() => JSON.stringify(window.lifeosReadOnlyWorkspace()));
        await p.locator('#lifeosNavigation [data-view="goals"]').click();
        await p.locator('#gv161-overview .gv161-card').first().waitFor({ state: 'visible' });
        for (const theme of ['dark', 'light']) {
          if (theme === 'light') await p.locator('.lifeos-theme-toggle').click();
          for (const tab of ['overview', 'improve', 'history']) {
            await p.locator('#gv161-app nav [data-v161-tab="' + tab + '"]').click();
            await p.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
            if (process.env.GOALS_TARGET_CAPTURE === '1') {
              await p.waitForTimeout(200);
              await p.screenshot({ path: 'docs/design/goals/current/release-' + tab + '-v1-' + theme + '.png' });
              await p.screenshot({ path: 'docs/design/goals/current/release-' + tab + '-v1-' + theme + '-full.png', fullPage: true });
            }
            if (tab === 'history' && theme === 'light') {
              assert.equal(await p.locator('#gv161-history .gv161-chart').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(255, 255, 255)');
              await p.locator('#gv161-select').selectOption('study');
              await p.locator('#gv161-history .gv168-emptystate').waitFor({ state: 'visible' });
              assert.equal(await p.locator('#gv161-history .gv168-emptystate').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(237, 246, 242)', 'Empty history follows the light palette');
              await p.locator('#gv161-select').selectOption('gym');
            }
          }
        }
        await p.locator('#gv161-app nav [data-v161-tab="improve"]').click();
        await p.locator('#gv161-improve .gv162-reviewcard').first().locator('button').click();
        assert.equal(await p.locator('#gv161-app nav [data-v161-tab="overview"]').getAttribute('aria-selected'), 'true', 'Explore opens the selected goal');
        assert.equal(await p.locator('#gv161-overview .gv161-expand').count(), 1);
        assert.equal(await p.evaluate(() => JSON.stringify(window.lifeosReadOnlyWorkspace())), visualBefore, 'Viewing Goals changes no records');
        await p.locator('#lifeosNavigation [data-view="analytics"]').click();
        await p.locator('#lo184-detail-toggle').click();
        const insight = p.locator('#lo257-insights .lo257-mix-row').first();
        await insight.waitFor({ state: 'visible' }); await insight.click();
        await p.waitForFunction(() => document.body.dataset.lifeosView === 'life');
        await p.locator('#lo253-activity-analytics').waitFor({ state: 'visible' });
        assert(await p.locator('#lo253-category').isVisible(), 'Insights still opens its My Life activity details');
      } finally { await visual.close(); }
    }
    assert.deepEqual(errors, []);
    console.log('PASS: Goals do not invent completion for missing or invalid targets');
  } finally { await context.close(); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
