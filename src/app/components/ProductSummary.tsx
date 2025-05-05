'use client';

import React from 'react';

type ProductSummaryItem = {
  id: string;
  name: string;
  quantity: number;
  totalArea: number;
  image: string;
};

type ProductSummaryProps = {
  title: string;
  products: ProductSummaryItem[];
};

const ProductSummary = ({ title, products }: ProductSummaryProps) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h2 className="text-lg font-medium text-gray-800 mb-4">{title}</h2>
      <div className="space-y-4">
        {products.map((product) => (
          <div key={product.id} className="flex items-center border-b border-gray-100 pb-4">
            <div className="w-16 h-16 flex-shrink-0 rounded-md overflow-hidden border border-gray-200">
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="ml-4 flex-1">
              <h3 className="text-sm font-medium text-gray-800">{product.name}</h3>
              <div className="mt-2 flex items-center text-xs text-gray-500">
                <p className="mr-3">{product.quantity} adet ürün sipariş verildi</p>
                <p>Toplam {product.totalArea} m² olarak hesaplanmıştır.</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductSummary; 