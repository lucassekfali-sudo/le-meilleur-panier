'use client';

import React from 'react';
import { useStore } from '@/lib/useStore';
import { t, Language } from '@/lib/translations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { isFirebaseConfigured } from '@/lib/firebase';
import {
  Globe,
  Moon,
  Sun,
  Download,
  RefreshCw,
  User,
  Info,
  Wifi,
  WifiOff,
  Shield,
} from 'lucide-react';

const LANG_FLAGS: Record<Language, string> = { fr: '🇫🇷', en: '🇬🇧', es: '🇪🇸' };
const LANG_NAMES: Record<Language, string> = { fr: 'Français', en: 'English', es: 'Español' };

export default function SettingsPage() {
  const { language, setLanguage, theme, setTheme, user, isAdmin, syncFromFirebase, syncToFirebase } = useStore();
  const [installPrompt, setInstallPrompt] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [syncing, setSyncing] = React.useState(false);

  React.useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const result = await installPrompt.userChoice;
    if (result.outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncFromFirebase();
      await syncToFirebase();
    } catch (e) {
      console.error('Sync error:', e);
    }
    setSyncing(false);
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      {/* Language */}
      <Card className="border-emerald-200/50 dark:border-emerald-800/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Globe className="w-5 h-5 text-emerald-500" />
            {t('language', language)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {(['fr', 'en', 'es'] as Language[]).map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`flex items-center gap-3 w-full p-3 rounded-lg transition-all ${
                  language === lang
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-300 dark:border-emerald-700'
                    : 'bg-gray-50 dark:bg-gray-800/50 border-2 border-transparent hover:border-emerald-200 dark:hover:border-emerald-800'
                }`}
              >
                <span className="text-2xl">{LANG_FLAGS[lang]}</span>
                <span className={`text-sm font-medium ${language === lang ? 'text-emerald-700 dark:text-emerald-400' : ''}`}>
                  {LANG_NAMES[lang]}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Theme */}
      <Card className="border-emerald-200/50 dark:border-emerald-800/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            {theme === 'dark' ? (
              <Moon className="w-5 h-5 text-emerald-500" />
            ) : (
              <Sun className="w-5 h-5 text-emerald-500" />
            )}
            {t('theme', language)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sun className="w-4 h-4 text-muted-foreground" />
              <Label htmlFor="theme-switch" className="text-sm">
                {t('darkMode', language)}
              </Label>
              <Moon className="w-4 h-4 text-muted-foreground" />
            </div>
            <Switch
              id="theme-switch"
              checked={theme === 'dark'}
              onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
            />
          </div>
        </CardContent>
      </Card>

      {/* PWA Install */}
      <Card className="border-emerald-200/50 dark:border-emerald-800/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Download className="w-5 h-5 text-emerald-500" />
            {t('installApp', language)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {installPrompt ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {t('installPromptDesc', language)}
              </p>
              <Button
                onClick={handleInstall}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                <Download className="w-4 h-4 mr-2" />
                {t('installNow', language)}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t('aboutDesc', language)}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Sync & Refresh */}
      <Card className="border-emerald-200/50 dark:border-emerald-800/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <RefreshCw className={`w-5 h-5 text-emerald-500 ${syncing ? 'animate-spin' : ''}`} />
            {t('refreshPage', language)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-3">
            {isFirebaseConfigured() ? (
              <>
                <Wifi className="w-4 h-4 text-emerald-500" />
                <span className="text-sm text-emerald-700 dark:text-emerald-400">Firebase connecté</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-orange-500" />
                <span className="text-sm text-orange-600 dark:text-orange-400">
                  {t('firebaseNotConfigured', language)}
                </span>
              </>
            )}
          </div>
          <div className="flex gap-2">
            {isFirebaseConfigured() && (
              <Button
                onClick={handleSync}
                disabled={syncing}
                variant="outline"
                className="flex-1 border-emerald-200 dark:border-emerald-800 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                Sync Firebase
              </Button>
            )}
            <Button
              onClick={handleRefresh}
              variant="outline"
              className="flex-1 border-emerald-200 dark:border-emerald-800"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {t('refreshPage', language)}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Account Info */}
      {user && (
        <Card className="border-emerald-200/50 dark:border-emerald-800/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="w-5 h-5 text-emerald-500" />
              {t('accountInfo', language)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('name', language)}</span>
                <span className="font-medium">{user.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('email', language)}</span>
                <span className="font-medium">{user.email}</span>
              </div>
              <Separator className="my-2" />
              {isAdmin && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">
                    Admin
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* About */}
      <Card className="border-emerald-200/50 dark:border-emerald-800/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Info className="w-5 h-5 text-emerald-500" />
            {t('about', language)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t('aboutDesc', language)}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            {t('version', language)}: 2.0.0
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Type for beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
