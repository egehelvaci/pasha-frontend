"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { validateResetToken, resetPassword } from "../../services/api";

function ResetPasswordForm() {
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [validatingToken, setValidatingToken] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
      validateToken(tokenFromUrl);
    } else {
      setError("Geçersiz şifre sıfırlama bağlantısı");
      setValidatingToken(false);
    }
  }, [searchParams]);

  const validateToken = async (tokenToValidate: string) => {
    try {
      const result = await validateResetToken(tokenToValidate);
      
      if (result.success) {
        setTokenValid(true);
        setEmail(result.email || "");
      } else {
        setError(result.message || "Geçersiz veya süresi dolmuş token");
        setTokenValid(false);
      }
    } catch (err) {
      setError("Token doğrulanamadı. Lütfen yeni bir şifre sıfırlama talebi oluşturun.");
      setTokenValid(false);
    } finally {
      setValidatingToken(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setError("Şifreler eşleşmiyor");
      return;
    }

    if (newPassword.length < 6) {
      setError("Şifre en az 6 karakter olmalıdır");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await resetPassword({
        token,
        newPassword,
        confirmPassword
      });
      
      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.message || "Şifre sıfırlanamadı");
      }
    } catch (err) {
      setError("Şifre sıfırlama sırasında bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  if (validatingToken) {
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

        {/* Sağ taraftaki yükleme */}
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

            <div className="text-white">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p>Token doğrulanıyor...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
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

        {/* Sağ taraftaki hata mesajı */}
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

            <div className="bg-red-600/20 border border-red-600 text-red-500 px-6 py-4 rounded mb-6">
              <h2 className="text-xl font-semibold mb-2">Geçersiz Bağlantı</h2>
              <p className="text-sm">{error}</p>
            </div>

            <div className="space-y-4">
              <Link
                href="/forgot-password"
                className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-150 ease-in-out text-center"
              >
                Yeni Şifre Sıfırlama Talebi
              </Link>
              
              <Link
                href="/"
                className="block w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-150 ease-in-out text-center"
              >
                Giriş Sayfasına Dön
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
              <h2 className="text-xl font-semibold mb-2">Şifre Başarıyla Güncellendi!</h2>
              <p className="text-sm">
                Şifreniz başarıyla değiştirildi. Artık yeni şifrenizle giriş yapabilirsiniz.
              </p>
            </div>

            <Link
              href="/"
              className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-150 ease-in-out text-center"
            >
              Giriş Sayfasına Git
            </Link>
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

          <h2 className="text-white text-2xl mb-4 text-center">YENİ ŞİFRE BELİRLE</h2>
          {email && (
            <p className="text-gray-400 text-sm mb-8 text-center">
              <strong>{email}</strong> için yeni şifre belirleyin
            </p>
          )}

          {error && (
            <div className="bg-red-600/20 border border-red-600 text-red-500 px-4 py-2 rounded mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-400 text-sm mb-2">Yeni Şifre</label>
              <input
                type="password"
                className="w-full bg-white py-2 px-4 rounded focus:outline-none text-black"
                placeholder="En az 6 karakter"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <div className="mb-6">
              <label className="block text-gray-400 text-sm mb-2">Şifre Tekrar</label>
              <input
                type="password"
                className="w-full bg-white py-2 px-4 rounded focus:outline-none text-black"
                placeholder="Şifrenizi tekrar girin"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-150 ease-in-out mb-4"
            >
              {loading ? "ŞİFRE GÜNCELLENİYOR..." : "ŞİFREYİ GÜNCELLE"}
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

function LoadingFallback() {
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

      {/* Sağ taraftaki yükleme */}
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

          <div className="text-white">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p>Yükleniyor...</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPassword() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ResetPasswordForm />
    </Suspense>
  );
} 