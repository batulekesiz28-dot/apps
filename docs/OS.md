# AppShell OS özellikleri — dev şirketlerden uyarlananlar (2026-11-23)

Amaç: Apple, Samsung, Microsoft, Google ve NVIDIA'nın en çok kullanılan sistem özelliklerini **sade** biçimde (Apple sadeliği kuralı) bizim OS'a taşımak. Kod: `ui/osx.js` + `ui/osx.css`; giriş: Kontrol merkezi (kutucuklar + alt sıra), Ctrl+K, kısayollar.

| # | Özellik | Kimden | Bizde | Nerede |
|---|---|---|---|---|
| 1 | Gece ışığı | Windows Night light · Apple Night Shift · Samsung Göz konforu | Ekranı sıcak tona çeker; zamanlama (21:00–07:00), sıcaklık ayarı; uygulamaların üstünde de çalışır | Kontrol merkezi kutucuğu, Sistem → Gece ışığı |
| 2 | Sıcak köşeler | macOS Hot Corners (sağ alt varsayılan Hızlı not) | Köşeye götür → hızlı not, kontrol merkezi, değiştirici, palet, masaüstü, sakin mod… | Sistem → Köşeler ve kenar |
| 3 | Pano geçmişi + evrensel pano | Windows Win+V · Apple Universal Clipboard · Samsung Pano | Kopyaladıkların (son 25, sabitlenebilir); girişliyken son 10'u telefonla bilgisayar arasında eşitlenir; şifre alanı asla kaydedilmez | Alt+V, Kontrol merkezi → Pano |
| 4 | Ekran süresi + günlük sınır | Apple Ekran Süresi · Samsung Dijital Denge | Bugün/7 gün, uygulama başına süre; sınır dolunca adada uyarı (“15 dk daha”) | Kontrol merkezi → Ekran süresi |
| 5 | Odak modları | Apple Focus · Samsung Modlar | Çalışma (sadece izinli uygulamalar) · Uyku (gece ışığı) · Kişisel; hepsi rahatsız etmeyi açar | Kontrol merkezi kutucuğu (dokundukça sıradaki) |
| 6 | Rutinler | Samsung Modes & Routines · Apple Kestirmeler otomasyonu | Saat + günler → odak, tema, gece ışığı, rahatsız etme, uygulama aç | Sistem → Rutinler |
| 7 | Bildirim özeti | Apple Zamanlanmış özet | Odak bitince sessiz gelenlerin özeti adada | kendiliğinden |
| 8 | Performans katmanı | NVIDIA uygulaması overlay · FrameView | FPS, %1 düşük, kare süresi, uzun görev, bellek, kalite kademesi | Alt+R |
| 9 | Kenar paneli | Samsung Edge Panel | Sağ kenardaki tutamak: açık uygulamalar, en çok kullandıkların, araçlar | Alt+E, sağ kenar |
| 10 | Devam et | Apple Handoff · Samsung başka cihazda devam | Başka cihazda son 10 dk içinde açık olan uygulama adada “Devam et” | girişliyken kendiliğinden |
| + | Durum çubuğu + ada uygulamalarda | iPhone Dynamic Island · Android durum çubuğu | Uygulama açıkken üstte saat · canlı ada · rahatsız etme/ağ/pil | uygulama açınca |

Kaynaklar: [Samsung Edge Panel](https://www.samsung.com/ca/support/mobile-devices/galaxy-phone-add-or-remove-edge-panels), [Samsung Modlar ve Rutinler](https://r1.community.samsung.com/t5/tips-tricks/modes-and-routines-smart-setup/td-p/34472332/page/2), [Apple Mac Kullanma Kılavuzu (sıcak köşeler)](https://support.apple.com/guide/mac-help/mchlp3000), [Apple Mac Studio ipuçları (Hızlı not köşesi, Handoff)](https://support.apple.com/guide/mac-studio/apde5ace2f6f/mac), [NVIDIA App](https://www.nvidia.com/en-us/software/nvidia-app/), [NVIDIA FrameView](https://www.nvidia.com/en-us/geforce/technologies/frameview/release-notes/), [Windows 11 pano geçmişi / Gece ışığı / Snap](https://www.windowscentral.com/microsoft/windows-11/i-looked-through-reddit-to-find-the-windows-11-features-people-actually-use).
