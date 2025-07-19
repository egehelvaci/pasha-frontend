'use client';

import { useEffect, useState } from 'react';
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

  const showTestProducts = () => {
    console.log('🧪 Test ürünleri yükleniyor...');
    const testProducts: Product[] = [
      {
        productId: 'test-1',
        name: 'Test Halı 1',
        description: 'Bu bir test ürünüdür. E-katalog test amaçlı oluşturulmuştur.',
        productImage: 'https://via.placeholder.com/300x200/00365a/ffffff?text=Test+Halı+1',
        collection: {
          name: 'Test Koleksiyonu'
        }
      },
      {
        productId: 'test-2',
        name: 'Test Halı 2',
        description: 'İkinci test ürünü. Yazdırma testi için kullanılmaktadır.',
        productImage: 'https://via.placeholder.com/300x200/004170/ffffff?text=Test+Halı+2',
        collection: {
          name: 'Test Koleksiyonu'
        }
      },
      {
        productId: 'test-3',
        name: 'Test Halı 3',
        description: 'Üçüncü test ürünü. Katalog görünümü test edilmektedir.',
        productImage: 'https://via.placeholder.com/300x200/005a9e/ffffff?text=Test+Halı+3',
        collection: {
          name: 'Test Koleksiyonu'
        }
      },
      {
        productId: 'test-4',
        name: 'Test Halı 4',
        description: 'Dördüncü test ürünü. Print sayfası test edilmektedir.',
        productImage: 'https://via.placeholder.com/300x200/006bcc/ffffff?text=Test+Halı+4',
        collection: {
          name: 'Test Koleksiyonu'
        }
      }
    ];
    
    setProducts(testProducts);
    setLoading(false);
  };

  useEffect(() => {
    // Ürünler yüklendikten sonra otomatik yazdırma dialogunu aç
    if (!loading && products.length > 0) {
      // Kısa bir gecikme ile yazdırma dialogunu aç
      const timer = setTimeout(() => {
        try {
          window.print();
          
          // Yazdırma işlemi tamamlandıktan sonra localStorage'ı temizle
          setTimeout(() => {
            localStorage.removeItem('selectedProductsForPrint');
            console.log('🧹 localStorage temizlendi');
          }, 2000);
        } catch (error) {
          console.error('Yazdırma hatası:', error);
        }
      }, 1000); // Daha uzun gecikme ile içeriğin tam yüklenmesini bekle
      
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
        // Alternatif: Tüm ürünleri çek ve seçili olanları filtrele
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
        limit: '1000',
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

  const groupedProducts = getGroupedProducts();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00365a] mx-auto mb-4"></div>
          <p className="text-gray-600">Katalog hazırlanıyor...</p>
          <p className="text-sm text-gray-500 mt-2">Ürünler yükleniyor, lütfen bekleyin...</p>
        </div>
      </div>
    );
  }

  // Eğer hiç ürün yoksa da bir mesaj göster
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
      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          body {
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Sepet simgesi ve header elementlerini güçlü şekilde gizle */
          header,
          nav,
          .header,
          .navbar,
          .navigation,
          *[class*="header"],
          *[class*="nav"],
          *[class*="cart"],
          *[class*="sepet"],
          *[href*="sepetim"],
          *[href*="cart"],
          .cart-icon,
          .shopping-cart,
          .FaShoppingCart,
          svg[class*="cart"],
          button[class*="cart"],
          a[href*="sepetim"],
          a[href*="cart"] {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
          }
          
          .print-page {
            page-break-after: always !important;
            page-break-inside: avoid !important;
            width: 210mm !important;
            min-height: 297mm !important;
            height: 297mm !important;
            padding: 15mm !important;
            margin: 0 !important;
            box-sizing: border-box !important;
            position: relative !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .print-page:last-child {
            page-break-after: avoid !important;
          }

          .collection-banner {
            background: linear-gradient(135deg, #00365a 0%,rgb(148, 73, 3) 100%) !important;
            color: white !important;
            padding: 5mm 12mm !important;
            margin: -15mm -15mm 5mm -15mm !important;
            border-radius: 0 0 8px 8px !important;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2) !important;
            position: relative !important;
            z-index: 5 !important;
          }

          .collection-banner-content {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
          }

          .collection-banner-left {
            flex: 1 !important;
          }

          .collection-banner-right {
            flex: 1 !important;
            text-align: right !important;
          }

          .collection-banner-title {
            font-size: 22px !important;
            font-weight: bold !important;
            text-transform: uppercase !important;
            letter-spacing: 1px !important;
            margin-bottom: 1mm !important;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3) !important;
            color: white !important;
          }

          .collection-banner-subtitle {
            font-size: 14px !important;
            font-weight: 500 !important;
            opacity: 0.9 !important;
            letter-spacing: 0.5px !important;
            color: white !important;
          }

          .collection-banner-brand {
            font-size: 24px !important;
            font-weight: bold !important;
            text-transform: uppercase !important;
            letter-spacing: 1px !important;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3) !important;
            color: white !important;
          }

          .collection-banner-catalog {
            font-size: 14px !important;
            font-weight: 600 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.5px !important;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3) !important;
            color: white !important;
            margin-top: 1mm !important;
            opacity: 0.9 !important;
          }

          .collection-banner-logo {
            display: flex !important;
            justify-content: flex-end !important;
            align-items: center !important;
            margin-bottom: 1mm !important;
          }

          .collection-banner-logo img {
            height: 15mm !important;
            filter: brightness(0) invert(1) !important;
            -webkit-filter: brightness(0) invert(1) !important;
          }

          .cover-page {
            page-break-after: always !important;
            background-image: url('https://s3.tebi.io/pashahome/istockphoto-1053718250-612x612.jpg') !important;
            background-size: cover !important;
            background-position: center !important;
            background-repeat: no-repeat !important;
            background-attachment: fixed !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Kapak yazıları için özel kurallar */
          .cover-page h1,
          .cover-page p,
          .cover-page .text-white {
            color: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .cover-page h1 {
            font-weight: 900 !important;
            text-shadow: 0 2px 4px rgba(0,0,0,0.5) !important;
          }

          .cover-page p {
            font-weight: 600 !important;
            text-shadow: 0 1px 3px rgba(0,0,0,0.4) !important;
          }

          /* Background için ekstra kurallar */
          [style*="background-image"] {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .page-header {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            margin-bottom: 12mm !important;
            padding: 8mm 12mm !important;
            border-bottom: 2px solid #00365a !important;
            background: rgba(255, 255, 255, 0.98) !important;
            border-radius: 8px !important;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important;
          }

          .header-left {
            display: flex !important;
            align-items: center !important;
            gap: 10mm !important;
          }

          .header-logo {
            height: 15mm !important;
          }

          .header-title {
            font-size: 26px !important;
            font-weight: bold !important;
            color: #00365a !important;
            letter-spacing: 1px !important;
            line-height: 1.2 !important;
          }

          .page-content {
            background: rgba(255, 255, 255, 0.97) !important;
            border-radius: 12px !important;
            padding: 8mm !important;
            min-height: calc(297mm - 100mm) !important;
          }
          
          .product-grid {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 12mm !important;
            margin-top: 10mm !important;
          }
          
          .product-item {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            border: 1px solid #e5e5e5 !important;
            border-radius: 8px !important;
            padding: 8mm !important;
            background: white !important;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
          }
          
          .product-image {
            width: 100% !important;
            height: 55mm !important;
            object-fit: contain !important;
            border-radius: 4px !important;
            margin-bottom: 5mm !important;
            background: #f8f9fa !important;
          }
          
          .collection-header {
            background: rgba(0, 54, 90, 0.95) !important;
            color: white !important;
            padding: 12mm !important;
            border-radius: 12px !important;
            margin-bottom: 10mm !important;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2) !important;
          }

          .collection-title {
            font-size: 26px !important;
            font-weight: bold !important;
            margin-bottom: 4mm !important;
            text-transform: uppercase !important;
            letter-spacing: 1px !important;
          }
        }
        
        @media screen {
          body {
            background: white;
            margin: 0;
            padding: 0;
          }
          
          .print-content {
            display: block !important;
          }
          
          /* Ekran görünümünde minimal içerik */
          @media screen and (max-width: 100px) {
            .print-content {
              display: none !important;
            }
          }
        }
      `}</style>

      {/* Print Content */}
      <div className="print-content">
        {/* Kapak Sayfası */}
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
            {/* Şeffaf overlay */}
            <div className="absolute inset-0 bg-black bg-opacity-40 rounded-lg" style={{ zIndex: 1 }}></div>
            
            {/* İçerik */}
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
                <h1 className="text-5xl font-bold mb-6 text-white" style={{ 
                  color: 'white',
                  fontWeight: '900',
                  textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact'
                }}>E-KATALOG</h1>
                <div className="w-32 h-1 bg-white mx-auto mb-8"></div>
                <p className="text-2xl mb-3 text-white" style={{ 
                  color: 'white',
                  fontWeight: '700',
                  textShadow: '0 1px 3px rgba(0,0,0,0.4)',
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact'
                }}>Halı Koleksiyonu</p>
                <p className="text-xl opacity-90 text-white" style={{ 
                  color: 'white',
                  fontWeight: '600',
                  textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact'
                }}>{new Date().getFullYear()}</p>
              </div>
              
              <div className="mt-16">
                <p className="text-2xl font-medium text-white" style={{ 
                  color: 'white',
                  fontWeight: '800',
                  textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact'
                }}>PAŞA HOME</p>
                <p className="text-lg opacity-80 mt-2 text-white" style={{ 
                  color: 'white',
                  fontWeight: '600',
                  textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact'
                }}>
                  {new Date().toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Koleksiyon Sayfaları - Ürünlerle devam ediyor */}
        {Object.entries(groupedProducts).length > 0 && Object.entries(groupedProducts).map(([collectionName, collectionProducts], collectionIndex) => {
          // Her 4 üründe bir yeni sayfa (daha iyi görünüm için)
          const pages = [];
          for (let i = 0; i < collectionProducts.length; i += 4) {
            const productsInPage = collectionProducts.slice(i, i + 4);
            
            // Eğer bu sayfada hiç ürün yoksa sayfayı oluşturma
            if (productsInPage.length === 0) continue;
            
            pages.push(
              <div key={`${collectionName}-page-${Math.floor(i / 4)}`} className="print-page">
                {/* Koleksiyon Banner - Sayfanın en üstünde */}
                <div className="collection-banner">
                  <div className="collection-banner-content">
                    <div className="collection-banner-left">
                      <div className="collection-banner-title">{collectionName}</div>
                      <div className="collection-banner-subtitle">KOLEKSİYONU</div>
                    </div>
                    <div className="collection-banner-right">
                      <div className="collection-banner-logo">
                        <img src="/logo.svg" alt="Paşa Home Logo" style={{ 
                          height: '20mm', 
                          filter: 'brightness(0) invert(1)',
                          marginBottom: '2mm'
                        }} />
                      </div>
                      <div className="collection-banner-catalog">E-KATALOG</div>
                    </div>
                  </div>
                </div>
                
                {/* Sayfa Başlığı - PAŞA HOME E-KATALOG */}
                <div className="page-header">
                  <div className="header-left">
                    <img src="/logo.svg" alt="Paşa Home Logo" className="header-logo" />
                    <div className="flex flex-col">
                      <span className="header-title">PAŞA HOME E-KATALOG</span>
                      <span style={{ fontSize: '14px', color: '#00365a', marginTop: '3px', fontWeight: '500' }}>Pasha Home</span>
                    </div>
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#00365a' }}>
                    PAŞA HOME
                  </div>
                </div>
                
                {/* Sayfa İçeriği */}
                <div className="page-content">
                  {/* Ürünler Grid */}
                  <div className="product-grid">
                    {productsInPage.map((product) => (
                      <div key={product.productId} className="product-item">
                        {/* Ürün Resmi */}
                        <div className="mb-4">
                          {product.productImage ? (
                            <img
                              src={product.productImage}
                              alt={product.name}
                              className="product-image"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="product-image bg-gray-100 flex items-center justify-center">
                              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        
                        {/* Ürün Bilgileri */}
                        <div className="text-center">
                          <h3 className="font-semibold text-base text-gray-900 mb-2" style={{ fontSize: '14px', lineHeight: '1.3' }}>
                            {product.name}
                          </h3>
                          {product.description && (
                            <p className="text-sm text-gray-600" style={{ fontSize: '12px', lineHeight: '1.4' }}>
                              {product.description.length > 80 
                                ? product.description.substring(0, 80) + '...' 
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