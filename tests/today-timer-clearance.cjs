'use strict';
// Synthetic, offline Today workspaces. No service or user account is accessed.
const { chromium } = require('playwright');
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const root = process.cwd(), origin = 'https://lifeos-today-aplus-preview.onrender.com';
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 393, height: 780 }, isMobile: true, hasTouch: true, timezoneId: 'Europe/Stockholm' });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => {
    const request = route.request(), url = new URL(request.url()), file = path.resolve(root, '.' + (url.pathname === '/' ? '/index.html' : url.pathname));
    if (url.origin === origin && request.method() === 'GET' && file.startsWith(root + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile()) return route.fulfill({ path: file });
    return route.fulfill({ status: 404, body: 'offline synthetic Today fixture' });
  });
  const now = new Date('2026-11-26T16:00:00+01:00');
  await page.clock.install({ time: now }); await page.clock.setFixedTime(now);
  await page.addInitScript(() => {
    const start = Date.parse('2026-11-26T15:00:00+01:00');
    localStorage.setItem('lifeos-live-v1', JSON.stringify({ version: 1, events: [], schedule: [],
      sessions: [{ id: 'timer', name: 'Synthetic current timer', status: 'running', createdAt: start, startAt: start, endAt: null, segments: [{ start, end: null }], precision: 'measured' }],
      todos: [{ id: 'task', name: 'Synthetic task', due: '2026-11-26', done: false, priority: 'normal' }] }));
  });
  try {
    await page.goto(origin + '/'); await page.waitForFunction(() => document.body.classList.contains('lo-ca-ready'));
    const before = await page.evaluate(() => JSON.stringify(window.lifeosReadOnlyWorkspace()));
    for (const theme of ['dark', 'light']) {
      if (theme === 'light') await page.evaluate(() => document.querySelector('#todayAPlus .ap-header button').click());
      for (const size of [{ width: 360, height: 650 }, { width: 393, height: 460 }, { width: 412, height: 780 }]) {
        await page.setViewportSize(size);
        for (const [tab, selector] of [[0, '#apPage0 [data-ap-live-action="gap"]'], [1, '#apPage1 .ap-v250-access > summary'], [2, '#apPage2 .ap-v1-agenda-task label'], [3, '#apPage3 [data-ap-live-action="gap"]']]) {
          await page.locator('#apTab' + tab).click();
          const target = page.locator(selector).first(); await target.waitFor({ state: 'visible' });
          await target.scrollIntoViewIfNeeded();
          await page.evaluate(selector => {
            const item = document.querySelector(selector), nav = document.querySelector('#lifeosNavigation');
            const desired = nav.getBoundingClientRect().top - item.getBoundingClientRect().height - 12;
            window.scrollTo({ top: Math.max(0, window.scrollY + item.getBoundingClientRect().top - desired), behavior: 'instant' });
          }, selector);
          await page.waitForFunction(() => {
            const timer = document.querySelector('#lo86-timer'), nav = document.querySelector('#lifeosNavigation');
            const inline = document.querySelector('#apPage0:not([hidden]) .ap-v1-live-row, #apPage1:not([hidden]) .ap-v1-timeline-live > summary');
            const r = inline?.getBoundingClientRect(), n = nav?.getBoundingClientRect();
            return (timer && getComputedStyle(timer).visibility !== 'hidden' && getComputedStyle(timer).display !== 'none') ||
              (r && n && r.width > 0 && r.height > 0 && r.top >= 0 && r.bottom <= n.top);
          }, null, { timeout: 3000 });
          const geometry = await page.evaluate(selector => {
            const item = document.querySelector(selector), timer = document.querySelector('#lo86-timer'), nav = document.querySelector('#lifeosNavigation');
            const r = item.getBoundingClientRect(), t = timer.getBoundingClientRect(), n = nav.getBoundingClientRect();
            const visible = getComputedStyle(timer).visibility !== 'hidden' && getComputedStyle(timer).display !== 'none';
            const inline = document.querySelector('#apPage0:not([hidden]) .ap-v1-live-row, #apPage1:not([hidden]) .ap-v1-timeline-live > summary');
            const ir = inline?.getBoundingClientRect();
            const inlineVisible = !!(ir && ir.width > 0 && ir.height > 0 && ir.top >= 0 && ir.bottom <= n.top);
            const overlap = visible && r.left < t.right && r.right > t.left && r.top < t.bottom && r.bottom > t.top;
            const hit = document.elementFromPoint(Math.max(r.left + 2, Math.min(r.right - 8, innerWidth - 2)), (r.top + r.bottom) / 2);
            return { visible, inlineVisible, inline: ir && {top:ir.top,bottom:ir.bottom,height:ir.height}, scrollY, overlap, target: { top: r.top, bottom: r.bottom }, timer: { top: t.top, bottom: t.bottom, display: getComputedStyle(timer).display, visibility: getComputedStyle(timer).visibility, classes: timer.className, hidden: timer.hidden, inlineStyle: timer.getAttribute('style'), parent: timer.parentElement?.id || timer.parentElement?.className, view: document.body.dataset.lifeosView }, nav: n.top, hitTarget: item === hit || item.contains(hit) };
          }, selector);
          assert(geometry.visible || geometry.inlineVisible, 'A live timer remains visible on Today tab ' + JSON.stringify({ tab, theme, size, geometry }));
          assert(!geometry.overlap && geometry.hitTarget && geometry.target.bottom <= geometry.nav + 1, 'The timer or navigation must not cover an action at ' + JSON.stringify({ theme, size, tab, geometry }));
          if (tab === 3 && size.width === 412) {
            if (process.env.TODAY_TIMER_CLEARANCE_CAPTURE) {
              fs.mkdirSync('docs/design/today/current', { recursive: true });
              await page.screenshot({ path: 'docs/design/today/current/v1-timer-clearance-' + theme + '.png' });
            }
            await target.click(); assert(await page.locator('#caGapContext').isVisible());
            await page.locator('#loCADialog [data-ca-close]').last().click();
          }
        }
      }
    }
    await page.locator('#apTab3').click();
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
    await page.waitForTimeout(200);
    const sticky = await page.locator('#lo86-timer').evaluate(node => ({ position: getComputedStyle(node).position, top: node.getBoundingClientRect().top }));
    assert.equal(sticky.position, 'sticky'); assert(sticky.top >= -1 && sticky.top <= 1, 'The timer stays in its own row at the top while scrolling: ' + JSON.stringify(sticky));
    if (process.env.TODAY_TIMER_CLEARANCE_CAPTURE) await page.screenshot({ path: 'docs/design/today/current/v1-timer-clearance-scrolled-light.png' });
    await page.locator('#lo86-toggle').click();
    assert.equal(await page.locator('#lo86-toggle').getAttribute('aria-expanded'), 'true');
    assert((await page.locator('#lo86-name').innerText()).includes('Synthetic current timer'));
    await page.locator('#lo86-toggle').click();
    assert.equal(await page.evaluate(() => JSON.stringify(window.lifeosReadOnlyWorkspace())), before, 'Layout and inspection must not change activity records');
    assert.deepEqual(errors, []);
    console.log('PASS: live timer and Today actions remain visible and operable at mobile viewport sizes');
  } finally { await context.close(); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
