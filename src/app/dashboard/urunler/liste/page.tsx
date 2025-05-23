"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { FaTrash } from "react-icons/fa";
import { useAuth } from '@/app/context/AuthContext';

// API Base URL
const API_BASE_URL = "https://pasha-backend-production.up.railway.app";

export default function ProductList() {
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("id_asc");
  const [collections, setCollections] = useState<{collectionId: string, name: string}[]>([]);
  const [selectedCollection, setSelectedCollection] = useState("");
  const productsFetchedRef = useRef(false);
  const collectionsFetchedRef = useRef(false);
  const router = useRouter();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoverProductId, setHoverProductId] = useState<string | null>(null);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [selectedProductForUpdate, setSelectedProductForUpdate] = useState<any>(null);
  const { isAdmin } = useAuth();

  useEffect(() => {
    if (!productsFetchedRef.current) {
      productsFetchedRef.current = true;
      fetchProducts();
    }
    
    if (!collectionsFetchedRef.current) {
      collectionsFetchedRef.current = true;
      fetchCollections();
    }
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch("https://pasha-backend-production.up.railway.app/api/products", {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setProducts(data.data);
        console.log("Ürünler:", data.data);
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.error("Ürünler yüklenirken hata oluştu:", error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCollections = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch("https://pasha-backend-production.up.railway.app/api/collections/", {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setCollections(data.data.map((col: any) => ({ 
          collectionId: col.collectionId, 
          name: col.name 
        })));
      } else {
        setCollections([]);
      }
    } catch (error) {
      console.error("Koleksiyonlar yüklenirken hata oluştu:", error);
      setCollections([]);
    }
  };

  const filteredProducts = products.filter(product =>
    (!selectedCollection || product.collectionId === selectedCollection) &&
    (product.name.toLowerCase().includes(search.toLowerCase()) ||
     product.description.toLowerCase().includes(search.toLowerCase()))
  );

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case "id_asc":
        return a.productId.localeCompare(b.productId);
      case "id_desc":
        return b.productId.localeCompare(a.productId);
      case "name_asc":
        return a.name.localeCompare(b.name);
      case "name_desc":
        return b.name.localeCompare(a.name);
      case "date_asc":
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "date_desc":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      default:
        return 0;
    }
  });

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    setDeleteError("");
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`https://pasha-backend-production.up.railway.app/api/products/${deleteId}`, {
        method: "DELETE",
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error("Ürün silinemedi");
      setProducts(products.filter(p => p.productId !== deleteId));
      setConfirmOpen(false);
      setDeleteId(null);
    } catch (err: any) {
      setDeleteError(err.message || "Bir hata oluştu");
    } finally {
      setDeleteLoading(false);
    }
  };

  function AddProductModal({ open, onClose, onSuccess, collections }: { open: boolean, onClose: () => void, onSuccess: (newProduct: any) => void, collections: {collectionId: string, name: string}[] }) {
    const [form, setForm] = useState({
      name: "",
      description: "",
      collectionId: "",
      rule_id: "",
      productImage: null as File | null
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value, type } = e.target;
      if (type === "file") {
        setForm({ ...form, productImage: (e.target as HTMLInputElement).files?.[0] || null });
      } else {
        setForm({ ...form, [name]: value });
      }
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      // Validasyon
      if (!form.name.trim()) {
        setError("Ürün adı zorunludur");
        return;
      }
      if (!form.description.trim()) {
        setError("Ürün açıklaması zorunludur");
        return;
      }
      if (!form.collectionId) {
        setError("Koleksiyon seçimi zorunludur");
        return;
      }
      
      setLoading(true);
      setError("");
      
      try {
        const token = localStorage.getItem('token');
        const fd = new FormData();
        fd.append('name', form.name);
        fd.append('description', form.description);
        fd.append('collectionId', form.collectionId);
        
        if (form.rule_id) {
          fd.append('rule_id', form.rule_id);
        }
        
        if (form.productImage) {
          fd.append('productImage', form.productImage);
        }
        
        const res = await fetch("https://pasha-backend-production.up.railway.app/api/products", {
          method: "POST",
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: fd
        });
        
        const data = await res.json();
        
        if (!res.ok || !data.success) {
          throw new Error(data.message || "Ürün eklenemedi");
        }
        
        onSuccess(data.data);
        onClose();
        
        // Formu sıfırla
        setForm({
          name: "",
          description: "",
          collectionId: "",
          rule_id: "",
          productImage: null
        });
      } catch (err: any) {
        setError(err.message || "Bir hata oluştu");
      } finally {
        setLoading(false);
      }
    };

    if (!open) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-lg relative overflow-y-auto max-h-[90vh]">
          <button 
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-xl" 
            onClick={onClose}
          >
            &times;
          </button>
          
          <h2 className="text-xl font-bold mb-6 text-black">Yeni Ürün Ekle</h2>
          
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ürün Adı <span className="text-red-500">*</span>
              </label>
              <input 
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-900"
                placeholder="Ürün adını girin"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ürün Açıklaması <span className="text-red-500">*</span>
              </label>
              <textarea 
                name="description"
                value={form.description}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-900 min-h-[100px]"
                placeholder="Ürün açıklamasını girin"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Koleksiyon <span className="text-red-500">*</span>
              </label>
              <select 
                name="collectionId"
                value={form.collectionId}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-900"
              >
                <option value="">Koleksiyon Seçin</option>
              {collections.map(col => (
                  <option key={col.collectionId} value={col.collectionId}>
                    {col.name}
                  </option>
              ))}
            </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kural ID
              </label>
              <input 
                type="text"
                name="rule_id"
                value={form.rule_id}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-900"
                placeholder="Opsiyonel"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ürün Görseli
              </label>
              <input 
                type="file"
                name="productImage"
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-900"
                accept="image/*"
              />
            </div>
            
            {error && (
              <div className="text-red-500 text-sm mt-1">{error}</div>
            )}
            
            <div className="flex justify-end mt-4">
              <button
                type="button"
                onClick={onClose}
                className="mr-2 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-900 text-white rounded-md hover:bg-blue-800 disabled:opacity-70"
              >
              {loading ? "Ekleniyor..." : "Ekle"}
            </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  function ProductDetailModal({ open, onClose, productId }: { open: boolean, onClose: () => void, productId: string | null }) {
    const [product, setProduct] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedSize, setSelectedSize] = useState<any>(null);
    const [selectedCutType, setSelectedCutType] = useState<any>(null);
    const [selectedHasFringe, setSelectedHasFringe] = useState<boolean | null>(null);
    const [totalPrice, setTotalPrice] = useState<number>(0);
    const [customHeight, setCustomHeight] = useState<number>(100);  // Varsayılan 100 cm yükseklik
    const [quantity, setQuantity] = useState<number>(1);
    const [notes, setNotes] = useState<string>("");
    const [addToCartLoading, setAddToCartLoading] = useState(false);
    const [addToCartSuccess, setAddToCartSuccess] = useState(false);
    const [addToCartError, setAddToCartError] = useState("");
    
    const addToCartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    
    // Sepete ekleme başarılı mesajını 3 saniye sonra kaldır
    useEffect(() => {
      if (addToCartSuccess) {
        addToCartTimeoutRef.current = setTimeout(() => {
          setAddToCartSuccess(false);
        }, 3000);
      }
      
      return () => {
        if (addToCartTimeoutRef.current) {
          clearTimeout(addToCartTimeoutRef.current);
        }
      };
    }, [addToCartSuccess]);

    useEffect(() => {
      if (open && productId) {
        fetchProductDetail(productId);
      } else {
        setProduct(null);
        setLoading(false);
      }
    }, [open, productId]);

    // Ürün detayları değiştiğinde default seçimleri ayarla
    useEffect(() => {
      if (product) {
        // Default olarak ilk boyut seçeneğini seç
        if (product.sizeOptions && product.sizeOptions.length > 0) {
          setSelectedSize(product.sizeOptions[0]);
        }
        
        // Default olarak ilk kesim türünü seç
        if (product.cutTypes && product.cutTypes.length > 0) {
          setSelectedCutType(product.cutTypes[0]);
        }
        
        // Default saçak değerini ayarla
        setSelectedHasFringe(product.hasFringe);
      }
    }, [product]);
    
    // Seçimler değiştiğinde fiyat hesaplama
    useEffect(() => {
      if (product && selectedSize) {
        // Metrekare hesapla
        let squareMeters;
        if (selectedSize.is_optional_height) {
          // İsteğe bağlı yükseklik için kullanıcının girdiği değeri kullan
          squareMeters = (selectedSize.width * customHeight) / 10000; // cm² -> m²
        } else {
          // Sabit yükseklik için metrekare hesapla
          squareMeters = (selectedSize.width * selectedSize.height) / 10000; // cm² -> m²
        }
        
        // Birim fiyat ve toplam fiyat hesapla
        const unitPrice = product.pricing?.price || 0;
        const calculatedPrice = squareMeters * unitPrice;
        
        setTotalPrice(calculatedPrice);
      }
    }, [product, selectedSize, customHeight]);

    const fetchProductDetail = async (id: string) => {
      setLoading(true);
      setError("");
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`https://pasha-backend-production.up.railway.app/api/products/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!res.ok) throw new Error("Ürün bulunamadı");
        const data = await res.json();
        setProduct(data.data || data);
      } catch (err: any) {
        setError(err.message || "Bir hata oluştu");
      } finally {
        setLoading(false);
      }
    };

    // Boyut değişimi
    const handleSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const sizeId = parseInt(e.target.value);
      const size = product.sizeOptions.find((s: any) => s.id === sizeId);
      setSelectedSize(size);
      
      // İsteğe bağlı yükseklik seçilince varsayılan değeri 100cm olarak ayarla
      if (size && size.is_optional_height) {
        setCustomHeight(100);
      }
    };
    
    // Kesim türü değişimi
    const handleCutTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const cutTypeId = parseInt(e.target.value);
      const cutType = product.cutTypes.find((c: any) => c.id === cutTypeId);
      setSelectedCutType(cutType);
    };
    
    // Saçak değişimi
    const handleFringeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedHasFringe(e.target.value === "true");
    };

    const addToCart = async () => {
      // Validasyon kontrolleri
      if (!product || !selectedSize || !selectedCutType) {
        setAddToCartError("Ürün detayları eksik");
        return;
      }
      
      if (quantity <= 0) {
        setAddToCartError("Lütfen geçerli bir miktar girin");
        return;
      }
      
      // Kesim türünü API isteğine uygun formata dönüştür
      let cutTypeValue = "rectangle"; // Varsayılan
      if (selectedCutType.name === "oval") {
        cutTypeValue = "oval";
      } else if (selectedCutType.name === "daire") {
        cutTypeValue = "round";
      } else if (selectedCutType.name === "custom") {
        cutTypeValue = "custom";
      }
      
      setAddToCartLoading(true);
      setAddToCartError("");
      setAddToCartSuccess(false);
      
      try {
        const token = localStorage.getItem('token');
        
        // Yükseklik değerini belirle
        const heightValue = selectedSize.is_optional_height ? customHeight : selectedSize.height;
        
        const requestBody = {
          productId: product.productId,
          quantity: quantity,
          width: selectedSize.width,
          height: heightValue,
          hasFringe: selectedHasFringe === true,
          cutType: cutTypeValue,
          notes: notes.trim() || undefined // Boşsa undefined olacak, API'ye gönderilmeyecek
        };
        
        const res = await fetch(`${API_BASE_URL}/api/cart/add`, {
          method: "POST",
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });
        
        const data = await res.json();
        
        if (!res.ok || !data.success) {
          // Veritabanı bağlantı hatası için özel mesaj
          if (data.message && data.message.includes("too many clients")) {
            throw new Error("Sunucu şu anda yoğun. Lütfen daha sonra tekrar deneyin.");
          }
          throw new Error(data.message || "Ürün sepete eklenemedi");
        }
        
        // Başarılı
        setAddToCartSuccess(true);
        setQuantity(1); // Miktar sıfırla
        setNotes(""); // Notları temizle
      } catch (err: any) {
        setAddToCartError(err.message || "Sepete eklerken bir hata oluştu");
      } finally {
        setAddToCartLoading(false);
      }
    };

    if (!open) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-lg relative max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <button 
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-xl z-10" 
            onClick={onClose}
          >
            &times;
          </button>
          
          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center">
              <div className="w-12 h-12 border-4 border-blue-900 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-gray-600">Ürün detayları yükleniyor...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <div className="text-red-500">{error}</div>
            </div>
          ) : product ? (
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-black">{product.collection?.name} - {product.name}</h1>
                {isAdmin && (
                  <button 
                    className="bg-green-600 text-white rounded-full px-3 py-1 flex items-center gap-1 text-sm" 
                    title="Düzenle" 
                    onClick={() => {
                      setSelectedProductForUpdate(product);
                      setUpdateModalOpen(true);
                      onClose(); // Detay modalını kapat
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Düzenle
                  </button>
                )}
              </div>
              
              <div className="flex flex-col md:flex-row gap-8">
                <div className="w-full md:w-1/2">
                  <img 
                    src={product.productImage || "https://tebi.io/pashahome/products/ornek-urun.jpg"} 
                    alt={product.name} 
                    className="w-full rounded-lg shadow-md border border-gray-200 object-cover aspect-[250/390]" 
                  />
                </div>
                
                <div className="w-full md:w-1/2">
                  <div className="grid grid-cols-1 gap-5">
                    <div className="flex flex-col gap-2">
                      <span className="text-sm text-gray-500">Boyut Seçimi</span>
                      <select 
                        className="border rounded-md p-2 text-black"
                        value={selectedSize?.id}
                        onChange={handleSizeChange}
                      >
                        {product.sizeOptions?.map((size: any) => (
                          <option key={size.id} value={size.id}>
                            {size.width}x{size.is_optional_height ? 'İsteğe Bağlı' : size.height} cm 
                            (Stok: {size.stockQuantity})
                          </option>
                        ))}
                      </select>
                      
                      {selectedSize && selectedSize.is_optional_height && (
                        <div className="mt-2">
                          <label className="text-sm text-gray-500 block mb-1">Özel Yükseklik (cm)</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="10"
                              max="500"
                              value={customHeight}
                              onChange={(e) => setCustomHeight(Number(e.target.value))}
                              className="border rounded-md p-2 text-black w-24"
                            />
                            <span className="text-sm text-gray-500">cm</span>
                          </div>
                          <span className="text-xs text-gray-500 block mt-1">
                            {selectedSize.width}x{customHeight} cm olarak hesaplanacak
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <span className="text-sm text-gray-500">Kesim Türü</span>
                      <select 
                        className="border rounded-md p-2 text-black"
                        value={selectedCutType?.id}
                        onChange={handleCutTypeChange}
                      >
                        {product.cutTypes?.map((cutType: any) => (
                          <option key={cutType.id} value={cutType.id}>
                            {cutType.name.charAt(0).toUpperCase() + cutType.name.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {product.canHaveFringe && (
                      <div className="flex flex-col gap-2">
                        <span className="text-sm text-gray-500">Saçak</span>
                        <select 
                          className="border rounded-md p-2 text-black"
                          value={selectedHasFringe?.toString()}
                          onChange={handleFringeChange}
                        >
                          <option value="true">Saçaklı</option>
                          <option value="false">Saçaksız</option>
                        </select>
                      </div>
                    )}
                    
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-500">Açıklama</span>
                      <p className="text-black">{product.description}</p>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <span className="text-sm text-gray-500">Metrekare Fiyatı</span>
                      <span className="font-medium text-black">
                        {product.pricing?.price} {product.pricing?.currency}/m²
                      </span>
                    </div>
                    
                    <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-blue-900">Toplam Tutar</span>
                        <span className="text-lg font-bold text-blue-900">
                          {totalPrice.toFixed(2)} {product.pricing?.currency}
                        </span>
                      </div>
                      {selectedSize && (
                        <div className="text-xs mt-1 text-blue-700">
                          {selectedSize.width} cm genişlik × 
                          {selectedSize.is_optional_height 
                            ? ` ${customHeight} cm yükseklik (özel)` 
                            : ` ${selectedSize.height} cm yükseklik`} 
                          için hesaplandı
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-5">
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium text-gray-700">Miktar</label>
                          <div className="flex">
                            <button 
                              type="button"
                              className="w-8 h-8 border border-gray-300 flex items-center justify-center rounded-l-md text-gray-500 hover:bg-gray-50"
                              onClick={() => quantity > 1 && setQuantity(quantity - 1)}
                            >
                              -
                            </button>
                            <input 
                              type="number" 
                              min="1" 
                              value={quantity}
                              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-16 border-y border-gray-300 py-1 px-2 text-center text-black"
                            />
                            <button 
                              type="button"
                              className="w-8 h-8 border border-gray-300 flex items-center justify-center rounded-r-md text-gray-500 hover:bg-gray-50"
                              onClick={() => setQuantity(quantity + 1)}
                            >
                              +
                            </button>
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium text-gray-700">Özel Notlar (Opsiyonel)</label>
                          <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Özel kesim notları veya diğer istekleriniz..."
                            className="w-full border border-gray-300 rounded-md p-2 text-black text-sm"
                            rows={3}
                          />
                        </div>
                        
                        {addToCartError && (
                          <div className="p-3 bg-red-50 border border-red-100 rounded-md text-red-600 text-sm">
                            {addToCartError}
                          </div>
                        )}
                        
                        {addToCartSuccess && (
                          <div className="p-3 bg-green-50 border border-green-100 rounded-md text-green-600 text-sm">
                            Ürün başarıyla sepete eklendi!
                          </div>
                        )}
                        
                        <button
                          type="button"
                          className="mt-2 w-full py-3 bg-blue-900 text-white rounded-md font-semibold flex items-center justify-center disabled:opacity-70"
                          onClick={addToCart}
                          disabled={addToCartLoading}
                        >
                          {addToCartLoading ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              İşleniyor...
                            </>
                          ) : (
                            "Sepete Ekle"
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center">
              <div className="text-black">Ürün bulunamadı</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  function UpdateProductModal({ open, onClose, product, collections, onSuccess }: { open: boolean, onClose: () => void, product: any, collections: {collectionId: string, name: string}[], onSuccess: (updatedProduct: any) => void }) {
    const [form, setForm] = useState({
      name: "",
      description: "",
      collectionId: "",
      rule_id: "",
      productImage: null as File | null
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);

    useEffect(() => {
      if (product) {
        setForm({
          name: product.name || "",
          description: product.description || "",
          collectionId: product.collectionId || "",
          rule_id: product.rule_id?.toString() || "",
          productImage: null
        });
      }
    }, [product]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value, type } = e.target;
      if (type === "file") {
        setForm({ ...form, productImage: (e.target as HTMLInputElement).files?.[0] || null });
      } else {
        setForm({ ...form, [name]: value });
      }
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!product?.productId) {
        setError("Ürün ID'si bulunamadı");
        return;
      }
      
      setLoading(true);
      setError("");
      
      try {
        const token = localStorage.getItem('token');
        const fd = new FormData();
        
        // Sadece değişen alanları gönder
        if (form.name !== product.name) {
          fd.append('name', form.name);
        }
        
        if (form.description !== product.description) {
          fd.append('description', form.description);
        }
        
        if (form.collectionId !== product.collectionId) {
          fd.append('collectionId', form.collectionId);
        }
        
        if (form.rule_id !== (product.rule_id?.toString() || "")) {
          fd.append('rule_id', form.rule_id);
        }
        
        if (form.productImage) {
          fd.append('productImage', form.productImage);
        }
        
        const res = await fetch(`https://pasha-backend-production.up.railway.app/api/products/${product.productId}`, {
          method: "PUT",
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: fd
        });
        
        const data = await res.json();
        
        if (!res.ok || !data.success) {
          throw new Error(data.message || "Ürün güncellenemedi");
        }
        
        onSuccess(data.data);
        onClose();
      } catch (err: any) {
        setError(err.message || "Bir hata oluştu");
      } finally {
        setLoading(false);
      }
    };

    const handleDelete = async () => {
      if (!product?.productId) return;
      
      setDeleteLoading(true);
      
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`https://pasha-backend-production.up.railway.app/api/products/${product.productId}`, {
          method: "DELETE",
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!res.ok) throw new Error("Ürün silinemedi");
        
        onSuccess({ ...product, deleted: true });
        onClose();
      } catch (err: any) {
        setError(err.message || "Silme işlemi sırasında bir hata oluştu");
      } finally {
        setDeleteLoading(false);
        setShowDeleteConfirm(false);
      }
    };

    if (!open) return null;
    
    if (showDeleteConfirm) {
  return (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-lg relative">
            <h2 className="text-xl font-bold mb-4 text-black">Ürünü Sil</h2>
            <p className="text-gray-600 mb-6">
              <b>{product.name}</b> ürününü silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
            </p>
            
            <div className="flex justify-end gap-3">
              <button 
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleteLoading}
              >
                İptal
              </button>
              <button 
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                onClick={handleDelete}
                disabled={deleteLoading}
              >
                {deleteLoading ? "Siliniyor..." : "Evet, Sil"}
              </button>
            </div>
            
            {error && (
              <div className="mt-4 text-red-500 text-sm">{error}</div>
            )}
          </div>
        </div>
      );
    }
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-lg relative overflow-y-auto max-h-[90vh]">
          <button 
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-xl" 
            onClick={onClose}
          >
            &times;
          </button>
          
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-black">Ürünü Düzenle</h2>
            <button
              className="text-red-600 text-sm flex items-center gap-1 hover:text-red-800"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <FaTrash size={12} /> Sil
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ürün Adı
              </label>
              <input 
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-900"
                placeholder="Ürün adını girin"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ürün Açıklaması
              </label>
              <textarea 
                name="description"
                value={form.description}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-900 min-h-[100px]"
                placeholder="Ürün açıklamasını girin"
              />
      </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Koleksiyon
              </label>
              <select 
                name="collectionId"
                value={form.collectionId}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-900"
              >
                <option value="">Koleksiyon Seçin</option>
          {collections.map(col => (
                  <option key={col.collectionId} value={col.collectionId}>
                    {col.name}
                  </option>
          ))}
        </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kural ID
              </label>
          <input
            type="text"
                name="rule_id"
                value={form.rule_id}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-900"
                placeholder="Opsiyonel"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ürün Görseli
              </label>
              <input 
                type="file"
                name="productImage"
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-900"
                accept="image/*"
              />
              {product.productImage && (
                <div className="mt-2">
                  <p className="text-xs text-gray-500 mb-1">Mevcut görsel:</p>
                  <img 
                    src={product.productImage} 
                    alt={product.name} 
                    className="h-24 w-auto object-cover rounded-md border border-gray-200"
                  />
                </div>
              )}
            </div>
            
            {error && (
              <div className="text-red-500 text-sm mt-1">{error}</div>
            )}
            
            <div className="flex justify-end mt-4">
              <button
                type="button"
                onClick={onClose}
                className="mr-2 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-70"
              >
                {loading ? "Güncelleniyor..." : "Güncelle"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white min-h-screen">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-xl font-semibold text-gray-800">Ürün Listesi</h2>
          {isAdmin && (
            <button
              className="bg-blue-900 text-white rounded-full px-4 py-2 flex items-center justify-center shadow-sm hover:bg-blue-800 transition-colors"
              onClick={() => setModalOpen(true)}
            >
              <span className="mr-1">+</span> Yeni Ürün
            </button>
          )}
        </div>
        
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div className="flex flex-wrap gap-4">
            <div className="w-full md:w-auto">
              <label htmlFor="sort-select" className="block text-sm font-medium text-gray-700 mb-1">
                Sıralama
              </label>
              <select
                id="sort-select"
                className="w-full md:w-64 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-900"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="name_asc">İsim (A-Z)</option>
                <option value="name_desc">İsim (Z-A)</option>
                <option value="date_asc">Tarih (Eskiden Yeniye)</option>
                <option value="date_desc">Tarih (Yeniden Eskiye)</option>
                <option value="id_asc">ID (Artan)</option>
                <option value="id_desc">ID (Azalan)</option>
              </select>
            </div>
            
            <div className="w-full md:w-auto">
              <label htmlFor="collection-select" className="block text-sm font-medium text-gray-700 mb-1">
                Koleksiyon
              </label>
              <select
                id="collection-select"
                className="w-full md:w-64 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-900"
                value={selectedCollection}
                onChange={(e) => setSelectedCollection(e.target.value)}
              >
                <option value="">Tüm Koleksiyonlar</option>
                {collections.map((col) => (
                  <option key={col.collectionId} value={col.collectionId}>
                    {col.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="w-full md:w-auto">
              <label htmlFor="search-input" className="block text-sm font-medium text-gray-700 mb-1">
                Ara
              </label>
              <div className="relative">
                <input
                  id="search-input"
                  type="text"
                  className="w-full md:w-64 border border-gray-300 rounded-md pl-9 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-900"
                  placeholder="Ürün adı veya açıklama..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
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
            
            {(search || selectedCollection) && (
              <div className="w-full md:w-auto flex items-end">
                <button
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50"
                  onClick={() => {
                    setSearch("");
                    setSelectedCollection("");
                  }}
                >
                  Filtreleri Temizle
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-blue-900 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-600">Ürünler yükleniyor...</p>
          </div>
        ) : sortedProducts.length === 0 ? (
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
              {search && 'Arama kriterlerinize uygun ürün bulunamadı. '}
              {selectedCollection && 'Seçtiğiniz koleksiyonda ürün bulunamadı. '}
              Lütfen farklı filtreler deneyin.
            </p>
          </div>
        ) : (
          <>
            {(search || selectedCollection) && (
              <div className="p-4 border-b text-sm text-gray-600">
                <span className="font-medium">{sortedProducts.length}</span> adet ürün bulundu 
                {search && <span> (arama: <span className="italic">"{search}"</span>)</span>}
                {selectedCollection && (
                  <span> (koleksiyon: <span className="font-medium">{collections.find(c => c.collectionId === selectedCollection)?.name || selectedCollection}</span>)</span>
                )}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 p-0 border-t border-l">
              {sortedProducts.map((product) => (
                <div key={product.productId} className="flex items-center justify-between py-5 px-4 border-b border-r hover:bg-gray-50">
                  <div className="flex items-center">
                    <div className="w-16 h-16 relative overflow-hidden mr-4">
                      <img 
                        src={product.productImage || "https://tebi.io/pashahome/products/ornek-urun.jpg"} 
                        alt={product.name} 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                    <div>
                      <div className="flex items-center">
                        <span className="text-gray-400 mr-1 text-lg">✦</span>
                        <h3 className="text-black font-medium">
                          {product.name}
                        </h3>
                      </div>
                      <div className="text-xs text-gray-500 mt-1 uppercase tracking-wide">
                        {product.collection?.name || collections.find(c => c.collectionId === product.collectionId)?.name || "-"} SERİSİ
                      </div>
                    </div>
                  </div>
                  <div className="relative flex items-center">
                    <button 
                      className="w-10 h-10 bg-blue-900 text-white rounded-full flex items-center justify-center text-xl shadow-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedProductId(product.productId);
                        setDetailModalOpen(true);
                      }}
                      onMouseEnter={() => setHoverProductId(product.productId)}
                      onMouseLeave={() => setHoverProductId(null)}
                    >
                      +
                    </button>
                    {isAdmin && (
                      <button 
                        className="w-10 h-10 bg-green-600 text-white rounded-full flex items-center justify-center text-sm shadow-sm ml-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProductForUpdate(product);
                          setUpdateModalOpen(true);
                        }}
                        title="Ürünü Güncelle"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    )}
                    
                    {hoverProductId === product.productId && (
                      <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-md shadow-lg w-64 z-50">
                        <div className="absolute top-0 right-2 transform -translate-y-2 w-4 h-4 bg-white border-t border-l border-gray-200 transform rotate-45 z-0"></div>
                        <div className="relative z-10">
                          <div className="px-4 py-3 border-b border-gray-200">
                            <div className="font-semibold text-blue-900">Kalite</div>
                            <div className="text-sm text-gray-600">Standart Kalite</div>
                          </div>
                          <div className="px-4 py-3 border-b border-gray-200">
                            <div className="font-semibold text-blue-900">Saçak</div>
                            <div className="text-sm text-gray-600">
                              {product.hasFringe ? 'Standart Saçak' : 'Saçaksız'}
                            </div>
                          </div>
                          <div className="px-4 py-3 border-b border-gray-200">
                            <div className="font-semibold text-blue-900">Kesim Türü</div>
                            <div className="text-sm text-gray-600">
                              {product.cutTypes && product.cutTypes.length > 0 
                                ? (product.cutTypes[0].name === 'standart' 
                                  ? 'Standart' 
                                  : product.cutTypes[0].name === 'oval' 
                                    ? 'Oval' 
                                    : product.cutTypes[0].name === 'daire' 
                                      ? 'Daire' 
                                      : 'Standart, Oval, Daire')
                                : 'Standart, Oval, Daire'}
                            </div>
                          </div>
                          {product.sizeOptions && product.sizeOptions.length > 0 && (
                            <>
                              <div className="px-4 py-3 border-b border-gray-200">
                                <div className="font-semibold text-blue-900">En (cm)</div>
                                <div className="text-sm text-gray-600">
                                  Min: 40 - Max: {Math.max(...product.sizeOptions.map((size: any) => size.width))}
                                </div>
                              </div>
                              <div className="px-4 py-3">
                                <div className="font-semibold text-blue-900">Boy (cm)</div>
                                <div className="text-sm text-gray-600">
                                  Min: 40 - Max: {product.sizeOptions.some((size: any) => size.is_optional_height) 
                                    ? '2500' 
                                    : Math.max(...product.sizeOptions.map((size: any) => size.height))}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      {confirmOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-lg relative">
            <h2 className="text-lg font-bold mb-4 text-black">Onay</h2>
            <div className="mb-6 text-black">Bu ürünü silmek istediğinize emin misiniz?</div>
            <div className="flex justify-end gap-2">
              <button className="px-4 py-2 rounded bg-gray-200 text-black" onClick={() => { setConfirmOpen(false); setDeleteId(null); }}>Vazgeç</button>
              <button className="px-4 py-2 rounded bg-red-600 text-white" onClick={handleDelete} disabled={deleteLoading}>Evet</button>
            </div>
            {deleteError && <div className="text-red-500 text-sm mt-2">{deleteError}</div>}
          </div>
        </div>
      )}
      {isAdmin && (
        <AddProductModal 
          open={modalOpen} 
          onClose={() => setModalOpen(false)} 
          onSuccess={(newProduct) => {
            setProducts([newProduct, ...products]);
            setModalOpen(false);
          }} 
          collections={collections}
        />
      )}
      {selectedProductId && (
        <ProductDetailModal open={detailModalOpen} onClose={() => setDetailModalOpen(false)} productId={selectedProductId} />
      )}
      {selectedProductForUpdate && (
        <UpdateProductModal 
          open={updateModalOpen} 
          onClose={() => setUpdateModalOpen(false)} 
          product={selectedProductForUpdate} 
          collections={collections} 
          onSuccess={(updatedProduct) => {
            if (updatedProduct.deleted) {
              // Ürün silindiyse listeden kaldır
              setProducts(products.filter(p => p.productId !== updatedProduct.productId));
            } else {
              // Ürün güncellendiyse listeyi güncelle
              setProducts(products.map(p => p.productId === updatedProduct.productId ? updatedProduct : p));
            }
            setUpdateModalOpen(false);
          }}
        />
      )}
      <div className="flex items-center justify-center mt-8 text-sm">
        <div className="flex items-center space-x-2">
          <button className="w-8 h-8 border rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100">
            <span>&lt;&lt;</span>
          </button>
          <button className="w-8 h-8 border rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100">
            <span>&lt;</span>
          </button>
          <button className="w-8 h-8 border rounded-full flex items-center justify-center bg-blue-900 text-white">
            <span>1</span>
          </button>
          <button className="w-8 h-8 border rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100">
            <span>2</span>
          </button>
          <button className="w-8 h-8 border rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100">
            <span>3</span>
          </button>
          <button className="w-8 h-8 border rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100">
            <span>4</span>
          </button>
          <button className="w-8 h-8 border rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100">
            <span>5</span>
          </button>
          <button className="w-8 h-8 border rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100">
            <span>&gt;</span>
          </button>
          <button className="w-8 h-8 border rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100">
            <span>&gt;&gt;</span>
          </button>
        </div>
      </div>
    </div>
  );
} 