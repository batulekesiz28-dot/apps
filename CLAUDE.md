# AppShell — çalışma kuralları (Claude için)

Bu repo kullanıcının kişisel hub'ı (GitHub Pages). Canlı adres: https://batulekesiz28-dot.github.io/apps/
Uygulamalar `apps/<slug>/index.html`, liste `apps.json`.

## ⚠️ ÖNCE BUNU OKU — devralma kuralı
Bu proje uzun bir çalışmanın ürünü ve **çalışıyor**. Sen onu devralıyorsun.
- **Asla sıfırdan yazma.** Yeni dosya/uygulama kurmadan önce var olanı oku (`git log --oneline -20`, ilgili dosya).
  İstenen şey büyük olsa bile mevcut koda **ekle / düzelt**; hiçbir dosyayı baştan yazma, yeniden adlandırma ya da silme.
- Bir dosya çok büyük (hub `index.html` ~2500 satır): tamamını okuma; `grep -n` ile ilgili fonksiyonu bul, sadece o bölümü değiştir.
- Kullanıcıya soru sorarak durma; en makul yorumu seç, yap, sonunda ne seçtiğini bir cümleyle söyle.
- Kullanıcıyla Türkçe, kısa ve samimi konuş. Teknik ayrıntı yerine “ne değişti, nereden görürsün” anlat. Bitince “Ctrl+Shift+R ile yenile” de.
- Değişikliği yerelde gerçekten dene (Playwright/Chrome ile ekran görüntüsü al), sonra Denetçi kuralını uygula.

## Kalite standardı (kullanıcının ana talimatı) — `docs/STANDART.md`
Her işte bu dosyadaki standarda uy. Özet:
- Yeni bir şeye başlamadan önce o alanın 3–5 lider ürününü gerçekten araştır; neyin neden iyi olduğunu kısaca söyle. Kopyalama, en iyilerini birleştirip özgün yap.
- “Sadece çalışan” yetmez: tutarlı boşluk sistemi, net hiyerarşi, kaliteli tipografi, tutarlı köşe yarıçapı, gereksiz kutu/çizgi yok, her şeyi karta koyma.
- Akıcı ama yormayan animasyon: transform/opacity, 60 FPS, `prefers-reduced-motion` + kullanıcının animasyon ayarı (`appshell:motion`).
- Boş, yükleniyor, hata, başarı durumlarını; tooltip, sağ tık, klavye kısayolu, focus/hover durumlarını da tasarla.
- Teslimden önce gerçek kullanım akışlarını test et (butonlar, menüler, temalar, veri korunuyor mu, konsol hatası var mı).

## Projenin haritası (ne nerede)
- `index.html` — **hub** (galaksi masaüstü). Tek dosya: CSS + JS. Önemli bölümler (`grep` ile bul):
  - Kamera/ızgara: `w2sx`, `cam`, `drawMesh`, `buildMesh` · akıcılık: `TIER`, `perfSample`, `frame()` içindeki kare hızı sınırı
  - Galaksi: `galaxyModel`, `drawGalaxy`, `drawSun`, `nebula`, `BH_KEY='p:denetci'` · kara delik `drawBH` (Doppler disk, hale, foton halkası) · yörünge izi `drawTrail` (`n.orb`) · uygulamalar yuvarlak mini gezegen (`#nodes .node .tile` CSS, 48px küre), küme yörüngeleri `100+j*88` (çakışmasın diye) · küme dünyaları `drawWorld`/`worldOf`/`WORLD_KINDS` (gaz, okyanus, pulsar, ikili, sarmal, yildiz, ay; `groups[g].world`, küme menüsünden seçilir) · derin uzay `drawStars`/`STARS` (koyu temalar, 'evren' hariç; `TIER`'e göre azalır)
  - Widget'lar: `const WT={` (clock, weather, focus, rss, gcal, today, timer, cal, streak, links, countdown, habits, word, noise…), `cleanW` kaydedilen alanlar
  - Sekmeli uygulamalar (OS gibi): `TABS`, `openApp`, `switchTo`, `goHome`, `closeTab`, `switcher` (Alt+Q ve Shift+Tab — `osKeys`/`osKeyUp`, `SW.shift`), `#dock` · kaydırma `startPan` imleci sahneye kilitler (`setPointerCapture`), `body.panning iframe{pointer-events:none}`
  - Canlı ada `paintFocusBar`/`islandItems`, radyal menü `radial`, Sakin mod `calm`, komut paleti `palette`/`cmds`
  - Temalar `THEMES` + `themeMenu` (eski seçici, tema düğmesi), `themeStudio` (paletten), Firebase senkron `saveMeta` (Firestore `hub/meta`)
  - Köprü `window.HUB` (dosyanın sonunda) → `ui/worlds.js` bunu kullanır
- `ui/worlds.js` + `ui/worlds.css` — **Arayüz dünyaları** (tema DEĞİL, ayrı arayüz sistemleri): galaksi (hub'ın kendisi), defter, terminal, organik, isvicre, mekansal.
  Seçim `appshell:world`, seçici `Worlds.picker()` (⇧⌘U, üstteki küre düğmesi, radyal "Arayüz"). Her dünya `R[ad]` nesnesi: `html`, `live` (veriyle yenilenen bölgeler), `mount`, `key`, `resize`.
  Ortak veri `D()` (uygulamalar, bugün, notlar, çalışma).
  Mekânsal (`SP`): ayarlar `appshell:sp` {env, imm, mode:halka|izgara, off}; ortamlar `SP.ENVS`, dalma kadranı `.sp-crown`/`SP.imm`, ana görünüm `SP.home`, taşınır yan pencereler `.sp-grab` (açıları yerlerine göre `SP.orient` → `--sry/--srx`, kullanıcıya döner), `SP.center` (0 tuşu), yazarak bul `SP.find`. Gruplar: hub `HUB.groups()` (galaksi kümeleri: Yapay zekâ yörüngesi, adlı kümeler, Diğer) → `SP.order` → `SP.G`/`SP.list`; halka açıları `SP.ang` (gruplar arası boşluk), dönüş `SP.deg`/`SP.rotTo`. Taşıma: `SP.dnd` (ızgara: uzun bas/sürükle → en yakın yuva ya da `.sp-drop` çipi; halka: uzun bas → cam kalkar, çipe bırak), `SP.move` → `HUB.setGroup/renameGroup` (galaksiyle aynı members/groups, buluta yazılır), grup içi sıra `appshell:sp.order`. Gruplar değişince `Worlds.regroup()` yeniden çizer. Denetçi (`HUB.bh`) taşınmaz. Serbest yerleşim YOK (kullanıcı istemedi): taşıma sadece yuvalara — `SP.calc(G,rows)` yuvaları (`slots`) ve konumları hesaplar, sürüklerken en yakın yuva seçilir, `.sp-slot` gösterilir, satır düzeni sabit tutulur; halkada en yakın camın yanına. Halka sığdırma `SP.fit` → `--fz` (yan pencerelere göre geri itme). İmleç ışığı `SP.light` → `.sp-light` + camlarda `--lx/--ly/--li`. 3B kaplar `pointer-events:none` — tıklanabilir öğelere `auto` ver. Yeni dünya eklerken mevcutlara dokunma, `R` ve `WORLDS`'e ekle.
- `shared/skin.js|css` — hub'da seçilen renk temasını uygulamalara taşır.
- `apps/notlar` — Notion benzeri notlar: bloklar, `/` komutları, şablonlar, takvim, **günler** (Workflowy tarzı: `openDay`, `dateIndex`, `parseTR`), **zaman çizelgesi** (`renderTimeline`), **sayfa içinde sayfa** (`parent` alanı, `kidsOf`, `addSubpage`, `treeItem`). Firestore `hub/notes`.
- `apps/studylog` — çalışma sayacı, günler/hedefler/takip; görevler (`addTask`), rozetler (`checkMiles`), içgörüler (`insightsHTML`). Yerel anahtar `studylog:v1`, Firestore `hub/studylog`.
- `apps/saat` — dünya saati · `apps/denetci` — denetim uygulaması · `apps/oneriler` — öneriler (`audit/ideas.json`)
- `apps/netlestir` — yarım yamalak isteği Claude'a uygun isteğe çevirir (kendi Claude anahtarı / ücretsiz Pollinations / çevrimdışı).
- SAT Bank ve SAT Math ayrı repoda (`../sat-bank/`), `apps.json`'da `url` ile bağlı.
- Giriş: Firebase Google girişi, sadece sahibi (batulekesiz28@gmail.com). Yerelde test için adrese `?local` ekle (giriş istemez).

## Denetçi kuralı — her değişiklikten önce
Kullanıcı, yaptığım her işin kendi gözünden denetlenmesini istiyor. Her değişiklikte:

1. Yerel sunucuyu aç: `python3 -m http.server 8766` (repo kökünde).
2. `python3 audit/run.py` (ya da `python3 audit/run.py <slug>`) çalıştır. Telefon (390px) ve bilgisayar (1366px) boyutunda tarar.
3. **hata** seviyesindekileri mutlaka düzelt; **uyarı**ları mümkünse düzelt; bilerek bırakılanları açık konu olarak yaz.
4. `audit/log.json` dizisine bir kayıt ekle: `{at, change, scores:{"<app> telefon":{before,after}}, items:[{app, sev, status:"fixed"|"open", text, fix?}]}`.
   Metinler Türkçe, kısa ve kullanıcının anlayacağı dilde.
5. Sonra commit + push (main dalına; GitHub Pages oradan yayınlar).

Denetim motoru: `audit/engine.js` (hub'daki Denetçi uygulaması da aynısını kullanır).
Yazı/renk ölçüleri: metin için en az 12px (telefon), dokunma alanı ≥ 24px (telefonda ≥ 40px), kontrast ≥ 4.5:1.

## Galaksi düzeni
- Kara delik = Denetçi (`p:denetci`). Yörüngesinde **sadece** `apps.json`'da `"ai": true` olan uygulamalar döner.
- Kümesiz, AI olmayan uygulamalar gri “Diğer” yıldızına düşer. `"group"` alanı yeni uygulamayı bir kez o yıldıza önerir.
- Oto senkron (akıllı kümeleme) anahtar kelimelere bakar: yeni uygulamaya iyi bir `desc` yaz.
- Yeni uygulama: `apps/<slug>/index.html` + `apps.json`'a kayıt (`slug,name,icon,color,desc`, AI ise `"ai":true`). Tasarım dili mevcut uygulamalarla aynı olsun (Geist yazı tipi, sade, açık/koyu tema `notlar:theme`).

## Öneriler uygulaması
- Veri: `audit/ideas.json` (`{updated, method, ideas:[{id,app,area,title,why,what,effort,impact,sources:[{t,u}]}]}`).
- İki tür öneri: `"kind":"gap"` olanlarda `gap` (bizde eksik olan) ve `best:[{n,how}]` (o işi en iyi yapan uygulamalar ve nasıl yaptıkları) alanları var. Öncelik bu tür: her uygulamanın özelliklerini çıkar, o alanın en iyileriyle karşılaştır, atladığımızı yaz.
- Kullanıcı yeni araştırma isterse ya da büyük bir özellik eklendiğinde: ünlü uygulamaları ve Reddit/forum tartışmalarını web'de araştır, kaynaklı ve kendi cümlelerinle (alıntı yapmadan) yeni öneriler ekle; yapılanları `"status":"done"` olarak işaretle.
