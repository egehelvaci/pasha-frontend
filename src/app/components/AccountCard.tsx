import React from 'react';

type AccountCardProps = {
  balance: number;
  debt: number;
  credit: number;
  debtCredit: number;
};

const AccountCard = ({ balance, debt, credit, debtCredit }: AccountCardProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="bg-blue-800 rounded-lg p-6 text-white">
      <div className="flex items-center mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
        </svg>
        <h2 className="text-xl font-bold">₺ Hesabı</h2>
      </div>
      
      <div className="mb-6">
        <p className="text-3xl font-bold mb-1">{formatCurrency(balance)} ₺</p>
        <p className="text-white text-opacity-80 text-sm">borçlusunuz.</p>
      </div>
      
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-white text-opacity-70 mb-1">Borç</p>
          <p className="font-medium">{formatCurrency(debt)} ₺</p>
        </div>
        <div>
          <p className="text-white text-opacity-70 mb-1">Alacak</p>
          <p className="font-medium">{formatCurrency(credit)} ₺</p>
        </div>
        <div>
          <p className="text-white text-opacity-70 mb-1">Borç/Alacak Farkı</p>
          <p className="font-medium">{formatCurrency(debtCredit)} ₺</p>
        </div>
      </div>
    </div>
  );
};

export default AccountCard; 