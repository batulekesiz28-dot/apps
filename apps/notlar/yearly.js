/* ════════════════════════════════════════════════════════════
   Notlar — “Her yıl” penceresi (Yearly)
   Doğum günü, yıldönümü gibi her yıl tekrarlanan günleri tek yerden ekle/bul/düzenle.
   Tarih: iOS tarzı kaydırmalı tekerlekler (gün · ay · yıl) ya da yazarak (“15.03.2004”, “15 mart”).
   Kayıt TM aktivitesi: {rep:'yearly', kind:'bday'|'' , byear, warn (kaç gün önce hatırlatılsın)}.
   Hub (ui/soon.js) bu kayıtları okur: yaklaşınca açılışta “Yaklaşıyor” ekranı + bildirim.
   Yükleme anında Notlar global'lerine dokunmaz.
   ════════════════════════════════════════════════════════════ */
const Yearly=(()=>{
  const MO=['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
  const RH=40,Y0=new Date().getFullYear(),YEARS=['—',...Array.from({length:Y0-1919},(_,i)=>Y0-i)];
  const WARN=[[0,'Aynı gün'],[1,'1 gün önce'],[3,'3 gün önce'],[7,'1 hafta önce'],[14,'2 hafta önce']];
  const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const leap=y=>y%4===0&&(y%100!==0||y%400===0);
  const dim=(m,y)=>new Date(y||2024,m+1,0).getDate(); // yıl yoksa 29 Şubat seçilebilsin
  const pad=n=>String(n).padStart(2,'0');
  let el=null,st=null;
  const reduce=()=>matchMedia('(prefers-reduced-motion: reduce)').matches||document.documentElement.dataset.motion==='off';

  function nextOcc(m,d){const t=new Date();t.setHours(0,0,0,0);
    for(const y of[t.getFullYear(),t.getFullYear()+1]){const dd=m===1&&d===29&&!leap(y)?28:d,x=new Date(y,m,dd);if(x>=t)return x}}
  const until=x=>Math.round((x-new Date(new Date().toDateString()))/864e5);
  const dl=n=>n===0?'bugün':n===1?'yarın':`${n} gün sonra`;
  const list=()=>[...TM.acts.values()].filter(a=>a.rep==='yearly').map(a=>{const m=+a.date.slice(5,7)-1,d=+a.date.slice(8,10),x=nextOcc(m,d);return{a,x,n:until(x)}}).sort((p,q)=>p.n-q.n);

  // “15.03.2004”, “15/3”, “15 mart 2004”, “3 eki” → {d,m,y}
  function parse(s){s=String(s||'').trim().toLocaleLowerCase('tr');let m=/^(\d{1,2})\s*[.\/\-\s]\s*(\d{1,2})(?:\s*[.\/\-\s]\s*(\d{4}))?$/.exec(s),mo;
    if(m)mo=+m[2]-1;else{m=/^(\d{1,2})\s*\.?\s*([a-zçğıöşü]{3,})\.?(?:\s+(\d{4}))?$/.exec(s);if(!m)return null;mo=MO.findIndex(x=>x.toLocaleLowerCase('tr').startsWith(m[2].slice(0,3)))}
    const d=+m[1],y=m[3]?+m[3]:0;if(mo<0||mo>11||d<1||d>dim(mo,y||0))return null;if(y&&(y<1920||y>Y0))return null;return{d,m:mo,y}}

  const wheel=(k,label,items)=>`<div class="yr-col"><small>${label}</small><div class="yr-w" data-w="${k}" tabindex="0" role="listbox" aria-label="${label}">${items.map((t,i)=>`<div class="yr-i" data-i="${i}" role="option">${t}</div>`).join('')}</div></div>`;
  function html(){const a=st;
    return`<div class="tm-ed yr" role="dialog" aria-modal="true" aria-label="Her yıl tekrarlanan gün">
      <div class="tm-ed-h"><b class="tm-ed-tt">${a.id?'Düzenle':'Her yıl hatırlat'}</b><button type="button" class="tm-ib" data-x aria-label="Kapat"><svg viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8"/></svg></button></div>
      <div class="tm-kind" role="radiogroup" aria-label="Tür"><button type="button" data-yk="bday" role="radio" aria-checked="${a.kind==='bday'}" class="${a.kind==='bday'?'on':''}">🎂 Doğum günü</button><button type="button" data-yk="" role="radio" aria-checked="${a.kind!=='bday'}" class="${a.kind!=='bday'?'on':''}">⭐ Özel gün</button></div>
      <input class="tm-ed-t yr-t" name="title" value="${E(a.title)}" placeholder="${a.kind==='bday'?'Kimin doğum günü? — ör. Ayşe':'Ne var? — ör. Evlilik yıldönümü'}" aria-label="Ad" autocomplete="off">
      <div class="yr-pick"><div class="yr-band" aria-hidden="true"></div>${wheel('d','Gün',Array.from({length:31},(_,i)=>i+1))}${wheel('m','Ay',MO)}${wheel('y',a.kind==='bday'?'Doğum yılı':'İlk yıl',YEARS)}</div>
      <label class="yr-type"><span>ya da yaz</span><input name="typed" placeholder="15.03.2004 · 15 mart" autocomplete="off" inputmode="text"></label>
      <p class="yr-pv" aria-live="polite"></p>
      <div class="yr-warn"><span>Hatırlat</span><div class="yr-chips" role="radiogroup" aria-label="Ne zaman hatırlatılsın">${WARN.map(([v,l])=>`<button type="button" data-wn="${v}" role="radio" aria-checked="${a.warn===v}" class="${a.warn===v?'on':''}">${l}</button>`).join('')}</div></div>
      <p class="tm-hint">Yaklaşınca AppShell açıldığında “Yaklaşıyor” ekranı çıkar, sonra bildirim gelir (telefon bildirimi açıksa telefona da).</p>
      <div class="tm-ed-f">${a.id?`<button type="button" class="tm-btn ghost" data-ydel>Sil</button><button type="button" class="tm-btn ghost" data-ymore>Not ve açıklama</button>`:''}<span style="flex:1"></span><button type="button" class="tm-btn pri" data-ysave>${a.id?'Kaydet':'Ekle'}</button></div>
      ${listHTML()}</div>`}
  function listHTML(){const L=list();if(!L.length)return'';
    return`<div class="yr-list"><div class="ag-h">Her yıl tekrarlananlar · ${L.length}</div>${L.map(({a,x,n})=>`<button type="button" class="yr-r${a.id===st.id?' on':''}" data-yid="${a.id}"><span class="e">${a.kind==='bday'?'🎂':'⭐'}</span><b>${E(a.title)}</b><small>${x.getDate()} ${MO[x.getMonth()]} · ${dl(n)}</small></button>`).join('')}</div>`}

  /* ── tekerlekler: kaydırınca ortadaki seçilir (scroll-snap), tıklayınca oraya kayar, ↑↓ adım ── */
  const W=k=>el.querySelector(`.yr-w[data-w="${k}"]`);
  const idxOf=k=>k==='d'?st.d-1:k==='m'?st.m:(st.y?YEARS.indexOf(st.y):0);
  function scrollTo(k,i,smooth){const w=W(k);if(!w)return;w.scrollTo({top:i*RH,behavior:smooth&&!reduce()?'smooth':'auto'})}
  function shade(w){const c=w.scrollTop/RH;w.querySelectorAll('.yr-i').forEach((e,i)=>{const d=Math.abs(i-c);e.style.visibility=d>2.4?'hidden':'';e.style.opacity=(1-Math.min(2,d)*.16).toFixed(2);e.style.transform=`rotateX(${((i-c)*-18).toFixed(1)}deg) scale(${(1-Math.min(3,d)*.06).toFixed(3)})`;e.classList.toggle('on',d<.5)})}
  function pick(k,i){if(k==='d')st.d=i+1;else if(k==='m')st.m=i;else st.y=i?YEARS[i]:0;
    const mx=dim(st.m,st.y);if(st.d>mx){st.d=mx;scrollTo('d',mx-1,true)}
    el.querySelectorAll('.yr-w[data-w=d] .yr-i').forEach((e,i)=>e.classList.toggle('off',i+1>mx));preview()}
  function wire(){for(const k of['d','m','y']){const w=W(k);let t=0,raf=0;
      w.addEventListener('scroll',()=>{if(!raf)raf=requestAnimationFrame(()=>{raf=0;shade(w)});clearTimeout(t);t=setTimeout(()=>{const i=Math.max(0,Math.min(w.children.length-1,Math.round(w.scrollTop/RH)));if(i!==idxOf(k))pick(k,i)},90)},{passive:true});
      w.addEventListener('click',e=>{const it=e.target.closest('.yr-i');if(it)scrollTo(k,+it.dataset.i,true)});
      w.addEventListener('keydown',e=>{const d=e.key==='ArrowDown'?1:e.key==='ArrowUp'?-1:e.key==='PageDown'?5:e.key==='PageUp'?-5:0;if(!d)return;e.preventDefault();
        const i=Math.max(0,Math.min(w.children.length-1,idxOf(k)+d));pick(k,i);scrollTo(k,i,true)})}
    for(const k of['d','m','y']){scrollTo(k,idxOf(k));shade(W(k))}
    pick('d',st.d-1)}

  function preview(){const p=el.querySelector('.yr-pv');if(!p)return;const x=nextOcc(st.m,st.d),n=until(x),yr=x.getFullYear();
    const age=st.y&&yr>st.y?(st.kind==='bday'?` · ${yr-st.y} yaşına giriyor`:` · ${yr-st.y}. yıl`):'';
    p.innerHTML=`Her yıl <b>${st.d} ${MO[st.m]}</b> · sıradaki ${E(x.toLocaleDateString('tr-TR',{weekday:'long'}))}, <b>${dl(n)}</b>${age}`}

  function collect(){const f=el.querySelector('.yr'),title=f.querySelector('.yr-t').value.trim();
    const y=st.y||(()=>{const x=nextOcc(st.m,st.d);return x.getFullYear()})(); // yıl yoksa sıradaki tekrarın yılı (takvimde o günden itibaren görünür)
    const base=st.id?TM.acts.get(st.id)||{}:{};
    return{...base,id:st.id||undefined,title:title||(st.kind==='bday'?'Doğum günü':'Özel gün'),kind:st.kind,rep:'yearly',byear:st.y||0,warn:st.warn,
      date:`${st.y?y:Math.min(y,new Date().getFullYear())}-${pad(st.m+1)}-${pad(st.d)}`,start:base.start||'',end:base.end||'',status:'plan',cat:base.cat||'kisisel'}}
  function save(){const v=collect();if(st.id){TM.save(v)}else{const a=TM.add(v);st.id=a.id}
    try{toast(`↻ “${v.title}” her yıl ${st.d} ${MO[st.m]}'da hatırlatılacak`)}catch{}close()}

  function load(id,day){const a=id&&TM.acts.get(id),d0=day||today();
    st=a?{id:a.id,title:a.title,kind:a.kind==='bday'?'bday':'',d:+a.date.slice(8,10),m:+a.date.slice(5,7)-1,y:a.byear||0,warn:a.warn??3}
      :{id:'',title:'',kind:'bday',d:+d0.slice(8,10),m:+d0.slice(5,7)-1,y:0,warn:3}}
  function paint(keepFocus){const box=el.querySelector('.yr');const sc=box?box.scrollTop:0;el.innerHTML=html();el.querySelector('.yr').scrollTop=sc;wire();if(!keepFocus)setTimeout(()=>el.querySelector('.yr-t')?.focus({preventScroll:true}),40)}

  function open(id,day){if(el)close(true);load(id,day);
    el=document.createElement('div');el.className='tm-ed-bg yr-bg';document.body.appendChild(el);paint();
    const f=el.querySelector('.yr');
    if(!reduce()){anim(el,[{opacity:0},{opacity:1}],{duration:180,easing:OUT});anim(f,[{opacity:0,transform:'translateY(14px) scale(.97)'},{opacity:1,transform:'none'}],{duration:420,easing:OUT})}
    el.addEventListener('click',e=>{if(e.target===el||e.target.closest('[data-x]'))return close();
      const k=e.target.closest('[data-yk]');if(k){st.kind=k.dataset.yk;st.title=el.querySelector('.yr-t').value;paint();return}
      const w=e.target.closest('[data-wn]');if(w){st.warn=+w.dataset.wn;el.querySelectorAll('[data-wn]').forEach(x=>{x.classList.toggle('on',x===w);x.setAttribute('aria-checked',x===w)});return}
      const r=e.target.closest('[data-yid]');if(r){load(r.dataset.yid);paint();return}
      if(e.target.closest('[data-ysave]'))return save();
      if(e.target.closest('[data-ydel]')){const a=TM.acts.get(st.id),g=TM.del(st.id);close();if(a)try{Library.toastUndo(`“${a.title}” silindi`,()=>TM.restore(g))}catch{}return}
      if(e.target.closest('[data-ymore]')){const id=st.id;close();Time.edit(id)}});
    el.addEventListener('input',e=>{if(e.target.name==='title'){st.title=e.target.value;return}
      if(e.target.name!=='typed')return;const p=parse(e.target.value);e.target.classList.toggle('bad',!!e.target.value.trim()&&!p);if(!p)return;
      st.d=p.d;st.m=p.m;st.y=p.y;for(const k of['m','y','d'])scrollTo(k,idxOf(k),true);pick('d',st.d-1)});
    el.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();close()}else if(e.key==='Enter'&&(e.target.name==='title'||e.target.name==='typed')){e.preventDefault();save()}})}
  function close(now){if(!el)return;const e=el;el=null;if(now||reduce())return e.remove();
    anim(e,[{opacity:1},{opacity:0}],{duration:160,easing:OUT}).finished.then(()=>e.remove(),()=>e.remove())}
  return{open,close,parse,list,get isOpen(){return!!el}}})();
