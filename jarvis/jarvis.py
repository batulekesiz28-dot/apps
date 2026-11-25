#!/usr/bin/env python3
"""
JARVIS çekirdeği — bilgisayarında çalışır, AppShell'deki Jarvis ekranı buna bağlanır.

Ne yapar:
  • Hızlı yol: "google aç", "youtube'da lofi aç", "hesap makinesi aç", "sesi kıs", "sonraki şarkı" gibi komutlar
    yapay zekâya hiç sorulmadan anında (milisaniyeler) yapılır.
  • Ajan: diğer her şey Claude'a (claude-opus-5-5) gider; model araçlarla bilgisayarı ve tarayıcıyı kullanır,
    bir yol olmazsa başka yol dener, yaptığı her adımı sohbete canlı yazar.
  • Onay: geri alınamaz işler (komut çalıştırma, gönder/yayınla/yorum/sil/satın al…) senden onay almadan yapılmaz.

EK PAKET YOK: sadece Python'un kendisi. (Windows'un Akıllı Uygulama Denetimi pip paketlerinin imzasız parçalarını ve
internetten inen .bat dosyalarını engelliyor; bu yüzden klavye/fare/ekran Windows'un kendi çağrılarıyla (ctypes),
tarayıcı Chrome/Edge'in kendi kontrol kanalıyla (DevTools), Claude bağlantısı Python'un kendi HTTPS'iyle yapılır.)

Güvenlik: sunucu sadece bu bilgisayardan (127.0.0.1) ve sadece AppShell adresinden bağlantı kabul eder;
ilk bağlantıda bu pencerede yazan 6 haneli kodu AppShell'e girersin (eşleştirme). Anahtarın sadece bu klasördeki
ayarlar.json'da durur, hiçbir yere gönderilmez (sadece Anthropic API'ye).

Kurulum (Windows, Win+R'ye yapıştır):
  py -c "import urllib.request as u;exec(u.urlopen('https://batulekesiz28-dot.github.io/apps/jarvis/kur.py').read())"
Çalıştır:  python jarvis.py          Test: python jarvis.py --sahte  (hiçbir şeyi gerçekten yapmaz)
"""
import asyncio, base64, datetime, hashlib, html as htmlmod, json, os, pathlib, platform, re, secrets, shutil, struct, subprocess, sys, tempfile, threading, time, zlib
import urllib.error, urllib.parse, urllib.request

try:
    sys.stdout.reconfigure(encoding="utf-8")  # Windows konsolunda Türkçe karakterler
except Exception:
    pass

VERSION = "2026.11.25e"
ROOT = pathlib.Path(__file__).resolve().parent
CFG = ROOT / "ayarlar.json"
MEM = ROOT / "hafiza.json"
SHOTS = ROOT / "ekran"
PORT = 8765
CDP_PORT = 9223
OS = platform.system()  # Windows | Darwin | Linux
WIN, MAC = OS == "Windows", OS == "Darwin"
MOCK = "--sahte" in sys.argv
HUB = "https://batulekesiz28-dot.github.io/apps/"
ORIGINS = ["https://batulekesiz28-dot.github.io", "http://localhost:8766", "http://127.0.0.1:8766", f"http://127.0.0.1:{PORT}", f"http://localhost:{PORT}"]
MODEL = "claude-opus-5-5"
LOCAL = urllib.request.build_opener(urllib.request.ProxyHandler({}))  # 127.0.0.1 istekleri vekil sunucuya gitmesin


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
    c.setdefault("provider", "")    # gemini | groq | openrouter (ücretsiz) | claude (ücretli); boşsa anahtarı olandan seçilir
    c.setdefault("keys", {})        # ücretsiz sağlayıcı anahtarları
    return c


def save_cfg():
    CFG.write_text(json.dumps(cfg, ensure_ascii=False, indent=1), "utf-8")


cfg = load_cfg()
save_cfg()


def api_key():
    return cfg["api_key"] or os.environ.get("ANTHROPIC_API_KEY", "")


# Ücretsiz sağlayıcılar (hepsi OpenAI uyumlu sohbet + araç çağırma). Model adları sık değiştiği için sabit yazılmaz:
# anahtarın erişebildiği modeller listelenir, en iyisi seçilir; kota yoksa sıradakine geçilir.
FREE = {
    "gemini": {"name": "Gemini", "url": "https://generativelanguage.googleapis.com/v1beta/openai/", "vision": True},
    "groq": {"name": "Groq", "url": "https://api.groq.com/openai/v1/", "vision": False},
    "openrouter": {"name": "OpenRouter", "url": "https://openrouter.ai/api/v1/", "vision": False},
}
PROVS = ["gemini", "groq", "openrouter", "claude"]
PNAME = {**{k: v["name"] for k, v in FREE.items()}, "claude": "Claude"}


def key_of(p):
    return api_key() if p == "claude" else str(cfg["keys"].get(p) or "")


def prov():
    p = cfg.get("provider")
    if p in PROVS:
        return p
    return next((k for k in PROVS if key_of(k)), "gemini")


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


def lock_pc():
    if MOCK:
        return
    if WIN:
        U32.LockWorkStation()
    elif MAC:
        subprocess.Popen(["pmset", "displaysleepnow"])
    else:
        subprocess.Popen(["loginctl", "lock-session"])


# ───────────────────────── klavye · fare · ekran (ek paket yok) ─────────────────────────
class NotHere(RuntimeError):
    pass


VK = {"enter": 0x0D, "return": 0x0D, "tab": 0x09, "esc": 0x1B, "space": 0x20, "backspace": 0x08, "delete": 0x2E, "del": 0x2E,
      "home": 0x24, "end": 0x23, "pageup": 0x21, "pagedown": 0x22, "up": 0x26, "down": 0x28, "left": 0x25, "right": 0x27,
      "ctrl": 0x11, "alt": 0x12, "shift": 0x10, "win": 0x5B, "cmd": 0x5B, "super": 0x5B, "meta": 0x5B, "menu": 0x5D,
      "volumeup": 0xAF, "volumedown": 0xAE, "volumemute": 0xAD, "nexttrack": 0xB0, "prevtrack": 0xB1, "playpause": 0xB3,
      "printscreen": 0x2C, "insert": 0x2D, "capslock": 0x14}
VK.update({f"f{i}": 0x6F + i for i in range(1, 13)})
EXT = {0x21, 0x22, 0x23, 0x24, 0x25, 0x26, 0x27, 0x28, 0x2D, 0x2E, 0x5B, 0x5D, 0xAD, 0xAE, 0xAF, 0xB0, 0xB1, 0xB3}
XDO = {"enter": "Return", "esc": "Escape", "win": "super", "cmd": "super", "meta": "super", "pageup": "Prior", "pagedown": "Next",
       "volumeup": "XF86AudioRaiseVolume", "volumedown": "XF86AudioLowerVolume", "volumemute": "XF86AudioMute",
       "playpause": "XF86AudioPlay", "nexttrack": "XF86AudioNext", "prevtrack": "XF86AudioPrev", "del": "Delete", "backspace": "BackSpace"}


def key_name(n: str) -> str:
    n = n.strip().lower().replace(" ", "")
    n = n.replace("arrow", "").replace("winleft", "win").replace("windows", "win").replace("command", "cmd").replace("control", "ctrl")
    return {"pgup": "pageup", "pgdn": "pagedown", "escape": "esc", "ctl": "ctrl", "option": "alt"}.get(n, n)


if WIN:
    import ctypes
    from ctypes import wintypes as W
    U32, GDI = ctypes.windll.user32, ctypes.windll.gdi32
    try:
        ctypes.windll.shcore.SetProcessDpiAwareness(2)  # gerçek piksel: ekran %125/%150 ölçekliyken de tıklama doğru yere
    except Exception:
        try:
            U32.SetProcessDPIAware()
        except Exception:
            pass

    class KI(ctypes.Structure):
        _fields_ = [("vk", W.WORD), ("scan", W.WORD), ("flags", W.DWORD), ("time", W.DWORD), ("extra", ctypes.c_size_t)]

    class MI(ctypes.Structure):
        _fields_ = [("dx", W.LONG), ("dy", W.LONG), ("data", W.DWORD), ("flags", W.DWORD), ("time", W.DWORD), ("extra", ctypes.c_size_t)]

    class _IU(ctypes.Union):
        _fields_ = [("ki", KI), ("mi", MI)]

    class INP(ctypes.Structure):
        _fields_ = [("type", W.DWORD), ("u", _IU)]

    class BIH(ctypes.Structure):
        _fields_ = [("size", W.DWORD), ("w", W.LONG), ("h", W.LONG), ("planes", W.WORD), ("bits", W.WORD), ("comp", W.DWORD),
                    ("isize", W.DWORD), ("xp", W.LONG), ("yp", W.LONG), ("used", W.DWORD), ("imp", W.DWORD)]

    VP = ctypes.c_void_p
    for _f, _r, _a in [(U32.SendInput, W.UINT, (W.UINT, VP, ctypes.c_int)), (U32.GetDC, VP, (VP,)), (U32.ReleaseDC, ctypes.c_int, (VP, VP)),
                       (U32.VkKeyScanW, ctypes.c_short, (W.WCHAR,)), (U32.SetCursorPos, W.BOOL, (ctypes.c_int, ctypes.c_int)),
                       (GDI.CreateCompatibleDC, VP, (VP,)), (GDI.CreateCompatibleBitmap, VP, (VP, ctypes.c_int, ctypes.c_int)),
                       (GDI.SelectObject, VP, (VP, VP)), (GDI.SetStretchBltMode, ctypes.c_int, (VP, ctypes.c_int)),
                       (GDI.SetBrushOrgEx, W.BOOL, (VP, ctypes.c_int, ctypes.c_int, VP)),
                       (GDI.StretchBlt, W.BOOL, (VP, ctypes.c_int, ctypes.c_int, ctypes.c_int, ctypes.c_int, VP, ctypes.c_int, ctypes.c_int, ctypes.c_int, ctypes.c_int, W.DWORD)),
                       (GDI.GetDIBits, ctypes.c_int, (VP, VP, W.UINT, W.UINT, VP, VP, W.UINT)), (GDI.DeleteObject, W.BOOL, (VP,)), (GDI.DeleteDC, W.BOOL, (VP,))]:
        _f.restype, _f.argtypes = _r, _a

    def _send(items):
        for i in range(0, len(items), 200):
            part = items[i:i + 200]
            U32.SendInput(len(part), (INP * len(part))(*part), ctypes.sizeof(INP))
            time.sleep(0.004)

    def _kb(vk, up=False, scan=0, uni=False):
        return INP(1, _IU(ki=KI(vk, scan, (2 if up else 0) | (4 if uni else 0) | (1 if vk in EXT else 0), 0, 0)))

    def _ms(flags):
        return INP(0, _IU(mi=MI(0, 0, 0, flags, 0, 0)))

    def vk_of(n):
        k = key_name(n)
        if k in VK:
            return VK[k]
        if len(k) == 1:
            if k.isascii() and k.isalnum():
                return ord(k.upper())
            r = U32.VkKeyScanW(k) & 0xFF  # Türkçe klavye düzenine göre (ö, ç, ş…)
            if r != 0xFF:
                return r
        raise ValueError(f"tanınmayan tuş: {n}")


def keys(*names, times=1):
    """Tuşa / kısayola bas: keys('volumeup', times=5), keys('ctrl', 't')."""
    if MOCK:
        return
    if WIN:
        vks = [vk_of(n) for n in names]
        _send(([_kb(v) for v in vks] + [_kb(v, True) for v in reversed(vks)]) * times)
    elif MAC:
        k = [key_name(n) for n in names]
        vol = {"volumeup": "set volume output volume ((output volume of (get volume settings)) + 12)",
               "volumedown": "set volume output volume ((output volume of (get volume settings)) - 12)", "volumemute": "set volume with output muted"}
        if len(k) == 1 and k[0] in vol:
            subprocess.run(["osascript", "-e", vol[k[0]]]); return
        mods = {"cmd": "command down", "ctrl": "control down", "alt": "option down", "shift": "shift down"}
        m = [mods[x] for x in k[:-1] if x in mods]
        codes = {"enter": 36, "tab": 48, "esc": 53, "space": 49, "backspace": 51, "delete": 117, "left": 123, "right": 124, "down": 125, "up": 126}
        last = k[-1]
        what = f"key code {codes[last]}" if last in codes else f'keystroke "{last}"' if len(last) == 1 else None
        if not what:
            raise NotHere(f"Mac'te '{last}' tuşu henüz desteklenmiyor.")
        for _ in range(times):
            subprocess.run(["osascript", "-e", f'tell application "System Events" to {what}' + (f" using {{{', '.join(m)}}}" if m else "")])
    elif shutil.which("xdotool"):
        subprocess.run(["xdotool", "key", "--repeat", str(times), "+".join(XDO.get(key_name(n), key_name(n)) for n in names)])
    else:
        raise NotHere("Bu sistemde klavye kontrolü yok (xdotool kur).")


def os_type(txt: str):
    """Odaktaki yere yaz. Windows'ta Unicode tuş olayları: Türkçe karakterler de doğru yazılır, pano bozulmaz."""
    if MOCK:
        return
    if WIN:
        items = []
        for ch in txt.replace("\r", ""):
            if ch == "\n":
                items += [_kb(0x0D), _kb(0x0D, True)]
                continue
            b = ch.encode("utf-16-le")
            for cu in struct.unpack(f"<{len(b) // 2}H", b):
                items += [_kb(0, scan=cu, uni=True), _kb(0, True, scan=cu, uni=True)]
        _send(items)
    elif MAC:
        subprocess.run(["osascript", "-e", 'tell application "System Events" to keystroke ' + json.dumps(txt)])
    elif shutil.which("xdotool"):
        subprocess.run(["xdotool", "type", "--delay", "4", txt])
    else:
        raise NotHere("Bu sistemde klavye kontrolü yok (xdotool kur).")


def mouse_click(x, y, double=False, right=False):
    if MOCK:
        return
    if WIN:
        U32.SetCursorPos(int(x), int(y)); time.sleep(0.04)
        d, u = (0x8, 0x10) if right else (0x2, 0x4)
        for _ in range(2 if double else 1):
            _send([_ms(d), _ms(u)]); time.sleep(0.05)
    elif shutil.which("xdotool"):
        subprocess.run(["xdotool", "mousemove", str(int(x)), str(int(y)), "click", "--repeat", "2" if double else "1", "3" if right else "1"])
    elif MAC and shutil.which("cliclick"):
        subprocess.run(["cliclick", ("rc:" if right else "dc:" if double else "c:") + f"{int(x)},{int(y)}"])
    else:
        raise NotHere("Bu sistemde ekrana tıklama yok; tarayıcı araçlarını (browser_*) kullan.")


def png_bytes(w, h, rgb: bytes) -> bytes:
    """Ham RGB → PNG (sadece zlib; ek paket yok)."""
    row = w * 3
    raw = b"".join(b"\x00" + rgb[y * row:(y + 1) * row] for y in range(h))
    chunk = lambda t, d: struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(raw, 6)) + chunk(b"IEND", b"")


def shot(max_w=1280):
    """Ekran görüntüsü → (biçim, bayt, ölçek). ölçek = ekran pikseli / görüntü pikseli (tıklama koordinatı için)."""
    if WIN:
        w, h = U32.GetSystemMetrics(0), U32.GetSystemMetrics(1)
        k = min(1.0, max_w / w)
        tw, th = max(1, int(w * k)), max(1, int(h * k))
        sdc = U32.GetDC(None); mdc = GDI.CreateCompatibleDC(sdc); bmp = GDI.CreateCompatibleBitmap(sdc, tw, th); old = GDI.SelectObject(mdc, bmp)
        try:
            GDI.SetStretchBltMode(mdc, 4); GDI.SetBrushOrgEx(mdc, 0, 0, None)  # HALFTONE: küçültürken yazılar okunur kalsın
            GDI.StretchBlt(mdc, 0, 0, tw, th, sdc, 0, 0, w, h, 0x00CC0020 | 0x40000000)
            bi = BIH(40, tw, -th, 1, 32, 0, 0, 0, 0, 0, 0)
            buf = ctypes.create_string_buffer(tw * th * 4)
            GDI.GetDIBits(mdc, bmp, 0, th, buf, ctypes.byref(bi), 0)
        finally:
            GDI.SelectObject(mdc, old); GDI.DeleteObject(bmp); GDI.DeleteDC(mdc); U32.ReleaseDC(None, sdc)
        bgra = buf.raw
        rgb = bytearray(tw * th * 3)
        rgb[0::3], rgb[1::3], rgb[2::3] = bgra[2::4], bgra[1::4], bgra[0::4]
        return "image/png", png_bytes(tw, th, bytes(rgb)), w / tw
    if MAC:
        f = tempfile.mktemp(suffix=".jpg")
        subprocess.run(["screencapture", "-x", "-t", "jpg", f], check=True)
        subprocess.run(["sips", "-Z", str(max_w), f], capture_output=True)
        d = pathlib.Path(f).read_bytes(); os.remove(f)
        return "image/jpeg", d, 1.0
    f = tempfile.mktemp(suffix=".png")
    for cmd in (["gnome-screenshot", "-f", f], ["scrot", f], ["import", "-window", "root", f]):
        if shutil.which(cmd[0]) and subprocess.run(cmd, capture_output=True).returncode == 0 and os.path.exists(f):
            d = pathlib.Path(f).read_bytes(); os.remove(f)
            return "image/png", d, 1.0
    raise NotHere("Bu sistemde ekran görüntüsü alınamıyor.")


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
            kind, data, _ = shot(100000)
            p = SHOTS / time.strftime("ekran-%Y%m%d-%H%M%S." + ("png" if kind == "image/png" else "jpg")); p.write_bytes(data); os_open(str(p))
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


# ───────────────────────── WebSocket (ek paket yok: hem AppShell sunucusu hem tarayıcı istemcisi) ─────────────────────────
WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"


def _xor(data: bytes, key: bytes) -> bytes:
    n = len(data)
    if not n:
        return data
    return (int.from_bytes(data, "big") ^ int.from_bytes((key * (n // 4 + 1))[:n], "big")).to_bytes(n, "big")


def ws_frame(op: int, data: bytes, mask: bool) -> bytes:
    n, mb = len(data), 0x80 if mask else 0
    h = bytes([0x80 | op]) + (bytes([mb | n]) if n < 126 else bytes([mb | 126]) + struct.pack(">H", n) if n < 65536 else bytes([mb | 127]) + struct.pack(">Q", n))
    if mask:
        k = os.urandom(4)
        return h + k + _xor(data, k)
    return h + data


async def ws_recv(r, w, mask_out: bool):
    """Bir mesaj oku → (opcode, bayt). Ping'e cevap verir, parçalı mesajları birleştirir. Kapanışta (8, b'')."""
    buf, op0 = b"", 1
    while True:
        h = await r.readexactly(2)
        fin, op, masked, n = h[0] & 0x80, h[0] & 0x0F, h[1] & 0x80, h[1] & 0x7F
        if n == 126:
            n = struct.unpack(">H", await r.readexactly(2))[0]
        elif n == 127:
            n = struct.unpack(">Q", await r.readexactly(8))[0]
        if n > 1 << 25:
            raise ValueError("mesaj çok büyük")
        key = await r.readexactly(4) if masked else b""
        data = await r.readexactly(n)
        if key:
            data = _xor(data, key)
        if op == 8:
            try:
                w.write(ws_frame(8, data[:2], mask_out)); await w.drain()
            except Exception:
                pass
            return 8, b""
        if op == 9:
            w.write(ws_frame(10, data, mask_out)); await w.drain(); continue
        if op == 10:
            continue
        if op:
            op0 = op
        buf += data
        if fin:
            return op0, buf


class WsConn:
    """AppShell'den gelen bağlantı (sunucu tarafı)."""

    def __init__(self, r, w):
        self.r, self.w, self.lock = r, w, asyncio.Lock()

    async def send(self, text: str):
        async with self.lock:
            self.w.write(ws_frame(1, text.encode("utf-8"), False)); await self.w.drain()

    def __aiter__(self):
        return self

    async def __anext__(self):
        try:
            op, d = await ws_recv(self.r, self.w, False)
        except (asyncio.IncompleteReadError, ConnectionError, ValueError, OSError):
            raise StopAsyncIteration
        if op == 8:
            raise StopAsyncIteration
        return d.decode("utf-8", "replace")


class CDP:
    """Chrome/Edge DevTools bağlantısı (istemci tarafı)."""

    def __init__(self):
        self.n, self.wait, self.dead, self.task = 0, {}, False, None

    async def open(self, url):
        u = urllib.parse.urlparse(url)
        self.r, self.w = await asyncio.open_connection(u.hostname, u.port)
        key = base64.b64encode(os.urandom(16)).decode()
        self.w.write((f"GET {u.path} HTTP/1.1\r\nHost: {u.hostname}:{u.port}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n"
                      f"Sec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n").encode())
        head = await asyncio.wait_for(self.r.readuntil(b"\r\n\r\n"), 10)
        if b" 101 " not in head.split(b"\r\n")[0]:
            raise RuntimeError("Jarvis tarayıcısına bağlanılamadı.")
        self.task = asyncio.create_task(self.pump())
        return self

    async def pump(self):
        try:
            while True:
                op, d = await ws_recv(self.r, self.w, True)
                if op == 8:
                    break
                m = json.loads(d)
                f = self.wait.pop(m.get("id"), None)
                if f and not f.done():
                    f.set_result(m)
        except Exception:
            pass
        finally:
            self.dead = True
            for f in self.wait.values():
                if not f.done():
                    f.set_exception(RuntimeError("Jarvis tarayıcısıyla bağlantı koptu (pencere kapandı mı?)."))

    async def call(self, method, timeout=30, **params):
        if self.dead:
            raise RuntimeError("Jarvis tarayıcısıyla bağlantı koptu.")
        self.n += 1
        f = asyncio.get_running_loop().create_future()
        self.wait[self.n] = f
        self.w.write(ws_frame(1, json.dumps({"id": self.n, "method": method, "params": params}).encode(), True)); await self.w.drain()
        m = await asyncio.wait_for(f, timeout)
        if "error" in m:
            raise RuntimeError(m["error"].get("message", "tarayıcı hatası"))
        return m.get("result", {})

    def close(self):
        self.dead = True
        if self.task:
            self.task.cancel()
        try:
            self.w.close()
        except Exception:
            pass


# ───────────────────────── TARAYICI (ayrı Jarvis profili, giriş bir kez yapılır) ─────────────────────────
def find_browser():
    env = os.environ.get("JARVIS_CHROME")
    if env and os.path.exists(env):
        return env
    if WIN:
        c = []
        for base in (os.environ.get("PROGRAMFILES", r"C:\Program Files"), os.environ.get("PROGRAMFILES(X86)", r"C:\Program Files (x86)"), os.environ.get("LOCALAPPDATA", "")):
            c.append(pathlib.Path(base) / "Google/Chrome/Application/chrome.exe")
        for base in (os.environ.get("PROGRAMFILES(X86)", r"C:\Program Files (x86)"), os.environ.get("PROGRAMFILES", r"C:\Program Files")):
            c.append(pathlib.Path(base) / "Microsoft/Edge/Application/msedge.exe")
        return next((str(p) for p in c if p.exists()), None)
    if MAC:
        return next((p for p in ("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
                                 "/Applications/Chromium.app/Contents/MacOS/Chromium") if os.path.exists(p)), None)
    return next((shutil.which(x) for x in ("google-chrome", "chromium", "chromium-browser", "microsoft-edge") if shutil.which(x)), None)


LOOK_JS = r"""(() => {
  const sel='a[href],button,input,textarea,select,[role=button],[role=link],[role=textbox],[role=tab],[role=menuitem],[contenteditable=true],[contenteditable=""],ytmusic-responsive-list-item-renderer';
  const vis=e=>{const r=e.getBoundingClientRect();const s=getComputedStyle(e);return r.width>2&&r.height>2&&s.visibility!=='hidden'&&s.display!=='none'};
  let n=0;const out=[];document.querySelectorAll('[data-jv]').forEach(e=>e.removeAttribute('data-jv'));
  const all=[...document.querySelectorAll(sel)].filter(vis);
  const inView=e=>{const r=e.getBoundingClientRect();return r.bottom>0&&r.top<innerHeight};
  all.sort((a,b)=>inView(b)-inView(a));
  for(const e of all){if(n>=140)break;const name=(e.getAttribute('aria-label')||e.innerText||e.value||e.placeholder||e.title||e.getAttribute('href')||'').replace(/\s+/g,' ').trim().slice(0,80);
    if(!name&&!/INPUT|TEXTAREA/.test(e.tagName)&&!e.isContentEditable)continue;n++;e.setAttribute('data-jv',n);
    out.push(`[${n}] ${e.getAttribute('role')||e.tagName.toLowerCase()}${e.type&&e.tagName==='INPUT'?'('+e.type+')':''}: ${name||'(boş alan)'}`)}
  const text=(document.body?document.body.innerText:'').replace(/\n{3,}/g,'\n\n').slice(0,2500);
  return {title:document.title,url:location.href,items:out.join('\n'),text}})()"""
KEYDEF = {"enter": ("Enter", 13, "\r"), "tab": ("Tab", 9, ""), "esc": ("Escape", 27, ""), "backspace": ("Backspace", 8, ""), "delete": ("Delete", 46, ""),
          "space": (" ", 32, " "), "up": ("ArrowUp", 38, ""), "down": ("ArrowDown", 40, ""), "left": ("ArrowLeft", 37, ""), "right": ("ArrowRight", 39, ""),
          "pageup": ("PageUp", 33, ""), "pagedown": ("PageDown", 34, ""), "home": ("Home", 36, ""), "end": ("End", 35, "")}
MODS = {"alt": 1, "ctrl": 2, "cmd": 4, "meta": 4, "win": 4, "shift": 8}


class Browser:
    def __init__(self):
        self.c, self.cur, self.seen = None, None, set()
        self.last_field = ("", 0.0)

    @staticmethod
    def _http(path, method="GET"):
        req = urllib.request.Request(f"http://127.0.0.1:{CDP_PORT}{path}", method=method)
        with LOCAL.open(req, timeout=3) as r:
            return json.loads(r.read() or b"null")

    async def _q(self, path, method="GET"):
        return await asyncio.get_running_loop().run_in_executor(None, self._http, path, method)

    async def launch(self):
        exe = find_browser()
        if not exe:
            raise RuntimeError("Chrome ya da Edge bulunamadı. Siteyi open_target ile kullanıcının kendi tarayıcısında açabilirsin.")
        args = [exe, f"--remote-debugging-port={CDP_PORT}", f"--user-data-dir={ROOT / 'tarayici-profili'}", "--no-first-run",
                "--no-default-browser-check", "about:blank"]
        if os.environ.get("JARVIS_HEADLESS"):
            args.insert(1, "--headless=new")
        if not WIN and hasattr(os, "geteuid") and os.geteuid() == 0:
            args.insert(1, "--no-sandbox")
        subprocess.Popen(args, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        for _ in range(80):
            await asyncio.sleep(0.25)
            try:
                await self._q("/json/version"); return
            except Exception:
                pass
        raise RuntimeError("Jarvis tarayıcısı açılamadı.")

    async def ensure(self):
        try:
            T = await self._q("/json/list")
        except Exception:
            await self.launch(); T = await self._q("/json/list")
        pages = [t for t in T if t.get("type") == "page" and not t.get("url", "").startswith(("devtools://", "chrome-extension://"))]
        if not pages:
            await self._q("/json/new?about:blank", "PUT")
            T = await self._q("/json/list"); pages = [t for t in T if t.get("type") == "page"]
        ids = [t["id"] for t in pages]
        new = [t for t in pages if t["id"] not in self.seen]
        self.seen.update(ids)
        if self.cur and new:
            want = new[0]  # site yeni sekme açtı → ona geç
        elif self.cur in ids:
            want = next(t for t in pages if t["id"] == self.cur)
        else:
            want = pages[0]
        if self.c is None or self.c.dead or want["id"] != self.cur:
            if self.c:
                self.c.close()
            self.c = await CDP().open(want["webSocketDebuggerUrl"])
            self.cur = want["id"]
            try:
                await self.c.call("Page.bringToFront")
            except Exception:
                pass
        return self.c

    async def js(self, expr):
        for i in range(3):
            c = await self.ensure()
            try:
                r = await c.call("Runtime.evaluate", expression=expr, returnByValue=True, awaitPromise=True)
            except RuntimeError as e:
                if i < 2 and re.search(r"context|navigat|target", str(e), re.I):
                    await asyncio.sleep(0.5); continue  # sayfa değişirken
                raise
            if r.get("exceptionDetails"):
                d = r["exceptionDetails"]
                raise RuntimeError((d.get("exception") or {}).get("description") or d.get("text") or "sayfa betiği hatası")
            return (r.get("result") or {}).get("value")

    async def go(self, url):
        if not re.match(r"^[a-z]+:", url):
            url = "https://" + url
        c = await self.ensure()
        await c.call("Page.navigate", url=url)
        await asyncio.sleep(0.4)
        t0 = time.time()
        while time.time() - t0 < 15:
            try:
                st = await self.js("document.readyState")
                if st == "complete" or (st == "interactive" and time.time() - t0 > 4):
                    break
            except Exception:
                pass
            await asyncio.sleep(0.3)
        await asyncio.sleep(0.6)
        return await self.look()

    async def look(self):
        d = await self.js(LOOK_JS) or {}
        return f"Sayfa: {d.get('title')}\nAdres: {d.get('url')}\n\nTıklanabilir/yazılabilir öğeler:\n{d.get('items')}\n\nSayfadaki yazı (ilk kısım):\n{d.get('text')}"

    async def name_of(self, i):
        n = await self.js(f"(()=>{{const e=document.querySelector('[data-jv=\"{int(i)}\"]');return e?(e.getAttribute('aria-label')||e.innerText||e.value||e.placeholder||'').replace(/\\s+/g,' ').trim().slice(0,80):null}})()")
        if n is None:
            raise RuntimeError("Bu numarada öğe yok; önce browser_look ile sayfaya yeniden bak.")
        return n

    async def click(self, i):
        p = await self.js(f"(()=>{{const e=document.querySelector('[data-jv=\"{int(i)}\"]');if(!e)return null;e.scrollIntoView({{block:'center',inline:'center',behavior:'instant'}});const b=e.getBoundingClientRect();return [b.left+b.width/2,b.top+b.height/2]}})()")
        if not p:
            raise RuntimeError("Bu numarada öğe yok; önce browser_look ile sayfaya yeniden bak.")
        x, y = p
        for t in ("mouseMoved", "mousePressed", "mouseReleased"):
            await self.c.call("Input.dispatchMouseEvent", type=t, x=x, y=y, button="none" if t == "mouseMoved" else "left", clickCount=0 if t == "mouseMoved" else 1)

    async def type(self, i, text):
        await self.click(i)
        await asyncio.sleep(0.2)
        await self.js(f"(()=>{{const a=document.activeElement;const t=(a&&a!==document.body)?a:document.querySelector('[data-jv=\"{int(i)}\"]');if(!t)return;t.focus&&t.focus();if(/INPUT|TEXTAREA/.test(t.tagName)&&t.select)t.select();else if(t.isContentEditable)document.execCommand('selectAll')}})()")
        await self.c.call("Input.insertText", text=text)

    async def press(self, spec):
        parts = [p for p in spec.replace(" ", "").split("+") if p]
        if not parts:
            raise ValueError("tuş yok")
        mods = 0
        for p in parts[:-1]:
            mods |= MODS.get(key_name(p), 0)
        k = parts[-1]; kn = key_name(k)
        if kn in KEYDEF:
            key, vk, text = KEYDEF[kn]; code = "Space" if key == " " else key
        elif len(k) == 1:
            key, vk, text = k, ord(k.upper()), k
            code = ("Key" + k.upper()) if k.isascii() and k.isalpha() else ("Digit" + k) if k.isdigit() else ""
        else:
            raise ValueError(f"tanınmayan tuş: {k}")
        if mods & 7:
            text = ""  # kısayolda yazı yazılmaz
        c = await self.ensure()
        base = dict(key=key, code=code, windowsVirtualKeyCode=vk, nativeVirtualKeyCode=vk, modifiers=mods)
        await c.call("Input.dispatchKeyEvent", type="keyDown" if text else "rawKeyDown", **base, **({"text": text, "unmodifiedText": text} if text else {}))
        await c.call("Input.dispatchKeyEvent", type="keyUp", **base)


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
    T("browser_keys", "Jarvis tarayıcısında tuşa bas (ör. 'Enter', 'Escape', 'Control+A', 'PageDown').", {"keys": S}, ["keys"]),
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
SCHEMA = {t["name"]: t["input_schema"] for t in TOOLS if "input_schema" in t}


class Session:
    def __init__(self, ws):
        self.ws = ws
        self.hist = []
        self.n0 = 0
        self.hprov = ""
        self.task = None
        self.asks = {}
        self.allow_cmd = False
        self.scale = 1.0
        self.model = ""
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


def check_input(name, a):
    """Akarak gelen araç girdisini şemaya göre doğrula (eksik alan / yanlış tür → çalıştırma)."""
    sc = SCHEMA.get(name)
    if sc is None:
        return
    if not isinstance(a, dict):
        raise ValueError("girdi nesne değil")
    for k in sc.get("required", []):
        if k not in a:
            raise ValueError(f"'{k}' eksik")
    for k, v in a.items():
        t = sc["properties"].get(k, {}).get("type")
        ok = {"string": isinstance(v, str), "integer": isinstance(v, int) and not isinstance(v, bool), "boolean": isinstance(v, bool),
              "number": isinstance(v, (int, float)) and not isinstance(v, bool)}.get(t, True)
        if not ok:
            raise ValueError(f"'{k}' türü yanlış ({t} olmalı)")


async def run_tool(sess: Session, rid, name, a):
    """Bir aracı çalıştır → tool_result içeriği (metin ya da görüntü listesi)."""
    loop = asyncio.get_running_loop()
    if name == "open_target":
        r = await loop.run_in_executor(None, open_any, a["target"])
        if r:
            return r
        raise RuntimeError(f"“{a['target']}” bulunamadı. Tam adres ya da başka bir ad dene, ya da screenshot ile Başlat menüsünden aç.")
    if name == "browser_go":
        return "(sahte)" if MOCK else await browser.go(a["url"])
    if name == "browser_look":
        return "(sahte)" if MOCK else await browser.look()
    if name == "browser_click":
        if MOCK:
            return "(sahte) tıklandı"
        nm = await browser.name_of(a["id"])
        if RISKY.search(nm) and not await sess.ask(rid, f"“{nm}” düğmesine basılsın mı?", "Bu işlem geri alınamayabilir (gönderme / onaylama / silme / satın alma)."):
            return "Kullanıcı onaylamadı; tıklanmadı."
        await browser.click(a["id"])
        await asyncio.sleep(0.7)
        return f"“{nm}” tıklandı.\n\n" + await browser.look()
    if name == "browser_type":
        if MOCK:
            return "(sahte) yazıldı"
        nm = await browser.name_of(a["id"])
        if a.get("submit") and not await sess.ask(rid, "Yazıp gönderilsin mi?", f"Alan: {nm or '—'}\nMetin: {a['text']}"):
            return "Kullanıcı onaylamadı; gönderilmedi (yazı da yazılmadı)."
        await browser.type(a["id"], a["text"])
        browser.last_field = (nm, time.time())
        if a.get("submit"):
            await browser.press("Enter")
            await asyncio.sleep(0.9)
        return "Yazıldı." + ("\n\n" + await browser.look() if a.get("submit") else "")
    if name == "browser_keys":
        if MOCK:
            return "(sahte)"
        k = a["keys"]
        fld, at = browser.last_field
        if "enter" in k.lower() and TEXTY.search(fld) and time.time() - at < 60 and not await sess.ask(rid, "Gönderilsin mi?", f"“{fld}” alanındaki yazı Enter ile gönderilecek."):
            return "Kullanıcı onaylamadı; Enter'a basılmadı."
        await browser.press(k)
        await asyncio.sleep(0.6)
        return f"{k} basıldı."
    if name == "screenshot":
        if MOCK:
            return "(sahte) ekran görüntüsü yok"
        kind, data, sess.scale = await loop.run_in_executor(None, shot)
        return [{"type": "image", "source": {"type": "base64", "media_type": kind, "data": base64.b64encode(data).decode()}},
                {"type": "text", "text": "Ekran görüntüsü. click koordinatlarını bu görüntüye göre ver."}]
    if name == "click":
        x, y = a["x"] * sess.scale, a["y"] * sess.scale
        await loop.run_in_executor(None, lambda: mouse_click(x, y, bool(a.get("double")), bool(a.get("right"))))
        return "Tıklandı. Sonucu görmek için screenshot al."
    if name == "type_text":
        await loop.run_in_executor(None, os_type, a["text"])
        return "Yazıldı."
    if name == "press_keys":
        parts = [p for p in re.split(r"\s*\+\s*", a["keys"].strip()) if p]
        await loop.run_in_executor(None, lambda: keys(*parts))
        return f"{a['keys']} basıldı."
    if name == "run_command":
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
        p = pathlib.Path(os.path.expandvars(os.path.expanduser(a["path"])))
        L = sorted(p.iterdir(), key=lambda x: (not x.is_dir(), x.name.lower()))[:200]
        return "\n".join(("📁 " if x.is_dir() else "") + x.name for x in L) or "(boş)"
    if name == "read_file":
        p = pathlib.Path(os.path.expandvars(os.path.expanduser(a["path"])))
        if p.stat().st_size > 20000:
            return p.read_text("utf-8", errors="replace")[:20000] + "\n…(kısaltıldı)"
        return p.read_text("utf-8", errors="replace")
    if name == "appshell_reminder":
        await sess.send(t="remind", id=rid, text=a["text"], when=a["when"])
        return "Hatırlatıcı AppShell'e iletildi."
    if name == "remember":
        m = memory(); m.append(a["fact"][:200]); MEM.write_text(json.dumps(m[-60:], ensure_ascii=False, indent=1), "utf-8")
        return "Hatırlandı."
    if name == "wait":
        await asyncio.sleep(min(10.0, max(0.2, float(a.get("seconds", 1)))))
        return "Beklendi."
    raise RuntimeError(f"Bilinmeyen araç: {name}")


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


# ───────────────────────── Claude API (Python'un kendi HTTPS'i, akış) ─────────────────────────
API = os.environ.get("JARVIS_API_URL", "https://api.anthropic.com").rstrip("/") + "/v1/messages"
BETAS = "server-side-fallback-2026-07-01,thinking-display-updates-2026-08-18"


class ApiErr(Exception):
    def __init__(self, status, kind, msg):
        super().__init__(msg)
        self.status, self.kind, self.retry = status, kind, 0.0


def _sse(url, headers, body, put, stop):
    """İş parçacığında çalışır: isteği gönderir, gelen her SSE olayını put() ile döngüye aktarır."""
    req = urllib.request.Request(url, data=json.dumps(body).encode(), method="POST", headers={"content-type": "application/json", "accept": "text/event-stream", **headers})
    op = LOCAL if urllib.parse.urlparse(url).hostname in ("127.0.0.1", "localhost") else urllib.request.build_opener()
    try:
        r = op.open(req, timeout=120)
    except urllib.error.HTTPError as e:
        raw = e.read() or b"{}"
        try:
            j = json.loads(raw)
            j = j[0] if isinstance(j, list) and j else j
            err = j.get("error", j) if isinstance(j, dict) else {}
            err = err if isinstance(err, dict) else {"message": str(err)}
        except Exception:
            err = {"message": raw.decode("utf-8", "replace")[:300]}
        x = ApiErr(e.code, str(err.get("type") or err.get("status") or ""), str(err.get("message") or e))
        try:
            x.retry = float(e.headers.get("retry-after") or 0)
        except Exception:
            pass
        raise x
    with r:
        data = []
        for raw in r:
            if stop.is_set():
                return
            line = raw.decode("utf-8", "replace").rstrip("\r\n")
            if not line:
                if data and data != ["[DONE]"]:
                    put(json.loads("\n".join(data)))
                data = []
            elif line.startswith("data:"):
                data.append(line[5:].lstrip(" "))


async def sse_stream(url, headers, body):
    loop = asyncio.get_running_loop()
    q, stop, END = asyncio.Queue(), threading.Event(), object()
    put = lambda x: loop.call_soon_threadsafe(q.put_nowait, x)

    def run():
        try:
            _sse(url, headers, body, put, stop)
            put(END)
        except BaseException as e:  # hatayı döngüye taşı
            put(e)
    threading.Thread(target=run, daemon=True).start()
    try:
        while True:
            x = await q.get()
            if x is END:
                return
            if isinstance(x, BaseException):
                raise x
            yield x
    finally:
        stop.set()


def claude_stream(body):
    return sse_stream(API, {"x-api-key": api_key(), "anthropic-version": "2026-10-21", "anthropic-beta": BETAS}, body)


async def claude_turn(sess, rid, body):
    """Bir model turu: akışı canlı sohbete aktarır → (içerik blokları, stop_reason)."""
    for attempt in range(4):
        blocks, partial, stop, got = {}, {}, None, False
        try:
            async for ev in claude_stream(body):
                t, i = ev.get("type"), ev.get("index")
                if t in ("content_block_start", "content_block_delta"):
                    got = True
                if t == "content_block_start":
                    b = dict(ev["content_block"]); blocks[i] = b
                    if b.get("type") in ("tool_use", "server_tool_use"):
                        partial[i] = ""
                    if b.get("type") == "server_tool_use":
                        await sess.send(t="step", id=rid, sid=f"w{i}", label="İnternette aranıyor", state="run")
                elif t == "content_block_delta":
                    d, b = ev.get("delta", {}), blocks.get(i)
                    if b is None:
                        continue
                    k = d.get("type")
                    if k == "text_delta":
                        b["text"] = b.get("text", "") + d["text"]
                        await sess.send(t="delta", id=rid, text=d["text"])
                    elif k == "thinking_delta":
                        b["thinking"] = b.get("thinking", "") + d.get("thinking", "")
                        if d.get("thinking"):
                            await sess.send(t="note", id=rid, nid=i, text=b["thinking"])
                    elif k == "signature_delta":
                        b["signature"] = d["signature"]
                    elif k == "input_json_delta":
                        partial[i] = partial.get(i, "") + d.get("partial_json", "")
                    elif k == "citations_delta":
                        b.setdefault("citations", []).append(d["citation"])
                elif t == "content_block_stop" and i in partial:
                    s = partial.pop(i)
                    try:
                        blocks[i]["input"] = json.loads(s) if s.strip() else {}
                    except ValueError:
                        blocks[i]["input"] = {}; blocks[i]["_bad"] = s
                elif t == "message_delta":
                    stop = (ev.get("delta") or {}).get("stop_reason") or stop
                elif t == "error":
                    e = ev.get("error") or {}
                    raise ApiErr(529 if e.get("type") == "overloaded_error" else 500, e.get("type", ""), e.get("message", "akış hatası"))
            return [blocks[k] for k in sorted(blocks)], stop
        except (ApiErr, urllib.error.URLError, TimeoutError, ConnectionError) as e:
            st = getattr(e, "status", 0)
            if got or attempt == 3 or (isinstance(e, ApiErr) and st not in (408, 429, 500, 502, 503, 504, 529)):
                raise
            await asyncio.sleep(1.2 * 2 ** attempt)  # yoğunluk / bağlantı: biraz bekle, yeniden dene


async def mock_agent(sess, rid, text):
    if True:
        await sess.send(t="note", id=rid, text="Planlıyorum: önce sayfayı açıp sonra bakacağım.")
        await sess.send(t="step", id=rid, sid="s1", label="Sayfaya gidiliyor: example.com", state="run"); await asyncio.sleep(0.4)
        await sess.send(t="step", id=rid, sid="s1", label="Sayfaya gidiliyor: example.com", state="ok")
        if re.search(r"yorum|gönder", text):
            ok = await sess.ask(rid, "Yazıp gönderilsin mi?", "Alan: Yorum ekle\nMetin: Harika şarkı!")
            await sess.send(t="step", id=rid, sid="s2", label="Yazılıyor: Harika şarkı!", state="ok" if ok else "err")
        for w in "Tamam, sahte modda işi yaptım gibi davrandım. Gerçek modda bilgisayarında yapacağım.".split(" "):
            await sess.send(t="delta", id=rid, text=w + " "); await asyncio.sleep(0.03)
        return "ok"


async def agent(sess: Session, rid, text):
    if MOCK and not os.environ.get("JARVIS_API_URL"):
        return await mock_agent(sess, rid, text)
    if sess.hprov != "claude":
        sess.hist, sess.hprov = [], "claude"
    if not api_key():
        await sess.send(t="error", id=rid, msg="Claude anahtarı yok. Jarvis ekranındaki Ayarlar'dan ekle.")
        return "err"
    if time.time() - sess.last > 30 * 60 or len(sess.hist) > 80:
        sess.hist = []  # uzun ara ya da çok uzun sohbet: temiz başla
    sess.last = time.time()
    sess.n0 = len(sess.hist)
    sess.hist.append({"role": "user", "content": [{"type": "text", "text": context_note() + "\n" + text}]})
    for _turn in range(40):
        body = {"model": MODEL, "max_tokens": 16000, "system": SYSTEM, "tools": TOOLS, "messages": sess.hist, "stream": True,
                "thinking": {"type": "adaptive", "display": "updates"}, "output_config": {"effort": cfg.get("effort", "low")},
                "fallbacks": "default", "cache_control": {"type": "ephemeral"}}
        if cfg.get("fast"):
            body["speed"] = "fast"
        content, stop = await claude_turn(sess, rid, body)
        # yedek modele geçildiyse: son 'fallback' bloğundan önceki düşünme/araç bloklarını geri gönderme
        fb = max((n for n, b in enumerate(content) if b.get("type") == "fallback"), default=-1)
        if fb > 0:
            done_ids = {b.get("tool_use_id") for b in content if str(b.get("type", "")).endswith("_tool_result")}
            content = [b for n, b in enumerate(content) if n >= fb or not (b.get("type") in ("thinking", "redacted_thinking", "tool_use")
                       or (b.get("type") == "server_tool_use" and b.get("id") not in done_ids))]
        bad = {b["id"]: b.pop("_bad") for b in content if "_bad" in b}
        for b in content:
            if b.get("type") == "web_search_tool_result":
                await sess.send(t="step", id=rid, sid="w", label="İnternette arandı", state="ok")
        if stop == "refusal":
            await sess.send(t="error", id=rid, msg="Bu isteği yapamam.")
            return "refusal"
        if content:
            sess.hist.append({"role": "assistant", "content": content})
        if stop == "pause_turn":
            continue
        uses = [b for b in content if b.get("type") == "tool_use"]
        if not uses:
            return "ok"
        if stop == "max_tokens":
            await sess.send(t="error", id=rid, msg="Yanıt yarıda kesildi.")
            return "err"
        results = []
        for u in uses:  # sırayla: bilgisayar/tarayıcı işleri birbirine bağlı
            a = u.get("input") if isinstance(u.get("input"), dict) else {}
            lbl = step_label(u["name"], a)
            if u["id"] in bad:
                results.append({"type": "tool_result", "tool_use_id": u["id"], "is_error": True, "content": json.dumps({"INVALID_JSON": bad[u["id"]]}, ensure_ascii=False)})
                continue
            await sess.send(t="step", id=rid, sid=u["id"], label=lbl, state="run")
            try:
                check_input(u["name"], a)
                out = await run_tool(sess, rid, u["name"], a)
                results.append({"type": "tool_result", "tool_use_id": u["id"], "content": out})
                await sess.send(t="step", id=rid, sid=u["id"], label=lbl, state="ok")
            except asyncio.CancelledError:
                raise
            except Exception as e:
                results.append({"type": "tool_result", "tool_use_id": u["id"], "is_error": True, "content": f"Hata: {e}"[:1500]})
                await sess.send(t="step", id=rid, sid=u["id"], label=lbl + f" — olmadı: {str(e)[:80]}", state="err")
        sess.hist.append({"role": "user", "content": results})
    return "ok"


# ───────────────────────── ÜCRETSİZ SAĞLAYICILAR (Gemini · Groq · OpenRouter) ─────────────────────────
SYSTEM_FREE = SYSTEM + """

Önemli: Bir işi yapmak için araçları GERÇEKTEN çağır; "açıyorum" deyip durma. İş bitince kısa söyle.
web_search ücretsiz arama yapar (DuckDuckGo); sonuç yetmezse browser_go ile sayfayı aç."""
OA_TOOLS = [{"type": "function", "function": {"name": t["name"], "description": t["description"],
             **({"parameters": t["input_schema"]} if t["input_schema"]["properties"] else {})}} for t in TOOLS if "input_schema" in t]
OA_TOOLS.append({"type": "function", "function": {"name": "web_search", "description": "İnternette ara (güncel bilgi, haber, fiyat, tarih…). Başlık, adres ve özet döndürür.",
                                                  "parameters": {"type": "object", "properties": {"query": {"type": "string"}}, "required": ["query"]}}})
SCHEMA["web_search"] = {"type": "object", "properties": {"query": {"type": "string"}}, "required": ["query"]}
MODELS, BADM = {}, {}  # sağlayıcı → (zaman, sıralı modeller) · model → kotası bitti (zaman)


def oa_base(p):
    return os.environ.get("JARVIS_OA_URL") or FREE[p]["url"]


def rank_models(p, ids):
    ids = [i.split("/", 1)[1] if p == "gemini" and i.startswith("models/") else i for i in ids]
    if p == "gemini":
        sc = []
        for i in ids:
            m = re.match(r"^gemini-(\d+(?:\.\d+)?)-flash(-lite)?(-preview[\w.-]*|-latest|-\d{3})?$", i)
            if m and not re.search(r"image|tts|live|audio|exp", i):
                sc.append((float(m.group(1)), (0 if m.group(2) else 1), (0 if m.group(3) else 1), i))  # yeni sürüm > tam model > kararlı
        return [x[-1] for x in sorted(sc, reverse=True)] or ["gemini-2.5-flash", "gemini-2.5-flash-lite"]
    if p == "groq":
        pref = ["openai/gpt-oss-120b", "moonshotai/kimi-k2-instruct-0905", "moonshotai/kimi-k2-instruct", "llama-3.3-70b-versatile", "openai/gpt-oss-20b"]
        have = [m for m in pref if m in ids]
        return have or pref
    return ["openrouter/free"]


def _models_http(p, key):
    req = urllib.request.Request(oa_base(p) + "models", headers={"authorization": f"Bearer {key}"})
    op = LOCAL if urllib.parse.urlparse(req.full_url).hostname in ("127.0.0.1", "localhost") else urllib.request.build_opener()
    with op.open(req, timeout=8) as r:
        return [m.get("id", "") for m in json.loads(r.read()).get("data", [])]


async def model_list(p, key):
    at, L = MODELS.get(p, (0, None))
    if not L or time.time() - at > 6 * 3600:
        try:
            ids = await asyncio.get_running_loop().run_in_executor(None, _models_http, p, key)
        except urllib.error.HTTPError as e:
            if e.code in (400, 401, 403):
                raise ApiErr(401, "auth", "anahtar geçersiz")
            ids = []
        except Exception:
            ids = []
        L = rank_models(p, ids); MODELS[p] = (time.time(), L)
    return [m for m in L if time.time() - BADM.get(m, 0) > 3 * 3600]


def ddg(q):
    """Ücretsiz web araması (DuckDuckGo HTML sayfası; anahtar gerekmez)."""
    req = urllib.request.Request("https://html.duckduckgo.com/html/", data=urllib.parse.urlencode({"q": q, "kl": "tr-tr"}).encode(), headers={
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
        "content-type": "application/x-www-form-urlencoded"})
    try:
        h = urllib.request.urlopen(req, timeout=12).read().decode("utf-8", "replace")
    except Exception as e:
        return f"Arama yapılamadı ({e}). browser_go ile https://www.google.com/search?q={urllib.parse.quote(q)} adresini açıp bak."
    clean = lambda x: htmlmod.unescape(re.sub(r"<[^>]+>", "", x)).strip()
    out = []
    for m in re.finditer(r'class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)</a>.*?class="result__snippet"[^>]*>(.*?)</a>', h, re.S):
        u = htmlmod.unescape(m.group(1))
        u = (urllib.parse.parse_qs(urllib.parse.urlparse(u).query).get("uddg") or [u])[0]
        out.append(f"{clean(m.group(2))}\n{u}\n{clean(m.group(3))}")
        if len(out) >= 6:
            break
    return "\n\n".join(out) or "Sonuç bulunamadı. browser_go ile https://www.google.com/search?q=… adresini açıp bakabilirsin."


async def oa_once(sess, rid, p, model, msgs):
    """Bir model turu (akış) → (yazı, araç çağrıları, bitiş sebebi)."""
    body = {"model": model, "messages": msgs, "tools": OA_TOOLS, "stream": True, "max_tokens": 4096}
    ef = {"xhigh": "high"}.get(cfg.get("effort", "low"), cfg.get("effort", "low"))
    if p == "gemini" or "gpt-oss" in model:
        body["reasoning_effort"] = ef
    text, calls, fin, reas, got = "", {}, None, "", False
    try:
        async for ev in sse_stream(oa_base(p) + "chat/completions", {"authorization": f"Bearer {key_of(p)}"}, body):
            if ev.get("error"):
                e = ev["error"]; raise ApiErr(int(e.get("code") or 500) if str(e.get("code", "")).isdigit() else 500, "", e.get("message", "akış hatası"))
            for ch in ev.get("choices") or []:
                d = ch.get("delta") or {}
                r = d.get("reasoning") or d.get("reasoning_content")
                if r:
                    reas += r; got = True
                    await sess.send(t="note", id=rid, nid="r", text=reas[-700:])
                if d.get("content"):
                    text += d["content"]; got = True
                    await sess.send(t="delta", id=rid, text=d["content"])
                for tc in d.get("tool_calls") or []:
                    got = True
                    c = calls.setdefault(tc.get("index", len(calls)), {"id": "", "type": "function", "function": {"name": "", "arguments": ""}})
                    if tc.get("id"):
                        c["id"] = tc["id"]
                    f = tc.get("function") or {}
                    if f.get("name") and not c["function"]["name"]:
                        c["function"]["name"] = f["name"]
                    if f.get("arguments"):
                        c["function"]["arguments"] += f["arguments"] if isinstance(f["arguments"], str) else json.dumps(f["arguments"])
                    for k, v in tc.items():  # Gemini'nin düşünce imzası (extra_content) aynen geri gönderilmeli
                        if k not in ("index", "id", "type", "function"):
                            c[k] = v
                if ch.get("finish_reason"):
                    fin = ch["finish_reason"]
    except ApiErr as e:
        e.got = got
        raise
    L = [calls[k] for k in sorted(calls)]
    for n, c in enumerate(L):
        c["id"] = c["id"] or f"call_{secrets.token_hex(4)}_{n}"
    return text, L, fin


async def oa_turn(sess, rid, p, msgs):
    key = key_of(p)
    for attempt in range(8):
        models = await model_list(p, key)
        if not models:
            raise ApiErr(429, "quota", "ücretsiz günlük kota bitti")
        model = models[0]
        sess.model = model
        try:
            return await oa_once(sess, rid, p, model, msgs)
        except ApiErr as e:
            msg = str(e)
            if getattr(e, "got", False) or e.status == 401:
                raise
            if e.status == 404 or (e.status in (400, 403) and re.search(r"model|not found|not supported|does not exist|decommission", msg, re.I)):
                BADM[model] = time.time(); continue  # bu model yok/ücretsiz değil → sıradaki
            if e.status == 429:
                w = e.retry or float((re.search(r"(?:retry in|try again in)\s*([\d.]+)\s*s", msg, re.I) or [0, 0])[1] or 0)
                if re.search(r"limit:\s*0\b|per ?day|PerDay|daily|TPD|RPD", msg) or w > 40:
                    BADM[model] = time.time(); continue  # bu modelin ücretsiz kotası bitti → başka model
                w = min(max(w, 3.0), 40.0)
                await sess.send(t="step", id=rid, sid=f"q{attempt}", label=f"Ücretsiz sınır doldu, {int(w)} sn bekleniyor", state="run")
                await asyncio.sleep(w)
                await sess.send(t="step", id=rid, sid=f"q{attempt}", label="Devam ediliyor", state="ok")
                continue
            if e.status >= 500:
                await asyncio.sleep(1.5 * (attempt + 1)); continue
            raise
        except (urllib.error.URLError, TimeoutError, ConnectionError):
            if attempt >= 2:
                raise
            await asyncio.sleep(1.5)
    raise ApiErr(429, "quota", "ücretsiz kullanım sınırı doldu")


def oa_trim_images(hist, keep=2):
    """Eski ekran görüntülerini geçmişten çıkar (her istekte yeniden gönderilmesin)."""
    idx = [i for i, m in enumerate(hist) if isinstance(m.get("content"), list) and any(c.get("type") == "image_url" for c in m["content"])]
    for i in idx[:-keep]:
        hist[i] = {"role": "user", "content": "(eski ekran görüntüsü)"}


async def oa_agent(sess: Session, rid, text, p):
    if MOCK and not os.environ.get("JARVIS_OA_URL"):
        return await mock_agent(sess, rid, text)
    if not key_of(p):
        await sess.send(t="error", id=rid, msg=f"{PNAME[p]} anahtarı yok. Jarvis ekranındaki Ayarlar'dan ücretsiz anahtar ekle.")
        return "err"
    if sess.hprov != p or time.time() - sess.last > 30 * 60 or len(sess.hist) > 80:
        sess.hist, sess.hprov = [], p
        sess.n0 = 0
    sess.last = time.time()
    sess.hist.append({"role": "user", "content": context_note() + "\n" + text})
    vision = FREE[p]["vision"]
    for _turn in range(40):
        oa_trim_images(sess.hist)
        said, calls, fin = await oa_turn(sess, rid, p, [{"role": "system", "content": SYSTEM_FREE}] + sess.hist)
        msg = {"role": "assistant"}
        if said:
            msg["content"] = said
        if calls:
            msg["tool_calls"] = calls
        if not said and not calls:
            msg["content"] = "…"
        sess.hist.append(msg)
        if not calls:
            return "ok"
        if fin == "length":
            await sess.send(t="error", id=rid, msg="Yanıt yarıda kesildi.")
            return "err"
        imgs = []
        for c in calls:
            name = c["function"]["name"]
            res = {"role": "tool", "tool_call_id": c["id"]}
            if p == "gemini":
                res["name"] = name
            try:
                a = json.loads(c["function"]["arguments"] or "{}")
            except ValueError:
                sess.hist.append({**res, "content": json.dumps({"INVALID_JSON": c["function"]["arguments"]}, ensure_ascii=False)})
                continue
            a = a if isinstance(a, dict) else {}
            lbl = step_label(name, a) if name != "web_search" else f"İnternette aranıyor: {str(a.get('query', ''))[:60]}"
            await sess.send(t="step", id=rid, sid=c["id"], label=lbl, state="run")
            try:
                check_input(name, a)
                if name == "web_search":
                    out = await asyncio.get_running_loop().run_in_executor(None, ddg, a["query"])
                else:
                    out = await run_tool(sess, rid, name, a)
                if isinstance(out, list):  # ekran görüntüsü
                    if vision:
                        imgs.append(out[0]["source"]); out = "Ekran görüntüsü alındı, aşağıda."
                    else:
                        out = f"{PNAME[p]} ekranı göremiyor. Masaüstü yerine tarayıcı araçlarını (browser_*) ya da open_target/press_keys kullan."
                sess.hist.append({**res, "content": str(out)[:12000]})
                await sess.send(t="step", id=rid, sid=c["id"], label=lbl, state="ok")
            except asyncio.CancelledError:
                raise
            except Exception as e:
                sess.hist.append({**res, "content": f"Hata: {e}"[:1500]})
                await sess.send(t="step", id=rid, sid=c["id"], label=lbl + f" — olmadı: {str(e)[:80]}", state="err")
        for src in imgs:
            sess.hist.append({"role": "user", "content": [{"type": "text", "text": "Ekran görüntüsü (click koordinatları bu görüntüye göre):"},
                                                          {"type": "image_url", "image_url": {"url": f"data:{src['media_type']};base64,{src['data']}"}}]})
    return "ok"



async def handle_say(sess: Session, rid, text):
    t0 = time.perf_counter()
    sess.n0 = len(sess.hist)
    try:
        q = await asyncio.get_running_loop().run_in_executor(None, quick, text)
        if q:
            await sess.send(t="quick", id=rid, text=q, ms=int((time.perf_counter() - t0) * 1000))
            log(f"hızlı ({int((time.perf_counter() - t0) * 1000)} ms):", text, "→", q)
            sess.hist.append({"role": "user", "content": f"{context_note()}\n{text}\n[Bu komut hızlı yoldan yapıldı: {q}]"})
            sess.hist.append({"role": "assistant", "content": q})
            return
        p = prov()
        log(f"ajan ({PNAME[p]}):", text)
        r = await (agent(sess, rid, text) if p == "claude" else oa_agent(sess, rid, text, p))
        if r != "ok":
            del sess.hist[sess.n0:]  # yarım kalan tur: geçmiş tutarlı kalsın
        await sess.send(t="done", id=rid, r=r)
    except asyncio.CancelledError:
        del sess.hist[sess.n0:]
        await sess.send(t="done", id=rid, r="stopped")
        raise
    except Exception as e:
        del sess.hist[sess.n0:]
        msg = str(e)
        if isinstance(e, ApiErr):
            n = PNAME[prov()]
            msg = {401: f"{n} anahtarı geçersiz. Ayarlar'dan yeniden gir.", 403: f"{n} anahtarının bu modele izni yok.",
                   429: f"{n} ücretsiz kullanım sınırı doldu; biraz sonra tekrar dene ya da Ayarlar'dan başka ücretsiz sağlayıcı seç."
                   if prov() != "claude" else "Çok sık istek; birkaç saniye sonra tekrar dene.",
                   529: f"{n} şu an çok yoğun; biraz sonra tekrar dene."}.get(e.status, f"{n} hatası ({e.status}): {e}")
            if e.status == 400 and re.search(r"credit|balance", str(e), re.I):
                msg = "Anthropic hesabında kredi kalmamış."
        elif isinstance(e, (urllib.error.URLError, ConnectionError, TimeoutError)):
            msg = "İnternete ya da Claude'a bağlanılamadı."
        log("HATA:", repr(e))
        await sess.send(t="error", id=rid, msg=msg[:300])
        await sess.send(t="done", id=rid, r="err")


# ───────────────────────── sunucu ─────────────────────────
async def send_ready(sess):
    p = prov()
    await sess.send(t="ready", provider=p, has_key=bool(key_of(p)), keys={k: bool(key_of(k)) for k in PROVS}, model=sess.model,
                    effort=cfg["effort"], fast=cfg["fast"], os=OS, mock=MOCK, v=VERSION)


async def handler(ws):
    sess = Session(ws)
    SESS.add(sess)
    authed = False
    await sess.send(t="hello", name="JARVIS", os=OS, mock=MOCK, v=VERSION)
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
            await send_ready(sess)
            continue
        if k == "say":
            if sess.task and not sess.task.done():
                sess.task.cancel()
                try:
                    await sess.task
                except BaseException:
                    pass
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
            if m.get("provider") in PROVS:
                cfg["provider"] = m["provider"]
            kp = m.get("kp") if m.get("kp") in PROVS else prov()
            kv = m.get("key").strip() if isinstance(m.get("key"), str) else ""
            if kv and kp == "claude" and kv.startswith("sk-"):
                cfg["api_key"] = kv
            elif kv and kp != "claude" and 10 < len(kv) < 300:
                cfg["keys"][kp] = kv; MODELS.pop(kp, None)
            if m.get("effort") in ("low", "medium", "high", "xhigh"):
                cfg["effort"] = m["effort"]
            if "fast" in m:
                cfg["fast"] = bool(m["fast"])
            save_cfg()
            await send_ready(sess)
        elif k == "new":
            sess.hist = []
        elif k == "update":
            v = await try_update(force=bool(m.get("now")))
            await sess.send(t="upd", v=v or "", cur=VERSION)
    SESS.discard(sess)
    if sess.task and not sess.task.done():
        sess.task.cancel()


def ui_html():
    """http://127.0.0.1:8765 açılırsa Jarvis ekranı (AppShell'e erişilemezse yedek yol)."""
    for p in (ROOT / "ui.html", ROOT.parent / "apps" / "jarvis" / "index.html"):
        if p.exists():
            return p.read_bytes()
    return f'<meta charset=utf-8><meta http-equiv=refresh content="0;url={HUB}apps/jarvis/"><p>Jarvis çalışıyor.</p>'.encode()


async def on_conn(r, w):
    try:
        head = await asyncio.wait_for(r.readuntil(b"\r\n\r\n"), 10)
        lines = head.decode("latin-1").split("\r\n")
        H = {k.strip().lower(): v.strip() for k, _, v in (ln.partition(":") for ln in lines[1:] if ":" in ln)}
        if H.get("upgrade", "").lower() == "websocket":
            if H.get("origin") not in ORIGINS or "sec-websocket-key" not in H:
                w.write(b"HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\nConnection: close\r\n\r\n"); await w.drain(); return
            acc = base64.b64encode(hashlib.sha1((H["sec-websocket-key"] + WS_GUID).encode()).digest()).decode()
            w.write(f"HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: {acc}\r\n\r\n".encode())
            await w.drain()
            await handler(WsConn(r, w))
        else:
            body = ui_html()
            w.write(f"HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nCache-Control: no-store\r\nContent-Length: {len(body)}\r\nConnection: close\r\n\r\n".encode() + body)
            await w.drain()
    except Exception:
        pass
    finally:
        try:
            w.close()
        except Exception:
            pass


def fetch_update():
    """Sitede daha yeni Jarvis varsa indirip yazar → yeni sürüm adı; yoksa None. (Git klasöründe / sahte modda çalışmaz.)"""
    if MOCK or (ROOT.parent / ".git").exists():
        return None
    try:
        t = int(time.time())
        src = urllib.request.urlopen(f"{HUB}jarvis/jarvis.py?t={t}", timeout=6).read()  # ?t= → önbellekteki eski kopya gelmesin
        m = re.search(rb'^VERSION = "([^"]+)"', src, re.M)
        if not m or m.group(1).decode() <= VERSION:
            return None
        compile(src, "jarvis.py", "exec")  # bozuk dosya yazılmasın
        (ROOT / "jarvis.py").write_bytes(src)
        try:
            (ROOT / "ui.html").write_bytes(urllib.request.urlopen(f"{HUB}apps/jarvis/index.html?t={t}", timeout=6).read())
        except Exception:
            pass
        return m.group(1).decode()
    except Exception:
        return None


def restart():
    """Yeni sürümle yeniden başla (aynı pencerede); eski süreç kapanır, yenisi kapı boşalınca açılır."""
    args = [a for a in sys.argv[1:] if a not in ("--guncelleme-yok", "--bekle")]
    subprocess.Popen([sys.executable, str(ROOT / "jarvis.py"), "--guncelleme-yok", "--bekle"] + args, cwd=str(ROOT))
    os._exit(0)


def self_update():
    """Açılışta: yeni sürüm varsa indir ve onunla başla."""
    if "--guncelleme-yok" in sys.argv:
        return
    v = fetch_update()
    if v:
        print(f"  Jarvis güncellendi → {v}\n", flush=True)
        restart()


SESS = set()


async def try_update(force=False):
    """Çalışırken güncelleme: iş yokken yeni sürüme geç (bağlı ekranlara haber verir, onlar kendiliğinden yeniden bağlanır)."""
    if any(s.task and not s.task.done() for s in SESS) and not force:
        return None
    v = await asyncio.get_running_loop().run_in_executor(None, fetch_update)
    if v:
        log(f"Yeni sürüm ({v}) indirildi, yeniden başlıyor…")
        for s in list(SESS):
            await s.send(t="updating", v=v)
        await asyncio.sleep(0.3)
        restart()
    return v


async def update_loop():
    while True:
        await asyncio.sleep(20 * 60)
        await try_update()


async def main():
    for i in range(60 if "--bekle" in sys.argv else 1):  # güncellemeden sonra: eski süreç kapıyı bırakana kadar bekle
        try:
            srv = await asyncio.start_server(on_conn, "127.0.0.1", PORT); break
        except OSError:
            if i == (59 if "--bekle" in sys.argv else 0):
                raise
            await asyncio.sleep(0.25)
    asyncio.create_task(update_loop())
    print("\n  ╭──────────────────────────────╮\n  │   J A R V I S   hazır        │\n  ╰──────────────────────────────╯")
    print(f"  Eşleştirme kodu: {cfg['pair']}   (AppShell → Jarvis'te bir kez gir)")
    print(f"  Yapay zekâ: {PNAME[prov()]} · anahtar {'var ✓' if key_of(prov()) else 'yok — Jarvis ekranındaki Ayarlar’dan ekle (Gemini ücretsiz)'}")
    print(f"  Mod: {'SAHTE (hiçbir şey yapılmaz)' if MOCK else 'gerçek'} · {OS} · sürüm {VERSION}")
    print("  Bu pencereyi kapatma; Jarvis bu çalıştıkça çalışır. Durdurmak: pencereyi kapat ya da Ctrl+C\n", flush=True)
    async with srv:
        await srv.serve_forever()


if __name__ == "__main__":
    if "--hizli-test" in sys.argv:  # hızlı yol eşleşmelerini dene (hiçbir şey açmaz)
        MOCK = True
        for c in sys.argv[sys.argv.index("--hizli-test") + 1:]:
            print(f"{c!r:45} → {quick(c)}")
        sys.exit()
    self_update()
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nJarvis kapandı.")
    except OSError as e:
        if getattr(e, "errno", None) in (98, 10048, 48) or getattr(e, "winerror", None) == 10048:  # adres kullanımda
            print(f"\n  Jarvis zaten çalışıyor (port {PORT} dolu). Açık olan Jarvis penceresini kullan ya da onu kapatıp yeniden başlat.")
            if WIN:
                input("  Kapatmak için Enter… ")
        else:
            raise
