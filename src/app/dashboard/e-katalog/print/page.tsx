'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToken } from '@/app/hooks/useToken';

interface Product {
  productId: string;
  name: string;
  description: string;
  productImage: string;
  collection?: {
    name: string;
  };
}

interface GroupedProducts {
  [collectionName: string]: Product[];
}

const PrintCatalogPage = () => {
  const router = useRouter();
  const token = useToken();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
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
      
      if (mobileCheck) {
        setLoading(false);
        return;
      }
    }

    // localStorage'dan seçili ürün ID'lerini al
    const selectedProductIds = localStorage.getItem('selectedProductsForPrint');
    
    if (selectedProductIds && selectedProductIds !== 'null' && selectedProductIds !== 'undefined') {
      try {
        const productIds = JSON.parse(selectedProductIds);
        
        if (Array.isArray(productIds) && productIds.length > 0) {
          fetchSelectedProducts(productIds);
        } else {
          showTestProducts();
        }
      } catch (error) {
        console.error('❌ Seçili ürünler okunurken hata:', error);
        showTestProducts();
      }
    } else {
      showTestProducts();
    }
  }, []);

  const showTestProducts = useCallback(() => {
    const testProducts: Product[] = [
      {
        productId: 'test-1',
        name: 'Test Halı 1',
        description: 'Bu bir test ürünüdür. E-katalog test amaçlı oluşturulmuştur.',
        productImage: '', // Remove placeholder images to reduce loading
        collection: {
          name: 'Test Koleksiyonu'
        }
      },
      {
        productId: 'test-2',
        name: 'Test Halı 2',
        description: 'İkinci test ürünü. Yazdırma testi için kullanılmaktadır.',
        productImage: '',
        collection: {
          name: 'Test Koleksiyonu'
        }
      }
    ];
    
    setProducts(testProducts);
    setLoading(false);
  }, []);

  // Optimize print trigger with dynamic delay based on product count
  useEffect(() => {
    if (!loading && products.length > 0) {
      // Dynamic delay based on number of products
      const baseDelay = 1000;
      const perProductDelay = Math.min(50, products.length * 5); // Max 50ms per product
      const totalDelay = baseDelay + perProductDelay;
      
      
      const timer = setTimeout(() => {
        try {
          // Additional delay for content rendering
          const printDelay = products.length > 50 ? 3000 : products.length > 20 ? 2000 : 1500;
          
          const printTimer = setTimeout(() => {
            window.print();
            
            // Cleanup after print
            setTimeout(() => {
              localStorage.removeItem('selectedProductsForPrint');
            }, 2000);
          }, printDelay);
          
          return () => clearTimeout(printTimer);
        } catch (error) {
          console.error('Yazdırma hatası:', error);
        }
      }, totalDelay);
      
      return () => clearTimeout(timer);
    }
  }, [loading, products]);

  const fetchSelectedProducts = async (productIds: string[]) => {
    try {
      const authToken = token;
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://pashahomeapps.up.railway.app'}/api/products/by-ids`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ productIds })
      });


      if (!response.ok) {
        await fetchAllProductsAndFilter(productIds);
        return;
      }

      const data = await response.json();
      
      if (data.success && Array.isArray(data.data)) {
        setProducts(data.data);
      } else {
        await fetchAllProductsAndFilter(productIds);
      }
    } catch (error) {
      console.error('❌ Ürünler yüklenirken hata:', error);
      await fetchAllProductsAndFilter(productIds);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllProductsAndFilter = async (selectedIds: string[]) => {
    try {
      
      const authToken = token;
      const params = new URLSearchParams({
        limit: '200', // Limit for performance
        page: '1'
      });
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://pashahomeapps.up.railway.app'}/api/products?${params}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Tüm ürünler yüklenirken hata oluştu');
      }

      const data = await response.json();
      
      if (data.success && Array.isArray(data.data)) {
        // Seçili ID'lere göre filtrele
        const filteredProducts = data.data.filter((product: Product) => 
          selectedIds.includes(product.productId)
        );
        
        setProducts(filteredProducts);
      } else {
        throw new Error('Ürün verisi alınamadı');
      }
    } catch (error) {
      console.error('❌ Alternatif yöntem de başarısız:', error);
      showTestProducts();
    }
  };

  const getGroupedProducts = (): GroupedProducts => {
    const grouped: GroupedProducts = {};
    
    products.forEach(product => {
      const collectionName = product.collection?.name || 'Diğer';
      if (!grouped[collectionName]) {
        grouped[collectionName] = [];
      }
      grouped[collectionName].push(product);
    });
    
    return grouped;
  };

  // Handle image errors
  const handleImageError = useCallback((productId: string) => {
    setImageErrors(prev => new Set(prev).add(productId));
  }, []);

  const groupedProducts = getGroupedProducts();

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
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                />
              </svg>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Yazdırma Sadece Masaüstünde
              </h2>
              <p className="text-gray-600 leading-relaxed">
                Katalog yazdırma özelliği sadece masaüstü bilgisayarlarda çalışmaktadır. 
                Lütfen bir bilgisayar kullanarak tekrar deneyin.
              </p>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={() => router.push('/dashboard/e-katalog')}
                className="w-full px-6 py-3 bg-[#00365a] text-white rounded-lg hover:bg-[#004170] transition-colors font-medium"
              >
                E-Katalog Sayfasına Dön
              </button>
              <p className="text-sm text-gray-500">
                PDF oluşturma ve yazdırma için masaüstü gereklidir
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00365a] mx-auto mb-4"></div>
          <p className="text-gray-600">Katalog hazırlanıyor...</p>
          <p className="text-sm text-gray-500 mt-2">Ürünler yükleniyor, lütfen bekleyin...</p>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="text-6xl mb-4">📄</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">E-Katalog</h1>
          <p className="text-gray-600 mb-4">Yazdırılabilir katalog sayfası</p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-sm text-blue-800">
              <strong>Bilgi:</strong> Bu sayfa yazdırma için tasarlanmıştır. 
              E-katalog sayfasından ürün seçerek buraya gelin.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Optimized Print Styles */}
      <style jsx global>{`
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          
          /* Hide non-essential elements */
          header, nav, .header, .navbar, .navigation,
          *[class*="header"], *[class*="nav"], *[class*="cart"],
          *[class*="sepet"], *[href*="sepetim"], *[href*="cart"] {
            display: none !important;
          }
          
          .print-page {
            page-break-after: always !important;
            page-break-inside: avoid !important;
            width: 210mm !important;
            min-height: 297mm !important;
            padding: 15mm !important;
            margin: 0 !important;
            box-sizing: border-box !important;
            background: white !important;
          }
          
          .print-page:last-child {
            page-break-after: avoid !important;
          }

          .collection-banner {
            background: linear-gradient(135deg, #00365a 0%, #004170 100%) !important;
            color: white !important;
            padding: 5mm 12mm !important;
            margin: -15mm -15mm 5mm -15mm !important;
            border-radius: 0 0 8px 8px !important;
          }

          .collection-banner-title {
            font-size: 22px !important;
            font-weight: bold !important;
            text-transform: uppercase !important;
            color: white !important;
          }

          .collection-banner-subtitle {
            font-size: 14px !important;
            color: white !important;
            opacity: 0.9 !important;
          }

          .collection-banner-brand {
            font-size: 20px !important;
            font-weight: bold !important;
            color: white !important;
          }

          .cover-page {
            page-break-after: always !important;
            background-image: url('https://s3.tebi.io/pashahome/istockphoto-1053718250-612x612.jpg') !important;
            background-size: cover !important;
            background-position: center !important;
            background-repeat: no-repeat !important;
            color: white !important;
            position: relative !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .cover-page h1 {
            color: #ffffff !important;
            font-size: 48px !important;
            font-weight: 900 !important;
            margin-bottom: 20mm !important;
            text-shadow: 0 2px 4px rgba(0,0,0,0.5) !important;
          }
          
          .cover-page p, .cover-page div {
            color: #ffffff !important;
          }

          .page-header {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            margin-bottom: 12mm !important;
            padding: 8mm 12mm !important;
            border-bottom: 2px solid #00365a !important;
            background: white !important;
          }

          .header-title {
            font-size: 26px !important;
            font-weight: bold !important;
            color: #00365a !important;
          }

          .page-content {
            background: white !important;
            padding: 8mm 0 !important;
          }
          
          .product-grid {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 8mm !important;
            margin-top: 8mm !important;
          }
          
          .product-grid.grid-2 {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 10mm !important;
          }
          
          .product-grid.grid-6 {
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 6mm !important;
          }
          
          .product-item {
            break-inside: avoid !important;
            border: 1px solid #e5e5e5 !important;
            border-radius: 6px !important;
            padding: 6mm !important;
            background: white !important;
          }
          
          .product-image {
            width: 100% !important;
            height: 50mm !important;
            object-fit: contain !important;
            border-radius: 4px !important;
            margin-bottom: 4mm !important;
            background: #f8f9fa !important;
          }

          .product-image-placeholder {
            width: 100% !important;
            height: 50mm !important;
            background: #f8f9fa !important;
            border: 2px dashed #dee2e6 !important;
            border-radius: 4px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            margin-bottom: 4mm !important;
          }
          
          .collection-header {
            background: #00365a !important;
            color: white !important;
            padding: 8mm !important;
            border-radius: 8px !important;
            margin-bottom: 8mm !important;
          }

          .collection-title {
            font-size: 24px !important;
            font-weight: bold !important;
            text-transform: uppercase !important;
            color: white !important;
          }

          /* Optimize images for print */
          img {
            max-width: 100% !important;
            height: auto !important;
            image-rendering: optimizeQuality !important;
          }
        }
      `}</style>

      {/* Print Content */}
      <div className="print-content">
        {/* Cover Page with Background Image */}
        <div className="print-page cover-page">
          {/* Background Image */}
          <img 
            src="https://s3.tebi.io/pashahome/istockphoto-1053718250-612x612.jpg"
            alt=""
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              zIndex: 0,
              opacity: 0.7,
              filter: 'brightness(0.8) contrast(0.9)'
            }}
          />
          
          <div className="h-full flex flex-col justify-center items-center text-center relative" style={{ zIndex: 1 }}>
            {/* Overlay */}
            <div className="absolute inset-0 bg-black bg-opacity-40" style={{ zIndex: 1 }}></div>
            
            {/* Content */}
            <div className="relative z-10 text-white" style={{ zIndex: 2 }}>
              <div className="mb-12">
                <img 
                  src="/logo.svg" 
                  alt="Paşa Home Logo" 
                  className="h-20 mx-auto mb-8"
                  style={{ filter: 'brightness(0) invert(1)' }}
                />
              </div>
              
              <div>
                <h1 className="text-5xl font-bold mb-6" style={{ 
                  color: '#ffffff !important',
                  fontWeight: '900',
                  textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact'
                }}>E-KATALOG</h1>
                <div className="w-32 h-1 mx-auto mb-8" style={{ backgroundColor: '#ffffff' }}></div>
                <p className="text-2xl mb-3" style={{ 
                  color: '#ffffff !important',
                  fontWeight: '700',
                  textShadow: '0 1px 3px rgba(0,0,0,0.4)',
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact'
                }}>Halı Koleksiyonu</p>
                <p className="text-xl mt-2" style={{ 
                  color: '#ffffff !important',
                  fontWeight: '600',
                  textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact',
                  opacity: '0.9'
                }}>{new Date().getFullYear()}</p>
              </div>
              
              <div className="mt-16">
                <p className="text-2xl font-medium" style={{ 
                  color: '#ffffff !important',
                  fontWeight: '800',
                  textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact'
                }}>PAŞA HOME</p>
                <p className="text-lg mt-2" style={{ 
                  color: '#ffffff !important',
                  fontWeight: '600',
                  textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact',
                  opacity: '0.8'
                }}>
                  {new Date().toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Product Pages - Optimized for performance */}
        {Object.entries(groupedProducts).map(([collectionName, collectionProducts], collectionIndex) => {
          // Aynı koleksiyondaki ürünleri 6'şarlı grupla
          const productsPerPage = 6;
          const pages = [];
          
          
          for (let i = 0; i < collectionProducts.length; i += productsPerPage) {
            const productsInPage = collectionProducts.slice(i, i + productsPerPage);
            
            if (productsInPage.length === 0) continue;
            
            pages.push(
              <div key={`${collectionName}-page-${Math.floor(i / productsPerPage)}`} className="print-page">
                {/* Collection Banner */}
                <div className="collection-banner">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div className="collection-banner-title">{collectionName}</div>
                      <div className="collection-banner-subtitle">KOLEKSİYONU</div>
                    </div>
                    <div className="collection-banner-brand">PAŞA HOME</div>
                  </div>
                </div>
                
                {/* Page Header */}
                <div className="page-header">
                  <div className="header-title">PAŞA HOME E-KATALOG</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#00365a' }}>
                    PAŞA HOME
                  </div>
                </div>
                
                {/* Page Content */}
                <div className="page-content">
                  <div className="product-grid grid-6">
                    {productsInPage.map((product) => (
                      <div key={product.productId} className="product-item">
                        {/* Optimized Product Image */}
                        <div className="mb-3">
                          {product.productImage && !imageErrors.has(product.productId) ? (
                            <img
                              src={product.productImage}
                              alt={product.name}
                              className="product-image"
                              loading="lazy"
                              onError={() => handleImageError(product.productId)}
                            />
                          ) : (
                            <div className="product-image-placeholder">
                              <svg width="32" height="32" fill="#adb5bd" viewBox="0 0 24 24">
                                <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        
                        {/* Product Info */}
                        <div className="text-center">
                          <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '2mm', lineHeight: '1.3' }}>
                            {product.name}
                          </h3>
                          {product.description && (
                            <p style={{ fontSize: '12px', color: '#6c757d', lineHeight: '1.4' }}>
                              {product.description.length > 60 
                                ? product.description.substring(0, 60) + '...' 
                                : product.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          }
          
          return pages;
        })}
      </div>
    </>
  );
};

export default PrintCatalogPage; 