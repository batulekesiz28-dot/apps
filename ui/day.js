/* AppShell — Bugün kartı.
   Hub her açıldığında önüne bugünün görevleri gelir (sağ üstteki × ya da Esc ile kapanır).
   İki hâl: Plan (sabah) — görevler, tahmini süreler, “bugüne sığıyor mu?” uyarısı, hızlı ekleme, yarına taşıma;
            Kapanış (gün sonuna 2 saat kala kendiliğinden) — bitirdiklerin, kalanları tek dokunuşla yarına taşı, “yarın için tek şey”.
   Veri: Notlar'ın görev deposu TK (apps/notlar/tasks.js) — aynı kayıtlar, aynı kurallar (yerel tasks:v1 / bulut hub/time/tasks).
   Ayar: appshell:daycard {off: açılışta gösterme, end: “günüm şu saatte biter” HH:MM}. Ctrl+K → “Bugünün görevleri”. */
(function(){
'use strict';
const KEY='appshell:daycard',EST=[0,15,30,45,60,90,120,180];
const cfg=()=>{try{return Object.assign({off:false,end:'22:00'},JSON.parse(localStorage.getItem(KEY))||{})}catch{return{off:false,end:'22:00'}}};
const setCfg=p=>{try{localStorage.setItem(KEY,JSON.stringify(Object.assign(cfg(),p)))}catch{}};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ymd=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const T=()=>ymd(new Date()),TM=()=>{const d=new Date();d.setDate(d.getDate()+1);return ymd(d)};
const dur=m=>{m=Math.max(0,Math.round(m));const h=Math.floor(m/60),r=m%60;return h?`${h} sa${r?' '+r+' dk':''}`:`${r} dk`};
const calm=()=>document.documentElement.dataset.motion==='off'||matchMedia('(prefers-reduced-motion: reduce)').matches;
const H=()=>window.HUB;
let el=null,mode=null,started=false,showDone=false;

function start(fs){if(started||typeof TK==='undefined')return;started=true;
  try{fs?TK.startCloud(fs):TK.startLocal()}catch(e){console.error(e)}
  TK.on(()=>{if(el)paint()});
  if(!cfg().off)open()}

/* ── bugünün verisi ── */
function data(){const t=T(),all=TK.list(),day=x=>TK.dayOf(x);
  const open=all.filter(x=>x.status!=='done'&&x.status!=='later'&&day(x)&&day(x)<=t)
    .sort((a,b)=>(day(b)<t)-(day(a)<t)||((a.time||'99')<(b.time||'99')?-1:(a.time||'99')>(b.time||'99')?1:0)||b.prio-a.prio||a.order-b.order);
  const done=all.filter(x=>x.status==='done'&&x.doneAt&&ymd(new Date(x.doneAt))===t);
  return{open,done}}
function left(){const[h,m]=(cfg().end||'22:00').split(':').map(Number),e=new Date();e.setHours(h,m,0,0);return Math.max(0,(e-Date.now())/6e4)}
const autoMode=()=>left()<=120?'close':'plan';

/* ── çizim ── */
function row(x,close){const late=TK.dayOf(x)<T(),meta=[x.time,late?'gecikti':''].filter(Boolean).join(' · ');
  return`<li class="dc-t${late?' late':''}" data-id="${esc(x.id)}">
    <button class="dc-c" data-done aria-label="Tamamla: ${esc(x.title)}" title="Tamamla"></button>
    <button class="dc-n" data-openT title="Görevlerde aç"><span>${esc(x.title)}</span>${meta?`<small>${esc(meta)}</small>`:''}</button>
    ${close?'':`<button class="dc-e${x.est?' on':''}" data-est title="Tahmini süre — tıkla: değiştir" aria-label="Tahmini süre: ${x.est?dur(x.est):'yok'}">${x.est?dur(x.est):'süre?'}</button>`}
    <button class="dc-m" data-tmr title="Yarına taşı" aria-label="Yarına taşı: ${esc(x.title)}"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h9M8.5 4.5L12 8l-3.5 3.5"/></svg></button></li>`}
function paint(){if(!el)return;const c=cfg(),d=new Date(),{open,done}=TK.ready?data():{open:[],done:[]};mode=mode||autoMode();
  const head=`<header class="dc-h"><div><h2 id="dcT">${mode==='close'?'Günü kapat':'Bugün'}</h2><p>${esc(d.toLocaleDateString('tr-TR',{weekday:'long',day:'numeric',month:'long'}))}</p></div>
    <div class="dc-seg" role="tablist" aria-label="Görünüm"><button role="tab" data-mode="plan" aria-selected="${mode==='plan'}">Plan</button><button role="tab" data-mode="close" aria-selected="${mode==='close'}">Kapanış</button></div>
    <button class="dc-x" data-bell aria-label="Hatırlatıcı kur" title="Hatırlatıcı kur — kendine bildirim"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 11.5V7.5a4 4 0 0 1 8 0v4l1 1.5H3zM6.5 14a1.5 1.5 0 0 0 3 0"/></svg></button>
    <button class="dc-x" data-x aria-label="Kapat" title="Kapat (Esc)"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg></button></header>`;
  let body;
  if(!TK.ready)body=`<div class="dc-sk"><i></i><i></i><i></i></div>`;
  else if(mode==='plan'){const tot=open.reduce((a,x)=>a+(x.est||0),0),noEst=open.filter(x=>!x.est).length,lf=left(),over=tot-lf;
    body=(open.length?`<ul class="dc-l">${open.map(x=>row(x)).join('')}</ul>`:`<p class="dc-empty">${done.length?'Bugünlük hepsi bitti. 🎉':'Bugün için görev yok.'}</p>`)
      +`<form class="dc-add" data-add="today"><input placeholder="+ Bugün için görev ekle" aria-label="Bugün için görev ekle" maxlength="200" autocomplete="off"></form>`
      +(open.length?`<p class="dc-sum${over>0?' over':''}">${tot?`Toplam ~${dur(tot)}${noEst?` <span>(${noEst} görevin süresi yok)</span>`:''} · gün sonuna ${dur(lf)}`:'Görevlere süre ver; bugüne sığıp sığmadığını söyleyeyim.'}
        ${over>0?`<b>Bugüne sığmıyor — ${dur(over)} fazla. Birkaçını yarına taşı.</b>`:''}</p>`:'')
      +(done.length?`<button class="dc-dn" data-showdone aria-expanded="${showDone}">${done.length} tamamlandı</button>${showDone?`<ul class="dc-l dc-ok">${done.map(x=>`<li class="dc-t done"><span class="dc-c on" aria-hidden="true"></span><span class="dc-n"><span>${esc(x.title)}</span></span></li>`).join('')}</ul>`:''}`:'')}
  else{body=`<p class="dc-k">Bitirdiklerin · ${done.length}</p>${done.length?`<ul class="dc-l dc-ok">${done.map(x=>`<li class="dc-t done"><span class="dc-c on" aria-hidden="true"></span><span class="dc-n"><span>${esc(x.title)}</span></span></li>`).join('')}</ul>`:'<p class="dc-empty">Bugün henüz bir şey bitmedi.</p>'}
      <p class="dc-k">Kalanlar · ${open.length}</p>${open.length?`<ul class="dc-l">${open.map(x=>row(x,true)).join('')}</ul><button class="dc-all" data-allmove>Hepsini yarına taşı</button>`:'<p class="dc-empty">Kalan iş yok — iyi iş çıkardın.</p>'}
      <form class="dc-add" data-add="tomorrow"><input placeholder="Yarın için tek bir şey…" aria-label="Yarın için görev ekle" maxlength="200" autocomplete="off"></form>`}
  const foot=`<footer class="dc-f"><label>Günüm <select data-end aria-label="Gün sonu saati">${['18:00','19:00','20:00','21:00','22:00','23:00','00:00'].map(v=>`<option${v===c.end?' selected':''}>${v}</option>`).join('')}</select>'de biter</label>
    <button class="dc-off" data-off role="switch" aria-checked="${!c.off}" title="Hub açılınca bu kart gelsin mi?"><i aria-hidden="true"></i>Açılışta göster</button></footer>`;
  const f=document.activeElement,keep=f&&el.contains(f)&&f.matches('input')?{v:f.value,k:f.closest('[data-add]')?.dataset.add}:null;
  el.querySelector('.dc').innerHTML=head+`<div class="dc-b">${body}</div>`+foot;
  if(keep){const i=el.querySelector(`[data-add="${keep.k}"] input`);if(i){i.value=keep.v;i.focus()}}}

/* ── aç / kapat ── */
function open(m){if(el){if(m){mode=m;paint()}return}mode=m||null;el=document.createElement('div');el.className='dc-w';
  el.innerHTML='<section class="dc" role="dialog" aria-labelledby="dcT"></section>';document.body.appendChild(el);paint();
  if(calm())el.classList.add('on');else requestAnimationFrame(()=>requestAnimationFrame(()=>el&&el.classList.add('on')));
  el.addEventListener('click',onClick);el.addEventListener('change',onChange);el.addEventListener('submit',onSubmit);addEventListener('keydown',onKey,true)}
function close(){if(!el)return;const w=el;el=null;removeEventListener('keydown',onKey,true);if(calm())return w.remove();w.classList.remove('on');w.classList.add('out');setTimeout(()=>w.remove(),220)}
function onKey(e){if(e.key==='Escape'&&el&&!document.querySelector('.pal-bg,.sheet-scrim')){e.stopPropagation();close()}}
const task=b=>TK.tasks.get(b.closest('[data-id]')?.dataset.id);
function onClick(e){const b=e.target.closest('button');if(!b)return;
  if(b.matches('[data-x]'))return close();
  if(b.matches('[data-bell]')){window.Notify?.open();return}
  if(b.dataset.mode){mode=b.dataset.mode;return paint()}
  if(b.matches('[data-done]')){const t=task(b);if(!t)return;const li=b.closest('li');li.classList.add('going');setTimeout(()=>{TK.setStatus(t,'done');H()?.toast?.(`✓ ${t.title}`,()=>TK.setStatus(TK.tasks.get(t.id)||t,'todo'))},calm()?0:260);return}
  if(b.matches('[data-tmr]')){const t=task(b);if(!t)return;const prev=t.date;TK.setDate(t,TM());H()?.toast?.(`${t.title} → yarın`,()=>{const r=TK.tasks.get(t.id);if(r){r.date=prev;TK.save(r)}});return}
  if(b.matches('[data-est]')){const t=task(b);if(!t)return;const i=EST.indexOf(t.est||0),n=EST[(i+1)%EST.length];t.est=n;TK.save(t);return}
  if(b.matches('[data-allmove]')){const{open:o}=data();const back=o.map(t=>[t.id,t.date]);o.forEach(t=>TK.setDate(t,TM()));H()?.toast?.(`${o.length} görev yarına taşındı`,()=>back.forEach(([id,d])=>{const r=TK.tasks.get(id);if(r){r.date=d;TK.save(r)}}));return}
  if(b.matches('[data-showdone]')){showDone=!showDone;return paint()}
  if(b.matches('[data-off]')){const off=!cfg().off;setCfg({off});paint();H()?.toast?.(off?'Açılışta gösterilmeyecek — Ctrl+K → “Bugünün görevleri”':'Hub her açıldığında gelecek');return}
  if(b.matches('[data-openT]')){close();H()?.openNotes?.('#tasks');return}}
function onChange(e){if(e.target.matches('[data-end]')){setCfg({end:e.target.value});paint()}}
function onSubmit(e){e.preventDefault();const f=e.target.closest('[data-add]'),i=f?.querySelector('input'),v=i?.value.trim();if(!v)return;
  TK.add({title:v,date:f.dataset.add==='tomorrow'?TM():T(),status:'todo'});i.value='';if(f.dataset.add==='tomorrow')H()?.toast?.(`Yarın: ${v}`);i.focus()}

window.DayCard={start,open,close,get isOpen(){return!!el}};
// hub bu dosya yüklenmeden açıldıysa kendin başla (bulut deposu yoksa yerel)
if(window.HUB?.booted?.())try{start(window.firebase?.apps?.length?firebase.firestore():null)}catch{start(null)}
})();
