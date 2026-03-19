import { Settings, Globe, Sun, Moon, Monitor } from "lucide-react";
import { useEffect, useState, type CSSProperties, type PropsWithChildren } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { SettingsModal } from "@/components/settings/SettingsModal";
import { useSettingsStore } from "@/store/useSettingsStore";

export const AppShell = ({ children }: PropsWithChildren) => {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === "zh";
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
    <div
      className="relative min-h-screen overflow-hidden"
      style={{ "--app-header-height": "56px" } as CSSProperties}
    >
      {/* Background gradient */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background:
            "radial-gradient(circle at 16% -8%, rgba(78, 124, 136, 0.07), transparent 40%), radial-gradient(circle at 88% 0%, rgba(179, 138, 89, 0.06), transparent 36%)",
        }}
      />

      {/* Header */}
      <header className="sticky top-0 z-10 h-14 border-b border-border/40 bg-transparent">
        <div className="flex h-full items-center justify-between px-4 md:px-5">
          <div className="min-w-0 flex-1">
            <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              WallpaperDuo Studio
            </span>
            <h1 className="text-lg font-semibold leading-tight md:text-[1.15rem]">{t("appName")}</h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleLanguage}
              aria-label="language"
              title={language === "zh" ? "切换到 English" : "Switch to 中文"}
              className="h-7 w-7 md:h-8 md:w-8"
            >
              <Globe className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={cycleThemeMode}
              aria-label="theme-mode"
              title={
                themeMode === "system"
                  ? isZh
                    ? "跟随系统"
                    : "Follow system"
                  : themeMode === "light"
                    ? isZh
                      ? "浅色模式"
                      : "Light mode"
                    : isZh
                      ? "深色模式"
                      : "Dark mode"
              }
              className="h-7 w-7 md:h-8 md:w-8"
            >
              <ThemeIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSettingsOpen(true)}
              aria-label="settings"
              title={t("settings.title")}
              className="h-7 w-7 md:h-8 md:w-8"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-[1] min-h-0">{children}</main>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
};
