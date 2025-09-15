"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import { useCart } from '@/app/context/CartContext';

// API Base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://pashahomeapps.up.railway.app";

// Token'ı localStorage veya sessionStorage'dan al
function getAuthToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  
  // Önce localStorage'dan "beni hatırla" durumunu kontrol et
  const rememberMe = localStorage.getItem("rememberMe") === "true";
  
  if (rememberMe) {
    // "Beni hatırla" aktifse localStorage'dan al
    return localStorage.getItem('token');
  } else {
    // "Beni hatırla" aktif değilse sessionStorage'dan al
    return sessionStorage.getItem('token');
  }
}

// Kesim türlerini Türkçe'ye çeviren fonksiyon
const translateCutType = (cutType: string): string => {
  const translations: { [key: string]: string } = {
    'custom': 'Normal Kesim',
    'rectangle': 'Normal Kesim',
    'standart': 'Normal Kesim',
    'oval': 'Oval Kesim',
    'round': 'Daire Kesim',
    'daire': 'Daire Kesim',
    'post kesim': 'Post Kesim'
  };
  
  return translations[cutType.toLowerCase()] || (cutType.charAt(0).toUpperCase() + cutType.slice(1) + ' Kesim');
};

export default function CartPage() {
  const { token, user } = useAuth();
  const { refreshCart } = useCart();
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
      const authToken = token || getAuthToken();
      if (!authToken) {
        router.push('/');
        return;
      }
      
      const res = await fetch(`${API_BASE_URL}/api/cart`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      const data = await res.json();
      
      if (data.success) {
        setCartData(data.data);
      } else {
        setError("Sepet bilgileri alınamadı");
      }
    } catch (error) {

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
      
      const authToken = token || getAuthToken();
      const res = await fetch(`${API_BASE_URL}/api/cart/items/${itemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        // Sepeti yenile
        await fetchCartData();
        // Header'daki sepeti de yenile
        await refreshCart();
      } else {
        setError(data.message || "Ürün sepetten çıkarılamadı");
      }
    } catch (error) {

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
      
      const authToken = token || getAuthToken();
      const res = await fetch(`${API_BASE_URL}/api/cart/items/${itemId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ quantity: newQuantity })
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        // Sepeti yenile
        await fetchCartData();
        // Header'daki sepeti de yenile
        await refreshCart();
      } else {
        setError(data.message || "Ürün miktarı güncellenemedi");
      }
    } catch (error) {

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
      const authToken = token || getAuthToken();
      const res = await fetch(`${API_BASE_URL}/api/cart/clear`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      if (res.ok) {
        // Sepeti yenile
        await fetchCartData();
        // Header'daki sepeti de yenile
        await refreshCart();
      } else {
        const data = await res.json();
        setError(data.message || "Sepet temizlenemedi");
      }
    } catch (error) {

      setError("Sepet temizlenirken bir hata oluştu");
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
            <div className="flex flex-col items-center justify-center">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-gray-200 border-t-[#00365a] rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-8 h-8 text-[#00365a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
              </div>
              <div className="text-center mt-6">
                <h3 className="text-lg font-semibold text-gray-900">Sepet Bilgileri Yükleniyor</h3>
                <p className="text-sm text-gray-500 mt-1">Lütfen bekleyiniz...</p>
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-8">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="bg-red-100 rounded-full p-3">
                  <svg className="h-6 w-6 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-red-800">Hata Oluştu</h3>
                <p className="mt-2 text-red-700">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 bg-red-100 hover:bg-red-200 text-red-800 px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Sayfayı Yenile
                </button>
              </div>
            </div>
          </div>
        ) : !cartData || cartData.items.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="bg-[#00365a] text-white p-6">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <h3 className="text-xl font-semibold">Sepet Durumu</h3>
              </div>
            </div>

            {/* Content */}
            <div className="p-12 text-center">
              <div className="mb-8">
                <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                  <svg 
                    className="w-16 h-16 text-gray-400" 
                    xmlns="http://www.w3.org/2000/svg" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={1.5} 
                      d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" 
                    />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Sepetiniz Boş</h3>
                <p className="text-gray-600 text-lg max-w-md mx-auto leading-relaxed">
                  Sepetinizde henüz ürün bulunmamaktadır. Kaliteli halı koleksiyonlarımıza göz atarak alışverişe başlayabilirsiniz.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link 
                  href="/dashboard/urunler/liste" 
                  className="inline-flex items-center gap-3 px-8 py-4 bg-[#00365a] hover:bg-[#004170] text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  Ürünlere Göz At
                </Link>
                
                <Link 
                  href="/dashboard/koleksiyonlar/liste" 
                  className="inline-flex items-center gap-3 px-8 py-4 bg-white hover:bg-gray-50 text-[#00365a] border-2 border-[#00365a] rounded-xl font-semibold transition-all hover:shadow-md"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  Koleksiyonları İncele
                </Link>
              </div>

              {/* Additional Info */}
              <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-6 bg-blue-50 rounded-xl">
                  <div className="w-12 h-12 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Kaliteli Ürünler</h4>
                  <p className="text-sm text-gray-600">En kaliteli halı ve kilim çeşitleri</p>
                </div>

                <div className="text-center p-6 bg-green-50 rounded-xl">
                  <div className="w-12 h-12 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Hızlı Teslimat</h4>
                  <p className="text-sm text-gray-600">Siparişleriniz güvenle elinizde</p>
                </div>

                <div className="text-center p-6 bg-purple-50 rounded-xl">
                  <div className="w-12 h-12 mx-auto mb-4 bg-purple-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Özel Ölçüler</h4>
                  <p className="text-sm text-gray-600">İstediğiniz ölçülerde üretim</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-[#00365a]">
                <div className="flex items-center mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <h3 className="text-lg font-semibold text-white">Sepet İçeriği</h3>
                </div>
                <div className="grid grid-cols-12 gap-4 text-sm font-semibold text-blue-100">
                  <div className={user?.canSeePrice ? "col-span-6" : "col-span-8"}>Ürün</div>
                  {user?.canSeePrice && <div className="col-span-2 text-center">Fiyat</div>}
                  <div className="col-span-2 text-center">Miktar</div>
                  {user?.canSeePrice && <div className="col-span-2 text-right">Toplam</div>}
                </div>
              </div>
              
              <div className="divide-y divide-gray-200">
                {cartData.items.map((item: any) => (
                  <div key={item.id} className="px-6 py-4">
                    <div className="grid grid-cols-12 gap-4 items-center">
                      <div className={user?.canSeePrice ? "col-span-6" : "col-span-8"}>
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
                              {item.cut_type && `, ${translateCutType(item.cut_type)}`}
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
                      {user?.canSeePrice && (
                        <div className="col-span-2 text-center">
                          <div className="text-sm text-gray-900">
                            {parseFloat(item.unit_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} 
                            {item.product?.pricing?.currency || item.Product?.pricing?.currency || '₺'}
                          </div>
                          <div className="text-xs text-gray-500">
                            m² başına
                          </div>
                        </div>
                      )}
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
                              const value = e.target.value;
                              if (value === '') {
                                // Boş string ise 1'e ayarla
                                handleUpdateQuantity(item.id, 1);
                              } else {
                                const newQuantity = parseInt(value);
                                if (!isNaN(newQuantity) && newQuantity >= 1) {
                                  handleUpdateQuantity(item.id, newQuantity);
                                }
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
                      {user?.canSeePrice && (
                        <div className="col-span-2 text-right font-medium text-gray-900">
                          {parseFloat(item.total_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} 
                          {item.product?.pricing?.currency || item.Product?.pricing?.currency || '₺'}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 bg-[#00365a] text-white">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <h3 className="text-lg font-semibold">Sipariş Özeti</h3>
                </div>
              </div>
              <div className="px-6 py-6">
                <div className="space-y-4">
                  {user?.canSeePrice ? (
                    <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                      <span className="text-gray-900 font-semibold text-lg">Toplam Tutar</span>
                      <span className="text-2xl text-[#00365a] font-bold">
                        {parseFloat(cartData.totalPrice).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} 
                        {cartData.items[0]?.product?.pricing?.currency || cartData.items[0]?.Product?.pricing?.currency || '₺'}
                      </span>
                    </div>
                  ) : (
                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <span className="text-yellow-800 font-medium">Fiyat Görme Yetkiniz Bulunmamaktadır</span>
                      </div>
                      <p className="text-yellow-700 text-sm mt-1">Sipariş vermek için yöneticinizle iletişime geçin.</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                  <button 
                    className="text-[#00365a] hover:text-[#004170] font-semibold text-sm flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-blue-50 transition-all"
                    onClick={() => router.push('/dashboard/urunler/liste')}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                    </svg>
                    Alışverişe Devam Et
                  </button>
                  <div className="flex gap-3">
                    <button 
                      className="px-6 py-3 border-2 border-red-500 text-red-600 rounded-lg hover:bg-red-50 font-semibold transition-all flex items-center gap-2"
                      onClick={handleClearCart}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Sepeti Temizle
                    </button>
                    <button 
                      className="px-8 py-3 bg-[#00365a] text-white rounded-lg hover:bg-[#004170] font-semibold transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
                      onClick={() => router.push('/dashboard/siparis-olustur')}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
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