// Durum gezgini — Denetçi'nin “her şeyi her durumda dene” kolu. Hub'ı gerçek kullanımdaki durumlara sokar ve her birinde
// katı motoru (engine.js) çalıştırır: 10 arayüz × {boş, arkada açık uygulama, canlı şarkı + sayaç, ada açık, uygulama içinde, uygulama içinde ada açık + şerit, kontrol merkezi, sistem paneli, kenar paneli} × {bilgisayar, telefon}.
// Kullanıcı şikâyetinden doğdu: “Açık uygulamalar” çubuğu Mıknatıs'ın alt menüsünün üstüne bindi — tek ekran taraması bunu göremezdi.
// Kullanım: python3 -m http.server 8766 &  node audit/states.js [dünya] [durum]   → sadece hata ve insan uyarılarını yazar; çıkış kodu = hata sayısı>0
const {chromium}=require('playwright');const path=require('path');
const WORLDS=['galaksi','mekansal','miknatis','ruzgar','petek','kum','balon','kadran','deste','harita','pencere'];
const STATES=['bos','arkada','canli','ada','uygulama','serit','sagtik','merkez','sistem','kenar'];
const fw=process.argv[2]&&WORLDS.includes(process.argv[2])?[process.argv[2]]:WORLDS,fs=process.argv[3]&&STATES.includes(process.argv[3])?[process.argv[3]]:STATES;
const SIZES=[['pc',{viewport:{width:1366,height:800}}],['tel',{viewport:{width:390,height:844},hasTouch:true,isMobile:true}]];
const BAD=new Set(['chromeclash','textoverlap','textcover','buried','offscreen','overlap','fontsize0']);
(async()=>{const b=await chromium.launch({args:['--no-proxy-server']});let errs=0,runs=0;
 for(const w of fw)for(const [sz,opt] of SIZES){
  const c=await b.newContext(opt);await c.route(/music\.youtube\.com/,r=>r.fulfill({contentType:'text/html',body:'<body style="margin:0;background:#111;color:#fff;font:20px sans-serif">YouTube Music</body>'}));
  await c.route(/^https:\/\/(?!localhost)(?!music\.youtube)/,r=>r.abort());
  for(const st of fs){const p=await c.newPage();const pe=[];p.on('pageerror',e=>pe.push(e.message));
   await p.addInitScript(w=>{localStorage.clear();localStorage.setItem('appshell:daycard',JSON.stringify({off:true}));localStorage.setItem('appshell:world',JSON.stringify(w));localStorage.setItem('appshell:wrand','false')},w);
   await p.goto('http://localhost:8766/?local');await p.waitForTimeout(2600);
   await p.evaluate(()=>{document.documentElement.dataset.appshellGom='1.2';document.documentElement.dataset.appshellGomHosts='music.youtube.com'});
   try{
    if(st!=='bos'){await p.evaluate(()=>HUB.open('p:saat'));await p.waitForTimeout(900)}
    if(st==='canli'||st==='ada'||st==='uygulama'||st==='serit'){await p.evaluate(()=>HUB.open('p:ytmusic'));await p.waitForTimeout(900);
      await p.evaluate(()=>{NP={key:'p:ytmusic',t:'Uzun bir şarkı adı denemesi',a:'Sanatçı',img:'',on:true,cur:40,dur:200,at:Date.now()};const t=tmOf('st1');t.end=Date.now()+600e3;t.dur=1500;t.on=true})}
    if(st!=='bos'&&st!=='uygulama'&&st!=='serit'){await p.evaluate(()=>goHome());await p.waitForTimeout(1300)}
    if(st==='uygulama'||st==='serit'){await p.evaluate(()=>HUB.open('p:saat'));await p.waitForTimeout(1300)}
    await p.evaluate(()=>{islKey='';paintFocusBar()});
    if(st==='ada'){await p.evaluate(()=>{islOpen=true;islKey='';paintFocusBar()});await p.waitForTimeout(800)}
    // uygulama içinde ada açık + şerit görünür: şerit adanın altına kaymalı (üst üste binmesin)
    if(st==='serit'){await p.evaluate(()=>{islOpen=true;islKey='';paintFocusBar();showPill(0)});await p.waitForTimeout(900);
      const ov=await p.evaluate(()=>{const a=$('#focusBar').getBoundingClientRect(),b=$('#pill').getBoundingClientRect();return a.bottom>b.top+1&&a.top<b.bottom&&a.left<b.right&&a.right>b.left});
      if(ov){errs++;console.log(w,sz,'serit','[error] açık ada uygulama şeridinin üstüne biniyor')}
      if(await p.evaluate(()=>[...document.querySelectorAll('#tabs [data-t]')].some(e=>e.dataset.t==='p:ytmusic')))console.log(w,sz,'serit','[uyarı] çalan uygulama hem adada hem şeritte')}
    // açılır paneller de birer durum: kontrol merkezi, sistem paneli (ekran süresi verili), kenar paneli
    if(st==='merkez'){await p.evaluate(()=>window.OS?.open());await p.waitForTimeout(700)}
    if(st==='sistem'){await p.evaluate(()=>{const d=new Date(),k=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');localStorage.setItem('appshell:usage',JSON.stringify({[k]:{notlar:3200,studylog:1500,_home:900,haberler:420}}));OSX.open('ekran')});await p.waitForTimeout(700)}
    if(st==='kenar'){await p.evaluate(()=>OSX.edge());await p.waitForTimeout(700)}
    // ana ekrana dönünce klavye odağı gizlenen uygulamanın çerçevesinde kalmamalı (kısayollar ölür)
    if(st==='arkada'){const fo=await p.evaluate(()=>{const a=document.activeElement;return a&&a.tagName==='IFRAME'&&!document.body.classList.contains('os-app')});if(fo){errs++;console.log(w,sz,st,'[error] ana ekranda klavye odağı gizli uygulamada kaldı')}}
    // sağ tık: boş alana masaüstü menüsü açılmalı, ekrana sığmalı
    if(st==='sagtik'){await p.mouse.click(sz==='tel'?195:683,sz==='tel'?600:520,{button:'right'});await p.waitForTimeout(600);
      const mr=await p.evaluate(()=>{const m=document.querySelector('.menu,.mg-cm,.sp-menu');if(!m)return null;const r=m.getBoundingClientRect();return{n:m.querySelectorAll('button').length,out:r.left<0||r.top<0||r.right>innerWidth||r.bottom>innerHeight}});
      if(!mr)console.log(w,sz,st,'[uyarı] sağ tık menüsü açılmadı (bu noktada uygulama olabilir)');else if(mr.out){errs++;console.log(w,sz,st,'[error] sağ tık menüsü ekrandan taşıyor')}}
    await p.waitForTimeout(700);
    await p.addScriptTag({path:path.join(__dirname,'engine.js')});
    const r=await p.evaluate(m=>Audit.run(document,{mobile:m}),sz==='tel');runs++;
    const f=r.findings.filter(x=>x.sev==='error'||(x.cat==='insan'&&BAD.has(x.id)));
    const line=`${w.padEnd(9)} ${sz.padEnd(3)} ${st.padEnd(9)} ${String(r.score.total).padStart(3)}`;
    if(f.length){errs+=f.filter(x=>x.sev==='error').length;console.log(line,f.map(x=>`[${x.sev}] ${x.title}: ${x.samples.join(' ; ')}`).join('\n'+' '.repeat(28)))}else console.log(line,'✓');
    if(pe.length)console.log(' '.repeat(28)+'SAYFA HATASI: '+pe.slice(0,2).join(' / '))
   }catch(e){console.log(w,sz,st,'ÇALIŞTIRILAMADI',e.message.split('\n')[0])}
   await p.close()}
  await c.close()}
 await b.close();console.log(`\n${runs} durum tarandı · ${errs} hata`);process.exitCode=errs?1:0})()
