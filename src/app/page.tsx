"use client";

import PublicLayout from "./components/PublicLayout";
import CollectionSlider from "./components/CollectionSlider";

export default function Home() {
  return (
    <PublicLayout>
      {/* Koleksiyonlar Bölümü */}
      <section id="koleksiyonlar">
        <CollectionSlider />
      </section>
    </PublicLayout>
  );
}
