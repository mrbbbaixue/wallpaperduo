import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

const WorkspacePage = lazy(() => import("@/pages/WorkspacePage").then((mod) => ({ default: mod.WorkspacePage })));
const PromptPage = lazy(() => import("@/pages/PromptPage").then((mod) => ({ default: mod.PromptPage })));
const ResultsPage = lazy(() => import("@/pages/ResultsPage").then((mod) => ({ default: mod.ResultsPage })));
const ExportPage = lazy(() => import("@/pages/ExportPage").then((mod) => ({ default: mod.ExportPage })));
const SettingsPage = lazy(() => import("@/pages/SettingsPage").then((mod) => ({ default: mod.SettingsPage })));

export const AppRouter = () => (
  <Suspense fallback={null}>
    <Routes>
      <Route path="/" element={<WorkspacePage />} />
      <Route path="/prompts" element={<PromptPage />} />
      <Route path="/results" element={<ResultsPage />} />
      <Route path="/export" element={<ExportPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </Suspense>
);
