export default function ProductSkeleton() {
  return (
    <div role="status" aria-label="Ürünler yükleniyor">
      <span className="sr-only">Ürünler yükleniyor…</span>
      <div aria-hidden="true" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="surface overflow-hidden p-3">
            <div className="skeleton aspect-square rounded-xl" />
            <div className="skeleton mt-5 h-3 w-1/3 rounded" />
            <div className="skeleton mb-4 mt-3 h-5 w-3/4 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
