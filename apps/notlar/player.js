/* Ortak video oynatıcı VP — Notlar'daki bütün videolar (bağlantı önizlemesi, bağlantı kartı, Kütüphane, Medya mini oynatıcı).
   - YouTube: controls=0 + IFrame API mesajları (infoDelivery/onStateChange); iframe tıklanamaz → YouTube'un kendi düğmeleri, başlığı,
     “diğer videolar” ekranı hiç görünmez. Duraklayınca/bitince kapak + büyük oynat düğmesi üstünü örter.
   - <video>: aynı denetimler, tarayıcının kendi düğmeleri yok.
   - Denetimler (oynat/duraklat, 10 sn geri/ileri, çubuk, süre, ses, tam ekran) SADECE imleç üstündeyken; imleç çıkınca anında kaybolur.
     Dokunmatikte dokununca 3 sn görünür. Klavye (imleç üstündeyken ya da odaktayken): Boşluk/K oynat-duraklat, ← → 5 sn, J/L 10 sn, M ses, F tam ekran.
   VP.make({yt|src, title, start, autoplay, muted, loop, cover, onPop}) → {el, play, pause, toggle, seek, seekTo, off}
   VP.html(o) → yer tutucu (<div data-vp='…'>); VP.scan(kök) yer tutucuları oynatıcıya çevirir. Yükleme anında Notlar global'lerine dokunmaz. */
const VP=(()=>{
  const S=p=>`<svg viewBox="0 0 16 16" aria-hidden="true">${p}</svg>`;
  const IC={play:S('<path d="M5 3.1v9.8L13.2 8z" fill="currentColor" stroke="none"/>'),pause:S('<path d="M4.4 3h2.5v10H4.4zM9.1 3h2.5v10H9.1z" fill="currentColor" stroke="none"/>'),
    rw:S('<path d="M8 4 4 8l4 4M12.5 4l-4 4 4 4"/>'),ff:S('<path d="M8 4l4 4-4 4M3.5 4l4 4-4 4"/>'),
    vol0:S('<path d="M3 6.2h2.4L8.8 3.5v9L5.4 9.8H3z"/><path d="m11 6.3 3.2 3.4M14.2 6.3 11 9.7"/>'),vol1:S('<path d="M3 6.2h2.4L8.8 3.5v9L5.4 9.8H3z"/><path d="M11 5.6a3.4 3.4 0 0 1 0 4.8M12.8 4a5.6 5.6 0 0 1 0 8"/>'),volL:S('<path d="M3 6.2h2.4L8.8 3.5v9L5.4 9.8H3z"/><path d="M11 5.6a3.4 3.4 0 0 1 0 4.8"/>'),
    full:S('<path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10"/>'),pop:S('<rect x="2.5" y="3.5" width="11" height="9" rx="2"/><rect x="8" y="8" width="4" height="3" rx=".8" fill="currentColor" stroke="none"/>')};
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=s=>{s=Math.max(0,Math.floor(s||0));const h=Math.floor(s/3600),m=Math.floor(s%3600/60),r=String(s%60).padStart(2,'0');return h?`${h}:${String(m).padStart(2,'0')}:${r}`:`${m}:${r}`};
  const ytId=u=>(String(u||'').match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/|v\/))([\w-]{11})/)||[])[1]||'';
  const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches||document.documentElement.dataset.motion==='off';
  // ses seviyesi: bütün videolarda ortak, hatırlanır (notlar:vol, 0–100)
  const vol=()=>{try{const v=localStorage.getItem('notlar:vol');return v==null?80:Math.max(0,Math.min(100,+v||0))}catch{return 80}};
  const setVol=v=>{try{localStorage.setItem('notlar:vol',String(Math.round(v)))}catch{}};
  const volIcon=(m,v)=>m||v<=0?IC.vol0:v<50?IC.volL:IC.vol1;
  const L=new Set();let tick=0;
  // tek mesaj dinleyicisi + tek zamanlayıcı (oynarken süreyi tahmin eder, sayfadan çıkan oynatıcıları temizler)
  addEventListener('message',e=>{for(const p of L)if(p.fr.contentWindow&&e.source===p.fr.contentWindow){p.msg(e.data);break}});
  const run=()=>{if(tick)return;tick=setInterval(()=>{for(const p of L){if(!p.el.isConnected){p.off();continue}p.est()}if(!L.size){clearInterval(tick);tick=0}},250)};
  // klavye: imleç üstündeki ya da odaktaki oynatıcı (yazı alanındayken değil)
  addEventListener('keydown',e=>{if(e.defaultPrevented||e.metaKey||e.ctrlKey||e.altKey)return;const t=e.target;if(t.closest?.('input,textarea,select,[contenteditable="true"]')&&!t.closest?.('.vp'))return;
    let p=null;for(const x of L)if(x.el.contains(document.activeElement)||x.el.matches(':hover'))p=x;if(!p)return;
    const k=e.key.length===1?e.key.toLowerCase():e.key,f={' ':()=>p.toggle(),k:()=>p.toggle(),ArrowLeft:()=>p.seek(-5),ArrowRight:()=>p.seek(5),ArrowUp:()=>p.setVol(p.vol+10),ArrowDown:()=>p.setVol(p.vol-10),j:()=>p.seek(-10),l:()=>p.seek(10),m:()=>p.mute(),f:()=>p.full()}[k];
    if(!f||(t.closest?.('.vp-bar,.vp-vs')&&k.startsWith('Arrow')))return;e.preventDefault();f();p.flash()});

  function make(o={}){const yt=o.yt||ytId(o.src),src=yt?'':o.src||'',start=Math.max(0,Math.floor(+o.start||0)),auto=o.autoplay!==false;
    const el=document.createElement('div');el.className='vp idle'+(yt?' yt':'');el.tabIndex=0;el.setAttribute('role','group');el.setAttribute('aria-label',(o.title||'Video')+' — oynatıcı');
    const cover=o.cover||(yt?`https://i.ytimg.com/vi/${yt}/hqdefault.jpg`:'');
    el.innerHTML=`<i class="vp-cv"${cover?` style="background-image:url('${esc(cover)}')"`:''}></i>
      <button type="button" class="vp-big" data-vp="tog" aria-label="Oynat" title="Oynat (Boşluk)">${IC.play}</button>
      <div class="vp-ui">
        <button type="button" data-vp="tog" class="vp-pp" aria-label="Oynat" title="Oynat / duraklat (Boşluk)">${IC.play}</button>
        <button type="button" data-vp="-10" aria-label="10 saniye geri" title="10 sn geri (←)">${IC.rw}</button>
        <span class="vp-bar" role="slider" tabindex="0" aria-label="Videoda konum" aria-valuemin="0" aria-valuemax="0" aria-valuenow="0"><i></i></span>
        <button type="button" data-vp="10" aria-label="10 saniye ileri" title="10 sn ileri (→)">${IC.ff}</button>
        <time>${fmt(start)}</time>
        <span class="vp-vol"><button type="button" data-vp="mute" aria-label="Sesi kapat" title="Ses (M) · seviye ↑ ↓">${IC.vol1}</button><span class="vp-vs" role="slider" tabindex="0" aria-label="Ses seviyesi" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i></i></span></span>
        ${o.onPop?`<button type="button" data-vp="pop" aria-label="Ayrı pencerede oynat" title="Ayrı pencerede oynat">${IC.pop}</button>`:''}
        <button type="button" data-vp="full" aria-label="Tam ekran" title="Tam ekran (F)">${IC.full}</button>
      </div>`;
    let fr;
    if(yt){fr=document.createElement('iframe');fr.title=o.title||'YouTube videosu';fr.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';fr.referrerPolicy='strict-origin-when-cross-origin';
      fr.src=`https://www.youtube-nocookie.com/embed/${encodeURIComponent(yt)}?autoplay=${auto?1:0}&mute=${o.muted?1:0}&controls=0&rel=0&playsinline=1&modestbranding=1&iv_load_policy=3&disablekb=1&fs=0&enablejsapi=1&origin=${encodeURIComponent(location.origin)}${start?'&start='+start:''}${o.loop?'&loop=1&playlist='+encodeURIComponent(yt):''}`}
    else{fr=document.createElement('video');fr.src=src;fr.playsInline=true;fr.preload='metadata';fr.muted=!!o.muted;fr.volume=vol()/100;fr.loop=!!o.loop;if(start)fr.addEventListener('loadedmetadata',()=>{try{fr.currentTime=start}catch{}},{once:true})}
    fr.className='vp-f';el.prepend(fr);
    const P={el,fr,t:start,d:0,b:start,at:0,ps:-1,muted:!!o.muted,vol:vol(),drag:false,heard:false};
    const $=s=>el.querySelector(s),bar=$('.vp-bar'),tx=$('time'),vs=$('.vp-vs');
    const post=(f,a=[])=>{try{fr.contentWindow?.postMessage(JSON.stringify({event:'command',func:f,args:a}),'*')}catch{}};
    const paint=()=>{const p=P.d?Math.min(1,P.t/P.d):0;el.style.setProperty('--p',p.toFixed(4));if(!P.drag)tx.textContent=fmt(P.t)+(P.d?' / '+fmt(P.d):'');
      bar.setAttribute('aria-valuemax',Math.round(P.d));bar.setAttribute('aria-valuenow',Math.round(P.t));bar.setAttribute('aria-valuetext',fmt(P.t)+(P.d?' / '+fmt(P.d):''))};
    const state=ps=>{const was=P.ps;P.b=P.t;P.at=performance.now();P.ps=ps;const on=ps===1||ps===3;
      el.classList.toggle('playing',on);el.classList.toggle('paused',!on&&(ps===2||ps===0||P.heard&&ps!==-1));if(ps===1)el.classList.remove('idle','wait');
      el.classList.toggle('ended',ps===0);
      const pp=$('.vp-pp');pp.innerHTML=on?IC.pause:IC.play;pp.setAttribute('aria-label',on?'Duraklat':'Oynat');$('.vp-big').setAttribute('aria-label',ps===0?'Baştan oynat':'Oynat');
      if(was!==ps)paint()};
    const muteUI=()=>{const b=$('[data-vp=mute]'),v=P.muted?0:P.vol;b.innerHTML=volIcon(P.muted,P.vol);b.setAttribute('aria-label',P.muted||!P.vol?'Sesi aç':'Sesi kapat');
      el.style.setProperty('--v',(v/100).toFixed(3));vs.setAttribute('aria-valuenow',Math.round(v));vs.setAttribute('aria-valuetext','%'+Math.round(v))};
    P.msg=raw=>{let d;try{d=typeof raw==='string'?JSON.parse(raw):raw}catch{return}if(!d)return;if(!P.heard){P.heard=true;post('setVolume',[P.vol||1])}const i=d.info,now=performance.now();
      if(d.event==='onStateChange')state(+i);
      else if(d.event==='infoDelivery'&&i&&typeof i==='object'){if(i.currentTime!=null){P.t=P.b=+i.currentTime;P.at=now}if(+i.duration>0)P.d=+i.duration;if(typeof i.muted==='boolean'&&i.muted!==P.muted){P.muted=i.muted;muteUI()}if(i.playerState!=null&&+i.playerState!==P.ps)state(+i.playerState);else paint()}};
    P.est=()=>{if(yt&&P.ps===1&&P.at&&!P.drag){P.t=Math.min(P.d||1e9,P.b+(performance.now()-P.at)/1000);paint()}};
    P.play=()=>{if(yt){post('playVideo');if(P.ps===0)P.seekTo(0)}else fr.play().catch(()=>{fr.muted=true;P.muted=true;muteUI();fr.play().catch(()=>{})});tryAuto()};
    P.pause=()=>{clearTimeout(P.at2);P.user=true;if(yt)post('pauseVideo');else fr.pause()};
    P.toggle=()=>(P.ps===1||P.ps===3)?P.pause():P.play();
    P.seekTo=t=>{t=Math.max(0,P.d?Math.min(P.d-.3,t):t);P.t=P.b=t;P.at=performance.now();if(yt)post('seekTo',[t,true]);else try{fr.currentTime=t}catch{}paint()};
    P.seek=dt=>P.seekTo(P.t+dt);
    P.mute=()=>{if(P.muted||!P.vol)P.setVol(P.vol||50);else{P.muted=true;if(yt)post('mute');else fr.muted=true;muteUI()}};
    // seviye 0 → sessiz; >0 → sesi açar. Seçilen seviye bütün videolar için saklanır.
    P.setVol=v=>{v=Math.round(Math.max(0,Math.min(100,v)));P.vol=v;setVol(v);P.muted=!v;
      if(yt){if(v){post('unMute');post('setVolume',[v])}else post('mute')}else{fr.muted=!v;if(v)fr.volume=v/100}muteUI()};
    P.full=()=>{try{document.fullscreenElement===el?document.exitFullscreen():(el.requestFullscreen||el.webkitRequestFullscreen)?.call(el)}catch{}};
    P.flash=()=>{fit();el.classList.add('kb');clearTimeout(P.kt);P.kt=setTimeout(()=>el.classList.remove('kb'),1500)};
    P.off=()=>{L.delete(P);clearInterval(P.hs);clearTimeout(P.at2)};
    // sesli otomatik oynatma engellenirse: sessiz oynat (ses düğmesinden açılır)
    function tryAuto(){clearTimeout(P.at2);P.at2=setTimeout(()=>{if(!el.isConnected||P.user&&P.ps===2||!(P.ps===-1||P.ps===5||P.ps===2&&!P.user))return;if(yt&&P.heard&&!P.muted){P.muted=true;post('mute');post('playVideo');muteUI()}
      setTimeout(()=>{if(el.isConnected&&P.ps!==1&&P.ps!==3){el.classList.remove('wait');el.classList.add('paused')}},1500)},2200)}
    if(yt){fr.addEventListener('load',()=>{let n=0;clearInterval(P.hs);const hi=()=>{try{fr.contentWindow?.postMessage(JSON.stringify({event:'listening',id:3,channel:'widget'}),'*')}catch{}};hi();P.hs=setInterval(()=>{if(++n>40||P.d)clearInterval(P.hs);else hi()},250)})}
    else{fr.addEventListener('play',()=>state(1));fr.addEventListener('playing',()=>state(1));fr.addEventListener('waiting',()=>state(3));fr.addEventListener('pause',()=>state(fr.ended?0:2));fr.addEventListener('ended',()=>state(0));
      const tu=()=>{P.t=fr.currentTime||0;P.d=isFinite(fr.duration)?fr.duration:0;paint()};['timeupdate','loadedmetadata','durationchange','seeked'].forEach(k=>fr.addEventListener(k,tu));
      fr.addEventListener('volumechange',()=>{if(fr.muted!==P.muted){P.muted=fr.muted;muteUI()}})}
    // ses kaydırıcısı: ses düğmesinin üstüne gelince yana açılır; tıkla/sürükle, odaktayken ← → ↑ ↓
    vs.addEventListener('pointerdown',e=>{if(e.button)return;e.preventDefault();e.stopPropagation();vs.focus({preventScroll:true});try{vs.setPointerCapture(e.pointerId)}catch{}const r=vs.getBoundingClientRect(),at=ev=>Math.max(0,Math.min(1,(ev.clientX-r.left)/r.width))*100;
      el.classList.add('vd');const mv=ev=>P.setVol(at(ev));mv(e);const up=()=>{vs.removeEventListener('pointermove',mv);vs.removeEventListener('pointerup',up);vs.removeEventListener('pointercancel',up);el.classList.remove('vd')};
      vs.addEventListener('pointermove',mv);vs.addEventListener('pointerup',up);vs.addEventListener('pointercancel',up)});
    vs.addEventListener('keydown',e=>{const d={ArrowLeft:-5,ArrowDown:-10,ArrowRight:5,ArrowUp:10}[e.key];if(d){e.preventDefault();e.stopPropagation();P.setVol(P.vol+d)}else if(e.key==='Home'||e.key==='End'){e.preventDefault();P.setVol(e.key==='Home'?0:100)}});
    vs.addEventListener('click',e=>e.stopPropagation());
    if(auto){el.classList.add('wait');if(!yt)fr.play().catch(()=>{fr.muted=true;P.muted=true;muteUI();fr.play().catch(()=>{el.classList.remove('wait');el.classList.add('paused')})});tryAuto()}
    else el.classList.add('paused');
    muteUI();
    // tıklama: düğmeler; yüzey → oynat/duraklat; çift tık → tam ekran. Dokunmatikte ilk dokunuş sadece denetimleri gösterir.
    let touchUI=0;
    el.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'){const shown=el.classList.contains('ui');el.classList.add('ui');clearTimeout(touchUI);touchUI=setTimeout(()=>el.classList.remove('ui'),3000);if(!shown&&!e.target.closest('button,.vp-bar')&&(P.ps===1||P.ps===3))el._skip=true}});
    el.addEventListener('click',e=>{e.stopPropagation();if(el._skip){el._skip=false;return}const b=e.target.closest('[data-vp]');
      if(b){const k=b.dataset.vp;if(k==='tog')P.toggle();else if(k==='mute')P.mute();else if(k==='full')P.full();else if(k==='pop'){const t=P.t;P.pause();o.onPop?.(t)}else P.seek(+k);return}
      if(e.target.closest('.vp-ui'))return;P.toggle()});
    el.addEventListener('dblclick',e=>{if(e.target.closest('.vp-ui,.vp-big'))return;e.stopPropagation();P.full()});
    // çubuk: tıkla/sürükle
    bar.addEventListener('pointerdown',e=>{if(e.button||!P.d)return;e.preventDefault();e.stopPropagation();bar.focus({preventScroll:true});try{bar.setPointerCapture(e.pointerId)}catch{}const r=bar.getBoundingClientRect(),at=ev=>Math.max(0,Math.min(1,(ev.clientX-r.left)/r.width));
      P.drag=true;el.classList.add('drag');const mv=ev=>{const p=at(ev);el.style.setProperty('--p',p.toFixed(4));tx.textContent=fmt(p*P.d)+' / '+fmt(P.d)};mv(e);
      const up=ev=>{bar.removeEventListener('pointermove',mv);bar.removeEventListener('pointerup',up);bar.removeEventListener('pointercancel',up);P.drag=false;el.classList.remove('drag');if(ev.type==='pointerup')P.seekTo(at(ev)*P.d);else paint()};
      bar.addEventListener('pointermove',mv);bar.addEventListener('pointerup',up);bar.addEventListener('pointercancel',up)});
    bar.addEventListener('keydown',e=>{const d={ArrowLeft:-5,ArrowRight:5,ArrowDown:-10,ArrowUp:10}[e.key];if(d){e.preventDefault();e.stopPropagation();P.seek(d);P.flash()}else if((e.key==='Home'||e.key==='End')&&P.d){e.preventDefault();P.seekTo(e.key==='Home'?0:P.d)}});
    const fit=()=>{const w=el.clientWidth;el.classList.toggle('nr',w<380);el.classList.toggle('xs',w<270)};el.addEventListener('pointerenter',fit);el.addEventListener('focusin',fit);
    // imleç çıkınca odak da bırakılır → denetimler anında kaybolur (Tab ile gezerken görünür kalır)
    el.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse'&&el.contains(document.activeElement)&&!P.drag)document.activeElement.blur()});
    if(!reduced())el.classList.add('anim');
    L.add(P);run();return P}

  const html=o=>`<div class="vp-ph" data-vp='${esc(JSON.stringify(o))}'></div>`;
  function scan(root=document){root.querySelectorAll?.('.vp-ph[data-vp]').forEach(ph=>{let o={};try{o=JSON.parse(ph.dataset.vp)}catch{}const p=make(o);ph.replaceWith(p.el)})}
  return{make,html,scan,ytId,fmt,vol,setVol}})();
