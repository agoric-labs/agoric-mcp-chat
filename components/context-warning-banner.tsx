"use client";

import { AlertTriangle, MessageSquarePlus, X } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface ContextWarningBannerProps {
  warningLevel: 'safe' | 'info' | 'warning' | 'critical';
  usagePercent: number;
}

export function ContextWarningBanner({
  warningLevel,
  usagePercent
}: ContextWarningBannerProps) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  // Don't show banner for safe level or if dismissed
  if (warningLevel === 'safe' || dismissed) {
    return null;
  }

  const handleStartNewChat = () => {
    router.push('/');
  };

  // Determine banner styling based on warning level
  const getBannerStyles = () => {
    switch (warningLevel) {
      case 'info':
        return {
          bg: 'bg-yellow-50 dark:bg-yellow-950/20',
          border: 'border-yellow-200 dark:border-yellow-800',
          text: 'text-yellow-900 dark:text-yellow-100',
          icon: 'text-yellow-600 dark:text-yellow-400',
        };
      case 'warning':
        return {
          bg: 'bg-orange-50 dark:bg-orange-950/20',
          border: 'border-orange-200 dark:border-orange-800',
          text: 'text-orange-900 dark:text-orange-100',
          icon: 'text-orange-600 dark:text-orange-400',
        };
      case 'critical':
        return {
          bg: 'bg-red-50 dark:bg-red-950/20',
          border: 'border-red-200 dark:border-red-800',
          text: 'text-red-900 dark:text-red-100',
          icon: 'text-red-600 dark:text-red-400',
        };
      default:
        return {
          bg: 'bg-gray-50 dark:bg-gray-950/20',
          border: 'border-gray-200 dark:border-gray-800',
          text: 'text-gray-900 dark:text-gray-100',
          icon: 'text-gray-600 dark:text-gray-400',
        };
    }
  };

  const getMessage = () => {
    switch (warningLevel) {
      case 'info':
        return 'Context usage is getting high. Consider starting a new chat soon.';
      case 'warning':
        return 'Context usage is high. Starting a new chat is recommended.';
      case 'critical':
        return 'Context nearly full. Please start a new chat to continue effectively.';
      default:
        return '';
    }
  };

  const styles = getBannerStyles();
  const message = getMessage();

  return (
    <div
      className={`${styles.bg} ${styles.border} border rounded-lg p-3 mb-3 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300`}
    >
      <AlertTriangle className={`h-5 w-5 ${styles.icon} flex-shrink-0 mt-0.5`} />

      <div className="flex-1 min-w-0">
        <p className={`text-sm ${styles.text} font-medium mb-2`}>
          {message}
        </p>
        <p className={`text-xs ${styles.text} opacity-80 mb-3`}>
          Current usage: {usagePercent}%
        </p>

        <button
          onClick={handleStartNewChat}
          className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            warningLevel === 'critical'
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-primary hover:bg-primary/90 text-primary-foreground'
          }`}
        >
          <MessageSquarePlus className="h-4 w-4" />
          Start New Chat
        </button>
      </div>

      <button
        onClick={() => setDismissed(true)}
        className={`${styles.icon} hover:opacity-70 transition-opacity flex-shrink-0`}
        aria-label="Dismiss warning"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
