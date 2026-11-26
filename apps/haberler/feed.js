/* ════════════════════════════════════════════════════════════
   Bugünkü Haberler — “Akış”: reels gibi tam ekran, bitmeyen, seni tanıyan haber akışı (Feed)
   Fikir kaynakları: TikTok “Senin için” (izleme süresi / hızlı geçme sinyali, keşif payı), Google Haberler “Senin için” (konu takibi,
   “bunun gibi daha az”), Artifact (okuma süresinden öğrenme), SmartNews (aynı kaynaktan arka arkaya gösterme).
   Hepsi cihazda: profil haberler:prof {w:{özellik:ağırlık},u,n,last} — özellikler c:<konu> s:<kaynak> k:<kelime>.
   Sinyaller: kartta kalma süresi (<1.5 sn geçti → −, 5–15 sn → +, uzun → ++), habere gitme +2.5, beğen +3, “daha az” −4, paylaş +1.5, arama +1.5.
   Sıralama: ilgi puanı + tazelik + küçük rastgelelik; çeşitlilik cezası (aynı konu/kaynak arka arkaya), her 5 kartta 1 keşif kartı.
   Sonsuz: aday azalınca sıradaki kaynak çekilir (ilgi kelimelerin → keşif konuları → kategoriler), gösterilenler 4 gün tekrar gelmez (haberler:fseen).
   Arama: Google Haberler araması aynı akışta. Profil bulutta eşitlenir (hub, shared/newswatch.js). ════════════════════════════════════════════════════════════ */
const Feed=(()=>{
  const NW=()=>window.NewsWatch;
  const lsg=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k));return v??d}catch{return d}},lss=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}}; // yükleme anında ana betiğe dokunmaz
  const PK='haberler:prof',FK='haberler:fseen';
  const DISC=[['spor','Spor'],['ekonomi borsa','Ekonomi'],['bilim araştırma','Bilim'],['dünya','Dünya'],['sağlık','Sağlık'],['sinema dizi','Sinema'],['uzay NASA','Uzay'],['otomobil','Otomobil'],['müzik','Müzik'],['kitap edebiyat','Kültür'],['yapay zeka','Yapay zekâ'],['iklim','İklim']];
  const COL={gundem:'#C2410C',oyun:'#7C3AED',abd:'#1D4ED8',tekno:'#0F766E',anime:'#DB2777',kesif:'#475569',ara:'#0369A1',ilgi:'#B45309'};
  const colOf=c=>COL[c]||COL[String(c).split(':')[0]]||'#475569';
  let el=null,pool=new Map(),shown=[],qi=0,loading=false,mode='feed',q='',io=null,cur=-1,t0=0,fetched={};
  const prof=()=>{const p=lsg(PK,null)||{w:{},u:0,n:0,last:Date.now()};const d=(Date.now()-(p.last||Date.now()))/864e5;
    if(d>1){const k=Math.pow(.97,d);for(const f in p.w)p.w[f]*=k;p.last=Date.now()}return p};
  let P=prof();addEventListener('storage',e=>{if(e.key===PK)P=prof()}); // başka cihazdan (bulut) gelen profil
  const saveP=()=>{P.u=Date.now();const e=Object.entries(P.w).filter(([,v])=>Math.abs(v)>.05).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1])).slice(0,600);P.w=Object.fromEntries(e);lss(PK,P)};
  const feats=i=>{const T=NW().toks(i.title).slice(0,8);return[['c:'+(i.cat||'kesif'),1],['s:'+(i.src||'').toLocaleLowerCase('tr'),.5],...T.map(t=>['k:'+t,.35])]};
  function learn(i,amt){if(!i)return;for(const[f,fw]of feats(i))P.w[f]=Math.max(-8,Math.min(12,(P.w[f]||0)+amt*fw));P.n=(P.n||0)+1;saveP()}
  const score=i=>{let s=0;for(const[f]of feats(i))s+=P.w[f]||0;const h=(Date.now()-(i.t||Date.now()))/36e5;return s+3*Math.exp(-h/18)+(Math.random()-.5)*.6};
  const fam=i=>feats(i).reduce((a,[f])=>a+(P.w[f]?1:0),0); // ne kadar tanıdık (keşif için düşük olan)
  const seen=()=>{const s=lsg(FK,{}),lim=Date.now()-4*864e5;for(const k in s)if(s[k]<lim)delete s[k];return s};
  function markSeen(i){const s=seen();s[NW().key(i)]=Date.now();lss(FK,s)}
  // neden bu kart: en çok katkı yapan özellik
  function why(i){if(i.why)return i.why;let best=null,bv=.6;for(const[f,fw]of feats(i)){const v=(P.w[f]||0)*fw;if(v>bv){bv=v;best=f}}
    if(!best)return'';const n=best.slice(2);return best[0]==='c'?`${catName(n)} okuyorsun`:best[0]==='s'?`${i.src} okuyorsun`:`“${n}” ilgini çekiyor`}
  const catName=c=>({gundem:'Gündem',oyun:'Oyun',abd:'ABD Siyaseti',tekno:'Teknoloji',anime:'Anime',kesif:'Keşif',ara:'Arama'}[c]||(c.startsWith('t:')?c.slice(2):c.startsWith('d:')?(DISC.find(d=>'d:'+d[0]===c)||['',c])[1]:c));
  /* ── kaynaklar (sonsuz) ── */
  function sources(){const kw=Object.entries(P.w).filter(([f,v])=>f.startsWith('k:')&&v>1.2).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([f])=>f.slice(2));
    const cs=Object.entries(P.w).filter(([f,v])=>f.startsWith('c:d:')&&v>.8).map(([f])=>f.slice(4));
    /* her arama iki kaynaktan: Google Haberler + Bing Haberler (Bing her habere fotoğraf verir; Google'ınki çoğu zaman yok) */
    const two=(id,q,d,cat,why)=>[{id,url:NW().GN(q+' when:'+d),cat,why},{id:'b'+id,url:BING(q),cat,why}];
    const S=[...kw.flatMap(k=>two('i:'+k,k,'2d','ilgi',`“${k}” ilgini çekiyor`)),
      ...cs.flatMap(d=>two('d:'+d,d,'2d','d:'+d)),
      ...(typeof TOP==='function'?TOP().flatMap(t=>two('t:'+t,t,'3d','t:'+t)):[]),
      ...(typeof CATS!=='undefined'?CATS.flatMap(c=>c.f.map((u,j)=>({id:c.id+j,url:u,cat:c.id}))):[]),
      ...DISC.flatMap(([d])=>two('d:'+d,d,'2d','d:'+d))]; // önce ilgilerin ve konuların, sonra keşif
    const m=new Map();S.forEach(x=>{if(!m.has(x.id))m.set(x.id,x)});return[...m.values()]}
  /* fotoğraf şart: fotoğrafsız haber havuza girmez; sayfasından fotoğrafı bulunursa (reader.js Pic.need) sonradan girer */
  function addItems(L,cat,whyTxt){const s=seen();let n=0;for(const i of L){const k=NW().key(i);if(s[k]||pool.has(k)||shown.some(x=>x.k===k))continue;if(i.t&&Date.now()-i.t>4*864e5)continue;
      if(!i.img){if(!i._np&&window.Pic)Pic.need(i,im=>{if(im){i.img=im;if(mode==='feed'&&addItems([i],cat,whyTxt))fill()}else i._np=1});continue}
      pool.set(k,{...i,k,cat:i.cat||cat,why:whyTxt||''});n++}return n}
  let stalled=0;
  async function more(){if(loading)return;loading=true;paintLoad(true);
    try{// önce önbellekteki kategori haberleri (Liste ile aynı), sonra sıradaki kaynak
      if(!shown.length&&typeof C!=='undefined')Object.entries(C).forEach(([id,v])=>addItems(v.items||[],id));
      const S=sources();let tries=0;
      while(pool.size<14&&tries<S.length){const x=S[qi++%S.length];tries++;if(fetched[x.id]&&Date.now()-fetched[x.id]<15*6e4)continue;fetched[x.id]=Date.now();
        try{addItems(await NW().feed(x.url),x.cat,x.why)}catch{}
        if(!shown.length&&pool.size>=3&&mode==='feed')fill()} /* ilk kartları beklemeden göster */
      if(!pool.size&&!shown.length)throw new Error('net')}
    catch{if(!shown.length)paintEmpty()}
    finally{loading=false;paintLoad(false);if(mode!=='feed')return;if(pool.size)fill();else stalled=Date.now()}} // boş döndüyse hemen yeniden deneme (eskiden more↔fill sonsuz döngüye giriyordu)
  // sıradaki kartları seç: ilgi + çeşitlilik + keşif
  function next(n){const out=[];for(let j=0;j<n&&pool.size;j++){const L=[...pool.values()],prev=[...shown,...out].slice(-2),explore=(shown.length+out.length)%5===4;
      let best=null,bs=-1e9;for(const i of L){let s=explore?-fam(i)*1.5+Math.random()*2+3*Math.exp(-((Date.now()-(i.t||Date.now()))/36e5)/18):score(i);
        if(prev.some(p=>p.cat===i.cat))s-=1.2;if(prev.some(p=>p.src===i.src))s-=.8;if(s>bs){bs=s;best=i}}
      if(explore&&best&&!best.why)best.why='Keşif · yeni bir konu';pool.delete(best.k);out.push(best)}return out}
  /* ── çizim ── */
  const esc2=s=>esc(s);
  const ICON={like:'<path d="M8 13.5S2.5 10.2 2.5 6.3A2.8 2.8 0 0 1 8 4.8a2.8 2.8 0 0 1 5.5 1.5c0 3.9-5.5 7.2-5.5 7.2z"/>',open:'<path d="M9.5 2.5h4v4M13.5 2.5L7.5 8.5M12 9.5v3.5H3V4h3.5"/>',less:'<circle cx="8" cy="8" r="5.5"/><path d="M4.2 11.8l7.6-7.6"/>',share:'<path d="M8 10V2.5M5 5.5l3-3 3 3M3.5 9v4h9V9"/>'};
  const sv=k=>`<svg viewBox="0 0 16 16" aria-hidden="true">${ICON[k]}</svg>`;
  function card(i,ix){const c=colOf(i.cat),w=why(i);
    return`<article class="rc" data-ix="${ix}" style="--c:${c}" aria-label="${esc2(i.title)}">${i.img?`<div class="rc-bg" style="background-image:url('${esc2(i.img)}')"></div><div class="rc-im" style="background-image:url('${esc2(i.img)}')"></div>`:'<div class="rc-bg plain"></div>'}
      <div class="rc-tx"><p class="rc-tg"><span>${esc2(catName(i.cat))}</span>${w?`<em>${esc2(w)}</em>`:''}</p><h2>${esc2(i.title)}</h2>${i.desc?`<p class="rc-d">${esc2(i.desc)}</p>`:''}<p class="rc-m"><b>${esc2(i.src)}</b> · ${ago(i.t)}</p></div>
      <div class="rc-rail"><button data-fa="like" aria-pressed="false" aria-label="Beğen" title="Beğen · L">${sv('like')}<small>Beğen</small></button><button data-fa="open" aria-label="Habere git" title="Habere git · Enter">${sv('open')}<small>Oku</small></button>
        <button data-fa="less" aria-label="Bunun gibi daha az" title="Daha az · N">${sv('less')}<small>Daha az</small></button><button data-fa="share" aria-label="Paylaş" title="Paylaş">${sv('share')}<small>Paylaş</small></button></div></article>`}
  function fill(){if(!el)return;const box=el.querySelector('.rl-s');const left=shown.length-Math.max(0,cur);if(left>5)return;
    const add=next(8);if(!add.length){if(!loading&&mode==='feed'&&Date.now()-stalled>30000)setTimeout(more,0);return}
    if(!shown.length)box.querySelector('.rl-e')?.remove();const start=shown.length;shown.push(...add);box.insertAdjacentHTML('beforeend',add.map((i,j)=>card(i,start+j)).join(''));
    box.querySelectorAll('.rc:not([data-o])').forEach(c=>{c.dataset.o=1;io.observe(c)});
    if(pool.size<10&&mode==='feed'&&!loading&&Date.now()-stalled>30000)setTimeout(more,0)}
  function paintLoad(on){el?.querySelector('.rl-ld')?.toggleAttribute('hidden',!on||shown.length>cur+2)}
  function paintEmpty(){if(mode==='search')return;const box=el?.querySelector('.rl-s');if(box&&!shown.length)box.innerHTML=`<div class="rl-e"><b>Haber alınamadı</b><span>İnternet bağlantını kontrol et.</span><button class="ib" data-fa="retry">Tekrar dene</button></div>`}
  /* ── kart değişimi: kalma süresinden öğren ── */
  function active(ix){if(ix===cur)return;const now=performance.now();
    if(cur>=0&&shown[cur]){const d=(now-t0)/1000,i=shown[cur];if(!i._l){const a=d<1.5?-.35:d<5?.2:d<15?.8:1.2;learn(i,a);i._l=1}markSeen(i)}
    cur=ix;t0=now;el.querySelectorAll('.rc.on').forEach(c=>c.classList.remove('on'));el.querySelector(`.rc[data-ix="${ix}"]`)?.classList.add('on');fill()}
  async function act(k,c){const ix=+c?.dataset.ix,i=shown[ix];
    if(k==='retry'){shown=[];el.querySelector('.rl-s').innerHTML='';cur=-1;return more()}
    if(!i)return;
    if(k==='open'){learn(i,2.5);i._l=1;READ.add(i.link);lss('haberler:read',[...READ].slice(-600));Reader.open(i);return} /* AppShell içinde okur (reader.js) */
    if(k==='like'){const b=c.querySelector('[data-fa=like]'),on=b.getAttribute('aria-pressed')!=='true';b.setAttribute('aria-pressed',on);learn(i,on?3:-3);i._l=1;
      if(on&&!matchMedia('(prefers-reduced-motion: reduce)').matches)b.animate([{scale:1},{scale:1.35},{scale:1}],{duration:420,easing:'cubic-bezier(.3,1.6,.5,1)'});return}
    if(k==='less'){learn(i,-4);i._l=1;tip(`Bunun gibi daha az: ${catName(i.cat)}${i.src?' · '+i.src:''}`);// sıradakini getir
      const sc=el.querySelector('.rl-s');sc.scrollTo({top:sc.clientHeight*(ix+1),behavior:'smooth'});
      // havuzdaki benzerleri geriye at
      for(const[kk,x]of pool)if(x.cat===i.cat&&x.src===i.src)pool.delete(kk);return}
    if(k==='share'){learn(i,1.5);i._l=1;try{if(navigator.share){await navigator.share({title:i.title,url:i.link});return}}catch{return}
      try{await navigator.clipboard.writeText(i.link);tip('Bağlantı kopyalandı')}catch{tip(i.link)}}}
  let tipT=0;function tip(m){const t=el.querySelector('.rl-tip');t.textContent=m;t.hidden=false;clearTimeout(tipT);tipT=setTimeout(()=>t.hidden=true,2600)}
  /* ── arama ── */
  /* Arama: tek kaynağa bağlı değil — Google Haberler (TR + EN), Bing Haberler ve GDELT (aracı servissiz, doğrudan) aynı anda;
     her kaynak geldikçe sonuçlar eklenir (en yeni üstte). Hepsi başarısızsa “bulunamadı” değil, bağlantı hatası söylenir. */
  const BING=(s,l='tr')=>`https://www.bing.com/news/search?q=${encodeURIComponent(s)}&format=rss&setlang=${l}&cc=${l==='tr'?'TR':'US'}`;
  async function gdelt(s){const u=`https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(/\s/.test(s)?'"'+s+'"':s)}&mode=artlist&format=json&maxrecords=60&timespan=30d&sort=datedesc`;
    let j;try{const r=await fetch(u,{signal:AbortSignal.timeout?AbortSignal.timeout(10000):undefined});j=await r.json()}catch{const r=await Cors.get(u,{rss:false});j=JSON.parse(r.xml)}
    const T=d=>{const m=String(d||'').match(/^(\d{4})(\d\d)(\d\d)T(\d\d)(\d\d)(\d\d)/);return m?Date.UTC(+m[1],m[2]-1,+m[3],+m[4],+m[5],+m[6]):0};
    return(j.articles||[]).filter(a=>a.title&&a.url).map(a=>({title:a.title,link:a.url,t:T(a.seendate),src:String(a.domain||'').replace(/^www\./,'').slice(0,40),desc:'',img:a.socialimage||''}))}
  const RO={1:'i',2:'ii',3:'iii',4:'iv',5:'v',6:'vi',7:'vii',8:'viii',9:'ix',10:'x',11:'xi',12:'xii'}; // “gta 6” ↔ “GTA VI”
  async function search(s){s=s.trim();if(!s)return;q=s;mode='search';const box=el.querySelector('.rl-s');box.innerHTML='';shown=[];pool.clear();cur=-1;
    el.querySelector('.rl-q').hidden=false;el.querySelector('.rl-q span').textContent=`“${s}”`;
    for(const t of NW().toks(s))P.w['k:'+t]=Math.min(12,(P.w['k:'+t]||0)+1.5);saveP();loading=true;paintLoad(true);
    const my=q,seen=new Map(),toks=NW().toks(s).map(t=>t.slice(0,5)),num=(s.match(/\d+/g)||[]),
      rel=i=>{const t=String(i.title).toLocaleLowerCase('tr')+' | '+String(i.title).toLowerCase(); /* “GTA VI” Türkçe kuralla “gta vı” olur; ikisine birden bak */
      return(!toks.length||toks.some(w=>t.includes(w)))&&(!num.length||num.some(n=>new RegExp(`(^|\\D)${n}(\\D|$)|\\b${RO[n]||'_'}\\b`).test(t))||toks.length>1)};
    const paint=()=>{if(mode!=='search'||q!==my)return;const L=[...seen.values()].sort((a,b)=>(b.t||0)-(a.t||0)).slice(0,80);if(!L.length)return;
      const top=box.scrollTop;shown=L;box.innerHTML=L.map(card).join('');box.querySelectorAll('.rc').forEach(c=>{c.dataset.o=1;io.observe(c)});box.scrollTop=top};
    const add=L=>{for(const i of L){if(!rel(i))continue;const kk=NW().key(i);if(seen.has(kk))continue;
        if(!i.img){if(!i._np)Pic.need(i,im=>{if(im&&!seen.has(kk)){seen.set(kk,{...i,img:im,k:kk,cat:'ara',why:''});paint()}});continue}
        seen.set(kk,{...i,k:kk,cat:'ara',why:''})}paint()};
    const src=[NW().feed(NW().GN(s+' when:30d')),NW().feed(NW().GN(s+' when:30d','en')),NW().feed(BING(s)),gdelt(s)];
    const res=await Promise.allSettled(src.map(p=>p.then(add)));if(mode!=='search'||q!==my)return;
    loading=false;paintLoad(false);if(seen.size)return;
    const allFail=res.every(r=>r.status==='rejected');
    box.innerHTML=`<div class="rl-e"><b>${allFail?'Haber kaynaklarına ulaşılamadı':`“${esc2(s)}” için haber bulunamadı`}</b><span>${allFail?'İnternet bağlantını kontrol et; birazdan tekrar dene.':'Başka kelimelerle dene (ör. İngilizce adıyla).'}</span><button class="rl-rt" data-rt>Tekrar dene</button></div>`;
    box.querySelector('[data-rt]').onclick=()=>search(s)}
  function endSearch(){mode='feed';q='';el.querySelector('.rl-q').hidden=true;const si=document.querySelector('#hbIn');if(si)si.value='';const box=el.querySelector('.rl-s');box.innerHTML='';shown=[];pool.clear();cur=-1;more()}
  /* ── kur ── */
  function mount(host){el=host;el.innerHTML=`<div class="rl-s" tabindex="-1" aria-label="Haber akışı"></div>
    <p class="rl-q" hidden><span></span><button type="button" data-fa="endq" aria-label="Aramayı kapat, akışa dön">Akışa dön ✕</button></p>
    <p class="rl-ld" hidden><i></i>Yükleniyor…</p><p class="rl-tip" role="status" hidden></p>`;
    const box=el.querySelector('.rl-s');
    io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting&&e.intersectionRatio>=.6)active(+e.target.dataset.ix)}),{root:box,threshold:[.6]});
    el.addEventListener('click',e=>{const b=e.target.closest('[data-fa]');if(!b){const c=e.target.closest('.rc h2');if(c)act('open',c.closest('.rc'));return}
      if(b.dataset.fa==='endq')return endSearch();act(b.dataset.fa,b.closest('.rc'))});
    more()} // klavye: sayfanın keydown dinleyicisi Feed.key'i çağırır (iki kez çalışmasın)
  function key(e){if(e.target.closest?.('input'))return;const box=el.querySelector('.rl-s'),c=el.querySelector('.rc.on');
    const go=d=>{e.preventDefault();box.scrollTo({top:box.clientHeight*Math.max(0,cur+d),behavior:'smooth'})};
    if(e.key==='ArrowDown'||e.key==='j'||e.key==='PageDown'||e.key===' ')go(1);else if(e.key==='ArrowUp'||e.key==='k'||e.key==='PageUp')go(-1);
    else if(e.key==='Enter'||e.key==='o'){e.preventDefault();act('open',c)}else if(e.key==='l'){act('like',c)}else if(e.key==='n'){act('less',c)}
    else if(e.key==='/'){e.preventDefault();document.querySelector('#hbIn')?.focus()}else if(e.key==='Escape'&&mode==='search')endSearch()}
  // Liste görünümünde habere tıklamak da öğretir
  function learnClick(i){learn(i,2)}
  return{mount,key,learnClick,search,endSearch,get searching(){return mode==='search'},focus:()=>el?.querySelector('.rl-s')?.focus({preventScroll:true}),get prof(){return P},reset(){P={w:{},u:Date.now(),n:0,last:Date.now()};saveP()}}})();
