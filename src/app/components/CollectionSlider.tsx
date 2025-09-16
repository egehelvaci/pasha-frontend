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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Koleksiyonlar yükleniyor...</p>
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
            <p className="text-red-600">{error}</p>
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
            <p className="text-gray-600">Henüz koleksiyon bulunmuyor.</p>
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
            <p className="text-gray-600">Henüz ürün bulunan koleksiyon yok.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Her koleksiyon için ayrı slider - sadece ürünü olan koleksiyonları göster */}
        {collectionsWithProducts.map((collection) => (
          <div key={collection.id} className="mb-20">
            {/* Koleksiyon Başlığı - Temiz Tasarım */}
            <div className="mb-8 text-center">
                <h3 className="text-3xl font-bold text-gray-900 mb-2 relative">
                  {collection.name}
                  <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-16 h-1 bg-gradient-to-r from-slate-800 to-slate-900 rounded-full"></div>
                </h3>
            </div>

            {/* Swiper Slider */}
            <div className="relative">
              <Swiper
                modules={[Navigation, Pagination, Autoplay]}
                spaceBetween={30}
                slidesPerView={2}
                navigation={{
                  nextEl: '.swiper-button-next',
                  prevEl: '.swiper-button-prev',
                }}
                pagination={{
                  clickable: true,
                  el: '.swiper-pagination',
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
                    <div className="group bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border border-gray-100">
                      {/* Ürün Görseli - 1:2 Oran */}
                      <div className="relative aspect-[1/2] bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                        {product.image ? (
                          <Image
                            src={product.image}
                            alt={product.name}
                            width={300}
                            height={600}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                            <div className="text-center">
                              <svg className="w-16 h-16 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span className="text-gray-400 text-sm">Görsel Yok</span>
                            </div>
                          </div>
                        )}
                        
                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      </div>

                      {/* Ürün Bilgileri */}
                      <div className="p-6">
                        <h4 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-slate-800 transition-colors duration-300">
                          {product.name}
                        </h4>
                        
                        {product.description && (
                          <p className="text-gray-600 text-sm line-clamp-3 leading-relaxed">
                            {product.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>

              {/* Navigation Buttons - Temiz */}
              <div className="swiper-button-prev !text-gray-400 !w-12 !h-12 !mt-[-24px] !bg-transparent hover:!text-slate-800 transition-all duration-300"></div>
              <div className="swiper-button-next !text-gray-400 !w-12 !h-12 !mt-[-24px] !bg-transparent hover:!text-slate-800 transition-all duration-300"></div>

              {/* Pagination - Daha Şık */}
              <div className="swiper-pagination !bottom-[-50px]"></div>
            </div>
          </div>
        ))}
      </div>

      <style jsx global>{`
        .product-swiper .swiper-button-prev:after,
        .product-swiper .swiper-button-next:after {
          font-size: 20px;
          font-weight: bold;
        }
        
        .product-swiper .swiper-button-prev,
        .product-swiper .swiper-button-next {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .product-swiper .swiper-button-prev:hover,
        .product-swiper .swiper-button-next:hover {
          transform: scale(1.1);
        }
        
        .product-swiper .swiper-pagination-bullet {
          background: #d1d5db;
          opacity: 0.6;
          width: 12px;
          height: 12px;
          transition: all 0.3s ease;
        }
        
        .product-swiper .swiper-pagination-bullet-active {
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          opacity: 1;
          transform: scale(1.2);
        }
        
        .product-swiper .swiper-pagination-bullet:hover {
          background: #3b82f6;
          opacity: 0.8;
        }
        
        /* Smooth scrollbar for webkit browsers */
        .product-swiper::-webkit-scrollbar {
          display: none;
        }
        
        /* Custom gradient text for collection titles */
        .collection-title {
          background: linear-gradient(135deg, #1f2937, #374151);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
      `}</style>
    </section>
  );
}
