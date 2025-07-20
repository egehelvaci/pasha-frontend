'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useToken } from '@/app/hooks/useToken';

// API Base URL
const API_BASE_URL = "https://pasha-backend-production.up.railway.app";

// Sayfalama Komponenti
const Pagination = ({ pagination, onPageChange, searchTerm = '' }: {
  pagination: any;
  onPageChange: (page: number, search?: string) => void;
  searchTerm?: string;
}) => {
  if (!pagination) return null;

  return (
    <div style={{ 
      marginTop: '20px', 
      textAlign: 'center',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '15px'
    }}>
      <button 
        disabled={pagination.page <= 1}
        onClick={() => onPageChange(pagination.page - 1, searchTerm)}
        style={{
          padding: '8px 16px',
          border: '1px solid #ddd',
          borderRadius: '4px',
          cursor: pagination.page <= 1 ? 'not-allowed' : 'pointer',
          opacity: pagination.page <= 1 ? 0.5 : 1,
          backgroundColor: pagination.page <= 1 ? '#f5f5f5' : '#fff'
        }}
      >
        ← Önceki
      </button>
      
      <span style={{ 
        fontSize: '14px',
        color: '#666',
        minWidth: '200px'
      }}>
        Sayfa {pagination.page} / {pagination.totalPages} 
        (Toplam {pagination.total} ürün)
      </span>
      
      <button 
        disabled={!pagination.hasMore}
        onClick={() => onPageChange(pagination.page + 1, searchTerm)}
        style={{
          padding: '8px 16px',
          border: '1px solid #ddd',
          borderRadius: '4px',
          cursor: !pagination.hasMore ? 'not-allowed' : 'pointer',
          opacity: !pagination.hasMore ? 0.5 : 1,
          backgroundColor: !pagination.hasMore ? '#f5f5f5' : '#fff'
        }}
      >
        Sonraki →
      </button>
    </div>
  );
};

// Loading Spinner Komponenti
const LoadingSpinner = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '40px',
    fontSize: '16px',
    color: '#666'
  }}>
    <div className="w-12 h-12 border-4 border-blue-900 border-t-transparent rounded-full animate-spin"></div>
    <div style={{ marginLeft: '15px' }}>Ürünler yükleniyor...</div>
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
  updateMode?: string;
  areaM2ForFixed?: number; // Hazır kesim için m² girişi
}

interface StockUpdateResponse {
  success: boolean;
  data: Product;
  message?: string;
}

export default function StokPage() {
  const { user, isLoading, isAdmin } = useAuth();
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
    updateMode: 'quantity',
    areaM2ForFixed: 0
  });
  const [isUpdatingStock, setIsUpdatingStock] = useState(false);
  const [isLoadingProductDetail, setIsLoadingProductDetail] = useState(false);
  
  // Debounce timer için ref
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

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
  }, [search]);

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
      const productType = getProductType(productToUse.sizeOptions);
      
      setSelectedSizeOption(firstOption);
      
      if (productType === 'optional_height') {
        setStockForm({
          width: firstOption.width,
          height: firstOption.height,
          quantity: 0,
          areaM2: 0,
          updateMode: 'area'
        });
      } else {
        setStockForm({
          width: firstOption.width,
          height: firstOption.height,
          quantity: 0,
          areaM2: 0,
          areaM2ForFixed: 0,
          updateMode: 'quantity'
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
          updateMode: 'quantity'
        });
    } else {
      setSelectedSizeOption(null);
              setStockForm({
          width: 100,
          height: 100,
          quantity: 0,
          areaM2: 0,
          areaM2ForFixed: 0,
          updateMode: 'quantity'
        });
    }
    
    setIsModalOpen(true);
  };

  const closeStockModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
    setSelectedSizeOption(null);
    setStockForm({ width: 0, height: 0, quantity: 0, areaM2: 0, updateMode: 'quantity', areaM2ForFixed: 0 });
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
    
    const productType = getProductType(selectedProduct?.sizeOptions || []);
    
    if (productType === 'optional_height') {
      // Opsiyonel yükseklik: m² bazlı
      setStockForm(prev => ({
        ...prev,
        width: sizeOption.width,
        height: sizeOption.height,
        quantity: 0,
        areaM2: 0,
        updateMode: 'area'
      }));
          } else {
        // Hazır kesim: adet bazlı
        setStockForm(prev => ({
          ...prev,
          width: sizeOption.width,
          height: sizeOption.height,
          quantity: 0,
          areaM2: 0,
          areaM2ForFixed: 0,
          updateMode: 'quantity'
        }));
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

    const productType = getProductType(selectedProduct.sizeOptions || []);
    let apiUrl: string;
    let requestBody: any;

    if (productType === 'optional_height') {
      // Opsiyonel yükseklik: m² bazlı stok ekleme
      apiUrl = `${API_BASE_URL}/api/products/${selectedProduct.productId}/stock-area`;
      
      if (stockForm.width <= 0 || stockForm.height <= 0 || (stockForm.areaM2 || 0) < 0) {
        alert('Lütfen geçerli boyut ve m² değerleri girin!');
        return;
      }

      requestBody = {
        width: stockForm.width,
        height: stockForm.height,
        areaM2: stockForm.areaM2
      };
    } else {
      // Hazır kesim: adet bazlı stok ekleme
      apiUrl = `${API_BASE_URL}/api/products/${selectedProduct.productId}/stock-hybrid`;
      
      if (stockForm.width <= 0 || stockForm.height <= 0 || stockForm.quantity < 0) {
        alert('Lütfen geçerli boyut ve adet değerleri girin!');
        return;
      }

      requestBody = {
        width: stockForm.width,
        height: stockForm.height,
        quantity: stockForm.quantity,
        updateMode: 'quantity'
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
            
            setStockForm(prev => ({
              ...prev,
              quantity: 0,
              areaM2: 0,
              areaM2ForFixed: 0
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
          
          {/* Arama ve Filtreler */}
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex flex-wrap gap-4">
              <div className="w-full md:w-auto">
                <label htmlFor="search-input" className="block text-sm font-medium text-gray-700 mb-1">
                  Ara
                </label>
                <div className="relative">
                  <input
                    id="search-input"
                    type="text"
                    className="w-full md:w-80 lg:w-96 border border-gray-300 rounded-md pl-9 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-900 text-sm"
                    placeholder="Ürün adı, açıklama veya ID ara..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    autoComplete="off"
                    spellCheck="false"
                  />
                  <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
              </div>
              
              {search && (
                <div className="w-full md:w-auto flex items-end">
                  <button
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50"
                    onClick={() => setSearch("")}
                  >
                    Filtreleri Temizle
                  </button>
                </div>
              )}
            </div>
          </div>
          
          <div className="p-6">
            {isLoadingProducts ? (
              <LoadingSpinner />
            ) : products.length > 0 ? (
              <>
                {/* Arama Sonuçları Bilgisi */}
                {searchTerm && pagination && (
                  <div className="mb-4 p-3 border-b text-sm text-gray-600 bg-blue-50 rounded-lg">
                    <span className="font-medium">{pagination.total}</span> adet ürün bulundu 
                    {searchTerm && <span> (arama: <span className="italic">"{searchTerm}"</span>)</span>}
                    <span className="ml-2 text-xs text-gray-500">
                      (Sayfa {pagination.page}/{pagination.totalPages})
                    </span>
                  </div>
                )}
                
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
                                  <span>Yükleniyor...</span>
                                </>
                              ) : (
                                <>
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                  </svg>
                                  <span>Stok Ekle</span>
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobil Kart Görünümü */}
                <div className="md:hidden space-y-4">
                  {products.map((product) => (
                    <div key={product.productId} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                      <div className="flex items-start space-x-4">
                        <div className="h-16 w-16 rounded-lg bg-gray-200 flex-shrink-0 overflow-hidden">
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
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">{product.name}</div>
                          <div className="text-sm text-gray-500 truncate">{product.description}</div>
                          <div className="mt-1">
                            <span className="text-xs font-medium text-gray-900">{product.collection?.name || 'Koleksiyon Yok'}</span>
                            <span className="text-xs text-gray-500 ml-2">{product.collection?.code || '-'}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => openStockModal(product)}
                          disabled={isLoadingProductDetail}
                          className="inline-flex items-center gap-1 px-3 py-2 bg-[#00365a] hover:bg-[#004170] text-white rounded-md text-sm font-medium transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isLoadingProductDetail ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
                              <span>...</span>
                            </>
                          ) : (
                            <>
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                              <span>Stok</span>
                            </>
                          )}
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
              <div className="py-16 text-center">
                <svg 
                  className="mx-auto h-12 w-12 text-gray-400" 
                  xmlns="http://www.w3.org/2000/svg" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                  />
                </svg>
                <p className="mt-4 text-lg font-medium text-gray-600">Ürün bulunamadı</p>
                <p className="mt-2 text-gray-500">
                  {searchTerm && 'Arama kriterlerinize uygun ürün bulunamadı. '}
                  Lütfen farklı filtreler deneyin.
                </p>
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
                      {selectedProduct.sizeOptions.map((option) => {
                        const productType = getProductType(selectedProduct.sizeOptions || []);
                        const isOptionalHeight = option.is_optional_height;
                        
                        return (
                          <div key={option.id} className="text-sm bg-white p-3 rounded border">
                            <div className="font-medium text-gray-900">{option.width}x{option.height} cm</div>
                            <div className="text-xs text-gray-500 mb-1">
                              {isOptionalHeight ? 'Opsiyonel Yükseklik' : 'Hazır Kesim'}
                            </div>
                            {isOptionalHeight ? (
                              <div className={`${(option.stockAreaM2 || 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {(option.stockAreaM2 || 0).toFixed(1)} m²
                              </div>
                            ) : (
                              <div className={`${(option.stockQuantity || 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {option.stockQuantity || 0} adet
                              </div>
                            )}
                          </div>
                        );
                      })}
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
                              {option.is_optional_height ? 'Opsiyonel Yükseklik' : 'Hazır Kesim'}
                            </div>
                            <div className="text-xs text-gray-500 mt-1 text-center">
                              Mevcut: {option.is_optional_height 
                                ? `${(option.stockAreaM2 || 0).toFixed(1)} m²`
                                : `${option.stockQuantity || 0} adet`
                              }
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

                  {/* Stok Ekleme Formu - Ürün Tipine Göre */}
                  {selectedProduct.sizeOptions && selectedProduct.sizeOptions.length > 0 && (
                    (() => {
                      const productType = getProductType(selectedProduct.sizeOptions);
                      const isOptionalHeight = productType === 'optional_height';
                      
                      return (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {isOptionalHeight ? 'Eklenecek Stok (m²):' : 'Eklenecek Stok (Adet):'}
                          </label>
                          {isOptionalHeight ? (
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              value={stockForm.areaM2 === 0 ? 0 : stockForm.areaM2 || ''}
                              onWheel={(e) => (e.target as HTMLInputElement).blur()}
                              onChange={(e) => setStockForm(prev => ({ 
                                ...prev, 
                                areaM2: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)),
                                quantity: 0
                              }))}
                              className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Eklenecek m² miktarı"
                            />
                          ) : (
                            <div className="space-y-3">
                              {/* Adet girişi */}
                              <div>
                                <input
                                  type="number"
                                  min="0"
                                  value={stockForm.quantity === 0 ? 0 : stockForm.quantity || ''}
                                  onChange={(e) => setStockForm(prev => ({ 
                                    ...prev, 
                                    quantity: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)),
                                    areaM2: 0,
                                    areaM2ForFixed: 0
                                  }))}
                                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                  className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder="Eklenecek adet miktarı"
                                />
                              </div>
                              
                              {/* m² girişi */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Eklenecek Stok (m²) - Adet olarak hesaplanır:
                                </label>
                                <input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  value={stockForm.areaM2ForFixed === 0 ? 0 : stockForm.areaM2ForFixed || ''}
                                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                  onChange={(e) => {
                                    const areaM2 = e.target.value === '' ? 0 : Math.max(0, Number(e.target.value));
                                    const calculatedQuantity = calculateQuantityFromArea(areaM2, selectedSizeOption?.pieceAreaM2 || 0);
                                    setStockForm(prev => ({ 
                                      ...prev, 
                                      areaM2ForFixed: areaM2,
                                      quantity: calculatedQuantity,
                                      areaM2: 0
                                    }));
                                  }}
                                  className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder="Eklenecek m² miktarı"
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Eklenecek Stok (Adet):
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={stockForm.quantity === 0 ? 0 : stockForm.quantity || ''}
                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                        onChange={(e) => setStockForm(prev => ({ 
                          ...prev, 
                          quantity: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)),
                          areaM2: 0
                        }))}
                        className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Eklenecek adet miktarı"
                      />
                    </div>
                  )}

                  {/* Seçilen boyut özeti */}
                  {selectedSizeOption && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">Seçilen boyut:</span> 
                          <span className="ml-1 text-gray-900">{stockForm.width}x{stockForm.height} cm</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Ürün tipi:</span> 
                          <span className="ml-1 text-gray-900">
                            {selectedSizeOption.is_optional_height ? 'Opsiyonel Yükseklik' : 'Hazır Kesim'}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Mevcut stok:</span> 
                          <span className="ml-1 text-gray-900">
                            {selectedSizeOption.is_optional_height 
                              ? `${(selectedSizeOption.stockAreaM2 || 0).toFixed(1)} m²`
                              : `${selectedSizeOption.stockQuantity || 0} adet`
                            }
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Eklenecek:</span> 
                          <span className="ml-1 text-gray-900">
                            {selectedSizeOption.is_optional_height 
                              ? `${stockForm.areaM2 || 0} m²`
                              : `${stockForm.quantity} adet`
                            }
                          </span>
                        </div>
                        {!selectedSizeOption.is_optional_height && stockForm.areaM2ForFixed && stockForm.areaM2ForFixed > 0 && (
                          <div>
                            <span className="font-medium text-gray-700">Hesaplanan:</span> 
                            <span className="ml-1 text-blue-600">
                              {stockForm.areaM2ForFixed} m² = {stockForm.quantity} adet
                            </span>
                          </div>
                        )}
                        <div className="pt-1 border-t border-blue-200">
                          <span className="font-medium text-blue-700">Yeni toplam:</span> 
                          <span className="ml-1 text-blue-900 font-semibold">
                            {selectedSizeOption.is_optional_height 
                              ? `${((selectedSizeOption.stockAreaM2 || 0) + (stockForm.areaM2 || 0)).toFixed(1)} m²`
                              : `${(selectedSizeOption.stockQuantity || 0) + stockForm.quantity} adet`
                            }
                          </span>
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
                    disabled={
                      isUpdatingStock || 
                      stockForm.width <= 0 || 
                      stockForm.height <= 0 ||
                      (selectedProduct.sizeOptions && selectedProduct.sizeOptions.length > 0 ? 
                        (getProductType(selectedProduct.sizeOptions) === 'optional_height' ? 
                          (stockForm.areaM2 || 0) < 0 : 
                          stockForm.quantity < 0
                        ) : 
                        stockForm.quantity < 0
                      )
                    }
                    className="w-full sm:w-auto px-6 py-3 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
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