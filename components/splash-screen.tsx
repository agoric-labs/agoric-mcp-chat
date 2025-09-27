"use client";

import { useEffect, useState } from "react";

interface SplashScreenProps {
  showTimer?: boolean;
}

export function SplashScreen({ showTimer = true }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!showTimer) return;
    
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, [showTimer]);

  if (!isVisible && showTimer) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background transition-opacity duration-500">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 mx-auto border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-muted-foreground">Loading your AI assistant...</p>
      </div>
    </div>
  );
}
