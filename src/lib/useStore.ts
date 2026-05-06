'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Language } from './translations';
import { isFirebaseConfigured } from './firebase';
import type {
  UserData,
  ShoppingListData,
  ShoppingItemData,
  BudgetData,
  AccessKeyData,
} from './firebase-service';

// Default access keys
const DEFAULT_ACCESS_KEYS: AccessKeyData[] = [
  { key: 'RI8ZJB6BXB', usedBy: null, usedAt: null, active: true },
  { key: 'M9LHZOCN0P', usedBy: null, usedAt: null, active: true },
  { key: '11UHOUCF2L', usedBy: null, usedAt: null, active: true },
  { key: '4D7VKCXVYN', usedBy: null, usedAt: null, active: true },
  { key: 'AW1CT3XUVW', usedBy: null, usedAt: null, active: true },
];

// Admin credentials
const ADMIN_EMAIL = 'admin@gmail.com';
const ADMIN_KEY = 'B5DLLK3Y9F';

export interface AppUser {
  id: string;
  email: string;
  name: string;
  password?: string;
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
  // Auth
  user: AppUser | null;
  isAdmin: boolean;

  // Shopping
  shoppingLists: AppShoppingList[];
  favorites: AppShoppingItem[];

  // Budget
  budget: AppBudget;

  // Settings
  language: Language;
  theme: 'light' | 'dark';

  // Admin data
  allUsers: AppUser[];
  accessKeys: AppAccessKey[];

  // Tutorial
  showTutorial: boolean;

  // Firebase status
  firebaseAvailable: boolean;
  firebaseInitialized: boolean;
}

interface AppActions {
  // Auth
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, name: string, password: string, accessKey: string) => Promise<boolean>;
  adminLogin: (email: string, code: string) => boolean;
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

  // Tutorial
  dismissTutorial: () => void;
}

export const useStore = create<AppState & AppActions>()(
  persist(
    (set, get) => ({
      // Initial State
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
      accessKeys: DEFAULT_ACCESS_KEYS,
      showTutorial: false,
      firebaseAvailable: isFirebaseConfigured(),
      firebaseInitialized: false,

      // Initialize Firebase
      initFirebase: async () => {
        if (!isFirebaseConfigured() || get().firebaseInitialized) return;
        try {
          const fbService = await import('./firebase-service');
          await fbService.initializeFirebase();
          set({ firebaseInitialized: true });

          // Load access keys from Firebase
          const fbKeys = await fbService.getAccessKeys();
          if (fbKeys.length > 0) {
            set({ accessKeys: fbKeys as AppAccessKey[] });
          }
        } catch (e) {
          console.warn('[Store] Firebase init error:', e);
        }
      },

      // Auth Actions
      login: async (email: string, password: string) => {
        // Check admin login
        if (email === ADMIN_EMAIL && password === ADMIN_KEY) {
          const adminUser: AppUser = {
            id: 'admin',
            email: ADMIN_EMAIL,
            name: 'Admin',
            language: get().language,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
          };
          set({ user: adminUser, isAdmin: true, showTutorial: false });
          return true;
        }

        // Try Firebase first
        if (isFirebaseConfigured()) {
          try {
            const fbService = await import('./firebase-service');
            const fbUser = await fbService.getUserByEmail(email);
            if (fbUser) {
              // Verify the password matches
              if (fbUser.password !== password) {
                return false;
              }
              const appUser: AppUser = {
                id: fbUser.id,
                email: fbUser.email,
                name: fbUser.name,
                language: fbUser.language || 'fr',
                createdAt: fbUser.createdAt,
                lastLogin: new Date().toISOString(),
                accessKey: fbUser.accessKey,
              };

              // Update last login in Firebase
              await fbService.updateUserLastLogin(fbUser.id);

              // Load user data from Firebase
              set({ user: appUser, isAdmin: false });

              // Sync user data from Firebase
              const [fbLists, fbBudget, fbFavorites] = await Promise.all([
                fbService.getShoppingLists(fbUser.id),
                fbService.getBudget(fbUser.id),
                fbService.getFavorites(fbUser.id),
              ]);

              const updates: Partial<AppState> = {};
              if (fbLists.length > 0) {
                updates.shoppingLists = fbLists as AppShoppingList[];
              }
              if (fbBudget) {
                updates.budget = fbBudget as AppBudget;
              }
              if (fbFavorites.length > 0) {
                updates.favorites = fbFavorites as AppShoppingItem[];
              }
              if (Object.keys(updates).length > 0) {
                set(updates as any);
              }

              console.log('[Store] Login via Firebase successful:', email);
              return true;
            }
          } catch (e) {
            console.warn('[Store] Firebase login error, trying local:', e);
          }
        }

        // Fallback: check local users
        const storedUsers = getFromLocalStorage<AppUser[]>('lmp_users') || [];
        const foundUser = storedUsers.find((u) => u.email === email);

        if (foundUser) {
          const userKeys = getFromLocalStorage<{ email: string; key: string }[]>('lmp_user_keys') || [];
          const userKey = userKeys.find((uk) => uk.email === email);
          // For backwards compat: check password OR access key
          if (foundUser.password === password || (userKey && userKey.key === password)) {
            foundUser.lastLogin = new Date().toISOString();
            const updatedUsers = storedUsers.map((u) =>
              u.email === email ? foundUser : u
            );
            saveToLocalStorage('lmp_users', updatedUsers);
            set({ user: foundUser, isAdmin: false });
            return true;
          }
        }

        return false;
      },

      signup: async (email: string, name: string, password: string, accessKey: string) => {
        // Validate access key
        if (isFirebaseConfigured()) {
          try {
            const fbService = await import('./firebase-service');
            const keyValid = await fbService.validateAccessKey(accessKey);
            if (!keyValid) {
              return false;
            }

            // Check if user already exists in Firebase
            const existingUser = await fbService.getUserByEmail(email);
            if (existingUser) {
              return false;
            }

            // Create user in Firebase
            const fbUser = await fbService.createUser(email, name, password, accessKey);
            if (fbUser) {
              const appUser: AppUser = {
                id: fbUser.id,
                email: fbUser.email,
                name: fbUser.name,
                language: fbUser.language || get().language,
                createdAt: fbUser.createdAt,
                lastLogin: fbUser.lastLogin,
                accessKey: fbUser.accessKey,
              };

              // Reload keys from Firebase to reflect used state
              const fbKeys = await fbService.getAccessKeys();

              set({
                user: appUser,
                isAdmin: false,
                accessKeys: fbKeys.length > 0 ? (fbKeys as AppAccessKey[]) : get().accessKeys,
                showTutorial: true,
              });

              console.log('[Store] Signup via Firebase successful:', email);
              return true;
            }
          } catch (e) {
            console.warn('[Store] Firebase signup error, trying local:', e);
          }
        }

        // Fallback: local validation
        const keys = get().accessKeys;
        const validKey = keys.find((k) => k.key === accessKey && k.active && !k.usedBy);
        if (!validKey) {
          return false;
        }

        const storedUsers = getFromLocalStorage<AppUser[]>('lmp_users') || [];
        if (storedUsers.find((u) => u.email === email)) {
          return false;
        }

        const newUser: AppUser = {
          id: email.replace(/[^a-zA-Z0-9]/g, '_') + '_' + Date.now(),
          email,
          name,
          password,
          language: get().language,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          accessKey,
        };

        const updatedKeys = keys.map((k) =>
          k.key === accessKey
            ? { ...k, usedBy: newUser.id, usedAt: new Date().toISOString(), active: false }
            : k
        );

        storedUsers.push(newUser);
        saveToLocalStorage('lmp_users', storedUsers);

        const userKeys = getFromLocalStorage<{ email: string; key: string }[]>('lmp_user_keys') || [];
        userKeys.push({ email, key: accessKey });
        saveToLocalStorage('lmp_user_keys', userKeys);

        set({
          user: newUser,
          isAdmin: false,
          accessKeys: updatedKeys,
          showTutorial: true,
        });

        return true;
      },

      adminLogin: (email: string, code: string) => {
        if (email === ADMIN_EMAIL && code === ADMIN_KEY) {
          const adminUser: AppUser = {
            id: 'admin',
            email: ADMIN_EMAIL,
            name: 'Admin',
            language: get().language,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
          };
          set({ user: adminUser, isAdmin: true, showTutorial: false });
          return true;
        }
        return false;
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
          showTutorial: false,
        });
      },

      // Shopping List Actions
      addList: (name: string) => {
        const newList: AppShoppingList = {
          id: 'list_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
          name,
          items: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({
          shoppingLists: [...state.shoppingLists, newList],
        }));
        get().syncToFirebase();
      },

      deleteList: (listId: string) => {
        set((state) => ({
          shoppingLists: state.shoppingLists.filter((l) => l.id !== listId),
        }));
        // Also delete from Firebase
        if (isFirebaseConfigured() && get().user) {
          import('./firebase-service').then((fbService) => {
            fbService.deleteShoppingList(get().user!.id, listId);
          }).catch(console.error);
        }
      },

      addItem: (listId: string, item: AppShoppingItem) => {
        set((state) => ({
          shoppingLists: state.shoppingLists.map((l) =>
            l.id === listId
              ? { ...l, items: [...l.items, item], updatedAt: new Date().toISOString() }
              : l
          ),
        }));
        get().syncToFirebase();
      },

      removeItem: (listId: string, itemId: string) => {
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

      toggleItem: (listId: string, itemId: string) => {
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

      updateItem: (listId: string, itemId: string, updates: Partial<AppShoppingItem>) => {
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

      // Favorites Actions
      addFavorite: (item: AppShoppingItem) => {
        set((state) => ({
          favorites: [...state.favorites, item],
        }));
        get().syncToFirebase();
      },

      removeFavorite: (itemId: string) => {
        set((state) => ({
          favorites: state.favorites.filter((i) => i.id !== itemId),
        }));
        get().syncToFirebase();
      },

      // Budget Actions
      saveBudget: (budget: AppBudget) => {
        set({ budget });
        get().syncToFirebase();
      },

      // Settings Actions
      setLanguage: (lang: Language) => {
        set({ language: lang });
      },

      setTheme: (theme: 'light' | 'dark') => {
        set({ theme });
        if (typeof document !== 'undefined') {
          document.documentElement.classList.toggle('dark', theme === 'dark');
        }
      },

      // Admin Actions
      loadAdminData: async () => {
        if (!get().isAdmin) return;

        if (isFirebaseConfigured()) {
          try {
            const fbService = await import('./firebase-service');
            const [fbUsers, fbKeys] = await Promise.all([
              fbService.getAllUsers(),
              fbService.getAccessKeys(),
            ]);

            set({
              allUsers: fbUsers as AppUser[],
              accessKeys: fbKeys.length > 0 ? (fbKeys as AppAccessKey[]) : get().accessKeys,
            });

            console.log('[Store] Admin data loaded from Firebase:', fbUsers.length, 'users,', fbKeys.length, 'keys');
            return;
          } catch (e) {
            console.warn('[Store] Firebase admin load error, trying local:', e);
          }
        }

        // Fallback: load local users
        const localUsers = getFromLocalStorage<AppUser[]>('lmp_users') || [];
        set({ allUsers: localUsers });
      },

      createAccessKey: (key: string) => {
        const newKey: AppAccessKey = {
          key,
          usedBy: null,
          usedAt: null,
          active: true,
        };
        set((state) => ({
          accessKeys: [...state.accessKeys, newKey],
        }));

        // Sync to Firebase
        if (isFirebaseConfigured()) {
          import('./firebase-service').then((fbService) => {
            fbService.createAccessKey(key);
          }).catch(console.error);
        }
      },

      deleteUser: async (userId: string) => {
        // Delete from Firebase
        if (isFirebaseConfigured()) {
          try {
            const fbService = await import('./firebase-service');
            await fbService.deleteUser(userId);

            // Reload admin data
            await get().loadAdminData();
            return;
          } catch (e) {
            console.warn('[Store] Firebase delete user error:', e);
          }
        }

        // Fallback: delete locally
        const localUsers = getFromLocalStorage<AppUser[]>('lmp_users') || [];
        const updatedUsers = localUsers.filter((u) => u.id !== userId);
        saveToLocalStorage('lmp_users', updatedUsers);
        set({ allUsers: updatedUsers });
      },

      // Sync Actions
      syncToFirebase: async () => {
        if (!isFirebaseConfigured() || !get().user) return;

        try {
          const fbService = await import('./firebase-service');
          const { user, shoppingLists, budget, favorites } = get();
          if (!user) return;

          // Sync lists
          for (const list of shoppingLists) {
            await fbService.saveShoppingList(user.id, list as ShoppingListData);
          }

          // Sync budget
          await fbService.saveBudget(user.id, budget as BudgetData);

          // Sync favorites
          await fbService.saveFavorites(user.id, favorites as ShoppingItemData[]);
        } catch (e) {
          console.warn('[Store] Firebase sync error:', e);
        }
      },

      syncFromFirebase: async () => {
        if (!isFirebaseConfigured() || !get().user) return;

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
          if (fbBudget) {
            set({ budget: fbBudget as AppBudget });
          }
          if (fbFavorites.length > 0) {
            set({ favorites: fbFavorites as AppShoppingItem[] });
          }
        } catch (e) {
          console.warn('[Store] Firebase sync from error:', e);
        }
      },

      // Tutorial
      dismissTutorial: () => {
        set({ showTutorial: false });
      },
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
      }),
    }
  )
);

// Helpers for localStorage
function getFromLocalStorage<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch {
    return null;
  }
}

function saveToLocalStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Error saving to localStorage:', e);
  }
}
