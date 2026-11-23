/* AppShell ortak hareket katmanı — skin.js her uygulamaya otomatik yükler (hub'da ayrıca yüklenir).
   Amaç: hiçbir şey “tak diye” değişmesin, ama süs animasyonu da olmasın. Sadece KULLANICININ yaptığı bir şeyin sonucu canlandırılır
   (son 700 ms içinde tıklama/tuş/dokunma) — saniyelik sayaç, canlı veri yenilemesi gibi kendi kendine olan değişiklikler sessiz kalır.
   1) İçerik değişimi: bir kapsayıcının içi yeniden çizilince yeni gelen öğeler hafifçe belirir (opacity + translate; transform'a dokunmaz,
      çünkü uygulamalar konumu transform'la verebilir). İlk 14 öğe sırayla (24 ms aralık), gerisi birlikte. Çok büyük çizimde (>120 öğe) tek parça.
   2) Gizli öğe açılınca ([hidden] kalkınca) aynı şekilde belirir.
   3) Basılınca hafif çökme (scale .97, iOS gibi) ve renk/arka plan geçişleri — styles(): sıfır özgüllük (:where), uygulamanın kendi geçişi varsa o kazanır.
   Kapatma: html[data-motion=off] ya da prefers-reduced-motion → hiçbir şey oynamaz. Bir bölgeyi dışarıda bırakmak için data-nomotion.
   Uygulamalar elle de kullanabilir: Motion.enter(el), Motion.swap(el, html), Motion.flip(container, fn). */
(function(){
  if(window.Motion)return;
  var root=document.documentElement,RM=matchMedia('(prefers-reduced-motion: reduce)');
  var off=function(){return RM.matches||root.getAttribute('data-motion')==='off'};
  var sade=function(){return root.getAttribute('data-motion')==='reduced'};
  var EASE='cubic-bezier(.2,.8,.2,1)',lastAct=-1e9,lastType=-1e9,recent=new WeakMap();
  // yazarken (arama kutusu, editör) her harfte sonuçlar yeniden canlanmasın — Apple'da da arama sonuçları harf harf solmaz
  addEventListener('input',function(){lastType=performance.now()},{capture:true,passive:true});
  var lastPress=-1e9;
  ['pointerdown','keydown','click','input','change','submit'].forEach(function(t){addEventListener(t,function(e){if(t==='keydown'&&(e.key==='Shift'||e.key==='Control'||e.key==='Alt'||e.key==='Meta'))return;lastAct=performance.now();if(t!=='input')lastPress=lastAct},{capture:true,passive:true})});
  // hashchange/popstate de kullanıcının gezinmesidir
  addEventListener('hashchange',function(){lastAct=performance.now()});addEventListener('popstate',function(){lastAct=performance.now()});
  var userDriven=function(){return performance.now()-lastAct<700};

  function skip(el){
    if(!el||el.nodeType!==1||!el.isConnected)return true;
    var tn=el.tagName;if(tn==='SCRIPT'||tn==='STYLE'||tn==='LINK'||tn==='TEMPLATE'||tn==='BR'||tn==='OPTION')return true;
    if(el.closest('[data-nomotion],[contenteditable=""],[contenteditable=true],iframe,canvas,svg'))return true;
    if(el.getAnimations&&el.getAnimations().length)return true; // kendi animasyonu var
    var cs=getComputedStyle(el);if(cs.display==='none'||cs.visibility==='hidden'||cs.position==='fixed')return true; // sabit paneller kendi açılışını yapar
    if(cs.animationName&&cs.animationName!=='none')return true;
    return false}
  function visibleRect(el){var r=el.getBoundingClientRect();return r.width>2&&r.height>2&&r.bottom>0&&r.top<innerHeight+80?r:null}
  function enter(el,i,big){
    if(off())return;var d=sade()?0:Math.min(i,14)*24,dy=sade()?0:(big?6:4);
    try{el.animate([{opacity:0,translate:'0 '+dy+'px'},{opacity:1,translate:'0 0'}],{duration:sade()?140:260,delay:d,easing:EASE,fill:'backwards'})}catch(e){}}

  var pend=new Set(),raf=0;
  function flush(){raf=0;var list=[...pend];pend.clear();if(off()||!userDriven()||performance.now()-lastType<700)return;
    // en dıştakiler: başka bir eklenmiş öğenin içinde olanları atla
    var top=list.filter(function(e){if(!e.isConnected)return false;for(var p=e.parentElement;p;p=p.parentElement)if(pend.has(p)||list.indexOf(p)>=0)return false;return true});
    if(top.length>120){var parents=new Set(top.map(function(e){return e.parentElement}));parents.forEach(function(p){if(p&&!skip(p)&&visibleRect(p))try{p.animate([{opacity:.0},{opacity:1}],{duration:200,easing:EASE})}catch(e){}});return}
    // aynı kapsayıcı az önce (450 ms) ve arada yeni tıklama olmadan yeniden çizildiyse ikinci kez canlandırma (art arda gelen çizimler titremesin)
    var now=performance.now(),n=0,hot=new Set();top.forEach(function(e){var p=e.parentElement,r=recent.get(p);if(p&&r!=null&&r>lastPress&&now-r<450)hot.add(p)}); // yeni bir tıklama yoksa (kendi kendine art arda çizim) tekrar oynatma
    for(var k=0;k<top.length;k++){var el=top[k],par=el.parentElement;if(par&&hot.has(par))continue;if(skip(el))continue;var r=visibleRect(el);if(!r)continue;if(par)recent.set(par,now);enter(el,n++,r.height>120)}}
  function queue(el){pend.add(el);if(!raf)raf=requestAnimationFrame(flush)}

  var mo=new MutationObserver(function(ms){if(off())return;
    for(var i=0;i<ms.length;i++){var m=ms[i];
      if(m.type==='childList'){if(!m.addedNodes.length)continue;
        // sadece yazı değişimi (sayaç, saat) ya da tek öğe ekleme metin düğümüyse geç
        for(var j=0;j<m.addedNodes.length;j++){var n=m.addedNodes[j];if(n.nodeType===1)queue(n)}}
      else if(m.attributeName==='hidden'&&!m.target.hidden&&m.oldValue!==null)queue(m.target)}});
  function start(){if(!document.body)return setTimeout(start,30);mo.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden'],attributeOldValue:true})}
  start();

  function styles(){if(document.getElementById('motionCss'))return;var s=document.createElement('style');s.id='motionCss';
    s.textContent=
      'html:not([data-motion=off]) :where(button,a,[role=tab],[role=button],[role=option],select,summary,.chip,.btn){transition-property:background-color,color,border-color,box-shadow,opacity,scale,translate;transition-duration:.18s;transition-timing-function:'+EASE+'}'+
      'html:not([data-motion=off]) :where(button,[role=button],[role=tab],.btn,.chip):not(:disabled):not([data-nopress]):active{scale:.97}'+
      '@media (prefers-reduced-motion:reduce){:where(button,[role=button],[role=tab],.btn,.chip):active{scale:none}}';
    (document.head||root).appendChild(s)}
  styles();

  window.Motion={
    enter:function(el){if(el&&!off())enter(el,0,true)},
    // içeriği değiştir: eskisi kısa bir solmayla gider, yenisi belirir
    swap:function(el,html){if(!el)return;if(off()){el.innerHTML=html;return}lastAct=performance.now();el.innerHTML=html},
    // FLIP: fn() kapsayıcının çocuklarının yerini değiştirir; her çocuk eski yerinden yenisine kayar
    flip:function(box,fn){if(!box||off()){fn&&fn();return}var kids=[...box.children],r0=new Map(kids.map(function(k){return[k,k.getBoundingClientRect()]}));fn&&fn();
      [...box.children].forEach(function(k){var a=r0.get(k);if(!a)return;var b=k.getBoundingClientRect(),dx=a.left-b.left,dy=a.top-b.top;if(Math.abs(dx)+Math.abs(dy)<1)return;
        try{k.animate([{translate:dx+'px '+dy+'px'},{translate:'0 0'}],{duration:320,easing:EASE})}catch(e){}})},
    off:off};
})();
