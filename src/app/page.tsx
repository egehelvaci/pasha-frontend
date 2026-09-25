"use client";

import PublicLayout from "./components/PublicLayout";
import CollectionSlider from "./components/CollectionSlider";
import { useSiteSettings } from "./context/SiteSettingsContext";
import BannerCarousel from "@/components/BannerCarousel";

export default function Home() {
  const { banners } = useSiteSettings();
  return (
    <PublicLayout>
      <main id="main-content">
        <h1 className="sr-only">Paşa Home Toptan Ürün Kataloğu</h1>
        <div className="page-container pt-6 sm:pt-10"><BannerCarousel banners={banners} /></div>
        <section id="koleksiyonlar" className="scroll-mt-24"><CollectionSlider /></section>
      </main>
    </PublicLayout>
  );
}
