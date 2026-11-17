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
| Notlar üst şerit | Ortada cam kapsül `#tnav`: Takvim · Görevler · Notlar · İstatistikler + sabitlenen sayfalar. Sol menü yok; sayfa ağacı soldaki düğmeyle açılan panel. |
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
| Görünüm | 4 görünüm (tv, nf, compact, list) + ayar paneli. Panelin başında **rastgele bir kapakla önizleme**: kenarından genişlik (`cover`), altından yükseklik (`ar`), köşesinden ikisi; bütün kartlar anında değişir. Hemen altında “Altında isim” anahtarı. Izgarada kart **tam seçilen boyda** kalır (sütunlar sabit genişlik, ızgara ortalı); telefonda ekranı doldurur. Önizlemenin altında gerçek kart boyu (px). Çekerken panel saydamlaşır; çift tık sıfırlar; %100'e yaklaşınca yapışır; ok tuşlarıyla da ayarlanır. Kullanıcı karar verir, varsayılan tv. |
| Bağımsız bölümler | Görünüm ayarları **her bölümde ayrı** (Ana sayfa, Filmler, Diziler, Animeler, Oyunlar, Kitaplar; `mc:look:<bölüm>`). Biri diğerini etkilemez. Ortak olan tek şey üstteki kategori sekmelerinin açık/kapalı oluşu. Panel başlığında hangi bölüm olduğu yazar. |
| Puan | Beğen/beğenme/boş + 1–10 + favori (`rateHTML`); sağ tık → Puan ver. |
| Kart üstüne gelme | Siyah seçenek paneli YOK. Kapakta kısa durunca **spot ışığı**: ekranın geri kalanı bulanık/koyu, kapak yaylanarak öne çıkar, adı altında. Puanlanmamışsa altta cam “★ Puanla” hapı → üstüne gelince açılır, imleç gezdikçe 1–10 + kelime (İyi, Harika…), tıkla kaydet. Yanda (hangi tarafta yer çoksa) kutusuz **bilgi paneli** akarak açılır: tür·yıl, ad, türler, puanlar, durum, özet, Ayrıntılar + yasal bağlantılar (Nerede izlenir = JustWatch TR, IMDb, Steam, MyAnimeList). Spot ışığı kapakta **~1 sn** durunca açılır (kapakların üstünde serbestçe gezilebilsin); açılınca bilgi + fragman **anında** gelir. **Fragman** bilginin karşı tarafında (yer yoksa bilgi panelinin üstünde): resmî YouTube oynatıcısı (youtube-nocookie), sessiz otomatik oynar, tıkla → ses; önce kapak karesi görünür, video **oynamaya başlayınca** belirir (hata ekranı hiç görünmez). Birden çok aday; oynamayan (silinmiş/gömme kapalı) atlanır ve `mc:ytbad`'de hatırlanır. Fragman alanı ancak video **oynamaya başlayınca** görünür (çıkıp kaybolma yok). Boyutu dış alt köşeden sürüklenir (çift tık: varsayılan) ya da Görünüm panelinden (genişlik + aç/kapa), `mc:ytw`/`mc:ytoff`. Kaynak sırası: **iTunes resmî fragmanı** (film/dizi, doğrudan video) → Jikan (anime) → TMDB (anahtar varsa) → Wikidata P1651; kapağa gelir gelmez aranır, `mc:yt2`'de saklanır. Bulunamazsa “Fragman” bağlantısı (YouTube araması). Korsan site bağlantısı YOK. Diğer işlemler sağ tıkta. Fare ve kalem (Apple Pencil üstüne gelme) ile çalışır; parmakla değil. |
| Kapak oranı | Film/dizi/oyun posteri 2:3. **Anime** (Animeler bölümü, sadece animeden oluşan raf/ızgara) MyAnimeList oranı ~225:318 → kapak kırpılmaz. Anime kapağı her zaman MyAnimeList posterinden: eşleşmede MAL kimliği yoksa adıyla aranır (`malSearch`), mevcutlar bir kez onarılır (`aniFix`, elle seçilenler hariç). Dikey kutuya kare/yatay görsel gelirse kırpılmaz, ortalanır (`.fitc`). Geniş kart (w/w2) HER görünümde sadece yatay görseli olan raflarda; dikey poster geniş karta sığdırılmaz. |
| Medya notları | Notlar Workspace'te durur; bağlı olduğu yapımın detayında **Notlarım** listesi (açık bağ `KB.link` ya da sayfadaki kaynak kartı). Yeni not tek bir “Medya notları” sayfasının (`tpl:'medya-notlari'`) altına girer, başlığı seçili açılır; her dizi için ayrı yapı yok. “Var olan notu bağla” ile başka yerdeki not da bağlanır. Ana sayfada “Not aldıkların” rafı, spot ışığında “📝 N not”. Eski kısa not kutusu “Kısa not” olarak kaldı. |
| Mini oynatıcı | Spot ışığındaki fragmanın köşesindeki düğme → fragman ayrı, sürüklenebilir (başlıktan), köşeden boyutlanan, sesli ve kontrollü pencerede oynar; sayfa değişince kapanmaz; konum/genişlik hatırlanır (`mc:pip`); başlığa çift tık büyüt/küçült. |
| Fragman sarma | Spot ışığındaki fragmanın üstüne gelince altta cam şerit: 10 sn geri · ilerleme çubuğu (tıkla/sürükle) · 10 sn ileri · süre; ses ve ayrı pencere düğmeleri de SADECE imleç fragmandayken görünür, imleç çıkınca geçişsiz anında kaybolur (alt ince çizgi kaldırıldı). Spot açıkken ← → 5 sn sarar. Mini oynatıcıya çıkınca kaldığı saniyeden devam eder; mini oynatıcı ortak oynatıcıyı kullanır (başlıktaki ayrı sarma düğmeleri kaldırıldı). Çok dar fragmanda şerit gizlenir. |
| Eksik posterler | Eşleştirmede poster bulunamayanlara ikinci arama (`coverFix`): anime AniList, dizi TVmaze, film iTunes, hepsi Wikipedia (sayfa açıklaması türle uyuşmalı); ad+yıl tutmalı; önceden “bulunamadı” olanlar “kontrol bekliyor” olur; elle seçilenlere dokunulmaz; 7 günde bir. |
| Bağlantı testi | Medya Görünüm paneli → “Bağlantıları test et”: her dış servisi kullanıcının tarayıcısından dener (✓ ms / engellendi / zaman aşımı / 429), özet + “Sonucu kopyala”. |
| Anime önerileri | “Yeni çıkan popüler animeler” rafı (Medya ana sayfası + Animeler sayfasının başı): **AniList** bu sezon (ana kaynak; Jikan yedek), alınamazsa raf kaybolmaz → “Bağlantıyı test et”; listende olmayanlar, takipçi + sevdiğin türler + MAL puanı ile sıralı; 12 saat önbellek `mc:arec2`. Kart → önizleme (özet, türler, neden önerildi) → “İzlemek istiyorum” (listeye todo) / Fragman / MyAnimeList. |
| Yeni sezonlar | Kategori sırasının en sağında **tek düğme** (bölüm başına ayrı değil) + sayı rozeti; panelde Geldi (son 60 gün / yayında) → Yakında (en yakın tarih önce) → Tarihi belli değil. Sadece izlediğin/izlemekte olduğun/yarım bıraktığın dizi-anime-film. Kaynak: TVmaze sezonları, Jikan devam zinciri, Wikidata P156+P577; 3 gün önbellek (`mc:ns`), “Şimdi kontrol et”. |
| Kart rozetleri | IMDb (genel) puanı **sağ üstte** (sarı “IMDb” yazısıyla), **benim puanım mavi, sol altta**, favori kalbi sağ altta, “incele” uyarısı sol üstte. Puan kartın altındaki yazıda tekrar edilmez. |
| Apple TV kart şekli | Rafın/ızgaranın kapakları belirler: neredeyse hepsinin (%85) yatay görseli varsa (oyunlar) geniş kart, değilse (çoğu film/dizi) **büyük dikey poster**. Bulanık zeminli küçük poster YOK; geniş rafta tek tük dikey poster kartı doldurur (kırpılır). Vitrine sadece yatay arka planı olanlar çıkar. |

## Notlar
| Alan | Geçerli karar |
|---|---|
| Notlar sekmesi | Doğrudan Notion tarzı Notlar ana sayfası. Üçe bölme (Work · Ders · Library seçimi) KALDIRILDI — kullanıcı sevmedi. Ders notu ana sayfadaki “Dersler” kısayolundan. |
| Aktiviteler | Sekme ve sayfa KALDIRILDI. Etkinlik verisi silinmedi; takvimde durur. |
| Satır içi bağlantı | Yazı seç → biçim çubuğu 🔗 ya da **Ctrl/Cmd+K** → küçük adres kutusu (prompt YOK; “google.com” → https://). Linke tıkla → yeni sekmede açılır (Alt+tık: imleç). Üstüne gel → Aç · Düzenle · Kaldır. Seçim yokken Ctrl/Cmd+K komut paleti. |
| Bağlantı önizlemesi | Boş satıra tek link yapıştırınca önizleme kartı (başlık, açıklama, site simgesi, görsel; Library `meta` → microlink). YouTube → sayfada oynayan video (youtube-nocookie, tıklayınca), görsel linki → resim. Yazının içine yapıştırılan link satır içi bağlantı kalır; Shift+yapıştır da düz bırakır. Karttaki ≡ düğmesi düz bağlantıya çevirir. |
| Bağlantı oku (satır içi önizleme) | Yazıdaki dış bağlantıların sağında minik ⌄ ok. Oka tıkla → bloğun hemen altında önizleme açılır: YouTube (t= başlangıç saniyesiyle)/Vimeo/video dosyası oynar, görsel görünür, diğer siteler kart (başlık, açıklama). Altında “Sekmede aç ↗” ve “Kapat”; oka tekrar basınca kapanır, açıkken ok döner. Bağlantı metnine tıklamak eskisi gibi sekmede açar. Üstüne gelince çıkan menüde de “Önizle”. Önizleme nota kaydedilmez. |
| Ortak video oynatıcı | Notlar'daki bütün videolar (bağlantı önizlemesi, yapıştırılan video kartı, Kütüphane YouTube ayrıntısı, Medya mini oynatıcı) tek oynatıcı `player.js`: YouTube'un kendi düğmeleri/başlığı/“diğer videolar” ekranı görünmez (controls=0, iframe tıklanamaz). Kendi denetimlerimiz (oynat/duraklat, 10 sn geri/ileri, çubuk, süre, ses, tam ekran) sadece imleç üstündeyken; çıkınca anında kaybolur. Duraklayınca kapak + büyük oynat düğmesi. Yüzeye tık = oynat/duraklat, çift tık = tam ekran; klavye Boşluk/K, ← →, J/L, M, F. Dokunmatikte dokununca 3 sn görünür. Vimeo kendi oynatıcısıyla kalır. |
| Ses seviyesi | Bütün videolarda ortak ve hatırlanır (`notlar:vol`, varsayılan 80). Ortak oynatıcıda ses düğmesinin üstüne gelince yana açılan kaydırıcı; bulanık ekrandaki fragmanda ses düğmesinin üstünde dikey kaydırıcı (tekerlekle de). 0 = sessiz; ses düğmesi aç/kapa. Klavye: oynatıcı üstündeyken ↑ ↓ %10. |
| Önizleme boyutu | Bağlantı önizlemesinin altındaki **Boyut** menüsü: Küçük (360) · Orta (560, varsayılan) · Satır genişliği · Geniş — sayfa boyu (satırdan taşar, ortalanır; video ekran yüksekliğine sığar) · videoda Tam ekran. Sağ alt köşeden sürükleyerek serbest boy (240 px – sayfa genişliği); çift tık → Orta. Bütün önizlemeler aynı boyu kullanır, hatırlanır (`notlar:lkpvw`). |
| Üste sabitleme | Soldaki sayfa listesinden bir sayfa üst şeride (Takvim · Görevler · Notlar · İstatistikler'in yanına) sürüklenip sabitlenir; ⋯ menüsünden de. Şeritte sürükle = sırala; dışarı bırak / sağ tık = kaldır. Alt sayfası açıkken de sekmesi vurgulu. Bulutta senkron. |

## Hub widget'ları
| Alan | Geçerli karar |
|---|---|
| Study Log widget'ı | Bugün/hedef halkası, çalışan sayaç (başlat/duraklat buradan; bitirme Study Log'da), bu haftaki dersler. **Ekranda tut**: Kapalı · Uygulamalarda · Her yerde → küçük, sürüklenebilir, büyütülebilir pencere; yeri cihazda hatırlanır. |

## Takvim, Görevler
| Alan | Geçerli karar |
|---|---|
| Doğum günleri / her yıl | Etkinlik `rep:'yearly'` her yıl görünür; doğum günü `kind:'bday'` (🎂, pembe, isteğe bağlı doğum yılı → yaş). Hızlı ekleme: “Ayşe doğum günü 12 mart (2004)”, “… her yıl/yıldönümü”. Düzenleyicide Etkinlik / Doğum günü seçimi. Gün panelinde “🎂 Doğum günü” düğmesi + Yaklaşan doğum günleri. Ay başlığına tıkla → ay/yıl seçici. Tekrarlayanlar sürüklenip taşınmaz. |
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
