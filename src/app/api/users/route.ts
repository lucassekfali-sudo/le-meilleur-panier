import { NextRequest, NextResponse } from 'next/server';
import { isFirebaseConfigured } from '@/lib/firebase';

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'B5DLLK3Y9F';

export async function GET(request: NextRequest) {
  try {
    const adminSecret = request.headers.get('x-admin-secret');
    if (adminSecret !== ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (!isFirebaseConfigured()) {
      return NextResponse.json({ users: [], message: 'Firebase not configured' });
    }

    const { getAllUsers } = await import('@/lib/firebase-service');
    const users = await getAllUsers();
    return NextResponse.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, accessKey } = body;

    if (!email || !name || !accessKey) {
      return NextResponse.json(
        { error: 'Email, name, and access key are required' },
        { status: 400 }
      );
    }

    if (!isFirebaseConfigured()) {
      return NextResponse.json({
        user: {
          id: email.replace(/[^a-zA-Z0-9]/g, '_') + '_' + Date.now(),
          email,
          name,
          language: 'fr',
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
        },
        message: 'Firebase not configured, user stored locally',
      });
    }

    const { createUser, validateAccessKey } = await import('@/lib/firebase-service');

    const keyValid = await validateAccessKey(accessKey);
    if (!keyValid) {
      return NextResponse.json(
        { error: 'Invalid or used access key' },
        { status: 400 }
      );
    }

    const user = await createUser(email, name, accessKey);
    if (!user) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      );
    }

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
