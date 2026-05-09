'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/useStore';
import { t, Language } from '@/lib/translations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ShoppingCart, Globe, AlertCircle, CheckCircle2, Leaf, Sparkles, Eye, EyeOff, Lock, Mail, User, Key } from 'lucide-react';

const LANG_FLAGS: Record<Language, string> = { fr: '🇫🇷', en: '🇬🇧', es: '🇪🇸' };
const LANG_NAMES: Record<Language, string> = { fr: 'Français', en: 'English', es: 'Español' };

export default function LoginPage() {
  const { language, setLanguage, login, signup, adminLogin } = useStore();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accessKey, setAccessKey] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const result = await login(email, password);
        if (result) {
          setSuccess(t('loginSuccess', language));
        } else {
          setError(t('invalidCredentials', language));
        }
      } else {
        // Signup validation
        if (!name.trim()) {
          setError(t('nameRequired', language));
          setLoading(false);
          return;
        }
        if (!password || password.length < 6) {
          setError(t('passwordMinLength', language));
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError(t('passwordMismatch', language));
          setLoading(false);
          return;
        }
        const result = await signup(email, name, password, accessKey);
        if (result) {
          setSuccess(t('signupSuccess', language));
        } else {
          setError(t('invalidAccessKey', language));
        }
      }
    } catch {
      setError(t('error', language));
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    setError('');
    setSuccess('');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-emerald-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Animated Background Decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Primary floating blobs */}
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-emerald-200/40 to-emerald-300/20 dark:from-emerald-900/25 dark:to-emerald-800/10 blur-3xl animate-float" />
        <div className="absolute -bottom-40 -left-40 w-[450px] h-[450px] rounded-full bg-gradient-to-tr from-terracotta-300/30 to-terracotta-200/20 dark:from-emerald-800/15 dark:to-teal-900/10 blur-3xl animate-float-slow" />
        <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] rounded-full bg-gradient-to-br from-terracotta-200/20 to-terracotta-100/15 dark:from-teal-900/10 dark:to-emerald-900/5 blur-3xl animate-float-delayed" />
        
        {/* Subtle decorative shapes */}
        <div className="absolute top-20 right-1/4 w-3 h-3 rounded-full bg-emerald-400/30 animate-pulse-soft" />
        <div className="absolute bottom-32 left-1/3 w-2 h-2 rounded-full bg-emerald-300/40 animate-pulse-soft" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 right-16 w-2.5 h-2.5 rounded-full bg-terracotta-400/25 animate-pulse-soft" style={{ animationDelay: '2s' }} />
        
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]" style={{
          backgroundImage: 'radial-gradient(circle, #c97c5d 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
      </div>

      {/* Language Selector - More prominent */}
      <div className="absolute top-4 right-4 z-10">
        <div className="relative">
          <button
            onClick={() => setShowLangMenu(!showLangMenu)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass shadow-sm hover:shadow-md transition-all duration-300 border border-emerald-200/30 dark:border-emerald-800/30 hover:border-emerald-300/50 dark:hover:border-emerald-700/50"
          >
            <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-lg">{LANG_FLAGS[language]}</span>
            <span className="text-sm font-medium hidden sm:inline">{LANG_NAMES[language]}</span>
          </button>
          <AnimatePresence>
            {showLangMenu && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className="absolute right-0 mt-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-xl shadow-xl border border-emerald-200/30 dark:border-emerald-800/30 overflow-hidden z-50 min-w-[160px]"
              >
                {(['fr', 'en', 'es'] as Language[]).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => {
                      setLanguage(lang);
                      setShowLangMenu(false);
                    }}
                    className={`flex items-center gap-3 px-4 py-3 w-full text-sm hover:bg-emerald-50/80 dark:hover:bg-emerald-900/30 transition-colors ${
                      language === lang ? 'bg-emerald-50/80 dark:bg-emerald-900/20 font-semibold text-emerald-700 dark:text-emerald-400' : ''
                    }`}
                  >
                    <span className="text-lg">{LANG_FLAGS[lang]}</span>
                    <span className="font-medium">{LANG_NAMES[lang]}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 180, damping: 12 }}
            className="relative inline-block mb-5"
          >
            {/* Glow ring behind logo */}
            <div className="absolute inset-0 rounded-2xl bg-emerald-500/20 blur-xl animate-glow" />
            {/* Logo container */}
            <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-2xl gradient-emerald shadow-emerald-lg">
              <ShoppingCart className="w-10 h-10 text-white drop-shadow-sm" />
              {/* Sparkle accent */}
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-300 flex items-center justify-center shadow-md">
                <Sparkles className="w-3 h-3 text-emerald-800" />
              </div>
            </div>
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="text-3xl font-extrabold text-gradient-emerald"
          >
            Le Meilleur Panier
          </motion.h1>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1 mt-2 rounded-full bg-emerald-100/80 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold tracking-wide">
              <Leaf className="w-3 h-3" />
              2.0
            </span>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="text-muted-foreground text-sm mt-3"
          >
            {t('appDescription', language)}
          </motion.p>
        </div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <Card className="glass-card border-0 shadow-2xl shadow-emerald-500/8 dark:shadow-black/30 rounded-2xl overflow-hidden">
            {/* Shimmer accent line */}
            <div className="h-1 w-full gradient-emerald opacity-80" />
            
            <CardHeader className="pb-4 pt-5">
              {/* Tabs */}
              <div className="flex rounded-xl bg-emerald-50/80 dark:bg-emerald-950/50 p-1 border border-emerald-100/50 dark:border-emerald-900/30">
                <button
                  onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
                  className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-300 ${
                    mode === 'login'
                      ? 'bg-white dark:bg-gray-800 shadow-md shadow-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t('login', language)}
                </button>
                <button
                  onClick={() => { setMode('signup'); setError(''); setSuccess(''); }}
                  className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-300 ${
                    mode === 'signup'
                      ? 'bg-white dark:bg-gray-800 shadow-md shadow-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t('signup', language)}
                </button>
              </div>
              <CardTitle className="text-center text-lg mt-4">
                {mode === 'login' ? t('loginSubtitle', language) : t('signupSubtitle', language)}
              </CardTitle>
            </CardHeader>

            <CardContent className="pb-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name field - signup only */}
                <AnimatePresence>
                  {mode === 'signup' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-1.5"
                    >
                      <Label htmlFor="name" className="text-sm font-medium text-foreground/80">
                        {t('name', language)}
                      </Label>
                      <div className="relative">
                        <Input
                          id="name"
                          type="text"
                          placeholder={t('name', language)}
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="border-emerald-200/60 dark:border-emerald-800/40 focus-visible:ring-emerald-500/50 bg-white/50 dark:bg-gray-800/50 rounded-xl h-11 pl-10 transition-all duration-300 focus:bg-white dark:focus:bg-gray-800"
                        />
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Email field */}
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm font-medium text-foreground/80">
                    {t('email', language)}
                  </Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      placeholder="email@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="border-emerald-200/60 dark:border-emerald-800/40 focus-visible:ring-emerald-500/50 bg-white/50 dark:bg-gray-800/50 rounded-xl h-11 pl-10 transition-all duration-300 focus:bg-white dark:focus:bg-gray-800"
                    />
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                  </div>
                </div>

                {/* Password field */}
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-sm font-medium text-foreground/80">
                    {t('password', language)}
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder={t('password', language)}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="border-emerald-200/60 dark:border-emerald-800/40 focus-visible:ring-emerald-500/50 bg-white/50 dark:bg-gray-800/50 rounded-xl h-11 pl-10 pr-10 transition-all duration-300 focus:bg-white dark:focus:bg-gray-800"
                    />
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password - signup only */}
                <AnimatePresence>
                  {mode === 'signup' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-1.5"
                    >
                      <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground/80">
                        {t('confirmPassword', language)}
                      </Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder={t('confirmPassword', language)}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          className="border-emerald-200/60 dark:border-emerald-800/40 focus-visible:ring-emerald-500/50 bg-white/50 dark:bg-gray-800/50 rounded-xl h-11 pl-10 pr-10 transition-all duration-300 focus:bg-white dark:focus:bg-gray-800"
                        />
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Access Key - signup only */}
                <AnimatePresence>
                  {mode === 'signup' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-1.5"
                    >
                      <Label htmlFor="accessKey" className="text-sm font-medium text-foreground/80">
                        {t('accessKey', language)}
                      </Label>
                      <div className="relative">
                        <Input
                          id="accessKey"
                          type="text"
                          placeholder="XXXXXXXXX"
                          value={accessKey}
                          onChange={(e) => setAccessKey(e.target.value.toUpperCase())}
                          required
                          className="border-emerald-200/60 dark:border-emerald-800/40 focus-visible:ring-emerald-500/50 bg-white/50 dark:bg-gray-800/50 rounded-xl h-11 pl-10 font-mono tracking-wider transition-all duration-300 focus:bg-white dark:focus:bg-gray-800"
                          maxLength={10}
                        />
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Error/Success Messages */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className="flex items-center gap-2 p-3 rounded-xl bg-red-50/80 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-sm border border-red-200/50 dark:border-red-800/30"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {error}
                    </motion.div>
                  )}
                  {success && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-sm border border-emerald-200/50 dark:border-emerald-800/30"
                    >
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      {success}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit Button */}
                <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full gradient-emerald hover:opacity-90 text-white shadow-emerald-lg h-12 rounded-xl text-base font-semibold transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/30"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        {t('loading', language)}
                      </div>
                    ) : mode === 'login' ? (
                      t('loginButton', language)
                    ) : (
                      t('signupButton', language)
                    )}
                  </Button>
                </motion.div>

                {/* Switch mode */}
                <div className="text-center text-sm text-muted-foreground pt-1">
                  {mode === 'login' ? t('noAccount', language) : t('hasAccount', language)}{' '}
                  <button
                    type="button"
                    onClick={switchMode}
                    className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-semibold hover:underline underline-offset-2 transition-colors"
                  >
                    {mode === 'login' ? t('signup', language) : t('login', language)}
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="text-center text-xs text-muted-foreground/60 mt-6"
        >
          Le Meilleur Panier 2.0 &copy; 2024
        </motion.p>
      </motion.div>
    </div>
  );
}
