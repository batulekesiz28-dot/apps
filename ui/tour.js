/* Başlangıç rehberi — yeni giren biri için (iOS “Hoş geldin” + uygulama içi ipucu turu gibi).
   Hoş geldin kartı → ekranın önemli yerleri sırayla ışıkla gösterilir (spot ışığı = hedefin çevresi açık, gerisi karartılmış) → kısayollar özeti.
   Hedef ekranda yoksa (ör. arayüz dünyasında galaksi gezegeni yok) kart ortada açıklama olarak çıkar. ← → / Enter / Esc, dokunmatikte İleri/Geri.
   İlk açılışta kendiliğinden (sadece gerçekten yeni kullanıcıda: daha önce hub kullanılmamışsa); her zaman Ctrl+K “Başlangıç rehberi”. Kayıt: appshell:tour. */
(()=>{'use strict';
const H=()=>window.HUB,$=s=>document.querySelector(s);
const off=()=>document.documentElement.dataset.motion==='off'||matchMedia('(prefers-reduced-motion: reduce)').matches;
const anim=(el,kf,o)=>(!el||off())?{finished:Promise.resolve()}:el.animate(kf,o);
const vis=el=>{if(!el)return null;const r=el.getBoundingClientRect(),cs=getComputedStyle(el);return r.width>4&&r.height>4&&cs.visibility!=='hidden'&&cs.display!=='none'&&r.bottom>0&&r.top<innerHeight?r:null};
const MAC=/Mac|iPhone|iPad/.test(navigator.platform),K=MAC?'⌘':'Ctrl',TOUCH=matchMedia('(pointer:coarse)').matches;
const STEPS=[
  {t:'Uygulamaların gezegenler',d:TOUCH?'Bir gezegene dokun, uygulama açılır. Basılı tutup sürükleyerek yerini değiştirebilirsin.':'Bir gezegene tıkla, uygulama açılır. Sürükleyerek yerini değiştir, sağ tıkla kümelere ayır. Boş yeri sürükleyince uzayda gezersin.',el:()=>[...document.querySelectorAll('#nodes .node')].find(n=>vis(n))||document.querySelector('.wx-nav,.sp-orn')},
  {t:'Her şeyi ara',d:`${K}+K ile açılır: uygulama, not, kitap, film, komut… Yazmaya başla, Enter'a bas.`,el:()=>$('#searchBtn')||document.querySelector('[data-act=search]')},
  {t:'Canlı ada',d:'Çalan şarkı, sayaçlar, hatırlatıcılar burada canlı durur. Dokun: ilgili uygulama açılır. Aşağı çek: Kontrol merkezi.',el:()=>$('#focusBar'),pad:10},
  {t:'Kontrol merkezi',d:`Rahatsız etme, karanlık tema, gece ışığı, odak modları, ekran süresi… ${TOUCH?'Ekranın en üstünden aşağı kaydır':'Alt+A'} ya da adayı aşağı çek.`,el:null,act:()=>window.OS?.open(),undo:()=>window.OS?.close()},
  {t:'Arayüzünü seç',d:'Galaksi tek seçenek değil: 10 farklı masaüstü var (Mekânsal, Mıknatıs, Kadran…). Zar düğmesiyle her girişte rastgele.',el:()=>$('#worldBtn')},
  {t:'Tema ve renkler',d:'Hazır temalar, kendi renklerin ya da iki temayı karıştır. Seçtiğin görünüm bütün uygulamalara geçer.',el:()=>$('#themeBtn')},
  {t:'Kenar paneli',d:'Sağ kenardaki ince çizgi: açık uygulamalar, en çok kullandıkların ve hızlı araçlar (Alt+E).',el:()=>$('#oxEdge'),pad:6},
];
const END=[[K+'+K','Ara / komut'],['Alt+A','Kontrol merkezi'],['Shift+Tab','Uygulama değiştir'],['Alt+V','Pano geçmişi'],['Alt+E','Kenar paneli'],['Esc','Geri / kapat']];
let el=null,i=-1;
function card(){return el.querySelector('.tr-card')}
const HOLE=`<svg class="tr-dim" aria-hidden="true"><defs><mask id="trM"><rect width="100%" height="100%" fill="#fff"/><rect class="tr-mr" fill="#000"/></mask></defs><rect width="100%" height="100%" mask="url(#trM)"/></svg><div class="tr-hole"></div>`;
function hole(l,t,w,h,r,none){const m=el.querySelector('.tr-mr'),g=el.querySelector('.tr-hole');if(!m)return;Object.assign(m.style,{x:l+'px',y:t+'px',width:w+'px',height:h+'px',rx:r+'px'});
  Object.assign(g.style,{left:l+'px',top:t+'px',width:w+'px',height:h+'px',borderRadius:r+'px'});g.classList.toggle('none',!!none)}
function welcome(){el.innerHTML=HOLE+`<section class="tr-card tr-w" role="dialog" aria-modal="true" aria-label="Hoş geldin">
  <div class="tr-logo" aria-hidden="true"><i></i><i></i><i></i><i></i></div><h2>Hoş geldin</h2><p>Burası senin kişisel işletim sistemin: notların, çalışma sayacın, kütüphanen, filmlerin ve daha fazlası tek ekranda.</p>
  <p class="tr-s">Bir dakikalık turla önemli yerleri göstereyim mi?</p><div class="tr-a"><button class="tr-b2" data-tr="skip">Şimdi değil</button><button class="tr-b" data-tr="next">Başla</button></div></section>`;
  hole(innerWidth/2,innerHeight/2,0,0,0,true);anim(card(),[{opacity:0,scale:'.92',translate:'0 16px'},{opacity:1,scale:'1',translate:'0 0'}],{duration:520,easing:'cubic-bezier(.3,1.25,.5,1)'});card().querySelector('[data-tr=next]').focus()}
function show(n){const prev=STEPS[i];prev?.undo?.();i=n;if(i>=STEPS.length)return final();const S=STEPS[i];S.act?.();
  setTimeout(()=>{if(!el)return;const t=S.el?.(),r=vis(t),pad=S.pad??8;
    el.querySelector('.tr-card')?.remove();const c=document.createElement('section');c.className='tr-card';c.setAttribute('role','dialog');c.setAttribute('aria-modal','true');c.setAttribute('aria-label',S.t);
    c.innerHTML=`<p class="tr-n">${i+1} / ${STEPS.length}</p><h3>${S.t}</h3><p>${S.d}</p><div class="tr-a"><span class="tr-dots" aria-hidden="true">${STEPS.map((_,j)=>`<i class="${j===i?'on':''}"></i>`).join('')}</span>
      ${i?'<button class="tr-b2" data-tr="prev">Geri</button>':'<button class="tr-b2" data-tr="skip">Atla</button>'}<button class="tr-b" data-tr="next">${i===STEPS.length-1?'Bitir':'İleri'}</button></div>`;el.appendChild(c);
    const hr=r?{l:r.left-pad,t:r.top-pad,w:r.width+pad*2,h:r.height+pad*2,rad:Math.min(28,Math.min(r.width,r.height)/2+pad)}:{l:innerWidth/2,t:innerHeight/2,w:0,h:0,rad:0};
    hole(hr.l,hr.t,hr.w,hr.h,hr.rad,!r||S.act);
    // kart: hedefin altına (sığmazsa üstüne), yoksa ortaya; ekrandan taşmaz
    const cw=Math.min(340,innerWidth-24),ch=c.offsetHeight;let x,y;
    if(r&&!S.act){x=Math.min(innerWidth-cw-12,Math.max(12,r.left+r.width/2-cw/2));y=r.bottom+pad+14;if(y+ch>innerHeight-12)y=Math.max(12,r.top-pad-14-ch)}else{x=(innerWidth-cw)/2;y=S.act?Math.min(innerHeight-ch-20,innerHeight*.62):(innerHeight-ch)/2}
    Object.assign(c.style,{left:x+'px',top:y+'px',width:cw+'px'});anim(c,[{opacity:0,translate:'0 10px',scale:'.97'},{opacity:1,translate:'0 0',scale:'1'}],{duration:380,easing:'cubic-bezier(.3,1.2,.5,1)'});
    c.querySelector('[data-tr=next]').focus({preventScroll:true})},S.act?380:0)}
function final(){STEPS[STEPS.length-1]?.undo?.();hole(innerWidth/2,innerHeight/2,0,0,0,true);
  el.querySelector('.tr-card')?.remove();const c=document.createElement('section');c.className='tr-card tr-w';c.setAttribute('role','dialog');c.setAttribute('aria-modal','true');c.setAttribute('aria-label','Hazırsın');
  c.innerHTML=`<h2>Hazırsın</h2><p>Bu kısayolları bilmen yeter:</p><ul class="tr-k">${END.map(([k,d])=>`<li><kbd>${k}</kbd><span>${d}</span></li>`).join('')}</ul><p class="tr-s">Rehbere istediğin zaman ${K}+K → “Başlangıç rehberi” ile dönebilirsin.</p><div class="tr-a"><button class="tr-b" data-tr="done">Başlayalım</button></div>`;
  el.appendChild(c);anim(c,[{opacity:0,scale:'.94'},{opacity:1,scale:'1'}],{duration:460,easing:'cubic-bezier(.3,1.25,.5,1)'});c.querySelector('[data-tr=done]').focus()}
function close(){if(!el)return;STEPS[i]?.undo?.();try{localStorage.setItem('appshell:tour',JSON.stringify({done:Date.now()}))}catch{}const w=el;el=null;i=-1;removeEventListener('keydown',key,true);removeEventListener('resize',rs);
  anim(w,[{opacity:1},{opacity:0}],{duration:220}).finished.then(()=>w.remove())}
const rs=()=>{if(el&&i>=0&&i<STEPS.length)show(i)};
function key(e){if(!el)return;if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close()}else if(e.key==='ArrowRight'||(e.key==='Enter'&&!e.target.closest('button'))){e.preventDefault();e.stopPropagation();show(i+1)}else if(e.key==='ArrowLeft'&&i>0){e.preventDefault();e.stopPropagation();show(i-1)}}
function start(){if(el)return;window.OS?.close?.();el=document.createElement('div');el.className='tr-bg';document.body.appendChild(el);anim(el,[{opacity:0},{opacity:1}],{duration:300});
  el.addEventListener('click',e=>{const b=e.target.closest('[data-tr]')?.dataset.tr;if(!b)return;if(b==='next')show(i+1);else if(b==='prev')show(i-1);else close()});
  addEventListener('keydown',key,true);addEventListener('resize',rs);welcome()}
// gerçekten yeni mi: hub daha önce kullanıldıysa (düzen, son kullanılanlar, kullanım süresi…) kendiliğinden açılmaz
function isNew(){try{if(localStorage.getItem('appshell:tour'))return false;return!['appshell:palrec','appshell:layouts','appshell:usage','appshell:notifs','appshell:world','notlar:v1','appshell:look'].some(k=>localStorage.getItem(k))}catch{return false}}
function auto(){if(!isNew())return;const go=()=>{if(H()?.booted?.()&&!document.querySelector('.gate:not([hidden]),#gate:not([hidden])'))setTimeout(start,1600);else setTimeout(go,500)};go()}
window.Tour={start,close,isOpen:()=>!!el};
if(document.readyState==='loading')addEventListener('DOMContentLoaded',auto);else auto();
})();
