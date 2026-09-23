'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

interface Product {
  productId: string;
  name: string;
  description: string;
  stock: number;
  width: number;
  height: number;
  cut: boolean;
  productImage: string;
  collectionId: string;
  created_at: string;
  Collection?: {
    name: string;
    code: string;
  };
  // UI-only fallback alanları (API'den gelmez)
  _isFallback?: boolean;
  _displayCode?: string;
  _displayPrice?: number;
  _displaySalePrice?: number | null;
}

interface ProductsResponse {
  success: boolean;
  data: Product[];
  message?: string;
}

const CURRENCY_SYMBOLS = {
  'TRY': '₺',
  'USD': '$',
  'EUR': '€'
};

const BANNER_SLIDES = [
  {
    id: 1,
    image: 'https://placehold.co/1600x520/e8eef2/64748b?text=Banner+1',
  },
  {
    id: 2,
    image: 'https://placehold.co/1600x520/dbe4ea/64748b?text=Banner+2',
  },
  {
    id: 3,
    image: 'https://placehold.co/1600x520/cfd9e3/64748b?text=Banner+3',
  },
];

function buildDisplayProducts(products: Product[]): Product[] {
  const real = products.slice(0, 10);
  if (real.length >= 10) return real;

  const fallbacks: Product[] = [];
  for (let i = real.length; i < 10; i++) {
    fallbacks.push({
      productId: `fallback-${i + 1}`,
      name: `Örnek Ürün ${i + 1}`,
      description: '',
      stock: 0,
      width: 0,
      height: 0,
      cut: false,
      productImage: `https://placehold.co/400x400/f1f5f9/94a3b8?text=Urun+${i + 1}`,
      collectionId: '',
      created_at: '',
      Collection: { name: 'Koleksiyon', code: `SKU-00${i + 1}` },
      _isFallback: true,
      _displayCode: `SKU-00${i + 1}`,
      _displayPrice: 1200 + i * 75,
      _displaySalePrice: i % 3 === 0 ? 999 + i * 40 : null,
    });
  }
  return [...real, ...fallbacks];
}

export default function Dashboard() {
  const { user, isLoading, token } = useAuth();
  const router = useRouter();

  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [userCurrency, setUserCurrency] = useState<string>('TRY');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const rememberMe = localStorage.getItem('rememberMe') === 'true';
        let storedCurrency;

        if (rememberMe) {
          storedCurrency = localStorage.getItem('currency');
        } else {
          storedCurrency = sessionStorage.getItem('currency');
        }

        if (storedCurrency) {
          setUserCurrency(storedCurrency);
        } else if (user?.store?.currency) {
          setUserCurrency(user.store.currency);
        }
      } catch (error) {
        console.error('LocalStorage okuma hatası:', error);
      }
    }
  }, [user]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!token) return;

    const fetchRecentProducts = async () => {
      setIsLoadingProducts(true);
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://pashahomeapps.up.railway.app'}/api/products?limit=20&page=1`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const data: ProductsResponse = await response.json();
          if (data.success) {
            setRecentProducts(data.data);
          }
        }
      } catch (error) {
        console.error('Son ürünler çekme hatası:', error);
      } finally {
        setIsLoadingProducts(false);
      }
    };

    fetchRecentProducts();
  }, [token]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f7f8fa] gap-3">
        <div className="h-9 w-9 rounded-full border-2 border-slate-200 border-t-[#00365a] animate-spin" />
        <p className="text-sm text-slate-500 font-medium">Yükleniyor...</p>
      </div>
    );
  }

  const currencySymbol =
    CURRENCY_SYMBOLS[userCurrency as keyof typeof CURRENCY_SYMBOLS] || userCurrency;
  const displayProducts = buildDisplayProducts(recentProducts);

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
        {/* Banner Slider */}
        <section className="relative mb-8 sm:mb-10">
          <div className="home-banner-swiper overflow-hidden rounded-xl border border-slate-200/80 bg-slate-100 shadow-sm">
            <Swiper
              modules={[Navigation, Pagination, Autoplay]}
              slidesPerView={1}
              loop
              autoplay={{ delay: 5000, disableOnInteraction: false }}
              navigation={{
                nextEl: '.home-banner-next',
                prevEl: '.home-banner-prev',
              }}
              pagination={{
                el: '.home-banner-pagination',
                clickable: true,
              }}
              className="w-full"
            >
              {BANNER_SLIDES.map((slide) => (
                <SwiperSlide key={slide.id}>
                  <div className="relative aspect-[16/7] w-full sm:aspect-[21/8]">
                    <img
                      src={slide.image}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>

            <button
              type="button"
              className="home-banner-prev absolute left-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-600 shadow-sm transition hover:bg-white hover:text-[#00365a] sm:left-4 sm:h-10 sm:w-10"
              aria-label="Önceki banner"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              className="home-banner-next absolute right-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-600 shadow-sm transition hover:bg-white hover:text-[#00365a] sm:right-4 sm:h-10 sm:w-10"
              aria-label="Sonraki banner"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <div className="home-banner-pagination absolute bottom-3 left-0 right-0 z-10 flex justify-center gap-1.5" />
          </div>
        </section>

        {/* En Çok Satan Ürünler */}
        <section className="mb-8">
          <div className="mb-6 grid grid-cols-[1fr_auto_1fr] items-start gap-2 sm:mb-8">
            <div aria-hidden="true" />
            <div className="flex flex-col items-center text-center">
              <h2 className="text-2xl font-light tracking-[0.08em] text-neutral-900 sm:text-3xl sm:tracking-[0.12em]">
                En Çok Satan Ürünler
              </h2>
              <div className="mt-3 h-px w-[min(100%,28rem)] bg-neutral-300 sm:mt-4" />
            </div>
            <div className="flex items-center justify-end gap-2 self-center">
              <button
                type="button"
                className="home-products-prev inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:text-[#00365a]"
                aria-label="Önceki ürünler"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                type="button"
                className="home-products-next inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:text-[#00365a]"
                aria-label="Sonraki ürünler"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {isLoadingProducts ? (
            <div className="flex h-56 items-center justify-center rounded-xl border border-slate-200/80 bg-white">
              <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 rounded-full border-2 border-slate-200 border-t-[#00365a] animate-spin" />
                <p className="text-xs text-slate-400">Ürünler yükleniyor</p>
              </div>
            </div>
          ) : (
            <div className="home-products-swiper">
              <Swiper
                modules={[Navigation]}
                spaceBetween={16}
                slidesPerView={1.35}
                navigation={{
                  nextEl: '.home-products-next',
                  prevEl: '.home-products-prev',
                }}
                breakpoints={{
                  480: { slidesPerView: 2.1, spaceBetween: 16 },
                  768: { slidesPerView: 3.1, spaceBetween: 16 },
                  1024: { slidesPerView: 4.2, spaceBetween: 18 },
                  1280: { slidesPerView: 5, spaceBetween: 18 },
                }}
              >
                {displayProducts.map((product) => {
                  const code =
                    product._displayCode ||
                    product.Collection?.code ||
                    product.productId.slice(0, 8).toUpperCase();
                  const hasSale =
                    typeof product._displaySalePrice === 'number' &&
                    product._displaySalePrice !== null;
                  const price =
                    typeof product._displayPrice === 'number'
                      ? product._displayPrice
                      : null;

                  return (
                    <SwiperSlide key={product.productId} className="!h-auto">
                      <article
                        className={`group flex h-full flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm transition ${
                          product._isFallback
                            ? 'cursor-default'
                            : 'cursor-pointer hover:border-slate-300 hover:shadow-md'
                        }`}
                        onClick={() => {
                          if (product._isFallback) return;
                          setSelectedProductId(product.productId);
                          setDetailModalOpen(true);
                        }}
                        onKeyDown={(e) => {
                          if (product._isFallback) return;
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedProductId(product.productId);
                            setDetailModalOpen(true);
                          }
                        }}
                        role={product._isFallback ? undefined : 'button'}
                        tabIndex={product._isFallback ? undefined : 0}
                      >
                        <div className="relative aspect-square overflow-hidden bg-slate-50">
                          {product.productImage ? (
                            <img
                              src={product.productImage}
                              alt={product.name}
                              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-slate-100">
                              <svg className="h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-1 flex-col gap-1.5 p-3.5 sm:p-4">
                          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                            {code}
                          </p>
                          <h3 className="line-clamp-2 text-sm font-medium leading-snug text-slate-900 transition-colors group-hover:text-[#00365a]">
                            {product.name}
                          </h3>
                          {(price !== null || product._isFallback) && (
                            <div className="mt-auto pt-2">
                              {hasSale ? (
                                <div className="flex items-baseline gap-2">
                                  <span className="text-sm font-semibold tabular-nums text-slate-900">
                                    {product._displaySalePrice!.toLocaleString('tr-TR')} {currencySymbol}
                                  </span>
                                  <span className="text-xs tabular-nums text-slate-400 line-through">
                                    {price!.toLocaleString('tr-TR')} {currencySymbol}
                                  </span>
                                </div>
                              ) : price !== null ? (
                                <span className="text-sm font-semibold tabular-nums text-slate-900">
                                  {price.toLocaleString('tr-TR')} {currencySymbol}
                                </span>
                              ) : null}
                            </div>
                          )}
                        </div>
                      </article>
                    </SwiperSlide>
                  );
                })}
              </Swiper>
            </div>
          )}
        </section>
      </div>

      <ProductDetailModal
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        productId={selectedProductId}
      />

      <style jsx global>{`
        .home-banner-pagination .swiper-pagination-bullet {
          width: 7px;
          height: 7px;
          background: #94a3b8;
          opacity: 0.55;
          border-radius: 9999px;
          margin: 0 3px !important;
          transition: all 0.2s ease;
        }
        .home-banner-pagination .swiper-pagination-bullet-active {
          width: 18px;
          opacity: 1;
          background: #00365a;
          border-radius: 9999px;
        }
        .home-products-swiper .swiper-slide {
          height: auto;
        }
      `}</style>
    </div>
  );
}

function ProductDetailModal({ open, onClose, productId }: { open: boolean, onClose: () => void, productId: string | null }) {
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { token } = useAuth();

  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  React.useEffect(() => {
    if (open && productId) {
      fetchProductDetail(productId);
    } else {
      setProduct(null);
      setLoading(false);
    }
  }, [open, productId]);

  const fetchProductDetail = async (id: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://pashahomeapps.up.railway.app'}/api/products/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!res.ok) throw new Error('Ürün bulunamadı');
      const data = await res.json();
      setProduct(data.data || data);
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px]">
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Ürün Detayı</h2>
            <p className="mt-0.5 text-xs text-slate-500">Ürün bilgilerini inceleyin</p>
          </div>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            onClick={onClose}
            aria-label="Kapat"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto p-5 sm:p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <div className="h-9 w-9 rounded-full border-2 border-slate-200 border-t-[#00365a] animate-spin" />
              <p className="text-sm text-slate-500">Ürün detayları yükleniyor...</p>
            </div>
          ) : error ? (
            <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-6 text-center text-sm text-red-600">
              {error}
            </div>
          ) : product ? (
            <div className="space-y-5">
              <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
                <img
                  src={product.productImage || 'https://tebi.io/pashahome/products/ornek-urun.jpg'}
                  alt={product.name}
                  className="h-full w-full object-contain p-4"
                />
              </div>

              <div className="space-y-4">
                <div>
                  <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                    {product.collection?.name} - {product.name}
                  </h1>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{product.description}</p>
                </div>

                <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:gap-3">
                  <Link
                    href={`/dashboard/urunler/${product.productId}`}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#004170]"
                    onClick={onClose}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    Sepete Ekle
                  </Link>
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    Kapat
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-10 text-center text-sm text-slate-500">Ürün bulunamadı</div>
          )}
        </div>
      </div>
    </div>
  );
}
