'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Product, getProductById, updateProduct, UpdateProductData } from '@/services/api';

export default function EditProduct() {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formData, setFormData] = useState<UpdateProductData>({});

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const productId = params.id as string;
        const data = await getProductById(productId);
        setProduct(data);
        setFormData({
          name: data.name,
          description: data.description,
          stock: data.stock,
          width: data.width,
          height: data.height,
          cut: data.cut,
          collectionId: data.collectionId,
        });
        setImagePreview(data.productImage);
        setLoading(false);
      } catch (err) {
        setError('Ürün bilgileri yüklenirken bir hata oluştu');
        setLoading(false);
      }
    };

    fetchProduct();
  }, [params.id]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const form = e.currentTarget;
      const imageFile = (form.querySelector('input[type="file"]') as HTMLInputElement).files?.[0];
      
      const updateData: UpdateProductData = {
        ...formData,
      };

      if (imageFile) {
        updateData.productImage = imageFile;
      }

      const response = await updateProduct(params.id as string, updateData);
      
      if (response.success) {
        router.push(`/products/${response.data.productId}`);
      } else {
        setError('Ürün güncellenirken bir hata oluştu');
      }
    } catch (err) {
      setError('Ürün güncellenirken bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    let parsedValue: string | number | boolean = value;
    
    if (type === 'number') {
      parsedValue = value === '' ? undefined : Number(value);
    } else if (name === 'cut') {
      parsedValue = value === 'true';
    }

    setFormData(prev => ({
      ...prev,
      [name]: parsedValue
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Yükleniyor...</div>
      </div>
    );
  }

  if (error && !product) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Ürün Düzenle</h1>

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
              value={formData.name || ''}
              onChange={handleInputChange}
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
              value={formData.description || ''}
              onChange={handleInputChange}
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
                value={formData.stock || ''}
                onChange={handleInputChange}
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
                value={formData.collectionId || ''}
                onChange={handleInputChange}
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
                value={formData.width || ''}
                onChange={handleInputChange}
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
                value={formData.height || ''}
                onChange={handleInputChange}
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
              value={formData.cut?.toString() || 'false'}
              onChange={handleInputChange}
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
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 