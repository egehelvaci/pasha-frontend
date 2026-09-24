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
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-light tracking-[0.08em] text-neutral-900 sm:text-3xl sm:tracking-[0.12em]">
              Sepetim
            </h1>
            <div className="mt-3 h-px w-[min(100%,20rem)] bg-neutral-300 sm:mt-4" />
            <p className="mt-3 text-sm text-slate-500">
              Sepetinizdeki ürünleri görüntüleyin ve siparişinizi tamamlayın
            </p>
          </div>
        </div>

        {loading ? (
          <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm">
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-[#00365a]" />
              <p className="text-sm font-medium text-slate-900">Sepet Bilgileri Yükleniyor</p>
              <p className="text-sm text-slate-500">Lütfen bekleyiniz...</p>
            </div>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm p-4 sm:p-5">
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
              <p className="font-medium text-slate-900">Hata Oluştu</p>
              <p className="mt-1">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 inline-flex items-center justify-center rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004170] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Sayfayı Yenile
            </button>
          </div>
        ) : !cartData || cartData.items.length === 0 ? (
          <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50/60 px-4 py-3 sm:px-5">
              <h2 className="text-sm font-semibold text-slate-900">Sepet Durumu</h2>
            </div>
            <div className="px-6 py-16 text-center">
              <h3 className="text-sm font-medium text-slate-900">Sepetiniz Boş</h3>
              <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-500">
                Sepetinizde henüz ürün bulunmamaktadır. Kaliteli halı koleksiyonlarımıza göz atarak alışverişe başlayabilirsiniz.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/dashboard/urunler/liste"
                  className="inline-flex items-center justify-center rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004170] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Ürünlere Göz At
                </Link>
                <Link
                  href="/dashboard/koleksiyonlar/liste"
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                >
                  Koleksiyonları İncele
                </Link>
              </div>
              <div className="mx-auto mt-12 grid max-w-3xl grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
                <div className="rounded-lg border border-slate-200/80 bg-slate-50/60 p-4 text-center">
                  <h4 className="text-sm font-medium text-slate-900">Kaliteli Ürünler</h4>
                  <p className="mt-1 text-sm text-slate-500">En kaliteli halı ve kilim çeşitleri</p>
                </div>
                <div className="rounded-lg border border-slate-200/80 bg-slate-50/60 p-4 text-center">
                  <h4 className="text-sm font-medium text-slate-900">Hızlı Teslimat</h4>
                  <p className="mt-1 text-sm text-slate-500">Siparişleriniz güvenle elinizde</p>
                </div>
                <div className="rounded-lg border border-slate-200/80 bg-slate-50/60 p-4 text-center">
                  <h4 className="text-sm font-medium text-slate-900">Özel Ölçüler</h4>
                  <p className="mt-1 text-sm text-slate-500">İstediğiniz ölçülerde üretim</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50/60 px-4 py-3 sm:px-5">
                <h2 className="text-sm font-semibold text-slate-900">Sepet İçeriği</h2>
                <span className="text-xs text-slate-500">
                  {cartData.items.length} ürün
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {cartData.items.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-4 p-4 transition-colors hover:bg-slate-50/70 sm:flex-row sm:items-start sm:justify-between sm:p-5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex gap-4">
                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                          <img
                            src={item.product?.productImage || item.Product?.productImage || item.ProductDetails?.productImage || "/placeholder-product.jpg"}
                            alt={item.product?.name || item.Product?.name || "Ürün"}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.onerror = null;
                              target.src = "/placeholder-product.jpg";
                            }}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-medium text-slate-900">
                            {item.product?.name || item.Product?.name || "Ürün Adı"}
                          </h3>
                          {(item.product?.collection || item.Product?.collection) && (
                            <p className="mt-0.5 text-xs text-slate-500">
                              {item.product?.collection?.name || item.Product?.collection?.name}
                            </p>
                          )}
                          <p className="mt-1 text-xs text-slate-400">
                            {item.width}×{item.height} cm
                            {item.has_fringe ? ', Saçaklı' : ', Saçaksız'}
                            {item.cut_type && `, ${translateCutType(item.cut_type)}`}
                          </p>
                          {item.notes && (
                            <p className="mt-1 text-xs text-slate-400 italic">
                              Not: {item.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-start justify-between gap-4 sm:shrink-0 sm:flex-nowrap sm:justify-end">
                      {user?.canSeePrice && (
                        <div className="text-right">
                          <p className="text-xs text-slate-500">Fiyat</p>
                          <p className="text-sm font-medium tabular-nums text-slate-900">
                            {parseFloat(item.unit_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                            {item.product?.pricing?.currency || item.Product?.pricing?.currency || '₺'}
                          </p>
                          <p className="text-xs text-slate-500">m² başına</p>
                        </div>
                      )}

                      <div className="text-right">
                        <p className="mb-1.5 text-xs text-slate-500 sm:text-right">Miktar</p>
                        <div className="inline-flex items-center rounded-lg border border-slate-300 bg-white">
                          <button
                            type="button"
                            className="inline-flex h-9 w-9 items-center justify-center text-slate-500 transition hover:bg-slate-50 hover:text-[#00365a] disabled:cursor-not-allowed disabled:opacity-40"
                            onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                            disabled={updatingItems.has(item.id) || item.quantity <= 1}
                          >
                            {updatingItems.has(item.id) ? (
                              <div className="h-3 w-3 animate-spin rounded-full border border-slate-300 border-t-[#00365a]" />
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
                                handleUpdateQuantity(item.id, 1);
                              } else {
                                const newQuantity = parseInt(value);
                                if (!isNaN(newQuantity) && newQuantity >= 1) {
                                  handleUpdateQuantity(item.id, newQuantity);
                                }
                              }
                            }}
                            disabled={updatingItems.has(item.id)}
                            className="h-9 w-10 border-0 border-x border-slate-300 bg-white px-1 text-center text-sm font-medium tabular-nums text-slate-900 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15 disabled:cursor-not-allowed disabled:opacity-40"
                          />
                          <button
                            type="button"
                            className="inline-flex h-9 w-9 items-center justify-center text-slate-500 transition hover:bg-slate-50 hover:text-[#00365a] disabled:cursor-not-allowed disabled:opacity-40"
                            onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                            disabled={updatingItems.has(item.id)}
                          >
                            {updatingItems.has(item.id) ? (
                              <div className="h-3 w-3 animate-spin rounded-full border border-slate-300 border-t-[#00365a]" />
                            ) : (
                              "+"
                            )}
                          </button>
                        </div>
                        {updatingItems.has(item.id) && (
                          <p className="mt-1 text-xs text-slate-500">Güncelleniyor...</p>
                        )}
                      </div>

                      {user?.canSeePrice && (
                        <div className="text-right">
                          <p className="text-xs text-slate-500">Toplam</p>
                          <p className="text-sm font-medium tabular-nums text-slate-900">
                            {parseFloat(item.total_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                            {item.product?.pricing?.currency || item.Product?.pricing?.currency || '₺'}
                          </p>
                        </div>
                      )}

                      <div className="flex flex-col items-end gap-1">
                        <button
                          type="button"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-rose-600 transition hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
                          onClick={() => handleRemoveItem(item.id)}
                          disabled={updatingItems.has(item.id)}
                          title={updatingItems.has(item.id) ? "Kaldırılıyor..." : "Kaldır"}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1.8}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                        <span className="text-xs text-slate-500">
                          {updatingItems.has(item.id) ? "Kaldırılıyor..." : "Kaldır"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50/60 px-4 py-3 sm:px-5">
                <h2 className="text-sm font-semibold text-slate-900">Sipariş Özeti</h2>
              </div>
              <div className="p-4 sm:p-5">
                {user?.canSeePrice ? (
                  <div className="mt-3 flex items-baseline justify-between gap-4 border-t border-slate-200 pt-3">
                    <span className="text-sm font-medium text-slate-900">Toplam Tutar</span>
                    <span className="text-lg font-semibold tabular-nums text-slate-900">
                      {parseFloat(cartData.totalPrice).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      {cartData.items[0]?.product?.pricing?.currency || cartData.items[0]?.Product?.pricing?.currency || '₺'}
                    </span>
                  </div>
                ) : (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-700">
                    <p className="font-medium text-slate-900">Fiyat Görme Yetkiniz Bulunmamaktadır</p>
                    <p className="mt-1 text-sm text-amber-700">Sipariş vermek için yöneticinizle iletişime geçin.</p>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-4 rounded-b-xl border-t border-slate-200/80 bg-slate-50/60 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                  onClick={() => router.push('/dashboard/urunler/liste')}
                >
                  Alışverişe Devam Et
                </button>
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={handleClearCart}
                  >
                    Sepeti Temizle
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004170] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25 disabled:cursor-not-allowed disabled:opacity-50"
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