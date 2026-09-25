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

export function getConsumableAreaM2ForWidth(
  product: { stock?: { consumableAreaM2?: unknown; widths?: Array<{ width?: unknown; consumableAreaM2?: unknown }> } | number | null } | null | undefined,
  width: number
): number {
  const stock = product?.stock;
  if (typeof stock !== 'object' || stock === null) return 0;
  const widths = Array.isArray(stock.widths) ? stock.widths : [];
  if (widths.length === 0) return toNumber(stock.consumableAreaM2);
  const match = widths.find((item) => toNumber(item?.width) === toNumber(width));
  return match ? toNumber(match.consumableAreaM2) : 0;
}

export function sortSizeOptionsByWidth<T extends { width?: unknown; height?: unknown; is_optional_height?: boolean }>(sizes: T[]): T[] {
  return [...sizes].sort((a, b) => {
    const widthDiff = toNumber(a.width) - toNumber(b.width);
    if (widthDiff !== 0) return widthDiff;
    if (Boolean(a.is_optional_height) !== Boolean(b.is_optional_height)) return a.is_optional_height ? 1 : -1;
    return toNumber(a.height) - toNumber(b.height);
  });
}

export function formatSizeOptionLabel(size: { width?: unknown; height?: unknown; is_optional_height?: boolean }): string {
  return size.is_optional_height
    ? `${toNumber(size.width)}xÖzel`
    : `${toNumber(size.width)}x${toNumber(size.height)}`;
}

export function formatStockM2(area: number): string {
  const rounded = Math.round(area * 100) / 100;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
  return `${text} m²`;
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
  const consumableAreaM2 = getConsumableAreaM2ForWidth(product, width);
  if (consumableAreaM2 < requestedAreaM2) return STOCK_SHORTAGE_MESSAGE;
  return null;
}
