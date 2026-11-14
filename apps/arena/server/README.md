# AI Arena — yerel anahtar sunucusu

Gerçek ChatGPT, Gemini ve Claude ile oynamak için. Anahtarlar sadece bu klasördeki `.env` dosyasında durur; sayfaya, tarayıcıya ya da GitHub'a gitmez (`.env` git'e eklenmez).

1. Node.js 18+ kur (nodejs.org).
2. Windows: `baslat.bat`'a çift tıkla. İlk seferde `.env` açılır → anahtarlarını yaz, kaydet, tekrar çift tıkla.
   Mac/Linux: `./baslat.sh`
3. Arena'da sağ üstteki ayar düğmesi → Çalışma modu → **Gerçek modeller** → **Bağlan ve test et**.

- Sunucu sadece bu bilgisayardan erişilir (127.0.0.1), sadece izinli sayfalara cevap verir.
- İstersen `.env`'de `ARENA_TOKEN` belirle; aynısını Arena'daki "Arena anahtarı" alanına yaz.
- Model adlarını `.env`'den değiştirebilirsin. Her isteğe güvenlik kuralları eklenir: yalnızca sanal hedef, gerçek kod/exploit yok.
