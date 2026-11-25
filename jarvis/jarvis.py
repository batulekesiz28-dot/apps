#!/usr/bin/env python3
"""
JARVIS çekirdeği — bilgisayarında çalışır, AppShell'deki Jarvis ekranı buna bağlanır.

Ne yapar:
  • Hızlı yol: "google aç", "youtube'da lofi aç", "hesap makinesi aç", "sesi kıs", "sonraki şarkı" gibi komutlar
    yapay zekâya hiç sorulmadan anında (milisaniyeler) yapılır.
  • Ajan: diğer her şey Claude'a (claude-opus-5-5) gider; model araçlarla bilgisayarı ve tarayıcıyı kullanır,
    bir yol olmazsa başka yol dener, yaptığı her adımı sohbete canlı yazar.
  • Onay: geri alınamaz işler (komut çalıştırma, gönder/yayınla/yorum/sil/satın al…) senden onay almadan yapılmaz.

Güvenlik: sunucu sadece bu bilgisayardan (127.0.0.1) ve sadece AppShell adresinden bağlantı kabul eder;
ilk bağlantıda bu pencerede yazan 6 haneli kodu AppShell'e girersin (eşleştirme). Anahtarın sadece bu klasördeki
ayarlar.json'da durur, hiçbir yere gönderilmez (sadece Anthropic API'ye).

Çalıştır:  python jarvis.py          (Windows: baslat.bat)
Test:      python jarvis.py --sahte  (hiçbir şeyi gerçekten yapmaz; arayüzü denemek için)
"""
import asyncio, base64, datetime, io, json, os, pathlib, platform, re, secrets, shutil, subprocess, sys, time, urllib.parse

try:
    sys.stdout.reconfigure(encoding="utf-8")  # Windows konsolunda Türkçe karakterler
except Exception:
    pass

ROOT = pathlib.Path(__file__).resolve().parent
CFG = ROOT / "ayarlar.json"
MEM = ROOT / "hafiza.json"
SHOTS = ROOT / "ekran"
PORT = 8765
OS = platform.system()  # Windows | Darwin | Linux
WIN, MAC = OS == "Windows", OS == "Darwin"
MOCK = "--sahte" in sys.argv
HUB = "https://batulekesiz28-dot.github.io/apps/"
ORIGINS = ["https://batulekesiz28-dot.github.io", "http://localhost:8766", "http://127.0.0.1:8766", f"http://127.0.0.1:{PORT}", f"http://localhost:{PORT}"]
MODEL = "claude-opus-5-5"


def log(*a):
    print(time.strftime("%H:%M:%S"), *a, flush=True)


# ───────────────────────── ayarlar ─────────────────────────
def load_cfg():
    try:
        c = json.loads(CFG.read_text("utf-8"))
    except Exception:
        c = {}
    c.setdefault("api_key", "")
    c.setdefault("pair", f"{secrets.randbelow(900000) + 100000}")
    c.setdefault("tokens", [])
    c.setdefault("effort", "low")   # low = en hızlı; medium/high daha derin düşünür
    c.setdefault("fast", False)     # Claude hızlı mod (2 kat fiyat)
    return c


def save_cfg():
    CFG.write_text(json.dumps(cfg, ensure_ascii=False, indent=1), "utf-8")


cfg = load_cfg()
save_cfg()


def memory():
    try:
        return json.loads(MEM.read_text("utf-8"))
    except Exception:
        return []


# ───────────────────────── işletim sistemi yardımcıları ─────────────────────────
def os_open(target: str):
    """Adres, dosya ya da uygulama kısayolunu varsayılan programla aç (en hızlı yol)."""
    if MOCK:
        return
    if WIN:
        os.startfile(target)  # type: ignore[attr-defined]
    elif MAC:
        subprocess.Popen(["open", target])
    elif shutil.which("xdg-open"):
        subprocess.Popen(["xdg-open", target], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    else:
        import webbrowser
        if not webbrowser.open(target):
            raise RuntimeError("açacak program bulunamadı")


SITES = {
    "google": "https://www.google.com", "youtube": "https://www.youtube.com", "youtube music": "https://music.youtube.com",
    "yt music": "https://music.youtube.com", "gmail": "https://mail.google.com", "mail": "https://mail.google.com",
    "whatsapp": "https://web.whatsapp.com", "instagram": "https://www.instagram.com", "twitter": "https://x.com", "x": "https://x.com",
    "chatgpt": "https://chatgpt.com", "claude": "https://claude.ai", "github": "https://github.com", "netflix": "https://www.netflix.com",
    "haritalar": "https://maps.google.com", "harita": "https://maps.google.com", "google maps": "https://maps.google.com",
    "drive": "https://drive.google.com", "google drive": "https://drive.google.com", "takvim": "https://calendar.google.com",
    "google takvim": "https://calendar.google.com", "çeviri": "https://translate.google.com", "google çeviri": "https://translate.google.com",
    "reddit": "https://www.reddit.com", "linkedin": "https://www.linkedin.com", "twitch": "https://www.twitch.tv",
    "appshell": HUB, "notlar": HUB + "apps/notlar/", "galeri": HUB + "apps/galeri/", "haberler": HUB + "apps/haberler/",
    "study log": HUB + "apps/studylog/", "hava durumu": "https://www.google.com/search?q=hava+durumu", "spotify web": "https://open.spotify.com",
}
WIN_APPS = {
    "hesap makinesi": "calc", "hesap makinası": "calc", "not defteri": "notepad", "paint": "mspaint", "dosya gezgini": "explorer",
    "dosyalar": "explorer", "gezgin": "explorer", "ayarlar": "ms-settings:", "görev yöneticisi": "taskmgr", "komut istemi": "cmd",
    "terminal": "wt", "powershell": "powershell", "word": "winword", "excel": "excel", "powerpoint": "powerpnt", "kamera": "microsoft.windows.camera:",
    "saat": "ms-clock:", "mağaza": "ms-windows-store:", "vs code": "code", "kod": "code", "denetim masası": "control", "ekran alıntısı": "ms-screenclip:",
}
MAC_APPS = {"hesap makinesi": "Calculator", "not defteri": "TextEdit", "ayarlar": "System Settings", "dosyalar": "Finder", "terminal": "Terminal", "saat": "Clock"}

_START = None


def start_menu():
    """Windows Başlat menüsü kısayolları: ad → .lnk yolu (bir kez taranır)."""
    global _START
    if _START is not None:
        return _START
    _START = {}
    if WIN:
        for base in [os.environ.get("PROGRAMDATA", r"C:\ProgramData"), os.environ.get("APPDATA", "")]:
            d = pathlib.Path(base) / "Microsoft/Windows/Start Menu/Programs"
            if d.exists():
                for p in d.rglob("*"):
                    if p.suffix.lower() in (".lnk", ".url"):
                        _START.setdefault(p.stem.lower(), str(p))
    return _START


def norm_name(s: str) -> str:
    """'youtube'u', 'google'ı', 'googleı', 'spotify'ı', 'hesap makinesini' → yalın ad."""
    s = s.strip().lower().replace("’", "'").strip(" .!?")
    s = re.sub(r"'(y?[ıiuü]|n[ıiuü]|[ıiuü]n[ıi]?|y[ae]|[ae]|d[ae]|t[ae])$", "", s)
    known = lambda x: x in SITES or x in WIN_APPS or x in MAC_APPS
    if not known(s):
        for cut in ("nı", "ni", "nu", "nü", "yı", "yi", "yu", "yü", "ı", "i", "u", "ü"):
            if s.endswith(cut) and known(s[: -len(cut)]):
                return s[: -len(cut)]
    return s


def find_app(name: str):
    """Uygulamayı bul: bilinen adlar → Başlat menüsü → PATH. (yol, tür) ya da None."""
    n = norm_name(name)
    if WIN and n in WIN_APPS:
        return WIN_APPS[n]
    if MAC and n in MAC_APPS:
        return MAC_APPS[n]
    sm = start_menu()
    if n in sm:
        return sm[n]
    for k, v in sm.items():
        if k.startswith(n) or n in k.split():
            return v
    w = shutil.which(n.replace(" ", ""))
    return w


def open_any(target: str):
    """Site adı / adres / uygulama / dosya — en kısa yoldan aç. (yapılan iş açıklaması) döner, olmazsa None."""
    t = target.strip()
    n = norm_name(t)
    if re.match(r"^https?://", t):
        os_open(t); return f"{t} açıldı"
    if n in SITES:
        os_open(SITES[n]); return f"{n} açıldı"
    if re.match(r"^[\w.-]+\.(com|net|org|io|ai|dev|app|co|tr|edu|gov)(\.tr)?(/.*)?$", n):
        os_open("https://" + n); return f"{n} açıldı"
    p = pathlib.Path(os.path.expandvars(os.path.expanduser(t)))
    if p.exists():
        os_open(str(p)); return f"{p} açıldı"
    app = find_app(t)
    if app:
        if MAC and not app.startswith("/"):
            not MOCK and subprocess.Popen(["open", "-a", app])
        elif WIN and not os.path.isabs(app) and not app.endswith(":"):
            not MOCK and subprocess.Popen(f'start "" {app}', shell=True)
        else:
            os_open(app)
        return f"{t} açıldı"
    return None


def keys(*names, times=1):
    if MOCK:
        return
    import pyautogui
    for _ in range(times):
        if len(names) > 1:
            pyautogui.hotkey(*names)
        else:
            pyautogui.press(names[0])


def lock_pc():
    if MOCK:
        return
    if WIN:
        subprocess.Popen("rundll32.exe user32.dll,LockWorkStation", shell=True)
    elif MAC:
        subprocess.Popen(["pmset", "displaysleepnow"])
    else:
        subprocess.Popen(["loginctl", "lock-session"])


def shot_jpeg(max_w=1280):
    """Ekran görüntüsü → (jpeg base64, ölçek). Ölçek: ekran pikseli / görüntü pikseli."""
    from PIL import ImageGrab
    im = ImageGrab.grab()
    k = min(1.0, max_w / im.width)
    if k < 1:
        im = im.resize((int(im.width * k), int(im.height * k)))
    buf = io.BytesIO()
    im.convert("RGB").save(buf, "JPEG", quality=70)
    return base64.b64encode(buf.getvalue()).decode(), 1 / k


# ───────────────────────── HIZLI YOL (yapay zekâsız, anında) ─────────────────────────
def quick(text: str):
    """Basit komutları anında yap. Eşleşirse yapılan işin kısa açıklamasını döner, yoksa None (→ ajan)."""
    s = text.strip().replace("İ", "i").lower().replace("’", "'")
    s = re.sub(r"^(hey |hay )?(jarvis|carvis|cervis|jarvıs)[, ]*", "", s).strip(" .!?")
    s = re.sub(r"\s+(lütfen|hemen|bi|bir)$", "", s)
    if not s:
        return None
    m = re.match(r"^(?:youtube ?music|yt ?music)'?(?:te|de|ta|da)\s+(.+?)\s+(?:aç|ara|çal|oynat|dinle)$", s)
    if m:
        q = m.group(1); os_open("https://music.youtube.com/search?q=" + urllib.parse.quote(q)); return f"YouTube Music'te “{q}” açıldı"
    m = re.match(r"^(?:youtube|yt)'?(?:da|ta|de|te)\s+(.+?)\s+(?:aç|ara|çal|izle|oynat)$", s)
    if m:
        q = m.group(1); os_open("https://www.youtube.com/results?search_query=" + urllib.parse.quote(q)); return f"YouTube'da “{q}” açıldı"
    # sadece açıkça Google/internet denince (“annemi ara” telefon araması olabilir → ajana)
    m = re.match(r"^(?:google'?(?:da|a|dan)|internette|webde)\s+(.+?)\s+(?:ara|arat|bul)$", s) or re.match(r"^(.+?)\s+(?:google'?la|arat)$", s)
    if m:
        q = m.group(1); os_open("https://www.google.com/search?q=" + urllib.parse.quote(q)); return f"Google'da “{q}” arandı"
    if re.match(r"^(sesi?\s*(aç|yükselt|arttır|artır)|ses\s*\+)$", s):
        keys("volumeup", times=5); return "Ses açıldı"
    if re.match(r"^(sesi?\s*(kıs|azalt|düşür)|ses\s*-)$", s):
        keys("volumedown", times=5); return "Ses kısıldı"
    if re.match(r"^(sessize al|sesi kapat|sustur)$", s):
        keys("volumemute"); return "Ses kapatıldı"
    if re.match(r"^(müziği |şarkıyı |videoyu )?(durdur|duraklat|devam( et)?|oynat|başlat)$", s) and "uygulama" not in s:
        keys("playpause"); return "Oynat/duraklat"
    if re.match(r"^(sonraki|bir sonraki|geç|atla)( şarkı| şarkıya geç| parça)?$", s):
        keys("nexttrack"); return "Sonraki şarkı"
    if re.match(r"^(önceki|bir önceki)( şarkı| parça)?$", s):
        keys("prevtrack"); return "Önceki şarkı"
    if re.match(r"^ekran(ın)? görüntüsü(nü)? al$", s):
        if not MOCK:
            SHOTS.mkdir(exist_ok=True)
            from PIL import ImageGrab
            p = SHOTS / time.strftime("ekran-%Y%m%d-%H%M%S.png"); ImageGrab.grab().save(p); os_open(str(p))
        return "Ekran görüntüsü alındı"
    if re.match(r"^(bilgisayarı |ekranı )?kilitle$", s):
        lock_pc(); return "Bilgisayar kilitlendi"
    if re.match(r"^saat kaç$", s):
        return "Saat " + time.strftime("%H:%M")
    if re.match(r"^(bugün )?(ayın kaçı|bugün ne|tarih ne)$", s):
        g = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"][datetime.date.today().weekday()]
        return datetime.date.today().strftime(f"%d.%m.%Y, {g}")
    m = re.match(r"^(.+?)\s+(?:aç|başlat|çalıştır)$", s)
    if m and len(m.group(1)) <= 40 and not re.search(r"\b(ve|sonra|ardından|için|ile)\b", m.group(1)):
        done = open_any(m.group(1))
        if done:
            return done[0].upper() + done[1:]
    return None


# ───────────────────────── TARAYICI (ayrı Jarvis profili, giriş bir kez yapılır) ─────────────────────────
class Browser:
    def __init__(self):
        self.pw = self.ctx = self.page = None
        self.last_field = ("", 0.0)

    async def ensure(self):
        if self.page and not self.page.is_closed():
            return self.page
        from playwright.async_api import async_playwright
        if not self.pw:
            self.pw = await async_playwright().start()
        prof = str(ROOT / "tarayici-profili")
        try:
            self.ctx = await self.pw.chromium.launch_persistent_context(prof, channel="chrome", headless=False, no_viewport=True)
        except Exception:
            self.ctx = await self.pw.chromium.launch_persistent_context(prof, headless=False, no_viewport=True)
        self.page = self.ctx.pages[0] if self.ctx.pages else await self.ctx.new_page()
        self.ctx.on("page", lambda p: setattr(self, "page", p))  # yeni sekme açılırsa ona geç
        return self.page

    async def go(self, url):
        p = await self.ensure()
        if not re.match(r"^https?://", url):
            url = "https://" + url
        await p.goto(url, wait_until="domcontentloaded", timeout=30000)
        await p.wait_for_timeout(800)
        return await self.look()

    async def look(self):
        p = await self.ensure()
        items = await p.evaluate(r"""() => {
          const sel='a[href],button,input,textarea,select,[role=button],[role=link],[role=textbox],[role=tab],[role=menuitem],[contenteditable=true],ytmusic-responsive-list-item-renderer';
          const vis=e=>{const r=e.getBoundingClientRect();const s=getComputedStyle(e);return r.width>2&&r.height>2&&s.visibility!=='hidden'&&s.display!=='none'};
          let n=0;const out=[];document.querySelectorAll('[data-jv]').forEach(e=>e.removeAttribute('data-jv'));
          const all=[...document.querySelectorAll(sel)].filter(vis);
          const inView=e=>{const r=e.getBoundingClientRect();return r.bottom>0&&r.top<innerHeight};
          all.sort((a,b)=>inView(b)-inView(a));
          for(const e of all){if(n>=140)break;const name=(e.getAttribute('aria-label')||e.innerText||e.value||e.placeholder||e.title||e.getAttribute('href')||'').replace(/\s+/g,' ').trim().slice(0,80);
            if(!name&&!/INPUT|TEXTAREA/.test(e.tagName))continue;n++;e.setAttribute('data-jv',n);
            out.push(`[${n}] ${e.getAttribute('role')||e.tagName.toLowerCase()}${e.type&&e.tagName==='INPUT'?'('+e.type+')':''}: ${name}`)}
          const text=document.body.innerText.replace(/\n{3,}/g,'\n\n').slice(0,2500);
          return {title:document.title,url:location.href,items:out.join('\n'),text}}""")
        return f"Sayfa: {items['title']}\nAdres: {items['url']}\n\nTıklanabilir/yazılabilir öğeler:\n{items['items']}\n\nSayfadaki yazı (ilk kısım):\n{items['text']}"

    async def el(self, i):
        p = await self.ensure()
        loc = p.locator(f'[data-jv="{int(i)}"]')
        if not await loc.count():
            raise RuntimeError("Bu numarada öğe yok; önce browser_look ile sayfaya yeniden bak.")
        return loc.first

    async def name_of(self, i):
        loc = await self.el(i)
        return (await loc.evaluate("e=>(e.getAttribute('aria-label')||e.innerText||e.value||e.placeholder||'').replace(/\\s+/g,' ').trim().slice(0,80)")) or ""


browser = Browser()

RISKY = re.compile(r"(gönder|send|yayınla|paylaş|publish|post|tweet|yorum yap|comment|reply|yanıtla|cevapla|satın al|buy|öde|pay|sipariş|order|sil|delete|remove|kaldır|onayla|confirm|rezervasyon|randevu al|book|abone ol|subscribe|takip et|follow|kaydet ve gönder)", re.I)
TEXTY = re.compile(r"(yorum|comment|mesaj|message|tweet|post|reply|yanıt|cevap|gönder|e-?posta|email)", re.I)

# ───────────────────────── AJAN ─────────────────────────
SYSTEM = """Sen JARVIS'sin: kullanıcının bilgisayarında tam yetkili, Türkçe konuşan kişisel asistan. Kullanıcıyla sesli konuşuyorsun; yanıtların yüksek sesle okunuyor.

Nasıl çalışırsın:
- Hemen harekete geç. İzin istemek için durma (sadece aşağıdaki geri alınamaz işler hariç). Önce yap, sonra kısaca söyle.
- En kısa yolu seç: adresi biliyorsan doğrudan aç (open_target ya da browser_go), arama kutusuna yazıp tıklama. Uygulamayı open_target ile doğrudan aç.
- Tarayıcıda bir sitede iş yapacaksan (giriş gerektiren: YouTube, YouTube Music, Gmail, takvim, randevu siteleri) browser_* araçlarını kullan; bu ayrı Jarvis tarayıcısıdır, kullanıcı bir kez giriş yapmıştır. Giriş istenirse kullanıcıya o pencerede giriş yapmasını söyle.
- Masaüstü uygulamalarında screenshot → click/type_text/press_keys kullan. Tıkladıktan sonra sonucu kontrol et.
- Bir yol olmazsa pes etme, alternatif düşün: başka bir sayfa, başka bir uygulama, kısayol tuşu, arama. Örnek: YouTube Music'te yorum özelliği yoksa aynı şarkının YouTube videosunu bul ve yorumu oraya yaz.
- Bilgi soruları için web_search kullan; kısa ve kesin cevap ver.
- Yapmadığın bir şeyi yaptım deme; işlemden sonra sayfaya/ekrana bakıp doğrula.

Geri alınamaz işler: gönderme, yayınlama, yorum/mesaj gönderme, satın alma, ödeme, silme, randevu/rezervasyon onaylama, komut çalıştırma. Bunlarda araç kullanıcıdan otomatik onay ister; sen sadece ne yapacağını net söyle (ör. yorumun tam metni). Kullanıcı reddederse başka yol dene ya da sor.

Yanıt biçimi: Türkçe, 1–2 kısa cümle, konuşma dili. Madde işareti, başlık, emoji, kod bloğu yok (okunacak). Uzun içerik gerekiyorsa kısaca özetle.
Kullanıcı AppShell içinden konuşuyor (kişisel uygulama merkezi: Notlar, Galeri, Haberler, Study Log…); hatırlatıcı için appshell_reminder kullan."""


def T(name, desc, props=None, req=None):
    return {"name": name, "description": desc, "eager_input_streaming": True,
            "input_schema": {"type": "object", "properties": props or {}, "required": req or []}}


S = {"type": "string"}
TOOLS = [
    T("open_target", "Bir siteyi (ad ya da adres), uygulamayı, dosyayı ya da klasörü varsayılan programla ANINDA açar. Kullanıcının kendi tarayıcısında açar.",
      {"target": {"type": "string", "description": "ör. 'youtube', 'https://…', 'spotify', 'hesap makinesi', 'C:/Users/…/belge.pdf'"}}, ["target"]),
    {"type": "web_search_20260209", "name": "web_search", "max_uses": 3},
    T("browser_go", "Jarvis tarayıcısında (girişli ayrı profil) bir adrese git ve sayfayı döndür (numaralı öğeler + yazı).", {"url": S}, ["url"]),
    T("browser_look", "Jarvis tarayıcısındaki sayfaya yeniden bak: numaralı tıklanabilir öğeler ve sayfa yazısı."),
    T("browser_click", "Numaralı öğeye tıkla (numara browser_look/browser_go çıktısından).", {"id": {"type": "integer"}}, ["id"]),
    T("browser_type", "Numaralı alana yazı yaz. submit=true ise ardından Enter'a bas.",
      {"id": {"type": "integer"}, "text": S, "submit": {"type": "boolean"}}, ["id", "text"]),
    T("browser_keys", "Jarvis tarayıcısında tuşa bas (ör. 'Enter', 'Escape', 'Control+L', 'PageDown').", {"keys": S}, ["keys"]),
    T("screenshot", "Bilgisayar ekranının görüntüsünü al (masaüstü uygulamaları için). Tıklama koordinatları bu görüntüye göredir."),
    T("click", "Ekranda (son screenshot görüntüsündeki koordinatlarla) tıkla.",
      {"x": {"type": "integer"}, "y": {"type": "integer"}, "double": {"type": "boolean"}, "right": {"type": "boolean"}}, ["x", "y"]),
    T("type_text", "Odaktaki yere klavyeyle yazı yaz (masaüstü).", {"text": S}, ["text"]),
    T("press_keys", "Klavye kısayolu/tuş (masaüstü), ör. 'ctrl+t', 'alt+tab', 'enter', 'win+d'.", {"keys": S}, ["keys"]),
    T("run_command", "Bilgisayarda komut çalıştır (Windows'ta PowerShell). Kullanıcı onayı istenir. Çıktıyı döndürür.",
      {"command": S, "why": {"type": "string", "description": "kullanıcıya gösterilecek kısa sebep"}}, ["command", "why"]),
    T("list_files", "Klasördeki dosyaları listele.", {"path": S}, ["path"]),
    T("read_file", "Küçük bir metin dosyasını oku (en çok 20 KB).", {"path": S}, ["path"]),
    T("appshell_reminder", "AppShell'de hatırlatıcı kur (telefona ve bilgisayara bildirim gelir).",
      {"text": S, "when": {"type": "string", "description": "yerel saatle ISO tarih-saat, ör. 2026-11-26T09:00"}}, ["text", "when"]),
    T("remember", "Kullanıcı hakkında kalıcı bir bilgiyi hatırla (tercih, kişi, alışkanlık).", {"fact": S}, ["fact"]),
    T("wait", "Birkaç saniye bekle (sayfa/uygulama yüklenirken).", {"seconds": {"type": "number"}}, ["seconds"]),
]


class Session:
    def __init__(self, ws):
        self.ws = ws
        self.hist = []
        self.task = None
        self.asks = {}
        self.allow_cmd = False
        self.scale = 1.0
        self.last = time.time()

    async def send(self, **m):
        try:
            await self.ws.send(json.dumps(m, ensure_ascii=False))
        except Exception:
            pass

    async def ask(self, rid, title, detail):
        aid = secrets.token_hex(4)
        fut = asyncio.get_running_loop().create_future()
        self.asks[aid] = fut
        await self.send(t="ask", id=rid, aid=aid, title=title, detail=detail)
        try:
            return await asyncio.wait_for(fut, 180)
        except asyncio.TimeoutError:
            await self.send(t="askgone", id=rid, aid=aid)
            return False
        finally:
            self.asks.pop(aid, None)


def need(args, *ks):
    for k in ks:
        if k not in args:
            raise ValueError(f"'{k}' eksik")


async def run_tool(sess: Session, rid, name, a):
    """Bir aracı çalıştır → tool_result içeriği (metin ya da görüntü listesi)."""
    loop = asyncio.get_running_loop()
    if name == "open_target":
        need(a, "target")
        r = await loop.run_in_executor(None, open_any, str(a["target"]))
        if r:
            return r
        raise RuntimeError(f"“{a['target']}” bulunamadı. Tam adres ya da başka bir ad dene, ya da screenshot ile Başlat menüsünden aç.")
    if name == "browser_go":
        need(a, "url"); return "(sahte)" if MOCK else await browser.go(str(a["url"]))
    if name == "browser_look":
        return "(sahte)" if MOCK else await browser.look()
    if name == "browser_click":
        need(a, "id")
        if MOCK:
            return "(sahte) tıklandı"
        nm = await browser.name_of(a["id"])
        if RISKY.search(nm) and not await sess.ask(rid, f"“{nm}” düğmesine basılsın mı?", "Bu işlem geri alınamayabilir (gönderme / onaylama / silme / satın alma)."):
            return "Kullanıcı onaylamadı; tıklanmadı."
        await (await browser.el(a["id"])).click(timeout=8000)
        await browser.page.wait_for_timeout(700)
        return f"“{nm}” tıklandı.\n\n" + await browser.look()
    if name == "browser_type":
        need(a, "id", "text")
        if MOCK:
            return "(sahte) yazıldı"
        nm = await browser.name_of(a["id"])
        if a.get("submit") and not await sess.ask(rid, "Yazıp gönderilsin mi?", f"Alan: {nm or '—'}\nMetin: {a['text']}"):
            return "Kullanıcı onaylamadı; gönderilmedi (yazı da yazılmadı)."
        loc = await browser.el(a["id"])
        await loc.click(timeout=8000)
        await loc.fill(str(a["text"])) if await loc.evaluate("e=>/INPUT|TEXTAREA/.test(e.tagName)") else await browser.page.keyboard.type(str(a["text"]), delay=8)
        browser.last_field = (nm, time.time())
        if a.get("submit"):
            await browser.page.keyboard.press("Enter")
            await browser.page.wait_for_timeout(900)
        return "Yazıldı." + ("\n\n" + await browser.look() if a.get("submit") else "")
    if name == "browser_keys":
        need(a, "keys")
        if MOCK:
            return "(sahte)"
        k = str(a["keys"])
        fld, at = browser.last_field
        if "enter" in k.lower() and TEXTY.search(fld) and time.time() - at < 60 and not await sess.ask(rid, "Gönderilsin mi?", f"“{fld}” alanındaki yazı Enter ile gönderilecek."):
            return "Kullanıcı onaylamadı; Enter'a basılmadı."
        await browser.page.keyboard.press(k)
        await browser.page.wait_for_timeout(600)
        return f"{k} basıldı."
    if name == "screenshot":
        if MOCK:
            return "(sahte) ekran görüntüsü yok"
        b64, sess.scale = await loop.run_in_executor(None, shot_jpeg)
        return [{"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": b64}},
                {"type": "text", "text": "Ekran görüntüsü. click koordinatlarını bu görüntüye göre ver."}]
    if name == "click":
        need(a, "x", "y")
        if not MOCK:
            import pyautogui
            x, y = int(a["x"] * sess.scale), int(a["y"] * sess.scale)
            await loop.run_in_executor(None, lambda: pyautogui.click(x, y, clicks=2 if a.get("double") else 1, button="right" if a.get("right") else "left"))
        return "Tıklandı. Sonucu görmek için screenshot al."
    if name == "type_text":
        need(a, "text")
        if not MOCK:
            import pyautogui
            txt = str(a["text"])
            if txt.isascii():
                await loop.run_in_executor(None, lambda: pyautogui.write(txt, interval=0.005))
            else:  # Türkçe karakterler: panodan yapıştır
                await loop.run_in_executor(None, lambda: paste_text(txt))
        return "Yazıldı."
    if name == "press_keys":
        need(a, "keys")
        if not MOCK:
            parts = [p.strip().lower().replace("win", "winleft").replace("cmd", "command") for p in str(a["keys"]).split("+")]
            await loop.run_in_executor(None, lambda: keys(*parts))
        return f"{a['keys']} basıldı."
    if name == "run_command":
        need(a, "command")
        if not sess.allow_cmd:
            ok = await sess.ask(rid, "Bu komut çalıştırılsın mı?", f"{a.get('why', '')}\n\n{a['command']}")
            if not ok:
                return "Kullanıcı onaylamadı; komut çalıştırılmadı."
        if MOCK:
            return "(sahte) çıktı"
        cmd = ["powershell", "-NoProfile", "-Command", a["command"]] if WIN else ["bash", "-lc", a["command"]]
        def run():
            r = subprocess.run(cmd, capture_output=True, text=True, timeout=90, encoding="utf-8", errors="replace")
            return (f"çıkış kodu {r.returncode}\n" + (r.stdout or "") + (("\nHATA:\n" + r.stderr) if r.stderr else ""))[-5000:]
        return await loop.run_in_executor(None, run)
    if name == "list_files":
        need(a, "path")
        p = pathlib.Path(os.path.expandvars(os.path.expanduser(str(a["path"]))))
        L = sorted(p.iterdir(), key=lambda x: (not x.is_dir(), x.name.lower()))[:200]
        return "\n".join(("📁 " if x.is_dir() else "") + x.name for x in L) or "(boş)"
    if name == "read_file":
        need(a, "path")
        p = pathlib.Path(os.path.expandvars(os.path.expanduser(str(a["path"]))))
        if p.stat().st_size > 20000:
            return p.read_text("utf-8", errors="replace")[:20000] + "\n…(kısaltıldı)"
        return p.read_text("utf-8", errors="replace")
    if name == "appshell_reminder":
        need(a, "text", "when")
        await sess.send(t="remind", id=rid, text=str(a["text"]), when=str(a["when"]))
        return "Hatırlatıcı AppShell'e iletildi."
    if name == "remember":
        need(a, "fact")
        m = memory(); m.append(str(a["fact"])[:200]); MEM.write_text(json.dumps(m[-60:], ensure_ascii=False, indent=1), "utf-8")
        return "Hatırlandı."
    if name == "wait":
        await asyncio.sleep(min(10.0, max(0.2, float(a.get("seconds", 1)))))
        return "Beklendi."
    raise RuntimeError(f"Bilinmeyen araç: {name}")


def paste_text(txt):
    import pyautogui
    try:
        import tkinter as tk
        r = tk.Tk(); r.withdraw(); r.clipboard_clear(); r.clipboard_append(txt); r.update(); r.destroy()
    except Exception:
        return pyautogui.write(txt.encode("ascii", "ignore").decode(), interval=0.005)
    pyautogui.hotkey("command" if MAC else "ctrl", "v")


LABEL = {"open_target": "Açılıyor", "web_search": "İnternette aranıyor", "browser_go": "Sayfaya gidiliyor", "browser_look": "Sayfaya bakılıyor",
         "browser_click": "Tıklanıyor", "browser_type": "Yazılıyor", "browser_keys": "Tuşa basılıyor", "screenshot": "Ekrana bakılıyor",
         "click": "Tıklanıyor", "type_text": "Yazılıyor", "press_keys": "Tuşa basılıyor", "run_command": "Komut çalıştırılıyor",
         "list_files": "Dosyalara bakılıyor", "read_file": "Dosya okunuyor", "appshell_reminder": "Hatırlatıcı kuruluyor",
         "remember": "Not alınıyor", "wait": "Bekleniyor"}


def step_label(name, a):
    d = a.get("target") or a.get("url") or a.get("text") or a.get("keys") or a.get("command") or a.get("path") or a.get("fact") or ""
    if name == "browser_click":
        d = f"#{a.get('id')}"
    d = str(d).replace("\n", " ")
    return LABEL.get(name, name) + (f": {d[:70]}" if d else "")


def context_note():
    now = datetime.datetime.now()
    g = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"][now.weekday()]
    mem = memory()
    return (f"[Bağlam — şimdi: {now:%Y-%m-%d %H:%M}, {g}; işletim sistemi: {OS}; kullanıcı klasörü: {pathlib.Path.home()}"
            + (f"; hatırladıkların: {' | '.join(mem[-25:])}" if mem else "") + "]")


async def agent(sess: Session, rid, text):
    import anthropic
    if MOCK:
        await sess.send(t="note", id=rid, text="Planlıyorum: önce sayfayı açıp sonra bakacağım.")
        await sess.send(t="step", id=rid, sid="s1", label="Sayfaya gidiliyor: example.com", state="run"); await asyncio.sleep(0.4)
        await sess.send(t="step", id=rid, sid="s1", label="Sayfaya gidiliyor: example.com", state="ok")
        if re.search(r"yorum|gönder", text):
            ok = await sess.ask(rid, "Yazıp gönderilsin mi?", "Alan: Yorum ekle\nMetin: Harika şarkı!")
            await sess.send(t="step", id=rid, sid="s2", label="Yazılıyor: Harika şarkı!", state="ok" if ok else "err")
        for w in "Tamam, sahte modda işi yaptım gibi davrandım. Gerçek modda bilgisayarında yapacağım.".split(" "):
            await sess.send(t="delta", id=rid, text=w + " "); await asyncio.sleep(0.03)
        return "ok"
    if not cfg["api_key"] and not os.environ.get("ANTHROPIC_API_KEY"):
        await sess.send(t="error", id=rid, msg="Claude anahtarı yok. Jarvis ekranındaki Ayarlar'dan ekle.")
        return "err"
    client = anthropic.AsyncAnthropic(api_key=cfg["api_key"] or None)
    if time.time() - sess.last > 30 * 60 or len(sess.hist) > 80:
        sess.hist = []  # uzun ara ya da çok uzun sohbet: temiz başla
    sess.last = time.time()
    sess.hist.append({"role": "user", "content": [{"type": "text", "text": context_note() + "\n" + text}]})
    bad_json = 0
    for _turn in range(40):
        extra = {"speed": "fast"} if cfg.get("fast") else {}
        notes = {}
        try:
            async with client.beta.messages.stream(
                model=MODEL, max_tokens=16000, system=SYSTEM, tools=TOOLS, messages=sess.hist,
                thinking={"type": "adaptive", "display": "updates"},
                output_config={"effort": cfg.get("effort", "low")},
                betas=["server-side-fallback-2026-07-01", "thinking-display-updates-2026-08-18"],
                fallbacks="default", cache_control={"type": "ephemeral"}, **extra,
            ) as stream:
                async for ev in stream:
                    if ev.type == "content_block_start" and getattr(ev.content_block, "type", "") == "server_tool_use":
                        await sess.send(t="step", id=rid, sid=f"w{ev.index}", label="İnternette aranıyor", state="run")
                    elif ev.type == "content_block_delta":
                        d = ev.delta
                        if d.type == "text_delta":
                            await sess.send(t="delta", id=rid, text=d.text)
                        elif d.type == "thinking_delta" and d.thinking:
                            notes[ev.index] = notes.get(ev.index, "") + d.thinking
                            await sess.send(t="note", id=rid, nid=ev.index, text=notes[ev.index])
                    elif ev.type == "content_block_stop" and ev.index in notes:
                        pass
                msg = await stream.get_final_message()
            bad_json = 0
        except ValueError:
            bad_json += 1  # araç girdisi bozuk JSON geldi: aynı turu yeniden iste
            if bad_json > 2:
                raise
            continue
        for b in msg.content:
            if b.type == "web_search_tool_result":
                await sess.send(t="step", id=rid, sid="w", label="İnternette arandı", state="ok")
        sess.hist.append({"role": "assistant", "content": msg.content})
        if msg.stop_reason == "refusal":
            await sess.send(t="error", id=rid, msg="Bu isteği yapamam.")
            return "refusal"
        if msg.stop_reason == "pause_turn":
            continue
        uses = [b for b in msg.content if b.type == "tool_use"]
        if not uses:
            return "ok"
        if msg.stop_reason == "max_tokens":
            await sess.send(t="error", id=rid, msg="Yanıt yarıda kesildi.")
            return "err"
        results = []
        for u in uses:  # sırayla: bilgisayar/tarayıcı işleri birbirine bağlı
            a = u.input if isinstance(u.input, dict) else {}
            lbl = step_label(u.name, a)
            await sess.send(t="step", id=rid, sid=u.id, label=lbl, state="run")
            try:
                out = await run_tool(sess, rid, u.name, a)
                results.append({"type": "tool_result", "tool_use_id": u.id, "content": out})
                await sess.send(t="step", id=rid, sid=u.id, label=lbl, state="ok")
            except Exception as e:
                results.append({"type": "tool_result", "tool_use_id": u.id, "is_error": True, "content": f"Hata: {e}"[:1500]})
                await sess.send(t="step", id=rid, sid=u.id, label=lbl + f" — olmadı: {str(e)[:80]}", state="err")
        sess.hist.append({"role": "user", "content": results})
    return "ok"


async def handle_say(sess: Session, rid, text):
    t0 = time.perf_counter()
    try:
        q = await asyncio.get_running_loop().run_in_executor(None, quick, text)
        if q:
            await sess.send(t="quick", id=rid, text=q, ms=int((time.perf_counter() - t0) * 1000))
            log(f"hızlı ({int((time.perf_counter() - t0) * 1000)} ms):", text, "→", q)
            sess.hist.append({"role": "user", "content": [{"type": "text", "text": f"{context_note()}\n{text}\n[Bu komut hızlı yoldan yapıldı: {q}]"}]})
            sess.hist.append({"role": "assistant", "content": [{"type": "text", "text": q}]})
            return
        log("ajan:", text)
        r = await agent(sess, rid, text)
        await sess.send(t="done", id=rid, r=r)
    except asyncio.CancelledError:
        await sess.send(t="done", id=rid, r="stopped")
        # yarım kalan tur: geçmişi tutarlı bırak (son araç çağrısının cevabı yoksa at)
        while sess.hist and sess.hist[-1]["role"] == "assistant" and any(getattr(b, "type", None) == "tool_use" for b in sess.hist[-1]["content"]):
            sess.hist.pop()
        raise
    except Exception as e:
        import anthropic
        msg = str(e)
        if isinstance(e, anthropic.AuthenticationError):
            msg = "Claude anahtarı geçersiz. Ayarlar'dan yeniden gir."
        elif isinstance(e, anthropic.RateLimitError):
            msg = "Çok sık istek; birkaç saniye sonra tekrar dene."
        elif isinstance(e, anthropic.APIConnectionError):
            msg = "İnternete ya da Claude'a bağlanılamadı."
        elif isinstance(e, anthropic.APIStatusError):
            msg = f"Claude hatası ({e.status_code}): {getattr(e, 'message', msg)}"
        log("HATA:", repr(e))
        await sess.send(t="error", id=rid, msg=msg[:300])
        await sess.send(t="done", id=rid, r="err")


# ───────────────────────── sunucu ─────────────────────────
async def handler(ws):
    sess = Session(ws)
    authed = False
    await sess.send(t="hello", name="JARVIS", os=OS, mock=MOCK)
    async for raw in ws:
        try:
            m = json.loads(raw)
        except Exception:
            continue
        k = m.get("t")
        if not authed:
            if k == "auth" and m.get("token") in cfg["tokens"]:
                authed = True
            elif k == "pair" and str(m.get("code", "")).strip() == cfg["pair"]:
                tok = secrets.token_urlsafe(24); cfg["tokens"] = (cfg["tokens"] + [tok])[-10:]; save_cfg()
                await sess.send(t="paired", token=tok); authed = True
                log("Yeni cihaz eşleştirildi.")
            else:
                await sess.send(t="need_pair", bad=k == "pair"); continue
            await sess.send(t="ready", has_key=bool(cfg["api_key"] or os.environ.get("ANTHROPIC_API_KEY")), effort=cfg["effort"], fast=cfg["fast"], os=OS, mock=MOCK)
            continue
        if k == "say":
            if sess.task and not sess.task.done():
                sess.task.cancel()
            sess.task = asyncio.create_task(handle_say(sess, m.get("id") or secrets.token_hex(3), str(m.get("text", ""))[:2000]))
        elif k == "stop":
            if sess.task and not sess.task.done():
                sess.task.cancel()
        elif k == "approve":
            f = sess.asks.get(m.get("aid"))
            if f and not f.done():
                f.set_result(bool(m.get("ok")))
            if m.get("always"):
                sess.allow_cmd = True
        elif k == "set":
            if "key" in m and isinstance(m["key"], str) and m["key"].startswith("sk-"):
                cfg["api_key"] = m["key"].strip()
            if m.get("effort") in ("low", "medium", "high", "xhigh"):
                cfg["effort"] = m["effort"]
            if "fast" in m:
                cfg["fast"] = bool(m["fast"])
            save_cfg()
            await sess.send(t="ready", has_key=bool(cfg["api_key"] or os.environ.get("ANTHROPIC_API_KEY")), effort=cfg["effort"], fast=cfg["fast"], os=OS, mock=MOCK)
        elif k == "new":
            sess.hist = []
    if sess.task and not sess.task.done():
        sess.task.cancel()


def serve_ui(conn, req):
    """Tarayıcıdan http://127.0.0.1:8765 açılırsa Jarvis ekranını ver (AppShell'e erişilemezse yedek yol)."""
    from websockets.http11 import Response
    from websockets.datastructures import Headers
    if req.headers.get("Upgrade", "").lower() == "websocket":
        return None
    ui = ROOT.parent / "apps" / "jarvis" / "index.html"
    body = ui.read_bytes() if ui.exists() else "<meta charset=utf-8><p>Jarvis çalışıyor. Ekran için AppShell'de Jarvis'i aç.</p>".encode()
    return Response(200, "OK", Headers([("Content-Type", "text/html; charset=utf-8"), ("Cache-Control", "no-store")]), body)


async def main():
    from websockets.asyncio.server import serve
    print("\n  ╭──────────────────────────────╮\n  │   J A R V I S   hazır        │\n  ╰──────────────────────────────╯")
    print(f"  Eşleştirme kodu: {cfg['pair']}   (AppShell → Jarvis'te bir kez gir)")
    print(f"  Anahtar: {'var ✓' if cfg['api_key'] or os.environ.get('ANTHROPIC_API_KEY') else 'yok — Jarvis ekranındaki Ayarlar’dan ekle'}")
    print(f"  Mod: {'SAHTE (hiçbir şey yapılmaz)' if MOCK else 'gerçek'} · {OS}")
    print("  Bu pencereyi kapatma; Jarvis bu çalıştıkça çalışır. Durdurmak: Ctrl+C\n", flush=True)
    async with serve(handler, "127.0.0.1", PORT, origins=ORIGINS, process_request=serve_ui, max_size=2 ** 22):
        await asyncio.get_running_loop().create_future()


if __name__ == "__main__":
    if "--hizli-test" in sys.argv:  # hızlı yol eşleşmelerini dene (hiçbir şey açmaz)
        MOCK = True
        for c in sys.argv[sys.argv.index("--hizli-test") + 1:]:
            print(f"{c!r:45} → {quick(c)}")
        sys.exit()
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nJarvis kapandı.")
    except OSError as e:
        if getattr(e, "errno", None) in (98, 10048, 48):  # adres kullanımda (Linux / Windows / macOS)
            print(f"\n  Jarvis zaten çalışıyor (port {PORT} dolu). Açık olan Jarvis penceresini kullan ya da onu kapatıp yeniden başlat.")
        else:
            raise
