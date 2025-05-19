"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";

type User = {
  userId: string;
  username: string;
  name: string;
  surname: string;
  email: string;
  phoneNumber: string;
  isActive: boolean;
  createdAt: string;
  avatar: string;
  credit: string;
  debit: string;
  userType: string;
  userTypeId: number;
  Store?: {
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
    limitsiz_acik_hesap: boolean;
    acik_hesap_tutari: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  };
} | null;

type AuthContextType = {
  user: User;
  login: (username: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<{ success: boolean; message: string }>;
  isLoading: boolean;
  token: string | null;
  isAdmin: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = "https://pasha-backend-production.up.railway.app";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const router = useRouter();

  useEffect(() => {
    try {
      // LocalStorage'dan kullanıcı bilgisi ve token'ı al
      const storedUser = localStorage.getItem("user");
      const storedToken = localStorage.getItem("token");
      const storedUserType = localStorage.getItem("userType");
      
      if (storedUser && storedUser !== "undefined") {
        setUser(JSON.parse(storedUser));
      }
      
      if (storedToken && storedToken !== "undefined") {
        setToken(storedToken);
      }

      if (storedUserType === "admin") {
        setIsAdmin(true);
      }
    } catch (error) {
      console.error("LocalStorage parse hatası:", error);
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      localStorage.removeItem("userType");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // API'den gelen kullanıcı bilgisini ve token'ı kaydet
        setUser(result.data.user);
        setToken(result.data.token);
        setIsAdmin(result.data.user.userType === "admin");
        
        // LocalStorage'a kaydet
        localStorage.setItem("user", JSON.stringify(result.data.user));
        localStorage.setItem("token", result.data.token);
        localStorage.setItem("userType", result.data.user.userType);
        
        return { success: true, message: "Giriş başarılı" };
      } else {
        return { success: false, message: result.message || "Kullanıcı adı veya şifre hatalı" };
      }
    } catch (error) {
      console.error("Login hatası:", error);
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
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        localStorage.removeItem("userType");
        
        router.push("/");
        
        return { success: true, message: result.message || "Çıkış yapıldı" };
      } else {
        // Token yoksa sessiz çıkış yap
        setUser(null);
        setIsAdmin(false);
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        localStorage.removeItem("userType");
        router.push("/");
        
        return { success: true, message: "Çıkış yapıldı" };
      }
    } catch (error) {
      console.error("Logout hatası:", error);
      
      // Hata olsa bile çıkış yap
      setUser(null);
      setToken(null);
      setIsAdmin(false);
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      localStorage.removeItem("userType");
      router.push("/");
      
      return { success: false, message: "Çıkış yaparken bir hata oluştu" };
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading, isAdmin }}>
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