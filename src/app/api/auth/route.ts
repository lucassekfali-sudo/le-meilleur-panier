import { NextRequest, NextResponse } from 'next/server';
import { isFirebaseConfigured } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, accessKey } = body;

    if (!email || !accessKey) {
      return NextResponse.json(
        { error: 'Email and access key are required' },
        { status: 400 }
      );
    }

    // Admin login
    if (email === 'admin@gmail.com' && accessKey === 'B5DLLK3Y9F') {
      return NextResponse.json({
        user: {
          id: 'admin',
          email: 'admin@gmail.com',
          name: 'Admin',
          language: 'fr',
          isAdmin: true,
        },
      });
    }

    // Firebase check
    if (isFirebaseConfigured()) {
      const { getUserByEmail, validateAccessKey } = await import('@/lib/firebase-service');
      const user = await getUserByEmail(email);
      if (user) {
        const keyValid = await validateAccessKey(accessKey);
        if (!keyValid) {
          return NextResponse.json(
            { error: 'Invalid access key' },
            { status: 401 }
          );
        }
        return NextResponse.json({ user });
      }
    }

    return NextResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    );
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
