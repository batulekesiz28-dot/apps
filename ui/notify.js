/* AppShell — Hatırlatıcılar: kendine bildirim gönder.
   · Bu tarayıcı: Notification API (site bir sekmede açıkken; arka planda da olur). Kapalıyken kaçırılanlar açılışta gösterilir.
   · Telefon (isteğe bağlı): ntfy — ücretsiz, hesapsız anlık bildirim uygulaması. Mesaj https://ntfy.sh/<konu> adresine gider;
     zamanlı olanlar ntfy sunucusunda bekler (en çok 3 gün), site kapalı olsa da telefona gelir. Konu adı rastgele ve gizli (şifre gibi).
     Not: mesaj metni ntfy.sh'den geçer — şifre/özel bilgi yazma.
   · Saatli görevler (isteğe bağlı): bugünkü görevlerin saati gelince (Notlar görev deposu TK) bildirim.
   Kayıt (sadece bu cihaz): appshell:rem [{id,text,at,br,ph,phSent,fired}], appshell:remcfg {tasks,ph,pc}, appshell:ntfy {topic,last}, appshell:remtk {anahtar:1}.
   Giriş: Ctrl+K “Hatırlatıcı kur” / “Kendime bildirim gönder”, Bugün kartındaki zil. */
(function(){
'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const get=(k,d)=>{try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch{return d}},set=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
const H=()=>window.HUB,toast=(m,f,l)=>{try{(H()?.toast||window.toast)?.(m,f,l)}catch{}};
const cfg=()=>Object.assign({tasks:false,ph:true,pc:!/Android|iPhone|iPad/.test(navigator.userAgent)},get('appshell:remcfg',{})),setCfg=p=>set('appshell:remcfg',Object.assign(cfg(),p));
const topic=()=>get('appshell:ntfy',{}).topic||'';
const list=()=>get('appshell:rem',[]),save=l=>set('appshell:rem',l.slice(-200));
const MAXPH=3*864e5-6e4; // ntfy.sh en çok 3 gün bekletir
const hm=t=>new Date(t).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'});
const when=t=>{const d=new Date(t),n=new Date(),tm=new Date();tm.setDate(n.getDate()+1);const same=(a,b)=>a.toDateString()===b.toDateString();
  return same(d,n)?'Bugün '+hm(t):same(d,tm)?'Yarın '+hm(t):d.toLocaleDateString('tr-TR',{day:'numeric',month:'short'})+' '+hm(t)};
const calm=()=>document.documentElement.dataset.motion==='off'||matchMedia('(prefers-reduced-motion: reduce)').matches;
const ymd=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

/* ── gönderim ── */
const canBr=()=>'Notification' in window,perm=()=>canBr()?Notification.permission:'unsupported';
// service worker (sw.js, sadece bildirim): Android Chrome `new Notification` desteklemez; masaüstünde de daha güvenilir
let swP=null;const sw=()=>swP||(swP=('serviceWorker' in navigator&&isSecureContext)?navigator.serviceWorker.register(new URL('sw.js',location.href).href).then(()=>Promise.race([navigator.serviceWorker.ready,new Promise(r=>setTimeout(()=>r(null),4000))])).catch(e=>{console.warn('sw',e);return null}):Promise.resolve(null));
// gösterir; {ok, why} döner (why: kullanıcıya sade Türkçe sebep)
async function brShow(title,body,tag,url){const p=perm();if(p==='unsupported')return{ok:false,why:'unsup'};if(p!=='granted')return{ok:false,why:p};
  try{const reg=await sw();if(reg?.showNotification){await reg.showNotification(title,{body,tag,renotify:true,icon:'icon.svg',badge:'icon.svg',data:url?{url}:undefined});return{ok:true}}}catch(e){console.warn('sw bildirim',e)}
  try{const n=new Notification(title,{body,tag});n.onclick=()=>{try{url?window.open(url,'_blank','noopener'):window.focus()}catch{}n.close()};return{ok:true}}catch(e){return{ok:false,why:'err',msg:e.message}}}
const WHY={unsup:/iPhone|iPad|iPod/.test(navigator.userAgent)?'iPhone’da tarayıcı bildirimi sadece site Ana Ekran’a eklenince çalışır (Paylaş → Ana Ekrana Ekle). Ya da aşağıdan telefonu ntfy ile bağla.':'Bu tarayıcı bildirim desteklemiyor. Telefon için aşağıdaki ntfy kurulumunu kullan.',
  denied:'Bildirimler bu site için engelli. Adres çubuğundaki kilit/ayar simgesi → Bildirimler → İzin ver, sonra sayfayı yenile.',
  default:'İzin penceresi çıkmadı ya da kapattın. Adres çubuğundaki zil/kilit simgesinden bildirimlere izin ver.',
  err:'Bildirim gösterilemedi.'};
const OKMSG=/Win/.test(navigator.platform)?'Gönderildi ✓ Görmediysen: Windows Ayarlar → Sistem → Bildirimler → tarayıcın açık mı, “Rahatsız etme” kapalı mı?':/Mac/.test(navigator.platform)?'Gönderildi ✓ Görmediysen: Sistem Ayarları → Bildirimler → tarayıcın açık mı, Odak modu kapalı mı?':'Gönderildi ✓ Görmediysen telefonun bildirim ayarlarında tarayıcıya izin ver.';
// ntfy'ye gönder; {ok, how} — how: 'ok' (sunucu aldı) | 'blind' (gönderildi ama cevabı okunamadı) | 'http <kod>' | 'net'
async function ntfyR(text,at,title){const t=topic();if(!t)return{ok:false,how:'konu yok'};
  const q=new URLSearchParams({title:title||'AppShell',tags:'bell'});if(at&&at>Date.now()+15e3)q.set('delay',String(Math.floor(at/1000)));
  const u=`https://ntfy.sh/${encodeURIComponent(t)}?${q}`;
  try{const r=await fetch(u,{method:'POST',body:text});return r.ok?{ok:true,how:'ok'}:{ok:false,how:'http '+r.status}}
  catch{try{await fetch(u,{method:'POST',body:text,mode:'no-cors'});return{ok:true,how:'blind'}}catch{return{ok:false,how:'net'}}}}
async function ntfy(text,at,title){const t=topic();if(!t)return false;
  const q=new URLSearchParams({title:title||'AppShell',tags:'bell'});if(at&&at>Date.now()+15e3)q.set('delay',String(Math.floor(at/1000)));
  const u=`https://ntfy.sh/${encodeURIComponent(t)}?${q}`;
  try{const r=await fetch(u,{method:'POST',body:text});return r.ok}
  catch{try{await fetch(u,{method:'POST',body:text,mode:'no-cors'});return true}catch{return false}}} // CORS yanıtı okunamasa da istek gider

/* ── hatırlatıcı ekle / zamanı gelenleri yak ── */
async function add(text,at,{br=true,ph=cfg().ph&&!!topic()}={}){text=String(text||'').trim().slice(0,300);if(!text)return null;
  const r={id:'R'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),text,at:Math.max(at,Date.now()),br,ph,phSent:false,fired:false};
  if(ph&&r.at-Date.now()<MAXPH)r.phSent=await ntfy(text,r.at,'Hatırlatıcı');
  const l=list();l.push(r);save(l);tick();return r}
function fire(r,late){const body=late?'Kaçırdığın hatırlatıcı · '+when(r.at):'AppShell hatırlatıcı';
  if(r.br)brShow(r.text,body,r.id);toast((late?'⏰ Kaçırdığın: ':'⏰ ')+r.text)}
function tick(){const now=Date.now(),l=list();let ch=false;
  for(const r of l){if(r.ph&&!r.phSent&&!r.fired&&r.at-now<MAXPH&&r.at>now){r.phSent=true;ch=true;ntfy(r.text,r.at,'Hatırlatıcı')} // 3 günden uzak olanlar yaklaşınca telefona gönderilir
    if(!r.fired&&r.at<=now){r.fired=true;ch=true;if(now-r.at<12*36e5)fire(r,now-r.at>9e4)}}
  if(ch)save(l.filter(r=>!r.fired||now-r.at<7*864e5));taskTick();if(el)paintList()}
// saatli görevler: saati gelince tarayıcıya; telefona açılışta zamanlı gönderilir
function taskTick(){if(!cfg().tasks||typeof TK==='undefined'||!TK.ready)return;const d=new Date(),t=ymd(d),done=get('appshell:remtk',{});let ch=false;
  for(const x of TK.list()){if(!x.time||x.status==='done'||TK.dayOf(x)!==t)continue;const[h,m]=x.time.split(':').map(Number),at=new Date(d.getFullYear(),d.getMonth(),d.getDate(),h,m).getTime(),k=x.id+'@'+t;
    if(cfg().ph&&topic()&&!done[k+':ph']&&at>Date.now()+6e4){done[k+':ph']=1;ch=true;ntfy(x.title,at,'Görev · '+x.time)}
    if(!done[k]&&at<=Date.now()&&Date.now()-at<5*6e4){done[k]=1;ch=true;brShow(x.title,'Görev · '+x.time,k);toast('⏰ '+x.title)}}
  if(ch){for(const k in done)if(!k.includes('@'+t))delete done[k];set('appshell:remtk',done)}}
/* ── telefondan bilgisayara: site açıkken (arka sekmede de) ntfy konusunu dinler (SSE) ──
   Hub'ın kendi gönderdikleri (tag bell + bizim başlıklar) atlanır — onları zaten tick gösteriyor.
   Kaçırılanlar: son görülen mesaj kimliği appshell:ntfy.last → since=<id> (ntfy.sh 12 sa saklar). */
let es=null,esT=null;const seen=new Set();
const ours=m=>(m.tags||[]).includes('bell')&&/^(AppShell|Hatırlatıcı|Görev · )/.test(m.title||'');
const isUrl=s=>/^https?:\/\/\S+$/i.test(s);
function incoming(m,late){if(!m||m.event!=='message'||seen.has(m.id))return;seen.add(m.id);
  const n=get('appshell:ntfy',{});set('appshell:ntfy',Object.assign(n,{last:m.id}));if(ours(m))return;
  const txt=String(m.message||(m.attachment?'📎 '+(m.attachment.name||'Dosya'):'')).trim();if(!txt)return;
  const url=isUrl(txt)?txt:m.click||'';
  brShow(m.title||(late?'Telefondan · kaçırdığın':'Telefondan'),txt,'ntfy-'+m.id,url);
  if(!document.hidden)toast('📱 '+txt.slice(0,120),url?()=>window.open(url,'_blank','noopener'):()=>{try{navigator.clipboard.writeText(txt)}catch{}},url?'Aç':'Kopyala')}
function listen(){clearTimeout(esT);try{es?.close()}catch{}es=null;const t=topic();if(!t||!cfg().pc||!window.EventSource)return;
  const last=get('appshell:ntfy',{}).last,t0=Date.now();
  es=new EventSource(`https://ntfy.sh/${encodeURIComponent(t)}/sse?since=${last?encodeURIComponent(last):Math.floor(Date.now()/1000)}`);
  es.onmessage=e=>{let m;try{m=JSON.parse(e.data)}catch{return}incoming(m,Date.now()-t0<3000&&Date.now()/1e3-m.time>90)};
  es.onerror=()=>{if(es?.readyState===2){es=null;esT=setTimeout(listen,30000)}}} // tarayıcı kendisi yeniden bağlanır; tamamen kapanırsa 30 sn sonra
let started=false;
function start(){if(started)return;started=true;if(perm()==='granted')sw();tick();setInterval(tick,15000);listen();document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick()});
  try{if(typeof TK!=='undefined')TK.on(()=>taskTick())}catch{}}

/* ── pencere ── */
let el=null,pick=null,brMsg='',phMsg='';
function chips(){const n=new Date(),ev=new Date(n);ev.setHours(20,0,0,0);const tm=new Date(n);tm.setDate(n.getDate()+1);tm.setHours(9,0,0,0);
  return[['now','Şimdi',Date.now()],['10','10 dk sonra',Date.now()+6e5],['60','1 saat sonra',Date.now()+36e5],...(n<ev?[['eve','Bu akşam 20:00',ev.getTime()]]:[]),['tmr','Yarın 09:00',tm.getTime()],['custom','Saat seç…',0]]}
function paintList(){const box=el?.querySelector('.rm-up');if(!box)return;const up=list().filter(r=>!r.fired).sort((a,b)=>a.at-b.at);
  box.innerHTML=up.length?`<p class="rm-k">Yaklaşanlar</p><ul>${up.map(r=>`<li><span class="rm-t">${esc(when(r.at))}</span><span class="rm-x">${esc(r.text)}</span><span class="rm-ch" title="${r.ph?'Telefona da gidecek':'Sadece bu tarayıcı'}">${r.ph?'📱':''}${r.br?'💻':''}</span><button class="rm-del" data-del="${esc(r.id)}" aria-label="Sil: ${esc(r.text)}" title="Sil${r.ph&&r.phSent?' (telefona zamanlanmış olan ntfy’de kalabilir)':''}">×</button></li>`).join('')}</ul>`:''}
function paint(){const c=cfg(),t=topic(),p=perm(),C=chips();
  el.querySelector('.rm').innerHTML=`<header><h2 id="rmT">Hatırlatıcı</h2><button class="rm-xb" data-close aria-label="Kapat" title="Kapat (Esc)">×</button></header>
    <form class="rm-f"><label class="rm-sr" for="rmIn">Neyi hatırlatayım?</label><input id="rmIn" maxlength="300" placeholder="Neyi hatırlatayım? ör. SAT denemesi, annemi ara" autocomplete="off">
      <div class="rm-c" role="group" aria-label="Ne zaman">${C.map(([k,n])=>`<button type="button" data-w="${k}" aria-pressed="${pick===k}">${n}</button>`).join('')}</div>
      <input type="datetime-local" class="rm-dt" aria-label="Tarih ve saat"${pick==='custom'?'':' hidden'}>
      <div class="rm-to"><span>Nereye:</span>
        <span class="rm-pill">💻 Bu tarayıcı ${p==='granted'?'<em class="ok">açık</em>':p==='denied'?'<em class="no">engelli</em>':p==='unsupported'?'<em class="no">desteklenmiyor</em>':'<button type="button" class="rm-perm" data-perm>İzin ver</button>'}</span>
        <button type="button" class="rm-sm" data-brtest title="Bu tarayıcıya hemen bir deneme bildirimi gönder">Dene</button>
        <button type="button" class="rm-pill rm-tg" data-ph role="switch" aria-checked="${!!(c.ph&&t)}"${t?'':' disabled title="Önce aşağıdan telefonu bağla"'}>📱 Telefonum</button></div>
      <p class="rm-msg" id="rmMsg" role="status" aria-live="polite"${brMsg?'':' hidden'}>${esc(brMsg)}</p>
      <button class="rm-go" type="submit">Hatırlat</button></form>
    <div class="rm-up"></div>
    <details class="rm-set"${t?'':' open'}><summary>${t?'Telefon bağlı · ntfy':'Telefonuna da bildirim gelsin (ücretsiz, 1 dakika)'}</summary>
      <ol><li><b>ntfy</b> uygulamasını indir: <a href="https://play.google.com/store/apps/details?id=io.heckel.ntfy" target="_blank" rel="noopener">Android</a> · <a href="https://apps.apple.com/app/ntfy/id1625396347" target="_blank" rel="noopener">iPhone</a></li>
        <li>Uygulamada <b>+</b> → bu konuya abone ol: <code class="rm-topic">${esc(t||'—')}</code> <button type="button" class="rm-sm" data-copy${t?'':' disabled'}>Kopyala</button>${t?'':'<button type="button" class="rm-sm" data-mk>Konu oluştur</button>'}</li>
        <li><button type="button" class="rm-sm" data-test${t?'':' disabled'}>Test bildirimi gönder</button> — telefonuna “AppShell” bildirimi gelmeli.${t?` <a href="https://ntfy.sh/${esc(encodeURIComponent(t))}" target="_blank" rel="noopener">Mesajları web’de gör ↗</a>`:''}</li>
        <li><b>Telefondan bilgisayara:</b> telefonda tarayıcıyla <code class="rm-topic">ntfy.sh/${esc(t||'konu')}</code> sayfasını aç (Ana Ekrana ekleyebilirsin), alttaki kutuya yaz → gönder. Android’de herhangi bir uygulamada <b>Paylaş → ntfy</b> de olur. Bu site bilgisayarda açıkken (arka sekmede de) bildirim olarak çıkar; link gönderirsen tıklayınca açılır.</li></ol>
      <p class="rm-msg" id="phMsg" role="status" aria-live="polite"${phMsg?'':' hidden'}>${esc(phMsg)}</p>
      <p class="rm-n">Konu adı şifre gibidir; kimseyle paylaşma. Bildirim metni ntfy.sh sunucusundan geçer — şifre ya da özel bilgi yazma. Zamanlı bildirimler en çok 3 gün önceden telefona gönderilir; site kapalı olsa da gelir.</p></details>
    <footer><button type="button" class="rm-tg" data-tasks role="switch" aria-checked="${c.tasks}"><i aria-hidden="true"></i>Saatli görevlerimi de hatırlat</button>${t?`<button type="button" class="rm-tg" data-pc role="switch" aria-checked="${!!c.pc}" title="Site açıkken (arka sekmede de) telefondan bu konuya yazdıkların burada bildirim olur"><i aria-hidden="true"></i>Telefondan gelenleri burada göster</button>`:''}</footer>`;
  paintList();setTimeout(()=>el?.querySelector('#rmIn')?.focus(),30)}
function open(defNow){if(el){el.querySelector('#rmIn')?.focus();return}brMsg='';phMsg='';pick=defNow?'now':'60';el=document.createElement('div');el.className='rm-bg';el.innerHTML='<section class="rm" role="dialog" aria-modal="true" aria-labelledby="rmT"></section>';
  document.body.appendChild(el);paint();if(!calm())requestAnimationFrame(()=>el&&el.classList.add('on'));else el.classList.add('on');
  el.addEventListener('click',onClick);el.addEventListener('submit',onSubmit);addEventListener('keydown',onKey,true)}
function close(){if(!el)return;const w=el;el=null;removeEventListener('keydown',onKey,true);w.remove()}
function onKey(e){if(e.key==='Escape'&&el){e.stopPropagation();close()}}
async function onClick(e){if(e.target===el)return close();const b=e.target.closest('button');if(!b)return;
  if(b.matches('[data-close]'))return close();
  if(b.dataset.w){pick=b.dataset.w;el.querySelectorAll('[data-w]').forEach(x=>x.setAttribute('aria-pressed',x===b));const dt=el.querySelector('.rm-dt');dt.hidden=pick!=='custom';if(pick==='custom'){const d=new Date(Date.now()+36e5);d.setSeconds(0,0);dt.value=new Date(d-d.getTimezoneOffset()*6e4).toISOString().slice(0,16);dt.focus()}return}
  if(b.matches('[data-perm]')){try{await Notification.requestPermission()}catch{}brMsg=perm()==='granted'?'İzin verildi ✓ “Dene” ile bir deneme bildirimi gönderebilirsin.':WHY[perm()]||'';paint();return}
  if(b.matches('[data-brtest]')){if(perm()==='default'){try{await Notification.requestPermission()}catch{}}const r=await brShow('AppShell','Deneme bildirimi — bu tarayıcı çalışıyor 🎉','appshell-test');brMsg=r.ok?OKMSG:(WHY[r.why]||'')+(r.msg?' ('+r.msg+')':'');paint();return}
  if(b.matches('[data-ph]')){setCfg({ph:!cfg().ph});b.setAttribute('aria-checked',cfg().ph&&!!topic());return}
  if(b.matches('[data-pc]')){setCfg({pc:!cfg().pc});b.setAttribute('aria-checked',cfg().pc);listen();return}
  if(b.matches('[data-tasks]')){setCfg({tasks:!cfg().tasks});b.setAttribute('aria-checked',cfg().tasks);if(cfg().tasks)toast('Bugünkü saatli görevlerin saati gelince hatırlatılacak');taskTick();return}
  if(b.matches('[data-mk]')){const r=crypto.getRandomValues(new Uint8Array(9));set('appshell:ntfy',{topic:'appshell-'+[...r].map(x=>x.toString(36).padStart(2,'0')).join('').slice(0,14)});setCfg({ph:true});listen();paint();el.querySelector('.rm-set').open=true;return}
  if(b.matches('[data-copy]')){try{await navigator.clipboard.writeText(topic());b.textContent='Kopyalandı ✓'}catch{prompt('Konu adı:',topic())}return}
  if(b.matches('[data-test]')){b.disabled=true;b.textContent='Gönderiliyor…';const r=await ntfyR('Test bildirimi — telefonun bağlı 🎉',0,'AppShell');
    phMsg=r.how==='ok'?`ntfy mesajı aldı ✓ Telefona gelmediyse: ntfy uygulamasında “${topic()}” konusuna abone olduğundan (sunucu: ntfy.sh) ve uygulamanın bildirim izni açık olduğundan emin ol. “Mesajları web’de gör”de mesajı görebilirsin.`
      :r.how==='blind'?`Gönderildi (cevap okunamadı). Gelmediyse “Mesajları web’de gör”e bak: mesaj oradaysa sorun telefondaki abonelikte.`
      :r.how==='net'?'ntfy.sh’ye ulaşılamadı — internetini ya da reklam engelleyicini kontrol et.':`ntfy hata verdi (${r.how}). Biraz sonra tekrar dene.`;
    paint();el.querySelector('.rm-set').open=true;return}
  if(b.dataset.del){save(list().filter(r=>r.id!==b.dataset.del));paintList()}}
async function onSubmit(e){e.preventDefault();const inp=el.querySelector('#rmIn'),text=inp.value.trim();if(!text)return inp.focus();
  let at=chips().find(c=>c[0]===pick)?.[2]||Date.now()+36e5;if(pick==='custom'){const v=el.querySelector('.rm-dt').value;at=v?new Date(v).getTime():0;if(!at||at<Date.now()-6e4){el.querySelector('.rm-dt').focus();return}}
  const br=perm()==='granted'||pick==='now';if(perm()==='default'&&canBr()){try{await Notification.requestPermission()}catch{}}
  const r=await add(text,at,{br,ph:cfg().ph&&!!topic()});if(!r)return;inp.value='';
  toast(pick==='now'?(r.ph?'Telefonuna gönderildi':'Gönderildi'):`Hatırlatılacak: ${when(r.at)}${r.ph?' · telefona da':''}`);if(el)paint()}

window.Notify={start,open,close,add,send:(t,o)=>add(t,Date.now(),o)};
// hub bu dosya yüklenmeden açıldıysa (hızlı açılış) kendin başla
if(window.HUB?.booted?.())start();
})();
