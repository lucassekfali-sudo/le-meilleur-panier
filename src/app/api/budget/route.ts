import { NextRequest, NextResponse } from 'next/server';
import { isFirebaseConfigured } from '@/lib/firebase';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (!isFirebaseConfigured()) {
      return NextResponse.json({ budget: null, message: 'Firebase not configured' });
    }

    const { getBudget } = await import('@/lib/firebase-service');
    const budget = await getBudget(userId);
    return NextResponse.json({ budget });
  } catch (error) {
    console.error('Get budget error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, budget } = body;

    if (!userId || !budget) {
      return NextResponse.json({ error: 'User ID and budget are required' }, { status: 400 });
    }

    if (!isFirebaseConfigured()) {
      return NextResponse.json({ success: true, message: 'Firebase not configured' });
    }

    const { saveBudget } = await import('@/lib/firebase-service');
    await saveBudget(userId, budget);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Save budget error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
