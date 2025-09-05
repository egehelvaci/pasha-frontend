'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Product, getProductById, deleteProduct } from '@/services/api';
import Image from 'next/image';

export default function ProductDetail() {
  const params = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const productId = params.id as string;
        const data = await getProductById(productId);
        setProduct(data);
        setLoading(false);
      } catch (err) {
        setError('Ürün detayı yüklenirken bir hata oluştu');
        setLoading(false);
      }
    };

    fetchProduct();
  }, [params.id]);

  const handleDelete = async () => {
    if (!product) return;
    
    setDeleting(true);
    try {
      const response = await deleteProduct(product.productId);
      if (response.success) {
        router.push('/');
      } else {
        setError('Ürün silinirken bir hata oluştu');
        setShowDeleteModal(false);
      }
    } catch (err) {
      setError('Ürün silinirken bir hata oluştu');
      setShowDeleteModal(false);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Yükleniyor...</div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-red-500">{error || 'Ürün bulunamadı'}</div>
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-800 flex items-center"
          >
            ← Geri Dön
          </button>
          <div className="flex gap-4">
            <button
              onClick={() => router.push(`/products/${product.productId}/edit`)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Düzenle
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Sil
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="md:flex">
            <div className="md:w-1/2">
              <div className="relative h-96">
                <Image
                  src={product.productImage}
                  alt={product.name}
                  fill
                  className="object-cover"
                />
              </div>
            </div>
            <div className="md:w-1/2 p-8">
              <div className="uppercase tracking-wide text-sm text-indigo-500 font-semibold">
                {product.collection_name}
              </div>
              <h1 className="mt-2 text-3xl font-bold text-gray-900">
                {product.name}
              </h1>
              <p className="mt-4 text-gray-600">{product.description}</p>

              <div className="mt-8 border-t pt-8">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-500">Stok Durumu</span>
                    <p className="font-semibold">{product.stock} adet</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Kesim</span>
                    <p className="font-semibold">{product.cut ? 'Var' : 'Yok'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Genişlik</span>
                    <p className="font-semibold">{product.width} cm</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Boy</span>
                    <p className="font-semibold">{product.height} cm</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 text-sm text-gray-500">
                <p>Oluşturulma: {new Date(product.createdAt).toLocaleDateString('tr-TR')}</p>
                <p>Son Güncelleme: {new Date(product.updatedAt).toLocaleDateString('tr-TR')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Silme Onay Modalı */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-4">Ürünü Sil</h2>
            <p className="text-gray-600 mb-6">
              "{product.name}" ürününü silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                disabled={deleting}
              >
                İptal
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Siliniyor...' : 'Sil'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 