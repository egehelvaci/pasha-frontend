'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface OrderItem {
  id: string;
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
    description: string;
    productImage: string;
    collection: {
      name: string;
      code: string;
    };
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
  items: OrderItem[];
  created_at: string;
  updated_at: string;
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
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Siparişleri getir
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/');
          return;
        }

        const response = await fetch('https://pasha-backend-production.up.railway.app/api/orders/my-orders', {
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
          setOrders(data.data?.orders || []);
        } else {
          throw new Error(data.message || 'Siparişler alınamadı');
        }
      } catch (error) {
        console.error('Siparişler alınırken hata:', error);
        setError('Siparişler alınamadı. Lütfen tekrar deneyiniz.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [router]);

  // Sipariş detayını getir
  const handleViewOrderDetail = async (orderId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://pasha-backend-production.up.railway.app/api/orders/${orderId}`, {
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

  if (loading) {
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
      <div className="max-w-6xl mx-auto">
        {/* Başlık */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Siparişlerim</h1>
          <p className="text-gray-600">Tüm siparişlerinizi buradan görüntüleyebilirsiniz.</p>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-16">
            <svg 
              className="mx-auto h-12 w-12 text-gray-400" 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" 
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">Henüz Siparişiniz Yok</h3>
            <p className="mt-2 text-gray-500">
              İlk siparişinizi vermek için ürünleri inceleyebilirsiniz.
            </p>
            <div className="mt-6">
              <Link 
                href="/dashboard/urunler/liste" 
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                Ürünlere Göz At
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          Sipariş #{order.id.slice(-8)}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {new Date(order.created_at).toLocaleDateString('tr-TR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[order.status] || 'bg-gray-100 text-gray-800'}`}>
                        {statusLabels[order.status] || order.status}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">
                        {parseFloat(order.total_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                      </p>
                      <p className="text-sm text-gray-600">
                        {order.items?.length || 0} ürün
                      </p>
                    </div>
                  </div>
                </div>

                <div className="px-6 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Teslimat Bilgileri</h4>
                      <p className="text-sm text-gray-600 mb-1">
                        <strong>Mağaza:</strong> {order.store_name}
                      </p>
                      <p className="text-sm text-gray-600 mb-1">
                        <strong>Adres:</strong> {order.delivery_address}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Telefon:</strong> {order.store_phone}
                      </p>
                    </div>
                    {order.notes && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Sipariş Notu</h4>
                        <p className="text-sm text-gray-600">{order.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Ürünler */}
                  {order.items && order.items.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Ürünler</h4>
                      <div className="space-y-2">
                        {order.items.slice(0, 3).map((item) => (
                          <div key={item.id} className="flex items-center space-x-3">
                            <img
                              src={item.product?.productImage || '/placeholder-product.jpg'}
                              alt={item.product?.name || 'Ürün'}
                              className="w-10 h-10 object-cover rounded"
                            />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">
                                {item.product?.name || 'Ürün'}
                              </p>
                              <p className="text-xs text-gray-600">
                                {item.quantity} adet × {parseFloat(item.unit_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                              </p>
                            </div>
                            <p className="text-sm font-medium text-gray-900">
                              {parseFloat(item.total_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                            </p>
                          </div>
                        ))}
                        {order.items.length > 3 && (
                          <p className="text-xs text-gray-500 ml-13">
                            +{order.items.length - 3} ürün daha
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Aksiyon butonları */}
                  <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                    <button
                      onClick={() => handleViewOrderDetail(order.id)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Detayları Görüntüle
                    </button>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[order.status] || 'bg-gray-100 text-gray-800'}`}>
                        {statusLabels[order.status] || order.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sipariş Detay Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Sipariş Detayı #{selectedOrder.id.slice(-8)}
              </h3>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Sipariş Bilgileri</h4>
                  <div className="space-y-2 text-sm">
                    <p><strong>Sipariş Tarihi:</strong> {new Date(selectedOrder.created_at).toLocaleDateString('tr-TR')}</p>
                    <p><strong>Durum:</strong> 
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs ${statusColors[selectedOrder.status] || 'bg-gray-100 text-gray-800'}`}>
                        {statusLabels[selectedOrder.status] || selectedOrder.status}
                      </span>
                    </p>
                    <p><strong>Toplam Tutar:</strong> {parseFloat(selectedOrder.total_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Mağaza Bilgileri</h4>
                  <div className="space-y-2 text-sm">
                    <p><strong>Mağaza:</strong> {selectedOrder.store_name}</p>
                    <p><strong>Adres:</strong> {selectedOrder.delivery_address}</p>
                    <p><strong>Telefon:</strong> {selectedOrder.store_phone}</p>
                    <p><strong>E-posta:</strong> {selectedOrder.store_email}</p>
                  </div>
                </div>
              </div>

              {selectedOrder.notes && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-2">Sipariş Notu</h4>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{selectedOrder.notes}</p>
                </div>
              )}

              {/* Ürün Listesi */}
              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-4">Sipariş Edilen Ürünler</h4>
                  <div className="space-y-4">
                    {selectedOrder.items.map((item) => (
                      <div key={item.id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                        <img
                          src={item.product?.productImage || '/placeholder-product.jpg'}
                          alt={item.product?.name || 'Ürün'}
                          className="w-16 h-16 object-cover rounded"
                        />
                        <div className="flex-1">
                          <h5 className="font-medium text-gray-900">{item.product?.name || 'Ürün'}</h5>
                          <p className="text-sm text-gray-600">
                            {item.quantity} adet × {parseFloat(item.unit_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                          </p>
                          <p className="text-xs text-gray-500">
                            {item.width}×{item.height} cm, {item.has_fringe ? 'Saçaklı' : 'Saçaksız'}
                          </p>
                        </div>
                        <p className="font-medium text-gray-900">
                          {parseFloat(item.total_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Siparisler; 