import { create } from "zustand";

import { aspectRatios } from "@/data/aspectRatios";
import { resolveDefaultCanvasFraming } from "@/services/canvas/framing";
import type {
  AlignmentResult,
  CanvasCropArea,
  CanvasFraming,
  CanvasViewport,
  ExportMapping,
  GenerationTask,
  LoadedImage,
  PreparedImage,
  PromptPlan,
  SceneAnalysis,
} from "@/types/domain";
import { createId } from "@/utils/id";

const defaultExportMapping: ExportMapping = {
  day: [],
  sunrise: [],
  sunset: [],
  night: [],
};

const defaultCanvasFraming: CanvasFraming = {
  viewport: {
    x: 0,
    y: 0,
    zoom: 1,
  },
};

const resolveRatio = (ratioId: string, customRatio: { width: number; height: number }) => {
  if (ratioId === "custom") {
    return customRatio;
  }

  const preset = aspectRatios.find((item) => item.id === ratioId);
  return preset ? { width: preset.width, height: preset.height } : { width: 16, height: 9 };
};

const resolveCanvasFramingFor = ({
  sourceImage,
  ratioId,
  customRatio,
}: {
  sourceImage?: LoadedImage;
  ratioId: string;
  customRatio: { width: number; height: number };
}) => {
  if (!sourceImage) {
    return defaultCanvasFraming;
  }

  return resolveDefaultCanvasFraming({
    source: { width: sourceImage.width, height: sourceImage.height },
    ratio: resolveRatio(ratioId, customRatio),
  });
};

const clearDerivedState = {
  preparedImage: undefined,
  sceneAnalysis: undefined,
  promptPlan: undefined,
  tasks: [],
  alignmentResults: {},
  exportMapping: defaultExportMapping,
  activeResultId: undefined,
  previewMode: "single" as const,
};

interface WorkflowState {
  sourceImage?: LoadedImage;
  preparedImage?: PreparedImage;
  canvasFraming: CanvasFraming;
  ratioId: string;
  customRatio: { width: number; height: number };
  activeResultId?: string;
  previewMode: "single" | "compare";
  sceneAnalysis?: SceneAnalysis;
  promptPlan?: PromptPlan;
  tasks: GenerationTask[];
  alignmentResults: Record<string, AlignmentResult>;
  exportMapping: ExportMapping;
  setSourceImage: (image: LoadedImage) => void;
  setPreparedImage: (image: PreparedImage) => void;
  setCanvasViewport: (viewport: CanvasViewport) => void;
  setCanvasCropArea: (cropAreaPixels?: CanvasCropArea) => void;
  resetCanvasFraming: () => void;
  setRatioId: (ratioId: string) => void;
  setCustomRatio: (ratio: { width: number; height: number }) => void;
  setActiveResultId: (taskId?: string) => void;
  setPreviewMode: (mode: "single" | "compare") => void;
  setSceneAnalysis: (analysis: SceneAnalysis) => void;
  setPromptPlan: (plan: PromptPlan) => void;
  updatePromptVariant: (
    variantId: string,
    patch: Partial<Pick<GenerationTask, "prompt" | "negativePrompt" | "seed" | "label">>,
  ) => void;
  replaceTasksFromPromptPlan: (plan: PromptPlan) => void;
  setTasks: (tasks: GenerationTask[]) => void;
  updateTask: (taskId: string, patch: Partial<GenerationTask>) => void;
  setAlignmentResult: (result: AlignmentResult) => void;
  setExportMapping: (mapping: ExportMapping) => void;
  resetRun: () => void;
}

export const useWorkflowStore = create<WorkflowState>((set) => ({
  canvasFraming: defaultCanvasFraming,
  ratioId: "16:9",
  customRatio: { width: 16, height: 9 },
  previewMode: "single",
  tasks: [],
  alignmentResults: {},
  exportMapping: defaultExportMapping,
  setSourceImage: (sourceImage) =>
    set((state) => ({
      sourceImage,
      canvasFraming: resolveCanvasFramingFor({
        sourceImage,
        ratioId: state.ratioId,
        customRatio: state.customRatio,
      }),
      ...clearDerivedState,
    })),
  setPreparedImage: (preparedImage) =>
    set(() => ({
      preparedImage,
      sceneAnalysis: undefined,
      promptPlan: undefined,
      tasks: [],
      alignmentResults: {},
      exportMapping: defaultExportMapping,
      activeResultId: undefined,
      previewMode: "single",
    })),
  setCanvasViewport: (viewport) =>
    set((state) => ({
      ...clearDerivedState,
      canvasFraming: {
        ...state.canvasFraming,
        viewport,
      },
    })),
  setCanvasCropArea: (cropAreaPixels) =>
    set((state) => ({
      ...clearDerivedState,
      canvasFraming: {
        ...state.canvasFraming,
        cropAreaPixels,
      },
    })),
  resetCanvasFraming: () =>
    set((state) => ({
      ...clearDerivedState,
      canvasFraming: resolveCanvasFramingFor({
        sourceImage: state.sourceImage,
        ratioId: state.ratioId,
        customRatio: state.customRatio,
      }),
    })),
  setRatioId: (ratioId) =>
    set((state) => ({
      ...clearDerivedState,
      ratioId,
      canvasFraming: resolveCanvasFramingFor({
        sourceImage: state.sourceImage,
        ratioId,
        customRatio: state.customRatio,
      }),
    })),
  setCustomRatio: (customRatio) =>
    set((state) => ({
      ...clearDerivedState,
      customRatio,
      canvasFraming: resolveCanvasFramingFor({
        sourceImage: state.sourceImage,
        ratioId: state.ratioId,
        customRatio,
      }),
    })),
  setActiveResultId: (activeResultId) => set({ activeResultId }),
  setPreviewMode: (previewMode) => set({ previewMode }),
  setSceneAnalysis: (sceneAnalysis) => set({ sceneAnalysis }),
  setPromptPlan: (promptPlan) => set({ promptPlan }),
  updatePromptVariant: (variantId, patch) =>
    set((state) => ({
      promptPlan: state.promptPlan
        ? {
            ...state.promptPlan,
            variants: state.promptPlan.variants.map((variant) =>
              variant.id === variantId ? { ...variant, ...patch } : variant,
            ),
          }
        : undefined,
      tasks: state.tasks.map((task) => (task.id === variantId ? { ...task, ...patch } : task)),
    })),
  replaceTasksFromPromptPlan: (plan) =>
    set({
      tasks: plan.variants.map((variant) => ({
        ...variant,
        status: "idle",
        progress: 0,
      })),
      alignmentResults: {},
      activeResultId: undefined,
      previewMode: "single",
      exportMapping: {
        day: plan.variants.filter((item) => item.timeOfDay === "day").map((item) => item.id),
        sunrise: plan.variants.filter((item) => item.timeOfDay === "dawn").map((item) => item.id),
        sunset: plan.variants.filter((item) => item.timeOfDay === "dusk").map((item) => item.id),
        night: plan.variants.filter((item) => item.timeOfDay === "night").map((item) => item.id),
      },
    }),
  setTasks: (tasks) => set({ tasks }),
  updateTask: (taskId, patch) =>
    set((state) => ({
      tasks: state.tasks.map((task) => (task.id === taskId ? { ...task, ...patch } : task)),
    })),
  setAlignmentResult: (result) =>
    set((state) => ({
      alignmentResults: {
        ...state.alignmentResults,
        [result.variantId]: result,
      },
    })),
  setExportMapping: (exportMapping) => set({ exportMapping }),
  resetRun: () =>
    set(() => ({
      ...clearDerivedState,
    })),
}));

export const buildLoadedImage = (input: Omit<LoadedImage, "id">): LoadedImage => ({
  ...input,
  id: createId("source"),
});

export const buildPreparedImage = (input: Omit<PreparedImage, "id">): PreparedImage => ({
  ...input,
  id: createId("prepared"),
});
