# AGENTS.md — bu repoda çalışan her yapay zekâ için (ChatGPT/Codex, Claude…)

Tek kural kaynağı **`CLAUDE.md`**. İşe başlamadan önce onu baştan sona oku ve aynen uygula
(dosya adı Claude diyor ama kurallar herkes için). Tasarım standardı: `docs/STANDART.md` — özellikle sondaki
“Tasarım anlayışı — kesin kural” bölümü her şeyin önündedir.

Kısaca:
- Sıfırdan yazma; var olan koda ekle/düzelt. Büyük dosyalarda (`index.html`) sadece ilgili bölümü değiştir.
- Kullanıcıyla Türkçe, kısa ve samimi konuş; bitince “Ctrl+Shift+R ile yenile” de.
- Değişiklikten sonra denetim: `python3 -m http.server 8766` + `python3 audit/run.py <slug>`; hataları düzelt,
  `audit/log.json`'a Türkçe kayıt ekle. Haritada yeni bir şey varsa `CLAUDE.md`'yi de güncelle.
- API anahtarı asla HTML'e/tarayıcıya/repoya konmaz (sadece `apps/arena/server/.env`, gitignore'da).
- Site GitHub Pages ile `main` dalından yayınlanır. Pull request açtıysan kullanıcıya “birleştirince yayına girer” de.

## Codex ortam kurulumu (setup script)
```
pip install playwright && python3 -m playwright install --with-deps chromium
```

## Birden fazla yapay zekâ aynı repoda
- İşe başlamadan önce en son `main`'i al (`git pull`); başka bir ajanın yaptığını bozma, geri alma.
- Aynı anda aynı dosyada iki ajan çalışmasın; birinin işi birleşmeden diğerine o dosyada iş verme.
