# JARVIS — kurulum (bir kez)

Ek paket kurmaz, `.bat` dosyası yoktur → Windows'un **Akıllı Uygulama Denetimi** açıkken de çalışır.
(Akıllı Uygulama Denetimi internetten inen `.bat` dosyalarını ve pip paketlerinin imzasız parçalarını engelliyor; Jarvis sadece
Python'un kendi, imzalı parçalarını kullanır.)

1. **Python** kur: https://www.python.org/downloads/ — kurarken **“Add python.exe to PATH”** kutusunu işaretle.
2. **Win+R**'ye bas, şunu yapıştır, Enter:
   ```
   py -c "import urllib.request as u;exec(u.urlopen('https://batulekesiz28-dot.github.io/apps/jarvis/kur.py').read())"
   ```
   Jarvis kullanıcı klasöründeki `Jarvis` klasörüne iner, masaüstüne **Jarvis** kısayolu konur ve başlar.
   (Mac/Linux: Terminal'de `py` yerine `python3`.)
3. Açılan pencerede **6 haneli eşleştirme kodu** yazar. AppShell → **Jarvis**'i aç, kodu gir.
4. Jarvis ekranında **Ayarlar → Claude API anahtarı**'nı gir (ya da “Netleştir'deki anahtarı kullan”).

Sonraki seferlerde masaüstündeki **Jarvis**'e çift tıkla. Jarvis her açılışta yeni sürüm var mı bakar, varsa kendini günceller.

## Ne yapabilir
- Anında (yapay zekâsız): “Google aç”, “YouTube'da lofi aç”, “YouTube Music'te Tarkan çal”, “hesap makinesi aç”, “sesi kıs”,
  “sonraki şarkı”, “durdur”, “ekran görüntüsü al”, “bilgisayarı kilitle”, “saat kaç”.
- Düşünerek (Claude): her şey — “YouTube Music'te son dinlediğim şarkıya yorum bırak”, “yarın 9'da spor hatırlat”,
  “masaüstündeki PDF'leri bir klasöre topla”, “şu siteden randevu al”… Bir yol olmazsa başka yol dener.

## Tarayıcı
Jarvis giriş gerektiren işler için **kendi ayrı Chrome (yoksa Edge) penceresini** açar (Jarvis klasöründeki `tarayici-profili`).
İlk seferde YouTube/Google hesabına o pencerede bir kez giriş yap; sonra hatırlar. (Chrome ana profile dışarıdan
bağlanmaya izin vermediği için ayrı profil şart.)

## Güvenlik
- Sadece bu bilgisayardan (127.0.0.1) ve sadece AppShell adresinden bağlanılır; ilk bağlantı eşleştirme kodu ister.
- Komut çalıştırma, gönderme/yayınlama/yorum/satın alma/silme gibi geri alınamaz işler **senin onayın olmadan yapılmaz**.
- Anahtarın sadece `ayarlar.json`'da (Jarvis klasöründe) durur; GitHub'a gönderilmez.

## Sorun giderme
- AppShell bağlanamıyorsa: tarayıcı “yerel ağa erişim” izni sorduysa **İzin ver**. Olmazsa Jarvis ekranını doğrudan aç: http://127.0.0.1:8765
- `py` bulunamadı diyorsa: Python kurulurken “Add python.exe to PATH” işaretlenmemiş; Python'u yeniden kurup işaretle ya da komutta `py` yerine `python` yaz.
- Test (hiçbir şey yapmaz): `python jarvis.py --sahte`
