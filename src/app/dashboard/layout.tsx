'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/app/components/Header';
import { useAuth } from '../context/AuthContext';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      // Kullanıcı giriş yapmamışsa login'e yönlendir
      router.push("/login");
    }
  }, [user, isLoading, router]);

  // Auth yüklenirken gösterilecek loading ekranı
  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#f7f8fa]">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-[#00365a]"></div>
      </div>
    );
  }

  // Kullanıcı giriş yapmamışsa loading göster (yönlendirme sırasında)
  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#f7f8fa]">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-[#00365a]"></div>
      </div>
    );
  }

  const userInfo = {
    name: `${user.name} ${user.surname}`,
    imageUrl: user.avatar || 'https://via.placeholder.com/40',
    userType: {
      id: user.userTypeId || 0
    }
  };

  return (
    <>
      <style jsx global>{`
        @media print {
          header,
          nav,
          .header,
          .navbar,
          .navigation,
          *[class*="header"],
          *[class*="nav"],
          *[class*="cart"],
          *[class*="sepet"],
          *[href*="sepetim"],
          *[href*="cart"],
          .cart-icon,
          .shopping-cart,
          .FaShoppingCart,
          svg[class*="cart"],
          button[class*="cart"],
          a[href*="sepetim"],
          a[href*="cart"] {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
          }
        }
      `}</style>
      <div className="min-h-screen bg-[#f7f8fa]">
        <Header 
          title="Dashboard"
          user={userInfo}
          className="print:hidden"
        />
        {children}
      </div>
    </>
  );
} 