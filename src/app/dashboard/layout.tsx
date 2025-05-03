import React from 'react';
import Sidebar from '../components/Sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-gray-50">
      <div className="w-64 hidden md:block">
        <Sidebar />
      </div>
      <div className="flex-1 overflow-auto">
        <main>{children}</main>
      </div>
    </div>
  );
} 