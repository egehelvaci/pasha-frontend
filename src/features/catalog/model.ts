export interface CatalogProduct {
  id: string;
  name: string;
  description: string;
  image: string;
  collectionId: string;
  collectionName: string;
}

export interface CatalogOptions {
  title: string;
  layout: 'compact' | 'spacious';
  quality: 'standard' | 'high';
  cover: boolean;
  descriptions: boolean;
}

export const defaultOptions: CatalogOptions = {
  title: 'Paşa Home E-Katalog', layout: 'compact', quality: 'standard', cover: true, descriptions: true,
};
export interface CatalogPage { collection: string; products: CatalogProduct[] }
export type CatalogPhase = 'layout' | 'assets' | 'finalizing';
export interface CatalogProgress { phase: CatalogPhase; completed: number; total: number; pages: number }
export interface CatalogResult { blob: Blob; pages: number; warnings: string[]; elapsedMs: number }
export type WorkerMessage =
  | { type: 'progress'; progress: CatalogProgress }
  | { type: 'done'; buffer: ArrayBuffer; pages: number; warnings: string[] }
  | { type: 'error'; message: string };

export function planCatalogPages(products: CatalogProduct[], options: CatalogOptions): CatalogPage[] {
  const groups = new Map<string, { name: string; products: CatalogProduct[] }>();
  const seen = new Set<string>();
  for (const product of products) {
    if (seen.has(product.id)) continue;
    seen.add(product.id);
    const key = product.collectionId || product.collectionName;
    const group = groups.get(key) || { name: product.collectionName || 'Diğer ürünler', products: [] };
    group.products.push(product);
    groups.set(key, group);
  }
  const size = options.layout === 'compact' ? 6 : 4;
  return Array.from(groups.values()).flatMap(group => {
    const pages: CatalogPage[] = [];
    for (let i = 0; i < group.products.length; i += size) pages.push({ collection: group.name, products: group.products.slice(i, i + size) });
    return pages;
  });
}

export function normalizeCatalogProduct(value: unknown): CatalogProduct {
  if (!value || typeof value !== 'object') throw new Error('Ürün verisi geçersiz.');
  const item = value as Record<string, unknown>;
  if (typeof item.productId !== 'string' || !item.productId || typeof item.name !== 'string') throw new Error('Ürün bilgileri eksik.');
  const collection = item.collection as { name?: unknown } | null;
  return {
    id: item.productId, name: item.name.slice(0, 300),
    description: typeof item.description === 'string' ? item.description.slice(0, 1000) : '',
    image: typeof item.productImage === 'string' ? item.productImage : '',
    collectionId: typeof item.collectionId === 'string' ? item.collectionId : '',
    collectionName: typeof collection?.name === 'string' ? collection.name : 'Diğer ürünler',
  };
}

/** Restored drafts are user-scoped snapshots, never credentials or prices. */
export function parseCatalogDraft(raw: string): { products: CatalogProduct[]; options: CatalogOptions } {
  const draft = JSON.parse(raw);
  if (draft.version !== 1 || !Array.isArray(draft.products)) throw new Error('Geçersiz taslak');
  const products = draft.products.filter((p: CatalogProduct) => p && ['id', 'name', 'description', 'image', 'collectionId', 'collectionName'].every(key => typeof p[key as keyof CatalogProduct] === 'string'));
  const value = draft.options || {};
  return { products, options: {
    title: typeof value.title === 'string' ? value.title.slice(0, 80) : defaultOptions.title,
    layout: value.layout === 'spacious' ? 'spacious' : 'compact',
    quality: value.quality === 'high' ? 'high' : 'standard',
    cover: value.cover !== false, descriptions: value.descriptions !== false,
  } };
}
