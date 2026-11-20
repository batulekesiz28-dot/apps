// Şu an çalan: SADECE AppShell hub'ının içinde açılmış YouTube / YouTube Music çerçevesinde çalışır.
// Şarkı adı, sanatçı, kapak ve çalıyor/duraklatıldı bilgisini hub'a (yalnızca hub'ın adresine) yollar;
// hub'dan gelen ⏮ ⏯ ⏭ komutlarını oynatıcının kendi düğmelerine basarak yapar. Başka hiçbir yere bir şey göndermez.
(() => {
  if (window.top === window) return; // kendi sekmesinde açılan YouTube'a dokunma
  const OK = /^(https:\/\/batulekesiz28-dot\.github\.io|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?)$/;
  const hub = (location.ancestorOrigins && location.ancestorOrigins[0]) || '';
  if (!OK.test(hub) || window.parent !== window.top) return;
  const music = location.hostname === 'music.youtube.com';
  const $ = s => document.querySelector(s);
  const txt = s => ($(s)?.textContent || '').replace(/\s+/g, ' ').trim();
  const vid = () => { const vs = [...document.querySelectorAll('video')]; return vs.find(v => v.currentSrc && !v.paused) || vs.find(v => v.currentSrc) || null; };
  function info() {
    const v = vid(), md = navigator.mediaSession && navigator.mediaSession.metadata;
    let t = (md && md.title) || '', a = (md && md.artist) || '', img = '';
    try { if (md && md.artwork && md.artwork.length) img = [...md.artwork].sort((x, y) => (parseInt(y.sizes) || 0) - (parseInt(x.sizes) || 0))[0].src; } catch {}
    if (music) {
      t = t || txt('ytmusic-player-bar .title');
      a = a || txt('ytmusic-player-bar .byline').split('•')[0].trim();
      img = img || ($('ytmusic-player-bar img.image') || {}).src || '';
    } else {
      t = t || txt('ytd-watch-metadata h1') || (location.pathname === '/watch' ? document.title.replace(/ - YouTube$/, '') : '');
      a = a || txt('ytd-watch-metadata #channel-name a') || txt('#owner #channel-name');
      const id = new URLSearchParams(location.search).get('v');
      if (!img && id) img = 'https://i.ytimg.com/vi/' + id + '/mqdefault.jpg';
    }
    const dur = v && isFinite(v.duration) ? v.duration : 0;
    return { t: t.slice(0, 200), a: a.slice(0, 200), img: /^https:\/\//.test(img) ? img : '', on: !!(v && !v.paused && !v.ended), cur: v ? v.currentTime : 0, dur, has: !!(v && t) };
  }
  let last = '';
  function send(force) {
    const i = info(), k = JSON.stringify([i.t, i.a, i.img, i.on, Math.round(i.dur)]);
    if (!force && k === last && !i.on) return; // duraklatılmışken değişiklik yoksa sus
    last = k; parent.postMessage(Object.assign({ appshell: 'np', v: 1 }, i), hub);
  }
  setInterval(send, 1000);
  document.addEventListener('play', () => send(true), true);
  document.addEventListener('pause', () => send(true), true);
  document.addEventListener('loadedmetadata', () => setTimeout(() => send(true), 400), true);
  const click = s => { const b = $(s); if (b) { b.click(); return true; } return false; };
  addEventListener('message', e => {
    if (e.source !== window.parent || e.origin !== hub || !e.data || e.data.appshell !== 'np-cmd') return;
    const c = e.data.c, v = vid();
    if (c === 'toggle') { if (!(music && click('ytmusic-player-bar #play-pause-button')) && v) v.paused ? v.play() : v.pause(); }
    else if (c === 'next') { music ? click('ytmusic-player-bar .next-button') : click('.ytp-next-button'); }
    else if (c === 'prev') { if (!(music && click('ytmusic-player-bar .previous-button')) && v) v.currentTime = 0; }
    else if (c === 'seek' && v && isFinite(e.data.t)) v.currentTime = Math.max(0, e.data.t);
    setTimeout(() => send(true), 350);
  });
  send(true);
})();
