# AppShell · YouTube ve YouTube Music hub içinde

YouTube ve YouTube Music, başka sitelerin içinde açılmayı yasaklayan bir güvenlik başlığı gönderir. Bu eklenti o başlığı
**yalnızca** AppShell hub'ının (batulekesiz28-dot.github.io) içinde açılan YouTube / YouTube Music çerçevesi için kaldırır.
Başka hiçbir siteye, sekmeye ya da YouTube Music'in kendi sekmesine dokunmaz; veri okumaz, hiçbir yere bir şey göndermez.

Kurulum (Chrome / Edge / Brave):
1. `appshell-gom.zip` dosyasını indir, sağ tık → Tümünü ayıkla.
2. Adres çubuğuna `chrome://extensions` yaz (Edge: `edge://extensions`).
3. Sağ üstteki **Geliştirici modu**nu aç.
4. **Paketlenmemiş öğe yükle** → içinde `manifest.json` görünen klasörü seç.
5. Hub'ı yenile (Ctrl+Shift+R). YouTube ve YouTube Music artık hub'ın içinde açılır.

Güncellerken: eski AppShell eklentisini Kaldır, yeni klasörü Paketlenmemiş öğe yükle ile seç.

YouTube Music'te hesabın görünmüyorsa: bir kez normal sekmede music.youtube.com'a gir ve oturum aç.
Chrome'da “üçüncü taraf çerezleri engelle” açıksa Ayarlar → Gizlilik → Üçüncü taraf çerezleri → “İzin verilen siteler”e
`[*.]youtube.com` ve `[*.]google.com` ekle.
