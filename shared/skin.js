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
    root.setAttribute('data-motion',m)}
  apply();
  addEventListener('storage',function(e){if(e.key==='appshell:theme'||e.key==='appshell:motion'||e.key==='notlar:theme')apply()});
})();
