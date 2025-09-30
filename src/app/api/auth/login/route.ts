import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password, rememberMe } = body;


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