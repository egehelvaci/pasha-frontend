'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSiteSettings } from '../context/SiteSettingsContext';
import { getMyUserStatistics, SiteBanner } from '../../services/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

interface BestsellerProduct {
  product_id: string;
  product_name: string;
  collection_name: string;
  product_image: string;
}

function BannerImage({ banner }: { banner: SiteBanner }) {
  return (
    <div className="relative aspect-[16/7] w-full sm:aspect-[21/8]">
      <picture>
        {banner.mobileImageUrl && (
          <source media="(max-width: 639px)" srcSet={banner.mobileImageUrl} />
        )}
        <img
          src={banner.imageUrl}
          alt={banner.altText || banner.title}
          className="absolute inset-0 h-full w-full object-cover"
        />
      </picture>
    </div>
  );
}

function BannerSlide({ banner }: { banner: SiteBanner }) {
  const image = <BannerImage banner={banner} />;

  if (!banner.linkUrl) return image;

  // Site ici yollar Next yonlendirmesiyle, dis baglantilar yeni sekmede acilir.
  if (banner.linkUrl.startsWith('/')) {
    return (
      <Link href={banner.linkUrl} className="block">
        {image}
      </Link>
    );
  }

  return (
    <a href={banner.linkUrl} target="_blank" rel="noopener noreferrer" className="block">
      {image}
    </a>
  );
}

export default function Dashboard() {
  const { user, isLoading, token, isAdmin } = useAuth();
  const { banners } = useSiteSettings();
  const router = useRouter();

  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const [recentProducts, setRecentProducts] = useState<BestsellerProduct[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!token || isLoading) return;

    const fetchBestsellers = async () => {
      setIsLoadingProducts(true);
      try {
        // Analiz sayfasıyla aynı kaynak ve varsayılan dönem (1 yıl).
        if (isAdmin) {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://pashahomeapps.up.railway.app'}/api/admin/statistics/top-products?period=1_year`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            }
          );
          if (!response.ok) throw new Error('Çok satanlar alınamadı');
          const data = await response.json();
          if (data.success) {
            setRecentProducts(data.data.products || []);
          }
        } else {
          const data = await getMyUserStatistics('1_year');
          setRecentProducts(data.top_products || []);
        }
      } catch (error) {
        console.error('Çok satanlar çekme hatası:', error);
        setRecentProducts([]);
      } finally {
        setIsLoadingProducts(false);
      }
    };

    fetchBestsellers();
  }, [token, isAdmin, isLoading]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f7f8fa] gap-3">
        <div className="h-9 w-9 rounded-full border-2 border-slate-200 border-t-[#00365a] animate-spin" />
        <p className="text-sm text-slate-500 font-medium">Yükleniyor...</p>
      </div>
    );
  }

  const displayProducts = recentProducts;
  const hasMultipleBanners = banners.length > 1;

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
        {/* Banner Slider - icerik site yonetimindeki aktif bannerlardan gelir */}
        {banners.length > 0 && (
          <section className="relative mb-8 sm:mb-10">
            <div className="home-banner-swiper overflow-hidden rounded-xl border border-slate-200/80 bg-slate-100 shadow-sm">
              <Swiper
                modules={[Navigation, Pagination, Autoplay]}
                slidesPerView={1}
                loop={hasMultipleBanners}
                autoplay={hasMultipleBanners ? { delay: 5000, disableOnInteraction: false } : false}
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
                {banners.map((banner) => (
                  <SwiperSlide key={banner.id}>
                    <BannerSlide banner={banner} />
                  </SwiperSlide>
                ))}
              </Swiper>

              {hasMultipleBanners && (
                <>
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
                </>
              )}
            </div>
          </section>
        )}

        {/* Çok Satanlar */}
        <section className="mb-8">
          <div className="mb-6 grid grid-cols-[1fr_auto_1fr] items-start gap-2 sm:mb-8">
            <div aria-hidden="true" />
            <div className="flex flex-col items-center text-center">
              <h2 className="text-2xl font-light tracking-[0.08em] text-neutral-900 sm:text-3xl sm:tracking-[0.12em]">
                Çok Satanlar
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
          ) : displayProducts.length === 0 ? (
            <div className="flex h-40 items-center justify-center rounded-xl border border-slate-200/80 bg-white">
              <p className="text-sm text-slate-500">Henüz çok satan ürün yok</p>
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
                {displayProducts.map((product) => (
                  <SwiperSlide key={product.product_id} className="!h-auto">
                    <article
                      className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md"
                      onClick={() => {
                        setSelectedProductId(product.product_id);
                        setDetailModalOpen(true);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedProductId(product.product_id);
                          setDetailModalOpen(true);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="relative aspect-square overflow-hidden bg-slate-50">
                        {product.product_image ? (
                          <img
                            src={product.product_image}
                            alt={product.product_name}
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                          />
                        ) : (
                          <div className="flex h-full w-full flex-col items-center justify-center p-3">
                            <div className="mb-3 flex h-20 w-20 items-center justify-center rounded-xl bg-slate-100 sm:mb-4 sm:h-24 sm:w-24">
                              <Image
                                src="/black-logo.svg"
                                alt="Paşa Home Logo"
                                width={80}
                                height={80}
                                className="h-12 w-12 opacity-80 sm:h-14 sm:w-14"
                                onError={(e) => {
                                  e.currentTarget.src = '/logo.svg';
                                }}
                              />
                            </div>
                            <p className="text-center text-xs font-medium text-slate-500 sm:text-sm">
                              Ürün görseli<br />hazırlanıyor
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col gap-1.5 p-3.5 sm:p-4">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                          {product.collection_name}
                        </p>
                        <h3 className="line-clamp-2 text-sm font-medium leading-snug text-slate-900 transition-colors group-hover:text-[#00365a]">
                          {product.product_name}
                        </h3>
                      </div>
                    </article>
                  </SwiperSlide>
                ))}
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
