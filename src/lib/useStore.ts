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
  ProductData,
  GoalData,
  GoalLogData,
  GroupData,
  ExpenseData,
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

  /** Catalog of all products (admin-managed). */
  products: ProductData[];

  goals: GoalData[];
  goalLogs: GoalLogData[];

  groups: (GroupData & { expenses?: ExpenseData[] })[];

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

  // Product catalog
  loadProducts: () => Promise<void>;
  addProduct: (data: Omit<ProductData, 'id' | 'updatedAt'>) => Promise<boolean>;
  updateProductEntry: (id: string, updates: Partial<ProductData>) => Promise<void>;
  removeProduct: (id: string) => Promise<void>;

  // Goals
  addGoal: (title: string, frequency: 'daily' | 'weekly', targetValue: number, unit: string) => void;
  removeGoal: (goalId: string) => void;
  updateGoalLog: (date: string, goalId: string, value: number) => void;
  loadGoals: () => Promise<void>;

  // Tricount / Shared Expenses
  addGroup: (name: string) => void;
  removeGroup: (groupId: string) => void;
  addParticipant: (groupId: string, name: string) => void;
  removeParticipant: (groupId: string, name: string) => void;
  addExpense: (groupId: string, expense: Omit<ExpenseData, 'id' | 'createdAt'>) => void;
  removeExpense: (groupId: string, expenseId: string) => void;
  loadGroups: () => Promise<void>;

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
      products: [],
      goals: [],
      goalLogs: [],
      groups: [],
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
        if (isFirebaseConfigured()) {
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
          groups: [],
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
        if (!isFirebaseConfigured() || !get().user) return;

        try {
          const fbService = await import('./firebase-service');
          const { user, shoppingLists, budget, favorites } = get();
          if (!user) return;

          for (const list of shoppingLists) {
            await fbService.saveShoppingList(user.id, list as ShoppingListData);
          }
          await fbService.saveBudget(user.id, budget as BudgetData);
          await fbService.saveFavorites(user.id, favorites as ShoppingItemData[]);

          // Sync goals
          const { goals, groups } = get();
          for (const goal of goals) {
            await fbService.saveGoal(user.id, goal as GoalData);
          }

          // Sync groups
          for (const group of groups) {
            await fbService.saveGroup(user.id, group as GroupData);
          }
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

          const [fbLists, fbBudget, fbFavorites, fbGoals] = await Promise.all([
            fbService.getShoppingLists(user.id),
            fbService.getBudget(user.id),
            fbService.getFavorites(user.id),
            fbService.getGoals(user.id),
          ]);

          if (fbLists.length > 0) {
            set({ shoppingLists: fbLists as AppShoppingList[] });
          }
          if (fbBudget) set({ budget: fbBudget as AppBudget });
          if (fbFavorites.length > 0) {
            set({ favorites: fbFavorites as AppShoppingItem[] });
          }
          if (fbGoals.length > 0) {
            set({ goals: fbGoals });
          }

          // Load groups with expenses
          const fbGroups = await fbService.getGroups(user.id);
          if (fbGroups.length > 0) {
            const groupsWithExpenses = await Promise.all(
              fbGroups.map(async (g) => {
                const expenses = await fbService.getExpenses(user.id, g.id);
                return { ...g, expenses };
              })
            );
            set({ groups: groupsWithExpenses });
          }

          // Load goal logs
          const today = new Date();
          const thirtyDaysAgo = new Date(today);
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          const startDate = thirtyDaysAgo.toISOString().split('T')[0];
          const endDate = today.toISOString().split('T')[0];
          const goalLogs = await fbService.getGoalLogs(user.id, startDate, endDate);
          if (goalLogs.length > 0) {
            set({ goalLogs });
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
        if (!user) return;

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

      // ----- Product catalog -----
      loadProducts: async () => {
        if (!isFirebaseConfigured()) return;
        try {
          const fbService = await import('./firebase-service');
          const products = await fbService.getProducts();
          set({ products });
        } catch (e) {
          console.warn('[Store] loadProducts error:', e);
        }
      },

      addProduct: async (data) => {
        if (!isFirebaseConfigured()) return false;
        try {
          const fbService = await import('./firebase-service');
          const created = await fbService.createProduct(data);
          if (!created) return false;
          set((state) => ({ products: [...state.products, created] }));
          return true;
        } catch (e) {
          console.warn('[Store] addProduct error:', e);
          return false;
        }
      },

      updateProductEntry: async (id, updates) => {
        if (!isFirebaseConfigured()) return;
        try {
          const fbService = await import('./firebase-service');
          await fbService.updateProduct(id, updates);
          set((state) => ({
            products: state.products.map((p) =>
              p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
            ),
          }));
        } catch (e) {
          console.warn('[Store] updateProductEntry error:', e);
        }
      },

      removeProduct: async (id) => {
        if (!isFirebaseConfigured()) return;
        set((state) => ({ products: state.products.filter((p) => p.id !== id) }));
        try {
          const fbService = await import('./firebase-service');
          await fbService.deleteProduct(id);
        } catch (e) {
          console.warn('[Store] removeProduct error:', e);
        }
      },

      // ----- Goals -----
      addGoal: (title, frequency, targetValue, unit) => {
        const newGoal: GoalData = {
          id: 'goal_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
          title,
          frequency,
          targetValue,
          unit,
          createdAt: new Date().toISOString(),
        };
        console.log('[Store] addGoal called:', newGoal.title, newGoal.id);
        set((state) => ({ goals: [...state.goals, newGoal] }));
        // Save directly to Firebase instead of full sync
        if (isFirebaseConfigured() && get().user) {
          import('./firebase-service')
            .then((fb) => fb.saveGoal(get().user!.id, newGoal))
            .then(() => console.log('[Store] Goal saved to Firebase'))
            .catch((e) => console.error('[Store] Goal Firebase save error:', e));
        }
      },

      removeGoal: (goalId) => {
        set((state) => ({ goals: state.goals.filter((g) => g.id !== goalId) }));
        if (isFirebaseConfigured() && get().user) {
          import('./firebase-service')
            .then((fb) => fb.deleteGoal(get().user!.id, goalId))
            .catch(console.error);
        }
      },

      updateGoalLog: (date, goalId, value) => {
        set((state) => {
          const existing = state.goalLogs.find((l) => l.date === date);
          let newLogs: GoalLogData[];
          if (existing) {
            newLogs = state.goalLogs.map((l) =>
              l.date === date
                ? { ...l, logs: { ...l.logs, [goalId]: value } }
                : l
            );
          } else {
            newLogs = [...state.goalLogs, { date, logs: { [goalId]: value } }];
          }
          return { goalLogs: newLogs };
        });
        // Save to firebase
        if (isFirebaseConfigured() && get().user) {
          const logEntry = get().goalLogs.find((l) => l.date === date);
          if (logEntry) {
            import('./firebase-service')
              .then((fb) => fb.saveGoalLog(get().user!.id, date, logEntry.logs))
              .catch(console.error);
          }
        }
      },

      loadGoals: async () => {
        if (!isFirebaseConfigured()) return;
        const user = get().user;
        if (!user) return;

        try {
          const fbService = await import('./firebase-service');
          const fbGoals = await fbService.getGoals(user.id);

          // Load last 30 days of logs
          const today = new Date();
          const thirtyDaysAgo = new Date(today);
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          const startDate = thirtyDaysAgo.toISOString().split('T')[0];
          const endDate = today.toISOString().split('T')[0];

          const fbGoalLogs = await fbService.getGoalLogs(user.id, startDate, endDate);
          
          // Only overwrite if Firebase has data, otherwise keep local
          if (fbGoals.length > 0) {
            set({ goals: fbGoals });
          }
          if (fbGoalLogs.length > 0) {
            set({ goalLogs: fbGoalLogs });
          }
          console.log('[Store] loadGoals: Firebase has', fbGoals.length, 'goals,', fbGoalLogs.length, 'logs');
        } catch (e) {
          console.warn('[Store] loadGoals error:', e);
        }
      },

      // ----- Tricount / Shared Expenses -----
      addGroup: (name) => {
        const newGroup: GroupData = {
          id: 'grp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
          name,
          participants: [],
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ groups: [...state.groups, newGroup] }));
        get().syncToFirebase();
      },

      removeGroup: (groupId) => {
        set((state) => ({ groups: state.groups.filter((g) => g.id !== groupId) }));
        if (isFirebaseConfigured() && get().user) {
          import('./firebase-service')
            .then((fb) => fb.deleteGroup(get().user!.id, groupId))
            .catch(console.error);
        }
      },

      addParticipant: (groupId, name) => {
        set((state) => ({
          groups: state.groups.map((g) =>
            g.id === groupId
              ? { ...g, participants: [...g.participants, name] }
              : g
          ),
        }));
        get().syncToFirebase();
      },

      removeParticipant: (groupId, name) => {
        set((state) => ({
          groups: state.groups.map((g) =>
            g.id === groupId
              ? { ...g, participants: g.participants.filter((p) => p !== name) }
              : g
          ),
        }));
        get().syncToFirebase();
      },

      addExpense: (groupId, expenseData) => {
        const expense: ExpenseData = {
          ...expenseData,
          id: 'exp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          groups: state.groups.map((g) =>
            g.id === groupId
              ? { ...g, expenses: [...(g.expenses || []), expense] }
              : g
          ),
        }));
        if (isFirebaseConfigured() && get().user) {
          import('./firebase-service')
            .then((fb) => fb.saveExpense(get().user!.id, groupId, expense))
            .catch(console.error);
        }
      },

      removeExpense: (groupId, expenseId) => {
        set((state) => ({
          groups: state.groups.map((g) =>
            g.id === groupId
              ? { ...g, expenses: (g.expenses || []).filter((e) => e.id !== expenseId) }
              : g
          ),
        }));
        if (isFirebaseConfigured() && get().user) {
          import('./firebase-service')
            .then((fb) => fb.deleteExpense(get().user!.id, groupId, expenseId))
            .catch(console.error);
        }
      },

      loadGroups: async () => {
        if (!isFirebaseConfigured()) return;
        const user = get().user;
        if (!user) return;

        try {
          const fbService = await import('./firebase-service');
          const groups = await fbService.getGroups(user.id);
          // Load expenses for each group
          const groupsWithExpenses = await Promise.all(
            groups.map(async (g) => {
              const expenses = await fbService.getExpenses(user.id, g.id);
              return { ...g, expenses };
            })
          );
          set({ groups: groupsWithExpenses });
        } catch (e) {
          console.warn('[Store] loadGroups error:', e);
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
        goals: state.goals,
        goalLogs: state.goalLogs,
        groups: state.groups,
        showTutorial: state.showTutorial,
        // purchaseHistory deliberately NOT persisted — reloaded from Firebase
      }),
    }
  )
);
