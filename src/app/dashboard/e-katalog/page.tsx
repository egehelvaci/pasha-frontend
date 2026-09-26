'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { ArrowDownTrayIcon, ArrowLeftIcon, ArrowRightIcon, CheckIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/app/context/AuthContext';
import { getCatalogProductPage } from '@/services/api';
import { defaultOptions, parseCatalogDraft, planCatalogPages, type CatalogOptions, type CatalogProduct } from '@/features/catalog/model';
import { useCatalogJob } from '@/features/catalog/useCatalogJob';

const PAGE_SIZE = 24;
const phases = [
  { key: 'layout', label: 'Sayfalar düzenleniyor' },
  { key: 'assets', label: 'Görseller optimize ediliyor' },
  { key: 'finalizing', label: 'PDF sonlandırılıyor' },
] as const;

export default function ECatalogPage() {
  const { user, token } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [selected, setSelected] = useState<Map<string, CatalogProduct>>(new Map());
  const [options, setOptions] = useState<CatalogOptions>(defaultOptions);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0 });
  const [listState, setListState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [listError, setListError] = useState('');
  const [retry, setRetry] = useState(0);
  const [selectAllState, setSelectAllState] = useState<{ status: 'idle' | 'loading' | 'error'; loaded: number; total: number; message?: string }>({ status: 'idle', loaded: 0, total: 0 });
  const selectAllController = useRef<AbortController | null>(null);
  const job = useCatalogJob();
  const storageKey = `catalog-draft:${user?.userId || 'anonymous'}`;

  useEffect(() => {
    const timeout = setTimeout(() => { setPage(1); setSearch(query); }, 350);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    setListState('loading'); setListError('');
    getCatalogProductPage({ token, page, limit: PAGE_SIZE, search, signal: controller.signal })
      .then(result => { setProducts(result.products); setPagination({ total: result.total, totalPages: result.totalPages }); setListState('ready'); })
      .catch(error => { if (!controller.signal.aborted) { setListError(error instanceof Error ? error.message : 'Ürünler yüklenemedi.'); setListState('error'); } });
    return () => controller.abort();
  }, [token, page, search, retry]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const draft = parseCatalogDraft(raw);
      setSelected(new Map(draft.products.map(product => [product.id, product])));
      setOptions(draft.options);
    } catch { localStorage.removeItem(storageKey); }
  }, [storageKey]);

  useEffect(() => {
    const timer = setTimeout(() => localStorage.setItem(storageKey, JSON.stringify({ version: 1, products: Array.from(selected.values()), options })), 250);
    return () => clearTimeout(timer);
  }, [selected, options, storageKey]);

  useEffect(() => () => selectAllController.current?.abort(), []);

  const selectedProducts = useMemo(() => Array.from(selected.values()), [selected]);
  const progress = job.state.status === 'running' ? job.state.progress : null;
  const canShare = typeof navigator !== 'undefined' && Boolean(navigator.share);
  const estimatedPages = useMemo(() => planCatalogPages(selectedProducts, options).length + Number(options.cover), [selectedProducts, options]);
  const toggle = useCallback((product: CatalogProduct) => setSelected(current => {
    const next = new Map(current);
    next.has(product.id) ? next.delete(product.id) : next.set(product.id, product);
    return next;
  }), []);
  const pageSelected = products.length > 0 && products.every(product => selected.has(product.id));
  const togglePage = () => setSelected(current => {
    const next = new Map(current);
    if (pageSelected) products.forEach(product => next.delete(product.id));
    else products.forEach(product => next.set(product.id, product));
    return next;
  });
  const selectAllProducts = async () => {
    if (!token || selectAllState.status === 'loading') return;
    const controller = new AbortController();
    selectAllController.current?.abort();
    selectAllController.current = controller;
    setSelectAllState({ status: 'loading', loaded: 0, total: pagination.total });
    try {
      const first = await getCatalogProductPage({ token, page: 1, limit: 100, search, signal: controller.signal });
      const allProducts = [...first.products];
      setSelectAllState({ status: 'loading', loaded: allProducts.length, total: first.total });
      const remainingPages = Array.from({ length: Math.max(0, first.totalPages - 1) }, (_, index) => index + 2);
      for (let offset = 0; offset < remainingPages.length; offset += 4) {
        const batch = await Promise.all(remainingPages.slice(offset, offset + 4).map(pageNumber =>
          getCatalogProductPage({ token, page: pageNumber, limit: 100, search, signal: controller.signal })
        ));
        batch.forEach(result => allProducts.push(...result.products));
        setSelectAllState({ status: 'loading', loaded: allProducts.length, total: first.total });
      }
      setSelected(current => {
        const next = new Map(current);
        allProducts.forEach(product => next.set(product.id, product));
        return next;
      });
      setSelectAllState({ status: 'idle', loaded: allProducts.length, total: first.total });
    } catch (error) {
      if (controller.signal.aborted) return;
      setSelectAllState({ status: 'error', loaded: 0, total: pagination.total, message: error instanceof Error ? error.message : 'Tüm ürünler seçilemedi.' });
    } finally {
      if (selectAllController.current === controller) selectAllController.current = null;
    }
  };
  const updateOption = <K extends keyof CatalogOptions>(key: K, value: CatalogOptions[K]) => setOptions(current => ({ ...current, [key]: value }));
  const filename = `${options.title.trim() || 'pasa-home-katalog'}.pdf`.replace(/[\\/:*?"<>|]+/g, '-');
  const download = () => {
    if (job.state.status !== 'done') return;
    const anchor = document.createElement('a'); anchor.href = job.state.url; anchor.download = filename; anchor.click();
  };
  const share = async () => {
    if (job.state.status !== 'done' || !navigator.share) return;
    const file = new File([job.state.result.blob], filename, { type: 'application/pdf' });
    if (navigator.canShare?.({ files: [file] })) await navigator.share({ title: options.title, files: [file] });
    else await navigator.share({ title: options.title, url: job.state.url });
  };
  const start = () => { setStep(3); job.start(selectedProducts, options); };

  return (
    <main className="design-shell min-h-screen pb-28">
      <div className="page-container py-8 sm:py-12">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
          <div><p className="eyebrow">Dijital satış araçları</p><h1 className="display-heading mt-3 text-3xl sm:text-4xl">E-Katalog Oluşturucu</h1><p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">Ürünlerinizi seçin; katalog tarayıcınızı kilitlemeden arka planda hazırlansın.</p></div>
          <div className="rounded-full border border-[#d8d9d2] bg-white/70 px-4 py-2 text-xs text-slate-600">{selected.size} ürün · tahmini {estimatedPages} sayfa</div>
        </div>

        <ol className="mb-8 grid gap-2 rounded-2xl border border-[#deddd5] bg-white/70 p-2 sm:grid-cols-3" aria-label="Katalog adımları">
          {(['Ürünleri seç', 'Tasarımı ayarla', 'Oluştur'] as const).map((label, index) => {
            const number = (index + 1) as 1 | 2 | 3;
            return <li key={label}><button type="button" disabled={number > 1 && !selected.size} onClick={() => setStep(number)} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm ${step === number ? 'bg-[#00365a] text-white' : 'text-slate-600 hover:bg-white'}`}><span className={`grid h-7 w-7 place-items-center rounded-full text-xs ${step === number ? 'bg-white/15' : 'bg-[#edf0ed]'}`}>{step > number ? <CheckIcon className="h-4 w-4" /> : number}</span>{label}</button></li>;
          })}
        </ol>

        {step === 1 && <section className="surface p-4 sm:p-6" aria-labelledby="products-title">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div><h2 id="products-title" className="text-lg font-semibold">Ürün seçimi</h2><p className="mt-1 text-xs text-slate-500">Sayfa seçimi yapabilir veya tüm ürünleri tek işlemle kataloğa ekleyebilirsiniz.</p></div>
            <div className="flex flex-wrap gap-2">
              {selected.size > 0 && <button type="button" onClick={() => setSelected(new Map())} disabled={selectAllState.status === 'loading'} className="secondary-action !min-h-10 !px-4">Seçimi temizle</button>}
              <button type="button" onClick={togglePage} disabled={!products.length || selectAllState.status === 'loading'} className="secondary-action !min-h-10 !px-4">{pageSelected ? 'Bu sayfayı kaldır' : 'Bu sayfayı seç'}</button>
              <button type="button" onClick={selectAllProducts} disabled={!pagination.total || selectAllState.status === 'loading'} className="primary-action !min-h-10 !px-4">
                {selectAllState.status === 'loading' ? `${Math.min(selectAllState.loaded, selectAllState.total)}/${selectAllState.total} seçiliyor…` : search ? `Eşleşen ${pagination.total} ürünü seç` : `Tüm ${pagination.total} ürünü seç`}
              </button>
            </div>
          </div>
          {selectAllState.status === 'error' && <div role="alert" className="mb-5 flex items-center justify-between gap-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800"><span>{selectAllState.message}</span><button type="button" onClick={selectAllProducts} className="font-semibold underline underline-offset-2">Tekrar dene</button></div>}
          <label className="relative mb-6 block"><span className="sr-only">Ürün ara</span><MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" /><input value={query} onChange={event => setQuery(event.target.value)} className="h-12 w-full rounded-xl border border-[#d8d9d2] bg-white pl-12 pr-4 text-sm focus:border-[#547a8c]" placeholder="Ürün adıyla ara…" /></label>
          {listState === 'loading' ? <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <div key={i} className="surface overflow-hidden p-3"><div className="skeleton aspect-square rounded-xl" /><div className="skeleton mt-3 h-4 rounded" /></div>)}</div>
            : listState === 'error' ? <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center"><p className="text-sm text-rose-800">{listError}</p><button onClick={() => setRetry(value => value + 1)} className="primary-action mt-5">Tekrar dene</button></div>
              : products.length === 0 ? <div className="py-16 text-center text-sm text-slate-500">Aramanızla eşleşen ürün bulunamadı.</div>
                : <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">{products.map(product => <button type="button" key={product.id} onClick={() => toggle(product)} aria-pressed={selected.has(product.id)} className={`group min-w-0 overflow-hidden !rounded-2xl border bg-white text-left transition ${selected.has(product.id) ? 'border-[#00365a] ring-2 ring-[#00365a]/15' : 'border-[#deddd5] hover:-translate-y-1 hover:border-[#9badae]'}`}><div className="relative aspect-square bg-[#f0eee8]">{product.image ? <Image src={product.image} alt="" fill unoptimized sizes="(max-width: 768px) 50vw, 25vw" className="object-contain p-4" /> : <div className="grid h-full place-items-center text-xs text-slate-400">Görsel yok</div>}<span className={`absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full border ${selected.has(product.id) ? 'border-[#00365a] bg-[#00365a] text-white' : 'border-white bg-white/90 text-transparent'}`}><CheckIcon className="h-4 w-4" /></span></div><div className="min-w-0 p-4"><p className="eyebrow truncate">{product.collectionName}</p><h3 className="mt-2 line-clamp-2 break-words text-sm font-medium">{product.name}</h3></div></button>)}</div>}
          <div className="mt-6 flex items-center justify-between border-t border-[#deddd5] pt-5"><span className="text-xs text-slate-500">{pagination.total} ürün · {page}/{Math.max(1, pagination.totalPages)}</span><div className="flex gap-2"><button className="secondary-action !min-h-10 !px-3" disabled={page <= 1 || listState === 'loading'} onClick={() => setPage(value => value - 1)} aria-label="Önceki sayfa"><ArrowLeftIcon className="h-4 w-4" /></button><button className="secondary-action !min-h-10 !px-3" disabled={page >= pagination.totalPages || listState === 'loading'} onClick={() => setPage(value => value + 1)} aria-label="Sonraki sayfa"><ArrowRightIcon className="h-4 w-4" /></button></div></div>
        </section>}

        {step === 2 && <section className="grid gap-6 lg:grid-cols-[1fr_.8fr]">
          <div className="surface p-6"><h2 className="text-lg font-semibold">Katalog ayarları</h2><div className="mt-6 space-y-6"><label className="block text-sm font-medium">Katalog adı<input maxLength={80} value={options.title} onChange={event => updateOption('title', event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-[#d8d9d2] bg-white px-4" /></label><fieldset><legend className="text-sm font-medium">Sayfa düzeni</legend><div className="mt-2 grid grid-cols-2 gap-3">{(['compact', 'spacious'] as const).map(value => <button type="button" key={value} onClick={() => updateOption('layout', value)} className={`rounded-xl border p-4 text-left ${options.layout === value ? 'border-[#00365a] bg-[#eef4f5]' : 'border-[#deddd5] bg-white'}`}><span className="block text-sm font-medium">{value === 'compact' ? 'Kompakt' : 'Ferah'}</span><span className="mt-1 block text-xs text-slate-500">Sayfada {value === 'compact' ? '6' : '4'} ürün</span></button>)}</div></fieldset><fieldset><legend className="text-sm font-medium">Görsel kalitesi</legend><div className="mt-2 grid grid-cols-2 gap-3">{(['standard', 'high'] as const).map(value => <button type="button" key={value} onClick={() => updateOption('quality', value)} className={`rounded-xl border p-4 text-left ${options.quality === value ? 'border-[#00365a] bg-[#eef4f5]' : 'border-[#deddd5] bg-white'}`}><span className="block text-sm font-medium">{value === 'standard' ? 'Hızlı' : 'Yüksek kalite'}</span><span className="mt-1 block text-xs text-slate-500">{value === 'standard' ? 'Web ve paylaşım' : 'Baskı için'}</span></button>)}</div></fieldset>{([['cover', 'Kapak sayfası'], ['descriptions', 'Ürün açıklamaları']] as const).map(([key, label]) => <label key={key} className="flex min-h-12 items-center justify-between rounded-xl border border-[#deddd5] bg-white px-4 text-sm"><span>{label}</span><input type="checkbox" checked={options[key]} onChange={event => updateOption(key, event.target.checked)} className="h-4 w-4 accent-[#00365a]" /></label>)}</div></div>
          <aside className="surface p-6"><p className="eyebrow">Özet</p><h3 className="mt-3 text-xl font-semibold">{options.title || 'Adsız katalog'}</h3><dl className="mt-8 space-y-4 text-sm"><div className="flex justify-between"><dt className="text-slate-500">Ürün</dt><dd>{selected.size}</dd></div><div className="flex justify-between"><dt className="text-slate-500">Koleksiyon</dt><dd>{new Set(selectedProducts.map(p => p.collectionId || p.collectionName)).size}</dd></div><div className="flex justify-between"><dt className="text-slate-500">Tahmini sayfa</dt><dd>{estimatedPages}</dd></div></dl><button onClick={start} className="primary-action mt-8 w-full">Kataloğu oluştur <ArrowRightIcon className="h-4 w-4" /></button></aside>
        </section>}

        {step === 3 && <section className="surface mx-auto max-w-3xl overflow-hidden">
          {progress && <div className="p-7 sm:p-10"><p className="eyebrow">Arka planda hazırlanıyor</p><h2 className="mt-3 text-2xl font-semibold">Katalog oluşturuluyor</h2><p className="mt-2 text-sm text-slate-600">Bu sırada sayfada kalabilir, işlemi iptal edebilirsiniz.</p><ol className="mt-8 space-y-3">{phases.map((phase, index) => { const activeIndex = phases.findIndex(item => item.key === progress.phase); const done = index < activeIndex; const active = index === activeIndex; return <li key={phase.key} className={`flex items-center gap-4 rounded-xl border p-4 ${active ? 'border-[#00365a] bg-[#eef4f5]' : 'border-[#deddd5]'}`}><span className={`grid h-8 w-8 place-items-center rounded-full ${done ? 'bg-emerald-600 text-white' : active ? 'bg-[#00365a] text-white' : 'bg-slate-100 text-slate-400'}`}>{done ? <CheckIcon className="h-4 w-4" /> : index + 1}</span><span className="flex-1 text-sm font-medium">{phase.label}</span>{active && phase.key === 'assets' && <span className="text-xs tabular-nums text-slate-500">{progress.completed}/{progress.total}</span>}</li>; })}</ol><div className="mt-7 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#00365a] transition-[width] duration-300" style={{ width: `${progress.phase === 'layout' ? 8 : progress.phase === 'finalizing' ? 96 : 10 + (progress.completed / Math.max(1, progress.total)) * 82}%` }} /></div><button onClick={job.cancel} className="secondary-action mt-7">İptal et</button></div>}
          {(job.state.status === 'error' || job.state.status === 'cancelled') && <div className="p-10 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-rose-50 text-rose-700"><XMarkIcon className="h-6 w-6" /></div><h2 className="mt-5 text-xl font-semibold">{job.state.status === 'error' ? 'Katalog tamamlanamadı' : 'İşlem iptal edildi'}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">{job.state.status === 'error' ? job.state.message : 'Ürünleriniz ve ayarlarınız korundu.'}</p><div className="mt-7 flex justify-center gap-3"><button onClick={() => setStep(2)} className="secondary-action">Ayarları gözden geçir</button><button onClick={start} className="primary-action">Tekrar dene</button></div></div>}
          {job.state.status === 'done' && <div className="p-8 text-center sm:p-12"><div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-700"><CheckIcon className="h-7 w-7" /></div><p className="eyebrow mt-6">Hazır</p><h2 className="mt-2 text-3xl font-semibold">Kataloğunuz oluşturuldu</h2><p className="mt-3 text-sm text-slate-600">{job.state.result.pages} sayfa · {(job.state.result.elapsedMs / 1000).toFixed(1)} saniye{job.state.result.warnings.length ? ` · ${job.state.result.warnings.length} görsel atlandı` : ''}</p><div className="mt-8 grid gap-3 sm:grid-cols-3"><a href={job.state.url} target="_blank" rel="noopener noreferrer" className="secondary-action">Önizle</a><button onClick={download} className="primary-action"><ArrowDownTrayIcon className="h-4 w-4" /> İndir</button><button onClick={share} disabled={!canShare} className="secondary-action disabled:opacity-40">Paylaş</button></div><button onClick={() => { job.reset(); setStep(2); }} className="mt-6 text-sm text-[#00365a] underline-offset-4 hover:underline">Ayarları değiştir</button></div>}
          {job.state.status === 'idle' && <div className="p-10 text-center"><p className="text-sm text-slate-600">Oluşturma ayarlarını tamamlayın.</p><button onClick={() => setStep(2)} className="secondary-action mt-5">Ayarlara dön</button></div>}
        </section>}
      </div>
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#deddd5] bg-[#faf9f6]/95 px-5 py-3 backdrop-blur-xl"><div className="mx-auto flex max-w-[1344px] items-center justify-between gap-3"><span className="text-xs text-slate-500">Taslak otomatik kaydedilir</span>{step < 3 && <button onClick={() => step === 1 ? setStep(2) : start()} disabled={!selected.size} className="primary-action !min-h-11 disabled:opacity-40">{step === 1 ? 'Tasarımı ayarla' : 'Kataloğu oluştur'} <ArrowRightIcon className="h-4 w-4" /></button>}</div></div>
    </main>
  );
}
