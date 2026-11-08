const fs=require('fs'),assert=require('assert');const html=fs.readFileSync('index.html','utf8');const script=html.split('<script>')[1].split('</script>')[0];new Function(script);
for(const id of ['fitnessForm','fitnessList','mealForm','mealList','goalForm','goalList','fitnessDate','mealDate','goalCategory','goalTarget'])assert(html.includes('id="'+id+'"'),id);
for(const fragment of ['function ensureModules()','function renderStage3()','function addStage3(','function addGoal(','function deleteStage3(','renderDistraction();renderStage3();','data.workouts.push(','data.meals.push(','data.goals.push('])assert(script.includes(fragment),fragment);
assert(script.includes("const KEY='lifeos-live-v1'"));assert(script.includes("'/api/state'"));
console.log('PASS: Stage 3 JS syntax, UI IDs, module wiring, legacy storage key and API');
