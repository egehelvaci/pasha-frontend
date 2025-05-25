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
  const { user, isLoading, token } = useAuth();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [stockForm, setStockForm] = useState<StockUpdateRequest>({
    width: 0,
    height: 0,
    quantity: 0
  });
  const [isUpdatingStock, setIsUpdatingStock] = useState(false);

  useEffect(() => {
    if (!user && !isLoading) {
      router.push('/');
    }
  }, [user, isLoading, router]);

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
        if (data.success) {
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

  const openStockModal = (product: Product) => {
    setSelectedProduct(product);
    setStockForm({
      width: product.sizeOptions[0]?.width || 0,
      height: product.sizeOptions[0]?.height || 0,
      quantity: 0
    });
    setIsModalOpen(true);
  };

  const closeStockModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
    setStockForm({ width: 0, height: 0, quantity: 0 });
  };

  const updateStock = async () => {
    if (!selectedProduct || !token) return;

    setIsUpdatingStock(true);
    try {
      const response = await fetch(`https://pasha-backend-production.up.railway.app/api/products/${selectedProduct.productId}/stock`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(stockForm)
      });
      
      if (response.ok) {
        const data: StockUpdateResponse = await response.json();
        if (data.success) {
          // Ürün listesini güncelle
          setProducts(prevProducts => 
            prevProducts.map(product => 
              product.productId === selectedProduct.productId 
                ? data.data 
                : product
            )
          );
          closeStockModal();
          alert('Stok başarıyla güncellendi!');
        }
      } else {
        alert('Stok güncellenirken hata oluştu!');
      }
    } catch (error) {
      console.error('Stok güncelleme hatası:', error);
      alert('Stok güncellenirken hata oluştu!');
    } finally {
      setIsUpdatingStock(false);
    }
  };

  const getTotalStock = (product: Product) => {
    return product.sizeOptions.reduce((total, option) => total + option.stockQuantity, 0);
  };

  if (isLoading || !user) {
    return <div className="min-h-screen flex items-center justify-center">Yükleniyor...</div>;
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
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Tüm Ürünler</h2>
            
            {isLoadingProducts ? (
              <div className="flex items-center justify-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : products.length > 0 ? (
              <div className="overflow-x-auto">
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
                        Toplam Stok
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Boyut Seçenekleri
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
                          <div className="text-sm text-gray-900">{product.collection.name}</div>
                          <div className="text-sm text-gray-500">{product.collection.code}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {getTotalStock(product)} adet
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            {product.sizeOptions.slice(0, 3).map((option, index) => (
                              <div key={index} className="text-xs text-gray-600">
                                {option.width}x{option.height} cm: {option.stockQuantity} adet
                              </div>
                            ))}
                            {product.sizeOptions.length > 3 && (
                              <div className="text-xs text-gray-400">
                                +{product.sizeOptions.length - 3} daha...
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => openStockModal(product)}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200"
                          >
                            <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Stok Ekle
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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

        {/* Stok Ekleme Modalı */}
        {isModalOpen && selectedProduct && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Stok Ekle: {selectedProduct.name}
                  </h3>
                  <button
                    onClick={closeStockModal}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Genişlik Seçimi */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Genişlik (cm)
                    </label>
                    <select
                      value={stockForm.width}
                      onChange={(e) => setStockForm(prev => ({ ...prev, width: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {selectedProduct.sizeOptions.map((option) => (
                        <option key={option.id} value={option.width}>
                          {option.width} cm
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Yükseklik */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Yükseklik (cm)
                    </label>
                    <input
                      type="number"
                      value={stockForm.height}
                      onChange={(e) => setStockForm(prev => ({ ...prev, height: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Yükseklik girin"
                    />
                  </div>

                  {/* Miktar */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Eklenecek Miktar
                    </label>
                    <input
                      type="number"
                      value={stockForm.quantity}
                      onChange={(e) => setStockForm(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Miktar girin"
                      min="1"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={closeStockModal}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  >
                    İptal
                  </button>
                  <button
                    onClick={updateStock}
                    disabled={isUpdatingStock || stockForm.quantity <= 0}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUpdatingStock ? 'Güncelleniyor...' : 'Stok Ekle'}
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