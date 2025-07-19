'use client';

import { useEffect, useState, useCallback } from 'react';
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
  const token = useToken();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  
  useEffect(() => {
    // localStorage'dan seçili ürün ID'lerini al
    const selectedProductIds = localStorage.getItem('selectedProductsForPrint');
    console.log('🔍 localStorage\'dan alınan veri:', selectedProductIds);
    
    if (selectedProductIds && selectedProductIds !== 'null' && selectedProductIds !== 'undefined') {
      try {
        const productIds = JSON.parse(selectedProductIds);
        console.log('📋 Parse edilen ürün ID\'leri:', productIds);
        
        if (Array.isArray(productIds) && productIds.length > 0) {
          console.log('✅ Gerçek ürünler yükleniyor...');
          fetchSelectedProducts(productIds);
        } else {
          console.log('❌ Ürün listesi boş veya geçersiz');
          showTestProducts();
        }
      } catch (error) {
        console.error('❌ Seçili ürünler okunurken hata:', error);
        showTestProducts();
      }
    } else {
      console.log('❌ localStorage\'da selectedProductsForPrint verisi yok veya geçersiz');
      showTestProducts();
    }
  }, []);

  const showTestProducts = useCallback(() => {
    console.log('🧪 Test ürünleri yükleniyor...');
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

  // Optimize print trigger
  useEffect(() => {
    if (!loading && products.length > 0) {
      const timer = setTimeout(() => {
        try {
          // Delay print to ensure all content is rendered
          const printTimer = setTimeout(() => {
            window.print();
            
            // Cleanup after print
            setTimeout(() => {
              localStorage.removeItem('selectedProductsForPrint');
              console.log('🧹 localStorage temizlendi');
            }, 2000);
          }, 2000); // Longer delay for low-end devices
          
          return () => clearTimeout(printTimer);
        } catch (error) {
          console.error('Yazdırma hatası:', error);
        }
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [loading, products]);

  const fetchSelectedProducts = async (productIds: string[]) => {
    try {
      const authToken = token;
      console.log('🔑 Token:', authToken ? 'Mevcut' : 'Yok');
      console.log('📤 API\'ye gönderilen ürün ID\'leri:', productIds);
      
      const response = await fetch('https://pasha-backend-production.up.railway.app/api/products/by-ids', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ productIds })
      });

      console.log('📡 API Response status:', response.status);

      if (!response.ok) {
        console.log('❌ API çağrısı başarısız, alternatif yöntem deneniyor...');
        await fetchAllProductsAndFilter(productIds);
        return;
      }

      const data = await response.json();
      console.log('📥 API Response data:', data);
      
      if (data.success && Array.isArray(data.data)) {
        console.log('✅ Ürünler başarıyla yüklendi:', data.data.length);
        setProducts(data.data);
      } else {
        console.log('❌ API response başarısız, alternatif yöntem deneniyor...');
        await fetchAllProductsAndFilter(productIds);
      }
    } catch (error) {
      console.error('❌ Ürünler yüklenirken hata:', error);
      console.log('🔄 Alternatif yöntem deneniyor...');
      await fetchAllProductsAndFilter(productIds);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllProductsAndFilter = async (selectedIds: string[]) => {
    try {
      console.log('🔄 Tüm ürünler çekiliyor ve filtreleniyor...');
      
      const authToken = token;
      const params = new URLSearchParams({
        limit: '200', // Limit for performance
        page: '1'
      });
      
      const response = await fetch(`https://pasha-backend-production.up.railway.app/api/products?${params}`, {
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
        
        console.log('✅ Filtrelenmiş ürünler:', filteredProducts.length);
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
            background: linear-gradient(135deg, #00365a 0%, #004170 100%) !important;
            color: white !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            text-align: center !important;
          }

          .cover-page h1 {
            color: white !important;
            font-size: 48px !important;
            font-weight: 900 !important;
            margin-bottom: 20mm !important;
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
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 10mm !important;
            margin-top: 8mm !important;
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
        {/* Simplified Cover Page */}
        <div className="print-page cover-page">
          <div>
            <h1>E-KATALOG</h1>
            <div style={{ width: '60mm', height: '2px', background: 'white', margin: '0 auto 15mm' }}></div>
            <p style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8mm' }}>Halı Koleksiyonu</p>
            <p style={{ fontSize: '20px', fontWeight: '600' }}>PAŞA HOME</p>
            <p style={{ fontSize: '16px', marginTop: '4mm' }}>
              {new Date().toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Product Pages - Optimized for performance */}
        {Object.entries(groupedProducts).map(([collectionName, collectionProducts], collectionIndex) => {
          // Reduce products per page for better performance on low-end devices
          const productsPerPage = 4;
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
                  <div className="product-grid">
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