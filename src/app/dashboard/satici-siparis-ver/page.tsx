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
  Supplier
} from '@/services/api';

interface SupplierCartItem {
  productId: string;
  name: string;
  productImage: string;
  collectionName: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  width: number;
  height: number;
  has_fringe: boolean;
  cut_type: string;
  notes?: string;
}

interface SupplierCart {
  items: SupplierCartItem[];
  totalPrice: number;
}

const SaticiSiparisVer = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAdmin, user, isLoading: authLoading } = useAuth();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [priceList, setPriceList] = useState<PurchasePriceList | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCollection, setSelectedCollection] = useState('all');
  const [collectionDropdownOpen, setCollectionDropdownOpen] = useState(false);
  const [stockFilter, setStockFilter] = useState('all');
  const [stockFilterDropdownOpen, setStockFilterDropdownOpen] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    quantity: 1,
    width: 80,
    height: 100 as number | string,
    hasFringe: false,
    cutType: '',
    notes: ''
  });
  const [sizeDropdownOpen, setSizeDropdownOpen] = useState(false);
  const [cutTypeDropdownOpen, setCutTypeDropdownOpen] = useState(false);
  const [supplierCart, setSupplierCart] = useState<SupplierCart>({
    items: [],
    totalPrice: 0
  });
  const [cartLoading, setCartLoading] = useState(false);
  const [orderNotes, setOrderNotes] = useState('');
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

  const loadData = async () => {
    setLoading(true);
    try {
      const [productsData, priceListData] = await Promise.all([
        getProducts(),
        getPurchasePriceLists()
      ]);
      
      setProducts(productsData);
      if (priceListData && priceListData.length > 0) {
        setPriceList(priceListData[0]);
      }
      
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
    } catch (err) {
      console.error('Veri yükleme hatası:', err);
    } finally {
      setLoading(false);
    }
  };

  // Koleksiyonları filtrele
  const collections = Array.from(new Set(products.map(p => p.collection_name))).sort();

  // Filtrelenmiş ürünler
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.collection_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCollection = selectedCollection === 'all' || product.collection_name === selectedCollection;
    const matchesStock = stockFilter === 'all' || 
                        (stockFilter === 'in_stock' && product.stock_quantity > 0) ||
                        (stockFilter === 'out_of_stock' && product.stock_quantity === 0);
    
    return matchesSearch && matchesCollection && matchesStock;
  });

  // Ürün fiyatını al (alış fiyat listesinden)
  const getProductPrice = (product: Product) => {
    if (!priceList) return 0;
    
    const details = priceList.details as any[];
    const priceDetail = details.find(detail => detail.collection_id === product.collection_id);
    return priceDetail ? parseFloat(priceDetail.price_per_square_meter) : 0;
  };

  // Sepete ürün ekle
  const handleAddToCart = () => {
    if (!selectedProduct) return;

    const price = getProductPrice(selectedProduct);
    const area = (productForm.width * productForm.height) / 10000; // cm² to m²
    const totalPrice = price * area * productForm.quantity;

    const newItem: SupplierCartItem = {
      productId: selectedProduct.id,
      name: selectedProduct.name,
      productImage: selectedProduct.product_image || '',
      collectionName: selectedProduct.collection_name,
      quantity: productForm.quantity,
      unit_price: price,
      total_price: totalPrice,
      width: productForm.width,
      height: productForm.height as number,
      has_fringe: productForm.hasFringe,
      cut_type: productForm.cutType,
      notes: productForm.notes
    };

    setSupplierCart(prev => ({
      items: [...prev.items, newItem],
      totalPrice: prev.totalPrice + totalPrice
    }));

    setShowAddProductModal(false);
    setProductForm({
      quantity: 1,
      width: 80,
      height: 100,
      hasFringe: false,
      cutType: '',
      notes: ''
    });
  };

  // Sepetten ürün çıkar
  const handleRemoveFromCart = (index: number) => {
    const item = supplierCart.items[index];
    setSupplierCart(prev => ({
      items: prev.items.filter((_, i) => i !== index),
      totalPrice: prev.totalPrice - item.total_price
    }));
  };

  // Sepeti temizle
  const handleClearCart = () => {
    setSupplierCart({
      items: [],
      totalPrice: 0
    });
  };

  // Sipariş oluştur
  const handleCreateOrder = async () => {
    if (!selectedSupplier || supplierCart.items.length === 0) {
      alert('Sepet boş! Lütfen önce ürün ekleyin.');
      return;
    }

    setOrderLoading(true);
    try {
      // Mock sipariş oluşturma - gerçek API entegrasyonu yapılacak
      console.log('Satıcı siparişi oluşturuluyor:', {
        supplierId: selectedSupplier.id,
        items: supplierCart.items,
        totalPrice: supplierCart.totalPrice,
        notes: orderNotes
      });

      alert('Satıcı siparişi başarıyla oluşturuldu!');
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
              <h1 className="text-3xl font-bold text-gray-900">Satıcı Adına Sipariş Ver</h1>
              {selectedSupplier && (
                <p className="mt-2 text-gray-600">
                  <strong>{selectedSupplier.name}</strong> - {selectedSupplier.company_name}
                </p>
              )}
            </div>
            <Link
              href="/dashboard/satin-alim-islemleri"
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Geri Dön
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Ürün Listesi */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              {/* Filtreler */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex flex-wrap gap-4">
                  {/* Arama */}
                  <div className="flex-1 min-w-64">
                    <input
                      type="text"
                      placeholder="Ürün ara..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent"
                    />
                  </div>

                  {/* Koleksiyon Filtresi */}
                  <div className="relative">
                    <button
                      onClick={() => setCollectionDropdownOpen(!collectionDropdownOpen)}
                      className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent"
                    >
                      {selectedCollection === 'all' ? 'Tüm Koleksiyonlar' : selectedCollection}
                      <svg className="w-4 h-4 ml-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {collectionDropdownOpen && (
                      <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                        <button
                          onClick={() => {
                            setSelectedCollection('all');
                            setCollectionDropdownOpen(false);
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50"
                        >
                          Tüm Koleksiyonlar
                        </button>
                        {collections.map(collection => (
                          <button
                            key={collection}
                            onClick={() => {
                              setSelectedCollection(collection);
                              setCollectionDropdownOpen(false);
                            }}
                            className="w-full px-4 py-2 text-left hover:bg-gray-50"
                          >
                            {collection}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Stok Filtresi */}
                  <div className="relative">
                    <button
                      onClick={() => setStockFilterDropdownOpen(!stockFilterDropdownOpen)}
                      className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent"
                    >
                      {stockFilter === 'all' ? 'Tüm Stoklar' : stockFilter === 'in_stock' ? 'Stokta Var' : 'Stokta Yok'}
                      <svg className="w-4 h-4 ml-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {stockFilterDropdownOpen && (
                      <div className="absolute top-full left-0 mt-1 w-32 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                        <button
                          onClick={() => {
                            setStockFilter('all');
                            setStockFilterDropdownOpen(false);
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50"
                        >
                          Tüm Stoklar
                        </button>
                        <button
                          onClick={() => {
                            setStockFilter('in_stock');
                            setStockFilterDropdownOpen(false);
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50"
                        >
                          Stokta Var
                        </button>
                        <button
                          onClick={() => {
                            setStockFilter('out_of_stock');
                            setStockFilterDropdownOpen(false);
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50"
                        >
                          Stokta Yok
                        </button>
                      </div>
                    )}
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
                          {product.product_image ? (
                            <img
                              src={product.product_image}
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
                          <p className="text-xs text-gray-500">Stok: {product.stock_quantity}</p>
                          <p className="text-sm font-semibold text-green-600 mt-1">
                            {getProductPrice(product).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {priceList?.currency}/m²
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
              </div>
            </div>
          </div>

          {/* Sepet */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 sticky top-4">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Sepet</h2>
                  {supplierCart.items.length > 0 && (
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
                {supplierCart.items.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Sepet boş</p>
                ) : (
                  <div className="space-y-4">
                    {supplierCart.items.map((item, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-gray-900">{item.name}</h4>
                            <p className="text-xs text-gray-500">{item.collectionName}</p>
                            <p className="text-xs text-gray-500">
                              {item.width}x{item.height}cm - {item.quantity} adet
                            </p>
                            {item.cutType && (
                              <p className="text-xs text-gray-500">Kesim: {item.cutType}</p>
                            )}
                            {item.hasFringe && (
                              <p className="text-xs text-gray-500">Saçaklı</p>
                            )}
                            <p className="text-sm font-semibold text-green-600 mt-1">
                              {item.total_price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {priceList?.currency}
                            </p>
                          </div>
                          <button
                            onClick={() => handleRemoveFromCart(index)}
                            className="text-red-600 hover:text-red-800 ml-2"
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

                {supplierCart.items.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-lg font-semibold text-gray-900">Toplam:</span>
                      <span className="text-lg font-bold text-green-600">
                        {supplierCart.totalPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {priceList?.currency}
                      </span>
                    </div>

                    <div className="space-y-3">
                      <textarea
                        placeholder="Sipariş notları..."
                        value={orderNotes}
                        onChange={(e) => setOrderNotes(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent text-sm"
                        rows={3}
                      />

                      <button
                        onClick={handleCreateOrder}
                        disabled={orderLoading}
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Ürün Ekle</h3>
                  <button
                    onClick={() => setShowAddProductModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{selectedProduct.name}</h4>
                    <p className="text-sm text-gray-500">{selectedProduct.collection_name}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Adet</label>
                    <input
                      type="number"
                      min="1"
                      value={productForm.quantity}
                      onChange={(e) => setProductForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Genişlik (cm)</label>
                      <input
                        type="number"
                        min="1"
                        value={productForm.width}
                        onChange={(e) => setProductForm(prev => ({ ...prev, width: parseInt(e.target.value) || 1 }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Yükseklik (cm)</label>
                      <input
                        type="number"
                        min="1"
                        value={productForm.height}
                        onChange={(e) => setProductForm(prev => ({ ...prev, height: parseInt(e.target.value) || 1 }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={productForm.hasFringe}
                        onChange={(e) => setProductForm(prev => ({ ...prev, hasFringe: e.target.checked }))}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Saçaklı</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Kesim Türü</label>
                    <input
                      type="text"
                      value={productForm.cutType}
                      onChange={(e) => setProductForm(prev => ({ ...prev, cutType: e.target.value }))}
                      placeholder="Opsiyonel"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notlar</label>
                    <textarea
                      value={productForm.notes}
                      onChange={(e) => setProductForm(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Opsiyonel"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent"
                      rows={2}
                    />
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      onClick={() => setShowAddProductModal(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      İptal
                    </button>
                    <button
                      onClick={handleAddToCart}
                      className="flex-1 px-4 py-2 bg-[#00365a] text-white rounded-lg hover:bg-[#004170] transition-colors"
                    >
                      Sepete Ekle
                    </button>
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
