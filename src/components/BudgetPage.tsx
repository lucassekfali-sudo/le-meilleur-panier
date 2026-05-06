'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/useStore';
import { t } from '@/lib/translations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Wallet, TrendingDown, TrendingUp, Utensils } from 'lucide-react';

export default function BudgetPage() {
  const { budget, saveBudget, language } = useStore();
  const [newFixedName, setNewFixedName] = useState('');
  const [newFixedAmount, setNewFixedAmount] = useState('');
  const [newVarName, setNewVarName] = useState('');
  const [newVarAmount, setNewVarAmount] = useState('');

  const totalFixed = budget.fixedExpenses.reduce((s, e) => s + e.amount, 0);
  const totalVariable = budget.variableExpenses.reduce((s, e) => s + e.amount, 0);
  const totalExpenses = totalFixed + totalVariable + budget.foodBudget;
  const remaining = budget.income - totalExpenses;
  const budgetPercent = budget.income > 0 ? Math.min((totalExpenses / budget.income) * 100, 100) : 0;

  const addFixedExpense = () => {
    if (!newFixedName.trim() || !newFixedAmount) return;
    const expense = {
      id: 'fe_' + Date.now(),
      name: newFixedName.trim(),
      amount: parseFloat(newFixedAmount) || 0,
    };
    saveBudget({
      ...budget,
      fixedExpenses: [...budget.fixedExpenses, expense],
    });
    setNewFixedName('');
    setNewFixedAmount('');
  };

  const addVariableExpense = () => {
    if (!newVarName.trim() || !newVarAmount) return;
    const expense = {
      id: 've_' + Date.now(),
      name: newVarName.trim(),
      amount: parseFloat(newVarAmount) || 0,
    };
    saveBudget({
      ...budget,
      variableExpenses: [...budget.variableExpenses, expense],
    });
    setNewVarName('');
    setNewVarAmount('');
  };

  const removeFixedExpense = (id: string) => {
    saveBudget({
      ...budget,
      fixedExpenses: budget.fixedExpenses.filter((e) => e.id !== id),
    });
  };

  const removeVariableExpense = (id: string) => {
    saveBudget({
      ...budget,
      variableExpenses: budget.variableExpenses.filter((e) => e.id !== id),
    });
  };

  return (
    <div className="space-y-6">
      {/* Budget Overview */}
      <Card className="border-emerald-200/50 dark:border-emerald-800/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Wallet className="w-5 h-5 text-emerald-500" />
            {t('budgetOverview', language)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Income */}
            <div>
              <Label className="text-sm font-medium">{t('monthlyIncome', language)}</Label>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-lg font-semibold text-emerald-600">€</span>
                <Input
                  type="number"
                  value={budget.income || ''}
                  onChange={(e) =>
                    saveBudget({ ...budget, income: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="0.00"
                  className="border-emerald-200 dark:border-emerald-800 focus-visible:ring-emerald-500"
                />
              </div>
            </div>

            {/* Progress bar */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">{t('totalExpenses', language)}</span>
                <span className={`font-medium ${remaining >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  €{totalExpenses.toFixed(2)}
                </span>
              </div>
              <Progress
                value={budgetPercent}
                className={`h-3 ${remaining < 0 ? '[&>div]:bg-red-500' : '[&>div]:bg-emerald-500'}`}
              />
              <div className="flex justify-between text-xs mt-1.5">
                <span className="text-muted-foreground">
                  {budgetPercent.toFixed(0)}%
                </span>
                <span className={remaining >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                  {remaining >= 0 ? t('withinBudget', language) : t('overBudget', language)}
                </span>
              </div>
            </div>

            {/* Remaining */}
            <div className={`p-4 rounded-xl ${remaining >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-red-50 dark:bg-red-950/30'}`}>
              <div className="text-sm text-muted-foreground">{t('remaining', language)}</div>
              <div className={`text-2xl font-bold ${remaining >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                €{remaining.toFixed(2)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Food Budget */}
      <Card className="border-emerald-200/50 dark:border-emerald-800/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Utensils className="w-5 h-5 text-emerald-500" />
            {t('foodBudget', language)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-emerald-600">€</span>
            <Input
              type="number"
              value={budget.foodBudget || ''}
              onChange={(e) =>
                saveBudget({ ...budget, foodBudget: parseFloat(e.target.value) || 0 })
              }
              placeholder="0.00"
              className="border-emerald-200 dark:border-emerald-800 focus-visible:ring-emerald-500"
            />
          </div>
          {budget.income > 0 && (
            <div className="mt-3">
              <div className="text-xs text-muted-foreground mb-1">
                {(budget.foodBudget / budget.income * 100).toFixed(1)}% {t('income', language).toLowerCase()}
              </div>
              <Progress
                value={Math.min((budget.foodBudget / budget.income) * 100, 100)}
                className="h-2 [&>div]:bg-emerald-500"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fixed Expenses */}
      <Card className="border-emerald-200/50 dark:border-emerald-800/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingDown className="w-5 h-5 text-orange-500" />
            {t('fixedExpenses', language)}
            <span className="ml-auto text-sm font-normal text-muted-foreground">
              €{totalFixed.toFixed(2)}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {budget.fixedExpenses.map((expense) => (
              <div
                key={expense.id}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50"
              >
                <div>
                  <div className="text-sm font-medium">{expense.name}</div>
                  <div className="text-sm text-muted-foreground">€{expense.amount.toFixed(2)}</div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFixedExpense(expense.id)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Add new */}
          <div className="flex gap-2 mt-3">
            <Input
              placeholder={t('expenseName', language)}
              value={newFixedName}
              onChange={(e) => setNewFixedName(e.target.value)}
              className="border-emerald-200 dark:border-emerald-800 focus-visible:ring-emerald-500"
            />
            <Input
              type="number"
              placeholder={t('expenseAmount', language)}
              value={newFixedAmount}
              onChange={(e) => setNewFixedAmount(e.target.value)}
              className="w-28 border-emerald-200 dark:border-emerald-800 focus-visible:ring-emerald-500"
            />
            <Button
              onClick={addFixedExpense}
              size="icon"
              className="bg-emerald-500 hover:bg-emerald-600 text-white shrink-0"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Variable Expenses */}
      <Card className="border-emerald-200/50 dark:border-emerald-800/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            {t('variableExpenses', language)}
            <span className="ml-auto text-sm font-normal text-muted-foreground">
              €{totalVariable.toFixed(2)}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {budget.variableExpenses.map((expense) => (
              <div
                key={expense.id}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50"
              >
                <div>
                  <div className="text-sm font-medium">{expense.name}</div>
                  <div className="text-sm text-muted-foreground">€{expense.amount.toFixed(2)}</div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeVariableExpense(expense.id)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Add new */}
          <div className="flex gap-2 mt-3">
            <Input
              placeholder={t('expenseName', language)}
              value={newVarName}
              onChange={(e) => setNewVarName(e.target.value)}
              className="border-emerald-200 dark:border-emerald-800 focus-visible:ring-emerald-500"
            />
            <Input
              type="number"
              placeholder={t('expenseAmount', language)}
              value={newVarAmount}
              onChange={(e) => setNewVarAmount(e.target.value)}
              className="w-28 border-emerald-200 dark:border-emerald-800 focus-visible:ring-emerald-500"
            />
            <Button
              onClick={addVariableExpense}
              size="icon"
              className="bg-emerald-500 hover:bg-emerald-600 text-white shrink-0"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
