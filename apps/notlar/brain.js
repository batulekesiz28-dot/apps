/* ════════════════════════════════════════════════════════════
   Second Brain — bilgi grafiği
   Gerçek veriden çizilir: sayfalar, Library içerikleri, konular (#etiket), koleksiyonlar.
   Kenarlar: elle kurulan bağlantılar (KB.links), sayfadaki sayfa/kaynak blokları, alt sayfa (parent),
   koleksiyon üyeliği, etiketler. Kuvvet yönelimli yerleşim (canvas), kaydır/yakınlaştır/sürükle.
   Notlar'ın genel değişkenlerine (pages, titleOf, iconOf, firstText, go…) sadece çalışırken erişir.
   ════════════════════════════════════════════════════════════ */
const Brain=(()=>{
  const q=(s,r=document)=>r.querySelector(s);
  const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const lsg=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}};
  const lss=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
  const still=()=>matchMedia('(prefers-reduced-motion: reduce)').matches||document.documentElement.dataset.motion==='off';
  const KC={page:'#8E9BFF',item:'#F0A04B',topic:'#4FD1A1',col:'#E879A6'};
  const KN={page:'Not',item:'Kaynak',topic:'Konu',col:'Koleksiyon'};
  const S=p=>`<svg class="li" viewBox="0 0 16 16" aria-hidden="true">${p}</svg>`;
  const IC={x:S('<path d="M4 4l8 8M12 4l-8 8"/>'),search:S('<circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14"/>'),plus:S('<path d="M8 3v10M3 8h10"/>'),minus:S('<path d="M3 8h10"/>'),
    fit:S('<path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10"/>'),focus:S('<circle cx="8" cy="8" r="2"/><circle cx="8" cy="8" r="5.5"/>'),open:S('<path d="M6 3H3v10h10v-3M9 3h4v4M13 3L7.5 8.5"/>'),
    link:S('<path d="M7 9a3 3 0 0 0 4.2 0l2-2a3 3 0 0 0-4.2-4.2l-.7.7M9 7a3 3 0 0 0-4.2 0l-2 2a3 3 0 0 0 4.2 4.2l.7-.7"/>'),spark:S('<path d="M8 1.5l1.6 4.9 4.9 1.6-4.9 1.6L8 14.5l-1.6-4.9L1.5 8l4.9-1.6z"/>'),
    graph:S('<circle cx="4" cy="4" r="2"/><circle cx="12" cy="5" r="2"/><circle cx="7" cy="12" r="2"/><path d="M5.8 4.4l4.3.4M5 5.7l1.4 4.4M10.8 6.6L8.3 10.4"/>'),book:S('<path d="M3 2.5h7.5a2 2 0 0 1 2 2v9H5a2 2 0 0 1-2-2z"/><path d="M3 11.5a2 2 0 0 1 2-2h7.5"/>')};

  const G={nodes:[],map:new Map(),edges:[],adj:new Map(),cam:{x:0,y:0,k:1},sel:null,hov:null,qy:'',alpha:0,raf:0,cv:null,ctx:null,w:0,h:0,dpr:1,un:null,ro:null,
    cfg:Object.assign({page:1,item:1,topic:1,col:1,daily:0,local:0,depth:2,labels:1},lsg('brain:cfg',{})),fitted:false,ai:null};
  const saveCfg=()=>lss('brain:cfg',G.cfg);
  const alive=()=>G.cv&&G.cv.isConnected;

  /* ── veri → grafik ── */
  function build(){
    const old=G.map,nodes=[],map=new Map(),edges=[],ek=new Set(),F=G.cfg;
    const add=(id,kind,label,color,x={})=>{if(map.has(id))return;const o=old.get(id);
      const n={id,kind,label:label||'Adsız',color,deg:0,x:o?o.x:NaN,y:o?o.y:NaN,vx:0,vy:0,fx:null,fy:null,...x};nodes.push(n);map.set(id,n)};
    if(F.page&&typeof pages!=='undefined')for(const p of pages.values()){const d=p.tpl==='daily';if(d&&!F.daily)continue;add(p.id,'page',titleOf(p),KC.page,{icon:iconOf(p),daily:d})}
    if(F.item)for(const it of KB.items.values())add(it.id,'item',it.title,(KB.TYPES[it.type]||KB.TYPES.file).c,{type:it.type,fav:it.fav});
    if(F.col)for(const c of KB.cols.values())add(c.id,'col',c.name,c.color,{emoji:c.emoji});
    if(F.topic)for(const[t]of KB.allTags())add('t:'+t,'topic','#'+t,KB.topics[t]?.color||KC.topic);
    const ed=(a,b,k)=>{if(!a||!b||a===b||!map.has(a)||!map.has(b))return;const key=a<b?a+'|'+b:b+'|'+a;if(ek.has(key)){if(k==='link')edges.find(e=>e.key===key).k='link';return}ek.add(key);edges.push({key,s:map.get(a),t:map.get(b),k})};
    for(const[a,b]of KB.links)ed(a,b,'link');
    if(typeof pages!=='undefined')for(const p of pages.values()){for(const r of KB.pageRefs(p.id))ed(p.id,r,'ref');if(p.parent)ed(p.id,p.parent,'ref');for(const t of KB.ptags[p.id]||[])ed(p.id,'t:'+t,'tag')}
    for(const it of KB.items.values()){it.cols.forEach(c=>ed(it.id,c,'col'));it.tags.forEach(t=>ed(it.id,'t:'+t,'tag'))}
    const adj=new Map(nodes.map(n=>[n.id,new Set()]));
    for(const e of edges){e.s.deg++;e.t.deg++;adj.get(e.s.id).add(e.t.id);adj.get(e.t.id).add(e.s.id)}
    // yeni düğümleri bağlı olduğu bir komşunun yanına koy (ilk açılışta spiral)
    let i=0;for(const n of nodes){n.r=(n.kind==='topic'?5:n.kind==='col'?8:6.5)+Math.min(14,Math.sqrt(n.deg)*2.6);if(!isNaN(n.x))continue;
      const nb=[...adj.get(n.id)].map(id=>map.get(id)).find(m=>!isNaN(m.x));
      if(nb){const a=Math.random()*6.28;n.x=nb.x+Math.cos(a)*40;n.y=nb.y+Math.sin(a)*40}else{const a=i*2.39996,r=18*Math.sqrt(++i);n.x=Math.cos(a)*r*3;n.y=Math.sin(a)*r*3}}
    Object.assign(G,{nodes,map,edges,adj});
    if(G.sel&&!map.has(G.sel))G.sel=null;
  }
  // yerel grafik: seçilenden derinlik kadar komşu
  function visSet(){if(!G.cfg.local||!G.sel||!G.map.has(G.sel))return null;const s=new Set([G.sel]);let fr=[G.sel];
    for(let d=0;d<G.cfg.depth;d++){const nx=[];for(const id of fr)for(const m of G.adj.get(id)||[])if(!s.has(m)){s.add(m);nx.push(m)}fr=nx}return s}

  /* ── fizik ── */
  function tick(vis){const ns=vis?G.nodes.filter(n=>vis.has(n.id)):G.nodes,a=G.alpha,N=ns.length;
    for(let i=0;i<N;i++){const A=ns[i];for(let j=i+1;j<N;j++){const B=ns[j];let dx=B.x-A.x,dy=B.y-A.y,d2=dx*dx+dy*dy;
        if(d2>250000)continue;if(d2<1){dx=Math.random()-.5;dy=Math.random()-.5;d2=1}
        const f=-(420+(A.deg+B.deg)*14)*a/d2;A.vx+=dx*f*.5;A.vy+=dy*f*.5;B.vx-=dx*f*.5;B.vy-=dy*f*.5}}
    for(const e of G.edges){const s=e.s,t=e.t;if(vis&&!(vis.has(s.id)&&vis.has(t.id)))continue;
      let dx=t.x+t.vx-s.x-s.vx,dy=t.y+t.vy-s.y-s.vy,l=Math.sqrt(dx*dx+dy*dy)||1;const L=(e.k==='tag'?62:e.k==='col'?70:80)+s.r+t.r;
      const st=(e.k==='link'?.12:.07)/Math.min(s.deg,t.deg||1);l=(l-L)/l*a*st*3;dx*=l;dy*=l;const b=s.deg/(s.deg+t.deg);t.vx-=dx*b;t.vy-=dy*b;s.vx+=dx*(1-b);s.vy+=dy*(1-b)}
    for(const n of ns){n.vx-=n.x*.006*a*(n.deg?1:2.5);n.vy-=n.y*.006*a*(n.deg?1:2.5);
      if(n.fx!=null){n.x=n.fx;n.y=n.fy;n.vx=n.vy=0}else{n.vx*=.58;n.vy*=.58;n.x+=n.vx;n.y+=n.vy}}
    G.alpha+=(0-G.alpha)*.0228}
  function heat(a=.6){G.alpha=Math.max(G.alpha,a);if(still()){const v=visSet();for(let i=0;i<260&&G.alpha>.004;i++)tick(v);G.alpha=0;draw();return}loop()}
  function loop(){if(G.raf)return;const f=()=>{G.raf=0;if(!alive())return stop();const v=visSet();if(G.alpha>.004){tick(v);if(G.alpha>.2)tick(v)}
      if(G.flyT)stepFly();draw();if(G.alpha>.004||G.flyT||G.anim)G.raf=requestAnimationFrame(f)};G.raf=requestAnimationFrame(f)}
  function stop(){cancelAnimationFrame(G.raf);G.raf=0;G.ro?.disconnect();G.ro=null;if(G.un){G.un();G.un=null}}

  /* ── kamera ── */
  const toW=(sx,sy)=>({x:(sx-G.w/2-G.cam.x)/G.cam.k,y:(sy-G.h/2-G.cam.y)/G.cam.k});
  const toS=(x,y)=>({x:x*G.cam.k+G.w/2+G.cam.x,y:y*G.cam.k+G.h/2+G.cam.y});
  function zoomAt(sx,sy,f){const c=G.cam,k=Math.min(4,Math.max(.12,c.k*f)),w=toW(sx,sy);c.k=k;c.x=sx-G.w/2-w.x*k;c.y=sy-G.h/2-w.y*k;G.flyT=null;draw();zl()}
  function flyTo(x,y,k){const c=G.cam;k=k??c.k;const to={x:-x*k,y:-y*k,k};if(still()){Object.assign(c,to);draw();zl();return}G.flyT={from:{...c},to,t0:performance.now(),d:620};loop()}
  function stepFly(){const f=G.flyT,p=Math.min(1,(performance.now()-f.t0)/f.d),e=1-Math.pow(1-p,4),c=G.cam;
    c.x=f.from.x+(f.to.x-f.from.x)*e;c.y=f.from.y+(f.to.y-f.from.y)*e;c.k=f.from.k+(f.to.k-f.from.k)*e;zl();if(p>=1)G.flyT=null}
  function fit(anim=true){const v=visSet(),ns=G.nodes.filter(n=>!v||v.has(n.id));if(!ns.length||!G.w)return;
    let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const n of ns){x0=Math.min(x0,n.x-n.r);y0=Math.min(y0,n.y-n.r);x1=Math.max(x1,n.x+n.r);y1=Math.max(y1,n.y+n.r)}
    const padR=G.sel&&G.w>760?380:0,k=Math.min(1.6,Math.max(.15,Math.min((G.w-padR-120)/(x1-x0||1),(G.h-160)/(y1-y0||1))));
    const cx=(x0+x1)/2+padR/2/k,cy=(y0+y1)/2;anim?flyTo(cx,cy,k):(Object.assign(G.cam,{x:-cx*k,y:-cy*k,k}),zl())}
  const zl=()=>{const z=q('.b-zl');if(z)z.textContent='%'+Math.round(G.cam.k*100)};

  /* ── çizim ── */
  function shape(c,n,r){if(n.kind==='item'){const s=r*.92,rr=r*.35;c.beginPath();c.roundRect(n.x-s,n.y-s*1.15,s*2,s*2.3,rr);return}
    if(n.kind==='topic'){c.beginPath();for(let i=0;i<6;i++){const a=Math.PI/3*i+Math.PI/6;c[i?'lineTo':'moveTo'](n.x+Math.cos(a)*r*1.12,n.y+Math.sin(a)*r*1.12)}c.closePath();return}
    c.beginPath();c.arc(n.x,n.y,r,0,6.2832)}
  function draw(){if(!alive())return;const c=G.ctx,{w,h,dpr,cam}=G;c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);
    const v=visSet(),qy=G.qy,match=qy?new Set(G.nodes.filter(n=>KB.low(n.label).includes(qy)).map(n=>n.id)):null;
    const fid=G.hov||G.sel,fs=fid?new Set([fid,...(G.adj.get(fid)||[])]):null;
    const on=n=>!v||v.has(n.id),lit=n=>(!fs||fs.has(n.id))&&(!match||match.has(n.id));
    c.save();c.translate(w/2+cam.x,h/2+cam.y);c.scale(cam.k,cam.k);
    const lw=1/Math.sqrt(cam.k);
    for(const e of G.edges){if(!on(e.s)||!on(e.t))continue;const hot=fs&&(e.s.id===fid||e.t.id===fid),dim=(fs&&!hot)||(match&&!(match.has(e.s.id)||match.has(e.t.id)));
      c.globalAlpha=hot?.95:dim?.05:e.k==='link'?.5:.24;c.strokeStyle=e.k==='link'?'#B9C2FF':e.k==='tag'?KC.topic:e.k==='col'?e.t.kind==='col'?e.t.color:e.s.color:'#D7DBF0';
      c.lineWidth=(e.k==='link'?1.8:1.05)*lw*(hot?1.5:1);c.setLineDash(e.k==='tag'?[3*lw,4*lw]:[]);c.beginPath();c.moveTo(e.s.x,e.s.y);c.lineTo(e.t.x,e.t.y);c.stroke()}
    c.setLineDash([]);
    for(const n of G.nodes){if(!on(n))continue;const L=lit(n),r=n.r*(n.id===G.hov?1.18:1);c.globalAlpha=L?1:.12;
      if(n.id===G.sel||(L&&n.id===G.hov)){c.save();c.globalAlpha=.32;c.fillStyle=n.color;shape(c,n,r*2.1);c.filter='blur(6px)';c.fill();c.restore();c.globalAlpha=1}
      if(n.kind==='col'){shape(c,n,r);c.fillStyle='#10131F';c.fill();c.lineWidth=r*.42;c.strokeStyle=n.color;c.stroke()}
      else{shape(c,n,r);const g=c.createRadialGradient(n.x-r*.35,n.y-r*.4,r*.1,n.x,n.y,r*1.2);g.addColorStop(0,'#fff');g.addColorStop(.18,n.color);g.addColorStop(1,shade(n.color));c.fillStyle=g;c.fill()}
      if(n.id===G.sel){c.lineWidth=2*lw;c.strokeStyle='#fff';shape(c,n,r+4*lw);c.stroke()}}
    c.restore();
    // etiketler ekran ölçeğinde: yakınlaşınca, büyük düğümlerde, odakta ya da aramada
    c.font='500 12px Geist,system-ui,sans-serif';c.textAlign='center';c.textBaseline='top';const placed=[];
    const cand=G.nodes.filter(n=>on(n)&&(lit(n)||n.id===G.sel)).sort((a,b)=>(b.id===G.sel)-(a.id===G.sel)||(fs?fs.has(b.id)-fs.has(a.id):0)||b.deg-a.deg);
    for(const n of cand){const show=n.id===G.sel||n.id===G.hov||(fs&&fs.has(n.id))||(match&&match.has(n.id))||(G.cfg.labels&&(cam.k>1.05||(G.nodes.length<=40&&cam.k>.45)||(cam.k>.55&&n.deg>=3)||(cam.k>.32&&n.deg>=7)));if(!show)continue;
      const p=toS(n.x,n.y+n.r+3/cam.k);if(p.x<-80||p.x>w+80||p.y<-20||p.y>h+20)continue;let t=n.label;if(t.length>34)t=t.slice(0,32)+'…';const tw=c.measureText(t).width;
      const bx={x:p.x-tw/2-4,y:p.y,w:tw+8,h:17};if(n.id!==G.sel&&n.id!==G.hov&&placed.some(b=>b.x<bx.x+bx.w&&bx.x<b.x+b.w&&b.y<bx.y+bx.h&&bx.y<b.y+b.h))continue;placed.push(bx);
      c.globalAlpha=1;c.fillStyle='rgba(9,11,20,.72)';c.beginPath();c.roundRect(bx.x,bx.y,bx.w,bx.h,5);c.fill();c.fillStyle=n.id===G.sel?'#fff':'#DDE1F2';c.fillText(t,p.x,p.y+2.5)}
    c.globalAlpha=1}
  const shadeC=new Map();function shade(hex){if(shadeC.has(hex))return shadeC.get(hex);const m=/^#?([\da-f]{6})$/i.exec(hex);let o='#333';if(m){const v=parseInt(m[1],16);o=`rgb(${(v>>16&255)*.45|0},${(v>>8&255)*.45|0},${(v&255)*.45|0})`}shadeC.set(hex,o);return o}

  /* ── etkileşim ── */
  function hit(sx,sy){const w=toW(sx,sy),v=visSet();let best=null,bd=1e9;for(const n of G.nodes){if(v&&!v.has(n.id))continue;const d=Math.hypot(n.x-w.x,n.y-w.y);if(d<n.r+6/G.cam.k&&d<bd){bd=d;best=n}}return best}
  function bindCanvas(cv){const pts=new Map();let drag=null,moved=0,pinch=null;
    const xy=e=>{const r=cv.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}};
    cv.addEventListener('pointerdown',e=>{if(e.button>0)return;cv.setPointerCapture(e.pointerId);const p=xy(e);pts.set(e.pointerId,p);moved=0;G.flyT=null;
      if(pts.size===2){const[a,b]=[...pts.values()];pinch={d:Math.hypot(a.x-b.x,a.y-b.y),k:G.cam.k};drag=null;return}
      const n=hit(p.x,p.y);drag=n?{n,p0:p}:{pan:true,p0:p,c0:{...G.cam}};if(n){n.fx=n.x;n.fy=n.y}cv.classList.add('grab')});
    cv.addEventListener('pointermove',e=>{const p=xy(e);if(pts.has(e.pointerId))pts.set(e.pointerId,p);
      if(pinch&&pts.size===2){const[a,b]=[...pts.values()],d=Math.hypot(a.x-b.x,a.y-b.y);zoomAt((a.x+b.x)/2,(a.y+b.y)/2,(pinch.k*d/pinch.d)/G.cam.k);return}
      if(!drag){const n=hit(p.x,p.y);if((n?.id||null)!==G.hov){G.hov=n?.id||null;cv.style.cursor=n?'pointer':'grab';tip(n,p);draw()}else if(n)tip(n,p);return}
      moved=Math.max(moved,Math.hypot(p.x-drag.p0.x,p.y-drag.p0.y));
      if(drag.pan){G.cam.x=drag.c0.x+p.x-drag.p0.x;G.cam.y=drag.c0.y+p.y-drag.p0.y;draw()}
      else if(moved>3){const w=toW(p.x,p.y);drag.n.fx=w.x;drag.n.fy=w.y;G.hov=drag.n.id;tip(null);heat(.25)}});
    const up=e=>{pts.delete(e.pointerId);if(pinch){if(pts.size<2)pinch=null;return}if(!drag)return;cv.classList.remove('grab');
      if(drag.n){drag.n.fx=drag.n.fy=null;if(moved<=3)select(drag.n.id,{fly:false});else heat(.1)}else if(moved<=3&&!pts.size){select(null)}drag=null};
    cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
    cv.addEventListener('pointerleave',()=>{if(!drag&&G.hov){G.hov=null;tip(null);draw()}});
    cv.addEventListener('dblclick',e=>{const p=xy(e),n=hit(p.x,p.y);if(n)openNode(n.id);else zoomAt(p.x,p.y,1.6)});
    cv.addEventListener('wheel',e=>{e.preventDefault();const p=xy(e);const d=e.deltaMode===1?e.deltaY*16:e.deltaY;zoomAt(p.x,p.y,Math.exp(-d*(e.ctrlKey?.01:.0018)))},{passive:false})}
  function tip(n,p){const t=q('.b-tip');if(!t)return;if(!n||n.id===G.sel){t.hidden=true;return}
    t.hidden=false;t.innerHTML=`<i style="--c:${n.color}"></i><b>${E(n.label)}</b><small>${KN[n.kind]}${n.kind==='item'?' · '+E((KB.TYPES[n.type]||KB.TYPES.file).n):''} · ${n.deg} bağlantı</small>`;
    t.style.transform=`translate(${Math.min(G.w-260,p.x+14)}px,${p.y+14}px)`}

  function select(id,o={}){G.sel=id&&G.map.has(id)?id:null;G.ai=null;const want=G.sel?'#brain/'+encodeURIComponent(G.sel):'#brain';
    if(location.hash!==want)history.replaceState(null,'',want);
    panel();if(G.cfg.local)heat(.3);draw();
    if(G.sel&&o.fly!==false){const n=G.map.get(G.sel),k=Math.max(G.cam.k,.9),wide=G.w>760;flyTo(n.x+(wide?190/k:0),n.y+(wide?0:G.h*.22/k),k)}}
  function openNode(id){const k=KB.kindOf(id);if(k==='page')go('#p/'+id);else if(k==='item')go('#lib/i/'+id);else if(k==='col')go('#lib/col/'+id);else if(k==='topic')go('#lib/tag/'+encodeURIComponent(id.slice(2)))}

  /* ── yan panel ── */
  function rowOf(id,sel){const k=KB.kindOf(id);let vis='',sub='';
    if(k==='page'){const p=pages.get(id);vis=`<span class="br-ic">${E(iconOf(p))}</span>`;sub=p.date?p.date:'Not'}
    else if(k==='item'){const it=KB.items.get(id);vis=Library.cover(it,'mini');sub=(KB.TYPES[it.type]||KB.TYPES.file).n+(it.author?' · '+it.author:'')}
    else if(k==='col'){const c=KB.cols.get(id);vis=`<span class="br-ic" style="--c:${E(c.color)}"><i class="br-ring"></i></span>`;sub='Koleksiyon'}
    else if(k==='topic'){vis=`<span class="br-ic tp">#</span>`;sub='Konu'}
    const ex=sel&&KB.has(sel,id);
    return`<div class="br" data-bsel="${E(id)}" tabindex="0" role="button">${vis}<span class="br-t"><b>${E(KB.titleOfId(id))}</b><small>${E(sub)}${ex?' · elle bağlandı':''}</small></span>${ex?`<button class="bi" data-bun="${E(id)}" title="Bağlantıyı kaldır" aria-label="Bağlantıyı kaldır">${IC.x}</button>`:''}<button class="bi" data-bgo="${E(id)}" title="Aç" aria-label="Aç">${IC.open}</button></div>`}
  function sec(title,ids,sel){return ids.length?`<section class="bs"><h3>${title}<em>${ids.length}</em></h3>${ids.slice(0,40).map(id=>rowOf(id,sel)).join('')}</section>`:''}
  function panel(){const box=q('.bp');if(!box)return;const id=G.sel;q('.brain')?.classList.toggle('has-sel',!!id);
    if(!id){box.innerHTML='';box.hidden=true;return}box.hidden=false;
    const k=KB.kindOf(id),nb=KB.neighbors(id),color=G.map.get(id)?.color||KC[k];
    let vis='',desc='',meta='',edit=false;
    if(k==='page'){const p=pages.get(id);vis=`<span class="bp-ic">${E(iconOf(p))}</span>`;desc=firstText(p).slice(0,260);meta=`${p.blocks.length} blok${p.date?' · '+p.date:''}`}
    else if(k==='item'){const it=KB.items.get(id);vis=Library.cover(it,'');desc=it.desc||it.note||'';meta=[(KB.TYPES[it.type]||KB.TYPES.file).n,it.author,it.site,it.year].filter(Boolean).join(' · ')}
    else if(k==='col'){const c=KB.cols.get(id);vis=`<span class="bp-ic ring" style="--c:${E(c.color)}">${E(c.emoji||'')}</span>`;desc=c.desc;meta=`${nb.length} içerik`}
    else if(k==='topic'){vis=`<span class="bp-ic tp" style="--c:${E(color)}">#</span>`;desc=KB.topics[id.slice(2)]?.desc||'';edit=true;meta=`${nb.length} içerikte geçiyor`}
    const pg=nb.filter(x=>KB.kindOf(x)==='page'),its=nb.filter(x=>KB.kindOf(x)==='item'),cs=nb.filter(x=>KB.kindOf(x)==='col'),ts=nb.filter(x=>KB.kindOf(x)==='topic');
    const sug=KB.related(id,6,{unlinked:true}),men=k==='page'||k==='item'?KB.mentions(id).slice(0,4):[];
    box.innerHTML=`<header class="bp-top"><span class="bp-k" style="--c:${E(color)}">${KN[k]}</span><span class="grow"></span>
        <button class="bi" data-bloc title="Yerel grafik (sadece bu ve komşuları)" aria-label="Yerel grafik" aria-pressed="${!!G.cfg.local}">${IC.focus}</button><button class="bi" data-bx title="Kapat (Esc)" aria-label="Paneli kapat">${IC.x}</button></header>
      <div class="bp-h ${k}">${vis}<div><h2>${E(KB.titleOfId(id))}</h2><p class="bp-m">${E(meta)}</p></div></div>
      ${edit?`<p class="bp-d" contenteditable="true" data-btd="${E(id.slice(2))}" data-ph="Bu konu ne anlatıyor? Kısa bir açıklama yaz…">${E(desc)}</p>`:desc?`<p class="bp-d">${E(desc)}</p>`:''}
      <div class="bp-a"><button class="bb pri" data-bgo="${E(id)}">${IC.open}${k==='page'?'Notu aç':k==='item'?'Kaynağı aç':k==='col'?'Koleksiyonu aç':'Library’de gör'}</button>${k==='page'||k==='item'?`<button class="bb" data-bpick>${IC.link}Bağla…</button>`:''}</div>
      ${sec('Bağlı notlar',pg,id)}${sec('Bağlı içerik',its,id)}${sec('Koleksiyonlar',cs,id)}${sec('Konular',ts,id)}
      ${!nb.length?`<p class="bp-e">Bu ${KN[k].toLowerCase()} henüz hiçbir şeye bağlı değil. Aşağıdaki önerilerden ya da “Bağla…” ile başlayabilirsin.</p>`:''}
      ${k!=='col'&&k!=='topic'&&(sug.length||men.length)?`<section class="bs sug"><h3>${IC.spark}Önerilen bağlantılar<em>onaylamadan bağlanmaz</em></h3>
        ${sug.map(s=>`<div class="bsg">${rowOf(s.id)}<p>${E(s.why)}</p><button class="bb sm" data-blink="${E(s.id)}">Bağla</button></div>`).join('')}
        ${men.map(m=>`<div class="bsg">${rowOf(m)}<p>Metninde “${E(KB.titleOfId(id))}” geçiyor ama bağlı değil</p><button class="bb sm" data-blink="${E(m)}">Bağla</button></div>`).join('')}</section>`:''}
      ${k==='page'||k==='item'?`<section class="bs ai"><h3>${IC.spark}Yapay zekâ<em>${KB.AI.ok()?'Claude anahtarın hazır':'anahtar yok · yerel öneri'}</em></h3><button class="bb" data-bai>Bağlantı öner</button><div class="bai">${aiHTML()}</div></section>`:''}`}
  function aiHTML(){const a=G.ai;if(!a)return'';if(a.loading)return'<span class="sk"></span><span class="sk w"></span>';if(a.err)return`<p class="bp-e">${E(a.err)}</p>`;
    if(!a.list.length)return'<p class="bp-e">Öneri bulunamadı.</p>';return a.list.map(s=>`<div class="bsg">${rowOf(s.id)}<p>${E(s.why)}</p>${KB.has(G.sel,s.id)?'<span class="ok">Bağlandı</span>':`<button class="bb sm" data-blink="${E(s.id)}">Bağla</button>`}</div>`).join('')+(a.local?'<p class="bp-h2">Claude anahtarı eklersen (Netleştir uygulamasında) öneriler anlam olarak da eşleşir.</p>':'')}
  function bindPanel(box){
    box.addEventListener('click',async e=>{const t=e.target.closest('button,[data-bsel]');if(!t)return;const d=t.dataset;
      if(d.bx!=null){select(null);return}
      if(d.bloc!=null){G.cfg.local=G.cfg.local?0:1;saveCfg();syncBar();heat(.5);setTimeout(()=>fit(),still()?0:350);panel();return}
      if(d.bgo){e.stopPropagation();openNode(d.bgo);return}
      if(d.bun){e.stopPropagation();KB.unlink(G.sel,d.bun);toast('Bağlantı kaldırıldı');return}
      if(d.blink){e.stopPropagation();if(KB.link(G.sel,d.blink))toast('Bağlandı');return}
      if(d.bpick!=null){const k=KB.kindOf(G.sel),me=G.sel,cb=id=>{if(id&&KB.link(me,id))toast('Bağlandı')};
        (k==='item'?Library.pagePicker:Library.itemPicker)(t,cb);return}
      if(d.bai!=null){const me=G.sel;G.ai={loading:true};q('.bai',box).innerHTML=aiHTML();
        try{const r=await KB.AI.links(me);if(G.sel!==me)return;G.ai={list:r.list||[],local:r.local}}catch(er){G.ai={err:'Yapay zekâ yanıt vermedi: '+(er.message||er)}}
        const b=q('.bai',box);if(b)b.innerHTML=aiHTML();return}
      if(d.bsel){select(d.bsel)}});
    box.addEventListener('keydown',e=>{const r=e.target.closest('[data-bsel]');if(r&&e.key==='Enter'&&e.target===r){e.preventDefault();select(r.dataset.bsel)}});
    box.addEventListener('focusout',e=>{const el=e.target.closest('[data-btd]');if(el)KB.setTopic(el.dataset.btd,{desc:el.textContent.trim()})})}

  /* ── iskelet ── */
  function counts(){const c={page:0,item:0,topic:0,col:0};G.nodes.forEach(n=>c[n.kind]++);return c}
  function syncBar(){const r=q('.brain');if(!r)return;r.querySelectorAll('[data-bf]').forEach(b=>{b.classList.toggle('on',!!G.cfg[b.dataset.bf]);b.setAttribute('aria-pressed',!!G.cfg[b.dataset.bf])});
    const st=q('.b-st',r);if(st){const c=counts();st.textContent=`${G.nodes.length} düğüm · ${G.edges.length} bağlantı`}
    const em=q('.b-empty',r);if(em)em.hidden=G.nodes.length>0;const hint=q('.b-hint',r);if(hint)hint.hidden=!(G.nodes.length>1&&!G.edges.some(e=>e.k==='link'))}
  function render(parts){parts=parts||[];stop();if(typeof setCrumb==='function')setCrumb(IC.graph,'Second Brain');
    const v=q('#view');const F=[['page','Notlar',KC.page],['item','Kaynaklar',KC.item],['topic','Konular',KC.topic],['col','Koleksiyonlar',KC.col],['daily','Günlükler','#9AA3C7']];
    v.innerHTML=`<div class="brain"><canvas class="b-cv" aria-label="Bilgi grafiği: notlar, kaynaklar, konular ve koleksiyonlar arasındaki bağlantılar. Düğüme tıklayınca ayrıntılar sağda açılır." role="img"></canvas>
      <div class="b-bar"><label class="b-s">${IC.search}<input data-bq placeholder="Grafikte ara…" aria-label="Grafikte ara" autocomplete="off"><kbd>/</kbd></label>
        <div class="b-f" role="group" aria-label="Göster">${F.map(([k,n,c])=>`<button class="b-c" data-bf="${k}" style="--c:${c}"><i></i>${n}</button>`).join('')}</div></div>
      <div class="b-z"><button class="bi" data-bz="1" title="Yakınlaş (+)" aria-label="Yakınlaş">${IC.plus}</button><span class="b-zl">%100</span><button class="bi" data-bz="-1" title="Uzaklaş (−)" aria-label="Uzaklaş">${IC.minus}</button><button class="bi" data-bfit title="Hepsini sığdır (0)" aria-label="Hepsini sığdır">${IC.fit}</button></div>
      <div class="b-leg"><span><i class="lg-p"></i>Not</span><span><i class="lg-i"></i>Kaynak</span><span><i class="lg-t"></i>Konu</span><span><i class="lg-c"></i>Koleksiyon</span><span><i class="lg-l"></i>Elle bağlantı</span><span class="b-st"></span></div>
      <div class="b-hint" hidden>${IC.spark}<span>Henüz elle kurulmuş bağlantı yok — bir düğüme tıkla, açılan paneldeki önerilerden <b>Bağla</b>’ya bas.</span></div>
      <div class="b-empty" hidden><div><span class="b-orb">${IC.graph}</span><h2>İkinci beynin burada büyüyecek</h2><p>Not yazdıkça, Library’ye kaynak ekledikçe ve etiket verdikçe hepsi burada birbirine bağlanan bir ağ olur.</p><div class="bp-a"><a class="bb pri" href="#lib">${IC.book}Library’ye git</a><a class="bb" href="#home">Notlara dön</a></div></div></div>
      <div class="b-tip" hidden></div><aside class="bp" hidden aria-label="Seçilen düğüm"></aside></div>`;
    const root=q('.brain',v),cv=q('.b-cv',root);G.cv=cv;G.ctx=cv.getContext('2d');G.hov=null;G.fitted=false;
    const size=()=>{const r=cv.getBoundingClientRect();G.dpr=Math.min(2,devicePixelRatio||1);G.w=r.width;G.h=r.height;cv.width=r.width*G.dpr|0;cv.height=r.height*G.dpr|0;if(!G.fitted&&G.w){G.fitted=true;settle();}draw()};
    G.ro=new ResizeObserver(size);G.ro.observe(cv);
    bindCanvas(cv);bindPanel(q('.bp',root));
    root.addEventListener('click',e=>{const f=e.target.closest('[data-bf]');if(f){G.cfg[f.dataset.bf]=G.cfg[f.dataset.bf]?0:1;saveCfg();build();syncBar();panel();heat(.7);return}
      const z=e.target.closest('[data-bz]');if(z){zoomAt(G.w/2,G.h/2,+z.dataset.bz>0?1.35:1/1.35);return}if(e.target.closest('[data-bfit]'))fit()});
    const qi=q('[data-bq]',root);qi.addEventListener('input',()=>{G.qy=KB.low(qi.value);draw()});
    qi.addEventListener('keydown',e=>{if(e.key==='Enter'){const n=G.nodes.find(n=>G.qy&&KB.low(n.label).includes(G.qy));if(n){select(n.id);qi.blur()}}if(e.key==='Escape'){qi.value='';G.qy='';draw();qi.blur()}});
    G.un=KB.on(()=>{if(!alive())return stop();build();syncBar();panel();heat(.35)});
    G.sel=parts[0]?decodeURIComponent(parts[0]):G.sel;build();syncBar();panel();
    if(!G.sel&&G.cfg.local){/* yerel grafik seçimsiz anlamsız */}
  }
  // ilk yerleşim: animasyonsuz ısıt, sonra sığdır (açılışta zıplama olmasın)
  function settle(){const v=visSet();G.alpha=1;const n=G.nodes.length,steps=n>400?90:n>150?160:240;for(let i=0;i<steps;i++)tick(v);G.alpha=Math.min(G.alpha,.12);
    if(G.sel&&G.map.has(G.sel)){const m=G.map.get(G.sel);const k=1.1,wide=G.w>760;Object.assign(G.cam,{x:-(m.x+(wide?190/k:0))*k,y:-(m.y+(wide?0:G.h*.22/k))*k,k});zl()}else fit(false);heat(G.alpha)}
  function soft(parts){if(!alive())return false;const id=parts&&parts[0]?decodeURIComponent(parts[0]):null;if(id!==G.sel)select(id);return true}
  // klavye (sadece Brain açıkken)
  addEventListener('keydown',e=>{if(!alive())return;const t=e.target,ed=t.isContentEditable||/INPUT|TEXTAREA|SELECT/.test(t.tagName);if(ed||e.metaKey||e.ctrlKey||e.altKey)return;
    if(document.querySelector('.ld-bg,.la-bg,.rd-bg,.lpick,.pal-bg'))return;
    if(e.key==='/'){e.preventDefault();q('[data-bq]')?.focus()}else if(e.key==='Escape'&&G.sel){select(null)}else if(e.key==='+'||e.key==='='){zoomAt(G.w/2,G.h/2,1.3)}else if(e.key==='-'){zoomAt(G.w/2,G.h/2,1/1.3)}
    else if(e.key==='0'){fit()}else if(e.key==='Enter'&&G.sel&&t===document.body){openNode(G.sel)}else if(e.key.toLowerCase()==='l'&&G.sel){q('[data-bloc]')?.click()}});
  return{render,soft,select,get G(){return G}}})();
