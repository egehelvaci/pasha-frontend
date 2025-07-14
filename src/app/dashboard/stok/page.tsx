'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';

interface Collection {
  collectionId: string;
  name: string;
  code: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CutType {
  id: number;
  name: string;
}

interface SizeOption {
  id: number;
  width: number;
  height: number;
  is_optional_height: boolean;
  stockQuantity: number;
}

interface Variation {
  width: number;
  height: number;
  stockQuantity: number;
}

interface Product {
  productId: string;
  name: string;
  description: string;
  productImage: string;
  collectionId: string;
  createdAt: string;
  updatedAt: string;
  rule_id: number;
  collection: Collection;
  canHaveFringe: boolean;
  hasFringe: boolean;
  cutTypes: CutType[];
  sizeOptions: SizeOption[];
  variations: Variation[];
}

interface ProductsResponse {
  success: boolean;
  data: Product[];
  message?: string;
}

interface ProductDetailResponse {
  success: boolean;
  data: Product;
  message?: string;
}

interface StockUpdateRequest {
  width: number;
  height: number;
  quantity: number;
}

interface StockUpdateResponse {
  success: boolean;
  data: Product;
  message?: string;
}

export default function StokPage() {
  const { user, isLoading, token, isAdmin } = useAuth();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSizeOption, setSelectedSizeOption] = useState<SizeOption | null>(null);
  const [stockForm, setStockForm] = useState<StockUpdateRequest>({
    width: 0,
    height: 0,
    quantity: 0
  });
  const [isUpdatingStock, setIsUpdatingStock] = useState(false);
  const [isLoadingProductDetail, setIsLoadingProductDetail] = useState(false);

  useEffect(() => {
    if (!user && !isLoading) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  // Admin kontrolü
  useEffect(() => {
    if (user && !isAdmin) {
      router.push('/dashboard');
    }
  }, [user, isAdmin, router]);

  useEffect(() => {
    if (!token) return;
    fetchProducts();
  }, [token]);

  const fetchProducts = async () => {
    try {
      const response = await fetch('https://pasha-backend-production.up.railway.app/api/products', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data: ProductsResponse = await response.json();
        console.log('API Response:', data);
        if (data.success) {
          console.log('First product:', data.data[0]);
          console.log('First product sizeOptions:', data.data[0]?.sizeOptions);
          // Ürünleri alfabetik sıraya göre düzenle
          const sortedProducts = data.data.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
          setProducts(sortedProducts);
        }
      }
    } catch (error) {
      console.error('Ürünler çekme hatası:', error);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  // Ürün detaylarını GET ile çek
  const fetchProductDetail = async (productId: string): Promise<Product | null> => {
    try {
      setIsLoadingProductDetail(true);
      
      console.log('=== ÜRÜN DETAY ÇEKME BAŞLIYOR ===');
      console.log('Product ID:', productId);
      
      // Önce normal product endpoint'ini deneyelim
      const normalUrl = `https://pasha-backend-production.up.railway.app/api/products/${productId}`;
      console.log('Normal GET URL:', normalUrl);
      console.log('Token mevcut:', !!token);
      
      const response = await fetch(normalUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('=== GET RESPONSE ===');
      console.log('GET Response status:', response.status);
      
      if (response.ok) {
        const data: ProductDetailResponse = await response.json();
        console.log('GET Response data:', data);
        
        if (data.success && data.data) {
          console.log('✅ GET başarılı - Product ID:', data.data.productId);
          console.log('Product name:', data.data.name);
          console.log('SizeOptions count:', data.data.sizeOptions?.length || 0);
          console.log('Variations count:', data.data.variations?.length || 0);
          return data.data;
        } else {
          console.error('❌ GET başarısız veya data boş:', data);
          
          // Eğer normal endpoint çalışmazsa variations endpoint'ini deneyelim
          console.log('Normal endpoint başarısız, variations endpoint deneniyor...');
          return await fetchProductDetailVariations(productId);
        }
      } else {
        const errorText = await response.text();
        console.error('❌ GET HTTP Error:', {
          status: response.status,
          statusText: response.statusText,
          response: errorText
        });
        
        // Normal endpoint başarısızsa variations endpoint'ini deneyelim
        console.log('Normal endpoint HTTP hatası, variations endpoint deneniyor...');
        return await fetchProductDetailVariations(productId);
      }
    } catch (error) {
      console.error('❌ GET Network Error:', error);
      
      // Network hatası durumunda da variations endpoint'ini deneyelim
      console.log('Network hatası, variations endpoint deneniyor...');
      return await fetchProductDetailVariations(productId);
    } finally {
      setIsLoadingProductDetail(false);
    }
  };

  // Variations endpoint'ini deneyen yardımcı fonksiyon
  const fetchProductDetailVariations = async (productId: string): Promise<Product | null> => {
    try {
      const variationsUrl = `https://pasha-backend-production.up.railway.app/api/products/${productId}/variations`;
      console.log('Variations GET URL:', variationsUrl);
      
      const response = await fetch(variationsUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Variations Response status:', response.status);
      
      if (response.ok) {
        const data: ProductDetailResponse = await response.json();
        console.log('Variations Response data:', data);
        
        if (data.success && data.data) {
          console.log('✅ Variations GET başarılı - Product ID:', data.data.productId);
          return data.data;
        } else {
          console.error('❌ Variations GET başarısız veya data boş:', data);
          alert(`Ürün detayları alınırken hata oluştu: ${data.message || 'Bilinmeyen hata'}`);
          return null;
        }
      } else {
        const errorText = await response.text();
        console.error('❌ Variations HTTP Error:', {
          status: response.status,
          statusText: response.statusText,
          response: errorText
        });
        alert(`Ürün detayları alınırken hata oluştu! Status: ${response.status}`);
        return null;
      }
    } catch (error) {
      console.error('❌ Variations Network Error:', error);
      alert('Ürün detayları alınırken hata oluştu!');
      return null;
    }
  };

  const openStockModal = async (product: Product) => {
    console.log('=== MODAL AÇILIYOR ===');
    console.log('Seçilen ürün:', product.name);
    console.log('Seçilen ürün ID:', product.productId);
    console.log('Product object:', product);
    
    // Product ID kontrolü
    if (!product.productId) {
      console.error('❌ KRITIK HATA: Gelen product ID undefined!', product);
      alert('Ürün ID\'si bulunamadı! Lütfen sayfayı yenileyip tekrar deneyin.');
      return;
    }
    
    // Önce ürün detaylarını GET ile çek
    const detailedProduct = await fetchProductDetail(product.productId);
    
    // Eğer detaylı ürün bilgisi alınamazsa, mevcut ürün bilgisiyle devam et
    let productToUse: Product;
    
    if (!detailedProduct || !detailedProduct.productId) {
      console.log('⚠️ Detaylı ürün bilgisi alınamadı, mevcut ürün bilgisiyle devam ediliyor');
      productToUse = product;
    } else {
      console.log('✅ Detaylı ürün bilgisi alındı');
      console.log('Original Product ID:', product.productId);
      console.log('Detailed Product ID:', detailedProduct.productId);
      console.log('ID\'ler eşit mi?:', product.productId === detailedProduct.productId);
      productToUse = detailedProduct;
    }
    
    console.log('Kullanılacak ürün:', productToUse);
    console.log('Kullanılacak ürün ID:', productToUse.productId);
    
    // selectedProduct'ı set et
    setSelectedProduct(productToUse);
    
    // Set edildikten sonra kontrol et
    console.log('selectedProduct set edildi, kontrol ediliyor...');
    
    // İlk boyut seçeneğini varsayılan olarak seç
    if (productToUse.sizeOptions && productToUse.sizeOptions.length > 0) {
      const firstOption = productToUse.sizeOptions[0];
      console.log('İlk size option seçildi:', firstOption);
      setSelectedSizeOption(firstOption);
      setStockForm({
        width: firstOption.width,
        height: firstOption.height,
        quantity: 1
      });
    } else if (productToUse.variations && productToUse.variations.length > 0) {
      // Eğer sizeOptions yoksa variations'ı kullan
      const firstVariation = productToUse.variations[0];
      console.log('İlk variation seçildi:', firstVariation);
      setSelectedSizeOption(null);
      setStockForm({
        width: firstVariation.width,
        height: firstVariation.height,
        quantity: 1
      });
    } else {
      console.log('Ne sizeOptions ne de variations mevcut, manuel giriş');
      setSelectedSizeOption(null);
      setStockForm({
        width: 100,
        height: 100,
        quantity: 1
      });
    }
    
    setIsModalOpen(true);
    
    // Modal açıldıktan sonra selectedProduct'ı tekrar kontrol et
    setTimeout(() => {
      console.log('Modal açıldı, selectedProduct kontrol:', {
        selectedProductExists: !!selectedProduct,
        selectedProductId: selectedProduct?.productId
      });
    }, 100);
  };

  const closeStockModal = () => {
    console.log('=== MODAL KAPANIYOR ===');
    console.log('selectedProduct temizleniyor:', selectedProduct?.productId);
    
    setIsModalOpen(false);
    setSelectedProduct(null);
    setSelectedSizeOption(null);
    setStockForm({ width: 0, height: 0, quantity: 0 });
    
    console.log('Modal kapatıldı ve state temizlendi');
  };

  const handleSizeOptionChange = (sizeOption: SizeOption) => {
    setSelectedSizeOption(sizeOption);
    setStockForm(prev => ({
      ...prev,
      width: sizeOption.width,
      height: sizeOption.height,
      quantity: sizeOption.stockQuantity || 0
    }));
  };

  const updateStock = async () => {
    if (!selectedProduct || !token) {
      console.error('updateStock: selectedProduct veya token eksik', {
        selectedProduct: !!selectedProduct,
        token: !!token
      });
      return;
    }

    // Product ID kontrolü
    if (!selectedProduct.productId) {
      console.error('❌ KRITIK HATA: Product ID undefined!', {
        selectedProduct: selectedProduct,
        productId: selectedProduct.productId
      });
      alert('Ürün ID\'si bulunamadı! Lütfen sayfayı yenileyip tekrar deneyin.');
      return;
    }

    console.log('=== STOK GÜNCELLEME BAŞLIYOR ===');
    console.log('Selected Product:', selectedProduct);
    console.log('Product ID:', selectedProduct.productId);
    console.log('Product ID type:', typeof selectedProduct.productId);
    console.log('Product ID length:', selectedProduct.productId?.length);
    console.log('Token mevcut:', !!token);
    console.log('Token başlangıcı:', token.substring(0, 20) + '...');
    console.log('Request Body:', {
      width: stockForm.width,
      height: stockForm.height,
      quantity: stockForm.quantity
    });

    const apiUrl = `https://pasha-backend-production.up.railway.app/api/products/${selectedProduct.productId}/stock`;
    console.log('API URL:', apiUrl);

    // Form validasyonu
    if (stockForm.width <= 0 || stockForm.height <= 0 || stockForm.quantity <= 0) {
      alert('Lütfen geçerli boyut ve miktar değerleri girin!');
      return;
    }

    setIsUpdatingStock(true);
    try {
      const requestBody = {
        width: stockForm.width,
        height: stockForm.height,
        quantity: stockForm.quantity
      };

      console.log('Gönderilen request body:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(apiUrl, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      console.log('=== API RESPONSE ===');
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      const responseText = await response.text();
      console.log('Response text:', responseText);
      
      if (response.ok) {
        try {
          const data: StockUpdateResponse = JSON.parse(responseText);
          console.log('Parsed response data:', data);
          
          if (data.success) {
            // Ürün listesini güncelle
            setProducts(prevProducts => 
              prevProducts.map(product => 
                product.productId === selectedProduct.productId 
                  ? data.data 
                  : product
              )
            );
            
            // selectedProduct'ı da güncelle (modal içindeki güncel stok bilgileri için)
            setSelectedProduct(data.data);
            
            // Stok form'unu sıfırla (yeni stok eklemek için)
            setStockForm(prev => ({
              ...prev,
              quantity: 1 // Sadece quantity'yi sıfırla, boyutlar aynı kalsın
            }));
            
            alert('Stok başarıyla güncellendi!');
          } else {
            console.error('API success false:', data.message);
            alert(`Stok güncellenirken hata oluştu: ${data.message || 'Bilinmeyen hata'}`);
          }
        } catch (parseError) {
          console.error('JSON parse hatası:', parseError);
          alert('Sunucu yanıtı işlenirken hata oluştu!');
        }
      } else {
        console.error('HTTP Error:', {
          status: response.status,
          statusText: response.statusText,
          response: responseText
        });
        
        // Özel hata mesajları
        if (response.status === 404) {
          alert('Ürün bulunamadı! Lütfen sayfayı yenileyip tekrar deneyin.');
        } else if (response.status === 401) {
          alert('Yetkilendirme hatası! Lütfen tekrar giriş yapın.');
        } else if (response.status === 403) {
          alert('Bu işlem için yetkiniz bulunmuyor!');
        } else {
          alert(`Stok güncellenirken hata oluştu! Status: ${response.status}, Mesaj: ${responseText}`);
        }
      }
    } catch (error) {
      console.error('=== NETWORK/FETCH ERROR ===');
      console.error('Error details:', error);
      alert('Ağ hatası! Lütfen internet bağlantınızı kontrol edin.');
    } finally {
      setIsUpdatingStock(false);
    }
  };

  const getTotalStock = (product: Product) => {
    let total = 0;
    
    // sizeOptions'dan stok hesapla
    if (product.sizeOptions && Array.isArray(product.sizeOptions)) {
      total += product.sizeOptions.reduce((sum, option) => sum + (option.stockQuantity || 0), 0);
    }
    
    // variations'dan da stok hesapla
    if (product.variations && Array.isArray(product.variations)) {
      total += product.variations.reduce((sum, variation) => sum + (variation.stockQuantity || 0), 0);
    }
    
    return total;
  };

  // Token'ı test et
  const testToken = async () => {
    if (!token) {
      console.error('Token mevcut değil');
      return;
    }

    console.log('=== TOKEN TEST ===');
    console.log('Token:', token.substring(0, 50) + '...');
    
    try {
      const response = await fetch('https://pasha-backend-production.up.railway.app/api/products', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Token test response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Token geçerli - Ürün sayısı:', data.data?.length || 0);
      } else {
        console.error('❌ Token geçersiz veya API hatası');
        const errorText = await response.text();
        console.error('Error response:', errorText);
      }
    } catch (error) {
      console.error('❌ Token test hatası:', error);
    }
  };

  // Test için useEffect ekle
  useEffect(() => {
    if (token) {
      testToken();
    }
  }, [token]);

  if (isLoading || !user) {
    return <div className="min-h-screen flex items-center justify-center">Yükleniyor...</div>;
  }

  // Admin olmayan kullanıcılar için erişim engeli
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Erişim Reddedildi</h3>
          <p className="mt-1 text-sm text-gray-500">Bu sayfaya erişim yetkiniz bulunmamaktadır.</p>
          <div className="mt-6">
            <button
              onClick={() => router.push('/dashboard')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Dashboard'a Dön
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
        {/* Başlık */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Stok Yönetimi</h1>
          <p className="text-gray-600 mt-1">Ürün stoklarını görüntüleyin ve güncelleyin</p>
        </div>

        {/* Ürünler Listesi */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100">
          <div className="p-4 sm:p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Tüm Ürünler</h2>
            
            {isLoadingProducts ? (
              <div className="flex items-center justify-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : products.length > 0 ? (
              <>
                {/* Desktop Tablo Görünümü */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ürün
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Koleksiyon
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          İşlemler
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {products.map((product) => (
                        <tr key={product.productId} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-12 w-12 rounded-lg bg-gray-200 flex-shrink-0 overflow-hidden">
                                {product.productImage ? (
                                  <img 
                                    src={product.productImage} 
                                    alt={product.name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="h-full w-full bg-gray-300 flex items-center justify-center">
                                    <svg className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{product.name}</div>
                                <div className="text-sm text-gray-500">{product.description}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{product.collection?.name || 'Koleksiyon Yok'}</div>
                            <div className="text-sm text-gray-500">{product.collection?.code || '-'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => openStockModal(product)}
                              disabled={isLoadingProductDetail}
                              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isLoadingProductDetail ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
                                  Yükleniyor...
                                </>
                              ) : (
                                <>
                                  <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                  </svg>
                                  Stok Ekle
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobil Card Görünümü */}
                <div className="md:hidden space-y-4">
                  {products.map((product) => (
                    <div key={product.productId} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                      <div className="flex items-start space-x-3">
                        <div className="h-16 w-16 rounded-lg bg-gray-200 flex-shrink-0 overflow-hidden">
                          {product.productImage ? (
                            <img 
                              src={product.productImage} 
                              alt={product.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full bg-gray-300 flex items-center justify-center">
                              <svg className="h-8 w-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h3 className="text-lg font-medium text-gray-900 truncate">{product.name}</h3>
                              <p className="text-sm text-gray-500 line-clamp-2">{product.description}</p>
                            </div>
                          </div>
                          <div className="mb-3">
                            <div className="text-sm font-medium text-gray-700">Koleksiyon</div>
                            <div className="text-sm text-gray-900">{product.collection?.name || 'Koleksiyon Yok'}</div>
                            <div className="text-xs text-gray-500">{product.collection?.code || '-'}</div>
                          </div>
                          <button
                            onClick={() => openStockModal(product)}
                            disabled={isLoadingProductDetail}
                            className="w-full inline-flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isLoadingProductDetail ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Yükleniyor...
                              </>
                            ) : (
                              <>
                                <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                Stok Ekle
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">Ürün bulunamadı</h3>
                <p className="mt-1 text-sm text-gray-500">Henüz hiç ürün eklenmemiş.</p>
              </div>
            )}
          </div>
        </div>

        {/* Gelişmiş Stok Ekleme Modalı */}
        {isModalOpen && selectedProduct && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 p-4">
            <div className="relative min-h-screen md:min-h-0 md:top-10 mx-auto md:p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white md:mb-10">
              {/* Modal Header - Sticky */}
              <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-4 md:p-6 rounded-t-md">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg md:text-xl font-medium text-gray-900 truncate">
                      Stok Ekle: {selectedProduct.name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1 truncate">
                      Koleksiyon: {selectedProduct.collection?.name || 'Koleksiyon Yok'}
                    </p>
                  </div>
                  <button
                    onClick={closeStockModal}
                    className="ml-4 text-gray-400 hover:text-gray-600 p-2 -mr-2"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Modal Content - Scrollable */}
              <div className="px-4 py-4 md:p-6 max-h-[calc(100vh-200px)] md:max-h-none overflow-y-auto">
                {/* Mevcut Stok Durumu */}
                {selectedProduct.sizeOptions && selectedProduct.sizeOptions.length > 0 && (
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Mevcut Stok Durumu (Güncel)</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {selectedProduct.sizeOptions.map((option) => (
                        <div key={option.id} className="text-sm bg-white p-3 rounded border">
                          <div className="font-medium text-gray-900">{option.width}x{option.height} cm</div>
                          <div className={`${option.stockQuantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {option.stockQuantity || 0} adet
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-6">
                  {/* Boyut Seçimi */}
                  {selectedProduct.sizeOptions && selectedProduct.sizeOptions.length > 0 ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Boyut Seçeneği
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {selectedProduct.sizeOptions.map((option) => (
                          <button
                            key={option.id}
                            onClick={() => handleSizeOptionChange(option)}
                            className={`p-4 text-sm border rounded-lg transition-colors ${
                              selectedSizeOption?.id === option.id
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-gray-300 hover:border-gray-400'
                            }`}
                          >
                            <div className="font-medium text-center">{option.width}x{option.height} cm</div>
                            <div className="text-xs text-gray-500 mt-1 text-center">
                              Mevcut: {option.stockQuantity || 0} adet
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* Manuel boyut girişi */
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Genişlik (cm)
                        </label>
                        <input
                          type="number"
                          value={stockForm.width}
                          onChange={(e) => setStockForm(prev => ({ ...prev, width: Number(e.target.value) }))}
                          className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Genişlik"
                          min="1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Yükseklik (cm)
                        </label>
                        <input
                          type="number"
                          value={stockForm.height}
                          onChange={(e) => setStockForm(prev => ({ ...prev, height: Number(e.target.value) }))}
                          className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Yükseklik"
                          min="1"
                        />
                      </div>
                    </div>
                  )}

                  {/* Miktar */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Eklenecek Miktar
                    </label>
                    <input
                      type="number"
                      value={stockForm.quantity}
                      onChange={(e) => setStockForm(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                      className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Eklenecek miktar"
                    />
                  </div>

                  {/* Seçilen boyut özeti */}
                  {selectedSizeOption && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">Seçilen boyut:</span> 
                          <span className="ml-1 text-gray-900">{stockForm.width}x{stockForm.height} cm</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Mevcut stok:</span> 
                          <span className="ml-1 text-gray-900">{selectedSizeOption.stockQuantity || 0} adet</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Eklenecek:</span> 
                          <span className="ml-1 text-gray-900">{stockForm.quantity} adet</span>
                        </div>
                        <div className="pt-1 border-t border-blue-200">
                          <span className="font-medium text-blue-700">Yeni toplam:</span> 
                          <span className="ml-1 text-blue-900 font-semibold">{stockForm.quantity} adet</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer - Sticky */}
              <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 py-4 md:p-6 rounded-b-md">
                <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3">
                  <button
                    onClick={closeStockModal}
                    className="w-full sm:w-auto px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  >
                    İptal
                  </button>
                  <button
                    onClick={updateStock}
                    disabled={isUpdatingStock || stockForm.quantity <= 0 || stockForm.width <= 0 || stockForm.height <= 0}
                    className="w-full sm:w-auto px-6 py-3 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUpdatingStock ? 'Güncelleniyor...' : 'Stok Güncelle'}
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