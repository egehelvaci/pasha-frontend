"use client";

import { useEffect, useState } from "react";
import { ArrowUpRightIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import ProductRailGallery from "@/components/ui/product-rail-gallery";
import { getPublicCollections, type PublicCollection } from "@/services/api";

type CatalogResult =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; collections: PublicCollection[] };

export default function CollectionSlider() {
  const [result, setResult] = useState<CatalogResult>({ status: "loading" });
  const [selectedId, setSelectedId] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timeout = setTimeout(() => controller.abort(), 20000);
    setResult({ status: "loading" });
    getPublicCollections(controller.signal)
      .then(({ collections }) => {
        if (active) setResult({ status: "ready", collections: collections.filter(collection => collection.products?.length > 0) });
      })
      .catch(() => { if (active) setResult({ status: "error" }); })
      .finally(() => clearTimeout(timeout));
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [attempt]);

  const collections = result.status === "ready" ? result.collections : [];
  const selected = collections.find(collection => collection.id === selectedId) ?? collections[0];

  return (
    <div className="page-container py-12 sm:py-16">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-6 sm:mb-10">
        <div>
          <p className="eyebrow">PAŞA HOME · HALI KOLEKSİYONLARI</p>
          <h2 className="display-heading mt-3 max-w-xl text-3xl sm:text-[2.75rem]">Her deseni yakından keşfedin.</h2>
          <p className="mt-4 max-w-xl text-sm leading-7 text-slate-500">Koleksiyonunuzu seçin, halılar arasında gezinin. Evinize yakışan desene bir adım daha yaklaşın.</p>
        </div>
        <Link href="/bayi-talebi" className="text-link">Bayi olmak istiyorum <ArrowUpRightIcon className="h-4 w-4" aria-hidden="true" /></Link>
      </div>

      <div aria-busy={result.status === "loading"}>
        {result.status === "loading" ? (
          <div className="surface flex min-h-[540px] flex-col items-center justify-center gap-6 p-8" role="status">
            <div className="flex items-center gap-4" aria-hidden="true">
              {[0, 1, 2].map(index => <div key={index} className={`skeleton w-16 rounded-sm sm:w-24 ${index === 1 ? "h-64" : "h-48"}`} />)}
            </div>
            <p className="text-sm text-slate-500">Koleksiyonlar yükleniyor…</p>
          </div>
        ) : result.status === "error" ? (
          <div className="surface px-6 py-20 text-center" role="alert">
            <h3 className="text-lg font-medium">Koleksiyonlara şu an ulaşılamıyor.</h3>
            <p className="mt-2 text-sm text-slate-500">Lütfen bağlantınızı kontrol edip tekrar deneyin.</p>
            <button type="button" className="primary-action mt-6" onClick={() => setAttempt(value => value + 1)}>Tekrar dene</button>
          </div>
        ) : !selected ? (
          <div className="surface px-6 py-20 text-center text-sm text-slate-500" role="status">Henüz ürün bulunan koleksiyon yok.</div>
        ) : (
          <>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-y border-[#deddd5] py-4">
              <p className="text-xs text-slate-500"><span className="font-medium text-[#183342]">{collections.length} koleksiyon</span><span className="mx-3 text-slate-300">/</span>Size ait bir dokunuş</p>
              <div className="flex w-full items-center gap-3 sm:w-auto">
                <label htmlFor="rail-collection" className="shrink-0 text-xs font-medium text-slate-500">Koleksiyon</label>
                <select id="rail-collection" value={selected.id} onChange={event => setSelectedId(event.target.value)}
                  className="min-h-11 min-w-0 flex-1 rounded-lg border border-[#d8d9d1] bg-white py-2 pl-3 pr-8 text-sm font-medium text-[#183342] sm:w-64">
                  {collections.map(collection => <option key={collection.id} value={collection.id}>{collection.name.trim()} ({collection.products.length})</option>)}
                </select>
              </div>
            </div>
            <ProductRailGallery key={selected.id} items={selected.products} heading={selected.name.trim()} description={selected.description} />
          </>
        )}
      </div>
    </div>
  );
}
