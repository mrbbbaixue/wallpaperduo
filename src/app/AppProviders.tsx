import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { PropsWithChildren } from "react";

import { useSettingsStore } from "@/store/useSettingsStore";
import { Toaster } from "@/components/ui/toaster";

const queryClient = new QueryClient();
const systemThemeQuery = "(prefers-color-scheme: dark)";

const getSystemThemeMode = (): "light" | "dark" => {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "light";
  }
  return window.matchMedia(systemThemeQuery).matches ? "dark" : "light";
};

export const AppProviders = ({ children }: PropsWithChildren) => {
  const themeMode = useSettingsStore((state) => state.themeMode);
  const [systemThemeMode, setSystemThemeMode] = useState<"light" | "dark">(getSystemThemeMode);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;

    const mediaQuery = window.matchMedia(systemThemeQuery);
    const syncSystemTheme = () => {
      setSystemThemeMode(mediaQuery.matches ? "dark" : "light");
    };

    syncSystemTheme();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", syncSystemTheme);
      return () => mediaQuery.removeEventListener("change", syncSystemTheme);
    }

    mediaQuery.addListener(syncSystemTheme);
    return () => mediaQuery.removeListener(syncSystemTheme);
  }, []);

  const resolvedThemeMode = themeMode === "system" ? systemThemeMode : themeMode;

  // 应用 dark 类到 html 元素
  useEffect(() => {
    const html = document.documentElement;
    if (resolvedThemeMode === "dark") {
      html.classList.add("dark");
    } else {
      html.classList.remove("dark");
    }
  }, [resolvedThemeMode]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
    </QueryClientProvider>
  );
};