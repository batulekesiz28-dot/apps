/* ════════════════════════════════════════════════════════════
   AppShell — Haber takibi (NewsWatch)  · Google Alerts / Feedly “Leo” fikri, cihazda
   “Şu konuda şu olunca haber ver”: kural {id,q (konu),ev (ne olunca),on,at (kuruluş),chk (son kontrol),hits[],seen[],upd,del}
   Kontrol: Google Haberler araması (RSS) → yeni ve eşleşen başlık → bildirim (hub'da Notify: adada + bilgisayarda tarayıcı + telefonda ntfy;
   bildirime dokununca haber açılır). Claude anahtarı (Netleştir'deki netlestir:key) varsa adaylar “bu haber gerçekten o olayı mı bildiriyor?” diye
   ayrıca süzülür; yoksa kelime eşleşmesi (konu kelimelerinin hepsi + olay kelimelerinden en az biri).
   Kayıt: yerel haberler:watch (Haberler uygulaması yazar), bulut hub/news {watch, prof, sent} (hub eşitler → her cihazda aynı kurallar ve
   seni tanıyan haber profili haberler:prof). Aynı haber iki cihazdan iki kez bildirilmesin diye bulutta sent{} (işlem/transaction).
   Kontrol hub açıkken 10 dakikada bir (hangi cihazda açıksa), Haberler tek başına açıksa orada da. Tarayıcı kapalıyken çalışmaz.
   ════════════════════════════════════════════════════════════ */
(()=>{
const WK='haberler:watch',PK='haberler:prof',SK='haberler:wsent';
const get=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k));return v??d}catch{return d}},set=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
const GN=(q,lang='tr')=>lang==='tr'?`https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=tr&gl=TR&ceid=TR:tr`:`https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;
const clean=s=>String(s||'').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim();
const host=u=>{try{return new URL(u).hostname.replace(/^www\./,'')}catch{return''}};
function parse(txt,url){const x=new DOMParser().parseFromString(txt,'text/xml'),src0=x.querySelector('channel>title,feed>title')?.textContent.trim()||host(url);
  return[...x.querySelectorAll('item,entry')].slice(0,40).map(n=>{const g=s=>n.querySelector(s)?.textContent?.trim()||'',l=n.querySelector('link'),link=l?.getAttribute('href')||l?.textContent?.trim()||'';
    let title=clean(g('title'));const src=clean(n.querySelector('source')?.textContent)||src0;if(src&&title.endsWith(' - '+src))title=title.slice(0,-(src.length+3));
    const d=g('description')||g('summary')||g('content'),mc=n.getElementsByTagName('media:content')[0]||n.getElementsByTagName('media:thumbnail')[0],enc=n.querySelector('enclosure[type^=image]'),im=(d.match(/<img[^>]+src="([^"]+)"/)||[])[1];
    return{title,link,t:Date.parse(g('pubDate')||g('updated')||g('published'))||0,src:String(src).slice(0,40),desc:/news\.google\./.test(url)?'':clean(d).slice(0,300),img:mc?.getAttribute('url')||enc?.getAttribute('url')||im||''}}).filter(i=>i.title&&/^https?:/.test(i.link))}
// RSS: kaynağın kendisi → rss2json → allorigins (CORS izin vermeyenler için)
async function feed(url){const tm=ms=>({signal:AbortSignal.timeout?AbortSignal.timeout(ms):undefined});
  try{const r=await fetch(url,{cache:'no-store',...tm(6000)});if(r.ok)return parse(await r.text(),url)}catch{}
  try{const r=await fetch('https://api.rss2json.com/v1/api.json?rss_url='+encodeURIComponent(url),tm(8000));const j=await r.json();
    if(j.status==='ok')return j.items.slice(0,40).map(i=>{const src=(j.feed?.title||host(url)).slice(0,40);let title=clean(i.title);if(title.endsWith(' - '+src))title=title.slice(0,-(src.length+3));
      return{title,link:i.link,t:Date.parse((i.pubDate||'').replace(' ','T')+'Z')||0,src,desc:/news\.google\./.test(url)?'':clean(i.description).slice(0,300),img:i.thumbnail||i.enclosure?.link||''}}).filter(i=>i.title)}catch{}
  const r=await fetch('https://api.allorigins.win/raw?url='+encodeURIComponent(url),tm(9000));if(!r.ok)throw new Error('rss');return parse(await r.text(),url)}

/* ── kelimeler: küçük harf, Türkçe ekleri kabaca at (ilk 5 harf), dolgu kelimeleri çıkar ── */
const STOP=new Set('ve ile bir bu şu o da de mi mı mu mü için gibi daha çok en ama fakat ki ne neden nasıl olan oldu olarak yeni son sonra önce kadar göre her tüm bazı hem ise ya yada veya üzerine karşı arasında haber haberi haberleri açıkladı dedi the a an of to in on for and or is are was with by at from as that this it be has have will after new says said over into about'.split(' '));
const stem=w=>w.length>5?w.slice(0,5):w;
function toks(s){return[...new Set(String(s||'').toLocaleLowerCase('tr').replace(/[’'`´]/g,' ').replace(/[^\p{L}\p{N} ]/gu,' ').split(/\s+/).filter(w=>w.length>=3&&!STOP.has(w)&&!/^\d+$/.test(w)).map(stem))]}
const key=i=>toks(i.title).slice(0,8).sort().join(' ')||i.link;

/* ── kurallar ── */
const list=()=>get(WK,[]).filter(r=>!r.del),all=()=>get(WK,[]);
const put=L=>{set(WK,L.slice(-60));try{window.dispatchEvent(new CustomEvent('newswatch'))}catch{}};
// “Galatasaray yeni teknik direktör açıklarsa haber ver” → konu + olay
function split(txt){let s=String(txt||'').trim().replace(/\s*(beni\s+)?(haber\s*ver|bildir|bilgilendir|uyar|söyle)\s*[.!]?$/i,'').trim();
  const m=s.match(/^(.+?)\s+(?:konusunda|hakkında|ile ilgili)\s+(.+)$/i)||s.match(/^(.+?)\s+((?:\S+\s+){0,4}\S*(?:olunca|olursa|ınca|ince|unca|ünce|ırsa|irse|ursa|ürse|arsa|erse|sa|se))$/i);
  if(m)return{q:m[1].trim(),ev:m[2].replace(/\s*(olunca|olursa)$/i,'').trim()};return{q:s,ev:''}}
function add(o){const L=all(),{q,ev}=o.ev!=null?{q:o.q,ev:o.ev}:split(o.q);if(!q)return null;
  const r={id:'W'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),q:q.slice(0,80),ev:String(ev||'').slice(0,80),on:true,at:Date.now(),chk:0,hits:[],seen:[],upd:Date.now()};L.push(r);put(L);setTimeout(()=>check(true,r.id),400);return r}
function patch(id,p){const L=all(),r=L.find(x=>x.id===id);if(!r)return;Object.assign(r,p,{upd:Date.now()});put(L)}
const remove=id=>patch(id,{del:1,on:false,hits:[],seen:[]});

/* ── eşleşme ── */
const has=(T,w)=>T.some(t=>t===w||t.startsWith(w)||w.startsWith(t)&&t.length>=4);
function hit(r,i){const T=toks(i.title+' '+(i.desc||'')),Q=toks(r.q),V=toks(r.ev);if(!Q.length||!Q.every(w=>has(T,w)))return false;return!V.length||V.filter(w=>has(T,w)).length>=Math.ceil(V.length/2)} // olay kelimelerinin en az yarısı
const aiKey=()=>{const k=get('netlestir:key','');return typeof k==='string'?k.trim():''};
async function aiFilter(r,C){const k=aiKey();if(!k||!r.ev||!C.length)return C;
  try{const res=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'content-type':'application/json','x-api-key':k,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
      body:JSON.stringify({model:'claude-haiku-5-5',max_tokens:60,messages:[{role:'user',content:`Kullanıcı şunu bekliyor: “${r.q}” konusunda “${r.ev}” olayı gerçekleşince haber verilsin.\nBaşlıklar:\n${C.map((c,i)=>`${i+1}. ${c.title}`).join('\n')}\nBu olayın GERÇEKTEN gerçekleştiğini bildiren başlıkların numaralarını virgülle yaz (söylenti/tahmin değil). Hiçbiri değilse 0 yaz. Sadece numaralar.`}]})});
    if(!res.ok)return C;const t=(await res.json()).content?.[0]?.text||'';const n=new Set((t.match(/\d+/g)||[]).map(Number));return C.filter((_,i)=>n.has(i+1))}catch{return C}}

/* ── bildirim: hub'da Notify (ada + tarayıcı + telefon), tek başına açık Haberler'de tarayıcı bildirimi ── */
let FS=null,doc=null;
async function claim(k){const loc=get(SK,{});if(loc[k])return false;loc[k]=Date.now();for(const x in loc)if(Date.now()-loc[x]>14*864e5)delete loc[x];set(SK,loc);
  if(!doc)return true;try{return await FS.runTransaction(async tx=>{const d=await tx.get(doc),s=d.data()?.sent||{};if(s[k])return false;tx.set(doc,{sent:{[k]:Date.now()}},{merge:true});return true})}catch{return true}}
async function notify(r,i){const lbl=r.ev?`${r.q} · ${r.ev}`:r.q,text=`${i.title}`.slice(0,240);
  if(window.Notify?.add){window.Notify.add(text,Date.now(),{url:i.link,title:'Haber takibi · '+lbl.slice(0,40)});return}
  try{if(Notification.permission==='granted'){const n=new Notification('Haber takibi · '+lbl,{body:text,tag:r.id});n.onclick=()=>{window.open(i.link,'_blank','noopener');n.close()}}}catch{}}

/* ── kontrol ── */
let running=false;
async function check(force,only){if(running||!navigator.onLine)return 0;running=true;let n=0;
  try{for(const r of list()){if(!r.on||only&&r.id!==only)continue;if(!force&&Date.now()-(r.chk||0)<9*6e4)continue;
    let items=[];try{items=await feed(GN(`${r.q}${r.ev?' '+r.ev:''} when:2d`))}catch{continue}
    if(r.ev&&items.length<3)try{items=items.concat(await feed(GN(`${r.q} when:2d`)))}catch{}
    {const u=new Map();items.forEach(i=>{const k=key(i);if(!u.has(k))u.set(k,i)});items=[...u.values()]} // iki aramada gelen aynı haber bir kez
    const seen=new Set(r.seen||[]),since=(r.at||0)-36e5,first=!r.chk;
    const C=items.filter(i=>!seen.has(key(i))&&(i.t||Date.now())>=since&&hit(r,i));
    items.forEach(i=>seen.add(key(i)));
    const ok=first?[]:(await aiFilter(r,C.slice(0,8))).slice(0,3); // ilk kontrol: kurulmadan önceki haberleri bildirme, sadece kaydet
    const hits=[...ok.map(i=>({t:i.title,link:i.link,src:i.src,at:i.t||Date.now()})),...(r.hits||[])].slice(0,20);
    for(const i of ok)if(await claim(r.id+':'+key(i))){await notify(r,i);n++}
    patch(r.id,{chk:Date.now(),seen:[...seen].slice(-300),hits})}}
  finally{running=false}return n}

/* ── bulut eşitleme (sadece hub): kurallar + profil + gönderilenler ── */
let pushT=0;const push=()=>{if(!doc)return;clearTimeout(pushT);pushT=setTimeout(()=>{const prof=get(PK,null);
  doc.set({watch:all().map(({seen,...r})=>r),...(prof?{prof}:{}),upd:Date.now()},{merge:true}).catch(()=>{})},1500)};
function merge(cloudW){const L=all(),by=new Map(L.map(r=>[r.id,r]));let ch=false;
  for(const c of cloudW||[]){const l=by.get(c.id);if(!l||(c.upd||0)>(l.upd||0)){by.set(c.id,{...c,seen:l?.seen||[],hits:c.hits||l?.hits||[]});ch=true}}
  if(ch)put([...by.values()]);return ch}
function start(fs){if(start.done)return;start.done=true;
  if(fs){FS=fs;doc=fs.collection('hub').doc('news');
    doc.onSnapshot(d=>{const v=d.data()||{};const ch=merge(v.watch);
      const lp=get(PK,null);if(v.prof&&(!lp||(v.prof.u||0)>(lp.u||0)))set(PK,v.prof);
      if(!ch&&(all().some(r=>!(v.watch||[]).some(c=>c.id===r.id&&(c.upd||0)>=(r.upd||0)))))push()},()=>{});
    addEventListener('storage',e=>{if(e.key===WK||e.key===PK)push()});addEventListener('newswatch',push)}
  setTimeout(()=>check(),20000);setInterval(()=>check(),10*6e4);addEventListener('online',()=>setTimeout(()=>check(),5000))}
window.NewsWatch={start,check,list,add,patch,remove,split,feed,GN,toks,key,hit,parse};
})();
