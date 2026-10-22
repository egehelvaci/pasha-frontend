import { NextResponse } from 'next/server';
import { proxyAuthRequest } from '../proxy';

export async function POST(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !/^Bearer\s+\S+$/i.test(authHeader)) {
    return NextResponse.json({ success: false, message: 'Geçersiz yetkilendirme' }, { status: 401 });
  }
  // The issuing backend verifies and revokes tokens; never acknowledge a fake logout.
  return proxyAuthRequest(request, 'logout');
}
