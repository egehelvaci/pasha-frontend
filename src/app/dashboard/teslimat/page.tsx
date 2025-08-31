"use client";
import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useToken } from '@/app/hooks/useToken';

export default function TeslimatPage() {
  const { isAdmin, isAdminOrEditor } = useAuth();
  const router = useRouter();
  const token = useToken();
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [barcodeInput, setBarcodeInput] = useState('');
  const [barcodeList, setBarcodeList] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lastScanResults, setLastScanResults] = useState<any>(null);
  const [showResults, setShowResults] = useState(false);
  
  // Sayfa yüklendiğinde input'a focus
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Kullanıcı yetkisi kontrolü
  useEffect(() => {
    if (!isAdminOrEditor) {
      router.push('/dashboard');
    }
  }, [isAdminOrEditor, router]);

  // Barkod ekleme fonksiyonu
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!barcodeInput.trim()) {
      setError('Lütfen barkod girin');
      return;
    }
    
    // Aynı barkod kontrolü
    if (barcodeList.includes(barcodeInput.trim())) {
      setError('Bu barkod zaten listede mevcut');
      setBarcodeInput('');
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    // Listeye ekle
    setBarcodeList([...barcodeList, barcodeInput.trim()]);
    setBarcodeInput('');
    setError('');
    setSuccess('Barkod eklendi');
    
    // Success mesajını temizle
    setTimeout(() => setSuccess(''), 2000);
    
    // Input'a tekrar focus
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Barkodu listeden silme
  const removeBarcode = (index: number) => {
    const newList = barcodeList.filter((_, i) => i !== index);
    setBarcodeList(newList);
  };

  // Listeyi temizleme
  const clearList = () => {
    if (window.confirm('Tüm listeyi temizlemek istediğinize emin misiniz?')) {
      setBarcodeList([]);
      setSuccess('Liste temizlendi');
      setTimeout(() => setSuccess(''), 2000);
    }
  };

  // API'ye gönderme fonksiyonu
  const sendToAPI = async () => {
    if (barcodeList.length === 0) {
      setError('Gönderilecek barkod yok');
      return;
    }
    
    if (!token) {
      setError('Token bulunamadı. Lütfen tekrar giriş yapın.');
      return;
    }
    
    setIsLoading(true);
    setError('');
    setShowResults(false);
    
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://pashahomeapps.up.railway.app';
      
      const response = await fetch(`${API_BASE_URL}/api/admin/barcode/scan-multiple`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          barcodes: barcodeList
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setLastScanResults(data);
        setShowResults(true);
        setBarcodeList([]); // Listeyi temizle
        
        const { summary } = data;
        setSuccess(
          `Teslimat tamamlandı! ` +
          `${summary.total_scanned} başarılı, ${summary.total_failed} başarısız. ` +
          `${summary.completed_orders_count} sipariş tamamlandı.`
        );
      } else {
        throw new Error(data.message || 'Teslimat işlemi başarısız');
      }
    } catch (err: any) {
      console.error('Teslimat hatası:', err);
      setError(err.message || 'Teslimat sırasında hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAdminOrEditor) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Teslimat</h1>
          <p className="text-gray-600 mt-2">Barkod okutarak teslimat işlemi gerçekleştirin</p>
        </div>

        {/* Barkod Input */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <form onSubmit={handleBarcodeSubmit} className="space-y-4">
            <div>
              <label htmlFor="barcode" className="block text-sm font-medium text-gray-700 mb-2">
                Barkod Okutun
              </label>
              <input
                ref={inputRef}
                type="text"
                id="barcode"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                placeholder="Barkodu okutun veya manuel girin..."
                autoFocus
                autoComplete="off"
              />
            </div>
            
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Ekle
              </button>
              
              {barcodeList.length > 0 && (
                <button
                  type="button"
                  onClick={clearList}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Listeyi Temizle
                </button>
              )}
            </div>
          </form>

          {/* Bildirimler */}
          {error && (
            <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-lg text-red-700">
              {error}
            </div>
          )}
          
          {success && (
            <div className="mt-4 p-3 bg-green-100 border border-green-300 rounded-lg text-green-700">
              {success}
            </div>
          )}
        </div>

        {/* Barkod Listesi */}
        {barcodeList.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">
                Barkod Listesi ({barcodeList.length})
              </h2>
              <button
                onClick={sendToAPI}
                disabled={isLoading}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Gönderiliyor...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Teslim Et
                  </>
                )}
              </button>
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              <div className="space-y-2">
                {barcodeList.map((barcode, index) => (
                  <div 
                    key={index} 
                    className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                      <span className="font-mono text-gray-800">{barcode}</span>
                    </div>
                    <button
                      onClick={() => removeBarcode(index)}
                      className="text-red-500 hover:text-red-700 transition-colors"
                      title="Sil"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Son Teslimat Sonuçları */}
        {showResults && lastScanResults && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Son Teslimat Sonuçları</h2>
            
            {/* Özet Bilgileri */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="text-sm text-blue-600">Toplam İşlenen</div>
                <div className="text-xl font-bold text-blue-700">{lastScanResults.summary.total_scanned + lastScanResults.summary.total_failed}</div>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <div className="text-sm text-green-600">Başarılı</div>
                <div className="text-xl font-bold text-green-700">{lastScanResults.summary.total_scanned}</div>
              </div>
              <div className="bg-red-50 rounded-lg p-3">
                <div className="text-sm text-red-600">Başarısız</div>
                <div className="text-xl font-bold text-red-700">{lastScanResults.summary.total_failed}</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-3">
                <div className="text-sm text-purple-600">Tamamlanan Sipariş</div>
                <div className="text-xl font-bold text-purple-700">{lastScanResults.summary.completed_orders_count}</div>
              </div>
            </div>
            
            {/* Detaylı Sonuçlar */}
            <div className="max-h-64 overflow-y-auto">
              <div className="space-y-2">
                {lastScanResults.results.map((result: any, index: number) => (
                  <div 
                    key={index}
                    className={`p-3 rounded-lg border ${
                      result.success 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-mono text-sm font-medium">{result.barcode}</div>
                        {result.success ? (
                          <div className="text-xs text-green-600 mt-1">
                            ✓ Başarıyla işlendi
                            {result.scanInfo && (
                              <span className="ml-2">
                                - {new Date(result.scanInfo.scannedAt || Date.now()).toLocaleString('tr-TR')}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-red-600 mt-1">
                            ✗ {result.error}
                          </div>
                        )}
                      </div>
                      <div className={`px-2 py-1 text-xs font-medium rounded ${
                        result.success 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {result.success ? 'Başarılı' : 'Başarısız'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Sonuçları kapat butonu */}
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowResults(false)}
                className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Sonuçları Gizle
              </button>
            </div>
          </div>
        )}

        {/* İstatistikler */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-600">Toplam Barkod</div>
            <div className="text-2xl font-bold text-blue-600">{barcodeList.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-600">Son Eklenen</div>
            <div className="text-lg font-mono text-gray-800 truncate">
              {barcodeList[barcodeList.length - 1] || '-'}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-600">Durum</div>
            <div className="text-lg font-medium text-green-600">
              {isLoading ? 'Gönderiliyor...' : 'Hazır'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}