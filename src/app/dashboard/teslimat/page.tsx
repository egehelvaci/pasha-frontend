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
  const [currentScanResult, setCurrentScanResult] = useState<any>(null);
  const [scannedBarcodes, setScannedBarcodes] = useState<{[key: string]: any}>({});
  const [activeOrders, setActiveOrders] = useState<{[orderId: string]: any}>({});
  const [showAlreadyScannedPopup, setShowAlreadyScannedPopup] = useState(false);
  const [alreadyScannedBarcodeInfo, setAlreadyScannedBarcodeInfo] = useState<any>(null);
  
  // Audio notification functions
  const playSuccessSound = () => {
    // Create success sound (higher pitch beep)
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // Higher pitch for success
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  };
  
  const playErrorSound = () => {
    // Create error sound (lower pitch, longer beep)
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(300, audioContext.currentTime); // Lower pitch for error
    oscillator.type = 'square';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.6);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.6);
  };
  
  // Sayfa yüklendiğinde input'a focus
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Tamamlanan siparişleri otomatik temizleme (5 dakika sonra)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      setActiveOrders(prev => {
        const filtered = Object.fromEntries(
          Object.entries(prev).filter(([_, orderData]) => {
            const lastUpdate = new Date(orderData.lastUpdateTime).getTime();
            const isCompleted = orderData.lastScanResult?.scanInfo?.is_completed;
            const timeDiff = now - lastUpdate;
            
            // Tamamlanan siparişleri 5 dakika sonra kaldır
            return !(isCompleted && timeDiff > 5 * 60 * 1000);
          })
        );
        return filtered;
      });
    }, 30000); // Her 30 saniyede kontrol et

    return () => clearInterval(interval);
  }, []);

  // Kullanıcı yetkisi kontrolü
  useEffect(() => {
    if (!isAdminOrEditor) {
      router.push('/dashboard');
    }
  }, [isAdminOrEditor, router]);

  // Tek barkod tarama fonksiyonu
  const scanSingleBarcode = async (barcode: string) => {
    if (!token) {
      setError('Token bulunamadı. Lütfen tekrar giriş yapın.');
      return;
    }
    
    setIsLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://pashahomeapps.up.railway.app';
      
      const response = await fetch(`${API_BASE_URL}/api/admin/barcode/scan`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          barcode: barcode
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setCurrentScanResult(data);
        setScannedBarcodes(prev => ({
          ...prev,
          [barcode]: data
        }));
        
        // Sipariş bilgilerini activeOrders'a ekle/güncelle
        if (data.order && data.order.id) {
          // Debug için console log ekle
          
          setActiveOrders(prev => ({
            ...prev,
            [data.order.id]: {
              ...data.order,
              lastScanResult: data,
              lastUpdateTime: new Date().toISOString()
            }
          }));
        }
        
        setSuccess(data.message || 'Barkod başarıyla okutuldu');
        
        // Play success sound
        try {
          playSuccessSound();
        } catch (audioError) {
        }
        
        // Success mesajını temizle
        setTimeout(() => setSuccess(''), 3000);
      } else {
        throw new Error(data.message || 'Barkod okutma başarısız');
      }
    } catch (err: any) {
      console.error('Barkod okutma hatası:', err);
      
      // Play error sound
      try {
        playErrorSound();
      } catch (audioError) {
      }
      
      // Eğer barkod zaten okutulmuşsa popup göster
      if (err.message.includes('zaten okutuldu') || err.message.includes('already scanned')) {
        setAlreadyScannedBarcodeInfo({ barcode, error: err.message });
        setShowAlreadyScannedPopup(true);
      } else {
        setError(err.message || 'Barkod okutma sırasında hata oluştu');
        setTimeout(() => setError(''), 3000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Barkod formatını kontrol etme
  const isBarcodeValid = (barcode: string) => {
    // Barkod okuyucudan gelen veriyi temizle (Enter, Tab, boşluk karakterlerini kaldır)
    const cleanBarcode = barcode.trim().replace(/[\r\n\t]/g, '');
    
    // Eski format: BAR-{sayılar}-{hex karakterler}
    const oldBarcodePattern = /^BAR-\d+-[A-F0-9]+$/;
    
    // Yeni format: 13 haneli sayı (8699160537079 gibi)
    const newBarcodePattern = /^[0-9]{13}$/;
    
    return oldBarcodePattern.test(cleanBarcode) || newBarcodePattern.test(cleanBarcode);
  };

  // Barkod temizleme fonksiyonu
  const cleanBarcode = (barcode: string) => {
    // Tüm kontrol karakterlerini ve fazla boşlukları kaldır
    let cleaned = barcode
      .trim()
      .replace(/[\r\n\t\f\v]/g, '') // Tüm kontrol karakterlerini kaldır
      .replace(/\s+/g, '') // Fazla boşlukları kaldır
      .replace(/\*/g, '-'); // Barkod okuyucudan gelen * karakterlerini - ile değiştir
    
    // Eğer yeni format (13 haneli sayı) ise büyük harfe çevirme
    if (/^[0-9]{13}$/.test(cleaned)) {
      return cleaned; // Sayısal format için büyük harfe çevirme
    }
    
    return cleaned.toUpperCase(); // Eski format için büyük harfe çevir (hex karakterler için)
  };

  // Barkod input değişikliğini dinle
  const handleBarcodeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setBarcodeInput(value);
    
    
    // Barkodu temizle
    const cleanValue = cleanBarcode(value);
    
    
    // Eğer değer boşsa veya geçerli barkod formatında değilse return
    if (!cleanValue || !isBarcodeValid(cleanValue)) {
      return;
    }
    
    // Geçerli barkod formatında ise otomatik olarak API'ye gönder
    scanSingleBarcode(cleanValue);
    
    // Input'u temizle
    setBarcodeInput('');
  };

  // Form submit fonksiyonu (Enter tuşu için)
  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!barcodeInput.trim()) {
      return;
    }
    
    // Barkodu temizle
    const barcode = cleanBarcode(barcodeInput);
    
    // Barkod formatını kontrol et
    if (!isBarcodeValid(barcode)) {
      setError(`Geçersiz barkod formatı. Desteklenen formatlar: BAR-XXXXXXXX-XXXX veya 13 haneli sayı (8699160537079). Okunan: "${barcode}"`);
      
      // Play error sound for invalid format
      try {
        playErrorSound();
      } catch (audioError) {
      }
      
      setTimeout(() => setError(''), 5000);
      return;
    }
    
    // Barkodu API'ye gönder
    await scanSingleBarcode(barcode);
    
    // Input'u temizle
    setBarcodeInput('');
    
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
                onChange={handleBarcodeInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                placeholder="Barkodu okutun veya manuel girin..."
                autoFocus
                autoComplete="off"
              />
            </div>
          </form>

          {/* Bildirimler */}
          {error && (
            <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-lg text-red-700">
              {error}
            </div>
          )}
          
          {success && (
            <div className="mt-4 p-4 bg-green-100 border border-green-300 rounded-lg">
              <div className="text-green-700 font-medium">{success}</div>
              {currentScanResult && currentScanResult.scanInfo && (
                <div className="mt-2 text-sm text-green-600">
                  İlerleme: {currentScanResult.scanInfo.current_scan_count || 0}/{currentScanResult.scanInfo.required_scans || 0} 
                  ({
                    currentScanResult.scanInfo.required_scans > 0 
                      ? Math.round((currentScanResult.scanInfo.current_scan_count / currentScanResult.scanInfo.required_scans) * 100) 
                      : 0
                  }%)
                  {currentScanResult.scanInfo.is_completed && (
                    <span className="ml-2 text-green-700 font-medium">✓ Sipariş tamamlandı!</span>
                  )}
                </div>
              )}
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



        {/* Aktif Siparişler */}
        {Object.keys(activeOrders).length > 0 && (
          <div className="mt-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Aktif Siparişler ({Object.keys(activeOrders).length})</h2>
            
            {Object.entries(activeOrders)
              .sort(([,a], [,b]) => new Date(b.lastUpdateTime).getTime() - new Date(a.lastUpdateTime).getTime())
              .map(([orderId, orderData]) => {
                const scanInfo = orderData.lastScanResult?.scanInfo;
                const isCompleted = scanInfo?.is_completed;
                
                return (
                  <div 
                    key={orderId} 
                    className={`bg-white rounded-lg shadow-sm border-l-4 ${
                      isCompleted ? 'border-green-500' : 'border-blue-500'
                    } p-6 transition-all duration-300`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-medium text-gray-800 flex items-center gap-2">
                          Sipariş #{orderId.slice(-8)}
                          {isCompleted && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              ✓ Tamamlandı
                            </span>
                          )}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Son güncelleme: {new Date(orderData.lastUpdateTime).toLocaleString('tr-TR')}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setActiveOrders(prev => {
                            const newOrders = { ...prev };
                            delete newOrders[orderId];
                            return newOrders;
                          });
                        }}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        title="Siparişi kaldır"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Müşteri Bilgileri */}
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">Müşteri Bilgileri</h4>
                        <div className="space-y-1 text-sm">
                          <div><span className="text-gray-600">Müşteri:</span> <span className="font-medium">{orderData.customer?.name}</span></div>
                          <div><span className="text-gray-600">E-mail:</span> <span>{orderData.customer?.email}</span></div>
                          <div><span className="text-gray-600">Mağaza:</span> <span>{orderData.customer?.store?.kurum_adi}</span></div>
                        </div>
                      </div>

                      {/* Sipariş Detayları */}
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">Sipariş Detayları</h4>
                        <div className="space-y-1 text-sm">
                          <div><span className="text-gray-600">Durum:</span> <span className="font-medium">{orderData.status}</span></div>
                          <div><span className="text-gray-600">Toplam:</span> <span className="font-medium">{orderData.total_price} TL</span></div>
                          <div><span className="text-gray-600">Ürün Sayısı:</span> <span>{orderData.items?.length || 0}</span></div>
                        </div>
                      </div>

                      {/* İlerleme Durumu */}
                      {scanInfo && (
                        <div>
                          <h4 className="font-medium text-gray-700 mb-2">İlerleme Durumu</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>İlerleme:</span>
                              <span className="font-medium">{scanInfo.current_scan_count || 0}/{scanInfo.required_scans || 0}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full transition-all duration-300 ${
                                  isCompleted ? 'bg-green-600' : 'bg-blue-600'
                                }`}
                                style={{ 
                                  width: `${
                                    scanInfo.required_scans > 0 
                                      ? Math.round((scanInfo.current_scan_count / scanInfo.required_scans) * 100) 
                                      : 0
                                  }%` 
                                }}
                              ></div>
                            </div>
                            <div className="text-xs text-gray-600 text-center">
                              %{
                                scanInfo.required_scans > 0 
                                  ? Math.round((scanInfo.current_scan_count / scanInfo.required_scans) * 100) 
                                  : 0
                              } tamamlandı
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Son Barkod Bilgisi */}
                    {orderData.lastScanResult && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-center">
                          <div>
                            <h5 className="text-sm font-medium text-gray-700">Son Okutlan Barkod</h5>
                            <p className="text-xs font-mono text-gray-600 mt-1">{orderData.lastScanResult.barcode?.barcode}</p>
                          </div>
                          <div className="text-xs text-gray-500">
                            {orderData.lastScanResult.message}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Already Scanned Popup */}
      {showAlreadyScannedPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-red-800">Barkod Zaten Okutulmuş</h3>
              </div>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                <span className="font-mono bg-gray-100 px-2 py-1 rounded">{alreadyScannedBarcodeInfo?.barcode}</span>
              </p>
              <p className="text-sm text-red-600">
                {alreadyScannedBarcodeInfo?.error}
              </p>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setShowAlreadyScannedPopup(false);
                  setAlreadyScannedBarcodeInfo(null);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Tamam
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}