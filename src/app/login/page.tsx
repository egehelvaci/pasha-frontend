"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { EyeIcon, EyeSlashIcon, ArrowRightIcon, ArrowLeftIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../context/AuthContext";
import { getLoginBackground } from "@/services/api";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState("/login-background.jpg");
  const router = useRouter();
  const { login, user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && user) router.replace("/dashboard");
  }, [user, isLoading, router]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timeout = setTimeout(() => controller.abort(), 8000);
    getLoginBackground(controller.signal)
      .then(src => { if (active) setBackgroundImage(src); })
      .catch(() => { /* The bundled image keeps the form independent of this optional API. */ })
      .finally(() => clearTimeout(timeout));
    return () => { active = false; controller.abort(); clearTimeout(timeout); };
  }, []);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const result = await login(username.trim(), password, rememberMe);
      if (result.success) router.replace("/dashboard");
      else setError(result.message || "Kullanıcı adı veya şifre hatalı.");
    } catch {
      setError("Giriş sırasında bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  if ((isLoading && !loading) || user) {
    return <main className="design-shell grid min-h-screen place-items-center"><p role="status" className="text-sm text-slate-600">Oturum kontrol ediliyor…</p></main>;
  }

  return (
    <main className="design-shell login-shell min-h-screen lg:grid lg:grid-cols-[1fr_1fr]">
      <aside className="login-art relative m-4 hidden min-h-[calc(100svh-2rem)] overflow-hidden rounded-[2rem] bg-[#12384b] lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <Image src={backgroundImage} alt="" fill priority unoptimized
          sizes="50vw" className="object-cover opacity-65"
          onError={() => setBackgroundImage('/login-background.jpg')} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#082a3d] via-[#082a3d]/20 to-[#082a3d]/40" />
        <div className="relative flex items-center justify-between gap-4">
          <Image src="/logo.svg" alt="Paşa Home" width={150} height={60} className="h-12 w-auto" priority />
          <span className="rounded-full border border-white/30 bg-white/10 px-4 py-2 text-[10px] uppercase tracking-[.18em] text-white backdrop-blur">Bayi Portalı</span>
        </div>
        <div className="relative max-w-lg py-6 text-white">
          <div className="mb-8 h-px w-12 bg-[#d3bd98]" />
          <p className="text-xs uppercase tracking-[.2em] text-[#d3bd98]">Toptan satış & sipariş yönetimi</p>
          <h2 className="mt-5 text-4xl font-medium leading-tight tracking-tight xl:text-5xl">İşiniz için gerekenler,<br />tek bir yerde.</h2>
          <p className="mt-6 max-w-sm text-sm leading-7 text-white/75">Ürünleri inceleyin, siparişlerinizi oluşturun ve süreçlerinizi bayi panelinizden takip edin.</p>
          <div className="mt-12 flex flex-wrap gap-x-6 gap-y-3 border-t border-white/20 pt-6 text-xs text-white/70"><span>Ürün kataloğu</span><span>Sipariş takibi</span><span>Bayi işlemleri</span></div>
        </div>
      </aside>

      <section className="flex min-h-svh flex-col px-6 py-7 sm:px-12 lg:px-14 xl:px-24">
        <Link href="/" className="inline-flex w-fit items-center gap-2 text-xs text-slate-600 hover:text-[#00365a]"><ArrowLeftIcon className="h-4 w-4" /> Ana sayfaya dön</Link>
        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-12 reveal-in">
          <Image src="/black-logo.svg" alt="Paşa Home" width={160} height={64} className="mb-10 h-12 w-auto self-start lg:hidden" priority />
          <p className="eyebrow">Paşa Home · Bayi hesabı</p>
          <h1 className="display-heading mt-4 text-4xl sm:text-5xl">Bayi girişi</h1>
          <p className="mb-9 mt-4 text-sm leading-7 text-slate-600">Devam etmek için hesap bilgilerinizle giriş yapın.</p>

          <form onSubmit={handleLogin} aria-busy={loading} className="space-y-6">
            {error && <div id="login-error" role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800">{error}</div>}
            <div>
              <label htmlFor="username" className="mb-2 block text-sm font-medium">Kullanıcı adı</label>
              <input id="username" name="username" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false}
                className="login-input" placeholder="Kullanıcı adınız" value={username}
                onChange={event => setUsername(event.target.value)} required disabled={loading} aria-describedby={error ? 'login-error' : undefined} />
            </div>
            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium">Şifre</label>
              <div className="relative">
                <input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password"
                  className="login-input !pr-14" placeholder="Şifreniz" value={password}
                  onChange={event => setPassword(event.target.value)} required disabled={loading} aria-describedby={error ? 'login-error' : undefined} />
                <button type="button" onClick={() => setShowPassword(value => !value)} disabled={loading}
                  aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'} aria-pressed={showPassword}
                  className="absolute right-1 top-1 grid h-12 w-12 place-items-center text-slate-500 hover:text-[#00365a]">
                  {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                </button>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
              <label className="flex min-h-11 cursor-pointer items-center gap-2.5" htmlFor="remember-me">
                <input id="remember-me" type="checkbox" checked={rememberMe} disabled={loading} className="h-4 w-4 accent-[#00365a]" onChange={event => setRememberMe(event.target.checked)} />
                Beni hatırla
              </label>
              <Link href="/forgot-password" className="inline-flex min-h-11 items-center text-[#00365a] underline-offset-4 hover:underline">Şifremi unuttum</Link>
            </div>
            <button type="submit" disabled={loading} className="primary-action w-full !justify-between disabled:opacity-60">
              <span>{loading ? 'Giriş yapılıyor…' : 'Giriş yap'}</span>
              {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" /> : <ArrowRightIcon className="h-4 w-4" />}
            </button>
          </form>
          <p className="mt-8 border-t border-[#deddd5] pt-7 text-center text-sm text-slate-600">Henüz bayi hesabınız yok mu? <Link href="/bayi-talebi" className="inline-flex min-h-11 items-center font-medium text-[#00365a] underline-offset-4 hover:underline">Bayi başvurusu</Link></p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500"><span>© {new Date().getFullYear()} Paşa Home</span><span className="flex items-center gap-1.5"><LockClosedIcon className="h-3.5 w-3.5" /> Bayi erişimi</span></div>
      </section>
    </main>
  );
}
