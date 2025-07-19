import { useAuth } from '../context/AuthContext';

// Token'ı localStorage veya sessionStorage'dan al
function getAuthToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  
  // Önce localStorage'dan "beni hatırla" durumunu kontrol et
  const rememberMe = localStorage.getItem("rememberMe") === "true";
  
  if (rememberMe) {
    // "Beni hatırla" aktifse localStorage'dan al
    return localStorage.getItem('token');
  } else {
    // "Beni hatırla" aktif değilse sessionStorage'dan al
    return sessionStorage.getItem('token');
  }
}

export function useToken(): string | null {
  const { token } = useAuth();
  
  // AuthContext'ten token varsa onu kullan, yoksa storage'dan al
  return token || getAuthToken();
}

export { getAuthToken }; 