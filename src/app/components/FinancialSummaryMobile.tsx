import React, { useState, useEffect } from "react";

type Props = {
  bakiye?: number; // 🆕 Mağaza bakiyesi
  acikHesapLimiti?: number; // 🆕 Açık hesap limiti
  limitsizAcikHesap?: boolean; // 🆕 Limitsiz açık hesap flag'i
};

export default function FinancialSummaryMobile({ 
  bakiye, 
  acikHesapLimiti, 
  limitsizAcikHesap = false 
}: Props) {
  const [isBlurred, setIsBlurred] = useState(true);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('finSummaryBlurMobile') : null;
    if (stored === 'false') setIsBlurred(false);
    else setIsBlurred(true);
  }, []);

  const handleBlurToggle = () => {
    setIsBlurred((prev) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('finSummaryBlurMobile', String(!prev));
      }
      return !prev;
    });
  };

  const formatCurrency = (amount: string | number) =>
    parseFloat(amount as string).toLocaleString("tr-TR", { minimumFractionDigits: 2 }) + " ₺";

  return (
    <div className="flex items-center justify-center w-full gap-2 text-xs text-gray-500 bg-gray-100 rounded px-2 py-1 flex md:hidden mt-2 mb-2">
      <div className={`${isBlurred ? "blur-sm" : ""} flex flex-row gap-4 transition-all duration-200`}>
        {/* 🆕 Yeni mağaza bakiye sistemi */}
        <div>
          <span className="block font-semibold text-green-700">Bakiye</span>
          <span className={`${(bakiye || 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
            {formatCurrency(bakiye || 0)}
          </span>
        </div>
        <div>
          <span className="block font-semibold text-blue-700">Açık Hesap</span>
          <span className="text-blue-600">
            {limitsizAcikHesap ? 'Limitsiz' : formatCurrency(acikHesapLimiti || 0)}
          </span>
        </div>
        <div>
          <span className="block font-semibold text-purple-700">Toplam</span>
          <span className="text-purple-600">
            {limitsizAcikHesap 
              ? 'Limitsiz' 
              : formatCurrency((bakiye || 0) + (acikHesapLimiti || 0))
            }
          </span>
        </div>
      </div>
      <button
        type="button"
        className="ml-2 p-1 bg-white/70 rounded-full hover:bg-white"
        onClick={handleBlurToggle}
        title={isBlurred ? "Bilgileri Göster" : "Bilgileri Gizle"}
      >
        {isBlurred ? (
          // Göz kapalı ikonu
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-700">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12.001C3.226 15.376 7.113 19.5 12 19.5c1.772 0 3.432-.457 4.899-1.277M6.228 6.228A10.45 10.45 0 0112 4.5c4.887 0 8.774 4.124 10.066 7.499a10.523 10.523 0 01-4.293 5.226M6.228 6.228l11.544 11.544M6.228 6.228L3 3m15 15l-3-3" />
          </svg>
        ) : (
          // Göz açık ikonu
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-700">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12S5.25 6.75 12 6.75 21.75 12 21.75 12S18.75 17.25 12 17.25 2.25 12 2.25 12z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
} 