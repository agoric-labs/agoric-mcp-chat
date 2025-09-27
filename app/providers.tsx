"use client";

import { ReactNode, useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ThemeProvider } from "@/components/theme-provider";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useLocalStorage } from "@/lib/hooks/use-local-storage";
import { STORAGE_KEYS } from "@/lib/constants";
import { MCPProvider } from "@/lib/context/mcp-context";

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: true,
    },
  },
});

function ThemeWrapper({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useLocalStorage<boolean>(
    STORAGE_KEYS.SIDEBAR_STATE,
    false
  );
  
  const searchParams = useSearchParams();
  const themeParam = decodeURIComponent(searchParams.get("theme") || '');
  
  // Available themes
  const availableThemes = ["light", "dark", "sunset", "black", "dark-blue", "agoric-theme", "ymax"];
  
  // Use theme from query param if valid, otherwise default to dark-blue
  const defaultTheme = themeParam && availableThemes.includes(themeParam) ? themeParam : "dark-blue";

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme={defaultTheme}
      enableSystem={true}
      disableTransitionOnChange
      themes={availableThemes}
      forcedTheme={themeParam && availableThemes.includes(themeParam) ? themeParam : undefined}
    >
      <MCPProvider>
        <SidebarProvider defaultOpen={sidebarOpen} open={sidebarOpen} onOpenChange={setSidebarOpen}>
          {children}
          <Toaster position="top-center" richColors />
        </SidebarProvider>
      </MCPProvider>
    </ThemeProvider>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>}>
        <ThemeWrapper>{children}</ThemeWrapper>
      </Suspense>
    </QueryClientProvider>
  );
} 