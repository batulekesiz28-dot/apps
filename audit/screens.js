const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const seen=new Map();
for(const mobile of [false,true]){const ctx=await b.newContext({viewport:mobile?{width:390,height:844}:{width:1366,height:860},isMobile:mobile,hasTouch:mobile});await ctx.route('https://**',r=>r.abort());
const p=await ctx.newPage();const U='http://localhost:8766/apps/notlar/?local#';await p.goto(U+'home');await p.waitForTimeout(900);
const pid=await p.evaluate(()=>{const T=Date.now(),f=n=>{const x=new Date();x.setDate(x.getDate()+n);return x.toISOString().slice(0,10)};
 for(let i=0;i<24;i++)KB.addItem({type:['movie','series','anime','game','book'][i%5],title:'Kayıt '+i,metaAt:T,match:'ok',reviewed:true,year:String(2000+i),genres:[['Dram','Bilimkurgu','Macera'][i%3]],status:['done','todo','doing','done',''][i%5],rating:(i*3)%11,author:'Yazar'});KB.addItem({type:'pdf',title:'X.pdf'});
 const C=TM.cats.map(c=>c.id);for(let i=0;i<6;i++)TM.add({title:'Etkinlik '+i,cat:C[i%C.length],date:f(i%3-1),start:'1'+i+':00',end:'1'+i+':45',dur:45,status:'plan'});
 const pg=newPage({title:'Proje notları'});pg.blocks=[B('h1','Hedefler'),B('p','Metin.'),B('todo','Görev')];touch(pg);return pg.id});
await p.goto(U+'tasks');await p.waitForTimeout(500);const ti=p.locator('[data-tkadd] input, input[data-tkadd]').first();for(const t of ['Rapor yaz','Market']){await ti.fill(t);await ti.press('Enter')}
const R=['home','p/'+pid,'cal','tasks','stats','timeline','tpl','lib','lib/m/movies','lib/m/movies/done','lib/m/series/dropped','lib/m/books','lib/m/foryou','lib/docs','brain','food','food/g/tatli','all'];
const cases=R.map(r=>[r,null]).concat([['lib/m/movies/done','list'],['lib/m/movies/done','nf'],['lib/m/movies/done','compact'],['lib/m/movies','detail'],['lib','settings'],['tasks','taskdp'],['cal','week']]);
for(const [r,x] of cases){await p.goto(U+r);await p.waitForTimeout(1000);
  try{if(x&&['list','nf','compact'].includes(x)){await p.locator(`[data-lv=${x}]`).first().click({timeout:3000}).catch(async()=>{if(!await p.locator('.mset').count())await p.locator('.mc-pbar [data-mset]').first().click();await p.locator(`.mset [data-lk=view][data-lval=${x}]`).click()});await p.waitForTimeout(500)}
  if(x==='detail'){await p.locator('.mc-main [data-mi]').first().click();await p.waitForTimeout(900)}
  if(x==='settings'){await p.locator('.mc-pbar [data-mset]').first().click();await p.waitForTimeout(400)}
  if(x==='taskdp'){await p.locator('.tk-row .tk-t').first().click();await p.waitForTimeout(500)}
  if(x==='editor'){await p.locator('[data-newact]').click();await p.waitForTimeout(500)}
  if(x==='week'){await p.locator('[data-calmode=week]').click();await p.waitForTimeout(700)}}catch(e){console.log('atlandı',r,x,e.message.slice(0,60))}
  await p.addScriptTag({path:require('path').join(__dirname,'engine.js')});const res=await p.evaluate(m=>Audit.run(document,{mobile:m}),mobile);
  for(const f of res.findings){if(f.sev==='info'&&!f.lvl)continue;const k=(mobile?'tel':'pc')+' '+(r.replace(/p\/.*/,'page'))+(x?'+'+x:'');console.log(k.padEnd(28),(f.lvl||f.sev).padEnd(6),f.cat.padEnd(6),f.title,'×'+f.count,'|',f.samples.slice(0,3).join(' ; '))}
  if(x==='settings'||x==='detail'||x==='taskdp'||x==='editor')await p.keyboard.press('Escape');
  if(mobile===false&&r==='home'&&!x)console.log('pc home puanlar',JSON.stringify(res.score))}
await ctx.close()}
await b.close()})();
