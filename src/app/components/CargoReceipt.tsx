'use client';

import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import Image from 'next/image';
import { PrinterIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { Order } from '@/services/api';
import { useAuth } from '@/app/context/AuthContext';

type CargoItem = Order['items'][number] & {
  product?: { name?: string; productCode?: string };
  width?: string;
  height?: string;
};
type CargoOrder = Omit<Order, 'items'> & { items: CargoItem[]; notes?: string };

interface CargoReceiptProps {
  order: CargoOrder;
  orders?: CargoOrder[];
  isVisible: boolean;
  onClose: () => void;
}

const sender = {
  name: 'PAŞA HOME Tekstil San. ve Tic. Ltd. Şti.',
  phone: '+90 555 234 58 91',
  address: 'Güneşli Mah. Mahmutbey Cad. 1296. Sok. No:3 Daire:1 Bağcılar / İstanbul',
};

function addressFor(order: CargoOrder) {
  if (order.address) return `${order.address.address}, ${order.address.district} / ${order.address.city}${order.address.postal_code ? ` · ${order.address.postal_code}` : ''}`;
  return order.delivery_address || 'Adres belirtilmemiş';
}

function CargoSlip({ order, index, total }: { order: CargoOrder; index: number; total: number }) {
  const [qr, setQr] = useState('');
  const code = order.id.slice(0, 12).toUpperCase();
  const quantity = order.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const items = order.items.slice(0, 6);
  useEffect(() => {
    let active = true;
    QRCode.toDataURL(`PASAHOME:ORDER:${order.id}`, { width: 220, margin: 0, errorCorrectionLevel: 'M', color: { dark: '#000000', light: '#ffffff' } })
      .then(value => { if (active) setQr(value); }).catch(() => setQr(''));
    return () => { active = false; };
  }, [order.id]);

  return (
    <article className="cargo-slip" aria-label={`${code} numaralı kargo fişi`}>
      <header className="cargo-slip__header">
        <div><p className="cargo-slip__brand">PAŞA HOME</p><p className="cargo-slip__label">KARGO SEVK FİŞİ</p></div>
        <div className="cargo-slip__meta"><strong>{code}</strong><span>{new Date(order.created_at).toLocaleDateString('tr-TR')}</span>{total > 1 && <span>{index + 1} / {total}</span>}</div>
      </header>

      <section className="cargo-slip__receiver">
        <p className="cargo-slip__kicker">ALICI</p>
        <h2>{order.store_name || 'Firma belirtilmemiş'}</h2>
        <p>{addressFor(order)}</p>
        <div className="cargo-slip__contact"><span><b>Yetkili:</b> {order.user ? `${order.user.name} ${order.user.surname}` : 'Belirtilmemiş'}</span><span><b>Telefon:</b> {order.store_phone || order.user?.phone || 'Belirtilmemiş'}</span></div>
      </section>

      <div className="cargo-slip__grid">
        <section className="cargo-slip__box"><p className="cargo-slip__kicker">GÖNDERİCİ</p><strong>{sender.name}</strong><p>{sender.address}</p><p>{sender.phone}</p></section>
        <section className="cargo-slip__box cargo-slip__summary"><p className="cargo-slip__kicker">GÖNDERİ ÖZETİ</p><dl><div><dt>Kalem</dt><dd>{order.items.length}</dd></div><div><dt>Toplam adet</dt><dd>{quantity}</dd></div><div><dt>Sipariş</dt><dd>{code}</dd></div></dl></section>
      </div>

      <section className="cargo-slip__items">
        <div className="cargo-slip__row cargo-slip__row--head"><span>ÜRÜN</span><span>ÖLÇÜ</span><span>ADET</span></div>
        {items.map((item, itemIndex) => <div className="cargo-slip__row" key={'id' in item && item.id ? String(item.id) : itemIndex}><span>{item.product?.name || `Ürün ${itemIndex + 1}`}</span><span>{item.width && item.height ? `${item.width} × ${item.height}` : '—'}</span><span>{item.quantity}</span></div>)}
        {order.items.length > items.length && <div className="cargo-slip__more">+ {order.items.length - items.length} ek ürün kalemi</div>}
      </section>

      <footer className="cargo-slip__footer">
        <div className="cargo-slip__code"><span>TAKİP / SİPARİŞ KODU</span><strong>{code}</strong><div className="cargo-slip__bars" aria-hidden="true" /></div>
        {qr ? <Image src={qr} alt={`${code} sipariş QR kodu`} width={220} height={220} unoptimized className="cargo-slip__qr" /> : <div className="cargo-slip__qr cargo-slip__qr--empty" />}
      </footer>
    </article>
  );
}

export default function CargoReceipt({ order, orders, isVisible, onClose }: CargoReceiptProps) {
  const { isAdminOrEditor } = useAuth();
  const slips = useMemo(() => orders?.length ? orders : [order], [order, orders]);
  useEffect(() => {
    if (isVisible && !isAdminOrEditor) onClose();
  }, [isVisible, isAdminOrEditor, onClose]);
  useEffect(() => {
    if (!isVisible) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [isVisible]);
  if (!isVisible || !isAdminOrEditor) return null;

  return (
    <div className="cargo-print-root fixed inset-0 z-[100] overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-sm sm:p-8" role="dialog" aria-modal="true" aria-labelledby="cargo-preview-title">
      <div className="cargo-preview-chrome mx-auto mb-4 flex max-w-[760px] items-center justify-between rounded-2xl border border-white/15 bg-[#153b4d] px-5 py-4 text-white shadow-xl">
        <div><p className="text-[10px] uppercase tracking-[.18em] text-white/60">A5 · 148 × 210 mm</p><h2 id="cargo-preview-title" className="mt-1 text-lg font-semibold">Kargo fişi önizleme</h2><p className="mt-1 text-xs text-white/65">{slips.length} fiş · her fiş ayrı A5 sayfasına basılır</p></div>
        <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Önizlemeyi kapat"><XMarkIcon className="h-5 w-5" /></button>
      </div>
      <div className="cargo-preview-pages mx-auto flex max-w-[760px] flex-col items-center gap-6">
        {slips.map((slip, index) => <CargoSlip key={slip.id} order={slip} index={index} total={slips.length} />)}
      </div>
      <div className="cargo-preview-chrome sticky bottom-4 mx-auto mt-4 flex max-w-[760px] items-center justify-end gap-3 rounded-2xl border border-[#deddd5] bg-white/95 p-3 shadow-xl backdrop-blur">
        <button type="button" onClick={onClose} className="secondary-action !min-h-11">Kapat</button>
        <button type="button" onClick={() => window.print()} className="primary-action !min-h-11"><PrinterIcon className="h-4 w-4" /> {slips.length > 1 ? `${slips.length} fişi yazdır` : 'A5 yazdır'}</button>
      </div>
    </div>
  );
}
