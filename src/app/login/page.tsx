"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState("");
  const [imageLoading, setImageLoading] = useState(true);
  const router = useRouter();
  const { login, user, isLoading } = useAuth();
  const hasFetchedImage = useRef(false);

  useEffect(() => {
    if (!isLoading && user) {
      // Kullanıcı zaten giriş yapmışsa dashboard'a yönlendir
      router.push("/dashboard");
    }
  }, [user, isLoading, router]);

  // Rastgele halı mağazası görseli al - sadece bir kez
  useEffect(() => {
    // Eğer daha önce görsel yüklendiyse tekrar yükleme
    if (hasFetchedImage.current) {
      return;
    }

    const fetchRandomImage = async () => {
      try {
        // Session storage'dan cache'lenmiş görseli kontrol et
        const cachedImage = sessionStorage.getItem('loginBackgroundImage');
        const cachedTimestamp = sessionStorage.getItem('loginBackgroundImageTimestamp');
        
        // Cache'de görsel varsa ve 1 saatten eski değilse kullan
        if (cachedImage && cachedTimestamp) {
          const now = Date.now();
          const cacheAge = now - parseInt(cachedTimestamp);
          const oneHour = 60 * 60 * 1000; // 1 saat
          
          if (cacheAge < oneHour) {
            setBackgroundImage(cachedImage);
            setImageLoading(false);
            hasFetchedImage.current = true;
            return;
          }
        }

        setImageLoading(true);
        setBackgroundImage(""); // Görseli temizle
        
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || "https://pashahomeapps.up.railway.app"}/api/login-assets/random`);
        const data = await response.json();
        
        if (data.success && data.data.imageUrl) {
          setBackgroundImage(data.data.imageUrl);
          // Görseli session storage'a cache'le
          sessionStorage.setItem('loginBackgroundImage', data.data.imageUrl);
          sessionStorage.setItem('loginBackgroundImageTimestamp', Date.now().toString());
        } else {
          // API başarısız olursa varsayılan görsel kullan
          setBackgroundImage("/login-background.jpg");
        }
      } catch (error) {
        console.error('Rastgele görsel yüklenirken hata:', error);
        // Hata durumunda varsayılan görsel kullan
        setBackgroundImage("/login-background.jpg");
      } finally {
        setImageLoading(false);
        hasFetchedImage.current = true;
      }
    };

    fetchRandomImage();
  }, []); // Boş dependency array - sadece component mount olduğunda çalışır

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await login(username, password, rememberMe);
      
      if (result.success) {
        // Login başarılı, dashboard'a yönlendir
        router.push("/dashboard");
      } else {
        // Login başarısız, hata mesajı göster
        setError(result.message || "Kullanıcı adı veya şifre hatalı");
      }
    } catch {
      setError("Giriş sırasında bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  // Auth yüklenirken veya kullanıcı zaten giriş yapmışsa loading göster
  if (isLoading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Sol taraftaki görsel bölümü */}
      <div className="flex-1 relative hidden lg:block">
        <div className="absolute inset-0 bg-cover bg-center flex flex-col p-12 z-10">
          <h1 className="text-white text-3xl font-bold">
            Paşa Home Bayi Sipariş Sistemi
          </h1>
          <p className="text-white text-sm mt-2">© 2025 Paşa Home</p>
        </div>
        
        {/* Loading durumu */}
        {imageLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 z-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
              <p className="text-white text-lg font-medium">Görsel Yükleniyor...</p>
              <p className="text-gray-300 text-sm mt-2">Halı mağazası görseli hazırlanıyor</p>
            </div>
          </div>
        )}
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-40 z-0"></div>
        
        {/* Görsel - sadece yüklendiğinde göster */}
        {backgroundImage && !imageLoading && (
          <Image 
            src={backgroundImage}
            alt="Halı Mağazası"
            fill
            style={{ objectFit: "cover" }}
            priority
            className="z-[-1]"
            onError={() => {
              setImageLoading(false);
              setBackgroundImage("/login-background.jpg");
            }}
          />
        )}
      </div>

      {/* Sağ taraftaki login formu */}
      <div className="flex-1 bg-neutral-900 flex flex-col justify-center items-center p-8">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-12">
            <Image
              src="/logo.svg"
              alt="Paşa Home Logo"
              width={200}
              height={60}
              priority
            />
          </div>

          <h2 className="text-white text-2xl mb-8 mt-4 text-center">GİRİŞ</h2>

          {error && (
            <div className="bg-red-600/20 border border-red-600 text-red-500 px-4 py-2 rounded mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="block text-gray-400 text-sm mb-2">Kullanıcı Adı</label>
              <input
                type="text"
                className="w-full bg-white py-2 px-4 rounded focus:outline-none text-black"
                placeholder="Kullanıcı Adı"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="mb-6">
              <label className="block text-gray-400 text-sm mb-2">Şifre</label>
              <input
                type="password"
                className="w-full bg-white py-2 px-4 rounded focus:outline-none text-black"
                placeholder="************"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-blue-500 focus:ring-blue-500 border-gray-300 rounded"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-400">
                  Beni Hatırla
                </label>
              </div>
              <div className="text-sm">
                <Link href="/forgot-password" className="text-blue-500 hover:text-blue-600">
                  Şifremi Unuttum
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-150 ease-in-out"
            >
              {loading ? "GİRİŞ YAPILIYOR..." : "GİRİŞ"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
} 