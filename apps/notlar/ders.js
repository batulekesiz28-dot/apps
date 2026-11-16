/* Ders notları (Study Log'a bağlı) — #ders (Notlar ana sayfasındaki “Dersler” kısayolu)
   - dersler: Study Log'daki dersler (subjects), haftalık hedef (goalW), bu haftaki çalışma (sessions)
   Veri Study Log'un kendisi: yerel 'studylog:v1' {set,sessions} · bulut hub/studylog (+ sessions alt koleksiyonu).
   Her dersin defteri bir Notlar sayfası: tpl 'ders:<dersId>'; ders notları onun alt sayfaları.
   Yükleme anında Notlar global'lerine dokunmaz; sadece çalışırken (pages, newPage, save, go, esc…). */
const Ders=(()=>{
  const LK='studylog:v1',PAL=['#2563EB','#16A34A','#D97706','#DB2777','#7C3AED','#0891B2','#DC2626','#65A30D'];
  let mode='local',set=null,sess=[],ref=null,unsubs=[],ready=false;const ls=[];
  const on=f=>ls.push(f),emit=()=>ls.forEach(f=>{try{f()}catch{}});
  const ymd=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const weekStart=()=>{const d=new Date();d.setDate(d.getDate()-(d.getDay()+6)%7);return ymd(d)};
  const fm=m=>{m=Math.round(m||0);const h=Math.floor(m/60),r=m%60;return h?(r?`${h} sa ${r} dk`:`${h} sa`):`${r} dk`};
  const S=(p,c='')=>`<svg class="dz-ic ${c}" viewBox="0 0 20 20" aria-hidden="true">${p}</svg>`;
  const IC={ders:S('<path d="M10 4.5 2.5 8 10 11.5 17.5 8z"/><path d="M5.5 9.5v3.6c1.2 1.2 2.8 1.9 4.5 1.9s3.3-.7 4.5-1.9V9.5M17.5 8v4.5"/>'),
        plus:S('<path d="M10 4.5v11M4.5 10h11"/>'),minus:S('<path d="M4.5 10h11"/>'),note:S('<path d="M5.5 3h6l3 3v11h-9z"/><path d="M11.5 3v3h3M8 10h4.5M8 13h4.5"/>')};

  /* ── veri ── */
  function readLocal(){try{const d=JSON.parse(localStorage.getItem(LK)||'null');set=d?.set||null;const ws=weekStart();sess=(d?.sessions||[]).filter(s=>s.date>=ws)}catch{set=null;sess=[]}ready=true}
  function startLocal(){mode='local';readLocal();addEventListener('storage',e=>{if(e.key===LK){readLocal();emit()}})}
  function startCloud(fs){mode='cloud';ref=fs.collection('hub').doc('studylog');
    unsubs.push(ref.onSnapshot(s=>{set=s.data()||null;ready=true;emit()},()=>{ready=true;emit()}));
    unsubs.push(ref.collection('sessions').where('date','>=',weekStart()).onSnapshot(s=>{sess=s.docs.map(d=>d.data());emit()},()=>{}));
    return Promise.resolve()}
  function stop(){unsubs.forEach(u=>{try{u()}catch{}});unsubs=[];set=null;sess=[];ready=false}
  // sadece değişen alanlar yazılır (Study Log'un çalışan sayacı vb. ezilmez)
  function write(patch){const p={...patch,updated:Date.now()};set={...(set||{}),...p};
    if(mode==='cloud'&&ref)ref.set(JSON.parse(JSON.stringify(p)),{merge:true}).catch(e=>toast('Study Log’a kaydedilemedi: '+(e.code||e.message)));
    else{try{const d=JSON.parse(localStorage.getItem(LK)||'null')||{sessions:[]};d.set={...(d.set||{}),...p};localStorage.setItem(LK,JSON.stringify(d))}catch{}}
    emit()}
  const subjects=()=>Array.isArray(set?.subjects)?set.subjects:[];
  const weekMin=id=>sess.reduce((a,s)=>a+(s.subj===id?+s.min||0:0),0)+(set?.run&&set.run.subj===id&&set.run.date>=weekStart()?((+set.run.acc||0)+(set.run.on?(Date.now()-set.run.at)/1000:0))/60:0);

  /* ── Notlar sayfaları ── */
  const rootOf=id=>[...pages.values()].find(p=>p.tpl==='ders:'+id);
  const isDers=p=>{let x=p,n=0;while(x&&n++<50){if(String(x.tpl||'').startsWith('ders:'))return true;x=x.parent?pages.get(x.parent):null}return false};
  function ensureRoot(s){let p=rootOf(s.id);if(!p){p=newPage({title:s.name,icon:'📘'});p.tpl='ders:'+s.id;save(p,true)}return p}
  function newNote(s){const r=ensureRoot(s),p=newPage({title:''});p.parent=r.id;save(p,true);FRESH?.add?.(p.id);go('#p/'+p.id)}
  const notesOf=id=>{const r=rootOf(id);return r?descendants(r.id).sort((a,b)=>b.updated-a.updated):[]};

  /* ── #ders ── */
  function render(){setCrumb(IC.ders,'Ders notu');const L=subjects(),ws=weekStart();
    const tot=L.reduce((a,s)=>a+weekMin(s.id),0),gw=+set?.goalWeek||0,pct=gw?Math.min(100,tot/gw*100):0;
    const row=s=>{const m=weekMin(s.id),g=+s.goalW||0,p=g?Math.min(100,m/g*100):0,ns=notesOf(s.id);
      return`<section class="dz-r" style="--c:${s.color||'#888'}" data-sid="${esc(s.id)}">
        <div class="dz-top"><button class="dz-n" data-dz-open="${esc(s.id)}" title="${esc(s.name)} defterini aç"><i class="dz-dot"></i><b>${esc(s.name)}</b><small>${ns.length?ns.length+' not':'Henüz not yok'}</small></button>
          <div class="dz-g" title="Bu hafta çalışılan / haftalık hedef">
            <span class="dz-v"><b>${fm(m)}</b>${g?` / ${fm(g)}`:''}</span>
            <span class="dz-bar" role="progressbar" aria-label="${esc(s.name)} haftalık hedef" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(p)}"><i style="width:${g?p:0}%"></i></span>
            <span class="dz-step"><button data-dz-g="${esc(s.id)}:-30" aria-label="Hedefi 30 dk azalt" ${g?'':'disabled'}>${IC.minus}</button><em>${g?'Hedef':'Hedef yok'}</em><button data-dz-g="${esc(s.id)}:30" aria-label="Hedefi 30 dk artır">${IC.plus}</button></span></div>
          <button class="dz-add" data-dz-new="${esc(s.id)}" title="${esc(s.name)} için yeni not">${IC.plus}<span>Not</span></button></div>
        ${ns.length?`<div class="dz-ns">${ns.slice(0,4).map(p=>`<a href="#p/${p.id}" class="dz-note">${IC.note}<span>${esc(titleOf(p))}</span><small>${esc(rel(p.updated))}</small></a>`).join('')}${ns.length>4?`<button class="dz-more" data-dz-open="${esc(s.id)}">+${ns.length-4} not daha</button>`:''}</div>`:''}
      </section>`};
    $('#view').innerHTML=`<div class="wrap dz">
      <header class="dz-h"><div><h1>Ders notu</h1><p>Bu hafta <b>${fm(tot)}</b> çalıştın${gw?` · haftalık hedef ${fm(gw)}`:''}</p></div>
        ${gw?`<span class="dz-ring" style="--p:${pct}" role="img" aria-label="Haftalık hedefin yüzde ${Math.round(pct)}’i"><b>${Math.round(pct)}%</b></span>`:''}</header>
      ${!ready?`<p class="dz-empty">Study Log yükleniyor…</p>`:L.length?L.map(row).join(''):`<div class="dz-empty"><b>Henüz ders yok</b><p>İlk dersini ekle; Study Log’da da görünür, orada çalıştığın süre burada hedefinle birlikte izlenir.</p></div>`}
      <form class="dz-new" data-dz-sub><span>${IC.plus}</span><input name="n" placeholder="Ders ekle — ör. Fizik" aria-label="Yeni ders adı" maxlength="40" autocomplete="off"><button>Ekle</button></form>
      <p class="dz-foot">Dersler ve hedefler Study Log ile ortak. Süreyi Study Log’daki sayaçla tut; buradaki çubuk kendiliğinden dolar.</p></div>`;
    stagger?.('.dz-r')}

  function bind(){const v=$('#view');
    v.addEventListener('click',e=>{if(view!=='ders')return;const t=e.target;
      const o=t.closest('[data-dz-open]');if(o){const s=subjects().find(x=>x.id===o.dataset.dzOpen);if(s)go('#p/'+ensureRoot(s).id);return}
      const n=t.closest('[data-dz-new]');if(n){const s=subjects().find(x=>x.id===n.dataset.dzNew);if(s)newNote(s);return}
      const g=t.closest('[data-dz-g]');if(g){const[id,d]=g.dataset.dzG.split(':');const L=subjects().map(s=>s.id===id?{...s,goalW:Math.max(0,Math.min(3000,(+s.goalW||0)+ +d))}:s);write({subjects:L});return}});
    v.addEventListener('submit',e=>{if(!e.target.matches('[data-dz-sub]'))return;e.preventDefault();const name=e.target.n.value.trim();if(!name)return;
      const L=subjects();if(L.some(s=>s.name.toLocaleLowerCase('tr')===name.toLocaleLowerCase('tr'))){toast('Bu ders zaten var');return}
      const s={id:'s'+Date.now().toString(36),name,color:PAL.find(c=>!L.some(x=>(x.color||'').toLowerCase()===c.toLowerCase()))||PAL[L.length%PAL.length],goalW:0};write({subjects:[...L,s],...(set?.sel?{}:{sel:s.id})});toast(name+' eklendi · Study Log’da da var');
      setTimeout(()=>$('[data-dz-sub] input')?.focus(),30)})}
  return{startLocal,startCloud,stop,on,render,bind,isDers,weekMin,subjects}})();
