import { ScanSearch, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { CanvasControls } from "@/components/canvas/CanvasControls";
import { SectionCard } from "@/components/common/SectionCard";
import { GenerateControls } from "@/components/control/GenerateControls";
import { PromptEditor } from "@/components/control/PromptEditor";
import { TaskQueue } from "@/components/control/TaskQueue";
import { TimeSlotSelector } from "@/components/control/TimeSlotSelector";
import { WorkflowStepCard } from "@/components/control/WorkflowStepCard";
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

type StepKey = "baseline" | "times" | "prompts" | "generate";

const stepOrder: StepKey[] = ["baseline", "times", "prompts", "generate"];

const timeLabels: Record<TimeVariant, { zh: string; en: string }> = {
  dawn: { zh: "晨光", en: "Dawn" },
  day: { zh: "白天", en: "Day" },
  dusk: { zh: "黄昏", en: "Dusk" },
  night: { zh: "夜晚", en: "Night" },
};

const renderSummaryPills = (items: string[]) => (
  <div className="flex flex-wrap gap-2">
    {items.filter(Boolean).map((item, index) => (
      <span
        key={`${item}-${index}`}
        className="rounded-full border border-border/70 bg-background/65 px-2.5 py-1 text-[11px] text-muted-foreground"
      >
        {item}
      </span>
    ))}
  </div>
);

export const ControlPanel = ({ desktopScrollManaged = false }: ControlPanelProps) => {
  const { i18n, t } = useTranslation();
  const isZh = i18n.language === "zh";
  const inputRef = useRef<HTMLInputElement>(null);

  const sourceImage = useWorkflowStore((s) => s.sourceImage);
  const preparedImage = useWorkflowStore((s) => s.preparedImage);
  const ratioId = useWorkflowStore((s) => s.ratioId);
  const customRatio = useWorkflowStore((s) => s.customRatio);
  const prepareMode = useWorkflowStore((s) => s.prepareMode);
  const setSourceImage = useWorkflowStore((s) => s.setSourceImage);
  const sceneAnalysis = useWorkflowStore((s) => s.sceneAnalysis);
  const setSceneAnalysis = useWorkflowStore((s) => s.setSceneAnalysis);
  const tasks = useWorkflowStore((s) => s.tasks);
  const provider = useSettingsStore((s) => s.provider);
  const promptSettings = useSettingsStore((s) => s.promptSettings);

  const [currentTimeOfDay, setCurrentTimeOfDay] = useState<TimeVariant | null>(null);
  const [detectedTimeOfDay, setDetectedTimeOfDay] = useState<TimeVariant | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<TimeVariant[]>([]);
  const [prompts, setPrompts] = useState<PromptEntry[]>([]);
  const [preprocessLoading, setPreprocessLoading] = useState(false);
  const [preprocessError, setPreprocessError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [expandedStep, setExpandedStep] = useState<StepKey>("baseline");

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
      const result = await runSceneAnalysis(
        provider,
        preparedImage,
        promptSettings.analysisUserPrompt,
      );
      const analysis = result.analysis;
      setSceneAnalysis(analysis);

      if (result.source === "local-fallback") {
        const fallbackMessage = result.warning
          ? t(`errors.${result.warning}`, result.warning)
          : isZh
            ? "已切换到本地启发式分析。"
            : "Switched to the local heuristic analysis.";
        toast({
          title: isZh
            ? "AI 分析不可用，已回退本地估算"
            : "AI analysis unavailable, using local fallback",
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

  const getTimeLabel = (time?: TimeVariant | null) =>
    time ? (isZh ? timeLabels[time].zh : timeLabels[time].en) : isZh ? "未识别" : "N/A";

  const ratioLabel = ratioId === "custom" ? `${customRatio.width}:${customRatio.height}` : ratioId;
  const modeLabel = prepareMode === "crop" ? t("workspace.modeCrop") : t("workspace.modePad");
  const promptsReady =
    selectedSlots.length > 0 &&
    selectedSlots.every((slot) => {
      const entry = prompts.find((item) => item.timeOfDay === slot);
      return Boolean(entry?.prompt.trim()) && Boolean(entry?.negativePrompt.trim());
    });

  const activeStep: StepKey = !sceneAnalysis
    ? "baseline"
    : !currentTimeOfDay || selectedSlots.length === 0
      ? "times"
      : !promptsReady
        ? "prompts"
        : "generate";

  const activeStepIndex = stepOrder.indexOf(activeStep);
  const completedResults = tasks.filter((task) => task.status === "succeeded").length;
  const failedResults = tasks.filter((task) => task.status === "failed").length;
  const tasksRunning = tasks.some((task) => task.status === "queued" || task.status === "running");

  useEffect(() => {
    setExpandedStep((current) =>
      stepOrder.indexOf(current) > activeStepIndex ? activeStep : current,
    );
  }, [activeStep, activeStepIndex]);

  const handleStepToggle = (step: StepKey, allowed: boolean) => {
    if (!allowed) return;
    setExpandedStep((current) => (current === step && step !== activeStep ? activeStep : step));
  };

  const baselineSummary = sceneAnalysis ? (
    <div className="space-y-2">
      <p className="text-sm leading-6 text-muted-foreground">{sceneAnalysis.summary}</p>
      {renderSummaryPills([
        ratioLabel,
        modeLabel,
        isZh ? `AI：${getTimeLabel(detectedTimeOfDay)}` : `AI: ${getTimeLabel(detectedTimeOfDay)}`,
      ])}
    </div>
  ) : sourceImage ? (
    renderSummaryPills([
      sourceImage.name,
      ratioLabel,
      modeLabel,
      isZh ? "待画面理解" : "Analysis pending",
    ])
  ) : (
    renderSummaryPills([isZh ? "等待上传" : "Waiting for upload"])
  );

  const timeSummary = renderSummaryPills(
    currentTimeOfDay
      ? [
          isZh
            ? `参考：${getTimeLabel(currentTimeOfDay)}`
            : `Source: ${getTimeLabel(currentTimeOfDay)}`,
          isZh
            ? `生成：${selectedSlots.map((slot) => getTimeLabel(slot)).join(" / ")}`
            : `Generate: ${selectedSlots.map((slot) => getTimeLabel(slot)).join(" / ")}`,
        ]
      : [isZh ? "等待画面理解" : "Waiting for scene analysis"],
  );

  const promptSummary = renderSummaryPills(
    promptsReady
      ? [
          isZh
            ? `已就绪 ${selectedSlots.length} 组提示词`
            : `${selectedSlots.length} prompt sets ready`,
          ...selectedSlots.map((slot) => getTimeLabel(slot)),
        ]
      : [isZh ? "等待选择时段" : "Waiting for variant selection"],
  );

  const generationSummary = renderSummaryPills(
    tasks.length === 0
      ? [
          isZh
            ? `准备生成 ${selectedSlots.length} 个版本`
            : `${selectedSlots.length} variants ready`,
          provider.templateId,
        ]
      : [
          isZh
            ? `完成 ${completedResults}/${tasks.length}`
            : `${completedResults}/${tasks.length} done`,
          failedResults > 0
            ? isZh
              ? `失败 ${failedResults}`
              : `${failedResults} failed`
            : tasksRunning
              ? isZh
                ? "生成中"
                : "Running"
              : isZh
                ? "队列完成"
                : "Queue finished",
        ],
  );

  const stepTone = (step: StepKey, hasError = false) => {
    if (hasError) return "attention" as const;
    if (activeStep === step) return "current" as const;
    return stepOrder.indexOf(step) < activeStepIndex ? ("complete" as const) : ("pending" as const);
  };

  return (
    <div className="min-w-0" data-scroll-managed={desktopScrollManaged ? "true" : "false"}>
      <SectionCard
        title={isZh ? "创作流程" : "Workflow"}
        subtitle={
          isZh
            ? "紧凑工作台模式：完成当前步骤后，下一步会自动浮到前面。"
            : "Compact workbench mode: complete the current step and the next one moves forward."
        }
        actions={
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full border border-border/70 bg-background/65 px-2.5 py-1 text-muted-foreground">
              {provider.templateId}
            </span>
            <span className="rounded-full border border-border/70 bg-background/65 px-2.5 py-1 text-muted-foreground">
              {isZh ? `当前 ${activeStepIndex + 1}/4` : `Step ${activeStepIndex + 1}/4`}
            </span>
          </div>
        }
        surface="flat"
      >
        <div className="space-y-3">
          <WorkflowStepCard
            stepLabel="01"
            title={isZh ? "基准图处理与 AI 分析" : "Baseline prep & AI analysis"}
            description={
              isZh
                ? "上传参考图、统一比例，再完成首轮画面理解。"
                : "Upload the reference image, normalize the baseline, then run scene analysis."
            }
            statusLabel={
              !sourceImage
                ? isZh
                  ? "待上传参考图"
                  : "Upload image"
                : !preparedImage
                  ? isZh
                    ? "待生成基准图"
                    : "Prepare baseline"
                  : !sceneAnalysis
                    ? isZh
                      ? "待画面理解"
                      : "Analyze scene"
                    : isZh
                      ? "分析完成"
                      : "Analysis ready"
            }
            tone={stepTone("baseline", Boolean(uploadError || preprocessError))}
            expanded={expandedStep === "baseline"}
            summary={baselineSummary}
            onToggle={() => handleStepToggle("baseline", true)}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(event) => void onUploadFile(event.currentTarget.files?.[0])}
            />

            <div className="space-y-3">
              <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="h-11 rounded-lg px-4"
                  >
                    <Upload className="h-4 w-4" />
                    {t("common.upload")}
                  </Button>
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-sm font-medium">
                      {sourceImage
                        ? sourceImage.name
                        : isZh
                          ? "先放入一张参考图，右侧流程会从这里开始。"
                          : "Drop in one reference image to kick off the workflow."}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {sourceImage
                        ? `${sourceImage.width} × ${sourceImage.height}`
                        : isZh
                          ? "支持 PNG / JPEG / WebP。"
                          : "Supports PNG / JPEG / WebP."}
                    </p>
                  </div>
                </div>
                {uploadError ? (
                  <p className="mt-3 text-sm text-destructive">
                    {t(`errors.${uploadError}`, uploadError)}
                  </p>
                ) : null}
              </div>

              <CanvasControls />

              <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">{t("prompts.analyze")}</p>
                    <p className="text-xs leading-5 text-muted-foreground">
                      {isZh
                        ? "基准图就绪后再执行分析，识别主体、光照与参考时段。"
                        : "Run this after preparing the baseline to detect subjects, lighting, and time of day."}
                    </p>
                  </div>
                  <span className="rounded-full border border-border/70 bg-background/65 px-2.5 py-1 text-[11px] text-muted-foreground">
                    {isZh ? "次动作" : "Secondary action"}
                  </span>
                </div>

                <div className="mt-3 flex flex-col gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void onPreprocess()}
                    disabled={!preparedImage || preprocessLoading}
                    className="h-10 rounded-lg sm:w-fit"
                  >
                    <ScanSearch className="h-4 w-4" />
                    {preprocessLoading ? t("common.loading") : t("prompts.analyze")}
                  </Button>

                  {sceneAnalysis ? (
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p className="font-medium text-foreground">{sceneAnalysis.summary}</p>
                      <p>
                        {isZh ? "主体" : "Subjects"}:{" "}
                        {sceneAnalysis.subjects.join(", ") || (isZh ? "未识别" : "N/A")}
                      </p>
                      <p>
                        {isZh ? "光照" : "Lighting"}: {sceneAnalysis.lighting}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {isZh
                        ? "准备好基准图后，再执行场景分析。"
                        : "Prepare the baseline image before scene analysis."}
                    </p>
                  )}

                  {preprocessError ? (
                    <p className="text-sm text-destructive">
                      {t(`errors.${preprocessError}`, preprocessError)}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </WorkflowStepCard>

          <WorkflowStepCard
            stepLabel="02"
            title={isZh ? "选择时段" : "Choose time variants"}
            description={
              isZh
                ? "确认参考图所处时段，再勾选想生成的目标版本。"
                : "Confirm the source time, then choose the target variants."
            }
            statusLabel={
              !sceneAnalysis
                ? isZh
                  ? "等待步骤 1"
                  : "Waiting for step 1"
                : currentTimeOfDay && selectedSlots.length > 0
                  ? isZh
                    ? `已选 ${selectedSlots.length} 个版本`
                    : `${selectedSlots.length} selected`
                  : isZh
                    ? "选择时段"
                    : "Pick variants"
            }
            tone={stepTone("times")}
            expanded={expandedStep === "times"}
            disabled={!sceneAnalysis}
            summary={timeSummary}
            onToggle={() => handleStepToggle("times", Boolean(sceneAnalysis))}
          >
            <TimeSlotSelector
              currentTimeOfDay={currentTimeOfDay}
              detectedTimeOfDay={detectedTimeOfDay}
              selectedSlots={selectedSlots}
              onCurrentTimeChange={setCurrentTimeOfDay}
              onSelectedSlotsChange={setSelectedSlots}
            />
          </WorkflowStepCard>

          <WorkflowStepCard
            stepLabel="03"
            title={isZh ? "提示词编辑" : "Prompt editing"}
            description={
              isZh
                ? "系统会先生成建议稿，你可以逐个版本微调。"
                : "The app drafts prompt suggestions first, then you can refine them per variant."
            }
            statusLabel={
              selectedSlots.length === 0
                ? isZh
                  ? "等待步骤 2"
                  : "Waiting for step 2"
                : promptsReady
                  ? isZh
                    ? `已就绪 ${selectedSlots.length} 组`
                    : `${selectedSlots.length} ready`
                  : isZh
                    ? "补全提示词"
                    : "Finish the prompts"
            }
            tone={stepTone("prompts")}
            expanded={expandedStep === "prompts"}
            disabled={!sceneAnalysis || selectedSlots.length === 0}
            summary={promptSummary}
            onToggle={() =>
              handleStepToggle("prompts", Boolean(sceneAnalysis) && selectedSlots.length > 0)
            }
          >
            <PromptEditor
              selectedSlots={selectedSlots}
              prompts={prompts}
              onPromptChange={handlePromptChange}
            />
          </WorkflowStepCard>

          <WorkflowStepCard
            stepLabel="04"
            title={isZh ? "批量生成" : "Batch generation"}
            description={
              isZh
                ? "当前步骤会保留在最前面，方便你盯住任务状态。"
                : "This step stays in focus so you can keep an eye on the queue."
            }
            statusLabel={
              !promptsReady
                ? isZh
                  ? "等待步骤 3"
                  : "Waiting for step 3"
                : tasks.length === 0
                  ? isZh
                    ? "准备生成"
                    : "Ready to generate"
                  : tasksRunning
                    ? isZh
                      ? "生成中"
                      : "Generating"
                    : isZh
                      ? "队列完成"
                      : "Queue finished"
            }
            tone={stepTone("generate")}
            expanded={expandedStep === "generate"}
            disabled={!promptsReady}
            summary={generationSummary}
            onToggle={() => handleStepToggle("generate", promptsReady)}
          >
            <GenerateControls
              selectedSlots={selectedSlots}
              prompts={prompts}
              onPreprocess={onPreprocess}
              preprocessLoading={preprocessLoading}
              showAnalyze={false}
            />
          </WorkflowStepCard>

          <div className="space-y-3 rounded-lg border border-border/70 bg-background/55 p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="space-y-1">
                <p className="text-sm font-semibold">
                  {isZh ? "任务与结果状态" : "Queue & results"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isZh
                    ? "任务队列与导出区都留在流程底部，避免抢当前步骤的注意力。"
                    : "The queue and export stay below the workflow so they do not compete with the active step."}
                </p>
              </div>
              <span className="rounded-full border border-border/70 bg-background/65 px-2.5 py-1 text-[11px] text-muted-foreground">
                {tasks.length}
              </span>
            </div>

            {tasks.length > 0 ? (
              <TaskQueue />
            ) : (
              <p className="text-sm leading-6 text-muted-foreground">
                {isZh
                  ? "开始批量生成后，这里会显示排队、进度和失败信息。"
                  : "Start a batch to see queue progress, completion, and failures here."}
              </p>
            )}
          </div>
        </div>
      </SectionCard>
    </div>
  );
};
