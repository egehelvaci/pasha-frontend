'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import { 
  getProducts,
  Product,
  getPurchasePriceLists,
  PurchasePriceList,
  createSupplierOrder,
  Supplier,
  addToSupplierCart,
  getSupplierCart,
  deleteSupplierCartItem,
  completeSupplierPurchase,
  purchaseProductFromSupplier,
  SupplierCartItem as ApiSupplierCartItem,
  SupplierCartResponse
} from '@/services/api';


const SaticiSiparisVer = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAdmin, user, isLoading: authLoading } = useAuth();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [priceList, setPriceList] = useState<PurchasePriceList | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [productForm, setProductForm] = useState({
    quantity: 1,
    width: 80 as number | string,
    height: 100 as number | string,
    hasFringe: false,
    cutType: '',
    notes: ''
  });
  const [sizeDropdownOpen, setSizeDropdownOpen] = useState(false);
  const [cutTypeDropdownOpen, setCutTypeDropdownOpen] = useState(false);
  const [supplierCart, setSupplierCart] = useState<ApiSupplierCartItem[]>([]);
  const [cartTotal, setCartTotal] = useState(0);
  const [cartLoading, setCartLoading] = useState(false);
  const [orderLoading, setOrderLoading] = useState(false);

  const supplierId = searchParams.get('supplierId');

  // Admin kontrolü
  useEffect(() => {
    if (!isAdmin) {
      router.push('/dashboard');
      return;
    }
  }, [isAdmin, router]);

  // Veri yükleme
  useEffect(() => {
    if (isAdmin && supplierId) {
      loadData();
    }
  }, [isAdmin, supplierId]);

  // Arama değişikliklerinde ürünleri yeniden yükle
  useEffect(() => {
    if (isAdmin && supplierId) {
      loadProducts(1, false); // Arama yapıldığında sayfa 1'den başla
    }
  }, [searchTerm]);

  // Modal açıldığında dropdown'ları kapat ve body scroll'u engelle
  useEffect(() => {
    if (showAddProductModal) {
      setSizeDropdownOpen(false);
      setCutTypeDropdownOpen(false);
      // Body scroll'u engelle
      document.body.style.overflow = 'hidden';
    } else {
      // Modal kapandığında body scroll'u geri aç
      document.body.style.overflow = 'unset';
    }

    // Cleanup function
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showAddProductModal]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [productsResult, priceListData, cartData] = await Promise.all([
        getProducts(1, 50), // Sayfa 1, 50 ürün
        getPurchasePriceLists(),
        supplierId ? getSupplierCart(supplierId) : null
      ]);
      
      setProducts(productsResult.data);
      setCurrentPage(1);
      setTotalPages(productsResult.pagination?.totalPages || 1);
      setHasMore(productsResult.pagination?.hasMore || false);
      
      if (priceListData && priceListData.length > 0) {
        setPriceList(priceListData[0]);
      }

      // Sepet verilerini yükle
      if (cartData) {
        setSupplierCart(cartData.data.cart.items);
        setCartTotal(cartData.data.total.amount);
        setSelectedSupplier({
          id: cartData.data.cart.supplier.id,
          name: cartData.data.cart.supplier.name,
          company_name: cartData.data.cart.supplier.company_name,
          phone: '0555 123 45 67', // API'den gelmiyor
          balance: parseFloat(cartData.data.cart.supplier.balance),
          currency: 'USD',
          is_active: true
        });
      } else {
        // Satıcı bilgilerini URL'den al (şimdilik mock data)
        setSelectedSupplier({
          id: supplierId || '',
          name: 'Seçilen Satıcı',
          company_name: 'Satıcı Firma',
          phone: '0555 123 45 67',
          balance: 0,
          currency: 'USD',
          is_active: true
        });
      }
    } catch (err) {
      console.error('Veri yükleme hatası:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async (page: number = 1, append: boolean = false) => {
    try {
      // Arama terimini büyük harfe çevir
      const uppercaseSearchTerm = searchTerm.toUpperCase();
      const productsResult = await getProducts(page, 50, uppercaseSearchTerm);
      
      if (append) {
        setProducts(prev => [...prev, ...productsResult.data]);
      } else {
        setProducts(productsResult.data);
      }
      
      setCurrentPage(page);
      setTotalPages(productsResult.pagination?.totalPages || 1);
      setHasMore(productsResult.pagination?.hasMore || false);
    } catch (err) {
      console.error('Ürünleri yükleme hatası:', err);
    }
  };

  const loadMoreProducts = async () => {
    if (loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    try {
      await loadProducts(currentPage + 1, true);
    } finally {
      setLoadingMore(false);
    }
  };

  // Tüm ürünleri göster (filtreleme kaldırıldı)
  const filteredProducts = products;

  // Ürün fiyatını al (purchasePricing'dan)
  const getProductPrice = (product: Product) => {
    if (!product.purchasePricing) return 0;
    return parseFloat(product.purchasePricing.price_per_square_meter.toString());
  };

  // Sepete ürün ekle
  const handleAddToCart = async () => {
    if (!selectedProduct || !supplierId) return;

    const width = typeof productForm.width === 'string' ? parseInt(productForm.width) || 80 : productForm.width;
    const height = typeof productForm.height === 'string' ? parseInt(productForm.height) || 100 : productForm.height;

    setCartLoading(true);
    try {
      const cartData = {
        productId: selectedProduct.productId,
        quantity: productForm.quantity,
        width: width,
        height: height,
        hasFringe: productForm.hasFringe,
        cutType: productForm.cutType || 'rectangle', // Default to rectangle if empty
        notes: productForm.notes
      };
      
      console.log('Adding to cart:', cartData);
      await addToSupplierCart(supplierId, cartData);

      // Sepeti yeniden yükle
      const updatedCartData = await getSupplierCart(supplierId);
      setSupplierCart(updatedCartData.data.cart.items);
      setCartTotal(updatedCartData.data.total.amount);

      setShowAddProductModal(false);
      setProductForm({
        quantity: 1,
        width: 80,
        height: 100,
        hasFringe: false,
        cutType: '',
        notes: ''
      });
    } catch (err) {
      console.error('Ürün sepete eklenirken hata oluştu:', err);
      alert('Ürün sepete eklenirken bir hata oluştu');
    } finally {
      setCartLoading(false);
    }
  };

  // Sepetten ürün çıkar
  const handleRemoveFromCart = async (itemId: number) => {
    if (!supplierId) return;

    setCartLoading(true);
    try {
      await deleteSupplierCartItem(supplierId, itemId);
      
      // Sepeti yeniden yükle
      const cartData = await getSupplierCart(supplierId);
      setSupplierCart(cartData.data.cart.items);
      setCartTotal(cartData.data.total.amount);
    } catch (err) {
      console.error('Ürün sepetten çıkarılırken hata oluştu:', err);
      alert('Ürün sepetten çıkarılırken bir hata oluştu');
    } finally {
      setCartLoading(false);
    }
  };

  // Sepeti temizle (tüm öğeleri sil)
  const handleClearCart = async () => {
    if (!supplierId || supplierCart.length === 0) return;

    setCartLoading(true);
    try {
      // Tüm sepet öğelerini sil
      await Promise.all(supplierCart.map(item => deleteSupplierCartItem(supplierId, item.id)));
      
      // Sepeti yeniden yükle
      const cartData = await getSupplierCart(supplierId);
      setSupplierCart(cartData.data.cart.items);
      setCartTotal(cartData.data.total.amount);
    } catch (err) {
      console.error('Sepet temizlenirken hata oluştu:', err);
      alert('Sepet temizlenirken bir hata oluştu');
    } finally {
      setCartLoading(false);
    }
  };

  // Sipariş oluştur
  const handleCreateOrder = async () => {
    if (!selectedSupplier || !supplierId || supplierCart.length === 0) {
      alert('Sepet boş! Lütfen önce ürün ekleyin.');
      return;
    }

    setOrderLoading(true);
    try {
      // Her sepet öğesi için ayrı ayrı satın alma işlemi yap
      const purchaseResults = [];
      let totalPurchased = 0;
      const referenceNumber = `AL-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

      for (const cartItem of supplierCart) {
        const quantityM2 = parseFloat(cartItem.area_m2);
        
        const result = await purchaseProductFromSupplier(supplierId, {
          product_id: cartItem.product_id,
          quantity_m2: quantityM2,
          description: `${cartItem.product.name} - ${cartItem.quantity} adet (${cartItem.width}x${cartItem.height}cm) - ${cartItem.product.collection.name}`,
          reference_number: `${referenceNumber}-${cartItem.id}`
        });

        purchaseResults.push(result);
        totalPurchased += result.data.purchase_details.total_usd;
      }

      // Sepeti temizle
      await handleClearCart();
      
      alert(`Satıcı siparişi başarıyla oluşturuldu! ${purchaseResults.length} ürün satın alındı. Toplam: $${totalPurchased.toFixed(2)} USD`);
      router.push('/dashboard/satin-alim-islemleri');
    } catch (err) {
      console.error('Sipariş oluşturma hatası:', err);
      alert('Sipariş oluşturulurken bir hata oluştu');
    } finally {
      setOrderLoading(false);
    }
  };

  if (!isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00365a] mx-auto mb-4"></div>
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Satın Alım İşlemleri</h1>
              {selectedSupplier && (
                <p className="mt-2 text-gray-600">
                  <strong>{selectedSupplier.name}</strong> - {selectedSupplier.company_name}
                </p>
              )}
            </div>
            <div className="flex space-x-3">
              <Link
                href="/dashboard/satin-alim-islemleri"
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Geri Dön
              </Link>
              <Link
                href="/dashboard/satin-alim-islemleri/gecmis-islemler"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Geçmiş İşlemler
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Ürün Listesi */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              {/* Arama */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex flex-wrap gap-4">
                  <div className="flex-1 min-w-64">
                    <input
                      type="text"
                      placeholder="Ürün ara..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Ürün Listesi */}
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredProducts.map((product) => (
                    <div key={product.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start space-x-4">
                        <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                          {product.productImage ? (
                            <img
                              src={product.productImage}
                              alt={product.name}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-sm font-medium text-gray-900">{product.name}</h3>
                          <p className="text-xs text-gray-500">{product.collection_name}</p>
                          <p className="text-sm font-semibold text-green-600 mt-1">
                            {getProductPrice(product).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {product.purchasePricing?.currency}/m²
                          </p>
                          <button
                            onClick={() => {
                              setSelectedProduct(product);
                              setShowAddProductModal(true);
                            }}
                            className="mt-2 px-3 py-1 bg-[#00365a] text-white text-xs rounded hover:bg-[#004170] transition-colors"
                          >
                            Sepete Ekle
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Sayfalama Kontrolleri */}
                {hasMore && (
                  <div className="mt-6 text-center">
                    <button
                      onClick={loadMoreProducts}
                      disabled={loadingMore}
                      className="px-6 py-2 bg-[#00365a] text-white rounded-lg hover:bg-[#004170] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {loadingMore ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Yükleniyor...
                        </div>
                      ) : (
                        'Daha Fazla Yükle'
                      )}
                    </button>
                    <p className="text-sm text-gray-500 mt-2">
                      {filteredProducts.length} ürün gösteriliyor
                      {totalPages > 1 && ` (Sayfa ${currentPage}/${totalPages})`}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sepet */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 sticky top-4">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Sepet</h2>
                  {supplierCart.length > 0 && (
                    <button
                      onClick={handleClearCart}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      Temizle
                    </button>
                  )}
                </div>
              </div>

              <div className="p-6">
                {supplierCart.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Sepet boş</p>
                ) : (
                  <div className="space-y-4">
                    {supplierCart.map((item) => (
                      <div key={item.id} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-gray-900">{item.product.name}</h4>
                            <p className="text-xs text-gray-500">{item.product.collection.name}</p>
                            <p className="text-xs text-gray-500">
                              {item.width}x{item.height}cm - {item.quantity} adet
                            </p>
                            {item.cut_type && (
                              <p className="text-xs text-gray-500">Kesim: {item.cut_type}</p>
                            )}
                            {item.has_fringe && (
                              <p className="text-xs text-gray-500">Saçaklı</p>
                            )}
                            <p className="text-sm font-semibold text-green-600 mt-1">
                              {parseFloat(item.total_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} USD
                            </p>
                          </div>
                          <button
                            onClick={() => handleRemoveFromCart(item.id)}
                            disabled={cartLoading}
                            className="text-red-600 hover:text-red-800 ml-2 disabled:opacity-50"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {supplierCart.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-lg font-semibold text-gray-900">Toplam:</span>
                      <span className="text-lg font-bold text-green-600">
                        {cartTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} USD
                      </span>
                    </div>

                    <div className="space-y-3">
                      <button
                        onClick={handleCreateOrder}
                        disabled={orderLoading || cartLoading}
                        className="w-full px-4 py-2 bg-[#00365a] text-white rounded-lg hover:bg-[#004170] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {orderLoading ? 'Sipariş Oluşturuluyor...' : 'Sipariş Oluştur'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Ürün Ekleme Modal */}
        {showAddProductModal && selectedProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-6xl shadow-lg relative overflow-hidden max-h-[90vh]">
              {/* Header */}
              <div className="rounded-t-xl px-6 py-4 relative bg-[#00365a]">
                <button 
                  className="absolute top-3 right-3 text-white hover:text-gray-200 text-3xl font-bold" 
                  onClick={() => setShowAddProductModal(false)}
                >
                  &times;
                </button>
                
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">Sepete Ekle</h2>
                </div>
              </div>
              
              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold text-black">{selectedProduct.collection_name} - {selectedProduct.name}</h1>
                  </div>
                  
                  <div className="flex flex-col md:flex-row gap-8">
                    <div className="w-full md:w-1/2">
                      <div className="aspect-[4/3] relative overflow-hidden bg-gray-50 rounded-lg border border-gray-200">
                        {selectedProduct.productImage ? (
                          <img
                            src={selectedProduct.productImage}
                            alt={selectedProduct.name}
                            className="w-full h-full object-contain p-4"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="w-full md:w-1/2">
                      <div className="grid grid-cols-1 gap-5">
                        {/* Boyut Seçimi */}
                        <div className="flex flex-col gap-2 dropdown-container bg-blue-50 rounded-lg p-6 border border-blue-200">
                          <span className="text-sm font-medium text-gray-700">Boyut Seçimi</span>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Genişlik (cm)</label>
                              <input
                                type="number"
                                min="1"
                                value={productForm.width}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (value === '') {
                                    setProductForm(prev => ({ ...prev, width: '' }));
                                  } else {
                                    const numValue = parseInt(value);
                                    if (numValue >= 1) {
                                      setProductForm(prev => ({ ...prev, width: numValue }));
                                    }
                                  }
                                }}
                                onBlur={(e) => {
                                  const value = e.target.value;
                                  if (value === '' || parseInt(value) < 1) {
                                    setProductForm(prev => ({ ...prev, width: 80 }));
                                  }
                                }}
                                onWheel={(e) => e.currentTarget.blur()}
                                className="w-full border border-gray-300 rounded-lg px-3 py-3 text-left bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Yükseklik (cm)</label>
                              <input
                                type="number"
                                min="1"
                                value={productForm.height}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (value === '') {
                                    setProductForm(prev => ({ ...prev, height: '' }));
                                  } else {
                                    const numValue = parseInt(value);
                                    if (numValue >= 1) {
                                      setProductForm(prev => ({ ...prev, height: numValue }));
                                    }
                                  }
                                }}
                                onBlur={(e) => {
                                  const value = e.target.value;
                                  if (value === '' || parseInt(value) < 1) {
                                    setProductForm(prev => ({ ...prev, height: 100 }));
                                  }
                                }}
                                onWheel={(e) => e.currentTarget.blur()}
                                className="w-full border border-gray-300 rounded-lg px-3 py-3 text-left bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Hazır Boyutlar - Ürün kurallarına göre dropdown */}
                        {selectedProduct.rules && selectedProduct.rules.sizeOptions && selectedProduct.rules.sizeOptions.length > 0 && (
                          <div className="flex flex-col gap-2 dropdown-container">
                            <span className="text-sm font-medium text-gray-700">Hazır Boyutlar</span>
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setSizeDropdownOpen(!sizeDropdownOpen)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-3 text-left bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                              >
                                <span className="text-gray-500">Hazır boyut seçin</span>
                                <svg 
                                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 transition-transform ${sizeDropdownOpen ? 'rotate-180' : ''}`}
                                  fill="none" 
                                  stroke="currentColor" 
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                              
                              {sizeDropdownOpen && (
                                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                  <div 
                                    className="px-3 py-2 text-gray-500 hover:bg-gray-50 cursor-pointer border-b border-gray-100"
                                    onClick={() => {
                                      setSizeDropdownOpen(false);
                                    }}
                                  >
                                    Hazır boyut seçin
                                  </div>
                                  {selectedProduct.rules.sizeOptions.map((sizeOption: any) => (
                                    <div
                                      key={sizeOption.id}
                                      className="px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors text-gray-900"
                                      onClick={() => {
                                        setProductForm(prev => ({ 
                                          ...prev, 
                                          width: sizeOption.width, 
                                          height: sizeOption.height 
                                        }));
                                        setSizeDropdownOpen(false);
                                      }}
                                    >
                                      {sizeOption.width}x{sizeOption.height} cm
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Kesim Türü - Ürün kurallarına göre dropdown */}
                        {selectedProduct.rules && selectedProduct.rules.cutTypes && selectedProduct.rules.cutTypes.length > 0 && (
                          <div className="flex flex-col gap-2 dropdown-container">
                            <span className="text-sm font-medium text-gray-700">Kesim Türü</span>
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setCutTypeDropdownOpen(!cutTypeDropdownOpen)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-3 text-left bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                              >
                                <span className={productForm.cutType ? "text-gray-900" : "text-gray-500"}>
                                  {productForm.cutType 
                                    ? productForm.cutType.charAt(0).toUpperCase() + productForm.cutType.slice(1)
                                    : "Kesim Türü Seçin"
                                  }
                                </span>
                                <svg 
                                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 transition-transform ${cutTypeDropdownOpen ? 'rotate-180' : ''}`}
                                  fill="none" 
                                  stroke="currentColor" 
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                              
                              {cutTypeDropdownOpen && (
                                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                  <div 
                                    className="px-3 py-2 text-gray-500 hover:bg-gray-50 cursor-pointer border-b border-gray-100"
                                    onClick={() => {
                                      setProductForm(prev => ({ ...prev, cutType: '' }));
                                      setCutTypeDropdownOpen(false);
                                    }}
                                  >
                                    Kesim Türü Seçin
                                  </div>
                                  {selectedProduct.rules.cutTypes.map((cutType: any) => (
                                    <div
                                      key={cutType.id}
                                      className={`px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                                        productForm.cutType === cutType.name ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                                      }`}
                                      onClick={() => {
                                        setProductForm(prev => ({ ...prev, cutType: cutType.name }));
                                        setCutTypeDropdownOpen(false);
                                      }}
                                    >
                                      {cutType.name.charAt(0).toUpperCase() + cutType.name.slice(1)}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Saçak Seçeneği - Ürün kurallarına göre göster/gizle */}
                        {selectedProduct.rules && selectedProduct.rules.canHaveFringe && (
                          <div className="flex flex-col gap-2 dropdown-container">
                            <span className="text-sm font-medium text-gray-700">Saçak</span>
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setProductForm(prev => ({ ...prev, hasFringe: !prev.hasFringe }))}
                                className="w-full border border-gray-300 rounded-lg px-3 py-3 text-left bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                              >
                                <span className="text-gray-900">
                                  {productForm.hasFringe ? "Saçaklı" : "Saçaksız"}
                                </span>
                              </button>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-500">Açıklama</span>
                          <p className="text-black">{selectedProduct.description}</p>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                          <span className="text-sm text-gray-500">Metrekare Fiyatı</span>
                          <span className="font-medium text-black">
                            {getProductPrice(selectedProduct).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {selectedProduct.purchasePricing?.currency}/m²
                          </span>
                        </div>
                        
                        <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-blue-900">Toplam Tutar</span>
                            <span className="text-lg font-bold text-blue-900">
                              {(() => {
                                const width = typeof productForm.width === 'string' ? parseInt(productForm.width) || 80 : productForm.width;
                                const height = typeof productForm.height === 'string' ? parseInt(productForm.height) || 100 : productForm.height;
                                return ((getProductPrice(selectedProduct) * (width * height) / 10000) * productForm.quantity).toLocaleString('tr-TR', { minimumFractionDigits: 2 });
                              })()} {selectedProduct.purchasePricing?.currency}
                            </span>
                          </div>
                          <div className="text-xs mt-1 text-blue-700">
                            {(() => {
                              const width = typeof productForm.width === 'string' ? parseInt(productForm.width) || 80 : productForm.width;
                              const height = typeof productForm.height === 'string' ? parseInt(productForm.height) || 100 : productForm.height;
                              return `${width} cm genişlik × ${height} cm boy × ${productForm.quantity} adet için hesaplandı`;
                            })()}
                          </div>
                        </div>
                        
                        <div className="mt-5">
                          <div className="flex flex-col gap-4">
                            <div className="flex flex-col gap-2">
                              <label className="text-sm font-medium text-gray-700">Miktar</label>
                              <div className="flex">
                                <button 
                                  type="button"
                                  className="w-8 h-8 border border-gray-300 flex items-center justify-center rounded-l-md text-gray-500 hover:bg-gray-50"
                                  onClick={() => productForm.quantity > 1 && setProductForm(prev => ({ ...prev, quantity: prev.quantity - 1 }))}
                                >
                                  -
                                </button>
                                <input 
                                  type="number" 
                                  min="1" 
                                  value={productForm.quantity}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    if (value === '') {
                                      setProductForm(prev => ({ ...prev, quantity: 0 }));
                                    } else {
                                      const numValue = parseInt(value);
                                      if (numValue >= 1) {
                                        setProductForm(prev => ({ ...prev, quantity: numValue }));
                                      }
                                    }
                                  }}
                                  onBlur={(e) => {
                                    const value = e.target.value;
                                    if (value === '' || parseInt(value) < 1) {
                                      setProductForm(prev => ({ ...prev, quantity: 1 }));
                                    }
                                  }}
                                  onWheel={(e) => e.currentTarget.blur()}
                                  className="w-16 border-y border-gray-300 py-1 px-2 text-center text-black"
                                />
                                <button 
                                  type="button"
                                  className="w-8 h-8 border border-gray-300 flex items-center justify-center rounded-r-md text-gray-500 hover:bg-gray-50"
                                  onClick={() => setProductForm(prev => ({ ...prev, quantity: prev.quantity + 1 }))}
                                >
                                  +
                                </button>
                              </div>
                            </div>
                            
                            <div className="flex flex-col gap-2">
                              <label className="text-sm font-medium text-gray-700">Özel Notlar (Opsiyonel)</label>
                              <textarea
                                value={productForm.notes}
                                onChange={(e) => setProductForm(prev => ({ ...prev, notes: e.target.value }))}
                                placeholder="Özel kesim notları veya diğer istekleriniz..."
                                className="w-full border border-gray-300 rounded-md p-2 text-black text-sm"
                                rows={3}
                              />
                            </div>
                            
                            <button
                              type="button"
                              className="mt-2 w-full py-3 text-white rounded-md font-semibold flex items-center justify-center bg-blue-900 hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                              onClick={handleAddToCart}
                              disabled={cartLoading}
                            >
                              {cartLoading ? (
                                <>
                                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Ekleniyor...
                                </>
                              ) : (
                                'Sepete Ekle'
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SaticiSiparisVer;
