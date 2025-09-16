# Token Süresi Dolma Yönetimi

Bu sistem, token süresi dolduğunda (403 hatası) kullanıcıyı otomatik olarak logout yapıp login sayfasına yönlendirir.

## Nasıl Çalışır

1. **AuthContext**: `handleTokenExpiry` fonksiyonu token süresi dolduğunda çağrılır
2. **API Service**: Global error handler tüm 403 hatalarını yakalar
3. **Otomatik Logout**: Kullanıcı bilgileri temizlenir ve login sayfasına yönlendirilir
4. **Uyarı Mesajı**: "Oturum süreniz dolmuştur. Lütfen tekrar giriş yapınız."

## Yeni API Çağrıları İçin

Yeni API çağrıları yaparken `apiRequest` wrapper'ını kullanın:

```typescript
import { apiRequest } from '@/services/api';

// Örnek kullanım
const response = await apiRequest('/api/products', {
  method: 'GET'
});

if (response.ok) {
  const data = await response.json();
  // İşlem başarılı
} else {
  // Hata durumu - 403 ise otomatik logout yapılacak
}
```

## Mevcut Fetch Çağrılarını Güncelleme

Mevcut `fetch` çağrılarını `apiRequest` ile değiştirin:

```typescript
// Eski
const response = await fetch(url, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

// Yeni
const response = await apiRequest(url, {
  method: 'GET'
});
```

## Özellikler

- ✅ 403 hatalarında otomatik logout
- ✅ Kullanıcı bilgilerinin temizlenmesi
- ✅ Login sayfasına yönlendirme
- ✅ Uyarı mesajı gösterimi
- ✅ localStorage ve sessionStorage temizleme
