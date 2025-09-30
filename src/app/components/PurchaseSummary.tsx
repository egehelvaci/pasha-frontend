'use client';

import React from 'react';

interface PurchaseItem {
  urun_ismi: string;
  en: number;
  boy: number;
  m2_fiyati: number;
  adet: number;
  toplam_tutar: number;
}

interface PurchaseSummaryData {
  transaction_type: 'CART_PURCHASE';
  items: PurchaseItem[];
  items_count: number;
  total_quantity: number;
  total_value: number;
}

interface PurchaseSummaryProps {
  data: PurchaseSummaryData;
  className?: string;
}

const PurchaseSummary = ({ data, className }: PurchaseSummaryProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDimensions = (width: number, height: number) => {
    return `${width} x ${height} cm`;
  };

  const calculateM2 = (width: number, height: number, quantity: number) => {
    const m2PerPiece = (width * height) / 10000; // cm² to m²
    return (m2PerPiece * quantity).toFixed(2);
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className || ''}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <h2 className="text-lg font-semibold text-gray-800">
          Satın Alma Özeti
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          {data.items_count} ürün çeşidi • {data.total_quantity} toplam adet
        </p>
      </div>

      {/* Items List */}
      <div className="px-6 py-4">
        <div className="space-y-4">
          {data.items.map((item, index) => (
            <div key={index} className="border-b border-gray-100 pb-4 last:border-b-0 last:pb-0">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                {/* Product Info */}
                <div className="flex-1 mb-3 lg:mb-0">
                  <h3 className="font-medium text-gray-900 text-sm lg:text-base">
                    {item.urun_ismi}
                  </h3>
                  <div className="mt-2 space-y-1">
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                        {formatDimensions(item.en, item.boy)}
                      </span>
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        {item.adet} adet
                      </span>
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        {calculateM2(item.en, item.boy, item.adet)} m²
                      </span>
                    </div>
                  </div>
                </div>

                {/* Price Info */}
                <div className="flex items-center justify-between lg:justify-end lg:flex-col lg:items-end lg:space-y-1">
                  <div className="text-sm text-gray-600">
                    {formatCurrency(item.m2_fiyati)}/m²
                  </div>
                  <div className="font-semibold text-gray-900 text-lg">
                    {formatCurrency(item.toplam_tutar)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Total */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            <span className="font-medium">Toplam:</span> {data.total_quantity} adet
          </div>
          <div className="text-xl font-bold text-gray-900">
            {formatCurrency(data.total_value)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseSummary;
