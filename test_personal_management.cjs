const assert=require('node:assert/strict');const m=require('./personal_management');
assert.equal(m.TEMPLATES.length,4);
assert.deepEqual(m.todoSummary([{done:false,due:'2026-11-07',priority:'high'},{done:true,due:'2026-11-01'}],'2026-11-08'),{total:2,open:1,completed:1,overdue:1,highPriority:1});
assert.deepEqual(m.mealTotals([{date:'2026-11-08',calories:300,proteinGrams:20},{date:'2026-11-08',calories:null,proteinGrams:''},{date:'2026-11-07',calories:100}],'2026-11-08'),{count:2,calories:300,proteinGrams:20,caloriesKnown:1,proteinKnown:1});
assert.deepEqual(m.fitnessSummary([{date:'2026-11-08',type:'Gym',minutes:45},{date:'2026-11-08',type:'Walking',minutes:null},{date:'2026-11-01',type:'Boxing',minutes:20}],'2026-11-02','2026-11-08'),{sessions:2,recordedMinutes:45,minutesKnown:1,byType:{Gym:1,Walking:1}});
assert.equal(m.safeNumber('bad'),null);assert.equal(m.safeNumber(''),null);assert.equal(m.safeNumber(0),0);
console.log('Personal management: 6 assertions passed');
