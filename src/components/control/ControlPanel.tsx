import { ScanSearch, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { CanvasControls } from "@/components/canvas/CanvasControls";
import { SectionCard } from "@/components/common/SectionCard";
import { GenerateControls } from "@/components/control/GenerateControls";
import { PromptEditor } from "@/components/control/PromptEditor";
import { TaskQueue } from "@/components/control/TaskQueue";
import { TimeSlotSelector } from "@/components/control/TimeSlotSelector";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { runSceneAnalysis } from "@/services/prompt/sceneAnalyzer";
import { useSettingsStore } from "@/store/useSettingsStore";
import { buildLoadedImage, useWorkflowStore } from "@/store/useWorkflowStore";
import type { TimeVariant } from "@/types/domain";
import { toUserError } from "@/utils/error";
import { getImageSize, readFileAsBlob } from "@/utils/image";

interface PromptEntry {
  timeOfDay: TimeVariant;
  prompt: string;
  negativePrompt: string;
}

interface ControlPanelProps {
  desktopScrollManaged?: boolean;
}

export const ControlPanel = ({ desktopScrollManaged = false }: ControlPanelProps) => {
  const { i18n, t } = useTranslation();
  const isZh = i18n.language === "zh";
  const inputRef = useRef<HTMLInputElement>(null);

  const sourceImage = useWorkflowStore((s) => s.sourceImage);
  const preparedImage = useWorkflowStore((s) => s.preparedImage);
  const setSourceImage = useWorkflowStore((s) => s.setSourceImage);
  const sceneAnalysis = useWorkflowStore((s) => s.sceneAnalysis);
  const setSceneAnalysis = useWorkflowStore((s) => s.setSceneAnalysis);
  const provider = useSettingsStore((s) => s.provider);
  const promptSettings = useSettingsStore((s) => s.promptSettings);

  const [currentTimeOfDay, setCurrentTimeOfDay] = useState<TimeVariant | null>(null);
  const [detectedTimeOfDay, setDetectedTimeOfDay] = useState<TimeVariant | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<TimeVariant[]>([]);
  const [prompts, setPrompts] = useState<PromptEntry[]>([]);
  const [preprocessLoading, setPreprocessLoading] = useState(false);
  const [preprocessError, setPreprocessError] = useState("");
  const [uploadError, setUploadError] = useState("");

  useEffect(() => {
    setCurrentTimeOfDay(null);
    setDetectedTimeOfDay(null);
    setSelectedSlots([]);
    setPrompts([]);
    setPreprocessError("");
  }, [preparedImage?.id, sourceImage?.id]);

  const inferTimeOfDay = (analysis: {
    lighting: string;
    summary: string;
    timeOfDay?: TimeVariant;
  }): TimeVariant => {
    if (analysis.timeOfDay) return analysis.timeOfDay;
    const text = `${analysis.lighting} ${analysis.summary}`.toLowerCase();
    if (/dawn|sunrise|morning|晨|日出|清晨|早晨/.test(text)) return "dawn";
    if (/dusk|sunset|evening|昏|日落|黄昏|傍晚/.test(text)) return "dusk";
    if (/night|dark|moon|星|夜|月|深色/.test(text)) return "night";
    return "day";
  };

  const recommendSlots = (current: TimeVariant): TimeVariant[] => {
    const all: TimeVariant[] = ["dawn", "day", "dusk", "night"];
    return all.filter((slot) => slot !== current);
  };

  const generatePromptSuggestions = (
    analysis: { summary: string; subjects: string[] },
    current: TimeVariant,
    slots: TimeVariant[],
  ): PromptEntry[] => {
    const baseDesc = analysis.summary || analysis.subjects.join(", ");

    const timeDescZh: Record<TimeVariant, string> = {
      dawn: "清晨时分，柔和的晨光照射，天空呈现淡橙粉色",
      day: "白天，明亮的自然光照射",
      dusk: "黄昏时分，温暖的金色夕阳光线，天空呈现橙红色",
      night: "夜晚，柔和的月光和人工灯光照明，深蓝色夜空",
    };
    const timeDescEn: Record<TimeVariant, string> = {
      dawn: "early morning, soft dawn light, sky in pale orange-pink tones",
      day: "daytime, bright natural light",
      dusk: "dusk, warm golden sunset rays, sky in orange-red tones",
      night: "nighttime, soft moonlight and artificial lighting, deep blue night sky",
    };

    const timeDesc = isZh ? timeDescZh : timeDescEn;
    const keepComposition = isZh
      ? "保持原有构图和主体位置"
      : "preserve original composition and subject placement";
    const prefixedBaseDesc = [promptSettings.generationPrefix, baseDesc].filter(Boolean).join(", ");

    return slots.map((slot) => ({
      timeOfDay: slot,
      prompt:
        slot === current
          ? prefixedBaseDesc
          : `${prefixedBaseDesc}, ${timeDesc[slot]}, ${keepComposition}`,
      negativePrompt:
        promptSettings.defaultNegativePrompt || "blur, artifact, text, geometry shift, low quality",
    }));
  };

  const handlePromptChange = (
    timeOfDay: TimeVariant,
    field: "prompt" | "negativePrompt",
    value: string,
  ) => {
    setPrompts((prev) => {
      const existing = prev.find((item) => item.timeOfDay === timeOfDay);
      if (!existing) {
        return [...prev, { timeOfDay, prompt: "", negativePrompt: "", [field]: value }];
      }
      return prev.map((item) =>
        item.timeOfDay === timeOfDay ? { ...item, [field]: value } : item,
      );
    });
  };

  const onPreprocess = async () => {
    if (!preparedImage) return;

    try {
      setPreprocessLoading(true);
      setPreprocessError("");
      const result = await runSceneAnalysis(provider, preparedImage, promptSettings.analysisUserPrompt);
      const analysis = result.analysis;
      setSceneAnalysis(analysis);

      if (result.source === "local-fallback") {
        const fallbackMessage = result.warning
          ? t(`errors.${result.warning}`, result.warning)
          : isZh
            ? "已切换到本地启发式分析。"
            : "Switched to the local heuristic analysis.";
        toast({
          title: isZh ? "AI 分析不可用，已回退本地估算" : "AI analysis unavailable, using local fallback",
          description: fallbackMessage,
          variant: "destructive",
        });
      }

      const detected = inferTimeOfDay(analysis);
      setDetectedTimeOfDay(detected);
      setCurrentTimeOfDay(detected);

      const recommended = recommendSlots(detected);
      setSelectedSlots(recommended);

      const allSlots = [detected, ...recommended];
      setPrompts(generatePromptSuggestions(analysis, detected, allSlots));
    } catch (exception) {
      setPreprocessError(toUserError(exception));
    } finally {
      setPreprocessLoading(false);
    }
  };

  const onUploadFile = useCallback(
    async (file?: File) => {
      if (!file) return;
      try {
        const blob = await readFileAsBlob(file);
        const size = await getImageSize(blob);
        const loaded = buildLoadedImage({
          name: file.name,
          mimeType: blob.type || "image/png",
          blob,
          width: size.width,
          height: size.height,
          objectUrl: URL.createObjectURL(blob),
        });
        setUploadError("");
        setSourceImage(loaded);
      } catch {
        setUploadError("INVALID_IMAGE");
      }
    },
    [setSourceImage],
  );

  return (
    <div className="min-w-0">
      <SectionCard
        title={isZh ? "创作流程" : "Workflow"}
        subtitle={
          isZh
            ? `当前通过 ${provider.templateId} 执行场景分析与图像生成`
            : `Scene analysis and image generation both run through ${provider.templateId}`
        }
      >
        <div className={desktopScrollManaged ? "space-y-4" : "space-y-4 md:max-h-[inherit] md:overflow-y-auto md:pr-1"}>
          <div className="space-y-4 rounded-xl border border-border/70 bg-background/70 p-4">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {isZh ? "01 基准图处理与 AI 分析" : "01 Baseline Prep & AI Analysis"}
              </p>
              <p className="text-sm text-muted-foreground">
                {isZh
                  ? "先上传参考图，生成统一基准图后再做 AI 分析。"
                  : "Upload a reference image, prepare a baseline, then run scene analysis."}
              </p>
            </div>

            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(event) => void onUploadFile(event.currentTarget.files?.[0])}
            />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button type="button" onClick={() => inputRef.current?.click()}>
                <Upload className="h-4 w-4" />
                {t("common.upload")}
              </Button>
              <p className="text-sm text-muted-foreground">
                {sourceImage
                  ? isZh
                    ? "已加载参考图，可继续设置比例并生成基准图。"
                    : "Reference image loaded. You can now prepare the baseline image."
                  : isZh
                    ? "支持 PNG / JPEG / WebP。"
                    : "Supports PNG / JPEG / WebP."}
              </p>
            </div>

            {uploadError ? <p className="text-sm text-destructive">{t(`errors.${uploadError}`, uploadError)}</p> : null}

            <div className="rounded-xl border border-border/70 bg-background/60 p-4">
              <CanvasControls />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => void onPreprocess()}
                disabled={!preparedImage || preprocessLoading}
              >
                <ScanSearch className="h-4 w-4" />
                {preprocessLoading ? t("common.loading") : t("prompts.analyze")}
              </Button>
              <span className="text-sm text-muted-foreground">
                {t("settings.provider")}: {provider.templateId}
              </span>
            </div>

            {sceneAnalysis ? (
              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">{sceneAnalysis.summary}</p>
                <p>
                  {isZh ? "主体" : "Subjects"}: {sceneAnalysis.subjects.join(", ") || (isZh ? "未识别" : "N/A")}
                </p>
                <p>
                  {isZh ? "光照" : "Lighting"}: {sceneAnalysis.lighting}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {isZh ? "准备好基准图后，再执行场景分析。" : "Prepare the baseline image before scene analysis."}
              </p>
            )}
          </div>

          <div className="space-y-3 rounded-xl border border-border/70 bg-background/70 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {isZh ? "02 选择时段" : "02 Select Time Variants"}
            </p>
            <TimeSlotSelector
              currentTimeOfDay={currentTimeOfDay}
              detectedTimeOfDay={detectedTimeOfDay}
              selectedSlots={selectedSlots}
              onCurrentTimeChange={setCurrentTimeOfDay}
              onSelectedSlotsChange={setSelectedSlots}
            />
          </div>

          <div className="space-y-3 rounded-xl border border-border/70 bg-background/70 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {isZh ? "03 提示词编辑" : "03 Prompt Editing"}
            </p>
            <PromptEditor selectedSlots={selectedSlots} prompts={prompts} onPromptChange={handlePromptChange} />
          </div>

          <div className="space-y-3 rounded-xl border border-border/70 bg-background/70 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {isZh ? "04 批量生成" : "04 Batch Generation"}
            </p>
            <GenerateControls
              selectedSlots={selectedSlots}
              prompts={prompts}
              onPreprocess={onPreprocess}
              preprocessLoading={preprocessLoading}
              showAnalyze={false}
            />
          </div>

          {preprocessError ? <p className="text-sm text-destructive">{t(`errors.${preprocessError}`, preprocessError)}</p> : null}

          <div className="space-y-3 rounded-xl border border-border/70 bg-background/70 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {isZh ? "05 任务队列" : "05 Task Queue"}
            </p>
            <TaskQueue />
          </div>
        </div>
      </SectionCard>
    </div>
  );
};
