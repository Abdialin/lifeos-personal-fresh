'use strict';
// Synthetic local dates and timestamps; this test never opens a database.
process.env.TZ = 'Europe/Stockholm';
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const fixed = Date.parse('2025-11-25T15:00:00+01:00');
class FixedDate extends Date {
  constructor(...args) { if (args.length) super(...args); else super(fixed); }
  static now() { return fixed; }
}
const context = {
  window: { lifeosActivityClassification: session => ({ group: /^gym/i.test(session.name) ? 'Fitness' : 'Other / review' }) },
  document: { readyState: 'loading', addEventListener() {} }, Date: FixedDate, console, setTimeout
};
vm.runInNewContext(fs.readFileSync(require.resolve('./personal_goals_visual_v161.js'), 'utf8'), context);
const engine = context.window.LifeOSGoalEvidenceV175, { measure } = engine;
const t = value => Date.parse(value);
const session = (id, name, parts, extra = {}) => ({
  id, name, status: 'finished', startAt: t(parts[0][0]), endAt: t(parts.at(-1)[1]),
  segments: parts.map(([start, end]) => ({ start: t(start), end: t(end) })), ...extra
});
const from = t('2025-11-24T00:00:00+01:00'), until = t('2025-11-25T00:00:00+01:00');
const s1 = session('study-1', 'Study', [['2025-11-24T09:00:00+01:00', '2025-11-24T10:00:00+01:00']]);
const s2 = session('study-2', 'Study', [['2025-11-24T09:30:00+01:00', '2025-11-24T10:30:00+01:00']]);
const s3 = session('study-3', 'Study', [['2025-11-24T10:00:00+01:00', '2025-11-24T10:15:00+01:00'], ['2025-11-24T10:45:00+01:00', '2025-11-24T11:00:00+01:00']]);
const example = session('example', 'Study', [['2025-11-24T08:00:00+01:00', '2025-11-24T10:00:00+01:00']], { assumed: true });
const workspace = { sessions: [s1, s2, s3, example], personalLogs: [
  { id: 'linked', category: 'Study', date: '2025-11-24', sessionId: 'study-1', minutes: 60 },
  { id: 'manual', category: 'Study', date: '2025-11-24', minutes: 30 }
] };
const hours = measure({ category: 'sessions', name: 'Study', match: 'Study', unit: 'hours' }, workspace, from, until);
assert.equal(hours.minutes, 105, 'Overlapping active segments count once and pauses remain untracked');
assert.equal(hours.rawMinutes, 150, 'Raw recorded duration remains available for per-record averages');
assert.equal(hours.value, 1.75); assert.equal(hours.records, 3); assert.equal(hours.excluded, 1);
const sessions = measure({ category: 'sessions', name: 'Study', match: 'Study', unit: 'sessions' }, workspace, from, until);
assert.equal(sessions.value, 3, 'Distinct simultaneous sessions remain distinct session counts');
assert.equal(sessions.minutes, 105);
const malformed = { sessions: [null, '', true].map((start, i) => ({ id: 'missing-' + i, name: 'Study', status: 'finished', endAt: t('2025-11-24T10:00:00+01:00'), segments: [{ start, end: t('2025-11-24T10:00:00+01:00') }] })) };
malformed.sessions.push({ id: 'null-segment', name: 'Study', status: 'finished', endAt: t('2025-11-24T10:00:00+01:00'), segments: [null] });
const missingStart = measure({ category: 'sessions', name: 'Study', unit: 'hours' }, malformed, from, until);
assert.equal(missingStart.records, 0, 'A missing segment start must not be coerced into an invented interval');
assert.equal(missingStart.minutes, 0);
const habit = measure({ category: 'habit', name: 'Study', match: 'Study', unit: 'hours' }, workspace, from, until);
assert.equal(habit.minutes, 135, 'Linked logs are deduplicated; independent untimed logs remain separate evidence');
assert.equal(habit.rawMinutes, 180); assert.equal(habit.value, 2.25); assert.equal(habit.records, 4);

const gym1 = session('gym-1', 'Gym', [['2025-11-24T09:00:00+01:00', '2025-11-24T10:00:00+01:00']]);
const gym2 = session('gym-2', 'Gym', [['2025-11-24T09:30:00+01:00', '2025-11-24T10:30:00+01:00']]);
const fitness = { sessions: [gym1, gym2], workouts: [
  { id: 'gym-detail', sessionId: 'gym-1', date: '2025-11-24', minutes: 60 },
  { id: 'manual-workout', date: '2025-11-24', minutes: 30 }
] };
const exercise = measure({ category: 'fitness', unit: 'hours' }, fitness, from, until);
assert.equal(exercise.minutes, 120); assert.equal(exercise.rawMinutes, 150); assert.equal(exercise.value, 2); assert.equal(exercise.records, 3);
assert.equal(measure({ category: 'fitness', unit: 'sessions' }, fitness, from, until).value, 3);

const overnight = { sessions: [
  session('night-1', 'Night work', [['2025-11-24T23:30:00+01:00', '2025-11-25T00:30:00+01:00']]),
  session('night-2', 'Night work', [['2025-11-25T00:00:00+01:00', '2025-11-25T01:00:00+01:00']])
] };
const nightGoal = { category: 'sessions', name: 'Night work', unit: 'hours' };
assert.equal(measure(nightGoal, overnight, from, until).minutes, 30);
assert.equal(measure(nightGoal, overnight, until, t('2025-11-26T00:00:00+01:00')).minutes, 60);
assert.equal(measure(nightGoal, overnight, until, t('2025-11-26T00:00:00+01:00')).rawMinutes, 90);
const twoDays = t('2025-11-26T00:00:00+01:00');
assert.equal(measure({ ...nightGoal, unit: 'sessions' }, overnight, from, twoDays).value, 2, 'An overnight timer is one session within a multi-day period');
assert.equal(measure({ ...nightGoal, category: 'habit', match: 'Night work', unit: 'sessions' }, overnight, from, twoDays).value, 2);
const dst = { sessions: [
  session('dst-1', 'Night work', [['2025-03-30T01:30:00+01:00', '2025-03-30T03:30:00+02:00']]),
  session('dst-2', 'Night work', [['2025-03-30T01:45:00+01:00', '2025-03-30T03:45:00+02:00']])
] };
assert.equal(measure(nightGoal, dst, t('2025-03-30T00:00:00+01:00'), t('2025-03-31T00:00:00+02:00')).minutes, 75, 'Clock changes use real elapsed milliseconds');
const quantity = measure({ category: 'personal', name: 'Read', match: 'Reading', unit: 'quantity', quantityUnit: 'pages' }, {
  sessions: [s1, s2], personalLogs: [{ category: 'Reading', date: '2025-11-24', quantity: 30, unit: 'pages' }]
}, from, until);
assert.equal(quantity.value, 30, 'Timer durations do not manufacture manually recorded quantities');
const crossSection = { ...workspace, goals: [
  { id: 'study-goal', name: 'Study', category: 'sessions', match: 'Study', unit: 'hours', target: 3 },
  { id: 'unset', name: 'Study', category: 'sessions', match: 'Study', unit: 'hours' }
] };
const insights = require('./personal_insights_overview_v257.js').goalsSummary(crossSection, engine);
assert.equal(insights.rows[0].actual, 1.75, 'Insights uses the same unique goal evidence');
assert.equal(insights.rows.length, 1, 'Insights excludes targets that cannot support a percentage');
const activity = require('./personal_activity_analytics_v253.js').categoryGoals(crossSection, 'study', engine, { match: () => ({ id: 'study' }) });
assert.equal(activity.items[0].actual, 1.75, 'Activity intelligence uses the same unique goal evidence');
assert.equal(activity.items.length, 1);
console.log('PASS: Goals unique elapsed durations, linked evidence, pauses, overnight and DST');
