"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// API Base URL
const API_BASE_URL = "https://pasha-backend-production.up.railway.app";

export default function CartPage() {
  const [loading, setLoading] = useState(true);
  const [cartData, setCartData] = useState<any>(null);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetchCartData();
  }, []);

  const fetchCartData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/');
        return;
      }
      
      const res = await fetch(`${API_BASE_URL}/api/cart`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await res.json();
      
      if (data.success) {
        setCartData(data.data);
      } else {
        setError("Sepet bilgileri alınamadı");
      }
    } catch (error) {
      console.error("Sepet bilgileri alınamadı:", error);
      setError("Sepet bilgileri alınamadı. Lütfen daha sonra tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveItem = async (itemId: number) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/cart/items/${itemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (res.ok) {
        // Sepeti yenile
        fetchCartData();
      } else {
        setError("Ürün sepetten çıkarılamadı");
      }
    } catch (error) {
      console.error("Ürün sepetten çıkarılırken hata oluştu:", error);
      setError("Ürün sepetten çıkarılırken bir hata oluştu");
    }
  };

  const handleUpdateQuantity = async (itemId: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/cart/items/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ quantity: newQuantity })
      });
      
      if (res.ok) {
        // Sepeti yenile
        fetchCartData();
      } else {
        setError("Ürün miktarı güncellenemedi");
      }
    } catch (error) {
      console.error("Ürün miktarı güncellenirken hata oluştu:", error);
      setError("Ürün miktarı güncellenirken bir hata oluştu");
    }
  };

  return (
    <div className="p-6 bg-white min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Sepetim</h1>
          <p className="text-gray-600 mt-1">
            Seçtiğiniz ürünleri buradan yönetebilirsiniz.
          </p>
        </div>
        
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-blue-900 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-600">Sepet bilgileri yükleniyor...</p>
          </div>
        ) : error ? (
          <div className="py-8 bg-red-50 text-red-600 rounded-lg text-center">
            <p>{error}</p>
          </div>
        ) : !cartData || cartData.items.length === 0 ? (
          <div className="py-16 text-center bg-gray-50 rounded-lg">
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
            <h3 className="mt-4 text-lg font-medium text-gray-900">Sepetiniz Boş</h3>
            <p className="mt-2 text-gray-500 max-w-md mx-auto">
              Sepetinizde henüz ürün bulunmamaktadır. Ürün eklemek için ürünler sayfasını ziyaret edebilirsiniz.
            </p>
            <div className="mt-6">
              <Link href="/dashboard/urunler/liste" className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-900 hover:bg-blue-800">
                Ürünlere Göz At
              </Link>
            </div>
          </div>
        ) : (
          <div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-500">
                  <div className="col-span-6">Ürün</div>
                  <div className="col-span-2 text-center">Fiyat</div>
                  <div className="col-span-2 text-center">Miktar</div>
                  <div className="col-span-2 text-right">Toplam</div>
                </div>
              </div>
              
              <div className="divide-y divide-gray-200">
                {cartData.items.map((item: any) => (
                  <div key={item.id} className="px-6 py-4">
                    <div className="grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-6">
                        <div className="flex items-center">
                          <div className="w-16 h-16 flex-shrink-0">
                            <img 
                              src={item.Product?.productImage || "https://tebi.io/pashahome/products/ornek-urun.jpg"} 
                              alt={item.Product?.name} 
                              className="w-16 h-16 object-cover rounded-md"
                            />
                          </div>
                          <div className="ml-4">
                            <h3 className="text-sm font-medium text-gray-900">
                              {item.Product?.name || "Ürün Adı"}
                            </h3>
                            <div className="mt-1 text-xs text-gray-500">
                              {item.width}×{item.height} cm
                              {item.has_fringe ? ', Saçaklı' : ', Saçaksız'}
                              {item.cut_type && `, ${item.cut_type.charAt(0).toUpperCase() + item.cut_type.slice(1)} Kesim`}
                            </div>
                            {item.notes && (
                              <div className="mt-1 text-xs text-gray-500 italic">
                                Not: {item.notes}
                              </div>
                            )}
                            <button 
                              className="mt-2 text-xs text-red-600 hover:text-red-800 font-medium"
                              onClick={() => handleRemoveItem(item.id)}
                            >
                              Kaldır
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="col-span-2 text-center">
                        <div className="text-sm text-gray-900">
                          {parseFloat(item.unit_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                        </div>
                        <div className="text-xs text-gray-500">
                          m² başına
                        </div>
                      </div>
                      <div className="col-span-2 text-center">
                        <div className="flex items-center justify-center">
                          <button 
                            className="w-8 h-8 border border-gray-300 rounded-l-md flex items-center justify-center text-gray-500 hover:bg-gray-50"
                            onClick={() => handleUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
                          >
                            -
                          </button>
                          <div className="w-10 h-8 border-t border-b border-gray-300 flex items-center justify-center text-gray-900">
                            {item.quantity}
                          </div>
                          <button 
                            className="w-8 h-8 border border-gray-300 rounded-r-md flex items-center justify-center text-gray-500 hover:bg-gray-50"
                            onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <div className="col-span-2 text-right font-medium text-gray-900">
                        {parseFloat(item.total_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4">
                <h3 className="text-lg font-medium text-gray-900">Sipariş Özeti</h3>
                <div className="mt-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Ara Toplam</span>
                    <span className="text-gray-900 font-medium">{parseFloat(cartData.totalPrice).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">KDV (%18)</span>
                    <span className="text-gray-900 font-medium">{(parseFloat(cartData.totalPrice) * 0.18).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
                  </div>
                  <div className="border-t border-gray-200 pt-3 flex justify-between">
                    <span className="text-gray-900 font-medium">Toplam</span>
                    <span className="text-lg text-blue-900 font-bold">{(parseFloat(cartData.totalPrice) * 1.18).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <button 
                    className="text-blue-900 hover:text-blue-800 font-medium text-sm"
                    onClick={() => router.push('/dashboard/urunler/liste')}
                  >
                    Alışverişe Devam Et
                  </button>
                  <button 
                    className="px-6 py-3 bg-blue-900 text-white rounded-md hover:bg-blue-800 font-medium"
                    onClick={() => router.push('/dashboard/siparis-olustur')}
                  >
                    Siparişi Tamamla
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 