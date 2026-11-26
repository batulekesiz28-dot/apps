/* Jarvis paneli — hub'ın her yerinden (galaksi, arayüzler, uygulama içi) açılan sesli asistan (Siri gibi).
   İçerik: apps/jarvis/?mini=1 (aynı ekranın küçük modu) bir kez yüklenir, kapatınca arkada çalışmaya devam eder.
   Aç/kapat: Alt+J, Ctrl+K “Jarvis'e sor”, masaüstü sağ tık, “Jarvis” uyandırma kelimesi (açıksa panel arkada önceden yüklenir).
   Kenar ışığı: Jarvis'in durumuna göre (dinliyor / düşünüyor / konuşuyor) — .jv[data-s]. */
(function () {
  let el = null, fr = null, open = false, ready = false;
  const lsg = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d } catch { return d } };
  const RM = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'off';
  function build() {
    if (el) return;
    el = document.createElement('div'); el.className = 'jv'; el.hidden = true; el.dataset.s = 'off';
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Jarvis');
    el.innerHTML = '<div class="jv-glow" aria-hidden="true"></div><div class="jv-in"></div>';
    fr = document.createElement('iframe'); fr.title = 'Jarvis'; fr.src = 'apps/jarvis/?mini=1';
    fr.setAttribute('allow', 'microphone; clipboard-write; autoplay; local-network-access; local-network; loopback-network');
    fr.addEventListener('load', () => { ready = true; if (open) post('focus') });
    el.querySelector('.jv-in').appendChild(fr); document.body.appendChild(el);
  }
  const post = cmd => { try { fr?.contentWindow?.postMessage({ jarvisHub: 1, cmd }, '*') } catch { } };
  function show() {
    build(); if (open) { post('focus'); return } open = true; el.hidden = false; document.body.classList.add('jv-open');
    if (!RM()) el.animate([{ opacity: 0, scale: '.94', translate: '0 14px' }, { opacity: 1, scale: '1', translate: '0 0' }], { duration: 420, easing: 'cubic-bezier(.2,1.3,.3,1)' });
    if (ready) setTimeout(() => post('focus'), 60);
  }
  function hide() {
    if (!open) return; open = false; document.body.classList.remove('jv-open');
    const fin = () => { if (!open) el.hidden = true };
    if (RM()) return fin();
    el.animate([{ opacity: 1, scale: '1' }, { opacity: 0, scale: '.96', translate: '0 10px' }], { duration: 200, easing: 'cubic-bezier(.4,0,1,1)' }).finished.then(fin, fin);
    try { document.activeElement?.blur?.() } catch { }
  }
  addEventListener('message', e => {
    const m = e.data; if (!m || m.jarvis !== 1 || !fr || e.source !== fr.contentWindow) return;
    if (m.s && el) el.dataset.s = m.s;
    if (m.open) show();
    if (m.close) hide();
  });
  addEventListener('keydown', e => { if (open && e.key === 'Escape' && !document.querySelector('.pal-bg,.sheet-scrim,.cc-bg')) { e.preventDefault(); hide() } });
  // uyandırma kelimesi açıksa panel arkada hazır dursun: “Jarvis” deyince hub'ın her yerinden açılır
  const pre = () => { if (lsg('jarvis:wake', false)) build() };
  if (document.readyState === 'complete') setTimeout(pre, 2500); else addEventListener('load', () => setTimeout(pre, 2500));
  window.JV = { open: show, close: hide, toggle: () => open ? hide() : show(), isOpen: () => open };
})();
