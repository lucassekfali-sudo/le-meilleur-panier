'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/useStore';
import { t } from '@/lib/translations';
import type { ProductData } from '@/lib/firebase-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
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
import { Plus, Trash2, Pencil, Save, X, Image as ImageIcon, Search } from 'lucide-react';

type Draft = Omit<ProductData, 'id' | 'updatedAt'>;

const emptyDraft: Draft = {
  name: '',
  brand: '',
  category: '',
  store: '',
  regularPrice: 0,
  promoPrice: undefined,
  promoEndDate: '',
  imageUrl: '',
  notes: '',
};

export default function AdminProductsTable() {
  const { language, products, loadProducts, addProduct, updateProductEntry, removeProduct } = useStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(emptyDraft);
  const [showNewRow, setShowNewRow] = useState(false);
  const [newDraft, setNewDraft] = useState<Draft>(emptyDraft);
  const [search, setSearch] = useState('');
  const [filterStore, setFilterStore] = useState<string>('');

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stores = useMemo(() => {
    const s = new Set<string>();
    products.forEach((p) => p.store && s.add(p.store));
    return Array.from(s).sort();
  }, [products]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products
      .filter((p) => !filterStore || p.store === filterStore)
      .filter(
        (p) =>
          !q ||
          p.name.toLowerCase().includes(q) ||
          (p.brand || '').toLowerCase().includes(q) ||
          p.store.toLowerCase().includes(q)
      )
      .sort((a, b) => a.name.localeCompare(b.name) || a.store.localeCompare(b.store));
  }, [products, search, filterStore]);

  const startEdit = (p: ProductData) => {
    setEditingId(p.id);
    setEditDraft({
      name: p.name,
      brand: p.brand || '',
      category: p.category || '',
      store: p.store,
      regularPrice: p.regularPrice,
      promoPrice: p.promoPrice,
      promoEndDate: p.promoEndDate || '',
      imageUrl: p.imageUrl || '',
      notes: p.notes || '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(emptyDraft);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    if (!editDraft.name.trim() || !editDraft.store.trim()) return;
    const cleaned: Partial<ProductData> = {
      name: editDraft.name.trim(),
      brand: editDraft.brand?.trim() || '',
      category: editDraft.category?.trim() || '',
      store: editDraft.store.trim(),
      regularPrice: Number(editDraft.regularPrice) || 0,
      promoPrice:
        editDraft.promoPrice != null && !Number.isNaN(Number(editDraft.promoPrice))
          ? Number(editDraft.promoPrice)
          : undefined,
      promoEndDate: editDraft.promoEndDate || '',
      imageUrl: editDraft.imageUrl?.trim() || '',
      notes: editDraft.notes?.trim() || '',
    };
    await updateProductEntry(editingId, cleaned);
    cancelEdit();
  };

  const handleAdd = async () => {
    if (!newDraft.name.trim() || !newDraft.store.trim()) return;
    const cleaned: Draft = {
      name: newDraft.name.trim(),
      brand: newDraft.brand?.trim() || '',
      category: newDraft.category?.trim() || '',
      store: newDraft.store.trim(),
      regularPrice: Number(newDraft.regularPrice) || 0,
      promoPrice:
        newDraft.promoPrice != null && !Number.isNaN(Number(newDraft.promoPrice))
          ? Number(newDraft.promoPrice)
          : undefined,
      promoEndDate: newDraft.promoEndDate || '',
      imageUrl: newDraft.imageUrl?.trim() || '',
      notes: newDraft.notes?.trim() || '',
    };
    const ok = await addProduct(cleaned);
    if (ok) {
      setNewDraft(emptyDraft);
      setShowNewRow(false);
    }
  };

  const fmt = (n: number) =>
    n.toLocaleString(language === 'en' ? 'en-US' : language === 'es' ? 'es-ES' : 'fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <span className="text-2xl">🏷️</span>
          {t('manageProducts', language)}
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{products.length} {t('products', language)}</span>
          <Button
            onClick={() => { setShowNewRow(true); setNewDraft(emptyDraft); }}
            className="gradient-emerald text-white rounded-xl"
          >
            <Plus className="w-4 h-4 mr-1" />
            {t('addProduct', language)}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchProduct', language)}
            className="pl-9 rounded-xl border-emerald-200/60 dark:border-emerald-800/40"
          />
        </div>
        <select
          value={filterStore}
          onChange={(e) => setFilterStore(e.target.value)}
          className="h-10 px-3 rounded-xl border border-emerald-200/60 dark:border-emerald-800/40 bg-white/60 dark:bg-gray-800/60 text-sm"
        >
          <option value="">{t('allStores', language)}</option>
          {stores.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* New row form */}
      <AnimatePresence>
        {showNewRow && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="border-emerald-300/50 dark:border-emerald-700/40 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-xl">
              <CardContent className="p-4 space-y-3">
                <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                  {t('addProduct', language)}
                </div>
                <ProductFormRow draft={newDraft} setDraft={setNewDraft} language={language} />
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowNewRow(false)} className="rounded-xl">
                    <X className="w-4 h-4 mr-1" /> {t('cancel', language)}
                  </Button>
                  <Button onClick={handleAdd} className="gradient-emerald text-white rounded-xl">
                    <Save className="w-4 h-4 mr-1" /> {t('save', language)}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Products table */}
      <Card className="border-emerald-200/40 dark:border-emerald-800/30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-emerald-50/60 dark:bg-emerald-950/30 text-left">
              <tr>
                <th className="p-2 font-medium">{t('image', language)}</th>
                <th className="p-2 font-medium">{t('productName', language)}</th>
                <th className="p-2 font-medium">{t('brand', language)}</th>
                <th className="p-2 font-medium">{t('store', language)}</th>
                <th className="p-2 font-medium text-right">{t('regularPrice', language)}</th>
                <th className="p-2 font-medium text-right">{t('promoPrice', language)}</th>
                <th className="p-2 font-medium">{t('promoEndDate', language)}</th>
                <th className="p-2 font-medium text-right w-24">{t('actions', language)}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-muted-foreground">
                    {products.length === 0 ? t('noProducts', language) : t('noResults', language)}
                  </td>
                </tr>
              )}
              {filtered.map((p) => {
                const isEdit = editingId === p.id;
                if (isEdit) {
                  return (
                    <tr key={p.id} className="bg-emerald-50/40 dark:bg-emerald-950/20 border-b border-emerald-200/30 dark:border-emerald-800/20">
                      <td colSpan={8} className="p-4">
                        <ProductFormRow draft={editDraft} setDraft={setEditDraft} language={language} />
                        <div className="flex gap-2 justify-end mt-3">
                          <Button variant="outline" onClick={cancelEdit} className="rounded-xl" size="sm">
                            <X className="w-4 h-4 mr-1" /> {t('cancel', language)}
                          </Button>
                          <Button onClick={saveEdit} className="gradient-emerald text-white rounded-xl" size="sm">
                            <Save className="w-4 h-4 mr-1" /> {t('save', language)}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr key={p.id} className="border-b border-emerald-100/50 dark:border-emerald-900/20 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/10 transition-colors">
                    <td className="p-2">
                      {p.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.imageUrl} alt={p.name} className="w-10 h-10 object-cover rounded-md" />
                      ) : (
                        <div className="w-10 h-10 rounded-md bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-muted-foreground">
                          <ImageIcon className="w-4 h-4" />
                        </div>
                      )}
                    </td>
                    <td className="p-2 font-medium">{p.name}</td>
                    <td className="p-2 text-muted-foreground">{p.brand || '-'}</td>
                    <td className="p-2">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/30 text-xs">
                        {p.store}
                      </span>
                    </td>
                    <td className="p-2 text-right tabular-nums">{fmt(p.regularPrice)}</td>
                    <td className="p-2 text-right tabular-nums">
                      {p.promoPrice != null ? (
                        <span className="text-rose-600 dark:text-rose-400 font-semibold">{fmt(p.promoPrice)}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-2 text-xs text-muted-foreground">
                      {p.promoEndDate ? new Date(p.promoEndDate).toLocaleDateString(language) : '-'}
                    </td>
                    <td className="p-2">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" onClick={() => startEdit(p)} className="h-8 w-8 rounded-lg">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-red-600 hover:text-red-700">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t('deleteProductTitle', language)}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t('deleteProductDesc', language)} <strong>{p.name}</strong> @ {p.store}.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t('cancel', language)}</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => removeProduct(p.id)}
                                className="bg-red-600 hover:bg-red-700 text-white"
                              >
                                {t('delete', language)}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

interface ProductFormRowProps {
  draft: Draft;
  setDraft: (d: Draft) => void;
  language: string;
}

function ProductFormRow({ draft, setDraft, language }: ProductFormRowProps) {
  const update = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft({ ...draft, [key]: value });

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      <Input
        value={draft.name}
        onChange={(e) => update('name', e.target.value)}
        placeholder={t('productName', language)}
        className="rounded-xl"
      />
      <Input
        value={draft.brand || ''}
        onChange={(e) => update('brand', e.target.value)}
        placeholder={t('brand', language)}
        className="rounded-xl"
      />
      <Input
        value={draft.store}
        onChange={(e) => update('store', e.target.value)}
        placeholder={t('store', language)}
        className="rounded-xl"
      />
      <Input
        value={draft.category || ''}
        onChange={(e) => update('category', e.target.value)}
        placeholder={t('itemCategory', language)}
        className="rounded-xl"
      />
      <Input
        type="number"
        step="0.01"
        value={draft.regularPrice}
        onChange={(e) => update('regularPrice', parseFloat(e.target.value) || 0)}
        placeholder={t('regularPrice', language)}
        className="rounded-xl"
      />
      <Input
        type="number"
        step="0.01"
        value={draft.promoPrice ?? ''}
        onChange={(e) => update('promoPrice', e.target.value ? parseFloat(e.target.value) : undefined)}
        placeholder={t('promoPrice', language)}
        className="rounded-xl"
      />
      <Input
        type="date"
        value={draft.promoEndDate || ''}
        onChange={(e) => update('promoEndDate', e.target.value)}
        placeholder={t('promoEndDate', language)}
        className="rounded-xl"
      />
      <Input
        value={draft.imageUrl || ''}
        onChange={(e) => update('imageUrl', e.target.value)}
        placeholder={t('imageUrl', language)}
        className="rounded-xl col-span-2 md:col-span-1"
      />
    </div>
  );
}
