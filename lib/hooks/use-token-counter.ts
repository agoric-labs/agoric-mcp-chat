import { useState, useEffect, useMemo } from 'react';
import { type UIMessage } from '@ai-sdk/react';
import { estimateTokens } from '@/lib/context-manager';
import { MODEL_CONTEXT_LIMITS, TOKEN_THRESHOLDS } from '@/lib/constants';
import { type modelID } from '@/ai/providers';

export interface TokenCounterState {
  /** Percentage of context window used (0-100) */
  usagePercent: number;
  /** Warning level: 'safe' | 'info' | 'warning' | 'critical' */
  warningLevel: 'safe' | 'info' | 'warning' | 'critical';
  /** Color for UI display */
  displayColor: string;
  /** Formatted display string (e.g., "45%") */
  displayText: string;
}

/**
 * Hook to track token usage in the current conversation
 * Provides real-time token counting with visual warning levels
 */
export function useTokenCounter(
  messages: UIMessage[],
  selectedModel: modelID,
  systemPromptTokens: number = 0
): TokenCounterState {
  const [totalTokens, setTotalTokens] = useState(0);

  // Get max tokens for current model
  const maxTokens = useMemo(() => {
    return MODEL_CONTEXT_LIMITS[selectedModel] || 200_000; // Default to 200k if model not found
  }, [selectedModel]);

  // Calculate token count (debounced to avoid excessive computation)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const messagesString = JSON.stringify(messages);
      const messageTokens = estimateTokens(messagesString);

      setTotalTokens(messageTokens + systemPromptTokens);
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [messages, systemPromptTokens]);

  // Calculate derived state
  const state = useMemo((): TokenCounterState => {
    const usageRatio = maxTokens > 0 ? totalTokens / maxTokens : 0;
    const usagePercent = Math.round(usageRatio * 100);

    // Determine warning level
    let warningLevel: TokenCounterState['warningLevel'] = 'safe';
    let displayColor = 'text-green-600 dark:text-green-400';

    if (usageRatio >= TOKEN_THRESHOLDS.CRITICAL) {
      warningLevel = 'critical';
      displayColor = 'text-red-600 dark:text-red-400';
    } else if (usageRatio >= TOKEN_THRESHOLDS.WARNING) {
      warningLevel = 'warning';
      displayColor = 'text-orange-600 dark:text-orange-400';
    } else if (usageRatio >= TOKEN_THRESHOLDS.INFO) {
      warningLevel = 'info';
      displayColor = 'text-yellow-600 dark:text-yellow-400';
    }

    const displayText = `${usagePercent}%`;

    return {
      usagePercent,
      warningLevel,
      displayColor,
      displayText,
    };
  }, [totalTokens, maxTokens]);

  return state;
}
