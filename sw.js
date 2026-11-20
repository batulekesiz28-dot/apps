/* AppShell service worker — SADECE bildirim göstermek için (Android Chrome'da sayfa içinden bildirim ancak böyle gösterilir).
   Bilerek fetch/önbellek YOK: site her zaman ağdan güncel gelir (Ctrl+Shift+R alışkanlığı bozulmasın). */
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('notificationclick',e=>{e.notification.close();const url=e.notification.data?.url;e.waitUntil((async()=>{if(url)return self.clients.openWindow(url);
  const cs=await self.clients.matchAll({type:'window',includeUncontrolled:true});const c=cs.find(x=>new URL(x.url).pathname.startsWith(new URL(self.registration.scope).pathname));
  if(c)return c.focus();return self.clients.openWindow(self.registration.scope)})())});
