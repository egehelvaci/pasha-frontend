"use client";

import PublicHeader from "./PublicHeader";

interface PublicLayoutProps {
  children: React.ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-screen bg-white">
      <PublicHeader />
      
      {children}

      {/* Footer */}
      <footer className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">Hızlı Linkler</h3>
              <ul className="space-y-2">
                <li>
                  <a href="/login" className="text-gray-300 hover:text-white transition-colors duration-200">
                    Bayi Girişi
                  </a>
                </li>
                <li>
                  <a href="/bayi-talebi" className="text-gray-300 hover:text-white transition-colors duration-200">
                    Bayi Talebi
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">İletişim</h3>
              <p className="text-gray-300 text-sm sm:text-base">
                Bayi olmak için bizimle iletişime geçin.
              </p>
            </div>
          </div>
          
          {/* Copyright */}
          <div className="border-t border-gray-800 mt-6 sm:mt-8 pt-6 sm:pt-8 text-center">
            <p className="text-gray-400 text-sm">
              © 2024 Paşa Home. Tüm hakları saklıdır.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
