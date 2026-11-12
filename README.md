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

## Taslaklar

Sayfaya sürüklenen ya da `+` ile eklenen HTML'ler yalnızca o tarayıcının IndexedDB'sinde durur. Denemek içindir. Kalıcı ve her cihazdan erişilebilir olması için sağ tık → **Yayına hazırla**.

Taslaklar sandbox'ta çalışır (launcher verisine erişemez, `localStorage` kullanamaz). Yayındaki uygulamalar normal sayfa gibi çalışır.

## Yerelde denemek

`index.html`'e çift tıklamak `apps.json`'u okuyamaz. Bunun yerine:

```
python3 -m http.server
```
→ http://localhost:8000
