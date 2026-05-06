import { NextRequest, NextResponse } from 'next/server';
import { isFirebaseConfigured } from '@/lib/firebase';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (!isFirebaseConfigured()) {
      return NextResponse.json({ lists: [], message: 'Firebase not configured' });
    }

    const { getShoppingLists } = await import('@/lib/firebase-service');
    const lists = await getShoppingLists(userId);
    return NextResponse.json({ lists });
  } catch (error) {
    console.error('Get lists error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, list } = body;

    if (!userId || !list) {
      return NextResponse.json({ error: 'User ID and list are required' }, { status: 400 });
    }

    if (!isFirebaseConfigured()) {
      return NextResponse.json({ success: true, message: 'Firebase not configured' });
    }

    const { saveShoppingList } = await import('@/lib/firebase-service');
    await saveShoppingList(userId, list);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Save list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, listId } = body;

    if (!userId || !listId) {
      return NextResponse.json({ error: 'User ID and list ID are required' }, { status: 400 });
    }

    if (!isFirebaseConfigured()) {
      return NextResponse.json({ success: true, message: 'Firebase not configured' });
    }

    const { deleteShoppingList } = await import('@/lib/firebase-service');
    await deleteShoppingList(userId, listId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
