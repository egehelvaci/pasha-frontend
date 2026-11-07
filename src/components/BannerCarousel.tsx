'use client';

import MorphGallery from '@/components/ui/morph-gallery';
import type { SiteBanner } from '@/services/api';

export function safeBannerHref(value: string | null): string | undefined {
  const href = value?.trim();
  if (!href) return undefined;
  try {
    const parsed = new URL(href, 'https://pasahome.com.tr');
    return ['http:', 'https:'].includes(parsed.protocol) ? href : undefined;
  } catch { return undefined; }
}

export default function BannerCarousel({ banners }: { banners: SiteBanner[] }) {
  const items = banners.filter(banner => banner.imageUrl).map(banner => ({
    id: banner.id,
    src: banner.imageUrl,
    mobileSrc: banner.mobileImageUrl,
    alt: banner.altText || banner.title || 'Paşa Home koleksiyonu',
    href: safeBannerHref(banner.linkUrl),
  }));
  if (!items.length) return null;
  return <MorphGallery key={JSON.stringify(items.map(item => [item.id, item.src, item.mobileSrc]))} items={items} autoplay={6000} />;
}
