'use client';

import React, { useEffect } from 'react';
import { useStore } from '@/lib/useStore';
import LoginPage from '@/components/LoginPage';
import ShoppingListPage from '@/components/ShoppingListPage';
import Tutorial from '@/components/Tutorial';
import PWARegister from '@/components/PWARegister';

export default function Home() {
  const { user, isAdmin, showTutorial, syncFromFirebase, theme, setTheme, initFirebase, firebaseInitialized } = useStore();

  // Initialize Firebase on mount
  useEffect(() => {
    initFirebase();
  }, [initFirebase]);

  // Apply theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('le-meilleur-panier-storage');
    if (savedTheme) {
      try {
        const parsed = JSON.parse(savedTheme);
        const storedTheme = parsed?.state?.theme;
        if (storedTheme === 'dark') {
          document.documentElement.classList.add('dark');
          setTheme('dark');
        } else {
          document.documentElement.classList.remove('dark');
          setTheme('light');
        }
      } catch {
        // ignore
      }
    }
  }, [setTheme]);

  // Sync from Firebase on login
  useEffect(() => {
    if (user && firebaseInitialized) {
      syncFromFirebase();
    }
  }, [user, firebaseInitialized, syncFromFirebase]);

  // Watch theme changes
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  if (!user) {
    return <LoginPage />;
  }

  return (
    <>
      <ShoppingListPage />
      {showTutorial && <Tutorial />}
      <PWARegister />
    </>
  );
}
