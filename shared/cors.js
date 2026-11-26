/* Ortak dayanıklı çekici (RSS / başka sitelerin sayfaları): tarayıcı başka sitelerin içeriğini doğrudan okuyamadığında (CORS)
   ücretsiz aracı servislerden geçer. Tek servise bağlı kalmaz: önce en son çalışanı dener, o olmazsa hepsini aynı anda
   yarıştırır, ilk gelen kazanır (diğerleri iptal edilir) ve kazananı hatırlar (cors:best).
   Cors.get(url, {rss:true}) → {xml} (ham metin) ya da {r2j} (rss2json biçimi). Hepsi başarısızsa hata fırlatır (e.offline). */
(function () {
  const K = 'cors:best';
  const lsg = (k, d) => { try { return localStorage.getItem(k) || d } catch { return d } }, lss = (k, v) => { try { localStorage.setItem(k, v) } catch { } };
  const enc = encodeURIComponent;
  const P = [
    ['direct', u => u, 'text'],
    ['allorigins', u => 'https://api.allorigins.win/raw?url=' + enc(u), 'text'],
    ['allorigins-get', u => 'https://api.allorigins.win/get?url=' + enc(u), 'ao'],
    ['codetabs', u => 'https://api.codetabs.com/v1/proxy/?quest=' + enc(u), 'text'],
    ['corsproxy', u => 'https://corsproxy.io/?url=' + enc(u), 'text'],
    ['rss2json', u => 'https://api.rss2json.com/v1/api.json?rss_url=' + enc(u), 'r2j'],
  ];
  const isFeed = t => /<(rss|feed|rdf:RDF)[\s>]/i.test(String(t).slice(0, 3000));
  async function tryOne(p, u, ms, sig, rss) {
    const ac = new AbortController(), tm = setTimeout(() => ac.abort(), ms);
    sig?.addEventListener('abort', () => ac.abort());
    try {
      const r = await fetch(p[1](u), { cache: 'no-store', signal: ac.signal });
      if (!r.ok) throw new Error(p[0] + ' ' + r.status);
      if (p[2] === 'text') { const t = await r.text(); if (rss && !isFeed(t)) throw new Error(p[0] + ' yanlış içerik'); return { xml: t, via: p[0] } }
      if (p[2] === 'ao') { const j = await r.json(); const t = j && j.contents; if (!t || (rss && !isFeed(t))) throw new Error(p[0] + ' boş'); return { xml: t, via: p[0] } }
      if (!rss) throw new Error('rss2json sadece RSS');
      const j = await r.json(); if (j.status !== 'ok') throw new Error('rss2json ' + (j.message || 'hata')); return { r2j: j, via: p[0] };
    } finally { clearTimeout(tm) }
  }
  async function get(u, o = {}) {
    const rss = o.rss !== false, best = lsg(K, '');
    if (navigator.onLine === false) { const e = new Error('çevrimdışı'); e.offline = true; throw e }
    const first = P.find(p => p[0] === best);
    if (first) { try { return await tryOne(first, u, 6000, null, rss) } catch { } }
    const ac = new AbortController();
    try {
      const v = await Promise.any(P.filter(p => p !== first && (rss || p[2] !== 'r2j')).map((p, i) =>
        new Promise(r => setTimeout(r, i * 200)).then(() => { if (ac.signal.aborted) throw new Error('iptal'); return tryOne(p, u, 10000, ac.signal, rss) })));
      ac.abort(); lss(K, v.via); return v;
    } catch (e) { const x = new Error('kaynağa ulaşılamadı'); x.offline = navigator.onLine === false; throw x }
  }
  window.Cors = { get, best: () => lsg(K, '') };
})();
