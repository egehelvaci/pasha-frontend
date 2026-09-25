import { renderCatalog, type CatalogImage } from './renderCatalog';
import type { CatalogOptions, CatalogProduct, WorkerMessage } from './model';

const send = (message: WorkerMessage, transfer: Transferable[] = []) => self.postMessage(message, { transfer });
let active = 0;
const waiting: Array<() => void> = [];
const cache = new Map<string, Promise<CatalogImage | null>>();
async function loadImage(url: string, origin: string, quality: CatalogOptions['quality']): Promise<CatalogImage | null> {
  if (cache.has(url)) return cache.get(url)!;
  const task = (async () => {
    if (active >= 4) await new Promise<void>(resolve => waiting.push(resolve));
    active++;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const source = new URL(url, origin);
      if (!['http:', 'https:'].includes(source.protocol)) return null;
      const request = async (href: string) => {
        const response = await fetch(href, { signal: controller.signal, credentials: 'omit' });
        if (!response.ok) throw new Error('Görsel alınamadı');
        const blob = await response.blob();
        if (blob.size > 12 * 1024 * 1024) throw new Error('Görsel çok büyük');
        return blob;
      };
      let blob: Blob;
      try { blob = await request(source.href); }
      catch (error) {
        if (controller.signal.aborted || source.origin === origin) throw error;
        // Existing Next image allowlist is enforced server-side; this is not an open proxy.
        blob = await request(`${origin}/_next/image?url=${encodeURIComponent(source.href)}&w=1080&q=80`);
      }
      const bitmap = await createImageBitmap(blob);
      try {
        const max = quality === 'high' ? 1200 : 640;
        const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
        const width = Math.max(1, Math.round(bitmap.width * scale)), height = Math.max(1, Math.round(bitmap.height * scale));
        const canvas = new OffscreenCanvas(width, height);
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Görsel işlenemedi');
        context.fillStyle = '#fff';
        context.fillRect(0, 0, width, height);
        context.drawImage(bitmap, 0, 0, width, height);
        const jpeg = await canvas.convertToBlob({ type: 'image/jpeg', quality: quality === 'high' ? .88 : .76 });
        return { bytes: new Uint8Array(await jpeg.arrayBuffer()), width, height };
      } finally { bitmap.close(); }
    } catch { return null; }
    finally { clearTimeout(timeout); active--; waiting.shift()?.(); }
  })();
  cache.set(url, task);
  if (cache.size > 24) cache.delete(cache.keys().next().value!);
  return task;
}

self.onmessage = async (event: MessageEvent<{ products: CatalogProduct[]; options: CatalogOptions; origin: string }>) => {
  try {
    if (typeof OffscreenCanvas === 'undefined' || typeof createImageBitmap === 'undefined') {
      throw new Error('Bu tarayıcı arka planda PDF üretimini desteklemiyor. Güncel Chrome, Edge, Firefox veya Safari kullanın.');
    }
    const { products, options, origin } = event.data;
    send({ type: 'progress', progress: { phase: 'layout', completed: 0, total: products.length, pages: 0 } });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let font: string;
    try {
      const response = await fetch(`${origin}/fonts/catalog.ttf`, { signal: controller.signal });
      if (!response.ok) throw new Error('Yazı tipi yüklenemedi. Lütfen tekrar deneyin.');
      const bytes = new Uint8Array(await response.arrayBuffer());
      let binary = '';
      for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
      font = btoa(binary);
    } finally { clearTimeout(timeout); }
    const result = await renderCatalog(products, options, {
      font,
      getImage: url => loadImage(url, origin, options.quality),
      progress: progress => send({ type: 'progress', progress }),
    });
    send({ type: 'done', ...result }, [result.buffer]);
  } catch (error) {
    send({ type: 'error', message: error instanceof Error ? error.message : 'Katalog oluşturulamadı.' });
  }
};
