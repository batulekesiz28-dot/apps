/* Yemek — sevdiğin tatlılar ve yemekler (Workspace · Library'nin yanında üçüncü bölüm, #food).
   Örnek alınanlar: Paprika (bağlantıdan tarif çekme, porsiyon ölçekleme), Mela (sade Apple tasarımı, adım adım pişirme modu),
   NYT Cooking (büyük fotoğraflı kartlar, kaydet/denedim, kendi notun), Samsung Food (kategori ve koleksiyon).
   Tarif: Y_… {title,cat,img,time(dk),serves,ingredients[],steps[],tags[],fav,rating 0–5,tried,note,src,created,updated}
   Depo: yerel yemek:v1 · girişliyken Firestore hub/food/items (canlı). Fotoğraf 900px JPEG dataURL (belgeye sığar).
   Rotalar: #food · #food/c/<kategori> · #food/r/<id>. Bağlantıdan içe aktarma: sayfadaki schema.org Recipe (JSON-LD) → malzeme, adım, süre, porsiyon, foto;
   okunamazsa Library.meta ile başlık + foto. Pişirme modu: tam ekran, büyük yazı, adım adım (← →), ekran kararmasın (Wake Lock).
   Notlar global'lerine (esc, toast, go, IC, CLOUD…) sadece çalışırken dokunur. */
const Food=(()=>{
  const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
  const off=()=>document.documentElement.dataset.motion==='off'||matchMedia('(prefers-reduced-motion: reduce)').matches;
  const A=(el,kf,o)=>(!el||off())?{finished:Promise.resolve()}:el.animate(kf,o);
  const lg=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}},ls=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
  const CATS=[['tatli','Tatlılar','🍰'],['ana','Ana yemek','🍲'],['corba','Çorba','🥣'],['kahvalti','Kahvaltı','🍳'],['salata','Salata','🥗'],['atistirmalik','Atıştırmalık','🥨'],['hamur','Hamur işi','🥐'],['icecek','İçecek','🥤']];
  const catOf=k=>CATS.find(c=>c[0]===k)||['diger','Diğer','🍽'];
  const items=new Map();let mode='local',col=null,unsub=null,st={cat:'',q:'',filter:''};
  const nid=()=>'Y_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
  const norm=o=>({id:o.id||nid(),title:String(o.title||'').slice(0,140),cat:o.cat||'tatli',img:o.img||'',time:+o.time||0,serves:+o.serves||0,
    ingredients:(o.ingredients||[]).map(String).filter(x=>x.trim()).slice(0,80),steps:(o.steps||[]).map(String).filter(x=>x.trim()).slice(0,60),tags:(o.tags||[]).slice(0,12),
    fav:!!o.fav,rating:Math.max(0,Math.min(5,+o.rating||0)),tried:!!o.tried,note:String(o.note||'').slice(0,4000),src:o.src||'',created:o.created||Date.now(),updated:o.updated||Date.now()});
  const saveLocal=()=>ls('yemek:v1',[...items.values()]);
  function put(it){it.updated=Date.now();items.set(it.id,it);if(mode==='local')saveLocal();else col.doc(it.id).set(it).catch(e=>toast('Tarif kaydedilemedi: '+(e.code||e.message)))}
  function del(id){const it=items.get(id);items.delete(id);if(mode==='local')saveLocal();else col.doc(id).delete().catch(()=>{});return it}
  function startLocal(){mode='local';for(const o of lg('yemek:v1',[]))items.set(o.id,norm(o))}
  function startCloud(fs){mode='cloud';col=fs.collection('hub').doc('food').collection('items');
    // önce bu cihazda girişsiz eklenenleri buluta taşı
    const loc=lg('yemek:v1',[]);if(loc.length){loc.forEach(o=>col.doc(o.id).set(norm(o)).catch(()=>{}));ls('yemek:v1',[])}
    return new Promise(ok=>{let first=true;unsub=col.onSnapshot(s=>{s.docChanges().forEach(c=>{if(c.type==='removed')items.delete(c.doc.id);else items.set(c.doc.id,norm(c.doc.data()))});
      if(first){first=false;ok()}else if(view==='food')repaint()},()=>ok())})}
  const all=()=>[...items.values()].sort((a,b)=>(b.fav-a.fav)||b.updated-a.updated);
  const nrm=s=>String(s||'').toLocaleLowerCase('tr').normalize('NFKD').replace(/[̀-ͯ]/g,'').replace(/ı/g,'i');
  const match=(it,q)=>{const t=nrm([it.title,catOf(it.cat)[1],...it.ingredients,...it.tags,it.note].join(' '));return nrm(q).split(/\s+/).filter(Boolean).every(w=>t.includes(w))};
  const fmtT=m=>!m?'':m<60?m+' dk':Math.floor(m/60)+' sa'+(m%60?' '+m%60+' dk':'');
  const stars=(n,id)=>`<span class="yk-st" role="radiogroup" aria-label="Puan">${[1,2,3,4,5].map(i=>`<button data-frate="${id}:${i}" role="radio" aria-checked="${n===i}" aria-label="${i} yıldız" class="${i<=n?'on':''}">★</button>`).join('')}</span>`;
  const ph=c=>`<div class="yk-ph" aria-hidden="true">${catOf(c)[2]}</div>`;

  /* ── liste ── */
  function card(it){return `<button class="yk-c" data-fopen="${it.id}" aria-label="${esc(it.title)}"><div class="yk-im">${ph(it.cat)}${it.img?`<img src="${esc(it.img)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">`:''}${it.fav?'<i class="yk-fv" aria-hidden="true">♥</i>':''}</div>
    <b>${esc(it.title||'Adsız tarif')}</b><small>${[catOf(it.cat)[1],fmtT(it.time),it.rating?'★ '+it.rating:'',it.tried?'denedim':'denenecek'].filter(Boolean).join(' · ')}</small></button>`}
  function listHTML(){let L=all();if(st.cat)L=L.filter(x=>x.cat===st.cat);if(st.filter==='fav')L=L.filter(x=>x.fav);if(st.filter==='todo')L=L.filter(x=>!x.tried);if(st.q)L=L.filter(x=>match(x,st.q));
    const n=items.size,cnt=k=>[...items.values()].filter(x=>x.cat===k).length;
    return `<div class="fd"><header class="yk-h"><div><h1>Yemek</h1><p>${n?`${n} tarif`:'Sevdiğin tatlılar, yemekler, denemek istediklerin'}</p></div>
      <label class="yk-s"><svg class="li" viewBox="0 0 16 16"><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14"/></svg><input data-fq type="search" placeholder="Tarif ya da malzeme ara (ör. çikolata)" value="${esc(st.q)}" aria-label="Tariflerde ara"></label>
      <button class="yk-add" data-fnew><svg class="li" viewBox="0 0 16 16"><path d="M8 3v10M3 8h10"/></svg>Tarif ekle</button></header>
      <nav class="yk-cats" aria-label="Kategoriler"><button data-fcat="" class="${!st.cat&&!st.filter?'on':''}">Tümü</button><button data-ff="fav" class="${st.filter==='fav'?'on':''}">♥ Favoriler</button><button data-ff="todo" class="${st.filter==='todo'?'on':''}">Denenecekler</button>
        ${CATS.filter(c=>cnt(c[0])||c[0]==='tatli').map(c=>`<button data-fcat="${c[0]}" class="${st.cat===c[0]?'on':''}">${c[2]} ${c[1]}</button>`).join('')}</nav>
      ${L.length?`<div class="yk-g">${L.map(card).join('')}</div>`:emptyHTML()}</div>`}
  function emptyHTML(){if(items.size)return`<div class="yk-e"><p>Bu süzgeçte tarif yok.</p></div>`;
    return `<div class="yk-e"><div class="yk-ei" aria-hidden="true">🍰</div><h2>İlk tarifini ekle</h2><p>Sevdiğin tatlıyı ya da yemeği elle yaz, fotoğrafını ekle — ya da bir tarif sitesinin bağlantısını yapıştır, malzemeler ve adımlar kendiliğinden gelsin.</p><button class="yk-add" data-fnew>Tarif ekle</button></div>`}
  function render(parts=[]){const[a,b]=parts;if(a==='r'&&items.has(b))return renderDetail(b);if(a==='c')st.cat=b||'';try{setCrumb(IC.page||'','Yemek')}catch{}
    $('#view').innerHTML=listHTML();wireList()}
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
    if(t.closest('[data-fnew]')){sheet(null);return}const ed=t.closest('[data-fedit]');if(ed){sheet(ed.dataset.fedit);return}
    const c=t.closest('[data-fcat]');if(c){st.cat=c.dataset.fcat;st.filter='';go(st.cat?'#food/c/'+st.cat:'#food');repaint();return}
    const ff=t.closest('[data-ff]');if(ff){st.filter=st.filter===ff.dataset.ff?'':ff.dataset.ff;st.cat='';repaint();return}
    const fv=t.closest('[data-ffav]');if(fv){const x=items.get(fv.dataset.ffav);x.fav=!x.fav;put(x);renderDetail(x.id);return}
    const tr=t.closest('[data-ftried]');if(tr){const x=items.get(tr.dataset.ftried);x.tried=!x.tried;put(x);renderDetail(x.id);return}
    const rt=t.closest('[data-frate]');if(rt){const[id,n]=rt.dataset.frate.split(':');const x=items.get(id);x.rating=x.rating===+n?0:+n;put(x);$$('.yk-st button').forEach((b,i)=>{b.classList.toggle('on',i<x.rating);b.setAttribute('aria-checked',i+1===x.rating)});return}
    const sc=t.closest('[data-fsc]');if(sc){const id=location.hash.split('/')[2],x=items.get(id);if(!x)return;const nv=Math.max(1,Math.round(x.serves*scale)+(+sc.dataset.fsc));scale=nv/x.serves;$('[data-fserv]').textContent=nv;
      $$('[data-fil]').forEach(s=>{s.innerHTML=scaleLine(x.ingredients[+s.dataset.fil],scale)});return}
    const ck=t.closest('[data-fcook]');if(ck){cook(ck.dataset.fcook);return}},true);
  function dismiss(){$$('.yk-bg').forEach(x=>x.remove())}
  return{render,soft,startLocal,startCloud,dismiss,items:()=>all(),add:o=>{const n=norm(o);put(n);return n}}})();
