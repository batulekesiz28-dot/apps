"""Denetçi — yayın öncesi kontrol.  python3 audit/run.py [slug ...]
Yerel sunucu gerekir: python3 -m http.server 8766 (repo kökünde)."""
import asyncio, json, sys, os
from playwright.async_api import async_playwright
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE='http://localhost:8766/'
def targets():
    apps=json.load(open(os.path.join(ROOT,'apps.json')))['apps']
    # apps hosted elsewhere (url outside this repo) are skipped
    t=[('hub','Hub','')]+[(a['slug'],a['name'],f"apps/{a['slug']}/") for a in apps if not a.get('url')]
    want=sys.argv[1:]
    return [x for x in t if not want or x[0] in want]
async def main():
    out={}
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        for mobile in (False,True):
            ctx=await b.new_context(viewport={'width':390,'height':844} if mobile else {'width':1366,'height':860},is_mobile=mobile,has_touch=mobile,device_scale_factor=2 if mobile else 1)
            await ctx.route('https://**',lambda r:r.abort())
            for slug,name,path in targets():
                pg=await ctx.new_page()
                await pg.goto(BASE+path+'?local'); await pg.wait_for_timeout(1800)
                await pg.add_script_tag(path=os.path.join(ROOT,'audit','engine.js'))
                r=await pg.evaluate("Audit.run(document,{mobile:%s})"%('true' if mobile else 'false'))
                out.setdefault(slug,{'name':name})['mobile' if mobile else 'desktop']=r
                await pg.close()
            await ctx.close()
        await b.close()
    for slug,v in out.items():
        print(f"\n== {v['name']}  masaüstü {v['desktop']['score']['total']}  telefon {v['mobile']['score']['total']}")
        for k in ('desktop','mobile'):
            for f in v[k]['findings']:
                print(f"  [{k[0]}] {f['sev']:5} {f['cat']:4} {f['title']} ×{f['count']}  {'; '.join(f['samples'][:3])}")
    json.dump(out,open('/tmp/audit_last.json','w'),ensure_ascii=False)
asyncio.run(main())
