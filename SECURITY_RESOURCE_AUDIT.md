# Railway maliyet, performans ve güvenlik denetimi

Tarih: 22 Ekim 2026. Kapsam: bu frontend deposunun kaynak kodu, bağımlılık ağacı, yerel production build ve yerel HTTP kontrolleri. İlk inceleme salt okunur yapıldı; düzeltmeler kullanıcının sonraki açık talebi üzerine uygulandı.

## Erişim ve kesinlik sınırları

- Railway hesabı, servis metrikleri, fatura kırılımı, production deployment imajı/logları ve backend kaynak kodu erişilebilir değil. Production'a veya veritabanına istek/test/müdahale yapılmadı.
- Bu depo Next.js App Router frontend'idir. İş API'si ayrı bir Railway adresine gider. Frontend'in gerçekten Railway'de mi Vercel'de mi yayınlandığı deployment kayıtları olmadan doğrulanamaz. Depodaki Vercel ayarları Railway servis ayarlarının kanıtı değildir.
- PostgreSQL sürücüsü/ORM, şema/migration, Redis/BullMQ, sunucu cron'u, queue consumer veya özel Node server bulunmadı. Dolayısıyla SQL sorguları, indeksler, pool büyüklüğü, backend IDOR/RBAC/CORS/rate limit ve worker davranışları denetlenmiş sayılmaz.
- Kaynak taraması yaklaşık 100 JS/TS dosyasını kapsadı; auth, servis katmanı, effect/timer, yazdırma, katalog worker'ı ve deployment kodları ayrıntılı incelendi. Statik inceleme memory leak veya istismar yaşanmadığını ispatlamaz.

## Önceliklendirilmiş bulgular

Satırlar ilk incelemedeki duruma aittir; değişiklikler sonrasında kayabilir. **Koşullu** kayıtlar gerçek production istismarı olarak yorumlanmamalıdır.

| Öncelik | Problem | Dosya / Satır (ilk inceleme) | Etki | Çözüm / Durum |
| --- | --- | --- | --- | --- |
| Kritik — koşullu | Next 14.2.35 için sonraki image optimizer RCE duyuruları mevcut | `package.json:26`, `next.config.mjs:35` | Uygun native decoder/OS ve saldırgan kontrollü görsel işleme koşullarında sunucuda kod yürütme | Next 15.5.28 ve sharp 0.35.5'e geçildi. Production OS/decoder ve eski deployment durumu doğrulanamadı. |
| Yüksek | API alanları doğrudan yazdırma HTML'ine ekleniyor | `src/app/dashboard/odemeler/page.tsx:460,591,615`; `src/app/dashboard/siparisler/page.tsx:3047,3164,3176,4007,4093` | Alanlar saldırganca kontrol edilebiliyorsa same-origin popup'ta XSS; JS erişimli tokenların çalınması riski | Yazdırma ve indirilen etiket HTML'i güncel DOMPurify ile temizleniyor; script, event attribute, tehlikeli URL ve aktif embed kaldırılıyor. Print butonu güvenli event listener kullanıyor. Saldırı yükleriyle test eklendi. |
| Yüksek — mimari takip | Bearer token ve kişisel kullanıcı/mağaza bilgileri localStorage/sessionStorage içinde | `src/app/context/AuthContext.tsx:113,119,213,221` | XSS varsa oturum ele geçirme; ortak cihazda kalıcı veri | Önceki depolama modunda kalan kimlik bilgileri yeni girişte temizleniyor. Tam çözüm için backend ile HttpOnly/Secure/SameSite cookie veya BFF oturum tasarımı gerekir; bu değişiklik yapılmadı. |
| Yüksek — koşullu | Yetki bilgisi storage'dan okunuyor, dashboard koruması client-side | `src/app/context/AuthContext.tsx:131`; `src/app/dashboard/layout.tsx:16` | UI manipüle edilebilir. Backend yalnızca bu UI kontrollerine güveniyorsa IDOR/yetki yükseltme mümkündür | Legacy ürün/fiyat istekleri oturum ve Authorization gerektiriyor. Backend RBAC ve kaynak sahipliği kontrolünün doğrulanması ayrıca gerekli; frontend bunu garanti edemez. |
| Yüksek — kapsamı sınırlı | Audit'te kritik jsPDF ve Swiper paket kayıtları | `package.json:25,32`; `src/features/catalog/renderCatalog.ts:87`; `src/components/BannerCarousel.tsx:41` | Paketlerde açık bulunması uygulamada aynı saldırı yolunun erişilebilir olduğunu tek başına göstermez | jsPDF 4.2.1, Swiper 12.2.0, DOMPurify 3.4.17. Mevcut katalog `output('arraybuffer')` ve JPEG byte verisi kullanıyor; savunmasız yeni pencere overload'ları, Node dosya yükleme ve dinamik Swiper config kullanılmıyordu. |
| Orta | Ürün listesi mount/filtre/sayfalama aynı isteği birden çok yerde başlatıyor | `src/app/dashboard/urunler/liste/page.tsx:227,260,282,291,413` | Backend istek/sorgu ve egress artışı; eski cevabın yeni filtreyi ezmesi | Tek veri çekme effect'i, stabil callback, AbortController ve eski cevap kontrolü. Mount ve sayfa geçişinde tek istek testi var. |
| Orta — takip | Stok filtresi tek istekte 1.000 ürün; düşük stok özeti tüm ürünleri alıyor | `src/app/dashboard/urunler/liste/page.tsx:308`; `src/app/dashboard/stok/page.tsx:243` | Büyük JSON, backend/DB/egress yükü ve tarayıcı RAM tüketimi; 1.000 üstünde sonuç eksik kalabilir | Stok ekranındaki çift ilk liste isteği kaldırıldı. Tam çözüm backend'de stock filtreli pagination ve düşük stok için top-10 endpoint'i gerektirir. Desteklenmeyen API parametresi uydurulmadı; mevcut sonuç anlamı korunuyor. |
| Orta | Site ayarları hata halinde her 15 sn tekrar; focus+visibility aynı anda istek başlatıyor | `src/app/context/SiteSettingsContext.tsx:49,70,92,96` | Kesintide tüm açık sekmelerden tekrar yükü, bağlantıda bekleyen istekler | Tek aktif istek, 15 sn timeout, 30 sn focus tazelik kontrolü, 15–120 sn artan hata beklemesi, gizli/offline sekmede retry durdurma ve unmount iptali. Manuel yenileme korunuyor. |
| Orta | Bildirim sayacı her oturum/sekmede dakikalık polling | `src/app/context/NotificationContext.tsx:216` | Aktif sekme başına saatte yaklaşık 60 sayım isteği; gerçek maliyet backend sayım sorgusuna bağlı | Gizli/offline sekmede polling durduruldu; görünür/online dönüşünde cooldown ile yenileniyor. Çoklu görünür sekmeler için koordinasyon ve backend sayım cache'i takip işi. |
| Orta | Muhasebe mount effect'leri aynı verileri yeniden getiriyor; ödeme filtresi mağaza listesini tekrar alıyor | `src/app/dashboard/muhasebe/page.tsx:246,264,272`; `src/app/dashboard/odemeler/page.tsx:186` | Fazladan muhasebe ve referans veri istekleri | Mükerrer mount çağrıları kaldırıldı; ödeme mağaza yüklemesi filtre/sayfalama effect'inden ayrıldı; muhasebe callback'ine tarih/token bağımlılıkları eklendi. |
| Orta | Fetch interceptor tekrar kurulabiliyor; herhangi bir `/api/` URL'sindeki 401 logout yapabiliyor | `src/services/api.ts:4153`; `src/app/context/AuthContext.tsx:166` | StrictMode/HMR'de wrapper birikimi; üçüncü taraf cevabının oturumu düşürmesi | Pencere başına tek kurulum ve tam origin/path kontrolü; test eklendi. |
| Orta | Yerel logout endpoint'i token'ı doğrulamadan başarılı cevap dönüyor; login proxy timeout içermiyor | `src/app/api/auth/logout/route.ts:7,18`; `src/app/api/auth/login/route.ts:10` | Sahte logout başarısı, yavaş upstream isteklerinin kaynak tutması | Logout gerçek backend'e iletiliyor. Login body akışında 8 KiB sınırı/şema kontrolü, upstream'de 15 sn timeout, redirect yasağı ve self-proxy döngü koruması var. Backend token iptali ayrıca doğrulanmalı. |
| Orta | Next image optimizasyonu geniş host listesi ve localhost içeriyor | `next.config.mjs:5,8,24,28,32,35` | İşleme CPU/RAM'i, cache/disk ve dolaylı SSRF yüzeyi | Localhost izni kaldırıldı; image cache 256 MiB ve kaynak görsel cevabı 12 MiB ile sınırlandı. Mevcut CDN hostları özellikleri korumak için tutuldu. Tenant/path allowlist daraltması asset envanteriyle ayrıca yapılmalı. |
| Orta | Eksik uygulama güvenlik başlıkları | `next.config.mjs` | Clickjacking, MIME sniffing ve referrer'dan reset token URL'si sızma yüzeyi | DENY frame policy, nosniff, no-referrer, Permissions-Policy ve kısıtlı CSP eklendi. CSP yalnızca object/base/frame alanlarını kısıtlar; script nonce tabanlı kapsamlı CSP değildir. |
| Düşük | Her barkodda yeni AudioContext açılıyor; kullanılmayan scan geçmişi büyüyor | `src/app/dashboard/teslimat/page.tsx:21,29,48,135` | Uzun tarama oturumlarında tarayıcı kaynak birikimi; doğrudan Railway RAM'i değildir | Ses bitince node'lar disconnect/context close; hiç okunmayan scan geçmişi kaldırıldı. Aktif siparişler korunuyor. |
| Düşük | Standalone output ile `next start` kullanımı, Node sürümü sabitlenmemiş | `next.config.mjs:3`; `package.json:8,35` | Gereksiz geniş runtime dağıtımı ve ortam sürüm farkı | Node 22.x, doğru tracing root; build public/static dosyalarını minimal server yanına hazırlar, start standalone server'ı çalıştırır. |

## RSC RCE: sürüme göre sonuç

Başlangıçta manifest, lockfile ve kurulu paketler Next **14.2.35**, React/React DOM **18.3.1** gösteriyordu. `src/app/layout.tsx` Server Component'tir; App Router kullanılıyor. Kaynakta `use server` Server Action bulunmadı. Server Action yazılmamış olması genel olarak RSC açıklarına bağışıklık sağlamaz.

- **CVE-2025-55182 / CVE-2025-66478 React2Shell:** resmi Next duyurusu 14.x stable sürümlerini etkilenmeyenler arasında sayıyor. Bu nedenle incelenen eski 14.2.35 kurulumu için bu spesifik RCE etkisi doğrulanmadı. Production'ın aynı commit/sürüm olduğu bilinmiyor.
- **Aralık 2025 RSC DoS:** Next 14 hattındaki yama 14.2.35 idi. Ancak bu, sonraki tüm açıkların giderildiği anlamına gelmez.
- **CVE-2026-23864:** resmi GitHub duyurusu Next 13/14 App Router'ı da etkilenen aralıkta listeliyor ve yüksek CPU, OOM veya çökme açıklıyor. Server Function giriş yolunun uygulamada erişilebilirliği dinamik saldırıyla test edilmedi. Eski sürüm güvenli varsayılmadı.
- **2026 image RCE duyuruları:** AVIF için GHSA-2xp9-vwfh-vxw4; glibc Linux üzerinde SVG/native decoder yolu için GHSA-2464-fhr4-w9xw. Sharp/native kitaplık ve platform önkoşulları nedeniyle production istismarı iddiası yok. Lockfile'da başlangıçta sharp bulunmaması ayrıca bu ayrımı gerektirir.
- Şimdiki hedef Next **15.5.28** ve sharp **0.35.5**, söz konusu güncel image yamalarını içerir; React 18 uygulama API'si korunuyor. Next 14 resmi destek dışında. Daha kapsamlı Next 16/React geçişi bu düzeltmeye eklenmedi.

Resmi kaynaklar:

- [React RSC RCE duyurusu](https://react.dev/blog/2025/12/03/critical-security-vulnerability-in-react-server-components)
- [Next React2Shell etkilenme ve ilk yamalı sürümler](https://nextjs.org/blog/CVE-2025-66478)
- [Aralık 2025 DoS ve kaynak ifşası ayrımı](https://nextjs.org/blog/security-update-2025-12-11)
- [Ocak 2026 RSC DoS](https://github.com/vercel/next.js/security/advisories/GHSA-h25m-26qc-wcjf)
- [AVIF image RCE](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4)
- [14 Ekim 2026 güvenlik sürümü](https://nextjs.org/blog/nextjs-security-update-october-14-2026)
- [Next destek politikası](https://nextjs.org/support-policy)
- [jsPDF HTML injection önkoşulları](https://github.com/parallax/jsPDF/security/advisories/GHSA-wfv2-pwc8-crg5)
- [Swiper prototype pollution](https://github.com/advisories/GHSA-hmx5-qpq5-p643)

## Bağımlılık denetimi

Başlangıç `npm audit`: **30 paket kaydı = 3 kritik + 22 yüksek + 5 orta**. Bu sayılar bağımsız, erişilebilir uygulama açıklarının sayısı değildir; üst paketler alt bağımlılıktan dolayı tekrar listelenir.

Kritik kayıtlar: `next@14.2.35`, `jspdf@3.0.1`, `swiper@12.0.1`.

Yüksek kayıtlar: `@next/eslint-plugin-next`, `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`, `@typescript-eslint/type-utils`, `@typescript-eslint/typescript-estree`, `@typescript-eslint/utils`, `brace-expansion`, `braces`, `browserslist`, `chokidar`, `eslint-config-next`, `fast-glob`, `flatted`, `glob`, `js-yaml`, `micromatch`, `minimatch`, `nanoid`, `picomatch`, `postcss`, `source-map-js`, `tailwindcss`. Bunların 19'u lockfile'da dev-only işaretliydi; kalanların runtime'a erişimi ayrıca kullanım yoluna bağlıdır.

Orta kayıtlar: `ajv`, `dompurify`, `fflate`, `postcss-selector-parser`, `yaml`.

Düzeltme sonrası:

- `npm audit --omit=dev`: **0 açık**.
- Tam `npm audit`: **7 yüksek, 0 kritik/orta**. Kalan paketler `braces`, `micromatch`, `fast-glob`, `chokidar`, `tailwindcss`, `@next/eslint-plugin-next`, `eslint-config-next`.
- Bu yedi kayıt aynı [braces stack-exhaustion duyurusunun](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) geliştirme bağımlılık zincirine yayılmasından geliyor. İnceleme anında uyumlu 3.x yaması yoktu. Tailwind 4 ve farklı lint zincirine geçmek ayrıca yapılandırma/arayüz regresyon testi gerektirir. Zorla major yükseltme veya sahte audit istisnası uygulanmadı. Güvenilmeyen repo/pattern'lerle CI çalıştırma riski devam eder.
- PostCSS 8.5.31 ve selector parser 7.1.7 override'ları kilitlendi; build/test bunlarla doğrulandı. jsPDF, DOMPurify, Swiper, Next ve sharp hedefleri manifestte açıkça sabitlenmiştir.

## Diğer güvenlik kontrolleri

- SQL injection: burada SQL/ORM yok. Backend sorguları için parametreli sorgular ve dinamik sıralama/filtre allowlist'i ayrıca incelenmeli.
- SSRF: login/logout upstream'i kullanıcı URL'sinden alınmıyor; redirect'ler engellendi. Image optimizer izin listesi ve native decoder ayrı yüzeylerdir. Katalog worker'ının görsel fetch'i tarayıcıda çalışır; tek başına sunucu SSRF kanıtı değildir.
- Command injection: uygulama runtime'ında child_process/exec/eval çağrısı bulunmadı. İlk audit'teki glob CLI açığı build aracına aitti; canlı API'de shell execution kanıtı yok.
- Path traversal: uygulamada kullanıcı yoluyla sunucu dosyası okuma kodu bulunmadı. jsPDF Node dosya yükleme açığı mevcut tarayıcı worker kullanımına eşitlenmedi.
- IDOR: URL/body içindeki store/user/order ID'leri backend'de token kimliği ve rolüyle kontrol edilmeli. UI'de düğme saklamak güvenlik sınırı değildir. Production verilerine farklı kullanıcılarla erişim denemesi yapılmadı.
- CORS/rate limiting: iş API'si ayrı serviste. Burada backend CORS veya dağıtık rate limit bulunduğu doğrulanamaz. Login, forgot/reset password, public contact ve pahalı statistics/image yollarında backend/gateway sınırları gerekir. Yerel proxy eklemeleri doğrudan backend URL'sini korumaz.
- Gizli bilgiler: taranan mevcut uygulama kaynaklarında sabit private key, JWT secret veya DB/Redis credential bulunmadı. Bu bir tam Git geçmişi/production secret audit'i değildir. API adresi public config'tir; `NEXT_PUBLIC_*` içine sır konmamalı. `.env*` ignore ediliyor; değerleri rapora alınmadı.
- `.env` içinde `NEXT_PUBLIC_API_URL` adı mevcutken kod `NEXT_PUBLIC_API_BASE_URL` okuyor. Çalışan platformdaki gerçek build değişkeni doğrulanmalı. Bu public değer build'de client bundle'a gömülür; yalnız runtime env değiştirmek eski bundle'ı düzeltmez. Yeni env anahtarı eklenmedi.
- Çoğu console çağrısı client kodunda; bunları doğrudan Railway log maliyeti saymak hatalıdır. Yerel auth route'larının hata loglarından hassas upstream detayları çıkarıldı. Backend request/response/token logging bilinmiyor.

## Railway tüketimi ve ölçüme bağlı optimizasyonlar

**20,40 USD'nin normal veya anormal olduğu yalnız rakamla belirlenemez.** Dönem, abonelik kredileri ve hangi servislerin dahil olduğu bilinmiyor. [Railway fiyatlandırması](https://railway.com/pricing) RAM süresi, CPU kullanımı, depolama ve egress'i ayrı ücretlendirir. Sürekli açık DB + API + frontend'in taban RAM tüketimi, çok az trafik varken de ücret oluşturabilir. Saldırı, miner veya restart loop yaşandığına dair burada kanıt yok.

| Öneri | Beklenen fayda | Yan etki / doğrulama gereği |
| --- | --- | --- |
| Servis bazında CPU/RAM/egress ayrımı; kullanılmayan preview/replica/worker incelemesi | En yüksek maliyet kalemini hedefler | Replica azaltmak kapasite/yedeklilik kaybı yaratabilir; metrik olmadan azaltılmamalı |
| Uygulanan istek birleştirme, iptal ve görünür sekme polling'i | API trafiğini ve dolaylı DB işini azaltır | Gizli sekmede bildirim güncellemesi dönüşe kadar gecikir; sunucu isteği iptal sinyalini işlemek zorunda değildir |
| Backend stok filtresi + pagination ve top-10 düşük stok endpoint'i | Büyük ürün cevabı, sıralama ve egress azalır | Backend sözleşmesi ve stok anlamı doğrulanmalı; sadece ilk sayfayı filtrelemek yanlış sonuç verir |
| PostgreSQL pool bütçesi: toplam replica × pool + worker bağlantıları rezerv ayrılmış max_connections altında | Bağlantı fırtınası ve idle bağlantı RAM'i azalır | Çok küçük pool kuyruk ve latency yaratır; PgBouncer transaction pooling prepared statement/transaction davranışını etkileyebilir |
| Slow query/pg_stat_statements ve EXPLAIN ile indeks seçimi | Gerçek pahalı sorguda CPU/IO azalır | İndeks yazma/depolama maliyeti getirir; bu depodan kesin indeks DDL'i üretilemez |
| Public site settings/collection için kısa TTL + ETag; kişisel istatistik için kullanıcı/rol/mağaza bazlı cache | Aynı sorgunun tekrarını azaltır | Stale veri ve cache invalidation; bakiye, ödeme ve yetkili fiyatlar ortak public cache'e konmamalı |
| İşlemsel bulk API ve bounded QR/image job concurrency | Sipariş başına ayrı çağrıların yükünü azaltır | Yetki, idempotency, transaction ve kısmi hata davranışı backend'de tasarlanmalı |
| Standalone runtime ve build/runtime ayrımı | Runtime image/dependency yüzeyi küçülür | Daha küçük image sürekli RAM'in aynı oranda azalması demek değildir; native sharp ve Node uyumu korunmalı |
| Uygulanan image cache/body sınırı; CDN'de uygun ebat üretimi | Decode RAM ve disk büyümesini sınırlar; CDN ile CPU/egress düşebilir | Cache eviction yeniden işleme getirir; 12 MiB üstü kaynak görseller optimize edilemez; dosya envanteriyle limit ayarlanmalı |
| Production'da yapılandırılmış ve örneklenmiş hata logları | Tekrarlı büyük log ve veri sızma yüzeyini azaltır | Aşırı örnekleme olay incelemesini zorlaştırır; token/şifre/body loglanmamalı |

Kesin tasarruf yüzdesi hesaplanmadı. Katalog PDF üretimi browser Web Worker'ındadır; Railway background worker'ı değildir. Worker sonlandırma, bitmap kapatma, URL revoke ve sınırlı image cache zaten mevcuttu. PDF'nin tamamı tarayıcı belleğinde tutulduğundan çok büyük seçimlerde istemci RAM'i yine büyür. Canvas/QR döngüleri kullanıcı işlemine bağlıdır; sürekli çalışan sunucu sonsuz döngüsü bulunmadı.

## Altı sorunun yanıtı ve production sırası

1. **Railway neden yüksek tüketebilir?** Sürekli servis RAM'i, DB, replica/preview sayısı, backend sorguları, görsel optimizasyonu, büyük JSON/egress ve gereksiz istekler adaydır. Bu depodan 20,40 USD'ye kesin neden atanamaz.
2. **Anormal CPU/RAM noktaları?** Mükerrer effect'ler, kesintide retry, polling, toplu ürün yükleme ve büyük image/PDF işleri. Tespit edilen AudioContext/unused scan birikimi browser tarafındaydı. Sunucu heap leak'i veya restart loop doğrulanmadı.
3. **React2Shell gerçekten etkiliyor muydu?** İncelenen Next 14 stable için Aralık 2025 RCE duyurusuna göre hayır. Sonraki DoS/image açıkları ayrı değerlendirilip framework/native bağımlılıklar yükseltildi. Eski production sürümü bilinmiyor.
4. **Kritik açık var mıydı?** Audit'te üç kritik paket kaydı vardı. Uygulamaya özgü somut öncelik XSS sink'leriydi; kritik native RCE önkoşulları production'da doğrulanamadı. Yeni production dependency audit'i sıfır; bu tüm uygulamanın güvenli olduğu garantisi değildir.
5. **En büyük maliyet avantajı?** Önce maliyeti taşıyan servis/replica ve DB sorgusunu ölçmek; ardından büyük ürün/istatistik cevapları ve tekrar çağrıları azaltmak. Frontend'e Redis eklemek ölçümsüz ek maliyet doğurabilir.
6. **Production'da sıra?** Bu dalı review + QA'dan geçirip kontrollü güvenlik sürümü yayınlamak; gerçek deploy sürümü/Node/native bağımlılıkları doğrulamak; sonra backend RBAC/IDOR/rate limit ve havuz/sorgu denetimi. Mevcut işlevler için giriş/çıkış, stok filtreleri, para birimi/tarih, ödeme yönlendirmesi, QR/fiş ve katalog QA gerekir. Daha önce savunmasız production ve istismar belirtisi saptanırsa log/artefakt koruma, izolasyon ve ilgili sırların rotasyonu ayrıca yapılmalı.

Maliyeti kapatmak için gerekli salt okunur veriler: fatura dönemi ve servis bazlı resource kırılımı; 7–30 günlük CPU/RAM/egress grafikleri; replica/region sayıları; start/build komutları ve Node sürümü; restart/OOM/exit logları; deploy commit ve lockfile sürümleri. Bunlar olmadan production tuning uygulanmadı.

## Doğrulama ve sınırlamalar

- `npm test`: 32 test. Gerçek React mount testleri ürün listesinde mount/sayfalama istek sayısını, site ayarlarının istek birleştirmesini ve gizli sekmede polling'in durmasını kontrol eder. XSS yükleri, auth body boyutu/şeması, upstream logout ve fetch origin kontrolleri de test edilir. Tüm API'ler mock'tur.
- `npm run build`: production derlemesi, TypeScript ve lint kontrolü; standalone asset hazırlığı dahil.
- ESLint: 0 hata; mevcut kodda 45 warning kalıyor (hook bağımlılıkları, native img ve kullanılmayan disable yorumları). Bunlar gizlenmedi ve lint/build devre dışı bırakılmadı. Tüm warning'lerin düzeltildiği iddia edilmez.
- `npm run start`: yalnızca 127.0.0.1:3100 üzerinde smoke test. Ana sayfa, login, dashboard, ürün listesi, stok, ödeme, katalog, reset-password ve asset GET'leri 200 döndü; browser JS bundle ve font dosyası standalone dağıtımından erişildi. Güvenlik başlıkları doğrulandı.
- Yerel JPEG optimize isteği 200; localhost remote image isteği 400; geçersiz login 400 ve yetkisiz logout 401. Gerçek backend'e auth isteği gönderilmedi.
- Authenticated browser QA, gerçek ödeme sağlayıcısı, gerçek veriyle stok/fiş çıktısı ve Railway Linux imajı burada test edilmedi. Native sharp yerel Windows Node 22 ortamında çalıştı; production platformu ayrıca doğrulanmalı.
- `git diff --check` temiz. Kod dalı production'a merge edilmedi; deploy komutu çalıştırılmadı. Push hedefi ayrı `codex/security-resource-hardening` dalıdır; platformun branch/preview otomasyonları bu depodan doğrulanamaz.
