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
  const [updatingItems, setUpdatingItems] = useState<Set<number>>(new Set());
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
        console.log("Sepet verisi:", data.data);
        console.log("İlk ürün detayı:", data.data.items[0]);
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
    // Aynı ürün zaten güncelleniyorsa işlemi durdur
    if (updatingItems.has(itemId)) {
      return;
    }
    
    try {
      // Loading state'i başlat
      setUpdatingItems(prev => new Set(prev).add(itemId));
      setError(""); // Önceki hataları temizle
      
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/cart/items/${itemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        // Sepeti yenile
        await fetchCartData();
      } else {
        setError(data.message || "Ürün sepetten çıkarılamadı");
      }
    } catch (error) {
      console.error("Ürün sepetten çıkarılırken hata oluştu:", error);
      setError("Ürün sepetten çıkarılırken bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      // Loading state'i sonlandır
      setUpdatingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  const handleUpdateQuantity = async (itemId: number, newQuantity: number) => {
    // Miktar 0 olduğunda ürünü sepetten çıkar
    if (newQuantity < 1) {
      return handleRemoveItem(itemId);
    }
    
    // Aynı ürün zaten güncelleniyorsa işlemi durdur
    if (updatingItems.has(itemId)) {
      return;
    }
    
    try {
      // Loading state'i başlat
      setUpdatingItems(prev => new Set(prev).add(itemId));
      setError(""); // Önceki hataları temizle
      
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/cart/items/${itemId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ quantity: newQuantity })
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        // Sepeti yenile
        await fetchCartData();
      } else {
        setError(data.message || "Ürün miktarı güncellenemedi");
      }
    } catch (error) {
      console.error("Ürün miktarı güncellenirken hata oluştu:", error);
      setError("Ürün miktarı güncellenirken bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      // Loading state'i sonlandır
      setUpdatingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  // Sepeti tamamen temizleme
  const handleClearCart = async () => {
    if (!cartData || cartData.items.length === 0) return;
    
    if (!confirm("Sepetinizdeki tüm ürünleri silmek istediğinize emin misiniz?")) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/cart/clear`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (res.ok) {
        // Sepeti yenile
        fetchCartData();
      } else {
        const data = await res.json();
        setError(data.message || "Sepet temizlenemedi");
      }
    } catch (error) {
      console.error("Sepet temizlenirken hata oluştu:", error);
      setError("Sepet temizlenirken bir hata oluştu");
    }
  };

  return (
    <div className="p-6 bg-white min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">
            Sepetim
            {cartData && cartData.totalItems > 0 && (
              <span className="ml-2 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                {cartData.totalItems} ürün
              </span>
            )}
          </h1>
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
                              src={item.product?.productImage || item.Product?.productImage || item.ProductDetails?.productImage || "/placeholder-product.jpg"} 
                              alt={item.product?.name || item.Product?.name || "Ürün"} 
                              className="w-16 h-16 object-cover rounded-md"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.onerror = null; // Sonsuz döngüyü önlemek için
                                target.src = "/placeholder-product.jpg"; // Projedeki varsayılan resim
                              }}
                            />
                          </div>
                          <div className="ml-4">
                            <h3 className="text-sm font-medium text-gray-900">
                              {item.product?.name || item.Product?.name || "Ürün Adı"}
                            </h3>
                            {(item.product?.collection || item.Product?.collection) && (
                              <div className="text-xs text-blue-600 mt-0.5">
                                {item.product?.collection?.name || item.Product?.collection?.name}
                              </div>
                            )}
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
                              className="mt-2 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 px-2 py-1 rounded-md flex items-center gap-1 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              onClick={() => handleRemoveItem(item.id)}
                              disabled={updatingItems.has(item.id)}
                            >
                              <svg 
                                xmlns="http://www.w3.org/2000/svg" 
                                className="h-3 w-3" 
                                fill="none" 
                                viewBox="0 0 24 24" 
                                stroke="currentColor"
                              >
                                <path 
                                  strokeLinecap="round" 
                                  strokeLinejoin="round" 
                                  strokeWidth={2} 
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
                                />
                              </svg>
                              {updatingItems.has(item.id) ? "Kaldırılıyor..." : "Kaldır"}
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="col-span-2 text-center">
                        <div className="text-sm text-gray-900">
                          {parseFloat(item.unit_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} 
                          {item.product?.pricing?.currency || item.Product?.pricing?.currency || '₺'}
                        </div>
                        <div className="text-xs text-gray-500">
                          m² başına
                        </div>
                      </div>
                      <div className="col-span-2 text-center">
                        <div className="flex items-center justify-center">
                          <button 
                            className="w-8 h-8 border border-gray-300 rounded-l-md flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                            disabled={updatingItems.has(item.id) || item.quantity <= 1}
                          >
                            {updatingItems.has(item.id) ? (
                              <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              "-"
                            )}
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => {
                              const newQuantity = parseInt(e.target.value);
                              if (!isNaN(newQuantity) && newQuantity >= 1) {
                                handleUpdateQuantity(item.id, newQuantity);
                              }
                            }}
                            disabled={updatingItems.has(item.id)}
                            className="w-10 h-8 border-t border-b border-gray-300 text-center text-gray-900 focus:outline-none disabled:bg-gray-50 disabled:cursor-not-allowed"
                          />
                          <button 
                            className="w-8 h-8 border border-gray-300 rounded-r-md flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                            disabled={updatingItems.has(item.id)}
                          >
                            {updatingItems.has(item.id) ? (
                              <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              "+"
                            )}
                          </button>
                        </div>
                        {updatingItems.has(item.id) && (
                          <div className="text-xs text-blue-600 mt-1">Güncelleniyor...</div>
                        )}
                      </div>
                      <div className="col-span-2 text-right font-medium text-gray-900">
                        {parseFloat(item.total_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} 
                        {item.product?.pricing?.currency || item.Product?.pricing?.currency || '₺'}
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
                  <div className="flex justify-between">
                    <span className="text-gray-900 font-medium">Toplam</span>
                    <span className="text-lg text-blue-900 font-bold">
                      {parseFloat(cartData.totalPrice).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} 
                      {cartData.items[0]?.product?.pricing?.currency || cartData.items[0]?.Product?.pricing?.currency || '₺'}
                    </span>
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
                  <div className="flex gap-3">
                    <button 
                      className="px-4 py-3 border border-red-600 text-red-600 rounded-md hover:bg-red-50 font-medium"
                      onClick={handleClearCart}
                    >
                      Sepeti Temizle
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
          </div>
        )}
      </div>
    </div>
  );
} 