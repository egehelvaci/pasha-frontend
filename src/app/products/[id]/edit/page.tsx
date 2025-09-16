'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useToken } from '../../../hooks/useToken';

interface Product {
  id: string;
  name: string;
  description: string;
  stock: number;
  collectionId: string;
  width: number;
  height: number;
  cut: boolean;
  productImage?: string;
}

export default function EditProduct() {
  const router = useRouter();
  const params = useParams();
  const token = useToken();
  const [product, setProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<Partial<Product>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [imagePreview, setImagePreview] = useState<string>('');

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        if (!token) {
          setError('Giriş yapmanız gerekiyor. Lütfen önce giriş yapın.');
          setLoading(false);
          return;
        }
        
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://pashahomeapps.up.railway.app'}/api/products/${params.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setProduct(result.data);
            setFormData(result.data);
            if (result.data.productImage) {
              setImagePreview(result.data.productImage);
            }
          } else {
            setError(result.message || 'Ürün bulunamadı');
          }
        } else {
          setError('Ürün yüklenirken bir hata oluştu');
        }
      } catch (err) {
        setError('Bağlantı hatası');
      } finally {
        setLoading(false);
      }
    };

    if (params.id && token) {
      fetchProduct();
    }
  }, [params.id, token]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      if (!token) {
        setError('Giriş yapmanız gerekiyor. Lütfen önce giriş yapın.');
        setSaving(false);
        return;
      }
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://pashahomeapps.up.railway.app'}/api/products/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        router.push('/dashboard/urunler/liste');
      } else {
        setError(result.message || 'Ürün güncellenirken bir hata oluştu');
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
      parsedValue = value === '' ? 0 : Number(value);
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
                Boy (cm)
              </label>
              <input
                type="number"
                name="height"
                value={formData.height || ''}
                onChange={handleInputChange}
                step="0.1"
                min="0"
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Boy"
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