/* ════════════════════════════════════════════════════════════
   Medya merkezi — Film & Dizi · Anime · Oyunlar
   Library'nin `#lib` ve `#lib/m/<bölüm>/<sayfa>` rotalarını çizer. Veriler KB.items'ta (Library ile ortak),
   detay `#lib/i/<id>` (Library.openDetail medya türlerinde buraya yönlendirir).

   Poster/metadata eşleştirme (anahtar istemez, hepsi CORS açık):
   1) Wikidata (SPARQL + EntitySearch): içerik TÜRÜNE göre (film/dizi/anime/oyun sınıfları) ve yıl ipucuyla aranır —
      sadece isim benzerliğine değil, tür + yıl + kesin etiket eşleşmesine bakılır. Güven: ok / unsure / none.
   2) Kimlik numaralarıyla resmî görseller: oyun → Steam (P1733) kapak/hero, anime → MyAnimeList (P4086, Jikan),
      dizi → IMDb (P345) üzerinden TVmaze, film → iTunes (yıl doğrulamalı) ya da Wikipedia posteri.
      İsteğe bağlı TMDB anahtarı (`mc:tmdb`) varsa film/dizi poster+arka plan oradan gelir.
   Emin olunamayanlar “İnceleme” sayfasına düşer; kullanıcı onaylar ya da başka aday seçer.
   ════════════════════════════════════════════════════════════ */
const Media=(()=>{
  const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];
  const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const lsg=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}};
  const lss=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
  const motion=()=>!matchMedia('(prefers-reduced-motion: reduce)').matches&&document.documentElement.dataset.motion!=='off';
  const hash=s=>{let h=7;for(const c of String(s))h=(h*31+c.charCodeAt(0))|0;return Math.abs(h)};
  const norm=s=>String(s||'').toLocaleLowerCase('en').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/ı/g,'i').replace(/&/g,'and').replace(/[^a-z0-9]+/g,' ').replace(/^(the|a|an) /,'').trim();
  const say=(m,o)=>{try{toast(m,o)}catch{}};

  const MT=['movie','series','anime','game'];          // poster eşleştirmesi yapılan türler
  const AT=[...MT,'book'];                               // Medya'da gösterilen türler (kitaplar Library ile ortak kayıt)
  const TN={movie:'Film',series:'Dizi',anime:'Anime',game:'Oyun',book:'Kitap'};
  const SERIAL=[['home','Keşfet'],['done','İzlediklerim'],['todo','İzlemek İstediklerim'],['doing','İzliyorum'],['dropped','Yarım Bıraktıklarım'],['fav','Favorilerim']];
  const SEC={
    movies:{n:'Filmler',ic:'film',types:['movie'],pages:[['home','Keşfet'],['done','İzlediklerim'],['todo','İzlemek İstediklerim'],['doing','İzliyorum'],['fav','Favorilerim']]},
    series:{n:'Diziler',ic:'tv',types:['series'],pages:SERIAL},
    anime:{n:'Animeler',ic:'anime',types:['anime'],pages:SERIAL},
    books:{n:'Kitaplar',ic:'book',types:['book'],pages:[['home','Keşfet'],['done','Okundu'],['doing','Okunuyor'],['todo','Okunmak İsteniyor'],['fav','Favorilerim']]},
    games:{n:'Oyunlar',ic:'game',types:['game'],pages:[['home','Keşfet'],['played','Oynadıklarım'],['doing','Şu an oynadıklarım'],['todo','Oynamak istediklerim'],['done','Bitirdiklerim'],['fav','Favorilerim']]}};
  const ORDER=['movies','series','anime','games','books'];
  const secOf=t=>t==='game'?'games':t==='anime'?'anime':t==='series'?'series':t==='book'?'books':'movies';
  const ST={watch:{todo:'İzlemek istiyorum',doing:'İzliyorum',done:'İzledim'},serial:{todo:'İzlemek istiyorum',doing:'İzliyorum',dropped:'Yarım bıraktım',done:'İzledim'},book:{todo:'Okumak istiyorum',doing:'Okunuyor',done:'Okundu'},game:{todo:'Oynamak istiyorum',doing:'Oynuyorum',played:'Oynadım',done:'Bitirdim'}};
  const stMap=it=>it.type==='game'?ST.game:it.type==='book'?ST.book:it.type==='series'||it.type==='anime'?ST.serial:ST.watch;
  // kitapta durum elle seçilmemişse okuma ilerlemesinden çıkar (Library ile aynı kural)
  const stOf=it=>it.type==='book'?(it.status||(it.progress>=.99?'done':it.progress>.01?'doing':'')):it.status;
  const stName=it=>stMap(it)[stOf(it)]||'';
  const inPage=(it,k)=>k==='fav'?it.fav:k==='played'?['played','done'].includes(it.status):k==='all'?true:stOf(it)===k;
  const S=p=>`<svg class="mvi" viewBox="0 0 16 16" aria-hidden="true">${p}</svg>`;
  const IC={play:S('<path d="M5 3.5v9l7.5-4.5z" fill="currentColor" stroke="none"/>'),plus:S('<path d="M8 3v10M3 8h10"/>'),check:S('<path d="M3.5 8.5l3 3 6-7"/>'),
    heart:S('<path d="M8 13.5S2.5 10.2 2.5 6.3A2.8 2.8 0 0 1 8 5a2.8 2.8 0 0 1 5.5 1.3C13.5 10.2 8 13.5 8 13.5z"/>'),more:S('<circle cx="3.5" cy="8" r="1.1" fill="currentColor" stroke="none"/><circle cx="8" cy="8" r="1.1" fill="currentColor" stroke="none"/><circle cx="12.5" cy="8" r="1.1" fill="currentColor" stroke="none"/>'),
    x:S('<path d="M4 4l8 8M12 4l-8 8"/>'),search:S('<circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14"/>'),l:S('<path d="M10 3.5L5.5 8l4.5 4.5"/>'),r:S('<path d="M6 3.5L10.5 8 6 12.5"/>'),
    clock:S('<circle cx="8" cy="8" r="5.5"/><path d="M8 5v3.2l2 1.3"/>'),edit:S('<path d="M10.5 2.5l3 3-8 8H2.5v-3z"/>'),trash:S('<path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 9h5.8l.6-9"/>'),
    link:S('<path d="M9 2.5h4.5V7M13.5 2.5L7 9M11.5 9.5v4h-9v-9h4"/>'),warn:S('<path d="M8 2l6.5 11.5h-13z"/><path d="M8 6.5v3M8 11.6v.1"/>'),spark:S('<path d="M8 2v3M8 11v3M2 8h3M11 8h3M4 4l1.8 1.8M10.2 10.2L12 12M12 4l-1.8 1.8M5.8 10.2L4 12"/>'),
    film:S('<rect x="2" y="3" width="12" height="10" rx="1.5"/><path d="M5 3v10M11 3v10M2 6h3M2 10h3M11 6h3M11 10h3"/>'),tv:S('<rect x="1.5" y="3.5" width="13" height="8.5" rx="1.5"/><path d="M5.5 14.5h5M6 1.5l2 2 2-2"/>'),
    star:S('<path d="M8 2l1.8 3.7 4 .6-2.9 2.8.7 4L8 11.2 4.4 13.1l.7-4L2.2 6.3l4-.6z"/>'),
    game:S('<path d="M4.5 5h7a3 3 0 0 1 3 3v1.5a2 2 0 0 1-3.6 1.2L10 9.5H6l-.9 1.2A2 2 0 0 1 1.5 9.5V8a3 3 0 0 1 3-3z"/><path d="M5 6.8v2M4 7.8h2"/>'),anime:S('<path d="M8 2l1.6 3.4 3.7.5-2.7 2.6.7 3.7L8 10.4l-3.3 1.8.7-3.7L2.7 5.9l3.7-.5z"/>'),
    book:S('<path d="M3 2.5h6.5a2 2 0 0 1 2 2v9a1.5 1.5 0 0 0-1.5-1.5H3z"/><path d="M11.5 4.5h1.5v9.5h-3"/>'),
    up:S('<path d="M5.5 14V7.5L8.5 2c1 0 1.7.8 1.5 1.8L9.5 6.5h3.3a1.2 1.2 0 0 1 1.2 1.4l-1 5A1.3 1.3 0 0 1 11.7 14z"/><path d="M2 7.5h3.5V14H2z"/>'),
    down:S('<path d="M10.5 2v6.5L7.5 14c-1 0-1.7-.8-1.5-1.8l.5-2.7H3.2A1.2 1.2 0 0 1 2 8.1l1-5A1.3 1.3 0 0 1 4.3 2z"/><path d="M14 8.5h-3.5V2H14z"/>'),
    gear:S('<circle cx="8" cy="8" r="2"/><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4"/>'),
    vtv:S('<rect x="1.5" y="3" width="13" height="6.5" rx="1.5"/><path d="M1.5 12.5h5M9.5 12.5h5"/>'),vnf:S('<rect x="1.5" y="2.5" width="3.5" height="5.5" rx=".8"/><rect x="6.25" y="2.5" width="3.5" height="5.5" rx=".8"/><rect x="11" y="2.5" width="3.5" height="5.5" rx=".8"/><path d="M1.5 11h13M1.5 13.5h13"/>'),
    vcp:S('<rect x="1.5" y="1.5" width="3" height="4" rx=".6"/><rect x="6.5" y="1.5" width="3" height="4" rx=".6"/><rect x="11.5" y="1.5" width="3" height="4" rx=".6"/><rect x="1.5" y="8" width="3" height="4" rx=".6"/><rect x="6.5" y="8" width="3" height="4" rx=".6"/><rect x="11.5" y="8" width="3" height="4" rx=".6"/>'),
    vls:S('<rect x="1.5" y="2.5" width="3" height="3" rx=".6"/><rect x="1.5" y="10.5" width="3" height="3" rx=".6"/><path d="M6.5 4h8M6.5 12h8"/>'),home:S('<path d="M2.5 7.5L8 3l5.5 4.5M4 6.5V13h8V6.5"/>'),
    minus:S('<path d="M3 8h10"/>'),sync:S('<path d="M13 8a5 5 0 0 1-9 3M3 8a5 5 0 0 1 9-3"/><path d="M12 2v3h-3M4 14v-3h3"/>')};
  // ana sayfa rafları (sırası ve görünürlüğü kullanıcıda) · liste sütunları
  const SH={cont:'Kaldığın yerden devam et',movies:'Filmler',series:'Diziler',anime:'Animeler',games:'Oyunlar',books:'Kitaplar',fav:'Favorilerin',top:'En sevdiklerin',docs:'Belgeler'};
  const LC=[['cover','Kapak'],['st','Durum'],['rate','Puanım'],['score','Genel puan'],['like','Beğeni'],['fav','Favori']];
  const LOOK0={view:'tv',cover:100,icon:'m',font:'m',gap:100,dens:'n',radius:8,ar:100,title:1,meta:1,badge:1,hero:1,rowh:100,
    lc:{cover:1,st:1,rate:1,score:0,like:1,fav:1},shelves:Object.keys(SH),off:[],tabsOff:[]};
  function loadLook(){const s=lsg('mc:look',{})||{},L={...LOOK0,...s,lc:{...LOOK0.lc,...(s.lc||{})}};
    L.shelves=[...(Array.isArray(s.shelves)?s.shelves.filter(k=>SH[k]):[]),...Object.keys(SH)].filter((k,i,a)=>a.indexOf(k)===i);
    L.off=(Array.isArray(s.off)?s.off:[]).filter(k=>SH[k]);L.tabsOff=Array.isArray(s.tabsOff)?s.tabsOff:[];return L}
  const st={sec:'home',page:'home',qs:'',genre:'',sort:lsg('mc:sort','added'),kind:'',min:0,hero:0,base:[],look:loadLook()};
  const V=()=>st.look.view;
  const all=()=>[...KB.items.values()].filter(i=>AT.includes(i.type));
  const inSec=(it,s)=>SEC[s].types.includes(it.type);
  const flagOf=it=>it.reviewed?'':it.flag?it.flag:(it.match==='unsure'||it.match==='none')?'match':'';

  /* ── görseller ── */
  function imgErr(im){const a=im.dataset.alt;if(a){im.dataset.alt='';im.src=a}else{im.closest('.mp,.mw,.mh-bg,.mx-bd')?.classList.add('noimg');im.remove()}}
  const IMG=(src,alt,cls='',eager)=>src?`<img class="${cls}" src="${E(src)}"${alt&&alt!==src?` data-alt="${E(alt)}"`:''} alt="" ${eager?'fetchpriority="high"':'loading="lazy"'} decoding="async" referrerpolicy="no-referrer" onload="this.classList.add('ok')" onerror="Media.imgErr(this)">`:'';
  // görsel yoksa: içeriğin adıyla tasarlanmış, türüne göre değişen tipografik kapak (rastgele görsel değil)
  function fallback(it){const g=(it.genres||[])[0]||'';
    return`<div class="fp fp-${it.type}" aria-hidden="true"><span class="fp-k">${TN[it.type]}${it.year?' · '+E(it.year):''}</span><b class="fp-t">${E(it.title)}</b>${g?`<span class="fp-g">${E(g)}</span>`:''}</div>`}
  const poster=(it,cls='')=>`<div class="mp ${cls}" style="--h:${hash(it.title)%360}">${fallback(it)}${IMG(it.cover,it.cover2)}</div>`;
  const wideArt=it=>{const w=it.wide||it.backdrop,h=hash(it.title)%360;if(w)return`<div class="mw" style="--h:${h}">${fallback(it)}${IMG(w,it.cover)}</div>`;
    return`<div class="mw pb" style="--h:${h}">${fallback(it)}${it.cover?`<div class="mw-bl">${IMG(it.cover,it.cover2)}</div><div class="mw-p">${IMG(it.cover,it.cover2)}</div>`:''}</div>`};
  // kart rozeti: IMDb puanı sağ üstte (IMDb etiketiyle), diğer kaynaklar olduğu gibi
  const scoreBadge=it=>{const m=/^IMDb\s*(.+)$/i.exec(it.score||'');return m?`<i>IMDb</i>${E(m[1])}`:scoreTxt(it)};
  const scoreTxt=it=>it.score?E(it.score.replace(/^IMDb\s*/,'★ ').replace(/^MC\s*/,'MC ')):'';
  function metaShort(it){const a=[];if(it.type==='book'&&it.author)a.push(it.author);if(it.year)a.push(it.year);if(it.type==='game'&&it.platforms.length)a.push(it.platforms.slice(0,2).join(' · '));else if(it.genres.length)a.push(it.genres[0]);
    if(it.type==='series'&&it.season)a.push(`S${it.season}${it.ep?' B'+it.ep:''}`);return a.map(E).join(' · ')}
  function metaLong(it,noType){const a=noType?[]:[TN[it.type]];if(it.year)a.push(it.year);if(it.genres.length)a.push(it.genres.slice(0,3).join(', '));if(it.type==='game'&&it.platforms.length)a.push(it.platforms.slice(0,4).join(' · '));
    if(it.eps)a.push(it.eps+' bölüm');return a.map(E).join('<i>·</i>')}
  const prog=it=>it.status==='doing'&&it.eps&&it.ep?`<span class="mc-pr"><i style="width:${Math.min(100,Math.round(it.ep/it.eps*100))}%"></i></span>`:'';

  /* ── kart: türüne göre farklı ── */
  function card(it,v='p',n){const f=flagOf(it),s=stName(it);
    return`<article class="mc-card v-${v} t-${it.type}${it.status?' s-'+it.status:''}" data-mi="${it.id}" tabindex="0" aria-label="${E(it.title)}${s?', '+E(s):''}">
      ${v==='r'?`<span class="mc-n" aria-hidden="true">${n}</span>`:''}
      <div class="mc-art">${v==='w'||v==='w2'?wideArt(it):poster(it)}
        ${it.score?`<span class="mc-sc">${scoreBadge(it)}</span>`:''}${it.rating?`<span class="mc-mine" title="Puanım ${it.rating}/10" aria-label="Puanım ${it.rating}/10">${IC.star}${it.rating}</span>`:''}${f?`<span class="mc-fl" title="İncelemen gerekiyor">${IC.warn}</span>`:''}${it.fav?`<span class="mc-fv" title="Favori">${IC.heart}</span>`:''}${prog(it)}
        <div class="mc-hov"></div></div>
      <div class="mc-cap"><b>${E(it.title)}</b><small>${metaShort(it)||TN[it.type]}</small></div></article>`}
  // karttaki hızlı durum düğmesi: listede değilse “listeye ekle”, listedeyse “izledim / bitirdim”
  function quick(it){const g=it.type==='game',b=it.type==='book',S0=stOf(it);
    if(!S0)return`<button class="mc-b pri" data-mq="todo" title="${g?'Oynamak istediklerime ekle':b?'Okuma listeme ekle':'İzleme listeme ekle'}" aria-label="${g?'İstek listesine ekle':b?'Okuma listesine ekle':'İzleme listesine ekle'}">${IC.plus}</button>`;
    if(S0==='todo'||S0==='doing'||S0==='dropped')return`<button class="mc-b pri" data-mq="done" title="${g?'Bitirdim':b?'Okudum':'İzledim'}" aria-label="${g?'Bitirdim olarak işaretle':b?'Okundu olarak işaretle':'İzledim olarak işaretle'}">${IC.check}</button>`;
    return`<button class="mc-b on" data-mq="todo" title="${E(stName(it))} — tekrar listeye al" aria-label="Listeye geri al">${IC.check}</button>`}

  const hovHTML=it=>{const s=stName(it);return`<div class="mc-qa">${quick(it)}<button class="mc-b" data-mq="fav" aria-label="${it.fav?'Favorilerden çıkar':'Favorilere ekle'}" title="Favori" aria-pressed="${it.fav}">${IC.heart}</button><button class="mc-b mc-rb${it.rating?' on':''}" data-mq="rate" aria-label="${it.rating?`Puanım ${it.rating}/10 — değiştir`:'Puanla'}" title="${it.rating?`Puanım ${it.rating}/10`:'Puanla'}">${IC.star}${it.rating?`<b>${it.rating}</b>`:''}</button><button class="mc-b" data-mq="more" aria-label="Diğer işlemler" title="Diğer">${IC.more}</button></div>
      <b>${E(it.title)}</b><span>${metaShort(it)}</span>${s?`<em class="mc-st">${E(s)}</em>`:''}`};
  function fillHov(c){const h=c?.querySelector('.mc-hov');if(!h||h.childElementCount)return;const it=KB.items.get(c.dataset.mi);if(it)h.innerHTML=hovHTML(it)}
  // uzun ana sayfalar: ilk raflar hemen, diğerleri ekrana yaklaşınca çizilir (sayfa hafif kalır)
  const LZ=new Map();let lzN=0,io=null;
  function lazy(html){if(!html)return'';const k='z'+(++lzN);LZ.set(k,html);return`<div class="mc-lz" data-lz="${k}"></div>`}
  function lazyWatch(){io?.disconnect();if(!('IntersectionObserver'in window)){qa('.mc [data-lz]').forEach(fillLz);return}
    io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){io.unobserve(e.target);fillLz(e.target)}}),{root:q('#scroll'),rootMargin:'900px 0px'});qa('.mc [data-lz]').forEach(z=>io.observe(z))}
  function fillLz(z){const h=LZ.get(z.dataset.lz);LZ.delete(z.dataset.lz);if(h==null)return;z.outerHTML=h;arrows()}
  /* görünüm: tv = Apple TV (geniş büyük kapaklar) · nf = Netflix (yoğun posterler) · compact (küçük, az metin) · list (satırlar) */
  const vOf=v=>V()==='tv'?(v==='r'?'r':'w'):V()==='compact'?'p':v;
  const likeIc=it=>it.like>0?`<span class="ml-lk up" title="Beğendim">${IC.up}</span>`:it.like<0?`<span class="ml-lk down" title="Beğenmedim">${IC.down}</span>`:'<span class="ml-lk none" title="Değerlendirmedim">—</span>';
  function lrow(it){const s=stName(it),c=st.look.lc;return`<article class="ml-r t-${it.type}" data-mi="${it.id}" tabindex="0" aria-label="${E(it.title)}">${c.cover?poster(it,'ml-p'):''}
      <span class="ml-t"><b>${E(it.title)}</b>${st.look.meta?`<small>${E(TN[it.type])}${metaShort(it)?' · '+metaShort(it):''}</small>`:''}</span>
      ${c.st?`<span class="ml-s">${s?E(s):'<i>—</i>'}</span>`:''}${c.rate?`<button class="ml-sc" data-mq="rate" title="Puanla" aria-label="${it.rating?`Puanım ${it.rating}/10 — değiştir`:'Puanla'}">${it.rating?`<b>${it.rating}</b><small>/10</small>`:`${IC.star}<i>Puanla</i>`}</button>`:''}${c.score?`<span class="ml-gs">${it.score?scoreTxt(it):'<i>—</i>'}</span>`:''}${c.like?likeIc(it):''}
      ${c.fav?`<button class="ml-f${it.fav?' on':''}" data-mq="fav" aria-pressed="${it.fav}" aria-label="${it.fav?'Favorilerden çıkar':'Favorilere ekle'}" title="Favori">${IC.heart}</button>`:''}</article>`}
  const listHTML=l=>{const c=st.look.lc;return`<div class="ml"><div class="ml-hd" aria-hidden="true">${c.cover?'<span></span>':''}<span>Ad</span>${c.st?'<span>Durum</span>':''}${c.rate?'<span>Puanım</span>':''}${c.score?'<span>Genel puan</span>':''}${c.like?'<span>Beğeni</span>':''}${c.fav?'<span></span>':''}</div>${l.map(lrow).join('')}</div>`};
  const gridHTML=(l,s)=>V()==='list'?listHTML(l):`<div class="mc-grid v-${V()==='tv'?'w':s==='games'?'g':'p'}">${l.map(it=>card(it,V()==='tv'?'w':'p')).join('')}</div>`;
  function shelf(title,list,o={}){if(!list.length)return'';const v=vOf(o.v||'p');
    if(V()==='list')return`<section class="mc-shelf ml-shelf"><header><h2>${E(title)}</h2>${o.href?`<a class="mc-all" href="${o.href}">Tümünü gör${IC.r}</a>`:''}</header>${listHTML(list.slice(0,6))}</section>`;
    return`<section class="mc-shelf${o.cls?' '+o.cls:''}"><header><h2>${E(title)}</h2>${o.sub?`<p>${E(o.sub)}</p>`:''}${o.href?`<a class="mc-all" href="${o.href}">Tümünü gör${IC.r}</a>`:''}</header>
      <div class="mc-rw"><button class="mc-arr l" data-row="-1" aria-label="Sola kaydır" tabindex="-1">${IC.l}</button><div class="mc-row v-${v}">${list.map((it,i)=>card(it,v,i+1)).join('')}</div><button class="mc-arr r" data-row="1" aria-label="Sağa kaydır" tabindex="-1">${IC.r}</button></div></section>`}

  /* ── öne çıkan alan ── */
  function featured(list){const day=new Date().toDateString();const sc=it=>(it.status==='doing'?6:0)+(it.fav?3:0)+(it.backdrop?4:0)+(it.cover?2:-20)+(parseFloat(it.score)||0)/3+(hash(it.id+day)%100)/40;
    return list.filter(i=>i.cover||i.backdrop).sort((a,b)=>sc(b)-sc(a)).slice(0,5)}
  function kicker(it){return it.status==='doing'?(it.type==='game'?'Şu an oynuyorsun':'Kaldığın yerden devam et'):it.status==='todo'?(it.type==='game'?'Oynamak istediklerinden':'İzleme listenden'):it.fav?'Favorilerinden':it.status==='done'||it.status==='played'?(it.type==='game'?'Oynadıkların arasından':'İzlediklerinden'):'Kütüphanenden'}
  function hero(list){if(!list.length||!st.look.hero||V()==='compact'||V()==='list')return'';
    return`<section class="mh" aria-roledescription="carousel" aria-label="Öne çıkanlar"><div class="mh-sl">${list.map((it,i)=>{const wide=!!it.backdrop;
      return`<div class="mh-s${i===st.hero%list.length?' on':''}" data-i="${i}" aria-hidden="${i!==st.hero%list.length}">
        <div class="mh-bg ${wide?'wide':'post'}">${IMG(it.backdrop||it.cover,wide?it.cover:it.cover2,'',i===0)}</div><div class="mh-gr"></div>
        <div class="mh-c"><span class="mh-k">${E(kicker(it))}</span><h2>${E(it.title)}</h2><p class="mh-m">${metaLong(it)}${it.score?`<span class="mh-sc">${scoreTxt(it)}</span>`:''}</p>
          ${it.desc?`<p class="mh-d">${E(it.desc.slice(0,240))}</p>`:''}
          <div class="mh-b"><button class="mb pri" data-mo="${it.id}">${IC.play}Ayrıntılar</button>${heroBtn(it)}<button class="mb ic${it.fav?' on':''}" data-mq="fav" data-id="${it.id}" aria-label="Favori" aria-pressed="${it.fav}" title="Favori">${IC.heart}</button></div></div>
        ${!wide?`<button class="mh-post" data-mo="${it.id}" aria-label="${E(it.title)}" tabindex="-1">${poster(it)}</button>`:''}</div>`}).join('')}</div>
      ${list.length>1?`<div class="mh-dots" role="tablist">${list.map((it,i)=>`<button role="tab" data-hd="${i}" class="${i===st.hero%list.length?'on':''}" aria-label="${E(it.title)}"><i></i></button>`).join('')}</div>`:''}</section>`}
  function heroBtn(it){const g=it.type==='game';if(!it.status)return`<button class="mb" data-mq="todo" data-id="${it.id}">${IC.plus}${g?'İstek listesine ekle':'Listeme ekle'}</button>`;
    if(it.status==='todo')return`<button class="mb" data-mq="doing" data-id="${it.id}">${IC.play}${g?'Oynamaya başla':'İzlemeye başla'}</button>`;
    if(it.status==='doing')return`<button class="mb" data-mq="done" data-id="${it.id}">${IC.check}${g?'Bitirdim':'İzledim'}</button>`;return''}
  let heroT=0;function heroStart(){clearInterval(heroT);const h=q('.mc .mh');if(!h||!motion())return;const n=qa('.mh-s',h).length;if(n<2)return;
    heroT=setInterval(()=>{if(!h.isConnected)return clearInterval(heroT);if(h.matches(':hover,:focus-within')||document.hidden)return;heroGo((st.hero+1)%n)},8000)}
  function heroGo(i){const h=q('.mc .mh');if(!h)return;st.hero=i;qa('.mh-s',h).forEach(s=>{const on=+s.dataset.i===i;s.classList.toggle('on',on);s.setAttribute('aria-hidden',!on)});qa('[data-hd]',h).forEach(d=>d.classList.toggle('on',+d.dataset.hd===i))}

  /* ── sayfalar ── */
  const byAdded=l=>l.slice().sort((a,b)=>b.added-a.added),byScore=l=>l.slice().sort((a,b)=>(b.rating||parseFloat(b.score.replace(/[^\d.]/g,''))/(b.type==='game'?10:1)||0)-(a.rating||parseFloat(a.score.replace(/[^\d.]/g,''))/(a.type==='game'?10:1)||0));
  const byTouch=l=>l.slice().sort((a,b)=>(b.opened||b.updated)-(a.opened||a.updated));
  function homeHTML(){const l=all();if(!l.length)return emptyHome();const w=l.filter(i=>i.type!=='game'&&i.type!=='book');
    const rev=l.filter(flagOf).length,of=t=>l.filter(i=>i.type===t),L=st.look;
    const H={cont:()=>shelf(SH.cont,byTouch(w.filter(i=>i.status==='doing')),{v:'w2'}),
      movies:()=>shelf(SH.movies,byAdded(of('movie')).slice(0,20),{href:'#lib/m/movies'}),
      series:()=>shelf(SH.series,byAdded(of('series')).slice(0,20),{href:'#lib/m/series'}),
      anime:()=>shelf(SH.anime,byAdded(of('anime')).slice(0,20),{cls:'anime',href:'#lib/m/anime'}),
      games:()=>shelf(SH.games,byTouch(of('game')).slice(0,16),{v:'w',cls:'games',href:'#lib/m/games'}),
      books:()=>shelf(SH.books,byAdded(of('book')).slice(0,20),{cls:'books',href:'#lib/m/books'}),
      fav:()=>shelf(SH.fav,byTouch(l.filter(i=>i.fav)),{}),
      top:()=>shelf(SH.top,byScore(w.filter(i=>i.status==='done')).slice(0,10),{v:'r',sub:'İzlediklerin arasında en yüksek puanlılar'}),
      docs:()=>docsShelf()};
    const rows=L.shelves.filter(k=>!L.off.includes(k)).map((k,n)=>n<3?H[k]():lazy(H[k]())).join('');
    return hero(featured(l))+`<div class="mc-shelves">
      ${(Library.impBanner?.()||'').replace('class="imp"','class="imp mc-imp"')}
      ${rev?`<a class="mc-rev" href="#lib/m/${secOf(l.find(flagOf).type)}/review">${IC.warn}<span><b>${rev} kayıt incelemeni bekliyor</b><small>Türü ya da posteri kesin olmayanları işaretledim — rastgele bir kategoriye atmadım.</small></span>${IC.r}</a>`:''}
      ${rows||`<div class="mc-none"><span>${IC.gear}</span><b>Bütün rafları gizledin</b><p>Görünüm ayarlarından (dişli) “Ana sayfa rafları”nı aç.</p></div>`}</div>`}
  function docsShelf(){const d=[...KB.items.values()].filter(i=>!AT.includes(i.type));if(!d.length)return'';
    return`<section class="mc-shelf docs"><header><h2>Belgeler</h2><p>PDF'ler, makaleler, videolar</p><a class="mc-all" href="#lib/docs">Belgelere git${IC.r}</a></header><div class="mc-docs">${d.slice(0,8).map(it=>`<a class="mc-doc" href="#lib/i/${it.id}">${Library.cover(it,'mini')}<span><b>${E(it.title)}</b><small>${E((KB.TYPES[it.type]||KB.TYPES.file).n)}</small></span></a>`).join('')}</div></section>`}
  function emptyHome(){return`<section class="mc-empty"><div class="mc-e-art" aria-hidden="true">${['#E5484D','#B07CFF','#66C0F4','#F0A04B','#30A46C'].map((c,i)=>`<span style="--c:${c};--i:${i}"></span>`).join('')}</div>
      <h2>Kişisel sinema salonun, anime arşivin ve oyun kütüphanen</h2><p>İzlediğin filmleri, devam ettiğin dizileri ve oynadığın oyunları ekle — posterleri ve bilgileri otomatik bulunur.</p>
      <div class="mh-b"><button class="mb pri" data-madd>${IC.plus}İlk içeriği ekle</button></div>${(Library.impBanner?.()||'').replace('class="imp"','class="imp mc-imp"')}</section>`}
  function secHome(s){const l=all().filter(i=>inSec(i,s));if(!l.length)return secEmpty(s,'home');const g=s==='games',b=s==='books',ser=s==='series'||s==='anime';
    const genres=topGenres(l).slice(0,4),p=k=>l.filter(i=>stOf(i)===k);
    return hero(featured(l))+`<div class="mc-shelves">
      ${shelf(g?'Şu an oynadıkların':b?'Okuduğun kitaplar':'Devam ettiklerin',byTouch(p('doing')),{v:g?'w':b?'p':'w2',href:`#lib/m/${s}/doing`})}
      ${shelf(g?'Oynamak istediklerin':b?'Okumak istediklerin':'İzlemek istediklerin',byScore(p('todo')),{href:`#lib/m/${s}/todo`})}
      ${shelf('Son eklenenler',byAdded(l).slice(0,20),{href:`#lib/m/${s}/all`})}
      ${ser?lazy(shelf('Yarım bıraktıkların',byTouch(p('dropped')),{href:`#lib/m/${s}/dropped`})):''}
      ${lazy(shelf(g?'En yüksek puanlı oyunların':b?'Okudukların':'En yüksek puanlılar',byScore(l.filter(i=>['done','played'].includes(stOf(i)))).slice(0,10),{v:b?'p':'r',href:`#lib/m/${s}/${g?'played':'done'}`}))}
      ${genres.map(gn=>lazy(shelf(gn,byScore(l.filter(i=>i.genres.includes(gn))).slice(0,18),{href:`#lib/m/${s}/all?g=${encodeURIComponent(gn)}`}))).join('')}
      ${lazy(shelf('Favorilerin',l.filter(i=>i.fav),{href:`#lib/m/${s}/fav`}))}</div>`}
  function topGenres(l){const m=new Map();l.forEach(i=>i.genres.forEach(g=>m.set(g,(m.get(g)||0)+1)));return[...m].filter(x=>x[1]>=3).sort((a,b)=>b[1]-a[1]).map(x=>x[0])}
  function secEmpty(s,page){const g=s==='games',b=s==='books',m={home:[g?'Oyun kütüphanen boş':b?'Henüz kitap yok':'Henüz bir şey yok',g?'Oynadığın ya da oynamak istediğin oyunları ekle; Steam kapakları ve platform bilgisi otomatik gelir.':b?'Bir kitap ekle; kapağı ve yazarı otomatik bulunur.':'Bir içerik ekle; posteri, yılı ve türü otomatik bulunur.'],dropped:['Yarım bıraktığın bir şey yok','Bir diziyi “Yarım bıraktım” yaparsan burada durur.'],
      done:['Henüz izlediğin bir şey yok','Bir içeriği “İzledim” olarak işaretlediğinde burada görünür.'],doing:[g?'Şu an oynadığın bir oyun yok':'Devam ettiğin bir şey yok',g?'Bir oyunu “Oynuyorum” yap, burada bekler.':'Bir diziyi “İzliyorum” yap; kaldığın sezon/bölümü de tutarım.'],
      todo:[g?'İstek listen boş':'İzleme listen boş','Kartlardaki + ile listene ekle.'],fav:['Favorin yok','Kartlardaki kalple favorilere ekleyebilirsin.'],played:['Henüz oynadığın oyun yok','Oynadığın oyunları ekle.'],review:['İncelenecek bir şey yok','Her kaydın türü ve posteri kesin görünüyor.'],all:['Sonuç yok','Filtreleri değiştir.']}[page]||['Burada bir şey yok',''];
    return`<div class="mc-none"><span>${IC[SEC[s]?.ic||'film']}</span><b>${m[0]}</b><p>${m[1]}</p><button class="mb pri" data-madd>${IC.plus}İçerik ekle</button></div>`}
  function filt(l){let r=l;if(st.kind)r=r.filter(i=>i.type===st.kind);if(st.genre)r=r.filter(i=>i.genres.includes(st.genre));
    if(st.min)r=r.filter(i=>(i.rating||(parseFloat(i.score.replace(/[^\d.]/g,''))/(i.type==='game'?10:1))||0)>=st.min);
    const k=st.sort;r=r.slice();if(k==='title')r.sort((a,b)=>a.title.localeCompare(b.title,'tr'));else if(k==='year')r.sort((a,b)=>(+b.year||0)-(+a.year||0));else if(k==='score')r=byScore(r);else if(k==='rating')r.sort((a,b)=>b.rating-a.rating);else r=byAdded(r);return r}
  function pageHTML(s,page){const base=all().filter(i=>inSec(i,s));const l=base.filter(it=>page==='review'?!!flagOf(it):inPage(it,page));
    const r=filt(l);st.count=page==='review'?l.length:r.length;
    return`<div class="mc-page">${page==='review'?'<p class="mc-note">Türü ya da posteri kesin olmayanlar — onayla ya da doğru kaydı seç.</p>':''}
      ${page==='review'&&l.length?`<div class="mc-revl">${l.map(reviewRow).join('')}</div>`:r.length?gridHTML(r,s):secEmpty(s,l.length?'all':page)}</div>`}
  function reviewRow(it){return`<div class="mc-rr">${poster(it,'sm')}<div><b>${E(it.title)}</b><small>${E(TN[it.type])}${it.year?' · '+E(it.year):''} · ${it.flag==='type'?'Türü belirsiz':it.match==='none'?'Eşleşme bulunamadı':'Eşleşme kesin değil'}</small>
      <p>${E(it.flagWhy||(it.match==='none'?'Bu adla, bu türde güvenilir bir kayıt bulunamadı. Adı düzeltirsen ya da başka aday seçersen posteri gelir.':`“${it.wiki?decodeURIComponent(it.wiki).replace(/_/g,' '):it.title}” ile eşleştirdim ama adı ya da yılı birebir tutmuyor.`))}</p></div>
      <div class="mc-rb">${it.flag==='type'&&it.flagTo?`<button class="mb sm" data-mfix="move" data-id="${it.id}">${TN[it.flagTo]} yap</button>`:''}<button class="mb sm" data-mfix="ok" data-id="${it.id}">${IC.check}Doğru</button><button class="mb sm pri" data-mo="${it.id}">İncele</button></div></div>`}
  function searchHTML(){const qq=norm(st.qs),l=all().filter(i=>norm(i.title+' '+i.genres.join(' ')+' '+(i.wiki||'')).includes(qq));
    const g=s=>l.filter(i=>inSec(i,s));
    return`<div class="mc-page"><p class="mc-note">“${E(st.qs)}” için ${l.length} sonuç</p>${l.length?ORDER.map(s=>g(s).length?`<h3 class="mc-h3">${SEC[s].n}</h3>${gridHTML(g(s),s)}`:'').join(''):`<div class="mc-none"><span>${IC.search}</span><b>Bulunamadı</b><p>Başka bir ad dene ya da yeni içerik olarak ekle.</p><button class="mb pri" data-madd="${E(st.qs)}">${IC.plus}“${E(st.qs)}” ekle</button></div>`}</div>`}

  /* ── kabuk ── */
  const VIEWS=[['tv','Apple TV',IC.vtv],['nf','Netflix',IC.vnf],['compact','Kompakt',IC.vcp],['list','Liste',IC.vls]];
  const viewSeg=()=>`<div class="mc-vw" role="radiogroup" aria-label="Görünüm">${VIEWS.map(([k,n,ic])=>`<button role="radio" data-lv="${k}" aria-checked="${V()===k}" class="${V()===k?'on':''}" title="${n} görünümü" aria-label="${n} görünümü">${ic}</button>`).join('')}</div>`;
  function nav(){const tabs=[['home','Ana sayfa','#lib',IC.home],...ORDER.filter(k=>k===st.sec||!st.look.tabsOff.includes(k)).map(k=>[k,SEC[k].n,'#lib/m/'+k,IC[SEC[k].ic]])];
    const sub=st.sec!=='home'?SEC[st.sec].pages.map(([k,n])=>{const c=k==='home'?'':all().filter(i=>inSec(i,st.sec)&&inPage(i,k)).length;
        return`<a href="#lib/m/${st.sec}${k==='home'?'':'/'+k}" class="${st.page===k?'on':''}"${st.page===k?' aria-current="page"':''}>${n}${k==='home'?'':`<em>${c}</em>`}</a>`}).join('')+(()=>{const r=all().filter(i=>inSec(i,st.sec)&&flagOf(i)).length;return r?`<a href="#lib/m/${st.sec}/review" class="rev${st.page==='review'?' on':''}">${IC.warn}İnceleme<em>${r}</em></a>`:''})():'';
    return`<nav class="mc-nav" aria-label="Medya bölümleri"><a class="mc-brand" href="#lib" aria-label="Medya ana sayfa"><span>${IC.play}</span><b>Medya</b></a>
      <div class="mc-tabs">${tabs.map(([k,n,h,ic])=>`<a href="${h}" class="t-${k}${st.sec===k?' on':''}"${st.sec===k?' aria-current="page"':''}>${ic}<span>${n}</span></a>`).join('')}${st.look.tabsOff.includes('docs')?'':`<a href="#lib/docs" class="t-docs">${IC.link}<span>Belgeler</span></a>`}</div>
      <div class="mc-r"><span class="mc-sync" aria-live="polite"${R.busy?'':' hidden'}>${IC.sync}<span>${R.busy?syncTxt():''}</span></span></div></nav>${bar(sub)}`}
  /* sayfa kontrol alanı: solda başlık + durum sekmeleri, sağda araçlar (arama · filtre · görünüm · ayar).
     Kaydırınca saklanır (.sbar → Notlar'ın akıllı başlık denetleyicisi), yukarı kaydırınca geri gelir. */
  const countTxt=()=>{const n=st.count??0,s=st.sec;return`${n} ${s==='games'?'oyun':s==='books'?'kitap':s==='movies'?'film':s==='series'?'dizi':s==='anime'?'anime':'içerik'}`};
  function bar(sub){const home=st.sec==='home',list=!home&&st.page!=='home'&&st.page!=='review';
    const sel=(attr,label,opts,cur)=>`<label class="mc-fsel"><span class="vh">${label}</span><select ${attr} aria-label="${label}">${opts.map(([v,n])=>`<option value="${E(v)}"${String(cur)===String(v)?' selected':''}>${E(n)}</option>`).join('')}</select></label>`;
    let filters='';if(list){const base=all().filter(i=>inSec(i,st.sec)),g=topGenres(base).slice(0,20);
      filters=(g.length?sel('data-mgs','Tür',[['','Tüm türler'],...g.map(x=>[x,x])],st.genre):'')+sel('data-mmin','En düşük puan',[[0,'Tüm puanlar'],[7,'7 ve üstü'],[8,'8 ve üstü'],[9,'9 ve üstü']],+st.min)
        +sel('data-msort','Sıralama',[['added','Eklenme sırası'],['title','Ada göre'],['year','Yıla göre'],['score','Genel puana göre'],['rating','Puanıma göre']],st.sort)}
    const tools=`<div class="mc-tb"><label class="mc-s" title="Ara (/)">${IC.search}<input data-ms value="${E(st.qs)}" placeholder="Ara" aria-label="Film, dizi, anime, oyun ve kitap ara" autocomplete="off"></label>
      ${filters}${viewSeg()}<button class="mc-gear" data-mset aria-label="Görünüm ayarları" title="Görünüm ayarları" aria-haspopup="dialog">${IC.gear}</button>
      <button class="mc-add" data-madd title="Ekle (A)" aria-label="İçerik ekle">${IC.plus}<span>Ekle</span></button></div>`;
    if(home)return`<div class="mc-pbar sbar home">${tools}</div>`;
    const n=all().filter(i=>inSec(i,st.sec)).length;
    return`<div class="mc-pbar sbar"><div class="mc-pt"><h1>${E(SEC[st.sec].n)}</h1><span class="mc-pb-n">${n} ${countTxt().split(' ').slice(1).join(' ')}</span></div>${tools}
      ${sub?`<nav class="mc-sub" aria-label="${E(SEC[st.sec].n)} sayfaları">${sub}</nav>`:''}</div>`}
  const syncTxt=()=>`Posterler eşleşiyor ${R.done}/${R.total}`;
  function body(){if(st.qs)return searchHTML();if(st.sec==='home')return homeHTML();if(st.page==='home')return secHome(st.sec);return pageHTML(st.sec,st.page)}
  function parse(parts){const p=parts||[];let sec='home',page='home',gq='';if(p[0]==='m'){const k=p[1]==='tv'?'movies':p[1];sec=SEC[k]?k:'home';let pg=p[2]||'home';const i=pg.indexOf('?');if(i>=0){gq=decodeURIComponent((pg.slice(i+1).match(/g=([^&]*)/)||[])[1]||'');pg=pg.slice(0,i)}page=pg}
    return{sec,page,gq}}
  function render(parts,o={}){const p=parse(parts);const changed=p.sec!==st.sec||p.page!==st.page;st.base=parts||[];
    if(changed){st.kind='';st.genre='';st.min=0;st.hero=0}st.sec=p.sec;st.page=p.page;if(p.gq){st.genre=p.gq;st.page='all'}if(changed||!o.keepQ)st.qs='';
    const v=q('#view');let root=q('#view>.mc');if(!root){v.innerHTML='<div class="mc"></div>';root=q('#view>.mc');wire(root)}
    root.dataset.sec=st.sec;applyLook(root);const b=body();root.innerHTML=nav()+`<main class="mc-main">${b}</main>`;root.classList.toggle('has-hero',!!q('.mh',root));if(changed)enter(q('.mc-main',root));
    document.getElementById('app')?.classList.add('mc-on');
    if(typeof setCrumb==='function')setCrumb(IC.play,st.sec==='home'?'Medya':SEC[st.sec].n,'');
    if(changed&&!o.soft)q('#scroll').scrollTop=0;else if(changed)q('#scroll').scrollTop=0;
    heroStart();arrows();lazyWatch();Library.loadPack?.().then(migrate);queue()}
  function refresh(){const root=q('#view>.mc');if(!root)return;const sc=q('#scroll'),y=sc.scrollTop,rows=qa('.mc-row',root).map(r=>r.scrollLeft),f=document.activeElement,inS=f&&f.matches('[data-ms]');
    if(inS){const m=q('.mc-main',root);m.innerHTML=body()}else{const b=body();root.innerHTML=nav()+`<main class="mc-main">${b}</main>`;root.classList.toggle('has-hero',!!q('.mh',root))}
    lazyWatch();qa('.mc-row',root).forEach((r,i)=>r.scrollLeft=rows[i]||0);sc.scrollTop=y;heroStart();arrows();if(q('.mx-bg'))detailRefresh()}
  function arrows(){qa('.mc .mc-row').forEach(r=>{const w=r.closest('.mc-rw');const upd=()=>{w.classList.toggle('al',r.scrollLeft>8);w.classList.toggle('ar',r.scrollLeft+r.clientWidth<r.scrollWidth-8)};upd();r.onscroll=upd})}
  let rT=0;KB.on(()=>{if(!q('#view>.mc'))return;clearTimeout(rT);rT=setTimeout(()=>{const f=document.activeElement;if(f&&f.closest?.('.mx textarea,.mx input,.mx [contenteditable],.mq'))return detailRefresh(true);refresh()},140)});

  /* ── olaylar ── */
  function wire(root){
    root.addEventListener('pointerover',e=>{const c=e.target.closest?.('[data-mi]');if(c)fillHov(c)});root.addEventListener('focusin',e=>{const c=e.target.closest?.('[data-mi]');if(c)fillHov(c)});
    root.addEventListener('click',e=>{const t=e.target;
      const rw=t.closest('[data-row]');if(rw){const r=rw.parentElement.querySelector('.mc-row');r.scrollBy({left:+rw.dataset.row*r.clientWidth*.86,behavior:motion()?'smooth':'auto'});return}
      const hd=t.closest('[data-hd]');if(hd){heroGo(+hd.dataset.hd);return}
      const mk=t.closest('[data-mk]');if(mk){st.kind=mk.dataset.mk;swap();return}
      const lv=t.closest('[data-lv]');if(lv){setLook('view',lv.dataset.lv,true);q('.mset')&&qa('.mset [data-lk=view]').forEach(x=>{const on=x.dataset.lval===V();x.classList.toggle('on',on);x.setAttribute('aria-checked',on)});return}
      const ms=t.closest('[data-mset]');if(ms){q('.mset')?q('.mset').remove():settings(ms);return}
      const mg=t.closest('[data-mg]');if(mg){st.genre=mg.dataset.mg;swap();return}
      const ad=t.closest('[data-madd]');if(ad){addSheet(ad.dataset.madd||'');return}
      const fx=t.closest('[data-mfix]');if(fx){fix(fx.dataset.id,fx.dataset.mfix);return}
      const mq=t.closest('[data-mq]');if(mq){e.preventDefault();e.stopPropagation();const id=mq.dataset.id||mq.closest('[data-mi]')?.dataset.mi;if(mq.dataset.mq==='more')return menu(id,mq);if(mq.dataset.mq==='rate')return ratePop(id,mq);act(id,mq.dataset.mq);return}
      const mo=t.closest('[data-mo]');if(mo){open(mo.dataset.mo);return}
      const c=t.closest('[data-mi]');if(c&&!t.closest('a')){open(c.dataset.mi)}});
    root.addEventListener('keydown',e=>{const c=e.target.closest?.('[data-mi]');if(c&&e.target===c&&(e.key==='Enter'||e.key===' ')){e.preventDefault();open(c.dataset.mi)}
      if(c&&e.target===c&&(e.key==='ArrowRight'||e.key==='ArrowLeft')){const sib=e.key==='ArrowRight'?c.nextElementSibling:c.previousElementSibling;if(sib?.matches('[data-mi]')){e.preventDefault();sib.focus();sib.scrollIntoView({block:'nearest',inline:'nearest',behavior:motion()?'smooth':'auto'})}}
      if(e.target.matches('[data-ms]')){if(e.key==='Escape'){e.target.value='';st.qs='';refresh();e.target.blur()}if(e.key==='Enter'){const f=q('.mc-main [data-mi]');if(f)open(f.dataset.mi)}}});
    root.addEventListener('input',e=>{if(e.target.matches('[data-ms]')){clearTimeout(root.sT);root.sT=setTimeout(()=>{st.qs=e.target.value.trim();q('.mc-main',root).innerHTML=body();arrows();heroStart();lazyWatch()},140)}});
    root.addEventListener('change',e=>{if(e.target.matches('[data-mgs]')){st.genre=e.target.value;swap()}if(e.target.matches('[data-msort]')){st.sort=e.target.value;lss('mc:sort',st.sort);swap()}if(e.target.matches('[data-mmin]')){st.min=+e.target.value;swap()}});
    root.addEventListener('contextmenu',e=>{const c=e.target.closest('[data-mi]');if(!c)return;e.preventDefault();menu(c.dataset.mi,{getBoundingClientRect:()=>({left:e.clientX,right:e.clientX,top:e.clientY,bottom:e.clientY})})});
    // dokunmatik: kartın üstünde uzun bas → hızlı menü
    let lp=0;root.addEventListener('touchstart',e=>{const c=e.target.closest('[data-mi]');if(!c)return;lp=setTimeout(()=>{lp=-1;menu(c.dataset.mi,c)},520)},{passive:true});
    root.addEventListener('touchend',e=>{if(lp===-1){e.preventDefault()}clearTimeout(lp);lp=0});root.addEventListener('touchmove',()=>{clearTimeout(lp)},{passive:true})}
  /* görünüm ayarları: anında uygulanır, mc:look'a kaydedilir (içerik verisine dokunmaz) */
  function applyLook(root=q('#view>.mc')){if(!root)return;const L=st.look,F={s:.92,m:1,l:1.1},IZ={s:'14px',m:'16px',l:'19px'},DZ={r:1.22,n:1,s:.8};
    root.dataset.view=L.view;const sp=(k,v)=>root.style.setProperty(k,v);sp('--cz',L.cover/100);sp('--gz',L.gap/100);sp('--fz',F[L.font]||1);sp('--iz',IZ[L.icon]||'16px');sp('--dz',DZ[L.dens]||1);
    sp('--r',L.radius+'px');sp('--ar',(L.ar||100)/100);sp('--rh',L.rowh/100);root.toggleAttribute('data-notitle',!L.title);root.toggleAttribute('data-nometa',!L.meta);root.toggleAttribute('data-nobadge',!L.badge);
    const c=L.lc,W={st:'160px',rate:'76px',score:'84px',like:'56px',fav:'40px'},cov='calc(42px * var(--cz,1) * var(--rh,1))';
    sp('--lcols',[c.cover?cov:'','minmax(0,1fr)',...['st','rate','score','like','fav'].map(k=>c[k]?W[k]:'')].filter(Boolean).join(' '));
    sp('--lcols-m',[c.cover?cov:'','minmax(0,1fr)',c.rate?'auto':'',c.fav?'44px':''].filter(Boolean).join(' '))}
  function saveLook(){lss('mc:look',st.look)}
  /* bölüm/görünüm değişiminde kısa giriş (transform+opacity, ~280ms) */
  function enter(el){if(el&&motion())el.animate([{opacity:0,transform:'translateY(6px)'},{opacity:1,transform:'none'}],{duration:280,easing:'cubic-bezier(.16,1,.3,1)'})}
  function setLook(k,v,redraw){st.look[k]=v;lss('mc:look',st.look);applyLook();if(redraw){swap();enter(q('.mc .mc-main'));qa('.mc [data-lv]').forEach(b=>{const on=b.dataset.lv===V();b.classList.toggle('on',on);b.setAttribute('aria-checked',on)})}}
  /* boyut önizlemesi: kütüphaneden rastgele bir kapak; kenarından/köşesinden çekilerek bütün kartlar boyutlanır */
  let pvIt=null;
  const pvPick=()=>{if(pvIt&&KB.items.has(pvIt.id))return pvIt;const l=[...KB.items.values()].filter(i=>AT.includes(i.type)&&(i.cover||i.backdrop||i.wide));pvIt=l.length?l[Math.random()*l.length|0]:null;return pvIt};
  const pvBase=()=>V()==='tv'?{B:150,R:215/460}:{B:96,R:3/2};
  function pvHTML(){const L=st.look,it=pvPick()||{id:'',type:'movie',title:'Örnek film',cover:''},wide=V()==='tv',{B}=pvBase();
    return`<div class="mset-pv"><div class="mset-pf" style="width:${B*L.cover/100}px;--ar:${(L.ar||100)/100};--r:${L.radius}px">${wide?wideArt(it):poster(it)}
      <span class="mset-hx" data-pvh="x" tabindex="0" role="slider" aria-label="Kapak genişliği" aria-valuemin="60" aria-valuemax="160" aria-valuenow="${L.cover}" title="Genişlik · çift tıkla: sıfırla"></span>
      <span class="mset-hy" data-pvh="y" tabindex="0" role="slider" aria-label="Kapak yüksekliği" aria-valuemin="60" aria-valuemax="170" aria-valuenow="${L.ar||100}" title="Yükseklik · çift tıkla: sıfırla"></span>
      <span class="mset-hc" data-pvh="xy" title="İkisi birden · çift tıkla: sıfırla" aria-hidden="true"></span></div>
      <div class="mset-pc"${L.title?'':' hidden'}>${E(it.title)}</div><div class="mset-sz" aria-live="polite"></div></div>
      <p class="mset-hint">Kenarından ya da köşesinden çek · çift tık sıfırlar</p>`}
  // ekrandaki gerçek kartın boyu (px) — önizleme küçük ölçekli, bu sayı gerçeği söyler
  const realSize=()=>{const a=q('#view>.mc .mc-main .mc-art, #view>.mc .mc-art');if(!a)return'';const r=a.getBoundingClientRect();return r.width?`${Math.round(r.width)} × ${Math.round(r.height)} px`:''};
  function setHTML(){const L=st.look,seg=(k,o)=>`<div class="mset-seg" role="radiogroup">${o.map(([v,n])=>`<button role="radio" data-lk="${k}" data-lval="${v}" aria-checked="${L[k]===v}" class="${L[k]===v?'on':''}">${n}</button>`).join('')}</div>`;
    const rng=(k,n,min,max,stp,u='%')=>`<label for="mset-${k}">${n} <output>${L[k]}${u}</output></label><input id="mset-${k}" type="range" min="${min}" max="${max}" step="${stp}" value="${L[k]}" data-lr="${k}" data-u="${u}">`;
    const tg=(attr,k,n,on)=>`<button class="mset-tg" role="switch" ${attr}="${k}" aria-checked="${!!on}"><span>${n}</span><i aria-hidden="true"></i></button>`;
    const sh=L.shelves;
    return`<header><b>Görünüm</b><button class="mset-x" data-msx aria-label="Kapat">${IC.x}</button></header>
      <h4>Görünüm türü</h4>${seg('view',VIEWS.map(([k,n])=>[k,n]))}
      <h4>Kartlar</h4>${pvHTML()}<div class="mset-tgs">${tg('data-lt','title','Altında isim',L.title)}</div>${rng('cover','Kapak genişliği',60,160,5)}${rng('ar','Kapak yüksekliği',60,170,5)}${rng('radius','Köşe yuvarlaklığı',0,24,1,'px')}${rng('gap','Kart aralığı',40,220,10)}
      <label>Izgara yoğunluğu</label>${seg('dens',[['r','Rahat'],['n','Normal'],['s','Sıkı']])}
      <div class="mset-tgs">${tg('data-lt','meta','Yıl, tür, yazar',L.meta)}${tg('data-lt','badge','Genel puan rozeti',L.badge)}</div>
      <h4>Liste</h4>${rng('rowh','Satır yüksekliği',70,170,5)}
      <label>Sütunlar</label><div class="mset-tgs">${LC.map(([k,n])=>tg('data-lc',k,n,L.lc[k])).join('')}</div>
      <h4>Ana sayfa</h4><div class="mset-tgs">${tg('data-lt','hero','Büyük vitrin',L.hero)}</div>
      <label>Raflar — aç/kapat, sırala</label><div class="mset-shs">${sh.map((k,n)=>`<div class="mset-sh${L.off.includes(k)?' off':''}">${tg('data-lsh',k,SH[k],!L.off.includes(k)).replace('role="switch"',`role="switch" aria-label="${SH[k]} rafı"`)}
        <button data-lmv="${k}:-1" aria-label="${SH[k]} yukarı" ${n?'':'disabled'}>${IC.l}</button><button data-lmv="${k}:1" aria-label="${SH[k]} aşağı" ${n<sh.length-1?'':'disabled'}>${IC.r}</button></div>`).join('')}</div>
      <h4>Üstteki kategoriler</h4><div class="mset-tgs">${[...ORDER,'docs'].map(k=>{const n=k==='docs'?'Belgeler':SEC[k].n;return tg('data-ltab',k,n,!L.tabsOff.includes(k)).replace('role="switch"',`role="switch" aria-label="${n} sekmesi"`)}).join('')}</div>
      <h4>Yazı ve ikonlar</h4><label>Yazı boyutu</label>${seg('font',[['s','Küçük'],['m','Orta'],['l','Büyük']])}
      <label>İkon boyutu</label>${seg('icon',[['s','Küçük'],['m','Orta'],['l','Büyük']])}
      <button class="mset-r" data-msr>Hepsini varsayılana döndür</button>`}
  function settings(anchor){q('.mset')?.remove();const el=document.createElement('div');el.className='mset';el.setAttribute('role','dialog');el.setAttribute('aria-label','Görünüm ayarları');
    el.innerHTML=setHTML();document.body.appendChild(el);const place=()=>{const r=(q('[data-mset]')||anchor).getBoundingClientRect();el.style.top=Math.round(r.bottom+8)+'px';el.style.right=Math.max(8,Math.round(innerWidth-r.right))+'px'};place();
    const redrawPanel=focusSel=>{const y=el.scrollTop;el.innerHTML=setHTML();el.scrollTop=y;if(focusSel)el.querySelector(focusSel)?.focus()};
    const pvSync=()=>{const L=st.look,f=el.querySelector('.mset-pf');if(f){f.style.width=pvBase().B*L.cover/100+'px';f.style.setProperty('--ar',(L.ar||100)/100);f.style.setProperty('--r',L.radius+'px')}
      const c=el.querySelector('.mset-pc');if(c)c.hidden=!L.title;
      for(const k of ['cover','ar']){const r=el.querySelector('#mset-'+k);if(r&&+r.value!==L[k]){r.value=L[k];r.previousElementSibling.querySelector('output').textContent=L[k]+'%'}}
      el.querySelector('[data-pvh=x]')?.setAttribute('aria-valuenow',L.cover);el.querySelector('[data-pvh=y]')?.setAttribute('aria-valuenow',L.ar||100);
      const z=el.querySelector('.mset-sz');if(z)z.textContent=realSize()};
    const setSize=(cv,ar)=>{const L=st.look;if(cv===L.cover&&ar===(L.ar||100))return;L.cover=cv;L.ar=ar;applyLook();pvSync()};
    requestAnimationFrame(pvSync);
    el.addEventListener('dblclick',e=>{const h=e.target.closest('[data-pvh]');if(!h)return;const L=st.look,ax=h.dataset.pvh;setSize(ax==='y'?L.cover:100,ax==='x'?(L.ar||100):100);saveLook()});
    el.addEventListener('keydown',e=>{const h=e.target.closest('[data-pvh]');if(!h)return;const L=st.look,d=e.shiftKey?10:5,cl=(v,a,b)=>Math.max(a,Math.min(b,v));let cv=L.cover,ar=L.ar||100;
      if(e.key==='ArrowRight')cv+=d;else if(e.key==='ArrowLeft')cv-=d;else if(e.key==='ArrowDown')ar+=d;else if(e.key==='ArrowUp')ar-=d;else if(e.key==='Home'||e.key==='0'){cv=100;ar=100}else return;
      e.preventDefault();setSize(cl(cv,60,160),cl(ar,60,170));saveLook()});
    el.addEventListener('input',e=>{const t=e.target;if(t.dataset.lr){t.previousElementSibling.querySelector('output').textContent=t.value+t.dataset.u;setLook(t.dataset.lr,+t.value);pvSync()}});
    el.addEventListener('pointerdown',e=>{const h=e.target.closest('[data-pvh]');if(!h)return;e.preventDefault();const f=h.parentElement,ax=h.dataset.pvh,{B,R}=pvBase(),x0=e.clientX,y0=e.clientY,w0=f.offsetWidth,h0=f.offsetHeight;
      const L=st.look,c0=L.cover,a0=L.ar||100,cl=(v,a,b)=>{v=Math.abs(v-100)<=7?100:Math.round(v/5)*5;return Math.max(a,Math.min(b,v))};let raf=0,last=null;
      try{h.setPointerCapture(e.pointerId)}catch(_){}f.classList.add('drag');el.classList.add('see');document.body.classList.add('mset-drag');
      const step=()=>{raf=0;const ev=last;const w=ax==='y'?w0:w0+(ev.clientX-x0),hh=ax==='x'?h0*w/w0:h0+(ev.clientY-y0);
        const cv=ax==='y'?c0:cl(w/B*100,60,160),ar=ax==='x'?a0:cl(hh/(Math.max(1,B*cv/100)*R)*100,60,170);
        setSize(cv,ar)};
      const mv=ev=>{last=ev;if(!raf)raf=requestAnimationFrame(step)};
      const up=()=>{h.removeEventListener('pointermove',mv);h.removeEventListener('pointerup',up);h.removeEventListener('pointercancel',up);if(raf){cancelAnimationFrame(raf);raf=0;if(last)step()}f.classList.remove('drag');el.classList.remove('see');document.body.classList.remove('mset-drag');saveLook()};
      h.addEventListener('pointermove',mv);h.addEventListener('pointerup',up);h.addEventListener('pointercancel',up)});
    el.addEventListener('click',e=>{const t=e.target,L=st.look;if(t.closest('[data-msx]'))return el.remove();
      if(t.closest('[data-msr]')){st.look=JSON.parse(JSON.stringify(LOOK0));saveLook();applyLook();refresh();redrawPanel();return}
      const b=t.closest('[data-lk]');if(b){setLook(b.dataset.lk,b.dataset.lval,b.dataset.lk==='view');if(b.dataset.lk==='view'){redrawPanel();return}qa(`[data-lk="${b.dataset.lk}"]`,el).forEach(x=>{const on=x===b;x.classList.toggle('on',on);x.setAttribute('aria-checked',on)});return}
      const tg=t.closest('[data-lt]');if(tg){const k=tg.dataset.lt;setLook(k,L[k]?0:1,k==='hero');tg.setAttribute('aria-checked',!!L[k]);pvSync();return}
      const lc=t.closest('[data-lc]');if(lc){const k=lc.dataset.lc;L.lc[k]=L.lc[k]?0:1;saveLook();applyLook();swap();lc.setAttribute('aria-checked',!!L.lc[k]);return}
      const shb=t.closest('[data-lsh]');if(shb){const k=shb.dataset.lsh;L.off=L.off.includes(k)?L.off.filter(x=>x!==k):[...L.off,k];saveLook();swap();redrawPanel(`[data-lsh="${k}"]`);return}
      const mv=t.closest('[data-lmv]');if(mv){const[k,d]=mv.dataset.lmv.split(':'),a=L.shelves,i=a.indexOf(k),j=i+ +d;if(j<0||j>=a.length)return;[a[i],a[j]]=[a[j],a[i]];saveLook();swap();redrawPanel(`[data-lmv="${k}:${d}"]:not([disabled])`)||0;return}
      const tb=t.closest('[data-ltab]');if(tb){const k=tb.dataset.ltab;L.tabsOff=L.tabsOff.includes(k)?L.tabsOff.filter(x=>x!==k):[...L.tabsOff,k];saveLook();refresh();place();tb.setAttribute('aria-checked',!L.tabsOff.includes(k));return}});
    setTimeout(()=>el.querySelector('button.on,input')?.focus(),0)}
  addEventListener('pointerdown',e=>{const m=q('.mset');if(m&&!m.contains(e.target)&&!e.target.closest('[data-mset]'))m.remove()});
  addEventListener('keydown',e=>{if(e.key==='Escape'&&q('.mset')){q('.mset').remove();q('[data-mset]')?.focus()}});
  function swap(){const m=q('.mc .mc-main');if(!m)return;const y=q('#scroll').scrollTop;m.innerHTML=body();q('#scroll').scrollTop=y;arrows();lazyWatch()}
  addEventListener('keydown',e=>{if(!q('#view>.mc')||e.metaKey||e.ctrlKey||e.altKey)return;if(e.target.closest?.('input,textarea,select,[contenteditable]'))return;if(q('.mx-bg,.ma-bg,.mq,.pal-bg'))return;
    if(e.key==='/'){e.preventDefault();q('.mc [data-ms]')?.focus()}else if(e.key==='a'||e.key==='A'){e.preventDefault();addSheet()}});

  function open(id){if(KB.items.has(id))go('#lib/i/'+id)}
  function setStatus(it,s){const was=it.status;it.status=it.status===s&&s!=='todo'?'':s;if(s==='doing'&&it.type==='series'&&!it.season)it.season=1;KB.saveItem(it);
    const n=stName(it);say(n?`“${it.title}” → ${n}`:`“${it.title}” listeden çıkarıldı`);return was}
  function act(id,k){const it=KB.items.get(id);if(!it)return;if(k==='fav'){it.fav=!it.fav;KB.saveItem(it);say(it.fav?'Favorilere eklendi':'Favorilerden çıkarıldı');return}
    if(k==='todo'&&it.status&&it.status!=='todo'){it.status='todo';KB.saveItem(it);say(`“${it.title}” tekrar listede`);return}setStatus(it,k)}
  function fix(id,k){const it=KB.items.get(id);if(!it)return;if(k==='ok'){it.reviewed=true;if(it.match==='unsure')it.match='manual';KB.saveItem(it);say('Onaylandı')}
    else if(k==='move'){const to=it.flagTo;if(!to)return;it.type=to;it.flag='';it.flagWhy='';it.flagTo='';it.match='';it.metaAt=0;it.cover='';it.cover2='';it.backdrop='';it.wide='';it.year='';it.genres=[];it.platforms=[];it.eps=0;it.season=0;it.ep=0;HINT.delete(hk(it));it.reviewed=false;if(it.status==='done'&&to==='game')it.status='done';KB.saveItem(it);say(`${TN[to]} olarak taşındı — posteri aranıyor`);queue()}}
  function menu(id,anchor){q('.mq')?.remove();const it=KB.items.get(id);if(!it)return;const m=document.createElement('div');m.className='mq';m.setAttribute('role','menu');
    m.innerHTML=`<p>${E(it.title)}</p>${Object.entries(stMap(it)).map(([k,n])=>`<button role="menuitemradio" aria-checked="${it.status===k}" data-q="${k}" class="${it.status===k?'on':''}">${it.status===k?IC.check:'<i></i>'}${n}</button>`).join('')}
      <div class="sep"></div><button data-q="rate">${IC.star}${it.rating?`Puanım ${it.rating}/10 — değiştir`:'Puanla'}</button><button data-q="fav">${IC.heart}${it.fav?'Favorilerden çıkar':'Favorilere ekle'}</button><button data-q="open">${IC.r}Ayrıntılar</button><button data-q="rematch">${IC.sync}Posteri yeniden eşleştir</button><div class="sep"></div><button data-q="del" class="danger">${IC.trash}Sil</button>`;
    document.body.appendChild(m);const r=anchor.getBoundingClientRect();m.style.left=Math.max(8,Math.min(r.left,innerWidth-m.offsetWidth-8))+'px';m.style.top=Math.max(8,Math.min(r.bottom+6,innerHeight-m.offsetHeight-8))+'px';
    q('button',m)?.focus();const off=e=>{if(!m.isConnected||!m.contains(e.target)){m.remove();removeEventListener('pointerdown',off,true)}};setTimeout(()=>addEventListener('pointerdown',off,true));
    m.addEventListener('keydown',e=>{if(e.key==='Escape'){m.remove();anchor.focus?.()}const bs=qa('button',m),i=bs.indexOf(document.activeElement);if(e.key==='ArrowDown'){e.preventDefault();bs[(i+1)%bs.length].focus()}if(e.key==='ArrowUp'){e.preventDefault();bs[(i-1+bs.length)%bs.length].focus()}});
    m.addEventListener('click',e=>{const b=e.target.closest('[data-q]');if(!b)return;m.remove();const k=b.dataset.q;if(k==='rate')return ratePop(id,anchor);if(k==='fav')act(id,'fav');else if(k==='open')open(id);else if(k==='rematch')rematch(it);
      else if(k==='del'){const snap=KB.delItem(id);try{Library.toastUndo(`“${it.title}” silindi`,()=>KB.restoreItem(snap))}catch{say('Silindi')}}else{if(it.status===k){it.status='';KB.saveItem(it);say('Durum kaldırıldı')}else setStatus(it,k)}})}

  /* ── detay ── */
  let dId=null;
  function detail(id){const it=KB.items.get(id);if(!it)return;close(true);dId=id;try{it.opened=Date.now();KB.saveItem(it,true)}catch{}
    const bg=document.createElement('div');bg.className='mx-bg';bg.dataset.sec=secOf(it.type);bg.innerHTML=detailHTML(it);document.body.appendChild(bg);wireDetail(bg);
    if(motion()){bg.animate([{opacity:0},{opacity:1}],{duration:220,easing:'ease-out'});q('.mx',bg).animate([{opacity:0,transform:'translateY(28px) scale(.985)'},{opacity:1,transform:'none'}],{duration:560,easing:'cubic-bezier(.16,1,.3,1)'})}
    setTimeout(()=>q('[data-mx]',bg)?.focus({preventScroll:true}),60)}
  function detailRefresh(soft){const bg=q('.mx-bg');if(!bg||!dId)return;const it=KB.items.get(dId);if(!it)return close();if(soft)return;const a=document.activeElement;if(a&&bg.contains(a)&&a.matches('textarea,input,[contenteditable],select'))return;
    const sc=q('.mx',bg).scrollTop;bg.dataset.sec=secOf(it.type);bg.innerHTML=detailHTML(it);q('.mx',bg).scrollTop=sc}
  function close(instant){const bg=q('.mx-bg');dId=null;if(!bg)return;if(instant||!motion())return bg.remove();bg.style.pointerEvents='none';bg.animate([{opacity:1},{opacity:0}],{duration:170}).finished.then(()=>bg.remove(),()=>bg.remove())}
  const back=()=>{if(location.hash.startsWith('#lib/i/')&&history.length>1)history.back();else go('#lib'+(st.base.length?'/'+st.base.join('/'):''))};
  function rateHTML(it){const v=it.rating,L=[[1,'Beğendim',IC.up],[-1,'Beğenmedim',IC.down],[0,'Değerlendirmedim','']];
    return`<div class="rt" data-rid="${E(it.id)}"><div class="rt-l" role="radiogroup" aria-label="Değerlendirme">${L.map(([k,n,ic])=>`<button role="radio" data-rlike="${k}" aria-checked="${(it.like||0)===k}" class="${(it.like||0)===k?'on':''}">${ic}${n}</button>`).join('')}</div>
      <div class="rt-n" role="radiogroup" aria-label="Puanım (10 üzerinden)">${[1,2,3,4,5,6,7,8,9,10].map(n=>`<button role="radio" data-rnum="${n}" aria-checked="${v===n}" class="${n<=v?'in':''}${v===n?' on':''}" aria-label="${n} puan">${n}</button>`).join('')}<b>${v?v+'<small>/10</small>':'<small>Puan vermedin</small>'}</b></div>
      <button class="rt-f${it.fav?' on':''}" data-rfav aria-pressed="${it.fav}">${IC.heart}${it.fav?'Favorilerimde':'Favorilere ekle'}</button></div>`}
  document.addEventListener('click',e=>{const box=e.target.closest?.('.rt[data-rid]');if(!box)return;const it=KB.items.get(box.dataset.rid);if(!it)return;
    const lk=e.target.closest('[data-rlike]'),nm=e.target.closest('[data-rnum]'),fv=e.target.closest('[data-rfav]');if(!lk&&!nm&&!fv)return;e.preventDefault();e.stopPropagation();
    if(lk)it.like=+lk.dataset.rlike;if(nm){const n=+nm.dataset.rnum;it.rating=it.rating===n?0:n}if(fv)it.fav=!it.fav;
    KB.saveItem(it,true);box.outerHTML=rateHTML(it);q(`.rt[data-rid="${CSS.escape(it.id)}"] ${lk?`[data-rlike="${lk.dataset.rlike}"]`:nm?`[data-rnum="${nm.dataset.rnum}"]`:'[data-rfav]'}`)?.focus();
    clearTimeout(rateHTML.t);rateHTML.t=setTimeout(()=>KB.saveItem(it),400)},true);
  /* hızlı puan penceresi: karttan, listeden, sağ tıktan */
  function ratePop(id,anchor){q('.mrp')?.remove();q('.mq')?.remove();const it=KB.items.get(id);if(!it)return;const m=document.createElement('div');m.className='mrp';m.setAttribute('role','dialog');m.setAttribute('aria-label',`${it.title} — puanla`);
    m.innerHTML=`<p>${E(it.title)}</p>${rateHTML(it)}`;document.body.appendChild(m);
    const r=(anchor.getBoundingClientRect?anchor:anchor).getBoundingClientRect();m.style.left=Math.max(8,Math.min(r.left,innerWidth-m.offsetWidth-8))+'px';m.style.top=Math.max(8,r.bottom+m.offsetHeight+6>innerHeight?r.top-m.offsetHeight-6:r.bottom+6)+'px';
    (q('.rt-n button.on',m)||q('.rt-n button',m))?.focus();
    const off=e=>{if(!m.isConnected||!m.contains(e.target)){m.remove();removeEventListener('pointerdown',off,true)}};setTimeout(()=>addEventListener('pointerdown',off,true));
    m.addEventListener('keydown',e=>{if(e.key==='Escape'){m.remove();anchor.focus?.()}if(/^[0-9]$/.test(e.key)){const n=e.key==='0'?10:+e.key;q(`[data-rnum="${n}"]`,m)?.click()}})}
  function stars(it){const v=it.rating;return`<div class="mx-rate" role="slider" tabindex="0" aria-label="Puanım" aria-valuemin="0" aria-valuemax="10" aria-valuenow="${v}" aria-valuetext="${v?v+' / 10':'puan yok'}">${[1,2,3,4,5].map(n=>`<button tabindex="-1" data-rs="${n}" aria-label="${n*2} puan"><i style="--f:${Math.max(0,Math.min(1,(v-(n-1)*2)/2))*100}%">${IC.star}${IC.star}</i></button>`).join('')}<b>${v?v+'<small>/10</small>':'—'}</b></div>`}
  function detailHTML(it){const s=secOf(it.type),g=it.type==='game',f=flagOf(it),wide=!!it.backdrop;
    const links=[it.wiki&&[`https://${it.wiki.startsWith('tr:')?'tr':'en'}.wikipedia.org/wiki/${it.wiki.replace(/^tr:/,'')}`,'Wikipedia'],it.imdb&&[`https://www.imdb.com/title/${it.imdb}/`,'IMDb'],it.mal&&[`https://myanimelist.net/anime/${it.mal}`,'MyAnimeList'],it.steam&&[`https://store.steampowered.com/app/${it.steam}/`,'Steam']].filter(Boolean);
    return`<article class="mx" role="dialog" aria-modal="true" aria-label="${E(it.title)}">
      <div class="mx-hero"><div class="mx-bd ${wide?'wide':'post'}">${IMG(it.backdrop||it.cover,wide?it.cover:it.cover2,'',true)}</div><div class="mx-sh"></div>
        <button class="mx-x" data-mx aria-label="Kapat (Esc)" title="Kapat">${IC.x}</button>
        <div class="mx-head">${poster(it,'mx-p')}<div class="mx-ti"><a class="mx-k" href="#lib/m/${s}">${IC[SEC[s].ic]}${SEC[s].n}</a>
          <h1>${E(it.title)}</h1><p class="mx-m">${metaLong(it,true)}${it.score?`<span class="mh-sc">${scoreTxt(it)}</span>`:''}</p>
          <div class="mx-st" role="radiogroup" aria-label="${g?'Oynama':'İzlenme'} durumu">${Object.entries(stMap(it)).map(([k,n])=>`<button role="radio" aria-checked="${it.status===k}" class="${it.status===k?'on':''}" data-ds="${k}">${it.status===k?IC.check:''}${n}</button>`).join('')}</div>
          <div class="mx-rt">${rateHTML(it)}</div></div></div></div>
      <div class="mx-body"><div class="mx-main">
        ${f?flagBox(it):''}
        ${it.desc?`<p class="mx-d">${E(it.desc)}</p>`:`<p class="mx-d dim">${it.match?'Açıklama bulunamadı.':'Bilgiler aranıyor…'}</p>`}
        ${(it.type==='series'||it.type==='anime')&&it.status!=='todo'?`<section class="mx-s"><h3>Nerede kaldın</h3><div class="mx-prog">${it.type==='series'?`<span class="mx-step"><em>Sezon</em><button data-step="season:-1" aria-label="Sezonu azalt">${IC.minus}</button><b>${it.season||1}</b><button data-step="season:1" aria-label="Sezonu artır">${IC.plus}</button></span>`:''}
            <span class="mx-step"><em>Bölüm</em><button data-step="ep:-1" aria-label="Bölümü azalt">${IC.minus}</button><b>${it.ep||0}</b><button data-step="ep:1" aria-label="Bölümü artır">${IC.plus}</button>${it.eps?`<small>/ ${it.eps}</small>`:''}</span>
            ${it.eps?`<span class="mx-bar"><i style="width:${Math.min(100,Math.round((it.ep||0)/it.eps*100))}%"></i></span>`:''}</div></section>`:''}
        <section class="mx-s"><h3>Notlarım</h3><textarea data-dn aria-label="Notlarım" placeholder="${g?'Nerede kaldın, neyi sevdin, hangi zorlukta oynuyorsun…':'Ne düşündün, en sevdiğin sahne, kimle izledin…'}">${E(it.note)}</textarea></section>
        <section class="mx-s mx-edit" hidden><h3>Düzenle</h3><div class="mx-form">
          <label>Ad<input data-ef="title" value="${E(it.title)}"></label><label>Tür<select data-ef="type">${MT.map(t=>`<option value="${t}"${t===it.type?' selected':''}>${TN[t]}</option>`).join('')}</select></label>
          <label>Yıl<input data-ef="year" inputmode="numeric" value="${E(it.year)}" maxlength="4"></label><label class="w">Türler (virgülle)<input data-ef="genres" value="${E(it.genres.join(', '))}"></label>
          ${g?`<label class="w">Platform (virgülle)<input data-ef="platforms" value="${E(it.platforms.join(', '))}" placeholder="PC, PS5, Switch"></label>`:''}
          <div class="mx-fb"><button class="mb" data-eclose>Vazgeç</button><button class="mb pri" data-esave>Kaydet</button></div></div></section>
        <section class="mx-s mx-pick" hidden></section></div>
      <aside class="mx-side">
        <dl class="mx-dl">${it.year?`<dt>Yıl</dt><dd>${E(it.year)}</dd>`:''}${it.genres.length?`<dt>Tür</dt><dd>${it.genres.map(E).join(', ')}</dd>`:''}${g&&it.platforms.length?`<dt>Platform</dt><dd>${it.platforms.map(p=>`<span class="pf">${E(p)}</span>`).join('')}</dd>`:''}
          ${it.eps?`<dt>Bölüm</dt><dd>${it.eps}</dd>`:''}${it.score?`<dt>Genel puan</dt><dd>${E(it.score)}</dd>`:''}<dt>Eklenme</dt><dd>${new Date(it.added).toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'})}</dd>
          <dt>Eşleşme</dt><dd>${matchTxt(it)}</dd></dl>
        ${links.length?`<div class="mx-links">${links.map(([u,n])=>`<a href="${E(u)}" target="_blank" rel="noopener">${n}${IC.link}</a>`).join('')}</div>`:''}
        <div class="mx-acts"><button class="mb" data-eopen>${IC.edit}Düzenle</button><button class="mb" data-rem>${IC.sync}Yeniden eşleştir</button><button class="mb" data-pick>${IC.search}Başka kayıt seç</button><button class="mb danger" data-del>${IC.trash}Sil</button></div>
      </aside></div></article>`}
  function matchTxt(it){const src=it.steam?'Steam':it.mal?'MyAnimeList':it.imdb&&it.type==='series'?'TVmaze':it.cover?'Wikipedia/iTunes':'—';
    return it.match==='ok'?`<span class="mt ok">Kesin</span> · ${src}`:it.match==='manual'?`<span class="mt ok">Onayladın</span> · ${src}`:it.match==='unsure'?`<span class="mt un">Emin değilim</span> · ${src}`:it.match==='none'?'<span class="mt no">Bulunamadı</span>':R.busy?'Aranıyor…':'Bekliyor'}
  function flagBox(it){const ty=it.flag==='type';
    return`<div class="mx-flag">${IC.warn}<div><b>${ty?'Türünden emin değilim':it.match==='none'?'Güvenilir bir eşleşme bulamadım':'Bu eşleşmeden emin değilim'}</b>
      <p>${E(it.flagWhy||(it.match==='none'?'Bu ad ve türde güvenilir bir kayıt yok; yanlış poster koymamak için tasarlanmış kapak kullanıyorum.':`“${(it.wiki||it.title).replace(/^tr:/,'').replace(/_/g,' ')}”${it.year?' ('+it.year+')':''} ile eşleştirdim ama ad ya da yıl birebir tutmuyor.`))}</p>
      <div class="mx-fb">${ty&&it.flagTo?`<button class="mb sm pri" data-mfx="move">${TN[it.flagTo]} olarak taşı</button>`:''}<button class="mb sm" data-mfx="ok">${IC.check}${ty?'Böyle kalsın':'Doğru'}</button><button class="mb sm" data-pick>${IC.search}Başka kayıt seç</button></div></div></div>`}
  function wireDetail(bg){
    bg.addEventListener('click',e=>{const t=e.target,it=KB.items.get(dId);if(!it)return;
      if(t===bg||t.closest('[data-mx]'))return back();
      const ds=t.closest('[data-ds]');if(ds){if(it.status===ds.dataset.ds){it.status='';KB.saveItem(it)}else setStatus(it,ds.dataset.ds);detailRefresh();return}
      if(t.closest('[data-dfav]')){act(it.id,'fav');detailRefresh();return}
      const rs=t.closest('[data-rs]');if(rs){const r=rs.getBoundingClientRect(),half=(e.clientX-r.left)<r.width/2,n=+rs.dataset.rs,v=n*2-(half?1:0);it.rating=it.rating===v?0:v;KB.saveItem(it);detailRefresh();return}
      const sp=t.closest('[data-step]');if(sp){const[k,d]=sp.dataset.step.split(':');let v=Math.max(k==='season'?1:0,(it[k]||(k==='season'?1:0))+ +d);if(k==='ep'&&it.eps)v=Math.min(it.eps,v);it[k]=v;
        if(k==='season'&&+d>0)it.ep=0;if(it.status!=='doing'&&it.status!=='done')it.status='doing';KB.saveItem(it);detailRefresh();if(k==='ep'&&it.eps&&v===it.eps&&it.status!=='done')say('Son bölüm! “İzledim” yapmak ister misin?',{});return}
      const fx=t.closest('[data-mfx]');if(fx){fix(it.id,fx.dataset.mfx);detailRefresh();return}
      if(t.closest('[data-eopen]')){const s=q('.mx-edit',bg);s.hidden=false;s.scrollIntoView({block:'center',behavior:motion()?'smooth':'auto'});q('[data-ef=title]',s).focus();return}
      if(t.closest('[data-eclose]')){q('.mx-edit',bg).hidden=true;return}
      if(t.closest('[data-esave]')){const g=k=>q(`[data-ef=${k}]`,bg)?.value.trim();const ty=g('type'),tc=ty!==it.type,ti=g('title')||it.title,tchg=ti!==it.title;
        it.title=ti;it.year=(g('year')||'').replace(/\D/g,'').slice(0,4);it.genres=(g('genres')||'').split(',').map(x=>x.trim()).filter(Boolean);if(q('[data-ef=platforms]',bg))it.platforms=g('platforms').split(',').map(x=>x.trim()).filter(Boolean);
        if(tc){it.type=ty;it.flag='';it.flagWhy='';it.flagTo=''}if(tc||tchg){it.match='';it.metaAt=0;it.reviewed=false;it.cover='';it.cover2='';it.backdrop='';it.wide='';HINT.delete(hk(it))}KB.saveItem(it);say(tc||tchg?'Kaydedildi — posteri yeniden aranıyor':'Kaydedildi');if(tc||tchg)queue();detailRefresh();return}
      if(t.closest('[data-rem]')){rematch(it);return}
      if(t.closest('[data-pick]')){pickUI(it,bg);return}
      const pc=t.closest('[data-pq]');if(pc){choose(it,pc.dataset.pq);return}
      if(t.closest('[data-pnone]')){Object.assign(it,{cover:'',cover2:'',backdrop:'',wide:'',match:'manual',reviewed:true});KB.saveItem(it);say('Tasarlanmış kapak kullanılacak');detailRefresh();return}
      if(t.closest('[data-del]')){const name=it.title,snap=KB.delItem(it.id);back();try{Library.toastUndo(`“${name}” silindi`,()=>KB.restoreItem(snap))}catch{say('Silindi')}}});
    bg.addEventListener('keydown',e=>{if(e.key==='Escape'&&!e.target.closest('input,textarea,select')){e.preventDefault();e.stopPropagation();back();return}
      if(e.target.matches('.mx-rate')){const it=KB.items.get(dId);if(!it)return;if(e.key==='ArrowRight'||e.key==='ArrowUp'){e.preventDefault();it.rating=Math.min(10,it.rating+1);KB.saveItem(it);detailRefresh();q('.mx-rate')?.focus()}
        if(e.key==='ArrowLeft'||e.key==='ArrowDown'){e.preventDefault();it.rating=Math.max(0,it.rating-1);KB.saveItem(it);detailRefresh();q('.mx-rate')?.focus()}}
      if(e.target.matches('[data-pin]')&&e.key==='Enter'){e.preventDefault();const it=KB.items.get(dId);candidates(it,e.target.value.trim(),q('.mx-pick',bg))}
      // Tab odağı pencerenin içinde kalsın
      if(e.key==='Tab'){const f=qa('button,a[href],input,textarea,select,[tabindex="0"]',bg).filter(x=>!x.closest('[hidden]')&&x.offsetParent);if(!f.length)return;const a=f[0],z=f[f.length-1];
        if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus()}else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus()}}});
    bg.addEventListener('input',e=>{if(e.target.matches('[data-dn]')){clearTimeout(bg.nT);bg.nT=setTimeout(()=>{const it=KB.items.get(dId);if(it){it.note=e.target.value;KB.saveItem(it,true)}},500)}});
    bg.addEventListener('focusout',e=>{if(e.target.matches?.('[data-dn]')){const it=KB.items.get(dId);if(it&&it.note!==e.target.value){it.note=e.target.value;KB.saveItem(it,true)}}})}

  /* ════════ eşleştirme motoru ════════ */
  const HINT=new Map(),hk=it=>it.type+'|'+KB.low(it.title);
  const CLS={movie:'wd:Q11424 wd:Q24869 wd:Q202866 wd:Q506240 wd:Q20650540 wd:Q24862',
    series:'wd:Q5398426 wd:Q581714 wd:Q1259759 wd:Q526877 wd:Q15416 wd:Q63952888',
    anime:'wd:Q63952888 wd:Q20650540 wd:Q1107 wd:Q581714 wd:Q5398426 wd:Q202866 wd:Q11424 wd:Q24869',
    game:'wd:Q7889 wd:Q7058673 wd:Q4393107 wd:Q65963104 wd:Q16070115'};
  const R={busy:false,done:0,total:0,list:[],stats:{ok:0,un:0,no:0},off:false};
  const needs=it=>MT.includes(it.type)&&!it.metaAt&&!it.reviewed;
  // Notion paketindeki ipuçları (İngilizce ad + yıl) ve şüpheli kayıt işaretleri — bir kez uygulanır, kullanıcı kararlarına dokunmaz
  function migrate(pack){if(!pack)return;for(const x of pack.items){HINT.set(x.type+'|'+KB.low(x.title),{en:x.en||x.title,y:+x.y||0})}
    const key='mc:mig:'+pack.updated;if(lsg(key,0))return;let n=0;
    for(const it of all()){const x=pack.items.find(p=>'notion:'+p.type+':'+KB.low(p.title)===it.src);if(!x)continue;
      if(x.flag&&!it.flag&&!it.reviewed){it.flag=x.flag;it.flagWhy=x.why||'';it.flagTo=x.to||'';KB.saveItem(it,true);n++}}
    lss(key,1);if(n){KB.emit('items')}queue()}
  const sq=s=>String(s).replace(/\\/g,'\\\\').replace(/"/g,'\\"');
  const sparql=(s,lang,type)=>`SELECT ?item ?num ?label ?trl ?desc ?date ?en ?tr ?imdb ?steam ?mal ?gl ?pl WHERE {
 SERVICE wikibase:mwapi { bd:serviceParam wikibase:endpoint "www.wikidata.org"; wikibase:api "EntitySearch"; mwapi:search "${sq(s)}"; mwapi:language "${lang}". ?item wikibase:apiOutputItem mwapi:item. ?num wikibase:apiOrdinal true. }
 ?item wdt:P31 ?cls. VALUES ?cls { ${CLS[type]} }
 OPTIONAL{?item rdfs:label ?label FILTER(LANG(?label)="en")} OPTIONAL{?item rdfs:label ?trl FILTER(LANG(?trl)="tr")} OPTIONAL{?item schema:description ?desc FILTER(LANG(?desc)="en")}
 OPTIONAL{?item wdt:P577 ?date} OPTIONAL{?en schema:about ?item; schema:isPartOf <https://en.wikipedia.org/>} OPTIONAL{?tr schema:about ?item; schema:isPartOf <https://tr.wikipedia.org/>}
 OPTIONAL{?item wdt:P345 ?imdb} OPTIONAL{?item wdt:P1733 ?steam} OPTIONAL{?item wdt:P4086 ?mal}
 OPTIONAL{?item wdt:P136 ?g. ?g rdfs:label ?gl FILTER(LANG(?gl)="tr" || LANG(?gl)="en")} OPTIONAL{?item wdt:P400 ?p. ?p rdfs:label ?pl FILTER(LANG(?pl)="en")}
} LIMIT 600`;
  class NetErr extends Error{}
  async function getJSON(u,o){let r;try{r=await fetch(u,o)}catch(e){throw new NetErr(e.message)}if(r.status===429){await new Promise(z=>setTimeout(z,1600));r=await fetch(u,o).catch(e=>{throw new NetErr(e.message)})}
    if(r.status===404)return null;if(!r.ok)throw new Error('HTTP '+r.status);return r.json()}
  async function wd(s,lang,type){if(!s)return[];const j=await getJSON('https://query.wikidata.org/sparql?format=json&query='+encodeURIComponent(sparql(s,lang,type)),{headers:{Accept:'application/sparql-results+json'}});
    const m=new Map();for(const r of j?.results?.bindings||[]){const v=k=>r[k]?.value||'';const id=v('item').split('/').pop();if(!id)continue;let o=m.get(id);
      if(!o){o={id,num:+v('num')||0,label:'',trl:'',desc:'',years:new Set(),en:'',tr:'',imdb:'',steam:'',mal:'',gtr:new Set(),gen:new Set(),pl:new Set()};m.set(id,o)}
      if(v('label'))o.label=v('label');if(v('trl'))o.trl=v('trl');if(v('desc'))o.desc=v('desc');const y=parseInt(v('date').replace(/^\+/,''),10);if(y>1800)o.years.add(y);
      if(v('en'))o.en=decodeURIComponent(v('en').split('/wiki/')[1]||'');if(v('tr'))o.tr=decodeURIComponent(v('tr').split('/wiki/')[1]||'');if(v('imdb'))o.imdb=v('imdb');if(v('steam'))o.steam=v('steam');if(v('mal'))o.mal=v('mal');
      if(v('gl'))(r.gl['xml:lang']==='tr'?o.gtr:o.gen).add(v('gl'));if(v('pl'))o.pl.add(v('pl'))}
    return[...m.values()].map(o=>({...o,year:o.years.size?Math.min(...o.years):0})).sort((a,b)=>a.num-b.num)}
  function rank(cands,hint,title){const H=norm(hint.en),T=norm(title);
    for(const c of cands){const L=[c.label,c.trl].map(norm);c.exact=L.some(l=>l&&(l===H||l===T));let s=-c.num*.35+(c.exact?5:0);
      if(hint.y&&c.year){const d=Math.abs(c.year-hint.y);s+=d===0?4:d<=1?3:d<=3?0:-5}if(c.imdb||c.steam||c.mal)s+=.6;if(c.en)s+=.4;c.score=s}
    cands.sort((a,b)=>b.score-a.score);const c=cands[0];if(!c)return null;const yOk=!hint.y||!c.year||Math.abs(c.year-hint.y)<=1;c.conf=c.exact&&yOk?'ok':'unsure';return c}
  const GTR={action:'Aksiyon',adventure:'Macera',comedy:'Komedi',drama:'Dram',fantasy:'Fantastik','science fiction':'Bilimkurgu','science-fiction':'Bilimkurgu','sci-fi':'Bilimkurgu',horror:'Korku',thriller:'Gerilim',mystery:'Gizem',romance:'Romantik',
    'romantic comedy':'Romantik komedi',crime:'Suç',supernatural:'Doğaüstü',sports:'Spor',family:'Aile',music:'Müzik',musical:'Müzikal',history:'Tarih',historical:'Tarihî',war:'Savaş',western:'Western',espionage:'Casusluk',legal:'Hukuk',medical:'Tıp',
    'slice of life':'Gündelik hayat',psychological:'Psikolojik',suspense:'Gerilim',mecha:'Mecha','award winning':'Ödüllü',animation:'Animasyon',biographical:'Biyografi',biography:'Biyografi',documentary:'Belgesel',superhero:'Süper kahraman','black comedy':'Kara komedi',
    'action-adventure':'Aksiyon-macera','first-person shooter':'FPS','third-person shooter':'TPS','role-playing':'RPG','action role-playing':'Aksiyon RPG','role-playing video':'RPG',platform:'Platform','survival horror':'Hayatta kalma korku',
    stealth:'Gizlilik',metroidvania:'Metroidvania',roguelike:'Roguelike','roguelite':'Roguelite','open world':'Açık dünya','grand strategy':'Büyük strateji',strategy:'Strateji','interactive film':'İnteraktif film','graphic adventure':'Grafik macera',puzzle:'Bulmaca',
    'hack and slash':'Hack and slash','beat em up':'Dövüş',fighting:'Dövüş',shooter:'Nişancı','tactical shooter':'Taktiksel nişancı',simulation:'Simülasyon',survival:'Hayatta kalma','dark fantasy':'Karanlık fantastik','neo-noir':'Neo-noir',noir:'Kara film',
    shonen:'Shōnen','shōnen':'Shōnen',seinen:'Seinen',isekai:'Isekai',teen:'Gençlik','coming-of-age':'Büyüme hikâyesi',sitcom:'Sitkom','teen drama':'Gençlik dramı','crime drama':'Suç draması','legal drama':'Hukuk draması','political thriller':'Politik gerilim',
    'psychological thriller':'Psikolojik gerilim','science fiction action':'Bilimkurgu aksiyon','cyberpunk':'Siberpunk','post-apocalyptic':'Kıyamet sonrası','dystopian':'Distopya'};
  const cap=s=>s?s[0].toLocaleUpperCase('tr')+s.slice(1):s;
  function cleanG(g,tr){let s=String(g).trim().replace(/\s+(filmi|film|televizyon dizisi|dizisi|dizi|video oyunu|oyunu|oyun|anime(si)?|film series|television series|television program|video game|game|anime|series|fiction)$/i,'').trim();
    if(!tr){const k=s.toLowerCase().replace(/[’']/g,'').replace(/ video$/,'');s=GTR[k]||s}return cap(s)}
  const PF={'Microsoft Windows':'PC','Windows':'PC','PlayStation 5':'PS5','PlayStation 4':'PS4','PlayStation 3':'PS3','PlayStation 2':'PS2','PlayStation':'PS1','Xbox Series X and Series S':'Xbox Series','Xbox Series X/S':'Xbox Series','Xbox One':'Xbox One','Xbox 360':'Xbox 360',
    'Nintendo Switch':'Switch','Nintendo Switch 2':'Switch 2','macOS':'Mac','Classic Mac OS':'Mac','Linux':'Linux','Android':'Android','iOS':'iOS','iPadOS':'iPad','Stadia':'Stadia','Wii U':'Wii U','PlayStation Vita':'PS Vita','Steam Deck':'Steam Deck','SteamOS':'Steam Deck'};
  const PFO=['PC','PS5','PS4','Xbox Series','Xbox One','Switch','Switch 2','Mac','Linux','PS3','Xbox 360','iOS','Android'];
  // JSONP (iTunes Search): CORS gerektirmez; sadece ad + yıl birebir tutarsa kabul edilir
  function itunes(term,year){return new Promise(res=>{const cb='__mcit'+Math.random().toString(36).slice(2);const s=document.createElement('script');let done=false;
    const fin=v=>{if(done)return;done=true;window[cb]=()=>{};s.remove();res(v)};
    window[cb]=d=>{const r=(d?.results||[]).find(x=>norm(x.trackName)===norm(term)&&(!year||Math.abs(parseInt(x.releaseDate)-year)<=1));fin(r?.artworkUrl100?r.artworkUrl100.replace(/\/\d+x\d+bb\.(jpg|png)$/,'/600x900bb.jpg'):'')};
    s.onerror=()=>fin('');setTimeout(()=>fin(''),9000);s.src=`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=movie&entity=movie&limit=10&callback=${cb}`;document.head.appendChild(s)})}
  let jk=Promise.resolve();const jikan=id=>{const p=jk.then(()=>getJSON(`https://api.jikan.moe/v4/anime/${id}`));jk=p.catch(()=>{}).then(()=>new Promise(z=>setTimeout(z,420)));return p};
  const wsum=(lang,t)=>getJSON(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(t)}`).catch(()=>null);
  const tmdbKey=()=>lsg('mc:tmdb','')||'';
  async function enrich(c,type){const o={mid:c.id,imdb:c.imdb,steam:c.steam,mal:c.mal,wiki:c.tr&&!c.en?'tr:'+c.tr:c.en,year:c.year?String(c.year):'',cover:'',cover2:'',backdrop:'',wide:'',desc:'',eps:0,
      genres:[...(c.gtr.size?[...c.gtr].map(g=>cleanG(g,true)):[...c.gen].map(g=>cleanG(g)))].filter((g,i,a)=>g&&a.indexOf(g)===i).slice(0,4),
      platforms:[...new Set([...c.pl].map(p=>PF[p]||p))].sort((a,b)=>(PFO.indexOf(a)+99)%99-(PFO.indexOf(b)+99)%99).slice(0,6)};
    if(type==='game'&&c.steam){const b=`https://cdn.cloudflare.steamstatic.com/steam/apps/${c.steam}/`;o.cover=b+'library_600x900_2x.jpg';o.backdrop=b+'library_hero.jpg';o.wide=b+'header.jpg';if(!o.platforms.includes('PC'))o.platforms.unshift('PC')}
    if(type==='anime'&&c.mal){try{const d=(await jikan(c.mal))?.data;if(d){o.cover=d.images?.webp?.large_image_url||d.images?.jpg?.large_image_url||'';o.eps=+d.episodes||0;if(!o.year)o.year=String(d.year||d.aired?.prop?.from?.year||'');
        const gj=[...(d.genres||[]),...(d.themes||[]).slice(0,1),...(d.demographics||[])].map(g=>cleanG(g.name));if(gj.length)o.genres=[...new Set(gj)].slice(0,4);o._syn=d.synopsis||''}}catch(e){if(e instanceof NetErr)throw e}}
    if(type==='series'&&c.imdb){try{const t=await getJSON(`https://api.tvmaze.com/lookup/shows?imdb=${c.imdb}`);if(t){o.cover=t.image?.original||t.image?.medium||'';if(t.genres?.length)o.genres=t.genres.map(g=>cleanG(g)).slice(0,4);if(!o.year&&t.premiered)o.year=t.premiered.slice(0,4);
        o._syn=String(t.summary||'').replace(/<[^>]+>/g,'').trim()}}catch(e){if(e instanceof NetErr)throw e}}
    const key=tmdbKey();if(key&&c.imdb&&(type==='movie'||type==='series'||type==='anime')){try{const f=await getJSON(`https://api.themoviedb.org/3/find/${c.imdb}?api_key=${encodeURIComponent(key)}&external_source=imdb_id&language=tr-TR`);
        const r=(f?.movie_results||[])[0]||(f?.tv_results||[])[0];if(r){if(r.poster_path){o.cover2=o.cover||o.cover2;o.cover='https://image.tmdb.org/t/p/w780'+r.poster_path}if(r.backdrop_path)o.backdrop='https://image.tmdb.org/t/p/w1280'+r.backdrop_path;if(r.overview)o._tm=r.overview}}catch{}}
    if(type==='movie'&&!o.cover&&(c.label||'').length){const a=await itunes(c.label,c.year);if(a)o.cover=a}
    const [en,tr]=await Promise.all([c.en?wsum('en',c.en):null,c.tr?wsum('tr',c.tr):null]);const wimg=en?.originalimage?.source||en?.thumbnail?.source||tr?.originalimage?.source||'';
    if(!o.cover)o.cover=wimg;else if(!o.cover2&&wimg&&wimg!==o.cover)o.cover2=wimg;
    o.desc=o._tm||tr?.extract||o._syn||en?.extract||'';delete o._syn;delete o._tm;if(o.desc.length>900)o.desc=o.desc.slice(0,880).replace(/\s\S*$/,'')+'…';return o}
  async function resolve(it){const h=HINT.get(hk(it))||{en:it.title,y:+it.year||0};let cands=await wd(h.en,'en',it.type);
    if(!cands.length&&h.en!==it.title)cands=await wd(it.title,'tr',it.type);if(!cands.length&&/[çğıöşüÇĞİÖŞÜ]/.test(it.title))cands=await wd(it.title,'tr',it.type);
    const c=rank(cands,h,it.title);if(!c)return{none:true};const o=await enrich(c,it.type);return{o,conf:c.conf}}
  function applyRes(it,r){const fresh=!it.metaAt;if(r.none){Object.assign(it,{match:'none',metaAt:Date.now(),cover:'',cover2:'',backdrop:'',wide:''});if(fresh&&!it.reviewed)it.url='';return}
    const o=r.o;Object.assign(it,{mid:o.mid,imdb:o.imdb,steam:o.steam,mal:o.mal,wiki:o.wiki,cover:o.cover,cover2:o.cover2,backdrop:o.backdrop,wide:o.wide,match:r.conf,metaAt:Date.now()});
    if(o.year)it.year=o.year;if(o.genres.length)it.genres=o.genres;if(o.platforms.length&&(!it.platforms.length||fresh))it.platforms=o.platforms;if(o.eps)it.eps=o.eps;if(o.desc&&(fresh||!it.desc))it.desc=o.desc;
    it.url=o.wiki?`https://${o.wiki.startsWith('tr:')?'tr':'en'}.wikipedia.org/wiki/${o.wiki.replace(/^tr:/,'')}`:it.url}
  /* afiş bulunan kartları yerinde güncelle (bütün sayfayı yeniden çizmek yüzlerce kartı ve resmi sıfırdan kuruyordu) */
  function patchCards(ids){for(const id of ids){const it=KB.items.get(id);if(!it)continue;
      for(const el of qa(`#view>.mc [data-mi="${CSS.escape(id)}"]`)){if(el.classList.contains('ml-r')){el.outerHTML=lrow(it);continue}
        const v=(el.className.match(/\bv-(\w+)/)||[])[1]||'p',n=+(el.querySelector('.mc-n')?.textContent||0);el.outerHTML=card(it,v,n)}
      if(dId===id)detailRefresh()}}
  async function queue(){if(R.busy||R.off)return;const l=all().filter(needs);if(!l.length)return;R.busy=true;R.total=l.length;R.done=0;R.stats={ok:0,un:0,no:0};pill();let i=0,stop=false,lastEmit=Date.now();const changed=new Set();
    const work=async()=>{while(i<l.length&&!stop){const it=l[i++];if(!KB.items.has(it.id)||!needs(it)){R.done++;continue}
      try{const r=await resolve(it);const cur=KB.items.get(it.id);if(cur&&needs(cur)){applyRes(cur,r);KB.saveItem(cur,true);changed.add(cur.id);R.stats[r.none?'no':r.conf==='ok'?'ok':'un']++}}
      catch(e){if(e instanceof NetErr){stop=true;R.off=true;setTimeout(()=>{R.off=false},60000)}else console.warn('eşleştirme',it.title,e)}
      R.done++;pill();if(Date.now()-lastEmit>2500&&changed.size){lastEmit=Date.now();patchCards([...changed]);changed.clear()}}};
    await Promise.all([work(),work(),work()]);R.busy=false;pill();KB.emit('items');
    if(stop)say('İnternete ulaşılamadı — posterler bağlantı gelince eşleşecek');
    else if(R.total>2)say(`Posterler eşleşti: ${R.stats.ok} kesin${R.stats.un?` · ${R.stats.un} kontrol bekliyor`:''}${R.stats.no?` · ${R.stats.no} bulunamadı`:''}`)}
  function pill(){const p=q('.mc .mc-sync');if(!p)return;p.hidden=!R.busy;const s=q('span',p);if(s)s.textContent=R.busy?syncTxt():''}
  async function rematch(it){Object.assign(it,{metaAt:0,match:'',reviewed:false});KB.saveItem(it,true);say('Yeniden eşleştiriliyor…');
    try{const r=await resolve(it);const cur=KB.items.get(it.id);if(cur){applyRes(cur,r);KB.saveItem(cur);say(r.none?'Güvenilir bir eşleşme bulunamadı':r.conf==='ok'?'Eşleşti':'Eşleşti ama emin değilim — kontrol et')}}
    catch(e){say(e instanceof NetErr?'İnternete ulaşılamadı':'Eşleştirme başarısız: '+e.message)}detailRefresh()}
  // aday seçme: kullanıcı aramayı düzeltir, türe uyan Wikidata kayıtlarından birini seçer
  function pickUI(it,bg){const s=q('.mx-pick',bg);s.hidden=false;const h=HINT.get(hk(it))||{en:it.title};
    s.innerHTML=`<h3>Doğru kaydı seç</h3><label class="mx-pin">${IC.search}<input data-pin value="${E(h.en)}" aria-label="Aranacak ad" placeholder="Orijinal adıyla ara"><button class="mb sm pri" data-pgo>Ara</button></label><div class="mx-cands"></div>
      <button class="mb sm" data-pnone>Hiçbiri — tasarlanmış kapak kullan</button>`;
    q('[data-pgo]',s).onclick=()=>candidates(it,q('[data-pin]',s).value.trim(),s);s.scrollIntoView({block:'center',behavior:motion()?'smooth':'auto'});candidates(it,h.en,s)}
  const CANDS=new Map();
  async function candidates(it,term,s){const box=q('.mx-cands',s);box.innerHTML='<span class="sk"></span><span class="sk"></span><span class="sk"></span>';
    try{let c=await wd(term,'en',it.type);if(!c.length)c=await wd(term,'tr',it.type);CANDS.set(it.id,c);
      box.innerHTML=c.length?c.slice(0,7).map(x=>`<button class="mx-cand" data-pq="${x.id}"><b>${E(x.label||x.trl||x.id)}</b><small>${x.year||'yıl yok'}${x.desc?' · '+E(x.desc):''}${x.steam?' · Steam':''}${x.mal?' · MAL':''}${x.imdb?' · IMDb':''}</small>${IC.r}</button>`).join(''):'<p class="dim">Bu türde sonuç yok. Orijinal (İngilizce/Japonca) adını dene.</p>'}
    catch(e){box.innerHTML=`<p class="dim">${e instanceof NetErr?'İnternete ulaşılamadı.':'Arama başarısız.'}</p>`}}
  async function choose(it,qid){const c=(CANDS.get(it.id)||[]).find(x=>x.id===qid);if(!c)return;say('Seçtiğin kayıt yükleniyor…');
    try{const o=await enrich(c,it.type);const cur=KB.items.get(it.id);if(!cur)return;applyRes(cur,{o,conf:'ok'});cur.match='manual';cur.reviewed=true;if(cur.flag==='match'){cur.flag='';cur.flagWhy=''}KB.saveItem(cur);say('Güncellendi')}
    catch(e){say(e instanceof NetErr?'İnternete ulaşılamadı':'Yüklenemedi')}detailRefresh()}

  /* ── ekleme ── */
  function addSheet(pre=''){q('.ma-bg')?.remove();if(st.sec==='books'){Library.addSheet(pre);return}const ty=st.sec==='games'?'game':st.sec==='anime'?'anime':st.sec==='series'?'series':'movie';const bg=document.createElement('div');bg.className='ma-bg';bg.dataset.sec=st.sec;
    bg.innerHTML=`<form class="ma" role="dialog" aria-modal="true" aria-label="Medya ekle"><header><h2>Ekle</h2><button type="button" class="mb ic" data-ax aria-label="Kapat">${IC.x}</button></header>
      <div class="mc-seg big" role="radiogroup" aria-label="Tür">${MT.map(t=>`<button type="button" role="radio" data-at="${t}" aria-checked="${t===ty}" class="${t===ty?'on':''}">${IC[t==='movie'?'film':t==='series'?'tv':t]}${TN[t]}</button>`).join('')}</div>
      <label class="ma-f">Ad<input name="t" required value="${E(pre)}" placeholder="Örn. Interstellar, Frieren, Elden Ring" autocomplete="off"></label>
      <div class="ma-r"><label class="ma-f">Yıl <small>(isteğe bağlı, eşleşmeyi kesinleştirir)</small><input name="y" inputmode="numeric" maxlength="4" placeholder="2014"></label>
        <label class="ma-f">Durum<select name="s">${Object.entries(ty==='game'?ST.game:ST.watch).map(([k,n])=>`<option value="${k}"${k==='todo'?' selected':''}>${n}</option>`).join('')}</select></label></div>
      <p class="ma-h">${IC.spark}Posteri, yılı, türü${ty==='game'?' ve platformları':''} otomatik bulurum; emin olamazsam sana sorarım.</p>
      <footer><button type="button" class="mb" data-ax>Vazgeç</button><button class="mb pri">${IC.plus}Ekle</button></footer></form>`;
    document.body.appendChild(bg);const f=q('form',bg);let t=ty;setTimeout(()=>f.t.focus(),40);
    const close=()=>bg.remove();
    bg.addEventListener('click',e=>{if(e.target===bg||e.target.closest('[data-ax]'))return close();const b=e.target.closest('[data-at]');if(b){t=b.dataset.at;qa('[data-at]',bg).forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-checked',x===b)});
      f.s.innerHTML=Object.entries(t==='game'?ST.game:ST.watch).map(([k,n])=>`<option value="${k}"${k==='todo'?' selected':''}>${n}</option>`).join('')}});
    bg.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close()}});
    f.addEventListener('submit',e=>{e.preventDefault();const title=f.t.value.trim();if(!title)return;const y=f.y.value.replace(/\D/g,'').slice(0,4);
      const dup=all().find(i=>i.type===t&&norm(i.title)===norm(title));if(dup){close();say('Bu zaten kütüphanende');return open(dup.id)}
      const it=KB.addItem({type:t,title,year:y,status:f.s.value,tags:[TN[t].toLocaleLowerCase('tr')]});if(y)HINT.set(hk(it),{en:title,y:+y});close();say(`“${title}” eklendi — posteri aranıyor`);queue();open(it.id)})}

  /* sayfa değişince geçici arayüz kalmasın (Notlar route() çağırır) */
  function dismiss(){qa('.mset,.mrp,.mq,.ma-bg').forEach(e=>e.remove())}
  return{render,refresh,detail,close,imgErr,queue,addSheet,rateHTML,dismiss,patchCards,isMedia:t=>MT.includes(t),get st(){return st},get R(){return R},_rank:rank,_cleanG:cleanG}})();
