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
  Supplier,
  getSuppliers,
  addToSupplierCart,
  getSupplierCart,
  deleteSupplierCartItem,
  completeSupplierPurchase,
  purchaseProductFromSupplier,
  purchaseFromSupplierCart,
  SupplierCartItem as ApiSupplierCartItem,
  SupplierCartResponse
} from '@/services/api';
import { formatSizeOptionLabel, formatStockM2, getConsumableAreaM2ForWidth, isCommonStockEnabled, sortSizeOptionsByWidth, toNumber } from '@/app/utils/productStock';


const SaticiSiparisVer = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAdmin, isAdminOrEditor, user, token, isLoading: authLoading } = useAuth();
  const canSeePurchasePrices = isAdmin;
  
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
    notes: ''
  });
  const [selectedSize, setSelectedSize] = useState<any>(null);
  const [selectedCutType, setSelectedCutType] = useState<any>(null);
  const [selectedHasFringe, setSelectedHasFringe] = useState<boolean | null>(null);
  const [customHeight, setCustomHeight] = useState<number | string>('');
  const [sizeDropdownOpen, setSizeDropdownOpen] = useState(false);
  const [cutTypeDropdownOpen, setCutTypeDropdownOpen] = useState(false);
  const [fringeDropdownOpen, setFringeDropdownOpen] = useState(false);
  const [supplierCart, setSupplierCart] = useState<ApiSupplierCartItem[]>([]);
  const [cartTotal, setCartTotal] = useState(0);
  const [cartLoading, setCartLoading] = useState(false);
  const [orderLoading, setOrderLoading] = useState(false);
  const [showPurchaseSuccessModal, setShowPurchaseSuccessModal] = useState(false);
  const [notice, setNotice] = useState({ isOpen: false, title: '', message: '', isError: false });
  const showNotice = (message: string, isError = true) => {
    setNotice({
      isOpen: true,
      title: isError ? 'İşlem tamamlanamadı' : 'İşlem tamamlandı',
      message,
      isError,
    });
  };
  const [purchaseResult, setPurchaseResult] = useState<any>(null);

  const supplierId = searchParams.get('supplierId');

  // Admin / Editör kontrolü - authLoading tamamlandıktan sonra kontrol et
  useEffect(() => {
    if (!authLoading && !isAdminOrEditor) {
      router.push('/dashboard');
      return;
    }
  }, [isAdminOrEditor, authLoading, router]);

  // Veri yükleme
  useEffect(() => {
    if (isAdminOrEditor && supplierId) {
      loadData();
    }
  }, [isAdminOrEditor, supplierId]);

  // Arama değişikliklerinde ürünleri yeniden yükle
  useEffect(() => {
    if (isAdminOrEditor && supplierId) {
      loadProducts(1, false); // Arama yapıldığında sayfa 1'den başla
    }
  }, [searchTerm]);

  // Modal açıldığında dropdown'ları kapat ve body scroll'u engelle
  useEffect(() => {
    if (showAddProductModal) {
      setSizeDropdownOpen(false);
      setCutTypeDropdownOpen(false);
      setFringeDropdownOpen(false);
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

  // Satın alma başarı modalı açıldığında body scroll'u engelle
  useEffect(() => {
    if (showPurchaseSuccessModal) {
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
  }, [showPurchaseSuccessModal]);

  // Modal açıldığında ve ürün değiştiğinde default seçimleri ayarla
  useEffect(() => {
    if (showAddProductModal && selectedProduct) {
      // Default olarak ilk boyut seçeneğini seç
      const sizes = sortSizeOptionsByWidth(selectedProduct.sizeOptions || []);
      setSelectedSize(sizes[0] ?? null);
      
      // Default olarak ilk kesim türünü seç
      if (selectedProduct.cutTypes && selectedProduct.cutTypes.length > 0) {
        setSelectedCutType(selectedProduct.cutTypes[0]);
      } else {
        setSelectedCutType(null);
      }
      
      // Default saçak değerini ayarla
      setSelectedHasFringe(selectedProduct.canHaveFringe ? false : null);
      
      // Custom height'ı reset et
      setCustomHeight('');
      
      // Form'u reset et
      setProductForm({
        quantity: 1,
        notes: ''
      });
    }
  }, [showAddProductModal, selectedProduct?.productId]);

  // Dropdown'ların dışına tıklandığında kapanması
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.dropdown-container')) {
        setSizeDropdownOpen(false);
        setCutTypeDropdownOpen(false);
        setFringeDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [productsResult, priceListData, suppliers, cartData] = await Promise.all([
        getProducts(1, 50),
        getPurchasePriceLists(),
        getSuppliers().catch(() => [] as Supplier[]),
        supplierId
          ? getSupplierCart(supplierId).catch(() => null)
          : Promise.resolve(null)
      ]);
      
      setProducts(productsResult.data);
      setCurrentPage(1);
      setTotalPages(productsResult.pagination?.totalPages || 1);
      setHasMore(productsResult.pagination?.hasMore || false);
      
      if (priceListData && priceListData.length > 0) {
        setPriceList(priceListData[0]);
      }

      const supplierFromList = suppliers.find((supplier) => supplier.id === supplierId) || null;

      if (cartData) {
        setSupplierCart(cartData.data.cart.items);
        setCartTotal(cartData.data.total.amount);
      } else {
        setSupplierCart([]);
        setCartTotal(0);
      }

      if (supplierFromList) {
        setSelectedSupplier(supplierFromList);
      } else if (cartData?.data?.cart?.supplier) {
        const cartSupplier = cartData.data.cart.supplier;
        setSelectedSupplier({
          id: cartSupplier.id,
          name: cartSupplier.name,
          company_name: cartSupplier.company_name,
          phone: '',
          address: '',
          balance: parseFloat(cartSupplier.balance),
          currency: 'USD',
          notes: '',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          purchasePriceLists: []
        });
      } else if (supplierId) {
        setSelectedSupplier({
          id: supplierId,
          name: '',
          company_name: '',
          phone: '',
          address: '',
          balance: 0,
          currency: 'USD',
          notes: '',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          purchasePriceLists: []
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
  const openAddProductModal = async (product: Product) => {
    const sizes = sortSizeOptionsByWidth(product.sizeOptions || []);
    setSelectedProduct(product);
    setSelectedSize(sizes[0] ?? null);
    setCustomHeight('');
    setProductForm({ quantity: 1, notes: '' });
    setShowAddProductModal(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://pashahomeapps.up.railway.app'}/api/products/${product.productId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) return;
      const payload = await res.json();
      const detail = payload.data || payload;
      if (!detail?.productId) return;
      setSelectedProduct((prev) => {
        if (!prev || prev.productId !== product.productId) return prev;
        return {
          ...prev,
          stock: detail.stock ?? prev.stock,
          sizeOptions: detail.sizeOptions ?? prev.sizeOptions,
          cutTypes: detail.cutTypes ?? prev.cutTypes,
          canHaveFringe: detail.canHaveFringe ?? prev.canHaveFringe,
        } as Product;
      });
      const detailSizes = Array.isArray(detail.sizeOptions)
        ? sortSizeOptionsByWidth(detail.sizeOptions as Array<{ id: number; width: number; height: number; is_optional_height?: boolean }>)
        : [];
      if (detailSizes[0]) {
        setSelectedSize((current: typeof selectedSize) => current ?? detailSizes[0]);
      }
    } catch {
      // Liste kaydı açık kalır.
    }
  };

  const getProductPrice = (product: Product) => {
    if (!product.purchasePricing) return 0;
    return parseFloat(product.purchasePricing.price_per_square_meter.toString());
  };

  // Sepete ürün ekle
  const handleAddToCart = async () => {
    // Validasyon kontrolleri
    if (!selectedProduct || !supplierId || !selectedSize || !selectedCutType) {
      showNotice('Lütfen tüm gerekli alanları doldurun (boyut, kesim türü)');
      return;
    }
    
    if (productForm.quantity <= 0) {
      showNotice('Lütfen geçerli bir miktar girin');
      return;
    }

    // Boyut hesaplama
    let width = selectedSize.width;
    let height = selectedSize.height;
    
    if (selectedSize.is_optional_height) {
      const heightValue = parseFloat(customHeight.toString());
      if (!heightValue || heightValue < 1) {
        showNotice('Lütfen boy giriniz');
        return;
      }
      height = heightValue;
    }

    // Kesim türünü API isteğine uygun formata dönüştür
    let cutTypeValue = "rectangle"; // Varsayılan
    if (selectedCutType.name === "oval") {
      cutTypeValue = "oval";
    } else if (selectedCutType.name === "daire") {
      cutTypeValue = "round";
    } else if (selectedCutType.name === "custom") {
      cutTypeValue = "custom";
    } else if (selectedCutType.name === "post kesim") {
      cutTypeValue = "post kesim";
    }

    setCartLoading(true);
    try {
      const cartData = {
        productId: selectedProduct.productId,
        quantity: productForm.quantity,
        width: width,
        height: height,
        hasFringe: selectedHasFringe || false,
        cutType: cutTypeValue,
        notes: productForm.notes
      };
      
      await addToSupplierCart(supplierId, cartData);

      // Sepeti yeniden yükle
      const updatedCartData = await getSupplierCart(supplierId);
      setSupplierCart(updatedCartData.data.cart.items);
      setCartTotal(updatedCartData.data.total.amount);

      setShowAddProductModal(false);
      
      // Form'u temizle
      setSelectedSize(null);
      setSelectedCutType(null);
      setSelectedHasFringe(null);
      setCustomHeight('');
      setProductForm({
        quantity: 1,
        notes: ''
      });
    } catch (err) {
      console.error('Ürün sepete eklenirken hata oluştu:', err);
      showNotice('Ürün sepete eklenirken bir hata oluştu');
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
      showNotice('Ürün sepetten çıkarılırken bir hata oluştu');
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
      showNotice('Sepet temizlenirken bir hata oluştu');
    } finally {
      setCartLoading(false);
    }
  };

  // Sipariş oluştur
  const handleCreateOrder = async () => {
    if (!supplierId) {
      showNotice('Satıcı bilgisi bulunamadı!');
      return;
    }

    setOrderLoading(true);
    try {
      // Önce sepet durumunu gerçek zamanlı kontrol et
      const currentCartData = await getSupplierCart(supplierId);
      
      if (!currentCartData.data.cart.items || currentCartData.data.cart.items.length === 0) {
        showNotice('Sepet boş! Lütfen önce ürün ekleyin.');
        setOrderLoading(false);
        return;
      }

      // Sepet doluysa sipariş oluştur
      const result = await purchaseFromSupplierCart(supplierId);
      
      // Başarı modalını göster
      setPurchaseResult(result);
      setShowPurchaseSuccessModal(true);
      
      // Sepeti yeniden yükle (sipariş sonrası temizlenmiş olacak)
      try {
        const cartData = await getSupplierCart(supplierId);
        setSupplierCart(cartData.data.cart.items);
        setCartTotal(cartData.data.total.amount);
      } catch (cartError) {
        // Sepet boş olabilir, bu normal - sepeti temizle
        setSupplierCart([]);
        setCartTotal(0);
      }
      
    } catch (err) {
      console.error('Sipariş oluşturma hatası:', err);
      showNotice('Sipariş oluşturulurken bir hata oluştu');
    } finally {
      setOrderLoading(false);
    }
  };

  // Auth yüklenirken loading göster
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8fa]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-[#00365a]" />
          <p className="text-sm text-slate-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  // Admin / Editör kontrolü
  if (!isAdminOrEditor) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8fa]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-[#00365a]" />
          <p className="text-sm text-slate-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 sm:py-8">
        {/* Page Header */}
        <div className="mb-5 sm:mb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
              <h1 className="text-2xl font-light tracking-[0.08em] text-neutral-900 sm:text-3xl sm:tracking-[0.12em]">
                Satın Alım İşlemleri
              </h1>
              <div className="mt-3 h-px w-[min(100%,20rem)] bg-neutral-300 sm:mt-4" />
              {selectedSupplier && (
                <p className="mt-3 text-sm text-slate-500">
                  <span className="font-medium text-slate-700">{selectedSupplier.name}</span>
                  <span className="mx-1.5 text-slate-300">·</span>
                  <span>{selectedSupplier.company_name}</span>
                </p>
              )}
            </div>
            <Link
              href="/dashboard/satin-alim-islemleri"
              className="inline-flex items-center justify-center self-center rounded-lg border border-slate-200/80 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-all duration-200 ease-out hover:border-slate-300 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-[#00365a]/20 active:scale-[0.98] sm:self-auto"
            >
              Geri Dön
            </Link>
          </div>
        </div>

        {/* Minimal Sepet — başlığın hemen altında */}
        <div className="mb-5 rounded-xl border border-slate-200/80 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-3 py-2.5 sm:px-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Sepet
                <span className="ml-1 font-medium tabular-nums text-slate-400">({supplierCart.length})</span>
              </span>
              <div className="ml-auto flex shrink-0 items-center gap-2">
                {canSeePurchasePrices && supplierCart.length > 0 && (
                  <span className="text-xs font-semibold tabular-nums text-[#00365a]">
                    {cartTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} $
                  </span>
                )}
                {supplierCart.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearCart}
                    className="text-[11px] font-medium text-slate-400 transition-colors duration-150 hover:text-rose-600"
                  >
                    Temizle
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleCreateOrder}
                  disabled={orderLoading || cartLoading || supplierCart.length === 0}
                  className="inline-flex items-center justify-center rounded-lg bg-[#00365a] px-3 py-1.5 text-xs font-medium text-white transition-all duration-200 ease-out hover:bg-[#004170] focus-visible:ring-2 focus-visible:ring-[#00365a]/25 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {orderLoading ? '...' : 'Sipariş Oluştur'}
                </button>
              </div>
            </div>

            {supplierCart.length === 0 ? (
              <p className="text-xs text-slate-400">Boş</p>
            ) : (
              <div className="overflow-x-auto">
                <div className={canSeePurchasePrices ? 'min-w-[640px]' : 'min-w-[520px]'}>
                  <div
                    className={`grid items-center gap-x-3 border-b border-slate-100 pb-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-400 ${
                      canSeePurchasePrices
                        ? 'grid-cols-[minmax(0,2fr)_7rem_5.5rem_6.5rem_4rem_2.25rem]'
                        : 'grid-cols-[minmax(0,2fr)_7rem_5.5rem_4rem_2.25rem]'
                    }`}
                  >
                    <span>Ürün</span>
                    <span className="text-right">Ölçü</span>
                    <span className="text-right">m²</span>
                    {canSeePurchasePrices && <span className="text-right">Fiyat</span>}
                    <span className="text-center">Adet</span>
                    <span className="sr-only">Sil</span>
                  </div>
                  <ul className="divide-y divide-slate-100">
                    {supplierCart.map((item) => (
                      <li
                        key={item.id}
                        className={`grid items-center gap-x-3 py-2 ${
                          canSeePurchasePrices
                            ? 'grid-cols-[minmax(0,2fr)_7rem_5.5rem_6.5rem_4rem_2.25rem]'
                            : 'grid-cols-[minmax(0,2fr)_7rem_5.5rem_4rem_2.25rem]'
                        }`}
                      >
                        <span className="min-w-0 truncate text-xs font-medium text-slate-900">
                          {item.product.name}
                        </span>
                        <span className="text-right text-xs tabular-nums text-slate-600">
                          {item.width}x{item.height}
                        </span>
                        <span className="text-right text-xs tabular-nums text-slate-600">
                          {item.area_m2} m²
                        </span>
                        {canSeePurchasePrices && (
                          <span className="text-right text-xs font-medium tabular-nums text-slate-800">
                            {parseFloat(item.total_price).toLocaleString('tr-TR', { minimumFractionDigits: 0 })} $
                          </span>
                        )}
                        <span className="text-center text-xs font-medium tabular-nums text-slate-800">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFromCart(item.id)}
                          disabled={cartLoading}
                          className="inline-flex h-8 w-8 items-center justify-center justify-self-end rounded-md border border-slate-200/80 bg-stone-50 text-slate-400 transition-colors duration-150 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                          aria-label="Sepetten çıkar"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Ürün Listesi — 2 sütun */}
        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
          <div className="border-b border-slate-200/80 px-4 py-3 sm:px-5">
            <label htmlFor="product-search" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Ürün Ara
            </label>
            <input
              id="product-search"
              type="text"
              placeholder="Ürün ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-200/80 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-all duration-200 ease-out hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/20"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2">
            {filteredProducts.length === 0 ? (
              <div className="col-span-full px-5 py-14 text-center sm:col-span-2">
                <p className="text-sm text-slate-500">Ürün bulunamadı</p>
              </div>
            ) : (
              filteredProducts.map((product, index) => (
                <div
                  key={product.productId}
                  className={`flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 transition-colors duration-200 ease-out hover:bg-slate-50/80 sm:px-4 sm:py-2.5 ${
                    index % 2 === 0 ? 'sm:border-r' : ''
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-1.5">
                      <h3 className="truncate text-sm font-medium text-slate-900">{product.name}</h3>
                      <span className="truncate text-[11px] text-slate-500">{product.collection_name}</span>
                    </div>
                    {canSeePurchasePrices && (
                      <p className="mt-0.5 text-[11px] font-semibold tabular-nums text-[#00365a]">
                        {getProductPrice(product).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} USD/m²
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => openAddProductModal(product)}
                    className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[#00365a] px-2.5 py-1.5 text-[11px] font-medium text-white transition-all duration-200 ease-out hover:bg-[#004170] focus-visible:ring-2 focus-visible:ring-[#00365a]/25 active:scale-[0.98]"
                  >
                    Sepete Ekle
                  </button>
                </div>
              ))
            )}
          </div>

          {hasMore && (
            <div className="border-t border-slate-100 px-5 py-4 text-center">
              <button
                type="button"
                onClick={loadMoreProducts}
                disabled={loadingMore}
                className="inline-flex items-center justify-center rounded-lg bg-[#00365a] px-5 py-2 text-sm font-medium text-white transition-all duration-200 ease-out hover:bg-[#004170] focus-visible:ring-2 focus-visible:ring-[#00365a]/25 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loadingMore ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Yükleniyor...
                  </span>
                ) : (
                  'Daha Fazla Yükle'
                )}
              </button>
              <p className="mt-2 text-xs text-slate-500">
                {filteredProducts.length} ürün gösteriliyor
                {totalPages > 1 && ` (Sayfa ${currentPage}/${totalPages})`}
              </p>
            </div>
          )}
        </div>

        {/* Ürün Ekleme Modal */}
        {showAddProductModal && selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px]">
            <div className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
              {/* Compact header */}
              <div className="flex items-start gap-3 border-b border-slate-100 px-4 py-3 pr-12">
                <div className="relative h-14 w-12 shrink-0 overflow-hidden rounded-lg border border-slate-200/80 bg-slate-50 aspect-[350/400]">
                  {selectedProduct.productImage ? (
                    <img
                      src={selectedProduct.productImage}
                      alt={selectedProduct.name}
                      className="h-full w-full object-contain p-1"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <svg className="h-5 w-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <h2 className="truncate text-sm font-semibold text-slate-900">
                    {selectedProduct.name}
                  </h2>
                  <p className="truncate text-xs text-slate-500">{selectedProduct.collection_name}</p>
                  {canSeePurchasePrices && (
                    <p className="mt-1 text-xs font-semibold tabular-nums text-[#00365a]">
                      {getProductPrice(selectedProduct).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} USD/m²
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all duration-200 ease-out hover:bg-slate-50 hover:text-slate-700 active:scale-[0.96]"
                  onClick={() => setShowAddProductModal(false)}
                  aria-label="Kapat"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4 overflow-y-auto px-4 py-4 max-h-[calc(90vh-140px)] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {/* Boyut */}
                <div className="dropdown-container">
                  <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-500">Boyut</span>
                  {isCommonStockEnabled(selectedProduct) && selectedSize && (
                    <p className="mb-2 text-sm text-slate-600">
                      Mevcut stok: <span className="font-semibold tabular-nums text-slate-900">{getConsumableAreaM2ForWidth(selectedProduct, toNumber(selectedSize.width)).toFixed(2)} m²</span>
                    </p>
                  )}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setSizeDropdownOpen(!sizeDropdownOpen)}
                      className="w-full rounded-lg border border-slate-200/80 bg-white px-3 py-2.5 pr-9 text-left text-sm tabular-nums transition hover:border-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/20"
                    >
                      <span className="flex items-center justify-between gap-3 pr-4 text-slate-900">
                        <span>{selectedSize ? formatSizeOptionLabel(selectedSize) : 'Boyut seçin'}</span>
                        {selectedSize && isCommonStockEnabled(selectedProduct) && (
                          <span className="inline-flex items-baseline gap-1 text-xs font-normal">
                            <span className="tabular-nums text-slate-400">{formatStockM2(getConsumableAreaM2ForWidth(selectedProduct, toNumber(selectedSize.width)))}</span>
                            <span className="text-rose-600">stok</span>
                          </span>
                        )}
                      </span>
                      <svg className={`absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-transform ${sizeDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {sizeDropdownOpen && (
                      <div className="absolute z-50 mt-1.5 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-200/80 bg-white py-1 shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
                        {sortSizeOptionsByWidth(selectedProduct.sizeOptions || []).map((size) => (
                          <button
                            key={size.id}
                            type="button"
                            onClick={() => {
                              setSelectedSize(size);
                              if (size.is_optional_height) setCustomHeight('');
                              setSizeDropdownOpen(false);
                            }}
                            className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm tabular-nums transition hover:bg-slate-50 ${
                              selectedSize?.id === size.id ? 'bg-[#00365a]/[0.08] font-medium text-[#00365a]' : 'text-slate-700'
                            }`}
                          >
                            <span>{formatSizeOptionLabel(size)}</span>
                            {isCommonStockEnabled(selectedProduct) && (
                              <span className="inline-flex items-baseline gap-1 text-xs font-normal">
                                <span className="tabular-nums text-slate-400">{formatStockM2(getConsumableAreaM2ForWidth(selectedProduct, toNumber(size.width)))}</span>
                                <span className="text-rose-600">stok</span>
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {selectedSize && selectedSize.is_optional_height && (
                    <div className="mt-2.5 flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <label className="shrink-0 text-xs text-slate-500">Boy</label>
                        <div className="flex h-9 max-w-[120px] items-center overflow-hidden rounded-lg border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-[#00365a]/20">
                          <input
                            type="number"
                            min="1"
                            max={toNumber(selectedSize.height) > 0 ? toNumber(selectedSize.height) : undefined}
                            value={customHeight}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === '') {
                                setCustomHeight('');
                              } else {
                                const numValue = Number(value);
                                const maxHeight = toNumber(selectedSize.height);
                                if (numValue >= 1 && (maxHeight <= 0 || numValue <= maxHeight)) {
                                  setCustomHeight(numValue);
                                } else if (value.length <= 1) {
                                  setCustomHeight(value);
                                }
                              }
                            }}
                            onBlur={(e) => {
                              const value = e.target.value;
                              const maxHeight = toNumber(selectedSize.height);
                              if (value !== '' && maxHeight > 0 && Number(value) > maxHeight) {
                                setCustomHeight(maxHeight);
                              }
                            }}
                            className="h-full w-full bg-transparent px-2.5 text-sm tabular-nums text-slate-900 outline-none"
                            aria-label="Boy (cm)"
                          />
                          <span className="pr-2.5 text-xs text-slate-400">cm</span>
                        </div>
                      </div>
                      <p className="text-xs font-medium text-rose-600">Lütfen boy giriniz.</p>
                    </div>
                  )}
                </div>

                {/* Miktar + Notlar yan yana hissi */}
                <div className="flex items-end gap-4">
                  <div className="shrink-0">
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Miktar</label>
                    <div className="flex h-9 w-fit overflow-hidden rounded-lg border border-slate-200/80 bg-white">
                      <button
                        type="button"
                        className="flex h-full w-8 items-center justify-center text-slate-500 transition-all duration-200 ease-out hover:bg-slate-50 hover:text-slate-800 active:scale-[0.96]"
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
                        className="w-12 border-x border-slate-200/80 bg-transparent py-1 text-center text-sm tabular-nums text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00365a]/20"
                      />
                      <button
                        type="button"
                        className="flex h-full w-8 items-center justify-center text-slate-500 transition-all duration-200 ease-out hover:bg-slate-50 hover:text-slate-800 active:scale-[0.96]"
                        onClick={() => setProductForm(prev => ({ ...prev, quantity: prev.quantity + 1 }))}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {canSeePurchasePrices && selectedSize && (
                    <div className="min-w-0 flex-1 rounded-lg border border-slate-200/80 bg-slate-50 px-3 py-2">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Toplam</p>
                      <p className="text-sm font-semibold tabular-nums text-[#00365a]">
                        {(() => {
                          if (!selectedSize || !productForm.quantity) return '0.00';
                          // Metrekare hesapla
                          let squareMeters;
                          if (selectedSize.is_optional_height) {
                            // İsteğe bağlı boy için kullanıcının girdiği değeri kullan
                            const heightValue = parseFloat(customHeight.toString());
                            if (!heightValue || heightValue < 1) return '0.00';
                            squareMeters = (selectedSize.width * heightValue) / 10000; // cm² -> m²
                          } else {
                            // Sabit boy için metrekare hesapla
                            squareMeters = (selectedSize.width * selectedSize.height) / 10000; // cm² -> m²
                          }

                          // Birim fiyat ve toplam fiyat hesapla (quantity ile çarp)
                          const unitPrice = getProductPrice(selectedProduct) || 0;
                          const calculatedPrice = squareMeters * unitPrice * productForm.quantity;

                          return calculatedPrice.toFixed(2);
                        })()} USD
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                    Not (opsiyonel)
                  </label>
                  <textarea
                    value={productForm.notes}
                    onChange={(e) => setProductForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Özel kesim veya not..."
                    className="h-16 w-full resize-none rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 transition-all duration-200 ease-out placeholder:text-slate-400 hover:border-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/20"
                    rows={2}
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 px-4 py-3">
                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#00365a] py-2.5 text-sm font-semibold text-white transition-all duration-200 ease-out hover:bg-[#004170] focus-visible:ring-2 focus-visible:ring-[#00365a]/25 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={handleAddToCart}
                  disabled={cartLoading}
                >
                  {cartLoading ? (
                    <>
                      <svg className="h-4 w-4 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
        )}

        {/* Satın Alma Başarı Modalı */}
        {showPurchaseSuccessModal && purchaseResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px]">
            <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
              <div className="relative border-b border-slate-100 px-5 py-5 sm:px-6">
                <button
                  type="button"
                  className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all duration-200 ease-out hover:bg-slate-50 hover:text-slate-700 active:scale-[0.96] sm:right-4 sm:top-4"
                  onClick={() => {
                    setShowPurchaseSuccessModal(false);
                    router.push('/dashboard/satin-alim-islemleri');
                  }}
                  aria-label="Kapat"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                <div className="flex items-center gap-3 pr-8">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Satın Alma Başarılı</h2>
                    <p className="mt-0.5 text-xs text-slate-500">İşlem tamamlandı</p>
                  </div>
                </div>
              </div>

              <div className="overflow-y-auto p-5 sm:p-6 max-h-[calc(90vh-120px)]">
                {canSeePurchasePrices && (
                  <div className="mb-6 rounded-xl border border-emerald-100 bg-emerald-50/80 p-4 text-center">
                    <p className="text-xs font-medium uppercase tracking-wide text-emerald-700/80">Toplam Tutar</p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-800">
                      ${purchaseResult.data.totalAmount.toFixed(2)}
                    </p>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="mb-3 text-sm font-semibold text-slate-900">Satın Alınan Ürünler</h3>
                  <div className="space-y-3">
                    {purchaseResult.data.purchasedItems.map((item: any, index: number) => (
                      <div key={item.id} className="rounded-xl border border-slate-200/80 bg-white p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <h4 className="font-medium text-slate-900">{item.product.name}</h4>
                            <p className="text-sm text-slate-500">{item.product.collection.name}</p>
                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                              <span>Miktar: {item.quantity} adet</span>
                              <span>Boyut: {item.width}x{item.height} cm</span>
                            </div>
                          </div>
                          {canSeePurchasePrices && (
                            <div className="shrink-0 text-right">
                              <p className="text-lg font-semibold tabular-nums text-slate-900">${item.total_price}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setShowPurchaseSuccessModal(false)}
                    className="rounded-lg border border-slate-200/80 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition-all duration-200 ease-out hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98]"
                  >
                    Kapat
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPurchaseSuccessModal(false);
                      router.push('/dashboard/satin-alim-islemleri');
                    }}
                    className="rounded-lg bg-[#00365a] px-5 py-2.5 text-sm font-medium text-white transition-all duration-200 ease-out hover:bg-[#004170] focus-visible:ring-2 focus-visible:ring-[#00365a]/25 active:scale-[0.98]"
                  >
                    Satın Alım İşlemlerine Git
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {notice.isOpen && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-xl border border-slate-200/80 bg-white p-6">
              <h3 className="mb-3 text-lg font-semibold tracking-tight text-slate-900">{notice.title}</h3>
              <p className={`mb-6 text-sm ${notice.isError ? 'text-rose-700' : 'text-slate-500'}`}>{notice.message}</p>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setNotice((prev) => ({ ...prev, isOpen: false }))}
                  className="rounded-lg bg-[#00365a] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#004170]"
                >
                  Tamam
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SaticiSiparisVer;
