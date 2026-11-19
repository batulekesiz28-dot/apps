# AppShell — ayrıntılı analiz (2026-11-19)

Nasıl yapıldı: katı Denetçi (yeni “Gerçek kullanıcı” bölümü) ile 10 uygulama telefon (390px) ve bilgisayar (1366px) boyutunda,
Notlar'ın 30+ ekranı (`audit/screens.js`: takvim, görevler, zaman çizelgesi, sayfa, Medya rafları/detay/ayarlar, Library) ve
hub'ın 10 arayüzünün her biri ayrı ayrı tarandı. Ayrıca konsol hataları, yükleme süresi ve veri güvenliği kontrol edildi.

## Bulunan ve düzeltilenler
| Yer | Bir kullanıcı ne yaşıyordu | Ne yapıldı |
|---|---|---|
| Notlar · sayfa (telefon) | “İkon ekle / Tarih ekle” fareyle üstüne gelince görünüyordu; telefonda hiç görünmüyordu | Telefonda hep görünür, 40px |
| Notlar · Library (dokunmatik) | Favori düğmesi sadece üstüne gelince çıkıyordu | Dokunmatikte hep görünür |
| Notlar · Takvim | Bugünün kırmızı dairesindeki yazı zor okunuyordu (4:1) | Kırmızı koyulaştı (≥4.6:1), koyu temada yazı tonu ayrı |
| Notlar · Takvim (telefon) | Ay/yıl başlığına basmak zordu | 40px dokunma alanı |
| Medya (telefon) | “Yeni sezonlar”, “Nasıl alınır ↗”, kapak boyu tutamaçları küçüktü | Hepsi ≥40px |
| Medya · ayrıntı | Ekranı kaplayan pencere ekran okuyucuya “pencere” olarak bildirilmiyordu | `role=dialog` + `aria-modal` |
| Bütün uygulamalar | Sadece simgesi olan düğmelerde ipucu çıkmıyordu (23 tane yalnızca Medya ayarlarında) | `shared/skin.js`: simge düğmesinin adı üstüne gelince ipucu olur |
| Zaman çizelgesi | Ay düğmeleri tek seçimli olduğu halde öyle bildirilmiyordu | `radiogroup` / `radio` |
| Öneriler | Süzgeç satırında 14 düğme; “Hayır” neye hayır dediğini söylemiyordu | 4 süzgeç + “Uygulama…” seçicisi; açık adlar |
| AI Warfront | Model adı kesiliyordu | Üstüne gelince tamamı |
| Study Log | Ay okları ipucusuz | İpucu eklendi |
| Hub (telefon) | Yakınlaştırma düğmeleri 26px ve yapışıktı | 40px, aralıklı |
| Denetçi | Günlük satırları 100+ harf uzunluğundaydı | 72 harf genişlik |
| Veri | Bütün veriyi tek seferde yedeklemenin yolu yoktu (Notion, Obsidian, Todoist'te var) | Ctrl+K → “Verilerimi yedekle (indir)”: tek JSON; API anahtarları asla girmez |

## Ölçümler
- Konsol hatası: 10 uygulamada 0.
- Yükleme (yerel): hub ~0.8 sn, Notlar ~0.3 sn; Notlar ~630 KB sıkıştırmasız (GitHub Pages gzip ile ~1/4'ü).
- Arayüzler: 10 dünyanın hepsi boştayken 0 kare/sn çiziyor (pil dostu); telefonda ve bilgisayarda bulgu yok.
- Denetçi puanları (katı ölçüyle): bütün uygulamalar 100 — sadece “not” seviyesinde iki köşe yuvarlama tutarsızlığı (Study Log, AI Warfront).

## Bilerek bırakılanlar (açık konular)
- **Çevrimdışı çalışma (service worker) yok.** Eklenirse eski dosya gösterme riski var (her güncellemede Ctrl+Shift+R alışkanlığı bozulur). Önce sürüm adlı önbellek planı gerekir.
- **Yedekten geri yükleme yok.** Bulut (Firestore) asıl kaynak; yerelden geri yazmak buluttaki daha yeni veriyi ezebilir. Yedek şimdilik “ek güvence”.
- **PDF/dosyalar yedeğe girmez** (IndexedDB, sadece o cihaz).
- **Hub tek dosya (~350 KB).** Hızlı açılıyor; bölmek şimdilik kazanç getirmez.
- **SAT Bank / SAT Math** ayrı repoda; Denetçi uygulaması yerelde onları açamıyor (“Mobil görünüm ayarı yok” uyarısı bu yüzden).
- Hareketli arayüzlerde (Rüzgâr, Petek) yay animasyonu sürerken düğmeler bir an üst üste geçebiliyor; durunca yok.
