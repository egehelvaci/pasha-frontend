"use client";

import Link from "next/link";
import Image from "next/image";

export default function PublicHeader() {
  return (
    <header className="bg-gradient-to-r from-slate-800 to-slate-900 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-40 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-3 sm:py-4">
          {/* Logo - Modern Tasarım */}
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0 group">
              <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl hover:bg-slate-700/50 transition-all duration-300">
                <Image 
                  src="/logo.svg" 
                  alt="Paşa Home" 
                  width={120}
                  height={48}
                  className="h-8 sm:h-10 lg:h-12 w-auto group-hover:scale-105 transition-transform duration-300 filter brightness-0 invert" 
                  priority
                />
              </div>
            </Link>
          </div>

          {/* Sağ taraf butonları - Responsive Tasarım */}
          <div className="flex flex-col sm:flex-row items-end sm:items-center space-y-1 sm:space-y-0 sm:space-x-2 lg:space-x-3">
            {/* Bayi Girişi Butonu */}
            <Link
              href="/login"
              className="inline-flex items-center justify-center w-full sm:w-auto px-3 sm:px-4 lg:px-6 py-2 sm:py-3 border border-transparent text-xs sm:text-sm font-semibold rounded-lg sm:rounded-xl text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline">Bayi Girişi</span>
              <span className="sm:hidden">Bayi Girişi</span>
            </Link>

            {/* Bayi Talebi Butonu */}
            <Link
              href="/bayi-talebi"
              className="inline-flex items-center justify-center w-full sm:w-auto px-3 sm:px-4 lg:px-6 py-2 sm:py-3 border border-slate-600 text-xs sm:text-sm font-semibold rounded-lg sm:rounded-xl text-slate-200 bg-slate-800/50 hover:bg-slate-700/70 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-all duration-300 backdrop-blur-sm hover:border-slate-500"
            >
              <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span className="hidden sm:inline">Bayi Talebi Oluştur</span>
              <span className="sm:hidden">Bayi Talebi</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
