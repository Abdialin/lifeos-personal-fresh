/* Run node --test test_account_friends_v118.test.cjs. No browser state or network involved. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const api=require('./personal_account_friends_v118.js');
test('valid score is typed and bounded to chosen period',()=>{
 const x=api.validateScore('workoutDays','7','5','2026-11-15');
 assert.deepEqual(x,{metric:'workoutDays',days:7,score:5,periodEnd:'2026-11-15'});
 assert.equal(api.validateScore('habitDays','7','8','2026-11-15'),null);
 assert.equal(api.validateScore('prayerTimes','7','3','2026-11-15'),null);
 assert.equal(api.validateScore('habitDays','7','3','2026-02-30'),null);
});
test('safe leaderboard query uses strict allowlisted keys',()=>{
 const result=api.leaderboardQuery('habitDays',14,'2026-11-15');
 assert.equal(result,'metric=habitDays&days=14&periodEnd=2026-11-15');
 assert.equal(api.leaderboardQuery('private_notes',14,'2026-11-15'),null);
});
test('module does not persist credentials or auto-export history',()=>{
 const source=require('fs').readFileSync('personal_account_friends_v118.js','utf8');
 assert.doesNotMatch(source,/localStorage|sessionStorage|indexedDB/i);
 assert.doesNotMatch(source,/lifeosReadOnlyWorkspace\s*\(/);
 assert.match(source,/token=null/);
 assert.match(source,/root\.confirm\(/);
 assert.match(source,/result\.enabled!==true/);
});
