/* Yemek — sevdiğin tatlılar ve yemekler (Workspace · Library'nin yanında üçüncü bölüm, #food).
   Örnek alınanlar: Paprika (bağlantıdan tarif çekme, porsiyon ölçekleme), Mela (sade Apple tasarımı, adım adım pişirme modu),
   NYT Cooking (büyük fotoğraflı kartlar, kaydet/denedim, kendi notun), Samsung Food (kategori ve koleksiyon).
   Tarif: Y_… {title,cat,img,time(dk),serves,ingredients[],steps[],tags[],fav,rating 0–5,tried,note,src,created,updated}
   Depo: yerel yemek:v1 · girişliyken Firestore hub/food/items (canlı). Fotoğraf 900px JPEG dataURL (belgeye sığar).
   Rotalar: #food · #food/c/<kategori> · #food/r/<id>. Bağlantıdan içe aktarma: sayfadaki schema.org Recipe (JSON-LD) → malzeme, adım, süre, porsiyon, foto;
   okunamazsa Library.meta ile başlık + foto. Pişirme modu: tam ekran, büyük yazı, adım adım (← →), ekran kararmasın (Wake Lock).
   Notlar global'lerine (esc, toast, go, IC, CLOUD…) sadece çalışırken dokunur.
   İKİ TÜR: tarif (kind '') ve tarif olmayan lezzet/ürün (kind 'urun': atıştırmalık, çikolata, içecek, dondurma, fast food…).
   Ürünler Medya'nın film/dizi/oyun görünümüyle AYNI (koyu sahne, raflar, kapaklı kartlar, Denenecek/Denedim/Favori, 10 üzerinden puan;
   media.css'in .mc-shelf/.mc-row/.mc-card/.mp sınıfları, kök .ykw>.mc.yk-m — #view>.mc DEĞİL, Medya'nın yenilemesi karışmasın).
   Ürün kapakları + “Keşfet” rafları: Open Food Facts (ücretsiz, anahtarsız; önbellek yk:disc 24 sa). Rotalar #food/p · #food/p/c/<kat> · #food/p/s/<todo|done|fav>.
   Hazır tarifler: foodseed.js FOOD_SEED → “Hazır tarifler” rafı, tek dokunuşla eklenir; fotoğraf Türkçe Vikipedi (yk:wimg). */
const Food=(()=>{
  const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
  const off=()=>document.documentElement.dataset.motion==='off'||matchMedia('(prefers-reduced-motion: reduce)').matches;
  const A=(el,kf,o)=>(!el||off())?{finished:Promise.resolve()}:el.animate(kf,o);
  const lg=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}},ls=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
  const CATS=[['tatli','Tatlılar','🍰'],['ana','Ana yemek','🍲'],['corba','Çorba','🥣'],['kahvalti','Kahvaltı','🍳'],['salata','Salata','🥗'],['atistirmalik','Atıştırmalık','🥨'],['hamur','Hamur işi','🥐'],['icecek','İçecek','🥤']];
  const catOf=k=>CATS.find(c=>c[0]===k)||['diger','Diğer','🍽'];
  /* ürün kategorileri: [anahtar, ad, simge, Open Food Facts kategori etiketi] */
  const PCATS=[['cips','Cips & tuzlu','🥨','en:salty-snacks'],['cikolata','Çikolata & şekerleme','🍫','en:chocolates'],['biskuvi','Bisküvi & kek','🍪','en:biscuits-and-cakes'],['dondurma','Dondurma','🍦','en:ice-creams'],['icecek','İçecek','🥤','en:beverages'],['kahvalti','Kahvaltılık','🧀','en:breakfasts'],['fastfood','Fast food & mekân','🍔',''],['diger','Diğer','🍽','']];
  const pcatOf=k=>PCATS.find(c=>c[0]===k)||PCATS[PCATS.length-1];
  const isP=x=>x.kind==='urun';
  const items=new Map();let mode='local',col=null,unsub=null,st={cat:'',q:'',filter:''};
  const nid=()=>'Y_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
  const norm=o=>({id:o.id||nid(),title:String(o.title||'').slice(0,140),cat:o.cat||'tatli',img:o.img||'',time:+o.time||0,serves:+o.serves||0,
    ingredients:(o.ingredients||[]).map(String).filter(x=>x.trim()).slice(0,80),steps:(o.steps||[]).map(String).filter(x=>x.trim()).slice(0,60),tags:(o.tags||[]).slice(0,12),
    fav:!!o.fav,rating:Math.max(0,Math.min(5,+o.rating||0)),tried:!!o.tried,note:String(o.note||'').slice(0,4000),src:o.src||'',created:o.created||Date.now(),updated:o.updated||Date.now(),
    kind:o.kind==='urun'?'urun':'',seed:o.seed||'',brand:String(o.brand||'').slice(0,60),pcat:o.pcat||'',status:o.status==='done'?'done':'todo',score:Math.max(0,Math.min(10,+o.score||0)),
    code:String(o.code||''),kcal:+o.kcal||0,nutri:String(o.nutri||'').slice(0,1),where:String(o.where||'').slice(0,80),price:String(o.price||'').slice(0,20),own:!!o.own});
  const saveLocal=()=>ls('yemek:v1',[...items.values()]);
  function put(it){it.updated=Date.now();items.set(it.id,it);if(mode==='local')saveLocal();else col.doc(it.id).set(it).catch(e=>toast('Tarif kaydedilemedi: '+(e.code||e.message)))}
  function del(id){const it=items.get(id);items.delete(id);if(mode==='local')saveLocal();else col.doc(id).delete().catch(()=>{});return it}
  function startLocal(){mode='local';for(const o of lg('yemek:v1',[]))items.set(o.id,norm(o))}
  function startCloud(fs){mode='cloud';col=fs.collection('hub').doc('food').collection('items');
    // önce bu cihazda girişsiz eklenenleri buluta taşı
    const loc=lg('yemek:v1',[]);if(loc.length){loc.forEach(o=>col.doc(o.id).set(norm(o)).catch(()=>{}));ls('yemek:v1',[])}
    return new Promise(ok=>{let first=true;unsub=col.onSnapshot(s=>{s.docChanges().forEach(c=>{if(c.type==='removed')items.delete(c.doc.id);else items.set(c.doc.id,norm(c.doc.data()))});
      if(first){first=false;ok()}else if(view==='food')repaint()},()=>ok())})}
  const all=()=>[...items.values()].filter(x=>!isP(x)).sort((a,b)=>(b.fav-a.fav)||b.updated-a.updated);
  const prods=()=>[...items.values()].filter(isP).sort((a,b)=>b.updated-a.updated);
  const tabs=p=>`<nav class="yk-tabs" aria-label="Yemek bölümleri"><a href="#food" class="${p?'':'on'}"${p?'':' aria-current="page"'}>Tarifler</a><a href="#food/p" class="${p?'on':''}"${p?' aria-current="page"':''}>Atıştırmalık & lezzetler</a></nav>`;
  const nrm=s=>String(s||'').toLocaleLowerCase('tr').normalize('NFKD').replace(/[̀-ͯ]/g,'').replace(/ı/g,'i');
  const match=(it,q)=>{const t=nrm([it.title,catOf(it.cat)[1],...it.ingredients,...it.tags,it.note].join(' '));return nrm(q).split(/\s+/).filter(Boolean).every(w=>t.includes(w))};
  const fmtT=m=>!m?'':m<60?m+' dk':Math.floor(m/60)+' sa'+(m%60?' '+m%60+' dk':'');
  const stars=(n,id)=>`<span class="yk-st" role="radiogroup" aria-label="Puan">${[1,2,3,4,5].map(i=>`<button data-frate="${id}:${i}" role="radio" aria-checked="${n===i}" aria-label="${i} yıldız" class="${i<=n?'on':''}">★</button>`).join('')}</span>`;
  const ph=c=>`<div class="yk-ph" aria-hidden="true">${catOf(c)[2]}</div>`;

  /* ── liste ── */
  function card(it){return `<button class="yk-c" data-fopen="${it.id}" aria-label="${esc(it.title)}"><div class="yk-im">${ph(it.cat)}${it.img?`<img src="${esc(it.img)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">`:''}${it.fav?'<i class="yk-fv" aria-hidden="true">♥</i>':''}</div>
    <b>${esc(it.title||'Adsız tarif')}</b><small>${[catOf(it.cat)[1],fmtT(it.time),it.rating?'★ '+it.rating:'',it.tried?'denedim':'denenecek'].filter(Boolean).join(' · ')}</small></button>`}
  function listHTML(){let L=all();if(st.cat)L=L.filter(x=>x.cat===st.cat);if(st.filter==='fav')L=L.filter(x=>x.fav);if(st.filter==='todo')L=L.filter(x=>!x.tried);if(st.q)L=L.filter(x=>match(x,st.q));
    const n=all().length,cnt=k=>all().filter(x=>x.cat===k).length;
    return `<div class="fd">${tabs(0)}<header class="yk-h"><div><h1>Yemek</h1><p>${n?`${n} tarif`:'Sevdiğin tatlılar, yemekler, denemek istediklerin'}</p></div>
      <label class="yk-s"><svg class="li" viewBox="0 0 16 16"><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14"/></svg><input data-fq type="search" placeholder="Tarif ya da malzeme ara (ör. çikolata)" value="${esc(st.q)}" aria-label="Tariflerde ara"></label>
      <button class="yk-add" data-fnew><svg class="li" viewBox="0 0 16 16"><path d="M8 3v10M3 8h10"/></svg>Tarif ekle</button></header>
      <nav class="yk-cats" aria-label="Kategoriler"><button data-fcat="" class="${!st.cat&&!st.filter?'on':''}">Tümü</button><button data-ff="fav" class="${st.filter==='fav'?'on':''}">♥ Favoriler</button><button data-ff="todo" class="${st.filter==='todo'?'on':''}">Denenecekler</button>
        ${CATS.filter(c=>cnt(c[0])||c[0]==='tatli').map(c=>`<button data-fcat="${c[0]}" class="${st.cat===c[0]?'on':''}">${c[2]} ${c[1]}</button>`).join('')}</nav>
      ${L.length?`<div class="yk-g">${L.map(card).join('')}</div>`:emptyHTML()}${seedHTML()}</div>`}
  function emptyHTML(){if(all().length)return`<div class="yk-e"><p>Bu süzgeçte tarif yok.</p></div>`;
    if(SEED().length&&!st.q)return`<p class="yk-e1">Henüz tarifin yok. Aşağıdan hazır bir tarife dokun ya da <button class="yk-lnk" data-fnew>kendininkini yaz</button>.</p>`;
    return `<div class="yk-e"><div class="yk-ei" aria-hidden="true">🍰</div><h2>İlk tarifini ekle</h2><p>Sevdiğin tatlıyı ya da yemeği elle yaz, fotoğrafını ekle — ya da bir tarif sitesinin bağlantısını yapıştır, malzemeler ve adımlar kendiliğinden gelsin.</p><button class="yk-add" data-fnew>Tarif ekle</button></div>`}
  function render(parts=[]){const[a,b]=parts;if(a==='p')return pRender(parts.slice(1));document.getElementById('app')?.classList.remove('yk-dark');
    if(a==='r'&&items.has(b))return renderDetail(b);if(a==='c')st.cat=b||'';try{setCrumb(IC.page||'','Yemek')}catch{}
    $('#view').innerHTML=listHTML();wireList();wikiImgs()}
  /* ── hazır tarifler (foodseed.js) ── */
  const SEED=()=>window.FOOD_SEED||[];
  const seedIn=k=>[...items.values()].some(x=>x.seed===k);
  function seedHTML(){if(st.q||st.filter)return'';const W=lg('yk:wimg',{});const L=SEED().filter(x=>!seedIn(x.k)&&(!st.cat||x.cat===st.cat));if(!L.length)return'';
    return `<section class="yk-seed"><header><h2>Hazır tarifler</h2><p>Dokun, tariflerine eklensin — sonra istediğin gibi değiştir.</p></header><div class="yk-g">${L.map(x=>`<button class="yk-c" data-fseed="${x.k}" aria-label="${esc(x.title)} — tariflerime ekle"><div class="yk-im">${ph(x.cat)}${W[x.w]?`<img src="${esc(W[x.w])}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">`:''}<i class="yk-add1" aria-hidden="true">+ Ekle</i></div>
      <b>${esc(x.title)}</b><small>${[catOf(x.cat)[1],fmtT(x.time),x.serves?x.serves+' kişilik':''].filter(Boolean).join(' · ')}</small></button>`).join('')}</div></section>`}
  function addSeed(k){const x=SEED().find(y=>y.k===k);if(!x)return;const W=lg('yk:wimg',{});const o=norm({title:x.title,cat:x.cat,time:x.time,serves:x.serves,ingredients:x.ingredients,steps:x.steps,img:W[x.w]||'',seed:x.k});put(o);go('#food/r/'+o.id);try{toast(`“${x.title}” tariflerine eklendi`)}catch{}}
  /* fotoğraflar: Türkçe Vikipedi'nin serbest lisanslı ana görselleri (tek istek, önbellek yk:wimg) */
  let wikiBusy=false;
  async function wikiImgs(){const W=lg('yk:wimg',{}),need=SEED().map(x=>x.w).filter(t=>t&&!(t in W));if(!need.length||wikiBusy)return;wikiBusy=true;
    try{const r=await fetch(`https://tr.wikipedia.org/w/api.php?action=query&prop=pageimages&piprop=thumbnail&pithumbsize=640&redirects=1&format=json&origin=*&titles=${need.map(encodeURIComponent).join('|')}`);const j=await r.json();
      const back={};[...(j.query?.normalized||[]),...(j.query?.redirects||[])].forEach(m=>back[m.to]=m.from);
      for(const pg of Object.values(j.query?.pages||{})){let t=pg.title;while(!need.includes(t)&&back[t])t=back[t];if(need.includes(t))W[t]=pg.thumbnail?.source||''}
      need.forEach(t=>{if(!(t in W))W[t]=''});ls('yk:wimg',W);
      SEED().forEach(x=>{const u=W[x.w];if(!u)return;$$(`[data-fseed="${x.k}"] .yk-im`).forEach(im=>{if(!im.querySelector('img'))im.insertAdjacentHTML('beforeend',`<img src="${esc(u)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">`)})})}catch{}
    wikiBusy=false}
  function repaint(){const p=(location.hash.slice(1).split('/'));if(p[0]!=='food')return;render(p.slice(1))}
  function soft(parts){render(parts);return true}
  function wireList(){const q=$('[data-fq]');if(q)q.addEventListener('input',()=>{st.q=q.value;const g=$('.yk-g')||$('.yk-e');const tmp=document.createElement('div');tmp.innerHTML=listHTML();const ng=tmp.querySelector('.yk-g')||tmp.querySelector('.yk-e');g.replaceWith(ng)})}

  /* ── ayrıntı ── */
  // porsiyon ölçekleme: satır başındaki sayı (1, 1.5, 1/2, ½) çarpılır
  const FR={'½':.5,'¼':.25,'¾':.75,'⅓':1/3,'⅔':2/3};
  function scaleLine(s,k){if(k===1)return esc(s);return esc(s).replace(/^(\s*)(\d+(?:[.,]\d+)?(?:\s*\/\s*\d+)?|[½¼¾⅓⅔])/,(m,sp,n)=>{let v=FR[n]??(n.includes('/')?n.split('/').map(x=>+x.replace(',','.')).reduce((a,b)=>a/b):+n.replace(',','.'));v*=k;
    const r=Math.round(v*100)/100;return sp+'<b>'+String(r).replace('.',',')+'</b>'})}
  let scale=1;
  function renderDetail(id){const it=items.get(id);scale=1;try{setCrumb(IC.page||'','Yemek')}catch{}
    $('#view').innerHTML=`<div class="fd yk-d"><a class="yk-back" href="#food${st.cat?'/c/'+st.cat:''}"><svg class="li" viewBox="0 0 16 16"><path d="M10 3L5 8l5 5"/></svg>Tarifler</a>
      <div class="yk-hero">${ph(it.cat)}${it.img?`<img src="${esc(it.img)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">`:''}</div>
      <header class="yk-dh"><p class="yk-k">${catOf(it.cat)[2]} ${catOf(it.cat)[1]}</p><h1>${esc(it.title)}</h1>
        <div class="yk-meta">${it.time?`<span>⏱ ${fmtT(it.time)}</span>`:''}${it.serves?`<span class="yk-sv"><button data-fsc="-1" aria-label="Porsiyonu azalt">−</button><b data-fserv>${it.serves}</b> kişilik<button data-fsc="1" aria-label="Porsiyonu artır">+</button></span>`:''}${stars(it.rating,it.id)}</div>
        <div class="yk-acts"><button class="yk-b${it.fav?' on':''}" data-ffav="${it.id}" aria-pressed="${it.fav}">${it.fav?'♥ Favori':'♡ Favori'}</button><button class="yk-b${it.tried?' on':''}" data-ftried="${it.id}" aria-pressed="${it.tried}">${it.tried?'✓ Denedim':'Denenecek'}</button>
          ${it.steps.length?`<button class="yk-b pri" data-fcook="${it.id}">Pişirme modu</button>`:''}<button class="yk-b" data-fedit="${it.id}">Düzenle</button>${it.src?`<a class="yk-b" href="${esc(it.src)}" target="_blank" rel="noopener">Kaynak ↗</a>`:''}</div></header>
      <div class="yk-cols"><section><h2>Malzemeler</h2>${it.ingredients.length?`<ul class="yk-ing">${it.ingredients.map((x,i)=>`<li><label><input type="checkbox" data-fing="${i}"><span data-fil="${i}">${scaleLine(x,1)}</span></label></li>`).join('')}</ul>`:'<p class="yk-none">Malzeme yazılmamış.</p>'}</section>
        <section><h2>Yapılışı</h2>${it.steps.length?`<ol class="yk-steps">${it.steps.map(x=>`<li>${esc(x)}</li>`).join('')}</ol>`:'<p class="yk-none">Adım yazılmamış.</p>'}
          <h2>Notum</h2><div class="yk-note" contenteditable="true" data-fnote="${it.id}" data-ph="Kendi notun: daha az şeker, 5 dk fazla pişir…">${esc(it.note)}</div></section></div></div>`;
    $('[data-fnote]').addEventListener('blur',e=>{const x=items.get(id);if(x&&x.note!==e.target.innerText.trim()){x.note=e.target.innerText.trim();put(x)}});
    A($('.yk-d'),[{opacity:0,translate:'0 10px'},{opacity:1,translate:'0 0'}],{duration:380,easing:'cubic-bezier(.2,.8,.2,1)'})}

  /* ── ekle / düzenle ── */
  async function shrink(file,max=900){try{const bm=await createImageBitmap(file),k=Math.min(1,max/Math.max(bm.width,bm.height)),c=document.createElement('canvas');c.width=Math.round(bm.width*k);c.height=Math.round(bm.height*k);
    c.getContext('2d').drawImage(bm,0,0,c.width,c.height);return c.toDataURL('image/jpeg',.82)}catch{return''}}
  function sheet(id){const it=id?items.get(id):norm({});const bg=document.createElement('div');bg.className='yk-bg';
    bg.innerHTML=`<form class="yk-sh" role="dialog" aria-modal="true" aria-label="${id?'Tarifi düzenle':'Tarif ekle'}"><header><h2>${id?'Tarifi düzenle':'Yeni tarif'}</h2><button type="button" class="yk-x" data-fx aria-label="Kapat">×</button></header>
      <div class="yk-imp"><input name="url" type="url" placeholder="Tarif bağlantısını yapıştır (isteğe bağlı)" aria-label="Tarif bağlantısı" value="${esc(it.src)}"><button type="button" data-fimp>Çek</button></div><p class="yk-is" aria-live="polite"></p>
      <div class="yk-row"><label class="yk-pic"><input type="file" accept="image/*" hidden name="pic"><span class="yk-pv">${it.img?`<img src="${esc(it.img)}" alt="">`:'<i>📷</i><small>Fotoğraf</small>'}</span></label>
        <div class="yk-fl"><input name="title" required placeholder="Tarifin adı (ör. Fırın sütlaç)" value="${esc(it.title)}" aria-label="Tarifin adı">
          <div class="yk-cs">${CATS.map(c=>`<label><input type="radio" name="cat" value="${c[0]}"${it.cat===c[0]?' checked':''}><span>${c[2]} ${c[1]}</span></label>`).join('')}</div>
          <div class="yk-two"><label>Süre (dk)<input name="time" type="number" min="0" max="2000" value="${it.time||''}"></label><label>Kaç kişilik<input name="serves" type="number" min="0" max="100" value="${it.serves||''}"></label></div></div></div>
      <label class="yk-ta">Malzemeler <small>her satıra bir tane — “200 g un” gibi yazarsan porsiyona göre çarpılır</small><textarea name="ing" rows="6">${esc(it.ingredients.join('\n'))}</textarea></label>
      <label class="yk-ta">Yapılışı <small>her satıra bir adım</small><textarea name="steps" rows="6">${esc(it.steps.join('\n'))}</textarea></label>
      <footer>${id?'<button type="button" class="yk-del" data-fdel>Sil</button>':''}<button type="button" class="yk-b" data-fx>Vazgeç</button><button class="yk-b pri" type="submit">${id?'Kaydet':'Ekle'}</button></footer></form>`;
    document.body.appendChild(bg);const f=$('form',bg);let img=it.img;
    A(bg,[{opacity:0},{opacity:1}],{duration:200});A(f,[{opacity:0,scale:'.96',translate:'0 14px'},{opacity:1,scale:'1',translate:'0 0'}],{duration:380,easing:'cubic-bezier(.3,1.2,.5,1)'});
    const close=()=>{removeEventListener('keydown',esc1,true);A(bg,[{opacity:1},{opacity:0}],{duration:160}).finished.then(()=>bg.remove())};
    const esc1=e=>{if(e.key==='Escape'&&bg.isConnected){e.stopPropagation();close()}};addEventListener('keydown',esc1,true);
    f.pic.addEventListener('change',async()=>{const fl=f.pic.files[0];if(!fl)return;img=await shrink(fl);$('.yk-pv',bg).innerHTML=`<img src="${img}" alt="">`});
    f.addEventListener('paste',async e=>{const fl=[...(e.clipboardData?.files||[])].find(x=>/^image\//.test(x.type));if(fl){e.preventDefault();img=await shrink(fl);$('.yk-pv',bg).innerHTML=`<img src="${img}" alt="">`}});
    bg.addEventListener('click',async e=>{if(e.target===bg||e.target.closest('[data-fx]'))return close();
      if(e.target.closest('[data-fdel]')){const x=del(id);close();go('#food');try{toast(`“${x.title}” silindi`)}catch{}return}
      if(e.target.closest('[data-fimp]')){const u=f.url.value.trim();if(!u)return f.url.focus();const s=$('.yk-is',bg);s.textContent='Tarif okunuyor…';const r=await importUrl(u);
        if(!r){s.textContent='Bu sayfadan tarif okunamadı — başlığı ve malzemeleri elle yazabilirsin.';return}
        if(r.title&&!f.title.value)f.title.value=r.title;if(r.ingredients?.length&&!f.ing.value.trim())f.ing.value=r.ingredients.join('\n');if(r.steps?.length&&!f.steps.value.trim())f.steps.value=r.steps.join('\n');
        if(r.time&&!f.time.value)f.time.value=r.time;if(r.serves&&!f.serves.value)f.serves.value=r.serves;if(r.img&&!img){img=r.img;$('.yk-pv',bg).innerHTML=`<img src="${esc(img)}" alt="" referrerpolicy="no-referrer" onerror="this.outerHTML='<i>📷</i><small>Fotoğraf</small>'">`}
        if(r.cat)(f.querySelector(`[name=cat][value="${r.cat}"]`)||{}).checked=true;
        s.textContent=r.ingredients?.length?`✓ ${r.ingredients.length} malzeme, ${r.steps.length} adım geldi`:'✓ Başlık ve fotoğraf geldi (malzemeler sayfada bulunamadı)'}});
    f.addEventListener('submit',e=>{e.preventDefault();const o=norm({...it,title:f.title.value.trim(),cat:f.cat.value||'tatli',time:f.time.value,serves:f.serves.value,img,src:f.url.value.trim(),
      ingredients:f.ing.value.split('\n'),steps:f.steps.value.split('\n').map(x=>x.replace(/^\s*\d+[.)]\s*/,''))});put(o);close();go('#food/r/'+o.id);if(!id)try{toast('Tarif eklendi')}catch{}});
    setTimeout(()=>(id?f.title:f.url).focus(),60)}
  // bağlantıdan tarif: schema.org Recipe (JSON-LD) — yoksa sadece başlık + foto
  const isoMin=s=>{const m=String(s||'').match(/P(?:T)?(?:(\d+)H)?(?:(\d+)M)?/i);return m?(+m[1]||0)*60+(+m[2]||0):0};
  async function importUrl(u){if(!/^https?:/i.test(u))u='https://'+u;let html='';
    for(const via of [x=>x,x=>'https://api.allorigins.win/raw?url='+encodeURIComponent(x)]){try{const ac=new AbortController(),t=setTimeout(()=>ac.abort(),9000);const r=await fetch(via(u),{signal:ac.signal});clearTimeout(t);if(r.ok){html=await r.text();if(html.length>500)break}}catch{}}
    if(html){const doc=new DOMParser().parseFromString(html,'text/html');for(const s of doc.querySelectorAll('script[type="application/ld+json"]')){let j;try{j=JSON.parse(s.textContent)}catch{continue}
        const flat=x=>Array.isArray(x)?x.flatMap(flat):x&&x['@graph']?flat(x['@graph']):[x];const R=flat(j).find(o=>o&&[].concat(o['@type']).includes('Recipe'));if(!R)continue;
        const steps=[].concat(R.recipeInstructions||[]).flatMap(x=>typeof x==='string'?x.split(/\n+/):x.itemListElement?x.itemListElement.map(y=>y.text||y.name):[x.text||x.name]).map(x=>String(x||'').replace(/<[^>]+>/g,'').trim()).filter(Boolean);
        const img=[].concat(R.image||[]).map(x=>typeof x==='string'?x:x?.url).find(Boolean)||'';const cat=/tatl|pasta|kek|dessert|cake|cookie|kurabiye/i.test(String(R.recipeCategory||'')+R.name)?'tatli':/çorba|soup/i.test(R.name||'')?'corba':'';
        return{title:String(R.name||'').trim(),ingredients:[].concat(R.recipeIngredient||[]).map(x=>String(x).trim()),steps,time:isoMin(R.totalTime||R.cookTime),serves:parseInt([].concat(R.recipeYield||[])[0])||0,img,cat}}}
    try{const m=await Library.meta(u);if(m&&(m.title||m.cover))return{title:m.title,img:m.cover,ingredients:[],steps:[]}}catch{}return null}

  /* ── pişirme modu ── */
  let wl=null;
  async function cook(id){const it=items.get(id);let i=0;const bg=document.createElement('div');bg.className='yk-cook';bg.setAttribute('role','dialog');bg.setAttribute('aria-modal','true');bg.setAttribute('aria-label','Pişirme modu');document.body.appendChild(bg);
    try{wl=await navigator.wakeLock?.request('screen')}catch{}
    const paint=d=>{bg.innerHTML=`<header><b>${esc(it.title)}</b><span>${i+1} / ${it.steps.length}</span><button class="yk-x" data-cx aria-label="Kapat">×</button></header><div class="yk-ck-p" style="--p:${(i+1)/it.steps.length}"></div>
      <p class="yk-ck-s">${esc(it.steps[i])}</p><footer><button class="yk-b" data-cp ${i?'':'disabled'}>‹ Önceki</button><button class="yk-b pri" data-cn>${i===it.steps.length-1?'Afiyet olsun ✓':'Sonraki ›'}</button></footer>`;
      A($('.yk-ck-s',bg),[{opacity:0,translate:`${(d||0)*30}px 0`},{opacity:1,translate:'0 0'}],{duration:320,easing:'cubic-bezier(.2,.8,.2,1)'})};
    const close=()=>{wl?.release?.().catch(()=>{});wl=null;removeEventListener('keydown',key,true);bg.remove()};
    const key=e=>{if(e.key==='Escape'){e.stopPropagation();close()}else if(e.key==='ArrowRight'||e.key===' '){e.preventDefault();next()}else if(e.key==='ArrowLeft'&&i){i--;paint(-1)}};
    const next=()=>{if(i<it.steps.length-1){i++;paint(1)}else{const x=items.get(id);if(x&&!x.tried){x.tried=true;put(x)}close();renderDetail(id);try{toast('Afiyet olsun — “denedim” olarak işaretlendi')}catch{}}};
    bg.addEventListener('click',e=>{if(e.target.closest('[data-cx]'))close();else if(e.target.closest('[data-cn]'))next();else if(e.target.closest('[data-cp]')&&i){i--;paint(-1)}});
    addEventListener('keydown',key,true);paint();A(bg,[{opacity:0},{opacity:1}],{duration:250})}

  /* ── olaylar (#view içinde; Notlar'ın genel tıklama dinleyicisinden önce) ── */
  document.addEventListener('click',e=>{if(typeof view==='undefined'||view!=='food')return;const t=e.target;
    const o=t.closest('[data-fopen]');if(o){go('#food/r/'+o.dataset.fopen);return}
    const sd=t.closest('[data-fseed]');if(sd){addSeed(sd.dataset.fseed);return}
    if(pClick(e,t))return;
    if(t.closest('[data-fnew]')){sheet(null);return}const ed=t.closest('[data-fedit]');if(ed){sheet(ed.dataset.fedit);return}
    const c=t.closest('[data-fcat]');if(c){st.cat=c.dataset.fcat;st.filter='';go(st.cat?'#food/c/'+st.cat:'#food');repaint();return}
    const ff=t.closest('[data-ff]');if(ff){st.filter=st.filter===ff.dataset.ff?'':ff.dataset.ff;st.cat='';repaint();return}
    const fv=t.closest('[data-ffav]');if(fv){const x=items.get(fv.dataset.ffav);x.fav=!x.fav;put(x);renderDetail(x.id);return}
    const tr=t.closest('[data-ftried]');if(tr){const x=items.get(tr.dataset.ftried);x.tried=!x.tried;put(x);renderDetail(x.id);return}
    const rt=t.closest('[data-frate]');if(rt){const[id,n]=rt.dataset.frate.split(':');const x=items.get(id);x.rating=x.rating===+n?0:+n;put(x);$$('.yk-st button').forEach((b,i)=>{b.classList.toggle('on',i<x.rating);b.setAttribute('aria-checked',i+1===x.rating)});return}
    const sc=t.closest('[data-fsc]');if(sc){const id=location.hash.split('/')[2],x=items.get(id);if(!x)return;const nv=Math.max(1,Math.round(x.serves*scale)+(+sc.dataset.fsc));scale=nv/x.serves;$('[data-fserv]').textContent=nv;
      $$('[data-fil]').forEach(s=>{s.innerHTML=scaleLine(x.ingredients[+s.dataset.fil],scale)});return}
    const ck=t.closest('[data-fcook]');if(ck){cook(ck.dataset.fcook);return}},true);
  /* ══════════ Atıştırmalık & lezzetler (Medya'nın oyun/dizi görünümü) ══════════ */
  const pst={cat:'',s:'',q:''};
  const SV={l:'<svg class="mvi" viewBox="0 0 16 16"><path d="M10 3L5 8l5 5"/></svg>',r:'<svg class="mvi" viewBox="0 0 16 16"><path d="M6 3l5 5-5 5"/></svg>'};
  const pImg=src=>src?`<img src="${esc(src)}" alt="" loading="lazy" referrerpolicy="no-referrer" onload="this.classList.add('ok')" onerror="this.remove()">`:'';
  const cover=(o,big)=>`<div class="mp yk-pp${o.own?' own':''}${big?' big':''}"><div class="yk-pf" aria-hidden="true"><i>${pcatOf(o.pcat)[2]}</i><b>${esc(o.title)}</b></div>${pImg(o.img)}</div>`;
  function pCard(it){return `<div class="mc-card v-p" data-popen="${it.id}" tabindex="0" role="button" aria-label="${esc(it.title)}${it.score?`, ${it.score} puan`:''}"><div class="mc-art">${cover(it)}${it.score?`<span class="mc-mine">★ ${it.score}</span>`:''}${it.fav?'<span class="mc-fv yk-fh" aria-label="Favori">♥</span>':''}${it.status==='todo'?'<span class="yk-tg">Denenecek</span>':''}</div>
    <div class="mc-cap"><b>${esc(it.title)}</b><small>${esc([it.brand,pcatOf(it.pcat)[1]].filter(Boolean).join(' · '))}</small></div></div>`}
  const dCard=(d,i)=>`<div class="mc-card v-p" data-pdisc="${d.pcat}:${i}" tabindex="0" role="button" aria-label="${esc(d.title)} — önizle"><div class="mc-art">${cover(d)}</div><div class="mc-cap"><b>${esc(d.title)}</b><small>${esc(d.brand||pcatOf(d.pcat)[1])}</small></div></div>`;
  const shelf=(h,p,cards,all)=>`<section class="mc-shelf"><header><h2>${h}</h2>${p?`<p>${p}</p>`:''}${all?`<a class="mc-all" href="${all}">Tümünü gör${SV.r}</a>`:''}</header><div class="mc-rw"><button class="mc-arr l" data-row="-1" aria-label="Sola kaydır" tabindex="-1">${SV.l}</button><div class="mc-row v-p">${cards}</div><button class="mc-arr r" data-row="1" aria-label="Sağa kaydır" tabindex="-1">${SV.r}</button></div></section>`;
  const pmatch=(x,q)=>{const t=nrm([x.title,x.brand,pcatOf(x.pcat)[1],x.where,x.note].join(' '));return nrm(q).split(/\s+/).filter(Boolean).every(w=>t.includes(w))};
  function pHead(){const L=prods(),done=L.filter(x=>x.status==='done').length;
    const sub=[['','Tümü'],['todo','Denenecekler'],['done','Denediklerim'],['fav','Favoriler']];
    return `<header class="yk-mh">${tabs(1)}<div class="yk-mr"><div class="yk-mt"><h1>${pst.cat?esc(pcatOf(pst.cat)[1]):'Atıştırmalık & lezzetler'}</h1><span>${L.length?`${L.length} lezzet · ${done} denedin`:'Cips, çikolata, içecek, dondurma, fast food…'}</span></div>
      <label class="mc-s yk-ms"><svg class="mvi" viewBox="0 0 16 16"><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14"/></svg><input data-pq type="search" placeholder="Listende ara" value="${esc(pst.q)}" aria-label="Lezzetlerde ara"></label>
      <button class="mb sm yk-pnew" data-pnew><svg class="mvi" viewBox="0 0 16 16"><path d="M8 3v10M3 8h10"/></svg>Ekle</button></div>
      <nav class="yk-psub" aria-label="Süzgeç">${sub.map(([k,n])=>`<a href="#food/p${k?'/s/'+k:''}" class="${pst.s===k&&!pst.cat?'on':''}">${n}</a>`).join('')}<i aria-hidden="true"></i>${PCATS.filter(c=>c[0]!=='diger'||L.some(x=>x.pcat==='diger')).map(c=>`<a href="#food/p/c/${c[0]}" class="${pst.cat===c[0]?'on':''}">${c[2]} ${c[1]}</a>`).join('')}</nav></header>`}
  function pHome(){const L=prods(),fav=L.filter(x=>x.fav),todo=L.filter(x=>x.status==='todo'),done=L.filter(x=>x.status==='done').sort((a,b)=>b.score-a.score);let h='';
    if(!L.length)h+=`<div class="yk-mintro"><p class="mh-k">Lezzet listen</p><h2>Denediğin ve denemek istediğin her şey</h2><p>Market ürünleri, atıştırmalıklar, içecekler, dondurmalar, sevdiğin mekânın burgeri… Ekle, puanla, favorile — dizi ve oyun listen gibi.</p><button class="mb" data-pnew>İlkini ekle</button></div>`;
    if(fav.length)h+=shelf('Favorilerin','',fav.map(pCard).join(''),'#food/p/s/fav');
    if(todo.length)h+=shelf('Denenecekler',`${todo.length} lezzet`,todo.map(pCard).join(''),'#food/p/s/todo');
    if(done.length)h+=shelf('En sevdiklerin','puanına göre',done.map(pCard).join(''),'#food/p/s/done');
    for(const c of PCATS){const l=L.filter(x=>x.pcat===c[0]);if(l.length>=2)h+=shelf(`${c[2]} ${c[1]}`,'',l.map(pCard).join(''),'#food/p/c/'+c[0])}
    for(const c of PCATS)if(c[3])h+=`<div data-disc="${c[0]}"></div>`;
    return `<div class="mc-shelves">${h}</div>`}
  function pGrid(){let L=prods();if(pst.cat)L=L.filter(x=>x.pcat===pst.cat);if(pst.s==='fav')L=L.filter(x=>x.fav);else if(pst.s)L=L.filter(x=>x.status===pst.s);if(pst.q)L=L.filter(x=>pmatch(x,pst.q));
    if(pst.s==='done')L.sort((a,b)=>b.score-a.score);
    const empty=`<p class="yk-mnone">${pst.q?`“${esc(pst.q)}” listende yok.`:'Burada henüz bir şey yok.'} <button class="mb sm" data-pnew>Ekle</button></p>`;
    return `<div class="yk-pgw">${L.length?`<div class="mc-grid">${L.map(pCard).join('')}</div>`:empty}</div>${pst.cat&&pcatOf(pst.cat)[3]&&!pst.q?`<div class="mc-shelves"><div data-disc="${pst.cat}"></div></div>`:''}`}
  function pRender(parts){const[a,b]=parts;pst.cat=a==='c'?b||'':'';pst.s=a==='s'?b||'':'';
    document.getElementById('app')?.classList.add('yk-dark');try{setCrumb(IC.page||'','Atıştırmalık & lezzetler')}catch{}
    $('#view').innerHTML=`<div class="ykw"><div class="mc yk-m">${pHead()}<main class="yk-mm">${pst.cat||pst.s||pst.q?pGrid():pHome()}</main></div></div>`;
    pWire();discFill();discLoad()}
  function pMain(){const m=$('.yk-mm');if(!m)return;m.innerHTML=pst.cat||pst.s||pst.q?pGrid():pHome();pArrows();discFill();
    const L=prods(),sp=$('.yk-mt span');if(sp)sp.textContent=L.length?`${L.length} lezzet · ${L.filter(x=>x.status==='done').length} denedin`:'Cips, çikolata, içecek, dondurma, fast food…'}
  function pArrows(){$$('.yk-m .mc-row').forEach(r=>{const w=r.closest('.mc-rw'),u=()=>{w.classList.toggle('al',r.scrollLeft>8);w.classList.toggle('ar',r.scrollLeft+r.clientWidth<r.scrollWidth-8)};u();r.onscroll=u})}
  function pWire(){pArrows();const q=$('[data-pq]');if(q)q.addEventListener('input',()=>{pst.q=q.value.trim();pMain()});
    $('.yk-m')?.addEventListener('keydown',e=>{if(e.key!=='Enter'&&e.key!==' ')return;const c=e.target.closest?.('[data-popen],[data-pdisc]');if(c){e.preventDefault();c.click()}})}
  /* Keşfet: Türkiye'de en çok taranan ürünler (Open Food Facts) */
  const OFF='https://world.openfoodfacts.org/',OFF_F='code,product_name,product_name_tr,brands,image_front_url,image_front_small_url,nutriscore_grade,nutriments,categories_tags';
  const offPack=(p,pc)=>{const t=String(p.product_name_tr||p.product_name||'').trim();const tags=p.categories_tags||[];const g=pc||(PCATS.find(c=>c[3]&&tags.includes(c[3]))||[])[0]||'diger';
    return{code:String(p.code||''),title:t.slice(0,90),brand:String(p.brands||'').split(',')[0].trim().slice(0,60),img:p.image_front_url||p.image_front_small_url||'',kcal:Math.round(+(p.nutriments?.['energy-kcal_100g'])||0),nutri:/^[a-e]$/.test(p.nutriscore_grade||'')?p.nutriscore_grade:'',pcat:g}};
  let discBusy=false;
  async function discLoad(){if(discBusy)return;const C=lg('yk:disc',{}),need=PCATS.filter(c=>c[3]&&!(C[c[0]]&&Date.now()-C[c[0]].at<864e5));if(!need.length)return;discBusy=true;
    for(const c of need){try{const ac=new AbortController(),tm=setTimeout(()=>ac.abort(),12000);
        const r=await fetch(`${OFF}api/v2/search?categories_tags=${encodeURIComponent(c[3])}&countries_tags=en:turkey&sort_by=unique_scans_n&page_size=30&fields=${OFF_F}`,{signal:ac.signal});clearTimeout(tm);
        const j=await r.json(),seen=new Set();C[c[0]]={at:Date.now(),l:(j.products||[]).map(p=>offPack(p,c[0])).filter(d=>d.title&&d.img&&!seen.has(nrm(d.title))&&seen.add(nrm(d.title))).slice(0,24)}}
      catch{C[c[0]]={at:Date.now()-864e5+30*6e4,l:(C[c[0]]?.l)||[],err:1}} /* hata: 30 dk sonra yeniden dene, eldekini göster */
      ls('yk:disc',C);discFill()}
    discBusy=false}
  function discFill(){const C=lg('yk:disc',{}),mine=new Set(prods().map(x=>x.code).filter(Boolean)),mt=new Set(prods().map(x=>nrm(x.title)));
    $$('[data-disc]').forEach(el=>{const k=el.dataset.disc,c=pcatOf(k),d=C[k];
      if(!d){el.innerHTML=shelf(`Keşfet · ${c[1]}`,'yükleniyor…',Array.from({length:8},()=>'<div class="mc-card v-p yk-skc" aria-hidden="true"><div class="mc-art"><div class="mp"></div></div></div>').join(''));return}
      const l=d.l.map((x,i)=>[x,i]).filter(([x])=>!mine.has(x.code)&&!mt.has(nrm(x.title)));
      el.innerHTML=l.length?shelf(`Keşfet · ${c[2]} ${c[1]}`,'Türkiye\'de en çok bilinenler',l.map(([x,i])=>dCard(x,i)).join('')):''});pArrows()}
  const discGet=v=>{const[k,i]=v.split(':');return lg('yk:disc',{})[k]?.l?.[+i]};
  /* ayrıntı / önizleme (Medya'nın detay penceresi gibi koyu) */
  function pDetail(id,pre){const it=pre||items.get(id);if(!it)return;$$('.yk-pbg').forEach(x=>x.remove());const bg=document.createElement('div');bg.className='yk-pbg';
    const sc=n=>`<div class="yk-sc" role="radiogroup" aria-label="Puanın (10 üzerinden)">${Array.from({length:10},(_,i)=>`<button type="button" data-pscore="${i+1}" role="radio" aria-checked="${it.score===i+1}" class="${i<it.score?'on':''}">${i+1}</button>`).join('')}</div>`;
    const info=[it.nutri?`<span class="yk-ns n-${it.nutri}">Nutri-Score ${it.nutri.toUpperCase()}</span>`:'',it.kcal?`<span>${it.kcal} kcal / 100 g</span>`:''].filter(Boolean).join('');
    bg.innerHTML=`<div class="yk-pd" role="dialog" aria-modal="true" aria-label="${esc(it.title)}"><button class="yk-pdx" data-pdx aria-label="Kapat">×</button>
      <div class="yk-pdl">${cover(it,1)}</div><div class="yk-pdr"><p class="mh-k">${pcatOf(it.pcat)[2]} ${pcatOf(it.pcat)[1]}</p><h2>${esc(it.title)}</h2>${it.brand?`<p class="yk-pbr">${esc(it.brand)}</p>`:''}${info?`<div class="yk-pin">${info}</div>`:''}
      ${pre?`<div class="yk-pacts"><button class="mb yk-pri" data-padd="todo">Denenecek'e ekle</button><button class="mb" data-padd="done">Denedim</button></div>`
        :`<div class="yk-pacts"><div class="yk-seg" role="group" aria-label="Durum"><button data-pst="todo" aria-pressed="${it.status==='todo'}">Denenecek</button><button data-pst="done" aria-pressed="${it.status==='done'}">Denedim</button></div><button class="mb ic${it.fav?' on':''}" data-pfav aria-pressed="${it.fav}" aria-label="Favori" title="Favori">${it.fav?'♥':'♡'}</button></div>
        <h3>Puanın</h3>${sc(it.score)}
        <h3>Notun</h3><textarea data-pnote rows="3" placeholder="Tadı nasıldı? Bir daha alır mısın?">${esc(it.note)}</textarea>
        <div class="yk-p2"><label>Nereden<input data-pwhere value="${esc(it.where)}" placeholder="ör. Migros, Kadıköy'deki dükkân"></label><label>Fiyat<input data-pprice value="${esc(it.price)}" placeholder="ör. 45 ₺"></label></div>
        <footer><button class="yk-pdel" data-pdel>Listeden çıkar</button></footer>`}</div></div>`;
    document.body.appendChild(bg);const box=$('.yk-pd',bg);bg._id=id;bg._pre=pre;
    A(bg,[{opacity:0},{opacity:1}],{duration:200});A(box,[{opacity:0,scale:'.96',translate:'0 16px'},{opacity:1,scale:'1',translate:'0 0'}],{duration:380,easing:'cubic-bezier(.3,1.2,.5,1)'});
    const close=()=>{removeEventListener('keydown',k1,true);A(bg,[{opacity:1},{opacity:0}],{duration:160}).finished.then(()=>bg.remove())};bg._close=close;
    const k1=e=>{if(e.key==='Escape'&&bg.isConnected){e.stopPropagation();close()}};addEventListener('keydown',k1,true);
    const sv=(f,v)=>{const x=items.get(id);if(!x||x[f]===v)return;x[f]=v;put(x)};
    $('[data-pnote]',bg)?.addEventListener('change',e=>sv('note',e.target.value.trim()));$('[data-pwhere]',bg)?.addEventListener('change',e=>sv('where',e.target.value.trim()));$('[data-pprice]',bg)?.addEventListener('change',e=>sv('price',e.target.value.trim()));
    setTimeout(()=>$('[data-pdx]',bg)?.focus(),40)}
  function pClick(e,t){
    const r=t.closest('.yk-m [data-row]');if(r){const row=r.parentElement.querySelector('.mc-row');row.scrollBy({left:(+r.dataset.row)*row.clientWidth*.8,behavior:off()?'auto':'smooth'});return 1}
    const po=t.closest('[data-popen]');if(po){pDetail(po.dataset.popen);return 1}
    const pd=t.closest('[data-pdisc]');if(pd){const d=discGet(pd.dataset.pdisc);if(d)pDetail(null,{...norm({}),...d,kind:'urun'});return 1}
    if(t.closest('[data-pnew]')){pSheet();return 1}
    const bg=t.closest('.yk-pbg');if(!bg)return 0;
    if(t===bg||t.closest('[data-pdx]')){bg._close();return 1}
    const ad=t.closest('[data-padd]');if(ad){const o=norm({...bg._pre,kind:'urun',status:ad.dataset.padd});put(o);bg._close();pMain();try{toast(`“${o.title}” ${o.status==='done'?'denediklerine':'denenecekler listene'} eklendi`)}catch{}setTimeout(()=>pDetail(o.id),220);return 1}
    const x=items.get(bg._id);if(!x)return 1;
    const ps=t.closest('[data-pst]');if(ps){x.status=ps.dataset.pst;put(x);$$('[data-pst]',bg).forEach(b=>b.setAttribute('aria-pressed',b===ps));pMain();return 1}
    if(t.closest('[data-pfav]')){x.fav=!x.fav;put(x);const b=$('[data-pfav]',bg);b.classList.toggle('on',x.fav);b.setAttribute('aria-pressed',x.fav);b.textContent=x.fav?'♥':'♡';pMain();return 1}
    const s=t.closest('[data-pscore]');if(s){const n=+s.dataset.pscore;x.score=x.score===n?0:n;if(x.score&&x.status==='todo'){x.status='done';$$('[data-pst]',bg).forEach(b=>b.setAttribute('aria-pressed',b.dataset.pst==='done'))}put(x);
      $$('[data-pscore]',bg).forEach((b,i)=>{b.classList.toggle('on',i<x.score);b.setAttribute('aria-checked',i+1===x.score)});pMain();return 1}
    if(t.closest('[data-pdel]')){del(x.id);bg._close();pMain();try{toast(`“${x.title}” listeden çıkarıldı`)}catch{}return 1}
    return 1}
  /* ekle: Open Food Facts'te ara (fotoğraf, marka, kalori kendiliğinden) ya da kendi fotoğrafınla elle */
  function pSheet(){const bg=document.createElement('div');bg.className='yk-bg yk-dk';let pick=null,img='',own=false;
    bg.innerHTML=`<form class="yk-sh" role="dialog" aria-modal="true" aria-label="Lezzet ekle"><header><h2>Lezzet ekle</h2><button type="button" class="yk-x" data-fx aria-label="Kapat">×</button></header>
      <label class="yk-ta">Ara <small>ürün adını yaz — fotoğraf ve marka kendiliğinden gelir</small><input name="q" type="search" autocomplete="off" placeholder="ör. Ülker çikolatalı gofret, Ruffles, Magnum"></label>
      <div class="yk-or" aria-live="polite"></div>
      <div class="yk-row"><label class="yk-pic"><input type="file" accept="image/*" hidden name="pic"><span class="yk-pv"><i>📷</i><small>Fotoğraf</small></span></label>
        <div class="yk-fl"><input name="title" required placeholder="Adı (ör. Burger King Whopper)" aria-label="Adı"><input name="brand" placeholder="Marka / mekân (isteğe bağlı)" aria-label="Marka">
          <div class="yk-cs">${PCATS.map(c=>`<label><input type="radio" name="pcat" value="${c[0]}"${(pst.cat||'cips')===c[0]?' checked':''}><span>${c[2]} ${c[1]}</span></label>`).join('')}</div></div></div>
      <footer><span style="flex:1"></span><button type="button" class="yk-b" data-pa="todo">Denenecek</button><button type="button" class="yk-b pri" data-pa="done">Denedim</button></footer></form>`;
    document.body.appendChild(bg);const f=$('form',bg);
    A(bg,[{opacity:0},{opacity:1}],{duration:200});A(f,[{opacity:0,scale:'.96',translate:'0 14px'},{opacity:1,scale:'1',translate:'0 0'}],{duration:380,easing:'cubic-bezier(.3,1.2,.5,1)'});
    const close=()=>{removeEventListener('keydown',k1,true);A(bg,[{opacity:1},{opacity:0}],{duration:160}).finished.then(()=>bg.remove())};
    const k1=e=>{if(e.key==='Escape'&&bg.isConnected){e.stopPropagation();close()}};addEventListener('keydown',k1,true);
    const res=$('.yk-or',bg);let qT=0,qN=0,R=[];
    const setPv=u=>{$('.yk-pic',bg).classList.toggle('pk',!!u&&!own);$('.yk-pv',bg).innerHTML=u?`<img src="${esc(u)}" alt="" referrerpolicy="no-referrer">`:'<i>📷</i><small>Fotoğraf</small>'};
    f.q.addEventListener('input',()=>{clearTimeout(qT);const v=f.q.value.trim();if(v.length<2){res.innerHTML='';return}res.innerHTML='<p class="yk-is">Aranıyor…</p>';
      qT=setTimeout(async()=>{const my=++qN;try{const ac=new AbortController(),tm=setTimeout(()=>ac.abort(),12000);
          const r=await fetch(`${OFF}cgi/search.pl?search_terms=${encodeURIComponent(v)}&search_simple=1&action=process&json=1&page_size=12&fields=${OFF_F}`,{signal:ac.signal});clearTimeout(tm);const j=await r.json();if(my!==qN)return;
          R=(j.products||[]).map(p=>offPack(p)).filter(d=>d.title);
          res.innerHTML=R.length?R.map((d,i)=>`<button type="button" data-pr="${i}" class="${pick===d?'on':''}"><span class="yk-pp mini">${pImg(d.img)}</span><b>${esc(d.title)}</b><small>${esc(d.brand)}</small></button>`).join(''):'<p class="yk-is">Bulunamadı — aşağıya elle yaz, istersen fotoğraf ekle.</p>'}
        catch{if(my===qN)res.innerHTML='<p class="yk-is">Ürün veritabanına ulaşılamadı — elle ekleyebilirsin.</p>'}},550)});
    f.pic.addEventListener('change',async()=>{const fl=f.pic.files[0];if(!fl)return;img=await shrink(fl);own=true;setPv(img)});
    bg.addEventListener('click',e=>{if(e.target===bg||e.target.closest('[data-fx]'))return close();
      const pr=e.target.closest('[data-pr]');if(pr){pick=R[+pr.dataset.pr];$$('[data-pr]',bg).forEach(b=>b.classList.toggle('on',b===pr));f.title.value=pick.title;f.brand.value=pick.brand;if(!own){img=pick.img;setPv(img)}
        const c=f.querySelector(`[name=pcat][value="${pick.pcat}"]`);if(c)c.checked=true;return}
      const pa=e.target.closest('[data-pa]');if(pa){if(!f.title.value.trim()){f.title.focus();f.title.reportValidity?.();return}
        const o=norm({...(pick||{}),kind:'urun',title:f.title.value.trim(),brand:f.brand.value.trim(),pcat:f.pcat.value||'diger',img,own,status:pa.dataset.pa});put(o);close();
        if(view==='food'&&location.hash.startsWith('#food/p'))pMain();else go('#food/p');try{toast(`“${o.title}” eklendi`)}catch{}setTimeout(()=>pDetail(o.id),240)}});
    f.addEventListener('submit',e=>e.preventDefault());setTimeout(()=>f.q.focus(),60)}
  function dismiss(){$$('.yk-bg,.yk-pbg').forEach(x=>x.remove())}
  return{render,soft,startLocal,startCloud,dismiss,items:()=>all(),prods,add:o=>{const n=norm(o);put(n);return n}}})();
