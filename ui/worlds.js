/* AppShell — Arayüz dünyaları.
   Aynı veri (uygulamalar, bugün, notlar, çalışma), bambaşka arayüz sistemleri; her birinde imleç sahneyi canlandırır.
   Galaksi = hub'ın kendisi; diğerleri #world katmanında çizilir, galaksi döngüsü durur.
   Hub köprüsü: window.HUB (index.html sonunda). Seçim: localStorage 'appshell:world'. */
(function(){
'use strict';
const H=()=>window.HUB, KEY='appshell:world';
const WORLDS=[
  ['galaksi','Galaksi','Uzayda yüzen uygulamalar; kara delik imleci içine çeker'],
  ['mekansal','Mekânsal','Derinlikte yüzen cam pencereler; imleç ışık saçar'],
  ['miknatis','Mıknatıs','Sıvı metal damlalar; imleç çeker · sürükle, grupla, widget ekle'],
  ['ruzgar','Rüzgâr','Sarkan rüzgâr çanları; imleç rüzgâr estirir, sallanırlar'],
  ['petek','Petek','Bal peteği; imleç büyüteç gibi yaklaştığını büyütür'],
  ['kum','Kum','Adlar kuma yazılı; imleç taneleri üfler, yazı geri toplanır'],
  ['balon','Balon','İpe bağlı balonlar; imleç iter, çarpışıp süzülürler'],
  ['kadran','Kadran','Saat kadranı; altın ibre imleci izler, gösterdiğini açar'],
  ['deste','Deste','Yelpaze deste; imlecin altındaki kart kalkar, komşular açılır'],
  ['harita','Harita','Topografik harita; imleç arazide tepe kabartır']];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const strip=h=>String(h||'').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ').trim();
const motion=()=>document.documentElement.dataset.motion||'full';
const calmMotion=()=>motion()!=='full'||matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile=()=>innerWidth<760;
const fmt=m=>{m=Math.round(m||0);if(m<60)return m+' dk';const h=Math.floor(m/60),r=m%60;return h+' sa'+(r?' '+r+' dk':'')};
const greet=d=>{const h=d.getHours();return h<5?'İyi geceler':h<11?'Günaydın':h<17?'İyi günler':h<22?'İyi akşamlar':'İyi geceler'};
const trDate=(d,o)=>d.toLocaleDateString('tr-TR',o);
const hm=d=>d.toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'});
const read=()=>{try{return JSON.parse(localStorage.getItem(KEY))||'galaksi'}catch{return'galaksi'}};
/* Her girişte rastgele arayüz (appshell:wrand = '1'): hub açılınca 10 arayüzden biri seçilir — bir önceki girişteki tekrar gelmez.
   Seçilen arayüz KAYDEDİLMEZ (appshell:world değişmez): anahtar kapatılınca kendi seçtiğin arayüz geri gelir, açık diğer sekmeler etkilenmez. */
const RKEY='appshell:wrand',rnd=()=>{try{return localStorage.getItem(RKEY)==='1'}catch{return false}};
// zar düğmesi: her girişte rastgele arayüzü aç/kapat (Galaksi'de üst çubukta #randBtn, diğer arayüzlerde alt menüde)
const DICE='<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2.5" y="2.5" width="11" height="11" rx="3"/><circle cx="5.75" cy="5.75" r=".9"/><circle cx="10.25" cy="5.75" r=".9"/><circle cx="8" cy="8" r=".9"/><circle cx="5.75" cy="10.25" r=".9"/><circle cx="10.25" cy="10.25" r=".9"/></svg>';
const dice=()=>`<button class="wx-dice" data-wrand role="switch" aria-checked="${rnd()}" aria-label="Her girişte rastgele arayüz" title="Her girişte rastgele arayüz">${DICE}</button>`;
function toggleRand(){const on=!rnd();try{on?localStorage.setItem(RKEY,'1'):localStorage.removeItem(RKEY)}catch{}
  document.querySelectorAll('[data-wrand]').forEach(b=>b.setAttribute('aria-checked',on));const tb=document.getElementById('randBtn');if(tb){tb.setAttribute('aria-pressed',on);tb.classList.toggle('on',on)}
  H().toast(on?'Her girişte rastgele bir arayüz açılacak':'Rastgele kapalı — seçtiğin arayüz açılır')}
addEventListener('click',e=>{const b=e.target.closest?.('[data-wrand]');if(!b)return;e.preventDefault();e.stopPropagation();toggleRand()},true);
function randWorld(){let last='';try{last=localStorage.getItem(RKEY+':last')||''}catch{}
  const pool=WORLDS.map(w=>w[0]).filter(w=>w!==last&&w!==cur),w=pool[Math.floor(Math.random()*pool.length)]||'galaksi';try{localStorage.setItem(RKEY+':last',w)}catch{}return w}

/* ── Ortak veri: her dünya aynı şeyi görür ── */
function D(){const h=H(),now=new Date(),k=h.dayKey(now);
  const apps=(h.apps()||[]).map((a,i)=>({key:a.key,name:a.name,desc:a.desc||'',ai:a.ai,i,ic:h.icon(a)}));
  const N=(h.notes()||[]).filter(p=>p&&p.id);
  const daily=N.find(p=>p.tpl==='daily'&&p.date===k),todos=[];
  (daily?.blocks||[]).forEach(b=>{if(b.t==='todo'){const t=strip(b.h);if(t)todos.push({t,done:!!b.c})}});
  N.forEach(p=>{if(p!==daily)(p.blocks||[]).forEach(b=>{if(b.d===k){const t=strip(b.h);if(t)todos.push({t,done:b.t==='todo'&&!!b.c})}})});
  const notes=N.filter(p=>p.tpl!=='daily').sort((a,b)=>(b.updated||0)-(a.updated||0)).slice(0,6)
    .map(p=>({id:p.id,title:strip(p.title)||'Adsız sayfa',icon:p.icon||'',ex:(p.blocks||[]).map(b=>strip(b.h)).find(Boolean)||'',up:p.updated||0}));
  const st=h.study()||{},today=Math.round(h.studyToday()||0),goal=st.goal||0,days=[];
  for(let i=13;i>=0;i--){const d=new Date(now);d.setDate(d.getDate()-i);const dk=h.dayKey(d);
    days.push({d,k:dk,m:i===0?today:Math.round((st.sess||[]).reduce((a,s)=>a+(s.date===dk?s.min||0:0),0))})}
  const items=(h.items()||[]).filter(x=>x.k!=='apps'&&x.k!=='today');
  const focus=items.find(x=>x.k==='focus');
  return{now,apps,groups:(h.groups?h.groups():[])||[],todos,notes,today,goal,days,items,focus,open:todos.filter(t=>!t.done).length,week:days.slice(-7).reduce((a,x)=>a+x.m,0)}}
const ago=t=>{if(!t)return'';const m=Math.round((Date.now()-t)/6e4);return m<1?'az önce':m<60?m+' dk önce':m<1440?Math.round(m/60)+' sa önce':Math.round(m/1440)+' gün önce'};
const appIcon=(a,cls='')=>`<span class="w-ic ${cls}" style="${a.ic.style}">${a.ic.html}</span>`;

/* ═════════════ MEKÂNSAL ═════════════
   visionOS/Horizon'dan: dalma kadranı (Digital Crown), ortamlar, ana görünüm, taşınabilir pencereler, ortala. */
const SPK='appshell:sp',SPD={env:'studyo',imm:.8,last:.8,mode:'halka',off:{}};
const SP={deg:0,f:0,n:1,sel:0,buf:'',G:[],list:[],ang:[],pos:[],
  order(d){const by=new Map(d.apps.map(a=>[a.key,a])),gs=d.groups.map(g=>({id:g.id,name:g.name,color:g.color,apps:g.keys.map(k=>by.get(k)).filter(Boolean)})).filter(g=>g.apps.length),
      seen=new Set(gs.flatMap(g=>g.apps.map(a=>a.key))),rest=d.apps.filter(a=>!seen.has(a.key));
    if(rest.length){const o=gs.find(g=>g.id==='_other');o?o.apps.push(...rest):gs.push({id:'_other',name:gs.length?'Diğer':'Uygulamalar',color:'#8E8E99',apps:rest})}
    const ord=SP.cfg.order||[],ix=k=>{const j=ord.indexOf(k);return j<0?1e4:j};gs.forEach(g=>{const base=g.apps.map(a=>a.key);g.apps.sort((a,b)=>ix(a.key)-ix(b.key)||base.indexOf(a.key)-base.indexOf(b.key))});
    let i=0;gs.forEach((g,gi)=>g.apps.forEach(a=>{a.gi=gi;a.si=i++}));SP.G=gs;SP.list=gs.flatMap(g=>g.apps);SP.sig=JSON.stringify(d.groups);return gs},
  cfg:(()=>{try{return Object.assign({},SPD,JSON.parse(localStorage.getItem(SPK))||{})}catch{return{...SPD}}})(),
  save(){clearTimeout(SP.st);SP.st=setTimeout(()=>{try{localStorage.setItem(SPK,JSON.stringify(SP.cfg))}catch{}},250)},
  ENVS:[['studyo','Stüdyo'],['gece','Gece'],['gol','Gün batımı'],['jupiter','Jüpiter']],
  html:d=>{SP.order(d);return`<div class="sp" data-env="${SP.cfg.env}" data-mode="${SP.cfg.mode}">
    <div class="sp-env" aria-hidden="true"><div class="sp-room"></div>
      <div class="sp-scenery"><div class="env env-studyo"><i class="o1"></i><i class="o2"></i></div>
        <div class="env env-gece"><i class="stars"></i><i class="moon"></i><i class="mtn"></i></div>
        <div class="env env-gol"><i class="sun"></i><i class="mtn"></i><i class="water"></i></div>
        <div class="env env-jupiter"><i class="stars"></i><i class="planet"></i></div>
        <div class="sp-floor"></div></div></div>
    <div class="sp-light" aria-hidden="true"></div>
    <div class="sp-stage"><div class="sp-scene">
      <aside class="sp-side sp-left" data-side="left"><div data-live="today"></div><button class="sp-grab" aria-label="Bugün penceresini taşı (çift tık: yerine koy)" title="Taşı · çift tık: yerine koy"></button></aside>
      <div class="sp-ringw"><div class="sp-shadow" aria-hidden="true"></div><div class="sp-ring" role="listbox" aria-label="Gruplara göre uygulamalar halkası">${SP.list.map((a,i)=>{const g=SP.G[a.gi];return`<button class="sp-win" role="option" data-i="${i}" data-key="${esc(a.key)}" style="--gc:${esc(g.color)}" aria-label="${esc(a.name)} — ${esc(g.name)}"><em class="sp-tag"><i></i>${esc(g.name)}</em><span class="sp-ic">${appIcon(a)}</span><b>${esc(a.name)}</b><small>${esc(a.desc.slice(0,80))}</small></button>`}).join('')}
        ${SP.G.length>1?SP.G.map((g,gi)=>`<button class="sp-gt" data-g="${gi}" style="--gc:${esc(g.color)}" tabindex="-1"><i></i>${esc(g.name)}<small>${g.apps.length}</small></button>`).join(''):''}</div></div>
      <div class="sp-home" role="list" aria-label="Ana görünüm, gruplara göre"><i class="sp-slot" aria-hidden="true"></i>${SP.G.length>1?SP.G.map((g,gi)=>`<p class="sp-gh" data-g="${gi}" style="--gc:${esc(g.color)}" title="${g.id[0]==='_'?'Otomatik grup':'Çift tık: yeniden adlandır'}"><i></i><span>${esc(g.name)}</span></p>`).join(''):''}${SP.list.map((a,i)=>`<button class="sp-hi" role="listitem" data-i="${i}" data-key="${esc(a.key)}" title="${esc(a.desc)}" style="--gc:${esc(SP.G[a.gi].color)}"><span class="sp-hb">${appIcon(a)}</span><b>${esc(a.name)}</b></button>`).join('')}</div>
      <aside class="sp-side sp-right" data-side="right"><div data-live="notes"></div><button class="sp-grab" aria-label="Son sayfalar penceresini taşı (çift tık: yerine koy)" title="Taşı · çift tık: yerine koy"></button></aside></div></div>
    <div class="sp-find" aria-live="polite"></div>
    <div class="sp-hint">${mobile()?'Uzun bas, sürükle: yuvaya otomatik hizalanır':'Uzun bas ya da sürükle: bir yuvaya taşı, otomatik hizalanır · Sağ tık: menü · Grup adına çift tık: yeniden adlandır'}</div>
    <div class="sp-drop" aria-hidden="true">${SP.G.map(g=>`<span data-drop="${esc(g.id)}" style="--gc:${esc(g.color)}"><i></i>${esc(g.name)}</span>`).join('')}<span data-drop="_new">＋ Yeni grup</span></div>
    <div class="sp-cap" aria-live="polite"></div>
    <div class="sp-crown" role="slider" tabindex="0" aria-label="Dalma düzeyi (tıkla: odaya dön / ortama dal)" aria-valuemin="0" aria-valuemax="100" title="Dalma — kaydır, sürükle ya da [ ] tuşları"><i class="cr-fill"></i><i class="cr-rid"></i><span></span></div>
    <div class="sp-envp" role="dialog" aria-label="Ortamlar" hidden><p class="sp-k">Ortam</p>
      <div class="sp-envs">${SP.ENVS.map(([k,n])=>`<button data-env="${k}" aria-pressed="false"><i class="ept ept-${k}"></i><span>${n}</span></button>`).join('')}</div>
      <label class="sp-imm"><span>Dalma</span><input type="range" min="0" max="100" step="1" aria-label="Dalma düzeyi"><b></b></label>
      <button class="sp-recenter" data-sp="center">Ortala <kbd>0</kbd></button></div>
    <nav class="sp-orn" aria-label="Mekânsal gezinme"><button data-rot="-1" class="sp-arr" aria-label="Önceki uygulama" title="Önceki uygulama (←)">‹</button>
      <span class="sp-seg" role="group" aria-label="Görünüm"><button data-sp="halka" aria-pressed="false">Halka</button><button data-sp="izgara" aria-pressed="false">Izgara</button></span>
      <button data-act="ara">Ara</button><button data-act="today">Bugün</button><button data-sp="envp" aria-expanded="false">Ortam</button><button data-act="world">Arayüz</button>${dice()}<button data-rot="1" class="sp-arr" aria-label="Sonraki uygulama" title="Sonraki uygulama (→)">›</button></nav></div>`},
  live:{
    today:d=>{const r=[...d.items.map(x=>[x.t,x.sub]),...d.todos.map(t=>[t.t,t.done?'oldu':'açık'])].slice(0,5);
      return`<div class="sp-glass"><p class="sp-k">Bugün</p><p class="sp-t" data-clock="hm"></p><p class="sp-s">${esc(trDate(d.now,{weekday:'long',day:'numeric',month:'long'}))}</p>
      <div class="sp-ring2" style="--p:${Math.min(1,d.goal?d.today/d.goal:0)}"><span>${fmt(d.today)}</span></div>
      <ul class="sp-l">${r.map(([t,s])=>`<li><span>${esc(t)}</span><small>${esc(s||'')}</small></li>`).join('')||'<li><span>Bugün boş</span></li>'}</ul></div>`},
    notes:d=>`<div class="sp-glass"><p class="sp-k">Son sayfalar</p><ul class="sp-l">${d.notes.slice(0,5).map(n=>`<li><button data-note="${esc(n.id)}"><span>${esc(n.icon)} ${esc(n.title)}</span><small>${ago(n.up)}</small></button></li>`).join('')||'<li><span>Henüz sayfa yok</span></li>'}</ul></div>`},
  /* halka: aynı gruptakiler yan yana, gruplar arası boşluk */
  layout(root){const ws=[...root.querySelectorAll('.sp-win')],n=SP.n=ws.length||1,m=mobile(),w=m?200:250,gap=SP.G.length>1?.7:0,slots=n+gap*SP.G.length,step=SP.step=360/slots,
      R=Math.max(m?230:340,(w+(m?18:46))*slots/(2*Math.PI));
    root.style.setProperty('--R',R+'px');root.style.setProperty('--pw',w+'px');
    let p=0;SP.ang=[];SP.G.forEach(g=>{const a0=p*step;g.apps.forEach(()=>{SP.ang.push(p*step);p++});g.mid=(a0+(p-1)*step)/2;p+=gap});
    ws.forEach((el,i)=>{el.style.transform=`rotateY(${SP.ang[i]}deg) translateZ(${R}px) rotateX(var(--tx,0deg)) rotateY(var(--ty,0deg))`});
    root.querySelectorAll('.sp-gt').forEach(el=>{el.style.transform=`rotateY(${SP.G[+el.dataset.g].mid}deg) translateZ(${R+30}px) translate(-50%,${m?-168:-200}px)`});
    SP.home(root);SP.apply(root);SP.R=R;requestAnimationFrame(()=>SP.fit(root))},
  /* halkayı yan pencerelerin arasına sığdır: gerekirse geriye it */
  fit(root){if(!root.isConnected)return;const sides=[...root.querySelectorAll('.sp-side')].filter(s=>s.offsetParent),cx=innerWidth/2;
    let W=cx-16;if(sides.length&&SP.cfg.mode==='halka'){const l=root.querySelector('.sp-left').getBoundingClientRect(),rr=root.querySelector('.sp-right').getBoundingClientRect(),w=Math.min(cx-l.right,rr.left-cx)-8;if(w>260)W=w}
    if(mobile()){root.style.setProperty('--fz','0px');return}
    const P=1500,R=SP.R,hw=(parseFloat(getComputedStyle(root).getPropertyValue('--pw'))||250)/2,ext=Z=>{let m=0;for(let a=0;a<=92;a+=4){const t=a*Math.PI/180,s=P/(P+Z+R-R*Math.cos(t)),x=(R*Math.sin(t)+hw*Math.cos(t))*s;if(x>m)m=x}return m};
    let Z=0;while(Z<900&&ext(Z)>W)Z+=30;root.style.setProperty('--fz',Z+'px')},
  dist:a=>Math.abs(((a-SP.deg)%360+540)%360-180),
  front:()=>SP.f,
  apply(root){const ring=root.querySelector('.sp-ring');ring.style.transform=`translateZ(calc(var(--R) * -1)) rotateY(${-SP.deg}deg)`;
    let f=0,best=1e9;SP.ang.forEach((a,i)=>{const d=SP.dist(a);if(d<best){best=d;f=i}});SP.f=f;
    root.querySelectorAll('.sp-win').forEach((el,i)=>{const a=SP.dist(SP.ang[i]),k=Math.min(1,a/180);
      const far=a>92,side=i!==f&&mobile();el.style.opacity=(1-k*.3).toFixed(2);el.style.visibility=far?'hidden':'';el.style.pointerEvents=side?'none':'';el.classList.toggle('front',i===f);
      if(i!==f){el.setAttribute('aria-hidden','true');el.style.removeProperty('--tx');el.style.removeProperty('--ty')}else el.removeAttribute('aria-hidden');el.setAttribute('aria-selected',i===f);el.tabIndex=i===f?0:-1});
    root.querySelectorAll('.sp-gt').forEach(el=>{const gi=+el.dataset.g,a=SP.dist(SP.G[gi].mid);const lim=mobile()?40:80;el.style.visibility=a>lim?'hidden':'';el.style.opacity=(1-Math.min(1,a/lim)*.25).toFixed(2);el.classList.toggle('on',SP.list[f]?.gi===gi);
      if(a<=lim){const r=el.getBoundingClientRect();if(r.width&&(r.left<4||r.right>innerWidth-4))el.style.visibility='hidden'}}); // ekrandan taşan küme etiketi gösterilmez
    if(SP.cfg.mode==='halka'){SP.sel=f;SP.cap(root)}},
  cap(root){const a=SP.list[SP.sel],g=a&&SP.G[a.gi];root.querySelector('.sp-cap').innerHTML=a?`<b>${esc(a.name)}</b><span title="${esc(a.desc||'')}">${SP.G.length>1?`<em style="--gc:${esc(g.color)}"><i></i>${esc(g.name)}</em> `:''}${esc(a.desc)}</span><button data-app="${esc(a.key)}" class="sp-open">Aç ↵</button>`:''},
  rotTo(root,i){SP.deg+=((SP.ang[i]-SP.deg)%360+540)%360-180;SP.apply(root)},
  turn(root,dx){SP.rotTo(root,(SP.f+dx+SP.n)%SP.n)},
  goTo(root,i){if(SP.cfg.mode==='izgara'){SP.sel=i;root.querySelectorAll('.sp-hi')[i]?.focus({preventScroll:true});SP.cap(root);return}SP.rotTo(root,i)},
  /* ana görünüm: hafif kavisli petek */
  /* ızgara yerleşimi: gruplar küme küme, her uygulama kendi yuvasında (serbest konum yok) */
  calc(G,fix){const m=mobile(),sx=m?100:140,sy=m?116:140,lh=m?32:42,gx=m?18:64,gy=m?14:30,maxW=m?330:Math.max(520,Math.min(1120,innerWidth>=900?innerWidth-660:innerWidth*.9)),multi=G.length>1;
    const bl=G.map((g,gi)=>{const n=Math.max(1,g.apps.length),c=Math.min(m?3:(multi?3:5),n),rw=Math.ceil(n/c);return{gi,g,c,w:c*sx,h:(multi?lh:0)+rw*sy}});
    let rows=[];if(fix)rows=fix.map(r=>r.map(gi=>bl[gi]).filter(Boolean)).filter(r=>r.length);else{let cur=[],cw=0;bl.forEach(b=>{if(cur.length&&cw+gx+b.w>maxW){rows.push(cur);cur=[];cw=0}cw+=(cur.length?gx:0)+b.w;cur.push(b)});if(cur.length)rows.push(cur)}
    const rh=rows.map(r=>Math.max(...r.map(b=>b.h))),H=rh.reduce((a,b)=>a+b,0)+gy*(rows.length-1),curve=x=>{const u=x/(maxW/2);return[(-u*u*(m?30:110)).toFixed(0),(-u*(m?8:16)).toFixed(1)]};
    const pos={},lab=[],slots=[];let y=-H/2;
    rows.forEach((row,ri)=>{let x=-(row.reduce((a,b)=>a+b.w,0)+gx*(row.length-1))/2;
      row.forEach(b=>{lab[b.gi]={x:x+b.w/2,y};const n=b.g.apps.length,cell=j=>{const c=j%b.c,r=Math.floor(j/b.c),inRow=Math.min(b.c,Math.max(1,n-r*b.c));return{x:x+(b.w-inRow*sx)/2+c*sx+sx/2,y:y+(multi?lh:0)+r*sy+sy/2}};
        b.g.apps.forEach((a,j)=>{pos[a.key]=cell(j);slots.push({gi:b.gi,before:a.key,...pos[a.key]})});
        const e=n%b.c===0&&n?{x:x+b.w+sx*.15,y:y+(multi?lh:0)+(Math.ceil(n/b.c)-1)*sy+sy/2}:(()=>{const c=n%b.c,r=Math.floor(n/b.c),inRow=c+1;return{x:x+(b.w-Math.min(b.c,inRow)*sx)/2+c*sx+sx/2,y:y+(multi?lh:0)+r*sy+sy/2}})();
        slots.push({gi:b.gi,before:null,end:1,...e});x+=b.w+gx});y+=rh[ri]+gy});
    return{pos,lab,slots,H,curve,sy,multi,rows:rows.map(r=>r.map(b=>b.gi))}},
  place(root,C,skip){const it=[...root.querySelectorAll('.sp-hi')],gh=[...root.querySelectorAll('.sp-gh')];
    SP.list.forEach(a=>{const q=C.pos[a.key],el=it[a.si];if(!q||!el||a.si===skip)return;SP.pos[a.si]={x:q.x,y:q.y};const[z,r]=C.curve(q.x);el.style.transform=`translate3d(${q.x.toFixed(0)}px,${q.y.toFixed(0)}px,${z}px) rotateY(${r}deg)`;el.style.setProperty('--d',(a.si*45)+'ms')});
    gh.forEach(L=>{const q=C.lab[+L.dataset.g];if(!q)return;const[z,r]=C.curve(q.x);L.style.transform=`translate3d(calc(${q.x.toFixed(0)}px - 50%),${q.y.toFixed(0)}px,${z}px) rotateY(${r}deg)`})},
  home(root){if(SP.cfg.pos){delete SP.cfg.pos;SP.save()}const C=SP.calc(SP.G);SP.pos=[];SP.place(root,C);
    const avail=Math.max(260,innerHeight-(mobile()?300:330)),sc=Math.min(1,avail/C.H);root.querySelector('.sp-home').style.setProperty('--hs',sc.toFixed(3))},
  mode(root,m){SP.cfg.mode=m;SP.save();const sp=root.querySelector('.sp');sp.dataset.mode=m;
    root.querySelectorAll('[data-sp=halka],[data-sp=izgara]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.sp===m));
    if(m==='izgara'){SP.sel=SP.front();SP.cap(root)}else SP.apply(root);setTimeout(()=>SP.fit(root),550)},
  /* ortam + dalma */
  env(root,k){SP.cfg.env=k;SP.save();root.querySelector('.sp').dataset.env=k;root.querySelectorAll('.sp-envs [data-env]').forEach(b=>{const on=b.dataset.env===k;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on)})},
  imm(root,v,keep){v=Math.max(0,Math.min(1,Math.round(v*100)/100));SP.cfg.imm=v;if(v>.05&&!keep)SP.cfg.last=v;SP.save();const sp=root.querySelector('.sp');
    sp.style.setProperty('--imm',v);sp.classList.toggle('full',v>=.97);sp.classList.toggle('room',v<=.02);
    const c=root.querySelector('.sp-crown'),pc=Math.round(v*100);c.setAttribute('aria-valuenow',pc);c.setAttribute('aria-valuetext','%'+pc);c.querySelector('span').textContent=pc;
    const r=root.querySelector('.sp-imm input');r.value=pc;root.querySelector('.sp-imm b').textContent='%'+pc},
  envp(root,open){const p=root.querySelector('.sp-envp'),b=root.querySelector('[data-sp=envp]');open=open??p.hidden;p.hidden=!open;b.setAttribute('aria-expanded',open);b.classList.toggle('on',open);if(open)p.querySelector('.on,[data-env]')?.focus({preventScroll:true})},
  center(root){SP.cfg.off={};requestAnimationFrame(()=>SP.orient(root));setTimeout(()=>SP.fit(root),550);SP.save();root.querySelectorAll('.sp-side').forEach(s=>{s.style.removeProperty('--ox');s.style.removeProperty('--oy')});
    const sc=root.querySelector('.sp-scene');sc.style.setProperty('--rx','0deg');sc.style.setProperty('--ry','0deg');SP.rotTo(root,0);if(SP.cfg.mode==='izgara')SP.goTo(root,0);
    if(!calmMotion())root.querySelector('.sp-scene').animate([{transform:'scale(.94)',opacity:.6},{transform:'none',opacity:1}],{duration:500,easing:'cubic-bezier(.16,1,.3,1)'})},
  find(root,ch){clearTimeout(SP.bt);SP.buf+=ch;SP.bt=setTimeout(()=>{SP.buf='';root.querySelector('.sp-find').classList.remove('on')},900);
    const q=SP.buf.toLocaleLowerCase('tr-TR'),apps=SP.list,i=apps.findIndex(a=>a.name.toLocaleLowerCase('tr-TR').startsWith(q)),j=i<0?apps.findIndex(a=>a.name.toLocaleLowerCase('tr-TR').includes(q)):i;
    const f=root.querySelector('.sp-find');f.innerHTML=`<kbd>${esc(SP.buf)}</kbd> ${j<0?'<span>bulunamadı</span>':esc(apps[j].name)}`;f.classList.add('on');if(j>=0)SP.goTo(root,j)},
  mount(root){SP.deg=0;SP.layout(root);SP.light(root);requestAnimationFrame(()=>SP.orient(root));if(SP.renameKey){const k=SP.renameKey;SP.renameKey=null;setTimeout(()=>{const gi=SP.G.findIndex(g=>g.apps.some(x=>x.key===k)),l=root.querySelector(`.sp-gh[data-g="${gi}"]`)||root.querySelector(`.sp-gt[data-g="${gi}"]`);if(l&&root.isConnected)SP.rename(root,gi,l)},60)}if(SP.keep){const i=SP.list.findIndex(a=>a.key===SP.keep);if(i>=0){SP.deg=SP.ang[i];SP.sel=i;SP.apply(root)}SP.keep=null}SP.env(root,SP.cfg.env);SP.imm(root,SP.cfg.imm,1);SP.mode(root,SP.cfg.mode);
    root.querySelectorAll('.sp-side').forEach(s=>{const o=SP.cfg.off[s.dataset.side];if(o){s.style.setProperty('--ox',o[0]+'px');s.style.setProperty('--oy',o[1]+'px')}});
    const ring=root.querySelector('.sp-ring'),scene=root.querySelector('.sp-scene'),stage=root.querySelector('.sp-stage'),crown=root.querySelector('.sp-crown');
    root.addEventListener('click',e=>{const r=e.target.closest('[data-rot]');if(r)return SP.cfg.mode==='izgara'?SP.goTo(root,(SP.sel+(+r.dataset.rot)+SP.n)%SP.n):SP.turn(root,+r.dataset.rot);
      const gt=e.target.closest('.sp-gt');if(gt){SP.rotTo(root,SP.G[+gt.dataset.g].apps[0].si);return}
      const x=e.target.closest('[data-sp]');if(x){const k=x.dataset.sp;if(k==='halka'||k==='izgara')SP.mode(root,k);else if(k==='envp')SP.envp(root);else if(k==='center')SP.center(root);return}
      const ev=e.target.closest('.sp-envs [data-env]');if(ev){SP.env(root,ev.dataset.env);if(SP.cfg.imm<.3)SP.imm(root,.8);return}
      if(!e.target.closest('.sp-envp,[data-sp=envp]')&&!root.querySelector('.sp-envp').hidden)SP.envp(root,false);
      const h=e.target.closest('.sp-hi');if(h){SP.launch(h,h.dataset.key);return}
      const w=e.target.closest('.sp-win');if(!w||SP.dragged)return;const i=+w.dataset.i;
      if(i===SP.front())SP.launch(w,w.dataset.key);else SP.goTo(root,i)});
    root.querySelector('.sp-imm input').addEventListener('input',e=>SP.imm(root,e.target.value/100));
    /* halka sürükleme + sahne paralaksı + öndeki camda ışık */
    let st=null,gr=null,cr=null;
    stage.addEventListener('pointerdown',e=>{if(e.button||e.target.closest('.sp-side,.sp-hi,.sp-gt'))return;st={x:e.clientX,d:SP.deg,id:e.pointerId};SP.dragged=false});
    root.querySelectorAll('.sp-grab').forEach(g=>{const s=g.closest('.sp-side');
      g.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();g.setPointerCapture(e.pointerId);const o=SP.cfg.off[s.dataset.side]||[0,0];gr={s,x:e.clientX-o[0],y:e.clientY-o[1],id:e.pointerId};s.classList.add('moving')});
      g.addEventListener('dblclick',()=>{delete SP.cfg.off[s.dataset.side];SP.save();requestAnimationFrame(()=>SP.orient(root));s.style.removeProperty('--ox');s.style.removeProperty('--oy')})});
    crown.addEventListener('pointerdown',e=>{crown.setPointerCapture(e.pointerId);cr={y:e.clientY,v:SP.cfg.imm,id:e.pointerId,moved:false}});
    crown.addEventListener('wheel',e=>{e.preventDefault();SP.imm(root,SP.cfg.imm-e.deltaY*.0012)},{passive:false});
    addEventListener('pointermove',SP.pm=e=>{
      if(gr&&gr.id===e.pointerId){const x=Math.round(e.clientX-gr.x),y=Math.round(e.clientY-gr.y);gr.s.style.setProperty('--ox',x+'px');gr.s.style.setProperty('--oy',y+'px');SP.cfg.off[gr.s.dataset.side]=[x,y];SP.orient(root);return}
      if(cr&&cr.id===e.pointerId){const dy=cr.y-e.clientY;if(Math.abs(dy)>3)cr.moved=true;if(cr.moved)SP.imm(root,cr.v+dy/220);return}
      if(st&&st.id===e.pointerId&&SP.cfg.mode==='halka'&&!SP.lift){const dx=e.clientX-st.x;if(Math.abs(dx)>6){SP.dragged=true;ring.style.transition='none';SP.deg=st.d-dx/(mobile()?160:260)*SP.step;SP.apply(root)}}
      if(e.pointerType!=='mouse'||calmMotion()||SP.raf)return;
      if(SP.L){SP.L.tr2=(e.clientX/innerWidth-.5)*7;SP.L.trx=(.5-e.clientY/innerHeight)*5;SP.lightGo?.()}
      SP.raf=requestAnimationFrame(()=>{SP.raf=0;
        const fw=root.querySelector('.sp-win.front');if(!fw||st)return;const b=fw.getBoundingClientRect(),u=(e.clientX-b.left)/b.width,v=(e.clientY-b.top)/b.height,inside=u>=0&&u<=1&&v>=0&&v<=1;
        if(inside){fw.style.setProperty('--ty',((u-.5)*10).toFixed(1)+'deg');fw.style.setProperty('--tx',((.5-v)*8).toFixed(1)+'deg');fw.classList.add('lit')}
        else if(fw.classList.contains('lit')){fw.classList.remove('lit');fw.style.removeProperty('--tx');fw.style.removeProperty('--ty')}})},{passive:true});
    addEventListener('pointerup',SP.pu=e=>{
      if(gr&&gr.id===e.pointerId){gr.s.classList.remove('moving');gr=null;SP.save();setTimeout(()=>SP.fit(root),520);return}
      if(cr&&cr.id===e.pointerId){if(!cr.moved)SP.imm(root,SP.cfg.imm>.05?0:(SP.cfg.last||.8),SP.cfg.imm>.05);cr=null;return}
      if(!st||st.id!==e.pointerId)return;st=null;ring.style.transition='';if(SP.dragged){SP.rotTo(root,SP.f);setTimeout(()=>SP.dragged=false,0)}});
    SP.dnd(root);
    root.addEventListener('contextmenu',e=>{const t=e.target.closest('.sp-hi,.sp-win');if(!t)return;e.preventDefault();e.stopPropagation();if(SP.lift||e.pointerType==='touch'||(e.button===-1))return;SP.menu(root,+t.dataset.i,e.clientX,e.clientY)});
    root.addEventListener('dblclick',e=>{const l=e.target.closest('.sp-gh,.sp-gt');if(l)SP.rename(root,+l.dataset.g,l)});
    root.querySelectorAll('.sp-hi').forEach(h=>{h.addEventListener('pointerenter',()=>{SP.sel=+h.dataset.i;SP.cap(root)});h.addEventListener('focus',()=>{SP.sel=+h.dataset.i;SP.cap(root)})});
    stage.addEventListener('wheel',e=>{if(SP.cfg.mode!=='halka'||e.target.closest('.sp-side')||Math.abs(e.deltaX)+Math.abs(e.deltaY)<8||SP.wl)return;SP.wl=1;setTimeout(()=>SP.wl=0,260);SP.turn(root,(e.deltaY||e.deltaX)>0?1:-1)},{passive:true})},
  /* taşıma: grup değiştir / sırala */
  move(root,i,target,before){const a=SP.list[i];if(!a)return;if(a.key===H().bh&&target!==SP.G[a.gi].id){H().toast('Denetçi galaksinin merkezi; gruba girmez');SP.rebuild();return}const ord=SP.list.map(x=>x.key).filter(k=>k!==a.key);
    const tg=target==='_new'?null:SP.G.find(g=>g.id===target),src=SP.G[a.gi];
    if(tg&&tg.id[0]==='_'&&tg!==src&&((tg.id==='_ai')!==!!a.ai)){H().toast(tg.id==='_ai'?'Yapay zekâ grubuna sadece AI uygulamaları girer':'“Diğer” otomatik grup; AI uygulamaları orada durmaz');SP.rebuild();return}
    let at=before!=null?ord.indexOf(before):-1;if(at<0){const last=(tg||src).apps.filter(x=>x.key!==a.key).pop();at=last?ord.indexOf(last.key)+1:ord.length}
    ord.splice(at,0,a.key);SP.cfg.order=ord;SP.keep=a.key;try{localStorage.setItem(SPK,JSON.stringify(SP.cfg))}catch{}
    if(target==='_new'){H().setGroup(a.key,'_new','Yeni grup');SP.hinted();SP.renameKey=a.key;SP.rebuild();return}
    if(tg&&tg!==src){const gname=tg.name,prev=src.id;H().setGroup(a.key,tg.id);H().toast(`${a.name} → ${gname}`,()=>{H().setGroup(a.key,prev[0]==='_'?null:prev)});SP.hinted();return}
    SP.hinted();SP.rebuild()},
  hinted(){if(!SP.cfg.hinted){SP.cfg.hinted=1;SP.save()}document.querySelector('.world .sp')?.classList.add('hinted')},
  menu(root,i,x,y){SP.closeMenu();const a=SP.list[i];if(!a)return;const cur=SP.G[a.gi];
    const bh=a.key===H().bh,opts=bh?[]:SP.G.filter(g=>g!==cur&&!(g.id==='_ai'&&!a.ai)&&!(g.id==='_other'&&a.ai));
    const m=document.createElement('div');m.className='sp-menu';m.setAttribute('role','menu');
    m.innerHTML=`<p>${esc(a.name)}</p><button role="menuitem" data-m="open">Aç</button>${opts.length?'<p>Taşı</p>':''}${opts.map(g=>`<button role="menuitem" data-m="${esc(g.id)}" style="--gc:${esc(g.color)}"><i></i>${esc(g.name)}</button>`).join('')}${bh?'<p>Galaksinin merkezi, taşınmaz</p>':'<button role="menuitem" data-m="_new">＋ Yeni grup</button>'}${cur.id[0]!=='_'&&!bh?'<button role="menuitem" data-m="_out">Gruptan çıkar</button>':''}`;
    root.querySelector('.sp').appendChild(m);const W=m.offsetWidth,Hh=m.offsetHeight;m.style.left=Math.min(x,innerWidth-W-12)+'px';m.style.top=Math.min(y,innerHeight-Hh-12)+'px';
    m.addEventListener('click',e=>{const b=e.target.closest('[data-m]');if(!b)return;const k=b.dataset.m;SP.closeMenu();if(k==='open')H().open(a.key);else if(k==='_out'){SP.keep=a.key;H().setGroup(a.key,null);H().toast(`${a.name} gruptan çıktı`)}else SP.move(root,i,k)});
    m.querySelector('button').focus();setTimeout(()=>addEventListener('pointerdown',SP.mOut=e=>{if(!e.target.closest('.sp-menu'))SP.closeMenu()},true),0)},
  closeMenu(){document.querySelector('.world .sp-menu')?.remove();if(SP.mOut){removeEventListener('pointerdown',SP.mOut,true);SP.mOut=null}},
  rename(root,gi,el){const g=SP.G[gi];if(!g)return;if(g.id[0]==='_'){H().toast('Bu grup otomatik; adı değişmez');return}
    const sp=el.querySelector('span')||el,old=g.name,inp=document.createElement('input');inp.className='sp-ren';inp.value=old;inp.maxLength=40;inp.setAttribute('aria-label','Grup adı');
    sp.replaceWith(inp);el.style.pointerEvents='auto';inp.focus();inp.select();let done=false;
    const fin=ok=>{if(done)return;done=true;const v=inp.value.trim(),sp2=document.createElement('span');sp2.textContent=ok&&v?v:old;inp.replaceWith(sp2);el.style.pointerEvents='';if(ok&&v&&v!==old)H().renameGroup(g.id,v)};
    inp.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter')fin(true);if(e.key==='Escape')fin(false)});inp.addEventListener('blur',()=>fin(true))},
  dnd(root){const home=root.querySelector('.sp-home'),drop=root.querySelector('.sp-drop'),sp=root.querySelector('.sp');let d=null;
    const local=e=>{const c=home.getBoundingClientRect(),k=parseFloat(getComputedStyle(home).getPropertyValue('--hs'))||1;return{x:(e.clientX-c.left)/k,y:(e.clientY-c.top)/k}};
    const start=()=>{if(SP.list[d.i]?.key===H().bh){H().toast('Denetçi galaksinin merkezi; taşınmaz');d=null;return}d.on=true;d.rows=SP.calc(SP.G).rows;d.el.classList.add('drag');sp.classList.add('dragging');SP.closeMenu();navigator.vibrate?.(8)};
    /* sürüklerken: uygulamayı çıkarılmış hâlde yuvaları hesapla, en yakın yuvayı seç, diğerleri yer açsın */
    const without=i=>SP.G.map(g=>({...g,apps:g.apps.filter(a=>a.si!==i)})),okG=(g,a)=>!(g.id==='_ai'&&!a.ai)&&!(g.id==='_other'&&a.ai);
    const target=e=>{const hits=document.elementsFromPoint(e.clientX,e.clientY),z=hits.find(n=>n.dataset?.drop);if(z)return{g:z.dataset.drop,z};
      const a=SP.list[d.i],p=local(e),py=p.y+20,C0=d.C0||(d.C0=SP.calc(without(d.i),d.rows));let best=null,bd=1e9;
      C0.slots.forEach(sl=>{const g=SP.G[sl.gi];if(!okG(g,a))return;const dist=Math.hypot(sl.x-p.x,sl.y-py);if(dist<bd){bd=dist;best=sl}});
      if(!best)return null;return{g:SP.G[best.gi].id,gi:best.gi,before:best.before}};
    const preview=t=>{const slot=root.querySelector('.sp-slot'),a=SP.list[d.i];if(!t||t.z||t.gi==null){SP.place(root,SP.calc(SP.G,d.rows),d.i);slot.classList.remove('on');return}
      const G=without(d.i),g=G[t.gi],ix=t.before?g.apps.findIndex(x=>x.key===t.before):g.apps.length;g.apps=[...g.apps];g.apps.splice(ix<0?g.apps.length:ix,0,a);
      const C=SP.calc(G,d.rows);SP.place(root,C,d.i);const q=C.pos[a.key],[z,r]=C.curve(q.x);slot.style.transform=`translate3d(${q.x.toFixed(0)}px,${q.y.toFixed(0)}px,${z}px) rotateY(${r}deg)`;slot.style.setProperty('--gc',SP.G[t.gi].color);slot.classList.add('on')};
    home.addEventListener('pointerdown',e=>{const el=e.target.closest('.sp-hi');if(!el||e.button)return;d={el,i:+el.dataset.i,x:e.clientX,y:e.clientY,id:e.pointerId,on:false,touch:e.pointerType!=='mouse'};
      d.t=setTimeout(()=>{if(d&&!d.on){start();if(!d)return;try{el.setPointerCapture(d.id)}catch{}const p=local({clientX:d.x,clientY:d.y});el.style.transform=`translate3d(${p.x.toFixed(0)}px,${(p.y+20).toFixed(0)}px,140px) scale(1.12)`}},380)});
    addEventListener('pointermove',SP.dm=e=>{if(!d||d.id!==e.pointerId)return;const mv=Math.hypot(e.clientX-d.x,e.clientY-d.y);
      if(!d.on){if(d.touch){if(mv>10){clearTimeout(d.t);d=null}return}if(mv<6)return;clearTimeout(d.t);start();if(!d)return;try{d.el.setPointerCapture(d.id)}catch{}}
      e.preventDefault();const p=local(e);d.el.style.transform=`translate3d(${p.x.toFixed(0)}px,${(p.y+20).toFixed(0)}px,140px) scale(1.12)`;
      const t=target(e),key=t?(t.z?'z'+t.g:t.gi+'|'+t.before):'';if(key!==d.k){d.k=key;preview(t)}d.t2=t;root.querySelectorAll('.sp-gh').forEach(l=>l.classList.toggle('drop',!!t?.g&&!t.z&&SP.G[+l.dataset.g]?.id===t.g&&SP.G[+l.dataset.g]!==SP.G[SP.list[d.i].gi]));drop.querySelectorAll('span').forEach(c=>c.classList.toggle('on',!!t?.z&&c===t.z));
      const tg=t&&SP.G.find(g=>g.id===t.g);root.querySelector('.sp-cap').innerHTML=`<b>${esc(SP.list[d.i].name)}</b><span>${t?.g==='_new'?'Bırak: yeni grup kur':tg?(tg===SP.G[SP.list[d.i].gi]?'Bırak: sırayı değiştir':'Bırak: '+esc(tg.name)+' grubuna taşı'):'Bir yuvaya sürükle'}</span>`},{passive:false});
    addEventListener('pointerup',SP.du=e=>{if(!d||d.id!==e.pointerId)return;clearTimeout(d.t);const was=d;d=null;if(!was.on)return;
      sp.classList.remove('dragging');was.el.classList.remove('drag');root.querySelectorAll('.sp-gh.drop').forEach(l=>l.classList.remove('drop'));SP.dragged=true;setTimeout(()=>SP.dragged=false,0);
      root.querySelector('.sp-slot').classList.remove('on');const t=was.t2;if(!t){SP.home(root);SP.cap(root);return}SP.move(root,was.i,t.g,t.before)});
    home.addEventListener('click',e=>{if(SP.dragged){e.stopPropagation();e.preventDefault()}},true);
    /* halka: uzun bas → cam kalkar, grup çiplerine sürükle */
    let L=null;const ring=root.querySelector('.sp-ring');
    ring.addEventListener('pointerdown',e=>{const w=e.target.closest('.sp-win');if(!w||e.button)return;L={w,i:+w.dataset.i,x:e.clientX,y:e.clientY,id:e.pointerId,on:false};
      L.t=setTimeout(()=>{if(!L||L.on)return;if(SP.list[L.i]?.key===H().bh){H().toast('Denetçi galaksinin merkezi; taşınmaz');L=null;return}L.on=true;SP.lift=true;w.classList.add('lifted');sp.classList.add('dragging','lifting');SP.closeMenu();navigator.vibrate?.(10);
        const a=SP.list[L.i];L.g=document.createElement('div');L.g.className='sp-ghost';L.g.innerHTML=`${appIcon(a)}<b>${esc(a.name)}</b>`;sp.appendChild(L.g);L.g.style.transform=`translate(${L.x}px,${L.y}px)`;
        root.querySelector('.sp-cap').innerHTML=`<b>${esc(a.name)}</b><span>Bir gruba sürükle ya da bırakıp vazgeç</span>`;try{w.setPointerCapture(L.id)}catch{}},400)});
    addEventListener('pointermove',SP.lm=e=>{if(!L||L.id!==e.pointerId)return;if(!L.on){if(Math.hypot(e.clientX-L.x,e.clientY-L.y)>8){clearTimeout(L.t);L=null}return}
      e.preventDefault();L.g.style.transform=`translate(${e.clientX}px,${e.clientY}px)`;const hits=document.elementsFromPoint(e.clientX,e.clientY),z=hits.find(n=>n.dataset?.drop),pw=!z&&(hits.find(n=>n.classList?.contains('sp-win')&&n!==L.w)||(()=>{let bw=null,bd=1e9;root.querySelectorAll('.sp-win').forEach(w=>{if(w===L.w||w.style.visibility==='hidden')return;const b=w.getBoundingClientRect(),dd=Math.hypot(b.left+b.width/2-e.clientX,b.top+b.height/2-e.clientY);if(dd<bd){bd=dd;bw=w}});return bw})());L.z=z;L.pw=pw;
      drop.querySelectorAll('span').forEach(c=>c.classList.toggle('on',c===z));root.querySelectorAll('.sp-win.target').forEach(w=>w!==pw&&w.classList.remove('target'));if(pw)pw.classList.add('target');
      const a=SP.list[L.i],tw=pw&&SP.list[+pw.dataset.i];root.querySelector('.sp-cap').innerHTML=`<b>${esc(a.name)}</b><span>${tw?'Bırak: '+esc(tw.name)+' yanına'+(tw.gi!==a.gi?' ('+esc(SP.G[tw.gi].name)+')':''):z?'Bırak: '+esc(z.textContent):'Bir cama ya da gruba sürükle'}</span>`},{passive:false});
    addEventListener('pointerup',SP.lu=e=>{if(!L||L.id!==e.pointerId)return;clearTimeout(L.t);const was=L;L=null;if(!was.on)return;
      SP.lift=false;SP.dragged=true;setTimeout(()=>SP.dragged=false,0);was.w.classList.remove('lifted');sp.classList.remove('dragging','lifting');was.g.remove();drop.querySelectorAll('.on').forEach(c=>c.classList.remove('on'));
      root.querySelectorAll('.sp-win.target').forEach(w=>w.classList.remove('target'));
      if(was.pw){const tw=SP.list[+was.pw.dataset.i],a=SP.list[was.i],ix=SP.G[tw.gi].apps.indexOf(tw),dir=SP.dist(SP.ang[tw.si])>0&&(((SP.ang[tw.si]-SP.deg)%360+540)%360-180)>0;SP.move(root,was.i,SP.G[tw.gi].id,dir?(SP.G[tw.gi].apps[ix+1]?.key&&SP.G[tw.gi].apps[ix+1].key!==a.key?SP.G[tw.gi].apps[ix+1].key:null):tw.key);return}
      if(was.z){const g=was.z.dataset.drop,src=SP.G[SP.list[was.i].gi];if(g===src.id){SP.cap(root);H().toast('Zaten bu grupta');return}SP.move(root,was.i,g)}else SP.cap(root)});
    addEventListener('pointercancel',SP.lc=e=>{if(L&&L.id===e.pointerId){clearTimeout(L.t);if(L.on){L.w.classList.remove('lifted');sp.classList.remove('dragging','lifting');L.g.remove();SP.lift=false}L=null}})},
  launch(el,key){if(!calmMotion()){const t=el.style.transform||'';el.animate([{transform:t},{transform:t+' translateZ(140px) scale(1.06)',opacity:0}],{duration:280,easing:'cubic-bezier(.4,0,.2,1)'})}setTimeout(()=>H().open(key),calmMotion()?0:220)},
  key(root,e){const k=e.key,crownF=document.activeElement?.classList?.contains('sp-crown');
    if(k==='Escape'&&root.querySelector('.sp-menu')){e.preventDefault();e.stopPropagation();SP.closeMenu();return}
    if(k==='Escape'&&!root.querySelector('.sp-envp').hidden){e.preventDefault();e.stopPropagation();SP.envp(root,false);root.querySelector('[data-sp=envp]').focus();return}
    if(k==='['||k===']'||(crownF&&(k==='ArrowUp'||k==='ArrowDown'))){e.preventDefault();SP.imm(root,SP.cfg.imm+((k===']'||k==='ArrowUp')?.1:-.1));return}
    if(crownF&&(k==='Enter'||k===' ')){e.preventDefault();SP.imm(root,SP.cfg.imm>.05?0:(SP.cfg.last||.8),SP.cfg.imm>.05);return}
    if(k==='0'){e.preventDefault();SP.center(root);return}
    if(e.target.closest?.('.sp-envp'))return;
    const iz=SP.cfg.mode==='izgara';
    if(k==='ArrowRight'||k==='ArrowLeft'){e.preventDefault();const d=k==='ArrowRight'?1:-1;iz?SP.goTo(root,(SP.sel+d+SP.n)%SP.n):SP.turn(root,d)}
    else if(iz&&(k==='ArrowDown'||k==='ArrowUp')){e.preventDefault();const p=SP.pos[SP.sel],dn=k==='ArrowDown';let bi=-1,bs=1e9;SP.pos.forEach((q,i)=>{const dy=q.y-p.y;if(dn?dy>20:dy<-20){const sc=Math.abs(dy)+Math.abs(q.x-p.x)*2;if(sc<bs){bs=sc;bi=i}}});if(bi>=0)SP.goTo(root,bi)}
    else if(k==='Enter'&&!e.target.closest?.('button')){e.preventDefault();const a=SP.list[SP.sel];a&&H().open(a.key)}
    else if(k.length===1&&/\p{L}/u.test(k)){e.preventDefault();SP.find(root,k)}},
  /* yan pencereler bulundukları yere göre sana döner (visionOS gibi): solda sağa, sağda sola, ortada karşıya bakar */
  orient(root){const cx=innerWidth/2,cy=innerHeight*.44;root.querySelectorAll('.sp-side').forEach(s=>{if(!s.offsetParent)return;
    const o=SP.cfg.off[s.dataset.side]||[0,0],xc=s.offsetLeft+s.offsetWidth/2+o[0],yc=s.offsetTop+s.offsetHeight/2+o[1],
      ry=Math.max(-34,Math.min(34,-(xc-cx)/(innerWidth/2)*34)),rx=Math.max(-14,Math.min(14,(yc-cy)/(innerHeight/2)*14));
    s.style.setProperty('--sry',ry.toFixed(1)+'deg');s.style.setProperty('--srx',rx.toFixed(1)+'deg')})},
  resize(root){SP.layout(root);SP.orient(root)},
  /* imleç ışığı: galaksideki çekim gibi yumuşak takip, ama sadece ışık */
  /* imleç ışığı + sahne eğimi + ızgarada simgelerin imlece çekilmesi: hepsi yay fiziğiyle (kütle-yay-sönüm), durulunca döngü durur */
  light(root){const Ls=root.querySelector('.sp-light'),scene=root.querySelector('.sp-scene'),L=SP.L={x:innerWidth/2,y:innerHeight/2,tx:innerWidth/2,ty:innerHeight/2,vx:0,vy:0,a:0,ta:0,raf:0,t:0,rx:0,ry:0,vrx:0,vry:0,trx:0,tr2:0,hb:new Map()};
    const els=()=>[...root.querySelectorAll('.sp-win,.sp-glass,.sp-hb,.sp-gt,.sp-orn,.sp-crown,.sp-cap')].filter(e=>e.offsetParent&&getComputedStyle(e).visibility!=='hidden');
    const step=now=>{const calm=calmMotion(),dt=L.t?Math.min(.04,(now-L.t)/1000):1/60;L.t=now;let busy=false;
      if(calm){L.x=L.tx;L.y=L.ty;L.vx=L.vy=0}else{L.vx+=((L.tx-L.x)*170-L.vx*19)*dt;L.vy+=((L.ty-L.y)*170-L.vy*19)*dt;L.x+=L.vx*dt;L.y+=L.vy*dt}
      L.a+=(L.ta-L.a)*(calm?1:Math.min(1,dt*5));
      if(!calm){L.vrx+=((L.trx-L.rx)*90-L.vrx*14)*dt;L.vry+=((L.tr2-L.ry)*90-L.vry*14)*dt;L.rx+=L.vrx*dt;L.ry+=L.vry*dt;scene.style.setProperty('--rx',L.rx.toFixed(2)+'deg');scene.style.setProperty('--ry',L.ry.toFixed(2)+'deg')
        if(Math.abs(L.trx-L.rx)+Math.abs(L.tr2-L.ry)>.02||Math.abs(L.vrx)+Math.abs(L.vry)>.05)busy=true}
      if(SP.cfg.mode==='izgara'&&!calm)for(const hb of root.querySelectorAll('.sp-hb')){let q=L.hb.get(hb);if(!q){q={x:0,y:0,vx:0,vy:0};L.hb.set(hb,q)}
        const b=hb.getBoundingClientRect(),cx=b.left+b.width/2-q.x,cy=b.top+b.height/2-q.y,d=Math.hypot(L.tx-cx,L.ty-cy);let pl=L.ta>.5&&!SP.lift&&!hb.closest('.drag')?Math.max(0,1-d/170):0;pl*=pl;
        const gx=(L.tx-cx)*pl*.28,gy=(L.ty-cy)*pl*.28;q.vx+=((gx-q.x)*150-q.vx*16)*dt;q.vy+=((gy-q.y)*150-q.vy*16)*dt;q.x+=q.vx*dt;q.y+=q.vy*dt;
        hb.style.translate=`${q.x.toFixed(1)}px ${q.y.toFixed(1)}px`;if(Math.abs(q.vx)+Math.abs(q.vy)>2||Math.abs(gx-q.x)+Math.abs(gy-q.y)>.3)busy=true}
      Ls.style.transform=`translate(${L.x.toFixed(1)}px,${L.y.toFixed(1)}px)`;Ls.style.opacity=L.a.toFixed(3);
      for(const el of els()){const b=el.getBoundingClientRect();if(!b.width)continue;const nx=Math.max(b.left,Math.min(L.x,b.right)),ny=Math.max(b.top,Math.min(L.y,b.bottom)),dd=Math.hypot(L.x-nx,L.y-ny),li=L.a*Math.max(0,1-dd/260);
        el.style.setProperty('--lx',((L.x-b.left)/b.width*100).toFixed(1)+'%');el.style.setProperty('--ly',((L.y-b.top)/b.height*100).toFixed(1)+'%');el.style.setProperty('--li',li.toFixed(3))}
      if(busy||Math.abs(L.tx-L.x)+Math.abs(L.ty-L.y)>.3||Math.abs(L.vx)+Math.abs(L.vy)>3||Math.abs(L.ta-L.a)>.004)L.raf=requestAnimationFrame(step);else{L.raf=0;L.t=0}};
    const go=()=>{if(!L.raf)L.raf=requestAnimationFrame(step)};
    addEventListener('pointermove',SP.lpm=e=>{L.tx=e.clientX;L.ty=e.clientY;if(e.pointerType==='mouse'||e.buttons)L.ta=1;go()},{passive:true});
    addEventListener('pointerdown',SP.lpd=e=>{L.tx=e.clientX;L.ty=e.clientY;if(e.pointerType!=='mouse'){L.x=L.tx;L.y=L.ty}L.ta=1;go()},{passive:true});
    addEventListener('pointerup',SP.lpu=e=>{if(e.pointerType!=='mouse'){L.ta=0;go()}},{passive:true});
    document.addEventListener('mouseleave',SP.lml=()=>{L.ta=0;L.trx=L.tr2=0;go()});SP.lightGo=go},
  unmount(){removeEventListener('pointermove',SP.pm);removeEventListener('pointerup',SP.pu);removeEventListener('pointermove',SP.dm);removeEventListener('pointerup',SP.du);removeEventListener('pointermove',SP.lm);removeEventListener('pointerup',SP.lu);removeEventListener('pointercancel',SP.lc);removeEventListener('pointermove',SP.lpm);removeEventListener('pointerdown',SP.lpd);removeEventListener('pointerup',SP.lpu);document.removeEventListener('mouseleave',SP.lml);if(SP.L?.raf)cancelAnimationFrame(SP.L.raf);SP.lift=false;SP.closeMenu()}};

/* ═════════════ Ortak: imleçle canlanan dünyalar (Mıknatıs, Rüzgâr, Petek) ═════════════
   Tam ekran, kaydırmasız. Her birinde imleç sahneyi fizikle etkiler (galaksideki çekim, mekânsaldaki ışık gibi).
   Döngü SADECE bir şey hareket ederken çalışır, durulunca kendiliğinden durur (işlemci/pil dostu).
   Hareket azaltılmışsa (sistem ya da Ayarlar → hareket) sahne durgun çizilir; tıklama ve klavye aynen çalışır. */
const tier=()=>{try{return H()?.tier?.()||0}catch{return 0}};
const wxTop=d=>`<header class="wx-hd"><p class="wx-t" data-clock="hm"></p><p class="wx-d">${esc(greet(d.now))} · ${esc(trDate(d.now,{weekday:'long',day:'numeric',month:'long'}))}</p></header>`;
const wxNav=n=>`<nav class="wx-nav" aria-label="${n}"><button data-act="ara">Ara</button><button data-act="today">Bugün</button><button data-act="world">Arayüz</button>${dice()}</nav>`;
// rAF döngüsü: fn(dt,t) false dönerse durur; go() yeniden başlatır
function wxLoop(fn){const L={raf:0,last:0,on:true};const f=t=>{L.raf=0;if(!L.on)return;const dt=L.last?Math.min(.04,(t-L.last)/1000):1/60;L.last=t;
    if(fn(dt,t)!==false&&!document.hidden)L.raf=requestAnimationFrame(f);else L.last=0};
  L.go=()=>{if(L.on&&!L.raf)L.raf=requestAnimationFrame(f)};L.stop=()=>{L.on=false;cancelAnimationFrame(L.raf);L.raf=0};return L}
// imleç: konum, hız, içeride mi (dokunmatikte sadece parmak değerken)
function wxPtr(root,L){const P={x:innerWidth/2,y:innerHeight/2,v:0,in:false,t:0};
  root.addEventListener('pointermove',e=>{P.v=Math.min(80,Math.hypot(e.clientX-P.x,e.clientY-P.y));P.x=e.clientX;P.y=e.clientY;P.in=e.pointerType==='mouse'||e.buttons>0;P.t=performance.now();L.go()},{passive:true});
  root.addEventListener('pointerdown',e=>{P.x=e.clientX;P.y=e.clientY;P.in=true;P.t=performance.now();L.go()},{passive:true});
  root.addEventListener('pointerup',e=>{if(e.pointerType!=='mouse'){P.in=false;L.go()}});
  root.addEventListener('pointerleave',()=>{P.in=false;L.go()});
  return P}
const prand=i=>{const x=Math.sin(i*127.1+311.7)*43758.5453;return x-Math.floor(x)};

/* ═════════════ Ortak: kümeler (bütün arayüzler) ═════════════
   Galaksiyle AYNI kümeler (HUB.groups / setGroup / renameGroup → buluta yazılır). Her arayüz kümeyi kendi diliyle gösterir
   (raf, petek adası, balon demeti, kadran dilimi, yelpaze bölümü, harita bölgesi…). Kümeleme her yerde aynı:
   sağ tık (telefonda basılı tut) → Kümeye taşı / Yeni küme / Kümeden çıkar · küme adına çift tık → yeniden adlandır. */
const WG={G:[],sig:'',
  // kümeler + küme sırasına dizilmiş uygulamalar (a.gi = küme no)
  of(d){const by=new Map(d.apps.map(a=>[a.key,a])),gs=d.groups.map(g=>({id:g.id,name:g.name,color:g.color,apps:g.keys.map(k=>by.get(k)).filter(Boolean)})).filter(g=>g.apps.length),
      seen=new Set(gs.flatMap(g=>g.apps.map(a=>a.key))),rest=d.apps.filter(a=>!seen.has(a.key));
    if(rest.length){const o=gs.find(g=>g.id==='_other');o?o.apps.push(...rest):gs.push({id:'_other',name:gs.length?'Diğer':'Uygulamalar',color:'#8E8E99',apps:rest})}
    WG.G=gs;WG.sig=JSON.stringify(d.groups);const list=gs.flatMap((g,gi)=>g.apps.map(a=>Object.assign(a,{gi})));return{G:gs,list}},
  // tek küme varsa küme göstergesi çizilmez (sade)
  many:()=>WG.G.length>1,
  lab:(g,gi,cls='')=>`<p class="wg-l${g.id[0]==='_'?'':' ed'} ${cls}" data-g="${gi}" style="--gc:${esc(g.color)}" title="${g.id[0]==='_'?'Otomatik küme':'Çift tık: yeniden adlandır'}"><i aria-hidden="true"></i><span>${esc(g.name)}</span></p>`,
  // küme değiştir (Mıknatıs ve diğerleri aynı kurallar)
  move(a,tg,name){const h=H(),src=WG.G[a.gi];if(!src||tg&&tg===src)return;
    if(a.key===h.bh){h.toast('Denetçi galaksinin merkezi; kümeye girmez');return}
    if(tg&&tg.id==='_ai'&&!a.ai){h.toast('Yapay zekâ kümesine sadece AI uygulamaları girer');return}
    if(tg&&tg.id==='_other'&&a.ai){h.toast('“Diğer” otomatik küme; AI uygulamaları orada durmaz');return}
    const prev=src.id[0]==='_'?null:src.id;
    if(!tg)h.setGroup(a.key,'_new',name||'Yeni küme');else h.setGroup(a.key,tg.id[0]==='_'?null:tg.id);
    h.toast(`${a.name} → ${tg?tg.name:(name||'Yeni küme')}`,()=>{h.setGroup(a.key,prev);setTimeout(rebuild,0)});setTimeout(rebuild,0)},
  // sağ tık / basılı tut menüsü
  menu(root,a,x,y){root.querySelector('.mg-cm')?.remove();const src=WG.G[a.gi],m=document.createElement('div');m.className='mg-cm';m.setAttribute('role','menu');m.setAttribute('aria-label',a.name);
    m.innerHTML=`<p class="mg-mk">${esc(a.name)}</p><button role="menuitem" data-cm="open">Aç</button>${WG.G.filter(g=>g!==src).map(g=>`<button role="menuitem" data-cm="g:${esc(g.id)}"><i style="--gc:${esc(g.color)}"></i>${esc(g.name)} kümesine taşı</button>`).join('')}
      <button role="menuitem" data-cm="new">Yeni küme…</button>${src&&src.id[0]!=='_'?'<button role="menuitem" data-cm="out">Kümeden çıkar</button>':''}`;
    root.appendChild(m);const r=m.getBoundingClientRect();m.style.left=Math.max(8,Math.min(innerWidth-r.width-8,x))+'px';m.style.top=Math.max(8,Math.min(innerHeight-r.height-8,y))+'px';
    const close=()=>{m.remove();removeEventListener('pointerdown',out,true)},out=e=>{if(!m.contains(e.target))close()};setTimeout(()=>addEventListener('pointerdown',out,true),0);
    m.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();close()}});
    m.addEventListener('click',e=>{e.stopPropagation();const b=e.target.closest('[data-cm]');if(!b)return;const k=b.dataset.cm;
      if(k==='open'){close();H().open(a.key);return}if(k==='out'){close();H().setGroup(a.key,null);H().toast(`${a.name} kümeden çıktı`);setTimeout(rebuild,0);return}
      if(k==='new'){m.innerHTML=`<p class="mg-mk">Yeni küme adı</p><input class="mg-in" maxlength="40" placeholder="ör. Oyunlar" aria-label="Yeni küme adı">`;const inp=m.querySelector('input');inp.focus();
        inp.addEventListener('keydown',ev=>{if(ev.key==='Enter'){const n=inp.value.trim();close();WG.move(a,null,n||'Yeni küme')}});return}
      close();WG.move(a,WG.G.find(g=>'g:'+g.id===k))});
    m.querySelector('button')?.focus()},
  // arayüze bağla: sağ tık, dokunmatikte basılı tut (520 ms, kıpırdamadan), küme adına çift tık
  wire(root,list){const at=el=>list.find(a=>a.key===el.dataset.app);
    root.addEventListener('contextmenu',e=>{const el=e.target.closest('[data-app]:not(.mg-wb)');const a=el&&at(el);if(!a)return;e.preventDefault();WG.menu(root,a,e.clientX,e.clientY)});
    let lp=null;root.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse')return;const el=e.target.closest('[data-app]:not(.mg-wb)');const a=el&&at(el);if(!a)return;
      lp={x:e.clientX,y:e.clientY,t:setTimeout(()=>{lp.fired=true;navigator.vibrate?.(8);WG.menu(root,a,lp.x,lp.y)},520)}},{passive:true});
    const cancel=()=>{if(lp&&!lp.fired)clearTimeout(lp.t)};root.addEventListener('pointermove',e=>{if(lp&&Math.hypot(e.clientX-lp.x,e.clientY-lp.y)>9)cancel()},{passive:true});
    root.addEventListener('pointerup',cancel);root.addEventListener('pointercancel',cancel);
    root.addEventListener('click',e=>{if(lp?.fired){lp=null;e.stopPropagation();e.preventDefault()}},true);
    root.addEventListener('dblclick',e=>{const l=e.target.closest('.wg-l.ed');if(!l)return;const g=WG.G[+l.dataset.g],sp=l.querySelector('span'),old=sp.textContent;sp.contentEditable='true';sp.focus();document.getSelection().selectAllChildren(sp);
      const fin=ok=>{sp.contentEditable='false';const n=sp.textContent.trim();if(ok&&n&&n!==old){H().renameGroup(g.id,n);g.name=n}else sp.textContent=old};
      sp.addEventListener('keydown',ev=>{if(ev.key==='Enter'){ev.preventDefault();sp.blur()}else if(ev.key==='Escape'){ev.preventDefault();fin(false);sp.onblur=null;sp.blur()}});sp.onblur=()=>fin(true)})},
  // birbirine değen küme adlarını yatayda ayır (ortalanmış etiketler: left = merkez)
  spread(els){const L=[...els].filter(e=>!e.hidden).map(e=>({e,x:parseFloat(e.style.left),y:parseFloat(e.style.top),w:e.offsetWidth,h:e.offsetHeight})).sort((a,b)=>a.x-b.x);
    for(let k=0;k<4;k++)for(let i=0;i<L.length;i++)for(let j=i+1;j<L.length;j++){const a=L[i],b=L[j];if(Math.abs(a.y-b.y)>(a.h+b.h)/2+2)continue;const need=(a.w+b.w)/2+6-(b.x-a.x);if(need>0){a.x-=need/2;b.x+=need/2}}
    L.forEach(o=>{o.x=Math.max(o.w/2+6,Math.min(innerWidth-o.w/2-6,o.x));o.e.style.left=o.x+'px'})},
  hint:()=>mobile()?' · basılı tut: kümele':' · sağ tık: kümele',
  /* sıralı yerleşim (raf/ızgara): kümeler bir arada; aynı satırda iki küme arasında bir boş yuva. Sığmazsa boşluksuz akar.
     → [{r,c}] uygulama başına, rows, ve her kümenin ilk yuvası */
  flow(ns,per,maxRows){const go=gap=>{const out=[];let r=0,c=0;ns.forEach((n,gi)=>{if(gi&&gap){if(c&&c+1+Math.min(n,per)>per){r++;c=0}else if(c)c++}
      for(let j=0;j<n;j++){if(c>=per){r++;c=0}out.push({r,c,gi});c++}});return{at:out,rows:r+1}};
    const a=go(WG.many());return a.rows<=maxRows||!WG.many()?a:go(false)},
  /* ada yerleşimi (petek/harita): her küme altıgen halkalı bir ada, adalar raflar gibi dizilir; sığana kadar küçülür.
     → {pos:[{x,y}] uygulama başına (küme sırasıyla), c: aralık, ctr: küme merkezleri, rc: küme yarıçapları} */
  islands(ns,box,c,lab,ay=1,cols=0){const hx=[[0,0]],dirs=[[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]];for(let k=1;hx.length<60;k++){let q=-k,r=k;for(const[dq,dr]of dirs)for(let s=0;s<k;s++){hx.push([q,r]);q+=dq;r+=dr}}
    // ay: dikey sıklık (1 = düzgün altıgen; Harita'da adlar geniş olduğundan yatayda seyrek, dikeyde sık)
    const off=j=>{if(cols)return{x:(j%cols)-(cols-1)/2,y:Math.floor(j/cols)*.866*ay};const[q,r]=hx[j];return{x:q+r/2,y:r*.866*ay}},ext=n=>{let x=.5,y=.5*ay;for(let j=0;j<n;j++){const o=off(j);x=Math.max(x,Math.abs(o.x)+.5);y=Math.max(y,Math.abs(o.y)+.5*ay)}
      if(ay===1){const r=Math.max(...Array.from({length:n},(_,j)=>{const o=off(j);return Math.hypot(o.x,o.y)+.5}),.5);return{x:r,y:r}}return{x,y}};
    let pl=null;for(let t=0;t<14;t++){const rx=ns.map(n=>c*ext(n).x),ry=ns.map(n=>c*ext(n).y),rows=[[]];let rw=0;const gap=c*.5;
      ns.forEach((n,gi)=>{const w=rx[gi]*2;if(rows[rows.length-1].length&&rw+gap+w>box.w){rows.push([]);rw=0}rows[rows.length-1].push(gi);rw+=(rw?gap:0)+w});
      const rh=rows.map(r=>Math.max(...r.map(gi=>ry[gi]*2))+lab),vg=gap*.6*Math.min(1,ay*1.6),tot=rh.reduce((a,b)=>a+b,0)+(rows.length-1)*vg;
      if((tot<=box.h&&Math.max(...rows.map(r=>r.reduce((a,gi)=>a+rx[gi]*2,0)+(r.length-1)*gap))<=box.w)||t===13){pl={rows,rx,rh,tot,gap,vg};break}c*=.92}
    const ctr=[];let y=box.y+(box.h-pl.tot)/2;pl.rows.forEach((r,ri)=>{const w=r.reduce((a,gi)=>a+pl.rx[gi]*2,0)+(r.length-1)*pl.gap;let x=box.x+(box.w-w)/2;
      r.forEach(gi=>{ctr[gi]={x:x+pl.rx[gi],y:y+lab/2+pl.rh[ri]/2};x+=pl.rx[gi]*2+pl.gap});y+=pl.rh[ri]+pl.vg});
    const pos=[];ns.forEach((n,gi)=>{for(let j=0;j<n;j++){const o=off(j);pos.push({x:ctr[gi].x+o.x*c,y:ctr[gi].y+o.y*c})}});return{pos,c,ctr}}};

/* ═════════════ MIKNATIS ═════════════
   Açık zemin üstünde sıvı metal (ferrofluid) damlaları. İmleç bir mıknatıs: yaklaştıkça damlalar ona doğru uzar,
   birbirine ve imleçteki damlaya karışır (SVG “goo” süzgeci), mıknatısın çevresinde dikenler çıkar. Bırakınca yaylanarak yerine döner.
   · Gruplar: her grup ayrı damla kümesi, altında adı (galaksiyle aynı gruplar). Ada çift tık: yeniden adlandır.
   · Taşıma: damlayı basılı tutup sürükle → bıraktığın yerde kalır (appshell:mg.pos, ekran oranı). Başka kümenin yanına bırakırsan o gruba geçer.
     Sağ tık: gruba taşı / yeni grup / gruptan çıkar.
   · Widget'lar (büyük damlalar): Çalışma, Bugün, Son not — Düzen menüsünden aç/kapat; onlar da taşınır. */
const MGK='appshell:mg';
const MG={WD:[['study','Çalışma'],['todo','Bugün'],['note','Son not']],
  cfg:(()=>{const d={pos:{},w:{study:1,todo:1,note:1}};try{return Object.assign(d,JSON.parse(localStorage.getItem(MGK))||{})}catch{return d}})(),
  save(){try{localStorage.setItem(MGK,JSON.stringify(MG.cfg))}catch{}},
  html:d=>{const G=MG.G=WG.of(d).G;MG.sig=WG.sig;
    MG.items=[...G.flatMap((g,gi)=>g.apps.map(a=>({k:a.key,a,gi}))),...MG.WD.filter(([k])=>MG.cfg.w[k]).map(([k,n])=>({k:'w:'+k,w:k,n}))];
    return`<div class="mg">${wxTop(d)}
    <svg class="mg-svg" aria-hidden="true" focusable="false"><filter id="mgGoo" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur in="SourceGraphic" stdDeviation="10"/><feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 26 -12"/></filter></svg>
    <div class="mg-goo" aria-hidden="true">${MG.items.map(()=>'<i class="mg-b"></i>').join('')}<i class="mg-c"></i>${'<i class="mg-s"></i>'.repeat(9)}</div>
    <div class="mg-gls">${G.length>1?G.map((g,gi)=>`<p class="mg-gl${g.id[0]==='_'?'':' ed'}" data-g="${gi}" style="--gc:${esc(g.color)}" title="${g.id[0]==='_'?'Otomatik grup':'Çift tık: yeniden adlandır'}"><i></i><span>${esc(g.name)}</span></p>`).join(''):''}</div>
    <div class="mg-apps" role="list" aria-label="Uygulamalar">${MG.items.map((it,i)=>it.w?`<div class="mg-a mg-w" role="listitem" data-i="${i}" title="Sürükleyerek taşı"><div class="mg-wi" data-live="mg_${it.w}"></div></div>`
      :`<button class="mg-a" role="listitem" data-i="${i}" data-app="${esc(it.k)}" aria-label="${esc(it.a.name)}${G.length>1?' — '+esc(G[it.gi].name):''}" title="${esc(it.a.name)}${it.a.desc?' · '+esc(it.a.desc):''}"><i class="mg-hl" aria-hidden="true"></i>${appIcon(it.a)}<b>${esc(it.a.name)}</b></button>`).join('')}</div>
    <div class="mg-menu" role="dialog" aria-label="Düzen" hidden><p class="mg-mk">Widget'lar</p>${MG.WD.map(([k,n])=>`<button class="mg-tg" role="switch" data-mw="${k}" aria-checked="${!!MG.cfg.w[k]}"><span>${n}</span><i aria-hidden="true"></i></button>`).join('')}
      <button class="mg-rs" data-mg="reset">Yerleri sıfırla</button><p class="mg-mh">Damlaları sürükleyerek taşı · başka kümenin yanına bırak: o kümeye geçer · sağ tık / basılı tut: küme seçenekleri</p></div>
    <nav class="wx-nav" aria-label="Mıknatıs"><button data-act="ara">Ara</button><button data-act="today">Bugün</button><button data-mg="menu" aria-expanded="false">Düzen</button><button data-act="world">Arayüz</button>${dice()}</nav>
    <p class="wx-hint">${mobile()?'Damlaları sürükle · parmağını gezdir':'İmleci yaklaştır — mıknatıs gibi çeker · sürükleyerek taşı'}${WG.hint()}</p></div>`},
  live:{
    mg_study:d=>{const p=d.goal?Math.min(1,d.today/d.goal):0;return`<button class="mg-wb" data-app="p:studylog" aria-label="Çalışma: bugün ${fmt(d.today)}"><i class="mg-ring" style="--p:${Math.round(p*100)}" aria-hidden="true"></i><small>Çalışma</small><b>${fmt(d.today)}</b><span>${d.goal?'hedef '+fmt(d.goal):'bugün'}</span></button>`},
    mg_todo:d=>{const f=d.todos.find(t=>!t.done);return`<button class="mg-wb" data-act="today" aria-label="Bugün: ${d.open} açık görev"><small>Bugün</small><b>${d.open}</b><span>${d.open?'açık görev':'her şey tamam'}</span>${f?`<em>${esc(f.t)}</em>`:''}</button>`},
    mg_note:d=>{const n=d.notes[0];return n?`<button class="mg-wb" data-note="${esc(n.id)}" aria-label="Son not: ${esc(n.title)}"><small>Son not</small><b class="t">${esc(n.icon)} ${esc(n.title)}</b><span>${ago(n.up)}</span></button>`:`<button class="mg-wb" data-act="ara"><small>Son not</small><b class="t">Henüz not yok</b></button>`}},
  // varsayılan yerleşim: widget'lar sağda sütun (telefonda üstte satır); gruplar kendi kümeleri, raflar gibi soldan sağa dizilir
  lay(root){const S=MG.S,m=mobile(),W=innerWidth,Hh=innerHeight,its=MG.items,nw=its.filter(x=>x.w).length;let D=m?58:74;const Dw=m?Math.round(D*1.95):Math.round(D*2.05);
    let ax=m?14:40,ay=m?112:116,aw=W-(m?28:80),ah=Hh-ay-(m?118:128);
    const wpos=[];if(nw){if(m){const y=ay+Dw/2,st=Math.min(Dw+12,(W-24)/nw);for(let j=0;j<nw;j++)wpos.push({x:W/2+(j-(nw-1)/2)*st,y});ay+=Dw+20;ah-=Dw+20}
      else{const st=Math.min(Dw+22,(ah)/nw);for(let j=0;j<nw;j++)wpos.push({x:W-40-Dw/2,y:ay+st*(j+.5)});aw-=Dw+60}}
    const G=MG.G,ns=G.map(g=>g.apps.length);let c=D*1.32,place=null;
    // küme içi yerleşim: altıgen halkalar (ortada bir, çevresinde altı…) — küçük gruplar sıkı ama isimler çakışmaz
    const hx=[[0,0]],dirs=[[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]];for(let k=1;hx.length<40;k++){let q=-k,r=k;for(const[dq,dr]of dirs)for(let s=0;s<k;s++){hx.push([q,r]);q+=dq;r+=dr}}
    const off=j=>{const[q,r]=hx[j];return{x:q+r/2,y:r*1.04}},ext=n=>{let m=0;for(let j=0;j<n;j++){const o=off(j);m=Math.max(m,Math.hypot(o.x,o.y))}return m};
    for(let tries=0;tries<8;tries++){const rc=ns.map(n=>c*ext(n)+D*.62),rows=[[]];let rw=0;const gap=m?18:44;
      ns.forEach((n,gi)=>{const w=rc[gi]*2;if(rows[rows.length-1].length&&rw+gap+w>aw){rows.push([]);rw=0}rows[rows.length-1].push(gi);rw+=(rw?gap:0)+w});
      const rh=rows.map(r=>Math.max(...r.map(gi=>rc[gi]*2))+(G.length>1?30:0)),tot=rh.reduce((a,b)=>a+b,0)+(rows.length-1)*(m?14:24);
      if(tot<=ah||tries===7){place={rows,rc,rh,tot,gap};break}c*=.9;D=Math.max(40,Math.min(D,c/1.32))}
    S.D=D;S.R=Math.min(280,Math.max(170,c*3.2));const ctr=[];let y=ay+(ah-place.tot)/2;
    place.rows.forEach((r,ri)=>{const w=r.reduce((a,gi)=>a+place.rc[gi]*2,0)+(r.length-1)*place.gap;let x=ax+(aw-w)/2;r.forEach(gi=>{ctr[gi]={x:x+place.rc[gi],y:y+place.rh[ri]/2-(G.length>1?12:0)};x+=place.rc[gi]*2+place.gap});y+=place.rh[ri]+(m?14:24)});
    const k=new Array(G.length).fill(0);let wj=0;
    its.forEach((it,i)=>{let h;if(it.w){h=wpos[wj++];S.d[i]=Dw}else{const g=ctr[it.gi],o=off(k[it.gi]++);h={x:g.x+o.x*c,y:g.y+o.y*c};S.d[i]=D}
      const sp=MG.cfg.pos[it.k];if(sp)h={x:sp.x*W,y:sp.y*Hh};S.h[i]=MG.clamp(h,S.d[i]);if(!S.p[i]){S.p[i]={...S.h[i]};S.v[i]={x:0,y:0}}
      S.b[i].style.setProperty('--d',S.d[i]+'px');S.a[i].style.setProperty('--d',S.d[i]+'px')});
    root.style.setProperty('--D',D+'px');MG.labels(root)},
  clamp(h,d){const m=mobile();return{x:Math.max(d/2+6,Math.min(innerWidth-d/2-6,h.x)),y:Math.max((m?100:104)+d/2,Math.min(innerHeight-(m?104:112)-d/2,h.y))}},
  // grup adları: kümenin altında, üyelerin bulunduğu yere göre
  labels(root){const S=MG.S;root.querySelectorAll('.mg-gl').forEach(el=>{const gi=+el.dataset.g,ix=MG.items.map((it,i)=>it.gi===gi&&!it.w?i:-1).filter(i=>i>=0);if(!ix.length){el.hidden=true;return}
    const x=ix.reduce((a,i)=>a+S.h[i].x,0)/ix.length,y=Math.max(...ix.map(i=>S.h[i].y))+S.D/2+22;el.style.transform=`translate(${x.toFixed(0)}px,${y.toFixed(0)}px)`})},
  // bırakınca: yer kaydedilir, üst üste binen damlalar itilir, başka kümenin yanındaysa o gruba geçer
  drop(root,i){const S=MG.S,it=MG.items[i],W=innerWidth,Hh=innerHeight,moved=new Set([i]);
    for(let r=0;r<24;r++){let any=false;for(let j=0;j<S.h.length;j++){if(j===i)continue;for(const a of [i,...moved]){if(a===j)continue;const A=S.h[a],B=S.h[j],dx=B.x-A.x,dy=B.y-A.y,dd=Math.hypot(dx,dy)||1,mn=(S.d[a]+S.d[j])/2+6;
        if(dd<mn){const f=(mn-dd);S.h[j]=MG.clamp({x:B.x+dx/dd*f,y:B.y+dy/dd*f},S.d[j]);moved.add(j);any=true}}}if(!any)break}
    for(const j of moved)MG.cfg.pos[MG.items[j].k]={x:+(S.h[j].x/W).toFixed(4),y:+(S.h[j].y/Hh).toFixed(4)};MG.save();MG.labels(root);MG.L?.go();
    if(it.w||MG.G.length<2)return;let best=-1,bd=1e9;MG.items.forEach((o,j)=>{if(j===i||o.w)return;const dd=Math.hypot(S.h[j].x-S.h[i].x,S.h[j].y-S.h[i].y);if(dd<bd){bd=dd;best=j}});
    if(best<0||bd>S.D*2.1)return;const tg=MG.G[MG.items[best].gi];MG.toGroup(it,tg)},
  // küme değiştirme ve sağ tık menüsü: bütün arayüzlerle ortak (WG)
  toGroup(it,tg,name){WG.move(it.a,tg,name)},
  ctx(root,i,x,y){WG.menu(root,MG.items[i].a,x,y)},
  mount(root){const S=MG.S={n:MG.items.length,a:[...root.querySelectorAll('.mg-a')],b:[...root.querySelectorAll('.mg-b')],c:root.querySelector('.mg-c'),sp:[...root.querySelectorAll('.mg-s')],goo:root.querySelector('.mg-goo'),
      h:[],p:[],v:[],d:[],pl:[],o:{x:0,y:0},ob:'',cp:{x:innerWidth/2,y:innerHeight/2},cv:{x:0,y:0},cs:0,near:0,pd:null};
    MG.lay(root);const calm=calmMotion();
    // süzgeç sadece damlaların kapladığı alanda (tam ekran bulanıklaştırmak pahalı); alan 64 px adımlarla büyür/küçülür
    const box=()=>{let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(let i=0;i<S.n;i++){const p=S.p[i],r=S.d[i]*.75;x0=Math.min(x0,p.x-r);y0=Math.min(y0,p.y-r);x1=Math.max(x1,p.x+r);y1=Math.max(y1,p.y+r)}
      if(S.cs>1){const r=S.cs*2.4;x0=Math.min(x0,S.cp.x-r);y0=Math.min(y0,S.cp.y-r);x1=Math.max(x1,S.cp.x+r);y1=Math.max(y1,S.cp.y+r)}
      const q=64,X0=Math.max(0,Math.floor((x0-30)/q)*q),Y0=Math.max(0,Math.floor((y0-30)/q)*q),X1=Math.min(innerWidth,Math.ceil((x1+30)/q)*q),Y1=Math.min(innerHeight,Math.ceil((y1+30)/q)*q),k=X0+','+Y0+','+X1+','+Y1;
      if(k!==S.ob){S.ob=k;S.o={x:X0,y:Y0};S.goo.style.cssText=`left:${X0}px;top:${Y0}px;width:${X1-X0}px;height:${Y1-Y0}px`}};
    const draw=t=>{box();const o=S.o;for(let i=0;i<S.n;i++){const p=S.p[i],pl=S.pl[i]||0,sc=MG.items[i].w?1+pl*.08:1+pl*.22;
        S.b[i].style.transform=`translate(${(p.x-o.x).toFixed(1)}px,${(p.y-o.y).toFixed(1)}px) scale(${sc.toFixed(3)})`;
        S.a[i].style.transform=`translate(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px) scale(${sc.toFixed(3)})`;S.a[i].style.setProperty('--n',pl.toFixed(2))}
      const cs=S.cs;S.c.style.transform=`translate(${(S.cp.x-o.x).toFixed(1)}px,${(S.cp.y-o.y).toFixed(1)}px) scale(${(cs/40).toFixed(3)})`;
      const k=S.sp.length;for(let j=0;j<k;j++){const an=j/k*Math.PI*2+t*.00045,len=cs*(.55+.55*S.near+.12*Math.sin(t*.004+j*1.7)),sz=cs*(.22+.3*S.near)/40;
        S.sp[j].style.transform=`translate(${(S.cp.x-o.x+Math.cos(an)*len).toFixed(1)}px,${(S.cp.y-o.y+Math.sin(an)*len).toFixed(1)}px) scale(${Math.max(0,sz).toFixed(3)})`}};
    const L=MG.L=wxLoop((dt,t)=>{const P=MG.P,R=S.R,drag=S.pd?.on?S.pd.i:-1,on=P.in&&drag<0&&!calm;let busy=drag>=0,near=0;
      for(let i=0;i<S.n;i++){const h=S.h[i],p=S.p[i],v=S.v[i];if(calm){p.x=h.x;p.y=h.y;S.pl[i]=0;continue}
        const d=Math.hypot(P.x-h.x,P.y-h.y);let pl=on&&!MG.items[i].w?Math.max(0,1-d/R):0;pl*=pl;S.pl[i]=pl;near=Math.max(near,pl);
        const tx=h.x+(P.x-h.x)*pl*.62,ty=h.y+(P.y-h.y)*pl*.62,K=i===drag?520:130,C=i===drag?40:15,ax=(tx-p.x)*K-v.x*C,ay=(ty-p.y)*K-v.y*C;
        v.x+=ax*dt;v.y+=ay*dt;p.x+=v.x*dt;p.y+=v.y*dt;if(Math.abs(v.x)+Math.abs(v.y)>3||Math.abs(tx-p.x)+Math.abs(ty-p.y)>.4)busy=true}
      S.near+=(near-S.near)*Math.min(1,dt*8);const ts=on?24+46*S.near:0;S.cs+=(ts-S.cs)*Math.min(1,dt*(on?10:6));
      const ax=(P.x-S.cp.x)*320-S.cv.x*26,ay=(P.y-S.cp.y)*320-S.cv.y*26;S.cv.x+=ax*dt;S.cv.y+=ay*dt;S.cp.x+=S.cv.x*dt;S.cp.y+=S.cv.y*dt;
      if(!calm&&(Math.abs(ts-S.cs)>.3||Math.abs(S.cv.x)+Math.abs(S.cv.y)>4||(on&&S.near>.02)))busy=true;draw(t);return busy});
    MG.P=wxPtr(root,L);
    // sürükle-bırak (7 px'ten fazla hareket = taşıma; kısa tık = aç)
    root.addEventListener('pointerdown',e=>{const el=e.target.closest('.mg-a');if(!el||e.button)return;S.pd={i:+el.dataset.i,x:e.clientX,y:e.clientY,el,id:e.pointerId,on:false}});
    root.addEventListener('pointermove',e=>{const d=S.pd;if(!d)return;if(!d.on){if(Math.hypot(e.clientX-d.x,e.clientY-d.y)<7)return;d.on=true;d.ox=S.h[d.i].x-d.x;d.oy=S.h[d.i].y-d.y;
        try{d.el.setPointerCapture(d.id)}catch{}root.classList.add('mg-drag');d.el.classList.add('drag')}
      S.h[d.i]=MG.clamp({x:e.clientX+d.ox,y:e.clientY+d.oy},S.d[d.i]);L.go()});
    const end=()=>{const d=S.pd;S.pd=null;if(!d||!d.on)return;MG.jd=Date.now();root.classList.remove('mg-drag');d.el.classList.remove('drag');MG.drop(root,d.i)};
    root.addEventListener('pointerup',end);root.addEventListener('pointercancel',end);
    root.addEventListener('click',e=>{if(MG.jd&&Date.now()-MG.jd<350){e.stopPropagation();e.preventDefault();return}
      const mb=e.target.closest('[data-mg]');if(mb){e.stopPropagation();const menu=root.querySelector('.mg-menu');if(mb.dataset.mg==='menu'){menu.hidden=!menu.hidden;mb.setAttribute('aria-expanded',!menu.hidden)}
        else if(mb.dataset.mg==='reset'){MG.cfg.pos={};MG.save();rebuild()}return}
      const tw=e.target.closest('[data-mw]');if(tw){e.stopPropagation();const k=tw.dataset.mw;MG.cfg.w[k]=MG.cfg.w[k]?0:1;MG.save();MG.keepMenu=true;rebuild()}},true);
    root.addEventListener('pointerdown',e=>{const menu=root.querySelector('.mg-menu');if(!menu.hidden&&!e.target.closest('.mg-menu,[data-mg=menu]')){menu.hidden=true;root.querySelector('[data-mg=menu]').setAttribute('aria-expanded','false')}},true);
    // sağ tık / telefonda basılı tut: küme menüsü (bütün arayüzlerle ortak)
    WG.wire(root,MG.items.filter(it=>!it.w).map(it=>it.a));
    // grup adına çift tık: yeniden adlandır
    root.addEventListener('dblclick',e=>{const l=e.target.closest('.mg-gl.ed');if(!l)return;const g=MG.G[+l.dataset.g],sp=l.querySelector('span'),old=sp.textContent;sp.contentEditable='true';sp.focus();document.getSelection().selectAllChildren(sp);
      const fin=ok=>{sp.contentEditable='false';const n=sp.textContent.trim();if(ok&&n&&n!==old){H().renameGroup(g.id,n);g.name=n}else sp.textContent=old};
      sp.addEventListener('keydown',ev=>{if(ev.key==='Enter'){ev.preventDefault();sp.blur()}else if(ev.key==='Escape'){ev.preventDefault();fin(false);sp.onblur=null;sp.blur()}});sp.onblur=()=>fin(true)});
    if(MG.keepMenu){MG.keepMenu=false;const mn=root.querySelector('.mg-menu');mn.hidden=false;root.querySelector('[data-mg=menu]').setAttribute('aria-expanded','true')}
    draw(0);L.go()},
  unmount(){MG.L?.stop();MG.L=null},
  resize(root){MG.lay(root);MG.L?.go()}};

/* ═════════════ RÜZGÂR ═════════════
   Uygulamalar ince iplerle raylardan sarkan rüzgâr çanları (Calder’ın hareketli heykellerinden esinlenme).
   İmleç geçtiği yerde rüzgâr estirir: çanlar imlecin hızı ve yönüyle sallanır, sarkaç gibi yavaşça durulur; ara sıra hafif esinti. */
const RZ={
  html:d=>{const{G,list}=WG.of(d);RZ.list=list;return`<div class="rz">${wxTop(d)}<div class="rz-rails" aria-hidden="true"></div>${WG.many()?`<div class="rz-gl">${G.map((g,gi)=>WG.lab(g,gi,'rz-l')).join('')}</div>`:''}
    <div class="rz-hs" role="list" aria-label="Uygulamalar">${list.map((a,i)=>`<div class="rz-h" data-i="${i}"><i class="rz-str" aria-hidden="true"></i><button class="rz-b" role="listitem" data-app="${esc(a.key)}" aria-label="${esc(a.name)}" title="${esc(a.desc)}">${appIcon(a)}<b>${esc(a.name)}</b></button></div>`).join('')}</div>
    ${wxNav('Rüzgâr')}<p class="wx-hint">${mobile()?'Parmağını çanların arasından geçir':'İmleci çanların arasından geçir — rüzgâr eser'}${WG.hint()}</p></div>`},
  lay(root){const T=RZ.T,m=mobile(),W=innerWidth,Hh=innerHeight,n=T.n,B=m?54:68,gap=m?12:30;root.style.setProperty('--bz',B+'px');
    let per=Math.max(3,Math.floor((W-(m?20:140))/(B+gap)));if(!WG.many()){const rows=Math.ceil(n/per);per=Math.ceil(n/rows)}
    const top=m?112:122,avail=Hh-top-(m?118:126),many=WG.many();
    // kümeler: her küme kendi rayında (sığmazsa aynı rayda aralıklı); rayın başında küme adı
    const F=WG.flow(WG.G.map(g=>g.apps.length),per,Math.max(1,Math.floor(avail/(B+(many?96:70))))),rows=F.rows,lt=many?26:0,rowH=(avail-lt)/rows,
      wide=[];F.at.forEach(o=>{wide[o.r]=Math.max(wide[o.r]||0,o.c)});const st=Math.min(B+gap*2.2,(W-(m?20:140))/(Math.max(...wide)+1));
    const rails=[];T.e=[];
    for(let i=0;i<n;i++){const o=F.at[i],r=o.r,c=o.c,x=W/2+(c-wide[r]/2)*st,y=top+lt+r*rowH,
        L=Math.max(24,Math.min(rowH-B-(many?60:34),rowH*(c%2?.34:.58)*(.82+.36*prand(i+5))));T.e[i]={x,y,L,lp:L+B/2,th:T.e?.[i]?.th||0,w:0};
      const h=T.el[i];h.style.left=x+'px';h.style.top=y+'px';h.style.setProperty('--L',L+'px');const rk=many?r+':'+o.gi:r;
      if(!rails[rk])rails[rk]={y,x0:x,x1:x,gi:o.gi};rails[rk].x0=Math.min(rails[rk].x0,x);rails[rk].x1=Math.max(rails[rk].x1,x)}
    const rl=Object.values(rails);root.querySelector('.rz-rails').innerHTML=rl.map(r=>`<i style="left:${r.x0-st*.42}px;top:${r.y}px;width:${r.x1-r.x0+st*.84}px${many?';--gc:'+esc(WG.G[r.gi].color):''}"></i>`).join('');
    // küme adı: kümenin ilk rayının sol üstünde
    root.querySelectorAll('.rz-l').forEach(el=>{const r=rl.find(x=>x.gi===+el.dataset.g);if(!r){el.hidden=true;return}el.style.left=Math.max(8,r.x0-st*.42)+'px';el.style.top=(r.y-30)+'px'})},
  mount(root){const T=RZ.T={n:0,el:[...root.querySelectorAll('.rz-h')]};T.n=T.el.length;RZ.lay(root);WG.wire(root,RZ.list);if(calmMotion())return;
    const draw=()=>{for(let i=0;i<T.n;i++)T.el[i].style.transform=`rotate(${T.e[i].th.toFixed(4)}rad)`};
    const L=RZ.L=wxLoop(dt=>{const P=RZ.P,fresh=P.in&&performance.now()-P.t<60;let busy=false;
      for(let i=0;i<T.n;i++){const e=T.e[i];
        // imlecin ip/çan çizgisine uzaklığı → yakınsa imlecin yatay hızı kadar itme
        if(fresh&&(P.vx||P.vy)){const s=Math.sin(e.th),c=Math.cos(e.th),bx=e.x+s*e.lp,by=e.y+c*e.lp,vx=bx-e.x,vy=by-e.y,t=Math.max(0,Math.min(1,((P.x-e.x)*vx+(P.y-e.y)*vy)/(vx*vx+vy*vy))),
            dd=Math.hypot(P.x-(e.x+vx*t),P.y-(e.y+vy*t)),R=46;if(dd<R){const f=(1-dd/R)*(.4+t*.6);e.w+=(P.vx*c-P.vy*s*.3)*f*.9/e.lp*60*dt*4}}
        const a=-(2600/e.lp)*Math.sin(e.th)-2.3*e.w;e.w+=a*dt;e.th+=e.w*dt;e.th=Math.max(-1.1,Math.min(1.1,e.th));if(Math.abs(e.th)>.004||Math.abs(e.w)>.012)busy=true}
      P.vx*=.5;P.vy*=.5;draw();return busy||fresh});
    const P=RZ.P=wxPtr(root,L);P.vx=0;P.vy=0;let lx=P.x,ly=P.y;
    root.addEventListener('pointermove',e=>{P.vx=Math.max(-60,Math.min(60,e.clientX-lx));P.vy=Math.max(-60,Math.min(60,e.clientY-ly));lx=e.clientX;ly=e.clientY},{passive:true});
    // ara sıra hafif esinti (sekme gizliyken esmez)
    const breeze=()=>{if(RZ.L!==L)return;if(!document.hidden&&root.isConnected){const dir=Math.random()<.5?-1:1;T.e.forEach((e,i)=>{e.w+=dir*(.12+.18*prand(i+Date.now()%97))*(70/e.lp)});L.go()}RZ.bt=setTimeout(breeze,11000+Math.random()*9000)};
    RZ.bt=setTimeout(breeze,2500)},
  unmount(){RZ.L?.stop();RZ.L=null;clearTimeout(RZ.bt)},
  resize(root){RZ.lay(root);RZ.L?.go()}};

/* ═════════════ PETEK ═════════════
   Bal peteği gibi dizilmiş yuvarlak uygulamalar (Apple Watch’un petek ekranından esinlenme). İmleç bir büyüteç:
   yaklaştığı uygulamalar büyür ve komşularını iter, uzaktakiler küçülür. Klavyede oklar büyüteci gezdirir, Enter açar. */
const PT={sel:0,
  html:d=>{const{G,list}=WG.of(d);PT.list=list;return`<div class="pt">${wxTop(d)}<i class="pt-lens" aria-hidden="true"></i>${WG.many()?`<div class="pt-gl">${G.map((g,gi)=>WG.lab(g,gi,'pt-l')).join('')}</div>`:''}
    <div class="pt-bs" role="list" aria-label="Uygulamalar">${list.map((a,i)=>`<button class="pt-b" role="listitem" data-i="${i}" data-app="${esc(a.key)}" aria-label="${esc(a.name)}" title="${esc(a.desc)}">${appIcon(a)}<b>${esc(a.name)}</b></button>`).join('')}</div>
    <p class="pt-cap" aria-live="polite"><b></b><span></span></p>
    ${wxNav('Petek')}<p class="wx-hint">${mobile()?'Parmağını gezdir — büyüteç gibi':'İmleç büyüteç gibi · oklar ve Enter'}${WG.hint()}</p></div>`},
  lay(root){const T=PT.T,m=mobile(),W=innerWidth,Hh=innerHeight,n=T.n;
    // her küme bir petek adası (altıgen halkalar, ortadan dışa); adalar sığana kadar küçülür, adın yeri üstte
    const top=m?120:130,bot=m?210:200,many=WG.many(),pad=m?14:50,
      I=WG.islands(WG.G.map(g=>g.apps.length),{x:pad,y:top,w:W-pad*2,h:Hh-top-bot},m?78:104,many?30:0),S=I.c;T.S=S;root.style.setProperty('--bz',(S*.78).toFixed(1)+'px');
    const cx=W/2,cy=top+(Hh-top-bot)/2;T.c={x:cx,y:cy};T.h=I.pos.slice(0,n);
    root.querySelectorAll('.pt-l').forEach(el=>{const gi=+el.dataset.g,c=I.ctr[gi];if(!c){el.hidden=true;return}const ys=T.h.filter((_,i)=>PT.list[i].gi===gi).map(h=>h.y);
      el.style.left=c.x+'px';el.style.top=(Math.min(...ys)-S*.5-10)+'px'});
    if(!T.p.length){T.p=T.h.map(h=>({...h}));T.s=T.h.map(()=>1)}
    if(!T.lp)T.lp={...T.c}},
  mount(root){const el=[...root.querySelectorAll('.pt-b')],T=PT.T={n:el.length,el,h:[],p:[],s:[],lens:root.querySelector('.pt-lens'),cap:root.querySelector('.pt-cap'),kb:false,lp:null,shown:-1};
    PT.sel=0;PT.lay(root);WG.wire(root,PT.list);const calm=calmMotion(),m=mobile();
    const frame=(snap)=>{const P=PT.P,S=T.S,useP=P&&P.in&&!T.kb,tgt=useP?{x:P.x,y:P.y}:T.kb?T.h[PT.sel]:T.c;
      const k=snap?1:.2;T.lp.x+=(tgt.x-T.lp.x)*k;T.lp.y+=(tgt.y-T.lp.y)*k;const R=S*2.15,smin=m?.94:.62,smax=m?1.25:1.4;let busy=Math.abs(tgt.x-T.lp.x)+Math.abs(tgt.y-T.lp.y)>.4,best=-1,bs=0;
      for(let i=0;i<T.n;i++){const h=T.h[i],dx=h.x-T.lp.x,dy=h.y-T.lp.y,d=Math.hypot(dx,dy)||1,g=Math.exp(-(d*d)/(R*R)),s=smin+(smax-smin)*g,
          push=S*.5*g*Math.min(1,d/(S*.7)),tx=h.x+dx/d*push,ty=h.y+dy/d*push,p=T.p[i],kk=snap?1:.22;
        p.x+=(tx-p.x)*kk;p.y+=(ty-p.y)*kk;T.s[i]+=(s-T.s[i])*kk;if(Math.abs(tx-p.x)+Math.abs(ty-p.y)+Math.abs(s-T.s[i])*40>.3)busy=true;
        if(T.s[i]>bs){bs=T.s[i];best=i}
        T.el[i].style.transform=`translate(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px) scale(${T.s[i].toFixed(3)})`;T.el[i].style.setProperty('--o',m||i===T.shown?0:Math.max(0,Math.min(1,(T.s[i]-1.05)*4)).toFixed(2));T.el[i].style.zIndex=Math.round(T.s[i]*100)}
      T.lens.style.transform=`translate(${T.lp.x.toFixed(1)}px,${T.lp.y.toFixed(1)}px)`;T.lens.style.opacity=useP||T.kb?1:.55;
      // en büyük (büyütecin altındaki) uygulamanın adı ve açıklaması altta
      const show=(useP||T.kb||m)&&bs>(m?1.1:1.15)?best:-1;if(show!==T.shown){T.shown=show;const a=show<0?null:PT.list[show];T.cap.classList.toggle('on',!!a);
        if(a){T.cap.querySelector('b').textContent=a.name;T.cap.querySelector('span').textContent=a.desc||''}}
      return busy};
    if(calm){T.c={...T.c};frame(true);root.addEventListener('focusin',e=>{const b=e.target.closest('.pt-b');if(b){PT.sel=+b.dataset.i;T.kb=true;frame(true)}});return}
    const L=PT.L=wxLoop(()=>frame(false));PT.P=wxPtr(root,L);
    root.addEventListener('pointermove',()=>{if(T.kb){T.kb=false}},{passive:true});
    root.addEventListener('focusin',e=>{const b=e.target.closest('.pt-b');if(b&&b.matches(':focus-visible')){PT.sel=+b.dataset.i;T.kb=true;L.go()}});
    frame(true);L.go()},
  key(root,e){const T=PT.T;if(!T)return;const k=e.key;if(k==='Enter'&&T.kb){e.preventDefault();T.el[PT.sel]?.click();return}
    const dv={ArrowRight:[1,0],ArrowLeft:[-1,0],ArrowDown:[0,1],ArrowUp:[0,-1]}[k];if(!dv)return;e.preventDefault();
    const c=T.h[PT.sel];let best=-1,bd=1e9;T.h.forEach((h,i)=>{if(i===PT.sel)return;const dx=h.x-c.x,dy=h.y-c.y,along=dx*dv[0]+dy*dv[1];if(along<=1)return;const side=Math.abs(dx*dv[1]-dy*dv[0]),sc=along+side*2.2;if(sc<bd){bd=sc;best=i}});
    if(best>=0)PT.sel=best;T.kb=true;T.el[PT.sel].focus({preventScroll:true});PT.L?.go()},
  unmount(){PT.L?.stop();PT.L=null;PT.T=null},
  resize(root){const T=PT.T;if(!T)return;T.p=[];T.lp=null;PT.lay(root);PT.L?.go()}};

/* ═════════════ KUM ═════════════
   Uygulama adları kuma yazılmış (her ad binlerce kum tanesi). İmleç kumu üfler: taneler imlecin hızı ve yönüyle savrulur,
   yay gibi yazıya geri döner. Açılışta taneler dağınıktan yazıya toplanır. */
const KM={
  html:d=>{const{G,list}=WG.of(d);KM.list=list;return`<div class="km">${wxTop(d)}<canvas class="km-cv" aria-hidden="true"></canvas>${WG.many()?`<div class="km-gl">${G.map((g,gi)=>WG.lab(g,gi,'km-l')).join('')}</div>`:''}
    <div class="km-g" role="list" aria-label="Uygulamalar">${list.map(a=>`<button class="km-a" role="listitem" data-app="${esc(a.key)}" aria-label="${esc(a.name)}" title="${esc(a.desc)}">${appIcon(a)}<span class="km-n" aria-hidden="true">${esc(a.name)}</span></button>`).join('')}</div>
    ${wxNav('Kum')}<p class="wx-hint">${mobile()?'Parmağını kumda gezdir':'İmleci kumda gezdir — taneleri üfler'}${WG.hint()}</p></div>`},
  lay(root){const K=KM.K,m=mobile(),W=innerWidth,Hh=innerHeight,n=K.n,cols=m?2:Math.min(4,Math.ceil(Math.sqrt(n*1.4))),top=m?120:140,bot=m?120:130,many=WG.many(),
      // kümeler bir arada: aynı satırda iki küme arasında bir boş hücre; her kümenin ilk hücresinin üstünde adı
      F=WG.flow(WG.G.map(g=>g.apps.length),cols,Math.max(1,Math.floor((Hh-top-bot)/(m?78:104)))),rows=F.rows,wide=[],
      cw=Math.min(m?(W-24)/cols:300,(W-80)/cols),bands=m&&many?new Set(WG.G.map((g,gi)=>F.at.find(o=>o.gi===gi)?.r)).size:0,ch=Math.min(m?120:150,(Hh-top-bot-bands*24)/rows),fs=m?Math.min(28,cw/6.2):Math.min(40,cw/7.5),dpr=Math.min(1.5,devicePixelRatio||1);
    const cv=K.cv;cv.width=W*dpr;cv.height=Hh*dpr;K.ctx=cv.getContext('2d');K.ctx.setTransform(dpr,0,0,dpr,0,0);K.fs=fs;
    const oc=document.createElement('canvas'),ox=oc.getContext('2d',{willReadFrequently:true}),gap=m?2:Math.max(3,Math.round(fs/12));K.h=[];K.c=[];
    F.at.forEach(o=>{wide[o.r]=Math.max(wide[o.r]??0,o.c)});const firsts=new Map(),ry=[];
    // telefonda küme adı kendi ince şeridinde (simgeye binmesin)
    {let y=top;const st=new Set(WG.G.map((g,gi)=>F.at.find(o=>o.gi===gi)?.r));for(let r=0;r<rows;r++){if(bands&&st.has(r))y+=24;ry[r]=y;y+=ch}}
    for(let i=0;i<n;i++){const o=F.at[i],r=o.r,c=o.c,x=W/2+(c-wide[r]/2)*cw,y=ry[r]+ch/2,el=K.el[i];if(!firsts.has(o.gi))firsts.set(o.gi,{x:x-cw/2,y:y-ch/2-(bands?26:0)});
      el.style.left=(x-cw/2)+'px';el.style.top=(y-ch/2)+'px';el.style.width=cw+'px';el.style.height=ch+'px';el.style.setProperty('--fs',fs+'px');
      // adı gizli tuvale yaz, piksellerinden tane konumları çıkar
      const txt=el.querySelector('.km-n').textContent;ox.font=`700 ${fs}px ${getComputedStyle(root).fontFamily}`;const tw=Math.min(cw-12,Math.ceil(ox.measureText(txt).width)),th=Math.ceil(fs*1.25);
      oc.width=tw+4;oc.height=th+4;ox.font=`700 ${fs}px ${getComputedStyle(root).fontFamily}`;ox.textBaseline='top';ox.fillStyle='#000';ox.fillText(txt,2,2,tw);
      const dt=ox.getImageData(0,0,oc.width,oc.height).data,bx=x-tw/2,by=y+(m?8:14);
      for(let yy=0;yy<oc.height;yy+=gap)for(let xx=0;xx<oc.width;xx+=gap)if(dt[(yy*oc.width+xx)*4+3]>130)K.h.push(bx+xx+(prand(xx*7+yy)-.5)*1.2,by+yy+(prand(yy*5+xx)-.5)*1.2)}
    root.querySelectorAll('.km-l').forEach(el=>{const f=firsts.get(+el.dataset.g);if(!f){el.hidden=true;return}el.style.left=(f.x+(m?6:14))+'px';el.style.top=(f.y+(m?2:8))+'px'});
    const N=K.h.length/2;if(!K.p||K.p.length!==K.h.length){K.p=new Float32Array(K.h.length);K.v=new Float32Array(K.h.length);K.s=new Float32Array(N);
      for(let j=0;j<N;j++){K.p[j*2]=K.h[j*2]+(Math.random()-.5)*W*.6;K.p[j*2+1]=K.h[j*2+1]+(Math.random()-.5)*Hh*.5;K.s[j]=.55+Math.random()*.45}}
    K.H=Float32Array.from(K.h)},
  draw(){const K=KM.K,c=K.ctx,p=K.p,N=p.length/2,sz=K.fs>30?2.2:1.5;c.clearRect(0,0,innerWidth,innerHeight);
    for(let a=0;a<3;a++){c.fillStyle=['rgba(92,64,38,.95)','rgba(128,92,58,.85)','rgba(166,126,82,.8)'][a];for(let j=a;j<N;j+=3)c.fillRect(p[j*2],p[j*2+1],sz,sz)}},
  mount(root){const el=[...root.querySelectorAll('.km-a')],K=KM.K={n:el.length,el,cv:root.querySelector('.km-cv')};KM.lay(root);WG.wire(root,KM.list);
    if(calmMotion()){K.p=Float32Array.from(K.H);KM.draw();return}
    const L=KM.L=wxLoop(dt=>{const P=KM.P,p=K.p,v=K.v,H=K.H,N=p.length/2,on=P.in&&performance.now()-P.t<80,R=m()?60:85,vx=P.vx||0,vy=P.vy||0;let busy=false;
      for(let j=0;j<N;j++){const i=j*2;let ax=(H[i]-p[i])*60*K.s[j],ay=(H[i+1]-p[i+1])*60*K.s[j];
        if(on){const dx=p[i]-P.x,dy=p[i+1]-P.y,d2=dx*dx+dy*dy;if(d2<R*R){const d=Math.sqrt(d2)||1,f=(1-d/R);ax+=(dx/d*900+vx*38)*f;ay+=(dy/d*900+vy*38)*f}}
        v[i]=(v[i]+ax*dt)*.9;v[i+1]=(v[i+1]+ay*dt)*.9;p[i]+=v[i]*dt;p[i+1]+=v[i+1]*dt;if(!busy&&(Math.abs(v[i])+Math.abs(v[i+1])>1.5||Math.abs(H[i]-p[i])+Math.abs(H[i+1]-p[i+1])>.6))busy=true}
      P.vx=(P.vx||0)*.6;P.vy=(P.vy||0)*.6;KM.draw();return busy||on});
    const m=mobile;const P=KM.P=wxPtr(root,L);let lx=P.x,ly=P.y;root.addEventListener('pointermove',e=>{P.vx=Math.max(-40,Math.min(40,e.clientX-lx));P.vy=Math.max(-40,Math.min(40,e.clientY-ly));lx=e.clientX;ly=e.clientY},{passive:true});
    L.go()},
  unmount(){KM.L?.stop();KM.L=null},
  resize(root){KM.K.p=null;KM.lay(root);if(KM.L)KM.L.go();else KM.draw()}};

/* ═════════════ BALON ═════════════
   Uygulamalar yere iple bağlı helyum balonları. İmleç onları iter (hızıyla), balonlar birbirine çarpıp seker,
   kaldırma kuvvetiyle ipin ucuna geri süzülür. İpler her karede eğri olarak çizilir. */
const BL={
  html:d=>{const{G,list}=WG.of(d);BL.list=list;return`<div class="bl">${wxTop(d)}<canvas class="bl-cv" aria-hidden="true"></canvas>${WG.many()?`<div class="bl-gl">${G.map((g,gi)=>WG.lab(g,gi,'bl-l')).join('')}</div>`:''}
    <div class="bl-g" role="list" aria-label="Uygulamalar">${list.map((a,i)=>`<button class="bl-a" role="listitem" data-app="${esc(a.key)}" style="--hue:${Math.round(prand(i+11)*360)}" aria-label="${esc(a.name)}" title="${esc(a.name)}${a.desc?' · '+esc(a.desc):''}"><i class="bl-k" aria-hidden="true"></i>${appIcon(a)}<b>${esc(a.name)}</b></button>`).join('')}</div>
    ${wxNav('Balon')}<p class="wx-hint">${mobile()?'Balonlara dokun, it':'İmleçle balonları it — çarpışıp yerine süzülürler'}${WG.hint()}</p></div>`},
  lay(root){const B=BL.B,prevE=[...B.e],m=mobile(),W=innerWidth,Hh=innerHeight,n=B.n,r=m?(WG.many()&&n>8?28:32):42,gy=Hh-(WG.many()?(m?138:150):(m?104:112)),cols=Math.min(n,Math.max(3,Math.floor((W-(m?20:120))/(r*2.4)),Math.ceil(n/(m?3:2)))),rows=Math.max(m?3:2,Math.ceil(n/cols)),
      sp=(W-(m?20:120))/cols,top=m?140:150,span=gy-top-r*2;B.r=r;B.gy=gy;root.style.setProperty('--br',r*2+'px');
    const dpr=Math.min(1.5,devicePixelRatio||1);B.cv.width=W*dpr;B.cv.height=Hh*dpr;B.ctx=B.cv.getContext('2d');B.ctx.setTransform(dpr,0,0,dpr,0,0);
    const nc=Math.ceil(n/rows),sp2=Math.min(sp*1.4,(W-(m?40:160))/Math.max(1,nc-1||1));for(let i=0;i<n;i++){const row=i%rows,c=Math.floor(i/rows),x=Math.max(r+10,Math.min(W-r-10,W/2+(c-(nc-1)/2)*sp2*(m?.92:1)+(row-(rows-1)/2)*sp2*(m?.18:.35)+(prand(i+3)-.5)*sp2*.2)),
        L=Math.max(r*1.5,span*((row+.5)/rows)*.92+span*.08+(prand(i+9)-.5)*r);B.e[i]={ax:x,tx:x,ay:gy,L,x:B.e[i]?.x??x,y:B.e[i]?.y??gy-L,vx:0,vy:0}}
    if(!WG.many())return;
    // kümeler: her küme tek düğüme bağlı bir balon demeti (ipler aynı noktada toplanır), düğümün yanında küme adı
    const G=WG.G,room=W-(m?24:140),gapU=r*(m?.9:2.2);let unit=r*2.25,tiers=m?3:2,ks,need;
    for(;tiers<6;tiers++){ks=G.map(g=>Math.ceil(g.apps.length/tiers));need=ks.reduce((a,k)=>a+k*unit,0)+(G.length-1)*gapU;if(need<=room)break}
    if(need>room)unit*=room/need;let x0=W/2-Math.min(need,room)/2,i=0;
    G.forEach((g,gi)=>{const k=ks[gi],w=k*unit,knot=x0+w/2;g.knot=knot;
      g.apps.forEach((a,j)=>{const c=Math.floor(j/tiers),t=j%tiers,off=(c-(k-1)/2)*unit+(t%2?unit*.5:0)*(k>1?1:0),
          L=Math.max(r*1.6,span*(.34+.64*(tiers-t-.5)/tiers)-Math.abs(off)*.18+(prand(i+9)-.5)*r*.3);
        const old=prevE[i];B.e[i]={ax:knot,tx:Math.max(r+8,Math.min(W-r-8,knot+off)),ay:gy,L,x:old?.x??knot+off,y:old?.y??gy-L,vx:0,vy:0};i++});
      x0+=w+gapU});
    root.querySelectorAll('.bl-l').forEach(el=>{const g=G[+el.dataset.g];el.style.left=g.knot+'px';el.style.top=(gy+8)+'px'})},
  draw(){const B=BL.B,c=B.ctx;c.clearRect(0,0,innerWidth,innerHeight);c.lineWidth=1.1;c.strokeStyle='rgba(40,44,60,.38)';
    for(const e of B.e){const bx=e.x,by=e.y+B.r*1.02,mx=(bx+e.ax)/2+(e.vx*.04),my=(by+e.ay)/2;c.beginPath();c.moveTo(bx,by);c.quadraticCurveTo(mx,my,e.ax,e.ay);c.stroke()}
    c.fillStyle='rgba(40,44,60,.55)';for(const e of B.e){c.beginPath();c.arc(e.ax,e.ay,2.2,0,Math.PI*2);c.fill()}
    for(let i=0;i<B.n;i++){const e=B.e[i];B.el[i].style.transform=`translate(${e.x.toFixed(1)}px,${e.y.toFixed(1)}px) rotate(${Math.max(-14,Math.min(14,(e.x-e.ax)*.08)).toFixed(2)}deg)`}},
  mount(root){const el=[...root.querySelectorAll('.bl-a')],B=BL.B={n:el.length,el,e:[],cv:root.querySelector('.bl-cv')};BL.lay(root);WG.wire(root,BL.list);
    if(calmMotion()){BL.draw();return}
    const L=BL.L=wxLoop(dt=>{const P=BL.P,on=P.in&&performance.now()-P.t<90,r=B.r,R=r+46;let busy=on;
      for(const e of B.e){let ax=(e.tx-e.x)*1.6,ay=-260;
        if(on){const dx=e.x-P.x,dy=e.y-P.y,d=Math.hypot(dx,dy)||1;if(d<R){const f=(1-d/R);ax+=dx/d*2600*f+(P.vx||0)*60*f;ay+=dy/d*2600*f+(P.vy||0)*60*f}}
        e.vx=(e.vx+ax*dt)*Math.pow(.2,dt);e.vy=(e.vy+ay*dt)*Math.pow(.2,dt);e.x+=e.vx*dt;e.y+=e.vy*dt;
        // ekran kenarı: balon dışarı taşmaz, yumuşakça geri seker
        if(e.x<r+4){e.x=r+4;e.vx=Math.abs(e.vx)*.3}else if(e.x>innerWidth-r-4){e.x=innerWidth-r-4;e.vx=-Math.abs(e.vx)*.3}
        // ip: balon ip boyundan uzağa gidemez
        const tx=e.x-e.ax,ty=e.y-e.ay,tl=Math.hypot(tx,ty);if(tl>e.L){const k=e.L/tl;e.x=e.ax+tx*k;e.y=e.ay+ty*k;const nx=tx/tl,ny=ty/tl,vn=e.vx*nx+e.vy*ny;if(vn>0){e.vx-=vn*nx;e.vy-=vn*ny}}}
      // balonlar birbirine çarpar
      for(let i=0;i<B.n;i++)for(let j=i+1;j<B.n;j++){const a=B.e[i],b=B.e[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1,mn=r*2+4;if(d<mn){const o=(mn-d)/2,nx=dx/d,ny=dy/d;a.x-=nx*o;a.y-=ny*o;b.x+=nx*o;b.y+=ny*o;
        const rv=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;if(rv<0){a.vx+=rv*nx*.8;a.vy+=rv*ny*.8;b.vx-=rv*nx*.8;b.vy-=rv*ny*.8}}}
      for(const e of B.e)if(Math.abs(e.vx)+Math.abs(e.vy)>2)busy=true;P.vx=(P.vx||0)*.5;P.vy=(P.vy||0)*.5;BL.draw();return busy});
    const P=BL.P=wxPtr(root,L);let lx=P.x,ly=P.y;root.addEventListener('pointermove',e=>{P.vx=Math.max(-50,Math.min(50,e.clientX-lx));P.vy=Math.max(-50,Math.min(50,e.clientY-ly));lx=e.clientX;ly=e.clientY},{passive:true});
    BL.draw();L.go()},
  unmount(){BL.L?.stop();BL.L=null},
  resize(root){BL.lay(root);BL.draw();BL.L?.go()}};

/* ═════════════ KADRAN ═════════════
   Lüks saat kadranı: uygulamalar kadranın çevresinde. Altın ibre imlecin açısını yayla (hafif taşıp oturarak) izler;
   gösterdiği uygulama büyür, adı ve açıklaması ortada. İmleç yokken ibre gerçek saati (dakika) gösterir.
   Kadrana tıkla = gösterileni aç · tekerlek/oklar = bir sonraki · Enter = aç. */
const KD={sel:0,
  html:d=>{const{G,list}=WG.of(d);KD.list=list;return`<div class="kd">${wxTop(d)}<div class="kd-dial" aria-hidden="true"><i class="kd-ticks"></i><i class="kd-in"></i><i class="kd-hand"><i></i></i></div>
    ${WG.many()?`<svg class="kd-arcs" aria-hidden="true"></svg><div class="kd-gl">${G.map((g,gi)=>WG.lab(g,gi,'kd-l')).join('')}</div>`:''}
    <div class="kd-g" role="listbox" aria-label="Uygulamalar">${list.map((a,i)=>`<button class="kd-a" role="option" data-i="${i}" data-app="${esc(a.key)}" aria-label="${esc(a.name)}${WG.many()?' — '+esc(G[a.gi].name):''}" title="${esc(a.desc)}">${appIcon(a)}</button>`).join('')}</div>
    <div class="kd-mid" aria-live="polite"><p class="kd-k"></p><b class="kd-n"></b><span class="kd-d"></span></div>
    ${wxNav('Kadran')}<p class="wx-hint">${mobile()?'Kadranda parmağını döndür · dokun: aç':'İbre imleci izler · kadrana tıkla: aç · tekerlek ve oklar'}${WG.hint()}</p></div>`},
  lay(root){const T=KD.T,m=mobile(),W=innerWidth,Hh=innerHeight,cx=W/2,cy=(m?120:110)+(Hh-(m?120:110)-(m?130:120))/2,R=Math.max(110,Math.min(W*(m?.4:.36),(Hh-(m?250:230))/2));
    T.c={x:cx,y:cy};T.R=R;const dial=root.querySelector('.kd-dial');dial.style.cssText=`left:${cx}px;top:${cy}px;--R:${R}px`;root.querySelector('.kd-mid').style.cssText=`left:${cx}px;top:${cy}px;width:${Math.round(R*.98)}px`;
    // kümeler kadranın dilimleri: aralarında bir boş yuva
    const L=KD.list,gaps=WG.many()?WG.G.length:0,tot=T.n+gaps;T.ang=T.el.map((_,i)=>(i+(gaps?L[i].gi:0))/tot*Math.PI*2);
    const kb=m?44:56,ar=R+kb/2+(m?7:10),svg=root.querySelector('.kd-arcs');if(svg){svg.setAttribute('width',W);svg.setAttribute('height',Hh);const st=Math.PI*2/tot;
      svg.innerHTML=WG.G.map((g,gi)=>{const ix=L.map((a,i)=>a.gi===gi?i:-1).filter(i=>i>=0),a0=T.ang[ix[0]]-st*.42,a1=T.ang[ix[ix.length-1]]+st*.42,P=a=>`${(cx+Math.sin(a)*ar).toFixed(1)} ${(cy-Math.cos(a)*ar).toFixed(1)}`;
        return`<path d="M${P(a0)} A${ar} ${ar} 0 ${a1-a0>Math.PI?1:0} 1 ${P(a1)}" stroke="${esc(g.color)}"/>`}).join('');
      root.querySelectorAll('.kd-l').forEach(el=>{const gi=+el.dataset.g,ix=L.map((a,i)=>a.gi===gi?i:-1).filter(i=>i>=0),mid=(T.ang[ix[0]]+T.ang[ix[ix.length-1]])/2,lr=ar+(m?0:16);
        el.hidden=m;el.style.left=(cx+Math.sin(mid)*lr)+'px';el.style.top=(cy-Math.cos(mid)*lr)+'px';el.style.translate=`${(-50+Math.sin(mid)*48).toFixed(0)}% ${(-50-Math.cos(mid)*48).toFixed(0)}%`})}T.el.forEach((el,i)=>{const a=T.ang[i];el.style.left=(cx+Math.sin(a)*R)+'px';el.style.top=(cy-Math.cos(a)*R)+'px'});root.style.setProperty('--kb',(m?44:56)+'px')},
  pick(i,root){const T=KD.T;KD.sel=(i+T.n)%T.n;const a=KD.list[KD.sel];if(!a)return;root.querySelector('.kd-k').textContent=WG.many()?WG.G[a.gi].name:`${KD.sel+1} / ${T.n}`;root.querySelector('.kd-n').textContent=a.name;root.querySelector('.kd-d').textContent=a.desc||'';
    T.el.forEach((el,j)=>el.setAttribute('aria-selected',j===KD.sel))},
  mount(root){const el=[...root.querySelectorAll('.kd-a')],T=KD.T={n:el.length,el,a:0,v:0,ta:0,s:el.map(()=>1),vs:el.map(()=>0),hand:root.querySelector('.kd-hand'),idle:true};KD.lay(root);
    const calm=calmMotion(),clock=()=>{const d=new Date();return(d.getMinutes()+d.getSeconds()/60)/60*Math.PI*2};T.a=T.ta=clock();KD.pick(0,root);
    const nearest=a=>{let b=0,bd=9;T.ang.forEach((x,i)=>{let d=Math.abs(((a-x)%(Math.PI*2)+Math.PI*3)%(Math.PI*2)-Math.PI);if(d<bd){bd=d;b=i}});return b};
    const frame=dt=>{const P=KD.P;if(P&&P.in&&!T.kb){T.idle=false;let t=Math.atan2(P.x-T.c.x,-(P.y-T.c.y));while(t-T.a>Math.PI)t-=Math.PI*2;while(t-T.a<-Math.PI)t+=Math.PI*2;T.ta=t}
        else if(T.idle&&!T.kb){let t=clock();while(t-T.a>Math.PI)t-=Math.PI*2;while(t-T.a<-Math.PI)t+=Math.PI*2;T.ta=t}
      if(calm||!dt){T.a=T.ta;T.v=0}else{T.v+=((T.ta-T.a)*110-T.v*11)*dt;T.a+=T.v*dt}
      T.hand.style.transform=`rotate(${T.a.toFixed(4)}rad)`;const s=nearest(T.a);if(s!==KD.sel&&!T.idle)KD.pick(s,root);let busy=Math.abs(T.ta-T.a)>.002||Math.abs(T.v)>.01;
      for(let i=0;i<T.n;i++){const tg=(!T.idle&&i===KD.sel)?1.4:1;if(calm||!dt){T.s[i]=tg}else{T.vs[i]+=((tg-T.s[i])*160-T.vs[i]*15)*dt;T.s[i]+=T.vs[i]*dt}if(Math.abs(tg-T.s[i])>.002||Math.abs(T.vs[i])>.02)busy=true;
        T.el[i].style.transform=`translate(-50%,-50%) scale(${T.s[i].toFixed(3)})`}
      root.querySelector('.kd-mid').classList.toggle('on',!T.idle);return busy};
    const L=KD.L=wxLoop(dt=>frame(dt));KD.P=wxPtr(root,L);frame(0);
    root.addEventListener('pointerleave',()=>{T.idle=true;T.kb=false;L.go()});root.addEventListener('pointermove',()=>{T.kb=false},{passive:true});
    // kadrana (ibre ya da yüz) tıklamak gösterileni açar
    root.addEventListener('click',e=>{if(e.target.closest('.kd-a,nav,button'))return;const d=Math.hypot(e.clientX-T.c.x,e.clientY-T.c.y);if(d<T.R*1.12)H().open(KD.list[KD.sel].key)});
    WG.wire(root,KD.list);
    root.addEventListener('wheel',e=>{e.preventDefault();T.idle=false;T.kb=true;KD.step(root,e.deltaY>0?1:-1)},{passive:false});
    root.addEventListener('focusin',e=>{const b=e.target.closest('.kd-a');if(b&&b.matches(':focus-visible')){T.idle=false;T.kb=true;KD.step(root,+b.dataset.i-KD.sel)}});
    clearInterval(KD.ci);KD.ci=setInterval(()=>{if(T.idle&&root.isConnected)L.go()},20000);L.go()},
  step(root,d){const T=KD.T;KD.pick(KD.sel+d,root);let t=T.ang[KD.sel];while(t-T.a>Math.PI)t-=Math.PI*2;while(t-T.a<-Math.PI)t+=Math.PI*2;T.ta=t;KD.L?.go()},
  key(root,e){const T=KD.T;if(!T)return;const d={ArrowRight:1,ArrowDown:1,ArrowLeft:-1,ArrowUp:-1}[e.key];
    if(d){e.preventDefault();T.idle=false;T.kb=true;KD.step(root,d);return}if(e.key==='Enter'&&!T.idle&&!e.target.closest?.('button')){e.preventDefault();H().open(KD.list[KD.sel].key)}},
  unmount(){KD.L?.stop();KD.L=null;clearInterval(KD.ci)},
  resize(root){KD.lay(root);KD.L?.go()}};

/* ═════════════ DESTE ═════════════
   Elde tutulan iskambil destesi gibi yelpaze. İmlecin altındaki kart yaylanarak kalkar ve düzleşir, komşuları yana açılır.
   Kartın üstünde uygulamanın simgesi, adı ve kısa açıklaması. Oklar/Enter da çalışır. */
const DS={sel:-1,
  html:d=>{const{G,list}=WG.of(d);DS.list=list;return`<div class="ds">${wxTop(d)}${WG.many()?`<div class="ds-gl">${G.map((g,gi)=>WG.lab(g,gi,'ds-l')).join('')}</div>`:''}<div class="ds-g" role="list" aria-label="Uygulamalar">${list.map((a,i)=>`<button class="ds-c" role="listitem" data-i="${i}" data-app="${esc(a.key)}" aria-label="${esc(a.name)}">${appIcon(a)}<b>${esc(a.name)}</b><small>${esc(a.desc)}</small></button>`).join('')}</div>
    ${wxNav('Deste')}<p class="wx-hint">${mobile()?'Parmağını kartların üstünde kaydır · dokun: aç':'İmleci kartların üstünde gezdir · tıkla: aç'}${WG.hint()}</p></div>`},
  lay(root){const T=DS.T,m=mobile(),W=innerWidth,Hh=innerHeight,n=T.n,cw=m?92:150,chh=m?134:212;root.style.setProperty('--cw',cw+'px');root.style.setProperty('--ch',chh+'px');
    const R=m?480:Math.max(1000,W*.8),fit=2*Math.asin(Math.max(.05,Math.min(1,(W/2-cw*(m?.8:1.15)-8)/R)))*180/Math.PI,spread=Math.min(m?36:60,n*(m?3.4:6),fit);T.R=R;T.px=W/2;T.py=Hh*(m?.56:.53)+R;// kümeler: yelpazede aralarında boşluk olan bölümler; adı bölümün altında, yay boyunca
    const many=WG.many(),L=DS.list,gs=1.3,sl=L.map((a,i)=>i+(many?a.gi*gs:0)),tot=Math.max(1,sl[n-1]||0);
    T.base=T.el.map((_,i)=>n>1?(-spread/2+spread*sl[i]/tot)*Math.PI/180:0);T.cw=cw;T.chh=chh;
    root.querySelectorAll('.ds-l').forEach(el=>{const gi=+el.dataset.g,ix=L.map((a,i)=>a.gi===gi?i:-1).filter(i=>i>=0);if(!ix.length){el.hidden=true;return}
      const a=(T.base[ix[0]]+T.base[ix[ix.length-1]])/2,rr=R-chh/2-(m?16:22);el.style.left=(T.px+Math.sin(a)*rr)+'px';el.style.top=(T.py-Math.cos(a)*rr)+'px';el.style.rotate=a+'rad'});WG.spread(root.querySelectorAll('.ds-l'))},
  mount(root){const el=[...root.querySelectorAll('.ds-c')],T=DS.T={n:el.length,el,lift:el.map(()=>0),vl:el.map(()=>0),ex:el.map(()=>0),ve:el.map(()=>0),kb:false};DS.lay(root);WG.wire(root,DS.list);const calm=calmMotion();
    const frame=dt=>{const P=DS.P;let f=-1;
      if(T.kb)f=DS.sel;else if(P&&P.in){// imlecin altındaki kart: pivot'tan imlece açı
        const a=Math.atan2(P.x-T.px,-(P.y-T.py)),R=Math.hypot(P.x-T.px,P.y-T.py);if(R>T.R-T.chh*1.2&&R<T.R+T.chh*.5){let bd=9;T.base.forEach((b,i)=>{const d=Math.abs(a-b);if(d<bd){bd=d;f=i}});if(bd>.12)f=-1}}
      DS.sel=f;let busy=false;
      for(let i=0;i<T.n;i++){const dd=f<0?99:i-f,tl=f<0?0:i===f?1:Math.max(0,.35-Math.abs(dd)*.12),te=f<0||i===f?0:Math.sign(dd)*Math.max(0,2.2-Math.abs(dd)*.45)*Math.PI/180;
        if(calm||!dt){T.lift[i]=tl;T.ex[i]=te}else{T.vl[i]+=((tl-T.lift[i])*170-T.vl[i]*17)*dt;T.lift[i]+=T.vl[i]*dt;T.ve[i]+=((te-T.ex[i])*170-T.ve[i]*17)*dt;T.ex[i]+=T.ve[i]*dt}
        if(Math.abs(tl-T.lift[i])>.002||Math.abs(T.vl[i])>.02||Math.abs(te-T.ex[i])>.0005)busy=true;
        const a=T.base[i]+T.ex[i],L=T.lift[i],rot=a*(1-L*.85),x=T.px+Math.sin(a)*T.R,y=T.py-Math.cos(a)*T.R-L*(T.chh*.42);
        T.el[i].style.transform=`translate(${(x-T.cw/2).toFixed(1)}px,${(y-T.chh/2).toFixed(1)}px) rotate(${rot.toFixed(4)}rad) scale(${(1+L*.1).toFixed(3)})`;T.el[i].style.zIndex=i===f?99:i;T.el[i].classList.toggle('on',i===f)}
      return busy};
    const L=DS.L=wxLoop(dt=>frame(dt));DS.P=wxPtr(root,L);root.addEventListener('pointermove',()=>{T.kb=false},{passive:true});
    root.addEventListener('focusin',e=>{const b=e.target.closest('.ds-c');if(b&&b.matches(':focus-visible')){T.kb=true;DS.sel=+b.dataset.i;L.go()}});frame(0);L.go()},
  key(root,e){const T=DS.T;if(!T)return;const d={ArrowRight:1,ArrowLeft:-1}[e.key];if(!d)return;e.preventDefault();T.kb=true;DS.sel=Math.max(0,Math.min(T.n-1,(DS.sel<0?Math.floor(T.n/2):DS.sel)+d));T.el[DS.sel].focus({preventScroll:true});DS.L?.go()},
  unmount(){DS.L?.stop();DS.L=null},
  resize(root){DS.lay(root);DS.L?.go()}};

/* ═════════════ HARİTA ═════════════
   Topografik harita: her uygulama bir zirve. İmleç arazide tepe kabartır (yayla yükselir, imleci izler, gidince iner);
   eş yükselti çizgileri her karede yeniden çizilir (marching squares). Zirvenin yanında ad, harita etiketi gibi. */
const HR={
  html:d=>{const{G,list}=WG.of(d);HR.list=list;return`<div class="hr">${wxTop(d)}<canvas class="hr-cv" aria-hidden="true"></canvas>${WG.many()?`<div class="hr-gl">${G.map((g,gi)=>WG.lab(g,gi,'hr-l')).join('')}</div>`:''}
    <div class="hr-g" role="list" aria-label="Uygulamalar">${list.map(a=>`<button class="hr-a" role="listitem" data-app="${esc(a.key)}" aria-label="${esc(a.name)}" title="${esc(a.name)}${a.desc?' · '+esc(a.desc):''}"><i class="hr-pk" aria-hidden="true"></i>${appIcon(a)}<b>${esc(a.name)}</b></button>`).join('')}</div>
    ${wxNav('Harita')}<p class="wx-hint">${mobile()?'Parmağını gezdir — arazi kabarır':'İmleç arazide tepe kabartır · zirveler uygulamalar'}${WG.hint()}</p></div>`},
  lay(root){const T=HR.T,m=mobile(),W=innerWidth,Hh=innerHeight,n=T.n,top=m?140:150,bot=m?130:130,many=WG.many();
    // her küme haritada bir bölge: zirveleri bir arada (altıgen ada), bölgenin adı üstünde harita yazısı gibi
    // zirveler yatayda ad etiketinin genişliği kadar aralıklı (etiket zirvenin sağına uzanır), dikeyde ~60 px
    const pw=Math.max(90,...T.el.map(e=>e.offsetWidth||120))+(m?8:18),c0=pw,ay=(m?60:64)/(.866*c0),
      I=WG.islands(WG.G.map(g=>g.apps.length),{x:m?10:80,y:top,w:W-(m?20:160)-(m?0:pw*.5),h:Hh-top-bot},c0,many?26:0,ay,m?2:0),c=I.c;
    T.pk=[];for(let i=0;i<n;i++){const o=I.pos[i],x=o.x-pw*(m?.5:.25)+(prand(i+1)-.5)*c*.06,y=o.y+(prand(i+21)-.5)*c*ay*.12;
      T.pk.push({x,y,a:.75+prand(i+40)*.6,s:Math.min(m?60:90,c*.5)+prand(i+60)*Math.min(m?25:45,c*.22)});const el=T.el[i],lw=el.offsetWidth||120;el.style.left=Math.max(26,Math.min(W-lw+10,x))+'px';el.style.top=y+'px'}
    root.querySelectorAll('.hr-l').forEach(el=>{const gi=+el.dataset.g,ys=T.pk.filter((_,i)=>HR.list[i].gi===gi).map(p=>p.y),cc=I.ctr[gi];if(!cc||!ys.length){el.hidden=true;return}
      // adın yeri: zirve etiketlerinin gerçek kapladığı alanın ortası
      const ix=T.pk.map((_,i)=>HR.list[i].gi===gi?i:-1).filter(i=>i>=0),lx=Math.min(...ix.map(i=>parseFloat(T.el[i].style.left))),rx=Math.max(...ix.map(i=>parseFloat(T.el[i].style.left)+(T.el[i].offsetWidth||120)));
      el.style.left=((lx+rx)/2)+'px';el.style.top=(Math.min(...ys)-(m?34:40))+'px'});WG.spread(root.querySelectorAll('.hr-l'));
    const cell=T.cell=m?9:(tier()>=1?13:10),gw=T.gw=Math.ceil(W/cell)+1,gh=T.gh=Math.ceil(Hh/cell)+1;T.base=new Float32Array(gw*gh);T.f=new Float32Array(gw*gh);
    for(let y=0;y<gh;y++)for(let x=0;x<gw;x++){const X=x*cell,Y=y*cell;let h=.18*Math.sin(X*.004+Y*.003)+.12*Math.sin(X*.0021-Y*.0047+1.3);for(const p of T.pk){const dx=X-p.x,dy=Y-p.y;h+=p.a*Math.exp(-(dx*dx+dy*dy)/(p.s*p.s))}T.base[y*gw+x]=h}
    const dpr=Math.min(1.5,devicePixelRatio||1);T.cv.width=W*dpr;T.cv.height=Hh*dpr;T.ctx=T.cv.getContext('2d');T.ctx.setTransform(dpr,0,0,dpr,0,0)},
  draw(){const T=HR.T,c=T.ctx,gw=T.gw,gh=T.gh,cell=T.cell,f=T.f,b=T.base,bx=T.bx,by=T.by,ba=T.ba,bs=(mobile()?70:95);
    for(let y=0;y<gh;y++)for(let x=0;x<gw;x++){const i=y*gw+x;let h=b[i];if(ba>.002){const dx=x*cell-bx,dy=y*cell-by,d2=dx*dx+dy*dy;if(d2<bs*bs*9)h+=ba*Math.exp(-d2/(bs*bs))}f[i]=h}
    c.clearRect(0,0,innerWidth,innerHeight);const lv=[];for(let l=-.2;l<2;l+=.1)lv.push(l);
    lv.forEach((l,li)=>{const major=li%5===0;c.beginPath();c.lineWidth=major?1.4:.8;c.strokeStyle=major?'rgba(122,82,46,.62)':'rgba(122,82,46,.32)';
      for(let y=0;y<gh-1;y++)for(let x=0;x<gw-1;x++){const i=y*gw+x,a=f[i],bb=f[i+1],cc=f[i+gw+1],d=f[i+gw],k=(a>l?8:0)|(bb>l?4:0)|(cc>l?2:0)|(d>l?1:0);if(k===0||k===15)continue;
        const X=x*cell,Y=y*cell,t=(p,q)=>(l-p)/(q-p),top=[X+t(a,bb)*cell,Y],rt=[X+cell,Y+t(bb,cc)*cell],bt=[X+t(d,cc)*cell,Y+cell],lt=[X,Y+t(a,d)*cell],
          seg=(p,q)=>{c.moveTo(p[0],p[1]);c.lineTo(q[0],q[1])};
        switch(k){case 1:case 14:seg(lt,bt);break;case 2:case 13:seg(bt,rt);break;case 3:case 12:seg(lt,rt);break;case 4:case 11:seg(top,rt);break;case 6:case 9:seg(top,bt);break;case 7:case 8:seg(lt,top);break;
          case 5:seg(lt,top);seg(bt,rt);break;case 10:seg(top,rt);seg(lt,bt);break}}
      c.stroke()})},
  mount(root){const el=[...root.querySelectorAll('.hr-a')],T=HR.T={n:el.length,el,cv:root.querySelector('.hr-cv'),bx:innerWidth/2,by:innerHeight/2,bvx:0,bvy:0,ba:0,bva:0};HR.lay(root);WG.wire(root,HR.list);HR.draw();if(calmMotion())return;
    const L=HR.L=wxLoop(dt=>{const P=HR.P,on=P.in,ta=on?.95:0;T.bvx+=((P.x-T.bx)*90-T.bvx*13)*dt;T.bvy+=((P.y-T.by)*90-T.bvy*13)*dt;T.bx+=T.bvx*dt;T.by+=T.bvy*dt;
      T.bva+=((ta-T.ba)*70-T.bva*11)*dt;T.ba+=T.bva*dt;if(T.ba<0)T.ba=0;HR.draw();
      return Math.abs(P.x-T.bx)+Math.abs(P.y-T.by)>.5||Math.abs(T.bvx)+Math.abs(T.bvy)>2||Math.abs(ta-T.ba)>.003||Math.abs(T.bva)>.01});
    HR.P=wxPtr(root,L)},
  unmount(){HR.L?.stop();HR.L=null},
  resize(root){HR.lay(root);HR.draw();HR.L?.go()}};

const R={mekansal:SP,miknatis:MG,ruzgar:RZ,petek:PT,kum:KM,balon:BL,kadran:KD,deste:DS,harita:HR};

/* ── Çekirdek: dünyayı kur / yenile / değiştir ── */
let cur='galaksi',root=null,clockT=0,rq=0,started=false;
function fillLive(){if(!root)return;const w=R[cur];if(!w.live)return tick();const d=D();root.querySelectorAll('[data-live]').forEach(el=>{const f=w.live[el.dataset.live];if(f)el.innerHTML=f(d)});tick()}
function tick(){if(!root)return;const d=new Date();root.querySelectorAll('[data-clock]').forEach(el=>{const v=el.dataset.clock==='hms'?d.toLocaleTimeString('tr-TR'):hm(d);if(el.textContent!==v)el.textContent=v})}
function apply(w){R[cur]?.unmount?.();cur=w;document.documentElement.dataset.world=w;if(root){root.remove();root=null}clearInterval(clockT);
  if(w==='galaksi'){document.body.classList.remove('inworld');H().pause(false);return}
  document.body.classList.add('inworld');H().pause(true);
  root=document.createElement('div');root.id='world';root.className='world w-'+w;root.tabIndex=-1;root.innerHTML=(typeof R[w].html==='function'?R[w].html(D()):'');
  document.body.appendChild(root);
  root.addEventListener('click',e=>{const a=e.target.closest('[data-app]');if(a&&!a.closest('.sp-win')){H().open(a.dataset.app);return}
    const n=e.target.closest('[data-note]');if(n){H().openNotes('#p/'+n.dataset.note);return}
    const x=e.target.closest('[data-act]');if(!x)return;const k=x.dataset.act;if(k==='ara')H().palette();else if(k==='world')picker();else if(k==='today')H().openNotes('#today')});
  R[w].mount?.(root);fillLive();clockT=setInterval(tick,1000);root.focus({preventScroll:true})}
function set(w,instant){try{localStorage.setItem(KEY,JSON.stringify(w))}catch{}
  if(instant||calmMotion()||!document.startViewTransition){apply(w);return}
  document.documentElement.classList.add('w-vt');const t=document.startViewTransition(()=>apply(w));t.finished.finally(()=>document.documentElement.classList.remove('w-vt'))}
function refresh(){if(!root||rq)return;rq=requestAnimationFrame(()=>{rq=0;if(!root)return;R[cur].refresh?R[cur].refresh(root):fillLive()})}
addEventListener('keydown',e=>{if(!root||!R[cur].key||e.metaKey||e.ctrlKey||e.altKey)return;if(e.target.closest?.('input,textarea,[contenteditable]'))return;
  if(document.querySelector('.wp-bg,.pal-bg,.menu,.radial')||[...document.querySelectorAll('.win')].some(w=>!w.hidden))return;R[cur].key(root,e);if(e.defaultPrevented)e.stopPropagation()},true);
function rebuild(){if(!root||cur==='galaksi')return;const sc=root.scrollTop;apply(cur);if(root)root.scrollTop=sc}
SP.rebuild=rebuild;
// kümeler değişince (galaksiden, başka sekmeden, buluttan) açık arayüz yeniden çizilir
const GROUPED=new Set(['ruzgar','petek','kum','balon','kadran','deste','harita']);
function regroup(){if(GROUPED.has(cur)&&root&&H()?.groups){let g;try{g=JSON.stringify(H().groups())}catch{return}if(g!==WG.sig&&!root.querySelector('.mg-cm,.wg-l [contenteditable=true]'))rebuild();return}
  if(cur==='miknatis'&&root&&H()?.groups){let g;try{g=JSON.stringify(H().groups())}catch{return}if(g!==MG.sig&&!MG.S?.pd?.on&&!root.querySelector('.mg-gl [contenteditable=true],.mg-cm'))rebuild();return}
  if(cur!=='mekansal'||!root||!H()?.groups)return;let g;try{g=JSON.stringify(H().groups())}catch{return}if(g===SP.sig)return;
  if(document.querySelector('.world .sp-ren')||document.querySelector('.world .sp-hi.drag'))return;SP.keep=SP.keep||SP.list[SP.sel]?.key;rebuild()}
let rt=0;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{if(root)R[cur].resize?.(root)},150)});
addEventListener('storage',e=>{if(e.key===KEY&&started){const w=read();if(w!==cur)apply(w)}});
setInterval(()=>{if(root&&!document.hidden)refresh()},60000);

/* ── Arayüz seçici: canlı küçük önizlemeler ── */
const MINI={
  galaksi:'<i class="m-sun"></i><i class="m-orb o1"></i><i class="m-orb o2"></i><i class="m-pl p1"></i><i class="m-pl p2"></i><i class="m-pl p3"></i>',
  mekansal:'<i class="m-card c1"></i><i class="m-card c2"></i><i class="m-card c3"></i><i class="m-flr"></i>',
  miknatis:'<i class="m-fe"><i class="f1"></i><i class="f2"></i><i class="f3"></i><i class="f4"></i><i class="fc"></i></i>',
  ruzgar:'<i class="m-rl"></i><i class="m-ch c1"></i><i class="m-ch c2"></i><i class="m-ch c3"></i><i class="m-ch c4"></i><i class="m-ch c5"></i>',
  kum:'<b class="m-sand">notlar</b><i class="m-gr g1"></i><i class="m-gr g2"></i><i class="m-gr g3"></i>',
  balon:'<i class="m-bl b1"></i><i class="m-bl b2"></i><i class="m-bl b3"></i><i class="m-bl b4"></i>',
  kadran:'<i class="m-dial"></i><i class="m-hand"></i>',
  deste:'<i class="m-cd d1"></i><i class="m-cd d2"></i><i class="m-cd d3"></i><i class="m-cd d4"></i><i class="m-cd d5"></i>',
  harita:'<i class="m-tp t1"></i><i class="m-tp t2"></i><i class="m-tp t3"></i><i class="m-tp t4"></i><i class="m-tp t5"></i>',
  petek:'<i class="m-hx h0"></i><i class="m-hx h1"></i><i class="m-hx h2"></i><i class="m-hx h3"></i><i class="m-hx h4"></i><i class="m-hx h5"></i><i class="m-hx h6"></i>'};
let pk=null;
function picker(){if(pk)return;const el=document.createElement('div');el.className='wp-bg';el.innerHTML=`<div class="wp" role="dialog" aria-modal="true" aria-labelledby="wpT">
  <header><div><h2 id="wpT">Arayüz</h2><p>Aynı uygulamalar ve veriler, ${WORLDS.length} ayrı dünya; her birinde imleç sahneyi canlandırır. Renk teması Galaksi'de ve uygulamalarda geçerli.</p></div><button class="wp-x" aria-label="Kapat">✕</button></header>
  <div class="wp-g">${WORLDS.map(([k,n,ds],i)=>`<button class="wpc${k===cur?' on':''}" data-w="${k}" aria-pressed="${k===cur}"><div class="wpv pv-${k}" aria-hidden="true">${MINI[k]}</div><span class="wpn"><b>${n}</b><kbd>${(i+1)%10}</kbd></span><span class="wpd">${ds}</span></button>`).join('')}</div>
  <footer><button class="wp-rand" role="switch" data-wrand aria-checked="${rnd()}"><i aria-hidden="true"></i>Her girişte rastgele arayüz</button><span>1–9 ve 0 ile seç · R rastgele · Esc kapatır</span></footer></div>`;
  document.body.appendChild(el);pk=el;
  const close=()=>{if(!pk)return;pk=null;removeEventListener('keydown',key,true);if(calmMotion())return el.remove();el.classList.add('out');setTimeout(()=>el.remove(),220)};
  const pick=w=>{close();if(w!==cur)set(w)};
  const key=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close()}else if(/^[0-9]$/.test(e.key)&&(+e.key||10)<=WORLDS.length&&!e.metaKey&&!e.ctrlKey){e.preventDefault();e.stopPropagation();pick(WORLDS[(+e.key||10)-1][0])}
    else if((e.key==='r'||e.key==='R')&&!e.metaKey&&!e.ctrlKey&&!e.altKey){e.preventDefault();e.stopPropagation();close();const w=randWorld();if(w!==cur)apply(w)}};
  addEventListener('keydown',key,true);
  el.addEventListener('click',e=>{const c=e.target.closest('[data-w]');if(c)return pick(c.dataset.w);if(e.target===el||e.target.closest('.wp-x'))close()});
  requestAnimationFrame(()=>el.classList.add('on'));setTimeout(()=>el.querySelector('.wpc.on,.wpc')?.focus({preventScroll:true}),40)}

function topBtn(){const t=document.getElementById('themeBtn');if(!t||document.getElementById('worldBtn'))return;
  const d=document.createElement('button');d.className='ib'+(rnd()?' on':'');d.id='randBtn';d.dataset.wrand='';d.title='Her girişte rastgele arayüz';d.setAttribute('aria-label','Her girişte rastgele arayüz');d.setAttribute('aria-pressed',rnd());d.innerHTML=DICE;t.before(d);const b=document.createElement('button');b.className='ib';b.id='worldBtn';b.title='Arayüz (⇧⌘U)';b.setAttribute('aria-label','Arayüzü değiştir');
  b.innerHTML='<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="5.5"/><path d="M2.5 8h11M8 2.5c2 2 2 9 0 11M8 2.5c-2 2-2 9 0 11"/></svg>';b.onclick=e=>{e.stopPropagation();picker()};t.before(b)}
function boot(){topBtn();if(started)return refresh();started=true;const w=rnd()?randWorld():read();if(w!=='galaksi'&&R[w])apply(w)}
topBtn();
window.Worlds={boot,refresh,regroup,picker,set,get:()=>cur,list:WORLDS.map(w=>w[0])};
})();
