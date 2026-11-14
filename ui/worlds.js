/* AppShell — Arayüz dünyaları.
   Aynı veri (uygulamalar, bugün, notlar, çalışma), altı bambaşka arayüz sistemi.
   Galaksi = hub'ın kendisi; diğer beşi #world katmanında çizilir, galaksi döngüsü durur.
   Hub köprüsü: window.HUB (index.html sonunda). Seçim: localStorage 'appshell:world'. */
(function(){
'use strict';
const H=()=>window.HUB, KEY='appshell:world';
const WORLDS=[
  ['galaksi','Galaksi','Uzayda yüzen uygulamalar, yörüngeler, serbest kamera'],
  ['defter','Defter','Çizgili kâğıt, el yazısı, içindekiler, yapışkan notlar'],
  ['terminal','Terminal','Komut satırı, sistem panelleri, holografik radar'],
  ['organik','Organik','Gölet, büyüyen bitki, kıvrılan patika'],
  ['isvicre','İsviçre','Gazete ızgarası, dev tipografi, tek kırmızı'],
  ['mekansal','Mekânsal','Derinlikte yüzen cam pencereler, dönen halka']];
const FONTS={defter:'Caveat:wght@400..700&family=Newsreader:opsz,wght@6..72,400..600',terminal:'Share+Tech+Mono&family=Rajdhani:wght@500;600;700',
  organik:'Fraunces:opsz,wght@9..144,300..650&family=Nunito:wght@400..800',isvicre:'Inter+Tight:wght@400..800'};
const fl=new Set();
function loadFont(w){if(!FONTS[w]||fl.has(w))return;fl.add(w);const l=document.createElement('link');l.rel='stylesheet';l.href='https://fonts.googleapis.com/css2?family='+FONTS[w]+'&display=swap';document.head.appendChild(l)}
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

/* ═════════════ 1 · DEFTER ═════════════ */
const ROM=['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV'];
const NB={pg:0,
  pages:[
    d=>`<header class="nb-h"><span class="nb-greet">${greet(d.now)},</span><span class="nb-date">${esc(trDate(d.now,{weekday:'long',day:'numeric',month:'long'}))}</span></header>
      <p class="nb-lab">Günün odağı</p>
      ${d.focus?`<p class="nb-hand${d.focus.done?' done':''}">${esc(d.focus.t)}</p>`:`<p class="nb-hand dim">— henüz seçilmedi</p>`}
      <p class="nb-lab">Yapılacaklar</p>
      ${d.todos.length?`<ul class="nb-todo">${d.todos.slice(0,7).map(t=>`<li class="${t.done?'done':''}"><i aria-hidden="true"></i><span>${esc(t.t)}</span></li>`).join('')}</ul>`
        :`<p class="nb-hand dim">Bugüne yazılmış iş yok.</p>`}
      <p><button class="nb-link" data-act="today">Bugünün sayfasını aç →</button></p>
      <p class="nb-lab">Çalıştım</p>
      <p class="nb-hand">${fmt(d.today)}${d.goal?` <small>/ ${fmt(d.goal)}</small>`:''}<svg class="nb-bar" viewBox="0 0 160 14" aria-hidden="true"><path d="M2 8 Q40 4 80 8 T158 7" class="tr"/><path d="M2 8 Q40 4 80 8 T158 7" class="fi" style="stroke-dasharray:${Math.round(160*Math.min(1,d.goal?d.today/d.goal:0))} 400"/></svg></p>
      <p class="nb-lab">Kenar notu</p>
      <textarea class="nb-scr" rows="4" aria-label="Kenar notu" placeholder="Aklına geleni karala…"></textarea>`,
    d=>`<header class="nb-h"><h2 class="nb-ser">İçindekiler</h2></header>
      <ol class="nb-toc">${d.apps.map((a,i)=>`<li><button data-app="${esc(a.key)}" title="${esc(a.desc)}"><span class="n">${ROM[i]||i+1}.</span><span class="t">${esc(a.name)}</span><span class="dots"></span><span class="p">${i*4+3}</span></button></li>`).join('')}</ol>
      <p class="nb-lab">Sayfa ara</p><p><button class="nb-link" data-act="ara">Defterde ara (⌘K) →</button></p>`,
    d=>`<header class="nb-h"><h2 class="nb-ser">Son sayfalar</h2></header>
      ${d.notes.length?`<div class="nb-stk">${d.notes.map((n,i)=>`<button class="stk" data-note="${esc(n.id)}" style="--r:${[-2.5,1.8,-1,2.6,-1.8,1][i]}deg;--c:${['#FFF0A8','#FFD6C9','#D7F0C8','#D6E4FF','#F6D9F2','#FFE6B8'][i]}"><i class="tape" aria-hidden="true"></i><b>${esc(n.icon)} ${esc(n.title)}</b><span>${esc(n.ex.slice(0,70))||'boş sayfa'}</span><small>${ago(n.up)}</small></button>`).join('')}</div>`
        :`<p class="nb-hand dim">Henüz sayfa yok.</p><p><button class="nb-link" data-app="p:notlar">Notlar'da ilk sayfayı aç →</button></p>`}`,
    d=>{const mx=Math.max(30,...d.days.map(x=>x.m)),best=d.days.reduce((a,x)=>x.m>a.m?x:a,d.days[0]);
      const bars=d.days.map((x,i)=>{const h=Math.round(x.m/mx*120),X=10+i*22;return`<path class="bx${i===13?' now':''}" d="M${X} 150 L${X+1} ${150-h} L${X+15} ${150-h+1} L${X+14} 150"/><text x="${X+7}" y="168">${'PSÇPCCP'[x.d.getDay()]}</text>`}).join('');
      return`<header class="nb-h"><h2 class="nb-ser">Çalışma günlüğü</h2></header>
      <p class="nb-lab">Son 14 gün</p>
      <svg class="nb-chart" viewBox="0 0 320 176" role="img" aria-label="Son 14 günün çalışma süreleri">${bars}</svg>
      <p class="nb-hand">Bu hafta ${fmt(d.week)}</p>
      <p class="nb-hand">${best.m?`En iyi gün: ${esc(trDate(best.d,{day:'numeric',month:'long'}))} · ${fmt(best.m)}`:'Henüz kayıt yok.'}</p>
      <p><button class="nb-link" data-app="p:studylog">Study Log'u aç →</button></p>`}],
  html:()=>`<div class="nb-desk"><nav class="nb-tabs" aria-label="Defter sekmeleri">
      ${['Bugün','İçindekiler','Sayfalar','Günlük'].map((t,i)=>`<button data-pg="${i}" style="--t:${['#F4C95D','#9CC5A1','#F2A07B','#A8B8E8'][i]}">${t}</button>`).join('')}
      <button data-act="world" style="--t:#D9C2E9">Arayüz</button></nav>
    <div class="nb-book"><section class="nb-page nb-l" aria-live="polite"></section><div class="nb-spine" aria-hidden="true"></div><section class="nb-page nb-r"></section>
      <button class="nb-corner nb-prev" data-turn="-1" aria-label="Önceki sayfa">‹</button><button class="nb-corner nb-next" data-turn="1" aria-label="Sonraki sayfa">›</button></div></div>`,
  span:()=>mobile()?1:2,
  paint(root,d){const s=NB.span(),a=Math.floor(NB.pg/s)*s,L=root.querySelector('.nb-l'),R=root.querySelector('.nb-r');
    const keep=L.querySelector('.nb-scr')?.value;
    L.innerHTML=NB.pages[a](d);R.innerHTML=s===2&&NB.pages[a+1]?NB.pages[a+1](d):'';
    const ta=root.querySelector('.nb-scr');if(ta){ta.value=keep??(localStorage.getItem('appshell:defter-not')||'');ta.oninput=()=>{try{localStorage.setItem('appshell:defter-not',ta.value)}catch{}}}
    root.querySelectorAll('.nb-tabs [data-pg]').forEach(b=>{const on=+b.dataset.pg>=a&&+b.dataset.pg<a+s;b.classList.toggle('on',on);b.setAttribute('aria-current',on?'page':'false')});
    root.querySelector('.nb-prev').disabled=a===0;root.querySelector('.nb-next').disabled=a+s>=NB.pages.length},
  go(root,p){const s=NB.span(),from=Math.floor(NB.pg/s)*s,to=Math.max(0,Math.min(NB.pages.length-1,Math.floor(p/s)*s));if(to===from)return;
    const fwd=to>from,book=root.querySelector('.nb-book');
    if(calmMotion()){NB.pg=to;NB.paint(root,D());return}
    const src=root.querySelector(fwd&&s===2?'.nb-r':'.nb-l'),leaf=src.cloneNode(true);leaf.classList.add('nb-leaf');leaf.removeAttribute('aria-live');
    leaf.style.left=src.offsetLeft+'px';leaf.style.top=src.offsetTop+'px';leaf.style.width=src.offsetWidth+'px';leaf.style.height=src.offsetHeight+'px';
    leaf.style.transformOrigin=fwd?'left center':'right center';book.appendChild(leaf);
    NB.pg=to;NB.paint(root,D());
    const tgt=root.querySelector(s===2?(fwd?'.nb-l':'.nb-r'):'.nb-l');tgt.style.visibility='hidden';
    leaf.animate([{transform:'rotateY(0)',filter:'brightness(1)'},{transform:`rotateY(${fwd?-90:90}deg)`,filter:'brightness(.8)'}],{duration:320,easing:'cubic-bezier(.5,0,.75,0)'}).finished.then(()=>{
      leaf.remove();tgt.style.visibility='';tgt.animate([{transform:`rotateY(${fwd?90:-90}deg)`,filter:'brightness(.8)'},{transform:'rotateY(0)',filter:'brightness(1)'}],{duration:340,easing:'cubic-bezier(.2,.8,.3,1)'}).finished.catch(()=>{})},()=>{leaf.remove();tgt.style.visibility=''})},
  mount(root){root.addEventListener('click',e=>{const p=e.target.closest('[data-pg]'),t=e.target.closest('[data-turn]');
      if(p)NB.go(root,+p.dataset.pg);if(t){const s=NB.span();NB.go(root,Math.floor(NB.pg/s)*s+(+t.dataset.turn)*s)}});

    let sx=null;root.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'&&!e.target.closest('textarea'))sx=e.clientX});
    root.addEventListener('pointerup',e=>{if(sx==null)return;const dx=e.clientX-sx;sx=null;if(Math.abs(dx)>60)NB.go(root,NB.pg+(dx<0?1:-1)*NB.span())});
    NB.paint(root,D())},
  key(root,e){if(e.key==='ArrowRight'){e.preventDefault();NB.go(root,NB.pg+NB.span())}else if(e.key==='ArrowLeft'){e.preventDefault();NB.go(root,NB.pg-NB.span())}},
  refresh(root){if(root.querySelector('.nb-scr')===document.activeElement)return;NB.paint(root,D())},
  resize(root){NB.paint(root,D())}};

/* ═════════════ 2 · TERMİNAL ═════════════ */
const TM={hist:[],hi:0,
  html:()=>`<div class="tm"><div class="tm-scan" aria-hidden="true"></div>
    <aside class="tm-col tm-l">
      <section class="tm-p"><h3>SYS.CLOCK</h3><div class="tm-clock" data-clock="hms"></div><div class="tm-sub" data-live="date"></div></section>
      <section class="tm-p" data-live="study"></section>
      <section class="tm-p" data-live="queue"></section></aside>
    <main class="tm-term"><div class="tm-bar"><span>appshell://tty1</span><span>OTURUM ${String(new Date().getHours()).padStart(2,'0')}:${String(new Date().getMinutes()).padStart(2,'0')}</span></div>
      <div class="tm-out" role="log" aria-live="polite"></div>
      <label class="tm-in"><span class="tm-ps">batu@appshell:~$</span><input spellcheck="false" autocomplete="off" autocapitalize="off" aria-label="Komut yaz"></label>
      <div class="tm-chips">${['yardim','ls','bugun','notlar','calisma','ara','arayuz'].map(c=>`<button data-cmd="${c}">${c}</button>`).join('')}</div></main>
    <aside class="tm-col tm-r"><section class="tm-p"><h3>RADAR // MODÜLLER</h3><div class="tm-radar" data-live="radar"></div></section>
      <section class="tm-p" data-live="mods"></section></aside></div>`,
  live:{
    date:d=>esc(trDate(d.now,{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'}).toUpperCase()),
    study:d=>{const n=20,f=Math.round(n*Math.min(1,d.goal?d.today/d.goal:0)),mx=Math.max(30,...d.days.map(x=>x.m));
      const pts=d.days.map((x,i)=>`${(i*(200/13)).toFixed(1)},${(52-x.m/mx*46).toFixed(1)}`).join(' ');
      return`<h3>ÇALIŞMA.LOG</h3><div class="tm-big">${fmt(d.today)}</div><div class="tm-sub">${d.goal?`HEDEF ${fmt(d.goal).toUpperCase()} · %${Math.round(d.today/d.goal*100)}`:'HEDEF TANIMSIZ'}</div>
        <div class="tm-seg" aria-hidden="true">${Array.from({length:n},(_,i)=>`<i class="${i<f?'on':''}"></i>`).join('')}</div>
        <svg class="tm-spark" viewBox="0 0 200 56" preserveAspectRatio="none" role="img" aria-label="14 günlük çalışma grafiği"><polygon points="0,56 ${pts} 200,56"/><polyline points="${pts}"/></svg><div class="tm-sub">14 GÜN · HAFTA ${fmt(d.week).toUpperCase()}</div>`},
    queue:d=>{const rows=[...d.items.map(x=>({t:x.t,s:x.sub})),...d.todos.map(t=>({t:t.t,s:t.done?'TAMAM':'AÇIK',done:t.done}))].slice(0,7);
      return`<h3>KUYRUK // BUGÜN</h3>${rows.length?`<ul class="tm-q">${rows.map(r=>`<li class="${r.done?'done':''}"><span>› ${esc(r.t)}</span><em>${esc(String(r.s||'').toUpperCase())}</em></li>`).join('')}</ul>`:'<p class="tm-sub">KUYRUK BOŞ. <button class="tm-a" data-act="today">BUGÜN SAYFASI</button></p>'}`},
    radar:d=>{const n=d.apps.length||1;return`<div class="tm-sweep" aria-hidden="true"></div><svg viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="96"/><circle cx="100" cy="100" r="64"/><circle cx="100" cy="100" r="32"/><path d="M100 4V196M4 100H196"/></svg>
      ${d.apps.map((a,i)=>{const t=-Math.PI/2+i/n*Math.PI*2,r=i%2?52:80;return`<button class="tm-blip" data-app="${esc(a.key)}" style="left:${(50+Math.cos(t)*r/2).toFixed(1)}%;top:${(50+Math.sin(t)*r/2).toFixed(1)}%;--d:${(i/n*4).toFixed(2)}s" aria-label="${esc(a.name)} aç"><i></i><span>${esc(a.name)}</span></button>`}).join('')}`},
    mods:d=>`<h3>MODÜLLER</h3><ul class="tm-mods">${d.apps.map((a,i)=>`<li><button data-app="${esc(a.key)}" title="${esc(a.desc)}"><b>[${String(i+1).padStart(2,'0')}]</b><span>${esc(a.name.toLocaleUpperCase('tr-TR'))}</span><em>${a.ai?'AI':'HAZIR'}</em></button></li>`).join('')}</ul>`},
  out(root,html,cls=''){const o=root.querySelector('.tm-out'),l=document.createElement('div');l.className='tl '+cls;l.innerHTML=html;o.appendChild(l);while(o.children.length>200)o.firstChild.remove();o.scrollTop=o.scrollHeight},
  match(d,q){q=q.toLocaleLowerCase('tr-TR');const n=+q;if(n&&d.apps[n-1])return d.apps[n-1];return d.apps.find(a=>a.name.toLocaleLowerCase('tr-TR')===q)||d.apps.find(a=>a.name.toLocaleLowerCase('tr-TR').startsWith(q))||d.apps.find(a=>a.key.slice(2).startsWith(q))},
  run(root,raw){const d=D(),[c,...rest]=raw.trim().split(/\s+/),arg=rest.join(' '),cmd=(c||'').toLocaleLowerCase('tr-TR');
    TM.out(root,`<span class="tm-ps">batu@appshell:~$</span> ${esc(raw)}`,'cmd');if(!cmd)return;
    const A={
      yardim:()=>TM.out(root,`KOMUTLAR<br>${[['ls','modülleri listele'],['ac &lt;ad|no&gt;','uygulama aç'],['bugun','bugünün kuyruğu'],['notlar','son sayfalar'],['calisma','çalışma raporu'],['ara','komut paleti'],['arayuz [ad]','arayüz değiştir'],['saat','zaman'],['temizle','ekranı temizle']].map(([k,v])=>`<span class="hi">${k.padEnd(12,' ')}</span> ${v}`).join('<br>')}`),
      ls:()=>TM.out(root,d.apps.map((a,i)=>`<button class="tm-a" data-app="${esc(a.key)}">[${String(i+1).padStart(2,'0')}] ${esc(a.name)}</button> <span class="dim">${esc(a.desc.slice(0,64))}</span>`).join('<br>')||'modül yok'),
      ac:()=>{const a=TM.match(d,arg);if(!a)return TM.out(root,`HATA: "${esc(arg)}" bulunamadı. <span class="dim">ls ile bak.</span>`,'err');TM.out(root,`${esc(a.name)} başlatılıyor… <span class="ok">OK</span>`);setTimeout(()=>H().open(a.key),180)},
      bugun:()=>{const r=[...d.items.map(x=>'› '+esc(x.t)+' <span class="dim">'+esc(x.sub)+'</span>'),...d.todos.map(t=>(t.done?'<span class="ok">✓</span> ':'› ')+esc(t.t))];TM.out(root,r.length?r.join('<br>'):'Bugün kuyruk boş. <button class="tm-a" data-act="today">bugünün sayfası</button>')},
      notlar:()=>TM.out(root,d.notes.length?d.notes.map(n=>`<button class="tm-a" data-note="${esc(n.id)}">${esc(n.title)}</button> <span class="dim">${ago(n.up)}</span>`).join('<br>'):'Sayfa yok.'),
      calisma:()=>TM.out(root,`BUGÜN ${fmt(d.today)}${d.goal?' / '+fmt(d.goal):''} · HAFTA ${fmt(d.week)}<br>${d.days.map(x=>`<span class="bar" style="--h:${Math.min(1,x.m/Math.max(30,...d.days.map(y=>y.m)))}"></span>`).join('')}`),
      ara:()=>H().palette(), saat:()=>TM.out(root,esc(new Date().toLocaleString('tr-TR'))),
      temizle:()=>{root.querySelector('.tm-out').innerHTML=''},
      arayuz:()=>{if(!arg)return picker();const w=WORLDS.find(x=>x[0].startsWith(arg.toLocaleLowerCase('tr-TR'))||x[1].toLocaleLowerCase('tr-TR').startsWith(arg.toLocaleLowerCase('tr-TR')));w?set(w[0]):TM.out(root,'Arayüzler: '+WORLDS.map(x=>x[0]).join(', '),'err')}};
    const al={help:'yardim',yardım:'yardim',apps:'ls',open:'ac',aç:'ac',today:'bugun',bugün:'bugun',notes:'notlar',study:'calisma',çalışma:'calisma',search:'ara',world:'arayuz',arayüz:'arayuz',clear:'temizle',date:'saat'};
    const f=A[cmd]||A[al[cmd]];if(f)return f();
    const a=TM.match(d,raw.trim());if(a){TM.out(root,`${esc(a.name)} başlatılıyor… <span class="ok">OK</span>`);setTimeout(()=>H().open(a.key),180);return}
    TM.out(root,`komut bulunamadı: ${esc(cmd)} — <span class="hi">yardim</span> yaz`,'err')},
  mount(root){const inp=root.querySelector('.tm-in input');
    inp.addEventListener('keydown',e=>{if(e.key==='Enter'){const v=inp.value;inp.value='';if(v.trim()){TM.hist.push(v);TM.hi=TM.hist.length}TM.run(root,v)}
      else if(e.key==='ArrowUp'){e.preventDefault();if(TM.hi>0)inp.value=TM.hist[--TM.hi]}else if(e.key==='ArrowDown'){e.preventDefault();TM.hi=Math.min(TM.hist.length,TM.hi+1);inp.value=TM.hist[TM.hi]||''}
      else if(e.key==='Tab'){e.preventDefault();const[c,...r]=inp.value.split(' ');if(r.length){const a=TM.match(D(),r.join(' '));if(a)inp.value=c+' '+a.name}}});
    root.addEventListener('click',e=>{const c=e.target.closest('[data-cmd]');if(c){TM.run(root,c.dataset.cmd);return}
      if(!e.target.closest('button,a,input')&&e.target.closest('.tm-term')&&!getSelection().toString())inp.focus({preventScroll:true})});
    const d=D(),boot=['APPSHELL OS // ÇEKİRDEK YÜKLENİYOR',`modüller ........ ${d.apps.length} bulundu`,`notlar ......... ${d.notes.length} sayfa`,`çalışma ........ bugün ${fmt(d.today)}`,'bağlantı ....... <span class="ok">GÜVENLİ</span>',`${greet(d.now).toUpperCase()}. <span class="hi">yardim</span> yazarak başla.`];
    if(calmMotion())boot.forEach(l=>TM.out(root,l,'dim'));else boot.forEach((l,i)=>setTimeout(()=>root.isConnected&&TM.out(root,l,i===boot.length-1?'':'dim'),90*i));
    if(!mobile())setTimeout(()=>inp.focus({preventScroll:true}),60)}};

/* ═════════════ 3 · ORGANİK ═════════════ */
const OG={
  html:d=>{const h=d.now.getHours()+d.now.getMinutes()/60,p=Math.max(0,Math.min(1,(h-6)/14));
    return`<div class="og"><div class="og-sky" aria-hidden="true"><div class="og-sun" style="--p:${p.toFixed(3)}"></div></div>
    <svg class="og-hills" viewBox="0 0 1440 320" preserveAspectRatio="none" aria-hidden="true"><path class="h1" d="M0 190 C220 110 420 170 640 140 C900 100 1100 190 1440 120 V320 H0Z"/><path class="h2" d="M0 240 C260 190 520 260 760 220 C1000 180 1200 250 1440 210 V320 H0Z"/><path class="h3" d="M0 285 C300 255 640 300 940 270 C1180 248 1320 280 1440 268 V320 H0Z"/></svg>
    <div class="og-pollen" aria-hidden="true">${Array.from({length:14},(_,i)=>`<i style="--x:${(i*71)%100}%;--s:${8+(i*7)%9}s;--dl:-${i*1.3}s"></i>`).join('')}</div>
    <div class="og-flow">
      <header class="og-h"><p class="og-greet">${greet(d.now)}</p><h1><span data-clock="hm"></span><em>${esc(trDate(d.now,{weekday:'long',day:'numeric',month:'long'}))}</em></h1></header>
      <div class="og-meet">
        <section class="og-pond" data-live="pond" aria-label="Bugün"></section>
        <section class="og-plant" data-live="plant" aria-label="Çalışma bitkisi"></section></div>
      <section class="og-path" aria-label="Uygulamalar"><h2>Patika</h2><svg class="og-trail" viewBox="0 0 1000 220" preserveAspectRatio="none" aria-hidden="true"><path d="M0 120 C120 40 220 200 340 120 S560 40 680 120 S880 200 1000 110"/></svg>
        <div class="og-seeds" data-live="seeds"></div></section>
      <section class="og-leaves" data-live="leaves" aria-label="Son sayfalar"></section>
      <nav class="og-nav"><button data-act="ara">Ara</button><button data-act="today">Bugün</button><button data-act="world">Arayüz</button></nav></div></div>`},
  live:{
    pond:d=>{const pads=[...d.items.map(x=>({t:x.t,s:x.sub})),...d.todos.map(t=>({t:t.t,s:t.done?'oldu':'bekliyor',done:t.done}))].slice(0,6);
      return`<h2>Gölet</h2><p class="og-sub">${pads.length?'bugün suyun üstünde olanlar':'su durgun — bugün için bir şey yok'}</p>
      <div class="og-pads">${pads.map((x,i)=>`<button class="og-pad${x.done?' done':''}" data-act="today" style="--i:${i}"><b>${esc(x.t)}</b><small>${esc(x.s||'')}</small></button>`).join('')||'<button class="og-pad" data-act="today"><b>Bugünü yaz</b><small>Notlar</small></button>'}</div>`},
    plant:d=>{const g=d.goal||120,p=Math.min(1,d.today/g),H=60+170*p,n=Math.max(1,Math.round(p*7));
      const leaves=Array.from({length:n},(_,i)=>{const y=250-(i+1)*(H/(n+1)),s=i%2?1:-1;return`<path class="lf" style="--i:${i}" d="M100 ${y.toFixed(0)} q${22*s} -26 ${48*s} -8 q${-24*s} 16 ${-48*s} 8z"/>`}).join('');
      return`<svg viewBox="0 0 200 270" role="img" aria-label="Bugünkü çalışma: ${fmt(d.today)}"><ellipse cx="100" cy="256" rx="60" ry="9" class="soil"/><path class="stem" d="M100 252 C96 ${252-H*.4} 106 ${252-H*.7} 100 ${252-H}"/>${leaves}${p>=1?`<circle cx="100" cy="${252-H}" r="12" class="bloom"/>`:''}</svg>
      <p class="og-num">${fmt(d.today)}</p><p class="og-sub">${d.goal?`hedefin %${Math.round(p*100)}'i · ${p>=1?'çiçek açtı':'büyüyor'}`:'çalıştıkça büyür'}</p>`},
    seeds:d=>d.apps.map((a,i)=>{const n=Math.max(1,d.apps.length-1),x=4+i/n*88,y=50+Math.sin(i*1.25)*28;
      return`<button class="og-seed" data-app="${esc(a.key)}" style="--x:${x.toFixed(1)}%;--y:${y.toFixed(0)}%;--r:${['62% 38% 55% 45% / 48% 60% 40% 52%','45% 55% 40% 60% / 60% 42% 58% 40%','55% 45% 62% 38% / 42% 55% 45% 58%'][i%3]};--dl:-${i*.7}s" title="${esc(a.desc)}">${appIcon(a)}<span>${esc(a.name)}</span></button>`}).join(''),
    leaves:d=>`<h2>Yapraklar</h2><p class="og-sub">son dokunduğun sayfalar</p>${d.notes.length?`<div class="og-lv">${d.notes.map((n,i)=>`<button class="og-leaf" data-note="${esc(n.id)}" style="--r:${[-4,3,-2,5,-3,2][i]}deg"><b>${esc(n.icon)} ${esc(n.title)}</b><small>${ago(n.up)}</small></button>`).join('')}</div>`:'<p class="og-sub">henüz yaprak yok</p>'}`}};

/* ═════════════ 4 · İSVİÇRE ═════════════ */
const SW={
  html:d=>{const doy=Math.floor((d.now-new Date(d.now.getFullYear(),0,0))/864e5);
    return`<div class="swz"><div class="sw-grid" aria-hidden="true">${'<i></i>'.repeat(12)}</div>
    <header class="sw-mast"><div class="sw-logo">AppShell</div><div class="sw-meta"><span>No. ${doy}</span><span>${esc(trDate(d.now,{weekday:'long',day:'numeric',month:'long',year:'numeric'}))}</span><span data-clock="hm"></span></div></header>
    <section class="sw-hero" data-live="hero"></section>
    <section class="sw-sec"><h2><b>01</b>Uygulamalar</h2><ol class="sw-apps">${d.apps.map((a,i)=>`<li><button data-app="${esc(a.key)}"><b>${String(i+1).padStart(2,'0')}</b><span class="n">${esc(a.name)}</span><span class="d">${esc(a.desc)}</span><span class="ar" aria-hidden="true">→</span></button></li>`).join('')}</ol></section>
    <section class="sw-sec sw-two"><div data-live="agenda"></div><div data-live="chart"></div></section>
    <section class="sw-sec" data-live="notes"></section>
    <footer class="sw-foot"><button data-act="world">Arayüz değiştir →</button><button data-act="ara">Ara ⌘K</button><button data-act="grid">Izgarayı göster</button><span>AppShell · ${d.now.getFullYear()}</span></footer></div>`},
  live:{
    hero:d=>{const head=d.focus?d.focus.t:d.open?`Bugün ${d.open} açık iş seni bekliyor`:`${greet(d.now)}. Masa temiz.`;
      return`<div class="sw-num">${d.now.getDate()}</div><div class="sw-head"><p class="sw-kick">${d.focus?'Günün odağı':'Manşet'}</p><h1>${esc(head)}</h1>
        <p class="sw-deck">${fmt(d.today)} çalışıldı${d.goal?` (hedef ${fmt(d.goal)})`:''} · ${d.apps.length} uygulama · ${d.notes.length} güncel yazı</p></div>`},
    agenda:d=>{const r=[...d.items.map(x=>[x.t,x.sub]),...d.todos.map(t=>[t.t,t.done?'Tamam':'Açık'])].slice(0,6);
      return`<h2><b>02</b>Gündem</h2>${r.length?`<ol class="sw-ag">${r.map(([t,s],i)=>`<li><b>${i+1}</b><span>${esc(t)}</span><em>${esc(s||'')}</em></li>`).join('')}</ol>`:'<p class="sw-mute">Gündemde madde yok.</p>'}<button class="sw-link" data-act="today">Bugünün sayfası →</button>`},
    chart:d=>{const mx=Math.max(30,...d.days.map(x=>x.m));
      return`<h2><b>03</b>Çalışma</h2><p class="sw-big">${Math.round(d.today)}<small>dk bugün</small></p>
        <div class="sw-bars" role="img" aria-label="Son 14 gün">${d.days.map((x,i)=>`<i class="${i===13?'now':''}" style="--h:${(x.m/mx).toFixed(3)}"></i>`).join('')}</div><p class="sw-mute">Son 14 gün · bu hafta ${fmt(d.week)}</p>`},
    notes:d=>`<h2><b>04</b>Son yazılar</h2>${d.notes.length?`<div class="sw-cols">${d.notes.slice(0,3).map(n=>`<article><button data-note="${esc(n.id)}"><small>${ago(n.up)}</small><h3>${esc(n.title)}</h3><p>${esc(n.ex.slice(0,140))||'—'}</p></button></article>`).join('')}</div>`:'<p class="sw-mute">Henüz yazı yok.</p>'}`},
  mount(root){root.addEventListener('click',e=>{if(e.target.closest('[data-act=grid]')){const s=root.querySelector('.swz');s.classList.toggle('show-grid');e.target.closest('button').textContent=s.classList.contains('show-grid')?'Izgarayı gizle':'Izgarayı göster'}})}};

/* ═════════════ 5 · MEKÂNSAL ═════════════
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
    <div class="sp-stage"><div class="sp-scene">
      <aside class="sp-side sp-left" data-side="left"><div data-live="today"></div><button class="sp-grab" aria-label="Bugün penceresini taşı (çift tık: yerine koy)"></button></aside>
      <div class="sp-ringw"><div class="sp-shadow" aria-hidden="true"></div><div class="sp-ring" role="listbox" aria-label="Gruplara göre uygulamalar halkası">${SP.list.map((a,i)=>{const g=SP.G[a.gi];return`<button class="sp-win" role="option" data-i="${i}" data-key="${esc(a.key)}" style="--gc:${esc(g.color)}" aria-label="${esc(a.name)} — ${esc(g.name)}"><em class="sp-tag"><i></i>${esc(g.name)}</em><span class="sp-ic">${appIcon(a)}</span><b>${esc(a.name)}</b><small>${esc(a.desc.slice(0,80))}</small></button>`}).join('')}
        ${SP.G.length>1?SP.G.map((g,gi)=>`<button class="sp-gt" data-g="${gi}" style="--gc:${esc(g.color)}" tabindex="-1"><i></i>${esc(g.name)}<small>${g.apps.length}</small></button>`).join(''):''}</div></div>
      <div class="sp-home" role="list" aria-label="Ana görünüm, gruplara göre">${SP.G.length>1?SP.G.map((g,gi)=>`<p class="sp-gh" data-g="${gi}" style="--gc:${esc(g.color)}" title="${g.id[0]==='_'?'Otomatik grup':'Çift tık: yeniden adlandır'}"><i></i><span>${esc(g.name)}</span></p>`).join(''):''}${SP.list.map((a,i)=>`<button class="sp-hi" role="listitem" data-i="${i}" data-key="${esc(a.key)}" title="${esc(a.desc)}" style="--gc:${esc(SP.G[a.gi].color)}"><span class="sp-hb">${appIcon(a)}</span><b>${esc(a.name)}</b></button>`).join('')}</div>
      <aside class="sp-side sp-right" data-side="right"><div data-live="notes"></div><button class="sp-grab" aria-label="Son sayfalar penceresini taşı (çift tık: yerine koy)"></button></aside></div></div>
    <div class="sp-find" aria-live="polite"></div>
    <div class="sp-hint">${mobile()?'Uzun bas ve sürükle: gruba taşı':'Uzun bas ya da sürükle: gruba taşı, sırala · Sağ tık: menü · Grup adına çift tık: yeniden adlandır'}</div>
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
    SP.home(root);SP.apply(root)},
  dist:a=>Math.abs(((a-SP.deg)%360+540)%360-180),
  front:()=>SP.f,
  apply(root){const ring=root.querySelector('.sp-ring');ring.style.transform=`translateZ(calc(var(--R) * -1)) rotateY(${-SP.deg}deg)`;
    let f=0,best=1e9;SP.ang.forEach((a,i)=>{const d=SP.dist(a);if(d<best){best=d;f=i}});SP.f=f;
    root.querySelectorAll('.sp-win').forEach((el,i)=>{const a=SP.dist(SP.ang[i]),k=Math.min(1,a/180);
      const far=a>(innerWidth>=900?Math.max(50,SP.step*1.6):92),side=i!==f&&mobile();el.style.opacity=(1-k*.3).toFixed(2);el.style.visibility=far?'hidden':'';el.style.pointerEvents=side?'none':'';el.classList.toggle('front',i===f);
      if(i!==f){el.setAttribute('aria-hidden','true');el.style.removeProperty('--tx');el.style.removeProperty('--ty')}else el.removeAttribute('aria-hidden');el.setAttribute('aria-selected',i===f);el.tabIndex=i===f?0:-1});
    root.querySelectorAll('.sp-gt').forEach(el=>{const gi=+el.dataset.g,a=SP.dist(SP.G[gi].mid);el.style.visibility=a>(innerWidth>=900?45:70)?'hidden':'';el.style.opacity=(1-Math.min(1,a/60)*.5).toFixed(2);el.classList.toggle('on',SP.list[f]?.gi===gi)});
    if(SP.cfg.mode==='halka'){SP.sel=f;SP.cap(root)}},
  cap(root){const a=SP.list[SP.sel],g=a&&SP.G[a.gi];root.querySelector('.sp-cap').innerHTML=a?`<b>${esc(a.name)}</b><span>${SP.G.length>1?`<em style="--gc:${esc(g.color)}"><i></i>${esc(g.name)}</em> `:''}${esc(a.desc)}</span><button data-app="${esc(a.key)}" class="sp-open">Aç ↵</button>`:''},
  rotTo(root,i){SP.deg+=((SP.ang[i]-SP.deg)%360+540)%360-180;SP.apply(root)},
  turn(root,dx){SP.rotTo(root,(SP.f+dx+SP.n)%SP.n)},
  goTo(root,i){if(SP.cfg.mode==='izgara'){SP.sel=i;root.querySelectorAll('.sp-hi')[i]?.focus({preventScroll:true});SP.cap(root);return}SP.rotTo(root,i)},
  /* ana görünüm: hafif kavisli petek */
  home(root){const m=mobile(),sx=m?100:140,sy=m?116:140,lh=m?32:42,gx=m?18:64,gy=m?14:30,maxW=m?330:Math.max(560,Math.min(1120,innerWidth*.6)),multi=SP.G.length>1;
    const bl=SP.G.map(g=>{const c=Math.min(m?3:(multi?3:5),g.apps.length),rw=Math.ceil(g.apps.length/c);return{g,c,w:c*sx,h:(multi?lh:0)+rw*sy}});
    const rows=[];let cur=[],cw=0;bl.forEach(b=>{if(cur.length&&cw+gx+b.w>maxW){rows.push(cur);cur=[];cw=0}cw+=(cur.length?gx:0)+b.w;cur.push(b)});if(cur.length)rows.push(cur);
    const rh=rows.map(r=>Math.max(...r.map(b=>b.h))),H=rh.reduce((a,b)=>a+b,0)+gy*(rows.length-1);
    const it=[...root.querySelectorAll('.sp-hi')],gh=[...root.querySelectorAll('.sp-gh')],curve=(x,y,z)=>{const u=x/(maxW/2);return[(-u*u*(m?30:110)+(z||0)).toFixed(0),(-u*(m?8:16)).toFixed(1)]};
    let y=-H/2;SP.pos=[];rows.forEach((row,ri)=>{let x=-(row.reduce((a,b)=>a+b.w,0)+gx*(row.length-1))/2;
      row.forEach(b=>{const cx=x+b.w/2,[z,ry]=curve(cx);b.g.box={x0:x-gx/2,x1:x+b.w+gx/2,y0:y-gy/2,y1:y+b.h+gy/2};const L=gh[SP.G.indexOf(b.g)];if(L)L.style.transform=`translate3d(calc(${cx.toFixed(0)}px - 50%),${(y).toFixed(0)}px,${z}px) rotateY(${ry}deg)`;
        b.g.apps.forEach((a,j)=>{const c=j%b.c,r=Math.floor(j/b.c),inRow=Math.min(b.c,b.g.apps.length-r*b.c),ix=x+(b.w-inRow*sx)/2+c*sx+sx/2,iy=y+(multi?lh:0)+r*sy+sy/2,[zz,rr]=curve(ix);
          SP.pos[a.si]={x:ix,y:iy};const el=it[a.si];if(el){el.style.transform=`translate3d(${ix.toFixed(0)}px,${iy.toFixed(0)}px,${zz}px) rotateY(${rr}deg)`;el.style.setProperty('--d',(a.si*45)+'ms')}});
        x+=b.w+gx});y+=rh[ri]+gy});
    const avail=Math.max(260,innerHeight-(m?300:330)),sc=Math.min(1,avail/H);root.querySelector('.sp-home').style.setProperty('--hs',sc.toFixed(3))},
  mode(root,m){SP.cfg.mode=m;SP.save();const sp=root.querySelector('.sp');sp.dataset.mode=m;
    root.querySelectorAll('[data-sp=halka],[data-sp=izgara]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.sp===m));
    if(m==='izgara'){SP.sel=SP.front();SP.cap(root)}else SP.apply(root)},
  /* ortam + dalma */
  env(root,k){SP.cfg.env=k;SP.save();root.querySelector('.sp').dataset.env=k;root.querySelectorAll('.sp-envs [data-env]').forEach(b=>{const on=b.dataset.env===k;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on)})},
  imm(root,v,keep){v=Math.max(0,Math.min(1,Math.round(v*100)/100));SP.cfg.imm=v;if(v>.05&&!keep)SP.cfg.last=v;SP.save();const sp=root.querySelector('.sp');
    sp.style.setProperty('--imm',v);sp.classList.toggle('full',v>=.97);sp.classList.toggle('room',v<=.02);
    const c=root.querySelector('.sp-crown'),pc=Math.round(v*100);c.setAttribute('aria-valuenow',pc);c.setAttribute('aria-valuetext','%'+pc);c.querySelector('span').textContent=pc;
    const r=root.querySelector('.sp-imm input');r.value=pc;root.querySelector('.sp-imm b').textContent='%'+pc},
  envp(root,open){const p=root.querySelector('.sp-envp'),b=root.querySelector('[data-sp=envp]');open=open??p.hidden;p.hidden=!open;b.setAttribute('aria-expanded',open);b.classList.toggle('on',open);if(open)p.querySelector('.on,[data-env]')?.focus({preventScroll:true})},
  center(root){SP.cfg.off={};SP.save();root.querySelectorAll('.sp-side').forEach(s=>{s.style.removeProperty('--ox');s.style.removeProperty('--oy')});
    const sc=root.querySelector('.sp-scene');sc.style.setProperty('--rx','0deg');sc.style.setProperty('--ry','0deg');SP.rotTo(root,0);if(SP.cfg.mode==='izgara')SP.goTo(root,0);
    if(!calmMotion())root.querySelector('.sp-scene').animate([{transform:'scale(.94)',opacity:.6},{transform:'none',opacity:1}],{duration:500,easing:'cubic-bezier(.16,1,.3,1)'})},
  find(root,ch){clearTimeout(SP.bt);SP.buf+=ch;SP.bt=setTimeout(()=>{SP.buf='';root.querySelector('.sp-find').classList.remove('on')},900);
    const q=SP.buf.toLocaleLowerCase('tr-TR'),apps=SP.list,i=apps.findIndex(a=>a.name.toLocaleLowerCase('tr-TR').startsWith(q)),j=i<0?apps.findIndex(a=>a.name.toLocaleLowerCase('tr-TR').includes(q)):i;
    const f=root.querySelector('.sp-find');f.innerHTML=`<kbd>${esc(SP.buf)}</kbd> ${j<0?'<span>bulunamadı</span>':esc(apps[j].name)}`;f.classList.add('on');if(j>=0)SP.goTo(root,j)},
  mount(root){SP.deg=0;SP.layout(root);if(SP.renameKey){const k=SP.renameKey;SP.renameKey=null;setTimeout(()=>{const gi=SP.G.findIndex(g=>g.apps.some(x=>x.key===k)),l=root.querySelector(`.sp-gh[data-g="${gi}"]`)||root.querySelector(`.sp-gt[data-g="${gi}"]`);if(l&&root.isConnected)SP.rename(root,gi,l)},60)}if(SP.keep){const i=SP.list.findIndex(a=>a.key===SP.keep);if(i>=0){SP.deg=SP.ang[i];SP.sel=i;SP.apply(root)}SP.keep=null}SP.env(root,SP.cfg.env);SP.imm(root,SP.cfg.imm,1);SP.mode(root,SP.cfg.mode);
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
      g.addEventListener('dblclick',()=>{delete SP.cfg.off[s.dataset.side];SP.save();s.style.removeProperty('--ox');s.style.removeProperty('--oy')})});
    crown.addEventListener('pointerdown',e=>{crown.setPointerCapture(e.pointerId);cr={y:e.clientY,v:SP.cfg.imm,id:e.pointerId,moved:false}});
    crown.addEventListener('wheel',e=>{e.preventDefault();SP.imm(root,SP.cfg.imm-e.deltaY*.0012)},{passive:false});
    addEventListener('pointermove',SP.pm=e=>{
      if(gr&&gr.id===e.pointerId){const x=Math.round(e.clientX-gr.x),y=Math.round(e.clientY-gr.y);gr.s.style.setProperty('--ox',x+'px');gr.s.style.setProperty('--oy',y+'px');SP.cfg.off[gr.s.dataset.side]=[x,y];return}
      if(cr&&cr.id===e.pointerId){const dy=cr.y-e.clientY;if(Math.abs(dy)>3)cr.moved=true;if(cr.moved)SP.imm(root,cr.v+dy/220);return}
      if(st&&st.id===e.pointerId&&SP.cfg.mode==='halka'&&!SP.lift){const dx=e.clientX-st.x;if(Math.abs(dx)>6){SP.dragged=true;ring.style.transition='none';SP.deg=st.d-dx/(mobile()?160:260)*SP.step;SP.apply(root)}}
      if(e.pointerType!=='mouse'||calmMotion()||SP.raf)return;
      SP.raf=requestAnimationFrame(()=>{SP.raf=0;scene.style.setProperty('--ry',((e.clientX/innerWidth-.5)*7).toFixed(2)+'deg');scene.style.setProperty('--rx',((.5-e.clientY/innerHeight)*5).toFixed(2)+'deg');
        const fw=root.querySelector('.sp-win.front');if(!fw||st)return;const b=fw.getBoundingClientRect(),u=(e.clientX-b.left)/b.width,v=(e.clientY-b.top)/b.height,inside=u>=0&&u<=1&&v>=0&&v<=1;
        if(inside){fw.style.setProperty('--mx',(u*100).toFixed(0)+'%');fw.style.setProperty('--my',(v*100).toFixed(0)+'%');fw.style.setProperty('--ty',((u-.5)*10).toFixed(1)+'deg');fw.style.setProperty('--tx',((.5-v)*8).toFixed(1)+'deg');fw.classList.add('lit')}
        else if(fw.classList.contains('lit')){fw.classList.remove('lit');fw.style.removeProperty('--tx');fw.style.removeProperty('--ty')}})},{passive:true});
    addEventListener('pointerup',SP.pu=e=>{
      if(gr&&gr.id===e.pointerId){gr.s.classList.remove('moving');gr=null;SP.save();return}
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
    const start=()=>{if(SP.list[d.i]?.key===H().bh){H().toast('Denetçi galaksinin merkezi; taşınmaz');d=null;return}d.on=true;d.el.classList.add('drag');sp.classList.add('dragging');SP.closeMenu();navigator.vibrate?.(8)};
    const target=e=>{const z=document.elementsFromPoint(e.clientX,e.clientY).find(n=>n.dataset?.drop);if(z)return{g:z.dataset.drop,z};const p=local(e),g=SP.G.find(g=>g.box&&p.x>=g.box.x0&&p.x<=g.box.x1&&p.y>=g.box.y0&&p.y<=g.box.y1);
      if(!g)return null;let before=null,best=1e9;g.apps.forEach(a=>{if(a.si===d.i)return;const q=SP.pos[a.si];if(!q)return;const dist=Math.hypot(q.x-p.x,q.y-p.y);if(dist<best&&dist<120){best=dist;before=p.x<q.x?a.key:(g.apps[g.apps.indexOf(a)+1]?.key??'__end')}});return{g:g.id,before:before==='__end'?null:before}};
    home.addEventListener('pointerdown',e=>{const el=e.target.closest('.sp-hi');if(!el||e.button)return;d={el,i:+el.dataset.i,x:e.clientX,y:e.clientY,id:e.pointerId,on:false,touch:e.pointerType!=='mouse'};
      d.t=setTimeout(()=>{if(d&&!d.on){start();if(!d)return;try{el.setPointerCapture(d.id)}catch{}const p=local({clientX:d.x,clientY:d.y});el.style.transform=`translate3d(${p.x.toFixed(0)}px,${(p.y+20).toFixed(0)}px,140px) scale(1.12)`}},380)});
    addEventListener('pointermove',SP.dm=e=>{if(!d||d.id!==e.pointerId)return;const mv=Math.hypot(e.clientX-d.x,e.clientY-d.y);
      if(!d.on){if(d.touch){if(mv>10){clearTimeout(d.t);d=null}return}if(mv<6)return;clearTimeout(d.t);start();if(!d)return;try{d.el.setPointerCapture(d.id)}catch{}}
      e.preventDefault();const p=local(e);d.el.style.transform=`translate3d(${p.x.toFixed(0)}px,${(p.y+20).toFixed(0)}px,140px) scale(1.12)`;
      const t=target(e);d.t2=t;root.querySelectorAll('.sp-gh').forEach(l=>l.classList.toggle('drop',!!t&&SP.G[+l.dataset.g]?.id===t.g));drop.querySelectorAll('span').forEach(c=>c.classList.toggle('on',!!t?.z&&c===t.z));
      const tg=t&&SP.G.find(g=>g.id===t.g);root.querySelector('.sp-cap').innerHTML=`<b>${esc(SP.list[d.i].name)}</b><span>${t?.g==='_new'?'Bırak: yeni grup kur':tg?(tg===SP.G[SP.list[d.i].gi]?'Bırak: sırayı değiştir':'Bırak: '+esc(tg.name)+' grubuna taşı'):'Gruba bırak ya da vazgeçmek için boşluğa bırak'}</span>`},{passive:false});
    addEventListener('pointerup',SP.du=e=>{if(!d||d.id!==e.pointerId)return;clearTimeout(d.t);const was=d;d=null;if(!was.on)return;
      sp.classList.remove('dragging');was.el.classList.remove('drag');root.querySelectorAll('.sp-gh.drop').forEach(l=>l.classList.remove('drop'));SP.dragged=true;setTimeout(()=>SP.dragged=false,0);
      const t=was.t2;if(!t){SP.home(root);SP.cap(root);return}SP.move(root,was.i,t.g,t.before)});
    home.addEventListener('click',e=>{if(SP.dragged){e.stopPropagation();e.preventDefault()}},true);
    /* halka: uzun bas → cam kalkar, grup çiplerine sürükle */
    let L=null;const ring=root.querySelector('.sp-ring');
    ring.addEventListener('pointerdown',e=>{const w=e.target.closest('.sp-win');if(!w||e.button)return;L={w,i:+w.dataset.i,x:e.clientX,y:e.clientY,id:e.pointerId,on:false};
      L.t=setTimeout(()=>{if(!L||L.on)return;if(SP.list[L.i]?.key===H().bh){H().toast('Denetçi galaksinin merkezi; taşınmaz');L=null;return}L.on=true;SP.lift=true;w.classList.add('lifted');sp.classList.add('dragging','lifting');SP.closeMenu();navigator.vibrate?.(10);
        const a=SP.list[L.i];L.g=document.createElement('div');L.g.className='sp-ghost';L.g.innerHTML=`${appIcon(a)}<b>${esc(a.name)}</b>`;sp.appendChild(L.g);L.g.style.transform=`translate(${L.x}px,${L.y}px)`;
        root.querySelector('.sp-cap').innerHTML=`<b>${esc(a.name)}</b><span>Bir gruba sürükle ya da bırakıp vazgeç</span>`;try{w.setPointerCapture(L.id)}catch{}},400)});
    addEventListener('pointermove',SP.lm=e=>{if(!L||L.id!==e.pointerId)return;if(!L.on){if(Math.hypot(e.clientX-L.x,e.clientY-L.y)>8){clearTimeout(L.t);L=null}return}
      e.preventDefault();L.g.style.transform=`translate(${e.clientX}px,${e.clientY}px)`;const z=document.elementsFromPoint(e.clientX,e.clientY).find(n=>n.dataset?.drop);L.z=z;
      drop.querySelectorAll('span').forEach(c=>c.classList.toggle('on',c===z))},{passive:false});
    addEventListener('pointerup',SP.lu=e=>{if(!L||L.id!==e.pointerId)return;clearTimeout(L.t);const was=L;L=null;if(!was.on)return;
      SP.lift=false;SP.dragged=true;setTimeout(()=>SP.dragged=false,0);was.w.classList.remove('lifted');sp.classList.remove('dragging','lifting');was.g.remove();drop.querySelectorAll('.on').forEach(c=>c.classList.remove('on'));
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
  resize(root){SP.layout(root)},
  unmount(){removeEventListener('pointermove',SP.pm);removeEventListener('pointerup',SP.pu);removeEventListener('pointermove',SP.dm);removeEventListener('pointerup',SP.du);removeEventListener('pointermove',SP.lm);removeEventListener('pointerup',SP.lu);removeEventListener('pointercancel',SP.lc);SP.lift=false;SP.closeMenu()}};

const R={defter:NB,terminal:TM,organik:OG,isvicre:SW,mekansal:SP};

/* ── Çekirdek: dünyayı kur / yenile / değiştir ── */
let cur='galaksi',root=null,clockT=0,rq=0,started=false;
function fillLive(){if(!root)return;const w=R[cur];if(!w.live)return;const d=D();root.querySelectorAll('[data-live]').forEach(el=>{const f=w.live[el.dataset.live];if(f)el.innerHTML=f(d)});tick()}
function tick(){if(!root)return;const d=new Date();root.querySelectorAll('[data-clock]').forEach(el=>{const v=el.dataset.clock==='hms'?d.toLocaleTimeString('tr-TR'):hm(d);if(el.textContent!==v)el.textContent=v})}
function apply(w){R[cur]?.unmount?.();cur=w;document.documentElement.dataset.world=w;if(root){root.remove();root=null}clearInterval(clockT);
  if(w==='galaksi'){document.body.classList.remove('inworld');H().pause(false);return}
  document.body.classList.add('inworld');H().pause(true);loadFont(w);
  root=document.createElement('div');root.id='world';root.className='world w-'+w;root.tabIndex=-1;root.innerHTML=(typeof R[w].html==='function'?R[w].html(D()):'');
  document.body.appendChild(root);
  root.addEventListener('click',e=>{const a=e.target.closest('[data-app]');if(a&&!a.closest('.sp-win')){H().open(a.dataset.app);return}
    const n=e.target.closest('[data-note]');if(n){H().openNotes('#p/'+n.dataset.note);return}
    const x=e.target.closest('[data-act]');if(!x)return;const k=x.dataset.act;if(k==='ara')H().palette();else if(k==='world')picker();else if(k==='today')H().openNotes('#today')});
  R[w].mount?.(root);fillLive();clockT=setInterval(tick,1000);if(w!=='terminal')root.focus({preventScroll:true})}
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
  defter:'<i class="m-margin"></i><b class="m-hand">Günaydın,</b><i class="m-line l1"></i><i class="m-line l2"></i><i class="m-stk"></i>',
  terminal:'<b class="m-tx">&gt; ls<br>[01] NOTLAR<br>[02] STUDY<span class="m-car"></span></b><i class="m-rad"></i>',
  organik:'<i class="m-sunO"></i><i class="m-pond"></i><i class="m-stem"></i><i class="m-hill"></i>',
  isvicre:'<b class="m-num">14</b><i class="m-rule"></i><i class="m-bar b1"></i><i class="m-bar b2"></i><i class="m-bar b3"></i>',
  mekansal:'<i class="m-card c1"></i><i class="m-card c2"></i><i class="m-card c3"></i><i class="m-flr"></i>'};
let pk=null;
function picker(){if(pk)return;const el=document.createElement('div');el.className='wp-bg';el.innerHTML=`<div class="wp" role="dialog" aria-modal="true" aria-labelledby="wpT">
  <header><div><h2 id="wpT">Arayüz</h2><p>Aynı uygulamalar ve veriler, altı ayrı dünya. Renk teması Galaksi'de ve uygulamalarda geçerli.</p></div><button class="wp-x" aria-label="Kapat">✕</button></header>
  <div class="wp-g">${WORLDS.map(([k,n,ds],i)=>`<button class="wpc${k===cur?' on':''}" data-w="${k}" aria-pressed="${k===cur}"><div class="wpv pv-${k}" aria-hidden="true">${MINI[k]}</div><span class="wpn"><b>${n}</b><kbd>${i+1}</kbd></span><span class="wpd">${ds}</span></button>`).join('')}</div>
  <footer>1–6 tuşları ile seç · Esc kapatır</footer></div>`;
  document.body.appendChild(el);pk=el;Object.keys(FONTS).forEach(loadFont);
  const close=()=>{if(!pk)return;pk=null;removeEventListener('keydown',key,true);if(calmMotion())return el.remove();el.classList.add('out');setTimeout(()=>el.remove(),220)};
  const pick=w=>{close();if(w!==cur)set(w)};
  const key=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close()}else if(/^[1-6]$/.test(e.key)&&!e.metaKey&&!e.ctrlKey){e.preventDefault();e.stopPropagation();pick(WORLDS[+e.key-1][0])}};
  addEventListener('keydown',key,true);
  el.addEventListener('click',e=>{const c=e.target.closest('[data-w]');if(c)return pick(c.dataset.w);if(e.target===el||e.target.closest('.wp-x'))close()});
  requestAnimationFrame(()=>el.classList.add('on'));setTimeout(()=>el.querySelector('.wpc.on,.wpc')?.focus({preventScroll:true}),40)}

function topBtn(){const t=document.getElementById('themeBtn');if(!t||document.getElementById('worldBtn'))return;const b=document.createElement('button');b.className='ib';b.id='worldBtn';b.title='Arayüz (⇧⌘U)';b.setAttribute('aria-label','Arayüzü değiştir');
  b.innerHTML='<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="5.5"/><path d="M2.5 8h11M8 2.5c2 2 2 9 0 11M8 2.5c-2 2-2 9 0 11"/></svg>';b.onclick=e=>{e.stopPropagation();picker()};t.before(b)}
function boot(){topBtn();if(started)return refresh();started=true;const w=read();if(w!=='galaksi'&&R[w])apply(w)}
topBtn();
window.Worlds={boot,refresh,regroup,picker,set,get:()=>cur,list:WORLDS.map(w=>w[0])};
})();
