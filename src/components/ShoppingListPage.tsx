'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/useStore';
import { t } from '@/lib/translations';
import BudgetPage from './BudgetPage';
import FavoritesPage from './FavoritesPage';
import PriceComparison from './PriceComparison';
import SettingsPage from './SettingsPage';
import AdminPanel from './AdminPanel';
import PurchaseHistory from './PurchaseHistory';
import ListPriceCompare from './ListPriceCompare';
import Celebration from './Celebration';
import StatsHeader from './StatsHeader';
import GoalsPage from './GoalsPage';
import SharedExpensesPage from './SharedExpensesPage';
import ReceiptScanner from './ReceiptScanner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  ShoppingCart,
  Plus,
  Trash2,
  Edit3,
  Check,
  ListPlus,
  Share2,
  ChevronLeft,
  Package,
  Menu,
  X,
  Sparkles,
} from 'lucide-react';

type NavPage = 'lists' | 'budget' | 'favorites' | 'compare' | 'history' | 'goals' | 'tricount' | 'settings' | 'admin';

const categories = [
  { key: 'catFruits', value: 'fruits' },
  { key: 'catMeat', value: 'meat' },
  { key: 'catDairy', value: 'dairy' },
  { key: 'catBakery', value: 'bakery' },
  { key: 'catBeverages', value: 'beverages' },
  { key: 'catFrozen', value: 'frozen' },
  { key: 'catSnacks', value: 'snacks' },
  { key: 'catHousehold', value: 'household' },
  { key: 'catHygiene', value: 'hygiene' },
  { key: 'catOther', value: 'other' },
];

export default function ShoppingListPage() {
  const {
    user,
    isAdmin,
    shoppingLists,
    language,
    addList,
    deleteList,
    addItem,
    removeItem,
    toggleItem,
    updateItem,
    logout,
    syncFromFirebase,
    archiveList,
  } = useStore();

  const [activePage, setActivePage] = useState<NavPage>('lists');
  const [openListId, setOpenListId] = useState<string | null>(null);
  const [newListName, setNewListName] = useState('');
  const [showNewListDialog, setShowNewListDialog] = useState(false);
  const [compareListId, setCompareListId] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState<{ show: boolean; message?: string }>({ show: false });
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('1');
  const [newItemCategory, setNewItemCategory] = useState('other');
  const [editingItem, setEditingItem] = useState<{ listId: string; itemId: string } | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editQuantity, setEditQuantity] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const openList = shoppingLists.find((l) => l.id === openListId);

  const handleCreateList = () => {
    if (!newListName.trim()) return;
    addList(newListName.trim());
    setNewListName('');
    setShowNewListDialog(false);
  };

  const handleAddItem = () => {
    if (!openListId || !newItemName.trim()) return;
    const item = {
      id: 'item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      name: newItemName.trim(),
      price: parseFloat(newItemPrice) || 0,
      quantity: parseInt(newItemQuantity) || 1,
      category: newItemCategory,
      checked: false,
    };
    addItem(openListId, item);
    setNewItemName('');
    setNewItemPrice('');
    setNewItemQuantity('1');
    setNewItemCategory('other');
  };

  const startEditItem = (listId: string, itemId: string) => {
    const list = shoppingLists.find((l) => l.id === listId);
    const item = list?.items.find((i) => i.id === itemId);
    if (!item) return;
    setEditingItem({ listId, itemId });
    setEditName(item.name);
    setEditPrice(item.price.toString());
    setEditQuantity(item.quantity.toString());
    setEditCategory(item.category);
  };

  const saveEditItem = () => {
    if (!editingItem) return;
    updateItem(editingItem.listId, editingItem.itemId, {
      name: editName,
      price: parseFloat(editPrice) || 0,
      quantity: parseInt(editQuantity) || 1,
      category: editCategory,
    });
    setEditingItem(null);
  };

  const shareList = async (listId: string) => {
    const list = shoppingLists.find((l) => l.id === listId);
    if (!list) return;
    const text = `🛒 ${list.name}\n${list.items
      .map((i) => `${i.checked ? '✅' : '⬜'} ${i.name} x${i.quantity} - €${i.price.toFixed(2)}`)
      .join('\n')}\n💰 ${t('total', language)}: €${list.items.reduce((s, i) => s + i.price * i.quantity, 0).toFixed(2)}`;
    if (navigator.share) {
      await navigator.share({ title: list.name, text });
    } else {
      await navigator.clipboard.writeText(text);
    }
  };

  const handleRefresh = async () => {
    await syncFromFirebase();
    window.location.reload();
  };

  const navItems: { key: NavPage; icon: React.ReactNode; label: string }[] = [
    { key: 'lists', icon: <ShoppingCart className="w-5 h-5" />, label: t('navLists', language) },
    { key: 'budget', icon: <span className="text-lg">💰</span>, label: t('navBudget', language) },
    { key: 'favorites', icon: <span className="text-lg">⭐</span>, label: t('navFavorites', language) },
    { key: 'compare', icon: <span className="text-lg">🔍</span>, label: t('navCompare', language) },
    { key: 'history', icon: <span className="text-lg">🕐</span>, label: t('navHistory', language) },
    { key: 'goals', icon: <span className="text-lg">🎯</span>, label: t('navGoals', language) },
    { key: 'tricount', icon: <span className="text-lg">👥</span>, label: t('navTricount', language) },
    { key: 'settings', icon: <span className="text-lg">⚙️</span>, label: t('navSettings', language) },
  ];

  if (isAdmin) {
    navItems.push({ key: 'admin', icon: <span className="text-lg">👨‍💼</span>, label: t('navAdmin', language) });
  }

  // Lazy load components
  const renderPage = () => {
    switch (activePage) {
      case 'budget':
        return <BudgetPage />;
      case 'favorites':
        return <FavoritesPage />;
      case 'compare':
        return <PriceComparison />;
      case 'history':
        return <PurchaseHistory />;
      case 'goals':
        return <GoalsPage />;
      case 'tricount':
        return <SharedExpensesPage />;
      case 'settings':
        return <SettingsPage />;
      case 'admin':
        return isAdmin ? <AdminPanel /> : null;
      default:
        return renderListsPage();
    }
  };

  const renderListsPage = () => {
    if (openList) {
      return renderListDetail();
    }

    const filteredLists = shoppingLists.filter((l) =>
      l.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div className="space-y-4">
        {/* Stats header */}
        <StatsHeader />

        {/* Search */}
        <div className="relative">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchItems', language)}
            className="pl-9 border-emerald-200/60 dark:border-emerald-800/40 focus-visible:ring-emerald-500/50 bg-white/60 dark:bg-gray-800/60 rounded-xl h-11 transition-all duration-300 focus:bg-white dark:focus:bg-gray-800"
          />
          <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
        </div>

        {/* Lists grid */}
        {filteredLists.length === 0 ? (
          <Card className="border-emerald-200/30 dark:border-emerald-800/30 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm rounded-2xl overflow-hidden">
            <CardContent className="py-16 text-center">
              <div className="relative inline-block mb-4">
                <div className="w-20 h-20 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center mx-auto">
                  <ShoppingCart className="w-10 h-10 text-emerald-300 dark:text-emerald-700" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-foreground/80">
                {t('noLists', language)}
              </h3>
              <p className="text-sm text-muted-foreground/70 mt-1 max-w-[250px] mx-auto">
                {t('noListsDesc', language)}
              </p>
              <Button
                onClick={() => setShowNewListDialog(true)}
                className="mt-5 gradient-emerald hover:opacity-90 text-white shadow-emerald rounded-xl h-11 px-6"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('newList', language)}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {filteredLists.map((list, index) => {
              const total = list.items.reduce((s, i) => s + i.price * i.quantity, 0);
              const checked = list.items.filter((i) => i.checked).length;
              const progress = list.items.length > 0 ? (checked / list.items.length) * 100 : 0;
              return (
                <motion.div
                  key={list.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card
                    className="cursor-pointer border-emerald-200/40 dark:border-emerald-800/30 hover:border-emerald-400/60 dark:hover:border-emerald-600/50 transition-all duration-300 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-xl overflow-hidden hover:shadow-lg hover:shadow-emerald-500/8 dark:hover:shadow-emerald-500/5 group"
                    onClick={() => setOpenListId(list.id)}
                  >
                    {/* Progress bar */}
                    <div className="h-1 w-full bg-emerald-100 dark:bg-emerald-950/50">
                      <motion.div 
                        className="h-full gradient-emerald rounded-r-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.8, delay: index * 0.05 + 0.2 }}
                      />
                    </div>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">{list.name}</h3>
                          <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                            <span>{list.items.length} {t('totalItems', language)}</span>
                            <span className="text-emerald-300 dark:text-emerald-700">·</span>
                            <span className="text-emerald-600 dark:text-emerald-500">{checked} {t('checkedItems', language)}</span>
                          </div>
                          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-2.5">
                            €{total.toFixed(2)}
                          </div>
                        </div>
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => shareList(list.id)}
                            className="h-8 w-8 text-muted-foreground/60 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all"
                          >
                            <Share2 className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground/60 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t('deleteList', language)}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t('deleteConfirm', language)}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t('cancel', language)}</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteList(list.id)}
                                  className="bg-red-500 hover:bg-red-600 text-white"
                                >
                                  {t('delete', language)}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderListDetail = () => {
    if (!openList) return null;
    const total = openList.items.reduce((s, i) => s + i.price * i.quantity, 0);
    const checked = openList.items.filter((i) => i.checked).length;

    const filteredItems = openList.items.filter((i) =>
      i.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div className="space-y-4">
        {/* Back button and header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => { setOpenListId(null); setSearchQuery(''); }}
            className="hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-xl transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold truncate">{openList.name}</h2>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{openList.items.length} {t('totalItems', language)}</span>
              <span className="text-emerald-300 dark:text-emerald-700">·</span>
              <span className="text-emerald-600 dark:text-emerald-500">{checked} {t('checkedItems', language)}</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCompareListId(openList.id)}
            className="text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-xl transition-all"
            title={t('comparePrices', language)}
          >
            <span className="text-lg">💰</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => shareList(openList.id)}
            className="text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-xl transition-all"
          >
            <Share2 className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowScanner(true)}
            className="text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-xl transition-all"
            title={t('scanReceipt', language)}
          >
            <span className="text-lg">📸</span>
          </Button>
        </div>

        {/* Search */}
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('searchItems', language)}
          className="border-emerald-200/60 dark:border-emerald-800/40 focus-visible:ring-emerald-500/50 bg-white/60 dark:bg-gray-800/60 rounded-xl h-11 transition-all duration-300 focus:bg-white dark:focus:bg-gray-800"
        />

        {/* Archive button — appears once every item is checked */}
        {openList.items.length > 0 && openList.items.every((i) => i.checked) && (
          <Button
            onClick={async () => {
              // Ask the user where they did the shopping so we can crowdsource
              // the prices into the trust engine.
              const store = window.prompt(
                t('whichStore', language) || 'Dans quel magasin as-tu fait ces courses ?',
                ''
              );
              if (store === null) return; // user cancelled
              const ok = await archiveList(openList.id, store.trim() || undefined);
              if (ok) {
                setCelebrate({ show: true, message: t('listCompleted', language) });
                setOpenListId(null);
                setSearchQuery('');
                setTimeout(() => setActivePage('history'), 1500);
              }
            }}
            className="gradient-emerald hover:opacity-90 text-white rounded-xl w-full shadow-emerald transition-all duration-300"
          >
            ✅ {t('archiveList', language)}
          </Button>
        )}

        {/* Add item form */}
        <Card className="border-emerald-200/40 dark:border-emerald-800/30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-xl overflow-hidden">
          <div className="h-0.5 w-full gradient-emerald opacity-50" />
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder={t('itemName', language)}
                    className="border-emerald-200/60 dark:border-emerald-800/40 focus-visible:ring-emerald-500/50 bg-white/50 dark:bg-gray-800/50 rounded-xl transition-all duration-300"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                  />
                </div>
                <div className="w-24">
                  <Input
                    type="number"
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value)}
                    placeholder={t('itemPrice', language)}
                    className="border-emerald-200/60 dark:border-emerald-800/40 focus-visible:ring-emerald-500/50 bg-white/50 dark:bg-gray-800/50 rounded-xl transition-all duration-300"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="w-20">
                  <Input
                    type="number"
                    value={newItemQuantity}
                    onChange={(e) => setNewItemQuantity(e.target.value)}
                    placeholder={t('itemQuantity', language)}
                    className="border-emerald-200/60 dark:border-emerald-800/40 focus-visible:ring-emerald-500/50 bg-white/50 dark:bg-gray-800/50 rounded-xl transition-all duration-300"
                    min="1"
                  />
                </div>
                <div className="flex-1">
                  <Select value={newItemCategory} onValueChange={setNewItemCategory}>
                    <SelectTrigger className="border-emerald-200/60 dark:border-emerald-800/40 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {t(cat.key, language)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleAddItem}
                  className="gradient-emerald hover:opacity-90 text-white shrink-0 rounded-xl shadow-emerald transition-all duration-300"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Items list */}
        {filteredItems.length > 0 && (
          <div className="space-y-2">
            <AnimatePresence>
              {filteredItems.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  layout
                >
                  <Card className={`border-emerald-200/30 dark:border-emerald-800/20 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-md hover:shadow-emerald-500/5 ${item.checked ? 'opacity-60 bg-emerald-50/30 dark:bg-emerald-950/10' : 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm'}`}>
                    <CardContent className="p-3">
                      {editingItem?.itemId === item.id ? (
                        /* Edit mode */
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <Input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="border-emerald-200/60 dark:border-emerald-800/40 focus-visible:ring-emerald-500/50 rounded-xl"
                            />
                            <Input
                              type="number"
                              value={editPrice}
                              onChange={(e) => setEditPrice(e.target.value)}
                              className="w-24 border-emerald-200/60 dark:border-emerald-800/40 focus-visible:ring-emerald-500/50 rounded-xl"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              value={editQuantity}
                              onChange={(e) => setEditQuantity(e.target.value)}
                              className="w-20 border-emerald-200/60 dark:border-emerald-800/40 focus-visible:ring-emerald-500/50 rounded-xl"
                            />
                            <Select value={editCategory} onValueChange={setEditCategory}>
                              <SelectTrigger className="flex-1 border-emerald-200/60 dark:border-emerald-800/40 rounded-xl">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {categories.map((cat) => (
                                  <SelectItem key={cat.value} value={cat.value}>
                                    {t(cat.key, language)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button onClick={saveEditItem} size="sm" className="gradient-emerald hover:opacity-90 text-white rounded-xl">
                              <Check className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        /* Display mode */
                        <div className="flex items-center gap-3">
                          <motion.div
                            key={item.checked ? 'checked' : 'unchecked'}
                            initial={item.checked ? { scale: 0.6 } : false}
                            animate={item.checked ? { scale: [0.6, 1.25, 1] } : { scale: 1 }}
                            transition={{ duration: 0.35, ease: 'easeOut' }}
                          >
                            <Checkbox
                              checked={item.checked}
                              onCheckedChange={() => toggleItem(openList.id, item.id)}
                              className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 transition-all"
                            />
                          </motion.div>
                          <div className="flex-1 min-w-0">
                            <div className={`font-medium text-sm transition-all duration-300 ${item.checked ? 'line-through text-muted-foreground' : ''}`}>
                              {item.name}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="secondary" className="text-xs bg-emerald-50/80 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 px-1.5 py-0 rounded-md border border-emerald-100/50 dark:border-emerald-800/30">
                                {t('cat' + item.category.charAt(0).toUpperCase() + item.category.slice(1), language)}
                              </Badge>
                              <span className="text-xs text-muted-foreground/70">
                                x{item.quantity}
                              </span>
                            </div>
                          </div>
                          <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                            €{(item.price * item.quantity).toFixed(2)}
                          </div>
                          <div className="flex gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => startEditItem(openList.id, item.id)}
                              className="h-7 w-7 text-muted-foreground/50 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition-all"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeItem(openList.id, item.id)}
                              className="h-7 w-7 text-muted-foreground/50 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Total */}
        {openList.items.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-emerald-200/50 dark:border-emerald-700/40 bg-gradient-to-r from-emerald-50/90 to-emerald-100/60 dark:from-emerald-950/40 dark:to-emerald-900/30 backdrop-blur-sm rounded-2xl overflow-hidden shadow-emerald">
              <div className="h-1 w-full gradient-emerald opacity-40" />
              <CardContent className="p-5">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-foreground/80">{t('total', language)}</span>
                  <span className="text-3xl font-extrabold text-gradient-emerald">
                    €{total.toFixed(2)}
                  </span>
                </div>
                {checked > 0 && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="flex-1 h-1.5 rounded-full bg-emerald-200/50 dark:bg-emerald-800/30 overflow-hidden">
                      <div 
                        className="h-full gradient-emerald rounded-full transition-all duration-500"
                        style={{ width: `${(checked / openList.items.length) * 100}%` }}
                      />
                    </div>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">{Math.round((checked / openList.items.length) * 100)}%</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    );
  };



  return (
    <div className="min-h-screen flex bg-gradient-to-br from-gray-50 via-white to-emerald-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-emerald-950/20">
      {/* Sidebar Overlay (mobile) */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 lg:z-auto h-screen w-64 glass-sidebar border-r border-emerald-200/30 dark:border-emerald-800/20 flex flex-col transform transition-transform duration-300 lg:transform-none shadow-xl lg:shadow-none ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Sidebar header */}
        <div className="p-4 border-b border-emerald-200/20 dark:border-emerald-800/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl gradient-emerald flex items-center justify-center shadow-emerald">
                <ShoppingCart className="w-4.5 h-4.5 text-white" />
              </div>
              <div>
                <span className="font-bold text-sm text-gradient-emerald">
                  Le Meilleur Panier
                </span>
                <div className="text-[10px] text-muted-foreground/60 font-medium">v2.0</div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-8 w-8 rounded-lg"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          {user && (
            <div className="mt-3 px-3 py-2 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100/50 dark:border-emerald-800/20">
              <div className="text-xs font-medium text-foreground/80 truncate">{user.name}</div>
              <div className="text-[10px] text-muted-foreground/60 truncate">{user.email}</div>
            </div>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item, index) => (
            <motion.button
              key={item.key}
              onClick={() => {
                setActivePage(item.key);
                setOpenListId(null);
                setSidebarOpen(false);
              }}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                activePage === item.key
                  ? 'bg-gradient-to-r from-emerald-50 to-emerald-100/60 dark:from-emerald-950/40 dark:to-emerald-900/20 text-emerald-700 dark:text-emerald-400 shadow-sm shadow-emerald-500/10 border border-emerald-200/40 dark:border-emerald-800/30'
                  : 'text-muted-foreground hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 hover:text-foreground border border-transparent'
              }`}
            >
              {item.icon}
              {item.label}
            </motion.button>
          ))}
        </nav>

        {/* Sidebar footer */}
        <div className="p-3 space-y-1 border-t border-emerald-200/20 dark:border-emerald-800/20">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 hover:text-foreground transition-all duration-300 border border-transparent hover:border-emerald-200/30 dark:hover:border-emerald-800/20"
          >
            <span className="text-lg">🔄</span>
            {t('navRefresh', language)}
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50/60 dark:hover:bg-red-950/30 hover:text-red-600 transition-all duration-300 border border-transparent hover:border-red-200/40 dark:hover:border-red-800/20"
          >
            <span className="text-lg">🚪</span>
            {t('navLogout', language)}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        {/* Top bar (mobile) */}
        <div className="sticky top-0 z-30 glass border-b border-emerald-200/20 dark:border-emerald-800/20 p-3 flex items-center gap-3 lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            className="hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-xl"
          >
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg gradient-emerald flex items-center justify-center">
              <ShoppingCart className="w-3.5 h-3.5 text-white" />
            </div>
            <h1 className="font-bold text-sm truncate">
              {navItems.find((n) => n.key === activePage)?.label || t('appName', language)}
            </h1>
          </div>
        </div>

        {/* Page content */}
        <div className="p-4 lg:p-6 max-w-4xl mx-auto">
          {/* Page title (desktop) */}
          <div className="hidden lg:flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">
              {navItems.find((n) => n.key === activePage)?.label || ''}
            </h1>
            {activePage === 'lists' && !openListId && (
              <Button
                onClick={() => setShowNewListDialog(true)}
                className="gradient-emerald hover:opacity-90 text-white shadow-emerald rounded-xl h-11 px-5 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/20"
              >
                <ListPlus className="w-4 h-4 mr-2" />
                {t('newList', language)}
              </Button>
            )}
          </div>

          {/* Mobile new list button */}
          {activePage === 'lists' && !openListId && (
            <div className="lg:hidden mb-4">
              <Button
                onClick={() => setShowNewListDialog(true)}
                className="w-full gradient-emerald hover:opacity-90 text-white shadow-emerald rounded-xl h-11 transition-all duration-300"
              >
                <ListPlus className="w-4 h-4 mr-2" />
                {t('newList', language)}
              </Button>
            </div>
          )}

          {renderPage()}
        </div>
      </main>

      {/* New List Dialog */}
      <Dialog open={showNewListDialog} onOpenChange={setShowNewListDialog}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListPlus className="w-5 h-5 text-emerald-500" />
              {t('newList', language)}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium">{t('listName', language)}</Label>
              <Input
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder={t('listName', language)}
                className="mt-1.5 border-emerald-200/60 dark:border-emerald-800/40 focus-visible:ring-emerald-500/50 rounded-xl h-11"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateList()}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewListDialog(false)} className="rounded-xl">
              {t('cancel', language)}
            </Button>
            <Button
              onClick={handleCreateList}
              className="gradient-emerald hover:opacity-90 text-white rounded-xl"
            >
              {t('createList', language)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Compare prices dialog */}
      <Dialog open={!!compareListId} onOpenChange={(open) => !open && setCompareListId(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">💰</span>
              {t('comparePrices', language)}
            </DialogTitle>
          </DialogHeader>
          {compareListId && (() => {
            const list = shoppingLists.find((l) => l.id === compareListId);
            return list ? <ListPriceCompare list={list} /> : null;
          })()}
        </DialogContent>
      </Dialog>

      <Celebration
        show={celebrate.show}
        message={celebrate.message}
        onDone={() => setCelebrate({ show: false })}
      />

      {/* Receipt Scanner */}
      {showScanner && openListId && (
        <ReceiptScanner
          open={showScanner}
          onClose={() => setShowScanner(false)}
          listId={openListId}
        />
      )}
    </div>
  );
}
