import { db, isFirebaseConfigured } from './firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';

// Types
export interface UserData {
  id: string;
  email: string;
  name: string;
  password: string;
  language: string;
  createdAt: string;
  lastLogin: string;
  accessKey?: string;
}

export interface ShoppingListData {
  id: string;
  name: string;
  items: ShoppingItemData[];
  createdAt: string;
  updatedAt: string;
}

export interface ShoppingItemData {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
  checked: boolean;
}

export interface BudgetData {
  income: number;
  fixedExpenses: FixedExpense[];
  variableExpenses: VariableExpense[];
  foodBudget: number;
}

export interface FixedExpense {
  id: string;
  name: string;
  amount: number;
}

export interface VariableExpense {
  id: string;
  name: string;
  amount: number;
}

export interface AccessKeyData {
  key: string;
  usedBy: string | null;
  usedAt: string | null;
  active: boolean;
}

// Default access keys to seed
const DEFAULT_ACCESS_KEYS = [
  'RI8ZJB6BXB',
  'M9LHZOCN0P',
  '11UHOUCF2L',
  '4D7VKCXVYN',
  'AW1CT3XUVW',
];

// Check if Firestore is available
function getDb() {
  if (!db || !isFirebaseConfigured()) {
    return null;
  }
  return db;
}

// ========== Initialization ==========

let initialized = false;

export async function initializeFirebase(): Promise<void> {
  const firestore = getDb();
  if (!firestore || initialized) return;

  try {
    // Check if access keys are already seeded
    const keysSnapshot = await getDocs(collection(firestore, 'accessKeys'));
    if (keysSnapshot.empty) {
      // Seed default access keys
      console.log('[Firebase] Seeding default access keys...');
      for (const key of DEFAULT_ACCESS_KEYS) {
        await setDoc(doc(firestore, 'accessKeys', key), {
          key,
          usedBy: null,
          usedAt: null,
          active: true,
        });
      }
      console.log('[Firebase] Default access keys seeded successfully');
    }
    initialized = true;
  } catch (error) {
    console.error('[Firebase] Initialization error:', error);
  }
}

// ========== User Operations ==========

export async function createUser(
  email: string,
  name: string,
  password: string,
  accessKey: string
): Promise<UserData | null> {
  const firestore = getDb();
  if (!firestore) return null;

  try {
    // Check if user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      console.warn('[Firebase] User already exists:', email);
      return existingUser;
    }

    const userId = email.replace(/[^a-zA-Z0-9]/g, '_') + '_' + Date.now();
    const userData: UserData = {
      id: userId,
      email,
      name,
      password,
      language: 'fr',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      accessKey,
    };

    await setDoc(doc(firestore, 'users', userId), userData);

    // Mark the access key as used
    await markAccessKeyAsUsed(accessKey, userId, email);

    console.log('[Firebase] User created:', email);
    return userData;
  } catch (error) {
    console.error('[Firebase] Error creating user:', error);
    return null;
  }
}

export async function getUserByEmail(
  email: string
): Promise<UserData | null> {
  const firestore = getDb();
  if (!firestore) return null;

  try {
    const q = query(
      collection(firestore, 'users'),
      where('email', '==', email)
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return snapshot.docs[0].data() as UserData;
    }
    return null;
  } catch (error) {
    console.error('[Firebase] Error getting user by email:', error);
    return null;
  }
}

export async function getUserById(
  userId: string
): Promise<UserData | null> {
  const firestore = getDb();
  if (!firestore) return null;

  try {
    const docSnap = await getDoc(doc(firestore, 'users', userId));
    if (docSnap.exists()) {
      return docSnap.data() as UserData;
    }
    return null;
  } catch (error) {
    console.error('[Firebase] Error getting user by ID:', error);
    return null;
  }
}

export async function updateUserLastLogin(
  userId: string
): Promise<void> {
  const firestore = getDb();
  if (!firestore) return;

  try {
    await updateDoc(doc(firestore, 'users', userId), {
      lastLogin: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Firebase] Error updating last login:', error);
  }
}

export async function getAllUsers(): Promise<UserData[]> {
  const firestore = getDb();
  if (!firestore) return [];

  try {
    const snapshot = await getDocs(collection(firestore, 'users'));
    return snapshot.docs.map((d) => d.data() as UserData);
  } catch (error) {
    console.error('[Firebase] Error getting all users:', error);
    return [];
  }
}

export async function deleteUser(userId: string): Promise<void> {
  const firestore = getDb();
  if (!firestore) return;

  try {
    // Delete user's subcollections first
    const listsSnapshot = await getDocs(collection(firestore, 'users', userId, 'lists'));
    for (const listDoc of listsSnapshot.docs) {
      await deleteDoc(listDoc.ref);
    }
    await deleteDoc(doc(firestore, 'users', userId, 'budget', 'current'));
    await deleteDoc(doc(firestore, 'users', userId, 'favorites', 'items'));

    // Delete user document
    await deleteDoc(doc(firestore, 'users', userId));
    console.log('[Firebase] User deleted:', userId);
  } catch (error) {
    console.error('[Firebase] Error deleting user:', error);
  }
}

// ========== Shopping List Operations ==========

export async function saveShoppingList(
  userId: string,
  list: ShoppingListData
): Promise<void> {
  const firestore = getDb();
  if (!firestore) return;

  try {
    await setDoc(
      doc(firestore, 'users', userId, 'lists', list.id),
      {
        ...list,
        updatedAt: new Date().toISOString(),
      }
    );
  } catch (error) {
    console.error('[Firebase] Error saving shopping list:', error);
  }
}

export async function getShoppingLists(
  userId: string
): Promise<ShoppingListData[]> {
  const firestore = getDb();
  if (!firestore) return [];

  try {
    const snapshot = await getDocs(
      collection(firestore, 'users', userId, 'lists')
    );
    return snapshot.docs.map((d) => d.data() as ShoppingListData);
  } catch (error) {
    console.error('[Firebase] Error getting shopping lists:', error);
    return [];
  }
}

export async function deleteShoppingList(
  userId: string,
  listId: string
): Promise<void> {
  const firestore = getDb();
  if (!firestore) return;

  try {
    await deleteDoc(doc(firestore, 'users', userId, 'lists', listId));
  } catch (error) {
    console.error('[Firebase] Error deleting shopping list:', error);
  }
}

// ========== Budget Operations ==========

export async function saveBudget(
  userId: string,
  budget: BudgetData
): Promise<void> {
  const firestore = getDb();
  if (!firestore) return;

  try {
    await setDoc(doc(firestore, 'users', userId, 'budget', 'current'), budget);
  } catch (error) {
    console.error('[Firebase] Error saving budget:', error);
  }
}

export async function getBudget(
  userId: string
): Promise<BudgetData | null> {
  const firestore = getDb();
  if (!firestore) return null;

  try {
    const docSnap = await getDoc(
      doc(firestore, 'users', userId, 'budget', 'current')
    );
    if (docSnap.exists()) {
      return docSnap.data() as BudgetData;
    }
    return null;
  } catch (error) {
    console.error('[Firebase] Error getting budget:', error);
    return null;
  }
}

// ========== Access Key Operations ==========

export async function validateAccessKey(
  key: string
): Promise<boolean> {
  const firestore = getDb();
  if (!firestore) return true; // If no Firebase, allow access

  try {
    const docSnap = await getDoc(doc(firestore, 'accessKeys', key));
    if (docSnap.exists()) {
      const data = docSnap.data() as AccessKeyData;
      return data.active && !data.usedBy;
    }
    return false;
  } catch (error) {
    console.error('[Firebase] Error validating access key:', error);
    return true; // Fallback: allow access if Firebase errors
  }
}

export async function markAccessKeyAsUsed(
  key: string,
  userId: string,
  email: string
): Promise<void> {
  const firestore = getDb();
  if (!firestore) return;

  try {
    await setDoc(doc(firestore, 'accessKeys', key), {
      key,
      usedBy: email,
      usedAt: new Date().toISOString(),
      active: false,
    });
  } catch (error) {
    console.error('[Firebase] Error marking access key as used:', error);
  }
}

export async function getAccessKeys(): Promise<AccessKeyData[]> {
  const firestore = getDb();
  if (!firestore) return [];

  try {
    const snapshot = await getDocs(collection(firestore, 'accessKeys'));
    return snapshot.docs.map((d) => d.data() as AccessKeyData);
  } catch (error) {
    console.error('[Firebase] Error getting access keys:', error);
    return [];
  }
}

export async function createAccessKey(
  key: string
): Promise<void> {
  const firestore = getDb();
  if (!firestore) return;

  try {
    await setDoc(doc(firestore, 'accessKeys', key), {
      key,
      usedBy: null,
      usedAt: null,
      active: true,
    });
  } catch (error) {
    console.error('[Firebase] Error creating access key:', error);
  }
}

// ========== Favorites Operations ==========

export async function saveFavorites(
  userId: string,
  favorites: ShoppingItemData[]
): Promise<void> {
  const firestore = getDb();
  if (!firestore) return;

  try {
    await setDoc(doc(firestore, 'users', userId, 'favorites', 'items'), {
      items: favorites,
    });
  } catch (error) {
    console.error('[Firebase] Error saving favorites:', error);
  }
}

export async function getFavorites(
  userId: string
): Promise<ShoppingItemData[]> {
  const firestore = getDb();
  if (!firestore) return [];

  try {
    const docSnap = await getDoc(
      doc(firestore, 'users', userId, 'favorites', 'items')
    );
    if (docSnap.exists()) {
      const data = docSnap.data();
      return (data.items as ShoppingItemData[]) || [];
    }
    return [];
  } catch (error) {
    console.error('[Firebase] Error getting favorites:', error);
    return [];
  }
}

// ========== Helper: Timestamp conversion ==========
export function timestampToDate(ts: Timestamp | string): string {
  if (typeof ts === 'string') return ts;
  return ts.toDate().toISOString();
}
