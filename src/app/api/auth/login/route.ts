import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // Bu bölümde gerçek bir API isteği yapılabilir
    // Şimdilik sadece basit bir doğrulama yapıyoruz
    if (username === 'admin' && password === 'password') {
      return NextResponse.json(
        { 
          success: true, 
          message: 'Giriş başarılı', 
          user: { name: 'Özkan ADIGÜZEL', username: 'admin' } 
        }, 
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { success: false, message: 'Kullanıcı adı veya şifre hatalı' }, 
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'Bir hata oluştu' }, 
      { status: 500 }
    );
  }
} 