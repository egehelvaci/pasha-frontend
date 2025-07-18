"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./context/AuthContext";

export default function Home() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        // Kullanıcı giriş yapmışsa dashboard'a yönlendir
        router.push("/dashboard");
      } else {
        // Kullanıcı giriş yapmamışsa login'e yönlendir
        router.push("/login");
      }
    }
  }, [user, isLoading, router]);

  // Loading durumunda basit bir loading ekranı göster
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  // Bu kısım asla görünmeyecek çünkü useEffect'te yönlendirme yapılıyor
  return null;
}
