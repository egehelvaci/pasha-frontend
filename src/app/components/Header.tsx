'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import FinancialSummaryMobile from '../components/FinancialSummaryMobile';
import { FaUser, FaSignOutAlt, FaCog, FaShoppingCart } from 'react-icons/fa';

type HeaderProps = {
  title: string;
  user: {
    name: string;
    imageUrl: string;
    userType: {
      id: number;
    };
  };
};

interface NavigationItem {
  name: string;
  href: string;
  icon: JSX.Element;
  adminOnly?: boolean;
}

const Header = ({ title, user }: HeaderProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, isAdmin, user: authUser } = useAuth(); // AuthContext'teki user'ı al
  const [isBlurred, setIsBlurred] = useState(true);
  const [cartItems, setCartItems] = useState<number>(0);
  const [isMounted, setIsMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  
  // Component mount kontrolü
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('headerBlur');
      if (stored === 'false') setIsBlurred(false);
      else setIsBlurred(true);
    }
  }, []);
  
  // Sepet verilerini getir
  useEffect(() => {
    // Sadece client-side'da ve component mount olduktan sonra çalıştır
    if (!isMounted || typeof window === 'undefined') {
      return;
    }

    const fetchCartData = async () => {
      try {
        // Token kontrolü
        const token = localStorage.getItem('token');
        if (!token) {
          console.log('Token bulunamadı, sepet verisi çekilmiyor');
          return;
        }
        
        // AbortController ile timeout kontrolü
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 saniye timeout
        
        const res = await fetch("https://pasha-backend-production.up.railway.app/api/cart", {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          signal: controller.signal,
          cache: 'no-cache'
        });
        
        clearTimeout(timeoutId);
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const data = await res.json();
        
        if (data.success && data.data) {
          // Ürün çeşidi sayısını göster (toplam adet değil)
          setCartItems(data.data.items?.length || 0);
        } else {
          console.warn('Sepet verisi alınamadı:', data.message || 'Bilinmeyen hata');
          setCartItems(0);
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.warn('Sepet verisi çekme işlemi zaman aşımına uğradı');
        } else if (error.message?.includes('Failed to fetch')) {
          console.warn('Ağ bağlantısı sorunu: Sepet verisi çekilemedi');
        } else if (error.message?.includes('NetworkError')) {
          console.warn('Network hatası: Sepet verisi çekilemedi');
        } else {
          console.error("Sepet bilgileri alınamadı:", error);
        }
        // Hata durumunda sepet sayısını sıfırla
        setCartItems(0);
      }
    };

    // İlk yükleme
    fetchCartData();
    
    // 2 dakikada bir sepeti yenile (daha az sıklık)
    const intervalId = setInterval(fetchCartData, 120000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [isMounted]); // isMounted dependency'si eklendi

  const handleLogout = async () => {
    const result = await logout();
    if (result.success) {
      router.push('/');
    }
  };
  
  const handleBlurToggle = () => {
    setIsBlurred((prev) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('headerBlur', String(!prev));
      }
      return !prev;
    });
  };

  // Finansal bilgileri AuthContext'teki store'dan al
  const getFinancialInfo = () => {
    if (authUser?.store) {
      // Mağaza kullanıcısı için yeni sistem
      return {
        bakiye: authUser.store.bakiye || 0,
        acikHesapLimiti: authUser.store.acik_hesap_tutari || 0,
        toplamKullanilabilir: authUser.store.toplam_kullanilabilir || ((authUser.store.bakiye || 0) + (authUser.store.acik_hesap_tutari || 0)),
        limitsizAcikHesap: authUser.store.limitsiz_acik_hesap || false
      };
    }
    // Admin kullanıcıları için eski format (eğer hala kullanılıyorsa)
    return {
      bakiye: 0,
      acikHesapLimiti: 0,
      toplamKullanilabilir: 0,
      limitsizAcikHesap: false
    };
  };

  const financialInfo = getFinancialInfo();
  
  const navigation: NavigationItem[] = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.69z" />
          <path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75v4.5a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198a2.29 2.29 0 00.091-.086L12 5.43z" />
        </svg>
      ),
    },
    {
      name: 'Siparişler',
      href: '/dashboard/siparisler',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path d="M2.25 2.25a.75.75 0 000 1.5h1.386c.17 0 .318.114.362.278l2.558 9.592a3.752 3.752 0 00-2.806 3.63c0 .414.336.75.75.75h15.75a.75.75 0 000-1.5H5.378A2.25 2.25 0 017.5 15h11.218a.75.75 0 00.674-.421 60.358 60.358 0 002.96-7.228.75.75 0 00-.525-.965A60.864 60.864 0 005.68 4.509l-.232-.867A1.875 1.875 0 003.636 2.25H2.25zM3.75 20.25a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM16.5 20.25a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" />
        </svg>
      ),
    },
    {
      name: 'Ürünler',
      href: '/dashboard/urunler/liste',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path d="M3.375 3C2.339 3 1.5 3.84 1.5 4.875v.75c0 1.036.84 1.875 1.875 1.875h17.25c1.035 0 1.875-.84 1.875-1.875v-.75C22.5 3.839 21.66 3 20.625 3H3.375z" />
          <path fillRule="evenodd" d="M3.087 9l.54 9.176A3 3 0 006.62 21h10.757a3 3 0 002.995-2.824L20.913 9H3.087zm6.163 3.75A.75.75 0 0110 12h4a.75.75 0 010 1.5h-4a.75.75 0 01-.75-.75z" clipRule="evenodd" />
        </svg>
      ),
    },
    {
      name: 'E-Katalog',
      href: '/dashboard/e-katalog',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M4.125 3C3.089 3 2.25 3.84 2.25 4.875V18a3 3 0 003 3h15.75a.75.75 0 000-1.5H5.25a1.5 1.5 0 01-1.5-1.5v-.75c0-.621.504-1.125 1.125-1.125h15.375c.621 0 1.125-.504 1.125-1.125V4.875c0-1.036-.84-1.875-1.875-1.875H4.125zM12 7.5a.75.75 0 01.75.75v2.25h2.25a.75.75 0 010 1.5h-2.25v2.25a.75.75 0 01-1.5 0v-2.25H9a.75.75 0 010-1.5h2.25V8.25A.75.75 0 0112 7.5z" clipRule="evenodd" />
        </svg>
      ),
    },
    {
      name: 'Stok',
      href: '/dashboard/stok',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path d="M3.375 3C2.339 3 1.5 3.84 1.5 4.875v.75c0 1.036.84 1.875 1.875 1.875h17.25c1.035 0 1.875-.84 1.875-1.875v-.75C22.5 3.839 21.66 3 20.625 3H3.375z" />
          <path fillRule="evenodd" d="M3.087 9l.54 9.176A3 3 0 006.62 21h10.757a3 3 0 002.995-2.824L20.913 9H3.087zM12 10.5a.75.75 0 01.75.75v4.94l1.72-1.72a.75.75 0 111.06 1.06l-3 3a.75.75 0 01-1.06 0l-3-3a.75.75 0 111.06-1.06l1.72 1.72v-4.94a.75.75 0 01.75-.75z" clipRule="evenodd" />
        </svg>
      ),
      adminOnly: true,
    },
    {
      name: 'Mağazalar',
      href: '/dashboard/magazalar',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M8.25 6.75a3.75 3.75 0 117.5 0 3.75 3.75 0 01-7.5 0zM15.75 9.75a3 3 0 116 0 3 3 0 01-6 0zM2.25 9.75a3 3 0 116 0 3 3 0 01-6 0zM6.31 15.117A6.745 6.745 0 0112 12a6.745 6.745 0 016.709 7.498.75.75 0 01-.372.568A12.696 12.696 0 0112 21.75c-2.305 0-4.47-.612-6.337-1.684a.75.75 0 01-.372-.568 6.787 6.787 0 011.019-4.38z" clipRule="evenodd" />
          <path d="M5.082 14.254a8.287 8.287 0 00-1.308 5.135 9.687 9.687 0 01-1.764-.44l-.115-.04a.563.563 0 01-.373-.487l-.01-.121a3.75 3.75 0 013.57-4.047zM20.226 19.389a8.287 8.287 0 00-1.308-5.135 3.75 3.75 0 013.57 4.047l-.01.121a.563.563 0 01-.373.486l-.115.04c-.567.2-1.156.349-1.764.441z" />
        </svg>
      ),
      adminOnly: true,
    },
    {
      name: 'Fiyat Listeleri',
      href: '/dashboard/fiyat-listeleri',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM9 7.5A.75.75 0 009 9h1.5c.98 0 1.813.626 2.122 1.5H9v.75h3.622a2.251 2.251 0 01-2.122 1.5H9v.75h1.5a2.25 2.25 0 002.122 1.5H9v.75h6a.75.75 0 000-1.5h-3.622a.75.75 0 01.022-.034c.399-.575.63-1.27.63-2.016v-.001c0-.371-.075-.74-.221-1.08a3.751 3.751 0 01-.409-.82V9h3.6a.75.75 0 000-1.5H9z" clipRule="evenodd" />
        </svg>
      ),
      adminOnly: true,
    },
    {
      name: 'Koleksiyon',
      href: '/dashboard/koleksiyonlar/liste',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path d="M4 4h16v2H4V4zm0 4h16v2H4V8zm0 4h10v2H4v-2zm0 4h10v2H4v-2z" />
        </svg>
      ),
    },
    {
      name: 'Analiz',
      href: '/dashboard/analizler',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path d="M18.375 2.25c-1.035 0-1.875.84-1.875 1.875v15.75c0 1.035.84 1.875 1.875 1.875h.75c1.035 0 1.875-.84 1.875-1.875V4.125c0-1.036-.84-1.875-1.875-1.875h-.75zM9.75 8.625c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-.75a1.875 1.875 0 01-1.875-1.875V8.625zM3 13.125c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v6.75c0 1.035-.84 1.875-1.875 1.875h-.75A1.875 1.875 0 013 19.875v-6.75z" />
        </svg>
      ),
      adminOnly: true,
    },
    {
      name: 'Ürün Kuralları',
      href: '/dashboard/urun-kurallari',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M2.25 13.5a8.25 8.25 0 018.25-8.25.75.75 0 01.75.75v6.75H18a.75.75 0 01.75.75 8.25 8.25 0 01-16.5 0z" clipRule="evenodd" />
          <path fillRule="evenodd" d="M12.75 3a.75.75 0 01.75-.75 8.25 8.25 0 018.25 8.25.75.75 0 01-.75.75h-7.5V3z" clipRule="evenodd" />
        </svg>
      ),
      adminOnly: true,
    },
    {
      name: 'Ödeme',
      href: '/dashboard/odemeler',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path d="M2.273 5.625A4.483 4.483 0 015.25 4.5h13.5c1.141 0 2.227.425 3.048 1.19A3.75 3.75 0 0121.75 9v.75a2.25 2.25 0 01-2.25 2.25H4.5A2.25 2.25 0 012.25 9.75V9a3.75 3.75 0 01.023-3.375zM4.5 15.75a2.25 2.25 0 00-2.25 2.25v.75c0 .414.336.75.75.75h18a.75.75 0 00.75-.75v-.75a2.25 2.25 0 00-2.25-2.25H4.5z" />
        </svg>
      ),
    },
  ];

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="container-responsive">
        {/* Ana Header Kısmı */}
        <div className="flex items-center justify-between py-3">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/dashboard" className="flex-shrink-0">
              <img 
                src="/black-logo.svg" 
                alt="Paşa Home" 
                className="h-8 w-auto cursor-pointer" 
              />
            </Link>
          </div>
          
          {/* Desktop: Sağ taraf kontrolleri */}
          <div className="hidden lg:flex items-center space-x-4">
            {/* Finansal özet kutusu - Sadece mağaza kullanıcıları için */}
            {authUser?.store && (
              <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                <div className={`${isBlurred ? 'blur-sm' : ''} flex gap-4 transition-all duration-200`}>
                  <div className="text-center">
                    <span className="block font-semibold text-gray-700">Bakiye</span>
                    <span className={`font-medium ${financialInfo.bakiye < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {financialInfo.bakiye.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                    </span>
                  </div>
                  <div className="text-center">
                    <span className="block font-semibold text-gray-700">Açık Hesap</span>
                    <span className="text-blue-600 font-medium">
                      {financialInfo.limitsizAcikHesap 
                        ? 'Limitsiz' 
                        : `${financialInfo.acikHesapLimiti.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`
                      }
                    </span>
                  </div>
                  <div className="text-center">
                    <span className="block font-semibold text-gray-700">Toplam</span>
                    <span className="text-purple-600 font-medium">
                      {financialInfo.limitsizAcikHesap 
                        ? 'Limitsiz' 
                        : `${financialInfo.toplamKullanilabilir.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`
                      }
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="ml-2 p-1.5 bg-white rounded-full hover:bg-gray-100 transition-colors"
                  onClick={handleBlurToggle}
                  title={isBlurred ? 'Bilgileri Göster' : 'Bilgileri Gizle'}
                >
                  {isBlurred ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-600">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12.001C3.226 15.376 7.113 19.5 12 19.5c1.772 0 3.432-.457 4.899-1.277M6.228 6.228A10.45 10.45 0 0112 4.5c4.887 0 8.774 4.124 10.066 7.499a10.523 10.523 0 01-4.293 5.226M6.228 6.228l11.544 11.544M6.228 6.228L3 3m15 15l-3-3" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-600">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12S5.25 6.75 12 6.75 21.75 12 21.75 12S18.75 17.25 12 17.25 2.25 12 2.25 12z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            )}
            
            {/* Sepet ikonu */}
            <Link href="/dashboard/sepetim" className="relative group">
              <div className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-gray-700">
                  <path fillRule="evenodd" d="M7.5 6v.75H5.513c-.96 0-1.764.724-1.865 1.679l-1.263 12A1.875 1.875 0 004.25 22.5h15.5a1.875 1.875 0 001.865-2.071l-1.263-12a1.875 1.875 0 00-1.865-1.679H16.5V6a4.5 4.5 0 10-9 0zM12 3a3 3 0 00-3 3v.75h6V6a3 3 0 00-3-3zm-3 8.25a3 3 0 106 0v-.75a.75.75 0 011.5 0v.75a4.5 4.5 0 11-9 0v-.75a.75.75 0 011.5 0v.75z" clipRule="evenodd" />
                </svg>
                {cartItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {cartItems > 99 ? '99+' : cartItems}
                  </span>
                )}
              </div>
            </Link>
            
            {/* Kullanıcı dropdown */}
            <div className="relative group">
              <div className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors">
                <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-gray-700 hidden xl:block">{user.name}</span>
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              
              {/* Dropdown menü */}
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <button 
                  onClick={() => setIsProfileModalOpen(true)}
                  className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <FaUser size={16} />
                    <span>Profiliniz</span>
                  </div>
                </button>
                {isAdmin && (
                <Link href="/dashboard/ayarlar" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-2">
                    <FaCog size={16} />
                    <span>Ayarlar</span>
                  </div>
                </Link>
                )}
                <hr className="my-1 border-gray-200" />
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <span className="mr-2">
                      <FaSignOutAlt size={16} />
                    </span>
                    Çıkış Yap
                  </div>
                </button>
              </div>
            </div>
          </div>
          
          {/* Mobil: Sağ taraf kontrolleri */}
          <div className="flex lg:hidden items-center space-x-2">
            {/* Sepet ikonu */}
            <Link href="/dashboard/sepetim" className="relative p-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-gray-700">
                <path fillRule="evenodd" d="M7.5 6v.75H5.513c-.96 0-1.764.724-1.865 1.679l-1.263 12A1.875 1.875 0 004.25 22.5h15.5a1.875 1.875 0 001.865-2.071l-1.263-12a1.875 1.875 0 00-1.865-1.679H16.5V6a4.5 4.5 0 10-9 0zM12 3a3 3 0 00-3 3v.75h6V6a3 3 0 00-3-3zm-3 8.25a3 3 0 106 0v-.75a.75.75 0 011.5 0v.75a4.5 4.5 0 11-9 0v-.75a.75.75 0 011.5 0v.75z" clipRule="evenodd" />
              </svg>
              {cartItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {cartItems > 99 ? '99+' : cartItems}
                </span>
              )}
            </Link>
            
            {/* Hamburger menü */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`hamburger p-2 ${isMobileMenuOpen ? 'active' : ''}`}
              aria-label="Menüyü aç/kapat"
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
          </div>
        </div>
        
        {/* Mobil finansal özet - Sadece mağaza kullanıcıları için */}
        {authUser?.store && (
          <FinancialSummaryMobile 
            bakiye={financialInfo.bakiye}
            acikHesapLimiti={financialInfo.acikHesapLimiti}
            limitsizAcikHesap={financialInfo.limitsizAcikHesap}
          />
        )}
        
        {/* Desktop navigasyon */}
        <nav className="hidden lg:block py-2">
          <div className="flex space-x-1 ">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              if (item.adminOnly && !isAdmin) return null;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.name}
                </Link>
              );
            })}            
          </div>
        </nav>
      </div>
      
      {/* Mobil menü overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>
          
          {/* Menü paneli */}
          <div className="fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-white shadow-xl z-50 transform transition-transform duration-300">
            <div className="flex flex-col h-full">
              {/* Menü başlığı */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{user.name}</div>
                    <div className="text-sm text-gray-500">
                      {authUser?.userType === 'admin' ? 'Admin' : 'Kullanıcı'}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Finansal özet - Sadece mağaza kullanıcıları için */}
              {authUser?.store && (
                <div className="p-4 bg-gray-50 border-b border-gray-200">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className={`${isBlurred ? 'blur-sm' : ''} transition-all duration-200`}>
                      <div className="text-xs font-semibold text-gray-600 mb-1">Bakiye</div>
                      <div className={`text-sm font-bold ${financialInfo.bakiye < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {financialInfo.bakiye.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                      </div>
                    </div>
                    <div className={`${isBlurred ? 'blur-sm' : ''} transition-all duration-200`}>
                      <div className="text-xs font-semibold text-gray-600 mb-1">Açık Hesap</div>
                      <div className="text-sm font-bold text-blue-600">
                        {financialInfo.limitsizAcikHesap 
                          ? 'Limitsiz' 
                          : `${financialInfo.acikHesapLimiti.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`
                        }
                      </div>
                    </div>
                    <div className={`${isBlurred ? 'blur-sm' : ''} transition-all duration-200`}>
                      <div className="text-xs font-semibold text-gray-600 mb-1">Toplam</div>
                      <div className="text-sm font-bold text-purple-600">
                        {financialInfo.limitsizAcikHesap 
                          ? 'Limitsiz' 
                          : `${financialInfo.toplamKullanilabilir.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`
                        }
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleBlurToggle}
                    className="w-full mt-3 px-3 py-2 text-xs bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {isBlurred ? 'Bilgileri Göster' : 'Bilgileri Gizle'}
                  </button>
                </div>
              )}
              
              {/* Navigasyon menüsü */}
              <div className="flex-1 overflow-y-auto">
                <nav className="p-4 space-y-2">
                  {navigation.map((item) => {
                    const isActive = pathname === item.href;
                    if (item.adminOnly && !isAdmin) return null;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                          isActive
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <span className="mr-3">{item.icon}</span>
                        {item.name}
                      </Link>
                    );
                  })}
                  {/* Admin ayarlar */}
                  {isAdmin && (
                    <Link
                      href="/dashboard/ayarlar"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                        pathname === '/dashboard/ayarlar'
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <span className="mr-3"><FaCog size={16} /></span>
                      Ayarlar
                    </Link>
                  )}
                </nav>
              </div>
              
              {/* Alt kısım - Çıkış */}
              <div className="p-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center justify-center px-4 py-3 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <span className="mr-2">
                    <FaSignOutAlt size={16} />
                  </span>
                  Çıkış Yap
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Profil Modal */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Kullanıcı Profili</h3>
              <button
                onClick={() => setIsProfileModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="p-6">
              {/* Profil Fotoğrafı */}
              <div className="flex justify-center mb-6">
                <div className="h-20 w-20 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              </div>
              
              {/* Kullanıcı Bilgileri */}
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <label className="block text-sm font-medium text-gray-600 mb-1">Ad Soyad</label>
                  <p className="text-gray-900 font-medium">{user.name}</p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <label className="block text-sm font-medium text-gray-600 mb-1">Kullanıcı Tipi</label>
                  <p className="text-gray-900">
                    {authUser?.userType === 'admin' ? 'Admin' : 'Mağaza Kullanıcısı'}
                  </p>
                </div>
                
                {/* Mağaza kullanıcısı için finansal bilgiler */}
                {authUser?.store && (
                  <>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <label className="block text-sm font-medium text-gray-600 mb-1">Mağaza</label>
                      <p className="text-gray-900 font-medium">{authUser.store.kurum_adi}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <label className="block text-sm font-medium text-gray-600 mb-1">Bakiye</label>
                        <p className={`font-bold ${financialInfo.bakiye < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {financialInfo.bakiye.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                        </p>
                      </div>
                      
                      <div className="bg-gray-50 rounded-lg p-4">
                        <label className="block text-sm font-medium text-gray-600 mb-1">Açık Hesap</label>
                        <p className="text-blue-600 font-bold">
                          {financialInfo.limitsizAcikHesap 
                            ? 'Limitsiz' 
                            : `${financialInfo.acikHesapLimiti.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`
                          }
                        </p>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-4">
                      <label className="block text-sm font-medium text-gray-600 mb-1">Toplam Kullanılabilir</label>
                      <p className="text-purple-600 font-bold">
                        {financialInfo.limitsizAcikHesap 
                          ? 'Limitsiz' 
                          : `${financialInfo.toplamKullanilabilir.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`
                        }
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
              <button
                onClick={() => setIsProfileModalOpen(false)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header; 