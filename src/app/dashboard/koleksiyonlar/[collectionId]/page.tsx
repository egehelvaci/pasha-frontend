"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";

interface Product {
  productId: string;
  name: string;
  description: string;
  imageUrl: string | null;
  productImage?: string;
}

interface Collection {
  collectionId: string;
  name: string;
  description: string;
  code: string;
  coverImageUrl: string | null;
  products: Product[];
  createdAt: string;
}

export default function CollectionDetail() {
  const params = useParams();
  const router = useRouter();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchCollection = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://pashahomeapps.up.railway.app'}/api/collections/${params.collectionId}`);
        if (!res.ok) throw new Error("Koleksiyon bulunamadı");
        const data = await res.json();
        setCollection(data.data);
      } catch (err: any) {
        setError(err.message || "Bir hata oluştu");
      } finally {
        setLoading(false);
      }
    };

    fetchCollection();
  }, [params.collectionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f8fa]">
        <div className="mx-auto flex max-w-[1600px] flex-col items-center justify-center gap-3 px-4 py-16 sm:px-6 lg:px-8">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-[#00365a]" />
          <p className="text-sm text-slate-500">Koleksiyon detayları yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error || !collection) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8fa] px-4">
        <div className="w-full max-w-md rounded-xl border border-slate-200/80 bg-white px-6 py-10 text-center shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Koleksiyon bulunamadı</h3>
          <p className="mt-2 text-sm text-slate-500">{error || "Koleksiyon bulunamadı"}</p>
          <button
            type="button"
            onClick={() => router.back()}
            className="mt-6 inline-flex items-center justify-center rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004170] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25"
          >
            Geri Dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-light tracking-[0.08em] text-neutral-900 sm:text-3xl sm:tracking-[0.12em]">
              {collection.name}
            </h1>
            <div className="mt-3 h-px w-[min(100%,20rem)] bg-neutral-300 sm:mt-4" />
            <p className="mt-3 text-sm text-slate-500">Koleksiyon detayları ve ürünler</p>
          </div>
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
          >
            Koleksiyonlara Dön
          </button>
        </div>

        <div className="mb-6 rounded-xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50/60 px-4 py-3 sm:px-5">
            <h2 className="text-sm font-semibold text-slate-900">Koleksiyon Bilgileri</h2>
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600">
              {collection.products.length} ürün
            </span>
          </div>
          <div className="grid grid-cols-1 gap-5 p-4 sm:p-5 md:grid-cols-2">
            <dl className="space-y-3">
              <div className="flex items-baseline justify-between gap-4 border-b border-slate-100 pb-3">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Koleksiyon Kodu</dt>
                <dd className="text-sm font-medium text-slate-900">{collection.code}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-b border-slate-100 pb-3">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Ürün Sayısı</dt>
                <dd className="text-sm font-medium tabular-nums text-slate-900">{collection.products.length}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Oluşturulma</dt>
                <dd className="text-sm text-slate-900">
                  {new Date(collection.createdAt).toLocaleDateString('tr-TR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  })}
                </dd>
              </div>
            </dl>
            <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
              <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">Açıklama</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">{collection.description}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50/60 px-4 py-3 sm:px-5">
            <h2 className="text-sm font-semibold text-slate-900">Koleksiyondaki Ürünler</h2>
            <span className="text-xs text-slate-500">{collection.products.length} ürün</span>
          </div>

          {collection.products.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <h3 className="text-sm font-medium text-slate-900">Henüz ürün yok</h3>
              <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-500">Bu koleksiyonda henüz hiç ürün bulunmuyor.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3 xl:grid-cols-4">
              {collection.products.map(product => (
                <button
                  key={product.productId}
                  type="button"
                  onClick={() => router.push(`/dashboard/urunler/${product.productId}`)}
                  className="overflow-hidden rounded-xl border border-slate-200/80 bg-white text-left shadow-sm transition hover:border-slate-300"
                >
                  <div className="flex aspect-square items-center justify-center bg-slate-50">
                    {product.imageUrl || product.productImage ? (
                      <Image
                        src={product.imageUrl || product.productImage || "/black-logo.svg"}
                        alt={product.name}
                        width={300}
                        height={300}
                        className="h-full w-full object-contain p-4"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "/black-logo.svg";
                        }}
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
                    <h3 className="line-clamp-2 text-sm font-medium text-slate-900">{product.name}</h3>
                    <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-slate-500">{product.description}</p>
                    <p className="mt-3 text-xs font-medium text-[#00365a]">Detayları Görüntüle</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 