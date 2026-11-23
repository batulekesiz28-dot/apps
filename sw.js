/* AppShell service worker — bildirim göstermek (Android Chrome'da sayfa içinden bildirim ancak böyle gösterilir) ve
   telefondan “Paylaş → AppShell” ile gelen fotoğrafları Galeri'ye vermek için. Bilerek önbellek YOK: site her zaman ağdan
   güncel gelir (Ctrl+Shift+R alışkanlığı bozulmasın); fetch dinleyicisi sadece paylaşım POST'unu yakalar, gerisine dokunmaz. */
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('notificationclick',e=>{e.notification.close();const url=e.notification.data?.url;e.waitUntil((async()=>{if(url)return self.clients.openWindow(url);
  const cs=await self.clients.matchAll({type:'window',includeUncontrolled:true});const c=cs.find(x=>new URL(x.url).pathname.startsWith(new URL(self.registration.scope).pathname));
  if(c)return c.focus();return self.clients.openWindow(self.registration.scope)})())});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='POST'||!u.pathname.endsWith('/apps/galeri/')||!u.searchParams.has('share'))return;
  e.respondWith((async()=>{try{const fd=await e.request.formData(),files=fd.getAll('photos').filter(f=>f&&f.size);
    const d=await new Promise((ok,no)=>{const r=indexedDB.open('galeri-share',1);r.onupgradeneeded=()=>r.result.createObjectStore('f',{autoIncrement:true});r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});
    await new Promise((ok,no)=>{const t=d.transaction('f','readwrite');for(const f of files)t.objectStore('f').add(f);t.oncomplete=ok;t.onerror=()=>no(t.error)})}catch(err){}
    return Response.redirect(u.pathname+'?share=1',303)})())});
