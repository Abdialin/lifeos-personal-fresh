/* LifeOS notification display only. No offline caching and no background data access. */
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 event.waitUntil((async()=>{
  const clientsList=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  for(const client of clientsList){if(client.url.includes('lifeos-personal-test.onrender.com')){await client.focus();return}}
  await self.clients.openWindow('./');
 })());
});