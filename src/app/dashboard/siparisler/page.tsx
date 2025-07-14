'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';

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
  qr_codes?: Array<{
    id: string;
    qr_code: string;
    quantity: number;
    is_scanned: boolean;
    scanned_at: string | null;
    created_at: string;
  }>;
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
  'SHIPPED': 'Kargoya Verildi',
  'DELIVERED': 'Teslim Edildi',
  'CANCELED': 'İptal Edildi'
};

const statusColors: { [key: string]: string } = {
  'PENDING': 'bg-yellow-100 text-yellow-800',
  'CONFIRMED': 'bg-blue-100 text-blue-800',
  'SHIPPED': 'bg-purple-100 text-purple-800',
  'DELIVERED': 'bg-green-100 text-green-800',
  'CANCELED': 'bg-red-100 text-red-800'
};

const Siparisler = () => {
  const router = useRouter();
  const { isAdmin, isLoading: authLoading } = useAuth();
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
      console.log('AuthContext hala yükleniyor, fetch iptal ediliyor...');
      return;
    }

    try {
      setLoading(true);
      setError(''); // Clear previous errors
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/');
        return;
      }

      // Admin kontrolü yaparak farklı endpoint'ler kullan
      let endpoint: string;
      let queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      });

      if (status) queryParams.append('status', status);
      if (search) queryParams.append('search', search);

      // Admin ise sadece admin/orders endpoint'ini kullan, my-orders asla kullanma
      if (isAdmin) {
        endpoint = `https://pasha-backend-production.up.railway.app/api/admin/orders?${queryParams.toString()}`;
        console.log('Admin kullanıcısı: admin/orders endpoint kullanılıyor');
      } else {
        // Admin değilse my-orders endpoint'ini kullan - kesinlikle admin endpoint kullanma
        endpoint = `https://pasha-backend-production.up.railway.app/api/orders/my-orders?${queryParams.toString()}`;
        console.log('Normal kullanıcı: my-orders endpoint kullanılıyor');
        
        // Güvenlik kontrolü: Admin olmayan kullanıcılar asla admin endpoint'i kullanmamalı
        if (endpoint.includes('/admin/')) {
          throw new Error('Yetkisiz erişim: Admin endpoint\'i kullanılamaz');
        }
      }

      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
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
    } catch (error) {
      console.error('Siparişler alınırken hata:', error);
      setError('Siparişler alınamadı. Lütfen tekrar deneyiniz.');
    } finally {
      setLoading(false);
    }
  }, [router, isAdmin, calculateOrderStats, authLoading]);

  useEffect(() => {
    // AuthContext yüklemesi tamamlanana kadar bekle
    if (authLoading) {
      console.log('AuthContext yükleniyor, fetch işlemi bekleniyor...');
      return;
    }
    
    console.log('AuthContext yüklendi, isAdmin:', isAdmin);
    fetchOrders(currentPage, statusFilter, searchQuery);
  }, [fetchOrders, currentPage, statusFilter, searchQuery, authLoading]);

  // Sipariş detayını getir
  const handleViewOrderDetail = async (orderId: string) => {
    try {
      const token = localStorage.getItem('token');
      let endpoint: string;
      
      // Admin ise sadece admin/orders endpoint'ini kullan
      if (isAdmin) {
        endpoint = `https://pasha-backend-production.up.railway.app/api/admin/orders/${orderId}`;
        console.log('Admin kullanıcısı: admin/orders detay endpoint kullanılıyor');
      } else {
        // Admin değilse normal orders endpoint'ini kullan - kesinlikle admin endpoint kullanma
        endpoint = `https://pasha-backend-production.up.railway.app/api/orders/${orderId}`;
        console.log('Normal kullanıcı: orders detay endpoint kullanılıyor');
        
        // Güvenlik kontrolü: Admin olmayan kullanıcılar asla admin endpoint'i kullanmamalı
        if (endpoint.includes('/admin/')) {
          throw new Error('Yetkisiz erişim: Admin endpoint\'i kullanılamaz');
        }
      }

      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
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
    } catch (error) {
      console.error('Sipariş detayı alınırken hata:', error);
      alert('Sipariş detayı alınamadı. Lütfen tekrar deneyiniz.');
    }
  };

  // Admin için sipariş durumu güncelleme
  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    if (!isAdmin) return;
    
    setUpdatingStatus(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://pasha-backend-production.up.railway.app/api/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        throw new Error('Sipariş durumu güncellenemedi');
      }

      const data = await response.json();
      if (data.success) {
        // Siparişleri yeniden yükle
        await fetchOrders(currentPage, statusFilter, searchQuery);
        // Modal'daki sipariş detayını da güncelle
        if (selectedOrder && selectedOrder.id === orderId) {
          await handleViewOrderDetail(orderId);
        }
        alert('Sipariş durumu başarıyla güncellendi!');
      } else {
        throw new Error(data.message || 'Sipariş durumu güncellenemedi');
      }
    } catch (error) {
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
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-2xl font-bold text-gray-900">{orderStats.total}</div>
              <div className="text-sm text-gray-500">Toplam</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <div className="text-2xl font-bold text-yellow-800">{orderStats.pending}</div>
              <div className="text-sm text-yellow-600">Beklemede</div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="text-2xl font-bold text-blue-800">{orderStats.confirmed}</div>
              <div className="text-sm text-blue-600">Onaylandı</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <div className="text-2xl font-bold text-purple-800">{orderStats.shipped}</div>
              <div className="text-sm text-purple-600">Kargoda</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-800">{orderStats.delivered}</div>
              <div className="text-sm text-green-600">Teslim</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <div className="text-2xl font-bold text-red-800">{orderStats.canceled}</div>
              <div className="text-sm text-red-600">İptal</div>
            </div>
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
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
                <option value="SHIPPED">Kargoya Verildi</option>
                <option value="DELIVERED">Teslim Edildi</option>
                <option value="CANCELED">İptal Edildi</option>
              </select>
            </div>
          </div>

          {/* Aktif Filtreler */}
          {(statusFilter || searchQuery) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {statusFilter && (
                <div className="flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                  Durum: {statusLabels[statusFilter]}
                  <button
                    onClick={() => handleStatusFilter('')}
                    className="ml-2 text-blue-600 hover:text-blue-800"
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
                        <span className="ml-2 font-semibold text-blue-600">
                          {parseFloat(order.total_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                        </span>
                      </div>
                    </div>

                    {order.notes && (
                      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
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
                          <button
                            onClick={() => handleUpdateOrderStatus(order.id, 'CONFIRMED')}
                            disabled={updatingStatus}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm disabled:opacity-50"
                          >
                            Onayla
                          </button>
                        )}
                        {order.status === 'CONFIRMED' && (
                          <button
                            onClick={() => handleUpdateOrderStatus(order.id, 'SHIPPED')}
                            disabled={updatingStatus}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm disabled:opacity-50"
                          >
                            Kargoya Ver
                          </button>
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
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">
                      Sipariş Detayları
                    </h3>
                    <p className="text-gray-600">Sipariş #{selectedOrder.id}</p>
                  </div>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Sol taraf - Sipariş Bilgileri */}
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">Sipariş Bilgileri</h4>
                      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Sipariş No:</span>
                          <span className="text-gray-900">{selectedOrder.id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Tarih:</span>
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
                        <div className="flex justify-between">
                          <span className="text-gray-600">Durum:</span>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[selectedOrder.status]}`}>
                            {statusLabels[selectedOrder.status]}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Toplam Tutar:</span>
                          <span className="font-semibold text-blue-600">
                            {parseFloat(selectedOrder.total_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Admin için müşteri bilgileri */}
                    {isAdmin && selectedOrder.user && (
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-3">Müşteri Bilgileri</h4>
                        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Ad Soyad:</span>
                            <span className="text-gray-900">{selectedOrder.user.name} {selectedOrder.user.surname}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">E-posta:</span>
                            <span className="text-gray-900">{selectedOrder.user.email}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Telefon:</span>
                            <span className="text-gray-900">{selectedOrder.user.phone}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">Mağaza Bilgileri</h4>
                      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Mağaza Adı:</span>
                          <span className="text-gray-900">{selectedOrder.store_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Vergi No:</span>
                          <span className="text-gray-900">{selectedOrder.store_tax_number}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Telefon:</span>
                          <span className="text-gray-900">{selectedOrder.store_phone}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">E-posta:</span>
                          <span className="text-gray-900">{selectedOrder.store_email}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Adres:</span>
                          <span className="text-gray-900">{selectedOrder.delivery_address}</span>
                        </div>
                      </div>
                    </div>

                    {selectedOrder.notes && (
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-3">Sipariş Notu</h4>
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <p className="text-yellow-800">{selectedOrder.notes}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Sağ taraf - Ürünler */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-3">Sipariş Edilen Ürünler</h4>
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
                                <p className="text-xs text-blue-600 mt-1">
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

                    {/* Admin için durum güncelleme */}
                    {isAdmin && (
                      <div className="mt-6 pt-6 border-t border-gray-200">
                        <h4 className="text-lg font-semibold text-gray-900 mb-3">Sipariş Durumunu Güncelle</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedOrder.status === 'PENDING' && (
                            <button
                              onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'CONFIRMED')}
                              disabled={updatingStatus}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                              {updatingStatus ? 'Güncelleniyor...' : 'Siparişi Onayla'}
                            </button>
                          )}
                          {selectedOrder.status === 'CONFIRMED' && (
                            <button
                              onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'SHIPPED')}
                              disabled={updatingStatus}
                              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                            >
                              {updatingStatus ? 'Güncelleniyor...' : 'Kargoya Ver'}
                            </button>
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
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200 flex justify-end">
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
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