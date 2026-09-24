"use client";
import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { FaTrash } from "react-icons/fa";
import { FaArrowLeft } from "react-icons/fa";
import { useAuth } from '@/app/context/AuthContext';
import { useCart } from '@/app/context/CartContext';
import { useSiteSettings } from '@/app/context/SiteSettingsContext';
import { API_BASE_URL } from '@/services/api';
import { useToken } from '@/app/hooks/useToken';
import Image from 'next/image';
import { getConsumableAreaM2, getStockWarning, isCommonStockEnabled, isLegacySizeOutOfStock, toCanonicalCutType, toNumber } from '@/app/utils/productStock';

export default function ProductDetail() {
  const params = useParams();
  const router = useRouter();
  const token = useToken();
  const { refreshCart } = useCart();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [collections, setCollections] = useState<any[]>([]);
  const productFetchedRef = useRef(false);
  const collectionsFetchedRef = useRef(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const { isAdmin, user } = useAuth();
  const { hideStock, isLoaded: siteSettingsLoaded } = useSiteSettings();
  
  // Sepete ekleme için state'ler
  const [addToCartLoading, setAddToCartLoading] = useState(false);
  const [addToCartSuccess, setAddToCartSuccess] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [addToCartError, setAddToCartError] = useState("");
  
  // Ön sipariş için state'ler
  const [preorderLoading, setPreorderLoading] = useState(false);
  const [preorderSuccess, setPreorderSuccess] = useState(false);
  const [preorderError, setPreorderError] = useState("");
  const [notes, setNotes] = useState<string>("");
  
  // Ürün seçimleri için state'ler
  const [selectedSize, setSelectedSize] = useState<any>(null);
  const [selectedCutType, setSelectedCutType] = useState<any>(null);
  const [selectedHasFringe, setSelectedHasFringe] = useState<boolean | null>(null);
  const [totalPrice, setTotalPrice] = useState<number>(0);
  const [customHeight, setCustomHeight] = useState<number | string>(100);  // Varsayılan 100 cm boy
  const [quantity, setQuantity] = useState<number>(1);  // Ürün adedi

  // Custom dropdown state'leri
  const [sizeDropdownOpen, setSizeDropdownOpen] = useState(false);
  const [cutTypeDropdownOpen, setCutTypeDropdownOpen] = useState(false);
  const [fringeDropdownOpen, setFringeDropdownOpen] = useState(false);



  useEffect(() => {
    if (!productFetchedRef.current) {
      productFetchedRef.current = true;
      fetchProduct();
    }
    
    if (!collectionsFetchedRef.current) {
      collectionsFetchedRef.current = true;
      fetchCollections();
    }
  }, [params.productId]);

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
    const quantityNum = quantity || 0;
    if (product && selectedSize && quantityNum > 0) {
      // Metrekare fiyatı
      const pricePerSquareMeter = parseFloat(product.pricing?.price) || 0;
      
      // Boy değerini belirle (özel boy varsa onu kullan)
      const heightValue = selectedSize.is_optional_height ? parseFloat(customHeight.toString()) || 100 : parseFloat(selectedSize.height);
      const widthValue = parseFloat(selectedSize.width);
      
      // Alan hesaplama (cm² -> m²)
      const totalArea = (widthValue * heightValue) / 10000;
      
      // Toplam fiyat hesaplama
      const calculatedPrice = pricePerSquareMeter * totalArea * quantityNum;
      setTotalPrice(calculatedPrice || 0);
      
    } else {
      setTotalPrice(0);
    }
  }, [product, selectedSize, quantity, customHeight]);

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

  const fetchProduct = async () => {
    try {
      const authToken = token;
              const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://pashahomeapps.up.railway.app'}/api/products/${params.productId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
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

  const fetchCollections = async () => {
    try {
      const authToken = token;
              const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://pashahomeapps.up.railway.app'}/api/collections/`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      const data = await res.json();
      setCollections(data.data || []);
    } catch (error) {
      console.error("Koleksiyonlar yüklenirken hata oluştu:", error);
    }
  };

  // Boyut değişimi
  const handleSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sizeId = parseInt(e.target.value);
    const size = product.sizeOptions.find((s: any) => s.id === sizeId);
    setSelectedSize(size);
    
    // İsteğe bağlı boy seçilince varsayılan değeri 100cm olarak ayarla
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

  // Stok durumu kontrolü
  const isOutOfStock = () => {
    if (!product || !selectedSize) return false;
    if (isCommonStockEnabled(product)) return false;
    return isLegacySizeOutOfStock(selectedSize);
  };

  const stockWarning = (() => {
    if (!product || !selectedSize) return null;
    const heightValue = selectedSize.is_optional_height
      ? toNumber(customHeight, 1)
      : toNumber(selectedSize.height);
    return getStockWarning(product, toNumber(selectedSize.width), heightValue, toNumber(quantity, 1));
  })();

  // Ön sipariş fonksiyonu
  const addToPreorder = async () => {
    // Validasyon kontrolleri
    if (!product || !selectedSize || !selectedCutType) {
      setPreorderError("Ürün detayları eksik");
      return;
    }
    
    const quantityNum = parseInt(quantity.toString()) || 0;
    if (quantityNum <= 0) {
      setPreorderError("Lütfen geçerli bir miktar girin");
      return;
    }
    
    const cutTypeValue = toCanonicalCutType(selectedCutType.name);
    
    setPreorderLoading(true);
    setPreorderError("");
    setPreorderSuccess(false);
    
    try {
      const authToken = token;
      
      // Boy değerini belirle
      const heightValue = selectedSize.is_optional_height ? customHeight : selectedSize.height;
      
      const requestBody = {
        productId: product.productId,
        quantity: quantityNum,
        width: selectedSize.width,
        height: heightValue,
        hasFringe: selectedHasFringe === true,
        cutType: cutTypeValue,
        notes: notes.trim() || undefined,
        isPreorder: true // Ön sipariş işareti
      };
      
      // Ön sipariş için aynı sepet API'sini kullanıyoruz, sadece isPreorder flag'i ekliyoruz
      const res = await fetch(`${API_BASE_URL}/api/cart/add`, {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${authToken}`,
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
        throw new Error(data.message || "Ön sipariş verilemedi");
      }
      
      // Başarılı
      setPreorderSuccess(true);
      setQuantity(1); // Miktar sıfırla
      setNotes(""); // Notları temizle
      
      // 3 saniye sonra başarı mesajını temizle
      setTimeout(() => {
        setPreorderSuccess(false);
      }, 3000);
      
    } catch (err: any) {
      setPreorderError(err.message || "Ön sipariş verirken bir hata oluştu");
    } finally {
      setPreorderLoading(false);
    }
  };

  // Sepete ekleme fonksiyonu
  const addToCart = async () => {
    // Validasyon kontrolleri
    if (!product || !selectedSize || !selectedCutType) {
      setAddToCartError("Ürün detayları eksik");
      return;
    }
    
    const quantityNum = parseInt(quantity.toString()) || 0;
    if (quantityNum <= 0) {
      setAddToCartError("Lütfen geçerli bir miktar girin");
      return;
    }
    
    const cutTypeValue = toCanonicalCutType(selectedCutType.name);
    
    setAddToCartLoading(true);
    setAddToCartError("");
    setAddToCartSuccess(false);
    
    try {
      const authToken = token;
      
      // Boy değerini belirle
      const heightValue = selectedSize.is_optional_height ? customHeight : selectedSize.height;
      
      const requestBody = {
        productId: product.productId,
        quantity: quantityNum,
        width: selectedSize.width,
        height: heightValue,
        hasFringe: selectedHasFringe === true,
        cutType: cutTypeValue,
        notes: notes.trim() || undefined // Boşsa undefined olacak, API'ye gönderilmeyecek
      };
      
      const res = await fetch(`${API_BASE_URL}/api/cart/add`, {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${authToken}`,
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
      setShowSuccessPopup(true);
      setQuantity(1); // Miktar sıfırla
      setNotes(""); // Notları temizle
      
      // Sepeti yenile
      await refreshCart();
      
      // 3 saniye sonra başarı mesajını temizle
      setTimeout(() => {
        setAddToCartSuccess(false);
      }, 3000);
      
    } catch (err: any) {
      setAddToCartError(err.message || "Sepete eklerken bir hata oluştu");
    } finally {
      setAddToCartLoading(false);
    }
  };

  function UpdateProductModal({ open, onClose, product, collections, onSuccess }: { open: boolean, onClose: () => void, product: any, collections: any[], onSuccess: (updated: any) => void }) {
    const [form, setForm] = useState({
      name: product?.name || "",
      description: product?.description || "",
      price: product?.pricing?.price || "",
      stock: product?.sizeOptions?.[0]?.stockQuantity || "",
      width: product?.sizeOptions?.[0]?.width || "",
      height: product?.sizeOptions?.[0]?.height || "",
      cut: product?.cutTypes?.[0]?.name === "standart" ? "true" : "false",
      collectionId: product?.collectionId || "",
      currency: product?.pricing?.currency || "TRY",
      productImage: null as File | null
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
      setForm({
        name: product?.name || "",
        description: product?.description || "",
        price: product?.pricing?.price || "",
        stock: product?.sizeOptions?.[0]?.stockQuantity || "",
        width: product?.sizeOptions?.[0]?.width || "",
        height: product?.sizeOptions?.[0]?.height || "",
        cut: product?.cutTypes?.[0]?.name === "standart" ? "true" : "false",
        collectionId: product?.collectionId || "",
        currency: product?.pricing?.currency || "TRY",
        productImage: null
      });
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
      setLoading(true);
      setError("");
      try {
        const authToken = token;
        const fd = new FormData();
        Object.entries(form).forEach(([key, value]) => {
          if (value !== null && value !== "") fd.append(key, value as any);
        });
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://pashahomeapps.up.railway.app'}/api/products/${product.productId}`, {
          method: "PUT",
          headers: {
            'Authorization': `Bearer ${authToken}`
          },
          body: fd
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || "Ürün güncellenemedi");
        onSuccess(data.data);
        onClose();
      } catch (err: any) {
        setError(err.message || "Bir hata oluştu");
      } finally {
        setLoading(false);
      }
    };

    if (!open) return null;

    const fieldClass =
      "w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 transition-all duration-200 ease-out placeholder:text-slate-400 hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15";

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
        <div className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white">
          <div className="relative shrink-0 border-b border-slate-200/80 bg-stone-50/90 px-5 py-4">
            <button
              type="button"
              className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 transition-all duration-200 ease-out hover:bg-stone-200/70 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/20"
              onClick={onClose}
              aria-label="Kapat"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="pr-10 text-lg font-semibold tracking-tight text-slate-900">Ürünü Güncelle</h2>
            {product?.name && (
              <p className="mt-1 truncate text-sm text-slate-500">{product.name}</p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 overflow-y-auto p-5">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Ad</label>
              <input name="name" value={form.name} onChange={handleChange} placeholder="Ürün adı" className={fieldClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Açıklama</label>
              <textarea name="description" value={form.description} onChange={handleChange} placeholder="Ürün açıklaması" className={`${fieldClass} min-h-[88px] resize-y`} />
            </div>
            {user?.canSeePrice && (
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Fiyat</label>
                <input name="price" type="text" value={form.price} onChange={handleChange} placeholder="Fiyat" className={fieldClass} />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Stok</label>
                <input name="stock" type="text" value={form.stock} onChange={handleChange} placeholder="Stok" className={fieldClass} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Kesim</label>
                <select name="cut" value={form.cut} onChange={handleChange} className={fieldClass}>
                  <option value="false">Kesim Yok</option>
                  <option value="true">Kesim Var</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Genişlik</label>
                <input name="width" type="text" value={form.width} onChange={handleChange} placeholder="Genişlik" className={fieldClass} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Yükseklik</label>
                <input name="height" type="text" value={form.height} onChange={handleChange} placeholder="Yükseklik" className={fieldClass} />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Koleksiyon</label>
              <select name="collectionId" value={form.collectionId} onChange={handleChange} className={fieldClass}>
                <option value="">Koleksiyon Seç</option>
                {collections.map(col => (
                  <option key={col.collectionId} value={col.collectionId}>{col.name}</option>
                ))}
              </select>
            </div>
            {user?.canSeePrice && (
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Para Birimi</label>
                <select name="currency" value={form.currency} onChange={handleChange} className={fieldClass}>
                  <option value="TRY">TRY</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Ürün Görseli</label>
              <input name="productImage" type="file" accept="image/*" onChange={handleChange} className={`${fieldClass} file:mr-3 file:rounded-md file:border-0 file:bg-stone-100 file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-slate-700`} />
            </div>
            {error && (
              <div className="rounded-lg border border-rose-200/60 bg-rose-50/70 px-3 py-2 text-sm text-rose-700/90">{error}</div>
            )}
            <div className="mt-1 flex gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-lg border border-slate-200/80 bg-stone-50 px-4 py-2.5 text-sm font-medium text-slate-700 transition-all duration-200 ease-out hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/20 active:scale-[0.98]"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition-all duration-200 ease-out hover:bg-[#004170] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Güncelleniyor..." : "Güncelle"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  const handleDelete = async () => {
    setDeleteLoading(true);
    setDeleteError("");
    try {
      const authToken = token;
              const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://pashahomeapps.up.railway.app'}/api/products/${product.productId}`, {
        method: "DELETE",
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      if (!res.ok) throw new Error("Ürün silinemedi");
      router.push("/dashboard/urunler/liste");
    } catch (err: any) {
      setDeleteError(err.message || "Bir hata oluştu");
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 bg-[#f7f8fa]">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-[#00365a]" />
        <p className="text-sm text-slate-500">Yükleniyor...</p>
      </div>
    );
  }
  if (error || !product) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 bg-[#f7f8fa] px-4 text-center">
        <p className="text-sm font-medium text-red-600">{error || "Ürün bulunamadı"}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 sm:py-8">
        {/* Page header */}
        <div className="mb-6 sm:mb-8">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
              <button
                onClick={() => router.push('/dashboard/urunler/liste')}
                className="mb-3 inline-flex items-center gap-2 self-center rounded-lg px-2 py-1.5 text-sm font-medium text-slate-600 transition-all duration-200 ease-out hover:bg-white hover:text-[#00365a] active:scale-[0.98] sm:self-start"
              >
                <FaArrowLeft className="h-3.5 w-3.5" /> Geri
              </button>
              <h1 className="text-2xl font-light tracking-[0.08em] text-neutral-900 sm:text-3xl sm:tracking-[0.12em]">
                {product.collection?.name} - {product.name}
              </h1>
              <div className="mt-3 h-px w-[min(100%,20rem)] bg-neutral-300 sm:mt-4" />
            </div>
            {isAdmin && (
              <button
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 self-center rounded-lg border border-slate-200/80 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-all duration-200 ease-out hover:border-slate-300 hover:bg-slate-50 hover:text-[#00365a] active:scale-[0.98] sm:self-auto"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Düzenle
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
          <div className="p-5 sm:p-6 lg:p-8">
            <div className="flex flex-col gap-8 md:flex-row">
              {/* Image — same ratio as liste: 350×400 */}
              <div className="w-full md:w-1/2">
                {product.productImage ? (
                  <div className="relative aspect-[350/400] overflow-hidden rounded-xl border border-slate-200/80 bg-slate-50">
                    <Image
                      src={product.productImage}
                      alt={product.name}
                      width={350}
                      height={400}
                      className="h-full w-full object-contain p-3"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-[350/400] flex-col items-center justify-center rounded-xl border border-slate-200/80 bg-slate-50 p-6">
                    <div className="mb-4 flex h-32 w-32 items-center justify-center rounded-xl bg-slate-100">
                      <Image
                        src="/logo.svg"
                        alt="Paşa Home Logo"
                        width={80}
                        height={80}
                        className="opacity-80"
                      />
                    </div>
                    <p className="text-center text-sm font-medium text-slate-500">
                      Ürün görseli<br />hazırlanıyor
                    </p>
                  </div>
                )}
              </div>

              <div className="w-full md:w-1/2">
                <div className="grid grid-cols-1 gap-5">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Ürün Seçenekleri</h3>
                    <p className="mt-0.5 text-xs text-slate-500">Boyut ve özellikleri seçin</p>
                  </div>

                  {/* Boyut — same simple chips as liste modal */}
                  <div className="dropdown-container flex flex-col gap-3">
                    <span className="text-sm font-medium text-slate-900">Boyut</span>
                    {siteSettingsLoaded && !hideStock && isCommonStockEnabled(product) && (
                      <p className="text-sm text-slate-600">
                        Mevcut stok: <span className="font-semibold tabular-nums text-slate-900">{getConsumableAreaM2(product).toFixed(2)} m²</span>
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {product.sizeOptions?.map((size: any) => {
                        const isSelected = selectedSize?.id === size.id;
                        const label = size.is_optional_height
                          ? `${size.width} × Özel`
                          : `${size.width} × ${size.height}`;
                        return (
                          <button
                            key={size.id}
                            type="button"
                            onClick={() => {
                              setSelectedSize(size);
                              setSizeDropdownOpen(false);
                            }}
                            className={`rounded-lg border px-3.5 py-2 text-sm tabular-nums transition-all duration-200 ease-out active:scale-[0.98] ${
                              isSelected
                                ? 'border-[#00365a] bg-[#00365a] font-medium text-white'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                    {selectedSize && selectedSize.is_optional_height && (
                      <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2.5">
                        <label className="shrink-0 text-sm text-slate-500">Boy</label>
                        <div className="flex h-10 max-w-[140px] items-center overflow-hidden rounded-lg border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-[#00365a]/20">
                          <input
                            type="number"
                            min="1"
                            max={selectedSize.height}
                            value={customHeight}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === '') {
                                setCustomHeight('');
                              } else {
                                const numValue = Number(value);
                                if (numValue >= 1 && numValue <= toNumber(selectedSize.height)) {
                                  setCustomHeight(numValue);
                                } else if (value.length <= 1) {
                                  setCustomHeight(value);
                                }
                              }
                            }}
                            onBlur={(e) => {
                              const value = e.target.value;
                              const maxHeight = toNumber(selectedSize.height);
                              if (value === '' || Number(value) < 1) {
                                setCustomHeight(1);
                              } else if (Number(value) > maxHeight) {
                                setCustomHeight(maxHeight);
                              }
                            }}
                            className="h-full w-full bg-transparent px-3 text-sm tabular-nums text-slate-900 outline-none"
                            aria-label="Boy (cm)"
                          />
                          <span className="pr-3 text-xs text-slate-400">cm</span>
                        </div>
                      </div>
                      <p className="text-xs font-medium text-rose-600">Lütfen boy giriniz.</p>
                      </div>
                    )}
                  </div>

                  <div className="dropdown-container flex flex-col gap-2">
                    <span className="text-sm font-medium text-slate-900">Kesim Türü</span>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setCutTypeDropdownOpen(!cutTypeDropdownOpen)}
                        className={`w-full rounded-lg border bg-white px-3 py-2.5 text-left text-sm transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/20 ${
                          cutTypeDropdownOpen
                            ? 'border-[#00365a]/40 bg-slate-50'
                            : 'border-slate-200/80 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <span className={selectedCutType ? "text-slate-900" : "text-slate-500"}>
                          {selectedCutType
                            ? selectedCutType.name.charAt(0).toUpperCase() + selectedCutType.name.slice(1)
                            : "Kesim Türü Seçin"
                          }
                        </span>
                        <svg
                          className={`absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-transform duration-200 ${cutTypeDropdownOpen ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {cutTypeDropdownOpen && (
                        <div className="absolute z-50 mt-1.5 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-200/80 bg-white py-1 shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
                          <div
                            className="cursor-pointer border-b border-slate-100 px-3.5 py-2.5 text-sm text-slate-500 transition-colors duration-150 hover:bg-slate-50"
                            onClick={() => {
                              setSelectedCutType(null);
                              setCutTypeDropdownOpen(false);
                            }}
                          >
                            Kesim Türü Seçin
                          </div>
                          {product.cutTypes?.map((cutType: any) => (
                            <div
                              key={cutType.id}
                              className={`cursor-pointer px-3.5 py-2.5 text-sm transition-colors duration-150 ease-out hover:bg-slate-50 ${
                                selectedCutType?.id === cutType.id ? 'bg-[#00365a]/[0.08] font-medium text-[#00365a]' : 'text-slate-700'
                              }`}
                              onClick={() => {
                                setSelectedCutType(cutType);
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

                  {product.canHaveFringe && (
                    <div className="dropdown-container flex flex-col gap-2">
                      <span className="text-sm font-medium text-slate-900">Saçak</span>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setFringeDropdownOpen(!fringeDropdownOpen)}
                          className={`w-full rounded-lg border bg-white px-3 py-2.5 text-left text-sm transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/20 ${
                            fringeDropdownOpen
                              ? 'border-[#00365a]/40 bg-slate-50'
                              : 'border-slate-200/80 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <span className={selectedHasFringe !== null ? "text-slate-900" : "text-slate-500"}>
                            {selectedHasFringe === true
                              ? "Saçaklı"
                              : selectedHasFringe === false
                              ? "Saçaksız"
                              : "Saçak Seçin"
                            }
                          </span>
                          <svg
                            className={`absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-transform duration-200 ${fringeDropdownOpen ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {fringeDropdownOpen && (
                          <div className="absolute z-50 mt-1.5 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-200/80 bg-white py-1 shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
                            <div
                              className="cursor-pointer border-b border-slate-100 px-3.5 py-2.5 text-sm text-slate-500 transition-colors duration-150 hover:bg-slate-50"
                              onClick={() => {
                                setSelectedHasFringe(null);
                                setFringeDropdownOpen(false);
                              }}
                            >
                              Saçak Seçin
                            </div>
                            <div
                              className={`cursor-pointer px-3.5 py-2.5 text-sm transition-colors duration-150 ease-out hover:bg-slate-50 ${
                                selectedHasFringe === true ? 'bg-[#00365a]/[0.08] font-medium text-[#00365a]' : 'text-slate-700'
                              }`}
                              onClick={() => {
                                setSelectedHasFringe(true);
                                setFringeDropdownOpen(false);
                              }}
                            >
                              Saçaklı
                            </div>
                            <div
                              className={`cursor-pointer px-3.5 py-2.5 text-sm transition-colors duration-150 ease-out hover:bg-slate-50 ${
                                selectedHasFringe === false ? 'bg-[#00365a]/[0.08] font-medium text-[#00365a]' : 'text-slate-700'
                              }`}
                              onClick={() => {
                                setSelectedHasFringe(false);
                                setFringeDropdownOpen(false);
                              }}
                            >
                              Saçaksız
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-slate-900">Adet</span>
                    <div className="flex items-center">
                      <button
                        type="button"
                        className="flex h-10 w-10 items-center justify-center rounded-l-lg border border-slate-200/80 text-slate-500 transition-all duration-200 ease-out hover:bg-slate-50 hover:text-[#00365a] active:scale-[0.96]"
                        onClick={() => {
                          if (quantity > 1) {
                            setQuantity(quantity - 1);
                          }
                        }}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '') {
                            setQuantity(0);
                          } else {
                            const numValue = parseInt(value);
                            if (numValue >= 1) {
                              setQuantity(numValue);
                            }
                          }
                        }}
                        onBlur={(e) => {
                          const value = e.target.value;
                          if (value === '' || parseInt(value) < 1) {
                            setQuantity(1);
                          }
                        }}
                        className="h-10 w-16 border-y border-slate-200/80 px-2 text-center text-sm tabular-nums text-slate-900 outline-none"
                      />
                      <button
                        type="button"
                        className="flex h-10 w-10 items-center justify-center rounded-r-lg border border-slate-200/80 text-slate-500 transition-all duration-200 ease-out hover:bg-slate-50 hover:text-[#00365a] active:scale-[0.96]"
                        onClick={() => {
                          setQuantity(quantity + 1);
                        }}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-slate-900">Açıklama</span>
                    <p className="text-sm leading-relaxed text-slate-600">{product.description}</p>
                  </div>

                  {user?.canSeePrice && (
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Metrekare Fiyatı</span>
                      <span className="text-base font-semibold tabular-nums text-slate-900">
                        {product.pricing?.price} {product.pricing?.currency}/m²
                      </span>
                    </div>
                  )}

                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-slate-900">Notlar (Opsiyonel)</span>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Ürün için özel notlarınızı yazabilirsiniz..."
                      className="h-24 resize-none rounded-lg border border-slate-300 bg-slate-50 p-3 text-sm text-slate-900 transition-all duration-200 ease-out placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/20"
                    />
                  </div>

                  {user?.canSeePrice && (
                    <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700">Toplam Tutar</span>
                        <span className="text-lg font-semibold tabular-nums text-[#00365a]">
                          {totalPrice.toFixed(2)} {product.pricing?.currency}
                        </span>
                      </div>
                      {selectedSize && (
                        <div className="mt-1 text-xs text-slate-500">
                          {selectedSize.width} × {selectedSize.is_optional_height ? customHeight : selectedSize.height} cm
                          {' '}· {quantity} adet
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-1">
                    {siteSettingsLoaded && !hideStock && stockWarning && (
                      <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                        {stockWarning}
                      </div>
                    )}

                    {siteSettingsLoaded && !hideStock && selectedSize && isOutOfStock() && (
                      <div className="mb-3 rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-700">
                        Bu ürün şu anda stokta bulunmamaktadır. Ön sipariş verebilirsiniz.
                      </div>
                    )}

                    {addToCartSuccess && (
                      <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                        Ürün başarıyla sepete eklendi!
                      </div>
                    )}

                    {preorderSuccess && (
                      <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                        Sepetinize eklendi!
                      </div>
                    )}

                    {addToCartError && (
                      <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                        {addToCartError}
                      </div>
                    )}

                    {preorderError && (
                      <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                        {preorderError}
                      </div>
                    )}

                    {selectedSize && isOutOfStock() ? (
                      <button
                        type="button"
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 py-3 text-sm font-semibold text-white transition-all duration-200 ease-out hover:bg-orange-600 active:scale-[0.99] disabled:opacity-70"
                        onClick={addToPreorder}
                        disabled={preorderLoading || !selectedSize || !selectedCutType}
                      >
                        {preorderLoading ? (
                          <>
                            <svg className="mr-1 h-4 w-4 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            İşleniyor...
                          </>
                        ) : (
                          "Ön Sipariş Ver"
                        )}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#00365a] py-3 text-sm font-semibold text-white transition-all duration-200 ease-out hover:bg-[#004170] active:scale-[0.99] disabled:opacity-70"
                        onClick={addToCart}
                        disabled={addToCartLoading || !selectedSize || !selectedCutType}
                      >
                        {addToCartLoading ? (
                          <>
                            <svg className="mr-1 h-4 w-4 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            İşleniyor...
                          </>
                        ) : (
                          "Sepete Ekle"
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Ürün Stok Durumu - site ayarı stoğu gizliyorsa render edilmez */}
            {siteSettingsLoaded && !hideStock && !isCommonStockEnabled(product) && (
            <div className="mt-8 border-t border-slate-100 pt-6">
              <h2 className="mb-4 text-sm font-semibold text-slate-900">Ürün Stok Durumu</h2>

              {product.sizeOptions && product.sizeOptions.length > 0 ? (
                <div className="space-y-2">
                  {product.sizeOptions.map((size: any, index: number) => {
                    const isOptionalHeight = size.is_optional_height;
                    const stockValue = isOptionalHeight
                      ? `${(size.stockAreaM2 || 0).toFixed(1)} m²`
                      : `${size.stockQuantity || 0} adet`;
                    const hasStock = (isOptionalHeight ? (size.stockAreaM2 || 0) : (size.stockQuantity || 0)) > 0;
                    const stockColor = hasStock ? 'text-emerald-600' : 'text-orange-600';

                    return (
                      <div
                        key={size.id || index}
                        className="rounded-lg border border-slate-200/80 bg-slate-50/80 px-3.5 py-2.5"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm tabular-nums text-slate-700">
                            {size.width} × {isOptionalHeight ? 'Özel' : size.height}
                          </span>
                          <span className={`text-xs font-medium ${stockColor}`}>
                            {stockValue}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-sm text-slate-500">Bu ürün için boyut seçeneği bulunmamaktadır.</div>
              )}
            </div>
            )}

            {isAdmin && (
              <div className="mt-6 flex justify-end border-t border-slate-100 pt-4">
                <button
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-all duration-200 ease-out hover:bg-red-50 active:scale-[0.98]"
                  title="Sil"
                  onClick={() => setDeleteOpen(true)}
                >
                  <FaTrash /> Ürünü Sil
                </button>
              </div>
            )}
          </div>
        </div>

        {deleteOpen && isAdmin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px]">
            <div className="relative w-full max-w-sm rounded-xl border border-slate-200/80 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
              <h2 className="mb-2 text-base font-semibold text-slate-900">Onay</h2>
              <div className="mb-6 text-sm text-slate-600">Bu ürünü silmek istediğinize emin misiniz?</div>
              <div className="flex justify-end gap-2">
                <button className="rounded-lg border border-slate-200/80 px-4 py-2 text-sm font-medium text-slate-700 transition-all duration-200 ease-out hover:bg-slate-50 active:scale-[0.98]" onClick={() => setDeleteOpen(false)}>Vazgeç</button>
                <button className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-all duration-200 ease-out hover:bg-red-700 active:scale-[0.98] disabled:opacity-60" onClick={handleDelete} disabled={deleteLoading}>Evet</button>
              </div>
              {deleteError && <div className="mt-2 text-sm text-red-500">{deleteError}</div>}
            </div>
          </div>
        )}

        {modalOpen && isAdmin && (
          <UpdateProductModal open={modalOpen} onClose={() => setModalOpen(false)} product={product} collections={collections} onSuccess={setProduct} />
        )}

        {/* Başarı Pop-up */}
        {showSuccessPopup && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px]">
            <div className="mx-4 w-full max-w-md rounded-xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-200 ease-out">
              <div className="p-6 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
                  <svg className="h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="mb-1 text-lg font-semibold tracking-tight text-slate-900">
                  Ürün sepete eklendi
                </h3>
                <div className="mt-6 flex flex-col gap-2.5">
                  <Link
                    href="/dashboard/sepetim"
                    className="w-full rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 ease-out hover:bg-[#004170] active:scale-[0.99]"
                    onClick={() => setShowSuccessPopup(false)}
                  >
                    Sepete Git
                  </Link>
                  <Link
                    href="/dashboard/urunler/liste"
                    className="w-full rounded-lg border border-slate-200/80 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-all duration-200 ease-out hover:bg-slate-50 active:scale-[0.99]"
                    onClick={() => setShowSuccessPopup(false)}
                  >
                    Alışverişe Devam Et
                  </Link>
                  <button
                    onClick={() => setShowSuccessPopup(false)}
                    className="w-full rounded-lg px-4 py-2.5 text-sm font-medium text-slate-500 transition-all duration-200 ease-out hover:bg-slate-50 hover:text-slate-700 active:scale-[0.99]"
                  >
                    Kapat
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