/* Kontrol merkezi (Samsung hızlı panel + iOS Denetim Merkezi + Windows bildirim merkezi)
   Açma: üstteki adayı aşağı çek · Alt+A · Ctrl+K “Kontrol merkezi”. Kapat: dışarı tıkla, Esc, yukarı kaydır.
   İçerik: saat/tarih + pil + bağlantı · 8 hızlı ayar · çalan şarkı · bildirim geçmişi (appshell:notifs, islAlert yazar).
   Rahatsız etme appshell:dnd (+ appshell:dndAt) — açıkken islAlert inmez, sadece buraya düşer. */
(()=>{'use strict';
const H=()=>window.HUB,$=(s,r=document)=>r.querySelector(s);
const get=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k));return v??d}catch{return d}},set=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const calm=()=>document.documentElement.dataset.motion==='off'||matchMedia('(prefers-reduced-motion: reduce)').matches;
const ago=t=>{const m=Math.round((Date.now()-t)/6e4);return m<1?'şimdi':m<60?m+' dk':m<1440?Math.round(m/60)+' sa':Math.round(m/1440)+' g'};
const I={dnd:'<path d="M13.5 9.8A5.5 5.5 0 1 1 6.2 2.5a4.5 4.5 0 0 0 7.3 7.3z"/>',dark:'<circle cx="8" cy="8" r="5.5"/><path d="M8 2.5v11a5.5 5.5 0 0 0 0-11z" fill="currentColor"/>',
  calm:'<path d="M2.5 9.5c1.5-1.5 3-1.5 4.5 0s3 1.5 4.5 0M2.5 6c1.5-1.5 3-1.5 4.5 0s3 1.5 4.5 0"/>',motion:'<path d="M3 11c2-6 4-6 5-3s3 3 5-3"/>',
  lite:'<path d="M9 1.5L4 9h4l-1 5.5L12 7H8z"/>',mini:'<rect x="2" y="3" width="12" height="10" rx="1.5"/><rect x="8" y="8" width="4" height="3" rx=".6" fill="currentColor" stroke="none"/>',
  phone:'<rect x="4.5" y="1.5" width="7" height="13" rx="1.8"/><path d="M7 12.5h2"/>',fs:'<path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10"/>'};
const dnd=v=>{if(v==null)return !!get('appshell:dnd',false);set('appshell:dnd',!!v);if(v)set('appshell:dndAt',Date.now());H()?.island?.();if(el)paint();
  H()?.toast?.(v?'Rahatsız etme açık — bildirimler sessizce burada birikir':'Rahatsız etme kapandı')};
function tiles(){const h=H();if(!h)return[];const ph=window.Notify?.hasTopic?.();
  return[
    {k:'dnd',l:'Rahatsız etme',on:dnd(),s:dnd()?'açık':'kapalı',run:()=>dnd(!dnd())},
    {k:'dark',l:'Karanlık',on:h.dark(),s:h.dark()?'açık':'kapalı',run:()=>{const cur=h.theme();if(h.dark()){set('appshell:lastDark',cur);h.setTheme(get('appshell:lastLight','light'))}else{set('appshell:lastLight',cur);h.setTheme(get('appshell:lastDark','dark'))}}},
    {k:'calm',l:'Sakin mod',on:h.calmOn(),s:h.calmOn()?'açık':'kapalı',run:()=>{h.calm(!h.calmOn());close()}},
    {k:'motion',l:'Animasyon',on:h.motion()!=='off',s:{full:'tam',reduced:'sade',off:'kapalı'}[h.motion()]||'',run:()=>h.motion(h.motion()==='off'?'full':'off')},
    {k:'lite',l:'Hafif mod',on:h.tier()===2&&localStorage.getItem('appshell:perf')==='fixed',s:'pil dostu',run:function(){if(this.on){localStorage.removeItem('appshell:perf');h.setTier(0)}else{localStorage.setItem('appshell:perf','fixed');h.setTier(2)}}},
    {k:'mini',l:'Mini pencere',on:!!h.flo(),s:'müzikte otomatik',run:()=>h.flo(!h.flo())},
    {k:'phone',l:'Telefon',on:!!window.Notify?.pc?.(),s:ph?'mesajlar burada':'bağla…',run:()=>{if(!ph){close();window.Notify?.open();return}window.Notify.pc(!window.Notify.pc())}},
    ...(document.fullscreenEnabled?[{k:'fs',l:'Tam ekran',on:!!document.fullscreenElement,s:'F',run:()=>h.fs()}]:[])]}
let el=null,bat=null,T=[];
try{navigator.getBattery?.().then(b=>{bat=b;const u=()=>el&&paintHead();b.addEventListener('levelchange',u);b.addEventListener('chargingchange',u)})}catch{}
function head(){const d=new Date(),hm=d.toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'}),dt=d.toLocaleDateString('tr-TR',{weekday:'long',day:'numeric',month:'long'});
  const b=bat?`<span class="cc-bat${bat.charging?' ch':''}" title="Pil ${Math.round(bat.level*100)}%${bat.charging?' · şarj oluyor':''}"><i style="--l:${bat.level.toFixed(2)}"></i>${Math.round(bat.level*100)}%</span>`:'';
  const n=navigator.onLine?'<span class="cc-net" title="Çevrimiçi"><svg viewBox="0 0 16 16"><path d="M1.5 6a9.5 9.5 0 0 1 13 0M4 8.8a6 6 0 0 1 8 0M6.4 11.4a2.6 2.6 0 0 1 3.2 0"/><circle cx="8" cy="13.4" r=".9" fill="currentColor" stroke="none"/></svg></span>':'<span class="cc-net off" title="Çevrimdışı">çevrimdışı</span>';
  return `<div class="cc-tm"><b class="num">${hm}</b><span>${esc(dt)}</span></div><div class="cc-st">${b}${n}</div>`}
function paintHead(){const h=el?.querySelector('.cc-h');if(h)h.innerHTML=head()}
function media(){const np=H()?.np?.();if(!np||!np.t)return'';const P='<svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z"/></svg>',Z='<svg viewBox="0 0 24 24"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg>';
  return `<div class="cc-m"><button class="cc-ma" data-cc="np-open" aria-label="Çalan uygulamayı aç">${np.img?`<img src="${esc(np.img)}" alt="" referrerpolicy="no-referrer">`:'<i>♪</i>'}</button><div class="cc-mt"><b>${esc(np.t)}</b><small>${esc(np.a||'')}</small></div>
    <div class="cc-mc"><button data-cc="np-prev" aria-label="Önceki"><svg viewBox="0 0 24 24"><path d="M7 6h2v12H7zM10.5 12L19 6v12z"/></svg></button><button data-cc="np-toggle" class="pp" aria-label="${np.on?'Duraklat':'Oynat'}">${np.on?Z:P}</button><button data-cc="np-next" aria-label="Sonraki"><svg viewBox="0 0 24 24"><path d="M15 6h2v12h-2zM13.5 12L5 18V6z"/></svg></button></div></div>`}
function notifs(){const l=get('appshell:notifs',[]);
  return `<div class="cc-nh"><b>Bildirimler</b>${l.length?'<button data-cc="clear">Tümünü temizle</button>':''}</div>`+(l.length?`<ul class="cc-nl">${l.map((n,i)=>`<li><span class="cc-ni" aria-hidden="true">${n.img?`<img src="${esc(n.img)}" alt="">`:esc(n.ic)}</span><span class="cc-nt"><b>${esc(n.t)}</b>${n.sub?`<small>${esc(n.sub)}</small>`:''}</span><time>${ago(n.at)}</time><button data-del="${i}" aria-label="Bildirimi sil" title="Sil">×</button></li>`).join('')}</ul>`
    :'<p class="cc-e">Bildirim yok. Hatırlatıcılar, görevler, odak sayacı ve telefondan gelen mesajlar burada birikir.</p>')}
function paint(){if(!el)return;T=tiles();
  el.querySelector('.cc').innerHTML=`<header class="cc-h">${head()}</header>
    <div class="cc-g" role="group" aria-label="Hızlı ayarlar">${T.map((t,i)=>`<button class="cc-t${t.on?' on':''}" data-t="${i}" aria-pressed="${t.on}"><i><svg viewBox="0 0 16 16">${I[t.k]}</svg></i><span>${esc(t.l)}</span><small>${esc(t.s)}</small></button>`).join('')}</div>
    ${media()}<div class="cc-n">${notifs()}</div><div class="cc-grip" aria-hidden="true"></div>`}
function open(){if(el)return;set('appshell:ccSeen',Date.now());setTimeout(()=>H()?.island?.(),0);el=document.createElement('div');el.className='cc-bg';el.innerHTML='<section class="cc" role="dialog" aria-modal="true" aria-label="Kontrol merkezi"></section>';document.body.appendChild(el);paint();
  if(!calm())requestAnimationFrame(()=>el?.classList.add('on'));else el.classList.add('on');
  el.addEventListener('click',onClick);addEventListener('keydown',onKey,true);
  let sy=null;el.addEventListener('pointerdown',e=>{if(!e.target.closest('button,a,li'))sy=e.clientY});el.addEventListener('pointerup',e=>{if(sy!=null&&sy-e.clientY>40)close();sy=null});
  el.querySelector('.cc-t')?.focus({preventScroll:true});clk=setInterval(paintHead,15000)}
let clk=0;
function close(){if(!el)return;const w=el;el=null;clearInterval(clk);removeEventListener('keydown',onKey,true);
  if(calm()){w.remove();return}w.classList.remove('on');w.classList.add('out');setTimeout(()=>w.remove(),260)}
function onKey(e){if(e.key==='Escape'){e.stopPropagation();close()}}
function onClick(e){if(e.target===el)return close();const t=e.target.closest('[data-t]');if(t){T[+t.dataset.t]?.run();paint();return}
  const d=e.target.closest('[data-del]');if(d){const l=get('appshell:notifs',[]);l.splice(+d.dataset.del,1);set('appshell:notifs',l);paint();return}
  const c=e.target.closest('[data-cc]')?.dataset.cc;if(!c)return;
  if(c==='clear'){set('appshell:notifs',[]);paint();H()?.island?.()}
  else if(c==='np-open'){close();H()?.openNp?.()}
  else if(c.startsWith('np-')){H()?.npCmd?.(c.slice(3));setTimeout(paint,400)}}
// dokunmatik: ana ekranda en üst kenardan aşağı kaydır (Samsung/iOS gibi)
{let y0=null;addEventListener('touchstart',e=>{const t=e.touches[0];const w=document.getElementById('win'),app=w&&!w.hidden&&w.style.visibility!=='hidden';y0=(t&&t.clientY<28&&!app&&!el)?t.clientY:null},{passive:true});
  addEventListener('touchmove',e=>{if(y0==null)return;const t=e.touches[0];if(t.clientY-y0>60){y0=null;open()}},{passive:true});addEventListener('touchend',()=>{y0=null},{passive:true})}
window.OS={open,close,toggle:()=>el?close():open(),paint,dnd,notified:()=>{if(el)paint()}};
})();
