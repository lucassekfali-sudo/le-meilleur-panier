'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/useStore';
import { t } from '@/lib/translations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  Target,
  Plus,
  Flame,
  Trophy,
  Check,
  Trash2,
  Minus,
  Sparkles,
} from 'lucide-react';

// Helper: get YYYY-MM-DD string for a Date
function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

// Celebration particles component
function CelebrationParticles() {
  const particles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    angle: (i / 12) * 360,
    delay: i * 0.05,
    color: ['#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'][i % 5],
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute w-2 h-2 rounded-full"
          style={{
            backgroundColor: p.color,
            left: '50%',
            top: '50%',
          }}
          initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
          animate={{
            x: Math.cos((p.angle * Math.PI) / 180) * 60,
            y: Math.sin((p.angle * Math.PI) / 180) * 60,
            scale: [0, 1.5, 0],
            opacity: [1, 1, 0],
          }}
          transition={{ duration: 0.8, delay: p.delay, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}

export default function GoalsPage() {
  const {
    user,
    language,
    goals,
    goalLogs,
    addGoal,
    removeGoal,
    updateGoalLog,
    loadGoals,
  } = useStore();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newFrequency, setNewFrequency] = useState<'daily' | 'weekly'>('daily');
  const [newTarget, setNewTarget] = useState('');
  const [newUnit, setNewUnit] = useState('');
  const [celebratingGoalId, setCelebratingGoalId] = useState<string | null>(null);

  // Stable today string - won't change within a session
  const [today] = useState(() => toDateStr(new Date()));

  // Load goals on mount
  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  // Get current value for a goal on a specific date
  const getGoalValue = useCallback(
    (goalId: string, date: string): number => {
      const log = goalLogs.find((l) => l.date === date);
      return log?.logs[goalId] ?? 0;
    },
    [goalLogs]
  );

  // Calculate streak for a goal
  const calculateStreak = useCallback(
    (goalId: string, frequency: 'daily' | 'weekly', targetValue: number): number => {
      let streak = 0;

      if (frequency === 'daily') {
        // Check from today going back
        const d = new Date();
        while (true) {
          const dateStr = toDateStr(d);
          const value = getGoalValue(goalId, dateStr);
          if (value >= targetValue) {
            streak++;
            d.setDate(d.getDate() - 1);
          } else {
            break;
          }
        }
      } else {
        // Weekly: check from current week going back
        const d = new Date();
        // Get start of current week (Monday)
        const dayOfWeek = d.getDay();
        const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - diff);

        while (true) {
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          let weekTotal = 0;
          for (let i = 0; i < 7; i++) {
            const checkDate = new Date(weekStart);
            checkDate.setDate(weekStart.getDate() + i);
            weekTotal += getGoalValue(goalId, toDateStr(checkDate));
          }
          if (weekTotal >= targetValue) {
            streak++;
            weekStart.setDate(weekStart.getDate() - 7);
          } else {
            break;
          }
        }
      }

      return streak;
    },
    [getGoalValue]
  );

  // Check if milestone reached
  const isMilestone = (streak: number): boolean => {
    return [7, 14, 21, 30, 60, 100].includes(streak);
  };

  const handleAddGoal = () => {
    if (!newTitle.trim()) {
      console.log('[GoalsPage] handleAddGoal: title is empty, aborting');
      return;
    }
    const target = parseInt(newTarget);
    if (!target || target < 1) {
      console.log('[GoalsPage] handleAddGoal: invalid target:', newTarget, 'parsed:', target);
      return;
    }
    console.log('[GoalsPage] handleAddGoal: creating goal:', newTitle.trim(), newFrequency, target, newUnit.trim());
    addGoal(newTitle.trim(), newFrequency, target, newUnit.trim());
    setNewTitle('');
    setNewFrequency('daily');
    setNewTarget('');
    setNewUnit('');
    setShowAddDialog(false);
  };

  const handleIncrement = (goalId: string, targetValue: number) => {
    const currentValue = getGoalValue(goalId, today);
    const newValue = currentValue + 1;
    updateGoalLog(today, goalId, newValue);

    // Check if just completed
    if (currentValue < targetValue && newValue >= targetValue) {
      setCelebratingGoalId(goalId);
      setTimeout(() => setCelebratingGoalId(null), 1500);
    }
  };

  const handleDecrement = (goalId: string) => {
    const currentValue = getGoalValue(goalId, today);
    if (currentValue > 0) {
      updateGoalLog(today, goalId, currentValue - 1);
    }
  };

  // Compute streaks
  const streaks = useMemo(() => {
    const map: Record<string, number> = {};
    goals.forEach((goal) => {
      map[goal.id] = calculateStreak(goal.id, goal.frequency, goal.targetValue);
    });
    return map;
  }, [goals, calculateStreak]);

  // Sort goals: incomplete first, then by creation date
  const sortedGoals = useMemo(() => {
    return [...goals].sort((a, b) => {
      const aCompleted = getGoalValue(a.id, today) >= a.targetValue;
      const bCompleted = getGoalValue(b.id, today) >= b.targetValue;
      if (aCompleted !== bCompleted) return aCompleted ? 1 : -1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [goals, getGoalValue, today]);

  const completedToday = goals.filter(
    (g) => getGoalValue(g.id, today) >= g.targetValue
  ).length;

  // Empty state
  if (goals.length === 0) {
    return (
      <div className="space-y-4">
        <Card className="border-emerald-200/30 dark:border-emerald-800/30 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm rounded-2xl overflow-hidden">
          <CardContent className="py-16 text-center">
            <div className="relative inline-block mb-4">
              <div className="w-20 h-20 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center mx-auto">
                <Target className="w-10 h-10 text-emerald-300 dark:text-emerald-700" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-foreground/80">
              {t('goalNoGoals', language)}
            </h3>
            <p className="text-sm text-muted-foreground/70 mt-1 max-w-[280px] mx-auto">
              {t('goalNoGoalsDesc', language)}
            </p>
            <Button
              onClick={() => setShowAddDialog(true)}
              className="mt-5 gradient-emerald hover:opacity-90 text-white shadow-emerald rounded-xl h-11 px-6"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('addGoal', language)}
            </Button>
          </CardContent>
        </Card>

        {/* Add Goal Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="sm:max-w-sm rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-emerald-500" />
                {t('addGoal', language)}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-sm font-medium">{t('goalName', language)}</Label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder={language === 'fr' ? 'Ex: Boire 8 verres d\'eau' : language === 'es' ? 'Ej: Beber 8 vasos de agua' : 'e.g. Drink 8 glasses of water'}
                  className="mt-1.5 border-emerald-200/60 dark:border-emerald-800/40 focus-visible:ring-emerald-500/50 rounded-xl h-11"
                  autoFocus
                />
              </div>
              <div>
                <Label className="text-sm font-medium">{t('goalFrequency', language)}</Label>
                <Select value={newFrequency} onValueChange={(v) => setNewFrequency(v as 'daily' | 'weekly')}>
                  <SelectTrigger className="mt-1.5 border-emerald-200/60 dark:border-emerald-800/40 rounded-xl h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">{t('goalDaily', language)}</SelectItem>
                    <SelectItem value="weekly">{t('goalWeekly', language)}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Label className="text-sm font-medium">{t('goalTarget', language)}</Label>
                  <Input
                    type="number"
                    value={newTarget}
                    onChange={(e) => setNewTarget(e.target.value)}
                    placeholder="8"
                    className="mt-1.5 border-emerald-200/60 dark:border-emerald-800/40 focus-visible:ring-emerald-500/50 rounded-xl h-11"
                    min="1"
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-sm font-medium">{t('goalUnit', language)}</Label>
                  <Input
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    placeholder={language === 'fr' ? 'verres' : language === 'es' ? 'vasos' : 'glasses'}
                    className="mt-1.5 border-emerald-200/60 dark:border-emerald-800/40 focus-visible:ring-emerald-500/50 rounded-xl h-11"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)} className="rounded-xl">
                {t('cancel', language)}
              </Button>
              <Button
                onClick={handleAddGoal}
                className="gradient-emerald hover:opacity-90 text-white rounded-xl"
              >
                {t('save', language)}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary card */}
      <Card className="border-emerald-200/50 dark:border-emerald-700/40 bg-gradient-to-r from-emerald-50/90 to-emerald-100/60 dark:from-emerald-950/40 dark:to-emerald-900/30 backdrop-blur-sm rounded-2xl overflow-hidden shadow-emerald">
        <div className="h-1 w-full gradient-emerald opacity-40" />
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gradient-emerald">
                {t('goalsTitle', language)}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {t('goalToday', language)}: {completedToday}/{goals.length} {t('goalCompleted', language).toLowerCase()}
              </p>
            </div>
            <Button
              onClick={() => setShowAddDialog(true)}
              className="gradient-emerald hover:opacity-90 text-white shadow-emerald rounded-xl h-10 px-4 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/20"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              {t('addGoal', language)}
            </Button>
          </div>
          {goals.length > 0 && (
            <div className="mt-3">
              <Progress
                value={(completedToday / goals.length) * 100}
                className="h-2 bg-emerald-200/50 dark:bg-emerald-800/30 [&>div]:gradient-emerald"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Goals list */}
      <div className="space-y-3">
        <AnimatePresence>
          {sortedGoals.map((goal, index) => {
            const currentValue = getGoalValue(goal.id, today);
            const isCompleted = currentValue >= goal.targetValue;
            const progress = Math.min((currentValue / goal.targetValue) * 100, 100);
            const streak = streaks[goal.id] || 0;
            const milestone = isMilestone(streak);

            return (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
                layout
              >
                <Card
                  className={`border-emerald-200/40 dark:border-emerald-800/30 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/8 dark:hover:shadow-emerald-500/5 relative ${
                    isCompleted
                      ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300/50 dark:border-emerald-700/40'
                      : 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm'
                  }`}
                >
                  {/* Celebration effect */}
                  {celebratingGoalId === goal.id && <CelebrationParticles />}

                  {/* Progress bar at top */}
                  <div className="h-1.5 w-full bg-emerald-100 dark:bg-emerald-950/50">
                    <motion.div
                      className="h-full gradient-emerald rounded-r-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                    />
                  </div>

                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Target icon */}
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${
                          isCompleted
                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                            : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500'
                        }`}
                      >
                        {isCompleted ? (
                          <Check className="w-5 h-5" />
                        ) : (
                          <Target className="w-5 h-5" />
                        )}
                      </div>

                      {/* Goal info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className={`font-semibold text-sm ${isCompleted ? 'text-emerald-700 dark:text-emerald-400' : ''}`}>
                            {goal.title}
                          </h3>
                          <Badge
                            variant="secondary"
                            className={`text-xs px-1.5 py-0 rounded-md ${
                              goal.frequency === 'daily'
                                ? 'bg-blue-50/80 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border border-blue-100/50 dark:border-blue-800/30'
                                : 'bg-purple-50/80 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 border border-purple-100/50 dark:border-purple-800/30'
                            }`}
                          >
                            {goal.frequency === 'daily' ? t('goalDaily', language) : t('goalWeekly', language)}
                          </Badge>
                          {isCompleted && (
                            <Badge className="text-xs px-1.5 py-0 rounded-md bg-emerald-100/80 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/30">
                              {t('goalCompleted', language)}
                            </Badge>
                          )}
                        </div>

                        {/* Progress info */}
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-xs text-muted-foreground/70">
                            {t('goalProgress', language)}:
                          </span>
                          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                            {currentValue}
                          </span>
                          <span className="text-xs text-muted-foreground/60">/</span>
                          <span className="text-sm font-semibold text-foreground/80">
                            {goal.targetValue} {goal.unit}
                          </span>
                        </div>

                        {/* Controls row */}
                        <div className="flex items-center gap-2 mt-3">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDecrement(goal.id)}
                            disabled={currentValue <= 0}
                            className="h-8 w-8 rounded-lg border-emerald-200/60 dark:border-emerald-800/40 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-600 transition-all"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </Button>
                          <div className="flex-1 h-2.5 rounded-full bg-emerald-100/60 dark:bg-emerald-900/30 overflow-hidden">
                            <motion.div
                              className="h-full gradient-emerald rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${progress}%` }}
                              transition={{ duration: 0.4, ease: 'easeOut' }}
                            />
                          </div>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleIncrement(goal.id, goal.targetValue)}
                            disabled={isCompleted}
                            className="h-8 w-8 rounded-lg border-emerald-200/60 dark:border-emerald-800/40 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-600 transition-all"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </Button>
                        </div>

                        {/* Streak row */}
                        {streak > 0 && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex items-center gap-2 mt-2.5"
                          >
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-50/80 dark:bg-orange-950/20 border border-orange-100/50 dark:border-orange-800/20">
                              <Flame className="w-3.5 h-3.5 text-orange-500" />
                              <span className="text-xs font-bold text-orange-600 dark:text-orange-400">
                                {streak} {goal.frequency === 'daily' ? t('goalDays', language) : t('goalWeekStreak', language)}
                              </span>
                            </div>
                            {milestone && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50/80 dark:bg-amber-950/20 border border-amber-100/50 dark:border-amber-800/20"
                              >
                                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                                <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                                  {t('goalMilestone', language)}
                                </span>
                              </motion.div>
                            )}
                          </motion.div>
                        )}
                      </div>

                      {/* Delete button */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground/40 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-all shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-2xl">
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t('goalDelete', language)}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t('goalDeleteConfirm', language)}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-xl">{t('cancel', language)}</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => removeGoal(goal.id)}
                              className="bg-red-500 hover:bg-red-600 text-white rounded-xl"
                            >
                              {t('delete', language)}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Add Goal Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-500" />
              {t('addGoal', language)}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium">{t('goalName', language)}</Label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder={language === 'fr' ? "Ex: Boire 8 verres d'eau" : language === 'es' ? 'Ej: Beber 8 vasos de agua' : 'e.g. Drink 8 glasses of water'}
                className="mt-1.5 border-emerald-200/60 dark:border-emerald-800/40 focus-visible:ring-emerald-500/50 rounded-xl h-11"
                onKeyDown={(e) => e.key === 'Enter' && handleAddGoal()}
                autoFocus
              />
            </div>
            <div>
              <Label className="text-sm font-medium">{t('goalFrequency', language)}</Label>
              <Select value={newFrequency} onValueChange={(v) => setNewFrequency(v as 'daily' | 'weekly')}>
                <SelectTrigger className="mt-1.5 border-emerald-200/60 dark:border-emerald-800/40 rounded-xl h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">{t('goalDaily', language)}</SelectItem>
                  <SelectItem value="weekly">{t('goalWeekly', language)}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <Label className="text-sm font-medium">{t('goalTarget', language)}</Label>
                <Input
                  type="number"
                  value={newTarget}
                  onChange={(e) => setNewTarget(e.target.value)}
                  placeholder="8"
                  className="mt-1.5 border-emerald-200/60 dark:border-emerald-800/40 focus-visible:ring-emerald-500/50 rounded-xl h-11"
                  min="1"
                />
              </div>
              <div className="flex-1">
                <Label className="text-sm font-medium">{t('goalUnit', language)}</Label>
                <Input
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  placeholder={language === 'fr' ? 'verres' : language === 'es' ? 'vasos' : 'glasses'}
                  className="mt-1.5 border-emerald-200/60 dark:border-emerald-800/40 focus-visible:ring-emerald-500/50 rounded-xl h-11"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)} className="rounded-xl">
              {t('cancel', language)}
            </Button>
            <Button
              onClick={handleAddGoal}
              className="gradient-emerald hover:opacity-90 text-white rounded-xl"
            >
              {t('save', language)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
