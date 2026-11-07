"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import Image from "next/image";
import { ArrowLeftIcon, ArrowRightIcon, ArrowUpRightIcon, PauseIcon, PlayIcon } from "@heroicons/react/24/outline";
import { createMorphRenderer, wrapIndex, type MorphRenderer } from "./morph-renderer";
import styles from "./morph-gallery.module.css";

export interface MorphItem {
  id: string;
  src: string;
  mobileSrc?: string | null;
  thumb?: string;
  alt: string;
  href?: string;
}

export interface MorphGalleryProps {
  items: MorphItem[];
  duration?: number;
  noiseScale?: number;
  edge?: number;
  drift?: number;
  loop?: boolean;
  autoplay?: number;
  index?: number;
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  className?: string;
}

function BannerImage({ item, active, priority }: { item: MorphItem; active: boolean; priority: boolean }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={styles.slide} data-active={active} aria-hidden={!active}>
      {failed ? <div className="absolute inset-0 grid place-items-center p-12 text-center text-sm text-white/80">{item.alt}<span className="sr-only"> — görsel yüklenemedi</span></div> : (
        <>
          <picture className={styles.ambient}>
            {item.mobileSrc && <source media="(max-width: 639px)" srcSet={item.mobileSrc} />}
            <Image src={item.src} alt="" fill unoptimized sizes="100vw" className="object-cover" />
          </picture>
          <picture className={styles.picture}>
            {item.mobileSrc && <source media="(max-width: 639px)" srcSet={item.mobileSrc} />}
            <Image src={item.src} alt={item.alt} fill unoptimized sizes="(max-width: 639px) 100vw, 1320px"
              priority={priority} draggable={false} className="object-contain" onError={() => setFailed(true)} />
          </picture>
        </>
      )}
    </div>
  );
}

export default function MorphGallery({ items, duration = 1400, noiseScale = 3.5, edge = 0.15, drift = 0.2,
  loop = true, autoplay = 0, index, defaultIndex = 0, onIndexChange, className = "" }: MorphGalleryProps) {
  const rootRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<MorphRenderer | null>(null);
  const swipe = useRef<{ id: number; x: number; y: number } | null>(null);
  const [localIndex, setLocalIndex] = useState(defaultIndex);
  const [mobile, setMobile] = useState(false);
  const [reduced, setReduced] = useState(true);
  const [visible, setVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [playing, setPlaying] = useState(autoplay > 0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [canvasVisible, setCanvasVisible] = useState(false);
  const [generation, setGeneration] = useState(0);
  const active = wrapIndex(index ?? localIndex, items.length, loop);
  const activeRef = useRef(active);
  activeRef.current = active;
  const sourceKey = JSON.stringify(items.map(item => mobile && item.mobileSrc ? item.mobileSrc : item.src));
  const current = items[active];

  const go = useCallback((next: number, manual = true) => {
    const value = wrapIndex(next, items.length, loop);
    if (manual) setPlaying(false);
    if (index === undefined) setLocalIndex(value);
    onIndexChange?.(value);
  }, [index, items.length, loop, onIndexChange]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const mobileQuery = window.matchMedia("(max-width: 639px)");
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMobile = () => setMobile(mobileQuery.matches);
    const syncMotion = () => setReduced(motionQuery.matches);
    const syncPage = () => setPageVisible(document.visibilityState === "visible");
    syncMobile(); syncMotion(); syncPage();
    mobileQuery.addEventListener("change", syncMobile);
    motionQuery.addEventListener("change", syncMotion);
    document.addEventListener("visibilitychange", syncPage);
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.2 });
    observer.observe(root);
    return () => {
      mobileQuery.removeEventListener("change", syncMobile);
      motionQuery.removeEventListener("change", syncMotion);
      document.removeEventListener("visibilitychange", syncPage);
      observer.disconnect();
    };
  }, [items.length]);

  useEffect(() => {
    const canvas = canvasRef.current;
    setCanvasVisible(false);
    if (!canvas || reduced) return;
    let renderer: MorphRenderer | null = null;
    try {
      renderer = createMorphRenderer(canvas, JSON.parse(sourceKey), {
        initialIndex: activeRef.current, duration, noiseScale, edge, drift, loop,
        onVisibility: setCanvasVisible,
        onRestore: () => setGeneration(value => value + 1),
      });
      rendererRef.current = renderer;
    } catch {
      // Keep the fully functional DOM gallery when WebGL is unavailable.
    }
    return () => { renderer?.dispose(); rendererRef.current = null; };
  }, [sourceKey, duration, noiseScale, edge, drift, loop, reduced, generation]);

  useEffect(() => { rendererRef.current?.show(active); }, [active]);

  const autoRunning = playing && autoplay > 0 && !reduced && visible && pageVisible && !hovered && !focused && items.length > 1 && (loop || active < items.length - 1);
  useEffect(() => {
    if (!autoRunning) return;
    const timer = setTimeout(() => go(active + 1, false), Math.max(autoplay, duration + 1800));
    return () => clearTimeout(timer);
  }, [autoRunning, active, autoplay, duration, go]);

  function handleKey(event: KeyboardEvent<HTMLElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    go(event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : active + (event.key === "ArrowRight" ? 1 : -1));
  }

  function endSwipe(event: PointerEvent<HTMLDivElement>) {
    const start = swipe.current;
    swipe.current = null;
    if (!start || start.id !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    const dx = event.clientX - start.x;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(event.clientY - start.y)) go(active + (dx < 0 ? 1 : -1));
  }

  if (!current) return null;

  return (
    <section ref={rootRef} aria-label="Paşa Home duyuruları" aria-roledescription="slayt gösterisi"
      className={`${styles.gallery} ${className}`} onKeyDown={handleKey}
      onPointerEnter={event => { if (event.pointerType === "mouse") setHovered(true); }}
      onPointerLeave={() => setHovered(false)} onFocusCapture={() => setFocused(true)}
      onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
      <div className={styles.stage}
        onPointerDown={event => {
          if (!event.isPrimary || event.button !== 0 || (event.target as HTMLElement).closest("button")) return;
          swipe.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
          event.currentTarget.setPointerCapture(event.pointerId);
        }} onPointerUp={endSwipe} onPointerCancel={() => { swipe.current = null; }}>
        {items.map((item, itemIndex) => <BannerImage key={`${item.id}:${item.src}:${item.mobileSrc}`} item={item} active={itemIndex === active} priority={itemIndex === 0} />)}
        <canvas ref={canvasRef} className={styles.canvas} data-ready={canvasVisible} aria-hidden="true" />
        <span className={styles.brand} aria-hidden="true">PAŞA HOME <span> / </span> YAŞAMINIZA DOKUNAN DESENLER</span>
        {items.length > 1 && <>
          <button type="button" className={`${styles.arrow} ${styles.previous}`} aria-label="Önceki duyuru" disabled={!loop && active === 0} onClick={() => go(active - 1)}><ArrowLeftIcon className="h-5 w-5" aria-hidden="true" /></button>
          <button type="button" className={`${styles.arrow} ${styles.next}`} aria-label="Sonraki duyuru" disabled={!loop && active === items.length - 1} onClick={() => go(active + 1)}><ArrowRightIcon className="h-5 w-5" aria-hidden="true" /></button>
        </>}
      </div>

      <div className={styles.toolbar}>
        <div className={styles.caption}>
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/45">PAŞA HOME KOLEKSİYONLARI</p>
          {current.href ? <a href={current.href} className="mt-1 inline-flex min-h-8 items-center gap-3 text-sm text-white/90">Koleksiyonu keşfet <ArrowUpRightIcon className="h-4 w-4" aria-hidden="true" /></a> : <p className="mt-2 text-sm text-white/90">Yaşam alanınıza yeni bir dokunuş.</p>}
        </div>
        {items.length > 1 && <div className={styles.thumbnails} role="group" aria-label="Duyuru seçimi">
          {items.map((item, itemIndex) => <button key={item.id} type="button" aria-label={`${itemIndex + 1}. duyuruya git`} aria-current={itemIndex === active ? "true" : undefined}
            className={styles.thumbnail} onClick={() => go(itemIndex)}>
            <Image src={item.thumb || (mobile && item.mobileSrc ? item.mobileSrc : item.src)} alt="" fill unoptimized sizes="72px" className="object-cover" />
          </button>)}
        </div>}
        <div className="flex shrink-0 items-center gap-3 sm:gap-5">
          <p className="text-[11px] tabular-nums tracking-[0.14em] text-white/90">{String(active + 1).padStart(2, "0")} <span className="mx-1 text-white/30">/ {String(items.length).padStart(2, "0")}</span></p>
          {items.length > 1 && autoplay > 0 && !reduced && <button type="button" className={styles.play} aria-label={playing ? "Duyuru geçişini durdur" : "Duyuru geçişini başlat"}
            onClick={() => { setPlaying(value => !value); setHovered(false); setFocused(false); }}>
            {playing ? <PauseIcon className="h-4 w-4" aria-hidden="true" /> : <PlayIcon className="h-4 w-4" aria-hidden="true" />}
          </button>}
        </div>
      </div>
      <p className="sr-only" aria-live={autoRunning ? "off" : "polite"} aria-atomic="true">{current.alt} — {active + 1} / {items.length}</p>
    </section>
  );
}
