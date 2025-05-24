'use client';

import React from 'react';
import Header from '@/app/components/Header';
import { useAuth } from '../context/AuthContext';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();

  const userInfo = user ? {
    name: `${user.name} ${user.surname}`,
    imageUrl: user.avatar || 'https://via.placeholder.com/40',
    debit: user.debit,
    credit: user.credit,
    userType: {
      id: user.userTypeId
    }
  } : {
    name: '',
    imageUrl: '',
    debit: '0',
    credit: '0',
    userType: {
      id: 0
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        title="Dashboard"
        user={userInfo}
      />
      {children}
    </div>
  );
} 