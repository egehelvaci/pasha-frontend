import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // Token kontrolü
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Geçersiz yetkilendirme' }, 
        { status: 401 }
      );
    }

    // Gerçek bir API'de bu token blacklist'e eklenebilir
    
    return NextResponse.json(
      { success: true, message: 'Başarıyla çıkış yapıldı' }, 
      { status: 200 }
    );
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, message: 'Çıkış yapılırken bir hata oluştu' }, 
      { status: 500 }
    );
  }
} 