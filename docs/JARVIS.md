# Jarvis — araştırma ve mimari

Kullanıcının isteği: bilgisayarda tam yetkili, **konuşma tabanlı**, çok hızlı ("Google aç" → anında açılır, arama çubuğuna yazıp tıklamaz),
**alternatif düşünebilen** (salak komut botu değil), karmaşık işleri yapan (ör. "YouTube Music'te son dinlediğim şarkıya yorum bırak", randevu almak),
yaptıklarını sohbette gösteren bir asistan.

## 1. İncelenen projeler — kim neyi nasıl yapmış

| Proje | Ne yapıyor | Neyi iyi yapıyor | Zayıf yanı / bizim dersimiz |
|---|---|---|---|
| **Open Interpreter / 01** (openinterpreter) | LLM bilgisayarda kod (Python, shell) çalıştırarak her işi yapar; 01 sesli arayüzü + ESP32 cihazı | "Önceden tanımlı komut yok" — model işi kendisi kodla çözer → alternatif düşünme | Her şey için kod yazmak yavaş; çalıştırmadan önce onay şart (biz de kalıcı işlerde onay istiyoruz) |
| **Microsoft UFO / UFO²** (Windows AgentOS) | HostAgent uygulamayı seçer, AppAgent'lar UI Automation + görsel tanıma ile tıklar | Windows'un kendi UI Automation API'si + ekran görüntüsü karışımı → kırılganlık azalır | Ağır, araştırma projesi; ders: **önce API/kısa yol, olmazsa ekran** |
| **browser-use / Playwright MCP** | Tarayıcıyı ajan olarak kullanır, sayfa öğelerini listeler, tıklar/yazar | Giriş yapılmış oturumla gerçek siteler (YouTube, takvim, randevu) | Chrome 136+ ana profile uzaktan bağlanmayı yasakladı → **Jarvis'e ayrı profil**, bir kez giriş yapılır |
| **XCODE-MAIN/Jarvis** (Electron + Groq) | Ses/yazıyla uygulama açar, dosya düzenler | Groq ile hızlı model; dosya/komut öncesi izin ister | Sabit araç listesi |
| **ONEPUNCHMAN411/Jarvis** (Windows 11) | Fare-klavye kontrolü, tarayıcı otomasyonu, 50+ eklenti | Tam bilgisayar kullanımı + sesli geri bildirim | Eklenti yığını; biz az ama genel araç + akıl |
| **bertrandmbanwi/Jarvis** (Python + Next.js + Three.js) | 109+ araç, tarayıcı otomasyonu, masaüstü katmanı | Görsel HUD, çok araç | Çok araç → model kafası karışır; az ve güçlü araç seçtik |
| **itvikash/jarvis, llm-guy/jarvis, Sandy32513/JARVIS** (Ollama yerel) | Uyandırma kelimesi + yerel LLM + TTS | Ücretsiz, çevrimdışı | Yerel küçük modeller karmaşık işte zayıf; biz Claude kullanıyoruz |
| **InterGenJLU/jarvis** | GPU'lu yerel Whisper + Kokoro TTS | Gecikme odaklı yerel ses hattı | GPU şart |
| **LiveKit Agents / Pipecat** (ses altyapıları) | STT → LLM → TTS akışı, her aşama akarak (stream) | **Aşamaları üst üste bindirme**: model yazarken ses başlar | Üretimdeki tipik gecikme 0.6–1.2 sn |
| **openWakeWord** | Yerel uyandırma kelimesi ("hey jarvis" hazır model) | Ücretsiz, yerel | Yanlış uyanmayı azaltmak için doğrulayıcı model önerilir |
| **Türkçe ses** (Piper dfki, Okur, FreyaTTS; Whisper ince ayarları) | Yerel Türkçe TTS/STT | Okur ~10M parametre, CPU'da gerçek zamanın ~21 katı | Lisanslar karışık; ilk sürümde tarayıcının kendi sesi |

Ortak dersler:
1. **Hız = iki yol.** Basit komutlar (uygulama/site aç, ses, medya) modelsiz, anında; karmaşık işler modele. (Hepsinin yavaşlık şikâyeti her şeyi LLM'e sormaktan.)
2. **Az ama genel araç** (aç, yaz, tuş, ekran görüntüsü + tıkla, tarayıcı, komut, dosya) + iyi bir model → alternatif düşünme kendiliğinden gelir. 100 küçük araç modeli şaşırtır.
3. **Önce kestirme yol, sonra ekran:** site adresi bilinirse doğrudan aç; uygulama Başlat menüsünden doğrudan; ancak hiçbiri yoksa ekran görüntüsü + tıklama (UFO dersi).
4. **Geri alınamaz işlerde onay** (gönder, yayınla, sil, satın al, randevu onayla, komut çalıştır) — koda gömülü, sadece isteme bırakılmaz.
5. **Her şeyi akıt:** modelin yazısı geldikçe ekranda ve seste; araç adımları canlı.
6. **Güvenlik:** yerel sunucu sadece bu bilgisayardan ve sadece AppShell adresinden + eşleştirme koduyla bağlanır (yoksa herhangi bir site bilgisayarı yönetebilirdi).

## 2. Bizim mimari

```
Ses (tarayıcı: Web Speech, "Jarvis" uyandırma) ─┐
Yazı ────────────────────────────────────────────┤→ AppShell "Jarvis" uygulaması (apps/jarvis) ── WebSocket 127.0.0.1:8765 ──→ Jarvis çekirdeği (jarvis/jarvis.py, bilgisayarda)
                                                  │      sohbet, canlı adımlar, onay kartları, sesli yanıt                    ├─ hızlı yol: kural tabanlı anlık komutlar (<50 ms)
                                                  │                                                                         └─ ajan: Claude Opus 5.5 + araçlar (akış, ilerleme notları)
```

- **Çekirdek** Python (Windows öncelikli; macOS/Linux'ta da çalışır), **ek paket yok** — sadece standart kütüphane.
  Sebep: Windows 11'in Akıllı Uygulama Denetimi internetten inen `.bat`'ları ve pip paketlerinin imzasız `.pyd`/DLL parçalarını
  (pydantic-core, pillow, greenlet…) engelliyor; python.org'un Python'u imzalı olduğu için sorun çıkarmaz.
  - Klavye/fare: Windows `SendInput` (ctypes; Türkçe karakterler Unicode olayıyla), DPI farkında (`SetProcessDpiAwareness`).
  - Ekran görüntüsü: GDI `StretchBlt` (HALFTONE küçültme) → PNG (zlib).
  - Tarayıcı: Chrome/Edge `--remote-debugging-port=9223` + ayrı profil, DevTools protokolü (kendi WebSocket istemcimiz, `CDP`).
  - Claude: `urllib` ile akışlı Messages API (SSE), `anthropic-version: 2026-10-21`.
  - AppShell bağlantısı: `asyncio.start_server` + kendi WebSocket sunucumuz (Origin denetimi).
  - Kurulum: Win+R → `py -c "…exec(urlopen('…/jarvis/kur.py'))"` → `%USERPROFILE%\Jarvis`, masaüstüne `Jarvis.cmd`; açılışta kendini günceller (`VERSION`).
- **Hızlı yol** (`quick`): "google aç", "youtube'da lofi aç", "hesap makinesi aç", "sesi kıs", "sonraki şarkı", "ekran görüntüsü al", "bilgisayarı kilitle", "X'i ara".
  Eşleşmezse ajana gider. Hızlı yolun yaptığı da sohbete yazılır.
- **Ajan:** Messages API (ham HTTP akışı), kendi döngümüz (WebSocket'e akış + onay + iptal için), `claude-opus-5-5`, düşünme her zaman açık (Opus 5.5), `effort: low` (sesli asistan için hız; ayardan yükseltilebilir),
  `display: "updates"` → model araçlar arasında "şimdi şunu yapıyorum" notları yazar, sohbette canlı adım olur. `fallbacks: "default"` (güvenlik reddinde yedek model).
  Önbellek: sabit sistem + araçlar → istekler ucuz ve hızlı.
- **Araçlar:** `open_target` (site/uygulama/dosya), `web_search` (Anthropic sunucu aracı), tarayıcı (`browser_go`, `browser_look`, `browser_click`, `browser_type`, `browser_keys`) — ayrı Jarvis profili,
  bilgisayar (`screenshot`, `click`, `type_text`, `press_keys`), `run_command` (PowerShell/bash, **onaylı**), dosya (`list_files`, `read_file`), `appshell_reminder` (AppShell hatırlatıcısı), `remember` (kalıcı not).
- **Onay kapısı (kodda):** komut çalıştırma; tarayıcıda gönder/yayınla/yorum/satın al/sil/onayla gibi düğmeler; `submit` ile yazma. Sohbette kart: ne yapılacak + Onayla / Vazgeç.
- **Ses:** ilk sürümde tarayıcı (kurulum yok): Türkçe konuşma tanıma + Türkçe ses; yanıt cümle cümle okunur (ilk cümle gelir gelmez).
  Sonraki adım: çekirdekte yerel uyandırma kelimesi (openWakeWord) + faster-whisper + Türkçe Piper/Okur sesi.

### Ücretsiz yapay zekâ (kullanıcı isteği: Claude anahtarı paralı)
| Sağlayıcı | Neden | Sınır |
|---|---|---|
| **Gemini** (varsayılan) | Google hesabıyla ücretsiz anahtar, kart yok; araç çağırma + ekranı görme; Türkçe iyi | Dakikalık/günlük kota; ücretsiz kullanımda veriler ürün geliştirmede kullanılabilir |
| **Groq** | Ücretsiz, çok hızlı (gpt-oss-120b, Llama) | Ekranı göremez; dakikalık token sınırı düşük |
| **OpenRouter** | `openrouter/free` uygun ücretsiz modeli seçer | Hız/kalite değişken |
| Claude | En iyi ajan | Ücretli |
Hepsi OpenAI uyumlu uç (`/chat/completions` + `tools` + akış) → tek döngü `oa_agent`. Web araması ücretsiz DuckDuckGo (`ddg`).
Kaynaklar: https://ai.google.dev/gemini-api/docs/rate-limits · https://ai.google.dev/gemini-api/docs/openai · https://console.groq.com/docs/rate-limits · https://openrouter.ai/blog/tutorials/free-llm-apis-compared/

## 3. Yol haritası
1. **v1 (bu):** çekirdek + AppShell arayüzü, hızlı yol, ajan, tarayıcı, onay, sesli konuşma.
2. Arka planda dinleme (AppShell kapalıyken de) — çekirdeğe yerel ses hattı.
3. Bellek: tercihler, sık kullanılanlar, kişiler ("annemi ara" → WhatsApp Web).
4. Telefon: ntfy ile telefondan Jarvis'e komut ("bilgisayarda şarkıyı durdur").
5. Windows UI Automation (pywinauto) ile ekran görüntüsüne gerek kalmadan masaüstü uygulamaları.

## Kaynaklar
- Open Interpreter 01: https://github.com/openinterpreter/01 · https://inverse.com/tech/open-interpreter-01-light-ai-control-your-computer-for-you
- Microsoft UFO²: https://arxiv.org/html/2504.14603v2 · https://microsoft.github.io/UFO/ufo2/overview · https://github.com/microsoft/UFO
- Jarvis projeleri: https://github.com/XCODE-MAIN/Jarvis · https://github.com/bertrandmbanwi/Jarvis · https://github.com/ONEPUNCHMAN411/Jarvis · https://github.com/itvikash/jarvis · https://github.com/llm-guy/jarvis · https://github.com/InterGenJLU/jarvis · https://github.com/topics/jarvis-ai
- Ses gecikmesi: https://livekit.com/blog/voice-agent-architecture-stt-llm-tts-pipelines-explained · https://huggingface.co/blog/dvalle08/voice-agent-latency-playbook · https://discuss.huggingface.co/t/how-do-you-design-a-voice-ai-architecture-that-achieves-500ms-first-token-latency-while-remaining-cost-effective/180230
- Tarayıcı/oturum: https://docs.browser-use.com/customize/real-browser · https://playwright.dev/mcp/configuration/browser-extension · https://www.browserstack.com/guide/playwright-connect-to-existing-browser
- Uyandırma kelimesi: https://deepwiki.com/dscripka/openWakeWord/6.3-hey-jarvis-model · https://github.com/dscripka/openWakeWord/blob/main/docs/custom_verifier_models.md
- Türkçe ses: https://huggingface.co/ahakan/okur-tts · https://huggingface.co/freyavoice/freya-tts · https://huggingface.co/Sercan/whisper-small-cv-tr

## 2026-11-27 — Daha akıllı Jarvis (Zoey OS örnek alındı)
Zoey OS: sesle konuşulan, kalıcı hafızalı, yaptığı işi görsel olarak gösteren bir “yapay zekâ işletim sistemi”. Bizden aldıklarımız:
- **Görünür iş:** çok adımlı işlerde `plan` aracı → arayüzde yapılacaklar listesi (biten ✓, sıradaki dönen halka).
- **Zor işte derin düşünme:** `is_deep` → yüksek düşünme seviyesi + varsa Gemini Pro (ücretsiz kotası bitince Flash'a düşer). Kısa komutlar hızlı kalır.
- **Bilgisayarı tanıma:** her istekte öndeki pencere + açık pencereler bağlama eklenir; `window` aracıyla öne getir/küçült/büyüt/kapat; `clipboard` ile pano.
- **Hafıza:** tercihleri sormadan `remember` ile kaydeder; sohbet 3 saate kadar sürer.
