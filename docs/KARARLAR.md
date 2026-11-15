# Kararlar — Notlar ve hub için geçerli tasarım kararları

Bu dosya **tek doğru kaynak**. Yeni bir istek buradaki bir kararla çelişiyorsa:
1. Çelişkiyi açıkça söyle (“bu, X kararını değiştiriyor”).
2. Yeni kararı buraya yaz, eskisini **sil** (altına “eski” diye bırakma).
3. Eski karar için yazılmış CSS/JS'i de sil. Üstüne yama ekleme.

Son güncelleme: 2026-11-15

## Genel görünüm
| Alan | Geçerli karar |
|---|---|
| Tema | Notlar'da açık/koyu seçilebilir; varsayılan **koyu cam** (`glass.css`). Medya ve Beyin **her zaman koyu**. |
| Renk | Az renk: vurgu beyaz-mat (koyu) / mürekkep (açık). Renk sadece **anlam taşıyorsa**: takvimde kategori (küçük nokta/şerit), puan yıldızı altın, hata kırmızı. Bölüm başına renk teması yok. |
| Yazı tipi | Notlar'ın gövdesi Geist (`--font`). Üst gezinme ve Medya sistem yazı tipi (`--sys`, SF benzeri). Serif yok, daktilo/büyük harf etiket yok. |
| Kutular | Notlar, Takvim, Görevler, Aktiviteler: **kartsız** liste/ızgara, ince ayırıcılar. Kart sadece içeriğin kendisi görselse var: Medya posterleri, Belgeler kapakları, şablon önizlemeleri. |
| Bulanıklık (blur) | Sadece açılır paneller ve küçük yüzen şeyler. Kaydırılan içeriğin üstündeki **tam genişlik şeritlerde yok** (kasma yapıyordu); onlar opak. |
| Animasyon | Sadece transform/opacity. `prefers-reduced-motion` ve `html[data-motion=off]`'a uyar (`anim`, `motionOff`). |

## Gezinme
| Alan | Geçerli karar |
|---|---|
| Notlar üst şerit | Ortada cam kapsül `#tnav`: Takvim · Aktiviteler · Görevler · Notlar · İstatistikler. Sol menü yok; sayfa ağacı soldaki düğmeyle açılan panel. |
| Bölümler | Workspace / Library / AI Center (`#modes`, sağ üstte). |
| Akıllı başlık | Uzun listelerde araç satırı aşağı kaydırınca gizlenir, yukarı kaydırınca gelir (`.sbar`, `smartBar()`). |
| Araçlar | Arama, filtre, görünüm, ayar, Ekle: **sağda**, tek satırda. Başlık solda. |
| Geçici paneller | Sayfa değişince hepsi kapanır (`dismissTransient`). |

## Medya
| Alan | Geçerli karar |
|---|---|
| Kategoriler | Filmler · Diziler · Animeler · Oyunlar · Kitaplar, gezinmede **ortada**. |
| Ana sayfa | Ortada kategoriler, altında raflar (izlemek istediklerim vb.). |
| Alt sekmeler | Sayfa başlığının yanında, **solda** (`.mc-sub`). |
| Görünüm | 4 görünüm (tv, nf, compact, list) + ayar paneli. Panelin başında **rastgele bir kapakla önizleme**: kenarından genişlik (`cover`), altından yükseklik (`ar`), köşesinden ikisi; bütün kartlar anında değişir. Hemen altında “Altında isim” anahtarı. Kullanıcı karar verir, varsayılan tv. |
| Puan | Beğen/beğenme/boş + 1–10 + favori (`rateHTML`); sağ tık → Puan ver. |
| Kart rozetleri | IMDb (genel) puanı **sağ üstte** (sarı “IMDb” yazısıyla), **benim puanım mavi, sol altta**, favori kalbi sağ altta, “incele” uyarısı sol üstte. Puan kartın altındaki yazıda tekrar edilmez. |
| Yatay kart (tv) | Sadece dikey posteri olan yapımda poster **ortada**, arkası bulanık posterle dolu; içeride ad tekrar yazılmaz. |

## Takvim, Görevler
| Alan | Geçerli karar |
|---|---|
| Takvim | Ay/hafta/gün; sade ızgara, aktiviteler kategori rengiyle ince. Ay ızgarasında görev sadece gösterge (`.tk-ci`), tamamlama gün panelinde. |
| Görevler | Sade: 4 sekme (bugün, yaklaşan, tekrarlanan, tamamlananlar), tek satır hızlı ekleme. Kanban/proje/takvim görünümü **yok** (kodu silindi). |

## Performans kuralları
- Buluttan gelen kendi kaydımızın yankısı ekranı yeniden çizmez; sadece gerçekten değişen veri çizdirir.
- Arka plan işleri (poster eşleştirme) bütün sayfayı değil sadece değişen kartı günceller.
- `background-attachment:fixed` yok; uzun ızgaralarda `content-visibility:auto`.

## Açık sorular (kullanıcı seçecek)
Şu an soldaki “geçerli karar” uygulanıyor; kullanıcı aksini söylerse buraya işlenir.
1. **Medya alt sekmeleri:** solda başlığın yanında (şu an) mı, ortada mı?
2. **Takvim renkleri:** kategori renkleri (şu an, ince) mi, tamamen tek renk mi?
3. **Yazı tipi:** Notlar gövdesi Geist + gezinme sistem yazısı (şu an) mı, her yerde tek yazı tipi mi?
4. **Açık tema:** tutulsun mu (şu an seçilebilir), yoksa her şey koyu mu?
