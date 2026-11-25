# Jarvis kurulumu — ek paket yok, .bat yok (Windows Akıllı Uygulama Denetimi açıkken de çalışır).
# Windows: Win+R'ye bas, şunu yapıştır, Enter:
#   py -c "import urllib.request as u;exec(u.urlopen('https://batulekesiz28-dot.github.io/apps/jarvis/kur.py').read())"
# Ne yapar: jarvis.py'yi ve ekranını kullanıcı klasöründeki Jarvis klasörüne indirir, masaüstüne "Jarvis" kısayolu koyar, Jarvis'i başlatır.
import os, pathlib, subprocess, sys, urllib.request

H = "https://batulekesiz28-dot.github.io/apps/"
D = pathlib.Path.home() / "Jarvis"
D.mkdir(exist_ok=True)
print(f"\n  Jarvis indiriliyor → {D}")
for src, dst in (("jarvis/jarvis.py", "jarvis.py"), ("apps/jarvis/index.html", "ui.html")):
    data = urllib.request.urlopen(H + src, timeout=30).read()
    if dst.endswith(".py"):
        compile(data, dst, "exec")  # yarım inmiş dosya yazılmasın
    (D / dst).write_bytes(data)

if os.name == "nt":
    # Masaüstü kısayolu: bu bilgisayarda oluşturulan dosya internetten gelmiş sayılmaz, Akıllı Uygulama Denetimi engellemez.
    try:
        import ctypes
        buf = ctypes.create_unicode_buffer(260)
        ctypes.windll.shell32.SHGetFolderPathW(None, 0x10, None, 0, buf)  # masaüstü (OneDrive'a taşınmış olsa da)
        desk = pathlib.Path(buf.value or pathlib.Path.home() / "Desktop")
        exe = sys.executable  # kullanıcı adında Türkçe harf olabilir → yolları değişkenle yaz
        for var in ("LOCALAPPDATA", "USERPROFILE"):
            v = os.environ.get(var, "")
            if v and exe.lower().startswith(v.lower()):
                exe = f"%{var}%" + exe[len(v):]; break
        (desk / "Jarvis.cmd").write_bytes(f'@echo off\r\nchcp 65001 >nul\r\ntitle Jarvis\r\ncd /d "%USERPROFILE%\\Jarvis"\r\n"{exe}" jarvis.py\r\nif errorlevel 1 pause\r\n'.encode("utf-8"))
        print("  Masaüstüne “Jarvis” kısayolu kondu. Sonraki seferlerde ona çift tıkla.")
    except Exception as e:
        print("  (Masaüstü kısayolu konamadı:", e, ")")

print("  Başlatılıyor…\n", flush=True)
sys.exit(subprocess.call([sys.executable, str(D / "jarvis.py"), "--guncelleme-yok"], cwd=str(D)))
