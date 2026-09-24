"use client";

import Link from "next/link";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import PublicLayout from "./components/PublicLayout";
import CollectionSlider from "./components/CollectionSlider";
import { useSiteSettings } from "./context/SiteSettingsContext";
import { SiteBanner } from "../services/api";

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
  if (banner.linkUrl.startsWith("/")) {
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

export default function Home() {
  const { banners } = useSiteSettings();
  const hasMultipleBanners = banners.length > 1;

  return (
    <PublicLayout>
      {banners.length > 0 && (
        <section className="mx-auto max-w-[1600px] px-4 pt-5 sm:px-6 sm:pt-6 lg:px-8">
          <div className="public-banner-swiper relative overflow-hidden rounded-xl border border-slate-200/80 bg-slate-100 shadow-sm">
            <Swiper
              modules={[Navigation, Pagination, Autoplay]}
              slidesPerView={1}
              loop={hasMultipleBanners}
              autoplay={hasMultipleBanners ? { delay: 5000, disableOnInteraction: false } : false}
              navigation={{
                nextEl: ".public-banner-next",
                prevEl: ".public-banner-prev",
              }}
              pagination={{
                el: ".public-banner-pagination",
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
                  className="public-banner-prev absolute left-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-600 shadow-sm transition hover:bg-white hover:text-[#00365a] sm:left-4 sm:h-10 sm:w-10"
                  aria-label="Önceki banner"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="public-banner-next absolute right-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-600 shadow-sm transition hover:bg-white hover:text-[#00365a] sm:right-4 sm:h-10 sm:w-10"
                  aria-label="Sonraki banner"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <div className="public-banner-pagination absolute bottom-3 left-0 right-0 z-10 flex justify-center gap-1.5" />
              </>
            )}
          </div>
        </section>
      )}

      <section id="koleksiyonlar">
        <CollectionSlider />
      </section>

      <style jsx global>{`
        .public-banner-pagination .swiper-pagination-bullet {
          width: 7px;
          height: 7px;
          background: #94a3b8;
          opacity: 0.55;
          border-radius: 9999px;
          margin: 0 3px !important;
        }
        .public-banner-pagination .swiper-pagination-bullet-active {
          width: 18px;
          opacity: 1;
          background: #00365a;
        }
      `}</style>
    </PublicLayout>
  );
}
