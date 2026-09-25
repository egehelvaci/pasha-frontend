"use client";

import PublicHeader from "./PublicHeader";

interface PublicLayoutProps {
  children: React.ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="design-shell min-h-screen">
      <PublicHeader />

      {children}

      <footer className="mt-8 border-t border-slate-200/80 bg-white">
        <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Hızlı Linkler</h3>
              <ul className="mt-3 space-y-2">
                <li>
                  <a href="/login" className="text-sm text-slate-600 transition hover:text-[#00365a]">
                    Bayi Girişi
                  </a>
                </li>
                <li>
                  <a href="/bayi-talebi" className="text-sm text-slate-600 transition hover:text-[#00365a]">
                    Bayi Talebi
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">İletişim</h3>
              <p className="mt-3 text-sm text-slate-600">
                <a
                  href="https://wa.me/905325257144"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-[#00365a] hover:text-[#004170]"
                >
                  WhatsApp
                </a>
                {" "}ile iletişime geç
              </p>
            </div>
          </div>
          <div className="mt-6 border-t border-slate-200/80 pt-6 text-center">
            <p className="text-sm text-slate-500">© {new Date().getFullYear()} Helken Teknoloji Yazılım Limited Şirketi</p>
            <p className="mt-1.5 text-sm text-slate-500">Helken Teknoloji İletişim: +90 538 294 77 27</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
