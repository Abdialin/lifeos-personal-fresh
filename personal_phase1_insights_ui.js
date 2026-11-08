/* Non-mutating insights UI: optional user action, no auto-schedule. */
(function(){'use strict';
function init(){const anchor=document.getElementById('personalReviewWeek');if(!anchor||!window.LifeOSPatternSuggestions)return;
 const button=document.createElement('button');button.type='button';button.textContent='Review observed activity patterns';button.id='personalPatternReview';
 const output=document.createElement('div');output.id='personalPatternResults';output.setAttribute('role','status');output.setAttribute('aria-live','polite');
 anchor.insertAdjacentElement('afterend',button);button.insertAdjacentElement('afterend',output);
 button.addEventListener('click',function(){try{
  // Only use the existing application's explicitly exported read-only workspace if present.
  const source=typeof window.lifeosReadOnlyWorkspace==='function'?window.lifeosReadOnlyWorkspace():null;
  if(!source){output.textContent='Activity history is not exposed to this optional module. No data was read or changed.';return;}
  const result=window.LifeOSPatternSuggestions.suggest(source.sessions||[]);
  output.replaceChildren();const summary=document.createElement('p');summary.textContent=`Observed ${result.trackedDays} tracked days. Evidence: ${result.evidence}. Suggestions are observations only.`;output.append(summary);
  for(const s of result.suggestions.slice(0,8)){const p=document.createElement('p');p.textContent=`${s.category}: weekday ${s.weekday}, around ${String(s.hour).padStart(2,'0')}:00, ${s.sampleDays} sampled days. Review required.`;output.append(p)}
 }catch(e){output.textContent='Could not review patterns: '+e.message}});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
