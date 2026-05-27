import { create } from "zustand";

import type {
  AlignmentResult,
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

const emptyCanvasFraming: CanvasFraming = { viewport: undefined };

// 仅清"由构图派生的分析链"，保留已生成的 tasks/results 作为历史
const clearDerivedAnalysis = {
  preparedImage: undefined,
  sceneAnalysis: undefined,
  promptPlan: undefined,
};

// 完全清除：换源图、切比例、resetRun 等导致输出形状变化的场景使用
const clearDerivedState = {
  ...clearDerivedAnalysis,
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
  canvasSize: { width: number; height: number };
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
  setCanvasSize: (size: { width: number; height: number }) => void;
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
  canvasFraming: emptyCanvasFraming,
  canvasSize: { width: 0, height: 0 },
  ratioId: "16:9",
  customRatio: { width: 16, height: 9 },
  previewMode: "single",
  tasks: [],
  alignmentResults: {},
  exportMapping: defaultExportMapping,
  setSourceImage: (sourceImage) =>
    set(() => ({
      sourceImage,
      canvasFraming: emptyCanvasFraming,
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
      ...clearDerivedAnalysis,
      canvasFraming: {
        ...state.canvasFraming,
        viewport,
      },
    })),
  setCanvasSize: (canvasSize) => set({ canvasSize }),
  resetCanvasFraming: () =>
    set(() => ({
      ...clearDerivedAnalysis,
      canvasFraming: emptyCanvasFraming,
    })),
  setRatioId: (ratioId) =>
    set(() => ({
      ...clearDerivedState,
      ratioId,
    })),
  setCustomRatio: (customRatio) =>
    set(() => ({
      ...clearDerivedState,
      customRatio,
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
