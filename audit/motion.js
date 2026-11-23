// Hareket denetimi: her uygulamada zararsız düğmelere basar; basınca beliren/değişen büyük öğe hiç animasyonsuz (“tak diye”) mı?
// Kullanım: python3 -m http.server 8766 & node audit/motion.js [slug] [m]   (m = telefon boyutu)
// Ortak katman shared/motion.js içerik değişimini zaten canlandırır; burada çıkan, kendi sabit paneli (toast, perde) animasyonsuz olanlardır.
const {chromium}=require('playwright');const fs=require('fs'),path=require('path');
const only=process.argv[2]&&process.argv[2]!=='m'?process.argv[2]:null,mob=process.argv.includes('m');
const apps=JSON.parse(fs.readFileSync(path.join(__dirname,'..','apps.json'),'utf8')).apps.filter(a=>!a.url&&(!only||a.slug===only)).map(a=>a.slug);
(async()=>{const b=await chromium.launch({args:['--no-proxy-server']});let total=0;
 for(const app of apps){const c=await b.newContext(mob?{viewport:{width:390,height:844},hasTouch:true,isMobile:true}:{viewport:{width:1366,height:800}});const p=await c.newPage();
  const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{window.__watch=()=>{window.__seen=new Set();const mo=new MutationObserver(ms=>{for(const m of ms){if(m.type==='childList')m.addedNodes.forEach(n=>n.nodeType===1&&__seen.add(n));else __seen.add(m.target)}});mo.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','class','open']});window.__mo=mo};
   window.__check=()=>{__mo.disconnect();const out=[];const anyAnim=e=>{for(let p=e;p&&p!==document.documentElement;p=p.parentElement)if(p.getAnimations().length)return true;return false};
    const top=[...__seen].filter(e=>e.isConnected&&![...__seen].some(o=>o!==e&&o.isConnected&&o.contains(e)));
    for(const e of top){const r=e.getBoundingClientRect();if(r.width<80||r.height<30)continue;const cs=getComputedStyle(e);if(cs.visibility==='hidden'||cs.display==='none'||+cs.opacity===0)continue;
     if(!anyAnim(e)&&!e.getAnimations({subtree:true}).length)out.push((e.id?'#'+e.id:'')+'.'+[...e.classList].slice(0,2).join('.')+' '+e.tagName+' '+cs.position)}
    return [...new Set(out)].slice(0,4)}});
  const url=`http://localhost:8766/apps/${app}/?local`;await p.goto(url);await p.waitForTimeout(2000);
  const sel='button:not([disabled]),[role=tab],[role=button],a[href^="#"]',seen=new Set();let bad=0,tried=0;const n=await p.$$eval(sel,els=>els.length);
  for(let i=0;i<n&&tried<40;i++){const e=(await p.$$(sel))[i];if(!e)break;
   const info=await e.evaluate(x=>{const r=x.getBoundingClientRect();const t=(x.getAttribute('aria-label')||x.innerText||x.title||'').trim().slice(0,24);return{t,vis:r.width>4&&r.height>4&&r.top>=0&&r.bottom<=innerHeight&&getComputedStyle(x).visibility!=='hidden',k:x.className+'|'+t}});
   // veri değiştiren / dışarı çıkan düğmelere basma
   if(!info.vis||seen.has(info.k)||/sil|delete|kaldır|çıkış|sıfırla|temizle|reset|google|giriş|yükle|indir|paylaş|kopyala|yedek|dışa|içe|tam ekran|yazdır|print|×|kapat/i.test(info.t))continue;seen.add(info.k);tried++;
   await p.evaluate(()=>__watch());try{await e.click({timeout:1500})}catch{continue}await p.waitForTimeout(100);
   const r=await p.evaluate(()=>__check());if(r.length){bad++;console.log('  ✗',JSON.stringify(info.t),'→',r.join(' | '))}
   await p.keyboard.press('Escape');await p.waitForTimeout(250);if(!p.url().includes(`/apps/${app}/`)){await p.goto(url);await p.waitForTimeout(1500)}}
  total+=bad;console.log(`${app.padEnd(12)} ${mob?'tel':'pc '} denenen ${tried} · animasyonsuz ${bad}${errs.length?' · HATA '+errs.slice(0,2).join(' / '):''}`);await c.close()}
 await b.close();process.exitCode=0;console.log('toplam animasyonsuz:',total)})()
