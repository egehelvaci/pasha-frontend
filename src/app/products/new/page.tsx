'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createProduct, CreateProductData } from '@/services/api';

export default function NewProduct() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const imageFile = (form.querySelector('input[type="file"]') as HTMLInputElement).files?.[0];

    if (!imageFile) {
      setError('Lütfen bir ürün görseli seçin');
      setLoading(false);
      return;
    }

    try {
      const productData: CreateProductData = {
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        stock: parseInt(formData.get('stock') as string),
        width: parseFloat(formData.get('width') as string),
        height: parseFloat(formData.get('height') as string),
        cut: formData.get('cut') === 'true',
        collectionId: formData.get('collectionId') as string,
        productImage: imageFile,
      };

      const response = await createProduct(productData);
      
      if (response.success) {
        router.push(`/products/${response.data.productId}`);
      } else {
        setError('Ürün oluşturulurken bir hata oluştu');
      }
    } catch (err) {
      setError('Ürün oluşturulurken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Yeni Ürün Ekle</h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Ürün Adı
            </label>
            <input
              type="text"
              name="name"
              required
              className="w-full px-3 py-2 border rounded-md"
              placeholder="Ürün adını girin"
            />
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Açıklama
            </label>
            <textarea
              name="description"
              required
              className="w-full px-3 py-2 border rounded-md"
              rows={4}
              placeholder="Ürün açıklamasını girin"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Stok
              </label>
              <input
                type="number"
                name="stock"
                required
                min="0"
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Stok miktarı"
              />
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Koleksiyon ID
              </label>
              <input
                type="text"
                name="collectionId"
                required
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Koleksiyon ID"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Genişlik (cm)
              </label>
              <input
                type="number"
                name="width"
                required
                step="0.1"
                min="0"
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Genişlik"
              />
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Yükseklik (cm)
              </label>
              <input
                type="number"
                name="height"
                required
                step="0.1"
                min="0"
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Yükseklik"
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Kesim
            </label>
            <select
              name="cut"
              required
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="true">Var</option>
              <option value="false">Yok</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Ürün Görseli
            </label>
            <input
              type="file"
              name="productImage"
              accept="image/*"
              required
              onChange={handleImageChange}
              className="w-full"
            />
            {imagePreview && (
              <div className="mt-4">
                <img
                  src={imagePreview}
                  alt="Önizleme"
                  className="max-w-xs rounded-md"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 