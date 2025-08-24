import React from 'react';

export type StoreType = 'KARGO' | 'SERVIS' | 'KENDI_ALAN' | 'AMBAR';

interface StoreTypeSelectorProps {
  value: string;
  onChange: (value: StoreType) => void;
  disabled?: boolean;
  required?: boolean;
  showLabel?: boolean;
}

export const storeTypeLabels = {
  KARGO: 'Kargo',
  SERVIS: 'Servis',
  KENDI_ALAN: 'Kendi Alan',
  AMBAR: 'Ambar'
};

export const storeTypeColors = {
  KARGO: 'bg-blue-100 text-blue-800 border-blue-200',
  SERVIS: 'bg-green-100 text-green-800 border-green-200',
  KENDI_ALAN: 'bg-purple-100 text-purple-800 border-purple-200',
  AMBAR: 'bg-orange-100 text-orange-800 border-orange-200'
};

export const storeTypeIcons = {
  KARGO: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7l4-4m0 0l4 4m-4-4v18M5 7h14l-1 10H6L5 7z" />
    </svg>
  ),
  SERVIS: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  KENDI_ALAN: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  AMBAR: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
    </svg>
  )
};

export const storeTypeDescriptions = {
  KARGO: 'Ürünlerin kargoya teslim edildiği mağazalar',
  SERVIS: 'Müşteri hizmeti ve satış yapan mağazalar',
  KENDI_ALAN: 'Kendi mağaza alanı olan satış noktaları',
  AMBAR: 'Depo ve stok yönetimi yapan mağazalar'
};

const StoreTypeSelector: React.FC<StoreTypeSelectorProps> = ({
  value,
  onChange,
  disabled = false,
  required = false,
  showLabel = true
}) => {
  return (
    <div className="space-y-2">
      {showLabel && (
        <label className="block text-sm font-medium text-gray-700">
          Mağaza Türü {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as StoreType)}
        disabled={disabled}
        required={required}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
      >
        <option value="">Mağaza türü seçiniz...</option>
        {Object.entries(storeTypeLabels).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
      
      {value && (
        <div className="mt-2">
          <div className={`inline-flex items-center gap-2 px-2 py-1 text-xs rounded-full border ${storeTypeColors[value as StoreType]}`}>
            {storeTypeIcons[value as StoreType]}
            {storeTypeLabels[value as StoreType]}
          </div>
          <p className="text-xs text-gray-600 mt-1">
            {storeTypeDescriptions[value as StoreType]}
          </p>
        </div>
      )}
    </div>
  );
};

export default StoreTypeSelector;