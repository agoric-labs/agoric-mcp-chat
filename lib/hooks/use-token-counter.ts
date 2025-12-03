import { useMemo } from 'react';
import { MODEL_CONTEXT_LIMITS, TOKEN_THRESHOLDS } from '@/lib/constants';
import { type modelID } from '@/ai/providers';

export interface TokenCounterState {
  usagePercent: number;
  warningLevel: 'safe' | 'warning' | 'blocked';
  displayColor: string;
  displayText: string;
  currentTokens: number;
  maxTokens: number;
  tooltipText: string;
}

export function useTokenCounter(
  selectedModel: modelID,
  tokens?: number
): TokenCounterState {
  const maxTokens = useMemo(() => {
    return MODEL_CONTEXT_LIMITS[selectedModel] || 200_000;
  }, [selectedModel]);

  return useMemo((): TokenCounterState => {
    const currentTokens = tokens ?? 0;
    const usageRatio = maxTokens > 0 ? currentTokens / maxTokens : 0;
    const usagePercent = Math.round(usageRatio * 100);

    let warningLevel: TokenCounterState['warningLevel'] = 'safe';
    let displayColor = 'text-green-600 dark:text-green-400';

    if (usageRatio >= TOKEN_THRESHOLDS.BLOCK) {
      warningLevel = 'blocked';
      displayColor = 'text-red-600 dark:text-red-400';
    } else if (usageRatio >= TOKEN_THRESHOLDS.WARNING) {
      warningLevel = 'warning';
      displayColor = 'text-orange-600 dark:text-orange-400';
    }

    const displayText = tokens === undefined ? '—' : `${usagePercent}%`;

    const formattedCurrent = currentTokens >= 1000
      ? `${(currentTokens / 1000).toFixed(0)}k`
      : currentTokens.toString();
    const formattedMax = maxTokens >= 1000
      ? `${(maxTokens / 1000).toFixed(0)}k`
      : maxTokens.toString();
    const tooltipText = tokens === undefined
      ? 'Context usage'
      : `${usagePercent}% - ${formattedCurrent}/${formattedMax} context used`;

    return {
      usagePercent,
      warningLevel,
      displayColor,
      displayText,
      currentTokens,
      maxTokens,
      tooltipText,
    };
  }, [tokens, maxTokens]);
}
