# Adres Sistemi Değişiklikleri - Frontend Uyarlama Rehberi

## Özet
Backend'de adres sistemi kullanıcı tabanlı sistemden mağaza tabanlı sisteme geçirildi. Bu değişiklik nedeniyle frontend'de birçok alanda güncelleme gerekiyor.

## Ana Değişiklik
- **ESKİ:** Kullanıcıların `adres` alanı vardı 
- **YENİ:** Her mağazanın birden çok adresi olabilir, kullanıcılar sipariş verirken adres seçer

## Kaldırılan/Değiştirilen Alanlar

### 1. User Object'indeki Değişiklikler
```javascript
// ESKİ - bu alanlar artık null/undefined döner
user.adres // ❌ Artık null döner

// YENİ - mağaza adresleri için ayrı API kullanılmalı
GET /api/store-addresses // Mağaza adreslerini getirir
```

### 2. Login Response Değişikliği
```javascript
// ESKİ
{
  user: {
    // ... diğer alanlar
    adres: "kullanıcı adresi" // ❌ Artık null
  }
}

// YENİ
{
  user: {
    // ... diğer alanlar
    adres: null // Artık null döner
  }
}
```

### 3. Order/Receipt Response'larında
```javascript
// ESKİ
{
  kullanici: {
    adres: "kullanıcı adresi" // ❌ Artık null
  }
}

// YENİ  
{
  kullanici: {
    adres: null // Artık null döner
  }
}
```

## Yeni Store Address API'ları

### Mağaza Adreslerini Listeleme
```javascript
GET /api/store-addresses
// Query params (admin için): ?storeId=xxx

Response: {
  success: true,
  data: [
    {
      id: "address_uuid",
      store_id: "store_id",
      title: "Ana Mağaza", // "Depo", "Şube 1" vs.
      address: "Tam adres",
      city: "İstanbul",
      district: "Kadıköy", 
      postal_code: "34710",
      is_default: true,
      is_active: true,
      created_at: "2024-...",
      updated_at: "2024-..."
    }
  ]
}
```

### Yeni Adres Ekleme
```javascript
POST /api/store-addresses
Body: {
  title: "Ana Mağaza", // Zorunlu
  address: "Tam adres", // Zorunlu
  city: "İstanbul", // Opsiyonel
  district: "Kadıköy", // Opsiyonel
  postal_code: "34710", // Opsiyonel
  is_default: false, // Opsiyonel
  store_id: "store_id" // Sadece admin için
}
```

### Adres Güncelleme
```javascript
PUT /api/store-addresses/:addressId
Body: {
  title: "Güncel başlık",
  address: "Güncel adres",
  city: "Güncel şehir",
  district: "Güncel ilçe",
  postal_code: "Güncel posta kodu",
  is_default: true,
  is_active: true
}
```

### Varsayılan Adresi Değiştirme
```javascript
PUT /api/store-addresses/:addressId/set-default
```

### Adres Silme (Soft Delete)
```javascript
DELETE /api/store-addresses/:addressId
```

## Frontend'de Yapılması Gerekenler

### 1. Login/Profil Sayfalarında
- `user.adres` alanını kullanmayın
- Adres bilgisi gerekiyorsa `/api/store-addresses` API'sini çağırın
- Varsayılan adresi göstermek için `is_default: true` olan adresi kullanın

### 2. Sipariş Verme Sürecinde  
- ESKİ: Kullanıcının adres bilgisi otomatik kullanılıyordu
- YENİ: Kullanıcı mağaza adreslerinden birini seçmeli
- Adres seçimi için dropdown/liste komponenti ekleyin

### 3. Admin Panelinde
- Kullanıcı listesinde `adres` kolonunu kaldırın  
- Mağaza yönetim sayfasına "Adres Yönetimi" bölümü ekleyin
- Her mağaza için birden çok adres yönetimi yapılabilsin

### 4. Sipariş Detay Sayfalarında
- `order.delivery_address` artık kullanılmıyor
- Sipariş için seçilen adres bilgisi ayrı bir alan olarak gelecek (gelecekte eklenebilir)

### 5. Fiş/Fatura Çıktılarında  
- Kullanıcı adres bilgisi null olarak gelir
- Mağaza adres bilgisini kullanın

## Örnek Frontend Kodu

### Adres Listesi Getirme
```javascript
// Kullanıcının mağaza adreslerini getir
const getStoreAddresses = async () => {
  try {
    const response = await fetch('/api/store-addresses', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await response.json();
    
    if (data.success) {
      setAddresses(data.data);
      // Varsayılan adresi bul
      const defaultAddress = data.data.find(addr => addr.is_default);
      setSelectedAddress(defaultAddress);
    }
  } catch (error) {
    console.error('Adres listesi getirilemedi:', error);
  }
};
```

### Sipariş Verirken Adres Seçimi
```javascript
const OrderForm = () => {
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);

  return (
    <div>
      <label>Teslimat Adresi:</label>
      <select 
        value={selectedAddress?.id || ''} 
        onChange={(e) => {
          const addr = addresses.find(a => a.id === e.target.value);
          setSelectedAddress(addr);
        }}
      >
        <option value="">Adres Seçin</option>
        {addresses.map(addr => (
          <option key={addr.id} value={addr.id}>
            {addr.title} - {addr.address}
          </option>
        ))}
      </select>
      
      {/* Sipariş formu devamı */}
    </div>
  );
};
```

### Admin - Mağaza Adres Yönetimi
```javascript
const StoreAddressManagement = ({ storeId }) => {
  const [addresses, setAddresses] = useState([]);
  
  const loadAddresses = async () => {
    const response = await fetch(`/api/store-addresses?storeId=${storeId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    setAddresses(data.data);
  };
  
  const addAddress = async (addressData) => {
    await fetch('/api/store-addresses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ...addressData, store_id: storeId })
    });
    loadAddresses(); // Listeyi yenile
  };
  
  return (
    <div>
      <h3>Mağaza Adresleri</h3>
      {addresses.map(addr => (
        <div key={addr.id} className={addr.is_default ? 'default-address' : ''}>
          <h4>{addr.title} {addr.is_default && '(Varsayılan)'}</h4>
          <p>{addr.address}</p>
          <p>{addr.city} / {addr.district}</p>
          {/* Edit/Delete butonları */}
        </div>
      ))}
      {/* Yeni adres ekleme formu */}
    </div>
  );
};
```

## Kritik Noktalar

1. **Geriye Uyumluluk**: Eski `user.adres` alanı null döner, undefined kontrolü yapın
2. **Varsayılan Adres**: Her mağazanın en az bir varsayılan adresi olmalı
3. **Admin Yetkisi**: Admin farklı mağaza adreslerini yönetebilir
4. **Sipariş Süreci**: Artık adres seçimi zorunlu hale geldi
5. **Hata Kontrolü**: Adres bulunamadığında uygun hata mesajları gösterin

## Test Edilmesi Gerekenler

- [ ] Login sonrası user.adres null geldiğinde hata vermiyor mu?
- [ ] Adres listesi düzgün yükleniyor mu?  
- [ ] Sipariş verirken adres seçimi çalışıyor mu?
- [ ] Admin panelinde adres yönetimi çalışıyor mu?
- [ ] Varsayılan adres değiştirme çalışıyor mu?
- [ ] Adres silme işlemi çalışıyor mu?

Bu değişiklikler backend'de tamamlandı, frontend tarafında bu dokümana göre güncellemeler yapılmalıdır.