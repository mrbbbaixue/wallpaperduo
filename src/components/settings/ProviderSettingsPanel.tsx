import { useTranslation } from "react-i18next";

import { SectionCard } from "@/components/common/SectionCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProviderConfig } from "@/components/settings/ProviderConfig";
import { useSettingsStore } from "@/store/useSettingsStore";

export const ProviderSettingsPanel = () => {
  const { i18n, t } = useTranslation();
  const isZh = i18n.language === "zh";
  const provider = useSettingsStore((state) => state.provider);
  const promptSettings = useSettingsStore((state) => state.promptSettings);
  const setPromptSettings = useSettingsStore((state) => state.setPromptSettings);

  return (
    <div className="space-y-4">
      <SectionCard title={t("settings.providerSection")} subtitle={t("settings.routingHint")}>
        <ProviderConfig />
      </SectionCard>

      <SectionCard
        title={t("settings.promptSettingsTitle")}
        subtitle={t("settings.promptSettingsDesc")}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="analysis-prompt">{t("settings.analysisPrompt")}</Label>
            <textarea
              id="analysis-prompt"
              className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-6 outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              value={promptSettings.analysisUserPrompt}
              onChange={(event) => setPromptSettings({ analysisUserPrompt: event.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="generation-prefix">{t("settings.generationPromptPrefix")}</Label>
            <textarea
              id="generation-prefix"
              className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-6 outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              value={promptSettings.generationPrefix}
              onChange={(event) => setPromptSettings({ generationPrefix: event.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="negative-prompt">{t("settings.defaultNegativePrompt")}</Label>
            <textarea
              id="negative-prompt"
              className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-6 outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              value={promptSettings.defaultNegativePrompt}
              onChange={(event) => setPromptSettings({ defaultNegativePrompt: event.target.value })}
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard title={t("settings.title")} subtitle={t("settings.securityTip")}>
        <div className="space-y-3">
          <div className="rounded-lg border border-dashed border-border/80 bg-muted/35 px-4 py-3 text-sm leading-6 text-muted-foreground">
            {isZh
              ? "当前版本已经移除多 Provider 切换、本地回退和 HEIC 导出，所有分析与生成都会走同一个自定义 Provider，并由 Cloudflare Worker 代理请求。"
              : "This version removes multi-provider switching, local fallback, and HEIC export. Analysis and generation now share a single custom provider routed through the Cloudflare Worker."}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="settings-provider-readonly">{t("settings.provider")}</Label>
              <Input
                id="settings-provider-readonly"
                value={provider.templateId}
                readOnly
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-workflow-readonly">
                {isZh ? "部署说明" : "Deployment note"}
              </Label>
              <Input
                id="settings-workflow-readonly"
                value={
                  isZh
                    ? "前端静态资源 + /api/* Worker 同仓部署"
                    : "Static assets + /api/* Worker in one deploy"
                }
                readOnly
              />
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
};
