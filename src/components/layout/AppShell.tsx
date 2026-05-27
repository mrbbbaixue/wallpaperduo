import { CheckCircle2, Globe, Loader2, Monitor, Moon, Settings, Sun } from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties, type PropsWithChildren } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { SettingsModal } from "@/components/settings/SettingsModal";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useWorkflowStore } from "@/store/useWorkflowStore";

export const AppShell = ({ children }: PropsWithChildren) => {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === "zh";
  const language = useSettingsStore((state) => state.language);
  const setLanguage = useSettingsStore((state) => state.setLanguage);
  const themeMode = useSettingsStore((state) => state.themeMode);
  const setThemeMode = useSettingsStore((state) => state.setThemeMode);

  const tasks = useWorkflowStore((s) => s.tasks);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const progress = useMemo(() => {
    const succeeded = tasks.filter((t) => t.status === "succeeded").length;
    const failed = tasks.filter((t) => t.status === "failed").length;
    const running = tasks.some((t) => t.status === "queued" || t.status === "running");

    // 全局进度百分比：已完成(100%) + 进行中(单任务progress) / 总数
    let overallPct = 0;
    if (tasks.length > 0) {
      const sum = tasks.reduce((acc, t) => {
        if (t.status === "succeeded" || t.status === "failed" || t.status === "canceled") return acc + 100;
        if (t.status === "running" || t.status === "queued") return acc + Math.max(0, Math.min(100, t.progress));
        return acc;
      }, 0);
      overallPct = Math.round(sum / tasks.length);
    }

    const barColor = running
      ? "bg-sky-500"
      : failed > 0 && succeeded === 0
        ? "bg-amber-500"
        : "bg-emerald-500";

    return { total: tasks.length, succeeded, failed, running, overallPct, barColor };
  }, [tasks]);

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
            "radial-gradient(circle at 16% -8%, rgba(200, 110, 170, 0.06), transparent 40%), radial-gradient(circle at 88% 0%, rgba(140, 120, 200, 0.05), transparent 36%)",
        }}
      />

      {/* Header */}
      <header className="sticky top-0 z-10 h-14 border-b border-border/40 bg-transparent">
        <div className="flex h-full items-center justify-between px-4 md:px-5">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div
              aria-hidden="true"
              className="flex h-8 w-8 shrink-0 items-center justify-center border border-border/70 bg-background/75 text-[11px] font-semibold tracking-[0.18em] text-foreground"
            >
              WD
            </div>
            <h1 className="truncate text-lg font-semibold leading-tight md:text-[1.15rem]">
              {t("appName")}
            </h1>
            {progress.total > 0 ? (
              <span className={`hidden md:inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                progress.running
                  ? "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/80 dark:bg-sky-950/40 dark:text-sky-300"
                  : progress.failed > 0
                    ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/80 dark:bg-amber-950/40 dark:text-amber-300"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/80 dark:bg-emerald-950/40 dark:text-emerald-300"
              }`}>
                {progress.running ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : progress.failed > 0 ? null : (
                  <CheckCircle2 className="h-3 w-3" />
                )}
                {progress.running
                  ? isZh ? `生成中 ${progress.succeeded}/${progress.total}` : `${progress.succeeded}/${progress.total}`
                  : progress.failed > 0
                    ? isZh ? `${progress.succeeded} 完成, ${progress.failed} 失败` : `${progress.succeeded} done, ${progress.failed} failed`
                    : isZh ? `${progress.succeeded} 张完成` : `${progress.succeeded} done`}
              </span>
            ) : null}
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

      {/* 全局进度条 */}
      {progress.total > 0 ? (
        <div className="sticky top-14 z-10 h-0.5 w-full bg-border/40">
          <div
            className={`h-full transition-all duration-500 ease-out ${progress.barColor}`}
            style={{ width: `${progress.overallPct}%` }}
          />
        </div>
      ) : null}

      {/* Main content */}
      <main className="relative z-[1] min-h-0">{children}</main>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
};
