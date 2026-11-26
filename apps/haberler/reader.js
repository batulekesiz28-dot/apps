/* Haberler — uygulama içi okuyucu + “fotoğraf şart”.
   Reader.open(item): haberin sayfasını (shared/cors.js ile) çeker, asıl metni ve fotoğrafı ayıklar, AppShell içinde sade bir okuma
   ekranında gösterir (yeni sekme açmaz). Metin alınamazsa özet + fotoğraf + “Kaynakta aç”.
   Pic.need(item,cb): fotoğrafı olmayan haberin fotoğrafını kendi sayfasından (og:image) bulur; bulamazsa cb('') — o haber gösterilmez.
   Önbellek: haberler:img {bağlantı: görsel|''} (son 600). */
(function () {
  const lsg = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d } catch { return d } }, lss = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { } };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const RM = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'off';
  const abs = (u, b) => { try { return new URL(u, b).href } catch { return '' } };
  const meta = (d, ...n) => { for (const k of n) { const v = d.querySelector(`meta[property="${k}"],meta[name="${k}"]`)?.content; if (v) return v.trim() } return '' };
  /* sayfa önbelleği (aynı haberi hem fotoğraf hem okuma için iki kez çekmeyelim) */
  const PG = new Map();
  async function page(u) { if (PG.has(u)) return PG.get(u); const p = Cors.get(u, { rss: false }).then(r => new DOMParser().parseFromString(r.xml, 'text/html')); PG.set(u, p); p.catch(() => PG.delete(u)); if (PG.size > 40) PG.delete(PG.keys().next().value); return p }

  /* ── fotoğraf bulucu ── */
  const IC = lsg('haberler:img', {}); let saveT = 0;
  const keep = () => { clearTimeout(saveT); saveT = setTimeout(() => { const k = Object.keys(IC); if (k.length > 600) k.slice(0, k.length - 600).forEach(x => delete IC[x]); lss('haberler:img', IC) }, 800) };
  const Q = []; let run = 0;
  function pump() {
    while (run < 3 && Q.length) {
      const [it, cbs] = Q.shift(); run++;
      page(it.link).then(d => { const im = meta(d, 'og:image', 'og:image:url', 'twitter:image', 'twitter:image:src') || d.querySelector('article img[src],main img[src]')?.getAttribute('src') || ''; return abs(im, it.link) })
        .catch(() => '').then(im => { if (/^https?:/.test(im) && !/logo|icon|favicon|sprite|placeholder/i.test(im)) IC[it.link] = im; else IC[it.link] = ''; keep(); cbs.forEach(f => f(IC[it.link])) })
        .finally(() => { run--; pump() });
    }
  }
  const waiting = new Map();
  function need(it, cb) {
    if (it.img) return cb(it.img);
    if (it.link in IC) return cb(IC[it.link]);
    if (/news\.google\.com\//.test(it.link)) return cb(''); // çözülemeyen Google yönlendirmesi: sayfası okunamaz
    const w = waiting.get(it.link); if (w) { w.push(cb); return }
    const cbs = [cb]; waiting.set(it.link, cbs); Q.push([it, cbs]); pump();
    cbs.push(() => waiting.delete(it.link));
  }

  /* ── okuyucu ── */
  let el = null, cur = null;
  function extract(d, it) {
    const title = meta(d, 'og:title', 'twitter:title') || d.querySelector('h1')?.textContent?.trim() || it.title;
    const img = abs(meta(d, 'og:image', 'twitter:image') || it.img || '', it.link);
    const site = meta(d, 'og:site_name') || it.src;
    const time = Date.parse(meta(d, 'article:published_time', 'og:updated_time', 'date')) || it.t || 0;
    d.querySelectorAll('script,style,noscript,iframe,form,nav,header,footer,aside,svg,button,select,input,[role=navigation],[aria-hidden=true],[hidden],.ad,.ads,[class*="share"],[class*="related"],[class*="comment"],[class*="newsletter"],[class*="cookie"],[class*="subscribe"],[class*="promo"],[id*="comment"]').forEach(e => e.remove());
    let best = null, bs = 0;
    d.querySelectorAll('article,main,[itemprop=articleBody],div,section').forEach(e => {
      const ps = [...e.querySelectorAll(':scope > p, :scope > div > p, :scope > section > p')];
      const len = ps.reduce((a, p) => a + p.textContent.trim().length, 0);
      const sc = len + (e.matches('article,[itemprop=articleBody]') ? 500 : 0);
      if (sc > bs) { bs = sc; best = e }
    });
    const B = [], seen = new Set();
    if (best) for (const n of best.querySelectorAll('p,h2,h3,blockquote,li,img')) {
      if (n.tagName === 'IMG') { const s = abs(n.getAttribute('src') || n.getAttribute('data-src') || '', it.link); if (/^https?:/.test(s) && s !== img && !/logo|icon|avatar|pixel|1x1/i.test(s) && (+n.getAttribute('width') || 300) >= 200 && !seen.has(s)) { seen.add(s); B.push({ t: 'img', v: s }) } continue }
      if (n.closest('li') && n.tagName !== 'LI') continue;
      const v = n.textContent.replace(/\s+/g, ' ').trim();
      if (!v || seen.has(v)) continue;
      if (n.tagName === 'P' && v.length < 40 && !/[.!?…"”]$/.test(v)) continue;
      if (n.tagName === 'LI' && v.length < 25) continue;
      seen.add(v); B.push({ t: n.tagName === 'P' ? 'p' : n.tagName === 'LI' ? 'li' : n.tagName === 'BLOCKQUOTE' ? 'q' : 'h', v });
      if (B.length > 120) break;
    }
    const words = B.filter(b => b.t === 'p').reduce((a, b) => a + b.v.split(' ').length, 0);
    return { title, img, site, time, blocks: words >= 60 ? B : [], words };
  }
  const ago = t => { if (!t) return ''; const m = Math.round((Date.now() - t) / 6e4); return m < 1 ? 'az önce' : m < 60 ? m + ' dk önce' : m < 1440 ? Math.round(m / 60) + ' sa önce' : new Date(t).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }) };
  function build() {
    el = document.createElement('div'); el.className = 'rd'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Haber');
    el.innerHTML = '<header class="rd-h"><button class="rd-b" data-rd="x" aria-label="Geri">‹ Geri</button><span class="rd-s"></span><a class="rd-o" target="_blank" rel="noopener">Kaynakta aç ↗</a></header><div class="rd-sc"><article class="rd-a"></article></div>';
    document.body.appendChild(el);
    el.addEventListener('click', e => { if (e.target.closest('[data-rd=x]')) close() });
    addEventListener('keydown', e => { if (cur && e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); close() } }, true);
    addEventListener('popstate', () => { if (cur) close(true) });
  }
  function paint(it, x, state) {
    const a = el.querySelector('.rd-a'), hero = x?.img || it.img;
    el.querySelector('.rd-s').textContent = x?.site || it.src || '';
    el.querySelector('.rd-o').href = it.link;
    a.innerHTML = `${hero ? `<img class="rd-hero" src="${esc(hero)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}
      <h1>${esc(x?.title || it.title)}</h1><p class="rd-m"><b>${esc(x?.site || it.src || '')}</b>${(x?.time || it.t) ? ' · ' + ago(x?.time || it.t) : ''}${x?.words ? ` · ${Math.max(1, Math.round(x.words / 200))} dk okuma` : ''}</p>
      ${state === 'load' ? `${it.desc ? `<p class="rd-l">${esc(it.desc)}</p>` : ''}<div class="rd-sk"><i></i><i></i><i></i><i style="width:70%"></i></div>`
        : x?.blocks?.length ? x.blocks.map(b => b.t === 'img' ? `<img src="${esc(b.v)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : b.t === 'h' ? `<h2>${esc(b.v)}</h2>` : b.t === 'q' ? `<blockquote>${esc(b.v)}</blockquote>` : b.t === 'li' ? `<p class="rd-li">${esc(b.v)}</p>` : `<p>${esc(b.v)}</p>`).join('')
        : `${it.desc ? `<p class="rd-l">${esc(it.desc)}</p>` : ''}<div class="rd-e"><b>Bu sitenin metni burada gösterilemiyor</b><span>Site içeriğini paylaşmıyor ya da şu an yanıt vermiyor.</span><a class="rd-ob" href="${esc(it.link)}" target="_blank" rel="noopener">Kaynakta aç ↗</a></div>`}`;
  }
  async function open(it) {
    if (!el) build(); cur = it; el.hidden = false; document.documentElement.classList.add('rd-on');
    el.querySelector('.rd-sc').scrollTop = 0; paint(it, null, 'load');
    try { history.pushState({ rd: 1 }, '') } catch { }
    if (!RM()) el.animate([{ opacity: 0, translate: '0 24px' }, { opacity: 1, translate: '0 0' }], { duration: 320, easing: 'cubic-bezier(.2,.9,.25,1)' });
    let x = null;
    try { if (!/news\.google\.com\//.test(it.link)) x = extract((await page(it.link)).cloneNode(true), it) } catch { }
    if (cur === it) paint(it, x, 'done');
  }
  function close(fromPop) {
    if (!cur) return; cur = null; document.documentElement.classList.remove('rd-on');
    const fin = () => { if (!cur) el.hidden = true };
    if (RM()) fin(); else el.animate([{ opacity: 1 }, { opacity: 0, translate: '0 18px' }], { duration: 200, easing: 'ease-in' }).finished.then(fin, fin);
    if (!fromPop) try { if (history.state?.rd) history.back() } catch { }
    window.dispatchEvent(new Event('reader-close'));
  }
  window.Reader = { open, close, get isOpen() { return !!cur } };
  window.Pic = { need };
})();
