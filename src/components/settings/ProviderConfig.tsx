import { useState } from "react";
import { useTranslation } from "react-i18next";

import { testConnectionWithWorker } from "@/services/api/workerClient";
import { toast } from "@/hooks/use-toast";
import { useSettingsStore } from "@/store/useSettingsStore";
import type { ProviderKind } from "@/types/domain";
import { PROVIDER_TEMPLATES } from "@/types/provider";
import { toUserError } from "@/utils/error";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function ProviderConfig() {
  const { i18n, t } = useTranslation();
  const isZh = i18n.language === "zh";
  const { provider, setProvider } = useSettingsStore();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

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
      setTestResult({
        ok: false,
        message,
      });
      toast({
        title: isZh ? "连通性测试失败" : "Connectivity test failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{isZh ? "Provider 模板" : "Provider template"}</Label>
        <Select value={provider.templateId} onValueChange={handleTemplateChange}>
          <SelectTrigger>
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
        <Label>{t("settings.apiKey")}</Label>
        <Input
          type="password"
          value={provider.apiKey}
          onChange={(e) => setProvider({ apiKey: e.target.value })}
          placeholder="sk-..."
        />
      </div>

      <div className="space-y-2">
        <Label>{t("settings.baseUrl")}</Label>
        <Input
          value={provider.baseUrl}
          onChange={(e) => setProvider({ baseUrl: e.target.value })}
          placeholder="https://api.example.com/v1"
        />
      </div>

      <div className="space-y-2">
        <Label>{t("settings.generationModel")}</Label>
        <Input
          value={provider.model}
          onChange={(e) => setProvider({ model: e.target.value })}
          placeholder="model-name"
        />
      </div>

      <div className="space-y-2">
        <Label>{t("settings.visionModel")}</Label>
        <Input
          value={provider.visionModel || ""}
          onChange={(e) => setProvider({ visionModel: e.target.value })}
          placeholder="vision-model-name"
        />
      </div>

      {provider.templateId === "aliyun" || provider.templateId === "ark" ? (
        <div className="space-y-2">
          <Label>{isZh ? "生成接口 URL（可选）" : "Generation endpoint (optional)"}</Label>
          <Input
            value={provider.generateUrl || ""}
            onChange={(e) => setProvider({ generateUrl: e.target.value })}
            placeholder={
              provider.templateId === "aliyun"
                ? "https://dashscope.aliyuncs.com/api/v1/services/aigc/..."
                : "https://ark.cn-beijing.volces.com/api/v3/images/generations"
            }
          />
        </div>
      ) : null}

      <Button onClick={handleTestConnection} disabled={testing || !provider.apiKey} className="w-full">
        {testing ? (isZh ? "测试中..." : "Testing...") : t("settings.test")}
      </Button>

      {testResult && (
        <p className={testResult.ok ? "text-sm text-emerald-600" : "text-sm text-destructive"}>
          {testResult.ok
            ? isZh
              ? `连接成功：${testResult.message}`
              : `Connected: ${testResult.message}`
            : isZh
              ? `连接失败：${testResult.message}`
              : `Connection failed: ${testResult.message}`}
        </p>
      )}
    </div>
  );
}
