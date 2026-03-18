import { Settings, Globe, Sun, Moon, Monitor } from "lucide-react";
import { useEffect, useState, type PropsWithChildren } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { SettingsModal } from "@/components/settings/SettingsModal";
import { useSettingsStore } from "@/store/useSettingsStore";

export const AppShell = ({ children }: PropsWithChildren) => {
  const { t, i18n } = useTranslation();
  const language = useSettingsStore((state) => state.language);
  const setLanguage = useSettingsStore((state) => state.setLanguage);
  const themeMode = useSettingsStore((state) => state.themeMode);
  const setThemeMode = useSettingsStore((state) => state.setThemeMode);

  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    document.title = t("appName");
  }, [t, i18n.language]);

  const toggleLanguage = () => {
    const next = language === "zh" ? "en" : "zh";
    setLanguage(next);
    void i18n.changeLanguage(next);
  };

  const cycleThemeMode = () => {
    if (themeMode === "system") {
      setThemeMode("light");
      return;
    }
    if (themeMode === "light") {
      setThemeMode("dark");
      return;
    }
    setThemeMode("system");
  };

  const ThemeIcon = {
    system: Monitor,
    light: Sun,
    dark: Moon,
  }[themeMode];

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background gradient */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background:
            "radial-gradient(circle at 16% -8%, rgba(78, 124, 136, 0.07), transparent 40%), radial-gradient(circle at 88% 0%, rgba(179, 138, 89, 0.06), transparent 36%)",
        }}
      />

      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border/40 bg-transparent">
        <div className="flex items-center justify-between px-4 py-3 md:px-6">
          <div className="min-w-0 flex-1">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">
              WallpaperDuo Studio
            </span>
            <h1 className="text-xl font-semibold leading-tight">{t("appName")}</h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleLanguage}
              aria-label="language"
              className="h-8 w-8"
            >
              <Globe className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={cycleThemeMode}
              aria-label="theme-mode"
              className="h-8 w-8"
            >
              <ThemeIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSettingsOpen(true)}
              aria-label="settings"
              className="h-8 w-8"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-[1]">{children}</main>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
};
