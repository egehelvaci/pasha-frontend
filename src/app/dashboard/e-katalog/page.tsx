'use client';

import { useState, useEffect } from 'react';

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
  };
}

interface ProductResponse {
  success: boolean;
  data: Product[];
}

const EKatalogPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [generateLoading, setGenerateLoading] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch('https://pasha-backend-production.up.railway.app/api/products', {
        headers: {
          'Authorization': `Bearer ${token}`,
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

  const toggleProductSelection = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const selectAllProducts = () => {
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(products.map(p => p.productId)));
    }
  };

  const generateCatalog = async () => {
    try {
      setGenerateLoading(true);
      
      // Beforeunload event'i ekle
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = '';
      };
      window.addEventListener('beforeunload', handleBeforeUnload);

      const isAllSelected = selectedProducts.size === products.length;
      
      let requestBody;
      if (isAllSelected) {
        requestBody = {
          "companyName": "PAŞA HOME",
          "companyLogoUrl": "https://example.com/logo.png"
        };
      } else {
        requestBody = {
          "productIds": Array.from(selectedProducts),
          "companyName": "PAŞA HOME",
          "companyLogoUrl": "https://example.com/logo.png"
        };
      }

      console.log('Katalog API isteği gönderiliyor:', requestBody);

      const response = await fetch('https://pasha-backend-production.up.railway.app/api/catalog/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      console.log('PDF blob alındı, boyut:', blob.size);

      // PDF'i indir
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `PASA_HOME_Katalog_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      console.log('Katalog başarıyla indirildi');
      
      // Beforeunload event'ini temizle
      window.removeEventListener('beforeunload', handleBeforeUnload);
    } catch (error) {
      console.error('Katalog oluşturma hatası:', error);
      alert(`Katalog oluşturulurken hata oluştu: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
      
      // Hata durumunda da beforeunload event'ini temizle
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = '';
      };
      window.removeEventListener('beforeunload', handleBeforeUnload);
    } finally {
      setGenerateLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
        {generateLoading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
              <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <h3 className="text-lg font-semibold mb-2">Katalog Oluşturuluyor</h3>
                <p className="text-gray-600 mb-4">
                  Katalog oluşturma işlemi yaklaşık 15 saniye sürebilir. Lütfen bekleyiniz...
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    ⚠️ Bu işlem sırasında sayfadan çıkmayınız
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* Başlık ve Kontroller */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">E-Katalog Oluşturucu</h1>
                <p className="text-gray-600 mt-1">
                  Ürünleri seçerek PDF katalog oluşturun
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={selectAllProducts}
                  className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  {selectedProducts.size === products.length ? 'Tümünü Kaldır' : 'Tümünü Seç'}
                </button>
                <button
                  onClick={generateCatalog}
                  disabled={selectedProducts.size === 0 || generateLoading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {generateLoading ? 'Oluşturuluyor...' : `Katalog Oluştur (${selectedProducts.size})`}
                </button>
              </div>
            </div>
            
            {selectedProducts.size > 0 && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <span className="font-medium">{selectedProducts.size}</span> ürün seçildi
                  {selectedProducts.size === products.length && ' (Tüm ürünler)'}
                </p>
              </div>
            )}
          </div>

          {/* Ürün Listesi */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-900">
                Ürünler ({products.length})
              </h2>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map((product) => (
                  <div
                    key={product.productId}
                    className={`relative bg-white border rounded-lg p-4 cursor-pointer transition-all duration-200 hover:shadow-md ${
                      selectedProducts.has(product.productId)
                        ? 'border-blue-500 ring-2 ring-blue-500 ring-opacity-20 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => toggleProductSelection(product.productId)}
                  >
                    {/* Seçim Checkbox */}
                    <div className="absolute top-3 right-3">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        selectedProducts.has(product.productId)
                          ? 'bg-blue-600 border-blue-600'
                          : 'border-gray-300 bg-white'
                      }`}>
                        {selectedProducts.has(product.productId) && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </div>

                    {/* Ürün Resmi */}
                    <div className="aspect-square mb-3 bg-gray-100 rounded-lg overflow-hidden">
                      {product.productImage ? (
                        <img
                          src={product.productImage}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Ürün Bilgileri */}
                    <div className="space-y-2">
                      <h3 className="font-medium text-gray-900 text-sm line-clamp-2">
                        {product.name}
                      </h3>
                      <div className="bg-gray-100 px-2 py-1 rounded text-xs font-mono text-gray-700">
                        ID: {product.productId}
                      </div>
                      {product.collection && (
                        <p className="text-xs text-blue-600 font-medium">
                          {product.collection.name}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {products.length === 0 && (
                <div className="text-center py-12">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
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