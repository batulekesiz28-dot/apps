/* ════════════════════════════════════════════════════════════
   Notlar — görev veritabanı (Todoist / TickTick / Notion'dan derlenen kişisel görev sistemi)
   Her görev bağımsız kayıt: 'T_…'  {title,desc,start,due,date,prio 0–3,status todo|doing|done|later,cat,tags,subs,proj,note,order,doneAt,moved}
   Tekrar: şablon kayıt (isSeries) + kural `rep` {type daily|weekdays|weekly|days|monthly|interval, every, days[0=Pzt], from, until, carry move|keep}
     Her gün için ÖRNEK kaydı deterministik kimlikle: `${şablonId}~YYYY-MM-DD` — kaç kez açılırsa açılsın aynı gün ikinci kez oluşmaz.
     Bugünün örnekleri gün başında oluşur; gelecek günler “sanal” gösterilir, dokunulunca kayda dönüşür.
     Her örnek kendi durumunu taşır (pazartesi tamamlanınca salı etkilenmez). Kural değişince geçmiş örneklere dokunulmaz.
   Projeler: hub/time belgesinde `projs` [{id,name,color,icon,desc,archived}].
   Kayıt: yerel 'tasks:v1'; bulut Firestore hub/time/tasks + hub/time (projs).
   Yükleme anında Notlar global'lerine dokunmaz.
   ════════════════════════════════════════════════════════════ */
const TK=(()=>{
  const tasks=new Map(),subs=new Set();let projs=[],mode='local',ref=null,unsubs=[],ready=false,ver=0;
  const LKEY='tasks:v1',now=()=>Date.now(),nid=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
  const D=s=>/^\d{4}-\d{2}-\d{2}$/.test(s||'')?s:'';
  const ymdL=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const pdL=s=>{const[y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)};
  const todayL=()=>ymdL(new Date()),addL=(s,n)=>{const d=pdL(s);d.setDate(d.getDate()+n);return ymdL(d)};
  const diffDays=(a,b)=>Math.round((pdL(b)-pdL(a))/864e5);
  const dowL=s=>(pdL(s).getDay()+6)%7;
  function normRep(r){if(!r||typeof r!=='object')return null;const t=['daily','weekdays','weekly','days','monthly','interval'].includes(r.type)?r.type:'daily';
    return{type:t,every:Math.max(1,Math.min(365,+r.every||1)),days:[...new Set((Array.isArray(r.days)?r.days:[]).map(Number).filter(x=>x>=0&&x<7))].sort(),from:D(r.from)||todayL(),until:D(r.until),carry:r.carry==='keep'?'keep':'move'}}
  function norm(o){const t={id:String(o.id),title:String(o.title||'').slice(0,300),desc:String(o.desc||'').slice(0,4000),start:D(o.start),due:D(o.due),date:D(o.date),
      prio:Math.max(0,Math.min(3,o.prio==null?1:+o.prio)),status:['todo','doing','done','later'].includes(o.status)?o.status:'todo',cat:String(o.cat||''),
      tags:[...new Set((Array.isArray(o.tags)?o.tags:[]).map(x=>String(x).toLocaleLowerCase('tr').replace(/^#/,'').trim()).filter(Boolean))].slice(0,12),
      subs:(Array.isArray(o.subs)?o.subs:[]).slice(0,60).map(s=>({id:String(s.id||nid('s')),t:String(s.t||'').slice(0,200),done:!!s.done})),
      proj:String(o.proj||''),note:String(o.note||'').slice(0,8000),order:Number.isFinite(+o.order)?+o.order:now(),doneAt:+o.doneAt||0,moved:+o.moved||0,
      series:String(o.series||''),occ:D(o.occ),isSeries:!!o.isSeries,rep:o.isSeries?normRep(o.rep):null,created:+o.created||now(),updated:+o.updated||now()};return t}
  const normProj=p=>({id:String(p.id),name:String(p.name||'Proje').slice(0,60),color:/^#[0-9a-f]{6}$/i.test(p.color||'')?p.color:'#3E63DD',icon:String(p.icon||'📁').slice(0,4),desc:String(p.desc||'').slice(0,400),archived:!!p.archived});
  const say=m=>{try{toast(m)}catch{}};
  function localSave(){try{localStorage.setItem(LKEY,JSON.stringify({projs,tasks:[...tasks.values()]}))}catch{say('Görevler kaydedilemedi — tarayıcı depolaması dolu olabilir')}}
  const put=t=>mode==='local'?localSave():ref.tasks.doc(t.id).set(t).catch(e=>say('Kaydedilemedi: '+(e.code||e.message)));
  const delDoc=id=>mode==='local'?localSave():ref.tasks.doc(id).delete().catch(()=>{});
  const putProjs=()=>mode==='local'?localSave():ref.doc.set({projs,updated:now()},{merge:true}).catch(e=>say('Projeler kaydedilemedi: '+(e.code||e.message)));
  let emT=0;function emit(w){ver++;for(const f of subs)try{f(w)}catch(e){console.error(e)}}const emitSoon=w=>{clearTimeout(emT);emT=setTimeout(()=>emit(w),40)};

  /* ── tekrar kuralı: bu gün bir örnek düşüyor mu? ── */
  function matches(r,d){if(!r||d<r.from||(r.until&&d>r.until))return false;const n=diffDays(r.from,d),w=dowL(d);
    switch(r.type){case'daily':return n%r.every===0;case'interval':return n%r.every===0;case'weekdays':return w<5;
      case'weekly':return w===dowL(r.from)&&Math.floor(n/7)%r.every===0;
      case'days':{const wk=Math.floor((diffDays(addL(r.from,-dowL(r.from)),d))/7);return r.days.includes(w)&&wk%r.every===0}
      case'monthly':{const a=pdL(r.from),b=pdL(d),months=(b.getFullYear()-a.getFullYear())*12+b.getMonth()-a.getMonth();if(months%r.every)return false;const last=new Date(b.getFullYear(),b.getMonth()+1,0).getDate();return b.getDate()===Math.min(a.getDate(),last)}}
    return false}
  const occId=(s,d)=>`${s.id}~${d}`;
  function instanceOf(s,d){return norm({id:occId(s,d),title:s.title,desc:s.desc,prio:s.prio,cat:s.cat,tags:s.tags,proj:s.proj,subs:s.subs.map(x=>({t:x.t,done:false})),date:d,occ:d,series:s.id,order:s.order,status:'todo'})}
  /* gün başında: bugünün örnekleri (+ 'taşı' kuralında kaçırılan son gün) — kimlik deterministik, tekrar oluşmaz */
  function ensure(){if(!ready)return 0;const t=todayL();let n=0;
    for(const s of tasks.values()){if(!s.isSeries||!s.rep)continue;
      if(matches(s.rep,t)&&!tasks.has(occId(s,t))){const i=instanceOf(s,t);tasks.set(i.id,i);put(i);n++}
      if(s.rep.carry==='move'){for(let k=1;k<=14;k++){const d=addL(t,-k);if(d<s.rep.from)break;if(matches(s.rep,d)){if(!tasks.has(occId(s,d))&&d>=addL(t,-7)){const i=instanceOf(s,d);tasks.set(i.id,i);put(i);n++}break}}}}
    if(n)emit('tasks');return n}
  /* sanal örnekler: aralıkta henüz kaydı olmayan gelecek günler (sadece gösterim) */
  function virtuals(a,b){const out=[],t=todayL();for(const s of tasks.values()){if(!s.isSeries||!s.rep)continue;
      for(let d=a>t?a:addL(t,1);d<=b;d=addL(d,1)){if(matches(s.rep,d)&&!tasks.has(occId(s,d))){const v=instanceOf(s,d);v.virtual=true;out.push(v)}}}return out}
  function materialize(t){if(!t?.virtual)return t;const real=tasks.get(t.id);if(real)return real;const{virtual,...r}=t;const n=norm(r);tasks.set(n.id,n);put(n);return n}

  function startLocal(){mode='local';try{const d=JSON.parse(localStorage.getItem(LKEY)||'null');if(d){(d.tasks||[]).forEach(o=>{const t=norm(o);tasks.set(t.id,t)});projs=(d.projs||[]).map(normProj)}}catch{}ready=true;ensure();emit('all')}
  function startCloud(fs){mode='cloud';const doc=fs.collection('hub').doc('time');ref={doc,tasks:doc.collection('tasks')};
    return new Promise(res=>{let left=2;const done=()=>{if(--left===0&&!ready){ready=true;res();ensure();emit('all')}};
      let f1=true;unsubs.push(ref.tasks.onSnapshot(s=>{s.docChanges().forEach(ch=>{if(ch.doc.metadata.hasPendingWrites&&!f1)return;if(ch.type==='removed')tasks.delete(ch.doc.id);else tasks.set(ch.doc.id,norm({...ch.doc.data(),id:ch.doc.id}))});if(f1){f1=false;done()}else emitSoon('tasks')},e=>{say('Görev senkron hatası: '+(e.code||e.message));if(f1){f1=false;done()}}));
      let f2=true;unsubs.push(ref.doc.onSnapshot(s=>{if(s.metadata.hasPendingWrites&&!f2)return;const d=s.data()||{};projs=(Array.isArray(d.projs)?d.projs:[]).map(normProj);if(f2){f2=false;done()}else emitSoon('projs')},()=>{if(f2){f2=false;done()}}));
      setTimeout(()=>{if(!ready){ready=true;res();ensure();emit('all')}},8000)})}
  function stop(){unsubs.forEach(u=>{try{u()}catch{}});unsubs=[];tasks.clear();projs=[];ready=false}
  function add(o){const t=norm({...o,id:o.id||nid('T_'),created:now(),updated:now()});tasks.set(t.id,t);put(t);if(t.isSeries)ensure();emit('tasks');return t}
  function save(t,quiet){const real=t.virtual?materialize(t):t;real.updated=now();const n=norm({...real,...t,virtual:undefined});tasks.set(n.id,n);put(n);if(n.isSeries)ensure();if(!quiet)emit('tasks');return n}
  function del(id){const t=tasks.get(id);if(!t)return null;tasks.delete(id);delDoc(id);emit('tasks');return t}
  function restore(t){if(!t)return;tasks.set(t.id,t);put(t);emit('tasks')}
  function setStatus(t,st){const r=materialize(t);r.status=st;r.doneAt=st==='done'?now():0;if(st==='done'&&r.subs.length)r.subs.forEach(s=>s.done=true);return save(r)}
  function setDate(t,d){const r=materialize(t);if(r.date&&d&&d>r.date)r.moved=(r.moved||0)+1;r.date=d||'';if(r.status==='later'&&d)r.status='todo';return save(r)}
  function setProjs(list){projs=list.map(normProj);putProjs();emit('projs')}
  function addProj(o){const p=normProj({...o,id:nid('P_')});projs.push(p);putProjs();emit('projs');return p}
  const proj=id=>projs.find(p=>p.id===id)||null;
  const list=()=>[...tasks.values()].filter(t=>!t.isSeries);
  const series=()=>[...tasks.values()].filter(t=>t.isSeries);
  const dayOf=t=>t.date||t.due||'';
  return{tasks,get projs(){return projs},get ready(){return ready},get ver(){return ver},get mode(){return mode},startLocal,startCloud,stop,add,save,del,restore,setStatus,setDate,setProjs,addProj,proj,list,series,dayOf,
    matches,ensure,virtuals,materialize,norm,normRep,occId,on:f=>{subs.add(f);return()=>subs.delete(f)}}})();

/* ════════════════════════════════════════════════════════════
   Görev görünümleri
   ════════════════════════════════════════════════════════════ */
const Tasks=(()=>{
  const $=s=>document.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
  const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const lsg=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}},lss=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
  const PRIO=[['Düşük','#8B8D98'],['Normal','#3E63DD'],['Yüksek','#F76B15'],['Acil','#E5484D']];
  const STS={todo:'Yapılacak',doing:'Devam ediyor',done:'Tamamlandı',later:'Ertelendi'};
  const WDS=['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'];
  const SV=p=>`<svg class="i" viewBox="0 0 16 16">${p}</svg>`;
  const I={plus:SV('<path d="M8 3v10M3 8h10"/>'),x:SV('<path d="M4 4l8 8M12 4l-8 8"/>'),rep:SV('<path d="M3 6.5A5 5 0 0 1 12 5M13 9.5A5 5 0 0 1 4 11"/><path d="M12 2.5V5H9.5M4 13.5V11h2.5"/>'),
    later:SV('<path d="M3 8h8M8 4.5L11.5 8 8 11.5M13 3v10"/>'),trash:SV('<path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 9h5.8l.6-9"/>'),cal:SV('<rect x="2.5" y="3" width="11" height="10.5" rx="2"/><path d="M2.5 6.5h11"/>'),
    flag:SV('<path d="M4 14V2.5M4 3h7.5l-1.5 3 1.5 3H4"/>'),sub:SV('<path d="M4 3v6.5a1.5 1.5 0 0 0 1.5 1.5H12M9.5 8.5L12 11l-2.5 2.5"/>'),grip:SV('<circle cx="6" cy="4" r=".9" fill="currentColor"/><circle cx="10" cy="4" r=".9" fill="currentColor"/><circle cx="6" cy="8" r=".9" fill="currentColor"/><circle cx="10" cy="8" r=".9" fill="currentColor"/><circle cx="6" cy="12" r=".9" fill="currentColor"/><circle cx="10" cy="12" r=".9" fill="currentColor"/>'),
    l:SV('<path d="M10 3.5L5.5 8l4.5 4.5"/>'),r:SV('<path d="M6 3.5L10.5 8 6 12.5"/>')};
  let st=Object.assign({scope:'today',layout:'list',sort:'manual',proj:'',wk:0},lsg('tasks:ui',{})),open=null,busy=false;
  const saveUI=()=>lss('tasks:ui',st);
  const T=()=>today(),add=(s,n)=>addDays(s,n),dl=s=>dayLabel(s);
  const weekStart=d=>add(d,-((pd(d).getDay()+6)%7));

  /* ── hızlı ekleme: “Matematik çalış pzt çar cum !yüksek #sat @SAT Hazırlığı” ── */
  const WDK=[['pazartesi','pzt','pts'],['salı','sali','sal'],['çarşamba','carsamba','çar','car','çrş'],['perşembe','persembe','per','prş'],['cuma','cum'],['cumartesi','cmt'],['pazar','paz']];
  const wdIdx=w=>{w=w.toLocaleLowerCase('tr').replace(/[,.]$/,'');return WDK.findIndex(a=>a.includes(w))};
  function parse(q,def={}){let s=' '+String(q||'').replace(/\s+/g,' ').trim()+' ',prio=def.prio??1,tags=[],proj=def.proj||'',rep=null,date=def.date??'';
    const take=(rx,f)=>{const m=s.match(rx);if(m){f(m);s=s.replace(m[0],' ')}return m};
    take(/\s!(acil|1)\s/i,()=>prio=3)||take(/\s!(yüksek|yuksek|2)\s/i,()=>prio=2)||take(/\s!(normal|3)\s/i,()=>prio=1)||take(/\s!(düşük|dusuk|4)\s/i,()=>prio=0);
    let m;while((m=s.match(/\s#([^\s#!@]+)/))){tags.push(m[1]);s=s.replace(m[0],' ')}
    take(/\s@([^#!]+?)(?=\s[#!]|\s*$)/,m=>{const n=m[1].trim();let p=TK.projs.find(x=>x.name.toLocaleLowerCase('tr')===n.toLocaleLowerCase('tr'))||TK.projs.find(x=>x.name.toLocaleLowerCase('tr').startsWith(n.toLocaleLowerCase('tr')));if(!p)p=TK.addProj({name:n});proj=p.id});
    const R=(type,o={})=>rep={type,every:1,days:[],...o};
    take(/\s(her\s?gün|hergün|günlük)\s/i,()=>R('daily'))||take(/\s(her\s)?hafta\s?içi\s/i,()=>R('weekdays'))||take(/\s(her\s)?hafta\s?sonu\s/i,()=>R('days',{days:[5,6]}))||
      take(/\sher\s(\d+)\s(gün|gun)(de bir)?\s/i,x=>R('interval',{every:+x[1]}))||take(/\sher\s(\d+)\shafta(da bir)?\s/i,x=>R('weekly',{every:+x[1]}))||take(/\sher\s(\d+)\say(da bir)?\s/i,x=>R('monthly',{every:+x[1]}))||
      take(/\sher\shafta\s/i,()=>R('weekly'))||take(/\s(her\say|aylık)\s/i,()=>R('monthly'));
    /* gün listesi: “pzt çar cum”, “her salı”, “pazartesi, çarşamba ve cuma” */
    const w=s.trim().split(' ');let i=0;while(i<w.length){let j=i,ds=[],her=w[i]&&w[i].toLocaleLowerCase('tr')==='her';if(her)j++;
      while(j<w.length){const lw=w[j].toLocaleLowerCase('tr');if(lw==='ve'||lw===','){j++;continue}const x=wdIdx(lw);if(x<0)break;ds.push(x);j++}
      if((ds.length>=2||(her&&ds.length===1))&&!rep){R('days',{days:ds});w.splice(i,j-i);break}i++}
    s=' '+w.join(' ')+' ';
    if(!rep){const ws=s.trim().split(' ');for(let n=3;n>=1&&ws.length;n--)for(let k=0;k+n<=ws.length;k++){const d=parseTR(ws.slice(k,k+n).join(' '));if(d){date=d;ws.splice(k,n);n=0;break}}s=' '+ws.join(' ')+' '}
    return{title:s.replace(/\s+/g,' ').trim(),prio,tags,proj,rep,date}}
  function quick(q,def={}){const p=parse(q,def);if(!p.title){toast('Görev adı boş');return null}
    if(p.rep){const from=p.date||T();const s=TK.add({title:p.title,prio:p.prio,tags:p.tags,proj:p.proj,isSeries:true,rep:{...p.rep,from,carry:'move'}});
      toast(`↻ ${p.title} · ${repText(s.rep)}`);return s}
    const t=TK.add({title:p.title,prio:p.prio,tags:p.tags,proj:p.proj,date:p.date,order:minOrder(p.date)-1});toast(`${p.title} · ${p.date?dl(p.date):'Gelen kutusu'}`);return t}
  const minOrder=d=>Math.min(Date.now(),...TK.list().filter(t=>TK.dayOf(t)===d).map(t=>t.order));
  function repText(r){if(!r)return'';const ev=r.every>1?r.every+' ':'';const base={daily:r.every>1?`${r.every} günde bir`:'Her gün',weekdays:'Hafta içi her gün',weekly:r.every>1?`${r.every} haftada bir ${WDS[(pd(r.from).getDay()+6)%7]}`:`Her hafta ${WDS[(pd(r.from).getDay()+6)%7]}`,
      days:(r.every>1?`${r.every} haftada bir `:'Her ')+r.days.map(d=>WDS[d]).join(', '),monthly:r.every>1?`${r.every} ayda bir, ayın ${pd(r.from).getDate()}.`:`Her ay ${pd(r.from).getDate()}.`,interval:`${ev}günde bir`}[r.type];return base+(r.until?` · ${fmtShort(r.until)} tarihine kadar`:'')}

  /* ── kapsam ── */
  function scoped(scope){const t=T(),L=TK.list(),day=TK.dayOf;let out;
    if(scope==='today')out=L.filter(x=>(day(x)===t&&x.status!=='later')||(day(x)&&day(x)<t&&x.status!=='done'&&x.status!=='later'&&!(x.series&&TK.tasks.get(x.series)?.rep?.carry==='keep'))||(x.status==='done'&&x.doneAt&&ymd(new Date(x.doneAt))===t&&day(x)!==t&&!day(x)));
    else if(scope==='tomorrow'){const d=add(t,1);out=[...L.filter(x=>day(x)===d),...TK.virtuals(d,d)]}
    else if(scope==='week'){const a=t,b=add(weekStart(t),6);out=[...L.filter(x=>day(x)>=a&&day(x)<=b),...TK.virtuals(add(t,1),b)]}
    else if(scope==='upcoming'){const b=add(t,30);out=[...L.filter(x=>day(x)>t&&x.status!=='done'),...TK.virtuals(add(t,1),b)]}
    else if(scope==='inbox')out=L.filter(x=>!day(x)&&x.status!=='done');
    else if(scope==='later')out=L.filter(x=>x.status==='later');
    else if(scope==='done')out=L.filter(x=>x.status==='done').sort((a,b)=>b.doneAt-a.doneAt).slice(0,200);
    else if(scope==='proj')out=L.filter(x=>x.proj===st.proj);
    else out=L;return out}
  const sorter=(a,b)=>st.sort==='prio'?(b.prio-a.prio)||((TK.dayOf(a)||'9')>(TK.dayOf(b)||'9')?1:-1):(a.order-b.order)||(b.prio-a.prio);
  const COUNTS=()=>({today:scoped('today').filter(x=>x.status!=='done').length,inbox:scoped('inbox').length,later:scoped('later').length});

  /* ── satır ── */
  function row(t,o={}){const p=TK.proj(t.proj),sd=t.subs.filter(s=>s.done).length,d=TK.dayOf(t),late=d&&d<T()&&t.status!=='done',sr=t.series&&TK.tasks.get(t.series);
    return`<div class="tk-row${t.status==='done'?' done':''}${t.virtual?' virt':''}${open===t.id?' sel':''}" data-tid="${E(t.id)}" draggable="${o.drag!==false}" style="--p:${PRIO[t.prio][1]}">
      ${o.drag!==false&&st.sort==='manual'?`<span class="tk-grip" aria-hidden="true">${I.grip}</span>`:''}
      <button class="tk-chk p${t.prio}${t.status==='done'?' on':''}" data-tchk aria-label="${t.status==='done'?'Geri al':'Tamamla'}: ${E(t.title)}" aria-pressed="${t.status==='done'}"></button>
      <span class="tk-main"><span class="tk-t">${E(t.title)}</span><span class="tk-m">
        ${d&&!o.hideDate?`<span class="tk-d${late?' late':''}">${I.cal}${E(dl(d))}</span>`:''}${t.due&&t.due!==d?`<span class="tk-d${t.due<T()&&t.status!=='done'?' late':''}">${I.flag}${E(dl(t.due))}</span>`:''}
        ${sr?`<span class="tk-r" title="${E(repText(sr.rep))}">${I.rep}</span>`:''}${t.subs.length?`<span class="tk-s">${I.sub}${sd}/${t.subs.length}</span>`:''}
        ${t.status==='doing'?'<span class="tk-st doing">Devam ediyor</span>':t.status==='later'?'<span class="tk-st later">Ertelendi</span>':''}
        ${t.tags.map(x=>`<span class="tk-tag">#${E(x)}</span>`).join('')}${p&&!o.hideProj?`<span class="tk-p" style="--c:${p.color}">${E(p.icon)} ${E(p.name)}</span>`:''}${t.note||t.desc?'<span class="tk-n" title="Not var">¶</span>':''}</span></span>
      ${t.status!=='done'?`<button class="tk-ib" data-tlater title="Yarına ertele" aria-label="Yarına ertele">${I.later}</button>`:''}</div>`}

  /* ═════ ANA GÖRÜNÜM ═════ */
  function render(){setCrumb(SV('<rect x="2.5" y="2.5" width="11" height="11" rx="3"/><path d="M5.5 8.2l1.8 1.8 3.4-3.6"/>'),'Görevler');const c=COUNTS();
    const scopes=[['today','Bugün',c.today],['tomorrow','Yarın'],['week','Bu hafta'],['upcoming','Yaklaşan'],['inbox','Gelen kutusu',c.inbox],['later','Ertelenen',c.later],['done','Tamamlanan']];
    const lay=[['list','Liste'],['board','Kanban'],['cal','Takvim'],['proj','Projeler'],['rep','Tekrarlayan']];
    let body='';if(st.layout==='list')body=listView();else if(st.layout==='board')body=boardView();else if(st.layout==='cal')body=calView();else if(st.layout==='proj')body=projView();else body=repView();
    $('#view').innerHTML=`<div class="tk-wrap${st.layout==='cal'||st.layout==='board'?' wide':''}"><div class="tk-head"><h1>Görevler</h1><div class="tm-mseg" role="tablist" aria-label="Görünüm">${lay.map(([k,l])=>`<button data-tklay="${k}" class="${st.layout===k?'on':''}" role="tab" aria-selected="${st.layout===k}">${l}</button>`).join('')}</div></div>
      ${st.layout==='list'||st.layout==='board'?`<nav class="tk-scopes" aria-label="Kapsam">${scopes.map(([k,l,n])=>`<button data-tkscope="${k}" class="${st.scope===k?'on':''}">${l}${n?`<em>${n}</em>`:''}</button>`).join('')}</nav>`:''}
      <form class="tm-qa tk-qa" data-tkadd><span class="tm-qa-i">${I.plus}</span><input name="q" autocomplete="off" aria-label="Görev ekle" placeholder="${E(st.layout==='proj'&&st.proj?'Bu projeye görev ekle…':'Görev ekle — ör. “Matematik çalış pzt çar cum”, “rapor yarın !acil #okul @SAT Hazırlığı”')}"><button class="tm-qa-b" type="submit">Ekle</button></form>
      ${body}</div>${open?detailHTML():''}`;
    if(open)bindDetail()}
  function listView(){let L=scoped(st.scope);const t=T();if(!L.length)return empty(st.scope);
    if(st.scope==='today'){const late=L.filter(x=>TK.dayOf(x)&&TK.dayOf(x)<t&&x.status!=='done').sort(sorter),now=L.filter(x=>!late.includes(x)&&x.status!=='done').sort(sorter),done=L.filter(x=>x.status==='done');
      return`${sortBar(now.length+late.length,done.length)}${late.length?`<div class="sh late"><span>Gecikmiş · ${late.length}</span><span class="rule"></span><button class="tk-lnk" data-tkall-today>Hepsini bugüne al</button></div><div class="tk-list" data-drop-day="${t}">${late.map(x=>row(x)).join('')}</div>`:''}
        <div class="sh"><span>${E(fmtLong(t))}</span><span class="rule"></span></div><div class="tk-list" data-drop-day="${t}">${now.map(x=>row(x,{hideDate:true})).join('')||'<div class="none">Bugün için açık görev kalmadı. 🎉</div>'}</div>
        ${done.length?`<div class="sh"><span>Bugün tamamlanan · ${done.length}</span><span class="rule"></span></div><div class="tk-list">${done.map(x=>row(x,{hideDate:true,drag:false})).join('')}</div>`:''}`}
    if(['tomorrow','week','upcoming'].includes(st.scope)){const by={};for(const x of L){const d=TK.dayOf(x);(by[d]=by[d]||[]).push(x)}
      return sortBar(L.filter(x=>x.status!=='done').length)+Object.keys(by).sort().map(d=>`<div class="sh"><span>${E(dl(d))} · ${E(fmtWd(d))}</span><span class="rule"></span></div><div class="tk-list" data-drop-day="${d}">${by[d].sort(sorter).map(x=>row(x,{hideDate:true})).join('')}</div>`).join('')}
    if(st.scope==='inbox')return`<p class="tm-mut tk-hint">Tarihsiz görevler burada bekler. Sürükleyip Takvim görünümünde bir güne bırak ya da ayrıntıdan tarih ver.</p><div class="tk-list" data-drop-day="">${L.sort(sorter).map(x=>row(x)).join('')}</div>`;
    return`<div class="tk-list">${L.sort(st.scope==='done'?()=>0:sorter).map(x=>row(x,{drag:st.scope!=='done'})).join('')}</div>`}
  const sortBar=(open,done)=>`<div class="tk-sort"><span class="tm-mut">${open} açık${done?` · ${done} tamamlandı`:''}</span><div class="tm-mseg">${[['manual','Benim sıram'],['prio','Önceliğe göre']].map(([k,l])=>`<button data-tksort="${k}" class="${st.sort===k?'on':''}">${l}</button>`).join('')}</div></div>`;
  const empty=s=>`<div class="tm-empty"><b>${{today:'Bugün için görev yok',tomorrow:'Yarın boş',week:'Bu hafta görev yok',upcoming:'Yaklaşan görev yok',inbox:'Gelen kutusu boş',later:'Ertelenen görev yok',done:'Henüz tamamlanan yok'}[s]||'Görev yok'}</b><p>Yukarıya yaz ve Enter'a bas. Tekrarlayan görev için “her gün”, “hafta içi” ya da “pzt çar cum” yazman yeterli.</p></div>`;
  /* Kanban: durumlara göre */
  function boardView(){const L=scoped(st.scope==='done'?'all':st.scope).filter(x=>!x.virtual),cols=[['todo','Yapılacak'],['doing','Devam ediyor'],['later','Ertelendi'],['done','Tamamlandı']];
    const src=st.scope==='today'?[...L,...TK.list().filter(x=>x.status==='later')]:L;const uniq=[...new Map(src.map(x=>[x.id,x])).values()];
    return`<div class="tk-board">${cols.map(([k,l])=>{const it=uniq.filter(x=>x.status===k).sort(sorter);return`<section class="tk-col" data-drop-st="${k}"><header><b>${l}</b><em>${it.length}</em></header><div class="tk-cards">${it.map(x=>row(x,{drag:true})).join('')||'<div class="none">Buraya sürükle</div>'}</div></section>`}).join('')}</div>`}
  /* Takvim: hafta sütunları + gelen kutusu, sürükle-bırak ile tarih ata */
  function calView(){const a=add(weekStart(T()),st.wk*7),days=[...Array(7)].map((_,i)=>add(a,i)),L=TK.list(),V=TK.virtuals(days[0],days[6]),inbox=L.filter(x=>!TK.dayOf(x)&&x.status!=='done').sort(sorter);
    return`<div class="tk-wk-h"><b>${fmtShort(days[0])} – ${fmtShort(days[6])}</b><button class="tb" data-tkwk="-1" aria-label="Önceki hafta">${I.l}</button><button class="tb" data-tkwk="0">Bu hafta</button><button class="tb" data-tkwk="1" aria-label="Sonraki hafta">${I.r}</button></div>
      <div class="tk-wk"><section class="tk-day inbox" data-drop-day=""><header><b>Gelen kutusu</b><em>${inbox.length}</em></header>${inbox.map(x=>row(x,{hideDate:true})).join('')||'<div class="none">Boş</div>'}</section>
      ${days.map(d=>{const it=[...L.filter(x=>TK.dayOf(x)===d),...V.filter(x=>x.date===d)].sort(sorter);return`<section class="tk-day${d===T()?' today':''}" data-drop-day="${d}"><header><b>${WDS[(pd(d).getDay()+6)%7]} ${pd(d).getDate()}</b><em>${it.filter(x=>x.status!=='done').length||''}</em></header>${it.map(x=>row(x,{hideDate:true})).join('')}<button class="tk-dadd" data-tkdayadd="${d}">${I.plus}Ekle</button></section>`}).join('')}</div>`}
  /* Projeler */
  function projView(){if(st.proj&&TK.proj(st.proj)){const p=TK.proj(st.proj),L=TK.list().filter(x=>x.proj===p.id),dn=L.filter(x=>x.status==='done').length,pc=L.length?Math.round(100*dn/L.length):0;
      return`<div class="tk-ph"><button class="tb" data-tkproj="" aria-label="Projelere dön">${I.l}</button><span class="tk-pi" style="--c:${p.color}">${E(p.icon)}</span><div><input class="tk-pn" data-pname="${p.id}" value="${E(p.name)}" aria-label="Proje adı"><div class="tk-pb"><i style="width:${pc}%;background:${p.color}"></i></div><small class="tm-mut">${dn}/${L.length} görev · %${pc}</small></div></div>
        <div class="tk-list" data-drop-day="-">${L.filter(x=>x.status!=='done').sort(sorter).map(x=>row(x,{hideProj:true})).join('')||'<div class="none">Açık görev yok.</div>'}</div>${dn?`<div class="sh"><span>Tamamlanan · ${dn}</span><span class="rule"></span></div><div class="tk-list">${L.filter(x=>x.status==='done').map(x=>row(x,{hideProj:true,drag:false})).join('')}</div>`:''}
        <div class="tk-pact"><input type="color" value="${p.color}" data-pcolor="${p.id}" aria-label="Proje rengi"><input class="tk-pe" value="${E(p.icon)}" data-picon="${p.id}" maxlength="4" aria-label="Proje simgesi"><button class="tm-btn ghost" data-parch="${p.id}">${p.archived?'Arşivden çıkar':'Arşivle'}</button><button class="tm-btn ghost" data-pdel="${p.id}">${I.trash}Projeyi sil</button></div>`}
    const P=TK.projs;return`<div class="tk-projs">${P.filter(p=>!p.archived).map(projCard).join('')}<button class="tk-pnew" data-pnew>${I.plus}Yeni proje</button></div>${P.some(p=>p.archived)?`<div class="sh"><span>Arşiv</span><span class="rule"></span></div><div class="tk-projs">${P.filter(p=>p.archived).map(projCard).join('')}</div>`:''}`}
  function projCard(p){const L=TK.list().filter(x=>x.proj===p.id),dn=L.filter(x=>x.status==='done').length,pc=L.length?Math.round(100*dn/L.length):0,next=L.filter(x=>x.status!=='done').sort((a,b)=>(TK.dayOf(a)||'9').localeCompare(TK.dayOf(b)||'9'))[0];
    return`<button class="tk-pc" data-tkproj="${p.id}" style="--c:${p.color}"><span class="tk-pi">${E(p.icon)}</span><b>${E(p.name)}</b><div class="tk-pb"><i style="width:${pc}%"></i></div><small>${dn}/${L.length} görev · %${pc}${next?` · sıradaki: ${E(next.title)}`:''}</small></button>`}
  /* Tekrarlayan görevler: kurallar ve devamlılık */
  function repView(){const S=TK.series();if(!S.length)return`<div class="tm-empty"><b>Tekrarlayan görev yok</b><p>“Matematik çalış pzt çar cum”, “Spor her gün” ya da “Kitap oku hafta içi” yaz. Her gün kendi örneği oluşur; bir günü tamamlamak diğerini etkilemez.</p></div>`;
    return`<div class="tk-reps">${S.map(s=>{const k=streak(s);return`<div class="tk-rp${s.rep.until&&s.rep.until<T()?' off':''}" data-tid="${s.id}"><span class="tk-r">${I.rep}</span><span class="tk-main"><span class="tk-t">${E(s.title)}</span><span class="tk-m"><span>${E(repText(s.rep))}</span><span>· kaçırılınca ${s.rep.carry==='move'?'ertesi güne taşınır':'o günde kalır'}</span></span></span>
      <span class="tk-sk" title="Son 30 gündeki tamamlanma">${k.dots}</span><span class="tk-sn"><b>${k.cur}</b> gün seri<br><small>%${k.rate} · 30 gün</small></span></div>`}).join('')}</div>`}
  function streak(s){const t=T();let cur=0,dots='',due=0,dn=0;
    for(let i=29;i>=0;i--){const d=add(t,-i);if(!TK.matches(s.rep,d)){dots+='<i class="na"></i>';continue}const x=TK.tasks.get(TK.occId(s,d)),ok=x&&x.status==='done';if(d<t||ok){due++;if(ok)dn++}dots+=`<i class="${ok?'ok':d<t?'miss':''}" title="${fmtShort(d)}: ${ok?'tamamlandı':d<t?'tamamlanmadı':'bugün'}"></i>`}
    for(let d=t,k=0;k<400;k++,d=add(d,-1)){if(d<s.rep.from)break;if(!TK.matches(s.rep,d))continue;const x=TK.tasks.get(TK.occId(s,d));if(x&&x.status==='done')cur++;else if(d!==t)break}
    return{cur,dots,rate:due?Math.round(100*dn/due):0}}

  /* ═════ AYRINTI PANELİ ═════ */
  function find(id){return TK.tasks.get(id)||(()=>{const[s,d]=String(id).split('~');const S=TK.tasks.get(s);if(!S||!d)return null;const v=TK.virtuals(d,d).find(x=>x.id===id);return v||null})()}
  function detailHTML(){const t=find(open);if(!t){open=null;return''}const ser=t.isSeries?t:t.series?TK.tasks.get(t.series):null,r=ser?.rep;
    return`<aside class="tk-dp" role="dialog" aria-label="Görev ayrıntısı"><div class="tk-dp-h">${t.isSeries?`<span class="tm-mut">${I.rep} Tekrar şablonu</span>`:`<button class="tk-chk big p${t.prio}${t.status==='done'?' on':''}" data-dchk aria-label="Tamamla"></button>`}<span style="flex:1"></span><button class="tk-ib" data-dclose aria-label="Kapat">${I.x}</button></div>
      <textarea class="tk-dt" data-f="title" rows="1" aria-label="Görev adı">${E(t.title)}</textarea>
      <div class="tk-props">
        ${t.isSeries?'':`<label>Durum</label><div class="tm-mseg">${Object.entries(STS).map(([k,l])=>`<button data-dst="${k}" class="${t.status===k?'on':''}">${l}</button>`).join('')}</div>`}
        <label>Öncelik</label><div class="tm-mseg">${PRIO.map(([l,c],i)=>`<button data-dprio="${i}" class="${t.prio===i?'on':''}"><i class="tk-dot" style="background:${c}"></i>${l}</button>`).join('')}</div>
        ${t.isSeries?'':`<label>Gün</label><div class="tk-dr"><input type="date" data-f="date" value="${t.date}" aria-label="Takvim günü"><button class="tk-lnk" data-dd="${T()}">Bugün</button><button class="tk-lnk" data-dd="${add(T(),1)}">Yarın</button><button class="tk-lnk" data-dd="">Gelen kutusu</button></div>
        <label>Başlangıç</label><input type="date" data-f="start" value="${t.start}" aria-label="Başlangıç tarihi"><label>Son teslim</label><input type="date" data-f="due" value="${t.due}" aria-label="Son teslim tarihi">`}
        <label>Proje</label><select data-f="proj" aria-label="Proje"><option value="">—</option>${TK.projs.map(p=>`<option value="${p.id}"${t.proj===p.id?' selected':''}>${E(p.icon)} ${E(p.name)}</option>`).join('')}<option value="__new">+ Yeni proje…</option></select>
        <label>Kategori</label><select data-f="cat" aria-label="Kategori"><option value="">—</option>${(typeof TM!=='undefined'?TM.cats:[]).map(c=>`<option value="${c.id}"${t.cat===c.id?' selected':''}>${E(c.icon)} ${E(c.name)}</option>`).join('')}</select>
        <label>Etiketler</label><input data-f="tags" value="${E(t.tags.join(', '))}" placeholder="okul, sat" aria-label="Etiketler">
      </div>
      <div class="tk-sec"><b>${I.rep} Tekrar</b>${repEditor(r,!!ser)}</div>
      <div class="tk-sec"><b>${I.sub} Alt görevler ${t.subs.length?`<small>${t.subs.filter(s=>s.done).length}/${t.subs.length}</small>`:''}</b>${t.subs.length?`<div class="tk-pb"><i style="width:${100*t.subs.filter(s=>s.done).length/t.subs.length}%"></i></div>`:''}
        <div class="tk-subs">${t.subs.map(s=>`<div class="tk-sub${s.done?' done':''}"><button class="tk-chk sm${s.done?' on':''}" data-sdone="${s.id}" aria-label="Alt görevi tamamla"></button><input value="${E(s.t)}" data-sedit="${s.id}" aria-label="Alt görev"><button class="tk-ib" data-sdel="${s.id}" aria-label="Alt görevi sil">${I.x}</button></div>`).join('')}
        <form data-sadd class="tk-sadd"><input name="s" placeholder="+ Alt görev ekle" aria-label="Alt görev ekle"></form></div></div>
      <div class="tk-sec"><b>Açıklama ve not</b><textarea data-f="desc" rows="2" placeholder="Açıklama">${E(t.desc)}</textarea><textarea data-f="note" rows="4" placeholder="Not — bu göreve bağlı kalır">${E(t.note)}</textarea></div>
      <div class="tk-dp-f">${t.virtual?'<span class="tm-mut">Bu, tekrarın gelecekteki örneği; değiştirince kaydı oluşur.</span>':''}<span style="flex:1"></span><button class="tm-btn ghost" data-ddel>${I.trash}${t.isSeries?'Tekrarı sil':'Sil'}</button></div></aside>`}
  function repEditor(r,on){const types=[['','Tekrar yok'],['daily','Her gün'],['weekdays','Hafta içi'],['weekly','Her hafta'],['days','Belirli günler'],['monthly','Her ay'],['interval','Belirli aralıkla']];
    if(!on)return`<select data-rep="type" aria-label="Tekrar">${types.map(([k,l])=>`<option value="${k}">${l}</option>`).join('')}</select>`;
    return`<select data-rep="type" aria-label="Tekrar türü">${types.map(([k,l])=>`<option value="${k}"${(r?.type||'')===k?' selected':''}>${l}</option>`).join('')}</select>
      ${r.type==='days'?`<div class="tk-wds">${WDS.map((w,i)=>`<button data-rday="${i}" class="${r.days.includes(i)?'on':''}" aria-pressed="${r.days.includes(i)}">${w}</button>`).join('')}</div>`:''}
      ${['daily','weekly','days','monthly','interval'].includes(r.type)?`<label class="tk-ev">Her <input type="number" min="1" max="365" value="${r.every}" data-rep="every" aria-label="Aralık"> ${{daily:'günde',weekly:'haftada',days:'haftada',monthly:'ayda',interval:'günde'}[r.type]} bir</label>`:''}
      <div class="tk-dr"><label class="tm-mut">Başlangıç <input type="date" value="${r.from}" data-rep="from" aria-label="Tekrar başlangıcı"></label><label class="tm-mut">Bitiş <input type="date" value="${r.until}" data-rep="until" aria-label="Tekrar bitişi"></label></div>
      <div class="tm-mseg"><button data-rcarry="move" class="${r.carry==='move'?'on':''}">Yapılmazsa ertesi güne taşı</button><button data-rcarry="keep" class="${r.carry==='keep'?'on':''}">O günde bırak</button></div>
      <p class="tm-mut">${E(repText(r))}. Kural değişikliği sadece bugünden sonrasını etkiler; geçmiş günlerin kaydı korunur.</p>
      ${r.until&&r.until<T()?`<button class="tm-btn" data-rresume>Tekrarı yeniden başlat</button>`:`<button class="tm-btn ghost" data-rstop>Tekrarı durdur</button>`}`}
  /* tekrar şablonu: örnekten açıldıysa şablonu düzenler */
  function seriesOf(t){return t.isSeries?t:t.series?TK.tasks.get(t.series):null}
  function bindDetail(){const dp=$('.tk-dp');if(!dp)return;const ta=dp.querySelector('.tk-dt');const fit=()=>{ta.style.height='auto';ta.style.height=ta.scrollHeight+'px'};fit();ta.addEventListener('input',fit)}
  function upd(fn,quiet){const t=find(open);if(!t)return;const r=TK.materialize(t);fn(r);const n=TK.save(r,quiet);open=n.id;return n}
  function onDetail(e){const dp=e.target.closest('.tk-dp');if(!dp)return false;const t=find(open);if(!t)return true;const b=e.target.closest('button');
    if(e.type==='click'&&b){
      if(b.matches('[data-dclose]')){open=null;render();return true}
      if(b.matches('[data-dchk]')){complete(t);return true}
      if(b.dataset.dst){const n=TK.setStatus(t,b.dataset.dst);open=n.id;render();return true}
      if(b.dataset.dprio){upd(x=>x.prio=+b.dataset.dprio);render();return true}
      if(b.dataset.dd!=null){upd(x=>{x.date=b.dataset.dd;if(x.status==='later'&&x.date)x.status='todo'});render();return true}
      if(b.dataset.sdone){upd(x=>{const s=x.subs.find(s=>s.id===b.dataset.sdone);s.done=!s.done});render();return true}
      if(b.dataset.sdel){upd(x=>x.subs=x.subs.filter(s=>s.id!==b.dataset.sdel));render();return true}
      if(b.dataset.rday){const S=seriesOf(t);const i=+b.dataset.rday;S.rep.days=S.rep.days.includes(i)?S.rep.days.filter(x=>x!==i):[...S.rep.days,i];if(!S.rep.days.length)S.rep.days=[i];TK.save(S);render();return true}
      if(b.dataset.rcarry){const S=seriesOf(t);S.rep.carry=b.dataset.rcarry;TK.save(S);render();return true}
      if(b.matches('[data-rstop]')){const S=seriesOf(t);S.rep.until=addDays(T(),0);TK.save(S);toast('Tekrar durduruldu — geçmiş kayıtlar duruyor');render();return true}
      if(b.matches('[data-rresume]')){const S=seriesOf(t);S.rep.until='';TK.save(S);toast('Tekrar yeniden başladı');render();return true}
      if(b.matches('[data-ddel]')){const g=TK.del(t.id);open=null;render();if(g)Library.toastUndo(`“${t.title}” silindi`,()=>TK.restore(g));return true}}
    if(e.type==='submit'&&e.target.matches('[data-sadd]')){e.preventDefault();const v=e.target.s.value.trim();if(v){upd(x=>x.subs.push({id:'s'+Date.now().toString(36),t:v,done:false}));render();setTimeout(()=>$('[data-sadd] input')?.focus(),10)}return true}
    if(e.type==='change'){const f=e.target.dataset.f,rp=e.target.dataset.rep;
      if(f==='proj'&&e.target.value==='__new'){const n=prompt('Proje adı');if(n){const p=TK.addProj({name:n});upd(x=>x.proj=p.id)}render();return true}
      if(f){const v=e.target.value;upd(x=>{if(f==='tags')x.tags=v.split(/[,\s]+/);else x[f]=v;if(f==='date'&&x.status==='later'&&v)x.status='todo'});if(!['title','desc','note','tags'].includes(f))render();return true}
      if(e.target.dataset.sedit){upd(x=>{const s=x.subs.find(s=>s.id===e.target.dataset.sedit);s.t=e.target.value},true);return true}
      if(rp==='type'){const v=e.target.value;if(t.isSeries||t.series){const S=seriesOf(t);if(!v){S.rep.until=add(T(),-1)<S.rep.from?S.rep.from:add(T(),-1);TK.save(S);toast('Tekrar kapatıldı — mevcut kayıtlar kaldı')}else{S.rep.type=v;if(v==='days'&&!S.rep.days.length)S.rep.days=[(pd(T()).getDay()+6)%7];if(S.rep.from<T())S.rep.from=T();TK.save(S)}}
        else if(v){/* tek görevi tekrara çevir: bu görev ilk örnek olur */const from=t.date||T();const S=TK.add({title:t.title,desc:t.desc,prio:t.prio,cat:t.cat,tags:t.tags,proj:t.proj,subs:t.subs.map(s=>({t:s.t})),isSeries:true,rep:{type:v,days:v==='days'?[(pd(from).getDay()+6)%7]:[],from,carry:'move'}});
          const r=TK.materialize(t);TK.del(r.id);const occ=TK.tasks.get(TK.occId(S,from));if(occ){occ.status=r.status;occ.subs=r.subs;occ.note=r.note;TK.save(occ)}open=occ?occ.id:S.id;toast('Tekrarlayan göreve çevrildi')}
        render();return true}
      if(rp){const S=seriesOf(t);let v=e.target.value;if(rp==='every')v=Math.max(1,+v||1);if(rp==='from'&&!v)return true;S.rep[rp]=v;TK.save(S);render();return true}}
    if(e.type==='input'&&['title','desc','note'].includes(e.target.dataset.f)){clearTimeout(onDetail.t);const f=e.target.dataset.f,v=e.target.value;onDetail.t=setTimeout(()=>{upd(x=>x[f]=f==='title'?v.replace(/\n/g,' '):v,true);if(f==='title'){const r=$(`.tk-row[data-tid="${CSS.escape(open)}"] .tk-t`);if(r)r.textContent=v}},350);return true}
    return true}

  /* ── tamamla: küçük, tatmin edici animasyon ── */
  function complete(t){const was=t.status==='done',rowEl=$(`.tk-row[data-tid="${CSS.escape(t.id)}"]`);const n=TK.setStatus(t,was?'todo':'done');if(open===t.id)open=n.id;
    if(!was&&rowEl&&!matchMedia('(prefers-reduced-motion: reduce)').matches&&document.documentElement.dataset.motion!=='off'){busy=true;rowEl.classList.add('tk-pop');const c=rowEl.querySelector('.tk-chk');c?.classList.add('on');
      setTimeout(()=>{rowEl.classList.add('tk-out');setTimeout(()=>{busy=false;refresh()},260)},420)}else refresh();
    if(!was&&t.series){const k=streak(TK.tasks.get(t.series));if(k.cur>=3)toast(`🔥 ${t.title}: ${k.cur} gün seri`)}}
  function refresh(){if(typeof view!=='undefined'&&view==='tasks')render();else if(typeof renderView==='function'&&['cal','stats','acts'].includes(view))renderView(true)}

  /* ── sürükle-bırak: sırala, güne / duruma / projeye taşı ── */
  let dragId=null;
  function bind(){const v=$('#view');
    v.addEventListener('click',e=>{if(typeof view==='undefined'||!['tasks','cal','stats'].includes(view))return;if(onDetail(e))return;const t=e.target;
      const chk=t.closest('[data-tchk]');if(chk){e.stopPropagation();const x=find(chk.closest('[data-tid]').dataset.tid);if(x)complete(x);return}
      const lt=t.closest('[data-tlater]');if(lt){e.stopPropagation();const x=find(lt.closest('[data-tid]').dataset.tid);if(x){const d=add(TK.dayOf(x)&&TK.dayOf(x)>T()?TK.dayOf(x):T(),1);TK.setDate(x,d);toast(`Ertelendi → ${dl(d)}`)}return}
      const ly=t.closest('[data-tklay]');if(ly){st.layout=ly.dataset.tklay;saveUI();render();return}
      const sc=t.closest('[data-tkscope]');if(sc){st.scope=sc.dataset.tkscope;saveUI();render();return}
      const so=t.closest('[data-tksort]');if(so){st.sort=so.dataset.tksort;saveUI();render();return}
      const wk=t.closest('[data-tkwk]');if(wk){st.wk=+wk.dataset.tkwk?st.wk+ +wk.dataset.tkwk:0;render();return}
      const pj=t.closest('[data-tkproj]');if(pj){st.proj=pj.dataset.tkproj;saveUI();render();return}
      if(t.closest('[data-pnew]')){const n=prompt('Proje adı (ör. SAT Hazırlığı)');if(n){const p=TK.addProj({name:n});st.proj=p.id;saveUI();render()}return}
      const pa=t.closest('[data-parch]');if(pa){const p=TK.proj(pa.dataset.parch);p.archived=!p.archived;TK.setProjs(TK.projs);st.proj='';render();return}
      const pd_=t.closest('[data-pdel]');if(pd_){const p=TK.proj(pd_.dataset.pdel);if(!confirm(`“${p.name}” projesi silinsin mi? Görevler silinmez, projesiz kalır.`))return;for(const x of TK.list())if(x.proj===p.id){x.proj='';TK.save(x,true)}TK.setProjs(TK.projs.filter(x=>x.id!==p.id));st.proj='';render();return}
      if(t.closest('[data-tkall-today]')){for(const x of scoped('today'))if(TK.dayOf(x)&&TK.dayOf(x)<T()&&x.status!=='done')TK.setDate(x,T());toast('Gecikmiş görevler bugüne alındı');return}
      const da=t.closest('[data-tkdayadd]');if(da){const q=prompt(`${dl(da.dataset.tkdayadd)} için görev`);if(q)quick(q,{date:da.dataset.tkdayadd});return}
      const rw=t.closest('[data-tid]');if(rw&&!t.closest('input,select,textarea')){open=rw.dataset.tid;if(view==='tasks')render();else if(typeof go==='function'){st.layout='list';saveUI();go('#tasks')}}});
    for(const ev of['change','input'])v.addEventListener(ev,e=>{if(typeof view!=='undefined'&&view==='tasks'){if(onDetail(e))return;const t=e.target;
      if(ev==='change'&&t.dataset.pname){const p=TK.proj(t.dataset.pname);p.name=t.value.trim()||p.name;TK.setProjs(TK.projs)}
      if(ev==='change'&&t.dataset.pcolor){const p=TK.proj(t.dataset.pcolor);p.color=t.value;TK.setProjs(TK.projs)}
      if(ev==='change'&&t.dataset.picon){const p=TK.proj(t.dataset.picon);p.icon=t.value||'📁';TK.setProjs(TK.projs)}}});
    v.addEventListener('submit',e=>{if(typeof view==='undefined')return;if(view==='tasks'&&onDetail(e))return;const f=e.target;if(!f.matches('[data-tkadd],[data-tkqday]'))return;e.preventDefault();const q=f.q.value.trim();if(!q)return;
      const def={};if(f.dataset.tkqday)def.date=f.dataset.tkqday;else if(st.layout==='proj'&&st.proj)def.proj=st.proj;else if(st.layout==='list'){if(st.scope==='today')def.date=T();else if(st.scope==='tomorrow')def.date=add(T(),1)}
      quick(q,def);f.q.value='';setTimeout(()=>$(f.matches('[data-tkadd]')?'[data-tkadd] input':`[data-tkqday] input`)?.focus(),30)},true);
    v.addEventListener('dragstart',e=>{const r=e.target.closest?.('.tk-row[data-tid]');if(!r)return;dragId=r.dataset.tid;e.dataTransfer.setData('text/x-task',dragId);e.dataTransfer.effectAllowed='move';r.classList.add('dragging');busy=true});
    v.addEventListener('dragend',e=>{e.target.closest?.('.tk-row')?.classList.remove('dragging');$$('.tk-over,.tk-ins').forEach(x=>x.classList.remove('tk-over','tk-ins'));dragId=null;busy=false});
    v.addEventListener('dragover',e=>{if(!dragId)return;const z=e.target.closest('[data-drop-day],[data-drop-st],.cd');if(!z)return;e.preventDefault();$$('.tk-over').forEach(x=>x!==z&&x.classList.remove('tk-over'));z.classList.add('tk-over');
      $$('.tk-ins').forEach(x=>x.classList.remove('tk-ins'));const r=e.target.closest('.tk-row[data-tid]');if(r&&r.dataset.tid!==dragId)r.classList.add('tk-ins')});
    v.addEventListener('drop',e=>{if(!dragId)return;const z=e.target.closest('[data-drop-day],[data-drop-st],.cd');if(!z)return;e.preventDefault();e.stopPropagation();let x=find(dragId);if(!x)return;x=TK.materialize(x);
      const before=e.target.closest('.tk-row[data-tid]');busy=false;
      if(z.dataset.dropSt){x.status=z.dataset.dropSt;x.doneAt=x.status==='done'?Date.now():0}
      else if(z.classList.contains('cd')){x.date=z.dataset.day;if(x.status==='later')x.status='todo';toast(`${x.title} → ${dl(x.date)}`)}
      else if(z.dataset.dropDay!=null&&z.dataset.dropDay!=='-'){const d=z.dataset.dropDay;if(TK.dayOf(x)!==d){if(x.date&&d&&d>x.date)x.moved=(x.moved||0)+1;x.date=d;if(x.status==='later'&&d)x.status='todo';if(!d&&x.due)x.due=''}}
      if(before&&before.dataset.tid!==x.id){const o=find(before.dataset.tid);if(o){const sibs=$$('.tk-row[data-tid]',before.parentElement).map(r=>find(r.dataset.tid)).filter(Boolean),i=sibs.findIndex(s=>s.id===o.id),prev=sibs[i-1];x.order=prev&&prev.id!==x.id?(prev.order+o.order)/2:o.order-1;if(st.sort!=='manual'){st.sort='manual';saveUI()}}}
      TK.save(x);dragId=null},true);
    v.addEventListener('keydown',e=>{const r=e.target.closest?.('.tk-row[data-tid]');if(r&&e.key==='Enter'&&e.target===r){open=r.dataset.tid;render()}});
    addEventListener('keydown',e=>{if(e.key==='Escape'&&open&&typeof view!=='undefined'&&view==='tasks'&&!$('.tm-ed-bg')){open=null;render()}});
    TK.on(()=>{if(!busy&&typeof view!=='undefined'){if(view==='tasks'){const a=document.activeElement,inDp=a&&a.closest?.('.tk-dp')&&a.matches('input,textarea');if(!inDp)render()}else if(['cal','stats'].includes(view))renderView(true)}});
    /* gün dönümü: gece yarısından sonra bugünün tekrar örnekleri oluşur */
    let lastDay=T();setInterval(()=>{if(T()!==lastDay){lastDay=T();TK.ensure();refresh()}},30000);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden&&T()!==lastDay){lastDay=T();TK.ensure();refresh()}})}

  /* ── takvim entegrasyonu ── */
  const forDay=d=>{const L=TK.list().filter(x=>TK.dayOf(x)===d);return d>T()?[...L,...TK.virtuals(d,d)]:L};
  const chip=x=>`<div class="tk-chip${x.status==='done'?' done':''}" draggable="true" data-tid="${E(x.id)}" style="--p:${PRIO[x.prio][1]}" title="${E(x.title)}"><button class="tk-chk xs p${x.prio}${x.status==='done'?' on':''}" data-tchk aria-label="Tamamla"></button><span>${E(x.title)}</span></div>`;
  function monthChips(d){const L=forDay(d);return L.slice(0,3).map(chip).join('')+(L.length>3?`<div class="more">+${L.length-3} görev</div>`:'')}
  function dayList(d){const L=forDay(d).sort(sorter);return`${L.map(x=>row(x,{hideDate:true})).join('')||'<div class="none">Bu güne görev yok.</div>'}<form class="tm-qa tk-qday" data-tkqday="${d}"><span class="tm-qa-i">${I.plus}</span><input name="q" placeholder="Görev ekle…" aria-label="Bu güne görev ekle"></form>`}
  /* ── istatistik ── */
  function statsHTML(a,b){const t=T(),L=TK.list(),inR=L.filter(x=>TK.dayOf(x)>=a&&TK.dayOf(x)<=b&&TK.dayOf(x)<=t),dn=inR.filter(x=>x.status==='done').length,rate=inR.length?Math.round(100*dn/inR.length):0;
    const days=[];for(let d=add(t,-13);d<=t;d=add(d,1))days.push(d);const per=days.map(d=>L.filter(x=>x.doneAt&&ymd(new Date(x.doneAt))===d).length),mx=Math.max(1,...per);
    const post=L.filter(x=>x.status==='later'||x.moved>0),hist=L.filter(x=>x.doneAt).sort((x,y)=>y.doneAt-x.doneAt).slice(0,8),S=TK.series();
    return`<div class="sh"><span>Görevler</span><span class="rule"></span></div>
      <div class="tm-kpis"><div><small>Bugün tamamlanan</small><b>${per[per.length-1]}</b></div><div><small>Bu aralıkta tamamlanma</small><b>%${rate}<span> ${dn}/${inR.length}</span></b></div><div><small>Ertelenen</small><b>${post.length}</b></div><div><small>Açık görev</small><b>${L.filter(x=>x.status!=='done').length}</b></div><div><small>Gelen kutusu</small><b>${L.filter(x=>!TK.dayOf(x)&&x.status!=='done').length}</b></div><div><small>Tekrarlayan</small><b>${S.length}</b></div></div>
      <div class="tk-spark" role="img" aria-label="Son 14 günde günlük tamamlanan görev">${per.map((v,i)=>`<span title="${fmtShort(days[i])}: ${v} görev"><i style="height:${Math.max(2,100*v/mx)}%"></i><small>${(pd(days[i]).getDate())}</small></span>`).join('')}</div>
      ${TK.projs.length?`<div class="sh"><span>Projeler</span><span class="rule"></span></div><div class="tm-bars">${TK.projs.filter(p=>!p.archived).map(p=>{const P=L.filter(x=>x.proj===p.id),d=P.filter(x=>x.status==='done').length;return`<div class="tm-hb"><span>${E(p.icon)} ${E(p.name)}</span><span class="tm-tr"><i style="width:${P.length?100*d/P.length:0}%;background:${p.color}"></i></span><span>${d}/${P.length} · %${P.length?Math.round(100*d/P.length):0}</span></div>`}).join('')}</div>`:''}
      ${S.length?`<div class="sh"><span>Tekrarlayan görevlerin devamlılığı</span><span class="rule"></span></div><div class="tk-reps">${S.map(s=>{const k=streak(s);return`<div class="tk-rp"><span class="tk-main"><span class="tk-t">${E(s.title)}</span><span class="tk-m">${E(repText(s.rep))}</span></span><span class="tk-sk">${k.dots}</span><span class="tk-sn"><b>${k.cur}</b> gün seri<br><small>%${k.rate}</small></span></div>`}).join('')}</div>`:''}
      ${hist.length?`<div class="sh"><span>Tamamlanma geçmişi</span><span class="rule"></span></div><div class="tk-hist">${hist.map(x=>`<div><span>✓ ${E(x.title)}</span><small>${new Date(x.doneAt).toLocaleString('tr-TR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</small></div>`).join('')}</div>`:''}`}
  return{render,bind,quick,parse,monthChips,dayList,forDay,statsHTML,repText,complete,get open(){return open},set open(v){open=v}}})();
