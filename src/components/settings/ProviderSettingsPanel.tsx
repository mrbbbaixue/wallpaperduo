import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProviderConfig } from "@/components/settings/ProviderConfig";
import { testConnectionWithWorker } from "@/services/api/workerClient";
import { toast } from "@/hooks/use-toast";
import { useSettingsStore } from "@/store/useSettingsStore";
import { toUserError } from "@/utils/error";

type SettingsSectionKey = "provider" | "prompts" | "runtime" | "info";

interface ProviderSettingsPanelProps {
  onClose: () => void;
}

export const ProviderSettingsPanel = ({ onClose }: ProviderSettingsPanelProps) => {
  const { i18n, t } = useTranslation();
  const isZh = i18n.language === "zh";
  const provider = useSettingsStore((state) => state.provider);
  const promptSettings = useSettingsStore((state) => state.promptSettings);
  const setPromptSettings = useSettingsStore((state) => state.setPromptSettings);
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
      key: "runtime",
      label: t("settings.sections.runtime"),
      title: t("settings.runtimeSummaryTitle"),
      description: t("settings.runtimeSummaryDesc"),
    },
    {
      key: "info",
      label: t("settings.sections.info"),
      title: t("settings.readonlyTitle"),
      description: t("settings.readonlyDesc"),
    },
  ];

  const activeSectionItem = sectionItems.find((item) => item.key === activeSection) ?? sectionItems[0];
  const fieldLabelClassName = isZh
    ? "text-xs font-medium text-muted-foreground"
    : "text-[11px] uppercase tracking-[0.16em] text-muted-foreground";
  const textAreaClassName =
    "min-h-28 w-full rounded-none border border-input bg-background/75 px-3 py-2.5 text-sm leading-6 outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring";
  const panelBlockClassName = "space-y-4 border border-border/70 bg-background/55 p-4";

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
          <div className="border border-border/70 bg-background/45 px-4 py-3 text-sm leading-6 text-muted-foreground">
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

    if (activeSection === "runtime") {
      return (
        <div className="space-y-4">
          <div className={panelBlockClassName}>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label className={fieldLabelClassName}>{t("settings.runtimeProxyLabel")}</Label>
                <Input value={t("settings.runtimeProxyValue")} readOnly className="h-11 rounded-none bg-background/75" />
              </div>
              <div className="space-y-2">
                <Label className={fieldLabelClassName}>{t("settings.runtimeExportLabel")}</Label>
                <Input value={t("settings.runtimeExportValue")} readOnly className="h-11 rounded-none bg-background/75" />
              </div>
              <div className="space-y-2">
                <Label className={fieldLabelClassName}>{t("settings.runtimeStorageLabel")}</Label>
                <Input value={t("settings.runtimeStorageValue")} readOnly className="h-11 rounded-none bg-background/75" />
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="border border-dashed border-border/80 bg-muted/35 px-4 py-3 text-sm leading-6 text-muted-foreground">
          {t("settings.securityTip")}
        </div>
        <div className={panelBlockClassName}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className={fieldLabelClassName} htmlFor="settings-provider-readonly">
                {t("settings.providerTemplate")}
              </Label>
              <Input
                id="settings-provider-readonly"
                value={provider.templateId}
                readOnly
                className="h-11 rounded-none bg-background/75"
              />
            </div>
            <div className="space-y-2">
              <Label className={fieldLabelClassName} htmlFor="settings-workflow-readonly">
                {t("settings.deploymentNote")}
              </Label>
              <Input
                id="settings-workflow-readonly"
                value={
                  isZh
                    ? "前端静态资源 + /api/* Worker 同仓部署"
                    : "Static assets + /api/* Worker in one deploy"
                }
                readOnly
                className="h-11 rounded-none bg-background/75"
              />
            </div>
          </div>
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
              className="rounded-none"
            >
              {testing ? (isZh ? "测试中..." : "Testing...") : t("settings.test")}
            </Button>
            <Button type="button" onClick={onClose} className="rounded-none">
              {t("common.done")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
