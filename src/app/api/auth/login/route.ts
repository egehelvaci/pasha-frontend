import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password, rememberMe } = body;

    // Test için geçici login mantığı
    if (username === 'admin' && password === 'password') {
      const userData = {
        userId: '1',
        username: 'admin',
        name: 'Admin',
        surname: 'User',
        email: 'admin@example.com',
        phoneNumber: '1234567890',
        isActive: true,
        createdAt: new Date().toISOString(),
        avatar: null,
        userType: 'admin',
        userTypeId: 1,
        canSeePrice: false, // Test için false yap
        store: null
      };

      const token = 'test-token-' + Date.now();

      return NextResponse.json({
        success: true,
        message: 'Giriş başarılı',
        data: {
          user: userData,
          token: token
        }
      }, { status: 200 });
    }

    // Gerçek API'ye istek gönder
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://pashahomeapps.up.railway.app'}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password, rememberMe }),
    });

    const result = await response.json();

    if (response.ok) {
      return NextResponse.json(result, { status: 200 });
    } else {
      return NextResponse.json(result, { status: response.status });
    }
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'Bir hata oluştu' }, 
      { status: 500 }
    );
  }
} 