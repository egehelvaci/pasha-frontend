"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "./context/AuthContext";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await login(username, password);
      
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

  return (
    <div className="min-h-screen flex">
      {/* Sol taraftaki görsel bölümü */}
      <div className="flex-1 relative hidden lg:block">
        <div className="absolute inset-0 bg-cover bg-center flex flex-col p-12 z-10">
          <h1 className="text-white text-3xl font-bold">
            Paşa Home Bayii Sipariş Sistemi
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
                <a href="#" className="text-blue-500 hover:text-blue-600">
                  Şifremi Unuttum
                </a>
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
