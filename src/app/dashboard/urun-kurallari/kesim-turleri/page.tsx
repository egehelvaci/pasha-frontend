'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';

export default function CutTypesPage() {
  const router = useRouter();
  const { isAdmin, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading) {
      router.push('/dashboard/urun-kurallari');
    }
  }, [authLoading, router]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Bu sayfa artık kullanılamıyor
          </h1>
          <p className="text-gray-600 mb-6">
            Kesim türleri yönetimi kaldırılmıştır. Ürün kuralları sayfasına yönlendiriliyorsunuz...
          </p>
        </div>
      </div>
    </div>
  );
} 