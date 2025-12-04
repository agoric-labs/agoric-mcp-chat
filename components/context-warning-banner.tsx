"use client";

import { AlertTriangle, MessageSquarePlus, X } from "lucide-react";
import { useState } from "react";
import { TokenWarningLevel } from "@/lib/constants";

interface ContextWarningBannerProps {
  warningLevel: TokenWarningLevel;
  usagePercent: number;
  onStartNewChat: () => void;
}

export function ContextWarningBanner({
  warningLevel,
  usagePercent,
  onStartNewChat
}: Readonly<ContextWarningBannerProps>) {
  const [dismissed, setDismissed] = useState(false);

  if (warningLevel === TokenWarningLevel.SAFE || dismissed) {
    return null;
  }

  const isBlocked = warningLevel === TokenWarningLevel.BLOCKED;
  const message = isBlocked
    ? 'Context is full'
    : 'Context usage is high';

  return (
    <div className="bg-muted/50 border border-border rounded-lg px-3 py-2 mb-2 flex items-center justify-between gap-3 text-sm">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <AlertTriangle
          className={`h-4 w-4 flex-shrink-0 ${
            isBlocked
              ? 'text-destructive'
              : 'text-muted-foreground'
          }`}
        />
        <span className="text-muted-foreground">
          {message}
        </span>
        {!isBlocked && (
          <span className="text-foreground font-medium tabular-nums">
            {usagePercent}%
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={onStartNewChat}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <MessageSquarePlus className="h-3 w-3" />
          New Chat
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="text-muted-foreground hover:text-foreground transition-colors p-1"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
