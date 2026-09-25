'use client';

import { useAuth } from '../context/AuthContext';
import { useSiteSettings } from '../context/SiteSettingsContext';
import BannerCarousel from '@/components/BannerCarousel';
import BestSellers from '@/components/BestSellers';
import Link from 'next/link';

export default function Dashboard() {
  const { user, token, isAdmin } = useAuth();
  const { banners } = useSiteSettings();
  if (!user || !token) return null;

  return (
    <main className="design-shell min-h-screen">
      <div className="page-container">
        <div className="flex flex-wrap items-end justify-between gap-4 py-8 sm:py-12 reveal-in">
          <div>
            <p className="eyebrow">Paşa Home · Bayi portalı</p>
            <h1 className="display-heading mt-3 text-3xl sm:text-4xl">Hoş geldiniz, {user.name}</h1>
          </div>
          <Link href="/dashboard/urunler/liste" className="primary-action">Ürünleri incele <span aria-hidden="true">↗</span></Link>
        </div>
        <BannerCarousel banners={banners} />
        <BestSellers key={`${user.userId}-${isAdmin}`} token={token} isAdmin={isAdmin} />
      </div>
    </main>
  );
}
