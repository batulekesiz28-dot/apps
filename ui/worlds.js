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
  ['miknatis','Mıknatıs','Sıvı metal damlalar; imleç mıknatıs gibi çeker, karıştırır'],
  ['golet','Gölet','Gece göleti; imleç suda halkalar açar, yapraklar salınır'],
  ['petek','Petek','Bal peteği; imleç büyüteç gibi yaklaştığını büyütür']];
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
      <aside class="sp-side sp-left" data-side="left"><div data-live="today"></div><button class="sp-grab" aria-label="Bugün penceresini taşı (çift tık: yerine koy)"></button></aside>
      <div class="sp-ringw"><div class="sp-shadow" aria-hidden="true"></div><div class="sp-ring" role="listbox" aria-label="Gruplara göre uygulamalar halkası">${SP.list.map((a,i)=>{const g=SP.G[a.gi];return`<button class="sp-win" role="option" data-i="${i}" data-key="${esc(a.key)}" style="--gc:${esc(g.color)}" aria-label="${esc(a.name)} — ${esc(g.name)}"><em class="sp-tag"><i></i>${esc(g.name)}</em><span class="sp-ic">${appIcon(a)}</span><b>${esc(a.name)}</b><small>${esc(a.desc.slice(0,80))}</small></button>`}).join('')}
        ${SP.G.length>1?SP.G.map((g,gi)=>`<button class="sp-gt" data-g="${gi}" style="--gc:${esc(g.color)}" tabindex="-1"><i></i>${esc(g.name)}<small>${g.apps.length}</small></button>`).join(''):''}</div></div>
      <div class="sp-home" role="list" aria-label="Ana görünüm, gruplara göre"><i class="sp-slot" aria-hidden="true"></i>${SP.G.length>1?SP.G.map((g,gi)=>`<p class="sp-gh" data-g="${gi}" style="--gc:${esc(g.color)}" title="${g.id[0]==='_'?'Otomatik grup':'Çift tık: yeniden adlandır'}"><i></i><span>${esc(g.name)}</span></p>`).join(''):''}${SP.list.map((a,i)=>`<button class="sp-hi" role="listitem" data-i="${i}" data-key="${esc(a.key)}" title="${esc(a.desc)}" style="--gc:${esc(SP.G[a.gi].color)}"><span class="sp-hb">${appIcon(a)}</span><b>${esc(a.name)}</b></button>`).join('')}</div>
      <aside class="sp-side sp-right" data-side="right"><div data-live="notes"></div><button class="sp-grab" aria-label="Son sayfalar penceresini taşı (çift tık: yerine koy)"></button></aside></div></div>
    <div class="sp-find" aria-live="polite"></div>
    <div class="sp-hint">${mobile()?'Uzun bas, sürükle: yuvaya otomatik hizalanır':'Uzun bas ya da sürükle: bir yuvaya taşı, otomatik hizalanır · Sağ tık: menü · Grup adına çift tık: yeniden adlandır'}</div>
    <div class="sp-drop" aria-hidden="true">${SP.G.map(g=>`<span data-drop="${esc(g.id)}" style="--gc:${esc(g.color)}"><i></i>${esc(g.name)}</span>`).join('')}<span data-drop="_new">＋ Yeni grup</span></div>
    <div class="sp-cap" aria-live="polite"></div>
    <div class="sp-crown" role="slider" tabindex="0" aria-label="Dalma düzeyi (tıkla: odaya dön / ortama dal)" aria-valuemin="0" aria-valuemax="100" title="Dalma — kaydır, sürükle ya da [ ] tuşları"><i class="cr-fill"></i><i class="cr-rid"></i><span></span></div>
    <div class="sp-envp" role="dialog" aria-label="Ortamlar" hidden><p class="sp-k">Ortam</p>
      <div class="sp-envs">${SP.ENVS.map(([k,n])=>`<button data-env="${k}" aria-pressed="false"><i class="ept ept-${k}"></i><span>${n}</span></button>`).join('')}</div>
      <label class="sp-imm"><span>Dalma</span><input type="range" min="0" max="100" step="1" aria-label="Dalma düzeyi"><b></b></label>
      <button class="sp-recenter" data-sp="center">Ortala <kbd>0</kbd></button></div>
    <nav class="sp-orn" aria-label="Mekânsal gezinme"><button data-rot="-1" class="sp-arr" aria-label="Önceki uygulama">‹</button>
      <span class="sp-seg" role="group" aria-label="Görünüm"><button data-sp="halka" aria-pressed="false">Halka</button><button data-sp="izgara" aria-pressed="false">Izgara</button></span>
      <button data-act="ara">Ara</button><button data-act="today">Bugün</button><button data-sp="envp" aria-expanded="false">Ortam</button><button data-act="world">Arayüz</button><button data-rot="1" class="sp-arr" aria-label="Sonraki uygulama">›</button></nav></div>`},
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
    root.querySelectorAll('.sp-gt').forEach(el=>{const gi=+el.dataset.g,a=SP.dist(SP.G[gi].mid);const lim=mobile()?40:80;el.style.visibility=a>lim?'hidden':'';el.style.opacity=(1-Math.min(1,a/lim)*.25).toFixed(2);el.classList.toggle('on',SP.list[f]?.gi===gi)});
    if(SP.cfg.mode==='halka'){SP.sel=f;SP.cap(root)}},
  cap(root){const a=SP.list[SP.sel],g=a&&SP.G[a.gi];root.querySelector('.sp-cap').innerHTML=a?`<b>${esc(a.name)}</b><span>${SP.G.length>1?`<em style="--gc:${esc(g.color)}"><i></i>${esc(g.name)}</em> `:''}${esc(a.desc)}</span><button data-app="${esc(a.key)}" class="sp-open">Aç ↵</button>`:''},
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
      SP.raf=requestAnimationFrame(()=>{SP.raf=0;scene.style.setProperty('--ry',((e.clientX/innerWidth-.5)*7).toFixed(2)+'deg');scene.style.setProperty('--rx',((.5-e.clientY/innerHeight)*5).toFixed(2)+'deg');
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
  light(root){const Ls=root.querySelector('.sp-light'),L=SP.L={x:innerWidth/2,y:innerHeight/2,tx:innerWidth/2,ty:innerHeight/2,a:0,ta:0,raf:0};
    const els=()=>[...root.querySelectorAll('.sp-win,.sp-glass,.sp-hb,.sp-gt,.sp-orn,.sp-crown,.sp-cap')].filter(e=>e.offsetParent&&getComputedStyle(e).visibility!=='hidden');
    const step=()=>{const k=calmMotion()?1:.2;L.x+=(L.tx-L.x)*k;L.y+=(L.ty-L.y)*k;L.a+=(L.ta-L.a)*(calmMotion()?1:.08);
      Ls.style.transform=`translate(${L.x.toFixed(1)}px,${L.y.toFixed(1)}px)`;Ls.style.opacity=L.a.toFixed(3);
      for(const el of els()){const b=el.getBoundingClientRect();if(!b.width)continue;const nx=Math.max(b.left,Math.min(L.x,b.right)),ny=Math.max(b.top,Math.min(L.y,b.bottom)),dd=Math.hypot(L.x-nx,L.y-ny),li=L.a*Math.max(0,1-dd/260);
        el.style.setProperty('--lx',((L.x-b.left)/b.width*100).toFixed(1)+'%');el.style.setProperty('--ly',((L.y-b.top)/b.height*100).toFixed(1)+'%');el.style.setProperty('--li',li.toFixed(3))}
      if(Math.abs(L.tx-L.x)+Math.abs(L.ty-L.y)>.3||Math.abs(L.ta-L.a)>.004)L.raf=requestAnimationFrame(step);else L.raf=0};
    const go=()=>{if(!L.raf)L.raf=requestAnimationFrame(step)};
    addEventListener('pointermove',SP.lpm=e=>{L.tx=e.clientX;L.ty=e.clientY;if(e.pointerType==='mouse'||e.buttons)L.ta=1;go()},{passive:true});
    addEventListener('pointerdown',SP.lpd=e=>{L.tx=e.clientX;L.ty=e.clientY;if(e.pointerType!=='mouse'){L.x=L.tx;L.y=L.ty}L.ta=1;go()},{passive:true});
    addEventListener('pointerup',SP.lpu=e=>{if(e.pointerType!=='mouse'){L.ta=0;go()}},{passive:true});
    document.addEventListener('mouseleave',SP.lml=()=>{L.ta=0;go()});SP.lightGo=go},
  unmount(){removeEventListener('pointermove',SP.pm);removeEventListener('pointerup',SP.pu);removeEventListener('pointermove',SP.dm);removeEventListener('pointerup',SP.du);removeEventListener('pointermove',SP.lm);removeEventListener('pointerup',SP.lu);removeEventListener('pointercancel',SP.lc);removeEventListener('pointermove',SP.lpm);removeEventListener('pointerdown',SP.lpd);removeEventListener('pointerup',SP.lpu);document.removeEventListener('mouseleave',SP.lml);if(SP.L?.raf)cancelAnimationFrame(SP.L.raf);SP.lift=false;SP.closeMenu()}};

/* ═════════════ Ortak: imleçle canlanan dünyalar (Mıknatıs, Gölet, Petek) ═════════════
   Tam ekran, kaydırmasız. Her birinde imleç sahneyi fizikle etkiler (galaksideki çekim, mekânsaldaki ışık gibi).
   Döngü SADECE bir şey hareket ederken çalışır, durulunca kendiliğinden durur (işlemci/pil dostu).
   Hareket azaltılmışsa (sistem ya da Ayarlar → hareket) sahne durgun çizilir; tıklama ve klavye aynen çalışır. */
const tier=()=>{try{return H()?.tier?.()||0}catch{return 0}};
const wxTop=d=>`<header class="wx-hd"><p class="wx-t" data-clock="hm"></p><p class="wx-d">${esc(greet(d.now))} · ${esc(trDate(d.now,{weekday:'long',day:'numeric',month:'long'}))}</p></header>`;
const wxNav=n=>`<nav class="wx-nav" aria-label="${n}"><button data-act="ara">Ara</button><button data-act="today">Bugün</button><button data-act="world">Arayüz</button></nav>`;
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

/* ═════════════ MIKNATIS ═════════════
   Açık zemin üstünde sıvı metal (ferrofluid) damlaları. İmleç bir mıknatıs: yaklaştıkça damlalar ona doğru uzar,
   birbirine ve imleçteki damlaya karışır (SVG “goo” süzgeci), mıknatısın çevresinde dikenler çıkar. Bırakınca yaylanarak yerine döner. */
const MG={
  html:d=>`<div class="mg">${wxTop(d)}
    <svg class="mg-svg" aria-hidden="true" focusable="false"><filter id="mgGoo" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur in="SourceGraphic" stdDeviation="10"/><feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 26 -12"/></filter></svg>
    <div class="mg-goo" aria-hidden="true">${d.apps.map(()=>'<i class="mg-b"></i>').join('')}<i class="mg-c"></i>${'<i class="mg-s"></i>'.repeat(9)}</div>
    <div class="mg-apps" role="list" aria-label="Uygulamalar">${d.apps.map(a=>`<button class="mg-a" role="listitem" data-app="${esc(a.key)}" aria-label="${esc(a.name)}" title="${esc(a.desc)}"><i class="mg-hl" aria-hidden="true"></i>${appIcon(a)}<b>${esc(a.name)}</b></button>`).join('')}</div>
    ${wxNav('Mıknatıs')}<p class="wx-hint">${mobile()?'Parmağını damlaların üstünde gezdir':'İmleci damlalara yaklaştır — mıknatıs gibi çeker'}</p></div>`,
  lay(root){const S=MG.S,n=S.n,m=mobile(),W=innerWidth,Hh=innerHeight;let D=m?58:74,c=D*.98;
    const room=Math.min(W-40,Hh-200)/2,rmax=c*Math.sqrt(n);if(rmax+D/2>room){const k=room/(rmax+D/2);c*=k;D=Math.max(44,D*k)}
    S.D=D;S.R=Math.min(280,Math.max(170,c*3.2));const cx=W/2,cy=Hh/2+(m?10:16);
    for(let i=0;i<n;i++){const a=i*2.39996323,r=c*Math.sqrt(i+.35);S.h[i]={x:cx+Math.cos(a)*r,y:cy+Math.sin(a)*r};if(!S.p[i]){S.p[i]={...S.h[i]};S.v[i]={x:0,y:0}}}
    // süzgeç yalnızca damlaların dolaştığı alanı kaplar (tam ekran bulanıklaştırmak pahalı)
    const ext=c*Math.sqrt(n)+S.R*.7+D,g=root.querySelector('.mg-goo');S.o={x:Math.max(0,cx-ext),y:Math.max(0,cy-ext)};
    g.style.cssText=`left:${S.o.x}px;top:${S.o.y}px;width:${Math.min(W,cx+ext)-S.o.x}px;height:${Math.min(Hh,cy+ext)-S.o.y}px;--D:${D}px`;root.style.setProperty('--D',D+'px')},
  mount(root){const as=[...root.querySelectorAll('.mg-a')],S=MG.S={n:as.length,a:as,b:[...root.querySelectorAll('.mg-b')],c:root.querySelector('.mg-c'),sp:[...root.querySelectorAll('.mg-s')],h:[],p:[],v:[],cp:{x:innerWidth/2,y:innerHeight/2},cv:{x:0,y:0},cs:0,near:0};
    MG.lay(root);const calm=calmMotion();
    const draw=(t)=>{const o=S.o;for(let i=0;i<S.n;i++){const p=S.p[i],pl=S.pl?.[i]||0,sc=1+pl*.22;
        S.b[i].style.transform=`translate(${(p.x-o.x).toFixed(1)}px,${(p.y-o.y).toFixed(1)}px) scale(${sc.toFixed(3)})`;
        S.a[i].style.transform=`translate(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px) scale(${sc.toFixed(3)})`;S.a[i].style.setProperty('--n',pl.toFixed(2))}
      const cs=S.cs;S.c.style.transform=`translate(${(S.cp.x-o.x).toFixed(1)}px,${(S.cp.y-o.y).toFixed(1)}px) scale(${(cs/40).toFixed(3)})`;
      // mıknatısın dikenleri: çekim arttıkça uzar, hafifçe döner ve titreşir
      const k=S.sp.length;for(let j=0;j<k;j++){const an=j/k*Math.PI*2+t*.00045,len=cs*(.55+.55*S.near+.12*Math.sin(t*.004+j*1.7)),sz=cs*(.22+.3*S.near)/40;
        S.sp[j].style.transform=`translate(${(S.cp.x-o.x+Math.cos(an)*len).toFixed(1)}px,${(S.cp.y-o.y+Math.sin(an)*len).toFixed(1)}px) scale(${Math.max(0,sz).toFixed(3)})`}};
    if(calm){S.pl=[];draw(0);return}
    const L=MG.L=wxLoop((dt,t)=>{const P=MG.P,R=S.R,on=P.in;let busy=false,near=0;S.pl=S.pl||[];
      for(let i=0;i<S.n;i++){const h=S.h[i],p=S.p[i],v=S.v[i],d=Math.hypot(P.x-h.x,P.y-h.y);let pl=on?Math.max(0,1-d/R):0;pl*=pl;S.pl[i]=pl;near=Math.max(near,pl);
        const tx=h.x+(P.x-h.x)*pl*.62,ty=h.y+(P.y-h.y)*pl*.62,ax=(tx-p.x)*130-v.x*15,ay=(ty-p.y)*130-v.y*15;
        v.x+=ax*dt;v.y+=ay*dt;p.x+=v.x*dt;p.y+=v.y*dt;if(Math.abs(v.x)+Math.abs(v.y)>3||Math.abs(tx-p.x)+Math.abs(ty-p.y)>.4)busy=true}
      S.near+=(near-S.near)*Math.min(1,dt*8);
      // imleçteki damla: yayla takip eder, boyu yakındaki çekime göre
      const ts=on?24+46*S.near:0;S.cs+=(ts-S.cs)*Math.min(1,dt*(on?10:6));
      const ax=(P.x-S.cp.x)*320-S.cv.x*26,ay=(P.y-S.cp.y)*320-S.cv.y*26;S.cv.x+=ax*dt;S.cv.y+=ay*dt;S.cp.x+=S.cv.x*dt;S.cp.y+=S.cv.y*dt;
      if(Math.abs(ts-S.cs)>.3||Math.abs(S.cv.x)+Math.abs(S.cv.y)>4||(on&&S.near>.02))busy=true;
      draw(t);return busy});
    MG.P=wxPtr(root,L);draw(0);L.go()},
  unmount(){MG.L?.stop();MG.L=null},
  resize(root){MG.lay(root);if(MG.L)MG.L.go();else MG.mount(root)}};

/* ═════════════ GÖLET ═════════════
   Gece göleti. Su gerçek bir dalga denklemiyle çözülür (düşük çözünürlüklü ızgara, büyütülerek yumuşar):
   imleç suda iz bırakır, tıklayınca halka halka yayılır, ara sıra damla düşer. Uygulamalar nilüfer yaprağı gibi dalgayla salınır. */
const GL={
  html:d=>`<div class="gl">${wxTop(d)}<canvas class="gl-cv" aria-hidden="true"></canvas><i class="gl-moon" aria-hidden="true"></i>
    <div class="gl-pads" role="list" aria-label="Uygulamalar">${d.apps.map(a=>`<button class="gl-p" role="listitem" style="--na:${Math.round(prand(a.i+7)*360)}deg" data-app="${esc(a.key)}" aria-label="${esc(a.name)}" title="${esc(a.desc)}"><span class="gl-leaf" aria-hidden="true"></span>${appIcon(a)}<b>${esc(a.name)}</b></button>`).join('')}</div>
    ${wxNav('Gölet')}<p class="wx-hint">${mobile()?'Suya dokun — halkalar yayılır':'İmleci suda gezdir · tıkla, halka halka yayılsın'}</p></div>`,
  lay(root){const G=GL.G,m=mobile(),W=innerWidth,Hh=innerHeight,n=G.n,P=m?66:84;G.P=P;root.style.setProperty('--pd',P+'px');
    const top=m?150:170,bot=m?110:120,aw=W-(m?40:160),ah=Hh-top-bot,cols=Math.max(2,Math.min(n,Math.round(Math.sqrt(n*aw/Math.max(1,ah))))),rows=Math.ceil(n/cols),
      cw=aw/cols,ch=ah/Math.max(1,rows);
    for(let i=0;i<n;i++){const r=Math.floor(i/cols),c=i%cols,inRow=r===rows-1?n-r*cols:cols,off=(cols-inRow)*cw/2;
      G.h[i]={x:(W-aw)/2+off+cw*(c+.5)+(prand(i)-.5)*cw*.32,y:top+ch*(r+.5)+(prand(i+50)-.5)*ch*.3}}
    // su ızgarası
    const cell=G.cell=(m||tier()>=2)?10:tier()===1?9:7,gw=G.gw=Math.ceil(W/cell)+2,gh=G.gh=Math.ceil(Hh/cell)+2;G.a=new Float32Array(gw*gh);G.b=new Float32Array(gw*gh);
    const cv=G.cv;cv.width=W;cv.height=Hh;G.ctx=cv.getContext('2d');G.off=document.createElement('canvas');G.off.width=gw;G.off.height=gh;G.octx=G.off.getContext('2d');
    G.img=G.octx.createImageData(gw,gh);G.u32=new Uint32Array(G.img.data.buffer);
    G.base=[];for(let y=0;y<gh;y++){const k=y/gh;G.base.push([8+10*(1-k),24+22*(1-k),36+30*(1-k)])} // üst açık camgöbeği → alt koyu lacivert
    GL.render();GL.pads()},
  drop(px,py,str,rad){const G=GL.G,cx=Math.round(px/G.cell)+1,cy=Math.round(py/G.cell)+1;for(let y=-rad;y<=rad;y++)for(let x=-rad;x<=rad;x++){const d=Math.hypot(x,y);if(d>rad)continue;
      const X=cx+x,Y=cy+y;if(X<1||Y<1||X>=G.gw-1||Y>=G.gh-1)continue;G.a[Y*G.gw+X]+=str*(1-d/(rad+1))}},
  step(){const G=GL.G,w=G.gw,h=G.gh,a=G.a,b=G.b;let e=0;for(let y=1;y<h-1;y++){let i=y*w+1;for(let x=1;x<w-1;x++,i++){const v=((a[i-1]+a[i+1]+a[i-w]+a[i+w])*.5-b[i])*.968;b[i]=v;e+=v<0?-v:v}}
    G.a=b;G.b=a;return e/(w*h)},
  render(){const G=GL.G,w=G.gw,h=G.gh,a=G.a,u=G.u32;for(let y=0;y<h;y++){const B=G.base[y];for(let x=0;x<w;x++){const i=y*w+x,
        s=(x>0&&x<w-1?a[i-1]-a[i+1]:0)+(y>0&&y<h-1?(a[i-w]-a[i+w])*.7:0),l=s*.55,hl=l>0?l*l*.012:0;
        const r=Math.max(0,Math.min(255,B[0]+l*.55+hl*.9)),g=Math.max(0,Math.min(255,B[1]+l*.75+hl)),bl=Math.max(0,Math.min(255,B[2]+l+hl*1.1));u[i]=(255<<24)|(bl<<16)|(g<<8)|r}}
    G.octx.putImageData(G.img,0,0);G.ctx.imageSmoothingEnabled=true;G.ctx.imageSmoothingQuality='high';G.ctx.drawImage(G.off,0,0,w,h,-G.cell,-G.cell,w*G.cell,h*G.cell)},
  // yapraklar suyun altındaki yüksekliğe göre kalkar/iner ve eğimle hafifçe döner
  pads(){const G=GL.G;for(let i=0;i<G.n;i++){const h=G.h[i],x=Math.round(h.x/G.cell)+1,y=Math.round(h.y/G.cell)+1,w=G.gw,j=y*w+x,ok=x>1&&y>1&&x<w-2&&y<G.gh-2,
      z=ok?(G.a[j]+G.a[j-1]+G.a[j+1]+G.a[j-w]+G.a[j+w])/5:0,sx=ok?G.a[j-1]-G.a[j+1]:0,sy=ok?G.a[j-w]-G.a[j+w]:0;
      G.el[i].style.transform=`translate(${h.x.toFixed(1)}px,${(h.y-z*.06).toFixed(1)}px) rotate(${Math.max(-8,Math.min(8,sx*.05)).toFixed(2)}deg) scale(${(1+Math.max(-.05,Math.min(.08,z*.0007))).toFixed(3)})`;
      G.el[i].style.setProperty('--tl',Math.max(-1,Math.min(1,sy*.01)).toFixed(2))}},
  mount(root){const el=[...root.querySelectorAll('.gl-p')],G=GL.G={n:el.length,el,h:[],cv:root.querySelector('.gl-cv')};GL.lay(root);
    if(calmMotion())return;
    let quiet=0;const L=GL.L=wxLoop(()=>{const P=GL.P;if(P.in&&P.v>1&&performance.now()-P.t<50){GL.drop(P.x,P.y,Math.min(85,14+P.v*2.2),1);P.v*=.4}
      const e=GL.step();GL.render();GL.pads();quiet=e<.3?quiet+1:0;return quiet<10}); // gözle görülmeyecek kadar küçülünce durur
    GL.P=wxPtr(root,L);
    // tıklama: güçlü halka; yaprağa basınca yaprağın altında
    root.addEventListener('pointerdown',e=>{const p=e.target.closest('.gl-p');if(p){const r=p.getBoundingClientRect();GL.drop(r.left+r.width/2,r.top+r.height/2,420,4)}else if(!e.target.closest('button,nav'))GL.drop(e.clientX,e.clientY,520,4);L.go()});
    root.addEventListener('pointerover',e=>{const p=e.target.closest('.gl-p');if(p&&!p.contains(e.relatedTarget)){const r=p.getBoundingClientRect();GL.drop(r.left+r.width/2,r.top+r.height/2,160,3);L.go()}});
    // ara sıra tek damla (sahne canlı kalsın; sekme gizliyken düşmez)
    const rain=()=>{if(!GL.L||GL.L!==L)return;if(!document.hidden&&root.isConnected){GL.drop(innerWidth*(.15+prand(Date.now()%997)*.7),innerHeight*(.25+prand(Date.now()%991)*.55),200,2);L.go()}GL.rt=setTimeout(rain,9000+Math.random()*6000)};
    GL.rt=setTimeout(rain,1400);GL.drop(innerWidth/2,innerHeight*.55,380,3);L.go()},
  unmount(){GL.L?.stop();GL.L=null;clearTimeout(GL.rt)},
  resize(root){GL.lay(root);GL.L?.go()}};

/* ═════════════ PETEK ═════════════
   Bal peteği gibi dizilmiş yuvarlak uygulamalar (Apple Watch’un petek ekranından esinlenme). İmleç bir büyüteç:
   yaklaştığı uygulamalar büyür ve komşularını iter, uzaktakiler küçülür. Klavyede oklar büyüteci gezdirir, Enter açar. */
const PT={sel:0,
  html:d=>`<div class="pt">${wxTop(d)}<i class="pt-lens" aria-hidden="true"></i>
    <div class="pt-bs" role="list" aria-label="Uygulamalar">${d.apps.map((a,i)=>`<button class="pt-b" role="listitem" data-i="${i}" data-app="${esc(a.key)}" aria-label="${esc(a.name)}" title="${esc(a.desc)}">${appIcon(a)}<b>${esc(a.name)}</b></button>`).join('')}</div>
    <p class="pt-cap" aria-live="polite"><b></b><span></span></p>
    ${wxNav('Petek')}<p class="wx-hint">${mobile()?'Parmağını gezdir — büyüteç gibi':'İmleç büyüteç gibi · oklar ve Enter da çalışır'}</p></div>`,
  lay(root){const T=PT.T,m=mobile(),W=innerWidth,Hh=innerHeight,n=T.n;
    // altıgen halkalar: ortadan dışa (ilk uygulamalar ortada)
    const ax=[[0,0]],dirs=[[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]];for(let k=1;ax.length<n;k++){let q=-k,r=k;for(const[dq,dr]of dirs)for(let s=0;s<k&&ax.length<n;s++){ax.push([q,r]);q+=dq;r+=dr}}
    let S=m?78:104;const ext=ax.reduce((o,[q,r])=>({x:Math.max(o.x,Math.abs(q+r/2)),y:Math.max(o.y,Math.abs(r*.866))}),{x:0,y:0}),
      top=m?120:130,bot=m?210:200,fx=(W-(m?24:60))/(2*ext.x*S+S*(m?1.4:2.2)),fy=(Hh-top-bot)/(2*ext.y*S+S*2.2),f=Math.min(1,fx,fy);S*=f;T.S=S;root.style.setProperty('--bz',(S*.78).toFixed(1)+'px');
    const cx=W/2,cy=top+(Hh-top-bot)/2;T.c={x:cx,y:cy};T.h=ax.slice(0,n).map(([q,r])=>({x:cx+S*(q+r/2),y:cy+S*r*.866}));
    if(!T.p.length){T.p=T.h.map(h=>({...h}));T.s=T.h.map(()=>1)}
    if(!T.lp)T.lp={...T.c}},
  mount(root){const el=[...root.querySelectorAll('.pt-b')],T=PT.T={n:el.length,el,h:[],p:[],s:[],lens:root.querySelector('.pt-lens'),cap:root.querySelector('.pt-cap'),kb:false,lp:null,shown:-1};
    PT.sel=0;PT.lay(root);const calm=calmMotion(),m=mobile();
    const frame=(snap)=>{const P=PT.P,S=T.S,useP=P&&P.in&&!T.kb,tgt=useP?{x:P.x,y:P.y}:T.kb?T.h[PT.sel]:T.c;
      const k=snap?1:.2;T.lp.x+=(tgt.x-T.lp.x)*k;T.lp.y+=(tgt.y-T.lp.y)*k;const R=S*2.15,smin=m?.8:.62,smax=m?1.25:1.4;let busy=Math.abs(tgt.x-T.lp.x)+Math.abs(tgt.y-T.lp.y)>.4,best=-1,bs=0;
      for(let i=0;i<T.n;i++){const h=T.h[i],dx=h.x-T.lp.x,dy=h.y-T.lp.y,d=Math.hypot(dx,dy)||1,g=Math.exp(-(d*d)/(R*R)),s=smin+(smax-smin)*g,
          push=S*.5*g*Math.min(1,d/(S*.7)),tx=h.x+dx/d*push,ty=h.y+dy/d*push,p=T.p[i],kk=snap?1:.22;
        p.x+=(tx-p.x)*kk;p.y+=(ty-p.y)*kk;T.s[i]+=(s-T.s[i])*kk;if(Math.abs(tx-p.x)+Math.abs(ty-p.y)+Math.abs(s-T.s[i])*40>.3)busy=true;
        if(T.s[i]>bs){bs=T.s[i];best=i}
        T.el[i].style.transform=`translate(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px) scale(${T.s[i].toFixed(3)})`;T.el[i].style.setProperty('--o',m||i===T.shown?0:Math.max(0,Math.min(1,(T.s[i]-1.05)*4)).toFixed(2));T.el[i].style.zIndex=Math.round(T.s[i]*100)}
      T.lens.style.transform=`translate(${T.lp.x.toFixed(1)}px,${T.lp.y.toFixed(1)}px)`;T.lens.style.opacity=useP||T.kb?1:.55;
      // en büyük (büyütecin altındaki) uygulamanın adı ve açıklaması altta
      const show=(useP||T.kb||m)&&bs>(m?1.1:1.15)?best:-1;if(show!==T.shown){T.shown=show;const a=show<0?null:H().apps()[show];T.cap.classList.toggle('on',!!a);
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

const R={mekansal:SP,miknatis:MG,golet:GL,petek:PT};

/* ── Çekirdek: dünyayı kur / yenile / değiştir ── */
let cur='galaksi',root=null,clockT=0,rq=0,started=false;
function fillLive(){if(!root)return;const w=R[cur];if(!w.live)return;const d=D();root.querySelectorAll('[data-live]').forEach(el=>{const f=w.live[el.dataset.live];if(f)el.innerHTML=f(d)});tick()}
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
function regroup(){if(cur!=='mekansal'||!root||!H()?.groups)return;let g;try{g=JSON.stringify(H().groups())}catch{return}if(g===SP.sig)return;
  if(document.querySelector('.world .sp-ren')||document.querySelector('.world .sp-hi.drag'))return;SP.keep=SP.keep||SP.list[SP.sel]?.key;rebuild()}
let rt=0;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{if(root)R[cur].resize?.(root)},150)});
addEventListener('storage',e=>{if(e.key===KEY&&started){const w=read();if(w!==cur)apply(w)}});
setInterval(()=>{if(root&&!document.hidden)refresh()},60000);

/* ── Arayüz seçici: canlı küçük önizlemeler ── */
const MINI={
  galaksi:'<i class="m-sun"></i><i class="m-orb o1"></i><i class="m-orb o2"></i><i class="m-pl p1"></i><i class="m-pl p2"></i><i class="m-pl p3"></i>',
  mekansal:'<i class="m-card c1"></i><i class="m-card c2"></i><i class="m-card c3"></i><i class="m-flr"></i>',
  miknatis:'<i class="m-fe"><i class="f1"></i><i class="f2"></i><i class="f3"></i><i class="f4"></i><i class="fc"></i></i>',
  golet:'<i class="m-rp r1"></i><i class="m-rp r2"></i><i class="m-rp r3"></i><i class="m-lp l1"></i><i class="m-lp l2"></i><i class="m-lp l3"></i>',
  petek:'<i class="m-hx h0"></i><i class="m-hx h1"></i><i class="m-hx h2"></i><i class="m-hx h3"></i><i class="m-hx h4"></i><i class="m-hx h5"></i><i class="m-hx h6"></i>'};
let pk=null;
function picker(){if(pk)return;const el=document.createElement('div');el.className='wp-bg';el.innerHTML=`<div class="wp" role="dialog" aria-modal="true" aria-labelledby="wpT">
  <header><div><h2 id="wpT">Arayüz</h2><p>Aynı uygulamalar ve veriler, ${WORLDS.length} ayrı dünya; her birinde imleç sahneyi canlandırır. Renk teması Galaksi'de ve uygulamalarda geçerli.</p></div><button class="wp-x" aria-label="Kapat">✕</button></header>
  <div class="wp-g">${WORLDS.map(([k,n,ds],i)=>`<button class="wpc${k===cur?' on':''}" data-w="${k}" aria-pressed="${k===cur}"><div class="wpv pv-${k}" aria-hidden="true">${MINI[k]}</div><span class="wpn"><b>${n}</b><kbd>${i+1}</kbd></span><span class="wpd">${ds}</span></button>`).join('')}</div>
  <footer>1–${WORLDS.length} tuşları ile seç · Esc kapatır</footer></div>`;
  document.body.appendChild(el);pk=el;
  const close=()=>{if(!pk)return;pk=null;removeEventListener('keydown',key,true);if(calmMotion())return el.remove();el.classList.add('out');setTimeout(()=>el.remove(),220)};
  const pick=w=>{close();if(w!==cur)set(w)};
  const key=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close()}else if(/^[1-9]$/.test(e.key)&&+e.key<=WORLDS.length&&!e.metaKey&&!e.ctrlKey){e.preventDefault();e.stopPropagation();pick(WORLDS[+e.key-1][0])}};
  addEventListener('keydown',key,true);
  el.addEventListener('click',e=>{const c=e.target.closest('[data-w]');if(c)return pick(c.dataset.w);if(e.target===el||e.target.closest('.wp-x'))close()});
  requestAnimationFrame(()=>el.classList.add('on'));setTimeout(()=>el.querySelector('.wpc.on,.wpc')?.focus({preventScroll:true}),40)}

function topBtn(){const t=document.getElementById('themeBtn');if(!t||document.getElementById('worldBtn'))return;const b=document.createElement('button');b.className='ib';b.id='worldBtn';b.title='Arayüz (⇧⌘U)';b.setAttribute('aria-label','Arayüzü değiştir');
  b.innerHTML='<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="5.5"/><path d="M2.5 8h11M8 2.5c2 2 2 9 0 11M8 2.5c-2 2-2 9 0 11"/></svg>';b.onclick=e=>{e.stopPropagation();picker()};t.before(b)}
function boot(){topBtn();if(started)return refresh();started=true;const w=read();if(w!=='galaksi'&&R[w])apply(w)}
topBtn();
window.Worlds={boot,refresh,regroup,picker,set,get:()=>cur,list:WORLDS.map(w=>w[0])};
})();
