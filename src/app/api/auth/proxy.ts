import { NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://pashahomeapps.up.railway.app';

export async function readLoginBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Missing body');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 8192) {
        await reader.cancel();
        throw new Error('Body too large');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if (!body || typeof body.username !== 'string' || !body.username.trim() || body.username.length > 320 ||
      typeof body.password !== 'string' || !body.password || body.password.length > 1024 ||
      (body.rememberMe !== undefined && typeof body.rememberMe !== 'boolean')) throw new Error('Invalid login');
  return { username: body.username, password: body.password, rememberMe: body.rememberMe ?? false };
}

export async function proxyAuthRequest(request: Request, action: 'login' | 'logout', body?: unknown) {
  const upstream = new URL(`/api/auth/${action}`, API_URL);
  if (upstream.origin === new URL(request.url).origin) {
    return NextResponse.json({ success: false, message: 'API yapılandırması geçersiz' }, { status: 503 });
  }
  try {
    const authorization = request.headers.get('Authorization');
    const response = await fetch(upstream, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(authorization ? { Authorization: authorization } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
      redirect: 'error',
      cache: 'no-store',
    });
    if (response.status === 204) return new NextResponse(null, { status: 204 });
    return NextResponse.json(await response.json(), { status: response.status, headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ success: false, message: 'Kimlik doğrulama servisine ulaşılamadı' }, { status: 502 });
  }
}
