'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { getEmployeeStatistics, getAdminUsers, AdminUser, EmployeeStats, OverallStats, RecentStats, PreparedOrder } from '../../../services/api';

interface EmployeeStatisticsData {
  employee: EmployeeStats;
  overallStats: OverallStats;
  recentStats: RecentStats;
  preparedOrders: PreparedOrder[];
}

export default function CalisanIstatistikleri() {
  const { user, isAdmin } = useAuth();
  const router = useRouter();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [statistics, setStatistics] = useState<EmployeeStatisticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<AdminUser[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(true);
  
  // Custom dropdown state'i
  const [employeeDropdownOpen, setEmployeeDropdownOpen] = useState(false);

  // Admin kontrolü
  useEffect(() => {
    if (user && !isAdmin) {
      router.push('/dashboard');
    }
  }, [user, isAdmin, router]);

  // Çalışanları getir
  useEffect(() => {
    if (isAdmin) {
      fetchEmployees();
    }
  }, [isAdmin]);

  // Dropdown dışına tıklandığında kapatma
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.dropdown-container')) {
        setEmployeeDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchEmployees = async () => {
    setEmployeesLoading(true);
    try {
      const allUsers = await getAdminUsers();
      // Sadece userType.id === 4 ve userType.name === 'employee' olan kullanıcıları filtrele
      const employeeUsers = allUsers.filter(user => 
        user.userType.id === 4 && user.userType.name === 'employee'
      );
      setEmployees(employeeUsers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Çalışanlar yüklenirken hata oluştu');
    } finally {
      setEmployeesLoading(false);
    }
  };

  const fetchEmployeeStatistics = async (employeeId: string) => {
    if (!employeeId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await getEmployeeStatistics(employeeId);
      setStatistics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'İstatistikler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeChange = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    if (employeeId) {
      fetchEmployeeStatistics(employeeId);
    } else {
      setStatistics(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Erişim Reddedildi</h1>
          <p className="text-gray-600">Bu sayfaya erişim yetkiniz bulunmamaktadır.</p>
        </div>
      </div>
    );
  }

          return (
          <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Başlık */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Çalışan İstatistikleri</h1>
              <p className="mt-2 text-gray-600">Çalışanların performans verilerini görüntüleyin</p>
            </div>

            {/* Çalışan Seçimi */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Çalışan Seçimi</h2>
              
              {employeesLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-gray-600">Çalışanlar yükleniyor...</span>
                </div>
              ) : (
                <div className="relative dropdown-container">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setEmployeeDropdownOpen(!employeeDropdownOpen)}
                      className="w-full max-w-md border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent transition-colors text-left bg-white"
                    >
                      <span className={selectedEmployeeId ? "text-gray-900" : "text-gray-500"}>
                        {selectedEmployeeId 
                          ? employees.find(emp => emp.userId === selectedEmployeeId) 
                              ? `${employees.find(emp => emp.userId === selectedEmployeeId)?.name} ${employees.find(emp => emp.userId === selectedEmployeeId)?.surname} (${employees.find(emp => emp.userId === selectedEmployeeId)?.email})`
                              : "Çalışan seçin..."
                          : "Çalışan seçin..."
                        }
                      </span>
                      <svg 
                        className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 transition-transform ${employeeDropdownOpen ? 'rotate-180' : ''}`}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {employeeDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto scrollbar-hide">
                        <div
                          className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                            !selectedEmployeeId ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                          }`}
                          onClick={() => {
                            handleEmployeeChange("");
                            setEmployeeDropdownOpen(false);
                          }}
                        >
                          Çalışan seçin...
                        </div>
                        {employees.map((employee) => (
                          <div
                            key={employee.userId}
                            className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                              selectedEmployeeId === employee.userId ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                            }`}
                            onClick={() => {
                              handleEmployeeChange(employee.userId);
                              setEmployeeDropdownOpen(false);
                            }}
                          >
                            {employee.name} {employee.surname} ({employee.email})
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {employees.length === 0 && !employeesLoading && (
                <p className="mt-2 text-sm text-gray-500">Henüz çalışan bulunmamaktadır.</p>
              )}
            </div>

            {/* Loading */}
            {loading && (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Hata</h3>
                    <div className="mt-2 text-sm text-red-700">{error}</div>
                  </div>
                </div>
              </div>
            )}

            {/* İstatistikler */}
            {statistics && !loading && (
              <div className="space-y-6">
                {/* Çalışan Bilgileri */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Çalışan Bilgileri</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Ad Soyad</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {statistics.employee.name} {statistics.employee.surname}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">E-posta</p>
                      <p className="text-lg font-semibold text-gray-900">{statistics.employee.email}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Telefon</p>
                      <p className="text-lg font-semibold text-gray-900">{statistics.employee.phoneNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Kullanıcı ID</p>
                      <p className="text-sm font-semibold text-gray-900">{statistics.employee.userId}</p>
                    </div>
                  </div>
                </div>


                {/* Genel İstatistikler - Hazırlanan */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Genel İstatistikler</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-orange-600">{statistics.overallStats.preparedOrders}</p>
                      <p className="text-sm text-gray-500">Toplam Hazırlanan</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-green-600">{formatCurrency(statistics.overallStats.preparedAmount)}</p>
                      <p className="text-sm text-gray-500">Toplam Tutar</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-purple-600">{statistics.overallStats.preparedAreaM2.toFixed(2)} m²</p>
                      <p className="text-sm text-gray-500">Toplam Alan</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-blue-600">{statistics.overallStats.preparedItems}</p>
                      <p className="text-sm text-gray-500">Toplam Ürün</p>
                    </div>
                  </div>
                </div>

                {/* Ortalama İstatistikler */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Ortalama İstatistikler</h2>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span className="text-sm text-gray-600">Ortalama Tutar</span>
                      <span className="text-lg font-bold text-orange-600">{formatCurrency(statistics.overallStats.averagePreparedAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span className="text-sm text-gray-600">Ortalama Alan</span>
                      <span className="text-lg font-bold text-green-600">{statistics.overallStats.averagePreparedAreaM2.toFixed(2)} m²</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span className="text-sm text-gray-600">Ortalama Ürün</span>
                      <span className="text-lg font-bold text-purple-600">{statistics.overallStats.averagePreparedItems.toFixed(1)}</span>
                    </div>
                  </div>
                </div>

                {/* Son 30 Gün İstatistikleri */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">{statistics.recentStats.period} İstatistikleri</h2>
                  
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-orange-50 rounded">
                      <p className="text-xl font-bold text-orange-600">{statistics.recentStats.preparedOrders}</p>
                      <p className="text-xs text-gray-500">Hazırlanan Sipariş</p>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded">
                      <p className="text-xl font-bold text-green-600">{formatCurrency(statistics.recentStats.preparedAmount)}</p>
                      <p className="text-xs text-gray-500">Tutar</p>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded">
                      <p className="text-xl font-bold text-purple-600">{statistics.recentStats.preparedAreaM2.toFixed(2)} m²</p>
                      <p className="text-xs text-gray-500">Alan</p>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded">
                      <p className="text-xl font-bold text-blue-600">{statistics.recentStats.preparedItems}</p>
                      <p className="text-xs text-gray-500">Ürün</p>
                    </div>
                  </div>
                </div>

                {/* Hazırlanan Siparişler Tablosu */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Hazırlanan Siparişler ({statistics.preparedOrders?.length || 0})</h2>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Sipariş ID
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Tarih
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Tutar
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Durum
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {statistics.preparedOrders?.map((order) => (
                          <tr key={`${order.orderId}-${order.qrCodeId}`} className="hover:bg-gray-50">
                            <td className="px-4 py-4 text-sm font-medium text-gray-900">
                              {order.orderId.slice(0, 8)}...
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-500">
                              {new Date(order.preparedAt).toLocaleDateString('tr-TR')}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-900">
                              {formatCurrency(order.totalAmount)}
                            </td>
                            <td className="px-4 py-4">
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                                {order.orderStatus}
                              </span>
                            </td>
                          </tr>
                        )) || []}
                        {(!statistics.preparedOrders || statistics.preparedOrders.length === 0) && (
                          <tr>
                            <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                              Henüz hazırlanmış sipariş bulunmamaktadır.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    } 