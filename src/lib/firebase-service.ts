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
  orderBy,
  limit as fsLimit,
  Timestamp,
} from 'firebase/firestore';

// ========== Types ==========

export interface UserData {
  id: string;
  email: string;
  name: string;
  /** Hashed password (scrypt:salt:hash). Always prefer this. */
  passwordHash?: string;
  /** Legacy plaintext field — only present on accounts not yet migrated. */
  password?: string;
  language: string;
  createdAt: string;
  lastLogin: string;
  accessKey?: string;
}

/** Exposed user shape (no password material). */
export type SafeUserData = Omit<UserData, 'password' | 'passwordHash'>;

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

/** A snapshot of a completed shopping list, archived for history. */
export interface PurchaseHistoryEntry {
  id: string;
  listId: string;
  listName: string;
  items: ShoppingItemData[];
  total: number;
  itemsCount: number;
  checkedCount: number;
  store?: string;
  archivedAt: string;
}

/** A single product entry — one row per (product, store) pair. */
export interface ProductData {
  id: string;
  name: string;            // "Coca-Cola 1.5L"
  brand?: string;          // "Coca-Cola"
  category?: string;       // "beverages"
  store: string;           // "Carrefour"
  regularPrice: number;
  promoPrice?: number;
  promoEndDate?: string;   // ISO date string
  imageUrl?: string;
  notes?: string;
  updatedAt: string;
}

// Default access keys to seed
const DEFAULT_ACCESS_KEYS = [
  'RI8ZJB6BXB',
  'M9LHZOCN0P',
  '11UHOUCF2L',
  '4D7VKCXVYN',
  'AW1CT3XUVW',
];

function getDb() {
  if (!db || !isFirebaseConfigured()) return null;
  return db;
}

// ========== Initialization ==========

let initialized = false;

export async function initializeFirebase(): Promise<void> {
  const firestore = getDb();
  if (!firestore || initialized) return;

  try {
    const keysSnapshot = await getDocs(collection(firestore, 'accessKeys'));
    if (keysSnapshot.empty) {
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

/**
 * @deprecated stores plaintext password — kept only for backwards compatibility
 * with old client paths. New code MUST use createUserWithHash via /api/auth.
 */
export async function createUser(
  email: string,
  name: string,
  password: string,
  accessKey: string
): Promise<UserData | null> {
  console.warn('[Firebase] createUser called with plaintext password — use createUserWithHash instead');
  return createUserInternal(email, name, accessKey, { password });
}

export async function createUserWithHash(
  email: string,
  name: string,
  passwordHash: string,
  accessKey: string
): Promise<UserData | null> {
  return createUserInternal(email, name, accessKey, { passwordHash });
}

async function createUserInternal(
  email: string,
  name: string,
  accessKey: string,
  pw: { password?: string; passwordHash?: string }
): Promise<UserData | null> {
  const firestore = getDb();
  if (!firestore) return null;

  try {
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
      ...(pw.passwordHash ? { passwordHash: pw.passwordHash } : {}),
      ...(pw.password ? { password: pw.password } : {}),
      language: 'fr',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      accessKey,
    };

    await setDoc(doc(firestore, 'users', userId), userData);
    await markAccessKeyAsUsed(accessKey, userId, email);

    console.log('[Firebase] User created:', email);
    return userData;
  } catch (error) {
    console.error('[Firebase] Error creating user:', error);
    return null;
  }
}

export async function getUserByEmail(email: string): Promise<UserData | null> {
  const firestore = getDb();
  if (!firestore) return null;

  try {
    const q = query(collection(firestore, 'users'), where('email', '==', email));
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

export async function getUserById(userId: string): Promise<UserData | null> {
  const firestore = getDb();
  if (!firestore) return null;

  try {
    const docSnap = await getDoc(doc(firestore, 'users', userId));
    if (docSnap.exists()) return docSnap.data() as UserData;
    return null;
  } catch (error) {
    console.error('[Firebase] Error getting user by ID:', error);
    return null;
  }
}

export async function updateUserLastLogin(userId: string): Promise<void> {
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

/**
 * Sets the scrypt password hash for a user and clears any legacy plaintext field.
 * Used for password migration after a successful login with a legacy account.
 */
export async function updateUserPasswordHash(
  userId: string,
  passwordHash: string
): Promise<void> {
  const firestore = getDb();
  if (!firestore) return;

  try {
    // updateDoc with field deletion: write null then re-write hash; for simplicity
    // we just set the hash and overwrite the legacy field with empty string.
    await updateDoc(doc(firestore, 'users', userId), {
      passwordHash,
      password: '', // clear legacy plaintext
    });
  } catch (error) {
    console.error('[Firebase] Error updating password hash:', error);
  }
}

/** Returns users without ANY password material. */
export async function getAllUsers(): Promise<SafeUserData[]> {
  const firestore = getDb();
  if (!firestore) return [];

  try {
    const snapshot = await getDocs(collection(firestore, 'users'));
    return snapshot.docs.map((d) => {
      const data = d.data() as UserData;
      const { password: _p, passwordHash: _h, ...safe } = data;
      void _p; void _h;
      return safe as SafeUserData;
    });
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
    const historySnap = await getDocs(collection(firestore, 'users', userId, 'history'));
    for (const h of historySnap.docs) {
      await deleteDoc(h.ref);
    }
    await deleteDoc(doc(firestore, 'users', userId, 'budget', 'current'));
    await deleteDoc(doc(firestore, 'users', userId, 'favorites', 'items'));

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
    await setDoc(doc(firestore, 'users', userId, 'lists', list.id), {
      ...list,
      updatedAt: new Date().toISOString(),
    });
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

export async function saveBudget(userId: string, budget: BudgetData): Promise<void> {
  const firestore = getDb();
  if (!firestore) return;
  try {
    await setDoc(doc(firestore, 'users', userId, 'budget', 'current'), budget);
  } catch (error) {
    console.error('[Firebase] Error saving budget:', error);
  }
}

export async function getBudget(userId: string): Promise<BudgetData | null> {
  const firestore = getDb();
  if (!firestore) return null;
  try {
    const docSnap = await getDoc(doc(firestore, 'users', userId, 'budget', 'current'));
    if (docSnap.exists()) return docSnap.data() as BudgetData;
    return null;
  } catch (error) {
    console.error('[Firebase] Error getting budget:', error);
    return null;
  }
}

// ========== Access Key Operations ==========

/**
 * Validate an access key for signup.
 * Fail-CLOSED: returns false on Firebase errors so a misconfigured backend
 * can't accidentally let everyone sign up.
 */
export async function validateAccessKey(key: string): Promise<boolean> {
  const firestore = getDb();
  if (!firestore) {
    // No Firebase configured — refuse signup. The previous behaviour
    // (return true) was a critical bypass.
    return false;
  }

  try {
    const docSnap = await getDoc(doc(firestore, 'accessKeys', key));
    if (!docSnap.exists()) return false;
    const data = docSnap.data() as AccessKeyData;
    return data.active === true && !data.usedBy;
  } catch (error) {
    console.error('[Firebase] Error validating access key:', error);
    return false; // fail closed
  }
}

export async function markAccessKeyAsUsed(
  key: string,
  userId: string,
  email?: string
): Promise<void> {
  const firestore = getDb();
  if (!firestore) return;

  try {
    await setDoc(doc(firestore, 'accessKeys', key), {
      key,
      usedBy: email ?? userId,
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

export async function createAccessKey(key: string): Promise<void> {
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

export async function getFavorites(userId: string): Promise<ShoppingItemData[]> {
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

// ========== Purchase History Operations ==========

/**
 * Archive a completed shopping list to the user's purchase history.
 * Returns the created entry (or null on error).
 */
export async function archiveListToHistory(
  userId: string,
  list: ShoppingListData,
  store?: string
): Promise<PurchaseHistoryEntry | null> {
  const firestore = getDb();
  if (!firestore) return null;

  try {
    const total = list.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const checkedCount = list.items.filter((i) => i.checked).length;
    const id = 'hist_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);

    const entry: PurchaseHistoryEntry = {
      id,
      listId: list.id,
      listName: list.name,
      items: list.items,
      total,
      itemsCount: list.items.length,
      checkedCount,
      store: store || undefined,
      archivedAt: new Date().toISOString(),
    };

    await setDoc(doc(firestore, 'users', userId, 'history', id), entry);
    return entry;
  } catch (error) {
    console.error('[Firebase] Error archiving list to history:', error);
    return null;
  }
}

/**
 * Read purchase history, sorted by archived date desc.
 * @param max Optional cap on number of entries (defaults to 100)
 */
export async function getPurchaseHistory(
  userId: string,
  max = 100
): Promise<PurchaseHistoryEntry[]> {
  const firestore = getDb();
  if (!firestore) return [];

  try {
    const q = query(
      collection(firestore, 'users', userId, 'history'),
      orderBy('archivedAt', 'desc'),
      fsLimit(max)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => d.data() as PurchaseHistoryEntry);
  } catch (error) {
    // Fallback without orderBy in case the index isn't ready yet
    try {
      const snapshot = await getDocs(collection(firestore, 'users', userId, 'history'));
      const all = snapshot.docs.map((d) => d.data() as PurchaseHistoryEntry);
      all.sort((a, b) => (a.archivedAt < b.archivedAt ? 1 : -1));
      return all.slice(0, max);
    } catch (fallbackError) {
      console.error('[Firebase] Error getting purchase history:', error, fallbackError);
      return [];
    }
  }
}

export async function deleteHistoryEntry(
  userId: string,
  historyId: string
): Promise<void> {
  const firestore = getDb();
  if (!firestore) return;

  try {
    await deleteDoc(doc(firestore, 'users', userId, 'history', historyId));
  } catch (error) {
    console.error('[Firebase] Error deleting history entry:', error);
  }
}

// ========== Product Catalog Operations ==========

/** Get every product in the catalog. */
export async function getProducts(): Promise<ProductData[]> {
  const firestore = getDb();
  if (!firestore) return [];
  try {
    const snapshot = await getDocs(collection(firestore, 'products'));
    return snapshot.docs.map((d) => d.data() as ProductData);
  } catch (error) {
    console.error('[Firebase] Error getting products:', error);
    return [];
  }
}

/** Add a new product entry (one row per product+store combo). */
export async function createProduct(
  data: Omit<ProductData, 'id' | 'updatedAt'>
): Promise<ProductData | null> {
  const firestore = getDb();
  if (!firestore) return null;
  try {
    const id = 'prod_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    const product: ProductData = {
      ...data,
      id,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(firestore, 'products', id), product);
    return product;
  } catch (error) {
    console.error('[Firebase] Error creating product:', error);
    return null;
  }
}

/** Update an existing product. */
export async function updateProduct(
  id: string,
  updates: Partial<Omit<ProductData, 'id'>>
): Promise<void> {
  const firestore = getDb();
  if (!firestore) return;
  try {
    await updateDoc(doc(firestore, 'products', id), {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Firebase] Error updating product:', error);
  }
}

/** Delete a product entry. */
export async function deleteProduct(id: string): Promise<void> {
  const firestore = getDb();
  if (!firestore) return;
  try {
    await deleteDoc(doc(firestore, 'products', id));
  } catch (error) {
    console.error('[Firebase] Error deleting product:', error);
  }
}

/**
 * Helper: returns the effective price for a product right now.
 * Uses promoPrice if it exists and the promo hasn't expired, else regularPrice.
 */
export function effectivePrice(p: ProductData): number {
  if (p.promoPrice == null) return p.regularPrice;
  if (!p.promoEndDate) return p.promoPrice;
  if (new Date(p.promoEndDate).getTime() >= Date.now()) {
    return p.promoPrice;
  }
  return p.regularPrice;
}

/**
 * Seed the catalog with a starter set of common products across 3 stores.
 * Returns the number of products added.
 */
export async function seedSampleProducts(): Promise<number> {
  const firestore = getDb();
  if (!firestore) return 0;

  const samples: Array<Omit<ProductData, 'id' | 'updatedAt'>> = [
    // === Carrefour ===
    { name: 'Lait demi-écrémé Lactel 1L', brand: 'Lactel', category: 'dairy', store: 'Carrefour', regularPrice: 1.20 },
    { name: 'Coca-Cola 1.5L', brand: 'Coca-Cola', category: 'beverages', store: 'Carrefour', regularPrice: 1.95, promoPrice: 1.49 },
    { name: 'Pain de mie Harrys 500g', brand: 'Harrys', category: 'bakery', store: 'Carrefour', regularPrice: 2.10 },
    { name: 'Yaourt nature Danone 4x125g', brand: 'Danone', category: 'dairy', store: 'Carrefour', regularPrice: 2.05 },
    { name: 'Pommes Golden 1kg', brand: '', category: 'fruits', store: 'Carrefour', regularPrice: 2.49 },
    { name: 'Bananes 1kg', brand: '', category: 'fruits', store: 'Carrefour', regularPrice: 1.79 },
    { name: 'Poulet entier 1kg', brand: '', category: 'meat', store: 'Carrefour', regularPrice: 6.99 },
    { name: 'Pâtes Panzani Penne 500g', brand: 'Panzani', category: 'other', store: 'Carrefour', regularPrice: 1.45 },
    { name: 'Riz Uncle Ben\'s 1kg', brand: 'Uncle Ben\'s', category: 'other', store: 'Carrefour', regularPrice: 4.20 },
    { name: 'Beurre President doux 250g', brand: 'President', category: 'dairy', store: 'Carrefour', regularPrice: 2.85 },

    // === Lidl ===
    { name: 'Lait demi-écrémé Lactel 1L', brand: 'Lactel', category: 'dairy', store: 'Lidl', regularPrice: 0.95 },
    { name: 'Coca-Cola 1.5L', brand: 'Coca-Cola', category: 'beverages', store: 'Lidl', regularPrice: 1.65 },
    { name: 'Pain de mie 500g', brand: '', category: 'bakery', store: 'Lidl', regularPrice: 1.49 },
    { name: 'Yaourt nature 4x125g', brand: '', category: 'dairy', store: 'Lidl', regularPrice: 1.40 },
    { name: 'Pommes Golden 1kg', brand: '', category: 'fruits', store: 'Lidl', regularPrice: 1.99 },
    { name: 'Bananes 1kg', brand: '', category: 'fruits', store: 'Lidl', regularPrice: 1.39 },
    { name: 'Poulet entier 1kg', brand: '', category: 'meat', store: 'Lidl', regularPrice: 5.49 },
    { name: 'Pâtes Penne 500g', brand: '', category: 'other', store: 'Lidl', regularPrice: 0.79 },
    { name: 'Riz long grain 1kg', brand: '', category: 'other', store: 'Lidl', regularPrice: 1.95 },
    { name: 'Beurre doux 250g', brand: '', category: 'dairy', store: 'Lidl', regularPrice: 2.25 },

    // === Auchan ===
    { name: 'Lait demi-écrémé Lactel 1L', brand: 'Lactel', category: 'dairy', store: 'Auchan', regularPrice: 1.10, promoPrice: 0.85 },
    { name: 'Coca-Cola 1.5L', brand: 'Coca-Cola', category: 'beverages', store: 'Auchan', regularPrice: 1.85 },
    { name: 'Pain de mie Harrys 500g', brand: 'Harrys', category: 'bakery', store: 'Auchan', regularPrice: 1.95 },
    { name: 'Yaourt nature Danone 4x125g', brand: 'Danone', category: 'dairy', store: 'Auchan', regularPrice: 1.95 },
    { name: 'Pommes Golden 1kg', brand: '', category: 'fruits', store: 'Auchan', regularPrice: 2.29 },
    { name: 'Bananes 1kg', brand: '', category: 'fruits', store: 'Auchan', regularPrice: 1.59 },
    { name: 'Poulet entier 1kg', brand: '', category: 'meat', store: 'Auchan', regularPrice: 6.49, promoPrice: 4.99 },
    { name: 'Pâtes Panzani Penne 500g', brand: 'Panzani', category: 'other', store: 'Auchan', regularPrice: 1.35 },
    { name: 'Riz Uncle Ben\'s 1kg', brand: 'Uncle Ben\'s', category: 'other', store: 'Auchan', regularPrice: 3.89 },
    { name: 'Beurre President doux 250g', brand: 'President', category: 'dairy', store: 'Auchan', regularPrice: 2.65 },
  ];

  let count = 0;
  for (const sample of samples) {
    const created = await createProduct(sample);
    if (created) count++;
  }
  return count;
}

// ========== Goals Operations ==========

export interface GoalData {
  id: string;
  title: string;
  frequency: 'daily' | 'weekly';
  targetValue: number;
  unit: string;
  createdAt: string;
}

export interface GoalLogData {
  date: string; // YYYY-MM-DD
  logs: Record<string, number>; // goalId -> value achieved
}

export async function saveGoal(userId: string, goal: GoalData): Promise<void> {
  const firestore = getDb();
  if (!firestore) return;

  try {
    await setDoc(doc(firestore, 'users', userId, 'goals', goal.id), goal);
  } catch (error) {
    console.error('[Firebase] Error saving goal:', error);
  }
}

export async function getGoals(userId: string): Promise<GoalData[]> {
  const firestore = getDb();
  if (!firestore) return [];

  try {
    const snapshot = await getDocs(
      collection(firestore, 'users', userId, 'goals')
    );
    return snapshot.docs.map((d) => d.data() as GoalData);
  } catch (error) {
    console.error('[Firebase] Error getting goals:', error);
    return [];
  }
}

export async function deleteGoal(userId: string, goalId: string): Promise<void> {
  const firestore = getDb();
  if (!firestore) return;

  try {
    await deleteDoc(doc(firestore, 'users', userId, 'goals', goalId));
  } catch (error) {
    console.error('[Firebase] Error deleting goal:', error);
  }
}

export async function saveGoalLog(userId: string, date: string, logs: Record<string, number>): Promise<void> {
  const firestore = getDb();
  if (!firestore) return;

  try {
    await setDoc(doc(firestore, 'users', userId, 'goalLogs', date), { date, logs });
  } catch (error) {
    console.error('[Firebase] Error saving goal log:', error);
  }
}

export async function getGoalLogs(userId: string, startDate: string, endDate: string): Promise<GoalLogData[]> {
  const firestore = getDb();
  if (!firestore) return [];

  try {
    const q = query(
      collection(firestore, 'users', userId, 'goalLogs'),
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => d.data() as GoalLogData);
  } catch (error) {
    // Fallback without ordering
    try {
      const snapshot = await getDocs(collection(firestore, 'users', userId, 'goalLogs'));
      const all = snapshot.docs
        .map((d) => d.data() as GoalLogData)
        .filter((log) => log.date >= startDate && log.date <= endDate);
      all.sort((a, b) => (a.date < b.date ? -1 : 1));
      return all;
    } catch (fallbackError) {
      console.error('[Firebase] Error getting goal logs:', error, fallbackError);
      return [];
    }
  }
}

// ========== Tricount / Shared Expenses Operations ==========

export interface GroupData {
  id: string;
  name: string;
  participants: string[];
  createdAt: string;
}

export interface ExpenseData {
  id: string;
  groupId: string;
  description: string;
  amount: number;
  paidBy: string;        // participant name
  splitAmong: string[];  // participant names
  createdAt: string;
}

export async function saveGroup(userId: string, group: GroupData): Promise<void> {
  const firestore = getDb();
  if (!firestore) return;

  try {
    await setDoc(doc(firestore, 'users', userId, 'groups', group.id), group);
  } catch (error) {
    console.error('[Firebase] Error saving group:', error);
  }
}

export async function getGroups(userId: string): Promise<GroupData[]> {
  const firestore = getDb();
  if (!firestore) return [];

  try {
    const snapshot = await getDocs(
      collection(firestore, 'users', userId, 'groups')
    );
    return snapshot.docs.map((d) => d.data() as GroupData);
  } catch (error) {
    console.error('[Firebase] Error getting groups:', error);
    return [];
  }
}

export async function deleteGroup(userId: string, groupId: string): Promise<void> {
  const firestore = getDb();
  if (!firestore) return;

  try {
    // Delete all expenses in the group first
    const expensesSnapshot = await getDocs(
      collection(firestore, 'users', userId, 'groups', groupId, 'expenses')
    );
    for (const expDoc of expensesSnapshot.docs) {
      await deleteDoc(expDoc.ref);
    }
    // Delete the group itself
    await deleteDoc(doc(firestore, 'users', userId, 'groups', groupId));
  } catch (error) {
    console.error('[Firebase] Error deleting group:', error);
  }
}

export async function saveExpense(userId: string, groupId: string, expense: ExpenseData): Promise<void> {
  const firestore = getDb();
  if (!firestore) return;

  try {
    await setDoc(doc(firestore, 'users', userId, 'groups', groupId, 'expenses', expense.id), expense);
  } catch (error) {
    console.error('[Firebase] Error saving expense:', error);
  }
}

export async function getExpenses(userId: string, groupId: string): Promise<ExpenseData[]> {
  const firestore = getDb();
  if (!firestore) return [];

  try {
    const snapshot = await getDocs(
      collection(firestore, 'users', userId, 'groups', groupId, 'expenses')
    );
    return snapshot.docs.map((d) => d.data() as ExpenseData);
  } catch (error) {
    console.error('[Firebase] Error getting expenses:', error);
    return [];
  }
}

export async function deleteExpense(userId: string, groupId: string, expenseId: string): Promise<void> {
  const firestore = getDb();
  if (!firestore) return;

  try {
    await deleteDoc(doc(firestore, 'users', userId, 'groups', groupId, 'expenses', expenseId));
  } catch (error) {
    console.error('[Firebase] Error deleting expense:', error);
  }
}

// ========== Helper ==========
export function timestampToDate(ts: Timestamp | string): string {
  if (typeof ts === 'string') return ts;
  return ts.toDate().toISOString();
}
