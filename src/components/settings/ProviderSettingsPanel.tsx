import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ProviderConfig } from "@/components/settings/ProviderConfig";
import { testConnectionWithWorker } from "@/services/api/workerClient";
import { toast } from "@/hooks/use-toast";
import { useSettingsStore } from "@/store/useSettingsStore";
import { toUserError } from "@/utils/error";

type SettingsSectionKey = "provider" | "prompts" | "appearance" | "generation" | "export";

interface ProviderSettingsPanelProps {
  onClose: () => void;
}

export const ProviderSettingsPanel = ({ onClose }: ProviderSettingsPanelProps) => {
  const { i18n, t } = useTranslation();
  const isZh = i18n.language === "zh";
  const provider = useSettingsStore((state) => state.provider);
  const promptSettings = useSettingsStore((state) => state.promptSettings);
  const setPromptSettings = useSettingsStore((state) => state.setPromptSettings);
  const language = useSettingsStore((state) => state.language);
  const setLanguage = useSettingsStore((state) => state.setLanguage);
  const themeMode = useSettingsStore((state) => state.themeMode);
  const setThemeMode = useSettingsStore((state) => state.setThemeMode);
  const generationSettings = useSettingsStore((state) => state.generationSettings);
  const setGenerationSettings = useSettingsStore((state) => state.setGenerationSettings);
  const exportSettings = useSettingsStore((state) => state.exportSettings);
  const setExportSettings = useSettingsStore((state) => state.setExportSettings);
  const [activeSection, setActiveSection] = useState<SettingsSectionKey>("provider");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const sectionItems: Array<{
    key: SettingsSectionKey;
    label: string;
    title: string;
    description: string;
  }> = [
    {
      key: "provider",
      label: t("settings.sections.provider"),
      title: t("settings.providerSection"),
      description: t("settings.routingHint"),
    },
    {
      key: "prompts",
      label: t("settings.sections.prompts"),
      title: t("settings.promptSettingsTitle"),
      description: t("settings.promptSettingsDesc"),
    },
    {
      key: "appearance",
      label: t("settings.sections.appearance"),
      title: t("settings.appearanceSection"),
      description: t("settings.appearanceDesc"),
    },
    {
      key: "generation",
      label: t("settings.sections.generation"),
      title: t("settings.generationSettingsTitle"),
      description: t("settings.generationSettingsDesc"),
    },
    {
      key: "export",
      label: t("settings.sections.export"),
      title: t("settings.exportSettingsTitle"),
      description: t("settings.exportSettingsDesc"),
    },
  ];

  const activeSectionItem = sectionItems.find((item) => item.key === activeSection) ?? sectionItems[0];
  const fieldLabelClassName = isZh
    ? "text-xs font-medium text-muted-foreground"
    : "text-[11px] uppercase tracking-[0.16em] text-muted-foreground";
  const textAreaClassName =
    "min-h-28 w-full rounded-md border border-input bg-background/75 px-3 py-2.5 text-sm leading-6 outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring";
  const panelBlockClassName = "space-y-4 rounded-lg border border-border/70 bg-background/55 p-4";

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const result = await testConnectionWithWorker(provider);
      setTestResult(result);
      toast({
        title: isZh ? "连通性测试完成" : "Connectivity test finished",
        description: result.ok
          ? isZh
            ? `连接成功：${result.message}`
            : `Connected: ${result.message}`
          : isZh
            ? `连接失败：${result.message}`
            : `Connection failed: ${result.message}`,
        variant: result.ok ? "default" : "destructive",
      });
    } catch (error) {
      const message = t(`errors.${toUserError(error)}`, toUserError(error));
      setTestResult({ ok: false, message });
      toast({
        title: isZh ? "连通性测试失败" : "Connectivity test failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const renderSectionContent = () => {
    if (activeSection === "provider") {
      return (
        <div className="space-y-4">
          <div className="rounded-lg border border-border/70 bg-background/45 px-4 py-3 text-sm leading-6 text-muted-foreground">
            {t("settings.routingHint")}
          </div>
          <div className={panelBlockClassName}>
            <ProviderConfig />
          </div>
        </div>
      );
    }

    if (activeSection === "prompts") {
      return (
        <div className={panelBlockClassName}>
          <div className="space-y-2">
            <Label className={fieldLabelClassName} htmlFor="analysis-prompt">
              {t("settings.analysisPrompt")}
            </Label>
            <textarea
              id="analysis-prompt"
              className={textAreaClassName}
              value={promptSettings.analysisUserPrompt}
              onChange={(event) => setPromptSettings({ analysisUserPrompt: event.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label className={fieldLabelClassName} htmlFor="generation-prefix">
              {t("settings.generationPromptPrefix")}
            </Label>
            <textarea
              id="generation-prefix"
              className={textAreaClassName}
              value={promptSettings.generationPrefix}
              onChange={(event) => setPromptSettings({ generationPrefix: event.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label className={fieldLabelClassName} htmlFor="negative-prompt">
              {t("settings.defaultNegativePrompt")}
            </Label>
            <textarea
              id="negative-prompt"
              className={textAreaClassName}
              value={promptSettings.defaultNegativePrompt}
              onChange={(event) => setPromptSettings({ defaultNegativePrompt: event.target.value })}
            />
          </div>
        </div>
      );
    }

    if (activeSection === "appearance") {
      return (
        <div className={panelBlockClassName}>
          <div className="space-y-3">
            <Label className={fieldLabelClassName}>{t("settings.language")}</Label>
            <div className="flex gap-2">
              {([
                { value: "zh", label: t("settings.languageZh") },
                { value: "en", label: t("settings.languageEn") },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setLanguage(opt.value);
                    void i18n.changeLanguage(opt.value);
                  }}
                  className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                    language === opt.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/70 bg-background/65 text-foreground hover:bg-accent/70"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <Label className={fieldLabelClassName}>{t("settings.theme")}</Label>
            <div className="flex gap-2">
              {([
                { value: "light", label: t("settings.themeLight") },
                { value: "dark", label: t("settings.themeDark") },
                { value: "system", label: t("settings.themeSystem") },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setThemeMode(opt.value)}
                  className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                    themeMode === opt.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/70 bg-background/65 text-foreground hover:bg-accent/70"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (activeSection === "generation") {
      return (
        <div className={panelBlockClassName}>
          <div className="space-y-3">
            <div>
              <Label className={fieldLabelClassName}>{t("settings.concurrencyLabel")}</Label>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {t("settings.concurrencyHint")}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={4}
                step={1}
                value={generationSettings.concurrency}
                onChange={(e) =>
                  setGenerationSettings({ concurrency: Number(e.target.value) })
                }
                className="h-2 w-36 cursor-pointer appearance-none rounded-full bg-border accent-primary"
              />
              <span className="rounded-md border border-border/70 bg-background px-3 py-1 text-sm font-semibold tabular-nums">
                {generationSettings.concurrency}
              </span>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <Label className={fieldLabelClassName} htmlFor="retries-input">
                {t("settings.retriesLabel")}
              </Label>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {t("settings.retriesHint")}
              </p>
            </div>
            <Input
              id="retries-input"
              type="number"
              min={0}
              max={5}
              value={generationSettings.retries}
              onChange={(e) =>
                setGenerationSettings({
                  retries: Math.max(0, Math.min(5, Number(e.target.value) || 0)),
                })
              }
              className="h-10 w-24 rounded-md bg-background/65"
            />
          </div>
        </div>
      );
    }

    return (
      <div className={panelBlockClassName}>
        <div className="space-y-3">
          <Label className={fieldLabelClassName} htmlFor="default-file-stem">
            {t("settings.defaultFileStemLabel")}
          </Label>
          <p className="text-xs leading-5 text-muted-foreground">
            {t("settings.defaultFileStemHint")}
          </p>
          <Input
            id="default-file-stem"
            value={exportSettings.defaultFileStem}
            onChange={(e) =>
              setExportSettings({ defaultFileStem: e.target.value.replace(/\s+/g, "_") })
            }
            className="h-10 rounded-md bg-background/65"
          />
        </div>
        <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-background/70 p-4">
          <div>
            <Label className="text-sm font-medium">{t("settings.autoAlignLabel")}</Label>
            <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
              {t("settings.autoAlignHint")}
            </p>
          </div>
          <Switch
            checked={exportSettings.autoAlign}
            onCheckedChange={(checked) => setExportSettings({ autoAlign: checked })}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-hidden">
        <div className="grid h-full min-h-0 md:grid-cols-[190px_minmax(0,1fr)]">
          <aside className="border-b border-border/70 bg-muted/20 md:border-b-0 md:border-r">
            <nav className="flex gap-1 overflow-x-auto px-3 py-3 md:grid md:gap-1 md:px-0 md:py-4">
              {sectionItems.map((item) => {
                const active = item.key === activeSection;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setActiveSection(item.key)}
                    className={[
                      "shrink-0 border border-transparent px-3 py-2 text-left text-sm transition-colors md:border-l-2 md:border-r-0 md:border-y-0 md:px-4",
                      active
                        ? "border-l-primary bg-background/70 text-foreground"
                        : "text-muted-foreground hover:bg-background/40 hover:text-foreground",
                    ].join(" ")}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </aside>

          <section className="flex min-h-0 flex-col">
            <div className="border-b border-border/70 px-5 py-4 md:px-6">
              <h3 className="text-lg font-semibold leading-tight">{activeSectionItem.title}</h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {activeSectionItem.description}
              </p>
            </div>
            <div className="ui-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-6 md:py-6">
              {renderSectionContent()}
            </div>
          </section>
        </div>
      </div>

      <div className="border-t border-border/70 bg-background/92 px-5 py-4 md:px-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{t("settings.autoSaveHint")}</p>
            {testResult ? (
              <p className={testResult.ok ? "text-sm text-emerald-600" : "text-sm text-destructive"}>
                {testResult.ok
                  ? isZh
                    ? `连接成功：${testResult.message}`
                    : `Connected: ${testResult.message}`
                  : isZh
                    ? `连接失败：${testResult.message}`
                    : `Connection failed: ${testResult.message}`}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleTestConnection()}
              disabled={testing || !provider.apiKey}
              className="rounded-md"
            >
              {testing ? (isZh ? "测试中..." : "Testing...") : t("settings.test")}
            </Button>
            <Button type="button" onClick={onClose} className="rounded-md">
              {t("common.done")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
