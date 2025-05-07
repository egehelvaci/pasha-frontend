"use client";
import React, { useState } from "react";

const fakeProducts = [
  {
    id: 1,
    name: "SONSUZ GRİ",
    description: "SONSUZ GRİ",
    image: "https://placehold.co/250x390",
    collection: "SOHO SERİSİ",
  },
  {
    id: 2,
    name: "SONSUZ BEYAZ",
    description: "SONSUZ BEYAZ",
    image: "https://placehold.co/250x390",
    collection: "SOHO SERİSİ",
  },
  {
    id: 3,
    name: "OKYANUS GRİ",
    description: "OKYANUS GRİ",
    image: "https://placehold.co/250x390",
    collection: "SOHO SERİSİ",
  },
  {
    id: 4,
    name: "OKYANUS BEYAZ",
    description: "OKYANUS BEYAZ",
    image: "https://placehold.co/250x390",
    collection: "SOHO SERİSİ",
  },
  {
    id: 5,
    name: "KESİM-SUYOLU SİYAH",
    description: "KESİM-SUYOLU SİYAH",
    image: "https://placehold.co/250x390",
    collection: "SOHO SERİSİ",
  },
  {
    id: 6,
    name: "KESİM-SUYOLU MAVİ",
    description: "KESİM-SUYOLU MAVİ",
    image: "https://placehold.co/250x390",
    collection: "SOHO SERİSİ",
  },
];

export default function ProductList() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<number[]>([]);

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold">Ürün Listesi</h1>
          <div className="text-sm text-gray-400 mt-1">
            Dashboard &nbsp;|&nbsp; Ürünler &nbsp;|&nbsp; <span className="text-gray-700">Ürün Listesi</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="bg-blue-900 text-white rounded-full px-6 py-2 font-semibold flex items-center gap-2">
            <span>Ürün Kalite Block</span>
          </button>
          <button className="bg-blue-900 text-white rounded-full px-6 py-2 font-semibold flex items-center gap-2">
            <span>Yeni Ürün</span>
          </button>
          <button className="bg-white border border-gray-300 rounded-full px-3 py-2 flex items-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        <select className="border rounded px-3 py-2 text-sm">
          <option>Sıralama</option>
        </select>
        <select className="border rounded px-3 py-2 text-sm">
          <option>Koleksiyon</option>
        </select>
        <div className="relative">
          <input
            type="text"
            className="border rounded px-3 py-2 text-sm pl-8"
            placeholder="Ara..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <svg className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {fakeProducts.map((product) => (
          <div key={product.id} className="bg-white rounded-xl shadow p-3 flex flex-col h-full">
            <div className="relative mb-2 aspect-[250/390]">
              <img 
                src={product.image} 
                alt={product.name} 
                className="rounded-lg w-full h-full object-cover" 
              />
              <span className="absolute top-2 left-2 bg-blue-900 text-white text-xs px-3 py-1 rounded-full font-semibold">
                {product.collection}
              </span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <input
                type="checkbox"
                checked={selected.includes(product.id)}
                onChange={() => setSelected(selected.includes(product.id)
                  ? selected.filter(id => id !== product.id)
                  : [...selected, product.id])}
                className="w-4 h-4"
              />
              <span className="font-semibold text-gray-800 text-sm line-clamp-1">{product.name}</span>
            </div>
            <div className="text-xs text-gray-500 line-clamp-2">{product.description}</div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-6 text-sm text-gray-500">
        <span>103 Kayıttan 1 - 12 arası gösterilmektedir.</span>
        <select className="border rounded px-2 py-1">
          <option>12</option>
          <option>24</option>
          <option>48</option>
        </select>
      </div>
    </div>
  );
} 