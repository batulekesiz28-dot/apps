/* ════════════════════════════════════════════════════════════
   Notlar — ortak bilgi katmanı (Workspace · Library · Second Brain)
   Tek veri, üç bölüm. Hiçbir şey çoğaltılmaz; her şey kimlikle bağlanır:
     sayfa      → mevcut sayfa kimliği (Notlar'ın kendi verisi, dokunulmaz)
     kaynak     → 'L_…'  (kütüphane öğesi: PDF, kitap, makale, web, video…)
     koleksiyon → 'C_…'
     konu       → 't:<etiket>'  (etiketlerden türer; açıklaması KB.topics'te)
   İlişkiler: KB.links = [[a,b,zaman]] (yönsüz). Sayfa etiketleri KB.ptags (sayfa modeline dokunmamak için).
   Kayıt: yerelde localStorage 'kb:v1'; bulutta Firestore hub/kb (+ items, cols alt koleksiyonları).
   Dosyalar (PDF, görsel): bu cihazda IndexedDB 'notlar-kb' — bulutta sadece bilgi ve küçük kapak.
   ════════════════════════════════════════════════════════════ */
const KB=(()=>{
  const items=new Map(),cols=new Map(),subs=new Set();
  let links=[],topics={},ptags={},mode='local',ref=null,unsubs=[],ready=false;
  const LKEY='kb:v1',now=()=>Date.now();
  const nid=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
  const low=s=>String(s||'').toLocaleLowerCase('tr').trim();
  const say=m=>{try{toast(m)}catch{}};

  const TYPES={
    pdf:{n:'PDF',c:'#E5484D',ic:'<path d="M4 1.5h5.5L13 5v9.5H4z"/><path d="M9.5 1.5V5H13"/><path d="M6 9.5h5M6 12h3.5"/>'},
    book:{n:'Kitap',c:'#B45309',ic:'<path d="M3 2.5h6.5a2 2 0 0 1 2 2v9a1.5 1.5 0 0 0-1.5-1.5H3z"/><path d="M11.5 4.5h1.5v9.5h-3"/>'},
    article:{n:'Makale',c:'#3E63DD',ic:'<path d="M3 2.5h10v11H3z"/><path d="M5.5 5.5h5M5.5 8h5M5.5 10.5h3"/>'},
    web:{n:'Web sitesi',c:'#0D9488',ic:'<circle cx="8" cy="8" r="5.5"/><path d="M2.5 8h11M8 2.5c2 2 2 9 0 11M8 2.5c-2 2-2 9 0 11"/>'},
    youtube:{n:'Video',c:'#E11D48',ic:'<rect x="1.5" y="3.5" width="13" height="9" rx="2.5"/><path d="M6.8 6v4l3.4-2z" fill="currentColor"/>'},
    image:{n:'Görsel',c:'#8E4EC6',ic:'<rect x="2" y="2.5" width="12" height="11" rx="2"/><circle cx="6" cy="6.5" r="1.3"/><path d="M2.5 12l3.5-3.5 2.5 2.5 2-2 3 3"/>'},
    research:{n:'Araştırma',c:'#0091FF',ic:'<circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14M5 7h4M7 5v4"/>'},
    course:{n:'Eğitim',c:'#30A46C',ic:'<path d="M1.5 6L8 3l6.5 3L8 9z"/><path d="M4.5 7.5v3.5c1 1 2.2 1.5 3.5 1.5s2.5-.5 3.5-1.5V7.5"/>'},
    doc:{n:'Belge',c:'#6E56CF',ic:'<path d="M4 1.5h8v13H4z"/><path d="M6 5h4M6 7.5h4M6 10h2.5"/>'},
    movie:{n:'Film',c:'#D97706',ic:'<rect x="2" y="3" width="12" height="10" rx="1.5"/><path d="M5 3v10M11 3v10M2 6h3M2 10h3M11 6h3M11 10h3"/>'},
    series:{n:'Dizi',c:'#2563EB',ic:'<rect x="1.5" y="3.5" width="13" height="8.5" rx="1.5"/><path d="M5.5 14.5h5M6 1.5l2 2 2-2"/>'},
    game:{n:'Oyun',c:'#7C3AED',ic:'<path d="M4.5 5h7a3 3 0 0 1 3 3v1.5a2 2 0 0 1-3.6 1.2L10 9.5H6l-.9 1.2A2 2 0 0 1 1.5 9.5V8a3 3 0 0 1 3-3z"/><path d="M5 6.8v2M4 7.8h2"/><circle cx="10.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="11.8" cy="8.6" r=".5" fill="currentColor"/>'},
    anime:{n:'Anime',c:'#DB2777',ic:'<path d="M8 2l1.6 3.4 3.7.5-2.7 2.6.7 3.7L8 10.4l-3.3 1.8.7-3.7L2.7 5.9l3.7-.5z"/>'},
    file:{n:'Dosya',c:'#71717A',ic:'<path d="M3.5 1.5h6l3 3v10h-9z"/><path d="M9.5 1.5v3h3"/>'}};

  /* ── normalizasyon: Firestore 'undefined' kabul etmez, şekil hep aynı ── */
  const tagList=a=>[...new Set((Array.isArray(a)?a:[]).map(low).map(t=>t.replace(/^#/,'')).filter(Boolean))].slice(0,30);
  function normItem(o){return{id:String(o.id),type:TYPES[o.type]?o.type:'file',title:String(o.title||'Adsız'),desc:String(o.desc||''),url:String(o.url||''),
    cover:String(o.cover||''),favicon:String(o.favicon||''),site:String(o.site||''),author:String(o.author||''),year:String(o.year||''),
    tags:tagList(o.tags),cols:[...new Set(Array.isArray(o.cols)?o.cols:[])],fav:!!o.fav,added:+o.added||now(),updated:+o.updated||now(),opened:+o.opened||0,
    progress:Math.max(0,Math.min(1,+o.progress||0)),page:+o.page||0,pages:+o.pages||0,note:String(o.note||''),summary:String(o.summary||''),
    file:o.file&&typeof o.file==='object'?{name:String(o.file.name||''),size:+o.file.size||0,mime:String(o.file.mime||'')}:null,yt:String(o.yt||''),
    color:String(o.color||''),dur:String(o.dur||''),status:['todo','doing','done','played'].includes(o.status)?o.status:'',score:String(o.score||''),src:String(o.src||''),
    genres:(Array.isArray(o.genres)?o.genres:[]).map(String).slice(0,6),platforms:(Array.isArray(o.platforms)?o.platforms:[]).map(String).slice(0,8),rating:Math.max(0,Math.min(10,+o.rating||0)),
    season:Math.max(0,+o.season||0),ep:Math.max(0,+o.ep||0),eps:Math.max(0,+o.eps||0),cover2:String(o.cover2||''),backdrop:String(o.backdrop||''),wide:String(o.wide||''),
    mid:String(o.mid||''),imdb:String(o.imdb||''),steam:String(o.steam||''),mal:String(o.mal||''),wiki:String(o.wiki||''),
    match:['ok','unsure','none','manual'].includes(o.match)?o.match:'',metaAt:+o.metaAt||0,flag:String(o.flag||''),flagWhy:String(o.flagWhy||''),flagTo:String(o.flagTo||''),reviewed:!!o.reviewed}}
  function normCol(o){return{id:String(o.id),name:String(o.name||'Yeni koleksiyon'),desc:String(o.desc||''),color:String(o.color||'#6E56CF'),emoji:String(o.emoji||''),
    cover:String(o.cover||''),order:+o.order||0,added:+o.added||now(),updated:+o.updated||now()}}

  /* ── kayıt ── */
  function snapshot(){return{items:[...items.values()],cols:[...cols.values()],links,topics,ptags}}
  function localSave(){try{localStorage.setItem(LKEY,JSON.stringify(snapshot()));return true}catch{say('Kütüphane kaydedilemedi — tarayıcı depolaması dolu olabilir');return false}}
  let gT=0;
  function saveGraph(){if(mode==='local')return localSave();clearTimeout(gT);gT=setTimeout(()=>ref.doc.set({links,topics,ptags,updated:now()},{merge:true}).catch(e=>say('Bağlantılar kaydedilemedi: '+(e.code||e.message))),350)}
  function putItem(it){if(mode==='local')return localSave();return ref.items.doc(it.id).set(it).catch(e=>say('Kaydedilemedi: '+(e.code||e.message)))}
  function delItemDoc(id){if(mode==='local')return localSave();return ref.items.doc(id).delete().catch(e=>say('Silinemedi: '+(e.code||e.message)))}
  function putCol(c){if(mode==='local')return localSave();return ref.cols.doc(c.id).set(c).catch(e=>say('Kaydedilemedi: '+(e.code||e.message)))}
  function delColDoc(id){if(mode==='local')return localSave();return ref.cols.doc(id).delete().catch(()=>{})}

  function emit(what){ver++;for(const f of subs)try{f(what)}catch(e){console.error(e)}}
  let ver=0,emT=0;const emitSoon=w=>{clearTimeout(emT);emT=setTimeout(()=>emit(w),40)};

  function startLocal(){mode='local';try{const d=JSON.parse(localStorage.getItem(LKEY)||'null');if(d){(d.items||[]).forEach(o=>{const it=normItem(o);items.set(it.id,it)});
      (d.cols||[]).forEach(o=>{const c=normCol(o);cols.set(c.id,c)});links=Array.isArray(d.links)?d.links:[];topics=d.topics||{};ptags=d.ptags||{}}}catch{}
    ready=true;emit('all')}
  function startCloud(fs){mode='cloud';const doc=fs.collection('hub').doc('kb');ref={doc,items:doc.collection('items'),cols:doc.collection('cols')};
    return new Promise(res=>{let left=3;const done=()=>{if(--left===0){ready=true;res();emit('all')}};const fail=e=>{say('Kütüphane senkron hatası: '+(e.code||e.message));done()};
      const watch=(coll,map,norm,tag)=>{let first=true;unsubs.push(coll.onSnapshot(s=>{s.docChanges().forEach(ch=>{if(ch.doc.metadata.hasPendingWrites&&!first)return;
          if(ch.type==='removed')map.delete(ch.doc.id);else map.set(ch.doc.id,norm({...ch.doc.data(),id:ch.doc.id}))});if(first){first=false;done()}else emitSoon(tag)},e=>{if(first){first=false;fail(e)}}))};
      watch(ref.items,items,normItem,'items');watch(ref.cols,cols,normCol,'cols');
      let first=true;unsubs.push(ref.doc.onSnapshot(s=>{if(s.metadata.hasPendingWrites&&!first)return;const d=s.data()||{};links=Array.isArray(d.links)?d.links:[];topics=d.topics||{};ptags=d.ptags||{};
        if(first){first=false;done()}else emitSoon('links')},e=>{if(first){first=false;fail(e)}}));
      setTimeout(()=>{if(!ready){ready=true;res();emit('all')}},8000)})}
  function stop(){unsubs.forEach(u=>{try{u()}catch{}});unsubs=[];items.clear();cols.clear();links=[];topics={};ptags={};ready=false}

  /* ── dosyalar: bu cihazda (IndexedDB) ── */
  const IDB={p:null,open(){return this.p||(this.p=new Promise((ok,no)=>{const r=indexedDB.open('notlar-kb',1);r.onupgradeneeded=()=>r.result.createObjectStore('files');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)}))},
    async tx(mode,fn){const db=await this.open();return new Promise((ok,no)=>{const t=db.transaction('files',mode),st=t.objectStore('files'),r=fn(st);t.oncomplete=()=>ok(r&&'result'in r?r.result:undefined);t.onerror=()=>no(t.error)})},
    put(id,blob){return this.tx('readwrite',s=>s.put(blob,id))},get(id){return this.tx('readonly',s=>s.get(id))},del(id){return this.tx('readwrite',s=>s.delete(id))}};

  /* ── öğeler ── */
  function addItem(o){const it=normItem({...o,id:o.id||nid('L_'),added:now(),updated:now()});items.set(it.id,it);putItem(it);emit('items');return it}
  function saveItem(it,quiet){it.updated=now();const n=normItem(it);items.set(n.id,n);Object.assign(it,n);putItem(n);if(!quiet)emit('items');return n}
  function delItem(id){const it=items.get(id);if(!it)return null;items.delete(id);delItemDoc(id);const gone=links.filter(l=>l[0]===id||l[1]===id);links=links.filter(l=>!(l[0]===id||l[1]===id));saveGraph();IDB.del(id).catch(()=>{});emit('items');return{it,gone}}
  function restoreItem(snap){if(!snap)return;items.set(snap.it.id,snap.it);putItem(snap.it);links.push(...snap.gone);saveGraph();emit('items')}
  function addCol(o){const c=normCol({...o,id:nid('C_'),order:cols.size,added:now()});cols.set(c.id,c);putCol(c);emit('cols');return c}
  function saveCol(c){c.updated=now();const n=normCol(c);cols.set(n.id,n);putCol(n);emit('cols');return n}
  function delCol(id){cols.delete(id);delColDoc(id);for(const it of items.values())if(it.cols.includes(id)){it.cols=it.cols.filter(x=>x!==id);putItem(it)}links=links.filter(l=>l[0]!==id&&l[1]!==id);saveGraph();emit('cols')}
  function toggleCol(it,cid){it.cols=it.cols.includes(cid)?it.cols.filter(x=>x!==cid):[...it.cols,cid];saveItem(it)}

  /* ── ilişkiler ── */
  const has=(a,b)=>links.some(l=>(l[0]===a&&l[1]===b)||(l[0]===b&&l[1]===a));
  function link(a,b){if(!a||!b||a===b||has(a,b))return false;links.push([a,b,now()]);saveGraph();emit('links');return true}
  function unlink(a,b){const n=links.length;links=links.filter(l=>!((l[0]===a&&l[1]===b)||(l[0]===b&&l[1]===a)));if(links.length!==n){saveGraph();emit('links')}}
  const linked=id=>links.filter(l=>l[0]===id||l[1]===id).map(l=>l[0]===id?l[1]:l[0]);
  const kindOf=id=>!id?'':id.startsWith('L_')?'item':id.startsWith('C_')?'col':id.startsWith('t:')?'topic':(typeof pages!=='undefined'&&pages.has(id))?'page':'';
  /* bir sayfanın gövdesindeki referanslar: alt sayfa kartları ve /kaynak blokları */
  function pageRefs(pid){const p=pages.get(pid);if(!p)return[];const out=[];for(const b of p.blocks){if(b.t==='page'&&b.pid)out.push(b.pid);else if(b.t==='lib'&&b.lid)out.push(b.lid)}return out}
  /* bir öğeye her yoldan bağlı olanlar (açık bağ + gövde referansı + alt/üst sayfa + koleksiyon + konu) */
  function neighbors(id){const s=new Set(linked(id)),k=kindOf(id);
    if(k==='page'){pageRefs(id).forEach(x=>s.add(x));for(const p of pages.values()){if(pageRefs(p.id).includes(id))s.add(p.id)}const p=pages.get(id);if(p?.parent)s.add(p.parent);(ptags[id]||[]).forEach(t=>s.add('t:'+t))}
    else if(k==='item'){const it=items.get(id);it?.cols.forEach(c=>s.add(c));it?.tags.forEach(t=>s.add('t:'+t));for(const p of pages.values())if(pageRefs(p.id).includes(id))s.add(p.id)}
    else if(k==='col'){for(const it of items.values())if(it.cols.includes(id))s.add(it.id)}
    else if(k==='topic'){const t=id.slice(2);for(const it of items.values())if(it.tags.includes(t))s.add(it.id);for(const[pid,ts]of Object.entries(ptags))if(ts.includes(t)&&pages.has(pid))s.add(pid)}
    s.delete(id);return[...s].filter(x=>kindOf(x))}

  /* ── etiketler / konular ── */
  const tagsOf=id=>kindOf(id)==='item'?(items.get(id)?.tags||[]):(ptags[id]||[]);
  function setTags(id,tags){tags=tagList(tags);if(kindOf(id)==='item'){const it=items.get(id);if(it){it.tags=tags;saveItem(it)}}else{if(tags.length)ptags[id]=tags;else delete ptags[id];saveGraph();emit('links')}}
  function allTags(){const m=new Map();for(const it of items.values())it.tags.forEach(t=>m.set(t,(m.get(t)||0)+1));for(const[pid,ts]of Object.entries(ptags))if(pages.has(pid))ts.forEach(t=>m.set(t,(m.get(t)||0)+1));return[...m].sort((a,b)=>b[1]-a[1])}
  function setTopic(tag,o){tag=low(tag);topics[tag]={...(topics[tag]||{}),...o};saveGraph();emit('links')}

  /* ── metin, anahtar kelime, ilişkili içerik (yerel, yapay zekâsız) ── */
  const STOP=new Set('ve veya ile ama için bir bu şu o da de ki mi mı mu mü çok daha en gibi kadar olan olarak ise ya hem değil var yok her ne nasıl neden ben sen biz siz onlar bunu şunu onu ile ilgili ayrıca sonra önce şimdi ancak yani the and for with that this from are was were you your our their have has had not but all can will into about what when which who how why its also more most than then them they there these those such only over under very just like using use used new'.split(' '));
  const tokens=t=>low(t).replace(/[^\p{L}\p{N}\s]/gu,' ').split(/\s+/).filter(w=>w.length>2&&!STOP.has(w)&&!/^\d+$/.test(w));
  function textOf(id){const k=kindOf(id);if(k==='page'){const p=pages.get(id);return p?(p.title||'')+' '+p.blocks.map(b=>plain(b.h||'')+' '+plain(b.v||'')).join(' '):''}
    if(k==='item'){const it=items.get(id);return it?[it.title,it.desc,it.note,it.summary,it.author,it.site,it.tags.join(' ')].join(' '):''}
    if(k==='col'){const c=cols.get(id);return c?c.name+' '+c.desc:''}if(k==='topic'){return id.slice(2)+' '+(topics[id.slice(2)]?.desc||'')}return''}
  function titleOfId(id){const k=kindOf(id);if(k==='page'){const p=pages.get(id);return p?(p.title||'Adsız'):''}if(k==='item')return items.get(id)?.title||'';if(k==='col')return cols.get(id)?.name||'';if(k==='topic')return'#'+id.slice(2);return''}
  const kwCache=new Map();
  function keywords(id,n=12){const t=textOf(id),c=kwCache.get(id);if(c&&c.t===t)return c.k;const f=new Map();tokens(t).forEach(w=>f.set(w,(f.get(w)||0)+1));
    const ttl=new Set(tokens(titleOfId(id)));const k=[...f].map(([w,c])=>[w,c+(ttl.has(w)?3:0)]).sort((a,b)=>b[1]-a[1]).slice(0,n).map(x=>x[0]);kwCache.set(id,{t,k});return k}
  /* puan: açık bağ, ortak etiket, ortak koleksiyon, anahtar kelime örtüşmesi, metinde adının geçmesi (bağlanmamış bahsetme) */
  function related(id,n=8,opts={}){const k0=kindOf(id);if(!k0)return[];const nb=new Set(neighbors(id)),tg=new Set(tagsOf(id)),kw=new Set(keywords(id)),ttl=low(titleOfId(id)),txt=low(textOf(id));
    const myCols=k0==='item'?new Set(items.get(id)?.cols||[]):new Set();const out=[];
    const cands=[...[...items.keys()],...(typeof pages!=='undefined'?[...pages.keys()]:[])];
    for(const c of cands){if(c===id)continue;if(opts.unlinked&&nb.has(c))continue;let s=0;const why=[];
      if(nb.has(c)){s+=6;why.push('bağlı')}
      const ct=tagsOf(c).filter(t=>tg.has(t));if(ct.length){s+=2.5*ct.length;why.push('ortak etiket: '+ct.slice(0,2).map(t=>'#'+t).join(' '))}
      if(myCols.size&&kindOf(c)==='item'){const cc=items.get(c).cols.filter(x=>myCols.has(x));if(cc.length){s+=1.5;why.push('aynı koleksiyon')}}
      const ck=keywords(c),ov=ck.filter(w=>kw.has(w));if(ov.length){s+=ov.length*1.2;if(ov.length>=2||!why.length)why.push('benzer konu: '+ov.slice(0,3).join(', '))}
      const ctl=low(titleOfId(c));if(ttl.length>3&&low(textOf(c)).includes(ttl)){s+=3;why.push('metninde bu adı geçiyor')}else if(ctl.length>3&&txt.includes(ctl)){s+=3;why.push('bu metinde adı geçiyor')}
      if(s>=2)out.push({id:c,score:s,why:why.join(' · ')})}
    return out.sort((a,b)=>b.score-a.score).slice(0,n)}
  /* bağlanmamış bahsetmeler (Obsidian'daki gibi): adı metinde geçen ama bağlı olmayan sayfalar */
  function mentions(id){const t=low(titleOfId(id).replace(/^#/,''));if(t.length<4)return[];const nb=new Set(neighbors(id));return[...pages.values()].filter(p=>p.id!==id&&!nb.has(p.id)&&low(textOf(p.id)).includes(t)).map(p=>p.id)}

  /* ── yapay zekâ: sadece öneri üretir, onay olmadan hiçbir şeyi değiştirmez ──
     Anahtar Netleştir ile ortak: localStorage 'netlestir:key'. Yoksa yerel yedekler çalışır. */
  const AI={key(){try{return localStorage.getItem('netlestir:key')||''}catch{return''}},ok(){return!!this.key()},
    model(){try{return(JSON.parse(localStorage.getItem('netlestir:cfg'))||{}).model||'claude-sonnet-5-5'}catch{return'claude-sonnet-5-5'}},
    async ask(system,user,max=700){const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'content-type':'application/json','x-api-key':this.key(),'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
        body:JSON.stringify({model:this.model(),max_tokens:max,system,messages:[{role:'user',content:user}]})});if(!r.ok)throw new Error('Claude '+r.status);const j=await r.json();return(j.content||[]).map(c=>c.text||'').join('').trim()},
    async summarize(id){const t=textOf(id).slice(0,12000);if(!this.ok()){const s=t.replace(/\s+/g,' ').split(/(?<=[.!?])\s+/).filter(x=>x.length>40).slice(0,3).join(' ');return{text:s||'Özetlenecek kadar metin yok.',local:true}}
      return{text:await this.ask('Kişisel bilgi yönetimi asistanısın. Türkçe, 3-5 cümlelik net bir özet yaz. Uydurma bilgi ekleme.',`Başlık: ${titleOfId(id)}\n\n${t}`)}},
    async tags(id){if(!this.ok())return{tags:keywords(id,8),local:true};const out=await this.ask('Verilen içerik için 4-8 kısa Türkçe etiket öner. Sadece virgülle ayrılmış küçük harfli etiketleri yaz.',`${titleOfId(id)}\n\n${textOf(id).slice(0,6000)}`,120);
      return{tags:tagList(out.split(/[,\n]/))}},
    async links(id){const loc=related(id,30,{unlinked:true});if(!this.ok()||!loc.length)return{list:loc.slice(0,6),local:true};
      const cand=loc.map((r,i)=>`${i+1}. ${titleOfId(r.id)} — ${textOf(r.id).slice(0,160).replace(/\s+/g,' ')}`).join('\n');
      const out=await this.ask('Bir notu/kaynağı aday listesiyle karşılaştır; gerçekten ilişkili olanların numaralarını ve kısa Türkçe gerekçeyi ver. Biçim: her satır "numara | gerekçe". En fazla 6 satır.',`Hedef: ${titleOfId(id)}\n${textOf(id).slice(0,2500)}\n\nAdaylar:\n${cand}`,400);
      const list=out.split('\n').map(l=>{const m=l.match(/^\s*(\d+)\s*[|\-–:.)]\s*(.+)$/);return m&&loc[+m[1]-1]?{id:loc[+m[1]-1].id,why:m[2].trim(),score:9}:null}).filter(Boolean);return{list:list.length?list:loc.slice(0,6)}}};

  return{TYPES,items,cols,get links(){return links},get topics(){return topics},get ptags(){return ptags},get mode(){return mode},get ready(){return ready},get ver(){return ver},
    on(f){subs.add(f);return()=>subs.delete(f)},emit,startLocal,startCloud,stop,IDB,nid,low,
    addItem,saveItem,delItem,restoreItem,addCol,saveCol,delCol,toggleCol,link,unlink,has,linked,neighbors,pageRefs,kindOf,
    tagsOf,setTags,allTags,setTopic,textOf,titleOfId,keywords,related,mentions,AI,normItem}})();
