'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useToken } from '@/app/hooks/useToken';

// API Base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://pashahomeapps.up.railway.app";

// Sayfalama Komponenti
const Pagination = ({ pagination, onPageChange, searchTerm = '' }: {
  pagination: any;
  onPageChange: (page: number, search?: string) => void;
  searchTerm?: string;
}) => {
  if (!pagination) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 px-4 py-3 sm:px-5">
      <p className="text-sm text-slate-500">
        Sayfa {pagination.page} / {pagination.totalPages} (Toplam {pagination.total} ürün)
      </p>
      <div className="flex items-center gap-2">
        <button
          disabled={pagination.page <= 1}
          onClick={() => onPageChange(pagination.page - 1, searchTerm)}
          className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15 disabled:cursor-not-allowed disabled:opacity-50"
        >
          ← Önceki
        </button>
        <button
          disabled={!pagination.hasMore}
          onClick={() => onPageChange(pagination.page + 1, searchTerm)}
          className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Sonraki →
        </button>
      </div>
    </div>
  );
};

// Loading Spinner Komponenti
const LoadingSpinner = () => (
  <div className="flex flex-col items-center justify-center gap-3 py-16">
    <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-[#00365a]" />
    <p className="text-sm text-slate-500">Ürünler yükleniyor...</p>
  </div>
);

// Responsive sayfa boyutu fonksiyonu
const getPageSize = () => {
  if (typeof window === 'undefined') return 20;
  const width = window.innerWidth;
  if (width < 768) return 10;      // Mobil: 10 ürün
  if (width < 1024) return 15;     // Tablet: 15 ürün
  return 20;                       // Desktop: 20 ürün
};

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
  stockAreaM2: number;
  pieceAreaM2: number;
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
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
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
  areaM2?: number;
  updateMode?: 'add' | 'set'; // 'add' stok ekleme, 'set' stok güncelleme
  areaM2ForFixed?: number; // Hazır kesim için m² girişi
}

interface StockUpdateResponse {
  success: boolean;
  data: Product;
  message?: string;
}

export default function StokPage() {
  const { user, isLoading, isAdmin, isAdminOrEditor } = useAuth();
  const token = useToken();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSizeOption, setSelectedSizeOption] = useState<SizeOption | null>(null);
  const [stockForm, setStockForm] = useState<StockUpdateRequest>({
    width: 0,
    height: 0,
    quantity: 0,
    areaM2: 0,
    updateMode: 'add', // Varsayılan olarak stok ekleme modu
    areaM2ForFixed: 0
  });

  // Input değerleri için string state'ler (silme sorunu için)
  const [inputValues, setInputValues] = useState({
    height: '',
    areaM2: '',
    quantity: '',
    areaM2ForFixed: ''
  });
  const [isUpdatingStock, setIsUpdatingStock] = useState(false);
  const [isLoadingProductDetail, setIsLoadingProductDetail] = useState(false);

  // Debounce timer için ref
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Component unmount olduğunda body scroll'unu geri aç
  useEffect(() => {
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  useEffect(() => {
    // Auth loading tamamlandığında user yoksa login'e yönlendir
    if (!isLoading && !user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  // Admin ve Editör kontrolü
  useEffect(() => {
    // Auth loading tamamlandığında admin/editör kontrolü yap
    if (!isLoading && user && !isAdminOrEditor) {
      router.push('/dashboard');
    }
  }, [user, isAdminOrEditor, isLoading, router]);

  useEffect(() => {
    if (!token) return;
    fetchProducts();
  }, [token]); // fetchProducts fonksiyonu stable olmadığı için dependency'ye eklenmemiştir

  // Arama değiştiğinde debounce ile API çağrısı
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setSearchTerm(search);
      setCurrentPage(1); // Arama değiştiğinde ilk sayfaya dön
      fetchProducts(1, search);
    }, 300); // 300ms debounce

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [search]); // fetchProducts fonksiyonu stable olmadığı için dependency'ye eklenmemiştir

  // Optimizasyonlu ürün getirme fonksiyonu
  const fetchProducts = async (page: number = 1, searchQuery: string = '') => {
    try {
      setIsLoadingProducts(true);
      const limit = getPageSize();

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(searchQuery && { search: searchQuery })
      });

      const response = await fetch(`${API_BASE_URL}/api/products?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data: ProductsResponse = await response.json();
        if (data.success) {
          const sortedProducts = data.data.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
          setProducts(sortedProducts);
          setPagination(data.pagination); // Yeni pagination bilgisi
          setCurrentPage(page);
        }
      }
    } catch (error) {
      console.error('Ürünler çekme hatası:', error);
      setProducts([]);
      setPagination(null);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  // Sayfa değişikliği handler'ı
  const handlePageChange = (newPage: number, search: string = searchTerm) => {
    fetchProducts(newPage, search);
  };

  // Ürün detaylarını GET ile çek
  const fetchProductDetail = async (productId: string): Promise<Product | null> => {
    try {
      setIsLoadingProductDetail(true);

      const normalUrl = `${API_BASE_URL}/api/products/${productId}`;

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
      const variationsUrl = `${API_BASE_URL}/api/products/${productId}/variations`;

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

      if (firstOption.is_optional_height) {
        setStockForm({
          width: firstOption.width,
          height: 0,
          quantity: 0,
          areaM2: 0,
          updateMode: 'add' // Varsayılan olarak ekleme modu
        });
      } else {
        setStockForm({
          width: firstOption.width,
          height: firstOption.height,
          quantity: 0,
          areaM2: 0,
          areaM2ForFixed: 0,
          updateMode: 'add' // Varsayılan olarak ekleme modu
        });
      }
    } else if (productToUse.variations && productToUse.variations.length > 0) {
      const firstVariation = productToUse.variations[0];
      setSelectedSizeOption(null);
      setStockForm({
        width: firstVariation.width,
        height: firstVariation.height,
        quantity: 0,
        areaM2: 0,
        areaM2ForFixed: 0,
        updateMode: 'add' // Varsayılan olarak ekleme modu
      });
    } else {
      setSelectedSizeOption(null);
      setStockForm({
        width: 100,
        height: 100,
        quantity: 0,
        areaM2: 0,
        areaM2ForFixed: 0,
        updateMode: 'add' // Varsayılan olarak ekleme modu
      });
    }

    setIsModalOpen(true);
    // Modal açıldığında body scroll'u engelle
    document.body.style.overflow = 'hidden';
  };

  const closeStockModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
    setSelectedSizeOption(null);
    setStockForm({ width: 0, height: 0, quantity: 0, areaM2: 0, updateMode: 'add', areaM2ForFixed: 0 });
    setInputValues({ height: '', areaM2: '', quantity: '', areaM2ForFixed: '' });
    // Modal kapandığında body scroll'u geri aç
    document.body.style.overflow = 'auto';
  };

  // Ürün tipini belirleme fonksiyonu
  const getProductType = (sizeOptions: SizeOption[]) => {
    if (sizeOptions.length === 0) return 'unknown';

    const hasOptionalHeight = sizeOptions.some(so => so.is_optional_height === true);

    if (hasOptionalHeight) {
      return 'optional_height';
    } else {
      return 'fixed_size';
    }
  };

  // m²'den adet hesaplama fonksiyonu
  const calculateQuantityFromArea = (areaM2: number, pieceAreaM2: number): number => {
    if (pieceAreaM2 <= 0) return 0;
    return Math.floor(areaM2 / pieceAreaM2);
  };

  const handleSizeOptionChange = (sizeOption: SizeOption) => {
    setSelectedSizeOption(sizeOption);

    if (sizeOption.is_optional_height) {
      // Opsiyonel boy: m² bazlı
      setStockForm(prev => ({
        ...prev,
        width: sizeOption.width,
        height: 0,
        quantity: 0,
        areaM2: 0,
        updateMode: 'add' // Varsayılan olarak ekleme modu
      }));
      setInputValues({ height: '', areaM2: '', quantity: '', areaM2ForFixed: '' });
    } else {
      // Hazır kesim: adet bazlı
      setStockForm(prev => ({
        ...prev,
        width: sizeOption.width,
        height: sizeOption.height,
        quantity: 0,
        areaM2: 0,
        areaM2ForFixed: 0,
        updateMode: 'add' // Varsayılan olarak ekleme modu
      }));
      setInputValues({ height: '', areaM2: '', quantity: '', areaM2ForFixed: '' });
    }
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

    // Editör kullanıcılar sadece 'add' modunu kullanabilir
    if (!isAdmin && stockForm.updateMode === 'set') {
      alert('Bu işlem için yetkiniz bulunmuyor! Sadece stok ekleme yapabilirsiniz.');
      return;
    }

    const productType = selectedSizeOption?.is_optional_height ? 'optional_height' : 'fixed_size';
    let apiUrl: string;
    let requestBody: any;

    if (productType === 'optional_height') {
      // Opsiyonel boy: m² bazlı stok işlemi
      apiUrl = `${API_BASE_URL}/api/products/${selectedProduct.productId}/stock-area`;

      if (stockForm.width <= 0 || (stockForm.areaM2 || 0) < 0) {
        alert('Lütfen geçerli genişlik ve m² değerleri girin!');
        return;
      }

      let finalAreaM2 = stockForm.areaM2 || 0;
      
      if (stockForm.updateMode === 'add' && selectedSizeOption) {
        // EKLEME MODU: Mevcut stok + eklenen miktar
        const currentStock = selectedSizeOption.stockAreaM2 || 0;
        finalAreaM2 = currentStock + (stockForm.areaM2 || 0);
      } else if (stockForm.updateMode === 'set') {
        // GÜNCELLEME MODU: Direkt yazılan değer
        finalAreaM2 = stockForm.areaM2 || 0;
      }

      requestBody = {
        width: stockForm.width,
        height: 0,
        areaM2: finalAreaM2,
        updateMode: stockForm.updateMode
      };
    } else {
      // Hazır kesim de aynı enin m² havuzunu günceller. Adedi doğrudan
      // hedeflemek, havuzdaki başka hazır boylardan kalan m²'yi kaybettirirdi.
      apiUrl = `${API_BASE_URL}/api/products/${selectedProduct.productId}/stock-area`;

      if (stockForm.width <= 0 || stockForm.height <= 0 || stockForm.quantity < 0) {
        alert('Lütfen geçerli boyut ve adet değerleri girin!');
        return;
      }

      const pieceAreaM2 = (stockForm.width * stockForm.height) / 10000;
      const enteredAreaM2 = (stockForm.areaM2ForFixed || 0) > 0
        ? (stockForm.areaM2ForFixed || 0)
        : stockForm.quantity * pieceAreaM2;
      const currentWidthAreaM2 = selectedSizeOption?.stockAreaM2 || 0;
      const finalAreaM2 = stockForm.updateMode === 'add'
        ? currentWidthAreaM2 + enteredAreaM2
        : enteredAreaM2;

      requestBody = {
        width: stockForm.width,
        height: stockForm.height,
        areaM2: finalAreaM2,
        updateMode: stockForm.updateMode
      };
    }

    setIsUpdatingStock(true);
    
    try {
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

            // Seçili boyut seçeneğini de güncelle
            if (selectedSizeOption && data.data.sizeOptions) {
              const updatedSizeOption = data.data.sizeOptions.find(
                (option: SizeOption) => option.id === selectedSizeOption.id
              );
              if (updatedSizeOption) {
                setSelectedSizeOption(updatedSizeOption);
              }
            }

            setStockForm(prev => ({
              ...prev,
              quantity: 0,
              areaM2: 0,
              areaM2ForFixed: 0
            }));

            // Input değerlerini de sıfırla
            setInputValues({
              height: '',
              areaM2: '',
              quantity: '',
              areaM2ForFixed: ''
            });

            const successMessage = stockForm.updateMode === 'add' 
              ? `Stok başarıyla eklendi! (${productType === 'optional_height' ? `+${stockForm.areaM2} m²` : `+${stockForm.quantity} adet`})`
              : `Stok başarıyla güncellendi! (${productType === 'optional_height' ? `${stockForm.areaM2} m²` : `${stockForm.quantity} adet`})`;
            alert(successMessage);
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

  // Auth yüklenirken loading göster
  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#f7f8fa]">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-[#00365a]" />
        <p className="text-sm text-slate-500">Yetkilendirme kontrol ediliyor...</p>
      </div>
    );
  }

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#f7f8fa]">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-[#00365a]" />
        <p className="text-sm text-slate-500">Sistem yükleniyor...</p>
      </div>
    );
  }

  // Admin veya Editör olmayan kullanıcılar için erişim engeli
  if (!isAdminOrEditor) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8fa] px-4">
        <div className="w-full max-w-md rounded-xl border border-slate-200/80 bg-white px-6 py-10 text-center shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Erişim Reddedildi</h3>
          <p className="mt-2 text-sm text-slate-500">
            Bu sayfaya erişim yetkiniz bulunmamaktadır. Stok yönetimi sadece admin ve editör kullanıcılar tarafından kullanılabilir.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-6 inline-flex items-center justify-center rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004170] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Dashboard&apos;a Dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-light tracking-[0.08em] text-neutral-900 sm:text-3xl sm:tracking-[0.12em]">
              Stok Yönetimi
            </h1>
            <div className="mt-3 h-px w-[min(100%,20rem)] bg-neutral-300 sm:mt-4" />
            <p className="mt-3 text-sm text-slate-500">Ürün stoklarını görüntüleyin ve güncelleyin</p>
          </div>
        </div>

        {/* Arama ve Filtreler */}
        <div className="mb-6 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
          <div className={`grid grid-cols-1 gap-4 ${search ? 'md:grid-cols-[minmax(0,2fr)_auto]' : ''}`}>
            <div>
              <label htmlFor="search-input" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                Ara
              </label>
              <div className="relative">
                <input
                  id="search-input"
                  type="text"
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-400 focus:border-[#00365a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                  placeholder="Ürün adı, açıklama veya ID ara..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoComplete="off"
                  spellCheck="false"
                />
                <svg
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.8}
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            {search && (
              <div className="flex items-end">
                <button
                  type="button"
                  className="inline-flex w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15 md:w-auto"
                  onClick={() => setSearch("")}
                >
                  Filtreleri Temizle
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Ürünler Listesi */}
        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50/60 px-4 py-3 sm:px-5">
            <h3 className="text-sm font-semibold text-slate-900">Tüm Ürünler</h3>
            {pagination && (
              <span className="text-xs text-slate-500">{pagination.total} ürün</span>
            )}
          </div>

          <div>
            {isLoadingProducts ? (
              <LoadingSpinner />
            ) : products.length > 0 ? (
              <>
                {/* Arama Sonuçları Bilgisi */}
                {searchTerm && pagination && (
                  <div className="border-b border-slate-200/80 px-4 py-2.5 sm:px-5">
                    <p className="text-xs text-slate-500">
                      <span className="font-medium text-slate-700 tabular-nums">{pagination.total}</span> adet ürün bulundu
                      {searchTerm && (
                        <span>
                          {' '}
                          (arama: <span className="italic">&quot;{searchTerm}&quot;</span>)
                        </span>
                      )}
                      <span className="ml-2">
                        (Sayfa {pagination.page}/{pagination.totalPages})
                      </span>
                    </p>
                  </div>
                )}

                {/* Desktop Tablo Görünümü */}
                <div className="hidden overflow-x-auto lg:block">
                  <table className="w-full min-w-[700px]">
                    <thead className="bg-slate-50/60">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                          Ürün
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                          Koleksiyon
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                          İşlemler
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {products.map((product) => (
                        <tr key={product.productId} className="transition-colors hover:bg-slate-50/70">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                                {product.productImage ? (
                                  <img
                                    src={product.productImage}
                                    alt={product.name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center bg-slate-100" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-medium text-slate-900">{product.name}</div>
                                {(product.description && (
                                  <div className="mt-0.5 truncate text-xs text-slate-500">
                                    {product.description.length > 50
                                      ? `${product.description.substring(0, 50)}...`
                                      : product.description}
                                  </div>
                                )) || null}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-slate-900">{product.collection?.name || 'Koleksiyon Yok'}</div>
                            <div className="mt-0.5 text-xs text-slate-500">{product.collection?.code || '-'}</div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => openStockModal(product)}
                                disabled={isLoadingProductDetail}
                                className="inline-flex items-center justify-center rounded-lg bg-[#00365a] px-3 py-2 text-xs font-medium text-white transition hover:bg-[#004170] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {isLoadingProductDetail ? 'Yük...' : 'Yönet'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Tablet Kart Görünümü */}
                <div className="hidden divide-y divide-slate-100 md:block lg:hidden">
                  {products.map((product) => (
                    <div key={product.productId} className="p-4 sm:p-5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                            {product.productImage ? (
                              <img
                                src={product.productImage}
                                alt={product.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full bg-slate-100" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium text-slate-900">{product.name}</div>
                            {product.description ? (
                              <div className="mt-0.5 truncate text-xs text-slate-500">
                                {product.description.length > 50
                                  ? `${product.description.substring(0, 50)}...`
                                  : product.description}
                              </div>
                            ) : null}
                            <div className="mt-1 text-xs text-slate-500">
                              <span className="font-medium text-slate-700">{product.collection?.name || 'Koleksiyon Yok'}</span>
                              <span className="ml-1">({product.collection?.code || '-'})</span>
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => openStockModal(product)}
                          disabled={isLoadingProductDetail}
                          className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[#00365a] px-3 py-2 text-xs font-medium text-white transition hover:bg-[#004170] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isLoadingProductDetail ? 'Yük...' : 'Yönet'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Mobil Kart Görünümü */}
                <div className="divide-y divide-slate-100 md:hidden">
                  {products.map((product) => (
                    <div key={product.productId} className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                          {product.productImage ? (
                            <img
                              src={product.productImage}
                              alt={product.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full bg-slate-100" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-slate-900">{product.name}</div>
                          {product.description ? (
                            <div className="mt-0.5 truncate text-xs text-slate-500">
                              {product.description.length > 50
                                ? `${product.description.substring(0, 50)}...`
                                : product.description}
                            </div>
                          ) : null}
                          <div className="mt-1">
                            <span className="text-xs font-medium text-slate-700">{product.collection?.name || 'Koleksiyon Yok'}</span>
                            <span className="ml-2 text-xs text-slate-500">{product.collection?.code || '-'}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => openStockModal(product)}
                          disabled={isLoadingProductDetail}
                          className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[#00365a] px-3 py-2 text-xs font-medium text-white transition hover:bg-[#004170] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isLoadingProductDetail ? 'Yük' : 'Yönet'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {pagination && (
                  <Pagination
                    pagination={pagination}
                    onPageChange={handlePageChange}
                    searchTerm={searchTerm}
                  />
                )}
              </>
            ) : (
              <div className="px-6 py-16 text-center">
                <p className="text-sm font-medium text-slate-900">Ürün bulunamadı</p>
                <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-500">
                  {searchTerm && 'Arama kriterlerinize uygun ürün bulunamadı. '}
                  Lütfen farklı filtreler deneyin.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Gelişmiş Stok Ayarlama Modalı */}
        {isModalOpen && selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-lg">
              {/* Modal Header */}
              <div className="flex items-start justify-between gap-4 border-b border-slate-200/80 px-5 py-4">
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-slate-900">
                    Stok Yönetimi: {selectedProduct.name}
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Koleksiyon: {selectedProduct.collection?.name || 'Koleksiyon Yok'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeStockModal}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-[#00365a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto px-5 py-5">
                {/* Boyut Seçimi */}
                {selectedProduct.sizeOptions && selectedProduct.sizeOptions.length > 0 ? (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Boyut Seçeneği</h3>
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                      {selectedProduct.sizeOptions.map((option) => {
                        const stockQty = option.is_optional_height
                          ? option.stockAreaM2 || 0
                          : option.stockQuantity || 0;
                        const isLowStock = !option.is_optional_height && stockQty > 0 && stockQty <= 3;
                        const isOutOfStock = option.is_optional_height
                          ? (option.stockAreaM2 || 0) <= 0
                          : (option.stockQuantity || 0) <= 0;

                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => handleSizeOptionChange(option)}
                            className={`rounded-lg border p-3 text-left transition-colors ${
                              selectedSizeOption?.id === option.id
                                ? 'border-[#00365a] bg-[#00365a]/[0.06]'
                                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                            }`}
                          >
                            <div className="text-sm font-medium tabular-nums text-slate-900">
                              {option.width} × {option.is_optional_height ? 'Özel' : option.height}
                            </div>
                            <div className="mt-0.5 text-xs text-slate-500">cm</div>
                            <div className="mt-2">
                              <span
                                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                                  option.is_optional_height
                                    ? 'border-sky-200 bg-sky-50 text-sky-700'
                                    : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                }`}
                              >
                                {option.is_optional_height ? 'Ops.' : 'Hazır'}
                              </span>
                            </div>
                            <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50/60 px-2 py-1.5">
                              <div className="text-xs text-slate-500">Stok</div>
                              <div
                                className={`text-xs tabular-nums ${
                                  isOutOfStock
                                    ? 'font-medium text-rose-700'
                                    : isLowStock
                                      ? 'font-medium text-amber-700'
                                      : 'font-medium text-slate-900'
                                }`}
                              >
                                {option.is_optional_height
                                  ? `${(option.stockAreaM2 || 0).toFixed(1)} m²`
                                  : `${option.stockQuantity || 0} adet`}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                        Genişlik (cm)
                      </label>
                      <input
                        type="number"
                        value={stockForm.width}
                        onChange={(e) => setStockForm(prev => ({ ...prev, width: e.target.value === '' ? 0 : Number(e.target.value) }))}
                        className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                        placeholder="Genişlik"
                        min="1"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                        Boy (cm)
                      </label>
                      <input
                        type="number"
                        value={stockForm.height}
                        onChange={(e) => setStockForm(prev => ({ ...prev, height: e.target.value === '' ? 0 : Number(e.target.value) }))}
                        className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                        placeholder="Boy"
                        min="1"
                      />
                    </div>
                  </div>
                )}

                {/* Mod seçimi - Admin için seçim, Editör için bilgi */}
                {isAdmin ? (
                  <div className="mt-5 border-t border-slate-200/80 pt-5">
                    <h3 className="text-sm font-semibold text-slate-900">İşlem Modu</h3>
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setStockForm(prev => ({ ...prev, updateMode: 'add' }))}
                        className={`rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                          stockForm.updateMode === 'add'
                            ? 'border-[#00365a] bg-[#00365a]/[0.06] text-[#00365a]'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        Stok Ekleme
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (isAdmin) {
                            setStockForm(prev => ({ ...prev, updateMode: 'set' }));
                          }
                        }}
                        className={`rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                          stockForm.updateMode === 'set'
                            ? 'border-[#00365a] bg-[#00365a]/[0.06] text-[#00365a]'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                        } ${isAdmin ? '' : 'cursor-not-allowed opacity-50'}`}
                      >
                        Stok Güncelleme
                      </button>
                    </div>
                  </div>
                ) : (
                  <></>
                )}

                {/* Stok Ayarlama Formu - Ürün Tipine Göre */}
                {selectedProduct.sizeOptions && selectedProduct.sizeOptions.length > 0 && (
                  (() => {
                    const isOptionalHeight = selectedSizeOption?.is_optional_height === true;

                    return (
                      <div className="mt-5 border-t border-slate-200/80 pt-5">
                        <h3 className="text-sm font-semibold text-slate-900">
                          {stockForm.updateMode === 'add'
                            ? (isOptionalHeight ? 'Eklenecek Stok (m²)' : 'Eklenecek Stok (Adet)')
                            : (isOptionalHeight ? 'Yeni Stok Değeri (m²)' : 'Yeni Stok Değeri (Adet)')}
                        </h3>
                        {isOptionalHeight ? (
                          <div className="mt-3 space-y-4">
                            <div>
                              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                                {selectedSizeOption?.width} cm en için stok (m²):
                              </label>
                              <p className="mb-2 text-xs text-slate-500">
                                Aynı endeki hazır ebatlar ve özel kesimler bu ortak havuzu kullanır.
                              </p>
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                value={inputValues.areaM2}
                                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                onChange={(e) => {
                                  const areaM2Value = e.target.value;
                                  const areaM2 = areaM2Value === '' ? 0 : Math.max(0, Number(areaM2Value));
                                  setInputValues(prev => ({ ...prev, areaM2: areaM2Value }));
                                  setStockForm(prev => ({
                                    ...prev,
                                    areaM2: areaM2,
                                    quantity: 0
                                  }));
                                }}
                                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                                placeholder="Manuel m² girişi"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="mt-3 space-y-4">
                            <div>
                              <input
                                type="number"
                                min="0"
                                value={inputValues.quantity}
                                onChange={(e) => {
                                  const quantityValue = e.target.value;
                                  const quantity = quantityValue === '' ? 0 : Math.max(0, Number(quantityValue));
                                  setInputValues(prev => ({ ...prev, quantity: quantityValue }));
                                  setStockForm(prev => ({
                                    ...prev,
                                    quantity: quantity,
                                    areaM2: 0,
                                    areaM2ForFixed: 0
                                  }));
                                }}
                                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                                placeholder="Eklenecek stok miktarı"
                              />
                            </div>

                            <div>
                              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                                Eklenecek Stok (m²) - Adet olarak hesaplanır:
                              </label>
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                value={inputValues.areaM2ForFixed}
                                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                onChange={(e) => {
                                  const areaM2Value = e.target.value;
                                  const areaM2 = areaM2Value === '' ? 0 : Math.max(0, Number(areaM2Value));
                                  const calculatedQuantity = calculateQuantityFromArea(areaM2, selectedSizeOption?.pieceAreaM2 || 0);
                                  setInputValues(prev => ({ ...prev, areaM2ForFixed: areaM2Value }));
                                  setStockForm(prev => ({
                                    ...prev,
                                    areaM2ForFixed: areaM2,
                                    quantity: calculatedQuantity,
                                    areaM2: 0
                                  }));
                                }}
                                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                                placeholder="Eklenecek stok m² miktarı"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()
                )}

                {/* Manuel boyut için miktar */}
                {(!selectedProduct.sizeOptions || selectedProduct.sizeOptions.length === 0) && (
                  <div className="mt-5 border-t border-slate-200/80 pt-5">
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                      {stockForm.updateMode === 'add' ? 'Eklenecek Stok (Adet):' : 'Yeni Stok Değeri (Adet):'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={inputValues.quantity}
                      onWheel={(e) => (e.target as HTMLInputElement).blur()}
                      onChange={(e) => {
                        const quantityValue = e.target.value;
                        const quantity = quantityValue === '' ? 0 : Math.max(0, Number(quantityValue));
                        setInputValues(prev => ({ ...prev, quantity: quantityValue }));
                        setStockForm(prev => ({
                          ...prev,
                          quantity: quantity,
                          areaM2: 0
                        }));
                      }}
                      className="mt-1.5 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                      placeholder={stockForm.updateMode === 'add' ? 'Eklenecek stok miktarı' : 'Yeni stok değeri'}
                    />
                  </div>
                )}

                {/* Seçilen boyut özeti */}
                {selectedSizeOption && (
                  <div className="mt-5 border-t border-slate-200/80 pt-5">
                    <h3 className="text-sm font-semibold text-slate-900">İşlem Özeti</h3>
                    <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-xs text-slate-500">Seçilen boyut</dt>
                        <dd className="mt-0.5 font-medium tabular-nums text-slate-900">
                          {selectedSizeOption.is_optional_height ? `${stockForm.width} cm × özel boy` : `${stockForm.width}x${stockForm.height} cm`}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">Ürün tipi</dt>
                        <dd className="mt-0.5 text-slate-700">
                          {selectedSizeOption.is_optional_height ? 'Opsiyonel Boy' : 'Hazır Kesim'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">Mevcut stok</dt>
                        <dd className="mt-0.5 font-medium tabular-nums text-slate-900">
                          {selectedSizeOption.is_optional_height
                            ? `${(selectedSizeOption.stockAreaM2 || 0).toFixed(1)} m²`
                            : `${selectedSizeOption.stockQuantity || 0} adet`}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">
                          {stockForm.updateMode === 'add' ? 'Eklenecek' : 'Yeni değer'}
                        </dt>
                        <dd className="mt-0.5 font-medium tabular-nums text-slate-900">
                          {selectedSizeOption.is_optional_height
                            ? `${stockForm.areaM2 || 0} m² (${stockForm.width}x${stockForm.height} cm)`
                            : `${stockForm.quantity} adet`}
                        </dd>
                      </div>
                      {!selectedSizeOption.is_optional_height && stockForm.areaM2ForFixed && stockForm.areaM2ForFixed > 0 && (
                        <div className="sm:col-span-2">
                          <dt className="text-xs text-slate-500">Hesaplanan</dt>
                          <dd className="mt-0.5 text-sm text-slate-700">
                            <span className="font-medium tabular-nums text-slate-900">{stockForm.areaM2ForFixed} m²</span>
                            {' = '}
                            <span className="font-medium tabular-nums text-slate-900">{stockForm.quantity} adet</span>
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-2 border-t border-slate-200/80 bg-slate-50/60 px-5 py-3.5">
                <button
                  type="button"
                  onClick={closeStockModal}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={updateStock}
                  disabled={
                    isUpdatingStock ||
                    stockForm.width <= 0 ||
                    (!selectedSizeOption?.is_optional_height && stockForm.height <= 0) ||
                    (selectedProduct.sizeOptions && selectedProduct.sizeOptions.length > 0 ?
                      (selectedSizeOption?.is_optional_height ?
                        (stockForm.areaM2 || 0) < 0 :
                        stockForm.quantity < 0
                      ) :
                      stockForm.quantity < 0
                    )
                  }
                  className="inline-flex items-center justify-center rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004170] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isUpdatingStock
                    ? 'Güncelleniyor...'
                    : stockForm.updateMode === 'add'
                      ? 'Stok Ekle'
                      : 'Stok Güncelle'}
                </button>
              </div>
            </div>
          </div>
        )}
        
      </div>
    </div>
  );
}
