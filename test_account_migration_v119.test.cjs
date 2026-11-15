/* V119: run with node --test test_account_migration_v119.test.cjs */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const api=require('./personal_account_migration_v119.js');
const backup={format:'lifeos-v3.1-backup',revision:4,sha256:'a'.repeat(64),
 data:{version:1,sessions:[{id:'real'}],schedule:[{id:'plan'}],workouts:[],meals:[],habitChecks:[]}};
test('file preview shows only selected backup counts',()=>{
 const result=api.inspect(JSON.stringify(backup));
 assert.equal(result.ok,true);
 assert.equal(result.counts.sessions,1);
 assert.equal(result.counts.schedule,1);
 assert.equal(result.revision,4);
});
test('reject malformed backup and disallowed collections',()=>{
 assert.equal(api.inspect(JSON.stringify({...backup,format:'unknown'})).ok,false);
 assert.equal(api.inspect(JSON.stringify({...backup,data:{version:1,sessions:'fake'}})).ok,false);
 assert.equal(api.inspect(JSON.stringify({...backup,sha256:'abc'})).ok,false);
 assert.equal(api.inspect('not JSON').ok,false);
});
test('explicit consent and safety-copy confirmation are mandatory',()=>{
 const approved=api.inspect(JSON.stringify(backup));
 assert.equal(api.eligibleMigration(approved,true,true,'alice','alice'),true);
 assert.equal(api.eligibleMigration(approved,false,true,'alice','alice'),false);
 assert.equal(api.eligibleMigration(approved,true,false,'alice','alice'),false);
 assert.equal(api.eligibleMigration(approved,true,true,'bob','alice'),false);
});
test('no automatic reading or deletion of legacy activities',()=>{
 const src=fs.readFileSync('personal_account_migration_v119.js','utf8');
 assert.doesNotMatch(src,/\b(?:localStorage|sessionStorage)\s*(?:\.|\[)|lifeosReadOnlyWorkspace\s*\(|lifeos-v4-stage21-atomic/);
 assert.doesNotMatch(src,/\.delete\(/);
 assert.match(src,/\/workspace\/migrate/);
 assert.match(src,/expectedRevision:0/);
});
