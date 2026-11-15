/* LifeOS notifications: display/click routing only, no background polling or data access. */
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 event.waitUntil((async()=>{
  const requested=String(event.notification.data?.url||'/?timer=review');
  const target=new URL(requested,self.registration.scope);
  // Never open user-controlled external URLs.
  if(target.origin!==self.location.origin)return;
  const list=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  for(const client of list){
   try{
    if(new URL(client.url).origin!==target.origin)continue;
    if('navigate'in client)await client.navigate(target.href);
    await client.focus();return;
   }catch(_){}
  }
  if(self.clients.openWindow)await self.clients.openWindow(target.href);
 })());
});