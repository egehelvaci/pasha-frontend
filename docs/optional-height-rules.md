# Özel yükseklik kuralları

Özel yükseklikte yalnızca genişlik tanımlanır. `isOptionalHeight: true` seçildiğinde boy alanı gizlenir ve API isteğine `height` eklenmez. Gerçek boy sipariş sırasında girilir. Sabit ebatta genişlik ve boy zorunludur.

Backend'in bu sözleşmeyi destekleyen sürümüyle birlikte yayınlanmalıdır. Yeni kural oluşturma, mevcut kurala ebat ekleme ve ebat düzenleme ekranları güncellendi.

## Doğrulama

- `npm run build`: başarılı; TypeScript ve Next derlemesi geçti.
- Üretim sunucusu yerelde başlatıldı; `/dashboard/urun-kurallari/ekle` HTTP 200 döndü.
- Backend testlerinde boy içermeyen create/add/update istekleri, sabit ebat zorunluluğu ve eski üst sınırı aşan özel kesimde m²/fiyat hesabı kontrol edildi.

Tarayıcıda kontrol edilecek akış: yeni kuralda genişlik girip “Boy İsteğe Bağlı” seçin; boy alanının kaybolduğunu ve Network isteğinde height bulunmadığını doğrulayın. Aynı işlemi mevcut kuraldaki ebat ekleme/düzenleme pencerelerinde deneyin. Seçimi kaldırınca boy alanı geri gelmeli ve pozitif değer olmadan kayıt yapılmamalıdır. Aynı kurala sabit ebat ve özel genişlik birlikte eklenebilmelidir.
