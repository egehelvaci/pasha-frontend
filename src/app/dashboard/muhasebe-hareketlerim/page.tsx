'use client';

import React, { useEffect, useState } from 'react';
import { getMuhasebeHareketleri, MuhasebeHareketleriResponse } from '@/services/api';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { FaMoneyBillWave, FaShoppingCart, FaCheckCircle, FaClock, FaWallet, FaCreditCard, FaChartLine, FaFileInvoiceDollar } from 'react-icons/fa';

export default function MuhasebeHareketlerimPage() {
  const { user, isAdmin } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<MuhasebeHareketleriResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'hareketler' | 'siparisler' | 'odemeler'>('hareketler');

  useEffect(() => {
    // Admin kullanıcıları bu sayfaya erişemez
    if (isAdmin) {
      router.push('/dashboard');
      return;
    }

    // canSeePrice kontrolü
    if (user && !user.canSeePrice) {
      router.push('/dashboard');
      return;
    }

    fetchMuhasebeData();
  }, [isAdmin, user, router]);

  const fetchMuhasebeData = async () => {
    try {
      setLoading(true);
      const response = await getMuhasebeHareketleri();
      setData(response);
    } catch (err: any) {
      setError(err.message || 'Veriler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSiparisStatusBadge = (status: string) => {
    const statusMap: { [key: string]: { label: string; color: string; icon: React.ReactNode } } = {
      'PENDING': { 
        label: 'Bekliyor', 
        color: 'bg-yellow-100 text-yellow-800',
        icon: <FaClock className="w-3 h-3" />
      },
      'DELIVERED': { 
        label: 'Teslim Edildi', 
        color: 'bg-green-100 text-green-800',
        icon: <FaCheckCircle className="w-3 h-3" />
      },
      'PROCESSING': {
        label: 'İşleniyor',
        color: 'bg-blue-100 text-blue-800',
        icon: <FaClock className="w-3 h-3" />
      },
      'SHIPPED': {
        label: 'Kargoda',
        color: 'bg-purple-100 text-purple-800',
        icon: <FaShoppingCart className="w-3 h-3" />
      }
    };
    return statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-800', icon: null };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00365a]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchMuhasebeData}
            className="px-4 py-2 bg-[#00365a] text-white rounded-lg hover:bg-[#004170] transition-colors"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { ozet, muhasebeHareketleri, siparisler, odemeler } = data.data;

  return (
    <div className="container-responsive py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Muhasebe Hareketlerim</h1>
        <p className="text-gray-600">Finansal özet ve hareket detaylarınız</p>
      </div>

      {/* Özet Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Güncel Bakiye */}
        <div className={`bg-gradient-to-r ${ozet.guncelBakiye < 0 ? 'from-red-500 to-red-600' : 'from-green-500 to-green-600'} rounded-xl p-6 text-white`}>
          <div className="flex items-center justify-between mb-2">
            <FaWallet className="text-3xl opacity-80" />
            <span className="text-xs bg-white/20 px-2 py-1 rounded">Güncel</span>
          </div>
          <p className="text-sm opacity-90 mb-1">
            {ozet.guncelBakiye < 0 ? 'Borç Durumu' : 'Alacak Durumu'}
          </p>
          <p className="text-2xl font-bold">{formatCurrency(Math.abs(ozet.guncelBakiye))}</p>
          <p className="text-xs mt-1 opacity-90">
            {ozet.guncelBakiye < 0 ? 'Borçlusunuz' : 'Alacaklısınız'}
          </p>
        </div>

        {/* Toplam Harcama */}
        <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <FaMoneyBillWave className="text-3xl opacity-80" />
            <span className="text-xs bg-white/20 px-2 py-1 rounded">Dönem</span>
          </div>
          <p className="text-sm opacity-90 mb-1">Toplam Harcama</p>
          <p className="text-2xl font-bold">{formatCurrency(ozet.toplamHarcama)}</p>
        </div>

        {/* Toplam Ödeme */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <FaCreditCard className="text-3xl opacity-80" />
            <span className="text-xs bg-white/20 px-2 py-1 rounded">Dönem</span>
          </div>
          <p className="text-sm opacity-90 mb-1">Toplam Ödeme</p>
          <p className="text-2xl font-bold">{formatCurrency(ozet.toplamOdeme)}</p>
        </div>

        {/* Sipariş Özeti */}
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <FaShoppingCart className="text-3xl opacity-80" />
            <span className="text-xs bg-white/20 px-2 py-1 rounded">{ozet.toplamSiparisSayisi} Adet</span>
          </div>
          <p className="text-sm opacity-90 mb-1">Sipariş Tutarı</p>
          <p className="text-2xl font-bold">{formatCurrency(ozet.toplamSiparisTutari)}</p>
          <div className="mt-2 flex gap-4 text-xs">
            <span className="flex items-center gap-1">
              <FaClock className="w-3 h-3" />
              {ozet.bekleyenSiparisler} Bekleyen
            </span>
            <span className="flex items-center gap-1">
              <FaCheckCircle className="w-3 h-3" />
              {ozet.teslimEdilenSiparisler} Teslim
            </span>
          </div>
        </div>
      </div>

      {/* Tab Navigasyon */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="flex flex-wrap border-b border-gray-200">
          <button
            onClick={() => setActiveTab('hareketler')}
            className={`px-6 py-3 font-medium text-sm transition-colors ${
              activeTab === 'hareketler'
                ? 'text-[#00365a] border-b-2 border-[#00365a]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <FaChartLine className="w-4 h-4" />
              Muhasebe Hareketleri ({muhasebeHareketleri.length})
            </div>
          </button>
          <button
            onClick={() => setActiveTab('siparisler')}
            className={`px-6 py-3 font-medium text-sm transition-colors ${
              activeTab === 'siparisler'
                ? 'text-[#00365a] border-b-2 border-[#00365a]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <FaShoppingCart className="w-4 h-4" />
              Siparişler ({siparisler.length})
            </div>
          </button>
          <button
            onClick={() => setActiveTab('odemeler')}
            className={`px-6 py-3 font-medium text-sm transition-colors ${
              activeTab === 'odemeler'
                ? 'text-[#00365a] border-b-2 border-[#00365a]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <FaCreditCard className="w-4 h-4" />
              Ödemeler ({odemeler.length})
            </div>
          </button>
        </div>

        {/* Tab İçeriği */}
        <div className="p-6">
          {/* Muhasebe Hareketleri */}
          {activeTab === 'hareketler' && (
            <div>
              {muhasebeHareketleri.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Henüz muhasebe hareketi bulunmuyor.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-gray-200">
                      <tr>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Tarih</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">İşlem Türü</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Açıklama</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700">Tutar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {muhasebeHareketleri.map((hareket) => (
                        <tr key={hareket.id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {formatDate(hareket.tarih)}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                              hareket.harcamaMi
                                ? 'bg-red-100 text-red-800'
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {hareket.harcamaMi ? (
                                <FaMoneyBillWave className="w-3 h-3" />
                              ) : (
                                <FaWallet className="w-3 h-3" />
                              )}
                              {hareket.islemTuru}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-900">
                            {hareket.aciklama.replace(' - Onay Kodu: N/A', '').replace('Onay Kodu: N/A', '')}
                          </td>
                          <td className={`py-3 px-4 text-right font-medium ${
                            hareket.harcamaMi ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {hareket.harcamaMi ? '-' : '+'}{formatCurrency(hareket.tutar)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Siparişler */}
          {activeTab === 'siparisler' && (
            <div>
              {siparisler.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Henüz sipariş bulunmuyor.</p>
              ) : (
                <div className="space-y-4">
                  {siparisler.map((siparis) => {
                    const status = getSiparisStatusBadge(siparis.durum);
                    return (
                      <div key={siparis.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="font-semibold text-gray-900">#{siparis.id}</h3>
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                                {status.icon}
                                {status.label}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">
                              {formatDate(siparis.olusturmaTarihi)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-gray-900">{formatCurrency(siparis.toplamTutar)}</p>
                            <p className="text-sm text-gray-600">{siparis.urunSayisi} ürün</p>
                          </div>
                        </div>

                        {/* Ürün Detayları */}
                        <div className="mt-4 border-t border-gray-100 pt-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Ürün Detayları</h4>
                          <div className="space-y-2">
                            {siparis.urunler.map((urun, index) => (
                              <div key={index} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg p-3">
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900">{urun.urunAdi}</p>
                                  <p className="text-gray-600">
                                    {urun.koleksiyonAdi} ({urun.koleksiyonKodu}) • {urun.en}x{urun.boy} cm
                                  </p>
                                  <div className="flex gap-2 mt-1">
                                    {urun.sasakVar && (
                                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Saçaklı</span>
                                    )}
                                    <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">{urun.kesimTipi}</span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-gray-600">{urun.miktar} adet</p>
                                  <p className="font-medium text-gray-900">{formatCurrency(urun.toplamFiyat)}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Ödemeler */}
          {activeTab === 'odemeler' && (
            <div>
              {odemeler.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Henüz ödeme bulunmuyor.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-gray-200">
                      <tr>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Tarih</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Referans No</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Açıklama</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Durum</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700">Tutar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {odemeler.map((odeme) => (
                        <tr key={odeme.id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {formatDate(odeme.odemeTarihi)}
                          </td>
                          <td className="py-3 px-4 text-sm font-mono text-gray-900">
                            {odeme.referansNo}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-900">
                            {odeme.aciklama}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                              odeme.durum === 'SUCCESS'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {odeme.durum === 'SUCCESS' && <FaCheckCircle className="w-3 h-3" />}
                              {odeme.durum === 'SUCCESS' ? 'Başarılı' : odeme.durum}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-green-600">
                            {formatCurrency(odeme.tutar)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}