"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useRouter } from "next/navigation";
import { setTokenExpiryHandler, setupGlobalFetchInterceptor } from "../../services/api";

type Store = {
  store_id: string;
  kurum_adi: string;
  vergi_numarasi: string;
  vergi_dairesi: string;
  yetkili_adi: string;
  yetkili_soyadi: string;
  telefon: string;
  eposta: string;
  adres: string;
  faks_numarasi: string;
  aciklama: string;
  tckn: string;                      // 🆕 TCKN alanı
  limitsiz_acik_hesap: boolean;
  acik_hesap_tutari: number;
  bakiye: number;                    // 🆕 Mağaza bakiyesi
  currency: string;                  // 🆕 Para birimi
  maksimum_taksit: number;           // 🆕 Maksimum taksit sayısı
  toplam_kullanilabilir: number;     // 🆕 Bakiye + açık hesap toplamı
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type User = {
  userId: string;
  username: string;
  name: string;
  surname: string;
  email: string;
  phoneNumber?: string;
  isActive: boolean;
  createdAt: string;
  avatar?: string;
  userType: string;
  userTypeId?: number;
  canSeePrice: boolean;              // 🆕 Fiyat görme yetkisi
  store: Store | null;               // 🆕 Mağaza bilgileri (admin için null)
} | null;

type AuthContextType = {
  user: User;
  login: (username: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<{ success: boolean; message: string }>;
  handleTokenExpiry: () => void;
  isLoading: boolean;
  token: string | null;
  isAdmin: boolean;
  isEditor: boolean;
  isViewer: boolean;
  isAdminOrEditor: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://pashahomeapps.up.railway.app";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isEditor, setIsEditor] = useState<boolean>(false);
  const [isViewer, setIsViewer] = useState<boolean>(false);
  const [isAdminOrEditor, setIsAdminOrEditor] = useState<boolean>(false);
  const router = useRouter();

  // Token süresi dolduğunda çağrılacak fonksiyon
  const handleTokenExpiry = useCallback(() => {
    // Kullanıcı bilgilerini temizle
    setUser(null);
    setToken(null);
    setIsAdmin(false);
    setIsEditor(false);
    setIsViewer(false);
    setIsAdminOrEditor(false);
    
    // Storage'ları temizle
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("userType");
    localStorage.removeItem("currency");
    localStorage.removeItem("rememberMe");
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("userType");
    sessionStorage.removeItem("currency");
    
    // Login sayfasına yönlendir
    router.push("/login");
  }, [router]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Client-side kontrolü - sadece tarayıcıda çalıştır
        if (typeof window === 'undefined') {
          return;
        }

        // Önce localStorage'dan "beni hatırla" durumunu kontrol et
        const rememberMe = localStorage.getItem("rememberMe") === "true";
        
        let storedUser, storedToken, storedUserType;
        
        if (rememberMe) {
          // "Beni hatırla" aktifse localStorage'dan al
          storedUser = localStorage.getItem("user");
          storedToken = localStorage.getItem("token");
          storedUserType = localStorage.getItem("userType");
        } else {
          // "Beni hatırla" aktif değilse sessionStorage'dan al
          storedUser = sessionStorage.getItem("user");
          storedToken = sessionStorage.getItem("token");
          storedUserType = sessionStorage.getItem("userType");
        }
        
        
        if (storedUser && storedUser !== "undefined") {
          setUser(JSON.parse(storedUser));
        }
        
        if (storedToken && storedToken !== "undefined") {
          setToken(storedToken);
        }

        if (storedUserType === "admin") {
          setIsAdmin(true);
          setIsAdminOrEditor(true);
        } else if (storedUserType === "editor") {
          setIsEditor(true);
          setIsAdminOrEditor(true);
        } else if (storedUserType === "viewer") {
          setIsViewer(true);
        }
      } catch (error) {
        // Güvenli cleanup - client-side kontrolü ile
        if (typeof window !== 'undefined') {
          localStorage.removeItem("user");
          localStorage.removeItem("token");
          localStorage.removeItem("userType");
          localStorage.removeItem("currency");
          localStorage.removeItem("rememberMe");
          sessionStorage.removeItem("user");
          sessionStorage.removeItem("token");
          sessionStorage.removeItem("userType");
          sessionStorage.removeItem("currency");
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
    
    // Global API error handler'ı ayarla
    setTokenExpiryHandler(handleTokenExpiry);
    
    // Global fetch interceptor'ı başlat
    setupGlobalFetchInterceptor();
  }, [handleTokenExpiry]);

  const login = async (username: string, password: string, rememberMe: boolean = false) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password, rememberMe }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Yeni API response formatına göre kullanıcı bilgisini ayarla
        const userData = {
          userId: result.data.user.userId,
          username: result.data.user.username,
          name: result.data.user.name,
          surname: result.data.user.surname,
          email: result.data.user.email,
          phoneNumber: result.data.user.phoneNumber,
          isActive: result.data.user.isActive,
          createdAt: result.data.user.createdAt,
          avatar: result.data.user.avatar,
          userType: result.data.user.userType,
          userTypeId: result.data.user.userTypeId,
          canSeePrice: result.data.user.canSeePrice ?? true,  // 🆕 Fiyat görme yetkisi, default true
          store: result.data.user.store || null  // Admin için null, mağaza kullanıcısı için store objesi
        };

        setUser(userData);
        setToken(result.data.token);
        const userType = result.data.user.userType;
        setIsAdmin(userType === "admin");
        setIsEditor(userType === "editor");
        setIsViewer(userType === "viewer");
        setIsAdminOrEditor(userType === "admin" || userType === "editor");
        
        // Currency bilgisini storage'a kaydet
        const currency = result.data.user.store?.currency || 'TRY';
        
        // "Beni hatırla" seçeneğine göre localStorage'a kaydet
        if (rememberMe) {
          localStorage.setItem("user", JSON.stringify(userData));
          localStorage.setItem("token", result.data.token);
          localStorage.setItem("userType", result.data.user.userType);
          localStorage.setItem("currency", currency);
          localStorage.setItem("rememberMe", "true");
        } else {
          // SessionStorage kullan (tarayıcı kapatıldığında silinir)
          sessionStorage.setItem("user", JSON.stringify(userData));
          sessionStorage.setItem("token", result.data.token);
          sessionStorage.setItem("userType", result.data.user.userType);
          sessionStorage.setItem("currency", currency);
          localStorage.removeItem("rememberMe");
        }
        
        return { success: true, message: "Giriş başarılı" };
      } else {
        return { success: false, message: result.message || "Kullanıcı adı veya şifre hatalı" };
      }
    } catch (error) {
      return { success: false, message: "Bağlantı hatası, lütfen daha sonra tekrar deneyin" };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      if (token) {
        const response = await fetch(`${API_URL}/api/auth/logout`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        const result = await response.json();
        
        // Token ve kullanıcı bilgilerini temizle
        setUser(null);
        setToken(null);
        setIsAdmin(false);
        setIsEditor(false);
        setIsViewer(false);
        setIsAdminOrEditor(false);
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        localStorage.removeItem("userType");
        localStorage.removeItem("currency");
        localStorage.removeItem("rememberMe");
        sessionStorage.removeItem("user");
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("userType");
        sessionStorage.removeItem("currency");
        
        router.push("/");
        
        return { success: true, message: result.message || "Çıkış yapıldı" };
      } else {
        // Token yoksa sessiz çıkış yap
        setUser(null);
        setIsAdmin(false);
        setIsEditor(false);
        setIsViewer(false);
        setIsAdminOrEditor(false);
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        localStorage.removeItem("userType");
        localStorage.removeItem("currency");
        localStorage.removeItem("rememberMe");
        sessionStorage.removeItem("user");
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("userType");
        sessionStorage.removeItem("currency");
        
        router.push("/");
        
        return { success: true, message: "Çıkış yapıldı" };
      }
    } catch (error) {
      // Hata olsa bile çıkış yap
      setUser(null);
      setToken(null);
      setIsAdmin(false);
      setIsEditor(false);
      setIsAdminOrEditor(false);
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      localStorage.removeItem("userType");
      localStorage.removeItem("currency");
      localStorage.removeItem("rememberMe");
      sessionStorage.removeItem("user");
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("userType");
      sessionStorage.removeItem("currency");
      
      router.push("/");
      
      return { success: false, message: "Çıkış yaparken bir hata oluştu" };
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, handleTokenExpiry, isLoading, isAdmin, isEditor, isViewer, isAdminOrEditor }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
} 