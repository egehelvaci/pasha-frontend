'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useToken } from '@/app/hooks/useToken';
import OptimizedImage from '@/app/components/OptimizedImage';
import { getOptimalSettings, measurePerformance, isLowEndDevice } from '@/app/utils/performance';

interface Product {
  productId: string;
  name: string;
  description: string;
  productImage: string;
  collectionId: string;
  createdAt: string;
  updatedAt: string;
  collection: {
    name: string;
  } | null;
}

interface ProductResponse {
  success: boolean;
  data: Product[];
}

const EKatalogPage = () => {
  const router = useRouter();
  const token = useToken();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Mobile detection logic - only for actual mobile devices, not screen size
    const checkIfMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      // Only check for actual mobile devices, not screen size
      return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    };

    if (typeof window !== 'undefined') {
      const mobileCheck = checkIfMobile();
      setIsMobile(mobileCheck);
      
      // Mobile detection doesn't change on resize since it's based on user agent
      // Remove resize listener as it's not needed for mobile detection
    }
  }, []);

  useEffect(() => {
    if (!isMobile) {
      fetchProducts();
    }
  }, [isMobile]);

  // Get optimal settings based on device capabilities
  const optimalSettings = useMemo(() => getOptimalSettings(), []);
  
  // Memoize filtered products to prevent unnecessary re-renders
  const visibleProducts = useMemo(() => {
    return products; // Show all products, but warn on low-end devices
  }, [products]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const authToken = token;
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://pashahomeapps.up.railway.app'}/api/products/all`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Ürünler yüklenirken hata oluştu');
      }

      const data: ProductResponse = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setProducts(data.data);
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.error('Ürünler yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleProductSelection = useCallback((productId: string) => {
    setSelectedProducts(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(productId)) {
        newSelected.delete(productId);
      } else {
        newSelected.add(productId);
      }
      return newSelected;
    });
  }, []);

  const selectAllProducts = useCallback(() => {
    setSelectedProducts(prev => {
      if (prev.size === visibleProducts.length) {
        return new Set();
      } else {
        return new Set(visibleProducts.map(p => p.productId));
      }
    });
  }, [visibleProducts]);

  const generatePrintableCatalog = useCallback(() => {
    if (selectedProducts.size === 0) {
      alert('Lütfen en az bir ürün seçiniz.');
      return;
    }

    // Show loading immediately
    setIsGeneratingPDF(true);

    const selectedProductIds = Array.from(selectedProducts);
  
    // Use requestIdleCallback for better performance on low-end devices
    const processGeneration = () => {
      try {
        // Store selected products in localStorage
        localStorage.setItem('selectedProductsForPrint', JSON.stringify(selectedProductIds));
        
        // Create hidden iframe with optimized loading
        const iframe = document.createElement('iframe');
        iframe.style.cssText = `
          position: absolute;
          left: -9999px;
          top: -9999px;
          width: 1px;
          height: 1px;
          opacity: 0;
        `;
        iframe.src = '/dashboard/e-katalog/print';
        
        let timeoutId: NodeJS.Timeout;
        
        // Set timeout based on number of products (longer for more products)
        const timeoutDuration = Math.min(60000, 30000 + (selectedProductIds.length * 200)); // 30s base + 200ms per product, max 60s
        
        const cleanup = () => {
          if (timeoutId) clearTimeout(timeoutId);
          if (iframe.parentNode) {
            document.body.removeChild(iframe);
          }
          localStorage.removeItem('selectedProductsForPrint');
          setIsGeneratingPDF(false);
        };

        // Dynamic timeout based on product count
        timeoutId = setTimeout(() => {
          console.warn('Katalog oluşturma zaman aşımına uğradı');
          cleanup();
          alert(`${selectedProductIds.length} ürün için katalog oluşturma uzun sürdü. Lütfen daha az ürün seçerek tekrar deneyin.`);
        }, timeoutDuration);
        
        iframe.onload = () => {
          // Add extra delay for content to fully load
          setTimeout(() => {
            try {
              if (iframe.contentWindow) {
                iframe.contentWindow.print();
                
                // Cleanup after print dialog
                setTimeout(cleanup, 2000);
              } else {
                cleanup();
              }
            } catch (error) {
              console.error('Yazdırma hatası:', error);
              cleanup();
              alert('Yazdırma sırasında bir hata oluştu. Lütfen tekrar deneyin.');
            }
          }, 1500); // Increased delay for low-end devices
        };

        iframe.onerror = () => {
          console.error('İframe yükleme hatası');
          cleanup();
          alert('Katalog sayfası yüklenirken hata oluştu.');
        };
        
        document.body.appendChild(iframe);
        
      } catch (error) {
        console.error('Katalog oluşturma hatası:', error);
        setIsGeneratingPDF(false);
        alert('Katalog oluşturulurken bir hata oluştu.');
      }
    };

            // Use requestIdleCallback for better performance, fallback to setTimeout
        if ('requestIdleCallback' in window) {
          requestIdleCallback(processGeneration, { timeout: 1000 });
        } else {
          setTimeout(processGeneration, optimalSettings.imageLoadDelay);
        }
  }, [selectedProducts]);

  // Mobile restriction screen
  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
            <div className="mb-6">
              <svg
                className="w-20 h-20 mx-auto text-[#00365a] mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Sadece Masaüstü Kullanımı
              </h2>
              <p className="text-gray-600 leading-relaxed">
                E-Katalog özelliği sadece masaüstü bilgisayarlarda kullanılabilir. 
                Daha iyi bir deneyim için lütfen bir bilgisayar kullanarak tekrar deneyin.
              </p>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full px-6 py-3 bg-[#00365a] text-white rounded-lg hover:bg-[#004170] transition-colors font-medium"
              >
                Ana Sayfaya Dön
              </button>
              <p className="text-sm text-gray-500">
                Önerilen minimum çözünürlük: 1024px ve üzeri
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00365a] mx-auto mb-4"></div>
          <p className="text-gray-600">Ürünler yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
        <div className="space-y-6">
          {/* Başlık ve Kontroller */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">E-Katalog Oluşturucu</h1>
                <p className="text-gray-600 mt-1">
                  Ürünleri seçerek yazdırılabilir bir katalog oluşturun
                </p>
                {isLowEndDevice() && products.length > 50 && (
                  <p className="text-sm text-amber-600 mt-1">
                    ⚠️ Düşük performanslı cihaz algılandı. Çok fazla ürün seçerseniz yavaşlık yaşayabilirsiniz.
                  </p>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={selectAllProducts}
                  className="px-4 py-2 text-sm font-medium text-[#00365a] bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                  disabled={isGeneratingPDF}
                >
                  {selectedProducts.size === visibleProducts.length ? 'Tümünü Kaldır' : 'Tümünü Seç'}
                </button>
                <button
                  onClick={generatePrintableCatalog}
                  disabled={selectedProducts.size === 0 || isGeneratingPDF}
                  className="px-6 py-2 bg-[#00365a] text-white rounded-lg hover:bg-[#004170] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {isGeneratingPDF ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2"></div>
                      {selectedProducts.size > 50 ? 
                        `Katalog Hazırlanıyor... (${selectedProducts.size} ürün - Bu biraz sürebilir)` :
                        selectedProducts.size > 20 ?
                        `Katalog Hazırlanıyor... (${selectedProducts.size} ürün)` :
                        'Katalog Hazırlanıyor...'
                      }
                    </>
                  ) : (
                    `🖨️ Katalog Oluştur (${selectedProducts.size})`
                  )}
                </button>
              </div>
            </div>
            
            {selectedProducts.size > 0 && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-[#00365a]">
                  <span className="font-medium">{selectedProducts.size}</span> ürün seçildi
                  {selectedProducts.size === visibleProducts.length && ' (Tüm ürünler)'}
                </p>

              </div>
            )}
          </div>

          {/* Ürün Listesi */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Ürünler ({visibleProducts.length})
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {visibleProducts.map((product) => (
                  <div
                    key={product.productId}
                    className={`relative border rounded-lg p-3 cursor-pointer transition-all duration-200 ${
                      selectedProducts.has(product.productId)
                        ? 'border-[#00365a] bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => toggleProductSelection(product.productId)}
                  >
                    {/* Checkbox */}
                    <div className="absolute top-2 right-2">
                      <input
                        type="checkbox"
                        checked={selectedProducts.has(product.productId)}
                        onChange={() => toggleProductSelection(product.productId)}
                        className="w-4 h-4 text-[#00365a] border-gray-300 rounded focus:ring-[#00365a]"
                      />
                    </div>

                    {/* Ürün Görseli */}
                    <div className="aspect-square mb-3 bg-gray-100 rounded-lg overflow-hidden">
                      <OptimizedImage
                        src={product.productImage}
                        alt={product.name}
                        className="w-full h-full p-2"
                        placeholder={
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <div className="text-center">
                              <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <p className="text-xs">Görsel Yok</p>
                            </div>
                          </div>
                        }
                      />
                    </div>

                    {/* Ürün Bilgileri */}
                    <div className="space-y-2">
                      <h3 className="font-medium text-gray-900 text-sm line-clamp-2">
                        {product.name}
                      </h3>
                      {product.collection && (
                        <p className="text-xs text-[#00365a] font-medium">
                          {product.collection.name}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {visibleProducts.length === 0 && (
                <div className="text-center py-12">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2-2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p className="text-gray-500">Henüz ürün bulunmuyor</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EKatalogPage; 
