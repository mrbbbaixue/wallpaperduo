import { create } from "zustand";

import type {
  AlignmentResult,
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

interface WorkflowState {
  sourceImage?: LoadedImage;
  preparedImage?: PreparedImage;
  ratioId: string;
  customRatio: { width: number; height: number };
  prepareMode: "crop" | "pad";
  sceneAnalysis?: SceneAnalysis;
  promptPlan?: PromptPlan;
  tasks: GenerationTask[];
  alignmentResults: Record<string, AlignmentResult>;
  exportMapping: ExportMapping;
  setSourceImage: (image: LoadedImage) => void;
  setPreparedImage: (image: PreparedImage) => void;
  setRatioId: (ratioId: string) => void;
  setCustomRatio: (ratio: { width: number; height: number }) => void;
  setPrepareMode: (mode: "crop" | "pad") => void;
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
  ratioId: "3:1",
  customRatio: { width: 3, height: 1 },
  prepareMode: "crop",
  tasks: [],
  alignmentResults: {},
  exportMapping: defaultExportMapping,
  setSourceImage: (sourceImage) =>
    set(() => ({
      sourceImage,
      preparedImage: undefined,
      sceneAnalysis: undefined,
      promptPlan: undefined,
      tasks: [],
      alignmentResults: {},
      exportMapping: defaultExportMapping,
    })),
  setPreparedImage: (preparedImage) => set({ preparedImage }),
  setRatioId: (ratioId) => set({ ratioId }),
  setCustomRatio: (customRatio) => set({ customRatio }),
  setPrepareMode: (prepareMode) => set({ prepareMode }),
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
      sceneAnalysis: undefined,
      promptPlan: undefined,
      tasks: [],
      alignmentResults: {},
      exportMapping: defaultExportMapping,
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
