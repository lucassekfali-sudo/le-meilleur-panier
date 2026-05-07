'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Language } from './translations';
import { isFirebaseConfigured } from './firebase';
import type {
  ShoppingListData,
  ShoppingItemData,
  BudgetData,
  AccessKeyData,
  PurchaseHistoryEntry,
} from './firebase-service';

// NOTE: ADMIN_EMAIL, ADMIN_KEY and DEFAULT_ACCESS_KEYS used to be hardcoded
// here. They're now server-only (env + Firestore). Anything secret stays
// behind the /api/auth boundary.

export interface AppUser {
  id: string;
  email: string;
  name: string;
  language: string;
  createdAt: string;
  lastLogin: string;
  accessKey?: string;
}

export interface AppShoppingItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
  checked: boolean;
}

export interface AppShoppingList {
  id: string;
  name: string;
  items: AppShoppingItem[];
  createdAt: string;
  updatedAt: string;
}

export interface AppBudget {
  income: number;
  fixedExpenses: { id: string; name: string; amount: number }[];
  variableExpenses: { id: string; name: string; amount: number }[];
  foodBudget: number;
}

export interface AppAccessKey {
  key: string;
  usedBy: string | null;
  usedAt: string | null;
  active: boolean;
}

interface AppState {
  user: AppUser | null;
  isAdmin: boolean;

  shoppingLists: AppShoppingList[];
  favorites: AppShoppingItem[];

  budget: AppBudget;

  language: Language;
  theme: 'light' | 'dark';

  allUsers: AppUser[];
  accessKeys: AppAccessKey[];

  /** Not persisted in localStorage — always reloaded from Firebase on login. */
  purchaseHistory: PurchaseHistoryEntry[];

  showTutorial: boolean;

  /** Last error message returned by /api/auth (for UI display). */
  authError: string | null;

  firebaseAvailable: boolean;
  firebaseInitialized: boolean;
}

interface AppActions {
  // Auth (all server-routed)
  login: (email: string, password: string) => Promise<boolean>;
  signup: (
    email: string,
    name: string,
    password: string,
    accessKey: string
  ) => Promise<boolean>;
  /** Kept for backwards compatibility — admin login flows through the same /api/auth route. */
  adminLogin: (email: string, code: string) => Promise<boolean>;
  setAuthError: (e: string | null) => void;
  logout: () => void;

  // Shopping Lists
  addList: (name: string) => void;
  deleteList: (listId: string) => void;
  addItem: (listId: string, item: AppShoppingItem) => void;
  removeItem: (listId: string, itemId: string) => void;
  toggleItem: (listId: string, itemId: string) => void;
  updateItem: (listId: string, itemId: string, updates: Partial<AppShoppingItem>) => void;

  // Favorites
  addFavorite: (item: AppShoppingItem) => void;
  removeFavorite: (itemId: string) => void;

  // Budget
  saveBudget: (budget: AppBudget) => void;

  // Settings
  setLanguage: (lang: Language) => void;
  setTheme: (theme: 'light' | 'dark') => void;

  // Admin
  loadAdminData: () => Promise<void>;
  createAccessKey: (key: string) => void;
  deleteUser: (userId: string) => Promise<void>;

  // Sync
  syncToFirebase: () => Promise<void>;
  syncFromFirebase: () => Promise<void>;
  initFirebase: () => Promise<void>;

  // Purchase history
  archiveList: (listId: string, store?: string) => Promise<boolean>;
  loadPurchaseHistory: () => Promise<void>;
  deleteHistoryEntry: (historyId: string) => Promise<void>;

  // Tutorial
  dismissTutorial: () => void;
}

interface AuthResponse {
  user?: AppUser;
  isAdmin?: boolean;
  accessKeys?: AccessKeyData[];
  error?: string;
}

async function callAuth(payload: Record<string, unknown>): Promise<AuthResponse> {
  try {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => ({}))) as AuthResponse;
    if (!res.ok) {
      return { error: data.error || 'Erreur de connexion' };
    }
    return data;
  } catch (e) {
    console.warn('[Store] /api/auth network error:', e);
    return { error: 'Erreur réseau' };
  }
}

export const useStore = create<AppState & AppActions>()(
  persist(
    (set, get) => ({
      // ----- Initial state -----
      user: null,
      isAdmin: false,
      shoppingLists: [],
      favorites: [],
      budget: {
        income: 0,
        fixedExpenses: [],
        variableExpenses: [],
        foodBudget: 0,
      },
      language: 'fr' as Language,
      theme: 'light' as const,
      allUsers: [],
      accessKeys: [],
      purchaseHistory: [],
      showTutorial: false,
      authError: null,
      firebaseAvailable: isFirebaseConfigured(),
      firebaseInitialized: false,

      setAuthError: (e) => set({ authError: e }),

      // ----- Firebase init -----
      initFirebase: async () => {
        if (!isFirebaseConfigured() || get().firebaseInitialized) return;
        try {
          const fbService = await import('./firebase-service');
          await fbService.initializeFirebase();
          set({ firebaseInitialized: true });

          const fbKeys = await fbService.getAccessKeys();
          if (fbKeys.length > 0) {
            set({ accessKeys: fbKeys as AppAccessKey[] });
          }
        } catch (e) {
          console.warn('[Store] Firebase init error:', e);
        }
      },

      // ----- Auth -----
      login: async (email, password) => {
        set({ authError: null });
        const data = await callAuth({ action: 'login', email, password });
        if (data.error || !data.user) {
          set({ authError: data.error ?? 'Identifiants invalides' });
          return false;
        }
        set({
          user: data.user,
          isAdmin: !!data.isAdmin,
          showTutorial: false,
          authError: null,
        });

        // Background data load (non-fatal if it fails)
        if (!data.isAdmin && isFirebaseConfigured()) {
          try {
            await get().syncFromFirebase();
            await get().loadPurchaseHistory();
          } catch (e) {
            console.warn('[Store] Post-login sync error:', e);
          }
        }
        return true;
      },

      signup: async (email, name, password, accessKey) => {
        set({ authError: null });
        const data = await callAuth({ action: 'signup', email, name, password, accessKey });
        if (data.error || !data.user) {
          set({ authError: data.error ?? 'Échec de la création du compte' });
          return false;
        }
        set({
          user: data.user,
          isAdmin: false,
          showTutorial: true,
          accessKeys: data.accessKeys
            ? (data.accessKeys as AppAccessKey[])
            : get().accessKeys,
          authError: null,
        });
        return true;
      },

      adminLogin: async (email, code) => {
        // Admin uses the same /api/auth route — code is the admin password.
        return get().login(email, code);
      },

      logout: () => {
        set({
          user: null,
          isAdmin: false,
          shoppingLists: [],
          favorites: [],
          budget: {
            income: 0,
            fixedExpenses: [],
            variableExpenses: [],
            foodBudget: 0,
          },
          purchaseHistory: [],
          showTutorial: false,
        });
      },

      // ----- Shopping list mutations -----
      addList: (name) => {
        const newList: AppShoppingList = {
          id: 'list_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
          name,
          items: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({ shoppingLists: [...state.shoppingLists, newList] }));
        get().syncToFirebase();
      },

      deleteList: (listId) => {
        set((state) => ({
          shoppingLists: state.shoppingLists.filter((l) => l.id !== listId),
        }));
        if (isFirebaseConfigured() && get().user) {
          import('./firebase-service')
            .then((fb) => fb.deleteShoppingList(get().user!.id, listId))
            .catch(console.error);
        }
      },

      addItem: (listId, item) => {
        set((state) => ({
          shoppingLists: state.shoppingLists.map((l) =>
            l.id === listId
              ? { ...l, items: [...l.items, item], updatedAt: new Date().toISOString() }
              : l
          ),
        }));
        get().syncToFirebase();
      },

      removeItem: (listId, itemId) => {
        set((state) => ({
          shoppingLists: state.shoppingLists.map((l) =>
            l.id === listId
              ? {
                  ...l,
                  items: l.items.filter((i) => i.id !== itemId),
                  updatedAt: new Date().toISOString(),
                }
              : l
          ),
        }));
        get().syncToFirebase();
      },

      toggleItem: (listId, itemId) => {
        set((state) => ({
          shoppingLists: state.shoppingLists.map((l) =>
            l.id === listId
              ? {
                  ...l,
                  items: l.items.map((i) =>
                    i.id === itemId ? { ...i, checked: !i.checked } : i
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : l
          ),
        }));
        get().syncToFirebase();
      },

      updateItem: (listId, itemId, updates) => {
        set((state) => ({
          shoppingLists: state.shoppingLists.map((l) =>
            l.id === listId
              ? {
                  ...l,
                  items: l.items.map((i) =>
                    i.id === itemId ? { ...i, ...updates } : i
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : l
          ),
        }));
        get().syncToFirebase();
      },

      // ----- Favorites -----
      addFavorite: (item) => {
        set((state) => ({ favorites: [...state.favorites, item] }));
        get().syncToFirebase();
      },
      removeFavorite: (itemId) => {
        set((state) => ({
          favorites: state.favorites.filter((i) => i.id !== itemId),
        }));
        get().syncToFirebase();
      },

      // ----- Budget -----
      saveBudget: (budget) => {
        set({ budget });
        get().syncToFirebase();
      },

      // ----- Settings -----
      setLanguage: (lang) => set({ language: lang }),
      setTheme: (theme) => {
        set({ theme });
        if (typeof document !== 'undefined') {
          document.documentElement.classList.toggle('dark', theme === 'dark');
        }
      },

      // ----- Admin -----
      loadAdminData: async () => {
        if (!get().isAdmin) return;

        if (!isFirebaseConfigured()) return;
        try {
          const fbService = await import('./firebase-service');
          const [fbUsers, fbKeys] = await Promise.all([
            fbService.getAllUsers(),
            fbService.getAccessKeys(),
          ]);
          set({
            allUsers: fbUsers as unknown as AppUser[],
            accessKeys: fbKeys.length > 0 ? (fbKeys as AppAccessKey[]) : get().accessKeys,
          });
          console.log('[Store] Admin data loaded:', fbUsers.length, 'users,', fbKeys.length, 'keys');
        } catch (e) {
          console.warn('[Store] Admin load error:', e);
        }
      },

      createAccessKey: (key) => {
        const newKey: AppAccessKey = { key, usedBy: null, usedAt: null, active: true };
        set((state) => ({ accessKeys: [...state.accessKeys, newKey] }));

        if (isFirebaseConfigured()) {
          import('./firebase-service')
            .then((fb) => fb.createAccessKey(key))
            .catch(console.error);
        }
      },

      deleteUser: async (userId) => {
        if (!isFirebaseConfigured()) return;
        try {
          const fbService = await import('./firebase-service');
          await fbService.deleteUser(userId);
          await get().loadAdminData();
        } catch (e) {
          console.warn('[Store] Delete user error:', e);
        }
      },

      // ----- Sync -----
      syncToFirebase: async () => {
        if (!isFirebaseConfigured() || !get().user || get().isAdmin) return;

        try {
          const fbService = await import('./firebase-service');
          const { user, shoppingLists, budget, favorites } = get();
          if (!user) return;

          for (const list of shoppingLists) {
            await fbService.saveShoppingList(user.id, list as ShoppingListData);
          }
          await fbService.saveBudget(user.id, budget as BudgetData);
          await fbService.saveFavorites(user.id, favorites as ShoppingItemData[]);
        } catch (e) {
          console.warn('[Store] Firebase sync error:', e);
        }
      },

      syncFromFirebase: async () => {
        if (!isFirebaseConfigured() || !get().user || get().isAdmin) return;

        try {
          const fbService = await import('./firebase-service');
          const { user } = get();
          if (!user) return;

          const [fbLists, fbBudget, fbFavorites] = await Promise.all([
            fbService.getShoppingLists(user.id),
            fbService.getBudget(user.id),
            fbService.getFavorites(user.id),
          ]);

          if (fbLists.length > 0) {
            set({ shoppingLists: fbLists as AppShoppingList[] });
          }
          if (fbBudget) set({ budget: fbBudget as AppBudget });
          if (fbFavorites.length > 0) {
            set({ favorites: fbFavorites as AppShoppingItem[] });
          }
        } catch (e) {
          console.warn('[Store] Firebase sync from error:', e);
        }
      },

      // ----- Purchase history -----
      archiveList: async (listId, store) => {
        const list = get().shoppingLists.find((l) => l.id === listId);
        const user = get().user;
        if (!list || !user) return false;
        if (!isFirebaseConfigured()) return false;

        try {
          const fbService = await import('./firebase-service');
          const entry = await fbService.archiveListToHistory(
            user.id,
            list as ShoppingListData,
            store
          );
          if (!entry) return false;

          // Remove the archived list locally and on Firebase
          set((state) => ({
            shoppingLists: state.shoppingLists.filter((l) => l.id !== listId),
            purchaseHistory: [entry, ...state.purchaseHistory],
          }));
          await fbService.deleteShoppingList(user.id, listId);
          return true;
        } catch (e) {
          console.warn('[Store] archiveList error:', e);
          return false;
        }
      },

      loadPurchaseHistory: async () => {
        if (!isFirebaseConfigured()) return;
        const user = get().user;
        if (!user || get().isAdmin) return;

        try {
          const fbService = await import('./firebase-service');
          const history = await fbService.getPurchaseHistory(user.id);
          set({ purchaseHistory: history });
        } catch (e) {
          console.warn('[Store] loadPurchaseHistory error:', e);
        }
      },

      deleteHistoryEntry: async (historyId) => {
        const user = get().user;
        if (!user) return;
        set((state) => ({
          purchaseHistory: state.purchaseHistory.filter((h) => h.id !== historyId),
        }));
        if (isFirebaseConfigured()) {
          try {
            const fbService = await import('./firebase-service');
            await fbService.deleteHistoryEntry(user.id, historyId);
          } catch (e) {
            console.warn('[Store] deleteHistoryEntry error:', e);
          }
        }
      },

      // ----- Tutorial -----
      dismissTutorial: () => set({ showTutorial: false }),
    }),
    {
      name: 'le-meilleur-panier-storage',
      partialize: (state) => ({
        user: state.user,
        isAdmin: state.isAdmin,
        shoppingLists: state.shoppingLists,
        favorites: state.favorites,
        budget: state.budget,
        language: state.language,
        theme: state.theme,
        accessKeys: state.accessKeys,
        showTutorial: state.showTutorial,
        // purchaseHistory deliberately NOT persisted — reloaded from Firebase
      }),
    }
  )
);
