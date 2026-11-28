'use strict';
// Synthetic offline workspaces only. Missing targets must never be persisted as
// illustrative numbers; already saved settings must never be silently changed.
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = process.cwd(), origin = 'https://lifeos-today-aplus-preview.onrender.com';
const serve = route => {
  const request = route.request(), url = new URL(request.url());
  const file = path.resolve(root, '.' + (url.pathname === '/' ? '/index.html' : url.pathname));
  if (url.origin === origin && request.method() === 'GET' && file.startsWith(root + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile()) return route.fulfill({ path: file });
  return route.fulfill({ status: 404, body: 'offline synthetic nutrition fixture' });
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  async function setup(settings, withMeal = false) {
    const context = await browser.newContext({ viewport: { width: 393, height: 780 }, isMobile: true, hasTouch: true });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message)); await page.route('**/*', serve);
    if (settings) await page.addInitScript(({ value, withMeal }) => {
      const day = new Date().toLocaleDateString('sv-SE');
      const meals = withMeal ? [{ id: 'synthetic-meal', date: day, name: 'Synthetic meal', calories: 1000 }] : [];
      if (!localStorage.getItem('lifeos-live-v1')) localStorage.setItem('lifeos-live-v1', JSON.stringify({ version: 1, sessions: [], events: [], schedule: [], todos: [], meals, nutritionSettings: value }));
    }, { value: settings, withMeal });
    await page.goto(origin + '/'); await page.waitForFunction(() => document.body.classList.contains('lo-ca-ready') && window.lifeosNutritionV25);
    return { context, page, errors };
  }
  async function nutrition(page) {
    await page.locator('#lifeosNavigation [data-view="life"]').click();
    await page.locator('#loLifeSectionTabs [data-lo-life-section="nutrition"]').click();
    await page.waitForFunction(() => document.body.dataset.loLifeSection === 'nutrition');
    await page.locator('#lifeosNutritionDashboard').waitFor({ state: 'visible' });
    const details = page.locator('#lo25GoalDetails');
    if (!(await details.evaluate(node => node.open))) await details.locator('summary').click();
  }
  async function capture(page, theme) {
    if (!process.env.NUTRITION_TARGET_CAPTURE) return;
    fs.mkdirSync('docs/design/my-life/current', { recursive: true });
    await page.locator('#lo25GoalDetails').scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'docs/design/my-life/current/v1-nutrition-targets-' + theme + '.png' });
  }
  try {
    {
      const { context, page, errors } = await setup(null);
      try {
        assert.deepEqual(await page.evaluate(() => window.lifeosNutritionV25.get().nutritionSettings), {});
        assert.equal(await page.evaluate(() => localStorage.getItem('lifeos-v4-stage21-atomic')), null, 'Opening a fresh workspace must not create a nutrition checkpoint');
        await nutrition(page);
        assert((await page.locator('#lo25GoalDetails').innerText()).includes('Set a goal to compare'));
        for (const field of ['calories', 'protein', 'carbs', 'fat', 'meals', 'waterMl']) assert.equal(await page.locator('#lo25GoalsForm [name="' + field + '"]').inputValue(), '');
        assert.equal(await page.evaluate(() => localStorage.getItem('lifeos-v4-stage21-atomic')), null, 'Viewing nutrition must not enqueue an illustrative target');
        await capture(page, 'dark');
        await page.evaluate(() => document.querySelector('.lifeos-theme-toggle').click());
        assert.equal(await page.locator('html').getAttribute('data-lifeos-theme'), 'light');
        const contrast = await page.locator('.lo25-day-panel').evaluate(panel => {
          const lum = color => color.match(/[\d.]+/g).slice(0, 3).map(Number).map(x => { x /= 255; return x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; }).reduce((sum, value, i) => sum + value * [0.2126, 0.7152, 0.0722][i], 0);
          const ratio = (foreground, background) => { const a = lum(foreground), b = lum(background); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05); };
          const bg = getComputedStyle(panel).backgroundColor;
          const labels = [...panel.querySelectorAll('#lo25GoalDetails > summary, .lo25-goal > span, .lo25-goal small, #lo25GoalsForm label, #lo25GoalDetails .lo25-muted')];
          const input = panel.querySelector('#lo25GoalsForm input');
          return { labels: labels.map(label => ratio(getComputedStyle(label).color, bg)), input: ratio(getComputedStyle(input).color, getComputedStyle(input).backgroundColor) };
        });
        assert(contrast.labels.length >= 10 && contrast.labels.every(value => value >= 4.5) && contrast.input >= 4.5, 'Nutrition goal labels and inputs need readable light-mode contrast: ' + JSON.stringify(contrast));
        await capture(page, 'light');
        await page.reload(); await page.waitForFunction(() => window.lifeosNutritionV25);
        assert.deepEqual(await page.evaluate(() => window.lifeosNutritionV25.get().nutritionSettings), {});
        assert.equal(await page.evaluate(() => localStorage.getItem('lifeos-v4-stage21-atomic')), null);

        await nutrition(page);
        await page.locator('#lo25GoalsForm [name="calories"]').fill('1900');
        await page.locator('#lo25GoalsForm [name="waterMl"]').fill('1750');
        await page.locator('#lo25GoalsForm button[type="submit"]').click();
        const saved = await page.evaluate(() => window.lifeosNutritionV25.get().nutritionSettings);
        assert.equal(saved.calories, 1900); assert.equal(saved.waterMl, 1750);
        for (const field of ['protein', 'carbs', 'fat', 'meals']) assert.equal(saved[field], null, field + ' remains unset');
        assert.equal(saved.exampleComparisonPreset, undefined);
        const populatedContrast = await page.locator('.lo25-day-panel').evaluate(panel => {
          const lum = color => color.match(/[\d.]+/g).slice(0, 3).map(Number).map(x => { x /= 255; return x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; }).reduce((sum, value, i) => sum + value * [0.2126, 0.7152, 0.0722][i], 0);
          const background = lum(getComputedStyle(panel).backgroundColor);
          return [...panel.querySelectorAll('.lo25-goal > div:first-child span, .lo25-water-summary small')].map(node => { const foreground = lum(getComputedStyle(node).color); return (Math.max(background, foreground) + .05) / (Math.min(background, foreground) + .05); });
        });
        assert(populatedContrast.length >= 3 && populatedContrast.every(value => value >= 4.5), 'Saved targets must remain readable in light mode: ' + JSON.stringify(populatedContrast));
        await page.reload(); await page.waitForFunction(() => window.lifeosNutritionV25);
        assert.deepEqual(await page.evaluate(() => window.lifeosNutritionV25.get().nutritionSettings), saved, 'Only explicitly entered goals survive reload');
        assert.deepEqual(errors, []);
      } finally { await context.close(); }
    }
    for (const settings of [
      { calories: 1850, waterMl: 1700, customPreference: 'retain' },
      { calories: 2100, waterMl: 2100, exampleComparisonInitialized: true, exampleComparisonPreset: 'illustrative-six-week-preview' }
    ]) {
      const { context, page, errors } = await setup(settings, true);
      try {
        assert.deepEqual(await page.evaluate(() => window.lifeosNutritionV25.get().nutritionSettings), settings);
        await nutrition(page);
        if (settings.exampleComparisonPreset) {
          assert((await page.locator('#lo25GoalDetails').innerText()).includes('Example comparison targets'), 'Existing illustrative values remain labeled');
          assert((await page.locator('.lo25-water-summary').innerText()).includes('may include examples'), 'Water comparison must not imply the example was chosen by the user');
          await page.locator('#lo28TrendDetails > summary').click();
          await page.locator('#lo28TrendDetails .lo30-pattern-details > summary').click();
          assert((await page.locator('#lo28TrendDetails .lo30-evidence').innerText()).includes('may include examples'), 'Nutrition trends must retain example provenance');
          await page.locator('#lifeosNavigation [data-view="analytics"]').click();
          await page.locator('#lo184-detail-toggle').click();
          const panel = page.locator('#analyticsPanel');
          if (await panel.locator('.lo-advanced-toggle').count() && await panel.locator('.lo-advanced-toggle').getAttribute('aria-expanded') === 'false') await panel.locator('.lo-advanced-toggle').click();
          const reports = page.locator('#lo257-other-reports');
          if (!(await reports.evaluate(node => node.open))) await reports.locator(':scope > summary').click();
          await page.locator('#lo31Lifestyle').waitFor({ state: 'visible' });
          assert((await page.locator('#lo31Lifestyle').innerText()).includes('may include examples'), 'Insights must retain example provenance');
        } else {
          assert((await page.locator('.lo25-water-summary').innerText()).includes('Your goal: 1700 ml'));
        }
        await page.reload(); await page.waitForFunction(() => window.lifeosNutritionV25);
        assert.deepEqual(await page.evaluate(() => window.lifeosNutritionV25.get().nutritionSettings), settings, 'Existing user or example settings remain unchanged');
        assert.deepEqual(errors, []);
      } finally { await context.close(); }
    }
    console.log('PASS: nutrition targets remain unset until explicitly saved; existing settings survive');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
