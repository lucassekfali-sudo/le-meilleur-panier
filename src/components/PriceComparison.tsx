'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/useStore';
import { t } from '@/lib/translations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, ShoppingCart, Loader2, BarChart3, Plus } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  brand: string;
  image_url: string;
  price: number | null;
  stores: string[];
  categories: string;
}

export default function PriceComparison() {
  const { language, shoppingLists, addItem } = useStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedList, setSelectedList] = useState('');
  const [addingProduct, setAddingProduct] = useState<string | null>(null);

  const searchProducts = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);

    try {
      const response = await fetch(
        `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=1&page_size=20`
      );
      const data = await response.json();

      if (data.products) {
        const mapped: Product[] = data.products
          .filter((p: Record<string, unknown>) => p.product_name)
          .map((p: Record<string, unknown>) => ({
            id: (p._id || p.code || '') as string,
            name: (p.product_name || '') as string,
            brand: (p.brands || '') as string,
            image_url: (p.image_url || p.image_front_url || '') as string,
            price: null,
            stores: ((p.stores || '') as string).split(',').filter(Boolean),
            categories: (p.categories || '') as string,
          }));
        setResults(mapped);
      }
    } catch (error) {
      console.error('Error searching products:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const addToShoppingList = (product: Product) => {
    if (!selectedList) return;
    const item = {
      id: 'item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      name: product.name,
      price: product.price || 0,
      quantity: 1,
      category: 'other',
      checked: false,
    };
    addItem(selectedList, item);
    setAddingProduct(null);
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <Card className="border-emerald-200/50 dark:border-emerald-800/50">
        <CardContent className="p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('searchProduct', language)}
                className="pl-9 border-emerald-200 dark:border-emerald-800 focus-visible:ring-emerald-500"
                onKeyDown={(e) => e.key === 'Enter' && searchProducts()}
              />
            </div>
            <Button
              onClick={searchProducts}
              disabled={loading}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* List selector */}
          {shoppingLists.length > 0 && (
            <div className="mt-3">
              <Select value={selectedList} onValueChange={setSelectedList}>
                <SelectTrigger className="border-emerald-200 dark:border-emerald-800">
                  <SelectValue placeholder={t('addToList', language)} />
                </SelectTrigger>
                <SelectContent>
                  {shoppingLists.map((list) => (
                    <SelectItem key={list.id} value={list.id}>
                      <div className="flex items-center gap-2">
                        <ShoppingCart className="w-3 h-3" />
                        {list.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {loading && (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground">{t('searching', language)}</p>
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <Card className="border-emerald-200/50 dark:border-emerald-800/50">
          <CardContent className="py-12 text-center">
            <BarChart3 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-muted-foreground">
              {t('noResults', language)}
            </h3>
          </CardContent>
        </Card>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            {t('results', language)} ({results.length})
          </h3>
          {results.map((product) => (
            <Card key={product.id} className="border-emerald-200/50 dark:border-emerald-800/50">
              <CardContent className="p-4">
                <div className="flex gap-3">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-16 h-16 object-contain rounded-lg bg-gray-50 dark:bg-gray-800 shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center shrink-0">
                      <ShoppingCart className="w-6 h-6 text-emerald-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{product.name}</h4>
                    {product.brand && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t('brand', language)}: {product.brand}
                      </p>
                    )}
                    {product.stores.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t('store', language)}: {product.stores.slice(0, 3).join(', ')}
                      </p>
                    )}
                    {product.categories && (
                      <p className="text-xs text-muted-foreground/60 mt-0.5 truncate">
                        {product.categories.split(',').slice(0, 2).join(', ')}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0">
                    {selectedList ? (
                      <Button
                        size="sm"
                        onClick={() => addToShoppingList(product)}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setAddingProduct(addingProduct === product.id ? null : product.id)}
                        className="border-emerald-200 dark:border-emerald-800"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
