'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/lib/useStore';
import { t } from '@/lib/translations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { isFirebaseConfigured } from '@/lib/firebase';
import { Users, Key, BarChart3, Plus, Trash2, AlertTriangle, Wifi, WifiOff, RefreshCw, Shield, Activity } from 'lucide-react';
import AdminProductsTable from './AdminProductsTable';

export default function AdminPanel() {
  const { allUsers, accessKeys, loadAdminData, createAccessKey, deleteUser, language, shoppingLists } = useStore();
  const [activeTab, setActiveTab] = useState<'users' | 'keys' | 'products'>('users');
  const [newKey, setNewKey] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  const handleRefresh = async () => {
    setLoading(true);
    await loadAdminData();
    setLoading(false);
  };

  const handleCreateKey = () => {
    if (!newKey.trim()) return;
    createAccessKey(newKey.trim().toUpperCase());
    setNewKey('');
  };

  const handleDeleteUser = async (userId: string) => {
    await deleteUser(userId);
  };

  const totalActiveKeys = accessKeys.filter((k) => k.active).length;
  const totalUsedKeys = accessKeys.filter((k) => !k.active).length;

  // Calculate total lists across all users
  const allListsCount = allUsers.reduce((acc, user) => {
    return acc + (user.id === useStore.getState().user?.id ? shoppingLists.length : 0);
  }, 0);

  const firebaseConfigured = isFirebaseConfigured();

  return (
    <div className="space-y-6">
      {/* Firebase Status */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className={`overflow-hidden rounded-2xl border-0 ${
          firebaseConfigured 
            ? 'bg-gradient-to-r from-emerald-50/90 to-emerald-100/50 dark:from-emerald-950/40 dark:to-emerald-900/20 shadow-emerald' 
            : 'bg-gradient-to-r from-orange-50/90 to-amber-50/50 dark:from-orange-950/30 dark:to-amber-950/20 shadow-md'
        }`}>
          <div className={`h-1 ${firebaseConfigured ? 'gradient-emerald' : 'bg-gradient-to-r from-orange-400 to-amber-400'}`} />
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  firebaseConfigured 
                    ? 'bg-emerald-100 dark:bg-emerald-900/40' 
                    : 'bg-orange-100 dark:bg-orange-900/40'
                }`}>
                  {firebaseConfigured ? (
                    <Wifi className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <WifiOff className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    {firebaseConfigured ? (
                      <span className="text-sm text-emerald-700 dark:text-emerald-400 font-semibold">
                        Firebase connecté
                      </span>
                    ) : (
                      <span className="text-sm text-orange-700 dark:text-orange-400 font-semibold">
                        {t('firebaseNotConfigured', language)}
                      </span>
                    )}
                    <Activity className={`w-3.5 h-3.5 ${firebaseConfigured ? 'text-emerald-500 animate-pulse-soft' : 'text-orange-500'}`} />
                  </div>
                  {firebaseConfigured && (
                    <span className="text-xs text-emerald-600/60 dark:text-emerald-500/60">
                      Synchronisation active
                    </span>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={loading}
                className="text-emerald-600 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/30 rounded-xl transition-all"
              >
                <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Users, count: allUsers.length, label: t('totalUsers', language), color: 'emerald', gradient: 'from-emerald-500 to-emerald-600' },
          { icon: Key, count: totalActiveKeys, label: t('activeKeys', language), color: 'emerald', gradient: 'from-teal-500 to-emerald-500' },
          { icon: Key, count: totalUsedKeys, label: t('usedKeys', language), color: 'orange', gradient: 'from-amber-500 to-orange-500' },
          { icon: BarChart3, count: allListsCount, label: t('totalLists', language), color: 'blue', gradient: 'from-emerald-400 to-teal-500' },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08, duration: 0.3 }}
          >
            <Card className="border-0 rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden group">
              <div className={`h-1 bg-gradient-to-r ${stat.gradient} opacity-60 group-hover:opacity-100 transition-opacity`} />
              <CardContent className="p-4 text-center">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.gradient} opacity-10 flex items-center justify-center mx-auto mb-2.5`}>
                  <stat.icon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="text-2xl font-extrabold text-foreground">{stat.count}</div>
                <div className="text-xs text-muted-foreground/70 mt-0.5 font-medium">{stat.label}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 p-1 border border-emerald-100/50 dark:border-emerald-900/30">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-300 ${
            activeTab === 'users'
              ? 'bg-white dark:bg-gray-800 shadow-md shadow-emerald-500/10 text-emerald-700 dark:text-emerald-400'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="w-4 h-4" />
          {t('adminUsers', language)} ({allUsers.length})
        </button>
        <button
          onClick={() => setActiveTab('keys')}
          className={`flex items-center gap-2 flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-300 ${
            activeTab === 'keys'
              ? 'bg-white dark:bg-gray-800 shadow-md shadow-emerald-500/10 text-emerald-700 dark:text-emerald-400'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Key className="w-4 h-4" />
          {t('adminKeys', language)} ({accessKeys.length})
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-300 ${
            activeTab === 'products'
              ? 'bg-white dark:bg-gray-800 shadow-md shadow-emerald-500/10 text-emerald-700 dark:text-emerald-400'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <span className="text-base">🏷️</span>
          {t('manageProducts', language)}
        </button>
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-0 rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-md overflow-hidden">
            <div className="h-1 w-full gradient-emerald opacity-40" />
            <CardHeader className="pb-3 pt-5">
              <CardTitle className="text-lg flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-emerald-500" />
                </div>
                {t('adminUsers', language)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {allUsers.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-8">
                  <Users className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                  Aucun utilisateur inscrit
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-emerald-100/50 dark:border-emerald-800/20">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20">
                        <TableHead className="text-xs font-semibold">{t('email', language)}</TableHead>
                        <TableHead className="text-xs font-semibold">{t('name', language)}</TableHead>
                        <TableHead className="text-xs font-semibold hidden sm:table-cell">{t('signupDate', language)}</TableHead>
                        <TableHead className="text-xs font-semibold hidden md:table-cell">{t('lastLoginDate', language)}</TableHead>
                        <TableHead className="text-xs font-semibold text-right">{t('delete', language)}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allUsers.map((user, index) => (
                        <TableRow key={user.id} className="transition-colors hover:bg-emerald-50/30 dark:hover:bg-emerald-950/15">
                          <TableCell className="text-sm font-mono font-medium">{user.email}</TableCell>
                          <TableCell className="text-sm">{user.name}</TableCell>
                          <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground hidden md:table-cell">
                            {new Date(user.lastLogin).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-all">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="rounded-2xl">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-red-500" />
                                    {t('deleteUser', language)}
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {t('deleteUserConfirm', language)} ({user.email})
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="rounded-xl">{t('cancel', language)}</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteUser(user.id)}
                                    className="bg-red-500 hover:bg-red-600 text-white rounded-xl"
                                  >
                                    {t('delete', language)}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Keys Tab */}
      {activeTab === 'keys' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-0 rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-md overflow-hidden">
            <div className="h-1 w-full gradient-emerald opacity-40" />
            <CardHeader className="pb-3 pt-5">
              <CardTitle className="text-lg flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
                  <Key className="w-4 h-4 text-emerald-500" />
                </div>
                {t('adminKeys', language)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Create new key */}
              <div className="flex gap-2 mb-5">
                <Input
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value.toUpperCase())}
                  placeholder={t('newKey', language)}
                  className="border-emerald-200/60 dark:border-emerald-800/40 focus-visible:ring-emerald-500/50 font-mono rounded-xl h-11 bg-white/50 dark:bg-gray-800/50"
                  maxLength={10}
                />
                <Button
                  onClick={handleCreateKey}
                  className="gradient-emerald hover:opacity-90 text-white shrink-0 rounded-xl shadow-emerald transition-all duration-300"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  {t('createKey', language)}
                </Button>
              </div>

              {/* Keys list */}
              <div className="overflow-x-auto rounded-xl border border-emerald-100/50 dark:border-emerald-800/20">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20">
                      <TableHead className="text-xs font-semibold">{t('accessKey', language)}</TableHead>
                      <TableHead className="text-xs font-semibold">{t('keyStatus', language)}</TableHead>
                      <TableHead className="text-xs font-semibold hidden sm:table-cell">{t('email', language)}</TableHead>
                      <TableHead className="text-xs font-semibold hidden md:table-cell">{t('lastLoginDate', language)}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accessKeys.map((key) => (
                      <TableRow key={key.key} className="transition-colors hover:bg-emerald-50/30 dark:hover:bg-emerald-950/15">
                        <TableCell className="font-mono text-sm font-semibold">{key.key}</TableCell>
                        <TableCell>
                          <Badge
                            variant={key.active ? 'default' : 'secondary'}
                            className={`${key.active 
                              ? 'bg-emerald-100/80 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-700/30' 
                              : 'bg-gray-100/80 text-gray-500 dark:bg-gray-800/80 dark:text-gray-400 border border-gray-200/50 dark:border-gray-700/30'
                            } rounded-lg px-2.5 py-0.5 font-medium`}
                          >
                            {key.active ? t('keyActive', language) : t('keyUsed', language)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">
                          {key.usedBy || '-'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground hidden md:table-cell">
                          {key.usedAt ? new Date(key.usedAt).toLocaleDateString() : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Products Tab */}
      {activeTab === 'products' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <AdminProductsTable />
        </motion.div>
      )}
    </div>
  );
}
