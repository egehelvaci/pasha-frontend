import { NextResponse } from 'next/server';
import { proxyAuthRequest, readLoginBody } from '../proxy';

export async function POST(request: Request) {
  let body;
  try { body = await readLoginBody(request); }
  catch { return NextResponse.json({ success: false, message: 'Geçersiz giriş bilgileri' }, { status: 400 }); }
  return proxyAuthRequest(request, 'login', body);
}
