import { Alert, Box, Divider, Stack, Typography } from "@mui/material";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

import { SectionCard } from "@/components/common/SectionCard";
import { TimeSlotSelector } from "@/components/control/TimeSlotSelector";
import { PromptEditor } from "@/components/control/PromptEditor";
import { GenerateControls } from "@/components/control/GenerateControls";
import { TaskQueue } from "@/components/control/TaskQueue";
import { runSceneAnalysis } from "@/services/prompt/sceneAnalyzer";
import { createProvider } from "@/services/providers";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useWorkflowStore } from "@/store/useWorkflowStore";
import { toUserError } from "@/utils/error";
import type { TimeVariant } from "@/types/domain";

interface PromptEntry {
  timeOfDay: TimeVariant;
  prompt: string;
  negativePrompt: string;
}

export const ControlPanel = () => {
  const { i18n, t } = useTranslation();
  const isZh = i18n.language === "zh";

  const preparedImage = useWorkflowStore((s) => s.preparedImage);
  const sceneAnalysis = useWorkflowStore((s) => s.sceneAnalysis);
  const setSceneAnalysis = useWorkflowStore((s) => s.setSceneAnalysis);
  const analysisProvider = useSettingsStore((s) => s.analysisProvider);
  const generationProvider = useSettingsStore((s) => s.generationProvider);
  const providers = useSettingsStore((s) => s.providers);
  const promptSettings = useSettingsStore((s) => s.promptSettings);

  const [currentTimeOfDay, setCurrentTimeOfDay] = useState<TimeVariant | null>(null);
  const [detectedTimeOfDay, setDetectedTimeOfDay] = useState<TimeVariant | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<TimeVariant[]>([]);
  const [prompts, setPrompts] = useState<PromptEntry[]>([]);
  const [preprocessLoading, setPreprocessLoading] = useState(false);
  const [preprocessError, setPreprocessError] = useState("");

  const handlePromptChange = useCallback(
    (timeOfDay: TimeVariant, field: "prompt" | "negativePrompt", value: string) => {
      setPrompts((prev) => {
        const existing = prev.find((p) => p.timeOfDay === timeOfDay);
        if (existing) {
          return prev.map((p) => (p.timeOfDay === timeOfDay ? { ...p, [field]: value } : p));
        }
        return [...prev, { timeOfDay, prompt: "", negativePrompt: "", [field]: value }];
      });
    },
    [],
  );

  const inferTimeOfDay = (analysis: { lighting: string; summary: string; timeOfDay?: TimeVariant }): TimeVariant => {
    // Use analyzer's result if available
    if (analysis.timeOfDay) return analysis.timeOfDay;
    const text = `${analysis.lighting} ${analysis.summary}`.toLowerCase();
    if (/dawn|sunrise|morning|晨|日出|清晨|早晨/.test(text)) return "dawn";
    if (/dusk|sunset|evening|昏|日落|黄昏|傍晚/.test(text)) return "dusk";
    if (/night|dark|moon|星|夜|月|深色/.test(text)) return "night";
    return "day";
  };

  const recommendSlots = (current: TimeVariant): TimeVariant[] => {
    const all: TimeVariant[] = ["dawn", "day", "dusk", "night"];
    return all.filter((s) => s !== current);
  };

  const generatePromptSuggestions = (
    analysis: { summary: string; subjects: string[]; lighting: string },
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
      ? "保持原有构图和细节不变"
      : "preserve original composition and details";
    const prefixedBaseDesc = [promptSettings.generationPrefix, baseDesc].filter(Boolean).join(", ");

    return slots.map((slot) => ({
      timeOfDay: slot,
      prompt:
        slot === current
          ? prefixedBaseDesc
          : `${prefixedBaseDesc}, ${timeDesc[slot]}, ${keepComposition}`,
      negativePrompt: promptSettings.defaultNegativePrompt || "blur, artifact, text, geometry shift, low quality",
    }));
  };

  const onPreprocess = async () => {
    if (!preparedImage) return;
    try {
      setPreprocessLoading(true);
      setPreprocessError("");
      const provider = createProvider(analysisProvider, providers);
      const analysis = await runSceneAnalysis(provider, preparedImage, promptSettings.analysisUserPrompt);
      setSceneAnalysis(analysis);

      const detected = inferTimeOfDay(analysis);
      setDetectedTimeOfDay(detected);
      setCurrentTimeOfDay(detected);

      const recommended = recommendSlots(detected);
      setSelectedSlots(recommended);

      const allSlots = [detected, ...recommended];
      const suggestions = generatePromptSuggestions(analysis, detected, allSlots);
      setPrompts(suggestions);
    } catch (exception) {
      setPreprocessError(toUserError(exception));
    } finally {
      setPreprocessLoading(false);
    }
  };

  return (
    <Box
      sx={{
        "& > .MuiCard-root": {
          border: 0,
          borderRadius: 0,
          boxShadow: "none",
          background: "transparent",
          backdropFilter: "none",
          minHeight: {
            md: "clamp(520px, calc(100vh - 190px), 920px)",
          },
        },
        "& > .MuiCard-root::before": { display: "none" },
        "& > .MuiCard-root > .MuiCardContent-root": {
          height: { md: "100%" },
        },
      }}
    >
      <SectionCard
        title={isZh ? "控制面板" : "Control Panel"}
        subtitle={
          isZh
            ? `视觉分析: ${analysisProvider} · 图像生成: ${generationProvider}`
            : `Analysis: ${analysisProvider} · Generation: ${generationProvider}`
        }
      >
        <Stack
          spacing={2}
          sx={{
            height: { md: "100%" },
            overflowY: { md: "auto" },
            pr: { md: 0.5 },
          }}
        >
        <Box
          sx={{
            p: 1.5,
            borderRadius: 1.5,
            border: "1px solid",
            borderColor: "divider",
            backgroundColor: "action.hover",
          }}
        >
          <Stack spacing={1.25}>
            <Typography variant="overline" color="text.secondary">
              {isZh ? "01 选择时段" : "01 Select Slots"}
            </Typography>
            <TimeSlotSelector
              currentTimeOfDay={currentTimeOfDay}
              detectedTimeOfDay={detectedTimeOfDay}
              selectedSlots={selectedSlots}
              onCurrentTimeChange={setCurrentTimeOfDay}
              onSelectedSlotsChange={setSelectedSlots}
            />
          </Stack>
        </Box>

        <Divider />

        {sceneAnalysis && (
          <>
            <Box
              sx={{
                p: 1.5,
                borderRadius: 1.5,
                border: "1px solid",
                borderColor: "divider",
                backgroundColor: "action.hover",
              }}
            >
              <Stack spacing={0.75}>
                <Typography variant="overline" color="text.secondary">
                  {isZh ? "02 场景分析结果" : "02 Scene Analysis"}
                </Typography>
                <Typography variant="body2">{sceneAnalysis.summary}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {isZh ? "主体" : "Subjects"}: {sceneAnalysis.subjects.join(", ")}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {isZh ? "光照" : "Lighting"}: {sceneAnalysis.lighting}
                </Typography>
              </Stack>
            </Box>
            <Divider />
          </>
        )}

        <Box
          sx={{
            p: 1.5,
            borderRadius: 1.5,
            border: "1px solid",
            borderColor: "divider",
            backgroundColor: "action.hover",
          }}
        >
          <Stack spacing={1.25}>
            <Typography variant="overline" color="text.secondary">
              {isZh ? "03 提示词编辑" : "03 Prompt Editing"}
            </Typography>
            <PromptEditor
              selectedSlots={selectedSlots}
              prompts={prompts}
              onPromptChange={handlePromptChange}
            />
          </Stack>
        </Box>

        <Divider />

        <Box
          sx={{
            p: 1.5,
            borderRadius: 1.5,
            border: "1px solid",
            borderColor: "divider",
            backgroundColor: "action.hover",
          }}
        >
          <Stack spacing={1.25}>
            <Typography variant="overline" color="text.secondary">
              {isZh ? "04 预处理与生成" : "04 Preprocess & Generate"}
            </Typography>
            <GenerateControls
              selectedSlots={selectedSlots}
              prompts={prompts}
              onPreprocess={onPreprocess}
              preprocessLoading={preprocessLoading}
            />
          </Stack>
        </Box>

        {preprocessError && (
          <Alert severity="error" sx={{ py: 0 }}>
            {t(`errors.${preprocessError}`, preprocessError)}
          </Alert>
        )}

        <Box
          sx={{
            p: 1.5,
            borderRadius: 1.5,
            border: "1px solid",
            borderColor: "divider",
            backgroundColor: "action.hover",
          }}
        >
          <Stack spacing={1}>
            <Typography variant="overline" color="text.secondary">
              {isZh ? "05 任务队列" : "05 Task Queue"}
            </Typography>
            <TaskQueue />
          </Stack>
        </Box>
        </Stack>
      </SectionCard>
    </Box>
  );
};
