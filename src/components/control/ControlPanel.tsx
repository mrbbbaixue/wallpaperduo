import { saveAs } from "file-saver";
import { ArrowLeftRight, Download, Image as ImageIcon, RotateCcw, ScanSearch } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { CanvasControls } from "@/components/canvas/CanvasControls";
import { GenerateControls } from "@/components/control/GenerateControls";
import { PromptEditor } from "@/components/control/PromptEditor";
import { TaskQueue } from "@/components/control/TaskQueue";
import { TimeSlotSelector } from "@/components/control/TimeSlotSelector";
import { WorkflowStepCard } from "@/components/control/WorkflowStepCard";
import { Button } from "@/components/ui/button";
import { aspectRatios } from "@/data/aspectRatios";
import { toast } from "@/hooks/use-toast";
import { hasExpansionArea } from "@/services/canvas/framing";
import { prepareCanvasImage } from "@/services/canvas/prepareCanvas";
import { runSceneAnalysis } from "@/services/prompt/sceneAnalyzer";
import { useSettingsStore } from "@/store/useSettingsStore";
import { buildPreparedImage, useWorkflowStore } from "@/store/useWorkflowStore";
import type { TimeVariant } from "@/types/domain";
import { toUserError } from "@/utils/error";

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
        className="rounded-md border border-border/70 bg-background/65 px-2.5 py-1 text-[11px] text-muted-foreground"
      >
        {item}
      </span>
    ))}
  </div>
);

export const ControlPanel = ({ desktopScrollManaged = false }: ControlPanelProps) => {
  const { i18n, t } = useTranslation();
  const isZh = i18n.language === "zh";

  const sourceImage = useWorkflowStore((s) => s.sourceImage);
  const preparedImage = useWorkflowStore((s) => s.preparedImage);
  const canvasFraming = useWorkflowStore((s) => s.canvasFraming);
  const canvasSize = useWorkflowStore((s) => s.canvasSize);
  const ratioId = useWorkflowStore((s) => s.ratioId);
  const customRatio = useWorkflowStore((s) => s.customRatio);
  const setPreparedImage = useWorkflowStore((s) => s.setPreparedImage);
  const activeResultId = useWorkflowStore((s) => s.activeResultId);
  const previewMode = useWorkflowStore((s) => s.previewMode);
  const sceneAnalysis = useWorkflowStore((s) => s.sceneAnalysis);
  const setSceneAnalysis = useWorkflowStore((s) => s.setSceneAnalysis);
  const tasks = useWorkflowStore((s) => s.tasks);
  const setActiveResultId = useWorkflowStore((s) => s.setActiveResultId);
  const setPreviewMode = useWorkflowStore((s) => s.setPreviewMode);
  const provider = useSettingsStore((s) => s.provider);
  const promptSettings = useSettingsStore((s) => s.promptSettings);

  const [currentTimeOfDay, setCurrentTimeOfDay] = useState<TimeVariant | null>(null);
  const [detectedTimeOfDay, setDetectedTimeOfDay] = useState<TimeVariant | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<TimeVariant[]>([]);
  const [prompts, setPrompts] = useState<PromptEntry[]>([]);
  const [preprocessLoading, setPreprocessLoading] = useState(false);
  const [preprocessError, setPreprocessError] = useState("");
  const [expandedStep, setExpandedStep] = useState<StepKey | null>(null);

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
    const stabilityConstraint = isZh
      ? "保持核心主体、主体轮廓、背景主地标、天际线、相机视角和主构图不变"
      : "keep the core subject, silhouette, background landmarks, skyline, camera angle, and main composition unchanged";
    const allowedTemporalChanges = isZh
      ? "只允许光照、天空颜色、阴影、灯光与少量时间相关细节变化"
      : "only change lighting, sky tone, shadows, practical lights, and small time-dependent details";
    const subjectAnchors =
      analysis.subjects.length > 0
        ? isZh
          ? `核心主体：${analysis.subjects.join("、")}`
          : `Core subjects: ${analysis.subjects.join(", ")}`
        : "";
    const prefixedBaseDesc = [promptSettings.generationPrefix, baseDesc, subjectAnchors]
      .filter(Boolean)
      .join(", ");

    return slots.map((slot) => ({
      timeOfDay: slot,
      prompt: [
        prefixedBaseDesc,
        slot === current ? "" : timeDesc[slot],
        stabilityConstraint,
        allowedTemporalChanges,
      ]
        .filter(Boolean)
        .join(", "),
      negativePrompt:
        promptSettings.defaultNegativePrompt ||
        "blur, artifact, text, low quality, subject replacement, composition change, camera shift, geometry drift, tower shape change",
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
    if (!sourceImage) return;

    try {
      setPreprocessLoading(true);
      setPreprocessError("");
      const output = await prepareCanvasImage({
        source: sourceImage.blob,
        ratio,
        canvas: canvasSize,
        framing: canvasFraming,
      });
      const prepared = buildPreparedImage({
        sourceImageId: sourceImage.id,
        blob: output.blob,
        width: output.width,
        height: output.height,
        objectUrl: URL.createObjectURL(output.blob),
        ratioId: ratioLabel,
        framing: canvasFraming,
      });
      setPreparedImage(prepared);
      const result = await runSceneAnalysis(
        provider,
        prepared,
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

  const getTimeLabel = (time?: TimeVariant | null) =>
    time ? (isZh ? timeLabels[time].zh : timeLabels[time].en) : isZh ? "未识别" : "N/A";

  const ratio =
    ratioId === "custom"
      ? customRatio
      : (() => {
          const preset = aspectRatios.find((item) => item.id === ratioId);
          return preset ? { width: preset.width, height: preset.height } : { width: 16, height: 9 };
        })();
  const ratioLabel = ratioId === "custom" ? `${customRatio.width}:${customRatio.height}` : ratioId;
  const includesExpansionArea =
    !!sourceImage &&
    canvasSize.width > 0 &&
    canvasSize.height > 0 &&
    hasExpansionArea({
      canvas: canvasSize,
      source: { width: sourceImage.width, height: sourceImage.height },
      ratio,
      framing: canvasFraming,
    });
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

  const prevActiveStepRef = useRef<StepKey | null>(null);

  useEffect(() => {
    if (prevActiveStepRef.current !== activeStep) {
      setExpandedStep(activeStep);
      prevActiveStepRef.current = activeStep;
    }
  }, [activeStep]);

  const activeStepIndex = stepOrder.indexOf(activeStep);
  const completedResults = tasks.filter((task) => task.status === "succeeded").length;
  const failedResults = tasks.filter((task) => task.status === "failed").length;
  const tasksRunning = tasks.some((task) => task.status === "queued" || task.status === "running");
  const succeededTasks = tasks.filter((task) => task.status === "succeeded" && task.result?.blob);
  const activeTask = activeResultId
    ? succeededTasks.find((task) => task.id === activeResultId)
    : undefined;

  const handleStepToggle = (step: StepKey) => {
    setExpandedStep((current) => (current === step ? null : step));
  };

  const handleDownloadSingle = () => {
    if (!activeTask?.result?.blob) return;
    const safeLabel = activeTask.label.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "");
    const filename = safeLabel ? `${safeLabel}.png` : `result_${activeTask.id}.png`;
    saveAs(activeTask.result.blob, filename);
  };

  const baselineSummary = sceneAnalysis ? (
    <div className="space-y-2">
      <p className="text-sm leading-6 text-muted-foreground">{sceneAnalysis.summary}</p>
      {renderSummaryPills([
        ratioLabel,
        t("workspace.expansionCompose"),
        t("workspace.framingLocked"),
        includesExpansionArea ? t("workspace.expansionArea") : "",
        isZh ? `AI：${getTimeLabel(detectedTimeOfDay)}` : `AI: ${getTimeLabel(detectedTimeOfDay)}`,
      ])}
    </div>
  ) : sourceImage ? (
    renderSummaryPills([
      sourceImage.name,
      ratioLabel,
      t("workspace.expansionCompose"),
      t("workspace.framingLocked"),
      includesExpansionArea ? t("workspace.expansionArea") : "",
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
      <div className="overflow-hidden">
        <WorkflowStepCard
          stepLabel="01"
          title={isZh ? "构图设置与 AI 分析" : "Framing & AI analysis"}
          description={
            isZh ? "导入参考图，设置目标比例，AI分析构图与时段" : "Import reference, set target ratio, AI analysis"
          }
            statusLabel={
                !sourceImage
                  ? isZh
                    ? "待导入"
                    : "Import"
                  : !sceneAnalysis
                    ? isZh
                      ? "待分析"
                      : "Analyze"
                    : isZh
                      ? "已就绪"
                      : "Ready"
              }
          tone={stepTone("baseline", Boolean(preprocessError))}
          expanded={expandedStep === "baseline"}
          summary={baselineSummary}
          onToggle={() => handleStepToggle("baseline")}
        >
          <div className="space-y-3">
            <div className="rounded-lg border border-border/70 bg-background/70 p-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold">
                  {sourceImage ? sourceImage.name : isZh ? "导入参考图" : "Import reference image"}
                </p>
                <p className="text-xs leading-5 text-muted-foreground">
                  {sourceImage ? `${sourceImage.width} × ${sourceImage.height}` : ""}
                </p>
              </div>
            </div>

            <CanvasControls />

            <div className="rounded-lg border border-border/70 bg-background/70 p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold">{t("prompts.analyze")}</p>
                </div>
              </div>

              <div className="mt-3 flex flex-col gap-3">
                <Button
                  type="button"
                  onClick={() => void onPreprocess()}
                  disabled={!sourceImage || preprocessLoading}
                  className="h-11 rounded-md sm:w-fit"
                >
                  <ScanSearch className="h-4 w-4" />
                  {preprocessLoading ? t("common.loading") : t("prompts.analyze")}
                </Button>

                {sceneAnalysis ? (
                  <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">{sceneAnalysis.summary}</p>
                    <div className="flex flex-wrap gap-x-4 text-xs">
                      <span>{isZh ? "主体" : "Subjects"}: {sceneAnalysis.subjects.join(", ") || (isZh ? "未识别" : "N/A")}</span>
                      <span>{isZh ? "光照" : "Lighting"}: {sceneAnalysis.lighting}</span>
                    </div>
                  </div>
                ) : null}

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
            isZh ? "确认参考时段，选择目标变体版本" : "Confirm source time, pick target variants"
          }
            statusLabel={
                !sceneAnalysis
                  ? isZh ? "等待步骤 1" : "Waiting"
                  : currentTimeOfDay && selectedSlots.length > 0
                    ? isZh ? `${selectedSlots.length} 个版本` : `${selectedSlots.length} variants`
                    : isZh ? "选择时段" : "Pick variants"
              }
          tone={stepTone("times")}
          expanded={expandedStep === "times"}
          summary={timeSummary}
          onToggle={() => handleStepToggle("times")}
        >
          <TimeSlotSelector
            currentTimeOfDay={currentTimeOfDay}
            detectedTimeOfDay={detectedTimeOfDay}
            selectedSlots={selectedSlots}
            onCurrentTimeChange={setCurrentTimeOfDay}
            onSelectedSlotsChange={setSelectedSlots}
            locked={!sceneAnalysis}
          />
        </WorkflowStepCard>

        <WorkflowStepCard
          stepLabel="03"
          title={isZh ? "提示词编辑" : "Prompt editing"}
          description={
            isZh ? "系统生成建议稿，可逐个版本微调" : "AI drafts suggestions, refine per variant"
          }
            statusLabel={
                selectedSlots.length === 0
                  ? isZh ? "等待步骤 2" : "Waiting"
                  : promptsReady
                    ? isZh ? `${selectedSlots.length} 组就绪` : `${selectedSlots.length} ready`
                    : isZh ? "补全提示词" : "Finish prompts"
              }
          tone={stepTone("prompts")}
          expanded={expandedStep === "prompts"}
          summary={promptSummary}
          onToggle={() => handleStepToggle("prompts")}
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
            isZh ? "批量生成所有变体，实时跟踪任务进度" : "Batch generate all variants, track progress"
          }
            statusLabel={
                !promptsReady
                  ? isZh ? "等待步骤 3" : "Waiting"
                  : tasks.length === 0
                    ? isZh ? "就绪" : "Ready"
                    : tasksRunning ? isZh ? "生成中" : "Running"
                    : isZh ? "已完成" : "Done"
              }
          tone={stepTone("generate")}
          expanded={expandedStep === "generate"}
          summary={generationSummary}
          onToggle={() => handleStepToggle("generate")}
        >
          <GenerateControls
            selectedSlots={selectedSlots}
            prompts={prompts}
            onPreprocess={onPreprocess}
            preprocessLoading={preprocessLoading}
            showAnalyze={false}
          />
        </WorkflowStepCard>

        {succeededTasks.length > 0 ? (
          <div className="border-t border-border/70 bg-background/55 p-3.5">
            <p className="mb-2 text-xs font-semibold">
              {isZh ? "预览模式" : "Preview mode"}
            </p>
            <div className="flex flex-wrap gap-1.5">
              <Button
                type="button"
                size="sm"
                variant={!activeResultId ? "default" : "outline"}
                onClick={() => {
                  setPreviewMode("single");
                  setActiveResultId(undefined);
                }}
                aria-pressed={!activeResultId}
                className="h-8 text-xs"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {t("results.baseSelect")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={previewMode === "single" ? "default" : "outline"}
                onClick={() => setPreviewMode("single")}
                disabled={!activeResultId}
                aria-pressed={previewMode === "single"}
                className="h-8 text-xs"
              >
                <ImageIcon className="h-3.5 w-3.5" />
                {t("results.singleMode")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={previewMode === "compare" ? "default" : "outline"}
                onClick={() => setPreviewMode("compare")}
                disabled={!activeResultId}
                aria-pressed={previewMode === "compare"}
                className="h-8 text-xs"
              >
                <ArrowLeftRight className="h-3.5 w-3.5" />
                {t("results.compareMode")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleDownloadSingle}
                disabled={!activeTask?.result?.blob}
                className="h-8 text-xs"
              >
                <Download className="h-3.5 w-3.5" />
                {t("common.download")}
              </Button>
            </div>
          </div>
        ) : null}

        {tasks.length > 0 ? (
          <div className="border-t border-border/70 bg-background/55 p-3.5">
            <TaskQueue />
          </div>
        ) : null}
      </div>
    </div>
  );
};
