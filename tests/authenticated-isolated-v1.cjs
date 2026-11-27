'use strict';

// End-to-end test of the real login, sync endpoint and application UI. All
// credentials and records belong to a short-lived local server and database.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const captureDir = process.env.AUTH_V1_CAPTURE_DIR;
const fixed = new Date('2026-11-26T16:00:00+01:00');
const username = 'isolated-' + crypto.randomBytes(8).toString('hex');
const password = crypto.randomBytes(24).toString('base64url');
const token = crypto.randomBytes(32).toString('base64url');

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  return port;
}

function fixture() {
  // Explicit offsets make the synthetic data independent of the test host's timezone.
  const t = text => Date.parse(text + '+01:00');
  const session = (id, name, segments, category) => ({
    id, name, status: 'finished', createdAt: segments[0][0], startAt: segments[0][0],
    endAt: segments.at(-1)[1], segments: segments.map(([start, end]) => ({ start, end })),
    precision: 'measured', notes: '', activityDetailsV252: { category }
  });
  const sessions = [
    session('fixture-sleep', 'Sleep', [[t('2026-11-25T23:30:00'), t('2026-11-26T07:00:00')]], 'Sleep'),
    session('fixture-study', 'University study', [[t('2026-11-26T09:00:00'), t('2026-11-26T10:00:00')], [t('2026-11-26T10:30:00'), t('2026-11-26T11:00:00')]], 'University'),
    session('fixture-work', 'Work project', [[t('2026-11-26T09:30:00'), t('2026-11-26T10:30:00')]], 'Work & business'),
    session('fixture-prayer', 'Prayer', [[t('2026-11-26T12:00:00'), t('2026-11-26T12:15:00')]], 'Prayer'),
    session('fixture-lunch', 'Lunch', [[t('2026-11-26T12:30:00'), t('2026-11-26T13:00:00')]], 'Nutrition'),
    session('fixture-gym', 'Gym', [[t('2026-11-25T18:00:00'), t('2026-11-25T19:00:00')]], 'Fitness')
  ];
  const liveStart = t('2026-11-26T15:30:00');
  sessions.push({ id: 'fixture-live', name: 'Reading', status: 'running', createdAt: liveStart,
    startAt: liveStart, endAt: null, segments: [{ start: liveStart, end: null }],
    precision: 'measured', notes: '' });
  for (let day = 1; day <= 21; day++) {
    const date = new Date(Date.parse('2026-11-26T08:00:00Z') - day * 86400000).toISOString().slice(0, 10);
    sessions.push(session('fixture-history-' + day, 'University study', [[t(date + 'T09:00:00'), t(date + 'T10:00:00')]], 'University'));
  }
  const plan = (id, name, start, end, extra = {}) => ({ id, name, startAt: t(start), endAt: t(end),
    createdAt: t('2026-11-23T08:00:00'), status: 'planned', sessionId: null, reminder: false, notes: '', ...extra });
  const schedule = [
    plan('fixture-linked', 'University study', '2026-11-26T09:00:00', '2026-11-26T10:00:00', { status: 'started', sessionId: 'fixture-study' }),
    plan('fixture-gym-plan', 'Gym session', '2026-11-26T18:00:00', '2026-11-26T19:00:00'),
    plan('fixture-meeting', 'Project meeting', '2026-11-26T18:30:00', '2026-11-26T19:30:00'),
    plan('fixture-lecture', 'University lecture', '2026-11-27T09:00:00', '2026-11-27T10:30:00'),
    plan('fixture-family', 'Family time', '2026-11-28T18:00:00', '2026-11-28T19:00:00')
  ];
  const todos = [
    { id: 'fixture-task', name: 'Prepare assignment', due: '2026-11-26', priority: 'high', done: false },
    { id: 'fixture-done', name: 'Review priorities', due: '2026-11-26', priority: 'normal', done: true, completedAt: t('2026-11-26T12:00:00') },
    { id: 'fixture-overdue', name: 'Overdue report', due: '2026-11-25', priority: 'high', done: false },
    { id: 'fixture-upcoming', name: 'Lecture notes', due: '2026-11-27', priority: 'normal', done: false }
  ];
  const goals = [
    { id: 'fixture-goal-gym', name: 'Gym three times weekly', category: 'fitness', target: 3, unit: 'sessions' },
    { id: 'fixture-goal-study', name: 'Study eight hours', category: 'sessions', match: 'study', target: 8, unit: 'hours' }
  ];
  const idealRoutines = [{ id: 'fixture-ideal', name: 'University study', dayOfWeek: 4, start: '09:00', durationMinutes: 90 }];
  const habitDefinitions = [{ id: 'fixture-habit', title: 'Read', everyDays: 1, startDate: '2026-11-23' }];
  const habitChecks = [{ id: 'fixture-habit-check', habitId: 'fixture-habit', date: '2026-11-26', done: true,
    checkSource: 'manual', createdAt: t('2026-11-26T08:00:00') }];
  const workouts = [{ id: 'fixture-workout', date: '2026-11-25', type: 'Strength training', minutes: 60,
    details: 'Synthetic fixture', sessionId: 'fixture-gym', createdAt: t('2026-11-25T19:05:00') }];
  const meals = [{ id: 'fixture-meal', date: '2026-11-26', name: 'Lunch', sessionId: 'fixture-lunch',
    mealTime: '12:30', mealCategory: 'lunch', calories: 650, proteinGrams: 35, carbsGrams: 75,
    fatGrams: 20, description: 'Synthetic fixture', createdAt: t('2026-11-26T13:00:00') }];
  const personalLogs = [{ id: 'fixture-routine', date: '2026-11-26', category: 'Quran', minutes: 20,
    quantity: null, unit: '', notes: '', precision: 'measured', source: 'manual', createdAt: '2026-11-26T13:30:00+01:00' }];
  return { version: 1, sessions, events: [], schedule, todos, goals, idealRoutines, habitDefinitions,
    habitChecks, workouts, meals, personalLogs };
}

async function main() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lifeos-auth-v1-'));
  const port = await freePort();
  const origin = `http://127.0.0.1:${port}`;
  const env = { PATH: process.env.PATH, LANG: process.env.LANG || 'C.UTF-8', PYTHONUNBUFFERED: '1', PYTHONDONTWRITEBYTECODE: '1',
    TZ: 'Europe/Stockholm', PORT: String(port), LIFEOS_DB: path.join(dir, 'disposable.sqlite3'),
    LIFEOS_DATABASE_URL: '', LIFEOS_ACCOUNT_API_ENABLED: '0', LIFEOS_USERNAME: username,
    LIFEOS_PASSWORD: password, LIFEOS_TOKEN: token };
  const server = spawn('python3', [path.join(root, 'server.py')], { cwd: root, env, stdio: 'ignore' });
  let browser;
  try {
    for (let attempt = 0; attempt < 80; attempt++) {
      if (server.exitCode !== null) throw Error('Disposable server exited before becoming ready');
      try { if ((await fetch(origin + '/healthz')).ok) break; } catch (_) {}
      if (attempt === 79) throw Error('Disposable server did not become ready');
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 393, height: 780 }, isMobile: true,
      hasTouch: true, timezoneId: 'Europe/Stockholm' });
    // Local requests reach the actual server; block all other network requests.
    await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('dialog', dialog => dialog.accept());
    await page.clock.install({ time: fixed });
    await page.clock.setFixedTime(fixed);

    const unauthorized = await context.request.get(origin + '/api/state', { maxRedirects: 0 });
    assert([302, 303, 401, 403].includes(unauthorized.status()), 'Workspace API must require sign-in');
    await page.goto(origin + '/login');
    await page.locator('#username').fill(username);
    await page.locator('#password').fill('incorrect password');
    await page.getByRole('button', { name: 'Sign in securely' }).click();
    assert(await page.getByRole('alert').isVisible(), 'Incorrect login should be rejected');
    await page.locator('#username').fill(username);
    await page.locator('#password').fill(password);
    await page.getByRole('button', { name: 'Sign in securely' }).click();
    await page.waitForFunction(() => document.body?.classList.contains('lo-ca-ready'));
    assert.equal((await context.request.get(origin + '/api/state')).status(), 401, 'Sync must also require its token');

    // Seed through the same authenticated API as cloud sync. This database is
    // unique to this process; it cannot contain or replace an existing account.
    const headers = { 'X-LifeOS-Token': token };
    const seeded = await context.request.put(origin + '/api/state', { headers, data: { revision: 0, data: fixture() } });
    assert.equal(seeded.status(), 200, 'Synthetic fixture must be saved by the real server');
    assert.equal((await seeded.json()).revision, 1);
    await page.locator('#lifeosNavigation [data-view="schedule"]').click();
    await page.waitForSelector('#lifeosPlanOverview[data-ready="true"]');
    await page.locator('.pov-settings summary').click();
    await page.locator('[data-pov-settings]').click();
    await page.waitForFunction(() => document.body.dataset.lifeosView === 'settings');
    const cloud = page.locator('#cloudSyncPanel');
    if (await cloud.locator('.lo-advanced-toggle').getAttribute('aria-expanded') === 'false') await cloud.locator('.lo-advanced-toggle').click();
    await page.locator('#syncToken').fill(token);
    await page.locator('#connectSync').click();
    // A new installation writes one initialization-only journal entry. The
    // normal load correctly refuses to overwrite it; exercise the existing
    // explicitly reviewed fresh-device recovery path instead.
    await page.waitForFunction(() => document.querySelector('#syncStatus')?.textContent.includes('queue has no trusted base revision'));
    const downloads = [];
    page.on('download', download => downloads.push(download));
    await page.locator('#lo234-review').click();
    await page.waitForFunction(() => !document.querySelector('#lo234-adopt-button')?.disabled);
    assert.equal(downloads.length, 2, 'Both temporary recovery copies must be exported');
    const backups = [];
    for (let i = 0; i < downloads.length; i++) {
      const backup = path.join(dir, 'recovery-' + i + '.json');
      await downloads[i].saveAs(backup);
      backups.push(JSON.parse(fs.readFileSync(backup, 'utf8')));
    }
    assert(backups.some(copy => copy.sessions?.some(s => s.id === 'fixture-study')), 'Verify the synthetic server backup');
    assert(backups.some(copy => copy.exportType === 'lifeos-v234-local-recovery'), 'Verify the synthetic local recovery backup');
    await page.locator('#lo234-adopt-button').click();
    await page.locator('#lo239-backups').check();
    await page.locator('#lo239-phrase').fill('RESTORE SERVER');
    await page.locator('#lo239-approve').click();
    await page.waitForFunction(() => document.querySelector('#syncStatus')?.textContent.includes('Server history restored locally'));
    await page.locator('#connectSync').click();
    await page.waitForFunction(() => document.querySelector('#syncStatus')?.textContent.includes('server has saved data'));
    await page.locator('#pullSync').click();
    await page.waitForFunction(() => document.querySelector('#syncStatus')?.textContent.includes('Loaded from server'));
    await page.waitForFunction(() => window.lifeosReadOnlyWorkspace?.().sessions.some(x => x.id === 'fixture-study'));

    async function nav(view) {
      await page.locator('#lifeosNavigation [data-view="' + view + '"]').click();
      await page.waitForFunction(value => document.body.dataset.lifeosView === value, view);
      await page.waitForTimeout(250);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), view + ' must not overflow horizontally');
    }
    async function capture(name) {
      if (!captureDir) return;
      fs.mkdirSync(captureDir, { recursive: true });
      // Subsection handlers may start a smooth scroll after a tab click.
      if (name.startsWith('my-life-')) await page.waitForTimeout(500);
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await page.waitForTimeout(120);
      await page.screenshot({ path: path.join(captureDir, name + '.png') });
    }
    async function sections(theme) {
      await nav('dashboard');
      await page.waitForFunction(value => document.getElementById('todayAPlus').classList.contains('ap-light') === (value === 'light'), theme);
      for (const [index, name] of ['overview', 'timeline', 'agenda', 'review'].entries()) {
        await page.locator('#apTab' + index).click();
        await capture('today-' + name + '-' + theme);
      }
      await nav('tracking');
      for (const name of ['live', 'history', 'review']) {
        await page.locator('[data-ca-tab="' + name + '"]').click();
        await capture('track-' + name + '-' + theme);
      }
      await nav('schedule');
      await page.waitForSelector('#lifeosPlanOverview[data-ready="true"]', { state: 'attached' });
      for (const name of ['overview', 'calendar', 'tasks', 'compare', 'improve']) {
        await page.locator('#v136Workspace [data-v136-tab="' + name + '"]:visible').first().click();
        await capture('plan-' + name + '-' + theme);
      }
      await nav('goals');
      for (const name of ['overview', 'improve', 'history']) {
        await page.locator('#gv161-app [role="tab"][data-v161-tab="' + name + '"]').click();
        await capture('goals-' + name + '-' + theme);
      }
      await nav('analytics');
      await capture('insights-overview-' + theme);
      await nav('life');
      for (const name of ['overview', 'routines', 'fitness', 'nutrition', 'friends']) {
        await page.locator('#loLifeSectionTabs [data-lo-life-section="' + name + '"]').click();
        await page.waitForFunction(value => document.body.dataset.loLifeSection === value, name);
        if (name !== 'overview') assert(!(await page.locator('#lo182-life-hub').isVisible()));
        if (name === 'friends') await page.locator('#lo197-challenges').waitFor({ state: 'visible' });
        if (name === 'routines') {
          await page.locator('#lo170-notes').waitFor({ state: 'attached' });
          await page.waitForFunction(() => document.getElementById('personalLogList')?.textContent.includes('Quran'));
        }
        await capture('my-life-' + name + '-' + theme);
      }
    }

    await sections('dark');
    await page.locator('.lifeos-theme-toggle').click();
    assert.equal(await page.locator('html').getAttribute('data-lifeos-theme'), 'light');
    await sections('light');

    // Exercise the actual timeline detail and partial-gap workflow using the
    // data that was restored from the temporary server.
    await nav('dashboard');
    await page.locator('#apTab1').click();
    await page.locator('[data-ap-live-period="1"]').click();
    await page.locator('svg [data-ap-detail="record"][data-ap-key="fixture-study"]').first().click();
    const details = await page.locator('#caDialogBody').innerText();
    assert(details.includes('University study') && details.includes('University') && details.includes('Work project'));
    await page.locator('#loCADialog [data-ca-close]').last().click();
    await page.locator('[data-ap-live-period="2"]').click();
    const beforeGap = await page.evaluate(() => window.lifeosTodayAPlusSnapshot());
    const a = Date.parse('2026-11-26T14:00:00+01:00'), b = a + 30 * 60000;
    const gap = beforeGap.gaps.find(item => item.a <= a && item.b >= b);
    assert(gap, 'Fixture must have an unlogged interval for partial recording');
    await page.locator('svg [data-ap-detail="gap"][data-ap-key="' + gap.a + ':' + gap.b + '"]').click();
    await page.locator('#loCADialog [data-ca-gap]').click();
    await page.locator('#caPastName').fill('Synthetic reading break');
    await page.locator('#caPastStart').fill('2026-11-26T14:00');
    await page.locator('#caPastEnd').fill('2026-11-26T14:30');
    await page.locator('[data-ca-save-past]').click();
    await page.getByText('Activity saved', { exact: true }).waitFor({ state: 'visible' });
    await page.locator('#loCADialog [data-ca-close]').last().click();
    const afterGap = await page.evaluate(() => window.lifeosTodayAPlusSnapshot());
    assert.equal(afterGap.metrics.unique - beforeGap.metrics.unique, 30 * 60000);
    assert.equal(beforeGap.metrics.unlogged - afterGap.metrics.unlogged, 30 * 60000);
    assert.equal(afterGap.metrics.unique + afterGap.metrics.unlogged + afterGap.metrics.remaining, afterGap.metrics.dayLength);
    await nav('tracking');
    await page.locator('[data-ca-tab="history"]').click();
    await page.locator('[data-ca-period="today"]').click();
    const todayDetails = page.locator('#caHistory details.ca-day[data-ca-day="2026-11-26"]');
    if (!(await todayDetails.evaluate(element => element.open))) await todayDetails.locator('summary').click();
    assert(await todayDetails.getByRole('button', { name: /Synthetic reading break/ }).isVisible());

    // Change a synthetic task and verify both edits reached the real server.
    await nav('schedule');
    await page.locator('#v136Workspace [data-v136-tab="overview"]:visible').first().click();
    await page.locator('#lifeosPlanOverview [data-pov-todo="fixture-task"]').check();
    await page.waitForFunction(() => window.lifeosReadOnlyWorkspace().todos.find(x => x.id === 'fixture-task')?.done);
    await page.waitForTimeout(2500);
    const saved = await context.request.get(origin + '/api/state', { headers });
    const remote = await saved.json();
    assert(remote.revision > 1, 'A task change must be sent to the isolated server');
    assert.equal(remote.data.todos.find(x => x.id === 'fixture-task').done, true);
    assert(remote.data.sessions.some(x => x.name === 'Synthetic reading break'));
    await page.reload();
    await page.waitForFunction(() => window.lifeosReadOnlyWorkspace?.().todos.find(x => x.id === 'fixture-task')?.done);
    assert(await page.evaluate(() => window.lifeosReadOnlyWorkspace().sessions.some(x => x.name === 'Synthetic reading break')));
    assert.deepEqual(errors, [], 'No uncaught browser errors');
    await context.close();
    console.log('PASS: disposable login, authenticated SQLite sync, six-section mobile navigation, both themes and reload');
  } finally {
    if (browser) await browser.close();
    server.kill('SIGTERM');
    await new Promise(resolve => server.exitCode !== null ? resolve() : server.once('exit', resolve));
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
