/* Tablo bloğu ve çeşitleri (Notion tablosu + Coda/Airtable sütun türleri, sade).
   Blok: {t:'table', v:<çeşit>, cols:[{n:ad,t:tür}], rows:[[hücre…]], z:zebra, hc:ilk sütun başlık, h:aranabilir düz metin}
   Sütun türleri: text · num (sağa yaslı, altta toplam) · check (✓ ✗ ~ döngüsü) · status (Yapılacak/Sürüyor/Bitti/Beklemede) · prog (0–100 ilerleme çubuğu) · date
   Çeşitler (/ menüsünde): Tablo, Çizgili, Karşılaştırma, Takip, Bütçe, Haftalık plan, İlerleme, Sıralama, Ders programı, Okuma listesi.
   Klavye: Tab/Shift+Tab hücre gez (sonda yeni satır), Enter alttaki hücre (son satırda yeni satır), Shift+Enter satır içi. Sütun ⋯ menüsü: tür, sırala, ekle, sil.
   Hücreye sağ tık: satır ekle/sil. Notlar global'lerine (P, blockOf, edited, replaceNode, esc, view) sadece çalışırken dokunur. */
const Tables=(()=>{
  const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
  const SV=p=>`<svg viewBox="0 0 16 16" class="li" aria-hidden="true">${p}</svg>`;
  const TYPES={text:'Metin',num:'Sayı (toplamlı)',check:'Onay ✓ ✗',status:'Durum',prog:'İlerleme %',date:'Tarih'};
  const ST=['','Yapılacak','Sürüyor','Bitti','Beklemede'],CK=['','✓','✗','~'];
  const c=(n,t='text')=>({n,t});
  const V={
    basic:{l:'Tablo',d:'Satır ve sütunlar',kw:'tablo table grid',cols:[c('Ad'),c('Açıklama'),c('Not')],rows:3},
    zebra:{l:'Çizgili tablo',d:'Uzun listelerde satırlar kolay okunur',kw:'cizgili zebra tablo liste',cols:[c('Ad'),c('Değer'),c('Not')],rows:5,z:1},
    cmp:{l:'Karşılaştırma tablosu',d:'Seçenekleri ✓ ✗ ile kıyasla',kw:'karsilastirma compare kiyas secenek arti eksi',cols:[c('Özellik'),c('Seçenek A','check'),c('Seçenek B','check'),c('Seçenek C','check')],rows:4,hc:1},
    track:{l:'Takip tablosu',d:'İş, durum, tarih — proje takibi',kw:'takip proje is durum status tracker',cols:[c('İş'),c('Durum','status'),c('Tarih','date'),c('Not')],rows:4},
    budget:{l:'Bütçe tablosu',d:'Kalemler ve otomatik toplam',kw:'butce harcama para gider gelir toplam hesap',cols:[c('Kalem'),c('Planlanan','num'),c('Harcanan','num')],rows:4},
    week:{l:'Haftalık plan',d:'Günler × sabah / öğle / akşam',kw:'haftalik plan hafta gun program',cols:[c(''),c('Pzt'),c('Sal'),c('Çar'),c('Per'),c('Cum'),c('Cmt'),c('Paz')],rows:[['Sabah'],['Öğle'],['Akşam']],hc:1},
    prog:{l:'İlerleme tablosu',d:'Konu başına yüzde çubuğu',kw:'ilerleme progress yuzde konu hedef',cols:[c('Konu'),c('İlerleme','prog'),c('Not')],rows:4},
    rank:{l:'Sıralama tablosu',d:'Puana göre sırala, ilk üç madalyalı',kw:'siralama puan skor lider rank top',cols:[c('Ad'),c('Puan','num')],rows:5,rank:1},
    lesson:{l:'Ders programı',d:'Saat × gün çizelgesi',kw:'ders program okul saat cizelge',cols:[c('Saat'),c('Pzt'),c('Sal'),c('Çar'),c('Per'),c('Cum')],rows:[['09:00'],['10:00'],['11:00'],['13:00'],['14:00']],hc:1},
    read:{l:'Okuma listesi',d:'Kitap, yazar, durum, puan',kw:'okuma kitap liste reading yazar',cols:[c('Kitap'),c('Yazar'),c('Durum','status'),c('Puan','num')],rows:3},
  };
  function create(v){const s=V[v]||V.basic,cols=s.cols.map(x=>({...x})),R=Array.isArray(s.rows)?s.rows:[...Array(s.rows)].map(()=>[]);
    return{id:(typeof uid==='function'?uid():Math.random().toString(36).slice(2)),t:'table',h:'',v:V[v]?v:'basic',cols,rows:R.map(r=>cols.map((_,i)=>r[i]||'')),z:s.z||0,hc:s.hc||0,rank:s.rank||0}}
  const actions=()=>Object.entries(V).map(([k,s])=>({k:'@tbl:'+k,l:s.l,d:s.d,kw:s.kw+' tablo table',b:SV('<rect x="2" y="3" width="12" height="10" rx="1.8"/><path d="M2 6.5h12M6.5 6.5V13"/>')}));
  const numOf=v=>{const m=String(v||'').replace(/\./g,'').replace(',','.').match(/-?\d+(\.\d+)?/);return m?+m[0]:null};
  const fmtN=n=>(Math.round(n*100)/100).toLocaleString('tr-TR');
  function cell(b,v,ci,ri){const t=b.cols[ci]?.t||'text',at=`data-r="${ri}" data-c="${ci}"`;
    if(t==='check'){const i=Math.max(0,CK.indexOf(v));return`<td class="t-ck"><button class="ntb-cy ck${i}" data-tcy ${at} aria-label="${['Boş','Var','Yok','Kısmen'][i]} — değiştir" title="Dokun: ✓ → ✗ → ~ → boş">${CK[i]||'·'}</button></td>`}
    if(t==='status'){const i=Math.max(0,ST.indexOf(v));return`<td><button class="ntb-cy st${i}" data-tcy ${at} title="Durumu değiştir (dokun)" aria-label="Durum: ${ST[i]||'yok'} — değiştir">${ST[i]||'—'}</button></td>`}
    const ed=`<div class="ntb-c" contenteditable="true" spellcheck="false" ${at}>${esc(v)}</div>`;
    if(t==='prog'){const p=Math.max(0,Math.min(100,numOf(v)??0));return`<td class="t-pg"><i class="ntb-bar" style="--p:${p}%"></i>${ed}</td>`}
    return`<td class="${t==='num'?'t-num':''}${t==='date'?' t-dt':''}">${ed}</td>`}
  function sumRow(b){const idx=b.cols.map((x,i)=>x.t==='num'?i:-1).filter(i=>i>=0);if(!idx.length)return'';
    return`<tfoot><tr>${b.cols.map((x,i)=>i===0&&x.t!=='num'?'<td class="ntb-sl">Toplam</td>':x.t==='num'?`<td class="t-num ntb-s" data-sum="${i}">${fmtN(b.rows.reduce((a,r)=>a+(numOf(r[i])||0),0))}</td>`:'<td></td>').join('')}</tr></tfoot>`}
  function html(b,hd){b.cols=b.cols||[c('A'),c('B')];b.rows=b.rows||[['','']];
    return`<div class="blk" data-id="${b.id}" data-t="table">${hd}<div class="ntb-w"><table class="ntb v-${esc(b.v||'basic')}${b.z?' z':''}${b.hc?' hc':''}${b.rank?' rk':''}">
      <thead><tr>${b.cols.map((x,i)=>`<th data-ct="${x.t}"><div class="ntb-h"><div class="ntb-c" contenteditable="true" spellcheck="false" data-hc="${i}" data-ph="Sütun">${esc(x.n)}</div><button class="ntb-cm" data-tcm="${i}" aria-label="${esc(x.n||'Sütun')} sütun seçenekleri" title="Sütun: tür, sırala, ekle, sil">⋯</button></div></th>`).join('')}</tr></thead>
      <tbody>${b.rows.map((r,ri)=>`<tr>${b.cols.map((_,ci)=>cell(b,r[ci]??'',ci,ri)).join('')}</tr>`).join('')}</tbody>${sumRow(b)}</table></div>
      <div class="ntb-bar2"><button data-tadd="row">${SV('<path d="M8 3v10M3 8h10"/>')}Satır</button><button data-tadd="col">${SV('<path d="M8 3v10M3 8h10"/>')}Sütun</button><button data-tvar>${SV('<rect x="2" y="3" width="12" height="10" rx="1.8"/><path d="M2 6.5h12"/>')}${esc((V[b.v]||V.basic).l)}</button></div></div>`}
  // düz metin (komut paleti ve arama tabloyu da bulsun)
  const flat=b=>esc([b.cols.map(x=>x.n).join(' '),...b.rows.map(r=>r.join(' '))].join(' · ')).slice(0,4000);
  const blk=el=>{const n=el.closest('.blk[data-t=table]');return n?blockOf(n.dataset.id):null};
  const save=b=>{b.h=flat(b);edited()};
  const redraw=(b,focus)=>{replaceNode(b);if(focus){const[r,cc]=focus;const el=$(`.blk[data-id="${b.id}"] ${r<0?`[data-hc="${cc}"]`:`[data-r="${r}"][data-c="${cc}"]`}`);if(el){el.focus();if(el.isContentEditable){const g=document.createRange();g.selectNodeContents(el);g.collapse(false);const s=getSelection();s.removeAllRanges();s.addRange(g)}}}};
  function addRow(b,at=b.rows.length){b.rows.splice(at,0,b.cols.map(()=>''));save(b)}
  function addCol(b,at=b.cols.length,t='text'){b.cols.splice(at,0,c('Yeni sütun',t));b.rows.forEach(r=>r.splice(at,0,''));save(b)}
  function delCol(b,i){if(b.cols.length<2)return;b.cols.splice(i,1);b.rows.forEach(r=>r.splice(i,1));save(b)}
  function delRow(b,i){if(b.rows.length<2)return;b.rows.splice(i,1);save(b)}
  function sortBy(b,i,dir){const n=b.cols[i].t==='num'||b.cols[i].t==='prog';b.rows.sort((x,y)=>{const a=x[i]||'',z=y[i]||'';if(!a&&z)return 1;if(a&&!z)return-1;
    const r=n?(numOf(a)??0)-(numOf(z)??0):b.cols[i].t==='status'?ST.indexOf(a)-ST.indexOf(z):a.localeCompare(z,'tr');return dir*r});save(b)}
  // küçük menü (Notlar'ın açılır kutularıyla aynı dil)
  let menuEl=null;
  function menu(anchor,items){closeMenu();const r=anchor.getBoundingClientRect(),m=document.createElement('div');m.className='ntb-menu';m.setAttribute('role','menu');
    m.innerHTML=items.map((it,i)=>it==='-'?'<hr>':it.h?`<p>${it.h}</p>`:`<button role="menuitem" data-mi="${i}" class="${it.on?'on':''}${it.red?' red':''}">${it.l}</button>`).join('');document.body.appendChild(m);
    const w=m.offsetWidth,h=m.offsetHeight;m.style.left=Math.max(8,Math.min(r.left,innerWidth-w-8))+'px';m.style.top=(r.bottom+h+8>innerHeight?Math.max(8,r.top-h-6):r.bottom+6)+'px';
    m.addEventListener('click',e=>{const x=e.target.closest('[data-mi]');if(!x)return;const it=items[+x.dataset.mi];closeMenu();it.run()});menuEl=m;
    setTimeout(()=>addEventListener('pointerdown',outM,true),0);m.querySelector('button')?.focus()}
  const outM=e=>{if(!e.target.closest('.ntb-menu'))closeMenu()};
  function closeMenu(){removeEventListener('pointerdown',outM,true);menuEl?.remove();menuEl=null}
  function colMenu(b,i,anchor){const col=b.cols[i];menu(anchor,[{h:'Sütun türü'},...Object.entries(TYPES).map(([k,l])=>({l,on:col.t===k,run:()=>{col.t=k;save(b);redraw(b)}})),'-',
    {l:'Sırala A → Z / küçükten büyüğe',run:()=>{sortBy(b,i,1);redraw(b)}},{l:'Sırala Z → A / büyükten küçüğe',run:()=>{sortBy(b,i,-1);redraw(b)}},'-',
    {l:'Sola sütun ekle',run:()=>{addCol(b,i);redraw(b,[-1,i])}},{l:'Sağa sütun ekle',run:()=>{addCol(b,i+1);redraw(b,[-1,i+1])}},
    ...(b.cols.length>1?[{l:'Sütunu sil',red:1,run:()=>{delCol(b,i);redraw(b)}}]:[])])}
  function varMenu(b,anchor){menu(anchor,[{h:'Görünüm'},{l:'Çizgili satırlar',on:!!b.z,run:()=>{b.z=b.z?0:1;save(b);redraw(b)}},{l:'İlk sütun başlık',on:!!b.hc,run:()=>{b.hc=b.hc?0:1;save(b);redraw(b)}},{l:'Sıralama madalyaları',on:!!b.rank,run:()=>{b.rank=b.rank?0:1;save(b);redraw(b)}},'-',{h:'Çeşide çevir (veriler kalır)'},
    ...Object.entries(V).map(([k,s])=>({l:s.l,on:b.v===k,run:()=>{b.v=k;s.cols.forEach((x,i)=>{if(b.cols[i])b.cols[i].t=x.t;else{b.cols.push({...x});b.rows.forEach(r=>r.push(''))}});b.z=s.z||0;b.hc=s.hc||0;b.rank=s.rank||0;save(b);redraw(b)}}))])}
  function rowMenu(b,ri,anchor){menu(anchor,[{l:'Üste satır ekle',run:()=>{addRow(b,ri);redraw(b,[ri,0])}},{l:'Alta satır ekle',run:()=>{addRow(b,ri+1);redraw(b,[ri+1,0])}},...(b.rows.length>1?['-',{l:'Satırı sil',red:1,run:()=>{delRow(b,ri);redraw(b)}}]:[])])}
  // olaylar (#view içinde, sayfa görünümünde)
  const inPage=()=>typeof view!=='undefined'&&view==='page'&&typeof P!=='undefined'&&P;
  document.addEventListener('input',e=>{if(!inPage())return;const el=e.target.closest?.('.ntb .ntb-c');if(!el)return;const b=blk(el);if(!b)return;const v=el.innerText.replace(/\n+$/,'');
    if(el.dataset.hc!=null)b.cols[+el.dataset.hc].n=v;else{const r=+el.dataset.r,cc=+el.dataset.c;b.rows[r][cc]=v;
      const td=el.closest('td');if(td.classList.contains('t-pg'))td.querySelector('.ntb-bar').style.setProperty('--p',Math.max(0,Math.min(100,numOf(v)??0))+'%');
      if(b.cols[cc].t==='num'){const s=$(`.blk[data-id="${b.id}"] [data-sum="${cc}"]`);if(s)s.textContent=fmtN(b.rows.reduce((a,r)=>a+(numOf(r[cc])||0),0))}}
    save(b)},true);
  document.addEventListener('paste',e=>{if(!inPage())return;const el=e.target.closest?.('.ntb .ntb-c');if(!el)return;e.preventDefault();e.stopPropagation();
    const t=(e.clipboardData.getData('text/plain')||'');const b=blk(el);
    // çok satırlı / sekmeli yapıştırma (Excel, Sheets) → hücrelere dağıt
    if(b&&el.dataset.r!=null&&/[\t\n]/.test(t.trim())){const R=t.replace(/\r/g,'').replace(/\n$/,'').split('\n').map(l=>l.split('\t'));const r0=+el.dataset.r,c0=+el.dataset.c;
      R.forEach((row,i)=>{while(b.rows.length<=r0+i)b.rows.push(b.cols.map(()=>''));row.forEach((v,j)=>{if(c0+j>=b.cols.length){b.cols.push(c('Sütun '+(b.cols.length+1)));b.rows.forEach(r=>r.push(''))}b.rows[r0+i][c0+j]=v.trim()})});save(b);redraw(b,[r0,c0]);return}
    document.execCommand('insertText',false,t.replace(/\n/g,' '))},true);
  document.addEventListener('keydown',e=>{if(!inPage())return;const el=e.target.closest?.('.ntb .ntb-c,.ntb .ntb-cy');if(!el)return;const b=blk(el);if(!b)return;
    const r=el.dataset.hc!=null?-1:+el.dataset.r,cc=el.dataset.hc!=null?+el.dataset.hc:+el.dataset.c,n=b.cols.length;
    const go=(rr,c2)=>{const t=$(`.blk[data-id="${b.id}"] ${rr<0?`[data-hc="${c2}"]`:`[data-r="${rr}"][data-c="${c2}"]`}`);if(t){t.focus();if(t.isContentEditable){const g=document.createRange();g.selectNodeContents(t);const s=getSelection();s.removeAllRanges();s.addRange(g)}}};
    if(e.key==='Tab'){e.preventDefault();e.stopPropagation();let rr=r,c2=cc+(e.shiftKey?-1:1);if(c2>=n){c2=0;rr++}if(c2<0){c2=n-1;rr--}if(rr<-1)return;if(rr>=b.rows.length){addRow(b);redraw(b,[rr,0]);return}go(rr,c2);return}
    if(e.key==='Enter'&&!e.shiftKey&&!e.metaKey&&!e.ctrlKey){e.preventDefault();e.stopPropagation();if(r+1>=b.rows.length){addRow(b);redraw(b,[r+1,cc]);return}go(r+1,cc);return}
    if(e.key==='ArrowDown'&&r+1<b.rows.length&&el.isContentEditable){const s=getSelection();if(s.focusOffset>=(el.textContent||'').length){e.preventDefault();go(r+1,cc)}}
    if(e.key==='ArrowUp'&&r>=0&&el.isContentEditable){const s=getSelection();if(s.focusOffset===0){e.preventDefault();go(r-1,cc)}}
    if(e.key==='Escape'){el.blur()}},true);
  document.addEventListener('click',e=>{if(!inPage())return;const t=e.target;const tb=t.closest?.('.blk[data-t=table]');if(!tb)return;const b=blockOf(tb.dataset.id);if(!b)return;
    const cy=t.closest('[data-tcy]');if(cy){const r=+cy.dataset.r,cc=+cy.dataset.c,L=b.cols[cc].t==='check'?CK:ST;b.rows[r][cc]=L[(Math.max(0,L.indexOf(b.rows[r][cc]))+1)%L.length];save(b);redraw(b,[r,cc]);return}
    const cm=t.closest('[data-tcm]');if(cm){colMenu(b,+cm.dataset.tcm,cm);return}
    const ad=t.closest('[data-tadd]');if(ad){if(ad.dataset.tadd==='row'){addRow(b);redraw(b,[b.rows.length-1,0])}else{addCol(b);redraw(b,[-1,b.cols.length-1])}return}
    if(t.closest('[data-tvar]')){varMenu(b,t.closest('[data-tvar]'));return}});
  document.addEventListener('contextmenu',e=>{if(!inPage())return;const td=e.target.closest?.('.ntb tbody td');if(!td)return;const el=td.querySelector('[data-r]');const b=blk(td);if(!b||!el)return;e.preventDefault();rowMenu(b,+el.dataset.r,td)});
  return{html,create,actions,dismiss:closeMenu,VARIANTS:V}})();
