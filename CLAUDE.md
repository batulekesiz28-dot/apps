# AppShell — çalışma kuralları (Claude için)

Bu repo kullanıcının kişisel hub'ı (GitHub Pages). Uygulamalar `apps/<slug>/index.html`, liste `apps.json`.

## Denetçi kuralı — her değişiklikten önce
Kullanıcı, yaptığım her işin kendi gözünden denetlenmesini istiyor. Her değişiklikte:

1. Yerel sunucuyu aç: `python3 -m http.server 8766` (repo kökünde).
2. `python3 audit/run.py` (ya da `python3 audit/run.py <slug>`) çalıştır. Telefon (390px) ve bilgisayar (1366px) boyutunda tarar.
3. **hata** seviyesindekileri mutlaka düzelt; **uyarı**ları mümkünse düzelt; bilerek bırakılanları açık konu olarak yaz.
4. `audit/log.json` dizisine bir kayıt ekle: `{at, change, scores:{"<app> telefon":{before,after}}, items:[{app, sev, status:"fixed"|"open", text, fix?}]}`.
   Metinler Türkçe, kısa ve kullanıcının anlayacağı dilde.
5. Sonra commit + push.

Denetim motoru: `audit/engine.js` (hub'daki Denetçi uygulaması da aynısını kullanır).
Yazı/renk ölçüleri: metin için en az 12px (telefon), dokunma alanı ≥ 24px (telefonda ≥ 40px), kontrast ≥ 4.5:1.
