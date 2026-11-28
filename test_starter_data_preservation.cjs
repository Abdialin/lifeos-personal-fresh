'use strict';
// Pure synthetic fixtures: no storage, accounts, services or backups are read.
const assert = require('node:assert/strict');
const starter = require('./development_starter.js');
const repair = require('./development_starter_repair.js');
const now = new Date(2026, 10, 28, 20, 0).getTime();
const original = {
  version: 1,
  sessions: [{ id: 'user-session', name: 'Existing record', status: 'finished', startAt: now - 400000, endAt: now - 300000, segments: [{ start: now - 400000, end: now - 300000 }] }],
  events: [{ id: 'user-event', sessionId: 'user-session', type: 'START', time: now - 400000 }],
  schedule: [{ id: 'user-plan', name: 'Existing plan', startAt: now + 10000, endAt: now + 20000 }],
  workouts: [], meals: [], todos: [], goals: [], personalLogs: [], idealRoutines: []
};
const withSamples = starter.merge(original, starter.generate(new Date(now)));
const sourceBefore = structuredClone(withSamples);
const updated = repair.change(withSamples, now);
assert.deepEqual(withSamples, sourceBefore, 'The repair must operate on a copy');
assert(updated.report.addedToday >= 3 && updated.report.addedIdeal >= 14, 'Synthetic repair populates earlier sample blocks and ideal routines');
assert.deepEqual(updated.workspace.sessions.find(s => s.id === 'user-session'), original.sessions[0]);
assert.deepEqual(updated.workspace.events.find(e => e.id === 'user-event'), original.events[0]);
assert.deepEqual(updated.workspace.schedule.find(p => p.id === 'user-plan'), original.schedule[0]);
const removed = starter.remove(updated.workspace);
for (const key of Object.keys(original)) assert.deepEqual(removed[key], original[key], 'Unlinked original data survives sample removal: ' + key);
assert.equal(starter.hasBatch(removed), false);

const sampleSession = withSamples.sessions.find(row => row.seedBatch === starter.BATCH);
const samplePlan = withSamples.schedule.find(row => row.seedBatch === starter.BATCH);
for (const [description, mutate] of [
  ['an untagged event linked to a sample session', ws => ws.events.push({ id: 'personal-event', sessionId: sampleSession.id, type: 'NOTE', time: now })],
  ['an untagged workout linked to a sample session', ws => ws.workouts.push({ id: 'personal-workout', sessionId: sampleSession.id, minutes: 7 })],
  ['an untagged plan linked to a sample session', ws => ws.schedule.push({ id: 'personal-plan', sessionId: sampleSession.id })],
  ['an untagged session linked to a sample plan', ws => ws.sessions.push({ id: 'personal-linked', plannedId: samplePlan.id, status: 'finished' })],
  ['a nested future record linked to a sample', ws => { ws.futureData = [{ id: 'personal-future', details: { linkedActivityIds: [sampleSession.id] } }]; }],
  ['a duplicate untagged identifier', ws => ws.events.push({ id: sampleSession.id, type: 'PERSONAL' })]
]) {
  const input = structuredClone(withSamples); mutate(input);
  const before = structuredClone(input);
  assert.throws(() => repair.change(input, now), /linked to generated samples/, 'Repair must stop for ' + description);
  assert.deepEqual(input, before, 'Repair refusal must not alter ' + description);
  assert.throws(() => starter.remove(input), /linked to generated samples/, 'Removal must stop for ' + description);
  assert.deepEqual(input, before, 'Removal refusal must not alter ' + description);
}
console.log('PASS: synthetic starter repair and removal preserve untagged records and refuse linked data');
