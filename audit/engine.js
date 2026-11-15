/* ════════════════════════════════════════════════════════════
   Denetçi motoru — bir sayfayı kullanıcının gözünden tarar.
   Kategoriler: erişim (a11y), kullanım, estetik, hız.
   Hem hub'daki Denetçi uygulaması hem de Claude'un yayın öncesi
   kontrolü bu dosyayı kullanır:  Audit.run(document,{mobile:true})
   ════════════════════════════════════════════════════════════ */
(function(){
'use strict';
const CATS={a11y:'Erişilebilirlik',ux:'Kullanılabilirlik',look:'Estetik',design:'Tasarım kararları',perf:'Hız'};
/* tasarım kararı bulgularının önem düzeyi → puan ağırlığı */
const LVL={kritik:'error',yuksek:'warn',orta:'info',dusuk:'info'};
const W={error:14,warn:6,info:2};

function parseColor(c){const sr=String(c).match(/color\(srgb\s+([^)]+)\)/);if(sr){const p=sr[1].split(/[\s\/]+/).filter(Boolean).map(Number);return{r:p[0]*255,g:p[1]*255,b:p[2]*255,a:p.length>3?p[3]:1}}const m=String(c).match(/rgba?\(([^)]+)\)/);if(!m)return null;const p=m[1].split(/[\s,\/]+/).filter(Boolean).map(Number);return{r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1}}
const lum=({r,g,b})=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(r)+.7152*f(g)+.0722*f(b)};
const ratio=(a,b)=>{const x=lum(a),y=lum(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
const mix=(top,bot)=>({r:top.r*top.a+bot.r*(1-top.a),g:top.g*top.a+bot.g*(1-top.a),b:top.b*top.a+bot.b*(1-top.a),a:1});

function sel(el){if(!el||el.nodeType!==1)return'';if(el.id)return'#'+el.id;let s=el.tagName.toLowerCase();
  const c=[...el.classList].slice(0,2).join('.');if(c)s+='.'+c;const t=(el.getAttribute('aria-label')||el.textContent||'').trim().replace(/\s+/g,' ').slice(0,28);return t?`${s} “${t}”`:s}

function visible(el,win){const r=el.getBoundingClientRect();if(r.width<1||r.height<1)return false;const cs=win.getComputedStyle(el);
  if(cs.visibility==='hidden'||cs.display==='none')return false;let p=el;while(p&&p.nodeType===1){const s=win.getComputedStyle(p);if(+s.opacity===0||p.hidden||p.getAttribute('aria-hidden')==='true'||p.inert)return false;p=p.parentElement}return true}
function inViewish(el,win){const r=el.getBoundingClientRect();return r.bottom>-2000&&r.top<win.innerHeight+4000}

function bgOf(el,win){let layers=[],p=el;
  while(p&&p.nodeType===1){const cs=win.getComputedStyle(p);if(cs.backgroundImage&&cs.backgroundImage!=='none'&&!/gradient/.test(cs.backgroundImage))return null;
    const c=parseColor(cs.backgroundColor);if(c&&c.a>0){layers.push(c);if(c.a>=1)break}p=p.parentElement}
  let base={r:255,g:255,b:255,a:1};if(!layers.length||layers[layers.length-1].a<1){const root=parseColor(win.getComputedStyle(el.ownerDocument.documentElement).backgroundColor);if(root&&root.a>0)base=root}
  for(let i=layers.length-1;i>=0;i--)base=mix(layers[i],base);return base}
function opacityChain(el,win){let o=1,p=el;while(p&&p.nodeType===1){o*=+win.getComputedStyle(p).opacity;p=p.parentElement}return o}

function nameOf(el){const a=el.getAttribute('aria-label');if(a&&a.trim())return a.trim();const lb=el.getAttribute('aria-labelledby');if(lb){const t=lb.split(/\s+/).map(id=>el.ownerDocument.getElementById(id)?.textContent||'').join(' ').trim();if(t)return t}
  const t=(el.innerText||el.textContent||'').trim();if(t)return t;const img=el.querySelector('img[alt]');if(img&&img.alt.trim())return img.alt;const st=el.querySelector('svg title');if(st&&st.textContent.trim())return st.textContent;
  if(el.title&&el.title.trim())return el.title.trim();if(el.value&&el.type&&/button|submit/.test(el.type))return el.value;return''}

function run(doc,opt={}){
  const win=doc.defaultView,t0=performance.now(),mobile=!!opt.mobile,out=[];
  const add=(cat,sev,id,title,detail,fix,els)=>{const list=(els||[]).filter(Boolean);out.push({cat,sev,id,title,detail,fix,count:list.length||1,samples:list.slice(0,4).map(sel)})};
  const all=[...doc.body.querySelectorAll('*')].filter(e=>!/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|svg|path|circle|rect|line|g|defs|text|polyline|polygon|ellipse|title)$/.test(e.tagName));
  const vis=all.filter(e=>inViewish(e,win)&&visible(e,win));
  const textEls=vis.filter(e=>[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim().length>0));

  /* ── Erişilebilirlik ── */
  if(!doc.documentElement.lang)add('a11y','warn','lang','Sayfa dili belirtilmemiş','<html lang> yok; ekran okuyucular yanlış dilde okur.','<html lang="tr"> ekle.');
  if(!doc.title.trim())add('a11y','warn','title','Sayfa başlığı yok','Sekmede ve geçmişte boş görünür.','<title> ekle.');
  // skip anything mid-animation (fading in): its contrast isn't final yet
  let animT=new Set();try{animT=new Set(doc.getAnimations().filter(a=>a.playState==='running').map(a=>a.effect&&a.effect.target).filter(Boolean))}catch{}
  const animating=el=>{for(let p=el;p&&p.nodeType===1;p=p.parentElement)if(animT.has(p))return true;return false};
  const lowC=[],lowCwarn=[];
  for(const el of textEls.slice(0,900)){if(animating(el))continue;const cs=win.getComputedStyle(el);const fg=parseColor(cs.color);if(!fg)continue;const bg=bgOf(el,win);if(!bg)continue;
    if(el.closest('[disabled],input,textarea,select,option'))continue;
    const op=opacityChain(el,win),f={...fg,a:fg.a*op},c=ratio(mix(f,bg),bg),size=parseFloat(cs.fontSize),bold=+cs.fontWeight>=600,large=size>=24||(size>=18.6&&bold);
    const need=large?3:4.5;if(c<need-1.2)lowC.push(el);else if(c<need)lowCwarn.push(el)}
  if(lowC.length)add('a11y','error','contrast','Okunması zor metin','Metin ile arka plan arasındaki kontrast WCAG AA sınırının çok altında.','Metni koyulaştır (ör. --ink3 yerine --ink2) ya da arka planı değiştir.',lowC);
  if(lowCwarn.length)add('a11y','warn','contrast2','Kontrastı sınırda metin','AA sınırına (4.5:1, büyük metinde 3:1) biraz uzak.','Rengi bir ton koyulaştır.',lowCwarn);
  const inter=vis.filter(e=>e.matches('a[href],button,[role=button],input:not([type=hidden]),select,textarea,summary,[tabindex]:not([tabindex="-1"])'));
  const noName=inter.filter(e=>e.matches('a,button,[role=button]')&&!nameOf(e));
  if(noName.length)add('a11y','error','name','Adı olmayan düğme/link','Ekran okuyucu bu düğmeyi “düğme” diye okur, ne yaptığı anlaşılmaz.','aria-label ya da title ekle.',noName);
  const noLabel=inter.filter(e=>e.matches('input:not([type=button]):not([type=submit]):not([type=checkbox]):not([type=radio]),select,textarea')&&!e.getAttribute('aria-label')&&!(e.id&&doc.querySelector(`label[for="${CSS.escape(e.id)}"]`))&&!e.closest('label'));
  const onlyPh=noLabel.filter(e=>e.placeholder),noLab2=noLabel.filter(e=>!e.placeholder);
  if(noLab2.length)add('a11y','error','label','Etiketsiz giriş alanı','Ne yazılacağı belli değil.','<label> ya da aria-label ekle.',noLab2);
  if(onlyPh.length)add('a11y','info','placeholder','Sadece placeholder ile etiketlenmiş alan','Yazmaya başlayınca ipucu kaybolur.','aria-label ekle (görünür etiket şart değil).',onlyPh);
  const imgs=vis.filter(e=>e.tagName==='IMG'&&!e.hasAttribute('alt'));
  if(imgs.length)add('a11y','error','alt','Alternatif metni olmayan görsel','Görsel ekran okuyucuya anlatılamıyor.','alt="" (süs) ya da açıklayıcı alt ekle.',imgs);
  let focusKill=false,focusVis=false;try{for(const ss of doc.styleSheets){let rules;try{rules=ss.cssRules}catch{continue}for(const r of rules){const t=r.cssText||'';if(/:focus-visible/.test(t))focusVis=true;if(/:focus\b(?!-)/.test(t)&&/outline:\s*(none|0)/.test(t))focusKill=true}}}catch{}
  if(focusKill&&!focusVis)add('a11y','warn','focus','Klavye odağı görünmüyor','Tab ile gezerken nerede olduğun görünmez.',':focus-visible için belirgin bir outline ekle.');
  const ids={};doc.querySelectorAll('[id]').forEach(e=>ids[e.id]=(ids[e.id]||0)+1);const dup=Object.keys(ids).filter(k=>ids[k]>1);
  if(dup.length)add('a11y','warn','dupid','Tekrarlanan id',`${dup.slice(0,5).join(', ')} birden fazla kez kullanılmış.`,'id’leri benzersiz yap.');

  /* ── Kullanılabilirlik ── */
  if(!doc.querySelector('meta[name=viewport]'))add('ux','error','viewport','Mobil görünüm ayarı yok','Telefonda sayfa küçülmüş masaüstü gibi açılır.','<meta name="viewport" content="width=device-width, initial-scale=1"> ekle.');
  if(mobile){const sw=doc.documentElement.scrollWidth,cw=win.innerWidth;if(sw>cw+2){const wide=vis.filter(e=>e.getBoundingClientRect().right>cw+2&&getComputedStyle(e).position!=='fixed').slice(-4);
      add('ux','error','overflow','Yatay taşma',`Sayfa telefonda ${sw-cw}px sağa taşıyor; yana kayıyor.`,'Taşan öğeye min-width:0 / max-width:100% ver, grid için minmax(0,1fr) kullan.',wide)}}
  const tiny=[],small=[];for(const e of inter){if(e.closest('[inert]'))continue;const r=e.getBoundingClientRect();const m=Math.min(r.width,r.height);
    if(m<24&&!(e.tagName==='A'&&getComputedStyle(e).display==='inline'))tiny.push(e);else if(mobile&&m<36)small.push(e)}
  if(tiny.length)add('ux','error','target','Çok küçük dokunma alanı','24px’ten küçük düğmeler parmakla zor tutturulur (WCAG 2.5.8).','Düğmeyi en az 24×24, telefonda tercihen 40×40 yap; padding ile büyüt.',tiny);
  if(small.length)add('ux','warn','target2','Küçük dokunma alanı','Telefonda 36px altı düğmeler yanlış basmaya açık.','Telefonda 40px civarına çıkar.',small);
  const smallText=textEls.filter(e=>parseFloat(getComputedStyle(e).fontSize)<(mobile?11.5:10.5));
  if(smallText.length)add('ux','warn','fontsize','Çok küçük yazı',`${mobile?'Telefonda 11.5px':'10.5px'} altı yazılar zor okunur.`,'En az 12px kullan; etiketlerde 11px’in altına inme.',smallText);
  const longLines=vis.filter(e=>e.matches('p,li,blockquote')&&e.textContent.length>120).filter(e=>{const fs=parseFloat(getComputedStyle(e).fontSize);return e.getBoundingClientRect().width/(fs*.52)>95});
  if(longLines.length)add('ux','info','measure','Satırlar çok uzun','95 karakteri aşan satırlar zor takip edilir.','Metin sütununu max-width:68ch ile sınırla.',longLines);

  /* ── Estetik ── */
  const fam=new Set(),sizes=new Set(),cols=new Set(),radii=new Set();
  for(const e of textEls){const cs=getComputedStyle(e);fam.add(cs.fontFamily.split(',')[0].replace(/["']/g,'').trim());sizes.add(Math.round(parseFloat(cs.fontSize)));cols.add(cs.color)}
  for(const e of vis){const r=getComputedStyle(e).borderTopLeftRadius;if(r&&r!=='0px'&&!r.includes('%'))radii.add(Math.round(parseFloat(r)))}
  if(fam.size>3)add('look','warn','fonts','Fazla yazı tipi',`${fam.size} farklı yazı tipi: ${[...fam].join(', ')}.`,'En fazla 2–3 aile (gövde, mono, başlık) kullan.');
  if(sizes.size>13)add('look','info','scale','Dağınık yazı boyutları',`${sizes.size} farklı boyut: ${[...sizes].sort((a,b)=>a-b).join(', ')}px.`,'Bir tip ölçeği belirle (ör. 11/12/13/15/18/24/34/48).');
  if(cols.size>16)add('look','info','colors','Çok fazla metin rengi',`${cols.size} farklı metin rengi.`,'Metin için 3–4 ton (ink, ink2, ink3) + vurgu rengiyle sınırla.');
  if(radii.size>9)add('look','info','radii','Tutarsız köşe yuvarlamaları',`${radii.size} farklı radius: ${[...radii].sort((a,b)=>a-b).join(', ')}px.`,'Radius ölçeğini 6/9/12/16/20 gibi birkaç değere indir.');
  const segLike=p=>{if(!p)return false;const cs=getComputedStyle(p);return(parseColor(cs.backgroundColor)?.a>0)||cs.boxShadow!=='none'||p.getAttribute('role')==='tablist'};
  const crowd=vis.filter(e=>e.matches('button,.btn,.chip')&&!segLike(e.parentElement)).filter(e=>{const r=e.getBoundingClientRect(),n=e.nextElementSibling;if(!n||!visible(n,win))return false;const q=n.getBoundingClientRect();return Math.abs(q.top-r.top)<4&&q.left-r.right>=0&&q.left-r.right<3});
  if(crowd.length>2)add('look','info','spacing','Birbirine yapışık düğmeler','Aralarında 3px’ten az boşluk olan düğmeler var.','Düğme grupları arasında en az 6–8px gap bırak.',crowd);

  /* ── Tasarım kararları: kıdemli bir Apple/Google tasarımcısının soracağı sorular ──
     Her bulgu bir karar önerir (fix) ve önem düzeyi taşır: kritik · yüksek · orta · düşük. */
  const addD=(lvl,id,title,detail,fix,els)=>{add('design',LVL[lvl],id,title,detail,fix,els);out[out.length-1].lvl=lvl};
  const R=e=>e.getBoundingClientRect(),bgOn=e=>{const cs=getComputedStyle(e);return(parseColor(cs.backgroundColor)?.a>.04)||cs.boxShadow!=='none'||parseFloat(cs.borderTopWidth)>0||cs.backgroundImage!=='none'};
  const txt=e=>(e.textContent||'').replace(/\s+/g,' ').trim().toLocaleLowerCase('tr');
  const heads=vis.filter(e=>/^H[1-3]$/.test(e.tagName)&&txt(e));
  const ctrls=vis.filter(e=>e.matches('button,[role=button],select,a.btn,input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=hidden])'));
  // 1) Başlığa yapışık araç: başlık metninin hemen sağında (≤32px) duran, başlığın parçası olmayan kontrol
  const glued=[];for(const h of heads){const rg=doc.createRange();rg.selectNodeContents(h);const tr=rg.getBoundingClientRect();if(!tr.width)continue;
    for(const c of ctrls){if(h.contains(c))continue;const r=R(c);if(!r.width)continue;const mid=r.top+r.height/2;
      if(mid>tr.top-4&&mid<tr.bottom+4&&r.left-tr.right>=0&&r.left-tr.right<=32&&r.width<160)glued.push(c)}}
  if(glued.length)addD('yuksek','glued','Düğme başlığın parçası gibi duruyor','Başlığın hemen yanındaki araç, başlığa ait bir şeymiş gibi okunuyor; görsel hiyerarşiyi bozuyor.','Aracı sayfanın sağ üstündeki araç grubuna taşı (sol: başlık · sağ: arama, filtre, görünüm).',glued);
  // 2) Aynı başlık iki kez: başlığın hemen üstünde (≤120px) aynı metin
  const dupH=[];for(const h of heads){const t=txt(h),hr=R(h);for(const e of textEls){if(e===h||h.contains(e)||e.contains(h)||e.closest('nav,[role=navigation],[role=tablist],[aria-hidden=true]'))continue;const r=R(e);if(r.bottom<=hr.top+2&&hr.top-r.bottom<120&&txt(e)===t)dupH.push(e)}}
  if(dupH.length)addD('yuksek','duptitle','Aynı başlık iki kez','Başlığın hemen üstünde aynı ad tekrar ediyor (ör. yol satırı + başlık). Göz iki kez aynı şeyi okuyor.','Üstteki tekrarı kaldır; yol satırını sadece iç içe sayfalarda göster.',dupH);
  // 3) Aynı satırdaki kontrollerin yüksekliği farklı (araç gruplarında tutarlılık)
  const rows=new Map();for(const c of ctrls){if(!bgOn(c))continue;const p=c.parentElement;if(!p)continue;const cs=getComputedStyle(p);if(!/flex/.test(cs.display)||/column/.test(cs.flexDirection))continue;(rows.get(p)||rows.set(p,[]).get(p)).push(c)}
  const uneven=[];for(const [p,l] of rows){if(l.length<3)continue;const hs=l.map(c=>Math.round(R(c).height)),mx=Math.max(...hs),mn=Math.min(...hs);if(mx-mn>6)uneven.push(p)}
  if(uneven.length)addD('orta','rowheight','Aynı sıradaki düğmelerin boyu farklı','Yan yana duran kontroller farklı yüksekliklerde; satır dalgalı görünüyor.','Bir araç satırındaki bütün kontrolleri aynı yüksekliğe (ör. 36px) getir.',uneven);
  // 4) Aynı gruptaki ikonlar farklı boyutta
  const iconMix=[];for(const [p,l] of rows){const sz=l.map(c=>c.querySelector('svg')).filter(Boolean).map(s=>Math.round(R(s).width)).filter(w=>w>0);if(sz.length>=3&&Math.max(...sz)-Math.min(...sz)>3)iconMix.push(p)}
  if(iconMix.length)addD('dusuk','iconsize','İkonlar aynı ölçekte değil','Aynı araç grubundaki ikonlar farklı boyutlarda.','Gruptaki ikonları tek ölçüye (ör. 16px) indir.',iconMix);
  // 5) Neredeyse hizalı: sol kenarları 1–4px farkla kaçan başlıklar ve bölüm başları (ortak çizgiye oturmuyor)
  const edges=heads.map(h=>({e:h,x:Math.round(R(h).left)})).filter(o=>o.x>0),near=[];
  const layer=e=>e.closest('[aria-modal=true],[role=dialog]');
  for(let i=0;i<edges.length;i++)for(let j=i+1;j<edges.length;j++){if(layer(edges[i].e)!==layer(edges[j].e))continue;const d=Math.abs(edges[i].x-edges[j].x);if(d>=1&&d<=4)near.push(edges[j].e)}
  if(near.length)addD('orta','nearalign','Neredeyse hizalı başlıklar','Bazı başlıkların sol kenarı birkaç piksel kaymış; ortak hizaya oturmuyor.','Başlıkları aynı kenar boşluğuna bağla (aynı padding değişkeni).',near);
  // 6) Aynı işi yapan iki kontrol yan yana (ör. iki ayrı “Favori”)
  const nm=c=>(c.getAttribute('aria-label')||c.getAttribute('title')||txt(c)).toLocaleLowerCase('tr').replace(/\s+/g,' ').trim(),twin=[];
  // ortak atanın altında iki kontrolü taşıyan dallar aynı türdense (liste satırı, aynı tip grup) bu tekrar eden yapıdır, ikiz değil
  const repeated=(a,b)=>{let l=a.parentElement;while(l&&!l.contains(b))l=l.parentElement;if(!l||R(l).width>640)return true;const up=(x)=>{while(x.parentElement!==l)x=x.parentElement;return x};const ca=up(a),cb=up(b);return ca!==cb&&ca.tagName===cb.tagName&&ca.className===cb.className};
  for(let i=0;i<ctrls.length;i++){const a=nm(ctrls[i]);if(!a||a.length<4)continue;const ra=R(ctrls[i]);for(let j=i+1;j<ctrls.length;j++){if(nm(ctrls[j])!==a)continue;const rb=R(ctrls[j]);if(Math.hypot(ra.left-rb.left,ra.top-rb.top)<260&&!repeated(ctrls[i],ctrls[j])){twin.push(ctrls[j]);break}}}
  if(twin.length)addD('orta','twin','Aynı iş için iki kontrol','Yakın duran iki düğme aynı işi yapıyor; hangisine basılacağı belirsiz.','Birini kaldır; işi tek, doğru yerdeki kontrole bırak.',twin);
  // 7) Gereksiz renk: arayüz kontrollerinde 3'ten fazla farklı doygun renk (içerik görselleri hariç)
  const hues=new Set(),loud=[];for(const c of ctrls){const k=parseColor(getComputedStyle(c).backgroundColor);if(!k||k.a<.5)continue;const mx=Math.max(k.r,k.g,k.b),mn=Math.min(k.r,k.g,k.b);if(mx-mn<60)continue;const h=Math.round(Math.atan2(Math.sqrt(3)*(k.g-k.b),2*k.r-k.g-k.b)*180/Math.PI/30);if(!hues.has(h)){hues.add(h);loud.push(c)}}
  if(hues.size>3)addD('orta','loud','Kontrollerde gereğinden fazla renk',`${hues.size} farklı renkli düğme var; vurgu rengi anlamını yitiriyor.`,'Kontrolleri nötr (beyaz/gri) tut; rengi sadece anlam taşıyan tek vurguya bırak.',loud);
  // 8) Başlık gereğinden büyük (vitrin/hero dışında)
  const huge=heads.filter(h=>h.tagName==='H1'&&!h.closest('.mh,.hero,[class*=hero]')&&parseFloat(getComputedStyle(h).fontSize)>(mobile?32:42));
  if(huge.length)addD('dusuk','bigtitle','Başlık gereğinden büyük','Sayfa başlığı içerikten fazla dikkat çekiyor ve dikey alan harcıyor.',`Sayfa başlığını ${mobile?'22–28':'24–32'}px aralığına indir.`,huge);

  /* ── Hız ── */
  const n=doc.getElementsByTagName('*').length;
  if(n>3000)add('perf','error','dom','Çok büyük sayfa',`${n} öğe; kaydırma ve açılış yavaşlar.`,'Görünmeyen listeleri sanallaştır, gereksiz sarmalayıcıları kaldır.');else if(n>1500)add('perf','warn','dom','Büyük sayfa',`${n} öğe.`,'Öğe sayısını azaltmayı düşün.');
  let nav=null;try{nav=win.performance.getEntriesByType('navigation')[0]}catch{}
  if(nav&&nav.domContentLoadedEventEnd>0){const ms=Math.round(nav.domContentLoadedEventEnd);if(ms>2500)add('perf','warn','load','Geç açılıyor',`İçerik ${ms}ms’de hazır oldu.`,'Fontları/ağır scriptleri ertele, gereksiz istekleri kaldır.')}
  let big=[];try{big=win.performance.getEntriesByType('resource').filter(r=>r.transferSize>400000).map(r=>r.name.split('/').pop())}catch{}
  if(big.length)add('perf','warn','heavy','Ağır dosya',`400 KB üstü: ${big.slice(0,3).join(', ')}.`,'Görselleri sıkıştır (webp), büyük kütüphaneleri çıkar.');

  /* ── Puan ── */
  const score={};for(const c of Object.keys(CATS)){let s=100;for(const f of out)if(f.cat===c)s-=W[f.sev]+(f.sev==='error'?Math.min(10,f.count-1):0);score[c]=Math.max(0,Math.round(s))}
  score.total=Math.round((score.a11y*.3+score.ux*.25+score.look*.15+score.design*.15+score.perf*.15));
  return{at:Date.now(),mobile,url:doc.location.pathname,findings:out.sort((a,b)=>W[b.sev]-W[a.sev]),score,stats:{nodes:n,fonts:[...fam],sizes:sizes.size,colors:cols.size,ms:Math.round(performance.now()-t0)}}
}
const api={run,CATS,LVL};
if(typeof window!=='undefined')window.Audit=api;
})();
