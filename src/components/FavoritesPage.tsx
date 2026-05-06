'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/useStore';
import { t } from '@/lib/translations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Star, Trash2, Plus, ShoppingCart } from 'lucide-react';

export default function FavoritesPage() {
  const { favorites, addFavorite, removeFavorite, shoppingLists, addItem, language } = useStore();
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCategory, setNewCategory] = useState('other');
  const [addingToList, setAddingToList] = useState<string | null>(null);
  const [selectedList, setSelectedList] = useState('');

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

  const addNewFavorite = () => {
    if (!newName.trim()) return;
    const item = {
      id: 'fav_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      name: newName.trim(),
      price: parseFloat(newPrice) || 0,
      quantity: 1,
      category: newCategory,
      checked: false,
    };
    addFavorite(item);
    setNewName('');
    setNewPrice('');
    setNewCategory('other');
  };

  const addFavToList = (favId: string, listId: string) => {
    const fav = favorites.find((f) => f.id === favId);
    if (!fav) return;
    const item = {
      ...fav,
      id: 'item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    };
    addItem(listId, item);
    setAddingToList(null);
    setSelectedList('');
  };

  return (
    <div className="space-y-6">
      {/* Add favorite form */}
      <Card className="border-emerald-200/50 dark:border-emerald-800/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Star className="w-5 h-5 text-emerald-500" />
            {t('addFavorite', language)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium">{t('itemName', language)}</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t('itemName', language)}
                className="mt-1.5 border-emerald-200 dark:border-emerald-800 focus-visible:ring-emerald-500"
                onKeyDown={(e) => e.key === 'Enter' && addNewFavorite()}
              />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <Label className="text-sm font-medium">{t('itemPrice', language)}</Label>
                <Input
                  type="number"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  placeholder="0.00"
                  className="mt-1.5 border-emerald-200 dark:border-emerald-800 focus-visible:ring-emerald-500"
                />
              </div>
              <div className="flex-1">
                <Label className="text-sm font-medium">{t('itemCategory', language)}</Label>
                <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger className="mt-1.5 border-emerald-200 dark:border-emerald-800">
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
            </div>
            <Button
              onClick={addNewFavorite}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('addFavorite', language)}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Favorites list */}
      {favorites.length === 0 ? (
        <Card className="border-emerald-200/50 dark:border-emerald-800/50">
          <CardContent className="py-12 text-center">
            <Star className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-muted-foreground">
              {t('noFavorites', language)}
            </h3>
            <p className="text-sm text-muted-foreground/70 mt-1">
              {t('noFavoritesDesc', language)}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {favorites.map((fav) => (
            <Card key={fav.id} className="border-emerald-200/50 dark:border-emerald-800/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-emerald-500 fill-emerald-500" />
                      <span className="font-medium">{fav.name}</span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1 ml-6">
                      €{fav.price.toFixed(2)} · {t('cat' + fav.category.charAt(0).toUpperCase() + fav.category.slice(1), language)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAddingToList(addingToList === fav.id ? null : fav.id)}
                      className="border-emerald-200 dark:border-emerald-800 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                    >
                      <ShoppingCart className="w-4 h-4 mr-1" />
                      {t('addToList', language)}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFavorite(fav.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Add to list selector */}
                {addingToList === fav.id && shoppingLists.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                    <Label className="text-xs text-muted-foreground mb-2 block">
                      {t('addToList', language)}
                    </Label>
                    <div className="flex gap-2">
                      <Select value={selectedList} onValueChange={setSelectedList}>
                        <SelectTrigger className="border-emerald-200 dark:border-emerald-800 flex-1">
                          <SelectValue placeholder={t('myLists', language)} />
                        </SelectTrigger>
                        <SelectContent>
                          {shoppingLists.map((list) => (
                            <SelectItem key={list.id} value={list.id}>
                              {list.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={() => selectedList && addFavToList(fav.id, selectedList)}
                        disabled={!selectedList}
                        size="sm"
                        className="bg-emerald-500 hover:bg-emerald-600 text-white"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
