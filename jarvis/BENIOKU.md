# JARVIS — kurulum (bir kez)

1. **Python 3.10+** kur: https://www.python.org/downloads/ — kurarken **“Add Python to PATH”** kutusunu işaretle.
2. Bu klasörde **`baslat.bat`**'a çift tıkla (Mac/Linux: `./baslat.sh`). İlk seferde gerekenleri kendisi kurar (birkaç dakika).
3. Açılan pencerede **6 haneli eşleştirme kodu** yazar. AppShell → **Jarvis**'i aç, kodu gir.
4. Jarvis ekranında **Ayarlar → Claude API anahtarı**'nı gir (ya da “Netleştir'deki anahtarı kullan”).

Pencere açık kaldıkça Jarvis çalışır. Her açılışta sadece `baslat.bat`.

## Ne yapabilir
- Anında (yapay zekâsız): “Google aç”, “YouTube'da lofi aç”, “YouTube Music'te Tarkan çal”, “hesap makinesi aç”, “sesi kıs”,
  “sonraki şarkı”, “durdur”, “ekran görüntüsü al”, “bilgisayarı kilitle”, “saat kaç”.
- Düşünerek (Claude): her şey — “YouTube Music'te son dinlediğim şarkıya yorum bırak”, “yarın 9'da spor hatırlat”,
  “masaüstündeki PDF'leri bir klasöre topla”, “şu siteden randevu al”… Bir yol olmazsa başka yol dener.

## Tarayıcı
Jarvis giriş gerektiren işler için **kendi ayrı tarayıcı penceresini** açar (bu klasördeki `tarayici-profili`).
İlk seferde YouTube/Google hesabına o pencerede bir kez giriş yap; sonra hatırlar. (Chrome 136+ ana profile dışarıdan
bağlanmaya izin vermediği için ayrı profil şart.)

## Güvenlik
- Sadece bu bilgisayardan (127.0.0.1) ve sadece AppShell adresinden bağlanılır; ilk bağlantı eşleştirme kodu ister.
- Komut çalıştırma, gönderme/yayınlama/yorum/satın alma/silme gibi geri alınamaz işler **senin onayın olmadan yapılmaz**.
- Anahtarın sadece `ayarlar.json`'da (bu klasörde) durur; GitHub'a gönderilmez.

## Sorun giderme
- AppShell bağlanamıyorsa: tarayıcı “yerel ağa erişim” izni sorduysa **İzin ver**. Olmazsa Jarvis ekranını doğrudan aç: http://127.0.0.1:8765
- Test (hiçbir şey yapmaz): `baslat.bat --sahte`
