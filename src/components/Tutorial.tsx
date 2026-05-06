'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/useStore';
import { t } from '@/lib/translations';
import { Button } from '@/components/ui/button';
import { ShoppingCart, ListPlus, Package, Wallet, BarChart3, Download, X } from 'lucide-react';

const TUTORIAL_STEPS = [
  { icon: ShoppingCart, titleKey: 'tutWelcome', descKey: 'tutWelcomeDesc', emoji: '👋' },
  { icon: ListPlus, titleKey: 'tutCreateList', descKey: 'tutCreateListDesc', emoji: '📝' },
  { icon: Package, titleKey: 'tutAddItems', descKey: 'tutAddItemsDesc', emoji: '🛒' },
  { icon: Wallet, titleKey: 'tutBudget', descKey: 'tutBudgetDesc', emoji: '💰' },
  { icon: BarChart3, titleKey: 'tutCompare', descKey: 'tutCompareDesc', emoji: '📊' },
  { icon: Download, titleKey: 'tutInstall', descKey: 'tutInstallDesc', emoji: '📲' },
];

export default function Tutorial() {
  const { language, dismissTutorial } = useStore();
  const [currentStep, setCurrentStep] = useState(0);
  const step = TUTORIAL_STEPS[currentStep];

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      dismissTutorial();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
      >
        {/* Skip button */}
        <div className="flex justify-end p-3">
          <button
            onClick={dismissTutorial}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="px-8 pb-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="text-center"
            >
              {/* Emoji & Icon */}
              <div className="text-5xl mb-4">{step.emoji}</div>
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 mb-4">
                <step.icon className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
              </div>

              {/* Step number */}
              <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-2">
                {currentStep + 1} / {TUTORIAL_STEPS.length}
              </div>

              {/* Title */}
              <h3 className="text-xl font-bold text-foreground mb-3">
                {t(step.titleKey, language)}
              </h3>

              {/* Description */}
              <p className="text-muted-foreground text-sm leading-relaxed">
                {t(step.descKey, language)}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Dots indicator */}
          <div className="flex justify-center gap-2 mt-6 mb-6">
            {TUTORIAL_STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentStep(i)}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === currentStep
                    ? 'w-6 bg-emerald-500'
                    : 'bg-gray-300 dark:bg-gray-600 hover:bg-emerald-300'
                }`}
              />
            ))}
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            {currentStep > 0 ? (
              <Button
                variant="outline"
                onClick={handlePrevious}
                className="flex-1 border-emerald-200 dark:border-emerald-800"
              >
                {t('previous', language)}
              </Button>
            ) : (
              <Button
                variant="ghost"
                onClick={dismissTutorial}
                className="flex-1 text-muted-foreground"
              >
                {t('skip', language)}
              </Button>
            )}
            <Button
              onClick={handleNext}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {currentStep === TUTORIAL_STEPS.length - 1
                ? t('finish', language)
                : t('next', language)}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
