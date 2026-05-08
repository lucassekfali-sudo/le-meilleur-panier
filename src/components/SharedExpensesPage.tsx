'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/useStore';
import { t } from '@/lib/translations';
import type { ExpenseData } from '@/lib/firebase-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
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
  ChevronLeft,
  Plus,
  Trash2,
  Users,
  Receipt,
  ArrowRight,
  Sparkles,
  UserPlus,
  X,
} from 'lucide-react';

// Color palette for participant avatars
const AVATAR_COLORS = [
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-sky-500',
  'bg-violet-500',
  'bg-orange-500',
  'bg-teal-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-lime-500',
];

function getInitials(name: string): string {
  return name.charAt(0).toUpperCase();
}

function getAvatarColor(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

interface Settlement {
  from: string;
  to: string;
  amount: number;
}

function calculateSettlements(expenses: ExpenseData[], participants: string[]): Settlement[] {
  if (!expenses.length || !participants.length) return [];

  // Calculate net balance for each person
  const balances: Record<string, number> = {};
  for (const p of participants) {
    balances[p] = 0;
  }

  for (const expense of expenses) {
    const sharePerPerson = expense.amount / expense.splitAmong.length;
    // The person who paid gets credit
    balances[expense.paidBy] = (balances[expense.paidBy] || 0) + expense.amount;
    // Each person in splitAmong owes their share
    for (const person of expense.splitAmong) {
      balances[person] = (balances[person] || 0) - sharePerPerson;
    }
  }

  // Separate into creditors and debtors
  const creditors: { name: string; amount: number }[] = [];
  const debtors: { name: string; amount: number }[] = [];

  for (const [name, balance] of Object.entries(balances)) {
    const rounded = Math.round(balance * 100) / 100;
    if (rounded > 0.01) {
      creditors.push({ name, amount: rounded });
    } else if (rounded < -0.01) {
      debtors.push({ name, amount: -rounded });
    }
  }

  // Sort by amount descending
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  // Greedy matching
  const settlements: Settlement[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].amount, creditors[j].amount);
    const rounded = Math.round(amount * 100) / 100;
    if (rounded > 0.01) {
      settlements.push({
        from: debtors[i].name,
        to: creditors[j].name,
        amount: rounded,
      });
    }
    debtors[i].amount -= amount;
    creditors[j].amount -= amount;
    if (debtors[i].amount < 0.01) i++;
    if (creditors[j].amount < 0.01) j++;
  }

  return settlements;
}

export default function SharedExpensesPage() {
  const {
    groups,
    language,
    addGroup,
    removeGroup,
    addParticipant,
    removeParticipant,
    addExpense,
    removeExpense,
  } = useStore();

  const [openGroupId, setOpenGroupId] = useState<string | null>(null);
  const [showNewGroupDialog, setShowNewGroupDialog] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupParticipants, setNewGroupParticipants] = useState('');
  const [showAddParticipantDialog, setShowAddParticipantDialog] = useState(false);
  const [newParticipantName, setNewParticipantName] = useState('');
  const [showAddExpenseDialog, setShowAddExpenseDialog] = useState(false);
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expensePaidBy, setExpensePaidBy] = useState('');
  const [expenseSplitAmong, setExpenseSplitAmong] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'expenses' | 'balances'>('expenses');

  const openGroup = groups.find((g) => g.id === openGroupId);

  // Get total spent for a group
  const getGroupTotal = (groupId: string) => {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return 0;
    return (group.expenses || []).reduce((sum, e) => sum + e.amount, 0);
  };

  // Calculate settlements for the open group
  const settlements = useMemo(() => {
    if (!openGroup) return [];
    return calculateSettlements(openGroup.expenses || [], openGroup.participants);
  }, [openGroup]);

  // Calculate per-person balance
  const personBalances = useMemo(() => {
    if (!openGroup) return {};
    const expenses = openGroup.expenses || [];
    const balances: Record<string, number> = {};
    for (const p of openGroup.participants) {
      balances[p] = 0;
    }
    for (const expense of expenses) {
      const sharePerPerson = expense.amount / expense.splitAmong.length;
      balances[expense.paidBy] = (balances[expense.paidBy] || 0) + expense.amount;
      for (const person of expense.splitAmong) {
        balances[person] = (balances[person] || 0) - sharePerPerson;
      }
    }
    // Round
    for (const key of Object.keys(balances)) {
      balances[key] = Math.round(balances[key] * 100) / 100;
    }
    return balances;
  }, [openGroup]);

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return;
    const name = newGroupName.trim();
    // Parse participants from comma-separated input
    const participants = newGroupParticipants
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    // Create the group first
    addGroup(name);

    // Add participants after a tick (group is now in state)
    setTimeout(() => {
      const latestGroups = useStore.getState().groups;
      const created = latestGroups.find((g) => g.name === name && g.participants.length === 0);
      if (created) {
        for (const p of participants) {
          addParticipant(created.id, p);
        }
      }
    }, 50);

    setNewGroupName('');
    setNewGroupParticipants('');
    setShowNewGroupDialog(false);
  };

  const handleAddParticipant = () => {
    if (!openGroupId || !newParticipantName.trim()) return;
    addParticipant(openGroupId, newParticipantName.trim());
    setNewParticipantName('');
    setShowAddParticipantDialog(false);
  };

  const handleAddExpense = () => {
    if (!openGroupId || !expenseDesc.trim() || !expenseAmount || !expensePaidBy) return;
    const amount = parseFloat(expenseAmount);
    if (isNaN(amount) || amount <= 0) return;
    if (expenseSplitAmong.length === 0) return;

    addExpense(openGroupId, {
      groupId: openGroupId,
      description: expenseDesc.trim(),
      amount,
      paidBy: expensePaidBy,
      splitAmong: expenseSplitAmong,
    });

    setExpenseDesc('');
    setExpenseAmount('');
    setExpensePaidBy('');
    setExpenseSplitAmong([]);
    setShowAddExpenseDialog(false);
  };

  const openAddExpenseDialog = () => {
    if (!openGroup) return;
    // Default: first participant pays, all are selected
    setExpensePaidBy(openGroup.participants[0] || '');
    setExpenseSplitAmong([...openGroup.participants]);
    setExpenseDesc('');
    setExpenseAmount('');
    setShowAddExpenseDialog(true);
  };

  const toggleSplitPerson = (name: string) => {
    setExpenseSplitAmong((prev) =>
      prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name]
    );
  };

  // ===== RENDER: Groups List =====
  const renderGroupsList = () => {
    if (groups.length === 0) {
      return (
        <Card className="border-emerald-200/30 dark:border-emerald-800/30 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm rounded-2xl overflow-hidden">
          <CardContent className="py-16 text-center">
            <div className="relative inline-block mb-4">
              <div className="w-20 h-20 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center mx-auto">
                <Users className="w-10 h-10 text-emerald-300 dark:text-emerald-700" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-foreground/80">
              {t('tricountNoGroups', language)}
            </h3>
            <p className="text-sm text-muted-foreground/70 mt-1 max-w-[250px] mx-auto">
              {t('tricountNoGroupsDesc', language)}
            </p>
            <Button
              onClick={() => setShowNewGroupDialog(true)}
              className="mt-5 gradient-emerald hover:opacity-90 text-white shadow-emerald rounded-xl h-11 px-6"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('tricountNewGroup', language)}
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-3">
        {groups.map((group, index) => {
          const total = getGroupTotal(group.id);
          const expenseCount = (group.expenses || []).length;
          return (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
              whileHover={{ scale: 1.01, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card
                className="cursor-pointer border-emerald-200/40 dark:border-emerald-800/30 hover:border-emerald-400/60 dark:hover:border-emerald-600/50 transition-all duration-300 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-xl overflow-hidden hover:shadow-lg hover:shadow-emerald-500/8 dark:hover:shadow-emerald-500/5 group"
                onClick={() => setOpenGroupId(group.id)}
              >
                <div className="h-1 w-full bg-emerald-100 dark:bg-emerald-950/50">
                  <motion.div
                    className="h-full gradient-emerald rounded-r-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, expenseCount * 10)}%` }}
                    transition={{ duration: 0.8, delay: index * 0.05 + 0.2 }}
                  />
                </div>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                        {group.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                        <span>{group.participants.length} {t('tricountParticipants', language).toLowerCase()}</span>
                        <span className="text-emerald-300 dark:text-emerald-700">·</span>
                        <span className="text-emerald-600 dark:text-emerald-500">{expenseCount} {t('tricountExpenses', language).toLowerCase()}</span>
                      </div>
                      <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-2.5">
                        €{total.toFixed(2)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      {/* Participant avatars */}
                      <div className="flex -space-x-2 mr-2">
                        {group.participants.slice(0, 4).map((p, i) => (
                          <div
                            key={p}
                            className={`w-8 h-8 rounded-full ${getAvatarColor(i)} flex items-center justify-center text-white text-xs font-bold ring-2 ring-white dark:ring-gray-900`}
                          >
                            {getInitials(p)}
                          </div>
                        ))}
                        {group.participants.length > 4 && (
                          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium text-muted-foreground ring-2 ring-white dark:ring-gray-900">
                            +{group.participants.length - 4}
                          </div>
                        )}
                      </div>
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
                            <AlertDialogTitle>{t('tricountDeleteGroup', language)}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t('tricountDeleteGroupConfirm', language)}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t('cancel', language)}</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => removeGroup(group.id)}
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
    );
  };

  // ===== RENDER: Group Detail =====
  const renderGroupDetail = () => {
    if (!openGroup) return null;
    const expenses = openGroup.expenses || [];
    const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
    const perPerson = openGroup.participants.length > 0 ? totalSpent / openGroup.participants.length : 0;

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => { setOpenGroupId(null); setActiveTab('expenses'); }}
            className="hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-xl transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold truncate">{openGroup.name}</h2>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{openGroup.participants.length} {t('tricountParticipants', language).toLowerCase()}</span>
              <span className="text-emerald-300 dark:text-emerald-700">·</span>
              <span className="text-emerald-600 dark:text-emerald-500">{expenses.length} {t('tricountExpenses', language).toLowerCase()}</span>
            </div>
          </div>
        </div>

        {/* Participants */}
        <Card className="border-emerald-200/40 dark:border-emerald-800/30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-xl overflow-hidden">
          <div className="h-0.5 w-full gradient-emerald opacity-50" />
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground/80">{t('tricountParticipants', language)}</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddParticipantDialog(true)}
                className="text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg text-xs h-7"
              >
                <UserPlus className="w-3.5 h-3.5 mr-1" />
                {t('tricountAddParticipant', language)}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {openGroup.participants.map((p, i) => (
                <div key={p} className="flex items-center gap-2 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-lg px-2.5 py-1.5 border border-emerald-100/50 dark:border-emerald-800/20">
                  <div className={`w-6 h-6 rounded-full ${getAvatarColor(i)} flex items-center justify-center text-white text-[10px] font-bold`}>
                    {getInitials(p)}
                  </div>
                  <span className="text-sm font-medium">{p}</span>
                  <button
                    onClick={() => removeParticipant(openGroup.id, p)}
                    className="text-muted-foreground/40 hover:text-red-500 transition-colors ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Total spent summary */}
        <Card className="border-emerald-200/50 dark:border-emerald-700/40 bg-gradient-to-r from-emerald-50/90 to-emerald-100/60 dark:from-emerald-950/40 dark:to-emerald-900/30 backdrop-blur-sm rounded-2xl overflow-hidden shadow-emerald">
          <div className="h-1 w-full gradient-emerald opacity-40" />
          <CardContent className="p-5">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-sm font-medium text-foreground/60">{t('tricountTotalSpent', language)}</span>
                <div className="text-3xl font-extrabold text-gradient-emerald">
                  €{totalSpent.toFixed(2)}
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm text-muted-foreground">{t('tricountPerPerson', language)}</span>
                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  €{perPerson.toFixed(2)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tab switcher */}
        <div className="flex gap-2 p-1 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-xl border border-emerald-100/50 dark:border-emerald-800/20">
          <button
            onClick={() => setActiveTab('expenses')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 ${
              activeTab === 'expenses'
                ? 'bg-white dark:bg-gray-800 shadow-sm text-emerald-700 dark:text-emerald-400'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Receipt className="w-4 h-4 inline mr-1.5" />
            {t('tricountExpenses', language)}
          </button>
          <button
            onClick={() => setActiveTab('balances')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 ${
              activeTab === 'balances'
                ? 'bg-white dark:bg-gray-800 shadow-sm text-emerald-700 dark:text-emerald-400'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="w-4 h-4 inline mr-1.5" />
            {t('tricountBalances', language)}
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'expenses' ? renderExpensesTab(expenses) : renderBalancesTab()}
        </AnimatePresence>
      </div>
    );
  };

  const renderExpensesTab = (expenses: ExpenseData[]) => {
    return (
      <motion.div
        key="expenses-tab"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 10 }}
        transition={{ duration: 0.2 }}
        className="space-y-4"
      >
        {/* Add expense button */}
        {openGroup && openGroup.participants.length > 0 && (
          <Button
            onClick={openAddExpenseDialog}
            className="w-full gradient-emerald hover:opacity-90 text-white shadow-emerald rounded-xl h-11 transition-all duration-300"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('tricountAddExpense', language)}
          </Button>
        )}

        {openGroup && openGroup.participants.length === 0 && (
          <Card className="border-amber-200/40 dark:border-amber-800/30 bg-amber-50/60 dark:bg-amber-950/20 backdrop-blur-sm rounded-xl">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-amber-700 dark:text-amber-400">
                {t('tricountAddParticipant', language)} 🎯
              </p>
            </CardContent>
          </Card>
        )}

        {/* Expenses list */}
        {expenses.length === 0 && openGroup && openGroup.participants.length > 0 ? (
          <Card className="border-emerald-200/30 dark:border-emerald-800/30 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm rounded-2xl overflow-hidden">
            <CardContent className="py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center mx-auto mb-3">
                <Receipt className="w-8 h-8 text-emerald-300 dark:text-emerald-700" />
              </div>
              <h3 className="text-base font-semibold text-foreground/80">
                {t('tricountNoExpenses', language)}
              </h3>
              <p className="text-sm text-muted-foreground/70 mt-1">
                {t('tricountNoExpensesDesc', language)}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {expenses.map((expense, index) => {
                const paidByIndex = openGroup?.participants.indexOf(expense.paidBy) ?? 0;
                return (
                  <motion.div
                    key={expense.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: index * 0.03, duration: 0.25 }}
                    layout
                  >
                    <Card className="border-emerald-200/30 dark:border-emerald-800/20 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-md hover:shadow-emerald-500/5 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
                      <CardContent className="p-3.5">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">{expense.description}</div>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <Badge
                                variant="secondary"
                                className="text-xs px-2 py-0.5 rounded-md border border-emerald-100/50 dark:border-emerald-800/30 bg-emerald-50/80 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
                              >
                                <span className={`inline-block w-3.5 h-3.5 rounded-full ${getAvatarColor(paidByIndex >= 0 ? paidByIndex : 0)} mr-1.5 text-[8px] text-white flex items-center justify-center leading-none`}>
                                  {getInitials(expense.paidBy)}
                                </span>
                                {t('tricountPaidBy', language)} {expense.paidBy}
                              </Badge>
                              <span className="text-xs text-muted-foreground/70">
                                {expense.splitAmong.length === (openGroup?.participants.length || 0)
                                  ? t('tricountEveryone', language)
                                  : expense.splitAmong.join(', ')}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                              €{expense.amount.toFixed(2)}
                            </span>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground/40 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-all"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t('tricountDeleteExpense', language)}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    « {expense.description} » — €{expense.amount.toFixed(2)}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t('cancel', language)}</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => openGroup && removeExpense(openGroup.id, expense.id)}
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
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    );
  };

  const renderBalancesTab = () => {
    if (!openGroup) return null;

    return (
      <motion.div
        key="balances-tab"
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -10 }}
        transition={{ duration: 0.2 }}
        className="space-y-4"
      >
        {/* Per-person balance */}
        <Card className="border-emerald-200/40 dark:border-emerald-800/30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-xl overflow-hidden">
          <div className="h-0.5 w-full gradient-emerald opacity-50" />
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-foreground/80 mb-3">{t('tricountBalances', language)}</h3>
            <div className="space-y-2.5">
              {openGroup.participants.map((p, i) => {
                const balance = personBalances[p] || 0;
                const isPositive = balance > 0.01;
                const isNegative = balance < -0.01;
                return (
                  <div key={p} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-full ${getAvatarColor(i)} flex items-center justify-center text-white text-xs font-bold`}>
                        {getInitials(p)}
                      </div>
                      <span className="text-sm font-medium">{p}</span>
                    </div>
                    <span className={`text-sm font-bold ${
                      isPositive
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : isNegative
                          ? 'text-red-500 dark:text-red-400'
                          : 'text-muted-foreground'
                    }`}>
                      {isPositive ? '+' : ''}{balance.toFixed(2)} €
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Settlements */}
        {settlements.length > 0 && (
          <Card className="border-emerald-200/40 dark:border-emerald-800/30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-xl overflow-hidden">
            <div className="h-0.5 w-full gradient-emerald opacity-50" />
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-foreground/80 mb-3">{t('tricountSettleUp', language)}</h3>
              <div className="space-y-2.5">
                {settlements.map((s, i) => {
                  const fromIndex = openGroup.participants.indexOf(s.from);
                  const toIndex = openGroup.participants.indexOf(s.to);
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center justify-between p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100/40 dark:border-emerald-800/20"
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-full ${getAvatarColor(fromIndex >= 0 ? fromIndex : 0)} flex items-center justify-center text-white text-[10px] font-bold`}>
                          {getInitials(s.from)}
                        </div>
                        <span className="text-sm font-medium">{s.from}</span>
                        <ArrowRight className="w-4 h-4 text-muted-foreground/40" />
                        <div className={`w-7 h-7 rounded-full ${getAvatarColor(toIndex >= 0 ? toIndex : 0)} flex items-center justify-center text-white text-[10px] font-bold`}>
                          {getInitials(s.to)}
                        </div>
                        <span className="text-sm font-medium">{s.to}</span>
                      </div>
                      <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                        €{s.amount.toFixed(2)}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {settlements.length === 0 && (openGroup.expenses || []).length > 0 && (
          <Card className="border-emerald-200/30 dark:border-emerald-800/30 bg-emerald-50/50 dark:bg-emerald-950/20 backdrop-blur-sm rounded-2xl overflow-hidden">
            <CardContent className="py-8 text-center">
              <div className="text-3xl mb-2">✅</div>
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                {language === 'fr' ? 'Tout est réglé !' : language === 'es' ? '¡Todo está saldado!' : 'All settled up!'}
              </p>
            </CardContent>
          </Card>
        )}
      </motion.div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Page title */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{t('tricountTitle', language)}</h2>
        {!openGroupId && (
          <Button
            onClick={() => setShowNewGroupDialog(true)}
            className="gradient-emerald hover:opacity-90 text-white shadow-emerald rounded-xl h-9 px-4 text-sm transition-all duration-300"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            {t('tricountNewGroup', language)}
          </Button>
        )}
      </div>

      {/* Content */}
      {openGroupId ? renderGroupDetail() : renderGroupsList()}

      {/* ===== New Group Dialog ===== */}
      <Dialog open={showNewGroupDialog} onOpenChange={setShowNewGroupDialog}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-500" />
              {t('tricountNewGroup', language)}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium">{t('tricountGroupName', language)}</Label>
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder={t('tricountGroupName', language)}
                className="mt-1.5 border-emerald-200/60 dark:border-emerald-800/40 focus-visible:ring-emerald-500/50 rounded-xl h-11"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateGroup()}
                autoFocus
              />
            </div>
            <div>
              <Label className="text-sm font-medium">{t('tricountParticipants', language)}</Label>
              <Input
                value={newGroupParticipants}
                onChange={(e) => setNewGroupParticipants(e.target.value)}
                placeholder={language === 'fr' ? 'Alice, Bob, Charlie...' : language === 'es' ? 'Alice, Bob, Charlie...' : 'Alice, Bob, Charlie...'}
                className="mt-1.5 border-emerald-200/60 dark:border-emerald-800/40 focus-visible:ring-emerald-500/50 rounded-xl h-11"
              />
              <p className="text-xs text-muted-foreground/60 mt-1">
                {language === 'fr' ? 'Séparez les prénoms par des virgules' : language === 'es' ? 'Separa los nombres con comas' : 'Separate names with commas'}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewGroupDialog(false)} className="rounded-xl">
              {t('cancel', language)}
            </Button>
            <Button
              onClick={handleCreateGroup}
              className="gradient-emerald hover:opacity-90 text-white rounded-xl"
            >
              {t('tricountNewGroup', language)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Add Participant Dialog ===== */}
      <Dialog open={showAddParticipantDialog} onOpenChange={setShowAddParticipantDialog}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-emerald-500" />
              {t('tricountAddParticipant', language)}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium">{t('tricountParticipantName', language)}</Label>
              <Input
                value={newParticipantName}
                onChange={(e) => setNewParticipantName(e.target.value)}
                placeholder={t('tricountParticipantName', language)}
                className="mt-1.5 border-emerald-200/60 dark:border-emerald-800/40 focus-visible:ring-emerald-500/50 rounded-xl h-11"
                onKeyDown={(e) => e.key === 'Enter' && handleAddParticipant()}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddParticipantDialog(false)} className="rounded-xl">
              {t('cancel', language)}
            </Button>
            <Button
              onClick={handleAddParticipant}
              className="gradient-emerald hover:opacity-90 text-white rounded-xl"
            >
              {t('tricountAddParticipant', language)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Add Expense Dialog ===== */}
      <Dialog open={showAddExpenseDialog} onOpenChange={setShowAddExpenseDialog}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-500" />
              {t('tricountAddExpense', language)}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium">{t('tricountExpenseDesc', language)}</Label>
              <Input
                value={expenseDesc}
                onChange={(e) => setExpenseDesc(e.target.value)}
                placeholder={t('tricountExpenseDesc', language)}
                className="mt-1.5 border-emerald-200/60 dark:border-emerald-800/40 focus-visible:ring-emerald-500/50 rounded-xl h-11"
                autoFocus
              />
            </div>
            <div>
              <Label className="text-sm font-medium">{t('tricountExpenseAmount', language)} (€)</Label>
              <Input
                type="number"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                placeholder="0.00"
                className="mt-1.5 border-emerald-200/60 dark:border-emerald-800/40 focus-visible:ring-emerald-500/50 rounded-xl h-11"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">{t('tricountPaidBy', language)}</Label>
              <Select value={expensePaidBy} onValueChange={setExpensePaidBy}>
                <SelectTrigger className="mt-1.5 border-emerald-200/60 dark:border-emerald-800/40 rounded-xl h-11">
                  <SelectValue placeholder={t('tricountSelectParticipant', language)} />
                </SelectTrigger>
                <SelectContent>
                  {openGroup?.participants.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium">{t('tricountSplitAmong', language)}</Label>
              <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                {openGroup?.participants.map((p) => (
                  <label key={p} className="flex items-center gap-3 cursor-pointer hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 p-2 rounded-lg transition-colors">
                    <Checkbox
                      checked={expenseSplitAmong.includes(p)}
                      onCheckedChange={() => toggleSplitPerson(p)}
                      className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                    />
                    <span className="text-sm">{p}</span>
                  </label>
                ))}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="mt-1 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg"
                onClick={() => {
                  if (expenseSplitAmong.length === openGroup?.participants.length) {
                    setExpenseSplitAmong([]);
                  } else {
                    setExpenseSplitAmong([...(openGroup?.participants || [])]);
                  }
                }}
              >
                {expenseSplitAmong.length === openGroup?.participants.length
                  ? t('cancel', language)
                  : t('tricountAllParticipants', language)}
              </Button>
            </div>
            {expenseAmount && expenseSplitAmong.length > 0 && (
              <div className="text-xs text-muted-foreground/70 bg-emerald-50/50 dark:bg-emerald-950/20 p-2.5 rounded-lg border border-emerald-100/40 dark:border-emerald-800/20">
                {(parseFloat(expenseAmount) / expenseSplitAmong.length).toFixed(2)} € / {t('tricountParticipants', language).toLowerCase()}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddExpenseDialog(false)} className="rounded-xl">
              {t('cancel', language)}
            </Button>
            <Button
              onClick={handleAddExpense}
              className="gradient-emerald hover:opacity-90 text-white rounded-xl"
              disabled={!expenseDesc.trim() || !expenseAmount || !expensePaidBy || expenseSplitAmong.length === 0}
            >
              {t('save', language)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
