/* AppShell tema köprüsü — hub'da seçilen tema evrenini her uygulamaya taşır.
   <head> içinde, uygulamanın kendi stilinden SONRA, senkron yüklenir: <script src="../../shared/skin.js"></script> */
(function(){
  var SK={evren:'dark',cyberpunk:'dark',neon:'dark',aurora:'dark',doga:'light',gunbatimi:'light',kagit:'light'};
  var F={evren:'Sora:wght@300..700',cyberpunk:'Rajdhani:wght@400;500;600;700&family=Share+Tech+Mono',neon:'Space+Grotesk:wght@300..700&family=Audiowide',doga:'Nunito:wght@400..800&family=Fraunces:opsz,wght@9..144,400..700'};
  var root=document.documentElement,base=(document.currentScript&&document.currentScript.src)||'',done={};
  if(base&&!document.querySelector('link[data-skin-css]')){var c=document.createElement('link');c.rel='stylesheet';c.href=base.replace(/skin\.js.*$/,'skin.css');c.setAttribute('data-skin-css','');document.head.appendChild(c)}
  // ortak hareket katmanı (motion.js): içerik değişimi, basma tepkisi, renk geçişleri — bütün uygulamalar
  if(base&&!window.Motion&&!document.querySelector('script[data-motion-js]')){var mj=document.createElement('script');mj.src=base.replace(/skin\.js.*$/,'motion.js')+'?v=20261123a';mj.setAttribute('data-motion-js','');document.head.appendChild(mj)}
  function rd(k){try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}}
  function font(t){if(!F[t]||done[t])return;done[t]=1;var l=document.createElement('link');l.rel='stylesheet';l.href='https://fonts.googleapis.com/css2?family='+F[t]+'&display=swap';document.head.appendChild(l)}
  function apply(){var t=rd('appshell:theme'),m=rd('appshell:motion')||'full';
    if(SK[t]){root.setAttribute('data-skin',t);root.setAttribute('data-theme',SK[t]);font(t)}else{root.removeAttribute('data-skin');var f=rd('notlar:theme');if(f)root.setAttribute('data-theme',f)}
    root.setAttribute('data-motion',m);look();a11y()}
  // erişilebilirlik (Kontrol merkezi): saydamlığı azalt · yüksek kontrast · uygulama yazı boyutu (appshell:a11y {solid,contrast,zoom})
  function a11y(){var o=rd('appshell:a11y')||{};root.toggleAttribute('data-solid',!!o.solid);root.toggleAttribute('data-contrast',!!o.contrast);root.style.zoom=o.zoom&&o.zoom!==1?String(o.zoom):'';
    var st=document.getElementById('a11yCss');if(!st){st=document.createElement('style');st.id='a11yCss';document.head.appendChild(st)}
    st.textContent='html[data-solid] *{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}html[data-solid]{--glass:var(--surface)!important;--menu:var(--surface)!important}'+
      'html[data-contrast]{--ink2:var(--ink)!important;--ink3:color-mix(in srgb,var(--ink) 82%,var(--bg))!important;--line:color-mix(in srgb,var(--ink) 18%,transparent)!important;--line2:color-mix(in srgb,var(--ink) 26%,transparent)!important}'}
  /* kişisel görünüm (hub tema stüdyosu): vurgu rengi + yazı tipi */
  var LF={geist:['Geist','Geist:wght@300..800'],inter:['Inter','Inter:wght@300..800'],serif:['Fraunces','Fraunces:opsz,wght@9..144,300..800'],round:['Nunito','Nunito:wght@300..800'],mono:['JetBrains Mono','JetBrains+Mono:wght@300..700']};
  // hub tema stüdyosundaki “Kendi renklerim / İki temayı karıştır” (look.colors) — hub'daki SkinPal ile birebir aynı türetme
  function pal(c){if(!c||!/^#[0-9a-f]{6}$/i.test(c.bg||''))return'';var L=function(h){var v=[1,3,5].map(function(i){var x=parseInt(h.substr(i,2),16)/255;return x<=.03928?x/12.92:Math.pow((x+.055)/1.055,2.4)});return .2126*v[0]+.7152*v[1]+.0722*v[2]},dk=L(c.bg)<.4,m=function(p,a,b){return'color-mix(in srgb,'+a+' '+p+'%,'+(b||'transparent')+')'};
  return'html{--bg:'+c.bg+'!important;--bg2:'+m(94,c.bg,c.ink)+'!important;--surface:'+c.surface+'!important;--panel:'+c.surface+'!important;--card:'+c.surface+'!important;--surface2:'+m(93,c.surface,c.ink)+'!important;--tint:'+m(94,c.surface,c.ink)+'!important;'+
    '--ink:'+c.ink+'!important;--ink2:'+m(78,c.ink,c.bg)+'!important;--ink3:'+m(66,c.ink,c.bg)+'!important;--ink4:'+m(22,c.ink,c.bg)+'!important;'+
    '--line:'+m(8,c.ink)+'!important;--line2:'+m(12,c.ink)+'!important;--line3:'+m(17,c.ink)+'!important;--hover:'+m(7,c.ink)+'!important;--hover2:'+m(11,c.ink)+'!important;'+
    '--menu:'+m(90,c.surface)+'!important;--glass:'+m(78,c.surface)+'!important;--scrim:'+m(50,c.bg)+'!important;--labelbg:'+m(90,c.bg)+'!important;'+
    (/^#[0-9a-f]{6}$/i.test(c.accent||'')?'--accent:'+c.accent+'!important;--acc:'+c.accent+'!important;':'')+'color-scheme:'+(dk?'dark':'light')+'}body{background-color:'+c.bg+'}'}
  // tema stüdyosu “Ayrıntılar” (hub'daki lookExtra ile AYNI)
  var lookExtra=function(l){var c='';const X=':not([role=switch]):not(.sw):not([type=range]):not([type=checkbox]):not([type=radio]):not([type=color]):not([class*=orb]):not(.tile):not(.ob):not(.tk-chk):not([class*="-bg"]):not([class*=scrim])';
  if(l.corner==='sharp')c+=`:where(button,input,select,textarea,[class*="card"],[class*="btn"],[class*="chip"],[class*="sheet"],[class*="panel"],[class*="menu"],[class*="pill"],[class*="toast"],dialog)${X}{border-radius:5px!important}`;
  if(l.corner==='round')c+=`:where(button,input,select,[class*="btn"],[class*="chip"],[class*="pill"])${X}{border-radius:999px!important}:where([class*="card"],[class*="sheet"],[class*="panel"],[class*="menu"],dialog)${X}{border-radius:26px!important}`;
  if(l.lines==='strong')c+='html{--line:color-mix(in srgb,currentColor 22%,transparent)!important;--line2:color-mix(in srgb,currentColor 34%,transparent)!important}';
  if(l.lines==='none')c+='html{--line:transparent!important}';return c};
  function look(){var l=rd('appshell:look')||{},st=document.getElementById('lookCss');if(!st){st=document.createElement('style');st.id='lookCss';document.head.appendChild(st)}
    var f=LF[l.font],css=lookExtra(l)+pal(l.colors);if(/^#[0-9a-f]{6}$/i.test(l.accent||''))css+='html{--accent:'+l.accent+'!important;--acc:'+l.accent+'!important}';
    if(f){if(!document.querySelector('link[data-look="'+l.font+'"]')){var k=document.createElement('link');k.rel='stylesheet';k.setAttribute('data-look',l.font);k.href='https://fonts.googleapis.com/css2?family='+f[1]+'&display=swap';document.head.appendChild(k)}
      css+="html{--font:'"+f[0]+"',system-ui,sans-serif!important;--serif:'"+f[0]+"',Georgia,serif!important}body{font-family:var(--font)}"}st.textContent=css}
  apply();
  // ipucu: yalnızca simgesi olan düğmenin aria-label'ı fareyle üstüne gelince title olur (tek dinleyici, bütün uygulamalar)
  document.documentElement.setAttribute('data-autotip','');
  document.addEventListener('pointerover',function(e){var b=e.target&&e.target.closest&&e.target.closest('button[aria-label],a[aria-label],[role=button][aria-label]');
    if(b&&!b.title&&!b.closest('[title]')&&!(b.innerText||'').replace(/[^\p{L}\p{N}]/gu,''))b.title=b.getAttribute('aria-label')},{passive:true});
  addEventListener('storage',function(e){if(e.key==='appshell:theme'||e.key==='appshell:motion'||e.key==='notlar:theme'||e.key==='appshell:look'||e.key==='appshell:a11y')apply()});
})();
