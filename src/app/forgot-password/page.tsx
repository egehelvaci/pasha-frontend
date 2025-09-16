"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { forgotPassword } from "../../services/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await forgotPassword({ email });
      
      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.message || "Bir hata oluştu");
      }
    } catch (err) {
      setError("Şifre sıfırlama talebi gönderilemedi. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
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
          <div className="absolute inset-0 bg-black bg-opacity-40 z-0"></div>
          <Image 
            src="/login-background.jpg" 
            alt="Paşa Home"
            fill
            style={{ objectFit: "cover" }}
            priority
            className="z-[-1]"
          />
        </div>

        {/* Sağ taraftaki başarı mesajı */}
        <div className="flex-1 bg-neutral-900 flex flex-col justify-center items-center p-8">
          <div className="w-full max-w-md text-center">
            <div className="flex justify-center mb-12">
              <Image
                src="/logo.svg"
                alt="Paşa Home Logo"
                width={200}
                height={60}
                priority
              />
            </div>

            <div className="bg-green-600/20 border border-green-600 text-green-500 px-6 py-4 rounded mb-6">
              <h2 className="text-xl font-semibold mb-2">Email Gönderildi!</h2>
              <p className="text-sm">
                Şifre sıfırlama bağlantısı <strong>{email}</strong> adresine gönderildi. 
                Lütfen email kutunuzu kontrol edin.
              </p>
            </div>

            <p className="text-gray-400 text-sm mb-6">
              Email gelmedi mi? Spam klasörünüzü kontrol edin veya birkaç dakika bekleyin.
            </p>

            <div className="space-y-4">
              <button
                onClick={() => router.push("/")}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-150 ease-in-out"
              >
                Giriş Sayfasına Dön
              </button>
              
              <button
                onClick={() => {
                  setSuccess(false);
                  setEmail("");
                }}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-150 ease-in-out"
              >
                Tekrar Dene
              </button>
            </div>
          </div>
        </div>
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
        <div className="absolute inset-0 bg-black bg-opacity-40 z-0"></div>
        <Image 
          src="/login-background.jpg" 
          alt="Paşa Home"
          fill
          style={{ objectFit: "cover" }}
          priority
          className="z-[-1]"
        />
      </div>

      {/* Sağ taraftaki form */}
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

          <h2 className="text-white text-2xl mb-4 text-center">ŞİFREMİ UNUTTUM</h2>
          <p className="text-gray-400 text-sm mb-8 text-center">
            Email adresinizi girin, size şifre sıfırlama bağlantısı gönderelim.
          </p>

          {error && (
            <div className="bg-red-600/20 border border-red-600 text-red-500 px-4 py-2 rounded mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label className="block text-gray-400 text-sm mb-2">Email Adresi</label>
              <input
                type="email"
                className="w-full bg-white py-2 px-4 rounded focus:outline-none text-black"
                placeholder="ornek@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-150 ease-in-out mb-4"
            >
              {loading ? "GÖNDERİLİYOR..." : "SIFIRLAMA LİNKİ GÖNDER"}
            </button>

            <div className="text-center">
              <Link 
                href="/" 
                className="text-blue-500 hover:text-blue-600 text-sm"
              >
                ← Giriş sayfasına dön
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 