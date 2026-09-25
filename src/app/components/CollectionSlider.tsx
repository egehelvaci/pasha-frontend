"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import { getPublicCollections, PublicCollection } from "../../services/api";

// Swiper CSS'lerini import et
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

export default function CollectionSlider() {
  const [collections, setCollections] = useState<PublicCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCollections = async () => {
      try {
        setLoading(true);
        const data = await getPublicCollections();
        setCollections(data.collections);
      } catch (err) {
        setError("Koleksiyonlar yüklenirken bir hata oluştu");
        console.error("Koleksiyon yükleme hatası:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCollections();
  }, []);

  if (loading) {
    return (
      <div className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-[#00365a]" />
            <p className="mt-3 text-sm text-slate-500">Koleksiyonlar yükleniyor...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm text-rose-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (collections.length === 0) {
    return (
      <div className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm text-slate-500">Henüz koleksiyon bulunmuyor.</p>
          </div>
        </div>
      </div>
    );
  }

  // Ürünü olan koleksiyonları filtrele
  const collectionsWithProducts = collections.filter(
    (collection) => collection.products && collection.products.length > 0
  );

  if (collectionsWithProducts.length === 0) {
    return (
      <div className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm text-slate-500">Henüz ürün bulunan koleksiyon yok.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="py-12 sm:py-16">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
        {collectionsWithProducts.map((collection, index) => (
          <div key={collection.id} className="mb-12">
            <div className="mb-6 flex flex-col items-center text-center">
              <h3 className="display-heading text-2xl text-[#183342] sm:text-3xl">
                {collection.name}
              </h3>
              <div className="mt-3 h-px w-[min(100%,16rem)] bg-neutral-300" />
            </div>

            {/* Swiper Slider */}
            <div className="relative">
              <Swiper
                modules={[Navigation, Pagination, Autoplay]}
                spaceBetween={30}
                slidesPerView={2}
                navigation={{
                  nextEl: `.public-products-next-${index}`,
                  prevEl: `.public-products-prev-${index}`,
                }}
                pagination={{
                  clickable: true,
                  el: `.public-products-pagination-${index}`,
                }}
                autoplay={{
                  delay: 4000,
                  disableOnInteraction: false,
                }}
                breakpoints={{
                  640: {
                    slidesPerView: 2,
                    spaceBetween: 30,
                  },
                  768: {
                    slidesPerView: 3,
                    spaceBetween: 30,
                  },
                  1024: {
                    slidesPerView: 4,
                    spaceBetween: 30,
                  },
                }}
                className="product-swiper"
              >
                {collection.products.map((product) => (
                  <SwiperSlide key={product.id}>
                    <div className="product-card group surface overflow-hidden">
                      <div className="flex aspect-square items-center justify-center bg-slate-50">
                        {product.image ? (
                          <Image
                            src={product.image}
                            alt={product.name}
                            width={300}
                            height={300}
                            className="h-full w-full object-contain p-4"
                          />
                        ) : (
                          <Image
                            src="/black-logo.svg"
                            alt="Paşa Home Logo"
                            width={80}
                            height={80}
                            className="h-16 w-16 opacity-80"
                          />
                        )}
                      </div>
                      <div className="border-t border-slate-100 p-4">
                        <h4 className="line-clamp-2 text-sm font-medium text-slate-900">
                          {product.name}
                        </h4>
                        {product.description && (
                          <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-slate-500">
                            {product.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>

              {/* Navigation Buttons - Temiz */}
              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  className={`public-products-prev-${index} inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:text-[#00365a]`}
                  aria-label="Önceki ürünler"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  type="button"
                  className={`public-products-next-${index} inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:text-[#00365a]`}
                  aria-label="Sonraki ürünler"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              <div className={`public-products-pagination-${index} mt-3 flex justify-center gap-1.5`} />
            </div>
          </div>
        ))}
      </div>

      <style jsx global>{`
        .product-swiper .swiper-pagination-bullet {
          width: 7px;
          height: 7px;
          background: #94a3b8;
          opacity: 0.55;
          border-radius: 9999px;
          margin: 0 3px !important;
        }
        .product-swiper .swiper-pagination-bullet-active {
          width: 18px;
          opacity: 1;
          background: #00365a;
        }
      `}</style>
    </section>
  );
}
