'use client';

import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/useStore';
import { t } from '@/lib/translations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Camera,
  Upload,
  ScanLine,
  Edit3,
  Trash2,
  Check,
  Plus,
  FileText,
  Loader2,
  X,
  Image as ImageIcon,
  AlertCircle,
} from 'lucide-react';

interface ExtractedItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  selected: boolean;
}

interface ReceiptScannerProps {
  open: boolean;
  onClose: () => void;
  listId: string;
}

type ScannerStep = 'input' | 'processing' | 'results';

// Words to filter out from receipt text (not actual items)
const NON_ITEM_PATTERNS = [
  /^(total|sous.total|sous-total|tva|tax|taxe|remise|reduction|r[eé]duction|promo|promotion|carte|cb|visa|mastercard|esp[eè]ces|ch[eè]que|merci|adresse|t[eé]l|phone|tel|site|web|www|http|siret|n[u°]|\d{5,}|code|postale|ville|rue|avenue|boulevard|sarl|sas|sa|eurl|sirene|naf|ape|ttc|ht|rendu|monnaie|paiement|pay[eé]|ticket|facture|caisse|client|serveur|cuisine|table|numero|n°|date|heure|horaire)/i,
  /^(euro|€|\$|£|franc|chf)/i,
  /^\s*$/,
  /^(montant|net|brut|rendu|rendue|monnaie)/i,
];

function isNonItem(line: string): boolean {
  const trimmed = line.trim().toLowerCase();
  if (trimmed.length < 2) return true;
  if (/^\d+[.,]\d{2}\s*€?\s*$/.test(trimmed)) return true; // just a number
  return NON_ITEM_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function extractItemsFromText(text: string): ExtractedItem[] {
  const items: ExtractedItem[] = [];
  const lines = text.split('\n');
  const seen = new Set<string>();

  // Pattern 1: name followed by price with € sign
  const pattern1 = /^(.+?)\s+([\d]+[.,][\d]{2})\s*€\s*$/gm;
  // Pattern 2: name followed by price (no €)
  const pattern2 = /^(.+?)\s{2,}([\d]+[.,][\d]{2})\s*$/gm;

  const fullText = lines.join('\n');

  // Try pattern 1 first
  let match: RegExpExecArray | null;
  while ((match = pattern1.exec(fullText)) !== null) {
    const name = match[1].trim().replace(/[^a-zA-ZàâäéèêëïîôùûüÿçœæÀÂÄÉÈÊËÏÎÔÙÛÜŸÇŒÆ\s\-']/g, '').trim();
    const price = parseFloat(match[2].replace(',', '.'));

    if (!isNonItem(name) && price > 0 && price < 1000 && name.length >= 2) {
      const key = `${name.toLowerCase()}-${price}`;
      if (!seen.has(key)) {
        seen.add(key);
        items.push({
          id: 'scan_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          name,
          price,
          quantity: 1,
          selected: true,
        });
      }
    }
  }

  // If pattern 1 found nothing, try pattern 2
  if (items.length === 0) {
    while ((match = pattern2.exec(fullText)) !== null) {
      const name = match[1].trim().replace(/[^a-zA-ZàâäéèêëïîôùûüÿçœæÀÂÄÉÈÊËÏÎÔÙÛÜŸÇŒÆ\s\-']/g, '').trim();
      const price = parseFloat(match[2].replace(',', '.'));

      if (!isNonItem(name) && price > 0 && price < 1000 && name.length >= 2) {
        const key = `${name.toLowerCase()}-${price}`;
        if (!seen.has(key)) {
          seen.add(key);
          items.push({
            id: 'scan_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
            name,
            price,
            quantity: 1,
            selected: true,
          });
        }
      }
    }
  }

  // If still nothing, try line-by-line approach
  if (items.length === 0) {
    for (const line of lines) {
      const lineMatch = line.match(/^(.+?)\s+([\d]+[.,][\d]{2})\s*€?\s*$/);
      if (lineMatch) {
        const name = lineMatch[1].trim().replace(/[^a-zA-ZàâäéèêëïîôùûüÿçœæÀÂÄÉÈÊËÏÎÔÙÛÜŸÇŒÆ\s\-']/g, '').trim();
        const price = parseFloat(lineMatch[2].replace(',', '.'));

        if (!isNonItem(name) && price > 0 && price < 1000 && name.length >= 2) {
          const key = `${name.toLowerCase()}-${price}`;
          if (!seen.has(key)) {
            seen.add(key);
            items.push({
              id: 'scan_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
              name,
              price,
              quantity: 1,
              selected: true,
            });
          }
        }
      }
    }
  }

  return items;
}

export default function ReceiptScanner({ open, onClose, listId }: ReceiptScannerProps) {
  const { language, addItem, shoppingLists } = useStore();
  const [step, setStep] = useState<ScannerStep>('input');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');
  const [extractedItems, setExtractedItems] = useState<ExtractedItem[]>([]);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [selectedListId, setSelectedListId] = useState<string>(listId);
  const [confirming, setConfirming] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<unknown>(null);

  const resetState = useCallback(() => {
    setStep('input');
    setImagePreview(null);
    setProgress(0);
    setProgressStatus('');
    setExtractedItems([]);
    setEditingItemId(null);
    setOcrError(null);
    setSelectedListId(listId);
    setConfirming(false);
    // Terminate worker if exists
    if (workerRef.current && typeof (workerRef.current as { terminate?: () => void }).terminate === 'function') {
      (workerRef.current as { terminate: () => void }).terminate();
      workerRef.current = null;
    }
  }, [listId]);

  const handleClose = () => {
    resetState();
    onClose();
  };

  const processImage = useCallback(async (file: File) => {
    setStep('processing');
    setProgress(0);
    setOcrError(null);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    try {
      setProgressStatus('Sending to AI...');
      setProgress(20);

      // Use server-side Gemini Vision (free 1500 req/day)
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch('/api/receipts/scan', {
        method: 'POST',
        body: formData,
      });

      setProgress(80);
      setProgressStatus('Extracting items...');

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('[ReceiptScanner] API error:', err);
        setOcrError('ocr_failed');
        setStep('results');
        return;
      }

      const data = await res.json();
      setProgress(100);

      // Map AI items to local ExtractedItem shape
      const items: ExtractedItem[] = (data.items || []).map((it: { name: string; quantity?: number; unitPrice?: number; totalPrice?: number }) => ({
        id: 'scan_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        name: it.name || '',
        quantity: it.quantity || 1,
        price: it.totalPrice ?? it.unitPrice ?? 0,
        selected: true,
      }));

      setExtractedItems(items);
      setStep('results');

      if (items.length === 0) {
        setOcrError('no_items');
      }
    } catch (err) {
      console.error('OCR Error:', err);
      setOcrError('ocr_failed');
      setStep('results');
      setExtractedItems([]);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImage(file);
    }
    // Reset input value so same file can be selected again
    e.target.value = '';
  };

  const toggleItemSelection = (itemId: string) => {
    setExtractedItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const removeItem = (itemId: string) => {
    setExtractedItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const startEditItem = (item: ExtractedItem) => {
    setEditingItemId(item.id);
    setEditName(item.name);
    setEditPrice(item.price.toString());
  };

  const saveEditItem = (itemId: string) => {
    setExtractedItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, name: editName.trim(), price: parseFloat(editPrice) || 0 }
          : item
      )
    );
    setEditingItemId(null);
  };

  const addManualItem = () => {
    const newItem: ExtractedItem = {
      id: 'scan_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      name: '',
      price: 0,
      quantity: 1,
      selected: true,
    };
    setExtractedItems((prev) => [...prev, newItem]);
    setEditingItemId(newItem.id);
    setEditName('');
    setEditPrice('0');
  };

  const handleConfirm = () => {
    setConfirming(true);
    const selectedItems = extractedItems.filter((item) => item.selected && item.name.trim());

    for (const item of selectedItems) {
      addItem(selectedListId, {
        id: 'item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        name: item.name.trim(),
        price: item.price,
        quantity: item.quantity,
        category: 'other',
        checked: false,
      });
    }

    setTimeout(() => {
      setConfirming(false);
      handleClose();
    }, 500);
  };

  const totalSelected = extractedItems
    .filter((item) => item.selected)
    .reduce((sum, item) => sum + item.price * item.quantity, 0);

  const selectedCount = extractedItems.filter((item) => item.selected).length;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-0 gap-0">
        {/* Header */}
        <DialogHeader className="p-5 pb-0">
          <DialogTitle className="flex items-center gap-2.5 text-lg">
            <div className="w-8 h-8 rounded-xl gradient-emerald flex items-center justify-center shadow-emerald">
              <ScanLine className="w-4 h-4 text-white" />
            </div>
            {t('scannerTitle', language)}
          </DialogTitle>
        </DialogHeader>

        <div className="p-5 space-y-4">
          <AnimatePresence mode="wait">
            {step === 'input' && (
              <motion.div
                key="input"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* Hint */}
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/30">
                  <ScanLine className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 leading-relaxed">
                    {t('scannerHint', language)}
                  </p>
                </div>

                {/* Image preview */}
                {imagePreview && (
                  <div className="relative rounded-xl overflow-hidden border border-emerald-200/50 dark:border-emerald-800/30">
                    <img
                      src={imagePreview}
                      alt="Receipt preview"
                      className="w-full max-h-48 object-contain bg-gray-50 dark:bg-gray-900"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-7 w-7 rounded-lg bg-black/40 hover:bg-black/60 text-white"
                      onClick={() => setImagePreview(null)}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}

                {/* Upload buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={() => cameraInputRef.current?.click()}
                    className="h-24 flex-col gap-2 gradient-emerald hover:opacity-90 text-white rounded-xl shadow-emerald transition-all duration-300"
                  >
                    <Camera className="w-6 h-6" />
                    <span className="text-xs font-medium">{t('scannerTakePhoto', language)}</span>
                  </Button>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    className="h-24 flex-col gap-2 border-emerald-200/60 dark:border-emerald-800/40 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-xl transition-all duration-300"
                  >
                    <Upload className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">{t('scannerUpload', language)}</span>
                  </Button>
                </div>

                {/* Hidden file inputs */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </motion.div>
            )}

            {step === 'processing' && (
              <motion.div
                key="processing"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-5 py-6"
              >
                {/* Image preview (small) */}
                {imagePreview && (
                  <div className="flex justify-center">
                    <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-emerald-200/50 dark:border-emerald-800/30">
                      <img
                        src={imagePreview}
                        alt="Receipt"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                        <ScanLine className="w-6 h-6 text-white animate-pulse" />
                      </div>
                    </div>
                  </div>
                )}

                <div className="text-center space-y-3">
                  <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto" />
                  <div>
                    <p className="font-semibold text-foreground/90">{t('scannerProcessing', language)}</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">{progressStatus}</p>
                  </div>
                  <div className="space-y-2">
                    <Progress value={progress} className="h-2 rounded-full" />
                    <p className="text-xs text-muted-foreground/60">{progress}%</p>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 'results' && (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* Error state */}
                {ocrError && extractedItems.length === 0 && (
                  <div className="flex flex-col items-center gap-3 py-6 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center">
                      <AlertCircle className="w-8 h-8 text-amber-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground/90">{t('scannerNoItems', language)}</p>
                      <p className="text-xs text-muted-foreground/70 mt-1 max-w-[250px] mx-auto">
                        {t('scannerNoItemsDesc', language)}
                      </p>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={resetState}
                        className="rounded-xl border-emerald-200/60 dark:border-emerald-800/40"
                      >
                        <Camera className="w-3.5 h-3.5 mr-1.5" />
                        {t('scannerTakePhoto', language)}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={addManualItem}
                        className="rounded-xl border-emerald-200/60 dark:border-emerald-800/40"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1.5" />
                        {t('addItem', language)}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Extracted items header */}
                {extractedItems.length > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="font-semibold text-sm">{t('scannerExtracted', language)}</span>
                      <Badge className="bg-emerald-50/80 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 px-1.5 py-0 rounded-md border border-emerald-100/50 dark:border-emerald-800/30 text-xs">
                        {extractedItems.length} {t('scannerItemsFound', language)}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={addManualItem}
                      className="h-7 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      {t('addItem', language)}
                    </Button>
                  </div>
                )}

                {/* Items list */}
                {extractedItems.length > 0 && (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                    <AnimatePresence>
                      {extractedItems.map((item) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          layout
                        >
                          <Card className={`border-emerald-200/30 dark:border-emerald-800/20 rounded-xl overflow-hidden transition-all duration-300 ${!item.selected ? 'opacity-50' : 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm'}`}>
                            <CardContent className="p-3">
                              {editingItemId === item.id ? (
                                /* Edit mode */
                                <div className="flex items-center gap-2">
                                  <div className="flex-1">
                                    <Input
                                      value={editName}
                                      onChange={(e) => setEditName(e.target.value)}
                                      placeholder={t('scannerItemName', language)}
                                      className="h-8 text-sm border-emerald-200/60 dark:border-emerald-800/40 focus-visible:ring-emerald-500/50 rounded-lg"
                                      autoFocus
                                    />
                                  </div>
                                  <div className="w-20">
                                    <Input
                                      type="number"
                                      value={editPrice}
                                      onChange={(e) => setEditPrice(e.target.value)}
                                      placeholder={t('scannerItemPrice', language)}
                                      className="h-8 text-sm border-emerald-200/60 dark:border-emerald-800/40 focus-visible:ring-emerald-500/50 rounded-lg"
                                      step="0.01"
                                    />
                                  </div>
                                  <Button
                                    onClick={() => saveEditItem(item.id)}
                                    size="icon"
                                    className="h-8 w-8 rounded-lg gradient-emerald hover:opacity-90 text-white shrink-0"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              ) : (
                                /* Display mode */
                                <div className="flex items-center gap-2.5">
                                  <Checkbox
                                    checked={item.selected}
                                    onCheckedChange={() => toggleItemSelection(item.id)}
                                    className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 transition-all"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-medium truncate ${!item.selected ? 'line-through text-muted-foreground' : ''}`}>
                                      {item.name || <span className="italic text-muted-foreground/50">{t('scannerItemName', language)}</span>}
                                    </p>
                                  </div>
                                  <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                                    €{item.price.toFixed(2)}
                                  </span>
                                  <div className="flex gap-0.5 shrink-0">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => startEditItem(item)}
                                      className="h-7 w-7 text-muted-foreground/50 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition-all"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => removeItem(item.id)}
                                      className="h-7 w-7 text-muted-foreground/50 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-all"
                                    >
                                      <Trash2 className="w-3 h-3" />
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

                {/* Total and add to list */}
                {extractedItems.length > 0 && (
                  <>
                    {/* Total detected */}
                    <Card className="border-emerald-200/50 dark:border-emerald-700/40 bg-gradient-to-r from-emerald-50/90 to-emerald-100/60 dark:from-emerald-950/40 dark:to-emerald-900/30 backdrop-blur-sm rounded-xl overflow-hidden">
                      <CardContent className="p-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-foreground/70">{t('scannerTotalDetected', language)}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs bg-emerald-50/80 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 px-1.5 py-0 rounded-md border border-emerald-100/50 dark:border-emerald-800/30">
                              {selectedCount}/{extractedItems.length}
                            </Badge>
                            <span className="text-lg font-bold text-gradient-emerald">
                              €{totalSelected.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* List selector */}
                    {shoppingLists.length > 1 && (
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground/80">{t('scannerSelectList', language)}</Label>
                        <div className="flex gap-2 flex-wrap">
                          {shoppingLists.map((list) => (
                            <Button
                              key={list.id}
                              variant={selectedListId === list.id ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setSelectedListId(list.id)}
                              className={`rounded-lg text-xs h-8 ${
                                selectedListId === list.id
                                  ? 'gradient-emerald text-white hover:opacity-90'
                                  : 'border-emerald-200/60 dark:border-emerald-800/40 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                              }`}
                            >
                              {list.name}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Confirm button */}
                    <Button
                      onClick={handleConfirm}
                      disabled={selectedCount === 0 || confirming}
                      className="w-full gradient-emerald hover:opacity-90 text-white rounded-xl h-11 shadow-emerald transition-all duration-300 disabled:opacity-50"
                    >
                      {confirming ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4 mr-2" />
                      )}
                      {t('scannerConfirm', language)}
                      {selectedCount > 0 && (
                        <span className="ml-1.5 opacity-80">({selectedCount})</span>
                      )}
                    </Button>
                  </>
                )}

                {/* Back to scan */}
                {extractedItems.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetState}
                    className="w-full text-muted-foreground/60 hover:text-foreground rounded-xl"
                  >
                    <Camera className="w-3.5 h-3.5 mr-1.5" />
                    {t('scannerTakePhoto', language)}
                  </Button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
