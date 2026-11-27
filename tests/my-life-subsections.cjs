'use strict';
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = process.cwd(), origin = 'https://lifeos-today-aplus-preview.onrender.com';
const serve = route => {
  const request = route.request(), url = new URL(request.url());
  const file = path.resolve(root, '.' + (url.pathname === '/' ? '/index.html' : url.pathname));
  if (url.origin === origin && request.method() === 'GET' && file.startsWith(root + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile()) return route.fulfill({ path: file });
  return route.fulfill({ status: 404, body: 'isolated synthetic My Life fixture' });
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
    localStorage.setItem('lifeos-live-v1', JSON.stringify({ version: 1, sessions: [], events: [], schedule: [], todos: [], goals: [],
      workouts: [{ id: 'w1', date: '2026-11-25', type: 'Strength training', minutes: 60 }],
      meals: [{ id: 'm1', date: '2026-11-26', name: 'Lunch', calories: 650 }],
      personalLogs: [{ id: 'r1', date: '2026-11-26', category: 'Quran', minutes: 20, precision: 'measured' }],
      habitDefinitions: [{ id: 'h1', title: 'Reading', startDate: '2026-11-23', everyDays: 1 }], habitChecks: [] }));
  });
  const capture = async name => {
    if (!process.env.MY_LIFE_CAPTURE) return;
    const dir = 'docs/design/my-life/current'; fs.mkdirSync(dir, { recursive: true });
    await page.waitForTimeout(500);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForTimeout(120);
    await page.screenshot({ path: path.join(dir, 'v1-subsection-' + name + '.png') });
  };
  const contrast = async (selector, parent, expected) => {
    const result = await page.waitForFunction(({ selector, parent, expected }) => {
      const nodes = [...document.querySelectorAll(selector)].filter(el => el.isConnected && el.getClientRects().length);
      if (nodes.length !== expected) return false;
      const lum = css => { const raw = css.match(/[\d.]+/g); if (!raw || raw.length < 3) return NaN; const c = raw.slice(0, 3).map(Number).map(x => x / 255).map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
      const ratios = nodes.map(el => { const background = el.closest(parent); if (!background) return NaN; const a = lum(getComputedStyle(el).color), b = lum(getComputedStyle(background).backgroundColor); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05); });
      return ratios.every(Number.isFinite) ? ratios : false;
    }, { selector, parent, expected });
    return result.jsonValue();
  };
  try {
    await page.goto(origin + '/'); await page.waitForFunction(() => document.body.classList.contains('lo-ca-ready'));
    const before = await page.evaluate(() => JSON.stringify(window.lifeosReadOnlyWorkspace()));
    await page.locator('#lifeosNavigation [data-view="life"]').click();
    await page.waitForFunction(() => document.body.dataset.lifeosView === 'life');
    for (const theme of ['dark', 'light']) {
      if (theme === 'light') await page.evaluate(() => document.querySelector('.lifeos-theme-toggle').click());
      for (const [section, target] of [['overview', '#loLifeVisual'], ['routines', '#personalActivityPanel'],
        ['fitness', '#lifeosFitnessDashboard'], ['nutrition', '#lifeosNutritionDashboard'], ['friends', '#lo32FriendHub']]) {
        await page.locator('#loLifeSectionTabs [data-lo-life-section="' + section + '"]').click();
        await page.waitForFunction(name => document.body.dataset.loLifeSection === name, section);
        await page.locator(target).waitFor({ state: 'visible' });
        if (section !== 'overview') assert(!(await page.locator('#lo182-life-hub').isVisible()), 'General progress panel must not repeat on ' + section);
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No horizontal page overflow in ' + section);
        if (section === 'routines') {
          await page.locator('#lo170-notes').waitFor({ state: 'attached' });
          assert(await page.evaluate(() => {
            const form = document.getElementById('personalLogForm'), notes = document.getElementById('lo170-notes'), groups = document.getElementById('lo170-groups');
            return !!(form.compareDocumentPosition(notes) & Node.DOCUMENT_POSITION_FOLLOWING) && !!(form.compareDocumentPosition(groups) & Node.DOCUMENT_POSITION_FOLLOWING);
          }), 'Keep notes and community tools after the routine controls');
        }
        if (section === 'friends') {
          try { await page.locator('#lo197-challenges').waitFor({ state: 'visible', timeout: 5000 }); }
          catch (_) { throw Error('Friends panel hidden: ' + JSON.stringify(await page.evaluate(() => { const items=[];for(let n=document.getElementById('lo197-challenges');n;n=n.parentElement)items.push({tag:n.tagName,id:n.id,classes:n.className,hidden:n.hidden,display:getComputedStyle(n).display});return items; }))); }
          assert.equal(await page.locator('#lo197-challenges').evaluate(el => el.parentElement.id), 'lo32FriendHub');
          await page.locator('#lo197-challenges .lo197-actions').getByRole('button', { name: 'Create challenge' }).click();
          assert(await page.locator('#lo197-form').isVisible(), 'Challenge editor remains accessible');
          if (theme === 'dark') {
            await page.locator('#lo197-form [name="title"]').fill('Synthetic reading challenge');
            await page.locator('#lo197-form [name="match"]').fill('Reading');
            await page.locator('#lo197-form button[type="submit"]').click();
            await page.locator('#lo197-challenges .lo197-card').getByText('Synthetic reading challenge').waitFor({ state: 'visible' });
          }
          const legacy = page.locator('#lo32FriendHub > .lo197-legacy');
          if (!(await legacy.evaluate(el => el.open))) await legacy.locator(':scope > summary').click();
          await page.locator('#lo90-friends').waitFor({ state: 'visible' });
        }
        if (theme === 'light' && ['fitness', 'nutrition'].includes(section)) {
          const toolbar = page.locator('.lo190-toolbar[data-section="' + section + '"]');
          await toolbar.waitFor({ state: 'visible' });
          const prefix = '.lo190-toolbar[data-section="' + section + '"] .lo190-heading ';
          const ratios = await contrast(prefix + 'strong,' + prefix + 'span', '.panel', 2);
          assert.equal(ratios.length, 2); assert(ratios.every(ratio => ratio >= 4.5), section + ' heading contrast: ' + ratios);
          if (section === 'nutrition') {
            const statRatios = await contrast('#lifeosNutritionDashboard .lo25-stat:first-child small,#lifeosNutritionDashboard .lo25-stat:first-child strong', '.lo25-stat', 2);
            assert(statRatios.length && statRatios.every(ratio => ratio >= 4.5), 'Nutrition metric contrast: ' + statRatios);
          }
        }
        if (section === 'fitness' || section === 'nutrition' || section === 'overview') await capture(section + '-' + theme);
      }
    }
    for (const size of [{ width: 360, height: 650 }, { width: 393, height: 460 }, { width: 412, height: 780 }]) {
      await page.setViewportSize(size);
      for (const section of ['routines', 'fitness', 'nutrition', 'friends']) {
        await page.locator('#loLifeSectionTabs [data-lo-life-section="' + section + '"]').click();
        await page.waitForFunction(name => document.body.dataset.loLifeSection === name, section);
        assert(!(await page.locator('#lo182-life-hub').isVisible()));
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      }
    }
    await page.locator('#lifeosNavigation [data-view="schedule"]').click();
    assert(!(await page.locator('#lo182-life-hub').isVisible()));
    assert.equal(await page.evaluate(() => JSON.stringify(window.lifeosReadOnlyWorkspace())), before, 'Navigation must not alter saved records');
    await page.reload(); await page.waitForFunction(() => document.body.classList.contains('lo-ca-ready'));
    await page.locator('#lifeosNavigation [data-view="life"]').click();
    await page.locator('#loLifeSectionTabs [data-lo-life-section="friends"]').click();
    await page.locator('#lo197-challenges .lo197-card').getByText('Synthetic reading challenge').waitFor({ state: 'visible' });
    assert.deepEqual(errors, []);
    console.log('PASS: My Life subsection navigation, overview scope, themes, records and mobile viewports');
  } finally { await context.close(); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
