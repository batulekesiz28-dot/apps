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
  const IC={dice:S('<rect x="2.5" y="2.5" width="11" height="11" rx="3"/><circle cx="5.75" cy="5.75" r=".9" fill="currentColor" stroke="none"/><circle cx="10.25" cy="5.75" r=".9" fill="currentColor" stroke="none"/><circle cx="8" cy="8" r=".9" fill="currentColor" stroke="none"/><circle cx="5.75" cy="10.25" r=".9" fill="currentColor" stroke="none"/><circle cx="10.25" cy="10.25" r=".9" fill="currentColor" stroke="none"/>'),rw:S('<path d="M8 4 4 8l4 4M12.5 4l-4 4 4 4"/>'),ff:S('<path d="M8 4l4 4-4 4M3.5 4l4 4-4 4"/>'),pop:S('<rect x="2.5" y="3.5" width="11" height="9" rx="2"/><rect x="8" y="8" width="4" height="3" rx=".8" fill="currentColor" stroke="none"/>'),bell:S('<path d="M4.2 11.5V7.4a3.8 3.8 0 0 1 7.6 0v4.1l1.2 1.3H3z"/><path d="M6.6 14.2a1.5 1.5 0 0 0 2.8 0"/>'),vol0:S('<path d="M3 6.2h2.4L8.8 3.5v9L5.4 9.8H3z"/><path d="m11 6.3 3.2 3.4M14.2 6.3 11 9.7"/>'),vol1:S('<path d="M3 6.2h2.4L8.8 3.5v9L5.4 9.8H3z"/><path d="M11.2 5.6a3.4 3.4 0 0 1 0 4.8M12.9 3.9a5.8 5.8 0 0 1 0 8.2"/>'),play:S('<path d="M5 3.5v9l7.5-4.5z" fill="currentColor" stroke="none"/>'),plus:S('<path d="M8 3v10M3 8h10"/>'),check:S('<path d="M3.5 8.5l3 3 6-7"/>'),
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
  const SH={cont:'Kaldığın yerden devam et',arec:'Yeni çıkan popüler animeler',notes:'Not aldıkların',movies:'Filmler',series:'Diziler',anime:'Animeler',games:'Oyunlar',books:'Kitaplar',fav:'Favorilerin',top:'En sevdiklerin',docs:'Belgeler'};
  const LC=[['cover','Kapak'],['st','Durum'],['rate','Puanım'],['score','Genel puan'],['like','Beğeni'],['fav','Favori']];
  const LOOK0={view:'tv',cover:100,icon:'m',font:'m',gap:100,dens:'n',radius:8,ar:100,title:1,meta:1,badge:1,hero:1,rowh:100,
    lc:{cover:1,st:1,rate:1,score:0,like:1,fav:1},shelves:Object.keys(SH),off:[],tabsOff:[]};
  /* görünüm her bölüm için AYRI (ana sayfa, filmler, diziler, animeler, oyunlar, kitaplar): mc:look:<bölüm>.
     İlk açılışta ortak eski ayar (mc:look) kopyalanır; üstteki kategori sekmeleri (tabsOff) ortak kalır. */
  function loadLook(sec='home'){const g=lsg('mc:look',{})||{},s=lsg('mc:look:'+sec,null)||g,L={...LOOK0,...s,lc:{...LOOK0.lc,...(s.lc||{})}};
    L.shelves=(Array.isArray(s.shelves)?s.shelves.filter(k=>SH[k]):[]).filter((k,i,a)=>a.indexOf(k)===i);Object.keys(SH).forEach((k,i)=>{if(!L.shelves.includes(k))L.shelves.splice(Math.min(i,L.shelves.length),0,k)});
    L.off=(Array.isArray(s.off)?s.off:[]).filter(k=>SH[k]);L.tabsOff=Array.isArray(g.tabsOff)?g.tabsOff:[];return L}
  const st={sec:'home',page:'home',qs:'',genre:'',sort:lsg('mc:sort','added'),kind:'',min:0,hero:0,base:[],look:loadLook()};
  const V=()=>st.look.view;
  const all=()=>[...KB.items.values()].filter(i=>AT.includes(i.type));
  const inSec=(it,s)=>SEC[s].types.includes(it.type);
  const flagOf=it=>it.reviewed?'':it.flag?it.flag:(it.match==='unsure'||it.match==='none')?'match':'';

  /* ── görseller ── */
  function imgErr(im){const a=im.dataset.alt;if(a){im.dataset.alt='';im.src=a}else{im.closest('.mp,.mw,.mh-bg,.mx-bd')?.classList.add('noimg');im.remove()}}
  const IMG=(src,alt,cls='',eager)=>src?`<img class="${cls}" src="${E(src)}"${alt&&alt!==src?` data-alt="${E(alt)}"`:''} alt="" ${eager?'fetchpriority="high"':'loading="lazy"'} decoding="async" referrerpolicy="no-referrer" onload="Media.imgOk(this)" onerror="Media.imgErr(this)">`:'';
  // dikey poster kutusuna kare/yatay görsel (logo, tanıtım resmi) gelirse kırpma: ortala, sığdır
  function imgOk(im){im.classList.add('ok');const r=im.naturalWidth/Math.max(1,im.naturalHeight);if(r>.9&&im.parentElement?.classList.contains('mp'))im.classList.add('fitc')}
  // görsel yoksa: içeriğin adıyla tasarlanmış, türüne göre değişen tipografik kapak (rastgele görsel değil)
  function fallback(it){const g=(it.genres||[])[0]||'';
    return`<div class="fp fp-${it.type}" aria-hidden="true"><span class="fp-k">${TN[it.type]}${it.year?' · '+E(it.year):''}</span><b class="fp-t">${E(it.title)}</b>${g?`<span class="fp-g">${E(g)}</span>`:''}</div>`}
  const poster=(it,cls='')=>`<div class="mp ${cls}" style="--h:${hash(it.title)%360}">${fallback(it)}${IMG(it.cover,it.cover2)}</div>`;
  const wideArt=it=>{const w=it.wide||it.backdrop,h=hash(it.title)%360;if(w)return`<div class="mw" style="--h:${h}">${fallback(it)}${IMG(w,it.cover)}</div>`;
    return`<div class="mw pc" style="--h:${h}">${fallback(it)}${it.cover?IMG(it.cover,it.cover2):''}</div>`};
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
</div>
      <div class="mc-cap"><b>${E(it.title)}</b><small>${metaShort(it)||TN[it.type]}</small></div></article>`}
  /* ═ Fragman (spot ışığında bilgi panelinin karşı tarafında, resmî YouTube oynatıcısı, youtube-nocookie).
     Kimlik sırası: önbellek mc:yt → anime: Jikan trailer → TMDB videos (anahtar varsa) → Wikidata P1651 (mid ya da IMDb/Steam ile bulunur).
     Kapağın üstüne gelir gelmez aranır (spot açılmadan önce), bulunan kimlik saklanır → ikinci seferde anında. Bulunamazsa 7 gün sonra yeniden denenir. ═ */
  const YT=lsg('mc:yt5',{}),ytP=new Map(),okYT=v=>/^[\w-]{11}$/.test(v||'');
  const hasTrailer=it=>['movie','series','anime','game'].includes(it?.type);
  // aday listesi (birden çok): bir video oynamazsa sıradaki denenir; gerçekten bozuk olanlar mc:ytbad2'de (30 gün)
  try{['mc:ytbad','mc:yt','mc:yt2','mc:yt3','mc:yt4','mc:arec','mc:ytpos'].forEach(k=>localStorage.removeItem(k))}catch{} // eski sürümlerin kalıntıları
  // “bozuk” = sadece gerçekten silinmiş/gömme kapalı video (bağlantı hatası DEĞİL); 30 gün sonra unutulur
  const YTB=(()=>{const o=lsg('mc:ytbad2',{}),n=Date.now();for(const k in o)if(n-o[k]>30*864e5)delete o[k];return o})();const badYT=v=>{YTB[v]=Date.now();lss('mc:ytbad2',YTB)};
  /* Bütün kaynaklar AYNI ANDA sorulur (biri yavaşsa/yanıt vermiyorsa diğerleri beklemez). İlk aday gelince 450 ms daha
     beklenir (daha iyi sıradaki gelsin diye), sonra liste döner; geri kalanlar arka planda bitince önbelleğe (mc:yt5) yazılır.
     Sıra (küçük = önce): YouTube araması/TMDB/KinoCheck 0–1 · AniList, iTunes 2 · Wikidata, Jikan 3. En fazla 9 sn beklenir.
     YouTube anahtarı (mc:ytkey) oyunlarda hep, diğerlerinde sadece hiçbir kaynak bulamazsa kullanılır (günlük kota için). */
  const ytKey=()=>lsg('mc:ytkey','')||'';
  async function ytSearch(it,add){const k=ytKey();if(!k)return;const g=it.type==='game',yr=parseInt(it.year)||'';
    const j=await getJSON(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&maxResults=5&q=${encodeURIComponent(`${it.title} ${yr} ${g?'game trailer':it.type==='anime'?'anime trailer':'trailer'}`)}&key=${encodeURIComponent(k)}`);
    if(j?.error)throw new Error(j.error.message||'YouTube');const nt=norm(it.title);
    (j?.items||[]).map(x=>({v:x.id?.videoId,t:norm(x.snippet?.title||'')})).filter(x=>x.v).forEach((x,n)=>add(x.v,(/trailer|fragman|teaser/.test(x.t)?0:.6)+(x.t.includes(nt)?0:.3)+n*.05))}
  function ytIds(it){if(!hasTrailer(it))return Promise.resolve([]);const c=YT[it.id],l=c?(c.l||[]).filter(v=>!YTB[v]):null;
    if(c&&(l.length||Date.now()-c.at<7*864e5))return Promise.resolve(l);
    if(ytP.has(it.id))return ytP.get(it.id);
    const p=new Promise(resolve=>{const C=[];let pend=0,done=true,res=false,grace=0,ytTried=false;
      const list=()=>C.slice().sort((a,b)=>a.r-b.r).map(x=>x.v).slice(0,8);
      const fin=()=>{if(res)return;res=true;clearTimeout(grace);clearTimeout(cap);resolve(list())};
      const add=(v,r=3)=>{v=okYT(v)?'yt:'+v:v;if(!/^(yt|mp):/.test(v||'')||YTB[v])return;const o=C.find(x=>x.v===v);if(o){o.r=Math.min(o.r,r);return}C.push({v,r});if(!res&&!grace)grace=setTimeout(fin,450)};
      const all=()=>{if(!C.length&&!ytTried&&ytKey()){ytTried=true;task(()=>ytSearch(it,add));return}
        fin();ytP.delete(it.id);const L=list();if(done||L.length){YT[it.id]={l:L,at:Date.now()};lss('mc:yt5',YT)}};
      const task=f=>{pend++;Promise.resolve().then(f).catch(()=>{done=false}).finally(()=>{if(--pend===0)all()})};
      const cap=setTimeout(fin,9000);
      const wdq=async q=>{const e=await getJSON(`https://www.wikidata.org/w/api.php?action=wbgetclaims&entity=${q}&property=P1651&format=json&origin=*`);const cl=(e?.claims?.P1651||[]).filter(x=>x.rank!=='deprecated');
        cl.sort((a,b)=>(b.rank==='preferred')-(a.rank==='preferred')).slice(0,6).forEach((x,n)=>add(x?.mainsnak?.datavalue?.value,3+n*.05))};
      const byProp=async(pr,val)=>{const j=await getJSON(`https://www.wikidata.org/w/api.php?action=query&list=search&srsearch=haswbstatement:${pr}=${encodeURIComponent(val)}&srlimit=1&format=json&origin=*`);return j?.query?.search?.[0]?.title||''};
      const tv=it.type==='series';
      if(it.type==='movie'||tv){const yr=parseInt(it.year)||0,k=tv?'tv':'mv',en=(it.wiki&&!it.wiki.startsWith('tr:')?it.wiki:'').replace(/_/g,' ').replace(/\s*\([^)]*\)\s*$/,'');
        task(async()=>{const u=await itPrev(it.title,yr,k,'tr');if(u)add('mp:'+u,2)});
        task(async()=>{const u=await itPrev(en&&norm(en)!==norm(it.title)?en:it.title,yr,k,'us');if(u)add('mp:'+u,2.2)});
        // KinoCheck: IMDb kimliğiyle resmî fragman (anahtarsız)
        if(it.imdb)task(async()=>{const d=await getJSON(`https://api.kinocheck.com/${tv?'shows':'movies'}?imdb_id=${encodeURIComponent(it.imdb)}&language=en`);
          add(d?.trailer?.youtube_video_id,1);(d?.videos||[]).slice(0,4).forEach((x,n)=>add(x?.youtube_video_id,1.4+n*.05))})}
      if(it.type==='anime'){task(async()=>{const v=it.mal?{m:+it.mal}:{q:it.title};const d=await alGQL(`query($m:Int,$q:String){Media(idMal:$m,search:$q,type:ANIME){trailer{id site}}}`,v);if(d?.Media?.trailer?.site==='youtube')add(d.Media.trailer.id,2)});
        if(it.mal)task(async()=>{const d=await jget(`https://api.jikan.moe/v4/anime/${it.mal}`);add(d?.data?.trailer?.youtube_id,3)})}
      const key=tmdbKey();if(key&&it.imdb&&it.type!=='game')task(async()=>{const f=await getJSON(`https://api.themoviedb.org/3/find/${it.imdb}?api_key=${encodeURIComponent(key)}&external_source=imdb_id`);
        const m=(f?.movie_results||[])[0],t=(f?.tv_results||[])[0],id=(m||t)?.id;if(!id)return;const vs=await getJSON(`https://api.themoviedb.org/3/${m?'movie':'tv'}/${id}/videos?api_key=${encodeURIComponent(key)}`);
        const V=(vs?.results||[]).filter(x=>x.site==='YouTube'),rk=x=>(x.type==='Trailer'?0:x.type==='Teaser'?.4:.8)+(x.official?0:.2);V.sort((a,b)=>rk(a)-rk(b)).slice(0,5).forEach(x=>add(x.key,.5+rk(x)))});
      if(it.type==='game'&&ytKey()){ytTried=true;task(()=>ytSearch(it,add))}
      task(async()=>{let q=/^Q\d+$/.test(it.mid||'')?it.mid:'';if(!q&&it.imdb)q=await byProp('P345',it.imdb);if(!q&&it.steam)q=await byProp('P1733',it.steam);if(q)await wdq(q)})});
    ytP.set(it.id,p);return p}
  // anahtar eklenince/değişince: daha önce hiçbir şey bulunamayanlar yeniden aranır
  function ytForgetEmpty(){for(const k in YT)if(!(YT[k].l||[]).length)delete YT[k];lss('mc:yt5',YT)}
  let ytWarm=false;function warmYT(){if(ytWarm)return;ytWarm=true;for(const h of['https://www.youtube-nocookie.com','https://i.ytimg.com','https://www.wikidata.org']){const l=document.createElement('link');l.rel='preconnect';l.href=h;l.crossOrigin='';document.head.appendChild(l)}}
  // silinmiş videonun kapak karesi 120×90 gri yer tutucudur → hiç denemeden ele
  const thumbOK=v=>new Promise(res=>{const im=new Image();const t=setTimeout(()=>res('unk'),2500);im.onload=()=>{clearTimeout(t);res(im.naturalWidth>120?'ok':'bad')};im.onerror=()=>{clearTimeout(t);res('unk')};im.src=`https://i.ytimg.com/vi/${v}/mqdefault.jpg`});
  // fragman alanı: kapak karesi hemen görünür; video GİZLİ yüklenir, oynamaya başlayınca (IFrame API olayı) belirir.
  // Hata (silinmiş / gömme kapalı / bölge) gelirse sıradaki aday denenir; hiçbiri olmazsa onFail → alan kalkar. Kullanıcı hata ekranı görmez.
  /* Sarma (ileri/geri): YouTube IFrame API mesajları (infoDelivery: currentTime/duration; oynarken arada tahmin edilir) ya da <video>.
     S.t şu anki saniye, S.d süre; seekTo(t) / seek(±sn). tick(S) arayüzü boyar (sürüklerken boyamaz). */
  const fmtT=s=>{s=Math.max(0,Math.floor(s||0));return`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`};
  function playerCtl(fr,tick){const S={t:0,d:0,b:0,at:0,ps:-1,drag:false},yt=fr.tagName==='IFRAME',upd=()=>{if(!S.drag)tick?.(S)};let iv=0,hs=0;
    if(yt){S.post=(f,a=[])=>{try{fr.contentWindow?.postMessage(JSON.stringify({event:'command',func:f,args:a}),'*')}catch{}};
      S.msg=e=>{if(e.source!==fr.contentWindow)return;let d;try{d=typeof e.data==='string'?JSON.parse(e.data):e.data}catch{return}if(!d)return;const i=d.info,now=performance.now();
        if(d.event==='onStateChange'){S.b=S.t;S.at=now;S.ps=+i;upd()}
        else if(d.event==='infoDelivery'&&i&&typeof i==='object'){if(i.playerState!=null){S.b=S.t;S.at=now;S.ps=+i.playerState}if(i.currentTime!=null){S.t=S.b=+i.currentTime;S.at=now}if(+i.duration>0)S.d=+i.duration;upd()}};
      addEventListener('message',S.msg);
      fr.addEventListener('load',()=>{let n=0;clearInterval(hs);const hi=()=>{try{fr.contentWindow?.postMessage(JSON.stringify({event:'listening',id:2,channel:'widget'}),'*')}catch{}};hi();hs=setInterval(()=>{if(++n>40||S.d)clearInterval(hs);else hi()},250)});
      iv=setInterval(()=>{if(S.ps===1&&S.at){S.t=Math.min(S.d||1e9,S.b+(performance.now()-S.at)/1000);upd()}},250)}
    else{const f=()=>{S.t=fr.currentTime||0;S.d=isFinite(fr.duration)?fr.duration:0;upd()};['timeupdate','loadedmetadata','durationchange','seeked'].forEach(k=>fr.addEventListener(k,f))}
    S.seekTo=t=>{t=Math.max(0,S.d?Math.min(S.d-.5,t):t);S.t=S.b=t;S.at=performance.now();if(yt)S.post('seekTo',[t,true]);else try{fr.currentTime=t}catch{}upd()};
    S.seek=dt=>S.seekTo(S.t+dt);
    S.off=()=>{clearInterval(iv);clearInterval(hs);if(S.msg)removeEventListener('message',S.msg)};
    return S}
  function ytMount(slot,ids,onFail,title){const auto=true;let i=-1,fr=null,muted=true,box=null,alive=true,tm=0,ctl=null,volUI=()=>{};
    const applyV=()=>{const v=VP.vol();if(fr?.tagName==='VIDEO'){fr.muted=muted;if(!muted)fr.volume=v/100}else{cmd(muted?'mute':'unMute');if(!muted)cmd('setVolume',[v])}volUI()};
    const cleanup=()=>{removeEventListener('message',onMsg);clearInterval(tm);ctl?.off();ctl=null};
    const paint=S=>{if(!box)return;const p=S.d?Math.min(1,S.t/S.d):0;box.style.setProperty('--p',p.toFixed(4));box.classList.toggle('hsk',S.d>0);const tx=box.querySelector('.msp-sk time');if(tx)tx.textContent=fmtT(S.t)+' / '+fmtT(S.d);const b=box.querySelector('.msp-bar');if(b){b.setAttribute('aria-valuemax',Math.round(S.d));b.setAttribute('aria-valuenow',Math.round(S.t));b.setAttribute('aria-valuetext',fmtT(S.t)+' / '+fmtT(S.d))}};
    const ctlOn=()=>{ctl?.off();ctl=playerCtl(fr,paint);slot._ctl=ctl;slot._fit?.()};
    const onMsg=e=>{if(!fr||e.source!==fr.contentWindow)return;let d;try{d=typeof e.data==='string'?JSON.parse(e.data):e.data}catch{return}if(!d)return;
      if(d.event==='onError'){if([2,100,101,150,153].includes(+d.info))badYT(ids[i]);next();return}
      const ps=d.event==='onStateChange'?d.info:d.event==='infoDelivery'?d.info?.playerState:null;if(ps===1&&!box.classList.contains('ok'))playing()};
    addEventListener('message',onMsg);
    const cmd=(f,a=[])=>{try{fr?.contentWindow?.postMessage(JSON.stringify({event:'command',func:f,args:a}),'*')}catch{}};
    async function next(){if(!alive)return;fr?.remove();fr=null;ctl?.off();ctl=null;slot._ctl=null;clearInterval(tm);box?.classList.remove('ok');
      let th='';while(++i<ids.length){const c=ids[i];if(c.startsWith('mp:'))break;th=await thumbOK(c.slice(3));if(th!=='bad')break;badYT(c)}if(!alive)return;
      if(i>=ids.length){alive=false;cleanup();onFail?.();return}
      const c=ids[i],mp=c.startsWith('mp:'),v=c.slice(3);if(!box){slot.insertAdjacentHTML('afterbegin',`<div class="msp-yv"><i class="msp-yth"></i><div class="msp-sk"><button type="button" data-sk="-10" aria-label="10 saniye geri" title="10 sn geri (←)">${IC.rw}</button><span class="msp-bar" role="slider" tabindex="0" aria-label="Fragmanda konum" aria-valuemin="0" aria-valuemax="0" aria-valuenow="0"><i></i></span><button type="button" data-sk="10" aria-label="10 saniye ileri" title="10 sn ileri (→)">${IC.ff}</button><time>0:00</time></div><button type="button" class="msp-ym" data-ym aria-label="${auto?'Sesi aç':'Fragmanı oynat'}" title="${auto?'Sesi aç':'Oynat'}">${auto?IC.vol0:IC.play}</button><span class="msp-vs" role="slider" tabindex="0" aria-orientation="vertical" aria-label="Ses seviyesi" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" title="Ses seviyesi"><b><i></i></b></span><button type="button" class="msp-ym msp-yp" data-yp aria-label="Ayrı pencerede oynat" title="Ayrı pencerede oynat — istediğin yere taşı">${IC.pop}</button></div>`);box=slot.firstElementChild;
        box.addEventListener('click',e=>{if(e.target.closest('.msp-yr'))return;e.stopPropagation();const k=e.target.closest('[data-sk]');if(k){ctl?.seek(+k.dataset.sk);return}if(e.target.closest('.msp-sk,.msp-vs'))return;if(e.target.closest('[data-yp]')){const c0=ids[i],t0=ctl?.t||0;alive=false;cleanup();spotOff(true);pip(c0,title,t0);return}if(!fr){load();return}muted=!muted;if(!muted&&!VP.vol())VP.setVol(50);applyV()});
        // ses seviyesi (ortak, notlar:vol): ses düğmesinin üstüne gelince dikey kaydırıcı; 0 → sessiz
        const vsl=box.querySelector('.msp-vs');volUI=()=>{const b=box.querySelector('[data-ym]'),v=muted?0:VP.vol();b.innerHTML=v?IC.vol1:IC.vol0;b.setAttribute('aria-label',v?'Sesi kapat':'Sesi aç');b.title=v?'Sesi kapat':'Sesi aç';box.style.setProperty('--v',(v/100).toFixed(3));vsl.setAttribute('aria-valuenow',Math.round(v));vsl.setAttribute('aria-valuetext','%'+Math.round(v))};
        const setV=v=>{v=Math.round(Math.max(0,Math.min(100,v)));VP.setVol(v);muted=!v;applyV()};
        vsl.addEventListener('pointerdown',e=>{if(e.button)return;e.preventDefault();e.stopPropagation();vsl.focus({preventScroll:true});if(!fr)load();try{vsl.setPointerCapture(e.pointerId)}catch{}const r=vsl.querySelector('b').getBoundingClientRect(),at=ev=>(1-Math.max(0,Math.min(1,(ev.clientY-r.top)/r.height)))*100;vsl.classList.add('drag');
          const mv=ev=>setV(at(ev)),up=()=>{vsl.removeEventListener('pointermove',mv);vsl.removeEventListener('pointerup',up);vsl.removeEventListener('pointercancel',up);vsl.classList.remove('drag')};mv(e);vsl.addEventListener('pointermove',mv);vsl.addEventListener('pointerup',up);vsl.addEventListener('pointercancel',up)});
        vsl.addEventListener('keydown',e=>{const d={ArrowUp:10,ArrowRight:10,ArrowDown:-10,ArrowLeft:-10}[e.key];if(d){e.preventDefault();e.stopPropagation();setV((muted?0:VP.vol())+d)}});
        vsl.addEventListener('wheel',e=>{e.preventDefault();e.stopPropagation();setV((muted?0:VP.vol())+(e.deltaY<0?5:-5))},{passive:false});volUI();
        // çubuk: tıkla/sürükle → o saniyeye; odaktayken ← → 5 sn
        const bar=box.querySelector('.msp-bar');bar.addEventListener('pointerdown',e=>{if(e.button||!ctl?.d)return;e.preventDefault();e.stopPropagation();try{bar.setPointerCapture(e.pointerId)}catch{}const r=bar.getBoundingClientRect(),c=ctl,at=ev=>Math.max(0,Math.min(1,(ev.clientX-r.left)/r.width));c.drag=true;box.classList.add('skd');
          const mv=ev=>{const p=at(ev);box.style.setProperty('--p',p.toFixed(4));box.querySelector('.msp-sk time').textContent=fmtT(p*c.d)+' / '+fmtT(c.d)},up=ev=>{bar.removeEventListener('pointermove',mv);bar.removeEventListener('pointerup',up);bar.removeEventListener('pointercancel',up);c.drag=false;box.classList.remove('skd');if(ev.type==='pointerup')c.seekTo(at(ev)*c.d);else paint(c)};mv(e);
          bar.addEventListener('pointermove',mv);bar.addEventListener('pointerup',up);bar.addEventListener('pointercancel',up)});
        bar.addEventListener('keydown',e=>{const d={ArrowLeft:-5,ArrowRight:5,ArrowDown:-10,ArrowUp:10}[e.key];if(d&&ctl){e.preventDefault();e.stopPropagation();ctl.seek(d)}else if((e.key==='Home'||e.key==='End')&&ctl?.d){e.preventDefault();ctl.seekTo(e.key==='Home'?0:ctl.d)}});
        const fit=()=>{const w=box.clientWidth;box.classList.toggle('nr',w<340);box.classList.toggle('xs',w<250)};box.addEventListener('pointerenter',fit);box.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse'&&box.contains(document.activeElement)&&!box.classList.contains('skd'))document.activeElement.blur()});slot._fit=fit;
        slot._kb=()=>{fit();box.classList.add('kb');clearTimeout(box._kt);box._kt=setTimeout(()=>box.classList.remove('kb'),1600)}}
      box.querySelector('.msp-yth').style.backgroundImage=mp?'none':`url(https://i.ytimg.com/vi/${v}/hqdefault.jpg)`;if(!auto||th==='ok')slot.classList.add('ready');if(auto)load()}
    const playing=()=>{clearInterval(tm);box.classList.add('ok');slot.classList.add('ready')};
    function load(){if(fr||!alive)return;const c=ids[i],v=c.slice(3);
      if(c.startsWith('mp:')){fr=document.createElement('video');fr.className='msp-yf';fr.muted=muted;fr.autoplay=true;fr.loop=true;fr.playsInline=true;fr.preload='auto';fr.src=v;
        fr.addEventListener('playing',playing,{once:true});fr.addEventListener('loadeddata',()=>slot.classList.add('ready'),{once:true});fr.addEventListener('canplay',()=>setTimeout(()=>{if(fr&&!fr.paused)playing()},300),{once:true});fr.addEventListener('error',()=>{if(fr?.error?.code===4&&navigator.onLine)badYT(c);next()},{once:true});box.insertBefore(fr,box.querySelector('[data-ym]'));ctlOn();fr.play?.().catch(()=>{});return}
      fr=document.createElement('iframe');fr.className='msp-yf';fr.title='Fragman';fr.allow='autoplay; encrypted-media; picture-in-picture';fr.referrerPolicy='strict-origin-when-cross-origin';
      fr.src=`https://www.youtube-nocookie.com/embed/${v}?autoplay=1&mute=1&controls=0&rel=0&playsinline=1&modestbranding=1&iv_load_policy=3&disablekb=1&loop=1&playlist=${v}&enablejsapi=1&origin=${encodeURIComponent(location.origin)}&widget_referrer=${encodeURIComponent(location.href)}`;
      // IFrame API el sıkışması: oynatıcı olay göndermeye “listening” ile başlar
      fr.addEventListener('load',()=>{const me=fr;setTimeout(()=>{if(alive&&fr===me&&!box.classList.contains('ok'))playing()},1600);const hi=()=>{try{fr?.contentWindow?.postMessage(JSON.stringify({event:'listening',id:1,channel:'widget'}),'*')}catch{}};hi();clearInterval(tm);let n=0;tm=setInterval(()=>{if(++n>40||box.classList.contains('ok'))clearInterval(tm);else hi()},250)});
      box.insertBefore(fr,box.querySelector('[data-ym]'));ctlOn()}
    slot._stop=()=>{alive=false;cleanup()};next()}
  /* ═ Mini oynatıcı: fragman ayrı, sürüklenebilir ve köşesinden boyutlanabilir pencerede (sesli, kontrollü) oynar;
     Medya'da/Notlar'da gezinirken kapanmaz. Konum ve genişlik hatırlanır (mc:pip). Tek pencere: yenisi eskisinin yerini alır. ═ */
  function pip(c,title,t0=0){const old=q('.mpip');old?._off?.();old?.remove();t0=Math.max(0,Math.floor(+t0||0));const P=Object.assign({w:440,x:null,y:null},lsg('mc:pip',{})),v=c.slice(3),mp=c.startsWith('mp:'),el=document.createElement('div');
    el.className='mpip';el.setAttribute('role','dialog');el.setAttribute('aria-label','Fragman: '+(title||''));
    el.innerHTML=`<header class="mpip-h" title="Sürükleyerek taşı"><b>${E(title||'Fragman')}</b><button data-pipx aria-label="Kapat" title="Kapat">${IC.x}</button></header>
      <div class="mpip-v"></div>
      <span class="mpip-r" title="Boyutlandır" aria-hidden="true"></span>`;
    document.body.appendChild(el);
    // ortak oynatıcı (player.js): denetimler sadece imleç üstündeyken; ← → Boşluk M F klavyesi de oradan
    const vp=VP.make(mp?{src:v,title,start:t0}:{yt:v,title,start:t0});el.querySelector('.mpip-v').append(vp.el);el._off=()=>vp.off();
    const place=()=>{const w=Math.max(260,Math.min(innerWidth-16,P.w)),h=w*9/16+38,x=P.x??innerWidth-w-24,y=P.y??innerHeight-h-24;el.style.width=w+'px';el.style.left=Math.max(8,Math.min(innerWidth-w-8,x))+'px';el.style.top=Math.max(8,Math.min(innerHeight-h-8,y))+'px'};
    const save=()=>{const r=el.getBoundingClientRect();P.x=Math.round(r.left);P.y=Math.round(r.top);P.w=Math.round(r.width);lss('mc:pip',P)};place();
    if(motion())el.animate([{opacity:0,transform:'scale(.92) translateY(10px)'},{opacity:1,transform:'none'}],{duration:360,easing:'cubic-bezier(.16,1,.3,1)'});
    const grab=(h,mv)=>h.addEventListener('pointerdown',e=>{if(e.button!==0||e.target.closest('button'))return;e.preventDefault();const x0=e.clientX,y0=e.clientY,r0=el.getBoundingClientRect();try{h.setPointerCapture(e.pointerId)}catch{}el.classList.add('drag');
      const m=ev=>{mv(ev.clientX-x0,ev.clientY-y0,r0);place()},u=()=>{h.removeEventListener('pointermove',m);h.removeEventListener('pointerup',u);h.removeEventListener('pointercancel',u);el.classList.remove('drag');save()};
      h.addEventListener('pointermove',m);h.addEventListener('pointerup',u);h.addEventListener('pointercancel',u)});
    grab(el.querySelector('.mpip-h'),(dx,dy,r0)=>{P.x=r0.left+dx;P.y=r0.top+dy});
    grab(el.querySelector('.mpip-r'),(dx,dy,r0)=>{P.x=r0.left;P.y=r0.top;P.w=Math.max(260,Math.min(innerWidth-16,r0.width+Math.max(dx,dy*16/9)))});
    el.querySelector('.mpip-h').addEventListener('dblclick',()=>{P.w=P.w>=700?440:Math.min(innerWidth-48,860);place();save()});
    const onR=()=>{if(!el.isConnected)return removeEventListener('resize',onR);place()};addEventListener('resize',onR);
    el.querySelector('[data-pipx]').addEventListener('click',()=>{removeEventListener('resize',onR);el._off();el.remove()})}
  /* ═ Spot ışığı: kapağın üstünde kısa bir an durunca ekranın geri kalanı bulanıklaşır, kapak yaylanarak öne çıkar.
     Puanlanmamışsa altta cam “★ Puanla” hapı: üstüne gelince açılır, imleci gezdirdikçe 1–10 akar, tıkla → kaydedilir. ═ */
  const SPT={t:0,card:null,el:null,v:0,block:null};
  const SPOT_MS=1000; // imleç bir kapakta bu kadar durunca spot ışığı açılır (altında rahatça gezilebilsin diye)
  const RW=['','Berbat','Kötü','Zayıf','Vasat','İdare eder','Fena değil','İyi','Çok iyi','Harika','Başyapıt'];
  const fineHover=()=>matchMedia('(hover:hover) and (pointer:fine)').matches;
  // free: imleç uzaklaşarak kapattı → aynı karta dönünce yeniden açılabilir; diğer kapanışlarda (puan, kaydırma, Esc) imleç karttan çıkana kadar açılmaz
  function spotOff(now,free){clearTimeout(SPT.t);clearTimeout(SPT.dt);SPT.t=0;if(SPT.card&&!free)SPT.block=SPT.card.dataset.mi;const el=SPT.el;SPT.el=null;SPT.card=null;SPT.v=0;if(!el)return;el.querySelector('.msp-yt')?._stop?.();el.classList.remove('on');if(now||!motion())el.remove();else setTimeout(()=>el.remove(),260)}
  const srHTML=()=>`<div class="sr" role="slider" tabindex="0" aria-label="Puanla (1–10)" aria-valuemin="1" aria-valuemax="10" aria-valuenow="0"><i class="sr-fill"></i><span class="sr-tk" aria-hidden="true">${'<i></i>'.repeat(10)}</span><span class="sr-l">${IC.star}<b>Puanla</b></span></div>`;
  function spotOn(card){const it=KB.items.get(card.dataset.mi),art=card.querySelector('.mc-art');if(!it||!art||!card.isConnected)return;
    spotOff(true);const r=art.getBoundingClientRect();if(!r.width||r.top<40||r.bottom>innerHeight-10)return;
    const S=r.width>r.height?1.06:1.1,el=document.createElement('div');el.className='msp';
    // imleç spot öğelerinden çıkınca: fragman serbest (uzakta) ise 700 ms içinde ona ya da kapağa/bilgiye ulaşırsa kapanmaz
    function leaveSoon(){clearTimeout(SPT.lg);const free=!!el.querySelector('.msp-yt.f');if(!free){spotOff(false,true);return}
      SPT.lg=setTimeout(()=>{if(SPT.el!==el||SPT.rs)return;if(!el.querySelector('.msp-f:hover,.msp-in:hover,.msp-yt:hover'))spotOff(false,true)},700)}
    el.innerHTML=`<div class="msp-bg"></div><div class="msp-f" style="left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;--s:${S}"></div><div class="msp-cap"><b>${E(it.title)}</b><small>${E(metaShort(it)||TN[it.type])}${stName(it)?' · '+E(stName(it)):''}</small></div>`;
    const f=el.querySelector('.msp-f'),cl=art.cloneNode(true);cl.className='msp-art';cl.style.borderRadius=getComputedStyle(art).borderRadius;f.appendChild(cl);
    if(!it.rating)f.insertAdjacentHTML('beforeend',srHTML());
    // bilgi paneli: kapağın hangi yanında yer çoksa oraya açılır; yer yoksa sadece altta ad
    const g=r.width*(S-1)/2,fl=r.left-g,fr=r.right+g,ft=Math.max(16,r.top-g),spR=innerWidth-fr-24,spL=fl-24,side=spR>=300||spR>=spL?'r':'l',sp=side==='r'?spR:spL;
    // ayrıntılar (bilgi + fragman) kapak öne çıktıktan ~2,2 sn sonra açılır (.det); o sırada altta ad durur, fragman arkada yüklenir
    const cap=el.querySelector('.msp-cap'),below=r.bottom+g+12;cap.style.left=(r.left+r.width/2)+'px';if(below+44<innerHeight)cap.style.top=below+'px';else cap.style.top=(r.top-g-52)+'px';
    if(sp>=280){const w=Math.min(400,sp-8);el.insertAdjacentHTML('beforeend',infoHTML(it,side));const inf=el.querySelector('.msp-in');
      inf.style.width=w+'px';inf.style.top=ft+'px';if(side==='r')inf.style.left=fr+'px';else inf.style.left=(fl-w)+'px';
      requestAnimationFrame(()=>{const h=inf.offsetHeight;if(ft+h>innerHeight-16)inf.style.top=Math.max(16,innerHeight-16-h)+'px'})
      // fragman: bilginin KARŞI tarafında; orada yer yoksa bilgi panelinin en üstünde
      if(hasTrailer(it)&&!lsg('mc:ytoff',false)){const osp=side==='r'?spL:spR,slot=document.createElement('div');
        /* yerleşim: bilginin karşı yanında 'l'/'r'; sığmazsa bilgi panelinde 'in'. Üstteki tutamaçtan ya da videoyu basılı tutup sürükleyerek
           taşınır (→ serbest 'f'), köşeden boyutlanır. Bu değişiklikler SADECE o anki fragman için: başka karta geçince her zamanki yer ve boy
           (genişlik = Görünüm panelindeki kalıcı ayar mc:ytw). Tutamaca çift tık: bu fragmanı da her zamanki yerine al. */
        let FP=null;const autoYs=osp>=290?(side==='r'?'l':'r'):null;let ys=autoYs||'in';
        {const edge=autoYs==='l'?fl:fr,cy=r.top+r.height/2;slot.className='msp-yt '+ys;if(ys==='in')inf.prepend(slot);else el.appendChild(slot);
          const max=()=>ys==='f'?innerWidth-16:Math.min(960,osp-50);
          const size=(w,keep)=>{if(ys==='in')return slot.offsetWidth;w=Math.max(240,Math.min(max(),w));const h=w*9/16;slot.style.width=w+'px';
            if(ys==='f'){const x=keep?parseFloat(slot.style.left):FP.x*innerWidth,y=keep?parseFloat(slot.style.top):FP.y*innerHeight;slot.style.left=Math.max(8,Math.min(innerWidth-w-8,x))+'px';slot.style.top=Math.max(8,Math.min(innerHeight-h-8,y))+'px';return w}
            slot.style.top=Math.max(16,Math.min(innerHeight-16-h,keep?parseFloat(slot.style.top):cy-h/2))+'px';slot.style.left=(ys==='l'?edge-w-34:edge)+'px';return w};
          size(lsg('mc:ytw',480));slot.insertAdjacentHTML('beforeend',`<span class="msp-ymv" title="Sürükle: taşı · çift tık: eski yerine" aria-hidden="true"><i></i></span><span class="msp-yr ${ys==='l'?'l':'r'}" title="Sürükle: fragman boyutu · çift tık: varsayılan" aria-hidden="true"></span>`);
          const hd=slot.querySelector('.msp-yr'),mvh=slot.querySelector('.msp-ymv');
          // sürükleme bitince imleç spot dışındaysa kapan (sürüklerken kapanmaz)
          const endDrag=()=>setTimeout(()=>{SPT.rs=false;document.addEventListener('pointermove',ev=>{const t=ev.target;if(SPT.el===el&&!(el.querySelector('.msp-f')?.contains(t)||el.querySelector('.msp-in')?.contains(t)||slot.contains(t)))leaveSoon()},{once:true})},0);
          hd.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();const x0=e.clientX,w0=slot.querySelector('.msp-yv')?.offsetWidth||parseFloat(slot.style.width);let w=w0;try{hd.setPointerCapture(e.pointerId)}catch{}slot.classList.add('rs');SPT.rs=true;
            const mv=ev=>{w=size(w0+(ys==='l'?x0-ev.clientX:ev.clientX-x0),true)},up=()=>{hd.removeEventListener('pointermove',mv);hd.removeEventListener('pointerup',up);hd.removeEventListener('pointercancel',up);slot.classList.remove('rs');endDrag()};
            hd.addEventListener('pointermove',mv);hd.addEventListener('pointerup',up);hd.addEventListener('pointercancel',up)});
          hd.addEventListener('dblclick',e=>{e.stopPropagation();size(lsg('mc:ytw',480),true)});hd.addEventListener('click',e=>e.stopPropagation());
          // taşıma: tutamaç hemen; video yüzeyi 5 px'ten fazla sürüklenince (kısa tık = ses aç/kapa olarak kalır)
          slot.addEventListener('pointerdown',e=>{if(e.button||e.target.closest('.msp-yr,button,.msp-sk,.msp-vs'))return;const grip=!!e.target.closest('.msp-ymv'),x0=e.clientX,y0=e.clientY;let on=false,l0=0,t0=0;
                        const start=()=>{on=true;SPT.rs=true;try{slot.setPointerCapture(e.pointerId)}catch{}const b=(slot.querySelector('.msp-yv')||slot).getBoundingClientRect();
              if(ys!=='f'){if(ys==='in')el.appendChild(slot);ys='f';slot.classList.remove('l','r','in');slot.classList.add('f');hd.className='msp-yr r';slot.style.width=b.width+'px';slot.addEventListener('pointerleave',leave)}l0=b.left;t0=b.top;slot.classList.add('mv')};
            const mv=ev=>{if(!on){if(Math.hypot(ev.clientX-x0,ev.clientY-y0)<(grip?3:5))return;start()}const w=parseFloat(slot.style.width),h=w*9/16;
              slot.style.left=Math.max(8,Math.min(innerWidth-w-8,l0+ev.clientX-x0))+'px';slot.style.top=Math.max(8,Math.min(innerHeight-h-8,t0+ev.clientY-y0))+'px'};
            const up=()=>{slot.removeEventListener('pointermove',mv);slot.removeEventListener('pointerup',up);slot.removeEventListener('pointercancel',up);if(!on)return;slot.classList.remove('mv');slot._moved=true;
              FP={x:parseFloat(slot.style.left)/innerWidth,y:parseFloat(slot.style.top)/innerHeight};endDrag()};
            if(grip)e.preventDefault();slot.addEventListener('pointermove',mv);slot.addEventListener('pointerup',up);slot.addEventListener('pointercancel',up)});
          // taşımadan sonra gelen tık ses düğmesine dönüşmesin
          slot.addEventListener('click',e=>{if(slot._moved){slot._moved=false;e.stopPropagation();e.preventDefault()}},true);
          mvh.addEventListener('dblclick',e=>{e.stopPropagation();const c=SPT.card;spotOff(true);SPT.block=null;if(c?.isConnected)spotOn(c)})}
        const fail=()=>{if(SPT.el!==el)return;slot.remove();if(!inf.querySelector('[data-ytq]'))inf.querySelector('.msp-a')?.insertAdjacentHTML('beforeend',`<a data-ytq href="https://www.youtube.com/results?search_query=${encodeURIComponent(it.title+' '+(it.year||'')+' trailer')}" target="_blank" rel="noopener">Fragman${IC.r}</a>`)};
        ytIds(it).then(l=>{if(SPT.el!==el)return;if(l.length)ytMount(slot,l,fail,it.title);else fail()})}}
    document.body.appendChild(el);SPT.el=el;SPT.card=card;requestAnimationFrame(()=>requestAnimationFrame(()=>el.classList.add('on')));
    if(el.querySelector('.msp-in'))requestAnimationFrame(()=>requestAnimationFrame(()=>el.classList.add('det')));
    const inf=el.querySelector('.msp-in'),yt=el.querySelector('.msp-yt:not(.in)'),leave=e=>{if(SPT.rs)return;const t=e.relatedTarget;if(t&&(f.contains(t)||inf?.contains(t)||yt?.contains(t)))return;if(SPT.el===el)leaveSoon()};
    if(yt){yt.addEventListener('pointerleave',leave);yt.addEventListener('wheel',e=>{spotOff(true);q('#scroll')?.scrollBy({top:e.deltaY,left:e.deltaX})},{passive:true})}
    f.addEventListener('pointerleave',leave);if(inf){inf.addEventListener('pointerleave',leave);inf.addEventListener('wheel',e=>{spotOff(true);q('#scroll')?.scrollBy({top:e.deltaY,left:e.deltaX})},{passive:true});
      inf.addEventListener('click',e=>{if(e.target.closest('[data-spo]')){spotOff(true);open(it.id)}else if(e.target.closest('a'))setTimeout(()=>spotOff(true),50)})}
    f.addEventListener('wheel',e=>{spotOff(true);q('#scroll')?.scrollBy({top:e.deltaY,left:e.deltaX})},{passive:true});
    f.addEventListener('contextmenu',e=>{e.preventDefault();spotOff(true);menu(it.id,card)});
    f.addEventListener('click',e=>{if(e.target.closest('.sr'))return;spotOff(true);open(it.id)});
    const sr=f.querySelector('.sr');if(sr)wireRate(sr,it)}
  // spot ışığındaki bilgi: tür·yıl, ad, türler, puanlar, durum, özet ve bağlantılar (yasal: nerede izlenir / mağaza)
  function infoHTML(it,side){const v=['movie','series','anime'].includes(it.type),g=it.type==='game',st=stName(it),m=[];
    if(it.genres.length)m.push(it.genres.slice(0,3).join(', '));if(it.eps&&it.type!=='movie')m.push(it.eps+' bölüm');if(g&&it.platforms.length)m.push(it.platforms.slice(0,3).join(', '));if(it.dur)m.push(it.dur);
    const L=[];if(v)L.push([`https://www.justwatch.com/tr/arama?q=${encodeURIComponent(it.title)}`,'Nerede izlenir']);if(g&&it.steam)L.push([`https://store.steampowered.com/app/${it.steam}/`,'Steam']);
    if(it.imdb)L.push([`https://www.imdb.com/title/${it.imdb}/`,'IMDb']);const nN=typeof pages!=='undefined'?notesFor(it.id).length:0;if(it.mal)L.push([`https://myanimelist.net/anime/${it.mal}`,'MyAnimeList']);
    let i=0;const x=h=>h?`<div class="msp-x" style="--i:${i++}">${h}</div>`:'';
    return`<div class="msp-in ${side==='r'?'r':'l'}">${x(`<span class="msp-k">${E(TN[it.type])}${it.year?' · '+E(it.year):''}</span>`)}${x(`<h3>${E(it.title)}</h3>`)}${x(m.length?`<p class="msp-m">${E(m.join(' · '))}</p>`:'')}
      ${x((it.score||it.rating||st)?`<p class="msp-b">${it.score?`<span class="mc-sc">${scoreBadge(it)}</span>`:''}${it.rating?`<span class="mc-mine">${IC.star}${it.rating}</span>`:''}${st?`<span class="msp-st">${E(st)}</span>`:''}</p>`:'')}
      ${x(it.desc?`<p class="msp-d">${E(it.desc)}</p>`:'')}
      ${x(`<p class="msp-a"><button type="button" class="msp-go" data-spo>${IC.play}Ayrıntılar</button>${nN?`<a href="#lib/i/${it.id}" class="msp-nn" title="Bu yapıma bağlı Workspace notları">📝 ${nN} not</a>`:''}${L.map(([h,n])=>`<a href="${h}" target="_blank" rel="noopener">${E(n)}${IC.r}</a>`).join('')}</p>`)}</div>`}
  function wireRate(sr,it){const lab=sr.querySelector('.sr-l');
    const show=v=>{SPT.v=v;sr.style.setProperty('--v',v);sr.setAttribute('aria-valuenow',v);
      lab.innerHTML=v?`<b class="sr-n">${v}</b><small>${RW[v]}</small>`:`<small>Sağa sola gezdir</small>`;
      if(v&&motion())lab.firstElementChild.animate([{transform:'scale(1.4)',opacity:.4},{transform:'scale(1)',opacity:1}],{duration:280,easing:'cubic-bezier(.2,.9,.3,1.3)'})};
    const at=e=>{const b=sr.getBoundingClientRect();return Math.max(1,Math.min(10,Math.ceil((e.clientX-b.left)/b.width*10)))};
    const commit=v=>{if(!v)return;it.rating=v;KB.saveItem(it);sr.classList.add('done');sr.classList.remove('open');lab.innerHTML=`${IC.star}<b>${v}</b>`;sr.setAttribute('aria-label','Puanım '+v+'/10');
      if(motion())sr.animate([{transform:'translateX(-50%) scale(1)'},{transform:'translateX(-50%) scale(1.18)'},{transform:'translateX(-50%) scale(1)'}],{duration:420,easing:'cubic-bezier(.2,.9,.3,1.2)'});
      patchCards([it.id]);setTimeout(()=>spotOff(),720)};
    sr.addEventListener('pointerenter',()=>{if(sr.classList.contains('done'))return;sr.classList.add('open');show(0)});
    sr.addEventListener('pointermove',e=>{if(!sr.classList.contains('open'))return;const v=at(e);if(v!==SPT.v)show(v)});
    sr.addEventListener('pointerleave',()=>{if(sr.classList.contains('done'))return;sr.classList.remove('open');SPT.v=0;sr.style.setProperty('--v',0);lab.innerHTML=`${IC.star}<b>Puanla</b>`});
    sr.addEventListener('click',e=>{e.stopPropagation();if(!sr.classList.contains('done'))commit(sr.classList.contains('open')?at(e):0)});
    sr.addEventListener('keydown',e=>{if(sr.classList.contains('done'))return;let v=SPT.v||0;if(e.key==='ArrowRight'||e.key==='ArrowUp')v=Math.min(10,v+1);else if(e.key==='ArrowLeft'||e.key==='ArrowDown')v=Math.max(1,v-1);else if(e.key==='Enter'||e.key===' '){e.preventDefault();commit(v);return}else if(e.key==='Escape'){spotOff();return}else return;
      e.preventDefault();sr.classList.add('open');show(v)})}
  // uzun ana sayfalar: ilk raflar hemen, diğerleri ekrana yaklaşınca çizilir (sayfa hafif kalır)
  const LZ=new Map();let lzN=0,io=null;
  function lazy(html){if(!html)return'';const k='z'+(++lzN);LZ.set(k,html);return`<div class="mc-lz" data-lz="${k}"></div>`}
  function lazyWatch(){io?.disconnect();if(!('IntersectionObserver'in window)){qa('.mc [data-lz]').forEach(fillLz);return}
    io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){io.unobserve(e.target);fillLz(e.target)}}),{root:q('#scroll'),rootMargin:'900px 0px'});qa('.mc [data-lz]').forEach(z=>io.observe(z))}
  function fillLz(z){const h=LZ.get(z.dataset.lz);LZ.delete(z.dataset.lz);if(h==null)return;z.outerHTML=h;arrows();if(h.includes('data-arec'))arecFill()}
  /* görünüm: tv = Apple TV (geniş büyük kapaklar) · nf = Netflix (yoğun posterler) · compact (küçük, az metin) · list (satırlar) */
  // Apple TV: kart şeklini kapaklar belirler — yatay görseli olanların çoğunluğu varsa geniş kart, yoksa büyük dikey poster (küçültülmüş/bulanık poster yok)
  const hasWide=it=>!!(it.wide||it.backdrop);
  // geniş karta sadece neredeyse hepsinin (%85) yatay görseli varsa geçilir; dikey poster geniş karta sığdırılırsa ince şerit kalacak kadar kırpılıyordu
  const wideOK=l=>{const a=l.filter(i=>i.cover||hasWide(i));return!a.length||a.filter(hasWide).length>=a.length*.85};
  // geniş kart (w/w2) her görünümde sadece yatay görseli olan raflarda; dikey poster geniş karta sığdırılıp aşırı kırpılmasın
  const vOf=(v,l=[])=>V()==='tv'?(v==='r'?'r':wideOK(l)?'w':'p'):V()==='compact'?'p':((v==='w'||v==='w2')&&!wideOK(l)?'p':v);
  const likeIc=it=>it.like>0?`<span class="ml-lk up" title="Beğendim">${IC.up}</span>`:it.like<0?`<span class="ml-lk down" title="Beğenmedim">${IC.down}</span>`:'<span class="ml-lk none" title="Değerlendirmedim">—</span>';
  function lrow(it){const s=stName(it),c=st.look.lc;return`<article class="ml-r t-${it.type}" data-mi="${it.id}" tabindex="0" aria-label="${E(it.title)}">${c.cover?poster(it,'ml-p'):''}
      <span class="ml-t"><b>${E(it.title)}</b>${st.look.meta?`<small>${E(TN[it.type])}${metaShort(it)?' · '+metaShort(it):''}</small>`:''}</span>
      ${c.st?`<span class="ml-s">${s?E(s):'<i>—</i>'}</span>`:''}${c.rate?`<button class="ml-sc" data-mq="rate" title="Puanla" aria-label="${it.rating?`Puanım ${it.rating}/10 — değiştir`:'Puanla'}">${it.rating?`<b>${it.rating}</b><small>/10</small>`:`${IC.star}<i>Puanla</i>`}</button>`:''}${c.score?`<span class="ml-gs">${it.score?scoreTxt(it):'<i>—</i>'}</span>`:''}${c.like?likeIc(it):''}
      ${c.fav?`<button class="ml-f${it.fav?' on':''}" data-mq="fav" aria-pressed="${it.fav}" aria-label="${it.fav?'Favorilerden çıkar':'Favorilere ekle'}" title="Favori">${IC.heart}</button>`:''}</article>`}
  const listHTML=l=>{const c=st.look.lc;return`<div class="ml"><div class="ml-hd" aria-hidden="true">${c.cover?'<span></span>':''}<span>Ad</span>${c.st?'<span>Durum</span>':''}${c.rate?'<span>Puanım</span>':''}${c.score?'<span>Genel puan</span>':''}${c.like?'<span>Beğeni</span>':''}${c.fav?'<span></span>':''}</div>${l.map(lrow).join('')}</div>`};
  const gridHTML=(l,s)=>V()==='list'?listHTML(l):(()=>{const tw=V()==='tv'&&wideOK(l);return`<div class="mc-grid v-${tw?'w':s==='games'?'g':'p'}${l.length&&l.every(i=>i.type==='anime')?' an':''}">${l.map(it=>card(it,tw?'w':'p')).join('')}</div>`})();
  function shelf(title,list,o={}){if(!list.length)return'';const v=vOf(o.v||'p',list);
    if(V()==='list')return`<section class="mc-shelf ml-shelf"><header><h2>${E(title)}</h2>${o.href?`<a class="mc-all" href="${o.href}">Tümünü gör${IC.r}</a>`:''}</header>${listHTML(list.slice(0,6))}</section>`;
    return`<section class="mc-shelf${o.cls?' '+o.cls:''}${list.every(i=>i.type==='anime')?' an':''}"><header><h2>${E(title)}</h2>${o.sub?`<p>${E(o.sub)}</p>`:''}${o.href?`<a class="mc-all" href="${o.href}">Tümünü gör${IC.r}</a>`:''}</header>
      <div class="mc-rw"><button class="mc-arr l" data-row="-1" aria-label="Sola kaydır" tabindex="-1">${IC.l}</button><div class="mc-row v-${v}">${list.map((it,i)=>card(it,v,i+1)).join('')}</div><button class="mc-arr r" data-row="1" aria-label="Sağa kaydır" tabindex="-1">${IC.r}</button></div></section>`}

  /* ── öne çıkan alan ── */
  function featured(list){const day=new Date().toDateString();const sc=it=>(it.status==='doing'?6:0)+(it.fav?3:0)+(it.backdrop?4:0)+(it.cover?2:-20)+(parseFloat(it.score)||0)/3+(hash(it.id+day)%100)/40;
    // vitrine sadece yatay arka planı olanlar: dikey posteri büyütüp bulanıklaştırmak yok
    return list.filter(i=>i.backdrop).sort((a,b)=>sc(b)-sc(a)).slice(0,5)}
  function kicker(it){return it.status==='doing'?(it.type==='game'?'Şu an oynuyorsun':'Kaldığın yerden devam et'):it.status==='todo'?(it.type==='game'?'Oynamak istediklerinden':'İzleme listenden'):it.fav?'Favorilerinden':it.status==='done'||it.status==='played'?(it.type==='game'?'Oynadıkların arasından':'İzlediklerinden'):'Kütüphanenden'}
  function hero(list){if(!list.length||!st.look.hero||V()==='compact'||V()==='list')return'';
    return`<section class="mh" aria-roledescription="carousel" aria-label="Öne çıkanlar"><div class="mh-sl">${list.map((it,i)=>{const wide=!!it.backdrop;
      return`<div class="mh-s${i===st.hero%list.length?' on':''}" data-i="${i}" aria-hidden="${i!==st.hero%list.length}">
        <div class="mh-bg">${IMG(it.backdrop||it.cover,wide?it.cover:it.cover2,'',i===0)}</div><div class="mh-gr"></div>
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
  /* ═ Workspace notları ↔ Medya: not nerede durursa dursun bağlı olduğu yapımın sayfasında görünür.
     Bağ: KB.link (sayfa↔yapım) ya da sayfadaki kaynak kartı (lib bloğu). Yeni notlar tek bir “Medya notları” sayfasının altına girer (her dizi için ayrı yapı gerekmez). ═ */
  const NROOT='medya-notlari';
  function noteIndex(){const M=new Map(),add=(iid,p)=>{if(!p||p.tpl===NROOT)return;if(!M.has(iid))M.set(iid,new Set());M.get(iid).add(p)};
    if(typeof pages==='undefined')return M;for(const l of KB.links){const a=l[0],b=l[1];if(a.startsWith('L_')&&pages.has(b))add(a,pages.get(b));else if(b.startsWith('L_')&&pages.has(a))add(b,pages.get(a))}
    for(const p of pages.values())for(const bl of p.blocks)if(bl.t==='lib'&&bl.lid)add(bl.lid,p);
    const out=new Map();for(const[k,v]of M)out.set(k,[...v].sort((a,b)=>b.updated-a.updated));return out}
  const notesFor=id=>noteIndex().get(id)||[];
  function notesRoot(){let r=[...pages.values()].find(p=>p.tpl===NROOT);if(!r){r=newPage({title:'Medya notları',icon:'🎬'});r.tpl=NROOT;
      r.blocks=[B('p','Filmler, diziler, animeler ve oyunlar hakkındaki notların. Her not, bağlı olduğu yapımın Medya sayfasında da görünür.')];touch(r)}return r}
  const noteIcon=t=>t==='game'?'🎮':t==='anime'?'🎌':t==='series'?'📺':t==='book'?'📖':'🎬';
  function newNote(it){const r=notesRoot(),p=newPage({title:it.title+' — notlar',icon:noteIcon(it.type)});p.parent=r.id;p.blocks=[B('lib','',{lid:it.id}),B('p')];touch(p);KB.link(p.id,it.id);go('#p/'+p.id);
    // başlık seçili gelir: hemen yeniden adlandır (ör. “Bölüm 30”), Enter → yazmaya geç
    setTimeout(()=>{const t=document.querySelector('#view .pg-title');if(!t)return;t.focus();const r=document.createRange();r.selectNodeContents(t);const sl=getSelection();sl.removeAllRanges();sl.addRange(r)},160)}
  // var olan bir notu bağla: arama kutulu küçük liste
  function linkPicker(it,anchor){q('.mnp')?.remove();const m=document.createElement('div');m.className='mnp';m.setAttribute('role','dialog');m.setAttribute('aria-label','Not bağla');
    const have=new Set(notesFor(it.id).map(p=>p.id)),list=qs=>[...pages.values()].filter(p=>p.tpl!==NROOT&&!have.has(p.id)&&(!qs||titleOf(p).toLocaleLowerCase('tr').includes(qs))).sort((a,b)=>b.updated-a.updated).slice(0,30);
    const draw=qs=>{const L=list(qs);m.querySelector('.mnp-l').innerHTML=L.length?L.map(p=>`<button data-np="${p.id}"><span>${E(iconOf(p))}</span><b>${E(titleOf(p))}</b><small>${E(rel(p.updated))}</small></button>`).join(''):'<p class="mnp-e">Eşleşen not yok.</p>'};
    m.innerHTML=`<label class="mnp-s">${IC.search}<input placeholder="Not ara…" aria-label="Not ara"></label><div class="mnp-l"></div>`;document.body.appendChild(m);draw('');
    const r=anchor.getBoundingClientRect();m.style.left=Math.max(8,Math.min(innerWidth-328,r.left))+'px';m.style.top=Math.min(innerHeight-360,r.bottom+6)+'px';m.querySelector('input').focus();
    m.addEventListener('input',e=>draw(e.target.value.trim().toLocaleLowerCase('tr')));
    m.addEventListener('click',e=>{const b=e.target.closest('[data-np]');if(!b)return;KB.link(b.dataset.np,it.id);m.remove();say('Not bağlandı');detailRefresh()});
    setTimeout(()=>addEventListener('pointerdown',function f(e){if(!m.contains(e.target)){m.remove();removeEventListener('pointerdown',f,true)}},true),0)}
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
      arec:()=>recShelf(),
      notes:()=>{const N=noteIndex();return shelf(SH.notes,l.filter(i=>N.has(i.id)).sort((a,b)=>N.get(b.id)[0].updated-N.get(a.id)[0].updated).slice(0,20),{sub:'Workspace’teki notlarına bağlı yapımlar'})},
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
      ${s==='anime'?recShelf():''}
      ${shelf(g?'Şu an oynadıkların':b?'Okuduğun kitaplar':'Devam ettiklerin',byTouch(p('doing')),{v:g?'w':b?'p':'w2',href:`#lib/m/${s}/doing`})}
      ${shelf(g?'Oynamak istediklerin':b?'Okumak istediklerin':'İzlemek istediklerin',byScore(p('todo')),{href:`#lib/m/${s}/todo`})}
      ${shelf('Son eklenenler',byAdded(l).slice(0,20),{href:`#lib/m/${s}/all`})}
      ${ser?lazy(shelf('Yarım bıraktıkların',byTouch(p('dropped')),{href:`#lib/m/${s}/dropped`})):''}
      ${lazy(shelf(g?'En yüksek puanlı oyunların':b?'Okudukların':'En yüksek puanlılar',byScore(l.filter(i=>['done','played'].includes(stOf(i)))).slice(0,10),{v:b?'p':'r',href:`#lib/m/${s}/${g?'played':'done'}`}))}
      ${genres.map(gn=>lazy(shelf(gn,byScore(l.filter(i=>i.genres.includes(gn))).slice(0,18),{href:`#lib/m/${s}/all?g=${encodeURIComponent(gn)}`}))).join('')}
      ${lazy(shelf('Favorilerin',l.filter(i=>i.fav),{href:`#lib/m/${s}/fav`}))}</div>`}
  /* ═ Bağlantı testi: Medya'nın kullandığı her servisi KULLANICININ tarayıcısından dener (engellendi / zaman aşımı / çok istek…),
     sonucu kopyalanabilir metin olarak verir. Görünüm panelinden ve “öneriler alınamadı” uyarısından açılır. ═ */
  async function netTest(){dismiss();const bg=document.createElement('div');bg.className='mrcp-bg mnt-bg';
    const T=[['MyAnimeList (Jikan)','Anime kapakları, yeni sezonlar, yedek öneriler','j','https://api.jikan.moe/v4/anime/1'],
      ['AniList','Anime önerileri ve fragmanları','al','https://graphql.anilist.co'],
      ['iTunes','Film kapakları ve fragmanları','jsonp','https://itunes.apple.com/search?term=inception&media=movie&limit=1'],
      ['Wikidata','Eşleştirme, fragman, devam filmleri','j','https://www.wikidata.org/w/api.php?action=wbgetentities&ids=Q42&props=labels&languages=en&format=json&origin=*'],
      ['Wikidata arama','Poster eşleştirme','j','https://query.wikidata.org/sparql?format=json&query='+encodeURIComponent('SELECT ?x WHERE{BIND(1 AS ?x)}')],
      ['TVmaze','Dizi kapakları ve yeni sezonlar','j','https://api.tvmaze.com/shows/1'],
      ['YouTube','Fragman oynatıcı','img','https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg'],
      ['KinoCheck','Film/dizi fragmanları (anahtarsız)','j','https://api.kinocheck.com/movies?imdb_id=tt0111161&language=en'],
      ...(tmdbKey()?[['TMDB (anahtarın)','Film/dizi fragmanları ve posterleri','j','https://api.themoviedb.org/3/configuration?api_key='+encodeURIComponent(tmdbKey())]]:[]),
      ...(ytKey()?[['YouTube araması (anahtarın)','Oyun ve kalan fragmanlar','j','https://www.googleapis.com/youtube/v3/videos?part=id&id=dQw4w9WgXcQ&key='+encodeURIComponent(ytKey())]]:[]),
      ['Önizleme (microlink)','Notlardaki link kartları','j','https://api.microlink.io/?url=https://example.com']];
    const row=(t,r)=>`<li class="${r?r.ok?'ok':'no':'wait'}"><span class="mnt-i" aria-hidden="true">${r?r.ok?'✓':'✕':'…'}</span><span class="mnt-n"><b>${E(t[0])}</b><small>${E(t[1])}</small></span><em>${r?r.ok?r.ms+' ms':E(r.why):'deneniyor'}</em></li>`;
    const R=T.map(()=>null);const paint=()=>{const done=R.every(Boolean),bad=R.filter(r=>r&&!r.ok).length;
      bg.querySelector('.mnt-l').innerHTML=T.map((t,i)=>row(t,R[i])).join('');
      bg.querySelector('.mnt-s').innerHTML=!done?'Deneniyor…':!bad?'Hepsi çalışıyor. Sorun sürüyorsa sayfayı Ctrl+Shift+R ile yenile.':bad===T.length?'<b>Hiçbir servise ulaşılamıyor.</b> İnternet, okul/iş ağı, VPN ya da bir reklam/izleyici engelleyici (uBlock, AdGuard, Brave Kalkanları…) bu siteyi engelliyor olabilir. Bu site için engelleyiciyi kapatıp yeniden dene.':`<b>${bad} servis çalışmıyor.</b> Genelde bir reklam/izleyici engelleyici ya da ağ filtresi tek tek servisleri engeller; bu site için kapatıp yeniden dene. Sonucu kopyalayıp gönderirsen birlikte bakarız.`};
    bg.innerHTML=`<div class="mrcp mnt" role="dialog" aria-modal="true" aria-label="Bağlantı testi"><button class="mns-x mrcp-x" data-rx aria-label="Kapat">${IC.x}</button>
      <div class="mnt-b"><h3>Bağlantı testi</h3><p class="mnt-o">Tarayıcı: ${navigator.onLine?'çevrimiçi':'<b>çevrimdışı</b>'}</p><ul class="mnt-l"></ul><p class="mnt-s"></p>
      <div class="mrcp-a"><button class="mb" data-ncopy>Sonucu kopyala</button><button class="mb" data-nagain>Yeniden dene</button></div></div></div>`;
    document.body.appendChild(bg);
    const to=(p,ms=9000)=>Promise.race([p,new Promise((_,no)=>setTimeout(()=>no(new Error('zaman aşımı')),ms))]);
    const probe=async t=>{const t0=performance.now(),[,,k,u]=t;try{
        if(k==='img')await to(new Promise((ok,no)=>{const im=new Image();im.onload=ok;im.onerror=()=>no(new Error('engellendi'));im.src=u+'?'+Date.now()}));
        else if(k==='jsonp')await to(new Promise((ok,no)=>{const cb='__nt'+Math.random().toString(36).slice(2),sc=document.createElement('script');window[cb]=()=>{ok();sc.remove();delete window[cb]};sc.onerror=()=>{no(new Error('engellendi'));sc.remove()};sc.src=u+'&callback='+cb;document.head.appendChild(sc)}));
        else{const r=await to(fetch(u,k==='al'?{method:'POST',headers:{'Content-Type':'application/json'},body:'{"query":"{Media(id:1){id}}"}'}:{}));if(!r.ok)throw new Error(r.status===429?'çok fazla istek (429) — biraz bekle':'servis hatası (HTTP '+r.status+')')}
        return{ok:true,ms:Math.round(performance.now()-t0)}}
      catch(e){return{ok:false,why:/zaman/.test(e.message)?'zaman aşımı':/429|HTTP/.test(e.message)?e.message:'engellendi (ağ ya da eklenti)'}}};
    const run=async()=>{R.fill(null);paint();await Promise.all(T.map(async(t,i)=>{R[i]=await probe(t);paint()}))};
    const txt=()=>`Bağlantı testi · ${new Date().toLocaleString('tr-TR')} · tarayıcı ${navigator.onLine?'çevrimiçi':'çevrimdışı'}\n`+T.map((t,i)=>`${R[i]?.ok?'✓':'✕'} ${t[0]}: ${R[i]?R[i].ok?R[i].ms+' ms':R[i].why:'?'}`).join('\n')+`\n${navigator.userAgent}`;
    bg.addEventListener('click',e=>{if(e.target===bg||e.target.closest('[data-rx]'))return bg.remove();if(e.target.closest('[data-nagain]'))run();
      if(e.target.closest('[data-ncopy]'))navigator.clipboard?.writeText(txt()).then(()=>say('Sonuç kopyalandı — bana yapıştırabilirsin'),()=>say('Kopyalanamadı'))});
    bg.addEventListener('keydown',e=>{if(e.key==='Escape')bg.remove()});run()}
  /* ═ AniList (GraphQL, CORS açık, ~90 istek/dk): öneriler ve anime fragmanları için ana kaynak; Jikan yedek ═ */
  let alq=Promise.resolve();
  const alGQL=(query,variables={})=>{const p=alq.then(()=>fetchSafe('https://graphql.anilist.co',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({query,variables})}))
      .then(r=>{if(!r.ok)throw new Error('AniList HTTP '+r.status);return r.json()}).then(j=>{if(j.errors&&!j.data)throw new Error('AniList: '+(j.errors[0]?.message||'hata'));return j.data});
    alq=p.catch(()=>{}).then(()=>new Promise(z=>setTimeout(z,700)));return p};
  const SEASON=()=>{const d=new Date(),m=d.getMonth(),y=d.getFullYear();return m===11?['WINTER',y+1]:m<2?['WINTER',y]:m<5?['SPRING',y]:m<8?['SUMMER',y]:['FALL',y]};
  const alPack=m=>({key:m.idMal?String(m.idMal):'al'+m.id,mal:m.idMal||0,al:m.id,t:m.title?.english||m.title?.romaji||'',o:m.title?.romaji||'',img:m.coverImage?.extraLarge||m.coverImage?.large||'',
    sc:m.averageScore?m.averageScore/10:0,mem:m.popularity||0,eps:m.episodes||0,g:(m.genres||[]).map(x=>cleanG(x)).filter(Boolean).slice(0,4),
    syn:String(m.description||'').replace(/<br\s*\/?>/gi,' ').replace(/<[^>]+>/g,'').replace(/\(Source:[^)]*\)/i,'').replace(/\s+/g,' ').trim().slice(0,900),
    y:m.startDate?.year||0,from:m.startDate?.year&&m.startDate?.month?`${m.startDate.year}-${String(m.startDate.month).padStart(2,'0')}-${String(m.startDate.day||1).padStart(2,'0')}`:'',
    tr:m.trailer?.site==='youtube'?m.trailer.id:'',st:(m.studios?.nodes||[]).map(x=>x.name).slice(0,2).join(', '),air:m.status==='RELEASING'});
  /* ═ Yeni çıkan popüler animeler (öneri): MyAnimeList “bu sezon” (Jikan seasons/now, 2 sayfa) → listende olmayanlar,
     takipçi sayısına göre + sevdiğin türlere uyanlar öne. 12 saat önbellek (mc:arec). Kart → önizleme (özet, puan) → “İzlemek istiyorum”. ═ */
  const AREC_TTL=12*36e5;let arecP=null;
  const arecPack=d=>({key:String(d.mal_id),mal:d.mal_id,t:d.title_english||d.title,o:d.title,img:malCover(d),sc:d.score||0,mem:d.members||0,eps:d.episodes||0,g:(d.genres||[]).concat((d.themes||[]).slice(0,1)).map(x=>cleanG(x.name)).filter(Boolean).slice(0,4),
    syn:String(d.synopsis||'').replace(/\s*\[Written by MAL Rewrite\]\s*/,'').slice(0,900),y:d.year||+(d.aired?.from||'').slice(0,4)||0,from:(d.aired?.from||'').slice(0,10),tr:d.trailer?.youtube_id||'',st:(d.studios||[]).map(x=>x.name).slice(0,2).join(', '),air:d.status==='Currently Airing'});
  let arecErr=false;
  function arecLoad(force){const c=lsg('mc:arec2',null);if(!force&&c&&Date.now()-c.at<AREC_TTL){arecErr=false;return Promise.resolve(c.d)}if(arecP)return arecP;
    arecP=(async()=>{let out=[];
      try{const[se,yr]=SEASON();const d=await alGQL(`query($s:MediaSeason,$y:Int){Page(perPage:50){media(season:$s,seasonYear:$y,type:ANIME,sort:POPULARITY_DESC,isAdult:false){idMal id title{romaji english} coverImage{extraLarge large} averageScore popularity episodes genres description(asHtml:false) startDate{year month day} status trailer{id site} studios(isMain:true){nodes{name}}}}}`,{s:se,y:yr});
        out=(d?.Page?.media||[]).map(alPack).filter(x=>x.t&&x.img)}catch(e){console.warn('AniList',e)}
      if(!out.length){try{const seen=new Set();for(const pg of[1,2]){const j=await jget(`https://api.jikan.moe/v4/seasons/now?sfw=true&limit=25&page=${pg}`);for(const d of j?.data||[]){if(seen.has(d.mal_id))continue;seen.add(d.mal_id);out.push(arecPack(d))}if(!j?.pagination?.has_next_page)break}}catch(e){console.warn('Jikan',e)}}
      arecP=null;if(out.length){arecErr=false;lss('mc:arec2',{at:Date.now(),d:out});return out}arecErr=true;return c?.d||[]})();return arecP}
  function arecPick(list){const mine=[...KB.items.values()].filter(i=>i.type==='anime'),mal=new Set(mine.map(i=>String(i.mal)).filter(Boolean)),tt=new Set(mine.map(i=>norm(i.title)));
    const fav=new Map();mine.filter(i=>['done','doing'].includes(stOf(i))&&(i.rating>=7||i.like>0||i.fav||!i.rating)).forEach(i=>i.genres.forEach(g=>fav.set(g,(fav.get(g)||0)+1)));
    return list.filter(d=>!mal.has(String(d.mal))&&!tt.has(norm(d.t))&&!tt.has(norm(d.o))).map(d=>{const why=d.g.filter(g=>fav.has(g));return{...d,why,rk:Math.log10(1+d.mem)+why.reduce((a,g)=>a+Math.min(1,fav.get(g)/3),0)*.6+(d.sc||0)/20}}).sort((a,b)=>b.rk-a.rk).slice(0,20)}
  const arecCard=d=>`<article class="mc-card v-p t-anime mrc" data-arid="${E(d.key||String(d.mal))}" tabindex="0" aria-label="${E(d.t)} — önizle"><div class="mc-art"><div class="mp">${d.img?`<img src="${E(d.img)}" alt="" loading="lazy" referrerpolicy="no-referrer" onload="Media.imgOk(this)">`:''}</div>${d.sc?`<span class="mc-sc"><i>MAL</i>${d.sc.toFixed(1)}</span>`:''}${d.air?'<span class="mrc-new">Yeni</span>':''}</div>
    <div class="mc-cap"><b>${E(d.t)}</b><small>${E([d.g.slice(0,2).join(', '),d.eps?d.eps+' bölüm':''].filter(Boolean).join(' · ')||'Anime')}</small></div></article>`;
  function recShelf(){return`<section class="mc-shelf an mrec" data-arec><header><h2>Yeni çıkan popüler animeler</h2><p>Bu sezon yayında · listende olmayanlar · sevdiğin türler önde</p></header>
    <div class="mc-rw"><button class="mc-arr l" data-row="-1" aria-label="Sola kaydır" tabindex="-1">${IC.l}</button><div class="mc-row v-p">${'<article class="mc-card v-p mrc-sk"><div class="mc-art"><div class="mp"></div></div></article>'.repeat(6)}</div><button class="mc-arr r" data-row="1" aria-label="Sağa kaydır" tabindex="-1">${IC.r}</button></div></section>`}
  let arecData=[];
  async function arecFill(){const box=qa('#view>.mc [data-arec]');if(!box.length)return;const L=arecPick(await arecLoad());arecData=L;
    for(const b of qa('#view>.mc [data-arec]')){if(!L.length){const rw=b.querySelector('.mc-rw');if(arecErr&&rw)rw.outerHTML=`<p class="mrec-e">Öneriler şu an alınamadı — servislere ulaşılamıyor. <button class="mb sm" data-nettest>Bağlantıyı test et</button></p>`;else if(!arecErr)b.remove();continue}b.querySelector('.mc-row').innerHTML=L.map(arecCard).join('')}}
  function arecOpen(id){const d=arecData.find(x=>String(x.key||x.mal)===String(id));if(!d)return;q('.mrcp-bg')?.remove();const bg=document.createElement('div');bg.className='mrcp-bg';
    const meta=[d.y?String(d.y):'',d.eps?d.eps+' bölüm':'',d.st].filter(Boolean).join(' · '),when=d.air?'Şu an yayında':d.from?new Date(d.from+'T00:00').toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'})+' tarihinde başlıyor':'';
    bg.innerHTML=`<div class="mrcp" role="dialog" aria-modal="true" aria-label="${E(d.t)}"><button class="mns-x mrcp-x" data-rx aria-label="Kapat">${IC.x}</button>
      <div class="mrcp-p">${d.img?`<img src="${E(d.img)}" alt="" referrerpolicy="no-referrer">`:''}</div>
      <div class="mrcp-b"><span class="mrcp-k">${E(when)}</span><h3>${E(d.t)}</h3>${d.o&&d.o!==d.t?`<p class="mrcp-o">${E(d.o)}</p>`:''}
        <p class="mrcp-m">${d.sc?`<span class="mc-sc"><i>MAL</i>${d.sc.toFixed(1)}</span>`:''}${E(meta)}</p>
        ${d.g.length?`<p class="mrcp-g">${d.g.map(g=>`<span class="${d.why.includes(g)?'on':''}">${E(g)}</span>`).join('')}</p>`:''}
        ${d.why.length?`<p class="mrcp-w">${E(d.why.slice(0,2).join(' ve '))} sevdiğin için önerildi</p>`:''}
        ${d.syn?`<p class="mrcp-s">${E(d.syn)}</p>`:''}
        <div class="mrcp-a"><button class="mb pri" data-radd>${IC.plus}İzlemek istiyorum</button>${d.tr?`<a class="mb" href="https://www.youtube.com/watch?v=${E(d.tr)}" target="_blank" rel="noopener">${IC.play}Fragman</a>`:''}${d.mal?`<a class="mb" href="https://myanimelist.net/anime/${d.mal}" target="_blank" rel="noopener">MyAnimeList${IC.r}</a>`:d.al?`<a class="mb" href="https://anilist.co/anime/${d.al}" target="_blank" rel="noopener">AniList${IC.r}</a>`:''}</div></div></div>`;
    document.body.appendChild(bg);if(motion())bg.firstElementChild.animate([{opacity:0,transform:'translateY(10px) scale(.98)'},{opacity:1,transform:'none'}],{duration:320,easing:'cubic-bezier(.16,1,.3,1)'});bg.querySelector('[data-radd]').focus();
    const close=()=>bg.remove();bg.addEventListener('click',e=>{if(e.target===bg||e.target.closest('[data-rx]'))return close();
      if(e.target.closest('[data-radd]')){const it=KB.addItem({type:'anime',title:d.t,year:d.y?String(d.y):'',mal:d.mal?String(d.mal):'',cover:d.img,eps:d.eps,genres:d.g,desc:d.syn,status:'todo',match:'ok',metaAt:Date.now(),reviewed:true,tags:['anime']});
        close();say(`“${d.t}” izlemek istediklerine eklendi`);arecData=arecData.filter(x=>x!==d);qa(`[data-arid="${CSS.escape(String(d.key||d.mal))}"]`).forEach(c=>c.remove())}});
    bg.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();close()}})}
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
      <div class="mc-tabs">${tabs.map(([k,n,h,ic])=>`<a href="${h}" class="t-${k}${st.sec===k?' on':''}"${st.sec===k?' aria-current="page"':''}>${ic}<span>${n}</span></a>`).join('')}${st.look.tabsOff.includes('docs')?'':`<a href="#lib/docs" class="t-docs">${IC.link}<span>Belgeler</span></a>`}<button type="button" class="mc-ns" data-ns aria-haspopup="dialog" aria-expanded="false" title="Yeni sezonu gelen ya da gelecek olanlar">${IC.bell}<span>Yeni sezonlar</span><em></em></button></div>
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
      ${filters}${viewSeg()}<button class="mc-gear mc-dice" data-mpick aria-label="Bu akşam ne izlesem?" title="Bu akşam ne izlesem? (zar)">${IC.dice}</button><button class="mc-gear" data-mset aria-label="Görünüm ayarları" title="Görünüm ayarları" aria-haspopup="dialog">${IC.gear}</button>
      <button class="mc-add" data-madd title="Ekle (A)" aria-label="İçerik ekle">${IC.plus}<span>Ekle</span></button></div>`;
    if(home)return`<div class="mc-pbar sbar home">${tools}</div>`;
    const n=all().filter(i=>inSec(i,st.sec)).length;
    return`<div class="mc-pbar sbar"><div class="mc-pt"><h1>${E(SEC[st.sec].n)}</h1><span class="mc-pb-n">${n} ${countTxt().split(' ').slice(1).join(' ')}</span></div>${tools}
      ${sub?`<nav class="mc-sub" aria-label="${E(SEC[st.sec].n)} sayfaları">${sub}</nav>`:''}</div>`}
  const syncTxt=()=>`Posterler eşleşiyor ${R.done}/${R.total}`;
  function body(){if(st.qs)return searchHTML();if(st.sec==='home')return homeHTML();if(st.page==='home')return secHome(st.sec);return pageHTML(st.sec,st.page)}
  function parse(parts){const p=parts||[];let sec='home',page='home',gq='';if(p[0]==='m'){const k=p[1]==='tv'?'movies':p[1];sec=SEC[k]?k:'home';let pg=p[2]||'home';const i=pg.indexOf('?');if(i>=0){gq=decodeURIComponent((pg.slice(i+1).match(/g=([^&]*)/)||[])[1]||'');pg=pg.slice(0,i)}page=pg}
    return{sec,page,gq}}
  function render(parts,o={}){clearTimeout(wlT);wlT=setTimeout(saveWL,2000);const p=parse(parts);const changed=p.sec!==st.sec||p.page!==st.page;st.base=parts||[];
    if(changed){st.kind='';st.genre='';st.min=0;st.hero=0}if(p.sec!==st.sec)st.look=loadLook(p.sec);st.sec=p.sec;st.page=p.page;if(p.gq){st.genre=p.gq;st.page='all'}if(changed||!o.keepQ)st.qs='';
    const v=q('#view');let root=q('#view>.mc');if(!root){v.innerHTML='<div class="mc"></div>';root=q('#view>.mc');wire(root)}
    root.dataset.sec=st.sec;applyLook(root);const b=body();root.innerHTML=nav()+`<main class="mc-main">${b}</main>`;root.classList.toggle('has-hero',!!q('.mh',root));if(changed)enter(q('.mc-main',root));
    document.getElementById('app')?.classList.add('mc-on');
    if(typeof setCrumb==='function')setCrumb(IC.play,st.sec==='home'?'Medya':SEC[st.sec].n,'');
    if(changed&&!o.soft)q('#scroll').scrollTop=0;else if(changed)q('#scroll').scrollTop=0;
    heroStart();arrows();lazyWatch();Library.loadPack?.().then(migrate);queue();arecFill();if(!aniFix.done){aniFix.done=1;setTimeout(()=>aniFix(),2500);setTimeout(()=>nsRun(),6000);setTimeout(()=>coverFix(),9000)}nsPaint()}
  function refresh(){const root=q('#view>.mc');if(!root)return;const sc=q('#scroll'),y=sc.scrollTop,rows=qa('.mc-row',root).map(r=>r.scrollLeft),f=document.activeElement,inS=f&&f.matches('[data-ms]');
    if(inS){const m=q('.mc-main',root);m.innerHTML=body()}else{const b=body();root.innerHTML=nav()+`<main class="mc-main">${b}</main>`;root.classList.toggle('has-hero',!!q('.mh',root))}
    lazyWatch();qa('.mc-row',root).forEach((r,i)=>r.scrollLeft=rows[i]||0);sc.scrollTop=y;heroStart();arrows();if(q('.mx-bg'))detailRefresh()}
  function arrows(){qa('.mc .mc-row').forEach(r=>{const w=r.closest('.mc-rw');const upd=()=>{w.classList.toggle('al',r.scrollLeft>8);w.classList.toggle('ar',r.scrollLeft+r.clientWidth<r.scrollWidth-8)};upd();r.onscroll=upd})}
  let rT=0;KB.on(()=>{if(!q('#view>.mc'))return;clearTimeout(rT);rT=setTimeout(()=>{const f=document.activeElement;if(f&&f.closest?.('.mx textarea,.mx input,.mx [contenteditable],.mq'))return detailRefresh(true);refresh()},140)});

  /* ── olaylar ── */
  function wire(root){
    // spot ışığı: imleç bir kapakta ~0,3 sn durursa (geçip giderken tetiklenmez)
    root.addEventListener('pointerover',e=>{if(!(e.pointerType==='pen'||(e.pointerType==='mouse'&&fineHover())))return;const c=e.target.closest?.('.mc-card[data-mi]');if(!c||c===SPT.card||c.dataset.mi===SPT.block)return;clearTimeout(SPT.t);SPT.over=c;{const it=KB.items.get(c.dataset.mi);if(hasTrailer(it)){warmYT();ytIds(it)}}
      SPT.t=setTimeout(()=>{if(Date.now()>(SPT.quiet||0)&&SPT.over===c&&!document.body.classList.contains('mset-drag')&&!q('.mset,.mq,.mrp'))spotOn(c)},SPOT_MS)});
    root.addEventListener('pointerout',e=>{const c=e.target.closest?.('.mc-card[data-mi]');if(c&&!c.contains(e.relatedTarget)){clearTimeout(SPT.t);if(SPT.over===c)SPT.over=null;if(c.dataset.mi===SPT.block)SPT.block=null}});
    root.addEventListener('click',e=>{const t=e.target;
      const rw=t.closest('[data-row]');if(rw){const r=rw.parentElement.querySelector('.mc-row');r.scrollBy({left:+rw.dataset.row*r.clientWidth*.86,behavior:motion()?'smooth':'auto'});return}
      const hd=t.closest('[data-hd]');if(hd){heroGo(+hd.dataset.hd);return}
      const mk=t.closest('[data-mk]');if(mk){st.kind=mk.dataset.mk;swap();return}
      const lv=t.closest('[data-lv]');if(lv){setLook('view',lv.dataset.lv,true);q('.mset')&&qa('.mset [data-lk=view]').forEach(x=>{const on=x.dataset.lval===V();x.classList.toggle('on',on);x.setAttribute('aria-checked',on)});return}
      const rc=t.closest('[data-arid]');if(rc){arecOpen(rc.dataset.arid);return}
      if(t.closest('[data-nettest]')){netTest();return}
      const nb=t.closest('[data-ns]');if(nb){nsPanel(nb);if(!nsBusy)nsRun();return}
      if(t.closest('[data-mpick]')){pickSheet();return}
      const ms=t.closest('[data-mset]');if(ms){q('.mset')?q('.mset').remove():settings(ms);return}
      const mg=t.closest('[data-mg]');if(mg){st.genre=mg.dataset.mg;swap();return}
      const ad=t.closest('[data-madd]');if(ad){addSheet(ad.dataset.madd||'');return}
      const fx=t.closest('[data-mfix]');if(fx){fix(fx.dataset.id,fx.dataset.mfix);return}
      const mq=t.closest('[data-mq]');if(mq){e.preventDefault();e.stopPropagation();const id=mq.dataset.id||mq.closest('[data-mi]')?.dataset.mi;if(mq.dataset.mq==='more')return menu(id,mq);if(mq.dataset.mq==='rate')return ratePop(id,mq);act(id,mq.dataset.mq);return}
      const mo=t.closest('[data-mo]');if(mo){open(mo.dataset.mo);return}
      const c=t.closest('[data-mi]');if(c&&!t.closest('a')){open(c.dataset.mi)}});
    root.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.matches?.('[data-arid]')){e.preventDefault();arecOpen(e.target.dataset.arid);return}const c=e.target.closest?.('[data-mi]');if(c&&e.target===c&&(e.key==='Enter'||e.key===' ')){e.preventDefault();open(c.dataset.mi)}
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
  function saveLook(){lss('mc:look:'+st.sec,st.look);const g=lsg('mc:look',{})||{};g.tabsOff=st.look.tabsOff;lss('mc:look',g)}
  /* bölüm/görünüm değişiminde kısa giriş (transform+opacity, ~280ms) */
  function enter(el){if(el&&motion())el.animate([{opacity:0,transform:'translateY(6px)'},{opacity:1,transform:'none'}],{duration:280,easing:'cubic-bezier(.16,1,.3,1)'})}
  function setLook(k,v,redraw){st.look[k]=v;saveLook();applyLook();if(redraw){swap();enter(q('.mc .mc-main'));qa('.mc [data-lv]').forEach(b=>{const on=b.dataset.lv===V();b.classList.toggle('on',on);b.setAttribute('aria-checked',on)})}}
  /* boyut önizlemesi: kütüphaneden rastgele bir kapak; kenarından/köşesinden çekilerek bütün kartlar boyutlanır */
  let pvIt=null;
  const pvPick=()=>{const inSec=i=>st.sec==='home'||secOf(i.type)===st.sec;if(pvIt&&KB.items.has(pvIt.id)&&inSec(pvIt))return pvIt;const l=[...KB.items.values()].filter(i=>AT.includes(i.type)&&inSec(i)&&(i.cover||i.backdrop||i.wide));pvIt=l.length?l[Math.random()*l.length|0]:null;return pvIt};
  /* boyut sınırları: her bölümde/görünümde kart en az ~480 px genişliğe kadar büyüyebilir (dar film posterleri de oyunlar gibi 460×400'e çıkar).
     Genişlik yüzdesinin tavanı o anki kartın %100'deki genişliğinden hesaplanır (en az %160, en çok %400); yükseklik %40–170. */
  const szLim=()=>{const a=q('#view>.mc .mc-main .mc-card[data-mi]')||q('#view>.mc .mc-card[data-mi]'),cz=(st.look.cover||100)/100,w=a?a.getBoundingClientRect().width/cz:0;
    return{cv:w>20?Math.min(400,Math.max(160,Math.ceil(480/w*20)*5)):300,arMin:40,arMax:170}};
  const pvBase=()=>V()==='tv'&&hasWide(pvPick()||{})?{B:150,R:215/460}:{B:96,R:3/2};
  function pvHTML(){const L=st.look,it=pvPick()||{id:'',type:'movie',title:'Örnek film',cover:''},wide=V()==='tv'&&hasWide(it),{B}=pvBase();
    return`<div class="mset-pv"><div class="mset-pf" style="width:${B*L.cover/100}px;--ar:${(L.ar||100)/100};--r:${L.radius}px">${wide?wideArt(it):poster(it)}
      <span class="mset-hx" data-pvh="x" tabindex="0" role="slider" aria-label="Kapak genişliği" aria-valuemin="60" aria-valuemax="${szLim().cv}" aria-valuenow="${L.cover}" title="Genişlik · çift tıkla: sıfırla"></span>
      <span class="mset-hy" data-pvh="y" tabindex="0" role="slider" aria-label="Kapak yüksekliği" aria-valuemin="40" aria-valuemax="170" aria-valuenow="${L.ar||100}" title="Yükseklik · çift tıkla: sıfırla"></span>
      <span class="mset-hc" data-pvh="xy" title="İkisi birden · çift tıkla: sıfırla" aria-hidden="true"></span></div>
      <div class="mset-pc"${L.title?'':' hidden'}>${E(it.title)}</div><div class="mset-sz" aria-live="polite"></div></div>
      <p class="mset-hint">Kenarından ya da köşesinden çek · çift tık sıfırlar</p>`}
  // ekrandaki gerçek kartın boyu (px) — önizleme küçük ölçekli, bu sayı gerçeği söyler
  const realSize=()=>{const a=q('#view>.mc .mc-main .mc-art, #view>.mc .mc-art');if(!a)return'';const r=a.getBoundingClientRect();return r.width?`${Math.round(r.width)} × ${Math.round(r.height)} px`:''};
  // anahtar satırı: yapıştır → kaydedilir ve denenir (✓/✕); bulunamayan fragmanlar yeniden aranır
  const keyRow=(k,n,d,u)=>{const v=lsg(k,'')||'';return`<div class="mset-key"><label for="mk-${k.slice(3)}">${n}<a href="${u}" target="_blank" rel="noopener">Nasıl alınır ↗</a></label>
    <div class="mset-kr"><input id="mk-${k.slice(3)}" type="password" autocomplete="off" spellcheck="false" placeholder="Yapıştır" value="${E(v)}" data-key="${k}" aria-describedby="mks-${k.slice(3)}"><span id="mks-${k.slice(3)}" class="mset-ks${v?' ok':''}" aria-live="polite">${v?'Kayıtlı':''}</span></div><small class="mset-kd">${d}</small></div>`};
  async function keyTest(k,v){if(!v)return'';try{const j=await getJSON(k==='mc:tmdb'?`https://api.themoviedb.org/3/configuration?api_key=${encodeURIComponent(v)}`:`https://www.googleapis.com/youtube/v3/videos?part=id&id=dQw4w9WgXcQ&key=${encodeURIComponent(v)}`);
    return j&&!j.error&&!j.status_code?'ok':'bad'}catch(e){return'net'}}
  function setHTML(){const L=st.look,seg=(k,o)=>`<div class="mset-seg" role="radiogroup">${o.map(([v,n])=>`<button role="radio" data-lk="${k}" data-lval="${v}" aria-checked="${L[k]===v}" class="${L[k]===v?'on':''}">${n}</button>`).join('')}</div>`;
    const rng=(k,n,min,max,stp,u='%')=>`<label for="mset-${k}">${n} <output>${L[k]}${u}</output></label><input id="mset-${k}" type="range" min="${min}" max="${max}" step="${stp}" value="${L[k]}" data-lr="${k}" data-u="${u}">`;
    const tg=(attr,k,n,on)=>`<button class="mset-tg" role="switch" ${attr}="${k}" aria-checked="${!!on}"><span>${n}</span><i aria-hidden="true"></i></button>`;
    const sh=L.shelves;
    return`<header><b>Görünüm <span class="mset-sc">· ${st.sec==='home'?'Ana sayfa':E(SEC[st.sec].n)}</span></b><button class="mset-x" data-msx aria-label="Kapat">${IC.x}</button></header>
      <h4>Görünüm türü</h4>${seg('view',VIEWS.map(([k,n])=>[k,n]))}
      <h4>Kartlar</h4>${pvHTML()}<div class="mset-tgs">${tg('data-lt','title','Altında isim',L.title)}</div>${rng('cover','Kapak genişliği',60,szLim().cv,5)}${rng('ar','Kapak yüksekliği',40,170,5)}${rng('radius','Köşe yuvarlaklığı',0,24,1,'px')}${rng('gap','Kart aralığı',40,220,10)}
      <label>Izgara yoğunluğu</label>${seg('dens',[['r','Rahat'],['n','Normal'],['s','Sıkı']])}
      <div class="mset-tgs">${tg('data-lt','meta','Yıl, tür, yazar',L.meta)}${tg('data-lt','badge','Genel puan rozeti',L.badge)}</div>
      <h4>Fragman</h4><div class="mset-tgs">${tg('data-lyt','on','Üstüne gelince fragman',!lsg('mc:ytoff',false))}</div><label for="mset-ytw">Fragman genişliği <output>${lsg('mc:ytw',480)}px</output></label><input id="mset-ytw" type="range" min="240" max="960" step="20" value="${lsg('mc:ytw',480)}" data-ytw>
      <h4>Fragman kaynakları</h4>${keyRow('mc:tmdb','TMDB anahtarı','Film ve dizilerin neredeyse hepsi','https://www.themoviedb.org/settings/api')}${keyRow('mc:ytkey','YouTube anahtarı','Oyunlar ve bulunamayan her şey','https://console.cloud.google.com/apis/library/youtube.googleapis.com')}
      <p class="mset-kh">İkisi de ücretsiz, isteğe bağlı. Sadece bu tarayıcıda saklanır, kimseyle paylaşılmaz.</p>
      <h4>Liste</h4>${rng('rowh','Satır yüksekliği',70,170,5)}
      <label>Sütunlar</label><div class="mset-tgs">${LC.map(([k,n])=>tg('data-lc',k,n,L.lc[k])).join('')}</div>
      <h4>Ana sayfa</h4><div class="mset-tgs">${tg('data-lt','hero','Büyük vitrin',L.hero)}</div>
      <label>Raflar — aç/kapat, sırala</label><div class="mset-shs">${sh.map((k,n)=>`<div class="mset-sh${L.off.includes(k)?' off':''}">${tg('data-lsh',k,SH[k],!L.off.includes(k)).replace('role="switch"',`role="switch" aria-label="${SH[k]} rafı"`)}
        <button data-lmv="${k}:-1" aria-label="${SH[k]} yukarı" ${n?'':'disabled'}>${IC.l}</button><button data-lmv="${k}:1" aria-label="${SH[k]} aşağı" ${n<sh.length-1?'':'disabled'}>${IC.r}</button></div>`).join('')}</div>
      <h4>Üstteki kategoriler</h4><div class="mset-tgs">${[...ORDER,'docs'].map(k=>{const n=k==='docs'?'Belgeler':SEC[k].n;return tg('data-ltab',k,n,!L.tabsOff.includes(k)).replace('role="switch"',`role="switch" aria-label="${n} sekmesi"`)}).join('')}</div>
      <h4>Yazı ve ikonlar</h4><label>Yazı boyutu</label>${seg('font',[['s','Küçük'],['m','Orta'],['l','Büyük']])}
      <label>İkon boyutu</label>${seg('icon',[['s','Küçük'],['m','Orta'],['l','Büyük']])}
      <h4>Bağlantı</h4><button class="mset-r" data-nettest>Bağlantıları test et</button>
      <button class="mset-r" data-msr>Bu bölümü varsayılana döndür</button>`}
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
      e.preventDefault();const Z=szLim();setSize(cl(cv,60,Math.max(Z.cv,L.cover)),cl(ar,Z.arMin,Z.arMax));saveLook()});
    el.addEventListener('change',async e=>{const t=e.target;if(!t.matches('[data-key]'))return;const k=t.dataset.key,v=t.value.trim(),ks=t.parentElement.querySelector('.mset-ks');lss(k,v);ytForgetEmpty();
      if(!v){ks.className='mset-ks';ks.textContent='Kaldırıldı';return}ks.className='mset-ks';ks.textContent='Deneniyor…';const r=await keyTest(k,v);if(!ks.isConnected)return;
      ks.className='mset-ks '+(r==='ok'?'ok':'bad');ks.textContent=r==='ok'?'✓ Çalışıyor':r==='bad'?'✕ Anahtar geçersiz':'Kaydedildi · şu an denenemedi'});
    el.addEventListener('input',e=>{const t=e.target;if(t.matches('[data-ytw]')){t.previousElementSibling.querySelector('output').textContent=t.value+'px';lss('mc:ytw',+t.value);return}if(t.dataset.lr){t.previousElementSibling.querySelector('output').textContent=t.value+t.dataset.u;setLook(t.dataset.lr,+t.value);pvSync()}});
    el.addEventListener('pointerdown',e=>{const h=e.target.closest('[data-pvh]');if(!h)return;e.preventDefault();const f=h.parentElement,ax=h.dataset.pvh,{B,R}=pvBase(),x0=e.clientX,y0=e.clientY,w0=f.offsetWidth,h0=f.offsetHeight;
      const L=st.look,c0=L.cover,a0=L.ar||100,Z=szLim(),cl=(v,a,b)=>{v=Math.abs(v-100)<=7?100:Math.round(v/5)*5;return Math.max(a,Math.min(b,v))};let raf=0,last=null;
      try{h.setPointerCapture(e.pointerId)}catch(_){}f.classList.add('drag');el.classList.add('see');document.body.classList.add('mset-drag');
      const step=()=>{raf=0;const ev=last;const w=ax==='y'?w0:w0+(ev.clientX-x0),hh=ax==='x'?h0*w/w0:h0+(ev.clientY-y0);
        const cv=ax==='y'?c0:cl(w/B*100,60,Math.max(Z.cv,c0)),ar=ax==='x'?a0:cl(hh/(Math.max(1,B*cv/100)*R)*100,Z.arMin,Z.arMax);
        setSize(cv,ar)};
      const mv=ev=>{last=ev;if(!raf)raf=requestAnimationFrame(step)};
      const up=()=>{h.removeEventListener('pointermove',mv);h.removeEventListener('pointerup',up);h.removeEventListener('pointercancel',up);if(raf){cancelAnimationFrame(raf);raf=0;if(last)step()}f.classList.remove('drag');el.classList.remove('see');document.body.classList.remove('mset-drag');saveLook()};
      h.addEventListener('pointermove',mv);h.addEventListener('pointerup',up);h.addEventListener('pointercancel',up)});
    el.addEventListener('click',e=>{const t=e.target,L=st.look;if(t.closest('[data-msx]'))return el.remove();if(t.closest('[data-nettest]')){el.remove();netTest();return}
      if(t.closest('[data-msr]')){st.look={...JSON.parse(JSON.stringify(LOOK0)),tabsOff:st.look.tabsOff};saveLook();applyLook();refresh();redrawPanel();return}
      const b=t.closest('[data-lk]');if(b){setLook(b.dataset.lk,b.dataset.lval,b.dataset.lk==='view');if(b.dataset.lk==='view'){redrawPanel();return}qa(`[data-lk="${b.dataset.lk}"]`,el).forEach(x=>{const on=x===b;x.classList.toggle('on',on);x.setAttribute('aria-checked',on)});return}
      const yo=t.closest('[data-lyt]');if(yo){const off=!lsg('mc:ytoff',false);lss('mc:ytoff',off);yo.setAttribute('aria-checked',!off);return}
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
    const bg=document.createElement('div');bg.className='mx-bg';bg.setAttribute('role','dialog');bg.setAttribute('aria-modal','true');bg.setAttribute('aria-label',it.title||'Ayrıntı');bg.dataset.sec=secOf(it.type);bg.innerHTML=detailHTML(it);document.body.appendChild(bg);wireDetail(bg);
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
  function notesSec(it,g){const L=typeof pages!=='undefined'?notesFor(it.id):[];
    return`<section class="mx-s mx-notes"><h3>Notlarım${L.length?` <span>${L.length}</span>`:''}</h3>
      ${L.length?`<div class="mx-nl">${L.map(p=>`<a class="mx-nt" href="#p/${p.id}"><span class="mx-ni">${E(iconOf(p))}</span><span class="mx-nb"><b>${E(titleOf(p))}</b><small>${E((firstText(p)||'').slice(0,90))}</small></span><em>${E(rel(p.updated))}</em></a>`).join('')}</div>`
        :`<p class="mx-ne">Bu yapım için Workspace’te not yok. Yeni not, Notlar’daki “Medya notları” sayfasının altına girer ve burada görünür.</p>`}
      <div class="mx-na"><button class="mb pri" data-nnew>${IC.plus}Yeni not</button><button class="mb" data-nlink>${IC.link}Var olan notu bağla</button></div>
      <label class="mx-qn"><span>Kısa not</span><textarea data-dn aria-label="Kısa not" placeholder="${g?'Nerede kaldın, neyi sevdin, hangi zorlukta oynuyorsun…':'Ne düşündün, en sevdiğin sahne, kimle izledin…'}">${E(it.note)}</textarea></label></section>`}
  function detailHTML(it){const s=secOf(it.type),g=it.type==='game',f=flagOf(it),wide=!!it.backdrop;
    const links=[it.wiki&&[`https://${it.wiki.startsWith('tr:')?'tr':'en'}.wikipedia.org/wiki/${it.wiki.replace(/^tr:/,'')}`,'Wikipedia'],it.imdb&&[`https://www.imdb.com/title/${it.imdb}/`,'IMDb'],it.mal&&[`https://myanimelist.net/anime/${it.mal}`,'MyAnimeList'],it.steam&&[`https://store.steampowered.com/app/${it.steam}/`,'Steam']].filter(Boolean);
    return`<article class="mx" role="dialog" aria-modal="true" aria-label="${E(it.title)}">
      <div class="mx-hero"><div class="mx-bd ${wide?'land':'post'}">${IMG(it.backdrop||it.cover,wide?it.cover:it.cover2,'',true)}</div><div class="mx-sh"></div>
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
        ${notesSec(it,g)}
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
      if(t.closest('[data-nnew]')){newNote(it);return}const nl=t.closest('[data-nlink]');if(nl){linkPicker(it,nl);return}
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
  // Bir servis yanıt vermeyince (hız sınırı, geçici hata, engelleyici eklenti…) bu “internet yok” DEĞİLDİR: bir kez daha dene,
  // olmazsa sitenin kendi adresine bak; bağlantı varsa sadece o kaynak hata verir (NetErr değil → eşleştirme durmaz).
  let onlineAt=0;
  async function reallyOffline(){if(navigator.onLine===false)return true;if(Date.now()-onlineAt<30000)return false;
    try{await fetch(new URL('../../apps.json',location.href).href+'?ping='+Date.now(),{cache:'no-store'});onlineAt=Date.now();return false}catch{return true}}
  async function fetchSafe(u,o){try{return await fetch(u,o)}catch(e){await new Promise(z=>setTimeout(z,1500));try{return await fetch(u,o)}catch(e2){
      if(await reallyOffline())throw new NetErr(e2.message);let h='';try{h=new URL(u).hostname}catch{}throw new Error('Kaynak yanıt vermedi: '+h)}}}
  async function getJSON(u,o){let r=await fetchSafe(u,o);if(r.status===429){await new Promise(z=>setTimeout(z,2500));r=await fetchSafe(u,o)}
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
  // iTunes resmî fragman (previewUrl, .m4v): film → movie, dizi → tvSeason. Ad (ve yıl ±1) eşleşmeli.
  function itPrev(term,year,kind,cc='us'){return new Promise(res=>{if(!term)return res('');const cb='__mcip'+Math.random().toString(36).slice(2);const s=document.createElement('script');let done=false;
    const fin=v=>{if(done)return;done=true;window[cb]=()=>{};s.remove();res(v)};const nt=norm(term);
    window[cb]=d=>{const L=(d?.results||[]).filter(x=>x.previewUrl);const nm=x=>norm(kind==='tv'?(x.collectionName||'').replace(/,?\s*(season|sezon)\s*\d+.*$/i,''):x.trackName||'');
      const yr=x=>!year||Math.abs(parseInt(x.releaseDate)-year)<=1;const r=L.find(x=>nm(x)===nt&&yr(x))||L.find(x=>(nm(x).startsWith(nt)||nt.startsWith(nm(x)))&&nm(x).length>2&&yr(x)&&year)||(year?null:L.find(x=>nm(x).startsWith(nt)));fin(r?.previewUrl||'')};
    s.onerror=()=>fin('');setTimeout(()=>fin(''),4000);
    s.src=`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&${kind==='tv'?'media=tvShow&entity=tvSeason':'media=movie&entity=movie'}&country=${cc}&limit=15&callback=${cb}`;document.head.appendChild(s)})}
  function itunes(term,year){return new Promise(res=>{const cb='__mcit'+Math.random().toString(36).slice(2);const s=document.createElement('script');let done=false;
    const fin=v=>{if(done)return;done=true;window[cb]=()=>{};s.remove();res(v)};
    window[cb]=d=>{const r=(d?.results||[]).find(x=>norm(x.trackName)===norm(term)&&(!year||Math.abs(parseInt(x.releaseDate)-year)<=1));fin(r?.artworkUrl100?r.artworkUrl100.replace(/\/\d+x\d+bb\.(jpg|png)$/,'/600x900bb.jpg'):'')};
    s.onerror=()=>fin('');setTimeout(()=>fin(''),9000);s.src=`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=movie&entity=movie&limit=10&callback=${cb}`;document.head.appendChild(s)})}
  // Jikan (MyAnimeList): bütün istekler tek sırada (eşleştirme, kapak onarımı, yeni sezon, öneri)
  let jk=Promise.resolve();const jget=u=>{const p=jk.then(()=>getJSON(u));jk=p.catch(()=>{}).then(()=>new Promise(z=>setTimeout(z,1100)));return p}; // Jikan sınırı: 3/sn ve 60/dk
  const jikan=id=>jget(`https://api.jikan.moe/v4/anime/${id}`);
  // MyAnimeList'te adıyla ara: başlık (orijinal/İngilizce/eş adlar) eşleşmeli, yıl biliniyorsa ±1
  async function malSearch(title,year){if(!title)return null;const j=await jget(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(title)}&limit=8`);const L=j?.data||[];const nt=norm(title);
    const names=d=>[d.title,d.title_english,d.title_japanese,...(d.title_synonyms||[]),...(d.titles||[]).map(x=>x.title)].filter(Boolean).map(norm);
    const yr=d=>+(d.year||d.aired?.prop?.from?.year||0),okY=d=>!year||!yr(d)||Math.abs(yr(d)-year)<=1;
    const ex=L.filter(d=>okY(d)&&names(d).includes(nt)),pre=L.filter(d=>okY(d)&&names(d).some(n=>n.startsWith(nt)||nt.startsWith(n)));
    const pick=a=>a.sort((x,y)=>(y.type==='TV')-(x.type==='TV')||(y.members||0)-(x.members||0))[0];return pick(ex)||(year?pick(pre):null)||null}
  const malCover=d=>d?.images?.webp?.large_image_url||d?.images?.jpg?.large_image_url||'';
  /* ═ Yeni sezonlar: izlediğin / izlemekte olduğun / yarım bıraktığın dizi, anime ve filmlerde yeni sezon (devam) geliyor mu, yeni mi geldi.
     Dizi: TVmaze sezonları · Anime: Jikan devam zinciri (/full → relations Sequel) · Film: Wikidata P156 (devamı) + P577. Sonuç 3 gün saklanır (mc:ns). ═ */
  const NS=lsg('mc:ns',{}),NSD=3*864e5;let nsBusy=false,nsProg=[0,0];
  const nsWatch=it=>['series','anime','movie'].includes(it.type)&&['done','doing','dropped'].includes(it.status);
  const ymdL=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,tdy=()=>ymdL(new Date());
  const dd=(a,b)=>Math.round((new Date(a+'T00:00')-new Date(b+'T00:00'))/864e5);
  const soft=p=>p.catch(e=>{if(e instanceof NetErr)throw e;return null});
  let tvq=Promise.resolve();const tvget=u=>{const p=tvq.then(()=>getJSON(u));tvq=p.catch(()=>{}).then(()=>new Promise(z=>setTimeout(z,550)));return p}; // TVmaze: ~20 istek/10 sn
  async function nsSeries(it){let sh=it.imdb?await soft(tvget(`https://api.tvmaze.com/lookup/shows?imdb=${it.imdb}`)):null;
    if(!sh){const x=await soft(tvget(`https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(it.title)}`));if(x&&(!it.year||!x.premiered||Math.abs(parseInt(x.premiered)-+it.year)<=1)&&norm(x.name)===norm(it.title))sh=x}
    if(!sh)return null;const L=((await soft(tvget(`https://api.tvmaze.com/shows/${sh.id}/seasons`)))||[]).filter(x=>x.number>0),t=tdy();
    const up=L.find(x=>x.premiereDate&&x.premiereDate>t);if(up)return{k:'up',date:up.premiereDate,label:`${up.number}. sezon`};
    const last=[...L].reverse().find(x=>x.premiereDate);if(last&&dd(t,last.premiereDate)<=60)return{k:'new',date:last.premiereDate,label:`${last.number}. sezon`};
    const tba=L.find(x=>!x.premiereDate);if(tba&&sh.status!=='Ended')return{k:'tba',label:`${tba.number}. sezon`};return null}
  async function nsAnime(it){if(!it.mal)return null;let d=(await jget(`https://api.jikan.moe/v4/anime/${it.mal}/full`))?.data,last=d,hop=0;
    while(d&&hop++<8){const sq=(d.relations||[]).find(r=>r.relation==='Sequel')?.entry?.find(e=>e.type==='anime');if(!sq)break;d=(await jget(`https://api.jikan.moe/v4/anime/${sq.mal_id}/full`))?.data;if(d)last=d}
    if(!last)return null;const t=tdy(),from=(last.aired?.from||'').slice(0,10),own=String(last.mal_id)===String(it.mal),name=last.title_english||last.title;
    if(last.status==='Not yet aired')return from&&from>t?{k:'up',date:from,label:name}:{k:'tba',label:name};
    if(last.status==='Currently Airing')return{k:'new',date:from||t,label:name,airing:true};
    if(!own&&from&&dd(t,from)<=60)return{k:'new',date:from,label:name};return null}
  async function nsMovie(it){if(!/^Q\d+$/.test(it.mid||''))return null;const e=await getJSON(`https://www.wikidata.org/w/api.php?action=wbgetclaims&entity=${it.mid}&property=P156&format=json&origin=*`);
    const q=e?.claims?.P156?.[0]?.mainsnak?.datavalue?.value?.id;if(!q)return null;const j=await getJSON(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${q}&props=claims|labels&languages=tr|en&format=json&origin=*`),en=j?.entities?.[q];
    const name=en?.labels?.tr?.value||en?.labels?.en?.value||'Devam filmi',raw=(en?.claims?.P577||[]).map(c=>c.mainsnak?.datavalue?.value?.time).filter(Boolean).map(x=>x.slice(1,11)).sort()[0];
    if(!raw)return{k:'tba',label:name};const date=raw.replace(/-00/g,'-01'),n=dd(date,tdy());const pr=raw.slice(5,7)==='00'?'y':raw.slice(8,10)==='00'?'m':'';if(n>0)return{k:'up',date,label:name,pr};if(-n<=60)return{k:'new',date,label:name};return null}
  async function nsRun(force){if(nsBusy)return;const L=[...KB.items.values()].filter(nsWatch).filter(it=>force||!NS[it.id]||Date.now()-NS[it.id].at>NSD);if(!L.length){nsPaint();return}
    nsBusy=true;nsProg=[0,L.length];nsPaint();
    for(const it of L){try{const r=it.type==='series'?await nsSeries(it):it.type==='anime'?await nsAnime(it):await nsMovie(it);NS[it.id]={at:Date.now(),r:r||null}}
      catch(e){if(e instanceof NetErr)break}nsProg[0]++;lss('mc:ns',NS);nsPaint()}
    nsBusy=false;nsPaint()}
  // liste: tarihler bugüne göre yeniden değerlendirilir (gelen “yakında” → “geldi”; 60 günü geçen “geldi” düşer)
  function nsList(){const t=tdy(),out=[];for(const it of KB.items.values()){const x=NS[it.id]?.r;if(!x||!nsWatch(it))continue;let k=x.k;
      if(k==='up'&&x.date<=t)k='new';if(k==='new'&&!x.airing&&x.date&&dd(t,x.date)>60)continue;out.push({it,...x,k})}
    const o={new:0,up:1,tba:2};return out.sort((a,b)=>o[a.k]-o[b.k]||(a.k==='new'?(b.date||'').localeCompare(a.date||''):(a.date||'9').localeCompare(b.date||'9')))}
  function nsPaint(){const b=q('.mc-ns');if(!b)return;const n=nsList().filter(x=>x.k!=='tba').length;b.querySelector('em').textContent=n||'';b.classList.toggle('busy',nsBusy);if(q('.mnsp'))nsPanel(b,true)}
  function nsPanel(anchor,keep){const old=q('.mnsp');if(old&&!keep){old.remove();anchor.setAttribute('aria-expanded','false');return}
    const L=nsList(),t=tdy(),fd=d=>new Date(d+'T00:00').toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:d.slice(0,4)!==t.slice(0,4)?'numeric':undefined});
    const when=x=>x.k==='up'?(x.pr==='y'?`${x.date.slice(0,4)} içinde`:x.pr==='m'?new Date(x.date+'T00:00').toLocaleDateString('tr-TR',{month:'long',year:'numeric'}):`${fd(x.date)} · ${dd(x.date,t)} gün sonra`):x.k==='new'?(x.airing?'Şu an yayında':`${fd(x.date)} · ${dd(t,x.date)?dd(t,x.date)+' gün önce':'bugün'} başladı`):'Duyuruldu · tarih belli değil';
    const row=x=>`<button class="mns-r" data-nsi="${x.it.id}"><span class="mns-p">${x.it.cover?`<img src="${E(x.it.cover)}" alt="" loading="lazy" referrerpolicy="no-referrer">`:''}</span><span class="mns-t"><b>${E(x.it.title)}</b><small>${E(short(x))} · ${E(when(x))}</small></span><em class="mns-k t-${x.it.type}">${E(TN[x.it.type])}</em></button>`;
    // devam sezonunun adı dizinin adıyla başlıyorsa tekrar etme (“Attack on Titan: Final Season” → “Final Season”)
    const short=x=>{const t0=x.it.title,l=x.label||'';return l.toLocaleLowerCase('tr').startsWith(t0.toLocaleLowerCase('tr'))?(l.slice(t0.length).replace(/^[\s:–—-]+/,'')||l):l};
    const sec=(k,h)=>{const g=L.filter(x=>x.k===k);return g.length?`<h4>${h}</h4>${g.map(row).join('')}`:''};
    const last=Math.max(0,...Object.values(NS).map(v=>v.at||0));
    const html=`<header><b>Yeni sezonlar</b><button class="mns-x" data-nsx aria-label="Kapat">${IC.x}</button></header><div class="mns-l">${L.length?sec('new','Geldi')+sec('up','Yakında')+sec('tba','Tarihi belli değil')
        :`<p class="mns-e">${nsBusy?'Kontrol ediliyor…':'İzlediğin dizi, anime ve filmlerde şimdilik yeni sezon görünmüyor.'}</p>`}</div>
      <footer><span>${nsBusy?`Kontrol ediliyor · ${nsProg[0]}/${nsProg[1]}`:last?`Son kontrol ${new Date(last).toLocaleDateString('tr-TR',{day:'numeric',month:'short'})}`:''}</span><button data-nsr ${nsBusy?'disabled':''}>${IC.sync}Şimdi kontrol et</button></footer>`;
    let m=old;if(!m){m=document.createElement('div');m.className='mnsp';m.setAttribute('role','dialog');m.setAttribute('aria-label','Yeni sezonlar');document.body.appendChild(m);anchor.setAttribute('aria-expanded','true');
      m.addEventListener('click',e=>{const r=e.target.closest('[data-nsi]');if(r){m.remove();open(r.dataset.nsi);return}if(e.target.closest('[data-nsx]')){m.remove();return}if(e.target.closest('[data-nsr]'))nsRun(true)});
      setTimeout(()=>addEventListener('pointerdown',function f(e){if(!m.isConnected){removeEventListener('pointerdown',f,true);return}if(!m.contains(e.target)&&!e.target.closest('.mc-ns')){m.remove();removeEventListener('pointerdown',f,true)}},true),0)}
    const y=m.querySelector('.mns-l')?.scrollTop||0;m.innerHTML=html;m.querySelector('.mns-l').scrollTop=y;
    const r=anchor.getBoundingClientRect(),w=Math.min(380,innerWidth-16);m.style.width=w+'px';m.style.top=(r.bottom+8)+'px';m.style.left=Math.max(8,Math.min(innerWidth-w-8,r.right-w))+'px'}
  /* ═ Eksik posterler: eşleştirmede poster bulunamayan kayıtlara başka kaynaklardan bir kez daha bak (elle seçilenler hariç; 7 günde bir).
     Anime → AniList · Dizi → TVmaze ad araması · Film → iTunes · hepsi → Wikipedia (sayfa gerçekten o türdense). Ad + yıl tutmalı. ═ */
  let cfBusy=false;
  const KIND_RX={movie:/film|movie/i,series:/dizi|series|television|tv/i,anime:/anime|manga|dizi|series/i,game:/oyun|game/i};
  async function coverFix(){if(cfBusy||R.busy)return;const T=lsg('mc:cfix',{}),now=Date.now();
    const L=[...KB.items.values()].filter(it=>MT.includes(it.type)&&!it.cover&&it.match!=='manual'&&it.metaAt&&!(T[it.id]&&now-T[it.id]<7*864e5));if(!L.length)return;cfBusy=true;let n=0;
    for(const it0 of L){try{const h=HINT.get(hk(it0)),y=+it0.year||h?.y||0,names=[it0.title,h?.en].filter((x,i,a)=>x&&a.indexOf(x)===i);let img='',extra={};
        for(const nm of names){if(img)break;
          if(it0.type==='anime'){const d=await alGQL(`query($q:String){Media(search:$q,type:ANIME){idMal coverImage{extraLarge large} startDate{year} title{romaji english}}}`,{q:nm}).catch(()=>null);const m=d?.Media;
            if(m&&[m.title?.romaji,m.title?.english].filter(Boolean).map(norm).some(t=>t===norm(nm)||t.startsWith(norm(nm)))&&(!y||!m.startDate?.year||Math.abs(m.startDate.year-y)<=1)){img=m.coverImage?.extraLarge||m.coverImage?.large||'';if(m.idMal&&!it0.mal)extra.mal=String(m.idMal)}}
          else if(it0.type==='series'){const x=await soft(tvget(`https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(nm)}`));if(x&&norm(x.name)===norm(nm)&&(!y||!x.premiered||Math.abs(parseInt(x.premiered)-y)<=1))img=x.image?.original||x.image?.medium||''}
          else if(it0.type==='movie'){img=await itunes(nm,y||0)}
          if(!img){for(const[lg,tt]of[['tr',nm],['en',it0.type==='game'?nm+' (video game)':it0.type==='movie'?nm+' (film)':it0.type==='series'?nm+' (TV series)':nm],['en',nm]]){const w=await wsum(lg,tt);
              const src=w?.originalimage?.source||w?.thumbnail?.source||'';if(w&&w.type!=='disambiguation'&&src&&!/\.svg/i.test(src)&&!/logo|icon|flag/i.test(src)&&KIND_RX[it0.type]?.test(w.description||'')){img=src;break}}}}
        const it=KB.items.get(it0.id);T[it0.id]=Date.now();if(img&&it&&!it.cover){Object.assign(it,{cover:img,...extra});if(it.match==='none')it.match='unsure';KB.saveItem(it,true);patchCards([it.id]);n++}}
      catch(e){if(e instanceof NetErr)break}}
    lss('mc:cfix',T);cfBusy=false;if(n)say(`${n} kayda poster bulundu`)}
  /* bir kerelik onarım: kapağı MyAnimeList'ten gelmeyen animelere MAL posteri (elle seçilenlere dokunmaz; 7 günde bir yeniden dener) */
  let aniBusy=false;
  async function aniFix(){if(aniBusy||R.busy)return;const T=lsg('mc:anifix',{}),now=Date.now();
    const L=[...KB.items.values()].filter(it=>it.type==='anime'&&it.match!=='manual'&&!/myanimelist\.net/.test(it.cover||'')&&!(T[it.id]&&now-T[it.id]<7*864e5));if(!L.length)return;aniBusy=true;let n=0;
    for(const it0 of L){try{const h=HINT.get(hk(it0)),y=+it0.year||h?.y||0;let d=it0.mal?(await jikan(it0.mal))?.data:null;
        if(!d)d=await malSearch(it0.title,y);if(!d&&h?.en&&norm(h.en)!==norm(it0.title))d=await malSearch(h.en,y);
        const it=KB.items.get(it0.id);T[it0.id]=Date.now();if(d&&it&&malCover(d)){if(it.cover&&it.cover!==malCover(d))it.cover2=it.cover;it.cover=malCover(d);it.mal=it.mal||String(d.mal_id);if(!it.eps&&d.episodes)it.eps=+d.episodes;KB.saveItem(it,true);patchCards([it.id]);n++}}
      catch(e){if(e instanceof NetErr)break}}
    lss('mc:anifix',T);aniBusy=false;if(n)say(`${n} animenin kapağı MyAnimeList posteriyle değiştirildi`)}
  const wsum=(lang,t)=>getJSON(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(t)}`).catch(()=>null);
  const tmdbKey=()=>lsg('mc:tmdb','')||'';
  async function enrich(c,type){const o={mid:c.id,imdb:c.imdb,steam:c.steam,mal:c.mal,wiki:c.tr&&!c.en?'tr:'+c.tr:c.en,year:c.year?String(c.year):'',cover:'',cover2:'',backdrop:'',wide:'',desc:'',eps:0,
      genres:[...(c.gtr.size?[...c.gtr].map(g=>cleanG(g,true)):[...c.gen].map(g=>cleanG(g)))].filter((g,i,a)=>g&&a.indexOf(g)===i).slice(0,4),
      platforms:[...new Set([...c.pl].map(p=>PF[p]||p))].sort((a,b)=>(PFO.indexOf(a)+99)%99-(PFO.indexOf(b)+99)%99).slice(0,6)};
    if(type==='game'&&c.steam){const b=`https://cdn.cloudflare.steamstatic.com/steam/apps/${c.steam}/`;o.cover=b+'library_600x900_2x.jpg';o.backdrop=b+'library_hero.jpg';o.wide=b+'header.jpg';if(!o.platforms.includes('PC'))o.platforms.unshift('PC')}
    if(type==='anime'){try{let d=c.mal?(await jikan(c.mal))?.data:null;if(!d){d=await malSearch(c.label||c.en||'',+c.year||0);if(!d&&c.en&&c.en!==c.label)d=await malSearch(String(c.en).replace(/_/g,' ').replace(/\s*\([^)]*\)$/,''),+c.year||0);if(d)o.mal=String(d.mal_id)}
      if(d){o.cover=malCover(d);o.eps=+d.episodes||0;if(!o.year)o.year=String(d.year||d.aired?.prop?.from?.year||'');
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
  async function queue(){if(R.busy||R.off)return;const l=all().filter(needs);if(!l.length)return;R.busy=true;R.total=l.length;R.done=0;R.stats={ok:0,un:0,no:0,err:0};pill();let i=0,stop=false,lastEmit=Date.now();const changed=new Set();
    const work=async()=>{while(i<l.length&&!stop){const it=l[i++];if(!KB.items.has(it.id)||!needs(it)){R.done++;continue}
      try{const r=await resolve(it);const cur=KB.items.get(it.id);if(cur&&needs(cur)){applyRes(cur,r);KB.saveItem(cur,true);changed.add(cur.id);R.stats[r.none?'no':r.conf==='ok'?'ok':'un']++}}
      catch(e){if(e instanceof NetErr){stop=true;R.off=true;setTimeout(()=>{R.off=false},60000)}else{R.stats.err++;console.warn('eşleştirme',it.title,e)}}
      R.done++;pill();if(Date.now()-lastEmit>2500&&changed.size){lastEmit=Date.now();patchCards([...changed]);changed.clear()}}};
    await Promise.all([work(),work(),work()]);R.busy=false;pill();KB.emit('items');
    if(stop)say('İnternete ulaşılamadı — posterler bağlantı gelince eşleşecek');
    else if(R.stats.err&&!R.stats.ok)say(`Poster servisleri şu an yanıt vermiyor — ${R.stats.err} kayıt sonra kendiliğinden yeniden denenecek`);
    else if(R.total>2)say(`Posterler eşleşti: ${R.stats.ok} kesin${R.stats.un?` · ${R.stats.un} kontrol bekliyor`:''}${R.stats.no?` · ${R.stats.no} bulunamadı`:''}${R.stats.err?` · ${R.stats.err} sonra denenecek`:''}`)}
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
  function dismiss(){spotOff(true);qa('.mset,.mrp,.mq,.ma-bg,.mnp,.mnsp,.mrcp-bg,.mnt-bg,.mpk-bg').forEach(e=>e.remove())}
  /* ── “Bu akşam ne izlesem?” zarı: vakit + tür seç → listenden TEK öneri, “Başka” ile değişir ──
     Havuz: izlenecekler (film/dizi/anime) + yarım kalan dizi/anime. Vakit: ~30 dk = anime bölümü, ~1 sa = dizi bölümü, film akşamı = film. */
  const PKT=[['any','Fark etmez'],['30','~30 dk','anime bölümü'],['60','~1 saat','dizi bölümü'],['film','Film akşamı','2 saat']];
  function pickPool(tm,g){const ok=i=>tm==='30'?i.type==='anime':tm==='60'?i.type==='series':tm==='film'?i.type==='movie':['movie','series','anime'].includes(i.type);
    return[...KB.items.values()].filter(i=>ok(i)&&(i.status==='todo'||(i.status==='doing'&&i.type!=='movie'))&&(!g||(i.genres||[]).some(x=>x.toLocaleLowerCase('tr')===g)))}
  /* ── Listeni paylaş: izlenecekler (film/dizi/anime) sıkıştırılmış olarak bağlantının # kısmına yazılır (sunucuya gitmez).
     Bağlantı apps/izle/liste.html'de giriş istemeden açılır; arkadaşın “Ben de” deyip geri gönderebilir.
     Bu cihazdaki kendi listen 'mc:wl' önbelleğinde (karşılaştırma için), kimliğin 'mc:shareid'. ── */
  let wlT=0;const WLT={movie:'m',series:'s',anime:'a'};
  const wlList=()=>[...KB.items.values()].filter(i=>WLT[i.type]&&(i.status==='todo'||i.status==='doing')).map(i=>[i.title,WLT[i.type],String(i.year||'').slice(0,4)]);
  function saveWL(){try{lss('mc:wl',{at:Date.now(),l:wlList()})}catch{}}
  const sid=()=>{let s=lsg('mc:shareid','');if(!s){s=Math.random().toString(36).slice(2,10);lss('mc:shareid',s)}return s};
  async function packWL(o){const js=JSON.stringify(o),b64=u=>btoa(String.fromCharCode(...u)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
    try{if(!window.CompressionStream)throw 0;const cs=new Blob([js]).stream().pipeThrough(new CompressionStream('deflate-raw'));const u=new Uint8Array(await new Response(cs).arrayBuffer());
      let bin='';for(let i=0;i<u.length;i+=8192)bin+=String.fromCharCode(...u.subarray(i,i+8192));return'z'+btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
    catch{return'j'+b64(new TextEncoder().encode(js))}}
  async function shareWL(btn){const name=(q('.mpk [data-wln]')?.value||'').trim().slice(0,30);lss('mc:sharename',name);saveWL();const l=wlList();
    if(!l.length){toast?.('Paylaşılacak izleme listesi boş');return}
    const url=new URL('../izle/liste.html',location.href).href+'#d='+await packWL({v:1,n:name,o:sid(),l});
    try{if(navigator.share&&matchMedia('(pointer:coarse)').matches){await navigator.share({title:'İzleme listem',url});return}}catch{}
    try{await navigator.clipboard.writeText(url);if(btn){btn.textContent='Bağlantı kopyalandı ✓';setTimeout(()=>{if(btn.isConnected)btn.textContent='Bağlantıyı kopyala'},2200)}}
    catch{prompt('Bağlantıyı kopyala:',url)}}
  function pickSheet(){q('.mpk-bg')?.remove();const s={tm:lsg('mc:pick',{}).tm||'any',g:'',seen:new Set(),cur:null};
    const bg=document.createElement('div');bg.className='mpk-bg';bg.innerHTML=`<div class="mpk" role="dialog" aria-modal="true" aria-labelledby="mpkT"></div>`;document.body.appendChild(bg);
    const pick=()=>{const l=pickPool(s.tm,s.g);let r=l.filter(i=>!s.seen.has(i.id));if(!r.length&&l.length){s.seen.clear();r=l.filter(i=>i.id!==s.cur?.id);if(!r.length)r=l}
      s.cur=r.length?r[Math.floor(Math.random()*r.length)]:null;if(s.cur)s.seen.add(s.cur.id)};
    const paint=fresh=>{const base=pickPool(s.tm,''),gs=topGenres(base).slice(0,8),it=s.cur,ep=it&&it.status==='doing'&&(it.season||it.ep)?`Kaldığın yer: ${it.season?'S'+it.season+' · ':''}${it.ep?'B'+it.ep:''}`:'';
      bg.firstChild.innerHTML=`<header><h3 id="mpkT">${IC.dice}Bu akşam ne izlesem?</h3><button class="mpk-x" data-pkx aria-label="Kapat" title="Kapat (Esc)">${IC.x||'×'}</button></header>
        <p class="mpk-k">Ne kadar vaktin var?</p><div class="mpk-ch">${PKT.map(([k,n,d])=>`<button data-pkt="${k}" aria-pressed="${s.tm===k}">${n}${d?`<small>${d}</small>`:''}</button>`).join('')}</div>
        ${gs.length?`<p class="mpk-k">Ne tür?</p><div class="mpk-ch">${['',...gs].map(g=>`<button data-pkg="${E(g.toLocaleLowerCase('tr'))}" aria-pressed="${s.g===g.toLocaleLowerCase('tr')}">${E(g||'Hepsi')}</button>`).join('')}</div>`:''}
        <div class="mpk-r${fresh?' in':''}">${it?`<a class="mpk-c" href="#lib/i/${E(it.id)}" data-pko>${poster(it,'mpk-p')}<div><span class="mpk-t">${E(TN[it.type]||'')}${it.year?' · '+E(it.year):''}${it.score?' · ★ '+E(it.score):''}</span>
            <b>${E(it.title)}</b>${ep?`<span class="mpk-ep">${E(ep)}</span>`:''}${(it.genres||[]).length?`<span class="mpk-g">${E(it.genres.slice(0,3).join(' · '))}</span>`:''}</div></a>`
          :`<p class="mpk-none">${base.length?'Bu türde listende bir şey yok — “Hepsi”ni dene.':'Bu seçime uyan, izlemek istediğin bir şey yok. Listene ekledikçe zar daha iyi atar.'}</p>`}</div>
        <footer>${it&&it.type!=='game'?`<a class="mpk-w" href="../izle/?q=${encodeURIComponent(it.title)}" target="_blank" rel="noopener">Nerede izlenir?</a>`:'<span></span>'}
          <div><button class="mb" data-pka ${pickPool(s.tm,s.g).length>1?'':'disabled'}>${IC.dice}Başka</button>${it?`<button class="mb pri" data-pko>Aç</button>`:''}</div></footer>
        <details class="mpk-sh"${s.sh?' open':''}><summary>Arkadaşınla mı izleyeceksin? Listeni paylaş</summary>
          <p>Bağlantıyı gönder; arkadaşın izlemek istediklerini işaretleyip sana geri yollasın. İkinizin de listesinde olanlar en üstte çıkar. Bağlantı giriş istemez, sadece izleme listeni gösterir.</p>
          <div class="mpk-shr"><input data-wln maxlength="30" placeholder="Adın (ör. Batu)" aria-label="Adın — arkadaşın görsün" value="${E(lsg('mc:sharename',''))}"><button class="mb pri" data-wls>Bağlantıyı kopyala</button></div></details>`};
    pick();paint(true);
    const close=()=>{bg.remove();removeEventListener('keydown',key,true)},key=e=>{if(e.key==='Escape'){e.stopPropagation();close()}};addEventListener('keydown',key,true);
    bg.addEventListener('click',e=>{const t=e.target;if(t===bg||t.closest('[data-pkx]'))return close();
      const tb=t.closest('[data-pkt]');if(tb){s.tm=tb.dataset.pkt;s.g='';s.seen.clear();lss('mc:pick',{tm:s.tm});pick();return paint(true)}
      const gb=t.closest('[data-pkg]');if(gb){s.g=gb.dataset.pkg;s.seen.clear();pick();return paint(true)}
      if(t.closest('[data-pka]')){pick();return paint(true)}
      const ws=t.closest('[data-wls]');if(ws){s.sh=true;shareWL(ws);return}
      if(t.closest('.mpk-sh summary'))s.sh=!bg.querySelector('.mpk-sh')?.open;
      if(t.closest('[data-pko]')&&s.cur){e.preventDefault();const id=s.cur.id;close();open(id)}});
    bg.querySelector('[data-pka]')?.focus()}
  // kaydırma, pencere değişimi, Esc → spot ışığı kapanır
  addEventListener('scroll',()=>{SPT.quiet=Date.now()+700;if(SPT.el)spotOff()},true);addEventListener('blur',()=>spotOff(true));addEventListener('resize',()=>spotOff(true));addEventListener('keydown',e=>{if(e.key==='Escape'&&SPT.el)spotOff();
    // spot açıkken ← → fragmanı 5 sn sarar (puan hapı / yazı alanı odaktaysa onlar kullanır)
    if((e.key==='ArrowLeft'||e.key==='ArrowRight')&&SPT.el&&!e.defaultPrevented&&!e.target.closest?.('input,textarea,select,[contenteditable="true"],.sr,.msp-bar')){const sl=SPT.el.querySelector('.msp-yt'),c=sl?._ctl;if(c?.d){e.preventDefault();c.seek(e.key==='ArrowLeft'?-5:5);sl._kb?.()}}});
  /* ═ Yayın takvimi: İzliyorum/İzlenecek listesindeki animelerin yeni bölüm zamanları (AniList airingSchedule) → Takvim.
     Takvime etkinlik olarak YAZILMAZ (saat değişir, bırakılan dizi takvimde kalmasın); önbellek mc:air {at,list:[{iid,t,ep}]} okunarak gösterilir.
     6 saatte bir yenilenir (Takvim açılınca); geçmiş 7 gün korunur. ═ */
  const AIR=()=>lsg('mc:air',{at:0,list:[]});
  function airing(day){const L=AIR().list,out=[];for(const x of L){const d=new Date(x.t*1000),k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      if(k!==day)continue;const it=KB.items.get(x.iid);if(!it||it.status==='done'||it.status==='dropped')continue;out.push({iid:x.iid,title:it.title,ep:x.ep,hm:d.toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})})}
    return out.sort((a,b)=>a.hm.localeCompare(b.hm))}
  let airBusy=false;
  async function airRefresh(force){const c=AIR();if(airBusy||(!force&&Date.now()-c.at<6*36e5))return false;
    const its=[...KB.items.values()].filter(i=>i.type==='anime'&&i.mal&&(i.status==='doing'||i.status==='todo'));if(!its.length){lss('mc:air',{at:Date.now(),list:[]});return false}
    airBusy=true;const byMal=new Map(its.map(i=>[+i.mal,i.id])),ids=[...byMal.keys()],now=Date.now()/1000,keep=c.list.filter(x=>x.t>now-7*86400&&x.t<now&&byMal.size&&[...byMal.values()].includes(x.iid)),got=[];
    try{for(let k=0;k<ids.length;k+=50){const d=await alGQL(`query($ids:[Int]){Page(perPage:50){media(idMal_in:$ids,type:ANIME){idMal status airingSchedule(notYetAired:true,perPage:12){nodes{airingAt episode}}}}}`,{ids:ids.slice(k,k+50)});
        (d?.Page?.media||[]).forEach(m=>{const iid=byMal.get(m.idMal);(m.airingSchedule?.nodes||[]).forEach(n=>got.push({iid,t:n.airingAt,ep:n.episode}))})}
      const seen=new Set(),list=[...keep,...got].filter(x=>{const q=x.iid+':'+x.ep;if(seen.has(q))return false;seen.add(q);return true});lss('mc:air',{at:Date.now(),list});return true}
    catch(e){return false}finally{airBusy=false}}
  return{airing,airRefresh,netTest,render,refresh,detail,close,imgErr,imgOk,queue,addSheet,rateHTML,dismiss,patchCards,isMedia:t=>MT.includes(t),get st(){return st},get R(){return R},_rank:rank,_cleanG:cleanG,_yt:ytIds}})();
