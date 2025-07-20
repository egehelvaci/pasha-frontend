'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { useToken } from '@/app/hooks/useToken';

interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: string;
  total_price: string;
  has_fringe: boolean;
  width: string;
  height: string;
  cut_type: string;
  product: {
    productId: string;
    name: string;
    productImage: string;
    productCode: string;
    collection: {
      collectionId: string;
      name: string;
    };
  };
}

interface User {
  userId: string;
  name: string;
  surname: string;
  email: string;
  phone: string;
  Store: {
    store_id: string;
    kurum_adi: string;
    vergi_numarasi: string;
    vergi_dairesi: string;
    telefon: string;
    eposta: string;
    adres: string;
    acik_hesap_tutari: string;
    limitsiz_acik_hesap: boolean;
  };
}

interface Order {
  id: string;
  user_id: string;
  cart_id: number;
  total_price: string;
  status: string;
  delivery_address: string;
  store_name: string;
  store_tax_number: string;
  store_tax_office: string;
  store_phone: string;
  store_email: string;
  store_fax: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  user?: User;
  items: OrderItem[];
  cart: {
    id: number;
    created_at: string;
    updated_at: string;
  };
  qr_codes?: {
    id: string;
    order_id: string;
    order_item_id: string;
    product_id: string;
    qr_code: string;
    qrCodeImageUrl: string;
    scan_count: number;
    required_scans: number;
    last_scan_at: string;
    is_scanned: boolean;
    scanned_at: string;
    created_at: string;
    order_item: {
      id: string;
      order_id: string;
      product_id: string;
      quantity: number;
      unit_price: string;
      total_price: string;
      has_fringe: boolean;
      width: string;
      height: string;
      cut_type: string;
      product: {
        productId: string;
        name: string;
        productImage: string;
        collectionId: string;
        createdAt: string;
        updatedAt: string;
        rule_id: number;
      };
    };
    product: {
      productId: string;
      name: string;
      productImage: string;
      collectionId: string;
      createdAt: string;
      updatedAt: string;
      rule_id: number;
    };
  }[];
  order_summary?: {
    total_items: number;
    total_area_m2: number;
    items_with_fringe: number;
    unique_products: number;
  };
  qr_stats?: {
    total: number;
    scanned: number;
    pending: number;
    scanned_percentage: number;
  };
  customer_info?: {
    name: string;
    email: string;
    phone: string;
    store_name: string;
    store_tax_number: string;
    store_address: string;
  };
  financial_info?: {
    total_price: number;
    store_balance: number;
    unlimited_account: boolean;
  };
}

interface OrdersResponse {
  orders: Order[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters: {
    status?: string;
    search?: string;
  };
}

interface OrderStats {
  total: number;
  pending: number;
  confirmed: number;
  shipped: number;
  delivered: number;
  canceled: number;
}

const statusLabels: { [key: string]: string } = {
  'PENDING': 'Beklemede',
  'CONFIRMED': 'Onaylandı',
  'SHIPPED': 'Teslimatta',
  'DELIVERED': 'Teslim Edildi',
  'CANCELED': 'İptal Edildi'
};

const statusColors: { [key: string]: string } = {
  'PENDING': 'bg-yellow-100 text-yellow-800',
  'CONFIRMED': 'bg-blue-100 text-[#00365a]',
  'SHIPPED': 'bg-purple-100 text-purple-800',
  'DELIVERED': 'bg-green-100 text-green-800',
  'CANCELED': 'bg-red-100 text-red-800'
};

const Siparisler = () => {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const token = useToken();
  const router = useRouter();
  const [ordersData, setOrdersData] = useState<OrdersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [orderStats, setOrderStats] = useState<OrderStats | null>(null);
  
  // Filtreleme ve sayfalama
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [tempSearchQuery, setTempSearchQuery] = useState('');

  // Sipariş istatistiklerini hesapla
  const calculateOrderStats = useCallback((orders: Order[]): OrderStats => {
    const stats = {
      total: orders.length,
      pending: 0,
      confirmed: 0,
      shipped: 0,
      delivered: 0,
      canceled: 0
    };

    orders.forEach(order => {
      switch (order.status) {
        case 'PENDING':
          stats.pending++;
          break;
        case 'CONFIRMED':
          stats.confirmed++;
          break;
        case 'SHIPPED':
          stats.shipped++;
          break;
        case 'DELIVERED':
          stats.delivered++;
          break;
        case 'CANCELED':
          stats.canceled++;
          break;
      }
    });

    return stats;
  }, []);

  // Siparişleri getir
  const fetchOrders = useCallback(async (page: number = 1, status: string = '', search: string = '') => {
    // AuthContext yüklemesi tamamlanmadıysa fetch yapma
    if (authLoading) {
      return;
    }

    try {
      setLoading(true);
      setError(''); // Clear previous errors
      const authToken = token;
      if (!authToken) {
        router.push('/');
        return;
      }

      // Admin kontrolü yaparak farklı endpoint'ler kullan
      let endpoint: string;
      let queryParams = new URLSearchParams();

      if (status) queryParams.append('status', status);
      if (search) queryParams.append('search', search);

      // Admin ise sadece admin/orders endpoint'ini kullan, my-orders asla kullanma
      if (isAdmin) {
        endpoint = `https://pasha-backend-production.up.railway.app/api/admin/orders?${queryParams.toString()}`;
      } else {
        // Admin değilse my-orders endpoint'ini kullan - kesinlikle admin endpoint kullanma
        endpoint = `https://pasha-backend-production.up.railway.app/api/orders/my-orders?${queryParams.toString()}`;
        
        // Güvenlik kontrolü: Admin olmayan kullanıcılar asla admin endpoint'i kullanmamalı
        if (endpoint.includes('/admin/')) {
          throw new Error('Yetkisiz erişim: Admin endpoint\'i kullanılamaz');
        }
      }

      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Siparişler alınamadı');
      }

      const data = await response.json();
      if (data.success) {
        setOrdersData(data.data);
        
        // Admin için istatistikleri hesapla
        if (isAdmin && data.data.orders) {
          const stats = calculateOrderStats(data.data.orders);
          setOrderStats(stats);
        }
      } else {
        throw new Error(data.message || 'Siparişler alınamadı');
      }
    } catch (error: any) {

      setError('Siparişler alınamadı. Lütfen tekrar deneyiniz.');
    } finally {
      setLoading(false);
    }
  }, [router, isAdmin, calculateOrderStats, authLoading, token]);

  useEffect(() => {
    // AuthContext yüklemesi tamamlanana kadar bekle
    if (authLoading) {
      return;
    }
    
    fetchOrders(currentPage, statusFilter, searchQuery);
  }, [fetchOrders, currentPage, statusFilter, searchQuery, authLoading]);

  // Sipariş detayını getir
  const handleViewOrderDetail = async (orderId: string) => {
    try {
      const authToken = token;
      let endpoint: string;
      
      // Admin ise sadece admin/orders endpoint'ini kullan
      if (isAdmin) {
        endpoint = `https://pasha-backend-production.up.railway.app/api/admin/orders/${orderId}`;

      } else {
        // Admin değilse normal orders endpoint'ini kullan - kesinlikle admin endpoint kullanma
        endpoint = `https://pasha-backend-production.up.railway.app/api/orders/${orderId}`;

        
        // Güvenlik kontrolü: Admin olmayan kullanıcılar asla admin endpoint'i kullanmamalı
        if (endpoint.includes('/admin/')) {
          throw new Error('Yetkisiz erişim: Admin endpoint\'i kullanılamaz');
        }
      }

      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Sipariş detayı alınamadı');
      }

      const data = await response.json();
      if (data.success) {
        setSelectedOrder(data.data);
      } else {
        throw new Error(data.message || 'Sipariş detayı alınamadı');
      }
    } catch (error: any) {

      alert('Sipariş detayı alınamadı. Lütfen tekrar deneyiniz.');
    }
  };

  // QR kod oluşturma fonksiyonu
  const generateQRCodes = async (orderId: string) => {
    try {
      const authToken = token;
      const response = await fetch(`https://pasha-backend-production.up.railway.app/api/admin/orders/${orderId}/generate-qr-images`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('QR kodları oluşturulamadı');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'QR kodları oluşturulamadı');
      }


      return data.data;
    } catch (error: any) {
      console.error('QR kod oluşturma hatası:', error);
      throw error;
    }
  };



  // Admin için sipariş durumu güncelleme
  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    if (!isAdmin) return;
    
    setUpdatingStatus(true);
    try {
      const authToken = token;
      
      // İlk olarak sipariş durumunu güncelle
      const response = await fetch(`https://pasha-backend-production.up.railway.app/api/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        throw new Error('Sipariş durumu güncellenemedi');
      }

      const data = await response.json();
      if (data.success) {
        // Eğer sipariş CONFIRMED durumuna geçiyorsa QR kodları oluştur
        if (newStatus === 'CONFIRMED') {
          try {
            await generateQRCodes(orderId);
            // QR kodları oluşturulduktan sonra alert mesajını güncelle
            alert('Sipariş durumu güncellendi ve QR kodları oluşturuldu!');
          } catch (qrError: any) {
            // QR kod hatası sipariş güncellemeyi engellemez, sadece uyarı verelim
            alert('Sipariş durumu güncellendi ancak QR kodları oluşturulurken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
          }
        } else {
          // Diğer durumlarda normal alert mesajı
          alert('Sipariş durumu başarıyla güncellendi!');
        }

        // Siparişleri yeniden yükle
        await fetchOrders(currentPage, statusFilter, searchQuery);
        // Modal'daki sipariş detayını da güncelle
        if (selectedOrder && selectedOrder.id === orderId) {
          await handleViewOrderDetail(orderId);
        }
      } else {
        throw new Error(data.message || 'Sipariş durumu güncellenemedi');
      }
    } catch (error: any) {
      console.error('Sipariş durumu güncellenirken hata:', error);
      alert('Sipariş durumu güncellenirken bir hata oluştu. Lütfen tekrar deneyiniz.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Arama fonksiyonu
  const handleSearch = () => {
    setSearchQuery(tempSearchQuery);
    setCurrentPage(1);
  };

  // Filtreleme fonksiyonu
  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  // Sayfa değiştirme
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (loading || authLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Hata Oluştu</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Başlık */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {isAdmin ? 'Tüm Siparişler' : 'Siparişlerim'}
          </h1>
          <p className="text-gray-600">
            {isAdmin 
              ? 'Sistemdeki tüm siparişleri görüntüleyin ve yönetin.' 
              : 'Vermiş olduğunuz siparişlerin listesi.'
            }
          </p>
        </div>

        {/* Admin İstatistikleri */}
        {isAdmin && orderStats && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
            <button
              onClick={() => handleStatusFilter('')}
              className={`p-4 rounded-lg border transition-all duration-200 text-left hover:shadow-md ${
                statusFilter === '' 
                  ? 'bg-gray-100 border-gray-300 shadow-md' 
                  : 'bg-white border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="text-2xl font-bold text-gray-900">{orderStats.total}</div>
              <div className="text-sm text-gray-500">Toplam</div>
            </button>
            <button
              onClick={() => handleStatusFilter('PENDING')}
              className={`p-4 rounded-lg border transition-all duration-200 text-left hover:shadow-md ${
                statusFilter === 'PENDING' 
                  ? 'bg-yellow-100 border-yellow-300 shadow-md' 
                  : 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100'
              }`}
            >
              <div className="text-2xl font-bold text-yellow-800">{orderStats.pending}</div>
              <div className="text-sm text-yellow-600">Beklemede</div>
            </button>
            <button
              onClick={() => handleStatusFilter('CONFIRMED')}
              className={`p-4 rounded-lg border transition-all duration-200 text-left hover:shadow-md ${
                statusFilter === 'CONFIRMED' 
                  ? 'bg-blue-100 border-blue-300 shadow-md' 
                  : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
              }`}
            >
              <div className="text-2xl font-bold text-[#00365a]">{orderStats.confirmed}</div>
              <div className="text-sm text-[#00365a]">Onaylandı</div>
            </button>
            <button
              onClick={() => handleStatusFilter('SHIPPED')}
              className={`p-4 rounded-lg border transition-all duration-200 text-left hover:shadow-md ${
                statusFilter === 'SHIPPED' 
                  ? 'bg-purple-100 border-purple-300 shadow-md' 
                  : 'bg-purple-50 border-purple-200 hover:bg-purple-100'
              }`}
            >
              <div className="text-2xl font-bold text-purple-800">{orderStats.shipped}</div>
              <div className="text-sm text-purple-600">Teslimatta</div>
            </button>
            <button
              onClick={() => handleStatusFilter('DELIVERED')}
              className={`p-4 rounded-lg border transition-all duration-200 text-left hover:shadow-md ${
                statusFilter === 'DELIVERED' 
                  ? 'bg-green-100 border-green-300 shadow-md' 
                  : 'bg-green-50 border-green-200 hover:bg-green-100'
              }`}
            >
              <div className="text-2xl font-bold text-green-800">{orderStats.delivered}</div>
              <div className="text-sm text-green-600">Teslim</div>
            </button>
            <button
              onClick={() => handleStatusFilter('CANCELED')}
              className={`p-4 rounded-lg border transition-all duration-200 text-left hover:shadow-md ${
                statusFilter === 'CANCELED' 
                  ? 'bg-red-100 border-red-300 shadow-md' 
                  : 'bg-red-50 border-red-200 hover:bg-red-100'
              }`}
            >
              <div className="text-2xl font-bold text-red-800">{orderStats.canceled}</div>
              <div className="text-sm text-red-600">İptal</div>
            </button>
          </div>
        )}

        {/* Filtreleme ve Arama */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Arama */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isAdmin ? 'Mağaza/Kullanıcı Ara' : 'Ara'}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tempSearchQuery}
                  onChange={(e) => setTempSearchQuery(e.target.value)}
                  placeholder={isAdmin ? "Mağaza adı, kullanıcı adı veya email..." : "Ara..."}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <button
                  onClick={handleSearch}
                  className="px-4 py-2 bg-[#00365a] text-white rounded-lg hover:bg-[#004170] transition-colors"
                >
                  Ara
                </button>
              </div>
            </div>

            {/* Durum Filtresi */}
            <div className="md:w-64">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sipariş Durumu
              </label>
              <select
                value={statusFilter}
                onChange={(e) => handleStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Tüm Durumlar</option>
                <option value="PENDING">Beklemede</option>
                <option value="CONFIRMED">Onaylandı</option>
                <option value="SHIPPED">Teslimatta</option>
                <option value="DELIVERED">Teslim Edildi</option>
                <option value="CANCELED">İptal Edildi</option>
              </select>
            </div>
          </div>

          {/* Aktif Filtreler */}
          {(statusFilter || searchQuery) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {statusFilter && (
                <div className="flex items-center bg-blue-100 text-[#00365a] px-3 py-1 rounded-full text-sm">
                  Durum: {statusLabels[statusFilter]}
                  <button
                    onClick={() => handleStatusFilter('')}
                    className="ml-2 text-[#00365a] hover:text-[#004170]"
                  >
                    ×
                  </button>
                </div>
              )}
              {searchQuery && (
                <div className="flex items-center bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                  Arama: {searchQuery}
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setTempSearchQuery('');
                    }}
                    className="ml-2 text-green-600 hover:text-green-800"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Siparişler Listesi */}
        {!ordersData || ordersData.orders.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {statusFilter || searchQuery ? 'Filtreye uygun sipariş bulunamadı' : 'Henüz sipariş yok'}
            </h3>
            <p className="text-gray-600 mb-6">
              {statusFilter || searchQuery 
                ? 'Farklı filtreler deneyin veya filtreleri temizleyin.'
                : isAdmin 
                ? 'Henüz sisteme hiç sipariş girilmemiş.'
                : 'Henüz bir sipariş vermemişsiniz.'
              }
            </p>
            {!isAdmin && !statusFilter && !searchQuery && (
              <Link
                href="/dashboard/sepetim"
                className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Alışverişe Başla
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {ordersData.orders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          Sipariş #{order.id.slice(0, 8)}...
                        </h3>
                        <p className="text-sm text-gray-500">
                          {new Date(order.created_at).toLocaleDateString('tr-TR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusColors[order.status]}`}>
                        {statusLabels[order.status]}
                      </span>
                    </div>

                    {/* Admin için müşteri bilgileri */}
                    {isAdmin && order.user && (
                      <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Müşteri Bilgileri</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Ad Soyad:</span>
                            <span className="ml-2 text-gray-900">{order.user.name} {order.user.surname}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">E-posta:</span>
                            <span className="ml-2 text-gray-900">{order.user.email}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Telefon:</span>
                            <span className="ml-2 text-gray-900">{order.user.phone}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Mağaza:</span>
                            <span className="ml-2 text-gray-900">{order.user.Store?.kurum_adi || order.store_name}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Mağaza:</span>
                        <span className="ml-2 text-gray-900">{order.store_name}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Ürün Sayısı:</span>
                        <span className="ml-2 text-gray-900">{order.items.length} adet</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Toplam Tutar:</span>
                        <span className="ml-2 font-semibold text-[#00365a]">
                          {parseFloat(order.total_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                        </span>
                      </div>
                    </div>

                    {order.notes && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <span className="text-sm text-yellow-800">
                          <strong>Not:</strong> {order.notes}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 lg:mt-0 lg:ml-6 flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={() => handleViewOrderDetail(order.id)}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                    >
                      Detayları Gör
                    </button>

                    {/* Admin için durum güncelleme butonları */}
                    {isAdmin && (
                      <div className="flex flex-col sm:flex-row gap-2">
                        {order.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleUpdateOrderStatus(order.id, 'CONFIRMED')}
                              disabled={updatingStatus}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm disabled:opacity-50"
                            >
                              Onayla
                            </button>
                            <button
                              onClick={() => handleUpdateOrderStatus(order.id, 'CANCELED')}
                              disabled={updatingStatus}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50"
                            >
                              İptal Et
                            </button>
                          </>
                        )}

                        {order.status === 'SHIPPED' && (
                          <button
                            onClick={() => handleUpdateOrderStatus(order.id, 'DELIVERED')}
                            disabled={updatingStatus}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm disabled:opacity-50"
                          >
                            Teslim Et
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Sayfalama */}
        {ordersData && ordersData.pagination && ordersData.pagination.totalPages > 1 && (
          <div className="mt-8 flex justify-center">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(ordersData.pagination.page - 1)}
                disabled={!ordersData.pagination.hasPrev}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Önceki
              </button>

              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, ordersData.pagination.totalPages) }, (_, i) => {
                  const page = i + 1;
                  const isActive = page === ordersData.pagination.page;
                  return (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-3 py-2 text-sm font-medium rounded-lg ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-700 hover:bg-gray-50 border border-gray-300'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => handlePageChange(ordersData.pagination.page + 1)}
                disabled={!ordersData.pagination.hasNext}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sonraki
              </button>
            </div>
          </div>
        )}

        {/* Sipariş Detay Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
              {/* Modal Header */}
              <div className="bg-[#00365a] px-6 py-4 relative">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-2xl font-bold text-white">
                      Sipariş Detayları
                    </h3>
                    <p className="text-blue-100 text-sm mt-1">
                      Sipariş No: {selectedOrder.id}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="text-white hover:text-blue-200 text-2xl transition-colors"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Sol taraf - Sipariş Bilgileri */}
                  <div className="space-y-6">
                    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                      <h4 className="text-lg font-semibold text-[#00365a] mb-4 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                          <path fillRule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 102 0V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm2.5 7a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" clipRule="evenodd" />
                        </svg>
                        Sipariş Bilgileri
                      </h4>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-gray-600 font-medium">Sipariş No:</span>
                          <span className="text-gray-900 font-mono text-sm bg-gray-100 px-2 py-1 rounded">{selectedOrder.id.slice(0, 8)}...</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-gray-600 font-medium">Tarih:</span>
                          <span className="text-gray-900">
                            {new Date(selectedOrder.created_at).toLocaleDateString('tr-TR', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-gray-600 font-medium">Durum:</span>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[selectedOrder.status]}`}>
                            {statusLabels[selectedOrder.status]}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                          <span className="text-gray-600 font-medium">Toplam Tutar:</span>
                          <span className="font-bold text-[#00365a] text-lg">
                            {parseFloat(selectedOrder.total_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Admin için müşteri bilgileri */}
                    {isAdmin && selectedOrder.user && (
                      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                        <h4 className="text-lg font-semibold text-[#00365a] mb-4 flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                          </svg>
                          Müşteri Bilgileri
                        </h4>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center py-2 border-b border-gray-100">
                            <span className="text-gray-600 font-medium">Ad Soyad:</span>
                            <span className="text-gray-900">{selectedOrder.user.name} {selectedOrder.user.surname}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-gray-100">
                            <span className="text-gray-600 font-medium">E-posta:</span>
                            <span className="text-gray-900">{selectedOrder.user.email}</span>
                          </div>
                          <div className="flex justify-between items-center py-2">
                            <span className="text-gray-600 font-medium">Telefon:</span>
                            <span className="text-gray-900">{selectedOrder.user.phone}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                      <h4 className="text-lg font-semibold text-[#00365a] mb-4 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm3 6a2 2 0 11-4 0 2 2 0 014 0zm7-1a1 1 0 10-2 0 1 1 0 002 0zm-1 3a1 1 0 10-2 0 1 1 0 002 0z" clipRule="evenodd" />
                        </svg>
                        Mağaza Bilgileri
                      </h4>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-gray-600 font-medium">Mağaza Adı:</span>
                          <span className="text-gray-900 font-semibold">{selectedOrder.store_name}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-gray-600 font-medium">Vergi No:</span>
                          <span className="text-gray-900 font-mono text-sm">{selectedOrder.store_tax_number}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-gray-600 font-medium">Telefon:</span>
                          <span className="text-gray-900">{selectedOrder.store_phone}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-gray-600 font-medium">E-posta:</span>
                          <span className="text-gray-900">{selectedOrder.store_email}</span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                          <span className="text-gray-600 font-medium">Adres:</span>
                          <span className="text-gray-900 text-right max-w-xs">{selectedOrder.delivery_address}</span>
                        </div>
                      </div>
                    </div>

                    {selectedOrder.notes && (
                      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-6 shadow-sm">
                        <h4 className="text-lg font-semibold text-amber-700 mb-3 flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          Sipariş Notu
                        </h4>
                        <p className="text-amber-800 bg-white bg-opacity-70 p-3 rounded-lg">{selectedOrder.notes}</p>
                      </div>
                    )}


                  </div>

                  {/* Sağ taraf - Ürünler */}
                  <div>
                    <div className="mb-6">
                      <h4 className="text-lg font-semibold text-[#00365a] mb-2 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 2L3 7v11a2 2 0 002 2h10a2 2 0 002-2V7l-7-5zM6 12a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1z" clipRule="evenodd" />
                        </svg>
                        Sipariş Edilen Ürünler
                      </h4>
                      <p className="text-gray-500 text-sm">{selectedOrder.items.length} ürün</p>
                    </div>
                    <div className="space-y-4">
                      {selectedOrder.items.map((item) => (
                        <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex space-x-4">
                            <img
                              src={item.product.productImage || '/placeholder-product.jpg'}
                              alt={item.product.name}
                              className="w-16 h-16 object-cover rounded-lg"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.onerror = null;
                                target.src = '/placeholder-product.jpg';
                              }}
                            />
                            <div className="flex-1">
                              <h5 className="font-medium text-gray-900">{item.product.name}</h5>
                              {item.product.collection && (
                                <p className="text-xs text-[#00365a] mt-1">
                                  {item.product.collection.name}
                                </p>
                              )}
                              <div className="mt-1 text-xs text-gray-500">
                                {item.width}×{item.height} cm
                                {item.has_fringe ? ', Saçaklı' : ', Saçaksız'}
                                {item.cut_type && `, ${item.cut_type.charAt(0).toUpperCase() + item.cut_type.slice(1)} Kesim`}
                              </div>
                              <div className="mt-2 flex justify-between items-center">
                                <span className="text-sm text-gray-600">
                                  {item.quantity} adet × {parseFloat(item.unit_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                </span>
                                <span className="font-semibold text-gray-900">
                                  {parseFloat(item.total_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* QR Kodları Bölümü */}
                    {selectedOrder.qr_codes && selectedOrder.qr_codes.length > 0 && (
                      <div className="mt-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-3">QR Kodları</h4>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          {/* QR İstatistikleri */}
                          <div className="mb-4">
                            <div className="grid grid-cols-3 gap-4 mb-3">
                              <div className="text-center">
                                <div className="text-2xl font-bold text-[#00365a]">
                                  {selectedOrder.qr_codes.length}
                                </div>
                                <div className="text-sm text-gray-600">QR Kod</div>
                              </div>
                              <div className="text-center">
                                <div className="text-2xl font-bold text-green-600">
                                  {selectedOrder.qr_codes.filter(qr => qr.is_scanned).length}
                                </div>
                                <div className="text-sm text-gray-600">Tamamlandı</div>
                              </div>
                              <div className="text-center">
                                <div className="text-2xl font-bold text-yellow-600">
                                  {selectedOrder.qr_codes.reduce((total, qr) => total + qr.scan_count, 0)}
                                </div>
                                <div className="text-sm text-gray-600">Toplam Tarama</div>
                              </div>
                            </div>
                            
                            {/* Genel İlerleme Çubuğu */}
                            <div className="w-full bg-gray-200 rounded-full h-3">
                              <div 
                                className="bg-green-600 h-3 rounded-full transition-all duration-300" 
                                style={{
                                  width: `${selectedOrder.qr_codes.length > 0 ? (selectedOrder.qr_codes.filter(qr => qr.is_scanned).length / selectedOrder.qr_codes.length) * 100 : 0}%`
                                }}
                              ></div>
                            </div>
                            <div className="text-center text-sm text-gray-600 mt-1">
                              {selectedOrder.qr_codes.length > 0 ? Math.round((selectedOrder.qr_codes.filter(qr => qr.is_scanned).length / selectedOrder.qr_codes.length) * 100) : 0}% Tamamlandı
                            </div>
                          </div>
                          
                          {/* QR Kod Detayları */}
                          <div className="space-y-3">
                            {selectedOrder.qr_codes.map((qrCode, index) => (
                              <div 
                                key={qrCode.id}
                                className={`flex items-center justify-between p-3 rounded ${
                                  qrCode.is_scanned ? 'bg-green-100 border border-green-200' : 'bg-white border border-gray-200'
                                }`}
                              >
                                <div className="flex items-center space-x-3">
                                  <div className="flex-shrink-0">
                                    <img
                                      src={qrCode.product.productImage || '/placeholder-product.jpg'}
                                      alt={qrCode.product.name}
                                      className="w-12 h-12 object-cover rounded"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.onerror = null;
                                        target.src = '/placeholder-product.jpg';
                                      }}
                                    />
                                  </div>
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">
                                      {qrCode.product.name}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {qrCode.order_item.width}×{qrCode.order_item.height} cm • 
                                      {qrCode.order_item.has_fringe ? ' Saçaklı' : ' Saçaksız'} • 
                                      {qrCode.order_item.cut_type.charAt(0).toUpperCase() + qrCode.order_item.cut_type.slice(1)} Kesim
                                    </div>
                                    <div className="text-xs text-[#00365a] mt-1">
                                      Adet: {qrCode.order_item.quantity} • 
                                      Tarama: {qrCode.scan_count}/{qrCode.required_scans}
                                    </div>
                                    <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                                      <div 
                                        className="bg-green-600 h-2 rounded-full" 
                                        style={{width: `${Math.min((qrCode.scan_count / qrCode.required_scans) * 100, 100)}%`}}
                                      ></div>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  {qrCode.is_scanned ? (
                                    <div className="text-xs text-center">
                                      <span className="text-green-600 font-medium">✓ Tamamlandı</span>
                                      {qrCode.scanned_at && (
                                        <div className="text-gray-500">
                                          {new Date(qrCode.scanned_at).toLocaleDateString('tr-TR', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="text-xs text-center">
                                      <span className="text-yellow-600 font-medium">
                                        {qrCode.scan_count > 0 ? `${qrCode.required_scans - qrCode.scan_count} tarama kaldı` : 'Bekliyor'}
                                      </span>
                                    </div>
                                  )}
                                  <div className="flex flex-col gap-1">
                                    <button
                                      onClick={() => {
                                        // QR kod detayını göster/indir
                                        const qrWindow = window.open('', '_blank');
                                        if (qrWindow) {
                                          qrWindow.document.write(`
                                            <html>
                                              <head><title>QR Kodu - ${qrCode.product.name}</title></head>
                                              <body style="display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f0f0f0;">
                                                <div style="text-align: center; background: white; padding: 30px; max-width: 600px; margin: 20px;">
                                                  
                                                  <div style="margin: 20px 0;">
                                                    <img src="${qrCode.qrCodeImageUrl}" alt="QR Kod" style="max-width: 250px; max-height: 250px; border: 1px solid black;" onerror="this.innerHTML='<p>QR kod görseli yüklenemedi</p>'" />
                                                  </div>
                                                  
                                                  <!-- Adres Bilgileri -->
                                                  <div style="border: 1px solid black; padding: 15px; margin-bottom: 15px; text-align: left;">
                                                    <h3 style="color: black; margin: 0 0 10px 0; font-size: 16px; font-weight: bold;">Teslimat Adresi</h3>
                                                    <p style="margin: 3px 0;"><strong>Mağaza:</strong> ${selectedOrder.store_name}</p>
                                                    <p style="margin: 3px 0; line-height: 1.4;">${selectedOrder.delivery_address}</p>
                                                    <p style="margin: 3px 0;"><strong>Telefon:</strong> ${selectedOrder.user?.Store?.telefon || selectedOrder.store_phone}</p>
                                                    <p style="margin: 3px 0;"><strong>E-posta:</strong> ${selectedOrder.store_email}</p>
                                                  </div>
                                                  
                                                  <!-- Bu QR koda ait ürün bilgileri -->
                                                  <div style="border: 1px solid black; padding: 15px; margin-bottom: 15px; text-align: left;">
                                                    <h3 style="color: #2563eb; margin: 0 0 10px 0; font-size: 16px; font-weight: bold;">${qrCode.product.name}</h3>
                                                    <p style="margin: 3px 0;"><strong>Boyut:</strong> ${qrCode.order_item.width}×${qrCode.order_item.height} cm</p>
                                                    <p style="margin: 3px 0;"><strong>Adet:</strong> ${qrCode.order_item.quantity}</p>
                                                    <p style="margin: 3px 0;"><strong>Saçak:</strong> ${qrCode.order_item.has_fringe ? 'Saçaklı' : 'Saçaksız'}</p>
                                                    <p style="margin: 3px 0;"><strong>Kesim Türü:</strong> ${qrCode.order_item.cut_type.charAt(0).toUpperCase() + qrCode.order_item.cut_type.slice(1)}</p>
                                                  </div>
                                                </div>
                                              </body>
                                            </html>
                                          `);
                                          qrWindow.document.close();
                                        }
                                      }}
                                      className="text-[#00365a] hover:text-[#004170] text-xs underline"
                                    >
                                      Göster
                                    </button>
                                    
                                    {/* QR Okutma Butonu - Sadece admin için */}
                                    {isAdmin && (
                                      <button
                                        onClick={() => {
                                          // QR kod URL'ini yeni sekmede aç
                                          window.open(qrCode.qr_code, '_blank');
                                        }}
                                        disabled={qrCode.scan_count >= qrCode.required_scans}
                                        className="text-green-600 hover:text-green-800 text-xs underline disabled:text-gray-400 disabled:cursor-not-allowed"
                                      >
                                        {qrCode.scan_count >= qrCode.required_scans ? 'Tamamlandı' : 'QR Okutma'}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Fiş Görüntüle Butonu - PENDING hariç tüm durumlarda */}
                    {['CONFIRMED', 'SHIPPED', 'DELIVERED'].includes(selectedOrder.status) && (
                      <div className="mt-6 text-center">
                        <button
                          onClick={() => {
                            // Fiş sayfasını yeni sekmede aç
                            const receiptWindow = window.open('', '_blank');
                            if (receiptWindow) {
                              receiptWindow.document.write(`
                                <!DOCTYPE html>
                                <html>
                                  <head>
                                    <title>Sipariş Fişi - ${selectedOrder.id.slice(0, 8)}</title>
                                    <meta charset="utf-8">
                                    <style>
                                      * { margin: 0; padding: 0; box-sizing: border-box; }
                                      body { 
                                        font-family: Arial, sans-serif; 
                                        line-height: 1.4; 
                                        color: #333; 
                                        max-width: 800px; 
                                        margin: 0 auto; 
                                        padding: 20px;
                                        background: white;
                                      }
                                      .header { 
                                        text-align: center; 
                                        border-bottom: 2px solid #000; 
                                        padding-bottom: 20px; 
                                        margin-bottom: 30px; 
                                      }
                                      .header h1 { 
                                        font-size: 24px; 
                                        margin-bottom: 10px; 
                                        color: #000; 
                                      }
                                      .section { 
                                        margin-bottom: 25px; 
                                        padding: 15px; 
                                        border: 1px solid #000; 
                                        border-radius: 0; 
                                      }
                                      .section h3 { 
                                        font-size: 16px; 
                                        margin-bottom: 10px; 
                                        color: #000; 
                                        border-bottom: 1px solid #000; 
                                        padding-bottom: 5px; 
                                      }
                                      .info-grid { 
                                        display: grid; 
                                        grid-template-columns: 1fr 1fr; 
                                        gap: 15px; 
                                        margin-bottom: 15px; 
                                      }
                                      .info-item { 
                                        display: flex; 
                                        justify-content: space-between; 
                                      }
                                      .info-item strong { 
                                        color: #000; 
                                      }
                                      table { 
                                        width: 100%; 
                                        border-collapse: collapse; 
                                        margin-top: 10px; 
                                      }
                                      th, td { 
                                        border: 1px solid #000; 
                                        padding: 8px; 
                                        text-align: left; 
                                      }
                                      th { 
                                        background-color: #fff; 
                                        font-weight: bold; 
                                      }
                                      .total-row { 
                                        background-color: #fff; 
                                        font-weight: bold; 
                                      }

                                      .footer { 
                                        margin-top: 30px; 
                                        text-align: center; 
                                        font-size: 12px; 
                                        color: #000; 
                                        border-top: 1px solid #000; 
                                        padding-top: 15px; 
                                      }
                                      @media print {
                                        body { font-size: 12px; }
                                        .section { break-inside: avoid; }
                                      }
                                    </style>
                                  </head>
                                  <body>
                                    <!-- Header -->
                                    <div class="header">
                                      <h1>SİPARİŞ FİŞİ</h1>
                                      <p>Sipariş No: <strong>${selectedOrder.id}</strong></p>
                                      <p>Tarih: <strong>${new Date(selectedOrder.created_at).toLocaleDateString('tr-TR', {
                                        year: 'numeric',
                                        month: 'long', 
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}</strong></p>
                                      <p>Durum: <strong style="color: #000;">Onaylandı</strong></p>
                                    </div>

                                    <!-- Müşteri Bilgileri -->
                                    <div class="section">
                                      <h3>Müşteri Bilgileri</h3>
                                      <div class="info-grid">
                                        ${selectedOrder.user ? `
                                          <div class="info-item">
                                            <span><strong>Ad Soyad:</strong></span>
                                            <span>${selectedOrder.user.name} ${selectedOrder.user.surname}</span>
                                          </div>
                                          <div class="info-item">
                                            <span><strong>E-posta:</strong></span>
                                            <span>${selectedOrder.user.email}</span>
                                          </div>
                                          <div class="info-item">
                                            <span><strong>Telefon:</strong></span>
                                            ${selectedOrder.user?.Store?.telefon || selectedOrder.store_phone}
                                          </div>
                                        ` : ''}
                                        <div class="info-item">
                                          <span><strong>Mağaza:</strong></span>
                                          <span>${selectedOrder.store_name}</span>
                                        </div>
                                        <div class="info-item">
                                          <span><strong>Vergi No:</strong></span>
                                          <span>${selectedOrder.store_tax_number}</span>
                                        </div>
                                        <div class="info-item">
                                          <span><strong>Vergi Dairesi:</strong></span>
                                          <span>${selectedOrder.store_tax_office}</span>
                                        </div>
                                      </div>
                                      <div class="info-item">
                                        <span><strong>Teslimat Adresi:</strong></span>
                                        <span>${selectedOrder.delivery_address}</span>
                                      </div>
                                    </div>

                                    <!-- Sipariş Edilen Ürünler -->
                                    <div class="section">
                                      <h3>Sipariş Edilen Ürünler</h3>
                                      <table>
                                        <thead>
                                          <tr>
                                            <th>Ürün Adı</th>
                                            <th>Koleksiyon</th>
                                            <th>Boyut (cm)</th>
                                            <th>Adet</th>
                                            <th>Saçak</th>
                                            <th>Kesim</th>
                                            <th>Birim Fiyat</th>
                                            <th>Toplam</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          ${selectedOrder.items.map(item => `
                                            <tr>
                                              <td>${item.product.name}</td>
                                              <td>${item.product.collection?.name || '-'}</td>
                                              <td>${item.width} × ${item.height}</td>
                                              <td>${item.quantity}</td>
                                              <td>${item.has_fringe ? 'Saçaklı' : 'Saçaksız'}</td>
                                              <td>${item.cut_type.charAt(0).toUpperCase() + item.cut_type.slice(1)}</td>
                                              <td>${parseFloat(item.unit_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
                                              <td>${parseFloat(item.total_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
                                            </tr>
                                          `).join('')}
                                          <tr class="total-row">
                                            <td colspan="7"><strong>GENEL TOPLAM</strong></td>
                                            <td><strong>${parseFloat(selectedOrder.total_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</strong></td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </div>



                                    ${selectedOrder.notes ? `
                                      <!-- Notlar -->
                                      <div class="section">
                                        <h3>Sipariş Notları</h3>
                                        <p>${selectedOrder.notes}</p>
                                      </div>
                                    ` : ''}

                                    <!-- Footer -->
                                    <div class="footer">
                                      <p>Bu fiş ${new Date().toLocaleDateString('tr-TR')} tarihinde oluşturulmuştur.</p>
                                      <p>Sipariş takibi için lütfen sipariş numaranızı saklayınız.</p>
                                    </div>
                                  </body>
                                </html>
                              `);
                              receiptWindow.document.close();
                            }
                          }}
                          className="px-6 py-3 bg-[#00365a] text-white rounded-lg hover:bg-[#004170] transition-colors text-sm font-medium"
                        >
                          📄 Fiş Görüntüle
                        </button>
                      </div>
                    )}

                    {/* QR Kodu yoksa ama sipariş onaylanmışsa */}
                    {isAdmin && selectedOrder.status === 'CONFIRMED' && (!selectedOrder.qr_codes || selectedOrder.qr_codes.length === 0) && (
                      <div className="mt-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-3">QR Kodları</h4>
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                          <p className="text-yellow-800 mb-3">Bu sipariş için henüz QR kodları oluşturulmamış.</p>
                          <button
                            onClick={async () => {
                              try {
                                setUpdatingStatus(true);
                                await generateQRCodes(selectedOrder.id);
                                // QR kodları oluşturulduktan sonra sipariş detayını yenile
                                await handleViewOrderDetail(selectedOrder.id);
                                alert('QR kodları başarıyla oluşturuldu!');
                              } catch (error: any) {

                                alert('QR kodları oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.');
                              } finally {
                                setUpdatingStatus(false);
                              }
                            }}
                            disabled={updatingStatus}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                          >
                            {updatingStatus ? 'QR Kodları Oluşturuluyor...' : 'QR Kodları Oluştur'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Admin için durum güncelleme */}
                    {isAdmin && (
                      <div className="flex flex-wrap gap-2 mt-8 justify-center">
                        {selectedOrder.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'CONFIRMED')}
                              disabled={updatingStatus}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                              {updatingStatus ? 'Güncelleniyor...' : 'Siparişi Onayla'}
                            </button>
                            <button
                              onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'CANCELED')}
                              disabled={updatingStatus}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                              {updatingStatus ? 'Güncelleniyor...' : 'İptal Et'}
                            </button>
                          </>
                        )}

                        {selectedOrder.status === 'SHIPPED' && (
                          <button
                            onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'DELIVERED')}
                            disabled={updatingStatus}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                          >
                            {updatingStatus ? 'Güncelleniyor...' : 'Teslim Edildi Olarak İşaretle'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200 flex justify-end gap-3">
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="px-6 py-2 bg-[#00365a] text-white rounded-lg hover:bg-[#004170] transition-colors font-medium"
                  >
                    Kapat
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Siparisler; 