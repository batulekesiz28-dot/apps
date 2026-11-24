/* AppShell OS özellikleri — dev şirketlerin en çok kullanılan sistem özelliklerinden uyarlandı (docs/OS.md):
   1 Gece ışığı (Windows Night light · Apple Night Shift · Samsung Göz konforu)   appshell:night {on,auto,from,to,k}
   2 Sıcak köşeler (macOS Hot Corners; sağ alt varsayılan Hızlı not, Apple'daki gibi) appshell:corners {tl,tr,bl,br}
   3 Pano geçmişi + evrensel pano (Windows Win+V · Apple Universal Clipboard · Samsung Pano) appshell:clip, bulut hub/clip, Alt+V
   4 Ekran süresi + uygulama sınırı (Apple Ekran Süresi · Samsung Dijital Denge)  appshell:usage {gün:{slug:sn}}, appshell:limits
   5 Odak modları (Apple Focus · Samsung Modlar): Çalışma / Uyku / Kişisel — rahatsız etme + izinli uygulamalar   appshell:focus
   6 Rutinler (Samsung Modes & Routines · Apple Kestirmeler otomasyonu): saat + gün → işlem   appshell:routines
   7 Bildirim özeti (Apple Zamanlanmış özet): odak bitince sessiz gelenlerin özeti adada
   8 Performans katmanı (NVIDIA uygulaması / FrameView): FPS, %1 düşük, kare süresi, uzun görev, bellek — Alt+R   appshell:perfov
   9 Kenar paneli (Samsung Edge Panel): sağ kenardaki tutamak → en çok kullandığın uygulamalar + araçlar   appshell:edge
  10 Devam et (Apple Handoff · Samsung başka cihazda devam): başka cihazda açık olan uygulama adada “Devam et”   bulut hub/handoff
   Hub'a köprü: window.HUB (cur, frames, cloud, home, switcher, open, find, icon, alert, flash, apps…). Giriş: Kontrol merkezi (kutucuklar + alt sıra),
   Ctrl+K komutları, kısayollar Alt+V (pano) · Alt+R (performans) · Alt+E (kenar paneli). Hepsi bu cihazda yerel; pano ve “devam et” girişliyken buluta da yazar. */
(()=>{'use strict';
const H=()=>window.HUB,$=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const get=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k));return v??d}catch{return d}},set=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const off=()=>document.documentElement.dataset.motion==='off'||matchMedia('(prefers-reduced-motion: reduce)').matches;
const anim=(el,kf,o)=>(!el||off())?{finished:Promise.resolve()}:el.animate(kf,o);
const pad=n=>String(n).padStart(2,'0'),dk=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()),hm=d=>pad(d.getHours())+':'+pad(d.getMinutes());
const mins=s=>{const[a,b]=String(s||'0:0').split(':').map(Number);return a*60+(b||0)},nowM=()=>{const d=new Date();return d.getHours()*60+d.getMinutes()};
const inRange=(a,b)=>{const n=nowM(),A=mins(a),B=mins(b);return A<=B?n>=A&&n<B:n>=A||n<B};
const FINE=matchMedia('(hover:hover) and (pointer:fine)').matches;
const fmtM=s=>{const m=Math.round(s/60);return m<60?m+' dk':Math.floor(m/60)+' sa '+(m%60?m%60+' dk':'')};
const appBy=slug=>(H()?.apps?.()||[]).find(a=>a.slug===slug);
const dnd=v=>window.OS?.dnd?.(v);
const SV=(p)=>`<svg viewBox="0 0 16 16" aria-hidden="true">${p}</svg>`;
const IC={night:'<path d="M12.5 10.2A5.3 5.3 0 1 1 5.8 3.5a4.2 4.2 0 0 0 6.7 6.7z"/><path d="M11.5 2.5v2M10.5 3.5h2"/>',focus:'<circle cx="8" cy="8" r="5.5"/><circle cx="8" cy="8" r="2" fill="currentColor" stroke="none"/>',
  perf:'<path d="M2 12.5a6 6 0 0 1 12 0"/><path d="M8 12.5l3-4.5"/>',clip:'<rect x="4" y="3" width="8" height="11" rx="1.5"/><path d="M6 3V2h4v1"/>',time:'<path d="M8 4.5V8l2.5 1.5"/><circle cx="8" cy="8" r="5.5"/>',
  rt:'<path d="M3 5h7M3 11h10M12 3l2 2-2 2M10 9l2 2-2 2"/>',corner:'<path d="M2.5 6.5v-4h4M13.5 9.5v4h-4"/>',edge:'<rect x="2.5" y="2.5" width="11" height="11" rx="2"/><path d="M10.5 5v6"/>',hand:'<rect x="1.5" y="3" width="8" height="6.5" rx="1"/><rect x="11" y="5" width="3.5" height="7" rx=".8"/><path d="M3.5 12h4"/>'};

/* ═════ 1) Gece ışığı ═════ */
const NC=()=>({on:false,auto:false,from:'21:00',to:'07:00',k:.5,...get('appshell:night',{})});
const nightOn=()=>{const c=NC();return c.on||(c.auto&&inRange(c.from,c.to))||FO()?.m==='uyku'};
function paintNight(){let o=$('#oxNight');if(!o){o=document.createElement('div');o.id='oxNight';o.setAttribute('aria-hidden','true');document.body.appendChild(o)}
  const c=NC();o.style.opacity=nightOn()?(.12+c.k*.38).toFixed(3):'0'}
function setNight(p){set('appshell:night',{...NC(),...p});paintNight();H()?.flash?.({ic:'☀',t:nightOn()?'Gece ışığı':'Gece ışığı kapalı',v:nightOn()?'açık':'',c:'#F59E0B'})}

/* ═════ 2) Sıcak köşeler ═════ */
const ACT={'':'Hiçbiri',note:'Hızlı not',cc:'Kontrol merkezi',sw:'Uygulama değiştirici',pal:'Komut paleti',home:'Masaüstüne dön',calm:'Sakin mod',night:'Gece ışığı',time:'Ekran süresi',clip:'Pano geçmişi',edge:'Kenar paneli'};
const CC=()=>({tl:'',tr:'',bl:'',br:'note',...get('appshell:corners',{})});
function doAct(a){const h=H();if(!h)return;({note:()=>h.openNotes('#new'),cc:()=>window.OS?.open(),sw:()=>h.switcher(),pal:()=>h.palette(),home:()=>h.home(),calm:()=>h.calm(!h.calmOn()),
  night:()=>setNight({on:!nightOn()}),time:()=>open('ekran'),clip:()=>open('pano'),edge:()=>edgeOpen()}[a]||(()=>{}))()}
function corners(){if(!FINE)return;$$('.ox-k').forEach(e=>e.remove());const c=CC();
  for(const k of ['tl','tr','bl','br']){if(!c[k])continue;const e=document.createElement('i');e.className='ox-k ox-'+k;e.setAttribute('aria-hidden','true');let t=0;
    e.addEventListener('pointerenter',ev=>{if(ev.buttons)return;t=setTimeout(()=>{const r=document.createElement('i');r.className='ox-kr ox-'+k;document.body.appendChild(r);anim(r,[{opacity:.7,scale:'.2'},{opacity:0,scale:'1'}],{duration:520,easing:'ease-out'}).finished.then(()=>r.remove());doAct(c[k])},160)});
    e.addEventListener('pointerleave',()=>clearTimeout(t));document.body.appendChild(e)}}

/* ═════ 3) Pano geçmişi (+ evrensel pano) ═════ */
const CK='appshell:clip';let clipDoc=null,clipRemote=[];
function clipAll(){const L=get(CK,[]),seen=new Set(L.map(x=>x.t));return[...L,...clipRemote.filter(x=>!seen.has(x.t))].sort((a,b)=>(b.pin?1:0)-(a.pin?1:0)||b.at-a.at)}
function clipAdd(t,src){t=String(t||'').trim();if(!t||t.length>5000)return;const L=get(CK,[]).filter(x=>x.t!==t);L.unshift({t,at:Date.now(),src:src||'',dev:DEV.n});
  const keep=[...L.filter(x=>x.pin),...L.filter(x=>!x.pin).slice(0,25)];set(CK,keep);clipPush();if($('.ox-bg[data-v=pano]'))render()}
function clipPush(){if(!clipDoc||get('appshell:clipSync',true)===false)return;const L=get(CK,[]).slice(0,10).map(x=>({t:x.t.slice(0,2000),at:x.at,src:x.src,dev:x.dev||DEV.n}));
  clipDoc.set({['d_'+DEV.id]:L},{merge:true}).catch(()=>{})}
function onCopy(doc,src){return e=>{const a=doc.activeElement;if(a&&a.type==='password')return; // şifre alanı asla kaydedilmez
  let t='';try{t=(a&&/INPUT|TEXTAREA/.test(a.tagName)&&a.selectionStart!=null)?a.value.slice(a.selectionStart,a.selectionEnd):doc.getSelection().toString()}catch{}if(t)clipAdd(t,src)}}
function hookDoc(doc,src){if(!doc||doc.__ox)return;doc.__ox=1;const f=onCopy(doc,src);doc.addEventListener('copy',f,true);doc.addEventListener('cut',f,true);doc.addEventListener('keydown',keys,true)}
function hookFrames(){hookDoc(document,'Ana ekran');for(const fr of H()?.frames?.()||[]){try{const d=fr.contentDocument;if(d&&d.readyState!=='loading'){const n=(H()?.apps?.()||[]).find(a=>fr.src&&fr.src.includes('/apps/'+a.slug+'/'))?.name||'';hookDoc(d,n)}}catch{}}}
async function clipCopy(t){try{await navigator.clipboard.writeText(t);H()?.toast?.('Panoya kopyalandı — yapıştırabilirsin')}catch{const x=document.createElement('textarea');x.value=t;document.body.appendChild(x);x.select();document.execCommand('copy');x.remove();H()?.toast?.('Panoya kopyalandı')}}

/* ═════ 4) Ekran süresi ═════ */
const UK='appshell:usage';let lastTick=Date.now();
function useTick(){const now=Date.now(),dt=Math.min(30,(now-lastTick)/1000);lastTick=now;if(document.visibilityState!=='visible'||!document.hasFocus())return;
  const c=H()?.cur?.();if(!c)return;const k=c.open&&c.slug?c.slug:'_home',d=dk(new Date()),U=get(UK,{});(U[d]=U[d]||{})[k]=(U[d][k]||0)+dt;
  const ks=Object.keys(U).sort();while(ks.length>35)delete U[ks.shift()];set(UK,U);
  const lim=get('appshell:limits',{})[k];if(lim&&U[d][k]>=lim*60){const hit=get('appshell:limitHit',{});if(hit.d!==d){hit.d=d;hit.k={}}
    if(!hit.k[k]){hit.k[k]=1;set('appshell:limitHit',hit);const a=appBy(k);H()?.alert?.({ic:'⏳',t:`${a?.name||'Uygulama'} için bugünkü süren doldu`,sub:`Bugün ${fmtM(U[d][k])} kullandın · sınır ${lim} dk`,key:'lim'+k,sys:1,
      acts:[['15 dk daha',()=>{const L=get('appshell:limits',{});L[k]=Math.ceil(U[d][k]/60)+15;set('appshell:limits',L);const h2=get('appshell:limitHit',{});if(h2.k)delete h2.k[k];set('appshell:limitHit',h2)}],['Ana ekrana dön',()=>H()?.home(),1]]})}}}
const usageDay=d=>get(UK,{})[d]||{},sum=o=>Object.values(o).reduce((a,b)=>a+b,0);

/* ═════ 5) Odak modları ═════ */
const MODES={calis:{n:'Çalışma',ic:'💼',d:'Bildirimler sessiz, sadece izin verdiğin uygulamalar',def:['notlar','studylog','saat','denetci','istatistik']},uyku:{n:'Uyku',ic:'🌙',d:'Bildirimler sessiz, gece ışığı açık',def:[]},kisisel:{n:'Kişisel',ic:'🙂',d:'Bildirimler sessiz, her şey açık',def:[]}};
const FO=()=>{const f=get('appshell:focus',{});return f.m&&MODES[f.m]?f:null};
const allowed=m=>{const f=get('appshell:focus',{});return(f.apps&&f.apps[m])||MODES[m].def};
function setFocus(m){const f=get('appshell:focus',{});f.m=m||null;f.at=Date.now();set('appshell:focus',f);dnd(!!m);paintNight();
  H()?.flash?.(m?{ic:MODES[m].ic,t:MODES[m].n+' odağı',v:'açık',c:'#A78BFA'}:{ic:'○',t:'Odak kapalı',c:'#A1A1AA'});H()?.island?.()}
let bypass=false;
function gate(a,cont){const f=FO();if(!f||bypass||!a){bypass=false;return true}const L=allowed(f.m);if(!L.length||L.includes(a.slug)||a.slug==='denetci')return true;
  H()?.alert?.({ic:MODES[f.m].ic,t:`${MODES[f.m].n} odağındasın`,sub:`${a.name} bu odakta izinli değil`,key:'gate',sys:1,acts:[['Vazgeç',()=>{}],['Yine de aç',()=>{bypass=true;cont()},1]]});return false}

/* ═════ 6) Rutinler ═════ */
const RACT={'focus:calis':'Çalışma odağını aç','focus:uyku':'Uyku odağını aç','focus:kisisel':'Kişisel odağı aç','focus:off':'Odağı kapat','night:on':'Gece ışığını aç','night:off':'Gece ışığını kapat','dark':'Karanlık tema','light':'Açık tema','dnd:on':'Rahatsız etmeyi aç','dnd:off':'Rahatsız etmeyi kapat','open:p:notlar':'Notlar\'ı aç','open:p:studylog':'Study Log\'u aç','open:p:haberler':'Haberler\'i aç'};
const DAYS=['Pz','Pt','Sa','Ça','Pe','Cu','Ct'];
function runAct(a){const h=H();if(!h)return;if(a.startsWith('focus:'))setFocus(a==='focus:off'?null:a.slice(6));else if(a==='night:on')setNight({on:true});else if(a==='night:off')setNight({on:false,auto:false});
  else if(a==='dark')h.setTheme(get('appshell:lastDark','dark'));else if(a==='light')h.setTheme(get('appshell:lastLight','light'));else if(a==='dnd:on')dnd(true);else if(a==='dnd:off')dnd(false);else if(a.startsWith('open:'))h.open(a.slice(5))}
function rtTick(){const d=new Date(),day=dk(d),wd=d.getDay(),n=nowM(),last=get('appshell:rtLast',{});let ch=false;
  for(const r of get('appshell:routines',[])){if(!r.on||!r.days?.includes(wd)||last[r.id]===day)continue;const A=mins(r.at);if(n>=A&&n-A<15){last[r.id]=day;ch=true;runAct(r.act);H()?.flash?.({ic:'⚙',t:'Rutin',v:r.at,sub:RACT[r.act],c:'#38BDF8',ms:3200})}}
  if(ch)set('appshell:rtLast',last)}

/* ═════ 7) Bildirim özeti ═════ */
let wasDnd=null;
function sumTick(){const on=!!get('appshell:dnd',false);if(wasDnd&&!on){const at=get('appshell:dndAt',0),L=get('appshell:notifs',[]).filter(x=>x.at>at);
    if(L.length)setTimeout(()=>H()?.alert?.({ic:'📬',t:`Sen odaktayken ${L.length} bildirim geldi`,sub:L.slice(0,2).map(x=>x.t).join(' · '),key:'sum',sys:1,ms:12000,acts:[['Kapat',()=>{}],['Göster',()=>window.OS?.open(),1]]}),600)}
  wasDnd=on}

/* ═════ 8) Performans katmanı ═════ */
let pf=null;
function perfOn(v){if(v==null)return!!pf;set('appshell:perfov',!!v);if(!v){pf?.el.remove();pf?.po?.disconnect();cancelAnimationFrame(pf?.raf);pf=null;return}if(pf)return;
  const el=document.createElement('div');el.id='oxPerf';el.setAttribute('aria-hidden','true');document.body.appendChild(el);pf={el,fr:[],lt:[],raf:0,last:0,paint:0};
  try{pf.po=new PerformanceObserver(l=>l.getEntries().forEach(e=>pf&&pf.lt.push([performance.now(),e.duration])));pf.po.observe({type:'longtask'})}catch{}
  const loop=t=>{if(!pf)return;if(pf.last)pf.fr.push(t-pf.last);pf.last=t;if(pf.fr.length>240)pf.fr.splice(0,pf.fr.length-240);
    if(t-pf.paint>500){pf.paint=t;const a=pf.fr.slice(-120),s=[...a].sort((x,y)=>y-x),avg=a.reduce((x,y)=>x+y,0)/(a.length||1),low=s[Math.floor(s.length*.01)]||avg,now=performance.now();pf.lt=pf.lt.filter(x=>now-x[0]<5000);
      const mem=performance.memory?Math.round(performance.memory.usedJSHeapSize/1048576)+' MB':'—',tier=['Tam','Dengeli','Hafif'][H()?.tier?.()??0]||'—',fps=Math.round(1000/avg);
      el.innerHTML=`<b class="${fps<45?'w':''}${fps<28?' b':''}">${fps}<small>FPS</small></b><span>%1 düşük <i>${Math.round(1000/low)}</i></span><span>kare <i>${avg.toFixed(1)} ms</i></span><span>uzun görev <i>${pf.lt.length}</i></span><span>bellek <i>${mem}</i></span><span>kalite <i>${tier}</i></span><span>açık <i>${H()?.tabs?.()||0}</i></span>`}
    pf.raf=requestAnimationFrame(loop)};pf.raf=requestAnimationFrame(loop)}

/* ═════ 9) Kenar paneli ═════ */
const EC=()=>({on:true,...get('appshell:edge',{})});
function edgeHandle(){let h=$('#oxEdge');if(!EC().on){h?.remove();return}if(h)return;h=document.createElement('button');h.id='oxEdge';h.className='ox-eh';h.setAttribute('aria-label','Kenar paneli (Alt+E)');h.title='Kenar paneli · Alt+E';
  document.body.appendChild(h);let t=0,sx=null;h.addEventListener('click',()=>edgeOpen());
  if(FINE){h.addEventListener('pointerenter',()=>{t=setTimeout(edgeOpen,260)});h.addEventListener('pointerleave',()=>clearTimeout(t))}
  h.addEventListener('pointerdown',e=>{sx=e.clientX});addEventListener('pointerup',e=>{if(sx!=null&&sx-e.clientX>24)edgeOpen();sx=null})}
function topApps(n){const U=get(UK,{}),tot={};for(const d of Object.keys(U).slice(-7))for(const[k,v]of Object.entries(U[d]))if(k!=='_home')tot[k]=(tot[k]||0)+v;
  const all=(H()?.apps?.()||[]).filter(a=>!a.hidden);const by=Object.keys(tot).sort((a,b)=>tot[b]-tot[a]).map(appBy).filter(Boolean);return[...new Set([...by,...all])].slice(0,n)}
function edgeOpen(){if($('.ox-edge'))return edgeClose();const p=document.createElement('aside');p.className='ox-edge';p.setAttribute('role','dialog');p.setAttribute('aria-label','Kenar paneli');
  const T=H()?.tabList?.()||[];
  p.innerHTML=`${T.length?`<p class="ox-el">Açık</p><div class="ox-eg">${T.map(t=>{const m=H()?.icon?.(t.app)||{};return`<button data-eo="${esc(t.key)}" title="${esc(t.name)}"><span class="mini" style="${m.style||''}">${m.html||''}</span><small>${esc(t.name)}</small></button>`}).join('')}</div>`:''}<p class="ox-el">Uygulamalar</p><div class="ox-eg">${topApps(8).map(a=>{const m=H()?.icon?.(a)||{};return`<button data-ea="${esc(a.key||'p:'+a.slug)}" title="${esc(a.name)}"><span class="mini" style="${m.style||''}">${m.html||''}</span><small>${esc(a.name)}</small></button>`}).join('')}</div>
    <p class="ox-el">Araçlar</p><div class="ox-et">${[['note','Hızlı not',IC.rt],['clip','Pano',IC.clip],['time','Ekran süresi',IC.time],['night','Gece ışığı',IC.night],['cc','Kontrol merkezi',IC.edge],['perf','Performans',IC.perf]].map(([k,l,i])=>`<button data-et="${k}" class="${(k==='night'&&nightOn())||(k==='perf'&&pf)?'on':''}">${SV(i)}<span>${l}</span></button>`).join('')}</div>`;
  document.body.appendChild(p);anim(p,[{translate:'110% 0',opacity:.6},{translate:'0 0',opacity:1}],{duration:420,easing:'cubic-bezier(.3,1.15,.5,1)'});
  p.addEventListener('click',e=>{const o=e.target.closest('[data-eo]');if(o){edgeClose();H()?.go(o.dataset.eo);return}const a=e.target.closest('[data-ea]');if(a){edgeClose();H()?.open(a.dataset.ea);return}const t=e.target.closest('[data-et]')?.dataset.et;if(!t)return;
    if(t==='perf'){perfOn(!pf);edgeClose();return}edgeClose();doAct(t)});
  if(FINE){let lt=0;p.addEventListener('pointerleave',()=>{lt=setTimeout(edgeClose,450)});p.addEventListener('pointerenter',()=>clearTimeout(lt))}
  setTimeout(()=>addEventListener('pointerdown',outE,true),0)}
const outE=e=>{if(!e.target.closest('.ox-edge,#oxEdge'))edgeClose()};
function edgeClose(){const p=$('.ox-edge');removeEventListener('pointerdown',outE,true);if(!p)return;anim(p,[{translate:'0 0',opacity:1},{translate:'110% 0',opacity:0}],{duration:240,easing:'ease-in'}).finished.then(()=>p.remove())}

/* ═════ 10) Devam et (Handoff) ═════ */
const DEV=(()=>{let id=get('appshell:devid','');if(!id){id=Math.random().toString(36).slice(2,10);set('appshell:devid',id)}const ua=navigator.userAgent;
  return{id,n:/iPad|Tablet/i.test(ua)?'Tablet':/Mobi|Android|iPhone/i.test(ua)?'Telefon':'Bilgisayar'}})();
let hoDoc=null,hoLast='',hoSeen=get('appshell:hoSeen',{});
function hoTick(){if(!hoDoc)return;const c=H()?.cur?.();const k=c?.open?c.key:'';if(k===hoLast)return;hoLast=k;
  hoDoc.set({['d_'+DEV.id]:{n:DEV.n,k:k||null,name:c?.name||null,at:Date.now()}},{merge:true}).catch(()=>{})}
function hoSeeOthers(data){const c=H()?.cur?.();for(const[f,v]of Object.entries(data||{})){if(f==='d_'+DEV.id||!v?.k||Date.now()-v.at>10*6e4)continue;if(c?.open&&c.key===v.k)continue;
    const sig=f+v.at;if(hoSeen[sig])continue;hoSeen[sig]=1;set('appshell:hoSeen',Object.fromEntries(Object.entries(hoSeen).slice(-30)));
    H()?.alert?.({ic:'↗',t:`${v.n}'da ${v.name} açık`,sub:'Kaldığın yerden burada devam et',key:'ho',sys:1,ms:15000,acts:[['Kapat',()=>{}],['Devam et',()=>H()?.open(v.k),1]]})}}

/* ═════ panel (tek sayfa, sekmeli) ═════ */
const VIEWS={ekran:'Ekran süresi',odak:'Odak',rutin:'Rutinler',pano:'Pano',gece:'Gece ışığı',kose:'Köşeler ve kenar'};
let cur='ekran';
function open(v){cur=VIEWS[v]?v:'ekran';let bg=$('.ox-bg');if(!bg){bg=document.createElement('div');bg.className='ox-bg';bg.innerHTML='<section class="ox" role="dialog" aria-modal="true" aria-label="Sistem"></section>';document.body.appendChild(bg);
    bg.addEventListener('click',onClick);bg.addEventListener('change',onChange);bg.addEventListener('input',onChange);addEventListener('keydown',escK,true);
    anim(bg,[{opacity:0},{opacity:1}],{duration:200});anim(bg.firstChild,[{opacity:0,scale:'.96',translate:'0 12px'},{opacity:1,scale:'1',translate:'0 0'}],{duration:380,easing:'cubic-bezier(.3,1.15,.5,1)'})}
  bg.dataset.v=cur;render()}
function close(){const bg=$('.ox-bg');if(!bg)return;removeEventListener('keydown',escK,true);anim(bg,[{opacity:1},{opacity:0}],{duration:180}).finished.then(()=>bg.remove())}
const escK=e=>{if(e.key==='Escape'){e.stopPropagation();close()}};
function render(){const bg=$('.ox-bg');if(!bg)return;const box=bg.firstChild;
  box.innerHTML=`<header class="ox-h"><nav class="ox-tabs" role="tablist">${Object.entries(VIEWS).map(([k,l])=>`<button role="tab" aria-selected="${k===cur}" class="${k===cur?'on':''}" data-v="${k}">${l}</button>`).join('')}</nav><button class="ox-x" data-x aria-label="Kapat">×</button></header><div class="ox-b">${({ekran:vEkran,odak:vOdak,rutin:vRutin,pano:vPano,gece:vGece,kose:vKose}[cur])()}</div>`}
function vEkran(){const d=new Date(),day=dk(d),U=usageDay(day),tot=sum(U),L=get('appshell:limits',{});
  const days=[...Array(7)].map((_,i)=>{const x=new Date(d);x.setDate(d.getDate()-6+i);return[x,sum(usageDay(dk(x)))]}),mx=Math.max(60,...days.map(x=>x[1])),avg=days.slice(0,6).reduce((a,x)=>a+x[1],0)/6;
  const rows=Object.entries(U).sort((a,b)=>b[1]-a[1]);
  return `<div class="ox-big"><b class="num">${fmtM(tot)}</b><span>bugün${avg>60?` · haftalık ortalamadan ${tot>avg?'%'+Math.round((tot/avg-1)*100)+' fazla':'%'+Math.round((1-tot/avg)*100)+' az'}`:''}</span></div>
  <div class="ox-wk" role="img" aria-label="Son 7 gün">${days.map(([x,v],i)=>`<div><i style="height:${Math.max(3,v/mx*64)}px" class="${i===6?'on':''}" title="${fmtM(v)}"></i><small>${['Pz','Pt','Sa','Ça','Pe','Cu','Ct'][x.getDay()]}</small></div>`).join('')}</div>
  ${rows.length?`<ul class="ox-ul">${rows.map(([k,v])=>{const a=appBy(k),m=a?H()?.icon?.(a)||{}:{};return`<li><span class="mini" style="${m.style||''}">${k==='_home'?'⌂':m.html||''}</span><b>${esc(k==='_home'?'Ana ekran':a?.name||k)}</b><i class="ox-bar"><i style="width:${(v/rows[0][1]*100).toFixed(1)}%"></i></i><span class="num">${fmtM(v)}</span>
    ${k==='_home'?'<span></span>':`<select data-lim="${esc(k)}" aria-label="${esc(a?.name||k)} günlük sınırı">${[0,15,30,60,90,120,180].map(n=>`<option value="${n}"${(L[k]||0)===n?' selected':''}>${n?n+' dk sınır':'Sınır yok'}</option>`).join('')}</select>`}</li>`}).join('')}</ul>`
  :'<p class="ox-e">Henüz ölçüm yok. Uygulamaları kullandıkça burada gün gün ne kadar zaman geçirdiğin görünür.</p>'}
  <p class="ox-n">Sadece bu cihazda, sekme öndeyken ölçülür. Sınır dolunca adada uyarı çıkar.</p>`}
function vOdak(){const f=FO(),apps=(H()?.apps?.()||[]).filter(a=>a.slug&&a.slug!=='denetci'&&!a.hidden);
  return `<div class="ox-modes">${Object.entries(MODES).map(([k,m])=>`<button class="ox-mode${f?.m===k?' on':''}" data-fm="${k}" aria-pressed="${f?.m===k}"><span class="e">${m.ic}</span><b>${m.n}</b><small>${m.d}</small></button>`).join('')}</div>
  ${f?`<button class="ox-btn" data-fm="">Odağı kapat</button>`:''}
  <p class="ox-l">Çalışma odağında izinli uygulamalar</p><div class="ox-chips">${apps.map(a=>`<button class="ox-chip${allowed('calis').includes(a.slug)?' on':''}" data-fa="${esc(a.slug)}" aria-pressed="${allowed('calis').includes(a.slug)}">${esc(a.name)}</button>`).join('')}</div>
  <p class="ox-n">Odak açıkken bildirimler sessizce Kontrol merkezinde birikir; odak bitince adada özetini görürsün. İzinli olmayan bir uygulamayı açarken sorulur. Otomatik açıp kapatmak için Rutinler.</p>`}
function vRutin(){const R=get('appshell:routines',[]);
  return `${R.length?`<ul class="ox-rt">${R.map((r,i)=>`<li class="${r.on?'':'off'}"><label class="ox-sw"><input type="checkbox" data-ron="${i}"${r.on?' checked':''} aria-label="Rutini aç/kapat"><i></i></label>
      <input type="time" value="${esc(r.at)}" data-rat="${i}" aria-label="Saat"><span class="ox-days">${DAYS.map((d,j)=>`<button data-rd="${i}:${j}" class="${r.days.includes(j)?'on':''}" aria-pressed="${r.days.includes(j)}">${d}</button>`).join('')}</span>
      <select data-ract="${i}" aria-label="İşlem">${Object.entries(RACT).map(([k,l])=>`<option value="${k}"${r.act===k?' selected':''}>${l}</option>`).join('')}</select><button class="ox-del" data-rdel="${i}" aria-label="Rutini sil">×</button></li>`).join('')}</ul>`
    :'<p class="ox-e">Rutin yok. Bir saat ve gün seç, o anda sistem kendiliğinden bir şey yapsın.</p>'}
  <p class="ox-l">Hızlı ekle</p><div class="ox-chips"><button class="ox-chip" data-rp="23:00|focus:uyku|0123456">23:00 · Uyku odağı</button><button class="ox-chip" data-rp="07:30|focus:off|0123456">07:30 · Odağı kapat</button><button class="ox-chip" data-rp="09:00|focus:calis|12345">Hafta içi 09:00 · Çalışma</button><button class="ox-chip" data-rp="20:00|dark|0123456">20:00 · Karanlık tema</button><button class="ox-chip" data-rp="12:00|dnd:off|0123456">Boş rutin</button></div>`}
function vPano(){const L=clipAll();
  return `${L.length?`<ul class="ox-cl">${L.map((x,i)=>`<li><button class="ox-ct" data-cc="${i}" title="Kopyala"><span>${esc(x.t.slice(0,240))}</span><small>${esc([x.src,x.dev&&x.dev!==DEV.n?x.dev+"'dan":'',ago(x.at)].filter(Boolean).join(' · '))}</small></button>
      <button class="ox-pin${x.pin?' on':''}" data-cp="${i}" aria-label="${x.pin?'Sabitlemeyi kaldır':'Sabitle'}" title="Sabitle">📌</button><button class="ox-del" data-cd="${i}" aria-label="Sil">×</button></li>`).join('')}</ul><button class="ox-btn" data-cclr>Sabitlenmeyenleri temizle</button>`
    :'<p class="ox-e">Pano boş. Hub ya da bir uygulamada metin kopyaladığında burada birikir (son 25). Alt+V ile açılır.</p>'}
  <label class="ox-row"><span>Evrensel pano<small>Girişliyken son 10 öğe telefonun ve bilgisayarın arasında eşitlenir. Şifre alanlarından kopyalananlar hiç kaydedilmez.</small></span><span class="ox-sw"><input type="checkbox" data-csync${get('appshell:clipSync',true)!==false?' checked':''}><i></i></span></label>`}
const ago=t=>{const m=Math.round((Date.now()-t)/6e4);return m<1?'şimdi':m<60?m+' dk önce':m<1440?Math.round(m/60)+' sa önce':Math.round(m/1440)+' gün önce'};
function vGece(){const c=NC();
  return `<label class="ox-row"><span>Gece ışığı<small>Ekranı sıcak tona çeker, akşam gözü yormaz</small></span><span class="ox-sw"><input type="checkbox" data-ngon${c.on?' checked':''}><i></i></span></label>
  <label class="ox-row"><span>Zamanla<small>${esc(c.from)} – ${esc(c.to)} arası kendiliğinden</small></span><span class="ox-sw"><input type="checkbox" data-ngauto${c.auto?' checked':''}><i></i></span></label>
  <div class="ox-row"><span>Saatler</span><span><input type="time" data-ngfrom value="${esc(c.from)}" aria-label="Başlangıç"> – <input type="time" data-ngto value="${esc(c.to)}" aria-label="Bitiş"></span></div>
  <div class="ox-row"><span>Sıcaklık</span><input type="range" min="0" max="1" step=".05" value="${c.k}" data-ngk aria-label="Sıcaklık"></div>`}
function vKose(){const c=CC(),opt=v=>Object.entries(ACT).map(([k,l])=>`<option value="${k}"${v===k?' selected':''}>${l}</option>`).join('');
  return `<p class="ox-n">${FINE?'İmleci ekranın köşesine götürünce seçtiğin iş yapılır (macOS gibi).':'Sıcak köşeler fareyle çalışır; bu cihazda kenar paneli var.'}</p>
  <div class="ox-kg">${[['tl','Sol üst'],['tr','Sağ üst'],['bl','Sol alt'],['br','Sağ alt']].map(([k,l])=>`<label><span>${l}</span><select data-kc="${k}">${opt(c[k])}</select></label>`).join('')}</div>
  <label class="ox-row"><span>Kenar paneli<small>Sağ kenardaki tutamak: en çok kullandığın uygulamalar ve araçlar (Alt+E)</small></span><span class="ox-sw"><input type="checkbox" data-edge${EC().on?' checked':''}><i></i></span></label>
  <label class="ox-row"><span>Performans katmanı<small>FPS, kare süresi, takılma ve bellek — köşede küçük göstergeler (Alt+R)</small></span><span class="ox-sw"><input type="checkbox" data-perf${pf?' checked':''}><i></i></span></label>`}
function onClick(e){const t=e.target;if(t.classList.contains('ox-bg')||t.closest('[data-x]'))return close();
  const v=t.closest('[data-v]');if(v&&v.closest('.ox-tabs')){cur=v.dataset.v;$('.ox-bg').dataset.v=cur;render();return}
  const fm=t.closest('[data-fm]');if(fm){setFocus(fm.dataset.fm===FO()?.m?null:fm.dataset.fm||null);render();return}
  const fa=t.closest('[data-fa]');if(fa){const f=get('appshell:focus',{});f.apps=f.apps||{};const L=new Set(allowed('calis'));L.has(fa.dataset.fa)?L.delete(fa.dataset.fa):L.add(fa.dataset.fa);f.apps.calis=[...L];set('appshell:focus',f);render();return}
  const rd=t.closest('[data-rd]');if(rd){const[i,j]=rd.dataset.rd.split(':').map(Number),R=get('appshell:routines',[]);const s=new Set(R[i].days);s.has(j)?s.delete(j):s.add(j);R[i].days=[...s].sort();set('appshell:routines',R);render();return}
  const rp=t.closest('[data-rp]');if(rp){const[at,act,ds]=rp.dataset.rp.split('|'),R=get('appshell:routines',[]);R.push({id:'r'+Date.now().toString(36),on:true,at,act,days:[...ds].map(Number)});set('appshell:routines',R);render();return}
  const rdel=t.closest('[data-rdel]');if(rdel){const R=get('appshell:routines',[]);R.splice(+rdel.dataset.rdel,1);set('appshell:routines',R);render();return}
  const cc=t.closest('[data-cc]');if(cc){clipCopy(clipAll()[+cc.dataset.cc].t);close();return}
  const cp=t.closest('[data-cp]');if(cp){const x=clipAll()[+cp.dataset.cp],L=get(CK,[]);const y=L.find(z=>z.t===x.t);if(y)y.pin=!y.pin;else L.unshift({...x,pin:true});set(CK,L);render();return}
  const cd=t.closest('[data-cd]');if(cd){const x=clipAll()[+cd.dataset.cd];set(CK,get(CK,[]).filter(z=>z.t!==x.t));clipRemote=clipRemote.filter(z=>z.t!==x.t);clipPush();render();return}
  if(t.closest('[data-cclr]')){set(CK,get(CK,[]).filter(x=>x.pin));clipRemote=[];clipPush();render()}}
function onChange(e){const t=e.target,R=get('appshell:routines',[]);
  if(t.dataset.lim!=null){const L=get('appshell:limits',{});+t.value?L[t.dataset.lim]=+t.value:delete L[t.dataset.lim];set('appshell:limits',L)}
  else if(t.dataset.ron!=null){R[+t.dataset.ron].on=t.checked;set('appshell:routines',R);render()}
  else if(t.dataset.rat!=null&&e.type==='change'){R[+t.dataset.rat].at=t.value;set('appshell:routines',R)}
  else if(t.dataset.ract!=null){R[+t.dataset.ract].act=t.value;set('appshell:routines',R)}
  else if('csync' in t.dataset){set('appshell:clipSync',t.checked);if(t.checked)clipPush()}
  else if('ngon' in t.dataset){setNight({on:t.checked});render()}else if('ngauto' in t.dataset){setNight({auto:t.checked});render()}
  else if('ngfrom' in t.dataset&&e.type==='change'){setNight({from:t.value});render()}else if('ngto' in t.dataset&&e.type==='change'){setNight({to:t.value});render()}
  else if('ngk' in t.dataset){set('appshell:night',{...NC(),k:+t.value});paintNight()}
  else if(t.dataset.kc){const c=CC();c[t.dataset.kc]=t.value;set('appshell:corners',c);corners()}
  else if('edge' in t.dataset){set('appshell:edge',{on:t.checked});edgeHandle()}
  else if('perf' in t.dataset)perfOn(t.checked)}

/* ═════ kısayollar, Kontrol merkezi, komutlar ═════ */
function keys(e){if(!e.altKey||e.ctrlKey||e.metaKey)return;const k=e.code;
  if(k==='KeyV'){e.preventDefault();e.stopPropagation();open('pano')}else if(k==='KeyR'){e.preventDefault();e.stopPropagation();perfOn(!pf)}else if(k==='KeyE'){e.preventDefault();e.stopPropagation();edgeOpen()}}
/* ═════ erişilebilirlik / görünüm ayarları (iOS Erişilebilirlik · Samsung Görünürlük): uygulamalara skin.js taşır ═════ */
const A11=()=>({solid:false,contrast:false,zoom:1,...get('appshell:a11y',{})});
function setA11(p){const o={...A11(),...p};set('appshell:a11y',o);paintA11()}
function paintA11(){const o=A11(),r=document.documentElement;r.toggleAttribute('data-solid',!!o.solid);r.toggleAttribute('data-contrast',!!o.contrast);
  // hub kendi zoom'unu almaz (tuval koordinatları bozulur); açık uygulamalara storage olayı gitmez (aynı sekme) → çerçevelere elle uygula
  for(const fr of H()?.frames?.()||[]){try{const d=fr.contentDocument;if(d){d.documentElement.toggleAttribute('data-solid',!!o.solid);d.documentElement.toggleAttribute('data-contrast',!!o.contrast);d.documentElement.style.zoom=o.zoom!==1?String(o.zoom):''}}catch{}}}
const tiles=()=>[{k:'ox-night',ic:IC.night,l:'Gece ışığı',on:nightOn(),s:NC().auto?NC().from+'–'+NC().to:nightOn()?'açık':'kapalı',run:()=>setNight({on:!nightOn()})},
  {k:'ox-focus',ic:IC.focus,l:'Odak',on:!!FO(),s:FO()?MODES[FO().m].n:'kapalı',run:()=>{const order=[null,'calis','uyku','kisisel'],i=order.indexOf(FO()?.m||null);setFocus(order[(i+1)%order.length])}},
  {k:'ox-perf',ic:IC.perf,l:'Performans',on:!!pf,s:'FPS katmanı',run:()=>perfOn(!pf)},
  {k:'ox-solid',ic:'<rect x="2.5" y="2.5" width="11" height="11" rx="2.5" fill="currentColor" opacity=".35"/><rect x="2.5" y="2.5" width="11" height="11" rx="2.5"/>',l:'Saydamlığı azalt',on:A11().solid,s:A11().solid?'açık':'cam yok',run:()=>setA11({solid:!A11().solid})},
  {k:'ox-con',ic:'<circle cx="8" cy="8" r="5.5"/><path d="M8 2.5v11a5.5 5.5 0 0 0 0-11z" fill="currentColor"/>',l:'Yüksek kontrast',on:A11().contrast,s:A11().contrast?'açık':'kapalı',run:()=>setA11({contrast:!A11().contrast})},
  {k:'ox-zoom',ic:'<path d="M2.5 12.5L6 3.5l3.5 9M3.8 9.5h4.4M11 12.5V7M9.5 8.5H13"/>',l:'Yazı boyutu',on:A11().zoom!==1,s:'uygulamalar %'+Math.round(A11().zoom*100),run:()=>{const z=[1,1.1,1.2,1.3,.9],i=z.indexOf(A11().zoom);setA11({zoom:z[(i+1)%z.length]})}}];
const ccRow=()=>`<div class="cc-ox" role="group" aria-label="Sistem">${[['ekran','Ekran süresi',IC.time],['odak','Odak',IC.focus],['rutin','Rutinler',IC.rt],['pano','Pano',IC.clip],['kose','Köşeler',IC.corner]].map(([k,l,i])=>`<button data-osx="${k}">${SV(i)}<span>${l}</span></button>`).join('')}</div>`;
const cmds=ic=>[{ic,l:'Ekran süresi',sub:'Bugün hangi uygulamada ne kadar · günlük sınır',run:()=>open('ekran')},{ic,l:'Odak modu',sub:'Çalışma · Uyku · Kişisel',run:()=>open('odak')},
  {ic,l:'Rutinler',sub:'Saatinde kendiliğinden odak, tema, gece ışığı…',run:()=>open('rutin')},{ic,l:'Pano geçmişi',sub:'Kopyaladıkların · telefonla ortak',k:'⌥V',run:()=>open('pano')},
  {ic,l:'Gece ışığı'+(nightOn()?' ✓':''),sub:'Ekranı sıcak tona çek',run:()=>setNight({on:!nightOn()})},{ic,l:'Performans katmanı'+(pf?' ✓':''),sub:'FPS ve kare süresi',k:'⌥R',run:()=>perfOn(!pf)},
  {ic,l:'Kenar paneli',sub:'En çok kullandığın uygulamalar ve araçlar',k:'⌥E',run:()=>edgeOpen()},{ic,l:'Sıcak köşeler',sub:'Köşeye götürünce iş yap',run:()=>open('kose')}];

/* ═════ başlat ═════ */
function cloud(){const fs=H()?.cloud?.();if(!fs||clipDoc)return;try{
  clipDoc=fs.collection('hub').doc('clip');clipDoc.onSnapshot(d=>{const D=d.data()||{};clipRemote=Object.entries(D).filter(([k])=>k!=='d_'+DEV.id).flatMap(([,v])=>Array.isArray(v)?v:[]).slice(0,30);if($('.ox-bg[data-v=pano]'))render()},()=>{});
  hoDoc=fs.collection('hub').doc('handoff');hoDoc.onSnapshot(d=>hoSeeOthers(d.data()),()=>{})}catch{}}
function start(){if(window.OSX.started)return;window.OSX.started=true;paintNight();paintA11();corners();edgeHandle();if(get('appshell:perfov',false))perfOn(true);hookDoc(document,'Ana ekran');
  setInterval(()=>{useTick();hookFrames();if(A11().zoom!==1||A11().solid||A11().contrast)paintA11();hoTick();sumTick();if(!H()?.cloud?.()||!clipDoc)cloud()},10000);setInterval(()=>{rtTick();paintNight()},20000);setTimeout(()=>{rtTick();sumTick();cloud();hookFrames()},1500)}
window.OSX={open,close,gate,tiles,ccRow,cmds,focus:()=>{const f=FO();return f?{m:f.m,...MODES[f.m]}:null},night:v=>v==null?nightOn():setNight({on:v}),perf:perfOn,edge:edgeOpen,clip:clipAll,usage:usageDay,start};
if(document.readyState==='loading')addEventListener('DOMContentLoaded',start);else start();
})();
