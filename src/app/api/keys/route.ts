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
      return NextResponse.json({ keys: [], message: 'Firebase not configured' });
    }

    const { getAccessKeys } = await import('@/lib/firebase-service');
    const keys = await getAccessKeys();
    return NextResponse.json({ keys });
  } catch (error) {
    console.error('Get keys error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key } = body;

    if (!key) {
      return NextResponse.json({ error: 'Key is required' }, { status: 400 });
    }

    if (!isFirebaseConfigured()) {
      return NextResponse.json({
        key: { key, usedBy: null, usedAt: null, active: true },
        message: 'Firebase not configured, key stored locally',
      });
    }

    const { createAccessKey } = await import('@/lib/firebase-service');
    await createAccessKey(key);
    return NextResponse.json({ key: { key, usedBy: null, usedAt: null, active: true } }, { status: 201 });
  } catch (error) {
    console.error('Create key error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, userId } = body;

    if (!key || !userId) {
      return NextResponse.json({ error: 'Key and userId are required' }, { status: 400 });
    }

    if (!isFirebaseConfigured()) {
      return NextResponse.json({
        key: { key, usedBy: userId, usedAt: new Date().toISOString(), active: false },
        message: 'Firebase not configured, key updated locally',
      });
    }

    const { markAccessKeyAsUsed } = await import('@/lib/firebase-service');
    await markAccessKeyAsUsed(key, userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Use key error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
