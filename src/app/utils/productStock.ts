export function toNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function calculateAreaM2(width: number, height: number, quantity = 1): number {
  return (width * height * quantity) / 10000;
}

export function isCommonStockEnabled(product: { stock?: { enabled?: boolean } | number | null } | null | undefined): boolean {
  const stock = product?.stock;
  return typeof stock === 'object' && stock !== null && stock.enabled === true;
}

export function getConsumableAreaM2(product: { stock?: { consumableAreaM2?: unknown } | number | null } | null | undefined): number {
  const stock = product?.stock;
  if (typeof stock !== 'object' || stock === null) return 0;
  return toNumber(stock.consumableAreaM2);
}

export function toCanonicalCutType(name: string | null | undefined): 'standart' | 'round' | 'oval' | 'custom' {
  const normalized = (name || '').toLocaleLowerCase('tr-TR').trim();
  if (normalized.includes('oval')) return 'oval';
  if (normalized === 'round' || normalized === 'daire' || normalized.includes('yuvarlak')) return 'round';
  if (normalized === 'custom' || normalized.includes('özel') || normalized.includes('ozel')) return 'custom';
  return 'standart';
}

export function isLegacySizeOutOfStock(size: {
  is_optional_height?: boolean;
  stockAreaM2?: unknown;
  stockQuantity?: unknown;
} | null | undefined): boolean {
  if (!size) return false;
  if (size.is_optional_height) return toNumber(size.stockAreaM2) <= 0;
  return toNumber(size.stockQuantity) <= 0;
}

export function isProductOutOfStock(product: any): boolean {
  if (!product) return false;
  if (isCommonStockEnabled(product)) return getConsumableAreaM2(product) <= 0;
  if (Array.isArray(product.sizeOptions) && product.sizeOptions.length > 0) {
    return !product.sizeOptions.some((option: any) => !isLegacySizeOutOfStock(option));
  }
  return toNumber(product.stock) <= 0;
}

const STOCK_SHORTAGE_MESSAGE =
  'Bu ürün stok açığıyla siparişe alınabilir. Siparişiniz tedarik sonrasında hazırlanacaktır.';

export function getStockWarning(
  product: any,
  width: number,
  height: number,
  quantity: number
): string | null {
  if (!isCommonStockEnabled(product)) return null;
  const requestedAreaM2 = calculateAreaM2(width, height, quantity);
  const consumableAreaM2 = getConsumableAreaM2(product);
  if (consumableAreaM2 < requestedAreaM2) return STOCK_SHORTAGE_MESSAGE;
  return null;
}
