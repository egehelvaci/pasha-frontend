"use client";

import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeftIcon, ArrowRightIcon, ArrowUpRightIcon, ArrowsPointingOutIcon, PauseIcon, PlayIcon, XMarkIcon } from "@heroicons/react/24/outline";
import styles from "./product-rail-gallery.module.css";

export interface RailProduct {
  id: string;
  name: string;
  image?: string | null;
  description?: string;
}

export interface ProductRailGalleryProps {
  items: RailProduct[];
  heading: string;
  description?: string;
  autoplay?: boolean;
  interval?: number;
}

function RugImage({ item, large = false }: { item: RailProduct; large?: boolean }) {
  const [failedSource, setFailedSource] = useState<string | null>();
  const available = item.image && failedSource !== item.image;
  return (
    <>
      <Image src={available ? item.image! : "/black-logo.svg"} alt={available ? item.name : `${item.name} — görsel hazırlanıyor`}
        fill sizes={large ? "(max-width: 767px) 90vw, 600px" : "(max-width: 767px) 220px, 280px"}
        unoptimized={Boolean(available)} draggable={false} onError={() => setFailedSource(item.image)}
        className={`object-contain ${available ? "" : "p-10 opacity-30"}`} />
      {!available && <span className="absolute inset-x-2 bottom-7 text-center text-[10px] text-slate-500">Görsel hazırlanıyor</span>}
    </>
  );
}

export default function ProductRailGallery({ items, heading, description, autoplay = true, interval = 4500 }: ProductRailGalleryProps) {
  const titleId = useId();
  const hintId = useId();
  const detailTitleId = useId();
  const stageRef = useRef<HTMLDivElement>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const gesture = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(autoplay);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [visible, setVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const currentIndex = Math.min(active, Math.max(0, items.length - 1));
  const current = items[currentIndex];

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const resize = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    const intersection = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.3 });
    resize.observe(stage);
    intersection.observe(stage);
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(preference.matches);
    const updateVisibility = () => setPageVisible(document.visibilityState === "visible");
    updatePreference();
    updateVisibility();
    preference.addEventListener("change", updatePreference);
    document.addEventListener("visibilitychange", updateVisibility);
    return () => {
      resize.disconnect();
      intersection.disconnect();
      preference.removeEventListener("change", updatePreference);
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, [items.length]);

  useEffect(() => {
    if (!playing || reducedMotion || !visible || !pageVisible || open || items.length < 2) return;
    const timer = setInterval(() => setActive(index => (index + 1) % items.length), Math.max(2000, interval));
    return () => clearInterval(timer);
  }, [playing, reducedMotion, visible, pageVisible, open, items.length, interval]);

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const returnToProduct = buttons.current.includes(opener as HTMLButtonElement);
    const stage = stageRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    closeRef.current?.focus();
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      const target = returnToProduct ? stage?.querySelector<HTMLButtonElement>('[aria-current="true"]') : opener;
      target?.focus({ preventScroll: true });
    };
  }, [open]);

  function choose(index: number, focus = false) {
    const next = Math.max(0, Math.min(index, items.length - 1));
    setPlaying(false);
    setActive(next);
    if (focus) buttons.current[next]?.focus({ preventScroll: true });
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    choose(event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : currentIndex + (event.key === "ArrowRight" ? 1 : -1), true);
  }

  function finishGesture(event: PointerEvent<HTMLDivElement>, cancelled = false) {
    const start = gesture.current;
    if (!start || start.id !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    gesture.current = null;
    if (cancelled || !start.moved) return;
    suppressClick.current = true;
    const dx = event.clientX - start.x;
    if (Math.abs(dx) > 35) choose(currentIndex + (dx < 0 ? 1 : -1));
  }

  if (!current) return null;

  // Turned rugs occupy narrow slots; the selected rug has room to face forward.
  const mobile = width < 768;
  const rugWidth = mobile ? Math.min(230, Math.max(160, width * 0.57)) : Math.min(270, (width - 96) / (1.12 + (items.length - 1) * 0.42));
  const rugHeight = rugWidth * 1.46;
  const slots = items.map((_, index) => rugWidth * (index === currentIndex ? 1.12 : 0.42));
  const totalWidth = slots.reduce((sum, slot) => sum + slot, 0);
  let cursor = 0;
  const centers = slots.map(slot => { const center = cursor + slot / 2; cursor += slot; return center; });
  const offset = mobile ? width / 2 - centers[currentIndex] : (width - totalWidth) / 2;

  return (
    <section className={styles.gallery} aria-labelledby={titleId}>
      <div className="flex flex-wrap items-start justify-between gap-4 px-5 pt-6 sm:px-9 sm:pt-8">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#8c7d68]">KOLEKSİYON VİTRİNİ</p>
          <h3 id={titleId} className="mt-2 text-xl font-medium tracking-tight text-[#183342] sm:text-2xl">{heading}</h3>
        </div>
        <span className="rounded-full border border-[#d8d2c5] px-3 py-1.5 text-[11px] text-[#7c7467]">{items.length} desen</span>
      </div>
      {description && <p className="px-5 pt-3 text-sm text-slate-500 sm:px-9">{description}</p>}

      <div ref={stageRef} className={styles.stage} style={{ height: rugHeight + 118 }}
        role="group" aria-label={`${heading} halıları`} aria-describedby={hintId} onKeyDown={handleKeyDown}
        onPointerDown={event => {
          if (event.button !== 0 || !event.isPrimary) return;
          setPlaying(false);
          suppressClick.current = false;
          gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
        }}
        onPointerMove={event => {
          const start = gesture.current;
          if (!start || start.id !== event.pointerId) return;
          const dx = Math.abs(event.clientX - start.x);
          if (dx > 10 && dx > Math.abs(event.clientY - start.y)) {
            start.moved = true;
            event.currentTarget.setPointerCapture(event.pointerId);
          }
        }}
        onPointerUp={event => finishGesture(event)} onPointerCancel={event => finishGesture(event, true)}>
        <div className={styles.rail} aria-hidden="true"><span /><span /></div>
        <div className={styles.floor} aria-hidden="true" />
        {items.map((item, index) => {
          const selected = index === currentIndex;
          const x = centers[index] + offset;
          return (
            <div key={item.id} className={styles.slot} data-active={selected}
              style={{ "--rug-width": `${rugWidth}px`, "--rug-height": `${rugHeight}px`, width: slots[index], transform: `translateX(${x - slots[index] / 2}px)`, zIndex: selected ? 20 : items.length - index } as CSSProperties}>
              <button ref={node => { buttons.current[index] = node; }} type="button"
                className={styles.product} tabIndex={selected ? 0 : -1} aria-label={`${item.name} — yakından incele`}
                aria-haspopup="dialog" aria-current={selected ? "true" : undefined}
                onPointerEnter={event => { if (!mobile && event.pointerType === "mouse" && !gesture.current) choose(index); }}
                onFocus={() => choose(index)} onClick={event => {
                  if (suppressClick.current && event.detail !== 0) { suppressClick.current = false; return; }
                  choose(index);
                  setOpen(true);
                }}>
                <span className={styles.rug}>
                  <span className={styles.hanger} aria-hidden="true"><span /><span /></span>
                  <span className={styles.photo}><RugImage item={item} /></span>
                  <span className={styles.number} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                </span>
              </button>
            </div>
          );
        })}
      </div>

      <div className="relative flex flex-col items-center px-5 pb-7 text-center sm:pb-9">
        <p className="text-[10px] tabular-nums tracking-[0.2em] text-[#8c7d68]">{String(currentIndex + 1).padStart(2, "0")} <span className="mx-1 text-[#b9b0a0]">/</span> {String(items.length).padStart(2, "0")}</p>
        <h4 className="mt-2 text-base font-medium text-[#183342] sm:text-lg" aria-live={playing ? "off" : "polite"}>{current.name}</h4>
        <button type="button" onClick={() => { setPlaying(false); setOpen(true); }} className="mt-4 inline-flex min-h-11 items-center gap-3 rounded-full border border-[#c4c7bc] bg-white/60 px-5 text-xs font-medium text-[#183342] hover:bg-white">
          <ArrowsPointingOutIcon className="h-4 w-4" aria-hidden="true" /> Yakından incele
        </button>
        <div className="mt-6 flex items-center gap-3" aria-label="Vitrin kontrolleri">
          <button type="button" className={styles.control} onClick={() => choose(currentIndex - 1)} disabled={currentIndex === 0} aria-label="Önceki halı"><ArrowLeftIcon aria-hidden="true" className="h-4 w-4" /></button>
          {items.length > 1 && !reducedMotion && <button type="button" className={styles.control} onClick={() => setPlaying(value => !value)} aria-label={playing ? "Otomatik geçişi durdur" : "Otomatik geçişi başlat"}>{playing ? <PauseIcon className="h-4 w-4" aria-hidden="true" /> : <PlayIcon className="h-4 w-4" aria-hidden="true" />}</button>}
          <button type="button" className={styles.control} onClick={() => choose(currentIndex + 1)} disabled={currentIndex === items.length - 1} aria-label="Sonraki halı"><ArrowRightIcon aria-hidden="true" className="h-4 w-4" /></button>
        </div>
        <p id={hintId} className="mt-4 text-[11px] leading-5 text-[#8c8375]"><span className="hidden md:inline">Keşfetmek için halıların üzerine gelin, </span><span className="md:hidden">Halılar arasında kaydırın, </span>incelemek için dokunun.</p>
      </div>

      <dialog ref={dialogRef} className={styles.dialog} aria-labelledby={detailTitleId}
        onCancel={event => { event.preventDefault(); setOpen(false); }} onClose={() => setOpen(false)}
        onClick={event => { if (event.target === event.currentTarget) setOpen(false); }}>
        {open && <div className={styles.dialogContent}>
          <button ref={closeRef} type="button" onClick={() => setOpen(false)} className={`${styles.control} ${styles.close}`} aria-label="Ürün detayını kapat"><XMarkIcon className="h-5 w-5" aria-hidden="true" /></button>
          <div className={styles.detailPhoto}><RugImage key={current.id} item={current} large /></div>
          <div className="flex flex-col items-start p-6 md:py-14 md:pl-2 md:pr-10">
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#8c7d68]">{heading}</p>
            <h3 id={detailTitleId} className="mt-3 text-2xl font-medium tracking-tight text-[#183342] sm:text-3xl">{current.name}</h3>
            {current.description && <p className="mt-5 text-sm leading-7 text-slate-600">{current.description}</p>}
            <p className="mt-5 text-sm leading-7 text-slate-500">Fiyat, ölçü ve stok bilgilerini bayi girişi yaparak inceleyebilirsiniz.</p>
            <Link href="/login" className="primary-action mt-6">Bayi girişi <ArrowUpRightIcon className="h-4 w-4" aria-hidden="true" /></Link>
            <div className="mt-10 flex items-center gap-4">
              <button type="button" className={styles.control} onClick={() => choose(currentIndex - 1)} disabled={currentIndex === 0} aria-label="Detayda önceki halı"><ArrowLeftIcon className="h-4 w-4" aria-hidden="true" /></button>
              <span className="text-xs tabular-nums text-slate-500">{currentIndex + 1} / {items.length}</span>
              <button type="button" className={styles.control} onClick={() => choose(currentIndex + 1)} disabled={currentIndex === items.length - 1} aria-label="Detayda sonraki halı"><ArrowRightIcon className="h-4 w-4" aria-hidden="true" /></button>
            </div>
          </div>
        </div>}
      </dialog>
    </section>
  );
}
