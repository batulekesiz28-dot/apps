/* ════════════════════════════════════════════════════════════
   Notlar — zaman yönetimi katmanı (Takvim · Aktiviteler · Görevler · İstatistikler)
   Tek veri, her yerde aynı kayıt:
     aktivite  → TM.acts  ('A_…')  {title,cat,date,start,end,dur,desc,note,status,page}
     kategori  → TM.cats  [{id,name,color,icon}]  (kullanıcı ekleyebilir/düzenleyebilir)
     görev     → Notlar'daki “yapılacak” satırları (b.t==='todo'); tarih: günlük notun günü ya da satır tarihi (b.d)
     not       → Notlar sayfaları; günlük not o güne bağlı, aktivite notu `note` alanında, isterse ayrı sayfa (`page`)
   Kayıt: yerel 'time:v1'; bulut Firestore hub/time (kategoriler) + hub/time/acts.
   Yükleme anında Notlar global'lerine dokunmaz; sadece çalışırken kullanır.
   ════════════════════════════════════════════════════════════ */
const TM=(()=>{
  const acts=new Map(),subs=new Set();let cats=[],mode='local',ref=null,unsubs=[],ready=false;
  const LKEY='time:v1',now=()=>Date.now(),nid=()=>'A_'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
  const DEF=[{id:'egitim',name:'Eğitim',color:'#3E63DD',icon:'📚'},{id:'spor',name:'Spor',color:'#30A46C',icon:'🏃'},{id:'oyun',name:'Oyun',color:'#8E4EC6',icon:'🎮'},{id:'is',name:'İş',color:'#D97706',icon:'💼'},
    {id:'kisisel',name:'Kişisel',color:'#E5484D',icon:'🌱'},{id:'dinlenme',name:'Dinlenme',color:'#0D9488',icon:'☕'},{id:'diger',name:'Diğer',color:'#71717A',icon:'•'}];
  const hm=s=>{const m=/^(\d{1,2}):(\d{2})$/.exec(s||'');return m?(+m[1])*60+(+m[2]):null};
  const fmtHM=v=>{v=((v%1440)+1440)%1440;return String(Math.floor(v/60)).padStart(2,'0')+':'+String(v%60).padStart(2,'0')};
  function durOf(a){const s=hm(a.start),e=hm(a.end);if(s!=null&&e!=null)return(e-s+1440)%1440||1440;return Math.max(0,+a.dur||0)}
  function norm(o){const a={id:String(o.id),title:String(o.title||'').slice(0,160),cat:String(o.cat||'diger'),date:/^\d{4}-\d{2}-\d{2}$/.test(o.date||'')?o.date:new Date().toISOString().slice(0,10),
      start:hm(o.start)!=null?o.start.padStart(5,'0'):'',end:hm(o.end)!=null?o.end.padStart(5,'0'):'',dur:Math.max(0,Math.round(+o.dur||0)),desc:String(o.desc||'').slice(0,2000),note:String(o.note||'').slice(0,8000),
      status:['plan','doing','done'].includes(o.status)?o.status:'plan',page:String(o.page||''),created:+o.created||now(),updated:+o.updated||now()};
    a.dur=durOf(a);return a}
  const normCat=c=>({id:String(c.id),name:String(c.name||'Kategori').slice(0,30),color:/^#[0-9a-f]{6}$/i.test(c.color||'')?c.color:'#71717A',icon:String(c.icon||'').slice(0,4)});
  const say=m=>{try{toast(m)}catch{}};
  function localSave(){try{localStorage.setItem(LKEY,JSON.stringify({cats,acts:[...acts.values()]}))}catch{say('Aktiviteler kaydedilemedi — tarayıcı depolaması dolu olabilir')}}
  const put=a=>mode==='local'?localSave():ref.acts.doc(a.id).set(a).catch(e=>say('Kaydedilemedi: '+(e.code||e.message)));
  const delDoc=id=>mode==='local'?localSave():ref.acts.doc(id).delete().catch(e=>say('Silinemedi: '+(e.code||e.message)));
  const putCats=()=>mode==='local'?localSave():ref.doc.set({cats,updated:now()},{merge:true}).catch(e=>say('Kategoriler kaydedilemedi: '+(e.code||e.message)));
  let ver=0,emT=0;function emit(w){ver++;for(const f of subs)try{f(w)}catch(e){console.error(e)}}const emitSoon=w=>{clearTimeout(emT);emT=setTimeout(()=>emit(w),40)};
  function startLocal(){mode='local';try{const d=JSON.parse(localStorage.getItem(LKEY)||'null');if(d){(d.acts||[]).forEach(o=>{const a=norm(o);acts.set(a.id,a)});if(Array.isArray(d.cats)&&d.cats.length)cats=d.cats.map(normCat)}}catch{}
    if(!cats.length)cats=DEF.map(normCat);ready=true;emit('all')}
  function startCloud(fs){mode='cloud';const doc=fs.collection('hub').doc('time');ref={doc,acts:doc.collection('acts')};
    return new Promise(res=>{let left=2;const done=()=>{if(--left===0&&!ready){ready=true;res();emit('all')}};
      let f1=true;unsubs.push(ref.acts.onSnapshot(s=>{s.docChanges().forEach(ch=>{if(ch.doc.metadata.hasPendingWrites&&!f1)return;if(ch.type==='removed')acts.delete(ch.doc.id);else acts.set(ch.doc.id,norm({...ch.doc.data(),id:ch.doc.id}))});if(f1){f1=false;done()}else emitSoon('acts')},e=>{say('Aktivite senkron hatası: '+(e.code||e.message));if(f1){f1=false;done()}}));
      let f2=true;unsubs.push(ref.doc.onSnapshot(s=>{if(s.metadata.hasPendingWrites&&!f2)return;const d=s.data()||{};cats=Array.isArray(d.cats)&&d.cats.length?d.cats.map(normCat):DEF.map(normCat);if(f2){f2=false;done()}else emitSoon('cats')},()=>{cats=DEF.map(normCat);if(f2){f2=false;done()}}));
      setTimeout(()=>{if(!ready){ready=true;res();emit('all')}},8000)})}
  function stop(){unsubs.forEach(u=>{try{u()}catch{}});unsubs=[];acts.clear();cats=[];ready=false}
  function add(o){const a=norm({...o,id:o.id||nid(),created:now(),updated:now()});acts.set(a.id,a);put(a);emit('acts');return a}
  function save(a,quiet){a.updated=now();const n=norm(a);acts.set(n.id,n);Object.assign(a,n);put(n);if(!quiet)emit('acts');return n}
  function del(id){const a=acts.get(id);if(!a)return null;acts.delete(id);delDoc(id);emit('acts');return a}
  function restore(a){if(!a)return;acts.set(a.id,a);put(a);emit('acts')}
  function setCats(list){cats=list.map(normCat);putCats();emit('cats')}
  const cat=id=>cats.find(c=>c.id===id)||cats.find(c=>c.id==='diger')||{id:'diger',name:'Diğer',color:'#71717A',icon:'•'};
  const onDay=d=>[...acts.values()].filter(a=>a.date===d).sort((a,b)=>(hm(a.start)??-1)-(hm(b.start)??-1)||a.created-b.created);
  const between=(a,b)=>[...acts.values()].filter(x=>x.date>=a&&x.date<=b);
  return{acts,get cats(){return cats},get mode(){return mode},get ready(){return ready},get ver(){return ver},startLocal,startCloud,stop,add,save,del,restore,setCats,cat,onDay,between,durOf,hm,fmtHM,norm,on:f=>{subs.add(f);return()=>subs.delete(f)}}})();

/* ════════════════════════════════════════════════════════════
   Görünümler
   ════════════════════════════════════════════════════════════ */
const Time=(()=>{
  const $=s=>document.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
  const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const lsg=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}},lss=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
  const fm=m=>{m=Math.round(m);return m<60?m+' dk':Math.floor(m/60)+' sa'+(m%60?' '+m%60+' dk':'')};
  const ST={plan:'Planlandı',doing:'Devam ediyor',done:'Tamamlandı'};
  const SV=p=>`<svg class="i" viewBox="0 0 16 16">${p}</svg>`;
  const I={plus:SV('<path d="M8 3v10M3 8h10"/>'),l:SV('<path d="M10 3.5L5.5 8l4.5 4.5"/>'),r:SV('<path d="M6 3.5L10.5 8 6 12.5"/>'),x:SV('<path d="M4 4l8 8M12 4l-8 8"/>'),clock:SV('<circle cx="8" cy="8" r="5.5"/><path d="M8 5v3l2 1.5"/>'),
    trash:SV('<path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 9h5.8l.6-9"/>'),page:SV('<path d="M4 2h5.5L12 4.5V14H4z"/><path d="M9.5 2v2.5H12"/>'),later:SV('<path d="M3 8h8M8 4.5L11.5 8 8 11.5M13 3v10"/>'),edit:SV('<path d="M10.5 3l2.5 2.5L6 12.5H3.5V10z"/>'),
    chart:SV('<path d="M3 13.5V8.5M6.5 13.5V4.5M10 13.5V7M13.5 13.5V2.5"/>')};
  const PX=.9;            // takvim ızgarasında dakika başına piksel
  let calMode=lsg('time:calmode','month'),busy=false;
  const cur=()=>typeof view!=='undefined'?view:'';

  /* ── hızlı ekleme: “Spor 18:00-19:30 koşu yarın” ── */
  function parse(q,base){let s=' '+String(q||'').trim()+' ',start='',end='',dur=0,date=base||today(),status='',cat='';
    let m=s.match(/\s(\d{1,2})[:.](\d{2})\s*[-–—]\s*(\d{1,2})[:.](\d{2})\s/);
    if(m){start=`${m[1].padStart(2,'0')}:${m[2]}`;end=`${m[3].padStart(2,'0')}:${m[4]}`;s=s.replace(m[0],' ')}
    else if((m=s.match(/\s(\d{1,2})\s*[-–—]\s*(\d{1,2})\s/))&&+m[1]<=24&&+m[2]<=24){start=`${m[1].padStart(2,'0')}:00`;end=`${m[2].padStart(2,'0')}:00`;s=s.replace(m[0],' ')}
    else if((m=s.match(/\s(?:saat\s)?(\d{1,2})[:.](\d{2})\s/))&&+m[1]<24){start=`${m[1].padStart(2,'0')}:${m[2]}`;s=s.replace(m[0],' ')}
    if((m=s.match(/\s(\d+(?:[.,]\d+)?)\s*(dk|dakika|sa|saat)\s/i))){const v=parseFloat(m[1].replace(',','.'));dur=Math.round(/^s/i.test(m[2])?v*60:v);s=s.replace(m[0],' ')}
    if(start&&!end&&dur)end=TM.fmtHM(TM.hm(start)+dur);
    if(/\s(bitti|tamamlandı|tamamladım|yaptım)\s/i.test(s)){status='done';s=s.replace(/\s(bitti|tamamlandı|tamamladım|yaptım)\s/i,' ')}
    const w=s.trim().split(/\s+/);for(let n=3;n>=1&&w.length;n--)for(let i=0;i+n<=w.length;i++){const d=typeof parseTR==='function'?parseTR(w.slice(i,i+n).join(' ')):null;if(d){date=d;w.splice(i,n);n=0;break}}
    s=' '+w.join(' ')+' ';const lw=x=>x.toLocaleLowerCase('tr');
    for(const c of TM.cats){const rx=new RegExp(`\\s#?${lw(c.name).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\s`,'i');if(rx.test(lw(s))){cat=c.id;const i=lw(s).search(rx);s=s.slice(0,i)+' '+s.slice(i+lw(s).match(rx)[0].length);break}}
    const title=s.replace(/\s+/g,' ').trim();return{title,start,end,dur,date,status,cat}}
  function autoStatus(a){if(a.status)return a.status;const t=today();if(a.date<t)return'done';if(a.date>t)return'plan';const n=new Date().getHours()*60+new Date().getMinutes(),s=TM.hm(a.start),e=TM.hm(a.end);
    if(s!=null&&e!=null&&e<=n)return'done';if(s!=null&&s<=n&&(e==null||e>n))return'doing';return'plan'}
  function quickAdd(q,o={}){const p=parse(q,o.date);if(!p.title&&!p.cat)return null;const c=p.cat||o.cat||lsg('time:lastcat','diger');lss('time:lastcat',c);
    const a=TM.add({title:p.title||TM.cat(c).name,cat:c,date:p.date,start:p.start,end:p.end,dur:p.dur,status:autoStatus({...p,status:p.status||o.status||''})});
    toast(`${TM.cat(c).icon} ${a.title} · ${dayLabel(a.date)}${a.start?' '+a.start:''} eklendi`);return a}
  const qaHTML=(ph,date)=>`<form class="tm-qa" data-qa="${date||''}"><span class="tm-qa-i">${I.plus}</span><input name="q" placeholder="${E(ph)}" autocomplete="off" aria-label="Hızlı aktivite ekle"><button class="tm-qa-b" type="submit">Ekle</button></form>`;

  /* ── düzenleme penceresi ── */
  function editor(a,isNew){const el=document.createElement('div');el.className='tm-ed-bg';const c=TM.cat(a.cat);
    el.innerHTML=`<form class="tm-ed" role="dialog" aria-modal="true" aria-label="Aktivite"><div class="tm-ed-h"><input name="title" class="tm-ed-t" value="${E(a.title)}" placeholder="Aktivite adı" required><button type="button" class="tm-ib" data-x aria-label="Kapat">${I.x}</button></div>
      <div class="tm-cats" role="radiogroup" aria-label="Kategori">${TM.cats.map(k=>`<button type="button" class="tm-cat${k.id===a.cat?' on':''}" data-cat="${k.id}" style="--c:${k.color}" role="radio" aria-checked="${k.id===a.cat}"><i>${E(k.icon)}</i>${E(k.name)}</button>`).join('')}<button type="button" class="tm-cat add" data-catm>${I.edit}Kategoriler</button></div>
      <div class="tm-row"><label>Tarih<input type="date" name="date" value="${a.date}"></label><label>Başlangıç<input type="time" name="start" value="${a.start}"></label><label>Bitiş<input type="time" name="end" value="${a.end}"></label><label>Süre (dk)<input type="number" name="dur" min="0" step="5" value="${a.dur||''}" ${a.start&&a.end?'readonly':''}></label></div>
      <div class="tm-seg" role="radiogroup" aria-label="Durum">${Object.entries(ST).map(([k,l])=>`<button type="button" data-st="${k}" class="${a.status===k?'on':''}" role="radio" aria-checked="${a.status===k}">${l}</button>`).join('')}</div>
      <textarea name="desc" rows="2" placeholder="Açıklama">${E(a.desc)}</textarea><textarea name="note" rows="3" placeholder="Not (isteğe bağlı) — bu aktiviteye bağlı kalır">${E(a.note)}</textarea>
      <div class="tm-ed-f">${isNew?'':`<button type="button" class="tm-btn ghost" data-del>${I.trash}Sil</button>`}<button type="button" class="tm-btn ghost" data-page>${I.page}${a.page&&pages.has(a.page)?'Not sayfasını aç':'Not sayfası oluştur'}</button><span style="flex:1"></span><button type="submit" class="tm-btn pri">${isNew?'Ekle':'Kaydet'}</button></div></form>`;
    document.body.appendChild(el);busy=true;const f=el.querySelector('form'),st={cat:a.cat,status:a.status};
    anim(el,[{opacity:0},{opacity:1}],{duration:180,easing:OUT});anim(f,[{opacity:0,transform:'translateY(10px) scale(.98)'},{opacity:1,transform:'none'}],{duration:380,easing:OUT});
    setTimeout(()=>f.title.focus(),40);
    const close=()=>{busy=false;el.remove();rerender()};
    const sync=()=>{const s=TM.hm(f.start.value),e=TM.hm(f.end.value);if(s!=null&&e!=null){f.dur.value=(e-s+1440)%1440||1440;f.dur.readOnly=true}else f.dur.readOnly=false};
    f.start.oninput=f.end.oninput=sync;
    const collect=()=>({...a,title:f.title.value.trim()||TM.cat(st.cat).name,cat:st.cat,status:st.status,date:f.date.value||a.date,start:f.start.value,end:f.end.value,dur:+f.dur.value||0,desc:f.desc.value,note:f.note.value});
    el.addEventListener('click',e=>{if(e.target===el||e.target.closest('[data-x]'))return close();
      const k=e.target.closest('[data-cat]');if(k){st.cat=k.dataset.cat;$$('[data-cat]',f).forEach(x=>{x.classList.toggle('on',x===k);x.setAttribute('aria-checked',x===k)});return}
      const s=e.target.closest('[data-st]');if(s){st.status=s.dataset.st;$$('[data-st]',f).forEach(x=>{x.classList.toggle('on',x===s);x.setAttribute('aria-checked',x===s)});return}
      if(e.target.closest('[data-catm]')){catManager(()=>{el.remove();busy=false;editor(collect(),isNew)});return}
      if(e.target.closest('[data-del]')){const g=TM.del(a.id);close();Library.toastUndo(`“${a.title}” silindi`,()=>TM.restore(g));return}
      if(e.target.closest('[data-page]')){const v=collect();let p=v.page&&pages.get(v.page);if(!p){p=newPage({title:v.title,icon:TM.cat(v.cat).icon});p.date=v.date;
          if(v.note.trim())p.blocks=[B('p',E(v.note).replace(/\n/g,'<br>'))];touch(p);v.page=p.id}
        if(isNew&&!TM.acts.has(v.id))TM.add(v);else TM.save(v,true);busy=false;el.remove();go('#p/'+p.id)}});
    f.addEventListener('submit',e=>{e.preventDefault();const v=collect();if(isNew)TM.add(v);else TM.save(v);lss('time:lastcat',v.cat);close()});
    el.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();close()}})}
  function newAct(o={}){const c=o.cat||lsg('time:lastcat','diger');editor(TM.norm({id:'A_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),title:'',cat:c,date:o.date||selDayOr(),start:o.start||'',end:o.end||'',status:o.status||'plan'}),true)}
  const selDayOr=()=>typeof selDay!=='undefined'&&selDay?selDay:today();
  function open(id){const a=TM.acts.get(id);if(a)editor({...a},false)}
  function catManager(after){const el=document.createElement('div');el.className='tm-ed-bg';let list=TM.cats.map(c=>({...c}));
    const draw=()=>`<div class="tm-ed" role="dialog" aria-modal="true" aria-label="Kategoriler"><div class="tm-ed-h"><b class="tm-ed-tt">Kategoriler</b><button type="button" class="tm-ib" data-x aria-label="Kapat">${I.x}</button></div>
      <div class="tm-cl">${list.map((c,i)=>`<div class="tm-ci"><input class="tm-ce" data-i="${i}" data-f="icon" value="${E(c.icon)}" aria-label="Simge" maxlength="4"><input type="color" data-i="${i}" data-f="color" value="${c.color}" aria-label="Renk"><input class="tm-cn" data-i="${i}" data-f="name" value="${E(c.name)}" aria-label="Ad"><span class="tm-cc">${[...TM.acts.values()].filter(a=>a.cat===c.id).length}</span>${c.id==='diger'?'':`<button class="tm-ib" data-rm="${i}" aria-label="${E(c.name)} kategorisini sil">${I.trash}</button>`}</div>`).join('')}</div>
      <div class="tm-ed-f"><button class="tm-btn ghost" data-addc>${I.plus}Yeni kategori</button><span style="flex:1"></span><button class="tm-btn pri" data-ok>Kaydet</button></div><p class="tm-mut">Silinen kategorideki aktiviteler “Diğer”e geçer.</p></div>`;
    el.innerHTML=draw();document.body.appendChild(el);busy=true;
    el.addEventListener('input',e=>{const t=e.target;if(t.dataset.i!=null)list[+t.dataset.i][t.dataset.f]=t.value});
    el.addEventListener('click',e=>{if(e.target===el||e.target.closest('[data-x]')){el.remove();busy=false;after?.();return}
      if(e.target.closest('[data-addc]')){list.push({id:'c'+Date.now().toString(36),name:'Yeni kategori',color:'#3E63DD',icon:'⭐'});el.innerHTML=draw();el.querySelector('.tm-ci:last-child .tm-cn')?.select();return}
      const rm=e.target.closest('[data-rm]');if(rm){list.splice(+rm.dataset.rm,1);el.innerHTML=draw();return}
      if(e.target.closest('[data-ok]')){const ids=new Set(list.map(c=>c.id));for(const a of TM.acts.values())if(!ids.has(a.cat)){a.cat='diger';TM.save(a,true)}TM.setCats(list);el.remove();busy=false;toast('Kategoriler kaydedildi');after?.()}})}

  /* ── görevler: Notlar'daki yapılacak satırları ── */
  function tasks(){const out=[];for(const p of pages.values())for(const b of p.blocks){if(b.t!=='todo')continue;const text=plain(b.h).trim();if(!text)continue;
      const d=b.d||(isDaily(p)?p.date:'')||datesOf(b)[0]||'';out.push({p,b,text,date:d,done:!!b.c})}return out}
  function setDone(o,v){o.b.c=v;touch(o.p);if(typeof P!=='undefined'&&P&&P.id===o.p.id&&typeof replaceNode==='function')replaceNode(o.b)}
  function postpone(o,d){if(isDaily(o.p)&&!o.b.d)moveToDay(o.p,o.b,d);else setBlockDate(o.p,o.b,d)}
  function addTask(q){let text=String(q||'').trim();if(!text)return;let d=today();const w=text.split(/\s+/);
    for(let n=3;n>=1;n--)for(let i=0;i+n<=w.length;i++){const x=parseTR(w.slice(i,i+n).join(' '));if(x){d=x;w.splice(i,n);n=0;break}}text=w.join(' ')||text;
    let dst=dailyOf(d);if(!dst)dst=newPage({tpl:'daily',date:d});FRESH.delete(dst.id);let at=dst.blocks.length;while(at>0&&!plain(dst.blocks[at-1].h).trim()&&dst.blocks[at-1].t!=='divider')at--;
    const empty=dst.blocks.findIndex(b=>b.t==='todo'&&!plain(b.h).trim());if(empty>=0)dst.blocks[empty].h=E(text);else dst.blocks.splice(at,0,B('todo',E(text)));touch(dst);toast(`Görev eklendi · ${dayLabel(d)}`)}
  const taskRow=o=>`<div class="tm-task${o.done?' done':''}"><button class="tm-chk${o.done?' on':''}" data-tdone="${o.p.id}:${o.b.id}" aria-label="${o.done?'Geri al':'Tamamla'}" aria-pressed="${o.done}"></button><span class="tm-tt">${E(o.text)}</span>
      <span class="tm-meta">${o.date?`<span class="tm-date${o.date<today()&&!o.done?' late':''}">${E(dayLabel(o.date))}</span>`:''}<a class="tm-src" href="#p/${o.p.id}" title="Sayfayı aç">${E(titleOf(o.p))}</a></span>
      ${o.done?'':`<button class="tm-ib" data-tlater="${o.p.id}:${o.b.id}" title="Yarına ertele" aria-label="Yarına ertele">${I.later}</button>`}</div>`;
  const findTask=k=>{const[pid,bid]=k.split(':');const p=pages.get(pid);const b=p?.blocks.find(x=>x.id===bid);return b?{p,b,text:plain(b.h),date:b.d||(isDaily(p)?p.date:''),done:!!b.c}:null};

  /* ── aktivite satırı ve blokları ── */
  const actRow=(a,showDate)=>{const c=TM.cat(a.cat);return`<button class="tm-act st-${a.status}" data-act-open="${a.id}" style="--c:${c.color}"><span class="tm-bar"></span><span class="tm-time">${a.start?`${a.start}${a.end?'–'+a.end:''}`:showDate?'':'Gün içi'}${showDate?`<small>${E(dayLabel(a.date))}</small>`:''}</span>
    <span class="tm-tt">${E(a.title)}${a.desc?`<small>${E(a.desc.slice(0,80))}</small>`:''}</span><span class="tm-catl"><i>${E(c.icon)}</i>${E(c.name)}</span><span class="tm-dur">${a.dur?fm(a.dur):''}</span>
    <span class="tm-st" data-act-st="${a.id}" title="Durumu değiştir" role="button" tabindex="0">${ST[a.status]}</span></button>`};

  /* ═════ TAKVİM: gün / hafta ızgarası (ay görünümü Notlar'ın kendi takvimi) ═════ */
  const modeSeg=()=>`<div class="tm-mseg" role="radiogroup" aria-label="Takvim görünümü">${[['day','Gün'],['week','Hafta'],['month','Ay']].map(([k,l])=>`<button data-calmode="${k}" class="${calMode===k?'on':''}" role="radio" aria-checked="${calMode===k}">${l}</button>`).join('')}</div>`;
  function weekStart(d){return addDays(d,-((pd(d).getDay()+6)%7))}
  function renderGrid(){const sd=selDayOr(),days=calMode==='day'?[sd]:[...Array(7)].map((_,i)=>addDays(weekStart(sd),i)),t=today();
    const title=calMode==='day'?`${fmtShort(sd)} <em>${E(fmtWd(sd))}</em>`:`${fmtShort(days[0])} – ${fmtShort(days[6])}`;
    const tk=tasks();const allday=d=>{const ta=tk.filter(o=>o.date===d),un=TM.onDay(d).filter(a=>!a.start);return`${un.map(a=>`<button class="tm-chip" data-act-open="${a.id}" style="--c:${TM.cat(a.cat).color}">${E(TM.cat(a.cat).icon)} ${E(a.title)}</button>`).join('')}${ta.slice(0,4).map(o=>`<button class="tm-chip task${o.done?' done':''}" data-tdone="${o.p.id}:${o.b.id}" title="Görev — tıklayınca tamamla">${o.done?'☑':'☐'} ${E(o.text.slice(0,40))}</button>`).join('')}${ta.length>4?`<span class="tm-more">+${ta.length-4} görev</span>`:''}`};
    let cols='';for(const d of days){const ev=TM.onDay(d).filter(a=>a.start);
      cols+=`<div class="tm-col${d===t?' today':''}${d===sd&&calMode==='week'?' sel':''}" data-gday="${d}">${ev.map(a=>{const s=TM.hm(a.start),du=Math.max(20,a.dur||60),c=TM.cat(a.cat);
        return`<div class="tm-ev st-${a.status}" data-ev="${a.id}" style="--c:${c.color};top:${s*PX}px;height:${du*PX-2}px" tabindex="0" title="${E(a.title)} · ${a.start}${a.end?'–'+a.end:''}"><b>${E(a.title)}</b><small>${a.start}${a.end?'–'+a.end:''} · ${E(c.name)}</small><i class="tm-rs" data-rs></i></div>`}).join('')}
        ${d===t?`<div class="tm-now" style="top:${(new Date().getHours()*60+new Date().getMinutes())*PX}px"></div>`:''}</div>`}
    $('#view').innerHTML=`<div class="wide cal tm-cal"><div class="tm-gwrap">
      <div class="cal-h"><h1>${title}</h1>${modeSeg()}<button class="tb" data-gnav="-1" title="Önceki">${I.l}</button><button class="tb" data-gnav="0">Bugün</button><button class="tb" data-gnav="1" title="Sonraki">${I.r}</button></div>
      ${qaHTML('Aktivite ekle — ör. “Spor 18:00-19:00 koşu” ya da “yarın 10-12 İş toplantı”',calMode==='day'?sd:'')}
      <div class="tm-g" style="--n:${days.length}"><div class="tm-gh"><span></span>${days.map(d=>`<button class="tm-dh${d===t?' today':''}${d===sd?' sel':''}" data-gpick="${d}"><small>${DOW[(pd(d).getDay()+6)%7]}</small><b>${pd(d).getDate()}</b></button>`).join('')}</div>
        <div class="tm-ad"><span>tüm gün</span>${days.map(d=>`<div class="tm-adc" data-gday-ad="${d}">${allday(d)}</div>`).join('')}</div>
        <div class="tm-gs" id="tmScroll"><div class="tm-gb" style="height:${1440*PX}px"><div class="tm-hrs">${[...Array(24)].map((_,h)=>`<span style="top:${h*60*PX}px">${String(h).padStart(2,'0')}:00</span>`).join('')}</div>${cols}</div></div></div></div>
      <aside class="dp" id="dp"></aside></div>`;
    renderDay();const sc=$('#tmScroll');if(sc)sc.scrollTop=Math.max(0,(Math.min(...days.flatMap(d=>TM.onDay(d).filter(a=>a.start).map(a=>TM.hm(a.start))),new Date().getHours()*60-90,7*60))*PX-10)}
  /* sürükle-bırak: taşı (15 dk adım, haftada günler arası) ve alttan uzat */
  function gridDrag(e){const ev=e.target.closest('.tm-ev');if(!ev||e.button>0)return;const a=TM.acts.get(ev.dataset.ev);if(!a)return;e.preventDefault();
    const rs=!!e.target.closest('[data-rs]'),y0=e.clientY,x0=e.clientX,s0=TM.hm(a.start),d0=a.dur||60,cols=$$('.tm-col'),col0=ev.closest('.tm-col');let moved=false,ns=s0,nd=d0,day=a.date;
    ev.setPointerCapture(e.pointerId);busy=true;
    const mv=m=>{const dy=(m.clientY-y0)/PX;if(Math.abs(m.clientY-y0)+Math.abs(m.clientX-x0)>4)moved=true;if(!moved)return;ev.classList.add('drag');
      if(rs){nd=Math.max(15,Math.round((d0+dy)/15)*15);ev.style.height=nd*PX-2+'px'}
      else{ns=Math.max(0,Math.min(1440-15,Math.round((s0+dy)/15)*15));ev.style.top=ns*PX+'px';const c=cols.find(c=>{const r=c.getBoundingClientRect();return m.clientX>=r.left&&m.clientX<r.right});
        if(c&&c.dataset.gday!==day){day=c.dataset.gday;c.appendChild(ev)}}
      ev.querySelector('small').textContent=`${TM.fmtHM(ns)}–${TM.fmtHM(ns+nd)}`};
    const up=()=>{ev.removeEventListener('pointermove',mv);ev.removeEventListener('pointerup',up);ev.removeEventListener('pointercancel',up);busy=false;ev.classList.remove('drag');
      if(!moved){open(a.id);return}a.start=TM.fmtHM(ns);a.end=TM.fmtHM(ns+nd);a.dur=nd;a.date=day;TM.save(a);toast(`${a.title} → ${dayLabel(day)} ${a.start}–${a.end}`)};
    ev.addEventListener('pointermove',mv);ev.addEventListener('pointerup',up);ev.addEventListener('pointercancel',up)}
  function slotClick(e){const c=e.target.closest('.tm-col');if(!c||e.target.closest('.tm-ev'))return;const r=c.getBoundingClientRect(),min=Math.max(0,Math.min(1410,Math.floor((e.clientY-r.top)/PX/30)*30));
    newAct({date:c.dataset.gday,start:TM.fmtHM(min),end:TM.fmtHM(min+60)})}

  /* gün paneli (her takvim görünümünde sağda): aktiviteler, görevler, notlar */
  function dayPanelExtra(d){const L=TM.onDay(d),tk=tasks().filter(o=>o.date===d),tot=L.reduce((s,a)=>s+(a.status==='done'?a.dur:0),0);
    return`<div class="sh"><span>Aktiviteler${tot?` · ${fm(tot)} tamamlandı`:''}</span><span class="rule"></span></div>${qaHTML('Ekle — ör. 14:00-15:30 Eğitim SAT',d)}
      <div class="tm-dl">${L.length?L.map(a=>actRow(a)).join(''):'<div class="none">Bu gün için aktivite yok.</div>'}</div>
      <div class="sh"><span>Görevler</span><span class="rule"></span></div><div class="tm-dl">${tk.length?tk.map(taskRow).join(''):'<div class="none">Bu güne tarihli görev yok.</div>'}</div>`}

  /* ═════ AKTİVİTELER ═════ */
  let F={st:'all',cat:'',q:''};
  function renderActs(){setCrumb(I.clock,'Aktiviteler');const all=[...TM.acts.values()],t=today();
    let L=all.filter(a=>(F.st==='all'||a.status===F.st)&&(!F.cat||a.cat===F.cat)&&(!F.q||(a.title+' '+a.desc+' '+a.note+' '+TM.cat(a.cat).name).toLocaleLowerCase('tr').includes(F.q)));
    const up=L.filter(a=>a.date>=t&&a.status!=='done').sort((a,b)=>a.date.localeCompare(b.date)||(TM.hm(a.start)??-1)-(TM.hm(b.start)??-1)),past=L.filter(a=>!up.includes(a)).sort((a,b)=>b.date.localeCompare(a.date)||(TM.hm(b.start)??-1)-(TM.hm(a.start)??-1));
    const group=list=>{let h='',last='';for(const a of list){if(a.date!==last){last=a.date;const sum=list.filter(x=>x.date===a.date).reduce((s,x)=>s+x.dur,0);h+=`<div class="tm-dg"><b>${E(dayLabel(a.date))}</b><span>${E(fmtWd(a.date))}${sum?' · '+fm(sum):''}</span></div>`}h+=actRow(a)}return h};
    $('#view').innerHTML=`<div class="wrap tm-page"><div class="tm-ph"><h1>Aktiviteler</h1><button class="tm-btn pri" data-newact>${I.plus}Ayrıntılı ekle</button></div>
      ${qaHTML('Ne yaptın ya da ne yapacaksın? ör. “Oyun 21:00-22:30 bitti”, “cuma 9-11 İş rapor”','')}
      <div class="tm-qcats">${TM.cats.map(c=>`<button class="tm-qc" data-qcat="${c.id}" style="--c:${c.color}" title="${E(c.name)} olarak ekle"><i>${E(c.icon)}</i>${E(c.name)}</button>`).join('')}<button class="tm-qc ghost" data-catm>${I.edit}Düzenle</button></div>
      <div class="tm-filt"><div class="tm-mseg">${[['all','Hepsi'],['plan','Planlandı'],['doing','Devam'],['done','Tamamlandı']].map(([k,l])=>`<button data-fst="${k}" class="${F.st===k?'on':''}">${l}</button>`).join('')}</div>
        <select class="tm-sel" data-fcat aria-label="Kategori filtresi"><option value="">Tüm kategoriler</option>${TM.cats.map(c=>`<option value="${c.id}"${F.cat===c.id?' selected':''}>${E(c.icon)} ${E(c.name)}</option>`).join('')}</select>
        <input class="tm-srch" data-fq value="${E(F.q)}" placeholder="Ara…" aria-label="Aktivitelerde ara"></div>
      ${all.length?`${up.length?`<div class="sh"><span>Yaklaşan ve planlanan</span><span class="rule"></span></div><div class="tm-list">${group(up)}</div>`:''}
        <div class="sh"><span>Geçmiş</span><span class="rule"></span></div><div class="tm-list">${past.length?group(past):'<div class="none">Filtreye uyan geçmiş aktivite yok.</div>'}</div>`
      :`<div class="tm-empty"><b>Henüz aktivite yok</b><p>Yukarıya yazıp Enter'a bas. Saat, süre, gün ve kategoriyi cümleden kendim anlarım; takvime, istatistiklere ve gün notuna otomatik bağlanır.</p></div>`}</div>`}

  /* ═════ GÖREVLER ═════ */
  function renderTasks(){setCrumb(SV('<rect x="2.5" y="2.5" width="11" height="11" rx="3"/><path d="M5.5 8.2l1.8 1.8 3.4-3.6"/>'),'Görevler');const all=tasks(),t=today();
    const late=all.filter(o=>!o.done&&o.date&&o.date<t),now=all.filter(o=>!o.done&&o.date===t),soon=all.filter(o=>!o.done&&o.date>t).sort((a,b)=>a.date.localeCompare(b.date)),nod=all.filter(o=>!o.done&&!o.date),done=all.filter(o=>o.done).sort((a,b)=>b.p.updated-a.p.updated).slice(0,40);
    const sec=(h,L,cls='')=>L.length?`<div class="sh ${cls}"><span>${h} · ${L.length}</span><span class="rule"></span></div><div class="tm-dl">${L.map(taskRow).join('')}</div>`:'';
    $('#view').innerHTML=`<div class="wrap tm-page"><div class="tm-ph"><h1>Görevler</h1><span class="tm-mut">${all.filter(o=>!o.done).length} açık · ${all.filter(o=>o.done).length} tamamlandı</span></div>
      <form class="tm-qa" data-qtask><span class="tm-qa-i">${I.plus}</span><input name="q" placeholder="Görev ekle — ör. “fizik ödevi yarın”, “faturayı öde cuma”" autocomplete="off" aria-label="Görev ekle"><button class="tm-qa-b" type="submit">Ekle</button></form>
      <p class="tm-mut" style="margin:-4px 0 18px">Görevler Notlar'daki yapılacak satırlarıdır: eklediğin görev o günün notuna yazılır ve takvimde görünür. Yeniden girmen gerekmez.</p>
      ${all.length?sec('Ertelenen / gecikmiş',late,'late')+sec('Bugün',now)+sec('Yaklaşan',soon)+sec('Tarihsiz',nod)+sec('Tamamlanan',done):`<div class="tm-empty"><b>Görev yok</b><p>Yukarıya yaz ya da herhangi bir sayfada “yapılacak” satırı ekle.</p></div>`}</div>`}

  /* ═════ İSTATİSTİKLER (aktivite ve görevler) ═════ */
  let SR=lsg('time:srange','week');
  function renderStats(){setCrumb(I.chart,'İstatistikler');const t=today(),b=SR==='week'?weekStart(t):SR==='month'?t.slice(0,8)+'01':addDays(t,-89),e=SR==='week'?addDays(b,6):SR==='month'?addDays(t.slice(0,8)+'01',new Date(pd(t).getFullYear(),pd(t).getMonth()+1,0).getDate()-1):t;
    const L=TM.between(b,e),done=L.filter(a=>a.status==='done'),plan=L.filter(a=>a.status!=='done'),mDone=done.reduce((s,a)=>s+a.dur,0),mPlan=L.reduce((s,a)=>s+a.dur,0);
    const tk=tasks().filter(o=>o.date>=b&&o.date<=e),tkd=tk.filter(o=>o.done).length;
    const byCat=TM.cats.map(c=>[c,done.filter(a=>a.cat===c.id).reduce((s,a)=>s+a.dur,0)]).filter(x=>x[1]).sort((a,b)=>b[1]-a[1]),cmax=byCat[0]?.[1]||1;
    const days=[];for(let d=b;d<=e&&days.length<92;d=addDays(d,1))days.push(d);
    const per=days.map(d=>{const o={d};for(const c of TM.cats)o[c.id]=done.filter(a=>a.date===d&&a.cat===c.id).reduce((s,a)=>s+a.dur,0);o.tot=TM.cats.reduce((s,c)=>s+o[c.id],0);return o});
    const mx=Math.max(60,...per.map(o=>o.tot)),step=[30,60,120,180,240,360,480,720].find(x=>x*4>=mx)||Math.ceil(mx/4/60)*60,top=step*4,H=180,W=Math.max(320,Math.min(760,innerWidth-80)),pl=44,bw=Math.max(3,Math.min(26,(W-pl)/per.length*.6));
    let svg='';for(let i=0;i<=4;i++){const y=10+H-H*i/4;svg+=`<line x1="${pl}" x2="${W}" y1="${y}" y2="${y}" class="gl"/><text x="${pl-6}" y="${y+4}" text-anchor="end">${i?fm(step*i).replace(' 0 dk',''):'0'}</text>`}
    per.forEach((o,i)=>{const x=pl+(W-pl)/per.length*(i+.5)-bw/2;let y=10+H;const segs=TM.cats.filter(c=>o[c.id]);segs.forEach((c,j)=>{const h=H*o[c.id]/top,g=j?2:0;y-=h;svg+=`<rect x="${x}" y="${y+g}" width="${bw}" height="${Math.max(0,h-g)}" rx="${j===segs.length-1?Math.min(3,bw/2):0}" fill="${c.color}"/>`});
      if(per.length<=31&&(per.length<=8||i%Math.ceil(per.length/10)===0))svg+=`<text x="${x+bw/2}" y="${H+28}" text-anchor="middle">${per.length<=8?DOW[(pd(o.d).getDay()+6)%7]:pd(o.d).getDate()}</text>`;
      svg+=`<rect class="tm-hit" x="${pl+(W-pl)/per.length*i}" y="10" width="${(W-pl)/per.length}" height="${H}" data-sday="${o.d}"><title>${fmtShort(o.d)} · ${fm(o.tot)}${segs.length?' — '+segs.map(c=>c.name+' '+fm(o[c.id])).join(', '):''}</title></rect>`});
    let streak=0;for(let d=t;;d=addDays(d,-1)){if(TM.onDay(d).some(a=>a.status==='done'))streak++;else if(d!==t)break;if(streak>400)break}
    const avg=mDone/Math.max(1,days.filter(d=>d<=t).length);
    $('#view').innerHTML=`<div class="wrap tm-page"><div class="tm-ph"><h1>İstatistikler</h1><div class="tm-mseg">${[['week','Bu hafta'],['month','Bu ay'],['q','Son 90 gün']].map(([k,l])=>`<button data-sr="${k}" class="${SR===k?'on':''}">${l}</button>`).join('')}</div></div>
      <div class="tm-kpis"><div><small>Tamamlanan süre</small><b>${fm(mDone)}</b></div><div><small>Planlanan + yapılan</small><b>${fm(mPlan)}</b></div><div><small>Aktivite</small><b>${done.length}<span> / ${L.length}</span></b></div><div><small>Görev</small><b>${tkd}<span> / ${tk.length}</span></b></div><div><small>Günlük ortalama</small><b>${fm(avg)}</b></div><div><small>Seri</small><b>${streak} gün</b></div></div>
      ${L.length?`<div class="sh"><span>Günlere göre tamamlanan süre</span><span class="rule"></span></div>${byCat.length>1?`<div class="tm-lg">${byCat.map(([c])=>`<span><i style="background:${c.color}"></i>${E(c.name)}</span>`).join('')}</div>`:''}
        <svg class="tm-chart" viewBox="0 0 ${W} ${H+36}" role="img" aria-label="Günlük tamamlanan süre">${svg}</svg>
        <div class="sh"><span>Kategorilere göre</span><span class="rule"></span></div><div class="tm-bars">${byCat.length?byCat.map(([c,v])=>`<button class="tm-hb" data-qcatf="${c.id}"><span>${E(c.icon)} ${E(c.name)}</span><span class="tm-tr"><i style="width:${100*v/cmax}%;background:${c.color}"></i></span><span>${fm(v)} · %${Math.round(100*v/Math.max(1,mDone))}</span></button>`).join(''):'<div class="none">Bu aralıkta tamamlanmış aktivite yok.</div>'}</div>
        ${plan.length?`<div class="sh"><span>Bekleyen planlar · ${plan.length}</span><span class="rule"></span></div><div class="tm-list">${plan.slice(0,8).map(a=>actRow(a,true)).join('')}</div>`:''}`
      :`<div class="tm-empty"><b>Bu aralıkta kayıt yok</b><p>Aktivite ekledikçe zaman kullanımın burada grafiklere dönüşür. Hiçbir sayı uydurulmaz.</p></div>`}
      <p class="tm-mut" style="margin-top:22px">Notlar, Study Log ve Kütüphane'yi birlikte görmek için <a href="../istatistik/" data-fullstats>İstatistik merkezi →</a></p></div>`}

  /* ── olaylar (tek yerden) ── */
  function bind(){const v=$('#view');
    v.addEventListener('submit',e=>{const f=e.target;if(f.matches('.tm-qa[data-qa]')){e.preventDefault();const q=f.q.value.trim();if(!q)return;const a=quickAdd(q,{date:f.dataset.qa||undefined,cat:f.dataset.cat});if(a){f.q.value='';if(cur()==='cal'){selDay=a.date}}rerender();setTimeout(()=>$('.tm-qa[data-qa] input')?.focus(),20);return}
      if(f.matches('[data-qtask]')){e.preventDefault();addTask(f.q.value);f.q.value='';rerender();setTimeout(()=>$('[data-qtask] input')?.focus(),20)}},true);
    v.addEventListener('click',e=>{const t=e.target;
      const st=t.closest('[data-act-st]');if(st){e.preventDefault();e.stopPropagation();const a=TM.acts.get(st.dataset.actSt);if(a){a.status=a.status==='plan'?'doing':a.status==='doing'?'done':'plan';TM.save(a)}return}
      const ao=t.closest('[data-act-open]');if(ao){e.preventDefault();e.stopPropagation();open(ao.dataset.actOpen);return}
      const td=t.closest('[data-tdone]');if(td){e.preventDefault();e.stopPropagation();const o=findTask(td.dataset.tdone);if(o){setDone(o,!o.done);rerender()}return}
      const tl=t.closest('[data-tlater]');if(tl){e.stopPropagation();const o=findTask(tl.dataset.tlater);if(o){const d=addDays(o.date&&o.date>today()?o.date:today(),1);postpone(o,d);toast(`Ertelendi → ${dayLabel(d)}`);rerender()}return}
      const cm=t.closest('[data-calmode]');if(cm){e.stopPropagation();calMode=cm.dataset.calmode;lss('time:calmode',calMode);rerender(true);return}
      const gn=t.closest('[data-gnav]');if(gn){const n=+gn.dataset.gnav;selDay=n===0?today():addDays(selDayOr(),n*(calMode==='day'?1:7));rerender(true);return}
      const gp=t.closest('[data-gpick]');if(gp){selDay=gp.dataset.gpick;if(calMode==='week'){$$('.tm-dh.sel,.tm-col.sel').forEach(x=>x.classList.remove('sel'));gp.classList.add('sel');$(`.tm-col[data-gday="${selDay}"]`)?.classList.add('sel');renderDay(true)}else rerender();return}
      if(t.closest('[data-newact]')){newAct({date:today()});return}
      const qc=t.closest('[data-qcat]');if(qc){const inp=$('.tm-qa[data-qa] input');lss('time:lastcat',qc.dataset.qcat);if(inp&&inp.value.trim()){const f=inp.form;f.dataset.cat=qc.dataset.qcat;f.requestSubmit();delete f.dataset.cat}else newAct({cat:qc.dataset.qcat,date:today()});return}
      if(t.closest('[data-catm]')){catManager(rerender);return}
      const fs=t.closest('[data-fst]');if(fs){F.st=fs.dataset.fst;rerender();return}
      const sr=t.closest('[data-sr]');if(sr){SR=sr.dataset.sr;lss('time:srange',SR);rerender();return}
      const sd=t.closest('[data-sday]');if(sd){selDay=sd.dataset.sday;calMode='day';lss('time:calmode','day');go('#cal');return}
      const cf=t.closest('[data-qcatf]');if(cf){F={st:'all',cat:cf.dataset.qcatf,q:''};go('#acts');return}
      const fl=t.closest('[data-fullstats]');if(fl){e.preventDefault();try{if(window.parent!==window&&parent.HUB?.open){parent.HUB.open('p:istatistik');return}}catch{}location.href='../istatistik/'+(location.search.includes('local')?'?local':'');return}
      if(cur()==='cal'&&calMode!=='month'&&t.closest('.tm-col'))slotClick(e)});
    v.addEventListener('keydown',e=>{const st=e.target.closest?.('[data-act-st]');if(st&&(e.key==='Enter'||e.key===' ')){e.preventDefault();st.click()}const ev=e.target.closest?.('.tm-ev');if(ev&&e.key==='Enter')open(ev.dataset.ev)});
    v.addEventListener('change',e=>{if(e.target.matches('[data-fcat]')){F.cat=e.target.value;rerender()}});
    v.addEventListener('input',e=>{if(e.target.matches('[data-fq]')){F.q=e.target.value.toLocaleLowerCase('tr');clearTimeout(bind.t);bind.t=setTimeout(()=>{const pos=e.target.selectionStart;rerender();const n=$('[data-fq]');if(n){n.focus();n.setSelectionRange(pos,pos)}},200)}});
    v.addEventListener('pointerdown',e=>{if(e.target.closest('.tm-ev'))gridDrag(e)});
    /* ay görünümünde aktivite sürükle → başka güne */
    v.addEventListener('dragstart',e=>{const c=e.target.closest?.('[data-mact]');if(!c)return;e.dataTransfer.setData('text/x-act',c.dataset.mact);e.dataTransfer.effectAllowed='move'},true);
    v.addEventListener('dragover',e=>{if([...e.dataTransfer.types].includes('text/x-act')&&e.target.closest('.cd')){e.preventDefault();$$('.cd.over').forEach(x=>x.classList.remove('over'));e.target.closest('.cd').classList.add('over')}},true);
    v.addEventListener('drop',e=>{const id=e.dataTransfer.getData('text/x-act'),cd=e.target.closest('.cd');if(!id||!cd)return;e.preventDefault();e.stopPropagation();const a=TM.acts.get(id);if(a){a.date=cd.dataset.day;TM.save(a);selDay=a.date;toast(`${a.title} → ${dayLabel(a.date)}`)}},true);
    TM.on(()=>{if(!busy&&['cal','acts','tasks','stats'].includes(cur()))rerender()})}
  function rerender(soft){if(typeof renderView==='function'&&['cal','acts','tasks','stats'].includes(cur()))renderView(!soft)}
  /* ay görünümü hücrelerine aktivite şeritleri */
  function monthChips(d){const L=TM.onDay(d);if(!L.length)return'';return L.slice(0,3).map(a=>{const c=TM.cat(a.cat);return`<div class="tm-mc st-${a.status}" draggable="true" data-mact="${a.id}" data-act-open="${a.id}" style="--c:${c.color}" title="${E(a.title)}${a.start?' · '+a.start:''}"><i></i><span>${a.start?a.start+' ':''}${E(a.title)}</span></div>`}).join('')+(L.length>3?`<div class="more">+${L.length-3} aktivite</div>`:'')}
  return{get calMode(){return calMode},renderGrid,dayPanelExtra,monthChips,renderActs,renderTasks,renderStats,bind,newAct,quickAdd,parse,tasks,modeSeg}})();
