'use client';

import { useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { A11y, Pagination, Keyboard } from 'swiper/modules';
import type { SiteBanner } from '@/services/api';
import 'swiper/css';
import 'swiper/css/pagination';

function BannerVisual({ banner, priority }: { banner: SiteBanner; priority: boolean }) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="banner-visual">
      {failed ? <p className="p-8 text-center text-slate-600">{banner.altText || banner.title}</p> : (
        <picture>
          {banner.mobileImageUrl && <source media="(max-width: 639px)" srcSet={banner.mobileImageUrl} />}
          {/* Native picture preserves backend-provided mobile art direction and arbitrary image hosts. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={banner.imageUrl} alt={banner.altText || banner.title}
            loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'}
            decoding="async" onError={() => setFailed(true)} />
        </picture>
      )}
    </div>
  );
}

export default function BannerCarousel({ banners }: { banners: SiteBanner[] }) {
  if (!banners.length) return null;

  return (
    <section aria-label="Paşa Home duyuruları" className="banner-carousel surface reveal-in">
      <Swiper modules={[A11y, Pagination, Keyboard]} slidesPerView={1}
        keyboard={{ enabled: true, onlyInViewport: true }}
        pagination={banners.length > 1 ? { clickable: true } : false}
        a11y={{ paginationBulletMessage: '{{index}}. duyuruya git' }}>
        {banners.map((banner, index) => {
          const visual = <BannerVisual banner={banner} priority={index === 0} />;
          return (
            <SwiperSlide key={banner.id}>
              {visual}
            </SwiperSlide>
          );
        })}
      </Swiper>
    </section>
  );
}
