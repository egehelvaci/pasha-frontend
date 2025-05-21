"use client";
import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface Product {
  productId: string;
  name: string;
  description: string;
  imageUrl: string | null;
}

interface Collection {
  collectionId: string;
  name: string;
  description: string;
  code: string;
  coverImageUrl: string | null;
  products: Product[];
  createdAt: string;
}

export default function CollectionDetail() {
  const params = useParams();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchCollection = async () => {
      try {
        const res = await fetch(`https://pasha-backend-production.up.railway.app/api/collections/${params.collectionId}`);
        if (!res.ok) throw new Error("Koleksiyon bulunamadı");
        const data = await res.json();
        setCollection(data.data);
      } catch (err: any) {
        setError(err.message || "Bir hata oluştu");
      } finally {
        setLoading(false);
      }
    };

    fetchCollection();
  }, [params.collectionId]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="text-center py-8 text-black">Yükleniyor...</div>
      </div>
    );
  }

  if (error || !collection) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="text-center py-8 text-red-500">{error || "Koleksiyon bulunamadı"}</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-black">{collection.name}</h1>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-black mb-4">Koleksiyon Bilgileri</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Koleksiyon Kodu</p>
            <p className="text-black">{collection.code}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Eklenme Tarihi</p>
            <p className="text-black">
              {new Date(collection.createdAt).toLocaleDateString('tr-TR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
          <div className="md:col-span-2">
            <p className="text-sm text-gray-500">Açıklama</p>
            <p className="text-black">{collection.description}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold text-black mb-4">Ürünler ({collection.products.length})</h2>
        {collection.products.length === 0 ? (
          <div className="text-center py-8 text-black">Bu koleksiyonda henüz ürün bulunmuyor.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {collection.products.map(product => (
              <div key={product.productId} className="border rounded-lg p-4 hover:bg-gray-100 transition-colors duration-200">
                {product.imageUrl && (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-48 object-cover rounded-lg mb-4"
                  />
                )}
                <h3 className="font-semibold text-black mb-2">{product.name}</h3>
                <p className="text-sm text-gray-600 mb-2">{product.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 