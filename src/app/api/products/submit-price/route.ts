import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

export const runtime = 'nodejs';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function getDb() {
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return getFirestore(app);
}

/**
 * POST { productId, store, price, userId? }
 *  → { ok, verified, newOfficialPrice? }
 *
 * Trust engine:
 *  - Each user submission is stored in products/{productId}/submissions
 *  - When ≥ 3 submissions for the same store cluster within ±5%, the median
 *    becomes the "verified" price and is written back to products/{productId}.
 *  - Outliers (>50% off median) are rejected from the trust calculation.
 */
export async function POST(req: NextRequest) {
  try {
    const { productId, store, price, userId } = await req.json();

    if (!productId || !store || typeof price !== 'number' || price <= 0) {
      return NextResponse.json({ ok: false, error: 'Invalid input' }, { status: 400 });
    }

    const db = getDb();
    const submissionsRef = collection(db, 'products', productId, 'submissions');

    // Record this submission
    await addDoc(submissionsRef, {
      store,
      price,
      userId: userId || 'anonymous',
      submittedAt: new Date().toISOString(),
    });

    // Fetch all submissions for this store
    const q = query(submissionsRef, where('store', '==', store));
    const snap = await getDocs(q);
    const prices: number[] = [];
    snap.forEach((d) => {
      const v = d.data().price;
      if (typeof v === 'number' && v > 0) prices.push(v);
    });

    if (prices.length < 3) {
      return NextResponse.json({
        ok: true,
        verified: false,
        pendingVotes: prices.length,
        requiredVotes: 3,
      });
    }

    // Compute median
    const sorted = [...prices].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];

    // Filter outliers (>50% off median) and require ≥ 3 close submissions
    const closeOnes = prices.filter((p) => Math.abs(p - median) / median <= 0.5);
    if (closeOnes.length < 3) {
      return NextResponse.json({
        ok: true,
        verified: false,
        pendingVotes: closeOnes.length,
        note: 'Submissions too divergent',
      });
    }

    // Use the median of the close submissions as the verified price
    const closeSorted = [...closeOnes].sort((a, b) => a - b);
    const verifiedPrice = closeSorted[Math.floor(closeSorted.length / 2)];

    // Write back to the product document (per-store price map)
    const productDocRef = doc(db, 'products', productId);
    try {
      await updateDoc(productDocRef, {
        [`verifiedPrices.${store.replace(/[^a-zA-Z0-9_-]/g, '_')}`]: {
          price: verifiedPrice,
          verifiedAt: new Date().toISOString(),
          voteCount: closeOnes.length,
        },
        updatedAt: new Date().toISOString(),
      });
    } catch {
      // If the doc doesn't exist yet, create a minimal one
      await setDoc(
        productDocRef,
        {
          id: productId,
          verifiedPrices: {
            [store.replace(/[^a-zA-Z0-9_-]/g, '_')]: {
              price: verifiedPrice,
              verifiedAt: new Date().toISOString(),
              voteCount: closeOnes.length,
            },
          },
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    }

    return NextResponse.json({
      ok: true,
      verified: true,
      newOfficialPrice: verifiedPrice,
      voteCount: closeOnes.length,
    });
  } catch (e) {
    console.error('[submit-price] error:', e);
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 });
  }
}
