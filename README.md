# AppShell

Kişisel HTML uygulama hub'ı. GitHub Pages üzerinde çalışır.

## Yapı

```
index.html            ← launcher (dokunma, sadece tasarım değişince)
apps.json             ← yayındaki uygulamaların listesi
apps/<slug>/index.html← her uygulama kendi klasöründe
.nojekyll
```

## Yeni uygulama yayınlamak

1. `apps/<slug>/index.html` dosyasını ekle (görseller vb. aynı klasöre).
2. `apps.json` → `"apps"` listesine bir satır ekle:

```json
{ "slug": "not-defteri", "name": "Not Defteri", "icon": "note", "color": "amber", "desc": "Kısa açıklama" }
```

3. Commit & push.

Başka bir yerde yayında olan bir projeyi bağlamak için `"url"` ver:

```json
{ "slug": "sat-bank", "name": "SAT Bank", "icon": "book", "color": "blue", "url": "https://…" }
```

**İkonlar:** grid, chart, book, note, music, code, globe, cube, bolt, calc, image, chat, clock, pen, cart, map, spark (boş bırakılırsa baş harfler)
**Renkler:** ink, gray, blue, green, amber, rose, violet, teal

## Giriş ve taslaklar

Site açılınca Google girişi ister; yalnızca `batulekesiz28@gmail.com` girebilir (Firebase projesi `apps-f1cfd`).

Sayfaya sürüklenen ya da `+` ile eklenen HTML'ler Firestore'da (`hub/meta/drafts`) tutulur ve her cihazda anında görünür. Sınır: taslak başına ~900 KB. Firestore kuralı yalnızca bu e-postaya okuma/yazma izni verir.

Not: `apps/` altındaki yayınlanmış dosyalar repo public olduğu sürece doğrudan URL ile açılabilir. Gizli kalması gerekenler taslak olarak durmalı.

Taslaklar sandbox'ta çalışır (launcher verisine erişemez, `localStorage` kullanamaz). Yayındaki uygulamalar normal sayfa gibi çalışır.

## Tuval ve widget'lar

Tuval sonsuz. Boş alanı sürükleyerek gezinilir, bırakınca kaymaya devam eder. Trackpad'de iki parmakla kaydırılır.

Yakınlaştırma yolları:
- `⌘`/`Ctrl` + tekerlek
- trackpad'de sıkıştırma
- telefonda iki parmak
- `+` / `−` tuşları
- sağ alttaki çubuk

`1` her şeyi ekrana sığdırır, `0` görünümü %100'e döndürür. Kamera konumu her cihazda ayrı saklanır.

Widget'lar `+ → Widget ekle` ya da `W` ile eklenir:
- Saat
- Hava durumu (Open-Meteo, şehir değiştirilebilir)
- Döviz (ECB / Frankfurter, günlük)
- Hızlı not
- Bugün (Notlar'daki o güne ait sayfalar ve açık yapılacaklar)
- Odak sayacı
- Mini takvim

Konumlar, notlar ve şehir `hub/meta.widgets` içinde saklanır ve senkronlanır. Uygulama konumları dünya koordinatı olarak `hub/meta.pos` içinde tutulur. Eski `layout` alanı otomatik olarak çevrilir.

## Yerelde denemek

`index.html`'e çift tıklamak `apps.json`'u okuyamaz ve girişsiz, tarayıcıya kayıtlı modda çalışır. Bunun yerine:

```
python3 -m http.server
```
→ http://localhost:8000
