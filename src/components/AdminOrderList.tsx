'use client';

import React, { useState } from 'react';
import AdminOrderCancel from './AdminOrderCancel';
import { AdminCancelOrderResponse } from '@/services/api';

// Örnek sipariş listesi komponenti
interface Order {
  id: string;
  customerName: string;
  total: number;
  status: string;
  createdAt: string;
}

export default function AdminOrderList() {
  const [orders, setOrders] = useState<Order[]>([
    {
      id: "550e8400-e29b-41d4-a716-446655440000",
      customerName: "Ahmet Yılmaz",
      total: 1250.00,
      status: "CONFIRMED",
      createdAt: "2025-01-15T10:30:00.000Z"
    },
    {
      id: "660f9511-f39c-52e5-b827-557766551111",
      customerName: "Ayşe Demir",
      total: 875.50,
      status: "PENDING",
      createdAt: "2025-01-15T11:15:00.000Z"
    }
  ]);

  const handleCancelSuccess = (orderId: string, response: AdminCancelOrderResponse) => {
    // Sipariş listesini güncelle
    setOrders(prevOrders =>
      prevOrders.map(order =>
        order.id === orderId
          ? { ...order, status: 'CANCELED' }
          : order
      )
    );

    // Başarı mesajını göster
    alert(`✅ ${response.message}`);
  };

  const handleCancelError = (orderId: string, error: string) => {
    console.error(`Sipariş ${orderId} iptal hatası:`, error);
    alert(`❌ Sipariş iptal edilirken hata: ${error}`);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: { color: 'bg-yellow-100 text-yellow-800', text: 'Bekliyor' },
      CONFIRMED: { color: 'bg-blue-100 text-blue-800', text: 'Onaylandı' },
      SHIPPED: { color: 'bg-purple-100 text-purple-800', text: 'Kargoda' },
      DELIVERED: { color: 'bg-green-100 text-green-800', text: 'Teslim Edildi' },
      CANCELED: { color: 'bg-red-100 text-red-800', text: 'İptal Edildi' },
      CANCELLED: { color: 'bg-red-100 text-red-800', text: 'İptal Edildi' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || 
      { color: 'bg-gray-100 text-gray-800', text: status };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">
          Sipariş Yönetimi
        </h3>
        <p className="text-sm text-gray-600">
          Admin olarak siparişleri iptal edebilirsiniz
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sipariş ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Müşteri
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tutar
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Durum
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tarih
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                İşlemler
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-mono text-gray-900">
                    {order.id.substring(0, 8)}...
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {order.customerName}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {order.total.toFixed(2)} ₺
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(order.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(order.createdAt).toLocaleDateString('tr-TR')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center gap-2">
                    {/* Admin Sipariş İptal Komponenti */}
                    <AdminOrderCancel
                      orderId={order.id}
                      orderStatus={order.status}
                      onCancelSuccess={(response) => handleCancelSuccess(order.id, response)}
                      onCancelError={(error) => handleCancelError(order.id, error)}
                    />
                    
                    {/* Diğer işlemler */}
                    <button className="text-blue-600 hover:text-blue-800 text-sm">
                      Detay
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
