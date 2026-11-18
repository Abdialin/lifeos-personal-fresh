/* V237: Android-only, opt-in encrypted token access. Never write token to
   localStorage, workspace, diagnostic output, URL or recovery bundles. */
(function(root){
'use strict';
const native=()=>root.LifeOSNative?.postMessage;
const controls=()=>({
 input:document.getElementById('syncToken'),
 checkbox:document.getElementById('lo237-native-remember'),
 status:document.getElementById('lo237-native-status')
});
function send(msg){try{if(typeof native()!=='function')return false;native().call(root.LifeOSNative,JSON.stringify(msg));return true}catch(_){return false}}
function status(message){const el=controls().status;if(el)el.textContent=message}
function receive(token){
 const {input,checkbox}=controls();
 if(!input||!checkbox)return false;
 if(typeof token==='string'&&token.length>=16&&token.length<=256){
  // Never override a manually entered token.
  if(!input.value.trim())input.value=token;
  checkbox.checked=true;
  status('Saved Android token restored to the form. Tap Connect to authenticate.');
  return true;
 }
 status('No encrypted Android token saved. Connect and opt in to save one.');
 return false;
}
function saved(ok){status(ok?'Private sync token encrypted on this Android device.':'Android secure token save failed; it will not survive app closure.')}
function cleared(ok){status(ok?'Saved Android token cleared.':'Could not confirm Android token removal.')}
function remember(){
 const {input,checkbox}=controls();
 if(!checkbox||!checkbox.checked)return false;
 const value=input?.value.trim()||'';
 if(value.length<16||value.length>256){status('Private token length not supported for Android storage.');return false}
 if(!send({kind:'token-store',token:value})){status('Android secure storage is unavailable.');return false}
 return true;
}
function setup(){
 if(!native()||document.getElementById('lo237-native-remember'))return;
 const tab=document.getElementById('rememberSyncTab');
 const host=tab?.closest('label');
 if(!host)return;
 host.insertAdjacentHTML('afterend','<label class="sub" style="display:flex;align-items:center;gap:9px;margin:12px 0"><input id="lo237-native-remember" type="checkbox"> Remember token securely on this Android device</label><p class="note" id="lo237-native-status" role="status">Opt in to encrypted Android Keystore storage. This option survives app restarts; do not enable on shared devices.</p>');
 document.getElementById('lo237-native-remember').addEventListener('change',e=>{
  if(!e.target.checked){send({kind:'token-clear'});status('Requested removal of saved Android token.');}
  else status('Token will be encrypted only after a successful Connect.');
 });
 // Request the stored token through the origin-scoped native bridge.
 send({kind:'token-restore'});
}
if(root.document){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
 root.addEventListener?.('lifeos-native-ready',setup);
}
root.LifeOSNativeSecureSyncV237={receive,saved,cleared,remember,setup};
})(typeof window!=='undefined'?window:globalThis);
