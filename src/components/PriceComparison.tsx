'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useStore } from '@/lib/useStore';
import { t } from '@/lib/translations';
import { effectivePrice, type ProductData } from '@/lib/firebase-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { getCountry } from '@/lib/countries';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Plus,
  Sparkles,
  AlertCircle,
  Image as ImageIcon,
} from 'lucide-react';

function matchesItem(itemName: string, productName: string): boolean {
  const words = itemName.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const product = productName.toLowerCase();
  return words.length > 0 && words.every((w) => product.includes(w));
}

export default function PriceComparison() {
  const { language, products, loadProducts, shoppingLists, addItem, addList } = useStore();
  const [singleQuery, setSingleQuery] = useState('');
  const [addToListProduct, setAddToListProduct] = useState<ProductData | null>(null);
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [newListName, setNewListName] = useState('');
  const [creatingList, setCreatingList] = useState(false);

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fmt = (n: number) => {
    const user = useStore.getState().user;
    const c = getCountry(user?.country);
    return new Intl.NumberFormat(c.locale, {
      style: 'currency',
      currency: c.currency,
      minimumFractionDigits: 2,
    }).format(n);
  };

  const itemResults = useMemo(() => {
    const q = singleQuery.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter((p) => matchesItem(q, p.name))
      .map((p) => ({ p, ep: effectivePrice(p), promo: effectivePrice(p) < p.regularPrice }))
      .sort((a, b) => a.ep - b.ep);
  }, [products, singleQuery]);

  const handleConfirmAddToList = () => {
    if (!addToListProduct) return;

    let listId = selectedListId;
    // If user wants to create a new list
    if (creatingList && newListName.trim()) {
      addList(newListName.trim());
      // Find the new list ID. addList creates with timestamp ID — we need to grab it
      // by re-reading state right after. We'll use a small timeout-based approach.
      setTimeout(() => {
        const lists = useStore.getState().shoppingLists;
        const newList = lists[lists.length - 1];
        if (newList) {
          addItem(newList.id, {
            id: 'item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
            name: addToListProduct.name,
            price: effectivePrice(addToListProduct),
            quantity: 1,
            category: addToListProduct.category || 'other',
            checked: false,
          });
        }
        setAddToListProduct(null);
        setNewListName('');
        setCreatingList(false);
      }, 50);
      return;
    }

    if (!listId) return;
    addItem(listId, {
      id: 'item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      name: addToListProduct.name,
      price: effectivePrice(addToListProduct),
      quantity: 1,
      category: addToListProduct.category || 'other',
      checked: false,
    });
    setAddToListProduct(null);
    setSelectedListId('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Search className="w-6 h-6 text-emerald-600" />
        <h2 className="text-xl font-bold">{t('searchProductTitle', language)}</h2>
      </div>

      {products.length === 0 ? (
        <Card className="border-amber-300/40 bg-amber-50/40 dark:bg-amber-950/20 rounded-xl">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <div className="font-semibold">{t('noProducts', language)}</div>
              <div className="text-sm text-muted-foreground">{t('noProductsDesc', language)}</div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Search input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={singleQuery}
              onChange={(e) => setSingleQuery(e.target.value)}
              placeholder={t('searchProductPlaceholder', language)}
              className="pl-9 h-12 rounded-xl border-emerald-200/60 dark:border-emerald-800/40 bg-white/60 dark:bg-gray-800/60"
              autoFocus
            />
          </div>

          {/* Empty state when no query */}
          {!singleQuery.trim() && (
            <Card className="border-emerald-200/40 dark:border-emerald-800/30 bg-emerald-50/30 dark:bg-emerald-950/10 rounded-xl">
              <CardContent className="p-6 text-center text-muted-foreground">
                {t('searchProductHint', language)}
              </CardContent>
            </Card>
          )}

          {/* No results */}
          {singleQuery.trim() && itemResults.length === 0 && (
            <Card className="border-emerald-200/40 dark:border-emerald-800/30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-xl">
              <CardContent className="p-6 text-center text-muted-foreground">
                {t('noResults', language)}
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {itemResults.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                {itemResults.length} {t('results', language)} — {t('sortedByPrice', language)}
              </div>
              {itemResults.map((r, idx) => (
                <Card
                  key={r.p.id}
                  className={`border-emerald-200/40 dark:border-emerald-800/30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-xl overflow-hidden ${
                    idx === 0 ? 'ring-2 ring-emerald-400/50' : ''
                  }`}
                >
                  <CardContent className="p-3 flex items-center gap-3">
                    {r.p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.p.imageUrl} alt={r.p.name} className="w-14 h-14 object-cover rounded-lg" />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <ImageIcon className="w-5 h-5 text-emerald-600/50" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{r.p.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {r.p.brand && <span>{r.p.brand} · </span>}
                        <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30">{r.p.store}</span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        {r.promo ? (
                          <>
                            <span className="text-base font-bold text-rose-600 dark:text-rose-400 tabular-nums">{fmt(r.ep)}</span>
                            <span className="text-xs line-through text-muted-foreground tabular-nums">{fmt(r.p.regularPrice)}</span>
                          </>
                        ) : (
                          <span className="text-base font-bold tabular-nums">{fmt(r.ep)}</span>
                        )}
                        {idx === 0 && (
                          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            {t('cheapest', language)}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => { setAddToListProduct(r.p); setSelectedListId(shoppingLists[0]?.id || ''); }}
                      className="gradient-emerald text-white rounded-xl shrink-0"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      {t('addToList', language)}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Add-to-list dialog */}
      <Dialog open={!!addToListProduct} onOpenChange={(open) => !open && setAddToListProduct(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>{t('addToList', language)}</DialogTitle>
          </DialogHeader>
          {addToListProduct && (
            <div className="space-y-3">
              <div className="text-sm">
                <strong>{addToListProduct.name}</strong>
                {addToListProduct.brand && <span className="text-muted-foreground"> · {addToListProduct.brand}</span>}
                <div className="text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                  {fmt(effectivePrice(addToListProduct))} @ {addToListProduct.store}
                </div>
              </div>

              {!creatingList ? (
                <>
                  <div>
                    <label className="text-sm font-medium block mb-1.5">{t('chooseList', language)}</label>
                    <Select value={selectedListId} onValueChange={setSelectedListId}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder={t('selectAList', language)} />
                      </SelectTrigger>
                      <SelectContent>
                        {shoppingLists.map((l) => (
                          <SelectItem key={l.id} value={l.id}>
                            {l.name} ({l.items.length} {t('totalItems', language)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <button
                    onClick={() => setCreatingList(true)}
                    className="text-sm text-emerald-600 hover:underline"
                  >
                    + {t('orCreateNewList', language)}
                  </button>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-sm font-medium block mb-1.5">{t('newListName', language)}</label>
                    <Input
                      value={newListName}
                      onChange={(e) => setNewListName(e.target.value)}
                      placeholder={t('listName', language)}
                      className="rounded-xl"
                      autoFocus
                    />
                  </div>
                  <button
                    onClick={() => setCreatingList(false)}
                    className="text-sm text-muted-foreground hover:underline"
                  >
                    ← {t('orPickExistingList', language)}
                  </button>
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddToListProduct(null); setCreatingList(false); setNewListName(''); }} className="rounded-xl">
              {t('cancel', language)}
            </Button>
            <Button
              onClick={handleConfirmAddToList}
              disabled={creatingList ? !newListName.trim() : !selectedListId}
              className="gradient-emerald text-white rounded-xl"
            >
              {t('addToList', language)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
