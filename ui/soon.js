/* ════════════════════════════════════════════════════════════
   AppShell — “Yaklaşıyor” (Soon)
   Notlar takviminde “Her yıl” ile eklenen günler (doğum günü, yıldönümü…; TM aktivitesi rep:'yearly')
   yaklaşınca (kaydın `warn` günü kadar önce, varsayılan 3) hub açılışında bir kez tam ekran kart gösterir,
   ardından bildirim kurar (ui/notify.js: ekran açıkken adada, kapalıyken tarayıcı + ntfy telefon).
   Veri: bulut hub/time/acts (rep=='yearly') ya da yerel time:v1 → önbellek appshell:yearly.
   Günde bir kez: appshell:soonSeen = 'YYYY-AA-GG|kimlikler'. Kurulan bildirimler appshell:soonRem (çift olmasın).
   Ctrl+K “Yaklaşan özel günler” → Soon.open(true).
   ════════════════════════════════════════════════════════════ */
(()=>{
const MO=['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const get=(k,d)=>{try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch{return d}};
const set=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
const ymd=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const leap=y=>y%4===0&&(y%100!==0||y%400===0);
const reduce=()=>matchMedia('(prefers-reduced-motion: reduce)').matches||document.documentElement.dataset.motion==='off';
const H=()=>window.HUB;
let el=null,started=false,items=[];

const slim=a=>({id:String(a.id),title:String(a.title||'').slice(0,80),date:String(a.date||''),kind:a.kind==='bday'?'bday':'',byear:+a.byear||0,warn:a.warn==null?3:Math.max(0,Math.min(30,+a.warn||0))});
function next(a){const m=+a.date.slice(5,7)-1,d=+a.date.slice(8,10),t=new Date();t.setHours(0,0,0,0);
  for(const y of[t.getFullYear(),t.getFullYear()+1]){const x=new Date(y,m,m===1&&d===29&&!leap(y)?28:d);if(x>=t)return{x,n:Math.round((x-t)/864e5)}}}
function compute(list,all){return list.filter(a=>/^\d{4}-\d{2}-\d{2}$/.test(a.date)).map(a=>({a,...next(a)})).filter(o=>all?o.n<=30:o.n<=Math.max(0,a0(o.a))).sort((p,q)=>p.n-q.n)}
const a0=a=>a.warn==null?3:a.warn;
const when=n=>n===0?'Bugün':n===1?'Yarın':`${n} gün sonra`;
const ageOf=(a,x)=>a.byear&&x.getFullYear()>a.byear?x.getFullYear()-a.byear:0;
const subOf=(a,x)=>{const g=ageOf(a,x);return[`${x.getDate()} ${MO[x.getMonth()]} ${x.toLocaleDateString('tr-TR',{weekday:'long'})}`,g?(a.kind==='bday'?`${g} yaşına giriyor`:`${g}. yıl`):'',].filter(Boolean).join(' · ')};
const what=a=>a.kind==='bday'?'doğum günü':'özel gün';

/* ── veri ── */
function local(){const t=get('time:v1',null);return t&&Array.isArray(t.acts)?t.acts.filter(a=>a.rep==='yearly'||a.kind==='bday').map(slim):null}
async function cloud(fs){try{const q=await fs.collection('hub').doc('time').collection('acts').where('rep','==','yearly').get();return q.docs.map(d=>slim({id:d.id,...d.data()}))}catch(e){console.warn('soon: bulut',e);return null}}

/* ── bildirimler: hatırlatma günü ve günün kendisi 09:00 (geçmişte kalan kurulmaz) ── */
function schedule(list){const N=window.Notify;if(!N?.add)return;const done=get('appshell:soonRem',{}),now=Date.now();let ch=false;
  for(const o of compute(list,true)){const{a,x,n}=o,w=a0(a),em=a.kind==='bday'?'🎂':'⭐',g=ageOf(a,x);
    const plan=[[n<=w?null:new Date(x.getFullYear(),x.getMonth(),x.getDate()-w,9),`${em} ${a.title} — ${what(a)} ${when(w).toLocaleLowerCase('tr')} (${x.getDate()} ${MO[x.getMonth()]})`,'w'],
      [new Date(x.getFullYear(),x.getMonth(),x.getDate(),9),`${em} Bugün ${a.title} — ${what(a)}${g?(a.kind==='bday'?` · ${g} yaşına giriyor`:` · ${g}. yıl`):''}`,'d']];
    for(const[at,text,k]of plan){if(!at)continue;const key=`${a.id}:${ymd(x)}:${k}`;if(done[key])continue;
      if(at.getTime()<now){if(k==='d'&&n===0&&new Date().getHours()<22){N.add(text,now+90e3);done[key]=now;ch=true}continue} // bugünse ve sabah kaçtıysa ekrandan kısa süre sonra bir bildirim
      N.add(text,at.getTime());done[key]=now;ch=true}}
  if(ch){for(const k in done)if(now-done[k]>400*864e5)delete done[k];set('appshell:soonRem',done)}}

/* ── ekran ── */
function tile(x,n){return`<div class="sn-tile${n===0?' today':''}"><small>${MO[x.getMonth()].slice(0,3)}</small><b>${x.getDate()}</b></div>`}
function html(L,all){if(!L.length)return`<div class="sn" role="dialog" aria-modal="true" aria-label="Yaklaşan özel günler"><p class="sn-k">Önümüzdeki 30 gün</p><h2 class="sn-t">Yaklaşan özel gün yok</h2>
    <p class="sn-s">Doğum günü ya da yıldönümü eklemek için Notlar → Takvim → <b>Her yıl</b>.</p><div class="sn-f"><button class="sn-b" data-sn="cal">Takvimi aç</button><button class="sn-b pri" data-sn="ok">Tamam</button></div></div>`;
  const[f,...rest]=L,em=f.a.kind==='bday'?'🎂':'⭐';
  return`<div class="sn" role="dialog" aria-modal="true" aria-label="Yaklaşıyor">${tile(f.x,f.n)}<p class="sn-k">${em} ${when(f.n)}</p><h2 class="sn-t">${esc(f.a.title)}</h2><p class="sn-s">${esc(what(f.a)[0].toLocaleUpperCase('tr')+what(f.a).slice(1))} · ${esc(subOf(f.a,f.x))}</p>
    ${rest.length?`<div class="sn-l">${rest.map(o=>`<div class="sn-r"><span>${o.a.kind==='bday'?'🎂':'⭐'}</span><b>${esc(o.a.title)}</b><small>${when(o.n)} · ${o.x.getDate()} ${MO[o.x.getMonth()].slice(0,3)}</small></div>`).join('')}</div>`:''}
    <p class="sn-h">${all?'Yaklaşınca bildirim de gelir.':'Günü gelince bildirim de gönderilecek.'}</p>
    <div class="sn-f"><button class="sn-b" data-sn="cal">Takvimde gör</button><button class="sn-b pri" data-sn="ok" autofocus>Tamam</button></div></div>`}
function open(all){if(el)return;const L=all?compute(cache(),true):items;if(!all&&!L.length)return;
  el=document.createElement('div');el.className='sn-bg';el.innerHTML=html(L,all);document.body.appendChild(el);
  const c=el.querySelector('.sn');setTimeout(()=>el?.querySelector('[data-sn=ok]')?.focus({focusVisible:false}),60);
  if(!reduce()){el.animate([{opacity:0},{opacity:1}],{duration:260,easing:'ease-out'});
    c.animate([{opacity:0,transform:'translateY(24px) scale(.94)',filter:'blur(6px)'},{opacity:1,transform:'none',filter:'blur(0)'}],{duration:620,easing:'cubic-bezier(.3,1.3,.5,1)'});
    const t=c.querySelector('.sn-tile');t&&t.animate([{transform:'scale(.4) rotate(-12deg)',opacity:0},{transform:'none',opacity:1}],{duration:700,delay:120,easing:'cubic-bezier(.3,1.5,.5,1)',fill:'backwards'});
    c.querySelectorAll('.sn-r').forEach((r,i)=>r.animate([{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'none'}],{duration:380,delay:260+i*60,easing:'cubic-bezier(.16,1,.3,1)',fill:'backwards'}))}
  el.addEventListener('click',e=>{const b=e.target.closest('[data-sn]');if(e.target===el||b?.dataset.sn==='ok')return close();if(b?.dataset.sn==='cal'){close();H()?.openNotes?.('#cal')}});
  el.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();close()}})}
function close(){if(!el)return;const e=el;el=null;if(reduce())return e.remove();
  e.animate([{opacity:1},{opacity:0}],{duration:200,easing:'ease-in'}).onfinish=()=>e.remove();e.querySelector('.sn')?.animate([{transform:'none'},{transform:'translateY(12px) scale(.97)'}],{duration:200,easing:'ease-in',fill:'forwards'})}

const cache=()=>get('appshell:yearly',[]);
function run(list){set('appshell:yearly',list);items=compute(list);schedule(list);if(!items.length)return;
  const key=ymd(new Date())+'|'+items.map(o=>o.a.id).join(',');if(get('appshell:soonSeen','')===key)return;
  let tries=0;const go=()=>{if(el)return;
    if(document.hidden||document.querySelector('.tr-bg,.cc-bg,.pal-bg,.sheet-scrim,.ox-bg,.wp-bg')){if(++tries<120)setTimeout(go,1000);return} // başlangıç rehberi / başka panel açıkken bekle
    set('appshell:soonSeen',key);open(false)};
  setTimeout(go,reduce()?300:1800)} // açılış animasyonu bitsin
async function start(fs){if(started)return;started=true; // girişliyken bulut asıl kaynak (yerel time:v1 eski kalmış olabilir); bağlanamazsa son önbellek
  if(fs){const c=await cloud(fs);run(c||cache())}else run(local()||cache())}
window.Soon={start,open,close,get isOpen(){return!!el}};
})();
