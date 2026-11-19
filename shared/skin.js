/* AppShell tema köprüsü — hub'da seçilen tema evrenini her uygulamaya taşır.
   <head> içinde, uygulamanın kendi stilinden SONRA, senkron yüklenir: <script src="../../shared/skin.js"></script> */
(function(){
  var SK={evren:'dark',cyberpunk:'dark',neon:'dark',aurora:'dark',doga:'light',gunbatimi:'light',kagit:'light'};
  var F={evren:'Sora:wght@300..700',cyberpunk:'Rajdhani:wght@400;500;600;700&family=Share+Tech+Mono',neon:'Space+Grotesk:wght@300..700&family=Audiowide',doga:'Nunito:wght@400..800&family=Fraunces:opsz,wght@9..144,400..700'};
  var root=document.documentElement,base=(document.currentScript&&document.currentScript.src)||'',done={};
  if(base&&!document.querySelector('link[data-skin-css]')){var c=document.createElement('link');c.rel='stylesheet';c.href=base.replace(/skin\.js.*$/,'skin.css');c.setAttribute('data-skin-css','');document.head.appendChild(c)}
  function rd(k){try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}}
  function font(t){if(!F[t]||done[t])return;done[t]=1;var l=document.createElement('link');l.rel='stylesheet';l.href='https://fonts.googleapis.com/css2?family='+F[t]+'&display=swap';document.head.appendChild(l)}
  function apply(){var t=rd('appshell:theme'),m=rd('appshell:motion')||'full';
    if(SK[t]){root.setAttribute('data-skin',t);root.setAttribute('data-theme',SK[t]);font(t)}else{root.removeAttribute('data-skin');var f=rd('notlar:theme');if(f)root.setAttribute('data-theme',f)}
    root.setAttribute('data-motion',m);look()}
  /* kişisel görünüm (hub tema stüdyosu): vurgu rengi + yazı tipi */
  var LF={geist:['Geist','Geist:wght@300..800'],inter:['Inter','Inter:wght@300..800'],serif:['Fraunces','Fraunces:opsz,wght@9..144,300..800'],round:['Nunito','Nunito:wght@300..800'],mono:['JetBrains Mono','JetBrains+Mono:wght@300..700']};
  function look(){var l=rd('appshell:look')||{},st=document.getElementById('lookCss');if(!st){st=document.createElement('style');st.id='lookCss';document.head.appendChild(st)}
    var f=LF[l.font],css='';if(/^#[0-9a-f]{6}$/i.test(l.accent||''))css+='html{--accent:'+l.accent+'!important;--acc:'+l.accent+'!important}';
    if(f){if(!document.querySelector('link[data-look="'+l.font+'"]')){var k=document.createElement('link');k.rel='stylesheet';k.setAttribute('data-look',l.font);k.href='https://fonts.googleapis.com/css2?family='+f[1]+'&display=swap';document.head.appendChild(k)}
      css+="html{--font:'"+f[0]+"',system-ui,sans-serif!important;--serif:'"+f[0]+"',Georgia,serif!important}body{font-family:var(--font)}"}st.textContent=css}
  apply();
  // ipucu: yalnızca simgesi olan düğmenin aria-label'ı fareyle üstüne gelince title olur (tek dinleyici, bütün uygulamalar)
  document.documentElement.setAttribute('data-autotip','');
  document.addEventListener('pointerover',function(e){var b=e.target&&e.target.closest&&e.target.closest('button[aria-label],a[aria-label],[role=button][aria-label]');
    if(b&&!b.title&&!b.closest('[title]')&&!(b.innerText||'').replace(/[^\p{L}\p{N}]/gu,''))b.title=b.getAttribute('aria-label')},{passive:true});
  addEventListener('storage',function(e){if(e.key==='appshell:theme'||e.key==='appshell:motion'||e.key==='notlar:theme'||e.key==='appshell:look')apply()});
})();
