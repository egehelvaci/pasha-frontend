# İstatistik API Dokümantasyonu

Bu dokümantasyon, Pasha Backend projesindeki admin istatistik API'lerini açıklar.

## 📋 Genel Bilgiler

**Base URL:** 
- Lokal: `http://localhost:3001/api/admin/statistics`
- Canlı: `https://your-domain.com/api/admin/statistics`

**Kimlik Doğrulama:** Bearer Token (JWT) - Admin yetkisi gerekli

**Headers:**
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

## 📊 İstatistik API'leri

### 1. En Çok Sipariş Veren Mağazalar (TOP 5)

**GET** `/api/admin/statistics/top-stores`

Belirtilen zaman aralığında en çok sipariş veren ilk 5 mağazayı getirir.

**Query Parametreleri:**
- `period` (isteğe bağlı): Zaman aralığı
  - `1_month`: Son 1 ay
  - `3_months`: Son 3 ay  
  - `1_year`: Son 1 yıl (varsayılan)

**Örnek İstek:**
```bash
curl -X GET "http://localhost:3001/api/admin/statistics/top-stores?period=3_months" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Örnek Response (200):**
```json
{
  "success": true,
  "data": {
    "stores": [
      {
        "store_id": "550e8400-e29b-41d4-a716-446655440001",
        "store_name": "ABC Halı Mağazası",
        "user_name": "Ahmet Yılmaz",
        "order_count": 25,
        "total_amount": 45750.50,
        "period": "3_months"
      },
      {
        "store_id": "550e8400-e29b-41d4-a716-446655440002",
        "store_name": "XYZ Tekstil",
        "user_name": "Mehmet Özkan",
        "order_count": 18,
        "total_amount": 32100.25,
        "period": "3_months"
      },
      {
        "store_id": "550e8400-e29b-41d4-a716-446655440003",
        "store_name": "Modern Halı Dünyası",
        "user_name": "Fatma Demir",
        "order_count": 15,
        "total_amount": 28900.75,
        "period": "3_months"
      },
      {
        "store_id": "550e8400-e29b-41d4-a716-446655440004",
        "store_name": "Elit Halı Sarayı",
        "user_name": "Can Kaya",
        "order_count": 12,
        "total_amount": 22450.00,
        "period": "3_months"
      },
      {
        "store_id": "550e8400-e29b-41d4-a716-446655440005",
        "store_name": "Premium Tekstil",
        "user_name": "Ayşe Şahin",
        "order_count": 10,
        "total_amount": 19200.30,
        "period": "3_months"
      }
    ],
    "period": "3_months",
    "total_stores": 5
  }
}
```

---

### 2. En Çok Sipariş Edilen Ürünler (TOP 5)

**GET** `/api/admin/statistics/top-products`

Belirtilen zaman aralığında en çok sipariş edilen ilk 5 ürünü getirir.

**Query Parametreleri:**
- `period` (isteğe bağlı): Zaman aralığı
  - `1_month`: Son 1 ay
  - `3_months`: Son 3 ay
  - `1_year`: Son 1 yıl (varsayılan)

**Örnek İstek:**
```bash
curl -X GET "http://localhost:3001/api/admin/statistics/top-products?period=1_month" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Örnek Response (200):**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "product_id": "product-uuid-1",
        "product_name": "Premium Anadolu Halısı",
        "collection_name": "Geleneksel Koleksiyon",
        "product_image": "https://example.com/images/hali1.jpg",
        "total_quantity": 45,
        "total_amount": 22750.50,
        "period": "1_month"
      },
      {
        "product_id": "product-uuid-2",
        "product_name": "Modern Desenli Halı",
        "collection_name": "Modern Koleksiyon",
        "product_image": "https://example.com/images/hali2.jpg",
        "total_quantity": 38,
        "total_amount": 19450.75,
        "period": "1_month"
      },
      {
        "product_id": "product-uuid-3",
        "product_name": "Vintage Tarzı Halı",
        "collection_name": "Vintage Koleksiyon",
        "product_image": "https://example.com/images/hali3.jpg",
        "total_quantity": 32,
        "total_amount": 16800.00,
        "period": "1_month"
      },
      {
        "product_id": "product-uuid-4",
        "product_name": "Lüks Yün Halı",
        "collection_name": "Premium Koleksiyon",
        "product_image": "https://example.com/images/hali4.jpg",
        "total_quantity": 28,
        "total_amount": 15750.25,
        "period": "1_month"
      },
      {
        "product_id": "product-uuid-5",
        "product_name": "Çocuk Odası Halısı",
        "collection_name": "Çocuk Koleksiyon",
        "product_image": "https://example.com/images/hali5.jpg",
        "total_quantity": 25,
        "total_amount": 8750.50,
        "period": "1_month"
      }
    ],
    "period": "1_month",
    "total_products": 5
  }
}
```

---

### 3. Zaman Bazlı Sipariş Metrekare Grafiği

**GET** `/api/admin/statistics/orders-over-time`

Belirtilen zaman aralığında sipariş verilerini gruplandırarak grafik için veri sağlar.

**Query Parametreleri:**
- `period` (isteğe bağlı): Zaman aralığı
  - `1_month`: Son 1 ay
  - `3_months`: Son 3 ay
  - `1_year`: Son 1 yıl (varsayılan)
- `groupBy` (isteğe bağlı): Gruplandırma türü
  - `day`: Günlük
  - `week`: Haftalık
  - `month`: Aylık (varsayılan)

**Örnek İstek:**
```bash
curl -X GET "http://localhost:3001/api/admin/statistics/orders-over-time?period=3_months&groupBy=month" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Örnek Response (200):**
```json
{
  "success": true,
  "data": {
    "chart_data": [
      {
        "time_period": "2024-01",
        "order_count": 45,
        "total_amount": 67500.75,
        "total_area_m2": 1250.5
      },
      {
        "time_period": "2024-02",
        "order_count": 52,
        "total_amount": 78650.25,
        "total_area_m2": 1456.8
      },
      {
        "time_period": "2024-03",
        "order_count": 38,
        "total_amount": 55200.50,
        "total_area_m2": 1098.3
      }
    ],
    "period": "3_months",
    "group_by": "month",
    "start_date": "2023-12-15T10:30:00.000Z",
    "end_date": "2024-03-15T10:30:00.000Z"
  }
}
```

---

### 4. Toplam İstatistikler

**GET** `/api/admin/statistics/totals`

Belirtilen zaman aralığında toplam istatistikleri getirir.

**Query Parametreleri:**
- `period` (isteğe bağlı): Zaman aralığı
  - `1_month`: Son 1 ay
  - `3_months`: Son 3 ay
  - `1_year`: Son 1 yıl (varsayılan)

**Örnek İstek:**
```bash
curl -X GET "http://localhost:3001/api/admin/statistics/totals?period=1_year" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Örnek Response (200):**
```json
{
  "success": true,
  "data": {
    "total_orders": 245,
    "total_amount": 387650.75,
    "total_product_quantity": 1847,
    "total_area_m2": 12567.8,
    "period": "1_year",
    "start_date": "2023-03-15T10:30:00.000Z",
    "end_date": "2024-03-15T10:30:00.000Z"
  }
}
```

---

## 📈 Grafik Kullanım Örnekleri

### JavaScript ile Veri Çekme

```javascript
// En çok sipariş veren mağazalar
async function getTopStores(period = '3_months') {
  const response = await fetch(`/api/admin/statistics/top-stores?period=${period}`, {
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    }
  });
  const data = await response.json();
  return data.data.stores;
}

// Zaman bazlı grafik verisi
async function getOrdersOverTime(period = '1_year', groupBy = 'month') {
  const response = await fetch(`/api/admin/statistics/orders-over-time?period=${period}&groupBy=${groupBy}`, {
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    }
  });
  const data = await response.json();
  return data.data.chart_data;
}
```

### Chart.js Entegrasyonu

```javascript
// Metrekare bazlı çizgi grafiği
async function createAreaChart() {
  const chartData = await getOrdersOverTime('1_year', 'month');
  
  const ctx = document.getElementById('areaChart').getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: chartData.map(item => item.time_period),
      datasets: [{
        label: 'Toplam Metrekare (m²)',
        data: chartData.map(item => item.total_area_m2),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Aylık Toplam Metrekare Grafiği'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Metrekare (m²)'
          }
        }
      }
    }
  });
}

// Top mağazalar bar grafiği
async function createStoresChart() {
  const storesData = await getTopStores('3_months');
  
  const ctx = document.getElementById('storesChart').getContext('2d');
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: storesData.map(store => store.store_name),
      datasets: [{
        label: 'Sipariş Sayısı',
        data: storesData.map(store => store.order_count),
        backgroundColor: [
          'rgba(255, 99, 132, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 205, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(153, 102, 255, 0.8)'
        ]
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'En Çok Sipariş Veren Mağazalar (TOP 5)'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Sipariş Sayısı'
          }
        }
      }
    }
  });
}
```

---

## ⚠️ Hata Durumları

### Yetkisiz Erişim (401)
```json
{
  "success": false,
  "message": "Yetkisiz erişim"
}
```

### Yetki Yetersiz (403)
```json
{
  "success": false,
  "message": "Bu işlem için admin yetkisi gerekli"
}
```

### Sunucu Hatası (500)
```json
{
  "success": false,
  "message": "İstatistikler alınırken bir hata oluştu"
}
```

---

## 🔧 Test Örnekleri

### Tüm İstatistikleri Test Et

```bash
# Admin token al
ADMIN_TOKEN=$(curl -X POST "http://localhost:3001/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}' | jq -r '.data.token')

# En çok sipariş veren mağazalar
curl -X GET "http://localhost:3001/api/admin/statistics/top-stores?period=1_year" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq

# En çok sipariş edilen ürünler
curl -X GET "http://localhost:3001/api/admin/statistics/top-products?period=3_months" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq

# Zaman bazlı grafik verisi
curl -X GET "http://localhost:3001/api/admin/statistics/orders-over-time?period=1_year&groupBy=month" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq

# Toplam istatistikler
curl -X GET "http://localhost:3001/api/admin/statistics/totals?period=1_year" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq
```

Bu API'ler admin panelinizdeki dashboard'da grafikler oluşturmak için gerekli tüm veriyi sağlar. 