// Hub'daki 11 arayüzü (ui/worlds.js) telefon ve bilgisayar boyutunda Denetçi motoruyla tarar.
// Kullanım: python3 -m http.server 8766 (repo kökünde) açıkken → node audit/worlds.js [dünya]
// Not: seçim localStorage 'appshell:world' JSON olarak yazılır (store.get JSON okur).
const {chromium}=require('playwright');const path=require('path');
const ALL=['galaksi','mekansal','miknatis','ruzgar','petek','kum','balon','kadran','deste','harita','pencere'];
(async()=>{const b=await chromium.launch({args:['--no-proxy-server']});const only=process.argv[2];
for(const w of only?[only]:ALL)for(const [vw,vh,m] of [[1366,860,false],[390,844,true]]){
  const c=await b.newContext({viewport:{width:vw,height:vh}});const p=await c.newPage();const errs=[];
  p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(w=>localStorage.setItem('appshell:world',JSON.stringify(w)),w);
  await p.goto('http://localhost:8766/?local');await p.waitForTimeout(2200);
  await p.addScriptTag({path:path.join(__dirname,'engine.js')});
  const r=await p.evaluate(m=>Audit.run(document,{mobile:m}),m);
  const f=r.findings.filter(x=>x.sev!=='info'||x.cat==='insan');
  console.log(w.padEnd(9),m?'tel':'pc ',String(r.score.total).padStart(3),f.map(x=>`${x.sev}/${x.cat} ${x.title} ×${x.count} [${x.samples.slice(0,3).join(' ; ')}]`).join(' | ')||'—',errs.length?'JS HATA: '+errs.join(' // '):'');
  await c.close()}
await b.close()})();
