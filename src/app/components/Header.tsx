'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToken } from '../hooks/useToken';
import { FaUser, FaSignOutAlt, FaCog, FaShoppingCart, FaLock } from 'react-icons/fa';
import { getMyBalance, BalanceInfo, changePassword, PasswordChangeData } from '../../services/api';
import NotificationDropdown from '../../components/NotificationDropdown';

// Currency sembollerini tanımla
const CURRENCY_SYMBOLS = {
  'TRY': '₺',
  'USD': '$',
  'EUR': '€'
};


type HeaderProps = {
  title: string;
  user: {
    name: string;
    imageUrl: string;
    userType: {
      id: number;
    };
  };
  className?: string;
};

interface NavigationItem {
  name: string;
  href: string;
  icon: JSX.Element;
  adminOnly?: boolean;
  editorOnly?: boolean;
  hideFromAdmin?: boolean;
  hideFromEditor?: boolean;
  requiresCanSeePrice?: boolean;
}

const Header = ({ title, user, className }: HeaderProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, isAdmin, isEditor, isAdminOrEditor, user: authUser } = useAuth(); // AuthContext'teki user'ı al
  const { cartItems } = useCart(); // CartContext'ten sepet verilerini al
  const token = useToken(); // Token hook'unu kullan
  const [isMounted, setIsMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [balanceInfo, setBalanceInfo] = useState<BalanceInfo | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [lastBalanceUpdate, setLastBalanceUpdate] = useState<number>(0);
  const [isMobile, setIsMobile] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState<PasswordChangeData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  
  // Currency state
  const [userCurrency, setUserCurrency] = useState<string>('TRY');
  
  // Component mount kontrolü
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // Currency bilgisini localStorage'dan al
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        // Currency bilgisini al
        const rememberMe = localStorage.getItem("rememberMe") === "true";
        let storedCurrency;
        
        if (rememberMe) {
          storedCurrency = localStorage.getItem("currency");
        } else {
          storedCurrency = sessionStorage.getItem("currency");
        }
        
        if (storedCurrency) {
          setUserCurrency(storedCurrency);
        } else {
          // User'ın store bilgisinden currency'yi al
          if (authUser?.store?.currency) {
            setUserCurrency(authUser.store.currency);
          }
        }
      } catch (error) {
        console.error('Currency okuma hatası:', error);
      }
    }
  }, [authUser]);

  // Mobile detection logic
  useEffect(() => {
    const checkIfMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const isMobileAgent = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      const isSmallScreen = window.innerWidth < 1024; // Less than lg breakpoint
      return isMobileAgent || isSmallScreen;
    };

    if (typeof window !== 'undefined') {
      const mobileCheck = checkIfMobile();
      setIsMobile(mobileCheck);
      
      // Handle window resize for screen size changes
      const handleResize = () => {
        const mobileCheck = checkIfMobile();
        setIsMobile(mobileCheck);
      };
      
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);
  
  // Menü açıldığında body scroll'unu devre dışı bırak
  useEffect(() => {
    if (isMobileMenuOpen) {
      // Scroll'u devre dışı bırak
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      // Scroll'u tekrar aktif et
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }
    
    // Cleanup function
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, [isMobileMenuOpen]);

  // Profile modal açıldığında body scroll'unu devre dışı bırak
  useEffect(() => {
    if (isProfileModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    // Cleanup function
    return () => {
      document.body.style.overflow = '';
    };
  }, [isProfileModalOpen]);
  

  
  // Manuel bakiye yenileme fonksiyonu
  const refreshBalance = async () => {
    if (!authUser?.store || typeof window === 'undefined') {
      return;
    }

    setIsLoadingBalance(true);
    try {
      if (!token) {
        return;
      }
      
      const balance = await getMyBalance();
      setBalanceInfo(balance);
      setLastBalanceUpdate(Date.now());
    } catch (error: any) {
      if (authUser?.store) {
        setBalanceInfo({
          bakiye: authUser.store.bakiye || 0,
          acik_hesap_tutari: authUser.store.acik_hesap_tutari || 0,
          toplam_kullanilabilir: authUser.store.toplam_kullanilabilir || 0,
          maksimum_taksit: authUser.store.maksimum_taksit || 0,
          limitsiz_acik_hesap: authUser.store.limitsiz_acik_hesap || false,
          currency: 'TRY'
        });
      }
    } finally {
      setIsLoadingBalance(false);
    }
  };
  
  // Bakiye bilgilerini getir - Sadece ilk yükleme
  useEffect(() => {
    if (!isMounted || !authUser?.store) {
      return;
    }

    // Sadece ilk yükleme - otomatik yenileme yok
    refreshBalance();
  }, [isMounted, authUser?.userId, token]); // Token dependency'si eklendi

  // Sepet verileri artık CartContext'ten geliyor

  const handleLogout = async () => {
    const result = await logout();
    if (result.success) {
      router.push('/');
    }
  };

  // Şifre değiştirme fonksiyonları
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({ ...prev, [name]: value }));
    setPasswordMessage('');
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage('');

    // Validasyon
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage('Yeni şifre ve onay şifresi eşleşmiyor');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordMessage('Yeni şifre en az 6 karakter olmalıdır');
      return;
    }

    setPasswordLoading(true);
    try {
      const message = await changePassword(passwordForm);
      setPasswordMessage(message);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (err: any) {
      setPasswordMessage('Hata: ' + err.message);
    } finally {
      setPasswordLoading(false);
    }
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setPasswordMessage('');
  };
  


  // Finansal bilgileri API'den gelen veriler veya fallback olarak AuthContext'teki store'dan al
  const getFinancialInfo = () => {
    if (balanceInfo) {
      // API'den gelen güncel veriler
      return {
        bakiye: balanceInfo.bakiye,
        acikHesapLimiti: balanceInfo.acik_hesap_tutari,
        toplamKullanilabilir: balanceInfo.toplam_kullanilabilir,
        limitsizAcikHesap: balanceInfo.limitsiz_acik_hesap
      };
    } else if (authUser?.store) {
      // Fallback: AuthContext'teki store verisi
      return {
        bakiye: authUser.store.bakiye || 0,
        acikHesapLimiti: authUser.store.acik_hesap_tutari || 0,
        toplamKullanilabilir: authUser.store.toplam_kullanilabilir || ((authUser.store.bakiye || 0) + (authUser.store.acik_hesap_tutari || 0)),
        limitsizAcikHesap: authUser.store.limitsiz_acik_hesap || false
      };
    }
    // Varsayılan değerler
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
      name: 'Anasayfa',
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
          <path d="M5.082 14.254a8.287 8.287 0 00-1.308 5.135 9.687 9.687 0 01-1.764-.44l-.115-.04a.563.563 0 01-.373-.487l-.01-.121a3.75 3.75 0 013.57-4.047zM20.226 19.389a8.287 8.287 0 00-1.308-5.135 3.75 3.75 0 013.57 4.047l-.01.121a.563.563 0 01-.373.486l-.115.040c-.567.2-1.156.349-1.764.441z" />
        </svg>
      ),
      adminOnly: true, // Hem admin hem editör için
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
      requiresCanSeePrice: true,
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
      name: 'Analizler',
      href: '/dashboard/kullanici-analizleri',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path d="M18.375 2.25c-1.035 0-1.875.84-1.875 1.875v15.75c0 1.035.84 1.875 1.875 1.875h.75c1.035 0 1.875-.84 1.875-1.875V4.125c0-1.036-.84-1.875-1.875-1.875h-.75zM9.75 8.625c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-.75a1.875 1.875 0 01-1.875-1.875V8.625zM3 13.125c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v6.75c0 1.035-.84 1.875-1.875 1.875h-.75A1.875 1.875 0 013 19.875v-6.75z" />
        </svg>
      ),
      adminOnly: false,
      hideFromEditor: true, // Editör kullanıcılar görmeyecek
      requiresCanSeePrice: true,
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
    {
      name: 'Muhasebe',
      href: '/dashboard/muhasebe',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path d="M10.464 8.746c.227-.18.497-.311.786-.394v2.795a2.252 2.252 0 01-.786-.393c-.394-.313-.546-.681-.546-1.004 0-.323.152-.691.546-1.004zM12.75 15.662v-2.824c.347.085.664.228.921.421.427.32.579.686.579.991 0 .305-.152.671-.579.991a2.534 2.534 0 01-.921.42z" />
          <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v.816a3.836 3.836 0 00-1.72.756c-.712.566-1.112 1.35-1.112 2.178 0 .829.4 1.612 1.118 2.178.502.395 1.101.647 1.714.756V15.75a.75.75 0 001.5 0v-.774a3.836 3.836 0 001.72-.755c.712.566 1.112-1.35 1.112-2.178 0-.829-.4-1.612-1.118-2.178A3.836 3.836 0 0012.75 8.09V6z" clipRule="evenodd" />
        </svg>
      ),
      adminOnly: true,
      requiresCanSeePrice: true,
    },
    {
      name: 'Teslimat',
      href: '/dashboard/teslimat',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path d="M3.375 4.5C2.339 4.5 1.5 5.34 1.5 6.375V13.5h12V6.375c0-1.036-.84-1.875-1.875-1.875h-8.25zM13.5 15h-12v2.625c0 1.035.84 1.875 1.875 1.875h.375a3 3 0 116 0h3a3 3 0 116 0h.375c1.035 0 1.875-.84 1.875-1.875V15zM8.25 19.5a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0zm7.5 0a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0z" />
          <path d="M5.25 6.375a.75.75 0 01.75-.75h3.75a.75.75 0 01.75.75v4.5a.75.75 0 01-.75.75H6a.75.75 0 01-.75-.75v-4.5z" />
        </svg>
      ),
      adminOnly: true,
    },
    {
      name: 'Muhasebe Hareketlerim',
      href: '/dashboard/muhasebe-hareketlerim',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M2.25 2.25a.75.75 0 000 1.5H3v10.5a3 3 0 003 3h1.21l-1.172 3.513a.75.75 0 001.424.474l.329-.987h8.418l.33.987a.75.75 0 001.422-.474l-1.17-3.513H18a3 3 0 003-3V3.75h.75a.75.75 0 000-1.5H2.25zm6.04 16.5l.5-1.5h6.42l.5 1.5H8.29zm7.46-12a.75.75 0 00-1.5 0v6a.75.75 0 001.5 0v-6zm-3 2.25a.75.75 0 00-1.5 0v3.75a.75.75 0 001.5 0V9zm-3 2.25a.75.75 0 00-1.5 0v1.5a.75.75 0 001.5 0v-1.5z" clipRule="evenodd" />
        </svg>
      ),
      adminOnly: false,
      hideFromAdmin: true, // Admin kullanıcılar görmeyecek
      hideFromEditor: true, // Editör kullanıcılar görmeyecek
      requiresCanSeePrice: true,
    },
    {
      name: 'Çalışan İstatistikleri',
      href: '/dashboard/calisan-istatistikleri',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M2.25 13.5a3.75 3.75 0 11.001-7.5 3.75 3.75 0 01-.001 7.5zm15.75-3.75a3.75 3.75 0 11.001-7.5 3.75 3.75 0 01-.001 7.5zM2.25 9.75a1.5 1.5 0 11.001-3 1.5 1.5 0 01-.001 3zm15.75-1.5a1.5 1.5 0 11.001-3 1.5 1.5 0 01-.001 3z" clipRule="evenodd" />
          <path d="M5.25 14.25v-2.625c0-.621.504-1.125 1.125-1.125H9.75a.75.75 0 01.75.75v2.625c0 .621-.504 1.125-1.125 1.125H6a.75.75 0 01-.75-.75zm6-3v2.625c0 .621.504 1.125 1.125 1.125H18a.75.75 0 01.75.75v-2.625c0-.621-.504-1.125-1.125-1.125H12.375a.75.75 0 01-.75.75z" />
        </svg>
      ),
      adminOnly: true,
    },
    {
      name: 'Bayi Talepleri',
      href: '/dashboard/bayi-talepleri',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M4.125 3C3.089 3 2.25 3.84 2.25 4.875V18a3 3 0 003 3h15.75a.75.75 0 000-1.5H5.25a1.5 1.5 0 01-1.5-1.5v-.75c0-.621.504-1.125 1.125-1.125h15.375c.621 0 1.125-.504 1.125-1.125V4.875c0-1.036-.84-1.875-1.875-1.875H4.125zM12 7.5a.75.75 0 01.75.75v2.25h2.25a.75.75 0 010 1.5h-2.25v2.25a.75.75 0 01-1.5 0v-2.25H9a.75.75 0 010-1.5h2.25V8.25A.75.75 0 0112 7.5z" clipRule="evenodd" />
        </svg>
      ),
      adminOnly: true,
    },
    {
      name: 'Satın Alım İşlemleri',
      href: '/dashboard/satin-alim-islemleri',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M7.5 6v.75H5.513c-.96 0-1.764.724-1.865 1.679l-1.263 12A1.875 1.875 0 004.25 22.5h15.5a1.875 1.875 0 001.865-2.071l-1.263-12a1.875 1.875 0 00-1.865-1.679H16.5V6a4.5 4.5 0 10-9 0zM12 3a3 3 0 00-3 3v.75h6V6a3 3 0 00-3-3zm-3 8.25a3 3 0 106 0v-.75a.75.75 0 011.5 0v.75a4.5 4.5 0 11-9 0v-.75a.75.75 0 011.5 0v.75z" clipRule="evenodd" />
        </svg>
      ),
      adminOnly: true,
      hideFromEditor: true, // Editörler editorOnly menüden görür (çift görünmesin)
    },
    {
      name: 'Kullanıcı Yönetimi',
      href: '/dashboard/ayarlar',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M8.25 6.75a3.75 3.75 0 117.5 0 3.75 3.75 0 01-7.5 0zM15.75 9.75a3 3 0 116 0 3 3 0 01-6 0zM2.25 9.75a3 3 0 116 0 3 3 0 01-6 0zM6.31 15.117A6.745 6.745 0 0112 12a6.745 6.745 0 016.709 7.498.75.75 0 01-.372.568A12.696 12.696 0 0112 21.75c-2.305 0-4.47-.612-6.337-1.684a.75.75 0 01-.372-.568 6.787 6.787 0 011.019-4.38z" clipRule="evenodd" />
          <path d="M5.082 14.254a8.287 8.287 0 00-1.308 5.135 9.687 9.687 0 01-1.764-.44l-.115-.04a.563.563 0 01-.373-.487l-.01-.121a3.75 3.75 0 013.57-4.047zM20.226 19.389a8.287 8.287 0 00-1.308-5.135 3.75 3.75 0 013.57 4.047l-.01.121a.563.563 0 01-.373.486l-.115.040c-.567.2-1.156.349-1.764.441z" />
        </svg>
      ),
      adminOnly: true,
    },
    {
      name: 'Sepetim',
      href: '/dashboard/sepetim',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M7.5 6v.75H5.513c-.96 0-1.764.724-1.865 1.679l-1.263 12A1.875 1.875 0 004.25 22.5h15.5a1.875 1.875 0 001.865-2.071l-1.263-12a1.875 1.875 0 00-1.865-1.679H16.5V6a4.5 4.5 0 10-9 0zM12 3a3 3 0 00-3 3v.75h6V6a3 3 0 00-3-3zm-3 8.25a3 3 0 106 0v-.75a.75.75 0 011.5 0v.75a4.5 4.5 0 11-9 0v-.75a.75.75 0 011.5 0v.75z" clipRule="evenodd" />
        </svg>
      ),
      adminOnly: false,
    },
    
    // Editör Menu Items
    {
      name: 'Ürün Yönetimi',
      href: '/dashboard/urunler/liste',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path d="M3.375 3C2.339 3 1.5 3.84 1.5 4.875v.75c0 1.036.84 1.875 1.875 1.875h17.25c1.035 0 1.875-.84 1.875-1.875v-.75C22.5 3.839 21.66 3 20.625 3H3.375z" />
          <path fillRule="evenodd" d="M3.087 9l.54 9.176A3 3 0 006.62 21h10.757a3 3 0 002.995-2.824L20.913 9H3.087zm6.163 3.75A.75.75 0 0110 12h4a.75.75 0 010 1.5h-4a.75.75 0 01-.75-.75z" clipRule="evenodd" />
        </svg>
      ),
      editorOnly: true,
    },
    {
      name: 'Stok Yönetimi',
      href: '/dashboard/stok',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" />
          <path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" />
        </svg>
      ),
      editorOnly: true,
    },
    {
      name: 'Mağaza Yönetimi',
      href: '/dashboard/magazalar',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path d="M5.223 2.25c-.497 0-.974.198-1.325.55l-1.3 1.298A3.75 3.75 0 007.5 9.75c.627.47 1.406.75 2.25.75.844 0 1.623-.28 2.25-.75a3.75 3.75 0 004.902-5.652l-1.3-1.299a1.875 1.875 0 00-1.325-.549H5.223z" />
          <path fillRule="evenodd" d="M3 20.25v-8.755c1.42.674 3.08.673 4.5 0A5.234 5.234 0 009.75 12c.804 0 1.568-.182 2.25-.506a5.234 5.234 0 002.25.506c.804 0 1.567-.182 2.25-.506 1.42.674 3.08.675 4.5.001v8.755h.75a.75.75 0 010 1.5H2.25a.75.75 0 010-1.5H3zm3-6a.75.75 0 01.75-.75h3a.75.75 0 01.75.75v3a.75.75 0 01-.75.75h-3a.75.75 0 01-.75-.75v-3zm8.25-.75a.75.75 0 00-.75.75v5.25c0 .414.336.75.75.75h3a.75.75 0 00.75-.75v-5.25a.75.75 0 00-.75-.75h-3z" clipRule="evenodd" />
        </svg>
      ),
      editorOnly: true,
    },
    {
      name: 'Teslimat Yönetimi',
      href: '/dashboard/teslimat',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path d="M3.375 4.5C2.339 4.5 1.5 5.34 1.5 6.375V13.5h12V6.375c0-1.036-.84-1.875-1.875-1.875h-8.25zM13.5 15h-12v2.625c0 1.035.84 1.875 1.875 1.875h.375a3 3 0 116 0h3a3 3 0 116 0h.375c1.035 0 1.875-.84 1.875-1.875V15zM8.25 19.5a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0zm7.5 0a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0z" />
          <path d="M5.25 6.375a.75.75 0 01.75-.75h3.75a.75.75 0 01.75.75v4.5a.75.75 0 01-.75.75H6a.75.75 0 01-.75-.75v-4.5z" />
        </svg>
      ),
      editorOnly: true,
    },
    {
      name: 'Satın Alım İşlemleri',
      href: '/dashboard/satin-alim-islemleri',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M7.5 6v.75H5.513c-.96 0-1.764.724-1.865 1.679l-1.263 12A1.875 1.875 0 004.25 22.5h15.5a1.875 1.875 0 001.865-2.071l-1.263-12a1.875 1.875 0 00-1.865-1.679H16.5V6a4.5 4.5 0 10-9 0zM12 3a3 3 0 00-3 3v.75h6V6a3 3 0 00-3-3zm-3 8.25a3 3 0 106 0v-.75a.75.75 0 011.5 0v.75a4.5 4.5 0 11-9 0v-.75a.75.75 0 011.5 0v.75z" clipRule="evenodd" />
        </svg>
      ),
      editorOnly: true,
    },
    {
      name: 'Kullanıcı Yönetimi',
      href: '/dashboard/ayarlar',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
        </svg>
      ),
      editorOnly: true,
    },
  ];

  return (
    <header className={`sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur-md ${className || ''}`}>
      <div className="container-responsive">
        {/* Ana Header Kısmı */}
        <div className="flex items-center justify-between py-2.5 sm:py-3">
          {/* Logo */}
          <div className="flex items-center">
            <Link
              href="/dashboard"
              className="flex-shrink-0 rounded-lg p-1.5 outline-none transition-all duration-200 ease-out hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-[#00365a]/25 active:scale-[0.98]"
            >
              <Image
                src="/black-logo.svg"
                alt="Paşa Home"
                width={120}
                height={48}
                className="h-10 w-auto sm:h-11"
              />
            </Link>
          </div>

          {/* Desktop: Sağ taraf kontrolleri */}
          <div className="hidden items-center gap-1 lg:flex">
            {/* Bildirim Dropdown */}
            {authUser?.userId && (
              <div className="group relative flex min-w-[64px] flex-col items-center">
                <div className="rounded-lg p-2 transition-all duration-200 ease-out hover:bg-slate-50 active:scale-[0.97] group-hover:bg-slate-50">
                  <NotificationDropdown userId={authUser.userId} />
                </div>
                <span className="mt-0.5 text-[11px] font-medium text-slate-500 transition-colors duration-200 ease-out group-hover:text-[#00365a]">
                  Bildirimler
                </span>
              </div>
            )}

            {/* Sepet ikonu */}
            <Link
              href="/dashboard/sepetim"
              className="group relative flex min-w-[64px] flex-col items-center rounded-lg outline-none transition-all duration-200 ease-out focus-visible:ring-2 focus-visible:ring-[#00365a]/25 active:scale-[0.97]"
            >
              <div className="relative rounded-lg p-2 transition-all duration-200 ease-out group-hover:bg-slate-50">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-slate-600 transition-colors duration-200 ease-out group-hover:text-[#00365a]">
                  <path fillRule="evenodd" d="M7.5 6v.75H5.513c-.96 0-1.764.724-1.865 1.679l-1.263 12A1.875 1.875 0 004.25 22.5h15.5a1.875 1.875 0 001.865-2.071l-1.263-12a1.875 1.875 0 00-1.865-1.679H16.5V6a4.5 4.5 0 10-9 0zM12 3a3 3 0 00-3 3v.75h6V6a3 3 0 00-3-3zm-3 8.25a3 3 0 106 0v-.75a.75.75 0 011.5 0v.75a4.5 4.5 0 11-9 0v-.75a.75.75 0 011.5 0v.75z" clipRule="evenodd" />
                </svg>
                {cartItems > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[#00365a] px-1 text-[10px] font-semibold text-white">
                    {cartItems > 99 ? '99+' : cartItems}
                  </span>
                )}
              </div>
              <span className="mt-0.5 text-[11px] font-medium text-slate-500 transition-colors duration-200 ease-out group-hover:text-[#00365a]">
                Sepetim
              </span>
            </Link>

            {/* Kullanıcı dropdown */}
            <div className="group relative ml-1.5">
              <div className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-transparent px-2 py-1.5 transition-all duration-200 ease-out hover:border-slate-200/80 hover:bg-slate-50 active:scale-[0.98] group-hover:border-slate-200/80 group-hover:bg-slate-50">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#00365a] text-sm font-semibold text-white">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden xl:block">
                  <div className="text-sm font-medium leading-tight text-slate-900">{user.name}</div>
                  <div className="text-[11px] leading-tight text-slate-500">{isAdmin ? 'Admin' : 'Kullanıcı'}</div>
                </div>
                <svg className="h-4 w-4 text-slate-400 transition-all duration-200 ease-out group-hover:rotate-180 group-hover:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              {/* Dropdown menü */}
              <div className="invisible absolute right-0 top-full z-50 mt-1.5 w-56 origin-top-right translate-y-1 rounded-xl border border-slate-200/80 bg-white py-1.5 opacity-0 shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all duration-200 ease-out group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                {!isAdmin ? (
                  <Link href="/dashboard/ayarlar" className="mx-1 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-700 transition-colors duration-150 ease-out hover:bg-slate-50 hover:text-[#00365a] active:bg-slate-100">
                    <FaUser size={13} className="text-slate-400" />
                    <span>Profiliniz</span>
                  </Link>
                ) : (
                  <>
                    <button
                      onClick={() => setIsProfileModalOpen(true)}
                      className="mx-1 flex w-[calc(100%-0.5rem)] items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition-colors duration-150 ease-out hover:bg-slate-50 hover:text-[#00365a] active:bg-slate-100"
                    >
                      <FaUser size={13} className="text-slate-400" />
                      <span>Profiliniz</span>
                    </button>
                    <button
                      onClick={() => setShowPasswordModal(true)}
                      className="mx-1 flex w-[calc(100%-0.5rem)] items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition-colors duration-150 ease-out hover:bg-slate-50 hover:text-[#00365a] active:bg-slate-100"
                    >
                      <FaLock size={13} className="text-slate-400" />
                      <span>Şifre Değiştir</span>
                    </button>
                  </>
                )}
                <hr className="my-1.5 border-slate-100" />
                <button
                  onClick={handleLogout}
                  className="mx-1 flex w-[calc(100%-0.5rem)] items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition-colors duration-150 ease-out hover:bg-red-50 hover:text-red-600 active:bg-red-100"
                >
                  <FaSignOutAlt size={13} />
                  Çıkış Yap
                </button>
              </div>
            </div>
          </div>

          {/* Mobil: Sağ taraf kontrolleri */}
          <div className="flex items-center gap-0.5 lg:hidden">
            {authUser?.userId && (
              <div className="group relative flex min-w-[52px] flex-col items-center">
                <div className="rounded-lg p-2 transition-all duration-200 ease-out hover:bg-slate-50 active:scale-[0.97]">
                  <NotificationDropdown userId={authUser.userId} />
                </div>
                <span className="mt-0.5 text-[10px] font-medium text-slate-500 transition-colors duration-200 group-hover:text-[#00365a]">
                  Bildirimler
                </span>
              </div>
            )}

            <Link
              href="/dashboard/sepetim"
              className="relative flex min-w-[52px] flex-col items-center rounded-lg p-2 outline-none transition-all duration-200 ease-out hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-[#00365a]/25 active:scale-[0.97]"
            >
              <div className="relative">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-slate-600">
                  <path fillRule="evenodd" d="M7.5 6v.75H5.513c-.96 0-1.764.724-1.865 1.679l-1.263 12A1.875 1.875 0 004.25 22.5h15.5a1.875 1.875 0 001.865-2.071l-1.263-12a1.875 1.875 0 00-1.865-1.679H16.5V6a4.5 4.5 0 10-9 0zM12 3a3 3 0 00-3 3v.75h6V6a3 3 0 00-3-3zm-3 8.25a3 3 0 106 0v-.75a.75.75 0 011.5 0v.75a4.5 4.5 0 11-9 0v-.75a.75.75 0 011.5 0v.75z" clipRule="evenodd" />
                </svg>
                {cartItems > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[#00365a] px-1 text-[9px] font-semibold text-white">
                    {cartItems > 99 ? '99+' : cartItems}
                  </span>
                )}
              </div>
              <span className="mt-0.5 text-[10px] font-medium text-slate-500">Sepetim</span>
            </Link>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`rounded-lg p-2.5 outline-none transition-all duration-200 ease-out hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-[#00365a]/25 active:scale-[0.96] ${
                isMobileMenuOpen ? 'bg-slate-100' : ''
              }`}
              aria-label="Menüyü aç/kapat"
            >
              <div className="flex h-5 w-5 flex-col items-center justify-center">
                <span className={`block h-0.5 w-5 bg-[#00365a] transition-all duration-200 ease-out ${isMobileMenuOpen ? 'translate-y-1.5 rotate-45' : 'mb-1'}`}></span>
                <span className={`block h-0.5 w-5 bg-[#00365a] transition-all duration-200 ease-out ${isMobileMenuOpen ? 'opacity-0' : 'mb-1'}`}></span>
                <span className={`block h-0.5 w-5 bg-[#00365a] transition-all duration-200 ease-out ${isMobileMenuOpen ? '-translate-y-1.5 -rotate-45' : ''}`}></span>
              </div>
            </button>
          </div>
        </div>

        {/* Desktop navigasyon */}
        <nav className="hidden border-t border-slate-100/90 py-1.5 lg:block">
          <div className="flex justify-center gap-0.5">
            {(() => {
              // Admin, editor ve normal menü öğelerini ayır
              const regularNavItems = navigation
                .filter(item => !item.adminOnly && !item.editorOnly && item.name !== 'Sepetim') // Sepetim, admin ve editör öğeleri hariç normal menü öğeleri
                .filter(item => !(item.hideFromAdmin && isAdmin)) // Admin ise hideFromAdmin öğeleri gizle
                .filter(item => !(item.hideFromEditor && isEditor)) // Editör ise hideFromEditor öğeleri gizle
                .filter(item => !(isMobile && item.name === 'E-Katalog')) // Mobilde E-Katalog'u gizle
                .filter(item => !(item.requiresCanSeePrice && !authUser?.canSeePrice)); // canSeePrice=false ise requiresCanSeePrice olan öğeleri gizle
              const adminNavItems = navigation
                .filter(item => item.adminOnly)
                .filter(item => !(item.requiresCanSeePrice && !authUser?.canSeePrice)); // canSeePrice=false ise requiresCanSeePrice olan admin öğeleri gizle
              const editorNavItems = navigation.filter(item => item.editorOnly);

              return (
                <>
                  {/* Normal menü öğeleri */}
                  {regularNavItems.map((item) => {
                    // Analizlerim için özel aktif kontrol - hem kullanici-analizleri hem analizler sayfalarında aktif olsun
                    const isAnalysisPage = item.href === '/dashboard/kullanici-analizleri' &&
                                         (pathname === '/dashboard/kullanici-analizleri' || pathname === '/dashboard/analizler');
                    const isActive = isAnalysisPage || pathname === item.href;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`relative flex items-center whitespace-nowrap rounded-md px-3.5 py-2 text-sm outline-none transition-all duration-200 ease-out focus-visible:ring-2 focus-visible:ring-[#00365a]/20 active:scale-[0.98] ${
                          isActive
                            ? 'bg-[#00365a]/[0.08] font-medium text-[#00365a]'
                            : 'font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <span className={`mr-2 transition-opacity duration-200 ${isActive ? 'opacity-100' : 'opacity-70'}`}>{item.icon}</span>
                        {item.name}
                        {isActive && (
                          <span className="absolute inset-x-2.5 -bottom-[7px] h-0.5 rounded-full bg-[#00365a]" />
                        )}
                      </Link>
                    );
                  })}

                  {/* Admin Panel Dropdown - Sadece admin kullanıcıları için */}
                  {isAdmin && adminNavItems.length > 0 && (
                    <div className="group relative">
                      <button
                        className="flex items-center whitespace-nowrap rounded-md px-3.5 py-2 text-sm font-medium text-slate-600 outline-none transition-all duration-200 ease-out hover:bg-slate-50 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-[#00365a]/20 active:scale-[0.98] group-hover:bg-slate-50 group-hover:text-[#00365a]"
                      >
                        <span className="mr-2 opacity-70 transition-opacity duration-200 group-hover:opacity-100">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                            <path fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 00-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 00-2.282.819l-.922 1.597a1.875 1.875 0 00.432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 000 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 00-.432 2.385l.922 1.597a1.875 1.875 0 002.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 002.28-.819l.923-1.597a1.875 1.875 0 00-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 000-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 00-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 00-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 00-1.85-1.567h-1.843zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" clipRule="evenodd" />
                          </svg>
                        </span>
                        {isAdmin ? 'Admin Panel' : 'Yönetim Paneli'}
                        <svg className="ml-1 h-4 w-4 transition-transform duration-200 ease-out group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {/* Admin Dropdown Menü */}
                      <div className="invisible absolute left-0 top-full z-50 mt-1.5 w-52 origin-top-left translate-y-1 rounded-xl border border-slate-200/80 bg-white py-1.5 opacity-0 shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all duration-200 ease-out group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                        {adminNavItems.map((item) => {
                          const isActive = pathname === item.href;
                          return (
                            <Link
                              key={item.name}
                              href={item.href}
                              className={`mx-1 flex items-center rounded-lg px-3 py-2 text-sm transition-colors duration-150 ease-out ${
                                isActive
                                  ? 'bg-[#00365a]/[0.08] font-medium text-[#00365a]'
                                  : 'text-slate-700 hover:bg-slate-50 hover:text-[#00365a]'
                              }`}
                            >
                              <span className="mr-2 opacity-70">{item.icon}</span>
                              {item.name}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Editör Panel Dropdown - Sadece editör kullanıcıları için */}
                  {isEditor && editorNavItems.length > 0 && (
                    <div className="group relative">
                      <button
                        className="flex items-center whitespace-nowrap rounded-md px-3.5 py-2 text-sm font-medium text-slate-600 outline-none transition-all duration-200 ease-out hover:bg-slate-50 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-[#00365a]/20 active:scale-[0.98] group-hover:bg-slate-50 group-hover:text-[#00365a]"
                      >
                        <span className="mr-2 opacity-70 transition-opacity duration-200 group-hover:opacity-100">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                            <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 01.67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 11-.671-1.34l.041-.022zM12 9a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                          </svg>
                        </span>
                        Editör Panel
                        <svg className="ml-1 h-4 w-4 transition-transform duration-200 ease-out group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {/* Editör Dropdown Menü */}
                      <div className="invisible absolute left-0 top-full z-50 mt-1.5 w-52 origin-top-left translate-y-1 rounded-xl border border-slate-200/80 bg-white py-1.5 opacity-0 shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all duration-200 ease-out group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                        {editorNavItems.map((item) => {
                          const isActive = pathname === item.href;
                          return (
                            <Link
                              key={item.name}
                              href={item.href}
                              className={`mx-1 flex items-center rounded-lg px-3 py-2 text-sm transition-colors duration-150 ease-out ${
                                isActive
                                  ? 'bg-[#00365a]/[0.08] font-medium text-[#00365a]'
                                  : 'text-slate-700 hover:bg-slate-50 hover:text-[#00365a]'
                              }`}
                            >
                              <span className="mr-2 opacity-70">{item.icon}</span>
                              {item.name}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </nav>
      </div>

      {/* Mobil menü overlay - Full Screen */}
      {isMobileMenuOpen && isMounted && createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-900/40 backdrop-blur-[2px] lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0"
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>

          {/* Full Screen Menü paneli */}
          <div
            className="relative h-full w-full overflow-y-auto bg-white"
            style={{
              zIndex: 10000,
              position: 'relative',
              minHeight: '100vh',
              maxHeight: '100vh'
            }}
          >
            <div className="flex h-full min-h-screen flex-col">
              {/* Menü başlığı */}
              <div className="border-b border-slate-100 bg-[#00365a] p-5 text-white sm:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-lg font-semibold text-white">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-base font-semibold leading-tight">{user.name}</div>
                      <div className="mt-0.5 text-sm text-white/75">
                        {isAdmin ? 'Admin' : 'Mağaza Kullanıcısı'}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="rounded-lg p-2.5 transition-all duration-200 ease-out hover:bg-white/10 active:scale-[0.96]"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Logo */}
                <div className="mb-1 flex justify-center">
                  <Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="rounded-lg p-1 transition-opacity duration-200 hover:opacity-90">
                    <Image
                      src="/logo.svg"
                      alt="Paşa Home"
                      width={120}
                      height={48}
                      className="h-10 w-auto opacity-90 brightness-0 invert"
                    />
                  </Link>
                </div>
              </div>

              {/* Navigasyon menüsü */}
              <div className="flex-1 flex-shrink-0 overflow-y-auto bg-[#f7f8fa]" style={{minHeight: '200px'}}>
                <nav className="space-y-1.5 p-4 sm:p-5">
                  {navigation.map((item) => {
                    // Analizlerim için özel aktif kontrol - hem kullanici-analizleri hem analizler sayfalarında aktif olsun
                    const isAnalysisPage = item.href === '/dashboard/kullanici-analizleri' &&
                                         (pathname === '/dashboard/kullanici-analizleri' || pathname === '/dashboard/analizler');
                    const isActive = isAnalysisPage || pathname === item.href;
                    // Admin veya editör olmayan kullanıcılar için admin-only öğeleri gizle
                    if (!isAdminOrEditor && item.adminOnly === true) return null;
                    // Editör olmayan kullanıcılar için editor-only öğeleri gizle
                    if (!isEditor && item.editorOnly === true) return null;
                    // Admin kullanıcılar için hideFromAdmin öğeleri gizle
                    if (isAdmin && item.hideFromAdmin === true) return null;
                    // Editör kullanıcılar için hideFromEditor öğeleri gizle
                    if (isEditor && item.hideFromEditor === true) return null;
                    // Mobilde E-Katalog'u gizle
                    if (isMobile && item.name === 'E-Katalog') return null;
                    // canSeePrice=false ise requiresCanSeePrice olan öğeleri gizle
                    if (item.requiresCanSeePrice && !authUser?.canSeePrice) return null;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center rounded-xl px-4 py-3.5 text-base font-medium outline-none transition-all duration-200 ease-out focus-visible:ring-2 focus-visible:ring-[#00365a]/20 active:scale-[0.99] ${
                          isActive
                            ? 'bg-[#00365a] text-white shadow-sm'
                            : 'border border-slate-200/80 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <span className={`mr-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`}>{item.icon}</span>
                        {item.name}
                        {isActive && (
                          <svg className="ml-auto h-4 w-4 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        )}
                      </Link>
                    );
                  })}

                  {/* Admin ayarlar */}
                  {isAdmin && (
                    <>
                      <div className="mb-2 mt-5">
                        <h3 className="px-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Admin Yönetimi</h3>
                      </div>
                      <Link
                        href="/dashboard/ayarlar"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center rounded-xl px-4 py-3.5 text-base font-medium outline-none transition-all duration-200 ease-out focus-visible:ring-2 focus-visible:ring-[#00365a]/20 active:scale-[0.99] ${
                          pathname === '/dashboard/ayarlar'
                            ? 'bg-[#00365a] text-white shadow-sm'
                            : 'border border-slate-200/80 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <span className={`mr-3.5 ${pathname === '/dashboard/ayarlar' ? 'text-white' : 'text-slate-400'}`}>
                          <FaCog size={20} />
                        </span>
                        Kullanıcı Yönetimi
                        {pathname === '/dashboard/ayarlar' && (
                          <svg className="ml-auto h-4 w-4 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        )}
                      </Link>
                    </>
                  )}

                  {/* Editör ayarlar */}
                  {isEditor && (
                    <>
                      <div className="mb-2 mt-5">
                        <h3 className="px-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Editör Yönetimi</h3>
                      </div>
                      {/* Editör menü öğeleri otomatik olarak yukarıda gösterilecek çünkü navigation.map() içinde zaten filtreleniyor */}
                    </>
                  )}
                </nav>
              </div>

                            {/* Mağaza bilgisi - Bakiye gösterimi kaldırıldı, sadece admin mağaza bakiyelerini görebilir */}
              {authUser?.store && (
                <div className="border-b border-slate-200 bg-white px-4 py-3">
                  <div className="text-center">
                    <p className="text-xs text-slate-500">Mağaza</p>
                    <p className="truncate text-sm font-semibold text-slate-900">{authUser.store.kurum_adi}</p>
                  </div>
                </div>
              )}

            {/* Alt kısım - Enhanced Footer */}
              <div className="border-t border-slate-200 bg-white p-4 sm:p-5">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="flex w-full items-center justify-center rounded-xl border border-red-200 bg-red-50 px-5 py-3.5 text-base font-semibold text-red-600 transition-all duration-200 ease-out hover:bg-red-100 active:scale-[0.99]"
                >
                  <span className="mr-2.5">
                    <FaSignOutAlt size={18} />
                  </span>
                  Çıkış Yap
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Profil Modal */}
      {isProfileModalOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center min-h-screen"
          onClick={() => setIsProfileModalOpen(false)}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden m-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-[#00365a] to-[#004170]">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center text-white text-lg font-bold">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <h3 className="text-xl font-semibold text-white">Kullanıcı Profili</h3>
              </div>
              <button
                onClick={() => setIsProfileModalOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="p-6 max-h-[calc(90vh-140px)] overflow-y-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {/* Profil Fotoğrafı ve Temel Bilgiler */}
              <div className="text-center mb-6">
                <div className="h-24 w-24 mx-auto rounded-full bg-gradient-to-br from-[#00365a] to-[#004170] flex items-center justify-center text-white text-3xl font-bold shadow-lg mb-4">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <h4 className="text-xl font-semibold text-gray-900 mb-1">{user.name}</h4>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  {isAdmin ? 'Admin' : 'Mağaza Kullanıcısı'}
                </span>
              </div>
              
              {/* Kullanıcı Bilgileri */}
              <div className="space-y-4">
                {/* Admin kullanıcısı için */}
                {isAdmin && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <span className="text-sm font-semibold text-blue-800">Yönetici Yetkisi</span>
                    </div>
                    <p className="text-sm text-blue-700">Tam sistem erişimi ve yönetim yetkileriniz bulunmaktadır.</p>
                  </div>
                )}
                
                {/* Mağaza kullanıcısı için finansal bilgiler - Sadece canSeePrice=true olanlar için */}
                {authUser?.store && (
                  <>
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <span className="text-sm font-semibold text-gray-700">Mağaza Bilgisi</span>
                      </div>
                      <p className="text-gray-900 font-medium">{authUser.store.kurum_adi}</p>
                    </div>
                    
                    {authUser.canSeePrice ? (
                      isLoadingBalance ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00365a]"></div>
                          <span className="ml-3 text-gray-600">Finansal bilgiler güncelleniyor...</span>
                        </div>
                      ) : (
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                          <div className="flex items-center gap-2 mb-4">
                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                            </svg>
                            <span className="text-sm font-semibold text-green-800">Finansal Durum</span>
                          </div>
                          
                          <div className="grid grid-cols-1 gap-3">
                            {/* Bakiye ve Toplam Kullanılabilir gösterimi kaldırıldı - sadece admin mağaza bakiyelerini görebilir */}
                            <div className="bg-white/50 rounded-lg p-3">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-gray-600">Açık Hesap Limiti</span>
                                <span className="text-[#00365a] font-bold">
                                  {financialInfo.limitsizAcikHesap 
                                    ? 'Limitsiz' 
                                    : `${financialInfo.acikHesapLimiti.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ${CURRENCY_SYMBOLS[userCurrency as keyof typeof CURRENCY_SYMBOLS] || userCurrency}`
                                  }
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    ) : (
                      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4 border border-yellow-200">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                          <span className="text-sm font-semibold text-yellow-800">Finansal Bilgilere Erişim Yok</span>
                        </div>
                        <p className="text-sm text-yellow-700">Fiyat görme yetkiniz bulunmamaktadır.</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setIsProfileModalOpen(false)}
                className="w-full px-4 py-2 bg-[#00365a] text-white rounded-lg hover:bg-[#004170] transition-colors font-medium"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Şifre Değiştirme Modalı */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 min-h-screen">
          <div className="bg-white rounded-xl w-full max-w-md shadow-lg mx-auto">
            <div className="bg-[#00365a] rounded-t-xl px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Şifre Değiştir</h2>
                <button
                  onClick={closePasswordModal}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <form onSubmit={handlePasswordSubmit} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mevcut Şifre *
                  </label>
                  <input
                    type="password"
                    name="currentPassword"
                    value={passwordForm.currentPassword}
                    onChange={handlePasswordChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00365a] focus:border-[#00365a]"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Yeni Şifre *
                  </label>
                  <input
                    type="password"
                    name="newPassword"
                    value={passwordForm.newPassword}
                    onChange={handlePasswordChange}
                    required
                    minLength={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00365a] focus:border-[#00365a]"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Yeni Şifre Onayı *
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={passwordForm.confirmPassword}
                    onChange={handlePasswordChange}
                    required
                    minLength={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00365a] focus:border-[#00365a]"
                  />
                </div>
                
                {passwordMessage && (
                  <div className={`p-3 rounded-lg text-sm ${
                    passwordMessage.includes('Hata') 
                      ? 'bg-red-50 text-red-700 border border-red-200' 
                      : 'bg-green-50 text-green-700 border border-green-200'
                  }`}>
                    {passwordMessage}
                  </div>
                )}
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button
                  type="button"
                  onClick={closePasswordModal}
                  disabled={passwordLoading}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="flex-1 px-4 py-2 bg-[#00365a] text-white rounded-lg hover:bg-[#004170] transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  {passwordLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Değiştiriliyor...
                    </>
                  ) : (
                    'Şifre Değiştir'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header; 