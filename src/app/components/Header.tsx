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
    debit: string;
    credit: string;
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
  const { logout, isAdmin } = useAuth();
  const [isBlurred, setIsBlurred] = useState(true);
  const [cartItems, setCartItems] = useState<number>(0);
  
  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('headerBlur') : null;
    if (stored === 'false') setIsBlurred(false);
    else setIsBlurred(true);
  }, []);
  
  // Sepet verilerini getir
  useEffect(() => {
    const fetchCartData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        const res = await fetch("https://pasha-backend-production.up.railway.app/api/cart", {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        const data = await res.json();
        
        if (data.success && data.data) {
          setCartItems(data.data.totalItems || 0);
        }
      } catch (error) {
        console.error("Sepet bilgileri alınamadı:", error);
      }
    };
    
    fetchCartData();
    
    // 1 dakikada bir sepeti yenile
    const intervalId = setInterval(fetchCartData, 60000);
    
    return () => clearInterval(intervalId);
  }, []);

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
      name: 'Sepetim',
      href: '/dashboard/sepetim',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M7.5 6v.75H5.513c-.96 0-1.764.724-1.865 1.679l-1.263 12A1.875 1.875 0 004.25 22.5h15.5a1.875 1.875 0 001.865-2.071l-1.263-12a1.875 1.875 0 00-1.865-1.679H16.5V6a4.5 4.5 0 10-9 0zM12 3a3 3 0 00-3 3v.75h6V6a3 3 0 00-3-3zm-3 8.25a3 3 0 106 0v-.75a.75.75 0 011.5 0v.75a4.5 4.5 0 11-9 0v-.75a.75.75 0 011.5 0v.75z" clipRule="evenodd" />
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
      name: 'Koleksiyonlar',
      href: '/dashboard/koleksiyonlar/liste',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path d="M4 4h16v2H4V4zm0 4h16v2H4V8zm0 4h10v2H4v-2zm0 4h10v2H4v-2z" />
        </svg>
      ),
    },
  ];

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="mx-auto px-4">
        {/* Logo ve Başlık Kısmı */}
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center">
            <Link href="/dashboard">
              <img src="/black-logo.svg" alt="Paşa Home" className="h-8 mr-3 cursor-pointer" />
            </Link>
          </div>
          
          <div className="flex items-center">
            <div className="flex items-center gap-3 flex-row-reverse">
              {/* Finansal özet kutusu */}
              <div className="flex flex-row items-center gap-2 text-xs text-gray-500 bg-gray-100 rounded px-2 py-1 hidden md:flex">
                <div className={`${isBlurred ? 'blur-sm' : ''} flex flex-row gap-4 transition-all duration-200`}>
                  <div>
                    <span className="block font-semibold">Borç</span>
                    <span>{parseFloat(user.debit).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
                  </div>
                  <div>
                    <span className="block font-semibold">Alacak</span>
                    <span>{parseFloat(user.credit).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
                  </div>
                  <div>
                    <span className="block font-semibold">Fark</span>
                    <span>{(parseFloat(user.credit) - parseFloat(user.debit)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="ml-2 p-1 bg-white/70 rounded-full hover:bg-white"
                  onClick={handleBlurToggle}
                  title={isBlurred ? 'Bilgileri Göster' : 'Bilgileri Gizle'}
                >
                  {isBlurred ? (
                    // Göz kapalı ikonu
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-700">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12.001C3.226 15.376 7.113 19.5 12 19.5c1.772 0 3.432-.457 4.899-1.277M6.228 6.228A10.45 10.45 0 0112 4.5c4.887 0 8.774 4.124 10.066 7.499a10.523 10.523 0 01-4.293 5.226M6.228 6.228l11.544 11.544M6.228 6.228L3 3m15 15l-3-3" />
                    </svg>
                  ) : (
                    // Göz açık ikonu
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-700">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12S5.25 6.75 12 6.75 21.75 12 21.75 12 18.75 17.25 12 17.25 2.25 12 2.25 12z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              
              {/* Sepet ikonu */}
              <Link href="/dashboard/sepetim" className="relative group">
                <div className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="M7.5 6v.75H5.513c-.96 0-1.764.724-1.865 1.679l-1.263 12A1.875 1.875 0 004.25 22.5h15.5a1.875 1.875 0 001.865-2.071l-1.263-12a1.875 1.875 0 00-1.865-1.679H16.5V6a4.5 4.5 0 10-9 0zM12 3a3 3 0 00-3 3v.75h6V6a3 3 0 00-3-3zm-3 8.25a3 3 0 106 0v-.75a.75.75 0 011.5 0v.75a4.5 4.5 0 11-9 0v-.75a.75.75 0 011.5 0v.75z" clipRule="evenodd" />
                  </svg>
                  {cartItems > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-medium rounded-full w-5 h-5 flex items-center justify-center">
                      {cartItems > 99 ? '99+' : cartItems}
                    </span>
                  )}
                </div>
              </Link>
              
              {/* Avatar ve kullanıcı adı + dropdown */}
              <div className="relative group flex items-center transition hover:bg-gray-200 rounded px-2 py-1 cursor-pointer">
                <div className="h-8 w-8 rounded-full bg-blue-900 flex items-center justify-center text-white text-sm font-medium">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="ml-2 text-sm font-medium text-gray-700">{user.name}</span>
                <div className="origin-top-left absolute left-0 top-[30px] mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 hidden group-hover:block hover:block z-10">
                  <a
                    href="#"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Profiliniz
                  </a>
                  <a
                    href="#"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Ayarlar
                  </a>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Çıkış Yap
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <FinancialSummaryMobile debit={user.debit} credit={user.credit} />
        {/* Navigasyon Menüsü */}
        <nav className="flex items-center justify-between py-2 overflow-x-auto">
          <div className="flex space-x-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              if (item.adminOnly && !isAdmin) return null;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                    isActive
                      ? 'bg-blue-800 text-white'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.name}
                </Link>
              );
            })}
            {/* Sadece admin kullanıcılar için Ayarlar */}
            {isAdmin && (
              <Link
                href="/dashboard/ayarlar"
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  pathname === '/dashboard/ayarlar'
                    ? 'bg-blue-800 text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <span className="mr-2"><FaCog /></span>
                Ayarlar
              </Link>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header; 