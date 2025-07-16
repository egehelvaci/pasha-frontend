# KULLANICI İSTATİSTİKLERİ API DOKÜMANTASYONU

Bu dokümantasyon, kullanıcıların kendi sipariş istatistiklerini görüntülemek için geliştirilmiş API endpoint'ini detaylandırmaktadır.

## 📊 Genel Bakış

**Endpoint:** `GET /api/my-statistics/user-stats`  
**Yetkilendirme:** JWT Token gerekli  
**Açıklama:** Kullanıcının kendi sipariş istatistiklerini, en çok sipariş verdiği ürünleri, koleksiyonları ve metrekare bilgilerini döndürür.

---

## 🔐 Yetkilendirme

Tüm isteklerde `Authorization` header'ı gereklidir:

```http
Authorization: Bearer <JWT_TOKEN>
```

---

## 📥 İstek Parametreleri

### Query Parametreleri

| Parametre | Tip | Zorunlu | Varsayılan | Açıklama |
|-----------|-----|---------|------------|----------|
| `period` | string | Hayır | `1_year` | İstatistik zaman aralığı |

#### Period Değerleri

- `1_month`: Son 1 ay
- `3_months`: Son 3 ay  
- `6_months`: Son 6 ay
- `1_year`: Son 1 yıl (varsayılan)

---

## 📤 Yanıt Formatı

### Başarılı Yanıt (200)

```json
{
  "success": true,
  "data": {
    "user_info": {
      "user_id": "abc-123-def-456",
      "name": "Ahmet Yılmaz",
      "email": "ahmet@example.com",
      "store_name": "ABC Halı Mağazası",
      "store_id": "store-uuid-123"
    },
    "order_statistics": {
      "total_orders": 25,
      "total_amount": 45750.50,
      "total_area_m2": 125.75,
      "pending_orders": 3,
      "confirmed_orders": 8,
      "delivered_orders": 12,
      "canceled_orders": 2,
      "completed_orders": 20
    },
    "top_products": [
      {
        "product_id": "product-uuid-1",
        "product_name": "Premium Anadolu Halısı",
        "collection_name": "Premium Koleksiyon",
        "product_image": "https://example.com/image1.jpg",
        "total_quantity": 15,
        "total_amount": 12500.75,
        "order_count": 8
      },
      {
        "product_id": "product-uuid-2",
        "product_name": "Klasik Şark Halısı",
        "collection_name": "Klasik Koleksiyon",
        "product_image": "https://example.com/image2.jpg",
        "total_quantity": 12,
        "total_amount": 9800.25,
        "order_count": 6
      }
    ],
    "top_collections": [
      {
        "collection_id": "collection-uuid-1",
        "collection_name": "Premium Koleksiyon",
        "collection_code": "PREM",
        "total_quantity": 35,
        "total_amount": 28500.00,
        "order_count": 12
      },
      {
        "collection_id": "collection-uuid-2",
        "collection_name": "Klasik Koleksiyon", 
        "collection_code": "KLAS",
        "total_quantity": 28,
        "total_amount": 22100.50,
        "order_count": 9
      }
    ],
    "monthly_orders": [
      {
        "month": "2024-01-01T00:00:00.000Z",
        "order_count": 5,
        "total_amount": 8750.25
      },
      {
        "month": "2023-12-01T00:00:00.000Z",
        "order_count": 3,
        "total_amount": 5200.00
      }
    ],
    "period_info": {
      "period": "1_year",
      "start_date": "2023-01-15T10:30:00.000Z",
      "end_date": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

### Hata Yanıtları

#### 401 - Yetkilendirme Hatası
```json
{
  "success": false,
  "message": "Kullanıcı kimlik doğrulaması gerekli"
}
```

#### 404 - Kullanıcı Bulunamadı
```json
{
  "success": false,
  "message": "Kullanıcı bulunamadı"
}
```

#### 500 - Sunucu Hatası
```json
{
  "success": false,
  "message": "İstatistikler alınırken bir hata oluştu"
}
```

---

## 📊 Veri Açıklamaları

### User Info
- **user_id**: Kullanıcının benzersiz ID'si
- **name**: Kullanıcının tam adı (ad + soyad)
- **email**: Kullanıcının e-posta adresi
- **store_name**: Bağlı olduğu mağazanın adı
- **store_id**: Mağazanın benzersiz ID'si

### Order Statistics
- **total_orders**: Toplam sipariş sayısı (iptal edilmeyenler)
- **total_amount**: Toplam harcama miktarı (TL)
- **total_area_m2**: Sipariş edilen toplam alan (metrekare)
- **pending_orders**: Bekleyen sipariş sayısı
- **confirmed_orders**: Onaylanmış sipariş sayısı
- **delivered_orders**: Teslim edilmiş sipariş sayısı
- **canceled_orders**: İptal edilmiş sipariş sayısı
- **completed_orders**: Tamamlanmış sipariş sayısı (onaylanmış + teslim edilmiş)

### Top Products (En Çok Sipariş Verilen Ürünler)
- En fazla sipariş verilen 10 ürün
- Ürün adı, koleksiyon bilgisi, toplam miktar ve tutar
- Sipariş sayısı bilgisi dahil

### Top Collections (En Çok Sipariş Verilen Koleksiyonlar)
- En fazla sipariş verilen 5 koleksiyon
- Koleksiyon adı, kodu, toplam miktar ve tutar
- Sipariş sayısı bilgisi dahil

### Monthly Orders (Aylık Sipariş Dağılımı)
- Son 12 ayın sipariş verileri
- Aylık sipariş sayısı ve toplam tutar
- Tarih azalan sırayla (en yeni önce)

---

## 🔧 Kullanım Örnekleri

### cURL ile Örnek İstek

```bash
# Son 1 yılın istatistikleri
curl -X GET "http://localhost:3001/api/my-statistics/user-stats" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Son 3 ayın istatistikleri
curl -X GET "http://localhost:3001/api/my-statistics/user-stats?period=3_months" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### JavaScript/Fetch ile Örnek İstek

```javascript
const getUserStats = async (period = '1_year') => {
  try {
    const token = localStorage.getItem('token')
    
    const response = await fetch(`/api/my-statistics/user-stats?period=${period}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    const data = await response.json()
    
    if (data.success) {
      console.log('Kullanıcı İstatistikleri:', data.data)
      return data.data
    } else {
      console.error('Hata:', data.message)
    }
  } catch (error) {
    console.error('İstek hatası:', error)
  }
}

// Kullanım
getUserStats('6_months').then(stats => {
  console.log(`Toplam Sipariş: ${stats.order_statistics.total_orders}`)
  console.log(`Toplam Harcama: ${stats.order_statistics.total_amount} TL`)
  console.log(`Toplam Alan: ${stats.order_statistics.total_area_m2} m²`)
})
```

### React Component Örneği

```jsx
import React, { useState, useEffect } from 'react'

const UserStatistics = () => {
  const [stats, setStats] = useState(null)
  const [period, setPeriod] = useState('1_year')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUserStats()
  }, [period])

  const fetchUserStats = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/my-statistics/user-stats?period=${period}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      const data = await response.json()
      if (data.success) {
        setStats(data.data)
      }
    } catch (error) {
      console.error('Veri alınırken hata:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div>Yükleniyor...</div>

  return (
    <div className="user-statistics">
      <div className="period-selector">
        <select value={period} onChange={(e) => setPeriod(e.target.value)}>
          <option value="1_month">Son 1 Ay</option>
          <option value="3_months">Son 3 Ay</option>
          <option value="6_months">Son 6 Ay</option>
          <option value="1_year">Son 1 Yıl</option>
        </select>
      </div>

      {stats && (
        <>
          <div className="user-info">
            <h2>{stats.user_info.name}</h2>
            <p>Mağaza: {stats.user_info.store_name}</p>
          </div>

          <div className="statistics-cards">
            <div className="stat-card">
              <h3>Toplam Sipariş</h3>
              <p>{stats.order_statistics.total_orders}</p>
            </div>
            
            <div className="stat-card">
              <h3>Toplam Harcama</h3>
              <p>{stats.order_statistics.total_amount.toLocaleString('tr-TR')} TL</p>
            </div>
            
            <div className="stat-card">
              <h3>Toplam Alan</h3>
              <p>{stats.order_statistics.total_area_m2} m²</p>
            </div>
          </div>

          <div className="top-products">
            <h3>En Çok Sipariş Verilen Ürünler</h3>
            <ul>
              {stats.top_products.map(product => (
                <li key={product.product_id}>
                  <strong>{product.product_name}</strong>
                  <span>Miktar: {product.total_quantity}</span>
                  <span>Tutar: {product.total_amount.toLocaleString('tr-TR')} TL</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="top-collections">
            <h3>En Çok Sipariş Verilen Koleksiyonlar</h3>
            <ul>
              {stats.top_collections.map(collection => (
                <li key={collection.collection_id}>
                  <strong>{collection.collection_name}</strong>
                  <span>Miktar: {collection.total_quantity}</span>
                  <span>Tutar: {collection.total_amount.toLocaleString('tr-TR')} TL</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}

export default UserStatistics
```

---

## 🚀 Frontend Entegrasyonu

### 1. Dashboard Widget'ı

```javascript
// Özet istatistikler için
const StatsSummary = ({ stats }) => (
  <div className="stats-summary">
    <div className="summary-item">
      <span className="label">Toplam Sipariş:</span>
      <span className="value">{stats.order_statistics.total_orders}</span>
    </div>
    <div className="summary-item">
      <span className="label">Toplam Harcama:</span>
      <span className="value">{stats.order_statistics.total_amount} TL</span>
    </div>
    <div className="summary-item">
      <span className="label">Bekleyen Sipariş:</span>
      <span className="value">{stats.order_statistics.pending_orders}</span>
    </div>
  </div>
)
```

### 2. Grafik Entegrasyonu (Chart.js örneği)

```javascript
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js'
import { Bar } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const MonthlyOrdersChart = ({ monthlyOrders }) => {
  const data = {
    labels: monthlyOrders.map(month => 
      new Date(month.month).toLocaleDateString('tr-TR', { year: 'numeric', month: 'short' })
    ),
    datasets: [
      {
        label: 'Sipariş Sayısı',
        data: monthlyOrders.map(month => month.order_count),
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
        borderColor: 'rgba(53, 162, 235, 1)',
        borderWidth: 1
      },
      {
        label: 'Toplam Tutar (TL)',
        data: monthlyOrders.map(month => month.total_amount),
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1,
        yAxisID: 'y1'
      }
    ]
  }

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top'
      },
      title: {
        display: true,
        text: 'Aylık Sipariş Dağılımı'
      }
    },
    scales: {
      y: {
        type: 'linear',
        display: true,
        position: 'left'
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        grid: {
          drawOnChartArea: false
        }
      }
    }
  }

  return <Bar data={data} options={options} />
}
```

---

## ✅ Best Practices

### 1. Veri Önbellekleme
```javascript
// LocalStorage ile önbellekleme
const CACHE_KEY = 'user_stats_cache'
const CACHE_DURATION = 5 * 60 * 1000 // 5 dakika

const getCachedStats = (period) => {
  const cached = localStorage.getItem(`${CACHE_KEY}_${period}`)
  if (cached) {
    const { data, timestamp } = JSON.parse(cached)
    if (Date.now() - timestamp < CACHE_DURATION) {
      return data
    }
  }
  return null
}

const setCachedStats = (period, data) => {
  localStorage.setItem(`${CACHE_KEY}_${period}`, JSON.stringify({
    data,
    timestamp: Date.now()
  }))
}
```

### 2. Error Handling
```javascript
const fetchUserStatsWithErrorHandling = async (period) => {
  try {
    const response = await fetch(`/api/my-statistics/user-stats?period=${period}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.message || 'Bilinmeyen hata')
    }

    return data.data
  } catch (error) {
    console.error('İstatistik veri hatası:', error)
    
    // Kullanıcıya uygun hata mesajı göster
    if (error.message.includes('401')) {
      alert('Oturum süreniz dolmuş, lütfen tekrar giriş yapın')
      // Logout işlemi...
    } else {
      alert('İstatistikler yüklenirken bir hata oluştu')
    }
    
    throw error
  }
}
```

### 3. Loading States
```javascript
const [loading, setLoading] = useState({
  initial: true,
  refresh: false
})

// İlk yükleme
useEffect(() => {
  fetchUserStats().finally(() => {
    setLoading(prev => ({ ...prev, initial: false }))
  })
}, [])

// Yenileme
const refreshStats = async () => {
  setLoading(prev => ({ ...prev, refresh: true }))
  try {
    await fetchUserStats()
  } finally {
    setLoading(prev => ({ ...prev, refresh: false }))
  }
}
```

---

## 🔧 Troubleshooting

### Yaygın Hatalar ve Çözümleri

#### 1. Token Süresi Dolmuş
**Hata:** 401 Unauthorized  
**Çözüm:** Token'ı yenile veya kullanıcıyı login sayfasına yönlendir

#### 2. Yavaş Yükleme
**Neden:** Büyük veri setleri  
**Çözüm:** 
- Sayfalama ekle
- Veri önbellekleme kullan
- Loading state'ler göster

#### 3. Boş Veri
**Neden:** Kullanıcının hiç siparişi yok  
**Çözüm:** Boş state UI'ı göster

```javascript
const EmptyState = () => (
  <div className="empty-state">
    <h3>Henüz sipariş vermediniz</h3>
    <p>İlk siparişinizi vermek için ürünleri incelemeye başlayın!</p>
    <button onClick={() => navigate('/products')}>
      Ürünleri İncele
    </button>
  </div>
)
```

---

## 📈 Performans Optimizasyonu

### 1. Database Indexleri
Aşağıdaki indexler performansı artırır:
```sql
-- Order tablosu için
CREATE INDEX idx_order_user_created_status ON "Order" (user_id, created_at, status);

-- OrderItem tablosu için  
CREATE INDEX idx_orderitem_order_product ON "OrderItem" (order_id, product_id);

-- cart_items tablosu için
CREATE INDEX idx_cartitems_cart_area ON cart_items (cart_id, area_m2);
```

### 2. Query Optimizasyonu
- Paralel sorgu yürütme kullanılıyor
- Gereksiz JOIN'ler minimize edildi
- Aggregate fonksiyonlar veritabanı seviyesinde yapılıyor

### 3. Frontend Optimizasyonu
- Veri önbellekleme (5 dakika)
- Lazy loading implementasyonu
- Component memoization

---

Bu API endpoint'i sayesinde kullanıcılar kendi sipariş geçmişlerini, harcama alışkanlıklarını ve en çok tercih ettikleri ürün/koleksiyonları kolayca görebilirler. Veriler gerçek zamanlı olarak hesaplanır ve floating point precision sorunları için number-utils modülü kullanılır. 