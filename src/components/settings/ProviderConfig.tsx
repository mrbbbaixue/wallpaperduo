import { useTranslation } from "react-i18next";

import { useSettingsStore } from "@/store/useSettingsStore";
import type { ProviderKind } from "@/types/domain";
import { PROVIDER_TEMPLATES } from "@/types/provider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProviderConfig() {
  const { i18n, t } = useTranslation();
  const isZh = i18n.language === "zh";
  const { provider, setProvider } = useSettingsStore();

  const handleTemplateChange = (templateId: string) => {
    const template = PROVIDER_TEMPLATES.find((t) => t.id === templateId);
    if (template) {
      setProvider({
        templateId: templateId as ProviderKind,
        baseUrl: template.baseUrl,
        model: template.defaultModel,
        visionModel: template.defaultVisionModel,
        generateUrl: template.generateUrl,
      });
    }
  };
  const fieldLabelClassName = isZh
    ? "text-xs font-medium text-muted-foreground"
    : "text-[11px] uppercase tracking-[0.16em] text-muted-foreground";
  const fieldClassName = "h-11 rounded-md bg-background/75";

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <div className="space-y-2">
        <Label className={fieldLabelClassName}>{isZh ? "Provider 模板" : "Provider template"}</Label>
        <Select value={provider.templateId} onValueChange={handleTemplateChange}>
          <SelectTrigger className={fieldClassName}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PROVIDER_TEMPLATES.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className={fieldLabelClassName}>{t("settings.apiKey")}</Label>
        <Input
          type="password"
          className={fieldClassName}
          value={provider.apiKey}
          onChange={(e) => setProvider({ apiKey: e.target.value })}
          placeholder="sk-..."
        />
      </div>

      <div className="space-y-2 xl:col-span-2">
        <Label className={fieldLabelClassName}>{t("settings.baseUrl")}</Label>
        <Input
          className={fieldClassName}
          value={provider.baseUrl}
          onChange={(e) => setProvider({ baseUrl: e.target.value })}
          placeholder="https://api.example.com/v1"
        />
      </div>

      <div className="space-y-2">
        <Label className={fieldLabelClassName}>{t("settings.generationModel")}</Label>
        <Input
          className={fieldClassName}
          value={provider.model}
          onChange={(e) => setProvider({ model: e.target.value })}
          placeholder="model-name"
        />
        {provider.templateId === "openrouter" ? (
          <p className="text-xs leading-5 text-muted-foreground">
            {isZh
              ? "OpenRouter 请选择支持图像输出的模型，例如 google/gemini-2.5-flash-image-preview。"
              : "For OpenRouter, use a model with image output support such as google/gemini-2.5-flash-image-preview."}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label className={fieldLabelClassName}>{t("settings.visionModel")}</Label>
        <Input
          className={fieldClassName}
          value={provider.visionModel || ""}
          onChange={(e) => setProvider({ visionModel: e.target.value })}
          placeholder="vision-model-name"
        />
      </div>

      {provider.templateId === "aliyun" ||
      provider.templateId === "ark" ||
      provider.templateId === "custom" ? (
        <div className="space-y-2 xl:col-span-2">
          <Label className={fieldLabelClassName}>
            {isZh ? "生成接口 URL（可选）" : "Generation endpoint (optional)"}
          </Label>
          <Input
            className={fieldClassName}
            value={provider.generateUrl || ""}
            onChange={(e) => setProvider({ generateUrl: e.target.value })}
            placeholder={
              provider.templateId === "aliyun"
                ? "https://dashscope.aliyuncs.com/api/v1/services/aigc/..."
                : provider.templateId === "ark"
                  ? "https://ark.cn-beijing.volces.com/api/v3/images/generations"
                  : "https://api.example.com/images/generations"
            }
          />
        </div>
      ) : null}
    </div>
  );
}
