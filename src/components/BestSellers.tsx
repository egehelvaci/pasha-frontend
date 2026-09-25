'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getBestsellers, type BestsellerProduct } from '@/services/api';
import ProductSkeleton from './ProductSkeleton';
import ProductVisual from './ProductVisual';

type Result = { status: 'loading' } | { status: 'error' } | { status: 'ready'; products: BestsellerProduct[] };

export default function BestSellers({ token, isAdmin }: { token: string; isAdmin: boolean }) {
  const [result, setResult] = useState<Result>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setResult({ status: 'loading' });
    const timeout = setTimeout(() => controller.abort(), 15000);
    getBestsellers({ token, isAdmin, signal: controller.signal })
      .then(products => { if (active) setResult({ status: 'ready', products }); })
      .catch(() => { if (active) setResult({ status: 'error' }); })
      .finally(() => clearTimeout(timeout));
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [token, isAdmin, attempt]);

  return (
    <section aria-labelledby="bestsellers-title" className="py-10 sm:py-16">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="eyebrow">{isAdmin ? 'Satış adedine göre' : 'Sipariş adedinize göre'} · Son 1 yıl</p>
          <h2 id="bestsellers-title" className="display-heading mt-3 text-3xl sm:text-4xl">Çok Satanlar</h2>
        </div>
        <Link href="/dashboard/koleksiyonlar/liste" className="text-link">Koleksiyonları keşfet <span aria-hidden="true">↗</span></Link>
      </div>
      <div aria-busy={result.status === 'loading'} aria-live="polite">
        {result.status === 'loading' ? <ProductSkeleton /> : result.status === 'error' ? (
          <div className="surface px-6 py-14 text-center" role="alert">
            <h3 className="text-lg font-medium">Satış verilerine şu an ulaşılamıyor.</h3>
            <p className="mt-2 text-sm text-slate-600">Lütfen bağlantınızı kontrol edip tekrar deneyin.</p>
            <button type="button" className="primary-action mt-6" onClick={() => setAttempt(value => value + 1)}>Tekrar dene <span aria-hidden="true">↻</span></button>
          </div>
        ) : result.products.length === 0 ? (
          <div className="surface px-6 py-14 text-center">
            <h3 className="display-heading text-2xl">Henüz satış verisi bulunmuyor</h3>
            <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-600">Son bir yılda sıralamaya girecek satış bulunmuyor. Mevcut ürünleri koleksiyonlar sayfasından inceleyebilirsiniz.</p>
            <Link href="/dashboard/koleksiyonlar/liste" className="primary-action mt-6">Koleksiyonları incele <span aria-hidden="true">↗</span></Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
            {result.products.map((product, index) => (
              <Link key={product.product_id} href={`/dashboard/urunler/${encodeURIComponent(product.product_id)}`}
                className="product-card group surface overflow-hidden">
                <div className="relative">
                  <ProductVisual src={product.product_image} name={product.product_name} />
                  <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs tabular-nums text-[#00365a] backdrop-blur">{String(index + 1).padStart(2, '0')}</span>
                </div>
                <div className="p-4 sm:p-5">
                  <p className="eyebrow truncate">{product.collection_name || 'Paşa Home'}</p>
                  <h3 className="mt-2 text-base font-medium leading-snug">{product.product_name}</h3>
                  <p className="mt-4 flex items-center justify-between border-t border-slate-200/70 pt-3 text-xs text-slate-600">
                    Ürünü incele <span aria-hidden="true">↗</span>
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
