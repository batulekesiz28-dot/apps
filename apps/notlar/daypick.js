/* Tarih seçici + gün ekranı (Takvim başlığındaki tarihe basınca).
   Seçici: başlıktan büyüyerek açılır (iOS Takvim / Fantastical), ay ay kayar (‹ › · tekerlek · yana kaydır · PageUp/Down), günlerde etkinlik/görev/not noktaları,
   hızlı çipler (Bugün, Yarın, Haftaya, Gelecek ay). Bir güne bas → hücre büyüyüp o günün ekranına dönüşür.
   Gün ekranı Workflowy gibi: her satır bir etkinlik. Yaz + Enter = yeni etkinlik (“Spor 18:00-19:30”, “45 dk okuma”, “Ali doğum günü” — Time.parse),
   Tab = üstteki etkinliğin alt notu (desc), Shift+Tab = geri çıkar, boş satırda Backspace = sil, ○ = tamamlandı. Altta o günün görevleri ve günlük notu (Workflowy günü).
   Notlar global'lerine (TM, Time, Tasks, dailyOf, openDay, go, calM, selDay, renderCal, view, esc, ymd, MONTHS, DOW, IC) sadece çalışırken dokunur. */
const DayPick=(()=>{
  const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
  const off=()=>document.documentElement.dataset.motion==='off'||matchMedia('(prefers-reduced-motion: reduce)').matches;
  const A=(el,kf,o)=>(!el||off())?{finished:Promise.resolve()}:el.animate(kf,o);
  const pd=s=>new Date(s+'T00:00'),addD=(s,n)=>{const d=pd(s);d.setDate(d.getDate()+n);return ymd(d)};
  const WD=['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
  let bg=null,ym=null,sel=null,day=null;
  const rel=s=>{const n=Math.round((pd(s)-pd(today()))/864e5);return n===0?'Bugün':n===1?'Yarın':n===-1?'Dün':n>1&&n<7?n+' gün sonra':n<-1&&n>-7?(-n)+' gün önce':n>=7?Math.round(n/7)+' hafta sonra':Math.round(-n/7)+' hafta önce'};
  const counts=s=>{let e=0,t=0,n=0;try{e=TM.onDay(s).length}catch{}try{t=Tasks.forDay(s).filter(x=>x.status!=='done').length}catch{}try{const p=dailyOf(s);n=p&&p.blocks?.some(b=>(b.text||'').trim())?1:0}catch{}return{e,t,n}};

  /* ── seçici ── */
  function gridHTML(){const y=ym.getFullYear(),m=ym.getMonth(),first=new Date(y,m,1),o=(first.getDay()+6)%7,dim=new Date(y,m+1,0).getDate(),t=today();let h='';
    for(let i=0;i<42;i++){const d=new Date(y,m,1-o+i),s=ymd(d),c=counts(s),out=d.getMonth()!==m;if(i>=35&&out&&d.getDate()<8&&i%7===0&&o+dim<=35)break;
      h+=`<button class="dpk-d${out?' out':''}${s===t?' now':''}${s===sel?' on':''}${i%7>4?' wk':''}" data-pick="${s}" aria-label="${d.getDate()} ${MONTHS[d.getMonth()]} ${WD[d.getDay()]}${c.e?`, ${c.e} etkinlik`:''}${c.t?`, ${c.t} görev`:''}" tabindex="${s===sel?0:-1}">
        <b>${d.getDate()}</b><span class="dpk-dots">${c.e?'<i class="e"></i>':''}${c.t?'<i class="t"></i>':''}${c.n?'<i class="n"></i>':''}</span></button>`}return h}
  function pickerHTML(){const y=ym.getFullYear(),m=ym.getMonth();
    return `<div class="dpk-pk"><header class="dpk-h"><button class="dpk-ib" data-pm="-1" aria-label="Önceki ay">${IC.chevL}</button><h2 class="dpk-t"><span>${MONTHS[m]}</span> <em>${y}</em></h2><button class="dpk-ib" data-pm="1" aria-label="Sonraki ay">${IC.chevR}</button><button class="dpk-x" data-px aria-label="Kapat">×</button></header>
      <div class="dpk-q">${[['Bugün',today()],['Yarın',addD(today(),1)],['Haftaya',addD(today(),7)],['Gelecek ay',ymd(new Date(new Date().getFullYear(),new Date().getMonth()+1,1))]].map(([l,s])=>`<button data-pick="${s}">${l}</button>`).join('')}
        <span class="dpk-ys"><button data-py="-1" aria-label="Önceki yıl">−</button><b>${y}</b><button data-py="1" aria-label="Sonraki yıl">+</button></span></div>
      <div class="dpk-dow">${DOW.map(d=>`<span>${d}</span>`).join('')}</div><div class="dpk-g" role="grid" aria-label="${MONTHS[m]} ${y}">${gridHTML()}</div>
      <p class="dpk-lg"><i class="e"></i>etkinlik <i class="t"></i>görev <i class="n"></i>not</p></div>`}
  function month(dir){if(!bg)return;ym=new Date(ym.getFullYear(),ym.getMonth()+dir,1);const g=$('.dpk-g',bg),t=$('.dpk-t',bg);
    g.innerHTML=gridHTML();g.setAttribute('aria-label',MONTHS[ym.getMonth()]+' '+ym.getFullYear());t.innerHTML=`<span>${MONTHS[ym.getMonth()]}</span> <em>${ym.getFullYear()}</em>`;$('.dpk-ys b',bg).textContent=ym.getFullYear();
    A(g,[{opacity:0,translate:`${dir*40}px 0`},{opacity:1,translate:'0 0'}],{duration:360,easing:'cubic-bezier(.2,.8,.2,1)'});A(t,[{opacity:0,translate:`0 ${dir*8}px`},{opacity:1,translate:'0 0'}],{duration:300,easing:'ease-out'})}
  function open(anchor,start){if(bg)return;sel=start||(typeof selDay!=='undefined'&&selDay)||today();ym=new Date(pd(sel).getFullYear(),pd(sel).getMonth(),1);
    bg=document.createElement('div');bg.className='dpk-bg';bg.innerHTML=`<section class="dpk" role="dialog" aria-modal="true" aria-label="Tarih seç">${pickerHTML()}</section>`;document.body.appendChild(bg);
    const box=$('.dpk',bg),r=anchor?.getBoundingClientRect(),b=box.getBoundingClientRect();
    // başlıktaki tarihten büyüyerek açılır
    if(r){const sx=r.width/b.width,sy=r.height/b.height;A(box,[{transformOrigin:'0 0',transform:`translate(${r.left-b.left}px,${r.top-b.top}px) scale(${sx},${sy})`,opacity:.2,borderRadius:'12px'},{transformOrigin:'0 0',transform:'none',opacity:1,borderRadius:'28px'}],{duration:520,easing:'cubic-bezier(.3,1.12,.5,1)'})}
    else A(box,[{opacity:0,scale:'.94'},{opacity:1,scale:'1'}],{duration:400,easing:'cubic-bezier(.3,1.2,.5,1)'});
    A(bg,[{backgroundColor:'rgba(0,0,0,0)'},{backgroundColor:getComputedStyle(bg).backgroundColor}],{duration:320});
    $$('.dpk-d',bg).forEach((d,i)=>A(d,[{opacity:0,scale:'.6'},{opacity:1,scale:'1'}],{duration:340,delay:120+i*8,easing:'cubic-bezier(.3,1.3,.5,1)',fill:'backwards'}));
    bg.addEventListener('click',onClick);bg.addEventListener('wheel',onWheel,{passive:false});addEventListener('keydown',onKey,true);swipe();
    setTimeout(()=>$('.dpk-d.on,.dpk-d.now',bg)?.focus({preventScroll:true}),60)}
  function close(){if(!bg)return;const w=bg;bg=null;day=null;removeEventListener('keydown',onKey,true);A(w,[{opacity:1},{opacity:0}],{duration:200}).finished.then(()=>w.remove());
    try{if(view==='cal')renderCal(0,true)}catch{}}
  let wT=0;function onWheel(e){if(day||!e.target.closest('.dpk-g'))return;e.preventDefault();if(Date.now()-wT<380)return;wT=Date.now();month(e.deltaY>0||e.deltaX>0?1:-1)}
  // yana kaydır: seçicide ay, gün ekranında gün değişir
  function swipe(){let sx=null,sy=0;bg.addEventListener('pointerdown',e=>{if(e.target.closest('.dpk-g')||(day&&!e.target.closest('.dsc-l,button')))[sx,sy]=[e.clientX,e.clientY]});
    bg.addEventListener('pointerup',e=>{if(sx!=null&&Math.abs(e.clientX-sx)>50&&Math.abs(e.clientX-sx)>Math.abs(e.clientY-sy)*1.4){const d=e.clientX<sx?1:-1;if(day)showDay(addD(day,d),d);else month(d);bg.__sw=Date.now()}sx=null})}
  function onKey(e){if(!bg)return;if(e.key==='Escape'){e.preventDefault();e.stopPropagation();if(day&&!e.target.closest('.dsc-l'))return back();if(day){e.target.blur();return back()}return close()}
    if(day)return;const f=e.target.closest?.('.dpk-d');
    if(e.key==='PageDown'||e.key==='PageUp'){e.preventDefault();month(e.key==='PageDown'?1:-1);return}
    if(f&&/^Arrow/.test(e.key)){e.preventDefault();const n={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7}[e.key],to=addD(f.dataset.pick,n);
      if(pd(to).getMonth()!==ym.getMonth()){sel=to;month(pd(to)>ym?1:-1)}sel=to;$$('.dpk-d',bg).forEach(b=>{b.tabIndex=b.dataset.pick===to?0:-1});$(`.dpk-d[data-pick="${to}"]`,bg)?.focus()}}
  function onClick(e){if(e.target===bg)return close();if(Date.now()-(bg.__sw||0)<250)return;const t=e.target;
    if(t.closest('[data-px]'))return close();const pm=t.closest('[data-pm]');if(pm)return month(+pm.dataset.pm);const py=t.closest('[data-py]');if(py)return month(12*+py.dataset.py);
    const pk=t.closest('[data-pick]');if(pk&&!day)return toDay(pk.dataset.pick,pk.classList.contains('dpk-d')?pk:null);
    if(t.closest('[data-dback]'))return back();const dn=t.closest('[data-dnav]');if(dn)return showDay(addD(day,+dn.dataset.dnav),+dn.dataset.dnav);
    if(t.closest('[data-dnote]')){const d=day;close();openDay(d);return}
    const ck=t.closest('[data-dck]');if(ck){const a=TM.acts.get(ck.dataset.dck);if(a){a.status=a.status==='done'?'plan':'done';TM.save(a,true);paintDay(true)}return}
    const tk=t.closest('[data-dtk]');if(tk){try{const x=Tasks.forDay(day).find(o=>o.id===tk.dataset.dtk);if(x)Tasks.complete(x)}catch{}setTimeout(()=>paintDay(true),60);return}
    if(t.closest('[data-dcal]')){const d=day;close();try{selDay=d;calM=new Date(pd(d).getFullYear(),pd(d).getMonth(),1);go('#cal');renderCal(0,true)}catch{}return}
    if(t.closest('.dsc-list')&&!t.closest('.dsc-l')){const L=$$('.dsc-l',bg);focusEnd(L[L.length-1])}}

  /* ── gün ekranı ── */
  function toDay(s,cell){sel=s;try{selDay=s;calM=new Date(pd(s).getFullYear(),pd(s).getMonth(),1)}catch{}const box=$('.dpk',bg),pk=$('.dpk-pk',box);
    if(cell&&!off()){const r=cell.getBoundingClientRect(),g=document.createElement('div');g.className='dpk-grow';Object.assign(g.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});document.body.appendChild(g);
      const b=box.getBoundingClientRect();A(g,[{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px',borderRadius:'14px'},{left:b.left+'px',top:b.top+'px',width:b.width+'px',height:b.height+'px',borderRadius:'28px'}],{duration:420,easing:'cubic-bezier(.3,1.05,.5,1)'}).finished.then(()=>g.remove());
      A(pk,[{opacity:1},{opacity:0}],{duration:200,fill:'forwards'}).finished.then(()=>showDay(s,0,true))}
    else showDay(s,0,true)}
  function back(){day=null;const box=$('.dpk',bg);ym=new Date(pd(sel).getFullYear(),pd(sel).getMonth(),1);box.innerHTML=pickerHTML();A($('.dpk-pk',box),[{opacity:0,scale:'1.04'},{opacity:1,scale:'1'}],{duration:320,easing:'cubic-bezier(.2,.8,.2,1)'});$('.dpk-d.on',box)?.focus()}
  function showDay(s,dir,first){day=s;sel=s;const box=$('.dpk',bg),d=pd(s);
    box.innerHTML=`<div class="dsc"><header class="dsc-h"><button class="dpk-ib" data-dback aria-label="Tarih seçiciye dön" title="Tarihler">${IC.chevL}</button>
      <div class="dsc-t"><small>${rel(s)} · ${WD[d.getDay()]}</small><h2>${d.getDate()} ${MONTHS[d.getMonth()]} <em>${d.getFullYear()}</em></h2></div>
      <button class="dpk-ib" data-dnav="-1" aria-label="Önceki gün">${IC.chevL}</button><button class="dpk-ib" data-dnav="1" aria-label="Sonraki gün">${IC.chevR}</button><button class="dpk-x" data-px aria-label="Kapat">×</button></header>
      <div class="dsc-b"><div class="dsc-sec"><span>Etkinlikler</span><button class="dsc-lk" data-dcal>Takvimde göster</button></div><div class="dsc-list" role="list"></div>
      <p class="dsc-hint">Yaz, Enter'a bas: <i>“Spor 18:00-19:30”</i>, <i>“45 dk okuma”</i>, <i>“Ali doğum günü”</i>. Tab: alt not · boş satırda ⌫: sil.</p>
      <div class="dsc-more"></div></div></div>`;
    paintDay();const b=$('.dsc',box);
    if(dir)A(b,[{opacity:0,translate:`${dir*36}px 0`},{opacity:1,translate:'0 0'}],{duration:340,easing:'cubic-bezier(.2,.8,.2,1)'});else if(first)A(b,[{opacity:0,translate:'0 10px'},{opacity:1,translate:'0 0'}],{duration:360,easing:'cubic-bezier(.2,.8,.2,1)'});
    const L=$$('.dsc-l',box);if(L.length===1)setTimeout(()=>focusEnd(L[0]),first?380:30)}
  const evs=()=>TM.onDay(day).sort((a,b)=>(TM.hm(a.start)??-1)-(TM.hm(b.start)??-1)||a.created-b.created);
  const tline=a=>a.start?`${a.start}${a.end?'–'+a.end:''} `:'';
  function rowHTML(a){const c=TM.cat(a.cat)||{},done=a.status==='done';
    let h=`<div class="dsc-r${done?' done':''}" role="listitem" data-id="${a.id}"><button class="dsc-ck" data-dck="${a.id}" aria-label="${done?'Tamamlanmadı yap':'Tamamlandı yap'}" aria-pressed="${done}" style="--c:${esc(c.color||'#999')}"></button>
      <div class="dsc-l${a.kind==='bday'?' bd':''}" contenteditable="${a.kind==='bday'?'false':'true'}" spellcheck="false" data-ev="${a.id}" data-lv="0" data-o="${esc(tline(a)+a.title)}">${esc(a.kind==='bday'&&TM.label?TM.label(a,day):tline(a)+a.title)}</div></div>`;
    for(const ln of String(a.desc||'').split('\n').filter(x=>x.trim()))h+=`<div class="dsc-r sub" role="listitem"><i class="dsc-bl"></i><div class="dsc-l" contenteditable="true" spellcheck="false" data-sub="${a.id}" data-lv="1">${esc(ln)}</div></div>`;
    return h}
  let painting=false;
  function paintDay(keep){if(!bg||!day)return;const list=$('.dsc-list',bg);if(!list)return;painting=true;try{paintDay0(keep,list)}finally{painting=false}}
  function paintDay0(keep,list){const L=evs();
    list.innerHTML=L.map(rowHTML).join('')+`<div class="dsc-r new" role="listitem"><i class="dsc-bl"></i><div class="dsc-l" contenteditable="true" spellcheck="false" data-new data-lv="0" data-ph="${L.length?'Yeni etkinlik…':'Bu güne ilk etkinliği yaz…'}"></div></div>`;
    $$('.dsc-l',list).forEach(wire);
    let tk=[];try{tk=Tasks.forDay(day)}catch{}const dn=(()=>{try{return dailyOf(day)}catch{return null}})(),prev=dn?.blocks?.map(b=>(b.text||'').replace(/<[^>]+>/g,'').trim()).filter(Boolean).slice(0,4)||[];
    $('.dsc-more',bg).innerHTML=(tk.length?`<div class="dsc-sec"><span>Görevler</span></div><ul class="dsc-tk">${tk.map(x=>`<li class="${x.status==='done'?'done':''}"><button data-dtk="${esc(x.id)}" aria-label="Tamamla"></button><span>${esc(x.title)}</span>${x.time?`<small>${esc(x.time)}</small>`:''}</li>`).join('')}</ul>`:'')+
      `<div class="dsc-sec"><span>Günlük not</span></div><button class="dsc-note" data-dnote>${prev.length?`<span>${prev.map(esc).join('<br>')}</span>`:'<span class="ph">Bu günün Workflowy sayfasını aç — madde madde yaz, içe girintile.</span>'}<b>Aç ›</b></button>`;
    if(!keep&&!off())$$('.dsc-r',list).forEach((r,i)=>A(r,[{opacity:0,translate:'0 6px'},{opacity:1,translate:'0 0'}],{duration:280,delay:i*30,easing:'ease-out',fill:'backwards'}))}
  function focusEnd(el){if(!el)return;el.focus();const r=document.createRange();r.selectNodeContents(el);r.collapse(false);const s=getSelection();s.removeAllRanges();s.addRange(r)}
  const text=el=>(el.innerText||'').replace(/ /g,' ').trim();
  // satırı kaydet: yeni → TM.add (Time.parse ile saat/süre/kategori/doğum günü), var olan → metinden saat yeniden okunur
  // başlık: ayrıştırmadan kalan metin; sadece kategori adı yazıldıysa (“Spor 18:00”) kategori adı
  const titleOf=(p,t)=>p.title||(p.cat?TM.cat(p.cat)?.name:'')||t;
  function commit(el){const t=text(el);if(el.dataset.new!=null){if(!t)return null;const p=Time.parse(t,day);let a;
      if(p.kind==='bday')a=TM.add({title:p.title||'Doğum günü',kind:'bday',rep:'yearly',byear:p.byear,date:p.date,cat:p.cat||'diger'});
      else a=TM.add({title:titleOf(p,t),date:p.date||day,start:p.start,end:p.end,dur:p.dur,cat:p.cat||'diger',rep:p.rep,status:p.status||'plan'});
      if(a.date!==day)try{toast(`“${a.title}” ${new Date(a.date+'T00:00').toLocaleDateString('tr-TR',{day:'numeric',month:'long'})} gününe eklendi`)}catch{}
      el.removeAttribute('data-new');el.dataset.ev=a.id;return a}
    if(el.dataset.ev){const a=TM.acts.get(el.dataset.ev);if(!a||t===el.dataset.o)return a;if(!t)return a;const p=Time.parse(t,a.date);a.title=titleOf(p,t);if(p.start){a.start=p.start;a.end=p.end||''}else{a.start='';a.end=''}if(p.dur)a.dur=p.dur;if(p.cat)a.cat=p.cat;TM.save(a,true);el.dataset.o=t;return a}
    if(el.dataset.sub){saveSubs(el.dataset.sub)}return null}
  function saveSubs(id){const a=TM.acts.get(id);if(!a)return;a.desc=$$(`.dsc-l[data-sub="${id}"]`,bg).map(text).filter(Boolean).join('\n');TM.save(a,true)}
  function wire(el){
    // yeniden çizim sırasında eski satır DOM'dan düşerken blur gelir: o zaman kaydetme/çizme (odak yeni satırdan kayıyordu)
    el.addEventListener('blur',()=>{if(!bg||painting||el.__done||!el.isConnected)return;const a=commit(el);if(a&&el.closest('.dsc-r.new'))setTimeout(()=>{const f=document.activeElement;paintDay(true);if(f&&f.classList?.contains('dsc-l')&&!f.isConnected)focusEnd($('.dsc-r.new .dsc-l',bg))},0)});
    el.addEventListener('keydown',e=>{const row=el.closest('.dsc-r');
      if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();const lv=+el.dataset.lv;const a=commit(el);el.__done=true;
        if(lv===1){const id=el.dataset.sub,n=document.createElement('div');n.className='dsc-r sub';n.innerHTML=`<i class="dsc-bl"></i><div class="dsc-l" contenteditable="true" spellcheck="false" data-sub="${id}" data-lv="1"></div>`;row.after(n);wire(n.lastChild);focusEnd(n.lastChild);return}
        paintDay(true);focusEnd($('.dsc-r.new .dsc-l',bg));return}
      if(e.key==='Tab'){e.preventDefault();const prevEv=(()=>{let p=row.previousElementSibling;while(p&&!p.querySelector('[data-ev]'))p=p.previousElementSibling;return p?.querySelector('[data-ev]')})();
        if(!e.shiftKey&&+el.dataset.lv===0&&prevEv){const t=text(el);if(el.dataset.ev){const me=TM.acts.get(el.dataset.ev);if(me&&!(me.desc||'').trim()){TM.del(me.id)}else return}
          const pa=TM.acts.get(prevEv.dataset.ev);if(pa){pa.desc=[...(String(pa.desc||'').split('\n').filter(x=>x.trim())),t||' '].join('\n');TM.save(pa,true)}paintDay(true);const subs=$$(`.dsc-l[data-sub="${prevEv.dataset.ev}"]`,bg);focusEnd(subs[subs.length-1]);return}
        if(e.shiftKey&&+el.dataset.lv===1){const id=el.dataset.sub,t=text(el);el.remove();saveSubs(id);const p=Time.parse(t||'',day);const a=TM.add({title:p.title||t||'Yeni etkinlik',date:day,start:p.start,end:p.end,dur:p.dur,cat:p.cat||'diger',status:'plan'});paintDay(true);focusEnd($(`.dsc-l[data-ev="${a.id}"]`,bg));return}return}
      if(e.key==='Backspace'&&!text(el)){const prev=row.previousElementSibling?.querySelector('.dsc-l');
        if(el.dataset.ev){e.preventDefault();const a=TM.del(el.dataset.ev);paintDay(true);try{toast('Etkinlik silindi')}catch{}focusEnd(prev?$$('.dsc-l',bg).find(x=>x.dataset.ev===prev.dataset.ev||x.dataset.sub===prev.dataset.sub&&x.innerText===prev.innerText)||$('.dsc-r.new .dsc-l',bg):$('.dsc-r.new .dsc-l',bg));return}
        if(el.dataset.sub){e.preventDefault();const id=el.dataset.sub;row.remove();saveSubs(id);focusEnd(prev);return}
        if(el.dataset.new!=null&&prev){e.preventDefault();focusEnd(prev)}return}
      if(e.key==='ArrowUp'||e.key==='ArrowDown'){const L=$$('.dsc-l',bg),i=L.indexOf(el),n=L[i+(e.key==='ArrowUp'?-1:1)];if(n){e.preventDefault();focusEnd(n)}}})}
  return{open,close,isOpen:()=>!!bg,showDay:s=>{if(!bg)open(null,s);showDay(s,0,true)}}})();
