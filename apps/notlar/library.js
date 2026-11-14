/* ════════════════════════════════════════════════════════════
   Library — görsel, interaktif dijital kütüphane (Notlar'ın ikinci bölümü)
   İlham: Raindrop (koleksiyon + ızgara/liste/duvar), mymind (görsel önce, az organizasyon),
   Apple Books / Readwise (kaldığın yerden devam, okuma ilerlemesi). Veri: KB (kb.js).
   Rotalar: #lib · #lib/all · #lib/fav · #lib/reading · #lib/recent · #lib/type/<t> · #lib/tag/<t> · #lib/col/<id> · #lib/i/<id> (detay) · #lib/read/<id> (PDF)
   ════════════════════════════════════════════════════════════ */
const Library=(()=>{
  const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];
  const T=KB.TYPES,low=KB.low;
  const lsg=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}};
  const st={base:'',sub:'home',arg:'',view:lsg('lib:view','grid'),sort:lsg('lib:sort','added'),q:'',type:'',tag:''};
  const I={
    plus:'<path d="M8 3v10M3 8h10"/>',search:'<circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14"/>',grid:'<rect x="2.5" y="2.5" width="4.5" height="4.5" rx="1"/><rect x="9" y="2.5" width="4.5" height="4.5" rx="1"/><rect x="2.5" y="9" width="4.5" height="4.5" rx="1"/><rect x="9" y="9" width="4.5" height="4.5" rx="1"/>',
    list:'<path d="M5.5 4h8M5.5 8h8M5.5 12h8"/><circle cx="2.8" cy="4" r=".7" fill="currentColor"/><circle cx="2.8" cy="8" r=".7" fill="currentColor"/><circle cx="2.8" cy="12" r=".7" fill="currentColor"/>',
    wall:'<rect x="2.5" y="2.5" width="4.5" height="7" rx="1"/><rect x="9" y="2.5" width="4.5" height="4" rx="1"/><rect x="2.5" y="11" width="4.5" height="2.5" rx="1"/><rect x="9" y="8" width="4.5" height="5.5" rx="1"/>',
    star:'<path d="M8 2l1.8 3.7 4 .6-2.9 2.8.7 4L8 11.2 4.4 13.1l.7-4L2.2 6.3l4-.6z"/>',x:'<path d="M4 4l8 8M12 4l-8 8"/>',home:'<path d="M2.5 7.5L8 3l5.5 4.5M4 6.5V13h8V6.5"/>',
    all:'<path d="M3 4.5h10M3 8h10M3 11.5h10"/>',clock:'<circle cx="8" cy="8" r="5.5"/><path d="M8 5v3.2l2 1.3"/>',read:'<path d="M2 3.5c2-.8 4-.8 6 .8 2-1.6 4-1.6 6-.8V13c-2-.8-4-.8-6 .8-2-1.6-4-1.6-6-.8z"/><path d="M8 4.3v9.5"/>',
    up:'<path d="M8 11V3M4.5 6.5L8 3l3.5 3.5M3 13h10"/>',ext:'<path d="M9 2.5h4.5V7M13.5 2.5L7 9M11.5 9.5v4h-9v-9h4"/>',trash:'<path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 9h5.8l.6-9"/>',
    note:'<path d="M4 1.5h5.5L13 5v9.5H4z"/><path d="M9.5 1.5V5H13M6 8.5h4.5M6 11h3"/>',link:'<path d="M6.5 9.5l3-3M7 4.5l1-1a2.6 2.6 0 0 1 3.7 3.7l-1 1M9 11.5l-1 1a2.6 2.6 0 0 1-3.7-3.7l1-1"/>',
    spark:'<path d="M8 2v3M8 11v3M2 8h3M11 8h3M4 4l1.8 1.8M10.2 10.2L12 12M12 4l-1.8 1.8M5.8 10.2L4 12"/>',graph:'<circle cx="4" cy="4.5" r="1.8"/><circle cx="12" cy="5" r="1.8"/><circle cx="7.5" cy="12" r="1.8"/><path d="M5.6 5.3l4.6.1M5 6l1.8 4.3M11.2 6.6l-2.6 3.8"/>',
    folder:'<path d="M2 4.5h4l1.5 1.5H14v7H2z"/>',chev:'<path d="M6 3.5L10.5 8 6 12.5"/>',back:'<path d="M10 3.5L5.5 8l4.5 4.5"/>',minus:'<path d="M3 8h10"/>',edit:'<path d="M10.5 2.5l3 3-8 8H2.5v-3z"/>',
    tag:'<path d="M2.5 2.5h5.5l6 6-5.5 5.5-6-6z"/><circle cx="5.3" cy="5.3" r="1" fill="currentColor"/>'};
  const sv=(k,c='')=>`<svg class="li ${c}" viewBox="0 0 16 16" aria-hidden="true">${I[k]||k}</svg>`;
  const tIc=(t,c='')=>`<svg class="li ${c}" viewBox="0 0 16 16" aria-hidden="true">${(T[t]||T.file).ic}</svg>`;
  const hash=s=>{let h=7;for(const c of String(s))h=(h*31+c.charCodeAt(0))|0;return Math.abs(h)};
  const host=u=>{try{return new URL(u).hostname.replace(/^www\./,'')}catch{return''}};
  const ytId=u=>{const m=String(u).match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/);return m?m[1]:''};
  const MEDIA=['movie','series','game','anime'],SUF={movie:'film',series:'TV series',game:'video game',anime:'anime'};
  const stLabel=it=>{const g=it.type==='game';return it.status==='done'?(g?'Oynandı':'İzlendi'):it.status==='todo'?(g?'Oynanacak':'İzlenecek'):it.status==='doing'?'Devam ediyor':''};
  const shape=t=>['book','pdf','doc','course','research','movie','series','game','anime'].includes(t)?'p':t==='image'?'s':'l';
  const fmtD=ts=>new Date(ts).toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'});
  const size=b=>b>1e6?(b/1e6).toFixed(1)+' MB':Math.max(1,Math.round(b/1e3))+' KB';
  const all=()=>[...KB.items.values()].filter(i=>!MEDIA.includes(i.type)),every=()=>[...KB.items.values()];
  const favIco=it=>it.favicon||(it.url&&!it.file?`https://www.google.com/s2/favicons?domain=${host(it.url)}&sz=64`:'');
  const coverSrc=it=>it.cover||(it.yt?`https://i.ytimg.com/vi/${it.yt}/hqdefault.jpg`:'');
  const motionOK=()=>!REDUCED&&document.documentElement.dataset.motion!=='off';

  /* ── kapaklar: gerçek görsel yoksa (ya da yüklenemezse) tasarlanmış bir kapak ── */
  function genCover(it){const t=T[it.type]||T.file,h=hash(it.id)%360;
    return`<div class="gc gc-${shape(it.type)}" style="--c:${t.c};--h:${h}deg"><span class="gc-k">${tIc(it.type)}${esc(t.n)}</span><b class="gc-t">${esc(it.title)}</b><span class="gc-a">${esc(it.author||it.site||host(it.url)||'')}</span></div>`}
  function cover(it,cls=''){const s=coverSrc(it);return`<div class="cv cv-${shape(it.type)} ${cls}">${genCover(it)}${s?`<img src="${esc(s)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.remove()">`:''}${it.score?`<span class="cv-sc">${esc(it.score.replace('IMDb ','★ '))}</span>`:''}${it.type==='youtube'?'<span class="cv-play"><svg viewBox="0 0 16 16"><path d="M5.5 3.5v9l7-4.5z" fill="currentColor"/></svg></span>':''}${it.progress>.01&&it.progress<.99?`<span class="cv-pr"><i style="width:${Math.round(it.progress*100)}%"></i></span>`:''}</div>`}
  const metaLine=it=>{const t=T[it.type]||T.file;return`<span class="lm">${tIc(it.type)}<span>${esc(MEDIA.includes(it.type)?(it.author||t.n):(it.author||it.site||host(it.url)||t.n))}</span>${it.pages?`<span>· ${it.pages} sf</span>`:''}${it.dur?`<span>· ${esc(it.dur)}</span>`:''}${it.status&&MEDIA.includes(it.type)?`<span class="lm-st st-${it.status}">· ${stLabel(it)}</span>`:''}</span>`};
  function card(it,o={}){return`<article class="lc lc-${shape(it.type)}${o.big?' big':''}" data-open="${it.id}" tabindex="0" draggable="false" aria-label="${esc(it.title)}">
      ${cover(it)}<button class="lc-fav${it.fav?' on':''}" data-fav="${it.id}" aria-label="${it.fav?'Favorilerden çıkar':'Favorilere ekle'}" title="Favori">${sv('star')}</button>
      <div class="lc-b"><b class="lc-t">${esc(it.title)}</b>${metaLine(it)}</div></article>`}

  /* ── kenar çubuğu (kütüphanenin kendi gezinmesi) ── */
  function rail(){const items=all(),cnt=t=>items.filter(i=>i.type===t).length,c=[...KB.cols.values()].filter(x=>!every().some(i=>i.cols.includes(x.id)&&MEDIA.includes(i.type))).sort((a,b)=>a.order-b.order);
    const ni=(h,ic,l,on,n='')=>`<a class="lr-i${on?' on':''}" href="#lib${h}">${ic}<span>${esc(l)}</span>${n!==''?`<em>${n}</em>`:''}</a>`;
    const S=st.sub,A=st.arg;
    return`<aside class="lrail"><div class="lr-brand"><span class="lr-mark">${sv('read')}</span><span><b>Kütüphane</b><small>${items.length} içerik</small></span></div>
      <button class="lr-add" data-act="add">${sv('plus')}İçerik ekle<kbd>A</kbd></button>
      <nav><a class="lr-i lr-back" href="#lib">${sv('back')}<span>Medya merkezi</span></a>${ni('/docs',sv('home'),'Keşfet',S==='home')}${ni('/all',sv('all'),'Tümü',S==='all',items.length)}${ni('/reading',sv('read'),'Devam edilenler',S==='reading',items.filter(i=>i.progress>.01&&i.progress<.99).length||'')}${ni('/fav',sv('star'),'Favoriler',S==='fav',items.filter(i=>i.fav).length||'')}${ni('/recent',sv('clock'),'Son görüntülenen',S==='recent')}</nav>
      <div class="lr-g">Türler</div><nav>${Object.keys(T).filter(t=>cnt(t)).map(t=>ni('/type/'+t,`<i class="lr-dot" style="--c:${T[t].c}"></i>`,T[t].n,S==='type'&&A===t,cnt(t))).join('')||'<p class="lr-e">İçerik ekleyince türler burada görünür</p>'}</nav>
      <div class="lr-g">Koleksiyonlar<button data-act="newcol" title="Yeni koleksiyon" aria-label="Yeni koleksiyon">${sv('plus')}</button></div>
      <nav>${c.map(x=>ni('/col/'+x.id,`<i class="lr-dot sq" style="--c:${esc(x.color)}">${esc(x.emoji)}</i>`,x.name,S==='col'&&A===x.id,items.filter(i=>i.cols.includes(x.id)).length)).join('')||'<p class="lr-e">Henüz koleksiyon yok</p>'}</nav>
      <p class="lr-f">${KB.mode==='cloud'?'Bilgiler buluta kaydedilir · dosyalar bu cihazda':'Bu tarayıcıda kayıtlı'}</p></aside>`}

  /* ── ana ekran ── */
  function hero(){const items=all();const inProg=items.filter(i=>i.progress>.01&&i.progress<.99).sort((a,b)=>b.opened-a.opened);
    const h=inProg[0]||items.slice().sort((a,b)=>(b.opened||b.added)-(a.opened||a.added))[0];
    const capture=`<form class="cap" data-cap><span class="cap-ic">${sv('plus')}</span><input name="u" placeholder="Bağlantı yapıştır, kitap adı yaz ya da dosya bırak" aria-label="Hızlı ekle" autocomplete="off"><button type="submit">Ekle</button></form>`;
    if(!h)return`<section class="hero empty"><div class="hero-art" aria-hidden="true">${['book','pdf','youtube','web','image'].map((t,i)=>`<span style="--c:${T[t].c};--i:${i}">${tIc(t)}</span>`).join('')}</div>
      <div class="hero-c"><p class="kick">Dijital kütüphanen</p><h1>Okuduğun, izlediğin, sakladığın her şey tek rafta.</h1><p class="sub">PDF'ler, kitaplar, makaleler, videolar ve web siteleri — kapaklarıyla, notlarınla ve birbirleriyle bağlantılı.</p>${capture}
      <div class="hero-try"><span>Dene:</span>${['youtube.com/watch?v=…','Sapiens','arxiv.org/abs/…'].map(x=>`<code>${esc(x)}</code>`).join('')}</div></div></section>`;
    const s=coverSrc(h),cont=h.progress>.01&&h.progress<.99;
    return`<section class="hero" style="--c:${(T[h.type]||T.file).c}">${s?`<img class="hero-bg" src="${esc(s)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">`:''}<div class="hero-shade"></div>
      <button class="hero-cv" data-open="${h.id}" aria-label="${esc(h.title)}">${cover(h)}</button>
      <div class="hero-c"><p class="kick">${cont?'Kaldığın yerden devam et':'En son eklediğin'}</p><h1>${esc(h.title)}</h1><p class="sub">${esc(h.author||h.site||host(h.url)||T[h.type].n)}${h.desc?' — '+esc(h.desc.slice(0,140)):''}</p>
        ${cont?`<div class="hero-pr"><span><i style="width:${Math.round(h.progress*100)}%"></i></span><b>%${Math.round(h.progress*100)}</b>${h.pages?`<em>${h.page||1}/${h.pages}. sayfa</em>`:''}</div>`:''}
        <div class="hero-b"><button class="btn pri" data-go="${h.id}">${h.type==='youtube'?'İzle':h.type==='pdf'?'Oku':'Aç'}</button><button class="btn" data-open="${h.id}">Ayrıntılar</button></div>${capture}</div></section>`}
  function shelf(title,list,href,o={}){if(!list.length)return'';return`<section class="shelf"><header><h2>${esc(title)}</h2>${o.sub?`<p>${esc(o.sub)}</p>`:''}${href?`<a href="#lib${href}">Tümü${sv('chev')}</a>`:''}</header>
    <div class="shelf-r" tabindex="-1">${list.map(it=>card(it)).join('')}</div></section>`}
  function colCard(c){const its=all().filter(i=>i.cols.includes(c.id)).sort((a,b)=>b.added-a.added),m=its.slice(0,3);
    return`<a class="col" href="#lib/col/${c.id}" style="--c:${esc(c.color)}"><div class="col-m n${m.length}">${m.map(it=>cover(it)).join('')||`<span class="col-e">${esc(c.emoji)||sv('folder')}</span>`}</div>
      <div class="col-b"><b>${c.emoji?esc(c.emoji)+' ':''}${esc(c.name)}</b><small>${its.length} içerik${c.desc?' · '+esc(c.desc):''}</small></div></a>`}
  function homeHTML(){const items=all();const byAdd=items.slice().sort((a,b)=>b.added-a.added),prog=items.filter(i=>i.progress>.01&&i.progress<.99).sort((a,b)=>b.opened-a.opened);
    const favs=items.filter(i=>i.fav).sort((a,b)=>b.updated-a.updated),seen=items.filter(i=>i.opened).sort((a,b)=>b.opened-a.opened).slice(0,10);
    const cs=[...KB.cols.values()].sort((a,b)=>a.order-b.order),day=new Date().toDateString(),old=items.filter(i=>Date.now()-(i.opened||i.added)>12*864e5);
    const pick=old.length?old[hash(day)%old.length]:null,tags=KB.allTags().slice(0,24),types=Object.keys(T).map(t=>[t,items.filter(i=>i.type===t).length]).filter(x=>x[1]);
    const queue=items.filter(i=>i.status==='todo'&&MEDIA.includes(i.type)).sort((a,b)=>b.added-a.added);
    return impBanner()+hero()+(items.length?`
      ${shelf('Son eklenenler',byAdd.slice(0,14),'/all')}
      ${queue.length?shelf('Sırada',queue.slice(0,16),'',{sub:'İzlenecek ve oynanacaklar'}):''}
      ${prog.length>1?shelf('Devam edilenler',prog.slice(1,14),'/reading',{sub:'Yarım bıraktıkların'}):''}
      <section class="shelf"><header><h2>Koleksiyonlar</h2><button class="lnk" data-act="newcol">${sv('plus')}Yeni koleksiyon</button></header>
        <div class="cols">${cs.map(colCard).join('')}<button class="col add" data-act="newcol"><span>${sv('plus')}</span><b>Koleksiyon oluştur</b><small>Örn. Computer Science, SAT Preparation, Books to Read</small></button></div></section>
      ${shelf('Favoriler',favs.slice(0,14),'/fav')}
      ${seen.length?`<section class="shelf"><header><h2>Son görüntülenenler</h2></header><div class="seen">${seen.map(it=>`<button class="seen-i" data-open="${it.id}">${cover(it,'mini')}<span><b>${esc(it.title)}</b><small>${esc(rel(it.opened))}</small></span></button>`).join('')}</div></section>`:''}
      <section class="disc"><div class="disc-a">${pick?`<p class="kick">Yeniden keşfet</p><button class="disc-p" data-open="${pick.id}">${cover(pick)}<span><b>${esc(pick.title)}</b><small>${esc(rel(pick.opened||pick.added))} ${pick.opened?'açtın':'ekledin'} — bir göz atmaya ne dersin?</small></span></button>`:`<p class="kick">Yeniden keşfet</p><p class="muted">Bir süre açmadığın içerikler burada yeniden karşına çıkar.</p>`}</div>
        <div class="disc-b"><p class="kick">Kategoriler</p><div class="cats">${types.map(([t,n])=>`<a class="cat" href="#lib/type/${t}" style="--c:${T[t].c}">${tIc(t)}<b>${T[t].n}</b><small>${n}</small></a>`).join('')}</div>
          ${tags.length?`<p class="kick" style="margin-top:22px">Konular</p><div class="tags">${tags.map(([t,n])=>`<a class="tg" href="#lib/tag/${encodeURIComponent(t)}" style="--w:${Math.min(1,.5+n/6)}">#${esc(t)}<em>${n}</em></a>`).join('')}</div>`:''}</div></section>`:
      `<section class="empty-s"><div class="es-grid">${[['book','Kitaplar','Adını yaz, kapağını biz bulalım'],['pdf','PDF\'ler','İlk sayfası kapak olur, uygulamada okursun'],['youtube','Videolar','Bağlantıyı yapıştır, kapağı gelir'],['web','Web siteleri','Önizleme ve site simgesiyle']].map(([t,a,b])=>`<div class="es" style="--c:${T[t].c}">${tIc(t)}<b>${a}</b><small>${b}</small></div>`).join('')}</div></section>`)}

  /* ── liste görünümleri (tümü, tür, etiket, koleksiyon, favori…) ── */
  function filtered(base){let l=base;const qq=low(st.q);if(qq)l=l.filter(i=>low([i.title,i.desc,i.author,i.site,i.note,i.tags.join(' '),host(i.url)].join(' ')).includes(qq));
    if(st.type)l=l.filter(i=>i.type===st.type);if(st.tag)l=l.filter(i=>i.tags.includes(st.tag));
    const s=st.sort;return l.slice().sort(s==='title'?(a,b)=>a.title.localeCompare(b.title,'tr'):s==='opened'?(a,b)=>(b.opened||0)-(a.opened||0):s==='progress'?(a,b)=>b.progress-a.progress:(a,b)=>b.added-a.added)}
  function listCtx(){const items=all(),S=st.sub,A=st.arg;
    if(S==='all')return{t:'Tümü',d:'Kütüphanendeki her şey',l:items};
    if(S==='fav')return{t:'Favoriler',d:'Yıldızladıkların',l:items.filter(i=>i.fav)};
    if(S==='reading')return{t:'Devam edilenler',d:'Yarım bıraktığın okumalar ve videolar',l:items.filter(i=>i.progress>.01&&i.progress<.99)};
    if(S==='recent')return{t:'Son görüntülenenler',d:'En son açtıkların',l:items.filter(i=>i.opened).sort((a,b)=>b.opened-a.opened)};
    if(S==='type')return{t:(T[A]||T.file).n,d:'Tür',l:items.filter(i=>i.type===A),c:(T[A]||T.file).c};
    if(S==='tag')return{t:'#'+A,d:KB.topics[A]?.desc||'Konu',l:items.filter(i=>i.tags.includes(A)),tag:A};
    if(S==='col'){const c=KB.cols.get(A);if(!c)return{t:'Koleksiyon bulunamadı',d:'Silinmiş olabilir',l:[]};return{t:c.name,d:c.desc,l:items.filter(i=>i.cols.includes(A)),col:c,c:c.color}}
    if(S==='search')return{t:'Arama',d:'',l:items};return{t:'Tümü',d:'',l:items}}
  function rows(l){if(!l.length)return'';
    if(st.view==='list')return`<div class="ll" role="list">${l.map(it=>`<div class="ll-r" role="listitem" data-open="${it.id}" tabindex="0">${cover(it,'mini')}<span class="ll-t"><b>${esc(it.title)}</b>${metaLine(it)}</span>
      <span class="ll-tags">${it.tags.slice(0,3).map(t=>`<i>#${esc(t)}</i>`).join('')}</span><span class="ll-p">${it.progress>.01?`<span class="bar"><i style="width:${Math.round(it.progress*100)}%"></i></span>`:''}</span><span class="ll-d">${esc(rel(it.added))}</span>
      <button class="lc-fav${it.fav?' on':''}" data-fav="${it.id}" aria-label="Favori">${sv('star')}</button></div>`).join('')}</div>`;
    if(st.view==='wall')return`<div class="lw">${l.map(it=>card(it)).join('')}</div>`;
    return`<div class="lg">${l.map(it=>card(it)).join('')}</div>`}
  function listHTML(){const c=listCtx(),l=filtered(c.l),types=[...new Set(c.l.map(i=>i.type))],tags=[...new Set(c.l.flatMap(i=>i.tags))].slice(0,16);
    const col=c.col;
    return`<header class="lh${col?' col-h':''}" style="${c.c?`--c:${esc(c.c)}`:''}">${col?`<div class="lh-m">${c.l.slice(0,4).map(it=>cover(it)).join('')}</div>`:''}
      <div class="lh-c"><p class="kick">${col?'Koleksiyon':esc(c.d&&st.sub!=='col'?'':'')}${st.sub==='type'?'Tür':st.sub==='tag'?'Konu':col?'':'Kütüphane'}</p>
      <h1 ${col?'contenteditable="true" data-colf="name" spellcheck="false"':''}>${col?(col.emoji?esc(col.emoji)+' ':'')+esc(col.name):esc(c.t)}</h1>
      ${col?`<p class="lh-d" contenteditable="true" data-colf="desc" data-ph="Açıklama ekle…">${esc(col.desc)}</p>`:c.d?`<p class="lh-d">${esc(c.d)}</p>`:''}
      <p class="lh-n">${c.l.length} içerik${col?` · <span class="sw">${['#6E56CF','#3E63DD','#0D9488','#30A46C','#E5484D','#B45309','#E11D48','#71717A'].map(x=>`<button data-colc="${x}" style="--c:${x}" class="${x===col.color?'on':''}" aria-label="Renk"></button>`).join('')}</span><button class="lnk danger" data-act="delcol">${sv('trash')}Koleksiyonu sil</button>`:''}${st.sub==='tag'?`<a class="lnk" href="#brain/t:${encodeURIComponent(st.arg)}">${sv('graph')}Second Brain'de gör</a>`:''}</p></div></header>
      <div class="tb-l"><label class="tb-s">${sv('search')}<input data-q placeholder="Bu listede ara" value="${esc(st.q)}" aria-label="Ara"><kbd>/</kbd></label>
        ${types.length>1?`<div class="chips">${['',...types].map(t=>`<button class="chip${st.type===t?' on':''}" data-ft="${t}">${t?tIc(t)+esc(T[t].n):'Hepsi'}</button>`).join('')}</div>`:''}
        <span class="grow"></span>
        <label class="tb-sort">Sırala<select data-sort aria-label="Sırala">${[['added','Eklenme'],['opened','Son açılan'],['title','Başlık'],['progress','İlerleme']].map(([k,n])=>`<option value="${k}"${st.sort===k?' selected':''}>${n}</option>`).join('')}</select></label>
        <div class="seg" role="group" aria-label="Görünüm">${[['grid','Izgara'],['list','Liste'],['wall','Duvar']].map(([k,n])=>`<button data-view="${k}" class="${st.view===k?'on':''}" title="${n}" aria-label="${n}" aria-pressed="${st.view===k}">${sv(k)}</button>`).join('')}</div></div>
      ${tags.length&&st.sub!=='tag'?`<div class="tagrow">${tags.map(t=>`<button class="tg sm${st.tag===t?' on':''}" data-fg="${esc(t)}">#${esc(t)}</button>`).join('')}</div>`:''}
      ${l.length?rows(l):`<div class="nores">${c.l.length?`<b>Eşleşen içerik yok</b><p>Aramayı ya da filtreleri değiştir.</p><button class="btn" data-act="clearf">Filtreleri temizle</button>`:`<b>${col?'Bu koleksiyon boş':'Burada henüz bir şey yok'}</b><p>${col?'İçerik eklerken bu koleksiyonu seç ya da bir içeriğin ayrıntılarından ekle.':'İlk içeriğini ekle — bağlantı, kitap ya da dosya.'}</p><button class="btn pri" data-act="add">${sv('plus')}İçerik ekle</button>`}</div>`}`}

  /* ── çizim ── */
  function root(){let r=q('#view>.lib');if(!r){q('#view').innerHTML=`<div class="lib"><div class="lib-in"></div><div class="lib-drop" aria-hidden="true"><div><span>${sv('up')}</span><b>Bırak, kütüphaneye eklensin</b><small>PDF, görsel, belge ya da bağlantı</small></div></div></div>`;r=q('#view>.lib');wire(r)}return r}
  function draw(){const r=root(),inner=q('.lib-in',r),scY=q('#scroll').scrollTop;
    inner.innerHTML=rail()+`<div class="lmain">${st.sub==='home'?homeHTML():listHTML()}</div>`;setTimeout(autoCovers,1200);
    setCrumb(sv('read'),st.sub==='home'?'Kütüphane':listCtx().t.replace(/^#/,'#'),`<button class="tb" data-act="add" title="İçerik ekle (A)" aria-label="İçerik ekle">${sv('plus')}</button>`);
    return scY}
  function parse(parts){const[a='',b='']=parts;if(!a)return{sub:'home',arg:''};if(['all','fav','reading','recent'].includes(a))return{sub:a,arg:''};if(['type','tag','col'].includes(a))return{sub:a,arg:decodeURIComponent(b)};return{sub:'home',arg:''}}
  const isMediaRoute=p=>!p.length||p[0]==='m';
  const bgView=()=>q('#view>.lib')?'lib':q('#view>.mc')?'mc':'';
  function render(parts){parts=parts||[];const ov=parts[0]==='i'||parts[0]==='read';const base=ov?st.base||'':parts.join('/');
    const bp=ov?(st.base?st.base.split('/'):[]):parts;
    if((!ov||!bgView())&&isMediaRoute(bp)){closeDetail(true);closeReader(true);st.base=base;Media.render(bp);if(parts[0]==='i')openDetail(parts[1]);else if(parts[0]==='read')openReader(parts[1]);return}
    if(!ov||!bgView()){document.getElementById('app')?.classList.remove('mc-on');const p=parse(bp[0]==='docs'?bp.slice(1):bp);if(p.sub!==st.sub||p.arg!==st.arg){st.q='';st.type='';st.tag=''}Object.assign(st,p);st.base=base;draw();if(!ov){q('#scroll').scrollTop=0}}
    closeDetail(true);closeReader(true);
    if(parts[0]==='i')openDetail(parts[1]);else if(parts[0]==='read')openReader(parts[1])}
  /* aynı liste üstünde sadece detay açılıp kapanıyorsa tüm görünümü yeniden çizme */
  function soft(parts){parts=parts||[];const bv=bgView();if(!bv)return false;const ov=parts[0]==='i'||parts[0]==='read';
    if(ov){closeDetail(true);closeReader(true);parts[0]==='i'?openDetail(parts[1]):openReader(parts[1]);return true}
    if(parts.join('/')===st.base&&(q('.ld-bg')||q('.rd-bg')||q('.mx-bg'))){closeDetail();closeReader();return true}
    if(bv==='mc'&&isMediaRoute(parts)){closeDetail(true);st.base=parts.join('/');Media.render(parts,{soft:true});return true}return false}
  let rT=0;KB.on(w=>{if(typeof view==='undefined'||view!=='lib'||!q('#view>.lib'))return;clearTimeout(rT);rT=setTimeout(()=>{if(view!=='lib'||!q('#view>.lib'))return;const sc=q('#scroll'),y=sc.scrollTop,f=document.activeElement;
    if(f&&f.closest?.('.lib [data-q],.lib [contenteditable],.ld input,.ld textarea,.ld [contenteditable],.la'))return;draw();sc.scrollTop=y;const d=q('.ld-bg');if(d)refreshDetail()},60)});

  /* ── olaylar ── */
  function wire(r){
    r.addEventListener('click',e=>{const t=e.target;
      const fv=t.closest('[data-fav]');if(fv){e.preventDefault();e.stopPropagation();const it=KB.items.get(fv.dataset.fav);if(it){it.fav=!it.fav;KB.saveItem(it);toast(it.fav?'Favorilere eklendi':'Favorilerden çıkarıldı')}return}
      const gg=t.closest('[data-go]');if(gg){e.preventDefault();launch(gg.dataset.go);return}
      const op=t.closest('[data-open]');if(op&&!t.closest('a[href]:not([data-open])')){e.preventDefault();open(op.dataset.open);return}
      const a=t.closest('[data-act]');if(a){const k=a.dataset.act;if(k==='add')addSheet();else if(k==='newcol')newCol();else if(k==='delcol')delCol();else if(k==='clearf'){st.q='';st.type='';st.tag='';draw()}return}
      const v=t.closest('[data-view]');if(v){st.view=v.dataset.view;ls.set('lib:view',st.view);swap();return}
      const ft=t.closest('[data-ft]');if(ft){st.type=ft.dataset.ft;swap();return}
      const fg=t.closest('[data-fg]');if(fg){st.tag=st.tag===fg.dataset.fg?'':fg.dataset.fg;swap();return}
      const cc=t.closest('[data-colc]');if(cc){const c=KB.cols.get(st.arg);if(c){c.color=cc.dataset.colc;KB.saveCol(c)}return}});
    r.addEventListener('submit',e=>{const f=e.target.closest('[data-cap]');if(!f)return;e.preventDefault();const v=f.u.value.trim();f.u.value='';addSheet(v)});
    r.addEventListener('input',e=>{if(e.target.matches('[data-q]')){st.q=e.target.value;clearTimeout(r.qT);r.qT=setTimeout(()=>{const pos=e.target.selectionStart;swapList();const i=q('[data-q]',r);if(i){i.focus();i.setSelectionRange(pos,pos)}},120)}});
    r.addEventListener('change',e=>{if(e.target.matches('[data-sort]')){st.sort=e.target.value;ls.set('lib:sort',st.sort);swap()}});
    r.addEventListener('focusout',e=>{const f=e.target.closest?.('[data-colf]');if(!f)return;const c=KB.cols.get(st.arg);if(!c)return;let v=f.textContent.trim();
      if(f.dataset.colf==='name'){if(c.emoji&&v.startsWith(c.emoji))v=v.slice(c.emoji.length).trim();if(!v){f.textContent=c.name;return}if(v!==c.name){c.name=v;KB.saveCol(c)}}else if(v!==c.desc){c.desc=v;KB.saveCol(c)}});
    r.addEventListener('keydown',e=>{if(e.target.closest('[data-colf]')&&e.key==='Enter'){e.preventDefault();e.target.blur()}
      if(e.key==='Enter'&&e.target.matches('[data-open]')){e.preventDefault();open(e.target.dataset.open)}});
    r.addEventListener('contextmenu',e=>{const c=e.target.closest('[data-open]');if(!c)return;e.preventDefault();itemMenu(c.dataset.open,e.clientX,e.clientY)});
    // sürükle-bırak ile ekleme
    let dn=0;r.addEventListener('dragenter',e=>{if(!e.dataTransfer?.types?.some(t=>t==='Files'||t==='text/uri-list'))return;dn++;r.classList.add('dropping')});
    r.addEventListener('dragleave',()=>{if(--dn<=0){dn=0;r.classList.remove('dropping')}});
    r.addEventListener('dragover',e=>{if(r.classList.contains('dropping'))e.preventDefault()});
    r.addEventListener('drop',e=>{dn=0;r.classList.remove('dropping');const d=e.dataTransfer;if(!d)return;e.preventDefault();if(d.files?.length)addFiles([...d.files]);else{const u=d.getData('text/uri-list')||d.getData('text/plain');if(u)addSheet(u.trim())}});}
  /* filtre değişince sadece listeyi değiştir (başlık ve kenar çubuğu yerinde kalsın) */
  function swap(){const m=q('.lmain');if(!m)return draw();const y=q('#scroll').scrollTop;m.innerHTML=st.sub==='home'?homeHTML():listHTML();q('#scroll').scrollTop=y}
  function swapList(){swap()}
  addEventListener('paste',e=>{if(typeof view==='undefined'||view!=='lib'||e.target.closest?.('input,textarea,[contenteditable]'))return;const t=e.clipboardData?.getData('text')?.trim();
    if(e.clipboardData?.files?.length){e.preventDefault();addFiles([...e.clipboardData.files]);return}if(t&&/^https?:\/\//.test(t)){e.preventDefault();addSheet(t)}});
  addEventListener('keydown',e=>{if(typeof view==='undefined'||view!=='lib'||e.metaKey||e.ctrlKey||e.altKey)return;if(e.target.closest?.('input,textarea,select,[contenteditable]'))return;
    if(q('.la-bg,.ld-bg,.rd-bg,.lmenu,.pal'))return;if(e.key==='a'||e.key==='A'){e.preventDefault();addSheet()}else if(e.key==='/'){const i=q('.lib [data-q]');if(i){e.preventDefault();i.focus()}}});

  /* ── açma ── */
  function open(id){if(!KB.items.has(id))return;go('#lib/i/'+id)}
  function touchOpened(it){it.opened=Date.now();KB.saveItem(it,true)}
  function launch(id){const it=KB.items.get(id);if(!it)return;touchOpened(it);
    if(it.type==='pdf'&&(it.file||it.url))return go('#lib/read/'+id);
    if(it.file&&it.type==='image')return open(id);
    if(it.file){KB.IDB.get(id).then(b=>{if(!b)return toast('Dosya bu cihazda değil');const u=URL.createObjectURL(b);window.open(u,'_blank','noopener');setTimeout(()=>URL.revokeObjectURL(u),6e4)});return}
    if(it.type==='youtube')return open(id);
    if(it.url)window.open(it.url,'_blank','noopener');else if(MEDIA.includes(it.type))window.open('https://www.google.com/search?q='+encodeURIComponent(it.title+' '+SUF[it.type]),'_blank','noopener');else open(id)}

  /* ── detay ekranı ── */
  let dId=null;
  function media(it){const s=coverSrc(it);
    if(it.type==='youtube'&&it.yt)return`<div class="ld-yt"><iframe src="https://www.youtube-nocookie.com/embed/${esc(it.yt)}?rel=0" title="${esc(it.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture; fullscreen" allowfullscreen loading="lazy"></iframe></div>`;
    if(it.type==='image'&&(s||it.file))return`<div class="ld-img">${s?`<img src="${esc(s)}" alt="${esc(it.title)}" referrerpolicy="no-referrer">`:''}</div>`;
    return`<div class="ld-cv">${cover(it,'xl')}${it.type==='pdf'?`<button class="ld-read" data-go="${it.id}">${sv('read')}${it.progress>.01?`Kaldığın yerden oku · %${Math.round(it.progress*100)}`:'Uygulamada oku'}</button>`:''}</div>`}
  function chipsCols(it){const cs=[...KB.cols.values()];return cs.map(c=>`<button class="cc${it.cols.includes(c.id)?' on':''}" data-tc="${c.id}" style="--c:${esc(c.color)}"><i></i>${esc(c.emoji)} ${esc(c.name)}</button>`).join('')+`<button class="cc add" data-act="newcol2">${sv('plus')}Yeni</button>`}
  function linkedPages(id){return KB.neighbors(id).filter(x=>KB.kindOf(x)==='page')}
  function detailHTML(it){const t=T[it.type]||T.file,rp=linkedPages(it.id),relI=KB.related(it.id,8).filter(r=>!rp.includes(r.id));const s=coverSrc(it);
    return`<article class="ld" role="dialog" aria-modal="true" aria-label="${esc(it.title)}" style="--c:${t.c}">
      <div class="ld-media">${s?`<img class="ld-amb" src="${esc(s)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">`:''}${media(it)}</div>
      <div class="ld-info"><div class="ld-top"><span class="ld-type">${tIc(it.type)}${esc(t.n)}</span><span class="grow"></span>
          <button class="ib${it.fav?' on':''}" data-dfav title="Favori" aria-label="Favori">${sv('star')}</button><button class="ib" data-dgraph title="Second Brain'de gör" aria-label="Grafikte gör">${sv('graph')}</button><button class="ib" data-ddel title="Sil" aria-label="Sil">${sv('trash')}</button><button class="ib" data-dx title="Kapat (Esc)" aria-label="Kapat">${sv('x')}</button></div>
        <h1 class="ld-title" contenteditable="true" data-f="title" spellcheck="false">${esc(it.title)}</h1>
        <p class="ld-by"><span contenteditable="true" data-f="author" data-ph="${MEDIA.includes(it.type)?(it.type==='game'?'Stüdyo':'Yönetmen / yapımcı'):'Yazar / kaynak'}">${esc(it.author)}</span>${it.year?` · ${esc(it.year)}`:''}${it.url?` · <a href="${esc(it.url)}" target="_blank" rel="noopener">${favIco(it)?`<img src="${esc(favIco(it))}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">`:''}${esc(host(it.url))}${sv('ext')}</a>`:''}</p>
        ${MEDIA.includes(it.type)?`<div class="ld-st" role="radiogroup" aria-label="Durum">${['todo','doing','done'].map(k=>`<button class="${it.status===k?'on':''}" data-sst="${k}" role="radio" aria-checked="${it.status===k}">${stLabel({...it,status:k})}</button>`).join('')}${it.score?`<span class="ld-sc">${esc(it.score)}</span>`:''}</div>`:''}
        <div class="ld-cta"><button class="btn pri" data-go="${it.id}">${it.type==='pdf'?sv('read')+'Oku':it.type==='youtube'?'İzle':it.file?'Dosyayı aç':it.url?sv('ext')+'Kaynağa git':'Aç'}</button>${it.type==='pdf'&&it.url&&!it.file?`<a class="btn" href="${esc(it.url)}" target="_blank" rel="noopener">${sv('ext')}Yeni sekmede</a>`:''}<button class="btn" data-dnote>${sv('note')}Bu kaynak için not</button>${MEDIA.includes(it.type)||!coverSrc(it)?`<button class="btn" data-dcover>${sv('search')}${coverSrc(it)?'Kapağı yenile':'Kapak bul'}</button>`:''}</div>
        <p class="ld-desc" contenteditable="true" data-f="desc" data-ph="Kısa bir açıklama ekle…">${esc(it.desc)}</p>
        <section class="ld-s"><h3>${sv('tag')}Etiketler</h3><div class="ld-tags">${it.tags.map(x=>`<span class="tg"><a href="#brain/t:${encodeURIComponent(x)}">#${esc(x)}</a><button data-untag="${esc(x)}" aria-label="Etiketi kaldır">${sv('x')}</button></span>`).join('')}<input data-tagin placeholder="+ etiket" aria-label="Etiket ekle"></div></section>
        <section class="ld-s"><h3>${sv('folder')}Koleksiyonlar</h3><div class="ld-cols">${chipsCols(it)}</div></section>
        <section class="ld-s"><h3>${sv('edit')}Notlarım</h3><textarea data-dnotes aria-label="Notlarım" placeholder="Bu içerik hakkında düşüncelerin, alıntılar, sayfa numaraları…">${esc(it.note)}</textarea></section>
        <section class="ld-s"><h3>${sv('note')}Bağlı notlar <em>${rp.length}</em></h3>${rp.length?`<div class="ld-pages">${rp.map(pid=>{const p=pages.get(pid);return`<a class="ld-pg" href="#p/${pid}"><span>${esc(iconOf(p))}</span><b>${esc(titleOf(p))}</b><small>${esc((firstText(p)||'').slice(0,80))}</small></a>`}).join('')}</div>`:'<p class="muted">Henüz bir notla ilişkilendirilmedi.</p>'}
          <div class="ld-row"><button class="lnk" data-dnote>${sv('plus')}Yeni not oluştur</button><button class="lnk" data-dlink>${sv('link')}Mevcut bir nota bağla</button></div></section>
        ${relI.length?`<section class="ld-s"><h3>${sv('graph')}İlgili içerikler</h3><div class="ld-rel">${relI.map(r=>{const k=KB.kindOf(r.id);if(k==='item'){const x=KB.items.get(r.id);return`<button class="rel" data-open="${x.id}" title="${esc(r.why)}">${cover(x,'mini')}<span><b>${esc(x.title)}</b><small>${esc(r.why)}</small></span></button>`}const p=pages.get(r.id);return`<a class="rel" href="#p/${p.id}" title="${esc(r.why)}"><span class="rel-p">${esc(iconOf(p))}</span><span><b>${esc(titleOf(p))}</b><small>${esc(r.why)}</small></span></a>`}).join('')}</div></section>`:''}
        <section class="ld-s ai"><h3>${sv('spark')}Akıllı yardımcı <em>${KB.AI.ok()?'Claude':'yerel'}</em></h3><div class="ai-b"><button class="chip" data-ai="sum">Özetle</button><button class="chip" data-ai="tags">Etiket öner</button><button class="chip" data-ai="links">Bağlantı öner</button></div><div class="ai-out" aria-live="polite">${it.summary?`<div class="ai-r"><b>Kayıtlı özet</b><p>${esc(it.summary)}</p></div>`:''}</div>
          <p class="hint">${KB.AI.ok()?'Öneriler sadece sen onaylarsan uygulanır.':'Claude anahtarı yok; yerel öneriler çalışır. Anahtarı Netleştir uygulamasından ekleyebilirsin.'}</p></section>
        <footer class="ld-f">${esc(fmtD(it.added))} tarihinde eklendi${it.opened?` · son açılış ${esc(rel(it.opened))}`:''}${it.file?` · ${esc(it.file.name)} (${size(it.file.size)}) — dosya bu cihazda`:''}</footer></div></article>`}
  function openDetail(id){const it=KB.items.get(id);if(!it){toast('İçerik bulunamadı');return go('#lib'+(st.base?'/'+st.base:''))}if(MEDIA.includes(it.type))return Media.detail(id);dId=id;touchOpened(it);
    const bg=document.createElement('div');bg.className='ld-bg';bg.innerHTML=detailHTML(it);document.body.appendChild(bg);wireDetail(bg);
    if(motionOK()){bg.animate([{opacity:0},{opacity:1}],{duration:200,easing:EASE});q('.ld',bg).animate([{opacity:0,transform:'translateY(24px) scale(.985)'},{opacity:1,transform:'none'}],{duration:520,easing:OUT})}
    setTimeout(()=>q('[data-dx]',bg)?.focus({preventScroll:true}),60)}
  function refreshDetail(){const bg=q('.ld-bg');if(!bg||!dId)return;const it=KB.items.get(dId);if(!it)return closeDetail();const a=document.activeElement;if(a&&bg.contains(a)&&a.matches('textarea,input,[contenteditable]'))return;
    const sc=q('.ld-info',bg)?.scrollTop||0,yt=q('.ld-yt',bg);bg.innerHTML=detailHTML(it);if(yt)q('.ld-media .ld-yt',bg)?.replaceWith(yt);q('.ld-info',bg).scrollTop=sc}
  function closeDetail(instant){Media.close(instant);const bg=q('.ld-bg');if(!bg)return;dId=null;if(instant||!motionOK())return bg.remove();bg.animate([{opacity:1},{opacity:0}],{duration:160,easing:EASE}).finished.then(()=>bg.remove(),()=>bg.remove())}
  const back=()=>{history.length>1&&location.hash.startsWith('#lib/i/')?history.back():go('#lib'+(st.base?'/'+st.base:''))};
  function wireDetail(bg){
    bg.addEventListener('click',async e=>{const t=e.target,it=KB.items.get(dId);if(!it)return;
      if(t===bg||t.closest('[data-dx]'))return back();
      if(t.closest('[data-dfav]')){it.fav=!it.fav;KB.saveItem(it);return}
      const ss=t.closest('[data-sst]');if(ss){it.status=it.status===ss.dataset.sst?'':ss.dataset.sst;KB.saveItem(it);return}
      if(t.closest('[data-dcover]')){findCovers([it],{force:true,say:true});return}
      if(t.closest('[data-dgraph]'))return go('#brain/'+it.id);
      if(t.closest('[data-ddel]')){const name=it.title;const snap=KB.delItem(it.id);back();toastUndo(`“${name}” silindi`,()=>KB.restoreItem(snap));return}
      const gg=t.closest('[data-go]');if(gg)return launch(gg.dataset.go);
      const op=t.closest('[data-open]');if(op)return open(op.dataset.open);
      if(t.closest('[data-dnote]')){const p=newPage({title:it.title+' — notlar',icon:'📝'});p.blocks=[B('lib','',{lid:it.id}),B('p')];touch(p);KB.link(p.id,it.id);(it.tags||[]).length&&KB.setTags(p.id,it.tags);go('#p/'+p.id);toast('Not oluşturuldu ve kaynağa bağlandı');return}
      if(t.closest('[data-dlink]')){pagePicker(t.closest('[data-dlink]'),pid=>{KB.link(pid,it.id);toast('Nota bağlandı')});return}
      const tc=t.closest('[data-tc]');if(tc){KB.toggleCol(it,tc.dataset.tc);return}
      if(t.closest('[data-act=newcol2]')){newCol(c=>{KB.toggleCol(it,c.id)});return}
      const ut=t.closest('[data-untag]');if(ut){KB.setTags(it.id,it.tags.filter(x=>x!==ut.dataset.untag));return}
      const ai=t.closest('[data-ai]');if(ai)return runAI(ai.dataset.ai,it,q('.ai-out',bg));
      const ap=t.closest('[data-apply]');if(ap)return applyAI(ap,it)});
    bg.addEventListener('keydown',e=>{if(e.key==='Escape'&&!e.target.closest('input,textarea')){e.preventDefault();e.stopPropagation();back()}
      if(e.target.matches('[data-tagin]')&&(e.key==='Enter'||e.key===',')){e.preventDefault();const v=e.target.value.trim();if(v){const it=KB.items.get(dId);KB.setTags(it.id,[...it.tags,...v.split(',')]);setTimeout(()=>q('.ld-bg [data-tagin]')?.focus(),80)}}
      if(e.target.matches('[contenteditable]')&&e.key==='Enter'&&e.target.dataset.f!=='desc'){e.preventDefault();e.target.blur()}});
    bg.addEventListener('focusout',e=>{const f=e.target.closest?.('[data-f]');const it=KB.items.get(dId);if(!it)return;
      if(f){const k=f.dataset.f,v=f.textContent.trim();if(k==='title'&&!v){f.textContent=it.title;return}if(v!==it[k]){it[k]=v;KB.saveItem(it,true);KB.emit('items')}}
      if(e.target.matches('[data-dnotes]')&&e.target.value!==it.note){it.note=e.target.value;KB.saveItem(it,true)}});
    bg.addEventListener('input',e=>{if(e.target.matches('[data-dnotes]')){const it=KB.items.get(dId);clearTimeout(bg.nT);bg.nT=setTimeout(()=>{it.note=e.target.value;KB.saveItem(it,true)},600)}})}
  async function runAI(k,it,out){out.innerHTML=`<div class="ai-r load"><span class="sk"></span><span class="sk w"></span><span class="sk"></span></div>`;
    try{if(k==='sum'){const r=await KB.AI.summarize(it.id);out.innerHTML=`<div class="ai-r"><b>Özet önerisi${r.local?' (yerel)':''}</b><p>${esc(r.text)}</p><div class="ai-a"><button class="btn pri sm" data-apply="sum" data-v="${esc(r.text)}">Özet olarak kaydet</button><button class="btn sm" data-apply="desc" data-v="${esc(r.text)}">Açıklamaya koy</button></div></div>`}
      else if(k==='tags'){const r=await KB.AI.tags(it.id);const nw=r.tags.filter(x=>!it.tags.includes(x));out.innerHTML=`<div class="ai-r"><b>Etiket önerileri${r.local?' (yerel)':''}</b><div class="ai-tags">${nw.map(x=>`<button class="tg pick" data-apply="tag" data-v="${esc(x)}">+ #${esc(x)}</button>`).join('')||'<span class="muted">Yeni öneri yok</span>'}</div></div>`}
      else{const r=await KB.AI.links(it.id);out.innerHTML=`<div class="ai-r"><b>Olası bağlantılar${r.local?' (yerel)':''}</b>${r.list.length?r.list.map(x=>`<div class="ai-l"><span><b>${esc(KB.titleOfId(x.id))}</b><small>${esc(x.why)}</small></span><button class="btn sm" data-apply="link" data-v="${x.id}">Bağla</button></div>`).join(''):'<p class="muted">Şimdilik öneri yok — daha çok not ve etiket ekledikçe artar.</p>'}</div>`}}
    catch(err){out.innerHTML=`<div class="ai-r err"><b>Yapılamadı</b><p>${esc(err.message||'Bağlantı hatası')}</p></div>`}}
  function applyAI(b,it){const k=b.dataset.apply,v=b.dataset.v;if(k==='sum'){it.summary=v;KB.saveItem(it);toast('Özet kaydedildi')}else if(k==='desc'){it.desc=v;KB.saveItem(it);toast('Açıklamaya eklendi')}
    else if(k==='tag'){KB.setTags(it.id,[...it.tags,v]);b.remove()}else if(k==='link'){KB.link(it.id,v);b.textContent='Bağlandı';b.disabled=true}}
  function toastUndo(msg,fn){toast(msg);const t=[...document.querySelectorAll('.toast')].pop();if(!t)return;const u=document.createElement('button');u.className='tu';u.textContent='Geri al';u.onclick=()=>{fn();t.remove()};t.appendChild(u)}

  /* ── PDF okuyucu (pdf.js, uygulamanın içinde) ── */
  let pdfjs=null;async function PDF(){if(pdfjs)return pdfjs;const m=await import('./vendor/pdfjs/pdf.min.mjs');m.GlobalWorkerOptions.workerSrc=new URL('vendor/pdfjs/pdf.worker.min.mjs',document.baseURI).href;return pdfjs=m}
  let RD=null;
  async function openReader(id){const it=KB.items.get(id);if(!it)return go('#lib');touchOpened(it);
    const bg=document.createElement('div');bg.className='rd-bg';bg.innerHTML=`<div class="rd" role="dialog" aria-label="${esc(it.title)}"><header class="rd-h"><button class="ib" data-rx aria-label="Kapat">${sv('back')}</button><b>${esc(it.title)}</b><span class="grow"></span>
      <span class="rd-pg"><input data-pgi value="${it.page||1}" aria-label="Sayfa" inputmode="numeric"> / <em>…</em></span><button class="ib" data-z="-1" aria-label="Uzaklaş">${sv('minus')}</button><span class="rd-z">%100</span><button class="ib" data-z="1" aria-label="Yakınlaş">${sv('plus')}</button>${it.url?`<a class="ib" href="${esc(it.url)}" target="_blank" rel="noopener" title="Yeni sekmede aç">${sv('ext')}</a>`:''}</header>
      <div class="rd-b"><div class="rd-load"><span class="spin"></span>PDF hazırlanıyor…</div></div><div class="rd-bar"><i></i></div></div>`;document.body.appendChild(bg);
    RD={id,bg,zoom:1,doc:null,io:null};const body=q('.rd-b',bg);
    bg.addEventListener('click',e=>{if(e.target.closest('[data-rx]'))back2();const z=e.target.closest('[data-z]');if(z)zoom(+z.dataset.z)});
    bg.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();back2()}if(e.target.matches('[data-pgi]')&&e.key==='Enter'){e.preventDefault();goPage(+e.target.value)}});
    if(motionOK())bg.animate([{opacity:0,transform:'scale(.985)'},{opacity:1,transform:'none'}],{duration:320,easing:OUT});
    try{let data;if(it.file){const b=await KB.IDB.get(id);if(!b)throw new Error('Dosya bu cihazda bulunamadı. PDF başka bir cihazdan eklenmiş olabilir.');data=new Uint8Array(await b.arrayBuffer())}
      else{const r=await fetch(it.url).catch(()=>null);if(!r||!r.ok)throw new Error('Bu PDF uygulama içinde açılamadı (site izin vermiyor).');data=new Uint8Array(await r.arrayBuffer())}
      const lib=await PDF();const doc=await lib.getDocument({data}).promise;if(!RD||RD.id!==id)return;RD.doc=doc;q('.rd-pg em',bg).textContent=doc.numPages;
      if(!it.pages){it.pages=doc.numPages;KB.saveItem(it,true)}
      const first=await doc.getPage(1),vp=first.getViewport({scale:1});RD.base=vp;layoutPages();goPage(it.page||1,true)}
    catch(err){body.innerHTML=`<div class="rd-err"><b>PDF açılamadı</b><p>${esc(err.message)}</p>${it.url?`<a class="btn pri" href="${esc(it.url)}" target="_blank" rel="noopener">${sv('ext')}Yeni sekmede aç</a>`:''}</div>`}}
  function layoutPages(){if(!RD?.doc)return;const body=q('.rd-b',RD.bg),w=Math.min(body.clientWidth-48,900)*RD.zoom,h=w*RD.base.height/RD.base.width;
    body.innerHTML=Array.from({length:RD.doc.numPages},(_,i)=>`<div class="rd-p" data-n="${i+1}" style="width:${w}px;height:${h}px"><span>${i+1}</span></div>`).join('');q('.rd-z',RD.bg).textContent='%'+Math.round(RD.zoom*100);
    RD.io?.disconnect();RD.io=new IntersectionObserver(es=>es.forEach(en=>{if(en.isIntersecting)paint(en.target)}),{root:body,rootMargin:'800px 0px'});qa('.rd-p',body).forEach(p=>RD.io.observe(p));
    body.onscroll=()=>{clearTimeout(RD.sT);RD.sT=setTimeout(track,140)}}
  async function paint(el){if(el.dataset.done||!RD?.doc)return;el.dataset.done=1;const n=+el.dataset.n,pg=await RD.doc.getPage(n),w=el.clientWidth,dpr=Math.min(2,devicePixelRatio||1);
    const vp=pg.getViewport({scale:w/RD.base.width*dpr}),c=document.createElement('canvas');c.width=vp.width;c.height=vp.height;c.style.width='100%';c.style.height='100%';
    await pg.render({canvasContext:c.getContext('2d'),viewport:vp}).promise;el.appendChild(c)}
  function track(){if(!RD?.doc)return;const body=q('.rd-b',RD.bg),mid=body.scrollTop+body.clientHeight*.35;let n=1;for(const p of qa('.rd-p',body)){if(p.offsetTop<=mid)n=+p.dataset.n;else break}
    const pr=Math.min(1,(body.scrollTop+body.clientHeight)/body.scrollHeight);q('[data-pgi]',RD.bg).value=n;q('.rd-bar i',RD.bg).style.width=(pr*100)+'%';
    const it=KB.items.get(RD.id);if(it&&(it.page!==n||Math.abs(it.progress-pr)>.01)){it.page=n;it.progress=n>=RD.doc.numPages?1:Math.max(it.progress<.01?0:0,(n-1)/RD.doc.numPages+.001);it.progress=Math.max(0,Math.min(1,pr>0.995?1:(n-1)/RD.doc.numPages));KB.saveItem(it,true)}}
  function goPage(n,instant){const body=q('.rd-b',RD.bg),el=q(`.rd-p[data-n="${Math.max(1,Math.min(RD.doc.numPages,n||1))}"]`,body);if(el)body.scrollTo({top:el.offsetTop-16,behavior:instant?'auto':'smooth'})}
  function zoom(d){if(!RD?.doc)return;const body=q('.rd-b',RD.bg),f=body.scrollTop/body.scrollHeight;RD.zoom=Math.max(.5,Math.min(2.5,RD.zoom+d*.15));layoutPages();body.scrollTop=f*body.scrollHeight}
  function closeReader(instant){const bg=q('.rd-bg');if(!bg)return;RD?.io?.disconnect();RD?.doc?.destroy?.();RD=null;KB.emit('items');if(instant||!motionOK())return bg.remove();bg.animate([{opacity:1},{opacity:0}],{duration:160}).finished.then(()=>bg.remove(),()=>bg.remove())}
  const back2=()=>{history.length>1&&location.hash.startsWith('#lib/read/')?history.back():go('#lib')};

  /* ── ekleme: bağlantı, kitap araması, dosya ── */
  const tmo=(p,ms=7000)=>Promise.race([p,new Promise((_,no)=>setTimeout(()=>no(new Error('zaman aşımı')),ms))]);
  const getJSON=u=>tmo(fetch(u).then(r=>{if(!r.ok)throw new Error(r.status);return r.json()}));
  function guessType(u){const h=host(u),p=(()=>{try{return new URL(u).pathname}catch{return''}})();if(ytId(u))return'youtube';if(/\.pdf($|\?)/i.test(u))return'pdf';if(/\.(png|jpe?g|gif|webp|avif|svg)($|\?)/i.test(u))return'image';
    if(/arxiv\.org|scholar\.|researchgate|doi\.org|ncbi\.nlm|semanticscholar|ieee/.test(h))return'research';if(/coursera|udemy|edx|khanacademy|collegeboard|codecademy/.test(h))return'course';
    if(/openlibrary|goodreads|kitapyurdu|amazon\..*\/dp\//.test(u))return'book';return p.split('/').filter(Boolean).length>=2?'article':'web'}
  async function meta(u){const type=guessType(u),out={url:u,type,site:host(u),title:'',desc:'',cover:'',favicon:`https://www.google.com/s2/favicons?domain=${host(u)}&sz=64`};
    if(type==='youtube'){out.yt=ytId(u);out.title='YouTube videosu';try{const j=await getJSON('https://noembed.com/embed?url='+encodeURIComponent(u));if(j.title)out.title=j.title;if(j.author_name)out.author=j.author_name}catch{}return out}
    if(type==='image'){out.cover=u;out.title=decodeURIComponent((u.split('/').pop()||'Görsel').split('?')[0]);return out}
    try{const j=await getJSON('https://api.microlink.io/?url='+encodeURIComponent(u));const d=j.data||{};out.title=d.title||'';out.desc=d.description||'';out.cover=d.image?.url||'';if(d.logo?.url)out.favicon=d.logo.url;if(d.author)out.author=d.author;if(d.publisher)out.site=d.publisher}catch{}
    if(!out.title)out.title=host(u)||u;return out}
  async function books(qs){try{const j=await getJSON('https://openlibrary.org/search.json?limit=8&fields=key,title,author_name,first_publish_year,cover_i,number_of_pages_median&q='+encodeURIComponent(qs));
      return(j.docs||[]).map(d=>({type:'book',title:d.title,author:(d.author_name||[]).slice(0,2).join(', '),year:d.first_publish_year?String(d.first_publish_year):'',pages:d.number_of_pages_median||0,cover:d.cover_i?`https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg`:'',url:d.key?'https://openlibrary.org'+d.key:'',site:'Open Library'}))}catch{return null}}
  let LA=null;
  function addSheet(prefill=''){if(q('.la-bg'))return;const bg=document.createElement('div');bg.className='la-bg';const pre=st.sub==='col'?[st.arg]:[];
    bg.innerHTML=`<div class="la" role="dialog" aria-modal="true" aria-label="Kütüphaneye ekle"><header><h2>Kütüphaneye ekle</h2><button class="ib" data-lx aria-label="Kapat">${sv('x')}</button></header>
      <label class="la-in">${sv('link')}<input data-u placeholder="Bağlantı yapıştır ya da kitap adı yaz" autocomplete="off" aria-label="Bağlantı ya da kitap adı"></label>
      <div class="la-types" role="radiogroup" aria-label="Tür">${Object.keys(T).map(t=>`<button class="chip" data-lt="${t}" role="radio" aria-checked="false">${tIc(t)}${T[t].n}</button>`).join('')}</div>
      <div class="la-prev" aria-live="polite"><div class="la-hint">${sv('spark')}<span>Bağlantı yapıştırınca kapağı, başlığı ve türü otomatik bulunur. Kitap adı yazarsan kapaklı sonuçlar çıkar.</span></div></div>
      <button class="la-drop" data-pick><span>${sv('up')}</span><b>Dosya seç ya da buraya bırak</b><small>PDF, görsel, belge — dosyalar bu cihazda saklanır</small><input type="file" multiple hidden data-file accept=".pdf,image/*,.doc,.docx,.txt,.md,.epub,.ppt,.pptx,.xls,.xlsx,application/pdf"></button>
      ${KB.cols.size?`<div class="la-cols"><span>Koleksiyon</span>${[...KB.cols.values()].map(c=>`<button class="cc${pre.includes(c.id)?' on':''}" data-lc="${c.id}" style="--c:${esc(c.color)}"><i></i>${esc(c.emoji)} ${esc(c.name)}</button>`).join('')}</div>`:''}
      <footer><span class="muted" data-st></span><button class="btn" data-lx>Vazgeç</button><button class="btn pri" data-save disabled>Ekle</button></footer></div>`;
    document.body.appendChild(bg);LA={bg,data:null,type:'',cols:new Set(pre),seq:0};const inp=q('[data-u]',bg);
    if(motionOK()){bg.animate([{opacity:0},{opacity:1}],{duration:180});q('.la',bg).animate([{opacity:0,transform:'translateY(16px) scale(.98)'},{opacity:1,transform:'none'}],{duration:420,easing:OUT})}
    const close=()=>{LA=null;bg.remove()};
    bg.addEventListener('click',e=>{const t=e.target;if(t===bg||t.closest('[data-lx]'))return close();
      if(t.closest('[data-pick]')&&!t.matches('input'))return q('[data-file]',bg).click();
      const lt=t.closest('[data-lt]');if(lt){LA.type=lt.dataset.lt;markType();if(MEDIA.includes(LA.type)&&inp.value.trim()&&!/^(https?:|www\.)/i.test(inp.value.trim())){lookup(inp.value.trim());return}if(LA.data){LA.data.type=LA.type;preview()}else if(inp.value.trim())lookup(inp.value.trim());return}
      const lc=t.closest('[data-lc]');if(lc){const id=lc.dataset.lc;LA.cols.has(id)?LA.cols.delete(id):LA.cols.add(id);lc.classList.toggle('on');return}
      const bk=t.closest('[data-bk]');if(bk){LA.data=LA.books[+bk.dataset.bk];LA.type='book';markType();preview();return}
      if(t.closest('[data-save]'))save()});
    bg.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close()}if(e.key==='Enter'&&e.target===inp){e.preventDefault();if(LA.data)save();else lookup(inp.value.trim())}});
    inp.addEventListener('input',()=>{clearTimeout(LA.t);LA.data=null;q('[data-save]',bg).disabled=true;LA.t=setTimeout(()=>lookup(inp.value.trim()),450)});
    q('[data-file]',bg).addEventListener('change',e=>{const fs=[...e.target.files];if(fs.length){close();addFiles(fs,[...LA?.cols||pre])}});
    const dz=q('.la-drop',bg);dz.addEventListener('dragover',e=>{e.preventDefault();dz.classList.add('on')});dz.addEventListener('dragleave',()=>dz.classList.remove('on'));
    dz.addEventListener('drop',e=>{e.preventDefault();const fs=[...e.dataTransfer.files];const cs=[...LA.cols];close();if(fs.length)addFiles(fs,cs)});
    if(prefill){inp.value=prefill;lookup(prefill)}setTimeout(()=>inp.focus(),40)}
  function markType(){qa('[data-lt]',LA.bg).forEach(b=>{const on=b.dataset.lt===LA.type;b.classList.toggle('on',on);b.setAttribute('aria-checked',on)})}
  async function lookup(v){if(!LA)return;const seq=++LA.seq,box=q('.la-prev',LA.bg),stt=q('[data-st]',LA.bg);if(!v){box.innerHTML='';return}
    const isUrl=/^(https?:\/\/|www\.)/i.test(v)||/^[\w-]+\.[a-z]{2,}(\/|$)/i.test(v);
    if(isUrl){const u=/^https?:/i.test(v)?v:'https://'+v;box.innerHTML=skel();stt.textContent='Önizleme hazırlanıyor…';const m=await meta(u);if(seq!==LA?.seq)return;if(LA.type&&LA.type!==m.type&&!['youtube'].includes(m.type))m.type=LA.type;LA.data=m;LA.type=m.type;markType();stt.textContent='';preview();return}
    LA.type=LA.type||'book';markType();
    if(MEDIA.includes(LA.type)){box.innerHTML=skel(true);stt.textContent='Kapak aranıyor…';const w=await wiki(v+' '+SUF[LA.type]).catch(()=>null);if(seq!==LA?.seq)return;stt.textContent=w?'':'Kapak bulunamadı — başlıkla eklenebilir';
      LA.data={type:LA.type,title:v,cover:w?.cover||'',url:w?.url||'',desc:w?.desc||'',status:'todo'};preview();return}
    if(LA.type!=='book'){LA.data={type:LA.type,title:v,url:''};preview();return}
    box.innerHTML=skel(true);stt.textContent='Kitap aranıyor…';const r=await books(v);if(seq!==LA?.seq)return;stt.textContent='';
    if(!r||!r.length){LA.data={type:'book',title:v};preview();if(!r)stt.textContent='Kitap araması şu an yapılamadı — başlıkla eklenebilir';return}
    LA.books=r;box.innerHTML=`<p class="la-k">Kitap sonuçları — birini seç</p><div class="la-books">${r.map((b,i)=>`<button class="lb" data-bk="${i}">${b.cover?`<img src="${esc(b.cover.replace('-L.','-M.'))}" alt="" loading="lazy" referrerpolicy="no-referrer">`:`<span class="lb-n">${tIc('book')}</span>`}<b>${esc(b.title)}</b><small>${esc(b.author)}${b.year?' · '+b.year:''}</small></button>`).join('')}</div>`}
  const skel=b=>`<div class="la-card load"><span class="sk cvr${b?' p':''}"></span><span><span class="sk"></span><span class="sk w"></span></span></div>`;
  function preview(){const d=LA.data;if(!d)return;const fake=KB.normItem({...d,id:'L_prev',type:d.type||LA.type||'web'});
    q('.la-prev',LA.bg).innerHTML=`<div class="la-card">${cover(fake)}<div><input data-pt value="${esc(fake.title)}" aria-label="Başlık"><p>${metaLine(fake)}</p>${fake.desc?`<small>${esc(fake.desc.slice(0,160))}</small>`:''}</div></div>`;
    q('[data-pt]',LA.bg).addEventListener('input',e=>{LA.data.title=e.target.value});q('[data-save]',LA.bg).disabled=false}
  function save(){const d=LA?.data;if(!d)return;const it=KB.addItem({...d,type:LA.type||d.type,cols:[...LA.cols]});LA.bg.remove();LA=null;toast(`“${it.title}” kütüphaneye eklendi`);if(view==='lib')open(it.id)}
  async function thumbFromCanvas(c,max=420){const k=Math.min(1,max/Math.max(c.width,c.height)),o=document.createElement('canvas');o.width=Math.round(c.width*k);o.height=Math.round(c.height*k);o.getContext('2d').drawImage(c,0,0,o.width,o.height);return o.toDataURL('image/jpeg',.72)}
  async function processFile(f){const name=f.name||'Dosya',ext=(name.split('.').pop()||'').toLowerCase(),base=name.replace(/\.[^.]+$/,'').replace(/[_-]+/g,' ').trim();
    const o={title:base||name,file:{name,size:f.size,mime:f.type||''},type:'file'};
    if(f.type==='application/pdf'||ext==='pdf'){o.type='pdf';try{const lib=await PDF();const data=new Uint8Array(await f.arrayBuffer());const doc=await lib.getDocument({data}).promise;o.pages=doc.numPages;
        const m=await doc.getMetadata().catch(()=>null);const tt=m?.info?.Title;if(tt&&tt.length>3&&!/^(untitled|microsoft word)/i.test(tt))o.title=tt;if(m?.info?.Author)o.author=m.info.Author;
        const pg=await doc.getPage(1),vp0=pg.getViewport({scale:1}),vp=pg.getViewport({scale:520/vp0.width}),c=document.createElement('canvas');c.width=vp.width;c.height=vp.height;
        await pg.render({canvasContext:c.getContext('2d'),viewport:vp}).promise;o.cover=await thumbFromCanvas(c,420);doc.destroy()}catch(e){console.warn('pdf önizleme',e)}}
    else if(f.type.startsWith('image/')){o.type='image';try{const bm=await createImageBitmap(f),c=document.createElement('canvas');c.width=bm.width;c.height=bm.height;c.getContext('2d').drawImage(bm,0,0);o.cover=await thumbFromCanvas(c,560)}catch{}}
    else if(['doc','docx','txt','md','rtf','odt','pages'].includes(ext))o.type='doc';else if(ext==='epub')o.type='book';
    return o}
  async function addFiles(fs,colsIn){const cs=colsIn||(st.sub==='col'?[st.arg]:[]);let n=0,last=null;toast(fs.length>1?`${fs.length} dosya ekleniyor…`:'Dosya hazırlanıyor…');
    for(const f of fs){try{const o=await processFile(f);o.cols=cs;const it=KB.addItem(o);await KB.IDB.put(it.id,f);n++;last=it}catch(e){toast('Eklenemedi: '+(f.name||'dosya'))}}
    if(n)toast(n>1?`${n} içerik eklendi`:`“${last.title}” eklendi`);if(n===1&&view==='lib')open(last.id)}

  /* ── koleksiyon oluştur/sil ── */
  function newCol(cb){const bg=document.createElement('div');bg.className='la-bg';const cs=['#6E56CF','#3E63DD','#0D9488','#30A46C','#E5484D','#B45309','#E11D48','#71717A'];let col=cs[KB.cols.size%cs.length];
    bg.innerHTML=`<form class="la sm" role="dialog" aria-label="Yeni koleksiyon"><header><h2>Yeni koleksiyon</h2><button type="button" class="ib" data-lx aria-label="Kapat">${sv('x')}</button></header>
      <label class="fld"><span>Ad</span><input name="n" required placeholder="Örn. Computer Science" maxlength="60"></label><label class="fld"><span>Açıklama</span><input name="d" placeholder="Bu koleksiyon ne için?" maxlength="160"></label>
      <div class="fld"><span>Renk ve simge</span><div class="sw">${cs.map(c=>`<button type="button" data-c="${c}" style="--c:${c}" class="${c===col?'on':''}" aria-label="Renk"></button>`).join('')}<input name="e" placeholder="🙂" maxlength="2" class="emo" aria-label="Simge"></div></div>
      <div class="sugg">${['Computer Science','Game Development','SAT Preparation','Design Inspiration','Books to Read','Research','Personal'].filter(n=>![...KB.cols.values()].some(c=>c.name===n)).map(n=>`<button type="button" class="tg sm" data-s="${n}">${n}</button>`).join('')}</div>
      <footer><span></span><button type="button" class="btn" data-lx>Vazgeç</button><button class="btn pri">Oluştur</button></footer></form>`;
    document.body.appendChild(bg);const f=q('form',bg);setTimeout(()=>f.n.focus(),40);
    bg.addEventListener('click',e=>{if(e.target===bg||e.target.closest('[data-lx]'))bg.remove();const c=e.target.closest('[data-c]');if(c){col=c.dataset.c;qa('[data-c]',bg).forEach(x=>x.classList.toggle('on',x===c))}const s=e.target.closest('[data-s]');if(s)f.n.value=s.dataset.s});
    bg.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();bg.remove()}});
    f.addEventListener('submit',e=>{e.preventDefault();const c=KB.addCol({name:f.n.value.trim()||'Yeni koleksiyon',desc:f.d.value.trim(),color:col,emoji:f.e.value.trim()});bg.remove();toast(`“${c.name}” oluşturuldu`);if(cb)cb(c);else go('#lib/col/'+c.id)})}
  function delCol(){const c=KB.cols.get(st.arg);if(!c)return;if(!confirm(`“${c.name}” koleksiyonu silinsin mi? İçindeki içerikler kütüphanede kalır.`))return;KB.delCol(c.id);go('#lib');toast('Koleksiyon silindi')}
  function itemMenu(id,x,y){q('.lmenu')?.remove();const it=KB.items.get(id);if(!it)return;const m=document.createElement('div');m.className='lmenu';m.setAttribute('role','menu');
    m.innerHTML=`<button data-m="open">${sv('chev')}Ayrıntılar</button><button data-m="go">${sv('ext')}${it.type==='pdf'?'Oku':'Aç'}</button><button data-m="fav">${sv('star')}${it.fav?'Favorilerden çıkar':'Favorilere ekle'}</button><div class="sep"></div><p>Koleksiyona ekle</p>${[...KB.cols.values()].map(c=>`<button data-c="${c.id}">${it.cols.includes(c.id)?'✓ ':''}${esc(c.emoji)} ${esc(c.name)}</button>`).join('')||'<p class="muted">Koleksiyon yok</p>'}<div class="sep"></div><button data-m="cover">${sv('search')}Kapak bul</button><button data-m="graph">${sv('graph')}Second Brain'de gör</button><button data-m="del" class="danger">${sv('trash')}Sil</button>`;
    document.body.appendChild(m);m.style.left=Math.min(x,innerWidth-m.offsetWidth-10)+'px';m.style.top=Math.min(y,innerHeight-m.offsetHeight-10)+'px';
    const off=e=>{if(!m.contains(e.target)){m.remove();removeEventListener('pointerdown',off,true)}};setTimeout(()=>addEventListener('pointerdown',off,true));
    m.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;m.remove();const k=b.dataset.m;if(b.dataset.c)return KB.toggleCol(it,b.dataset.c);
      if(k==='open')open(id);else if(k==='go')launch(id);else if(k==='fav'){it.fav=!it.fav;KB.saveItem(it)}else if(k==='graph')go('#brain/'+id);else if(k==='cover')findCovers([it],{force:true,say:true});else if(k==='del'){const s=KB.delItem(id);toastUndo(`“${it.title}” silindi`,()=>KB.restoreItem(s))}})}

  /* ── seçiciler: sayfa seç / kaynak seç (Workspace bağları için) ── */
  function picker(anchor,title,list,cb){q('.lpick')?.remove();const m=document.createElement('div');m.className='lpick';m.innerHTML=`<p>${esc(title)}</p><input placeholder="Ara…" aria-label="Ara"><div class="lp-l"></div>`;document.body.appendChild(m);
    const r=anchor.getBoundingClientRect();m.style.left=Math.max(10,Math.min(r.left,innerWidth-m.offsetWidth-10))+'px';m.style.top=Math.min(r.bottom+6,innerHeight-m.offsetHeight-10)+'px';
    const inp=q('input',m),box=q('.lp-l',m);let sel=0,cur=[];const draw=()=>{const s=low(inp.value);cur=list().filter(x=>!s||low(x.t).includes(s)).slice(0,40);sel=Math.min(sel,cur.length-1);
      box.innerHTML=cur.map((x,i)=>`<button class="${i===sel?'on':''}" data-i="${i}">${x.ic}<span><b>${esc(x.t)}</b>${x.s?`<small>${esc(x.s)}</small>`:''}</span></button>`).join('')||'<p class="muted">Sonuç yok</p>'};
    const done=x=>{m.remove();removeEventListener('pointerdown',off,true);if(x)cb(x.id)};const off=e=>{if(!m.contains(e.target))done()};setTimeout(()=>addEventListener('pointerdown',off,true));
    inp.addEventListener('input',()=>{sel=0;draw()});inp.addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();sel=Math.min(cur.length-1,sel+1);draw()}else if(e.key==='ArrowUp'){e.preventDefault();sel=Math.max(0,sel-1);draw()}else if(e.key==='Enter'){e.preventDefault();done(cur[sel])}else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();done()}});
    box.addEventListener('click',e=>{const b=e.target.closest('[data-i]');if(b)done(cur[+b.dataset.i])});draw();inp.focus()}
  const pagePicker=(a,cb)=>picker(a,'Hangi nota bağlansın?',()=>sorted().map(p=>({id:p.id,t:titleOf(p),s:(firstText(p)||'').slice(0,60),ic:`<span class="pe">${esc(iconOf(p))}</span>`})),cb);
  const itemPicker=(a,cb)=>picker(a,'Kütüphaneden kaynak seç',()=>every().sort((x,y)=>(y.opened||y.added)-(x.opened||x.added)).map(it=>({id:it.id,t:it.title,s:(T[it.type]||T.file).n+(it.author?' · '+it.author:''),ic:cover(it,'mini')})),cb);

  /* ── Workspace: not içine gömülü kaynak kartı (/kaynak) ve not altındaki bağlantılar paneli ── */
  function libCard(b){const it=KB.items.get(b.lid);if(!it)return`<span class="pgb gone lib" data-act="libopen" tabindex="0" contenteditable="false"><span class="pgi">🗑️</span><span class="pgt"><b>Silinmiş kaynak</b><small>Bu bağlantıyı kaldırabilirsin</small></span></span>`;
    return`<a class="pgb lib" href="#lib/i/${it.id}" data-act="libopen" tabindex="0" contenteditable="false" draggable="false">${cover(it,'mini')}<span class="pgt"><b>${esc(it.title)}</b><small>${esc((T[it.type]||T.file).n)}${it.author?' · '+esc(it.author):it.site?' · '+esc(it.site):''}${it.progress>.01?` · %${Math.round(it.progress*100)} okundu`:''}</small></span><span class="pgn">Library</span><span class="pga">${sv('chev')}</span></a>`}
  function pagePanel(p){const box=q('#kbx');if(!box||!p)return;const nb=KB.neighbors(p.id),its=nb.filter(x=>KB.kindOf(x)==='item').map(x=>KB.items.get(x)),pgs=nb.filter(x=>KB.kindOf(x)==='page'&&x!==p.parent&&!(pages.get(x)?.parent===p.id)),
      tags=KB.tagsOf(p.id),sug=KB.related(p.id,6,{unlinked:true}),men=KB.mentions(p.id).filter(x=>!sug.some(s=>s.id===x)).slice(0,3);
    box.innerHTML=`<section class="kbx"><header><h3>${sv('graph')}Bağlantılar</h3><a class="lnk" href="#brain/${p.id}">Second Brain'de gör${sv('chev')}</a></header>
      <div class="kbx-tags">${tags.map(t=>`<span class="tg"><a href="#brain/t:${encodeURIComponent(t)}">#${esc(t)}</a><button data-kuntag="${esc(t)}" aria-label="Kaldır">${sv('x')}</button></span>`).join('')}<input data-ktag placeholder="+ etiket / konu" aria-label="Etiket ekle"></div>
      <div class="kbx-g"><div><p class="kick">Kaynaklar <em>${its.length}</em></p>${its.length?`<div class="kbx-items">${its.map(it=>`<a class="kbx-i" href="#lib/i/${it.id}">${cover(it,'mini')}<span><b>${esc(it.title)}</b><small>${esc((T[it.type]||T.file).n)}</small></span><button data-kunlink="${it.id}" title="Bağlantıyı kaldır" aria-label="Bağlantıyı kaldır">${sv('x')}</button></a>`).join('')}</div>`:'<p class="muted">Bu nota bağlı kaynak yok.</p>'}
          <button class="lnk" data-kadd>${sv('plus')}Kütüphaneden kaynak bağla</button></div>
        <div><p class="kick">Bağlı notlar <em>${pgs.length}</em></p>${pgs.length?pgs.map(id=>{const x=pages.get(id);return`<a class="kbx-p" href="#p/${id}"><span>${esc(iconOf(x))}</span><b>${esc(titleOf(x))}</b></a>`}).join(''):'<p class="muted">Henüz yok.</p>'}<button class="lnk" data-kpl>${sv('link')}Başka bir nota bağla</button></div></div>
      ${sug.length||men.length?`<div class="kbx-s"><p class="kick">${sv('spark')}Öneriler <em>onay vermeden hiçbir şey bağlanmaz</em></p>${[...sug.map(s=>({id:s.id,why:s.why})),...men.map(id=>({id,why:'metninde bu notun adı geçiyor'}))].map(s=>{const k=KB.kindOf(s.id),it=k==='item'?KB.items.get(s.id):null,pg=k==='page'?pages.get(s.id):null;
          return`<div class="kbx-r">${it?cover(it,'mini'):`<span class="pe">${esc(iconOf(pg))}</span>`}<span><b>${esc(it?it.title:titleOf(pg))}</b><small>${esc(s.why)}</small></span><button class="btn sm" data-klink="${s.id}">Bağla</button></div>`}).join('')}</div>`:''}</section>`}
  document.addEventListener('click',e=>{const box=e.target.closest('#kbx');if(!box||typeof P==='undefined'||!P)return;const t=e.target;
    const ul=t.closest('[data-kunlink]');if(ul){e.preventDefault();const id=ul.dataset.kunlink;if(KB.has(P.id,id))KB.unlink(P.id,id);else toast('Bu kaynak notun içinde gömülü — kartı nottan kaldırabilirsin');return}
    const ut=t.closest('[data-kuntag]');if(ut){KB.setTags(P.id,KB.tagsOf(P.id).filter(x=>x!==ut.dataset.kuntag));return}
    if(t.closest('[data-kadd]'))return itemPicker(t.closest('[data-kadd]'),id=>{KB.link(P.id,id);toast('Kaynak bağlandı')});
    if(t.closest('[data-kpl]'))return pagePicker(t.closest('[data-kpl]'),id=>{if(id!==P.id){KB.link(P.id,id);toast('Notlar bağlandı')}});
    const kl=t.closest('[data-klink]');if(kl){KB.link(P.id,kl.dataset.klink);toast('Bağlandı')}});
  document.addEventListener('keydown',e=>{if(!e.target.matches?.('[data-ktag]'))return;if(e.key==='Enter'||e.key===','){e.preventDefault();const v=e.target.value.trim();if(v&&P){KB.setTags(P.id,[...KB.tagsOf(P.id),...v.split(',')]);setTimeout(()=>q('[data-ktag]')?.focus(),60)}}});
  KB.on(()=>{if(typeof view!=='undefined'&&view==='page'&&typeof P!=='undefined'&&P&&!document.activeElement?.matches?.('[data-ktag]'))pagePanel(P)});

  /* ── film/dizi/oyun/anime kapakları: Wikipedia (CORS açık, anahtar istemez) ── */
  async function wiki(qs){let lang='en';if(qs.startsWith('tr:')){lang='tr';qs=qs.slice(3)}
    const u=`https://${lang}.wikipedia.org/w/api.php?action=query&format=json&origin=*&redirects=1&generator=search&gsrsearch=${encodeURIComponent(qs)}&gsrlimit=1&prop=pageimages|description|info&inprop=url&piprop=thumbnail&pithumbsize=500&pilicense=any`;
    const r=await fetch(u);if(!r.ok)throw new Error(r.status);const j=await r.json();const p=Object.values(j?.query?.pages||{})[0];
    return p?{cover:p.thumbnail?.source||'',url:p.fullurl||'',desc:p.description||''}:null}
  const tried=new Set(),Q=new Map();let covBusy=0;
  async function findCovers(list,o={}){list=list.filter(it=>o.force||(!it.cover&&!tried.has(it.id)));if(!list.length){if(o.say)toast('Kapak aranacak içerik yok');return}
    list.forEach(it=>tried.add(it.id));covBusy++;if(o.say)toast(list.length>1?`${list.length} kapak aranıyor…`:'Kapak aranıyor…');
    let ok=0,fail=0,i=0;const work=async()=>{while(i<list.length){const it=list[i++];
        const qs=Q.get(it.id)||Q.get(KB.low(it.type+'|'+it.title))||(it.title+' '+(SUF[it.type]||''));
        try{const w=await wiki(qs.trim());const cur=KB.items.get(it.id);if(!cur)continue;
          if(w&&w.cover){cur.cover=w.cover;if(!cur.url)cur.url=w.url;if(!cur.desc&&w.desc)cur.desc=w.desc[0].toLocaleUpperCase('tr')+w.desc.slice(1);KB.saveItem(cur,true);ok++;if(ok%8===0)KB.emit('items')}else fail++}catch{fail++}}};
    await Promise.all([work(),work(),work(),work()]);covBusy--;KB.emit('items');
    if(o.say||(list.length>3&&ok))toast(ok?`${ok} kapak bulundu${fail?` · ${fail} tanesi bulunamadı`:''}`:'Kapak bulunamadı — internet bağlantısını kontrol et')}
  // açılışta: kapaksız medya içeriklerine sessizce bak (oturum başına bir kez)
  function autoCovers(){if(covBusy)return;const l=all().filter(it=>MEDIA.includes(it.type)&&!it.cover&&!tried.has(it.id)).slice(0,60);if(l.length)findCovers(l)}

  /* ── içe aktarma: Notion'dan hazırlanan paket (import/*.json) ── */
  const PACK='import/eglence.json',srcKey=it=>'notion:'+it.type+':'+KB.low(it.title);let pack=null,packP=null;
  function loadPack(){if(packP)return packP;packP=fetch(PACK,{cache:'no-cache'}).then(r=>r.ok?r.json():null).then(j=>{pack=j;if(j)j.items.forEach(x=>Q.set(KB.low(x.type+'|'+x.title),x.q||''));
      if(view==='lib'&&st.sub==='home'&&q('#view>.lib'))draw();if(q('#view>.mc'))Media.refresh();return j}).catch(()=>null);return packP}
  const missing=()=>{if(!pack)return[];const have=new Set(every().map(i=>i.src||srcKey(i)));return pack.items.filter(x=>!have.has(srcKey(x)))};
  function impBanner(){loadPack();if(!pack||!KB.ready)return'';const m=missing();if(!m.length||lsg('lib:imp-hide',0)===pack.updated)return'';
    const by=t=>m.filter(x=>x.type===t).length;
    return`<section class="imp"><span class="imp-ic">${tIc('movie')}</span><div><b>Notion'daki eğlence listen hazır</b><small>${[['movie','film'],['series','dizi'],['game','oyun'],['anime','anime']].map(([t,n])=>by(t)?by(t)+' '+n:'').filter(Boolean).join(' · ')} — izlediklerin, izleyeceklerin ve yeni sezon beklediklerin koleksiyonlarıyla gelir, kapaklar otomatik bulunur.</small></div>
      <button class="btn pri" data-imp>İçe aktar</button><button class="btn" data-imp-no>Şimdi değil</button></section>`}
  async function doImport(){await loadPack();const m=missing();if(!m.length)return toast('Hepsi zaten kütüphanede');
    const cmap={};for(const[k,c]of Object.entries(pack.cols||{})){const ex=[...KB.cols.values()].find(x=>KB.low(x.name)===KB.low(c.name));cmap[k]=ex?ex.id:KB.addCol(c).id}
    const now=Date.now(),added=[];m.forEach((x,i)=>{const it=KB.addItem({type:x.type,title:x.title,status:x.status,score:x.score||'',note:x.note||'',cols:(x.cols||[]).map(k=>cmap[k]).filter(Boolean),src:srcKey(x),flag:x.flag||'',flagWhy:x.why||'',flagTo:x.to||'',tags:[KB.TYPES[x.type].n.toLocaleLowerCase('tr')]});added.push(it)});
    toast(`${added.length} içerik eklendi — posterler eşleşiyor`);loadPack().then(()=>Media.queue())}
  document.addEventListener('click',e=>{if(e.target.closest('[data-imp]')){e.preventDefault();doImport()}else if(e.target.closest('[data-imp-no]')){try{localStorage.setItem('lib:imp-hide',JSON.stringify(pack?.updated||1))}catch{}draw()}});

  function closeAll(){closeDetail(true);closeReader(true);q('.la-bg')?.remove();LA=null}
  return{render,soft,closeAll,findCovers,doImport,impBanner,loadPack,toastUndo,open,launch,addSheet,addFiles,libCard,pagePanel,itemPicker,pagePicker,cover,get st(){return st}}})();
