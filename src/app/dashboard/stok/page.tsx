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
    // Auth loading tamamlandığında user yoksa login'e yönlendir
    if (!isLoading && !user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  // Admin kontrolü
  useEffect(() => {
    // Auth loading tamamlandığında admin kontrolü yap
    if (!isLoading && user && !isAdmin) {
      router.push('/dashboard');
    }
  }, [user, isAdmin, isLoading, router]);

  useEffect(() => {
    if (!token) return;
    fetchProducts();
  }, [token]);

  // Auth yüklenirken loading göster
  if (isLoading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-[#00365a]"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-6 h-6 text-[#00365a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900">Yetkilendirme Kontrol Ediliyor</h3>
              <p className="text-sm text-gray-500 mt-1">Lütfen bekleyiniz...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const fetchProducts = async () => {
    try {
      const response = await fetch('https://pasha-backend-production.up.railway.app/api/products', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data: ProductsResponse = await response.json();
        if (data.success) {
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
      
      const normalUrl = `https://pasha-backend-production.up.railway.app/api/products/${productId}`;
      
      const response = await fetch(normalUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data: ProductDetailResponse = await response.json();
        
        if (data.success && data.data) {
          return data.data;
        } else {
          console.error('❌ GET başarısız veya data boş:', data);
          
          // Eğer normal endpoint çalışmazsa variations endpoint'ini deneyelim
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
        return await fetchProductDetailVariations(productId);
      }
    } catch (error) {
      console.error('❌ GET Network Error:', error);
      
      // Network hatası durumunda da variations endpoint'ini deneyelim
      return await fetchProductDetailVariations(productId);
    } finally {
      setIsLoadingProductDetail(false);
    }
  };

  // Variations endpoint'ini deneyen yardımcı fonksiyon
  const fetchProductDetailVariations = async (productId: string): Promise<Product | null> => {
    try {
      const variationsUrl = `https://pasha-backend-production.up.railway.app/api/products/${productId}/variations`;
      
      const response = await fetch(variationsUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data: ProductDetailResponse = await response.json();
        
        if (data.success && data.data) {
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
    if (!product.productId) {
      console.error('❌ KRITIK HATA: Gelen product ID undefined!', product);
      alert('Ürün ID\'si bulunamadı! Lütfen sayfayı yenileyip tekrar deneyin.');
      return;
    }
    
    const detailedProduct = await fetchProductDetail(product.productId);
    
    let productToUse: Product;
    
    if (!detailedProduct || !detailedProduct.productId) {
      productToUse = product;
    } else {
      productToUse = detailedProduct;
    }
    
    setSelectedProduct(productToUse);
    
    if (productToUse.sizeOptions && productToUse.sizeOptions.length > 0) {
      const firstOption = productToUse.sizeOptions[0];
      setSelectedSizeOption(firstOption);
      setStockForm({
        width: firstOption.width,
        height: firstOption.height,
        quantity: 1
      });
    } else if (productToUse.variations && productToUse.variations.length > 0) {
      const firstVariation = productToUse.variations[0];
      setSelectedSizeOption(null);
      setStockForm({
        width: firstVariation.width,
        height: firstVariation.height,
        quantity: 1
      });
    } else {
      setSelectedSizeOption(null);
      setStockForm({
        width: 100,
        height: 100,
        quantity: 1
      });
    }
    
    setIsModalOpen(true);
  };

  const closeStockModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
    setSelectedSizeOption(null);
    setStockForm({ width: 0, height: 0, quantity: 0 });
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

    if (!selectedProduct.productId) {
      console.error('❌ KRITIK HATA: Product ID undefined!', {
        selectedProduct: selectedProduct,
        productId: selectedProduct.productId
      });
      alert('Ürün ID\'si bulunamadı! Lütfen sayfayı yenileyip tekrar deneyin.');
      return;
    }

    const apiUrl = `https://pasha-backend-production.up.railway.app/api/products/${selectedProduct.productId}/stock`;

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

      const response = await fetch(apiUrl, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      if (response.ok) {
        try {
          const data: StockUpdateResponse = await response.json();
          
          if (data.success) {
            setProducts(prevProducts => 
              prevProducts.map(product => 
                product.productId === selectedProduct.productId 
                  ? data.data 
                  : product
              )
            );
            
            setSelectedProduct(data.data);
            
            setStockForm(prev => ({
              ...prev,
              quantity: 1
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
        const errorText = await response.text();
        console.error('HTTP Error:', {
          status: response.status,
          statusText: response.statusText,
          response: errorText
        });
        
        if (response.status === 404) {
          alert('Ürün bulunamadı! Lütfen sayfayı yenileyip tekrar deneyin.');
        } else if (response.status === 401) {
          alert('Yetkilendirme hatası! Lütfen tekrar giriş yapın.');
        } else if (response.status === 403) {
          alert('Bu işlem için yetkiniz bulunmuyor!');
        } else {
          alert(`Stok güncellenirken hata oluştu! Status: ${response.status}, Mesaj: ${errorText}`);
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
    
    if (product.sizeOptions && Array.isArray(product.sizeOptions)) {
      total += product.sizeOptions.reduce((sum, option) => sum + (option.stockQuantity || 0), 0);
    }
    
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

    try {
      const response = await fetch('https://pasha-backend-production.up.railway.app/api/products', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
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
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-[#00365a]"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-6 h-6 text-[#00365a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900">Sistem Yükleniyor</h3>
              <p className="text-sm text-gray-500 mt-1">Lütfen bekleyiniz...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Admin olmayan kullanıcılar için erişim engeli
  if (!isAdmin) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="h-10 w-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">Erişim Reddedildi</h3>
          <p className="text-gray-600 mb-8 leading-relaxed">Bu sayfaya erişim yetkiniz bulunmamaktadır. Stok yönetimi sadece admin kullanıcılar tarafından kullanılabilir.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#00365a] hover:bg-[#004170] text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
            </svg>
            Dashboard'a Dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#00365a] flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-3" viewBox="0 0 20 20" fill="currentColor">
              <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" />
              <path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
            Stok Yönetimi
          </h1>
          <p className="text-gray-600 mt-2">Ürün stoklarını görüntüleyin ve güncelleyin</p>
        </div>

        {/* Ürünler Listesi */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-[#00365a]">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <h2 className="text-lg font-semibold text-white">Tüm Ürünler</h2>
            </div>
          </div>
          <div className="p-6">
            {isLoadingProducts ? (
              <div className="flex flex-col items-center justify-center h-48">
                <div className="relative">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-[#00365a]"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="w-6 h-6 text-[#00365a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                </div>
                <div className="text-center mt-4">
                  <h3 className="text-lg font-semibold text-gray-900">Ürünler Yükleniyor</h3>
                  <p className="text-sm text-gray-500 mt-1">Lütfen bekleyiniz...</p>
                </div>
              </div>
            ) : products.length > 0 ? (
              <>
                {/* Desktop Tablo Görünümü */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Ürün
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Koleksiyon
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          İşlemler
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {products.map((product) => (
                        <tr key={product.productId} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-14 w-14 rounded-xl bg-gray-200 flex-shrink-0 overflow-hidden shadow-sm">
                                {product.productImage ? (
                                  <img 
                                    src={product.productImage} 
                                    alt={product.name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="h-full w-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                                    <svg className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-semibold text-gray-900">{product.name}</div>
                                <div className="text-sm text-gray-500">{product.description}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{product.collection?.name || 'Koleksiyon Yok'}</div>
                            <div className="text-sm text-gray-500">{product.collection?.code || '-'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => openStockModal(product)}
                              disabled={isLoadingProductDetail}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-[#00365a] hover:bg-[#004170] text-white rounded-lg font-medium transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isLoadingProductDetail ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                  Yükleniyor...
                                </>
                              ) : (
                                <>
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                    <div key={product.productId} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start space-x-4">
                        <div className="h-20 w-20 rounded-xl bg-gray-200 flex-shrink-0 overflow-hidden shadow-sm">
                          {product.productImage ? (
                            <img 
                              src={product.productImage} 
                              alt={product.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                              <svg className="h-8 w-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="mb-3">
                            <h3 className="text-lg font-semibold text-gray-900 truncate">{product.name}</h3>
                            <p className="text-sm text-gray-500 line-clamp-2 mt-1">{product.description}</p>
                          </div>
                          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                            <div className="text-xs font-medium text-gray-700 uppercase tracking-wider mb-1">Koleksiyon</div>
                            <div className="text-sm font-medium text-gray-900">{product.collection?.name || 'Koleksiyon Yok'}</div>
                            <div className="text-xs text-gray-500">{product.collection?.code || '-'}</div>
                          </div>
                          <button
                            onClick={() => openStockModal(product)}
                            disabled={isLoadingProductDetail}
                            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-[#00365a] hover:bg-[#004170] text-white rounded-lg font-semibold transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isLoadingProductDetail ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                Yükleniyor...
                              </>
                            ) : (
                              <>
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
              <div className="text-center py-16">
                <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                  <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Ürün Bulunamadı</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto leading-relaxed">Henüz hiç ürün eklenmemiş. Stok yönetimi yapabilmek için önce ürün eklemeniz gerekmektedir.</p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={() => router.push('/dashboard/urunler/liste')}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#00365a] hover:bg-[#004170] text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    Ürünlere Git
                  </button>
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-white hover:bg-gray-50 text-[#00365a] border-2 border-[#00365a] rounded-lg font-semibold transition-all hover:shadow-md"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                    </svg>
                    Dashboard'a Dön
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Gelişmiş Stok Ekleme Modalı */}
        {isModalOpen && selectedProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-60 overflow-y-auto h-full w-full z-50 p-4">
            <div className="relative min-h-screen md:min-h-0 md:top-10 mx-auto md:p-5 w-full max-w-3xl shadow-2xl rounded-2xl bg-white md:mb-10">
              {/* Modal Header - Sticky */}
              <div className="sticky top-0 bg-[#00365a] text-white border-b border-gray-200 px-6 py-6 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="bg-white bg-opacity-20 rounded-xl p-2">
                        <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold truncate">
                          Stok Ekle: {selectedProduct.name}
                        </h3>
                        <p className="text-blue-100 text-sm mt-1 truncate">
                          Koleksiyon: {selectedProduct.collection?.name || 'Koleksiyon Yok'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={closeStockModal}
                    className="ml-4 text-blue-100 hover:text-white p-2 hover:bg-white hover:bg-opacity-20 rounded-xl transition-all"
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
                          onChange={(e) => setStockForm(prev => ({ ...prev, width: e.target.value === '' ? 0 : Number(e.target.value) }))}
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
                          onChange={(e) => setStockForm(prev => ({ ...prev, height: e.target.value === '' ? 0 : Number(e.target.value) }))}
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
                      Güncellenecek Stok:
                    </label>
                    <input
                      type="number"
                      value={stockForm.quantity}
                      onChange={(e) => setStockForm(prev => ({ ...prev, quantity: e.target.value === '' ? 0 : Number(e.target.value) }))}
                      className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Güncellenecek miktar"
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
                          <span className="font-medium text-gray-700">Güncellenecek:</span> 
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