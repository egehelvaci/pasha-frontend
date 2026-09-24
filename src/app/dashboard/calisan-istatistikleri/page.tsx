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
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8fa] px-4">
        <div className="w-full max-w-md rounded-xl border border-slate-200/80 bg-white px-6 py-10 text-center shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Erişim Reddedildi</h3>
          <p className="mt-2 text-sm text-slate-500">Bu sayfaya erişim yetkiniz bulunmamaktadır.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-light tracking-[0.08em] text-neutral-900 sm:text-3xl sm:tracking-[0.12em]">
              Çalışan İstatistikleri
            </h1>
            <div className="mt-3 h-px w-[min(100%,20rem)] bg-neutral-300 sm:mt-4" />
            <p className="mt-3 text-sm text-slate-500">Çalışanların performans verilerini görüntüleyin</p>
          </div>
        </div>

        <div className="relative z-20 mb-6 rounded-xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 rounded-t-xl border-b border-slate-200/80 bg-slate-50/60 px-4 py-3 sm:px-5">
            <h3 className="text-sm font-semibold text-slate-900">Çalışan Seçimi</h3>
            {!employeesLoading && (
              <span className="text-xs text-slate-500">{employees.length} çalışan</span>
            )}
          </div>
          <div className="p-4 sm:p-5">
            {employeesLoading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-8">
                <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-[#00365a]" />
                <p className="text-sm text-slate-500">Çalışanlar yükleniyor...</p>
              </div>
            ) : (
              <div className="dropdown-container max-w-md">
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Çalışan</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setEmployeeDropdownOpen(!employeeDropdownOpen)}
                    className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15 pr-9 text-left"
                  >
                    <span className={selectedEmployeeId ? 'text-slate-900' : 'text-slate-400'}>
                      {selectedEmployeeId
                        ? employees.find(emp => emp.userId === selectedEmployeeId)
                          ? `${employees.find(emp => emp.userId === selectedEmployeeId)?.name} ${employees.find(emp => emp.userId === selectedEmployeeId)?.surname} (${employees.find(emp => emp.userId === selectedEmployeeId)?.email})`
                          : 'Çalışan seçin...'
                        : 'Çalışan seçin...'}
                    </span>
                    <svg
                      className={`absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-transform ${employeeDropdownOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.8}
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {employeeDropdownOpen && (
                    <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                      <div
                        className={`block w-full cursor-pointer px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${
                          !selectedEmployeeId ? 'bg-[#00365a]/[0.06] font-medium text-[#00365a]' : 'text-slate-700'
                        }`}
                        onClick={() => {
                          handleEmployeeChange('');
                          setEmployeeDropdownOpen(false);
                        }}
                      >
                        Çalışan seçin...
                      </div>
                      {employees.map((employee) => (
                        <div
                          key={employee.userId}
                          className={`block w-full cursor-pointer px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${
                            selectedEmployeeId === employee.userId ? 'bg-[#00365a]/[0.06] font-medium text-[#00365a]' : 'text-slate-700'
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
              <p className="mt-2 text-sm text-slate-500">Henüz çalışan bulunmamaktadır.</p>
            )}
          </div>
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-[#00365a]" />
            <p className="text-sm text-slate-500">İstatistikler yükleniyor...</p>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {statistics && !loading && (
          <div className="space-y-6">
            <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
              <div className="border-b border-slate-200/80 bg-slate-50/60 px-4 py-3 sm:px-5">
                <h3 className="text-sm font-semibold text-slate-900">Çalışan Bilgileri</h3>
              </div>
              <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Ad Soyad</p>
                  <p className="mt-2 text-sm font-medium text-slate-900">
                    {statistics.employee.name} {statistics.employee.surname}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">E-posta</p>
                  <p className="mt-2 text-sm font-medium text-slate-900">{statistics.employee.email}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Telefon</p>
                  <p className="mt-2 text-sm font-medium text-slate-900">{statistics.employee.phoneNumber}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Kullanıcı ID</p>
                  <p className="mt-2 text-sm font-medium text-slate-900">{statistics.employee.userId}</p>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
              <div className="border-b border-slate-200/80 bg-slate-50/60 px-4 py-3 sm:px-5">
                <h3 className="text-sm font-semibold text-slate-900">Genel İstatistikler</h3>
              </div>
              <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Toplam Hazırlanan</p>
                  <p className="mt-2 text-2xl font-light text-slate-900">{statistics.overallStats.preparedOrders}</p>
                </div>
                <div className="rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Toplam Tutar</p>
                  <p className="mt-2 text-2xl font-light text-slate-900">{formatCurrency(statistics.overallStats.preparedAmount)}</p>
                </div>
                <div className="rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Toplam Alan</p>
                  <p className="mt-2 text-2xl font-light text-slate-900">{statistics.overallStats.preparedAreaM2.toFixed(2)} m²</p>
                </div>
                <div className="rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Toplam Ürün</p>
                  <p className="mt-2 text-2xl font-light text-slate-900">{statistics.overallStats.preparedItems}</p>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
              <div className="border-b border-slate-200/80 bg-slate-50/60 px-4 py-3 sm:px-5">
                <h3 className="text-sm font-semibold text-slate-900">Ortalama İstatistikler</h3>
              </div>
              <div className="divide-y divide-slate-100 p-4 sm:p-5">
                <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <span className="text-sm text-slate-500">Ortalama Tutar</span>
                  <span className="text-sm font-medium text-slate-900">{formatCurrency(statistics.overallStats.averagePreparedAmount)}</span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-sm text-slate-500">Ortalama Alan</span>
                  <span className="text-sm font-medium text-slate-900">{statistics.overallStats.averagePreparedAreaM2.toFixed(2)} m²</span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-sm text-slate-500">Ortalama Ürün</span>
                  <span className="text-sm font-medium text-slate-900">{statistics.overallStats.averagePreparedItems.toFixed(1)}</span>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
              <div className="border-b border-slate-200/80 bg-slate-50/60 px-4 py-3 sm:px-5">
                <h3 className="text-sm font-semibold text-slate-900">{statistics.recentStats.period} İstatistikleri</h3>
              </div>
              <div className="grid grid-cols-2 gap-4 p-4 sm:p-5 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Hazırlanan Sipariş</p>
                  <p className="mt-2 text-2xl font-light text-slate-900">{statistics.recentStats.preparedOrders}</p>
                </div>
                <div className="rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Tutar</p>
                  <p className="mt-2 text-2xl font-light text-slate-900">{formatCurrency(statistics.recentStats.preparedAmount)}</p>
                </div>
                <div className="rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Alan</p>
                  <p className="mt-2 text-2xl font-light text-slate-900">{statistics.recentStats.preparedAreaM2.toFixed(2)} m²</p>
                </div>
                <div className="rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Ürün</p>
                  <p className="mt-2 text-2xl font-light text-slate-900">{statistics.recentStats.preparedItems}</p>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50/60 px-4 py-3 sm:px-5">
                <h3 className="text-sm font-semibold text-slate-900">Hazırlanan Siparişler</h3>
                <span className="text-xs text-slate-500">{statistics.preparedOrders?.length || 0} sipariş</span>
              </div>
              <div className="w-full overflow-x-auto">
                <table className="w-full min-w-full">
                  <thead className="bg-slate-50/60">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                        Sipariş ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                        Tarih
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                        Tutar
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                        Durum
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {statistics.preparedOrders?.map((order) => (
                      <tr key={`${order.orderId}-${order.qrCodeId}`} className="transition-colors hover:bg-slate-50/70">
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">
                          {order.orderId.slice(0, 8)}...
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {new Date(order.preparedAt).toLocaleDateString('tr-TR')}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-900">{formatCurrency(order.totalAmount)}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                            {order.orderStatus}
                          </span>
                        </td>
                      </tr>
                    )) || []}
                    {(!statistics.preparedOrders || statistics.preparedOrders.length === 0) && (
                      <tr>
                        <td colSpan={4} className="px-6 py-16 text-center">
                          <p className="text-sm font-medium text-slate-900">Henüz hazırlanmış sipariş bulunmamaktadır.</p>
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